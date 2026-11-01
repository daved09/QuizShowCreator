import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// dist/ is the Vite renderer output, dist-electron/ holds main + preload
process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null = null
// Set by vite-plugin-electron during dev
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

const createWindow = () => {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST as string, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

const registerIpcHandlers = () => {
  ipcMain.handle('quiz:export', async (_event, json: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Quiz exportieren',
      defaultPath: 'quizshow.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }
    try {
      await writeFile(result.filePath, json, 'utf-8')
      return { success: true, canceled: false, path: result.filePath }
    } catch (error) {
      return { success: false, canceled: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('quiz:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Quiz importieren',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }
    try {
      const data = await readFile(result.filePaths[0], 'utf-8')
      return { success: true, canceled: false, data }
    } catch (error) {
      return { success: false, canceled: false, error: (error as Error).message }
    }
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
