# Backend logic — QuizShowCreator

Covers `src/stores/*`, `src/net/*`, `src/utils/*`, `electron/main.ts` and `electron/preload.ts`.
Renderer / GUI in [gui.md](./gui.md); architecture in [overview.md](./overview.md).

## `src/stores/quiz.store.ts` — quiz state

Single source of truth for themes, questions, players, scoring and the open card.

### Types

```ts
type Theme = { id: string; themeText: string; questions: Question[] }
type Question = { points: number; question: string; answer: string; image?: string; audio?: string }
type Player = { id: string; name: string; score: number }
type QuizFile = { app: 'QuizShowCreator'; version: number; themes: Theme[]; players: Player[] }
```

- `DEFAULT_POINTS = [100, 200, 300, 400, 500]`
- `QUIZ_FILE_VERSION = 4`
- `Image` and `audio` are Base64 data URLs.

### State

| Ref | Type | Purpose |
| --- | --- | --- |
| `themes` | `Theme[]` | Board columns and their questions |
| `players` | `Player[]` | Players and scores |
| `answeredBy` | `Map<string, string>` | `"<themeId>:<points>"` → player name |
| `openCard` | `OpenCard \| null` | Currently opened card (`{ themeId, points }`) |
| `answerRevealed` | `boolean` | Whether the open answer is visible |
| `isEditMode` | `boolean` | Edit vs. play mode (default `true`) |

On the viewer side, `openCardContent` is a module-local cache for the card content shipped by the host; it is deliberately **not** part of the snapshot.

### Board actions

| Action | Behaviour |
| --- | --- |
| `setEditMode` / `toggleEditMode` | Switch between edit and play mode. |
| `addColumn` | Appends a theme `New Theme` with the default 100–500 cards. |
| `removeTheme` | Removes a theme by id. |
| `updateThemeText` | Renames a theme. |
| `updateQuestion` | Sets a question text, creating the card if needed. |
| `updateQuestionFull` | Updates points, question, answer, image and audio; rejects non-integer points and duplicate point values within a theme; re-sorts by points. |
| `addPlayer` | Adds a player; empty names become `Spieler <n>`. |
| `removePlayer` / `renamePlayer` | Removes or renames a player; empty renames keep the old name. |
| `awardPointsForCard` | Adds the card value to a player and records `answeredBy`. |
| `isAnswered` / `getAnsweredBy` | Look up the answered state for a card. |
| `openQuestion` | Opens a card and reveals the answer immediately when it was already answered. |
| `closeQuestion` | Clears the open card and the reveal flag. |
| `setAnswerRevealed` / `toggleAnswerRevealed` | Controls answer visibility. |
| `resetRound` | Sets all scores to zero, clears `answeredBy` and closes the card. |

### Multiplayer helpers

| Function | Purpose |
| --- | --- |
| `toSnapshot()` | Builds a content-free `GameSnapshot` via `createSnapshot()`. |
| `getQuestionCard(themeId, points)` | Host payload for the open card; includes the answer only when revealed. |
| `getQuestionAnswer(themeId, points)` | Returns the answer for the open card. |
| `applySnapshot(snapshot)` | Viewer: replaces themes/players/answered map/open card; fills only the currently open card from cached content. |
| `applyCard(card)` | Viewer: caches the card content and applies it when the card is open. |
| `applyAnswer(payload)` | Viewer: sets or clears the answer of the open card. |

`applySnapshot` maps every question to `{ points, question: '', answer: '' }` and only fills the open card from `openCardContent`. Closing the card or switching to a different one drops the cache, so viewers never retain content they cannot see.

### Import and export

`exportQuiz()` returns a `QuizFile` with the current themes and players.

`importQuiz(data)` validates the document and replaces the board:

1. Root must be an object with an array `themes`.
2. Every theme needs a string `themeText` and an array `questions`.
3. Every question needs finite numeric `points` and string `question`/`answer`.
4. `image` is kept only when it starts with `data:image/`; `audio` only with `data:audio/`.
5. Questions are sorted by points; theme ids are regenerated.
6. `players` is optional; when present it must be an array of objects with a string `name`; invalid scores become `0`.
7. On success, `answeredBy` is cleared and the open card is closed.

Errors are returned as `{ ok: false, error }` with German messages. A successful import does not validate duplicate point values in the file.

## `src/stores/network.store.ts` — multiplayer orchestration

| State | Type | Purpose |
| --- | --- | --- |
| `role` | `offline \| host \| client` | Current role |
| `status` | `idle \| connecting \| connected \| error` | Connection state |
| `roomCode` | `string \| null` | Active room code |
| `viewerCount` | `number` | Connected viewers on the host |
| `error` | `string \| null` | Last connection error |
| `playerName` | `string` | Name the client joined with (empty if none) |

Computed: `isHost`, `isClient`, `isOnline`.

### Host flow

1. `startHosting()` leaves an existing session, creates a room code and a host transport.
2. On `onOpen`, the status becomes `connected` and `startWatching()` installs a deep watcher over themes, players, `answeredBy`, `openCard` and `answerRevealed`.
3. Every change calls `pushState()`:
   - When a new card is open, broadcast a `card` message once and track its key.
   - When the answer becomes visible, broadcast an `answer` message once.
   - When it is hidden again, broadcast `{ answer: null }`.
   - Always broadcast a `state` snapshot last.
