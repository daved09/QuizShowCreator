# Overview — QuizShowCreator architecture

QuizShowCreator is a Vue 3 + Electron quiz board with Pinia state, JSON import/export and peer-to-peer multiplayer. A board of themes and point values is edited in the renderer, while a split Electron main process handles native file dialogs. Multiplayer uses PeerJS/WebRTC with the host as the authoritative state owner.

Documentation: [Backend logic](./logic.md) · [Renderer / GUI](./gui.md).

## Tech stack

Electron 44 · Vue 3.5 · Pinia 4 · TypeScript 5.9 · Vite 8 · vite-plugin-electron 1 · electron-builder 26 · Vitest 5 · @vue/test-utils · PeerJS 1.5 · ESLint 10 · Prettier 3.

## Directory layout

```text
electron/
  main.ts                    # BrowserWindow, app lifecycle, quiz import/export IPC
  preload.ts                 # contextBridge API (window.electronAPI)
src/
  App.vue                    # header, mode toggle, lobby, board and player panel
  main.ts                    # createApp + Pinia
  constants.ts               # DEFAULT_POINTS and input length limits
  composables/
    usePermissions.ts        # canControl / canEdit for host, offline and viewer
  assets/                    # base.css, main.css, logo.svg
  components/
    ConnectionStatus.vue     # online state, room code, leave/join entry point
    LobbyModal.vue           # host/join dialog, room code copy
    PlayerPanel.vue          # player list, add/rename/remove, reset round
    PointButton.vue          # point card button with answered/media badges
    QuestionModal.vue        # view/edit card, media, reveal and award
    QuizshowTable.vue        # theme columns and selected-card routing
    ThemeColumn.vue          # theme header and point buttons
  quiz/
    card.ts                  # cardKey, isSameCard, findTheme, findQuestion
    quizFile.ts              # quiz JSON format: createQuizFile, parseQuizFile
    player.ts                # normalizePlayerName
  net/
    protocol.ts              # message types, snapshot creation, validation
    transport.ts             # PeerJS host/client transports, room codes
    hostSync.ts              # host: card/answer payloads for viewers
    viewerSync.ts            # viewer: applies snapshots, cards and answers
  stores/
    quiz.store.ts            # themes, questions, players, scoring, import/export
    network.store.ts         # role, connection state, synchronization
  types/
    quiz.ts                  # Theme, Question, Player, OpenCard
  utils/
    image.ts                 # image validation and downscaling
    audio.ts                 # audio validation and data URLs
    file.ts                  # readFileAsDataUrl (shared by image and audio)
    guards.ts                # isRecord, isFiniteNumber (import + protocol validation)
  test/                      # Vitest specs mirroring the source tree
  vite-env.d.ts              # Window.electronAPI typing
docs/                        # architecture, backend and GUI documentation
index.html                   # Vite HTML entry
vite.config.ts               # Vue + vite-plugin-electron build
vitest.config.ts             # jsdom test configuration
eslint.config.js             # ESLint flat config
```

## Process model

| Layer | Files | Purpose |
| --- | --- | --- |
| Renderer | `src/App.vue`, `src/components/*`, `src/stores/*`, `src/net/*` | Quiz UI, state, scoring, multiplayer synchronization. |
| Preload | `electron/preload.ts` | Minimal `window.electronAPI` bridge: platform, `exportQuiz`, `importQuiz`. |
| Main | `electron/main.ts` | Window/lifecycle and native save/open dialogs; file I/O only for paths chosen by the user. |
| External | PeerJS cloud + WebRTC | Signalling and peer data transport for multiplayer. |
| Tests | `src/test/*` | Vitest + @vue/test-utils with jsdom. |

## File map

