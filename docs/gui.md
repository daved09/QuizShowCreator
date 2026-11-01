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

Import and export live in `useQuizFile()` (`src/composables/useQuizFile.ts`). Invalid import data and file errors are reported via `showError()` from `src/utils/dialogs.ts`, which wraps `alert()`; confirmations use `confirmAction()` (wrapping `confirm()`) there and in `ThemeColumn` / `PlayerPanel`.

## Components

### `QuizshowTable.vue`

- Renders one `ThemeColumn` per theme inside a flexible row.
- `mode` is `edit` when `canEdit` (edit mode **and** not a viewer), otherwise `view`.
- In edit mode, the card being edited is local state (`editingCard`). It never becomes `quizStore.openCard`, so it is not shared with viewers while hosting. Leaving edit mode discards it.
- In play mode, the card is `quizStore.openCard`, which the host shares with viewers.
- Only renders `QuestionModal` when both theme and question of the active card exist.
- Handlers:
  - `openCard(themeId, points)` — ignored for viewers; sets `editingCard` in edit mode, otherwise `quizStore.openQuestion()`.
  - `closeCard()` — ignored for viewers; clears `editingCard` or calls `quizStore.closeQuestion()`.
  - `saveCard(content)` — calls `updateQuestionContent()` for `editingCard` and closes the dialog. Point values are fixed and cannot be edited.
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

### `base/BaseModal.vue`

Dialog frame shared by `QuestionModal` and `LobbyModal`: backdrop, title bar with close cross, optional `width` (default `32rem`) and an `overlay` slot for content above the dialog. The cross, a direct backdrop click and `Esc` all emit `close`.

### `QuestionModal.vue`

Wraps `BaseModal` and shows one of two bodies:

| Mode | Component | Content |
| --- | --- | --- |
| `view` | `question/QuestionView.vue` | Question text, image (click for lightbox), audio player, answer if revealed, reveal/hide button (host only), award buttons (host, after reveal) |
| `edit` | `question/QuestionEditor.vue` | Question textarea (max 500), optional image preview/removal, optional audio preview/removal, answer textarea (max 250), save/cancel. Emits the content without points. |

- Images and audio can be dropped or pasted into the question textarea (`useMediaDrop()` in `src/composables/useMediaDrop.ts`); files are validated and converted by the utility helpers.
- `isRevealed` comes from the `revealed` model when bound, otherwise from `answeredBy`.
- `Esc`, the cross or the backdrop close the lightbox first, then the dialog. Focus moves to the question field in edit mode and to the reveal button in view mode.
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
- Uses `BaseModal`: backdrop click, the close button and `Esc` emit `close`.
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
- `src/assets/ui.css` holds shared building blocks: buttons (`btn`, `btn-primary`, `btn-danger`, `btn-sm`), form fields (`field`, `label`, `text-input`, `error`, `hint`) and dialog content (`modal-body`, `modal-actions`).
- Component styles are scoped and only add what is specific to the component.
- The board is a horizontal flex row with theme columns; the player panel is sticky on the right.
- Dialogs use a fixed backdrop, rounded panels and the same focus-ring treatment as buttons.
