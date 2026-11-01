# Renderer / GUI — QuizShowCreator

Covers `src/App.vue`, `src/components/*`, `src/stores/*` and the renderer entry point.
Backend logic in [logic.md](./logic.md); architecture in [overview.md](./overview.md).

The UI is a single screen: a header with import/export, multiplayer and edit-mode controls, a board of theme columns, and a sticky player panel.

## `src/App.vue` — shell

| Area | Content |
| --- | --- |
| Header | Title, import/export/add-column buttons (edit mode only), `ConnectionStatus`, edit/play toggle |
| Body | `QuizshowTable` (left, flexible) and `PlayerPanel` (right, 15 rem) |
| Overlay | `LobbyModal` when **Online spielen** is clicked |

Header actions:

- **Importieren** — native file dialog, parses JSON, asks for confirmation when themes exist, then calls `quizStore.importQuiz()`.
- **Exportieren** — serializes `quizStore.exportQuiz()` and opens a native save dialog.
- **Spalte hinzufügen** — adds a theme column.
- **Bearbeiten/Spielen** — `quizStore.toggleEditMode()`; hidden for viewers.
- **Online spielen** — opens the lobby.

Invalid import data and file errors are reported with `alert()`.

## Components

### `QuizshowTable.vue`

- Renders one `ThemeColumn` per theme inside a flexible row.
- Resolves the selected card from `quizStore.openCard` and only renders `QuestionModal` when both theme and question exist.
- `mode` is `edit` only when `quizStore.isEditMode` is true **and** the user is not a viewer.
- Handlers:
  - `openCard(themeId, points)` — ignored for viewers.
  - `closeCard()` — ignored for viewers.
  - `saveCard(data)` — calls `updateQuestionFull()`; a duplicate point value shows `Diese Punktzahl existiert in dieser Spalte bereits.`
  - `awardCard(playerId)` — awards and closes the card.
- The modal is keyed by theme + points so switching cards resets its local draft.

### `ThemeColumn.vue`

- Props: `theme: Theme`.
- Header is click-to-edit in edit mode (max 15 characters); `Enter`/blur saves, `Esc` cancels.
- Delete button asks for confirmation and removes the theme.
- Emits `cardClicked(themeId, points)` for each `PointButton`.
- Discards an in-progress header edit when leaving edit mode.

### `PointButton.vue`

- Props: `points`, `editMode`, `answered`, `answeredBy`, `hasImage`, `hasAudio`.
- Emits `pointButtonClicked(points)`.
- Shows a check mark when answered, a pencil in edit mode, and image/audio badges for cards with media.
- The tooltip names the player who answered.

### `QuestionModal.vue`

Two modes:

| Mode | Content |
| --- | --- |
| `view` | Question text, image (click for lightbox), audio player, answer if revealed, reveal/hide button (host only), award buttons (host, after reveal) |
| `edit` | Question textarea (max 500), optional image preview/removal, optional audio preview/removal, answer textarea (max 250), save/cancel |

- Images and audio can be dropped or pasted into the question textarea; files are validated and converted by the utility helpers.
- `isRevealed` comes from the `revealed` model when bound, otherwise from `answeredBy`.
- The modal closes on `Esc` or when the backdrop is clicked directly. Focus moves to the first field in edit mode and to the reveal/close button in view mode.
- The lightbox shows the full question image and closes on click.

### `PlayerPanel.vue`

- Lists players with score; in edit mode names are click-to-edit (max 10 characters) and removable.
- Add form with a max-10-character name.
- **Runde zurücksetzen** asks for confirmation, then zeroes scores and releases all cards.
- The panel is hidden from viewers? — no, viewers see scores read-only because edit affordances depend on `isEditMode`, which is forced to `false` for clients.

### `ConnectionStatus.vue`

| State | Display |
| --- | --- |
| Offline | **Online spielen** button (emits `openLobby`) |
| Host | `Host · <code>`, viewer count, **Beenden** |
| Client | `Verbinde …`, `Verbunden · <code>` or the error text, **Verlassen** |

### `LobbyModal.vue`

- Host section: **Spiel hosten**; once live, shows the room code with **Kopieren**, viewer status and **Hosting beenden**.
- Join section: code input (max 8 characters) and **Beitreten**; while connected shows status and **Verbindung trennen**.
- Backdrop click and the close button emit `close`.
- Copy uses `navigator.clipboard` and silently ignores failures.

## Stores in the UI

| Store | Used by | Notes |
| --- | --- | --- |
| `quiz` | App, board, columns, cards, player panel | Board state, scoring, edit mode, open card, reveal flag |
| `network` | App, `ConnectionStatus`, `LobbyModal`, `QuizshowTable`, `QuestionModal` | Role/status, room code, viewer count, host/join/leave |

Viewer mode is enforced in the components: board clicks, closing cards, import/export, add-column and the edit toggle are hidden or ignored when `networkStore.isClient` is true.

## User flows

**Author a quiz**

1. Add columns and rename headers.
2. In edit mode, open a point card and fill in question, answer and optional media.
3. Add players and rename them.
4. Export the quiz to JSON.

**Run a round**

1. Switch to **Spielen**.
2. Open a card; the question and media appear.
3. Reveal the answer, then award points to a player.
4. Repeat; use **Runde zurücksetzen** for a new round.

**Host a session**

1. **Online spielen** → **Spiel hosten**.
2. Share the six-character code.
3. Open cards and reveal answers; viewers follow automatically.
4. **Beenden** closes the session.

**Join as a viewer**

1. **Online spielen** → enter the code → **Beitreten**.
2. The app connects, switches to read-only view mode and mirrors the host.
3. **Verlassen** or a connection error returns to offline mode.

## Styling

- Global CSS variables live in `src/assets/base.css` and `main.css`: colours, radii, shadows, transitions and a dark default theme.
- Bootstrap 5 is a dependency, but component styles are scoped and use the custom variables.
- The board is a horizontal flex row with theme columns; the player panel is sticky on the right.
- Dialogs use a fixed backdrop, rounded panels and the same focus-ring treatment as buttons.
