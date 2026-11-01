/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// Set by the Electron preload script (see shared/ipc.ts); missing in a plain browser.
interface Window {
  electronAPI?: import('../shared/ipc').ElectronAPI
}
