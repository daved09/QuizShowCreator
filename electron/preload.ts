import { contextBridge } from 'electron'

// Minimal, safe bridge. Extend with ipcRenderer.invoke() channels
// once the renderer needs file save/load or other native features.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
