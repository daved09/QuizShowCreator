import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type ElectronAPI } from '../shared/ipc'

// Minimal, safe bridge for native file dialogs used by quiz import/export.
const electronAPI: ElectronAPI = {
  platform: process.platform,
  exportQuiz: (json) => ipcRenderer.invoke(IPC_CHANNELS.exportQuiz, json),
  importQuiz: () => ipcRenderer.invoke(IPC_CHANNELS.importQuiz),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
