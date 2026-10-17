/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

type QuizFileResult = {
  success: boolean
  canceled: boolean
  path?: string
  data?: string
  error?: string
}

interface ElectronAPI {
  platform: string
  exportQuiz: (json: string) => Promise<QuizFileResult>
  importQuiz: () => Promise<QuizFileResult>
}

interface Window {
  electronAPI: ElectronAPI
}
