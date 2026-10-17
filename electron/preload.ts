import { contextBridge, ipcRenderer } from 'electron'

// Minimal, safe bridge for native file dialogs used by quiz import/export.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  exportQuiz: (json: string) => ipcRenderer.invoke('quiz:export', json),
  importQuiz: () => ipcRenderer.invoke('quiz:import'),
})
