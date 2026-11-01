# QuizShowCreator

A quiz show app built with Vue 3 and Electron, with Pinia state, JSON import/export and peer-to-peer multiplayer.

The board is a grid of themes and point values. The host edits questions, opens cards, reveals answers and awards points; viewers can follow a session live over the internet.

## Features

- Theme columns with question cards for 100, 200, 300, 400 and 500 points
- Edit and play modes with a single toggle
- Question text, answer, optional image and optional audio per card
- Player panel with add, rename, remove, scoring and round reset
- Import/export of the complete quiz as JSON
- Answer reveal controlled by the host, including re-hiding
- **Multiplayer (peer-to-peer):** host a room with a short code; any number of viewers join read-only
- Viewer synchronization: board state, open card, question media and revealed answer
- Dark UI with responsive board layout

## Tech stack

Electron 44 · Vue 3.5 · Pinia 4 · TypeScript 5.9 · Vite 8 · vite-plugin-electron 1 · electron-builder 26 · Vitest 5 · @vue/test-utils · PeerJS 1.5

## Requirements

- Node.js 22.12 or newer (required by the Electron 44 toolchain; the app bundles Node 24.22)
- npm
- Internet access for multiplayer (PeerJS signalling and WebRTC)
- For Windows builds on Linux/macOS: [Wine](https://www.winehq.org/)

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` starts Vite and launches Electron through `vite-plugin-electron`.

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite and Electron |
| `npm run build` | Type-check with `vue-tsc` and build for production |
| `npm run type-check` | Type-check without emitting output |
| `npm run preview` | Preview the renderer build |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Coverage report in `coverage/` |
| `npm run lint` | Lint and auto-fix (ESLint flat config) |
| `npm run format` | Format sources with Prettier |
| `npm run format:check` | Check formatting without writing changes |
| `npm run dist` | Build and package AppImage + Windows executable into `release/` |
| `npm run dist:dir` | Build the unpacked app without an installer |
| `npm run dist:win` | Build a portable Windows `.exe` |

## Usage

1. Add theme columns with **Spalte hinzufügen** and rename a column by clicking its header.
2. Click a point card in edit mode to enter question, answer and optional image/audio. Images can be dropped or pasted into the question field.
3. Add players in the right-hand panel; click a name to rename it.
4. Switch from **Bearbeiten** to **Spielen**.
5. Open a card, reveal the answer and award the points to a player.
6. Use **Runde zurücksetzen** to set all scores to zero and release every card.
7. Use **Importieren** / **Exportieren** to save or load a quiz JSON file.

### Multiplayer

1. Click **Online spielen** in the header.
2. **Spiel hosten** creates a room code (six characters, for example `K7Q2XM`).
3. On another device, open **Online spielen**, enter your name and the code and click **Beitreten**.
   The name is added to the host's player list automatically (an existing player with the same name is reused, so a reconnect keeps its score). Without a name, the host adds players manually as before.
4. The viewer switches to read-only mode and mirrors the board, the open card and its media.
5. **Beenden** / **Verlassen** ends the session.

Under the hood:

- Connectivity uses WebRTC via [PeerJS](https://peerjs.com). Only signalling goes through PeerJS' public cloud server; game data flows peer-to-peer.
- The **host is authoritative**. It broadcasts a content-free board snapshot (themes, point values, players, scores, answered cards, open card) on every change.
- Question text and media are sent separately as a `card` message when a card is opened. The answer follows only after it is revealed, and can be hidden again.
- Viewers never receive content they cannot currently see. They cannot edit questions, open cards or award points.
- The only viewer input is the optional name in the `hello` handshake. The host turns it into a player entry.

## Configuration

There is no application settings file. Quizzes are imported and exported as JSON from the app header; the format is:

```json
{
  "app": "QuizShowCreator",
  "version": 4,
  "themes": [
    {
      "id": "uuid",
      "themeText": "Theme",
      "questions": [
        { "points": 100, "question": "…", "answer": "…", "image": "data:image/…", "audio": "data:audio/…" }
      ]
    }
  ],
  "players": [{ "id": "uuid", "name": "Player", "score": 0 }]
}
```

- Images and audio are embedded as Base64 data URLs, so the JSON is self-contained.
- Images are downscaled to a maximum edge length of 1280 px before saving.
- Audio files are limited to 10 MB.
- Older files without images, audio or players remain readable.
- On import, existing themes are replaced after confirmation and the answered state is reset.

## Architecture & security

```text
Renderer (Vue 3 + Pinia)
   │  window.electronAPI (contextBridge)         │  PeerJS / WebRTC
   ▼                                             ▼
Electron main (file dialogs, import/export)   Remote host / viewers
```

- `contextIsolation: true`, `nodeIntegration: false`; the renderer only gets the minimal `window.electronAPI` bridge.
- The bridge exposes `platform`, `exportQuiz(json)` and `importQuiz()`. File access happens only in the main process and only for paths chosen in a native dialog.
- The window is 1280×800 and loads `dist/index.html` in production; the dev server URL is injected by `vite-plugin-electron`.
- Incoming multiplayer messages are validated by `parseMessage()`; malformed messages are ignored.
- Multiplayer is read-only for viewers by design; the host ignores incoming viewer data.

The module reference is in [`docs/logic.md`](./docs/logic.md), the UI reference in [`docs/gui.md`](./docs/gui.md).

## Project structure

```text
electron/
  main.ts             # window, lifecycle, quiz import/export IPC
  preload.ts          # window.electronAPI bridge
src/
  App.vue             # header, mode toggle, lobby, board and player panel
  constants.ts        # default point values and input length limits
  types/quiz.ts       # shared domain types (Theme, Question, Player, OpenCard)
  quiz/               # card lookup helpers and player name normalization
  components/         # board, cards, modals, connection status, player panel
  net/protocol.ts     # wire protocol, snapshot creation and validation
  net/transport.ts    # PeerJS host/client transport and room codes
  stores/quiz.store.ts    # themes, questions, players, scoring, import/export
  stores/network.store.ts # host/client role, connection, synchronization
  utils/              # image downscaling, audio data URLs, file reading, type guards
  test/               # Vitest + @vue/test-utils specs (jsdom)
  assets/             # global CSS and logo
docs/                 # architecture, backend and GUI documentation
```

See [`docs/overview.md`](./docs/overview.md) for the complete file map.

## Documentation

- [Architecture overview](./docs/overview.md) — process model, directory layout, IPC, scripts, protocol overview
- [Backend logic](./docs/logic.md) — quiz store, network store, protocol, transport, Electron entry
- [Renderer / GUI](./docs/gui.md) — App shell, components, modals, state and user flows

## Tests

```bash
npm test
```

The suite uses Vitest with `@vue/test-utils` and a jsdom environment. Specs live under `src/test/` (mirroring `src/`) and are named `*.spec.ts`. They cover the app shell, network UI, player panel, point buttons, question modal, board, theme columns, protocol validation, transport, both stores, quiz synchronization, card and player helpers, type guards, image handling and audio handling.

Global setup (jsdom stubs for `alert`/`confirm`, `crypto.randomUUID`) is in `src/test/setup.ts`; the test configuration is `vitest.config.ts`.

## Packaging

```bash
npm run dist
```

`electron-builder` writes artifacts to `release/`. Linux produces an AppImage; Windows produces a portable `.exe` (NSIS under the hood, so building on Linux/macOS requires Wine). The renderer is built to `dist/` and the Electron main/preload bundles to `dist-electron/`.

## Known limitations

- Quizzes live in memory only; export before closing the app if you want to keep changes.
- Multiplayer requires the host to stay online. There is no reconnect logic.
- PeerJS uses public signalling and a default STUN configuration. Symmetric NATs may require a TURN server, which is not configured.
- Anyone who knows the room code can join as a viewer.
- Embedded Base64 media grows the quiz JSON quickly; audio is capped at 10 MB per file.
- Viewer mode is intentionally read-only; there is no shared editing or moderation.
- Only Linux AppImage and Windows portable targets are configured.
- No automated end-to-end test covers a real PeerJS connection.

## License

GNU General Public License v3.0. See [LICENSE](./LICENSE).
