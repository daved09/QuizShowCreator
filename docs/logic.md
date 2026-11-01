# Backend logic — QuizShowCreator

Covers `src/stores/*`, `src/net/*`, `src/quiz/*`, `src/composables/*`, `src/types/*`, `src/constants.ts`, `src/utils/*`, `electron/main.ts` and `electron/preload.ts`.

## Shared modules

- `src/types/quiz.ts` — domain types `Theme`, `Question`, `Player` and `OpenCard`, used by the stores, components and the protocol (no store ↔ protocol type cycle).
- `src/constants.ts` — `DEFAULT_POINTS` and the input limits `MAX_PLAYER_NAME_LENGTH` (10), `MAX_THEME_NAME_LENGTH` (15), `MAX_QUESTION_LENGTH` (500), `MAX_ANSWER_LENGTH` (250).
- `src/quiz/card.ts` — `cardKey(themeId, points)` (`"<themeId>:<points>"`), `isSameCard`, `findTheme`, `findQuestion`.
- `src/quiz/player.ts` — `normalizePlayerName` (trim and cut to `MAX_PLAYER_NAME_LENGTH`), used by the quiz store and the network store.
- `src/utils/guards.ts` — `isRecord`, `isFiniteNumber` for validating imported files and network messages.
- `src/utils/file.ts` — `readFileAsDataUrl`, shared by the image and audio helpers.
- `src/quiz/quizFile.ts` — the quiz JSON format: `QUIZ_FILE_VERSION`, `QuizFile`, `createQuizFile()` and `parseQuizFile()` (see *Import and export*).
- `src/composables/useQuizFile.ts` — `exportQuiz()` / `importQuiz()` via the native Electron dialogs, with confirmation and error messages.
- `src/composables/useMediaDrop.ts` — drag & drop and paste of image/audio files into the question field.
- `src/utils/dialogs.ts` — `showError()` and `confirmAction()`, the single place that calls `alert()` / `confirm()`.
- `src/composables/usePermissions.ts` — `canControl` (host or offline: open/close cards, reveal answers, award points, toggle the mode) and `canEdit` (`canControl` plus edit mode: change the board, import/export). Components use these instead of checking `isClient` themselves.

Renderer / GUI in [gui.md](./gui.md); architecture in [overview.md](./overview.md).

## `src/stores/quiz.store.ts` — quiz state

Single source of truth for themes, questions, players, scoring and the open card. File parsing and multiplayer sync live outside the store (`src/quiz/quizFile.ts`, `src/net/hostSync.ts`, `src/net/viewerSync.ts`).

### Types

Domain types live in `src/types/quiz.ts`, `QuizFile` in `src/quiz/quizFile.ts`. The store exports `ImportResult` and `BoardState` (the full board, as loaded from a snapshot).

```ts
type Theme = { id: string; themeText: string; questions: Question[] }
type Question = { points: number; question: string; answer: string; image?: string; audio?: string }
type Player = { id: string; name: string; score: number }
type QuizFile = { app: 'QuizShowCreator'; version: number; themes: Theme[]; players: Player[] }
```

- `DEFAULT_POINTS = [100, 200, 300, 400, 500]` (from `src/constants.ts`)
- `QUIZ_FILE_VERSION = 4` (from `src/quiz/quizFile.ts`)
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

### Board actions

| Action | Behaviour |
| --- | --- |
| `setEditMode` / `toggleEditMode` | Switch between edit and play mode. Entering edit mode closes a card opened while playing. |
| `addColumn` | Appends a theme `New Theme` with the default 100–500 cards. |
| `removeTheme` | Removes a theme by id. |
| `updateThemeText` | Renames a theme. |
| `updateQuestionContent` | Replaces question, answer, image and audio of a card; the point value stays fixed. Returns `false` for an unknown card. |
| `addPlayer` | Adds a player; names are trimmed and cut to 10 characters, empty names become `Spieler <n>`. |
| `removePlayer` / `renamePlayer` | Removes or renames a player; renames are trimmed and cut to 10 characters, empty renames keep the old name. |
| `awardPointsForCard` | Adds the card value to a player and records `answeredBy`. |
| `isAnswered` / `getAnsweredBy` | Look up the answered state for a card. |
| `openQuestion` | Opens a card and reveals the answer immediately when it was already answered. |
| `closeQuestion` | Clears the open card and the reveal flag. |
| `setAnswerRevealed` / `toggleAnswerRevealed` | Controls answer visibility. |
| `resetRound` | Sets all scores to zero, clears `answeredBy` and closes the card. |

### Multiplayer actions

| Action | Purpose |
| --- | --- |
| `loadBoard(state)` | Replaces themes, players, `answeredBy`, open card and reveal flag at once (used by the viewer sync). |
| `patchQuestion(themeId, points, patch)` | Overwrites content fields (question, answer, image, audio) of one card. |

### Import and export

`exportQuiz()` returns `createQuizFile(themes, players)`.

`importQuiz(data)` validates the document with `parseQuizFile()` and, on success, replaces the board. `parseQuizFile` is a pure function:

