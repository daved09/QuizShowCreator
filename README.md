# Quizshow Creator

A quiz show app built with Vue 3 and Electron, using Pinia for state management.

## Prerequisites

- Node.js >= 22.12 (required by Electron 44 for install/CLI; the app itself bundles Node 24.22)
- npm

## Project setup

```
npm install
```

## Available scripts

| Command              | Description                                                                    |
| -------------------- | ------------------------------------------------------------------             |
| `npm run dev`        | Start the Vite dev server (alias: `npm run electron:dev`)                      |
| `npm run build`      | Type-check (`vue-tsc --noEmit`) and build for production                       |
| `npm run type-check` | Run the TypeScript/Vue type check without emitting output                      |
| `npm run preview`    | Preview the production build locally                                           |
| `npm run lint`       | Lint and auto-fix (ESLint flat config)                                         |
| `npm run format`     | Format sources with Prettier                                                   |
| `npm run test`       | Run the automated tests once (Vitest)                                          |
| `npm run test:watch` | Run the tests in watch mode                                                    |
| `npm run test:coverage` | Run the tests with a coverage report (in `coverage/`)                       |
| `npm run dist`       | Build and package the app as AppImage and Windows executable into `release/`   |
| `npm run dist:dir`   | Same as `dist`, but only produce the unpacked directory (no image)             |
| `npm run dist:win`   | Build a portable Windows executable (`.exe`, no setup) into `release/`         |

> **Note:** Windows builds are produced with NSIS under the hood, so
> building them on Linux/macOS requires [Wine](https://www.winehq.org/)
> to be installed. Alternatively build on Windows or in CI. The portable
> `.exe` runs without installation.


## Testing

The project uses [Vitest](https://vitest.dev) with `@vue/test-utils` and a jsdom
environment. All tests live under `src/test/` (mirroring the `src/` structure) and
are named `*.spec.ts`.

```
npm run test          # single run
npm run test:watch    # watch mode
npm run test:coverage # coverage report (v8) in coverage/
```

Global setup (jsdom stubs for `alert`/`confirm`, `crypto.randomUUID`) is in
`src/test/setup.ts`; the test-only configuration is in `vitest.config.ts`.


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
- Electron 44 (Chromium 152, Node 24.22) + electron-builder
- TypeScript + vue-tsc
- ESLint 10 (flat config) + Prettier
