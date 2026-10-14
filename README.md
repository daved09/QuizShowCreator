# QuizShowCreator

A quiz show app built with Vue 3 and Electron, using Pinia for state management.

## Prerequisites

- Node.js (tested with v20; `@electron/rebuild` recommends >= 22)
- npm

## Project setup

```
npm install
```

## Available scripts

| Command              | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `npm run dev`        | Start the Vite dev server (alias: `npm run electron:dev`)          |
| `npm run build`      | Type-check (`vue-tsc --noEmit`) and build for production           |
| `npm run type-check` | Run the TypeScript/Vue type check without emitting output          |
| `npm run preview`    | Preview the production build locally                               |
| `npm run lint`       | Lint and auto-fix (ESLint flat config)                             |
| `npm run format`     | Format sources with Prettier                                       |
| `npm run dist`       | Build and package the app as AppImage into `release/`              |
| `npm run dist:dir`   | Same as `dist`, but only produce the unpacked directory (no image) |


## Project structure

```
src/            # Vue renderer (components, stores, assets)
electron/       # Electron main (main.ts) and preload (preload.ts) scripts
dist/           # Production build of the renderer (generated)
dist-electron/  # Production build of main + preload (generated)
release/        # Packaged app artifacts, e.g. the AppImage (generated)
```

## Tech stack

- Vue 3.5 + Pinia 4
- Vite 8 + `@vitejs/plugin-vue`
- Electron 41 + electron-builder
- TypeScript + vue-tsc
- ESLint 10 (flat config) + Prettier