4. On viewer join, reset `lastCardKey`/`answerSent` and push state again so the new viewer receives the current card.
5. Viewer data is ignored except `hello`: a name (trimmed, max. 10 chars) claims an unclaimed player with the same name (case-insensitive) or adds a new one (`Anna 2` if the name is taken by another viewer). The `peerId -> playerId` mapping is dropped when the viewer leaves; the player itself stays.
6. `leave()` increments a session id, closes the transport and resets role, status, room code, viewer count and error.

The `sessionId` guard prevents callbacks from a previous session from mutating the new one.

### Client flow

1. `join(code)` trims and uppercases the code; an empty code sets status `error`.
2. Edit mode is disabled immediately so viewer affordances stay hidden while connecting.
3. The client transport sends `hello` on open, including `name` when the viewer entered one (`playerName`).
4. Incoming data is passed through `parseMessage()`; valid `state`, `card` and `answer` messages are applied to the quiz store. Invalid messages are ignored.
5. Close/error callbacks set `idle`/`error` with a German message.

## `src/net/protocol.ts` — wire protocol

`PROTOCOL_VERSION = 2`.

| Message | Direction | Shape |
| --- | --- | --- |
| `state` | host → viewer | `{ type: 'state', snapshot: GameSnapshot }` |
| `card` | host → viewer | `{ type: 'card', card: CardPayload }` |
| `answer` | host → viewer | `{ type: 'answer', answer: AnswerPayload }` |
| `hello` | viewer → host | `{ type: 'hello', name?: string }` |

`GameSnapshot` contains only visible board data:

```ts
{
  v: number
  themes: Array<{ id, themeText, questions: Array<{ points }> }>
  players: Array<{ id, name, score }>
  answeredBy: Array<[string, string]>
  openCard: { themeId, points } | null
  answerRevealed: boolean
}
```

`createSnapshot()` builds this from the store. `answeredBy` is converted to entry pairs so JSON/BinaryPack transport works.

`parseMessage(raw)` accepts objects or JSON strings and validates every field (`isGameSnapshot`, `isCardPayload`, `isAnswerPayload`). Unknown or malformed messages return `null`.

## `src/net/transport.ts` — PeerJS wrapper

| Item | Value / behaviour |
| --- | --- |
| Peer id prefix | `quizshow-` |
| Room code length | 6 characters |
| Alphabet | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O`, `1/I`) |
| `generateRoomCode()` | `crypto.getRandomValues()` |
| `roomIdFromCode(code)` | `quizshow-<CODE>` |
| Host | Creates a `Peer` with the room id, accepts data connections, tracks viewers in a `Set`. |
| Client | Creates an anonymous `Peer`, connects to the host with `{ reliable: true }`, sends `hello`. |
| `send` / `broadcast` | Send to all open connections (client: its single connection). |
| `close()` | Closes connections and destroys the peer. |

Error mapping (`describeError`) covers `unavailable-id`, `peer-unavailable`, network/server/socket errors, browser incompatibility, WebRTC failures and a generic fallback.

Only signalling uses the PeerJS cloud; game data flows over a WebRTC data channel.

## `electron/main.ts` — window and file dialogs

- `BrowserWindow` 1280×800, `autoHideMenuBar`, preload `preload.mjs`, `contextIsolation: true`, `nodeIntegration: false`.
- Development: loads `VITE_DEV_SERVER_URL`. Production: loads `dist/index.html`.
- `quiz:export` opens a save dialog (`quizshow.json` default), writes the JSON string, returns `{ success, canceled, path?, error? }`.
- `quiz:import` opens an open-file dialog filtered to JSON, reads the file and returns `{ success, canceled, data?, error? }`.
- `window-all-closed` quits outside macOS; `activate` recreates the window.

## `electron/preload.ts` — bridge

`window.electronAPI` exposes exactly:

```ts
{
  platform: string
  exportQuiz(json: string): Promise<{ success; canceled; path?; error? }>
  importQuiz(): Promise<{ success; canceled; data?; error? }>
}
```

## `src/utils/image.ts` and `src/utils/audio.ts`

| Helper | Rule |
| --- | --- |
| `isImageFile(file)` | `file.type` starts with `image/` |
| `fileToImageDataUrl(file)` | Reads as data URL; downscales so the longest edge is at most 1280 px; keeps PNG for transparency, otherwise JPEG at quality 0.85 |
| `isAudioFile(file)` | `file.type` starts with `audio/` |
| `fileToAudioDataUrl(file)` | Reads as data URL; rejects files larger than 10 MB |

Images can be added by drag-and-drop or paste in the question field. Audio is selected through the file input.

## Tests

`src/test/` contains 14 specs run with Vitest and jsdom:

| Area | Specs |
| --- | --- |
| App shell | `App.spec.ts` |
| Components | `components/network-ui.spec.ts`, `PlayerPanel.spec.ts`, `PointButton.spec.ts`, `QuestionModal.spec.ts`, `QuizshowTable.spec.ts`, `ThemeColumn.spec.ts` |
| Network | `net/protocol.spec.ts`, `net/transport.spec.ts` |
| Stores | `stores/network.store.spec.ts`, `quiz.store.spec.ts`, `quiz.sync.spec.ts` |
| Utilities | `utils/audio.spec.ts`, `utils/image.spec.ts` |

Global setup is in `src/test/setup.ts` (jsdom stubs for `alert`/`confirm`, `crypto.randomUUID`). No test establishes a real PeerJS connection or opens native dialogs.
