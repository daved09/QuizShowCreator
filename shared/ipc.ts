// Contract between the Electron main process, the preload bridge and the
// renderer (`window.electronAPI`). Shared by electron/ and src/.

export const IPC_CHANNELS = {
  exportQuiz: 'quiz:export',
  importQuiz: 'quiz:import',
} as const

// Result of a native file dialog. `canceled` is set when the user closed the
// dialog; `data` carries the file content on import, `path` the target on export.
export type QuizFileResult = {
  success: boolean
  canceled: boolean
  path?: string
  data?: string
  error?: string
}

export type ElectronAPI = {
  platform: string
  exportQuiz: (json: string) => Promise<QuizFileResult>
  importQuiz: () => Promise<QuizFileResult>
}