1. Root must be an object with an array `themes`.
2. Every theme needs a string `themeText` and an array `questions`.
3. Every question needs finite numeric `points` and string `question`/`answer`.
4. `image` is kept only when it starts with `data:image/`; `audio` only with `data:audio/`.
5. Questions are sorted by points; theme ids are regenerated.
6. `players` is optional; when present it must be an array of objects with a string `name`; invalid scores become `0`.
7. On success, the store clears `answeredBy` and closes the open card.

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

1. `startHosting()` leaves an existing session, creates a room code, a `HostSync` and a host transport.
2. On `onOpen`, the status becomes `connected` and `startWatching()` watches the serialized content-free snapshot (`JSON.stringify(createSnapshot(quiz))`). Only changes viewers can see trigger a push; editing question texts, answers or media does not.
3. Every change calls `pushState()`, which broadcasts `hostSync.messagesFor(quiz)` (see *content sync* below): the `card` once per open, the `answer` once revealed (or `null` once hidden), and always the `state` snapshot last.
4. On viewer join, `hostSync.reset()` and push again so the new viewer receives the current card.
5. Viewer data is ignored except `hello`: a name (trimmed, max. 10 chars) claims an unclaimed player with the same name (case-insensitive) or adds a new one (`Anna 2` if the name is taken by another viewer). The `peerId -> playerId` mapping is dropped when the viewer leaves; the player itself stays.
6. `leave()` increments a session id, closes the transport and resets role, status, room code, viewer count and error.

`startSession()` bumps the session id and returns a `guard` wrapper; every transport callback is wrapped with it, so callbacks from a previous session cannot mutate the new one. Close and error callbacks of host and client share `connectionClosed(message)` / `connectionFailed(message)`.

### Client flow

1. `join(code)` trims and uppercases the code; an empty code sets status `error`.
2. Edit mode is disabled immediately so viewer affordances stay hidden while connecting.
3. The client transport sends `hello` on open, including `name` when the viewer entered one (`playerName`).
4. Incoming data is passed through `parseMessage()`; valid `state`, `card` and `answer` messages go to a `ViewerSync` (see below) created fresh for each `join`. Invalid messages are ignored.
5. Close/error callbacks set `idle`/`error` with a German message.

## `src/net/hostSync.ts` and `src/net/viewerSync.ts` — content sync

Host side:

| Function | Purpose |
| --- | --- |
| `createCardPayload(themes, card, answerRevealed)` | `card` payload for the open card; includes the answer only when revealed. |
| `getCardAnswer(themes, card)` | The answer of a card, shipped once it is revealed. |
| `createHostSync()` | Returns `{ messagesFor(board), reset() }`. Remembers the last shipped card and whether its answer is known, and returns the messages to broadcast: `card` once per open (with the answer if it is already revealed), `answer` once revealed, `answer: null` once hidden again, and always the `state` snapshot (`createSnapshot(board)`) last. `reset()` forgets what was sent, e.g. for a newly joined viewer. |

Viewer side, `createViewerSync(quiz)` returns:

| Function | Purpose |
| --- | --- |
| `applySnapshot(snapshot)` | Loads the board via `loadBoard`; every question becomes `{ points, question: '', answer: '' }` except the open card, which is filled from the cached content. |
| `applyCard(card)` | Caches the card content and applies it when the card is open. |
| `applyAnswer(payload)` | Sets or clears the answer of the open card. |

The content cache lives inside the `ViewerSync` instance. Closing the card or switching to a different one drops it, so viewers never retain content they cannot see; a new `join` starts with an empty cache.

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
| `broadcast` (host) / `send` (client) | `createHostTransport` returns a `HostTransport` that broadcasts to all open connections; `createClientTransport` returns a `ClientTransport` that sends over its single connection. |
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

`src/test/` contains 21 specs run with Vitest and jsdom:

| Area | Specs |
| --- | --- |
| App shell | `App.spec.ts` |
| Components | `components/base/BaseModal.spec.ts`, `components/network-ui.spec.ts`, `PlayerPanel.spec.ts`, `PointButton.spec.ts`, `QuestionModal.spec.ts`, `QuizshowTable.spec.ts`, `ThemeColumn.spec.ts` |
| Composables | `composables/usePermissions.spec.ts` |
| Network | `net/protocol.spec.ts`, `net/transport.spec.ts`, `net/hostSync.spec.ts`, `net/viewerSync.spec.ts` |
| Quiz helpers | `quiz/card.spec.ts`, `quiz/player.spec.ts`, `quiz/quizFile.spec.ts` |
| Stores | `stores/network.store.spec.ts`, `stores/quiz.store.spec.ts` |
| Utilities | `utils/audio.spec.ts`, `utils/image.spec.ts`, `utils/guards.spec.ts` |

Global setup is in `src/test/setup.ts` (jsdom stubs for `alert`/`confirm`, `crypto.randomUUID`). No test establishes a real PeerJS connection or opens native dialogs.