| File | Purpose |
| --- | --- |
| `electron/main.ts` | Creates a 1280×800 `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false`; registers `quiz:export` and `quiz:import`; quits on `window-all-closed` outside macOS. |
| `electron/preload.ts` | `contextBridge.exposeInMainWorld('electronAPI', …)` with `platform`, `exportQuiz(json)`, `importQuiz()`. |
| `src/App.vue` | Header actions (import, export, add column), `ConnectionStatus`, edit/play toggle, `QuizshowTable`, `PlayerPanel`, `LobbyModal`. |
| `src/components/QuizshowTable.vue` | Renders one `ThemeColumn` per theme, resolves the selected card, opens `QuestionModal`, handles save/award/close. |
| `src/components/ThemeColumn.vue` | Editable theme header (max 15 characters), delete action, point buttons. |
| `src/components/PointButton.vue` | Point card with edit/answered/media badges. |
| `src/components/QuestionModal.vue` | Edit form and play view; image/audio drop, paste, preview and lightbox; answer reveal; player award buttons. |
| `src/components/PlayerPanel.vue` | Player list, inline rename (max 10 characters), add/remove, reset round. |
| `src/components/LobbyModal.vue` | Host/join sections, room code copy, connection status text. |
| `src/components/ConnectionStatus.vue` | Header badge for offline/host/client, room code, viewer count, leave button. |
| `src/stores/quiz.store.ts` | Board and player state, scoring, import/export entry points. |
| `src/stores/network.store.ts` | Host/client role and transport wiring. |
| `src/net/protocol.ts` | Protocol version 2, message types, content-free snapshots, validators. |
| `src/net/transport.ts` | PeerJS host/client wrappers, six-character room codes, error messages. |
| `src/utils/image.ts` | Image type check, 1280 px downscale, PNG/JPEG data URLs. |
| `src/utils/audio.ts` | Audio type check, 10 MB limit, data URLs. |
| `src/test/*.spec.ts` | Component, store, protocol, transport and utility tests. |

## Dataflow

```text
App.vue / components
   -> quiz store / network store
   -> window.electronAPI (import/export only)
   -> electron main (native dialog + fs)

Host: quiz store change
   -> network store watcher (content-free snapshot) -> pushState()
   -> hostSync.messagesFor() -> transport.broadcast(card | answer | state)
   -> viewer transport.onData()
   -> parseMessage() -> viewerSync.applyCard/applyAnswer/applySnapshot() -> quiz store
```

## IPC channels

| Channel | Direction | Payload → result |
| --- | --- | --- |
| `quiz:export` | renderer → main | `json: string` → `{ success, canceled, path?, error? }` |
| `quiz:import` | renderer → main | — → `{ success, canceled, data?, error? }` |

The renderer never receives a general filesystem API; both handlers open a native dialog and operate only on the selected path.

## Multiplayer protocol

Protocol version: `2`.

| Message | Direction | Purpose |
| --- | --- | --- |
| `state` | host → viewers | Content-free board snapshot: themes/points, players/scores, answered map, open card, reveal flag. |
| `card` | host → viewers | Question text, image/audio and (if already revealed) the answer for the currently open card. |
| `answer` | host → viewers | Reveal an answer (`answer: string`) or hide it again (`answer: null`). |
| `hello` | viewer → host | Connection handshake with the optional player name; the host adds (or reuses) a matching player. |

The host only sends content that is currently visible. A viewer joining mid-session receives the current card content again.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server plus Electron through `vite-plugin-electron` |
| `npm run build` | `vue-tsc --noEmit` and Vite production build |
| `npm run type-check` | Type-check without emitting |
| `npm run preview` | Preview the renderer build |
| `npm test` | Vitest run |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report (v8) |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` / `npm run format:check` | Prettier for `src/`, `electron/` and the config files (write / check only) |
| `npm run dist` | Build and package AppImage + Windows portable into `release/` |
| `npm run dist:dir` | Unpacked build only |
| `npm run dist:win` | Portable Windows executable |

## Build outputs

| Path | Content |
| --- | --- |
| `dist/` | Vite renderer build |
| `dist-electron/` | Electron main and preload bundles |
| `release/` | electron-builder artifacts |

The main process resolves `dist/` relative to `dist-electron/main.js`; in development, `VITE_DEV_SERVER_URL` is provided by `vite-plugin-electron`.
