import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fileToAudioDataUrl, isAudioFile, MAX_AUDIO_BYTES } from '@/utils/audio'

const AUDIO_DATA_URL = 'data:audio/mpeg;base64,AAAA'

let readerResult: string | null = AUDIO_DATA_URL
let readerFails = false

// jsdom liefert keine zuverlässige FileReader-Implementierung, daher gesteuert.
class MockFileReader {
  result: string | null = null
  error: Error | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  readAsDataURL(): void {
    queueMicrotask(() => {
      if (readerFails) {
        this.error = new Error('read failed')
        this.onerror?.()
      } else {
        this.result = readerResult
        this.onload?.()
      }
    })
  }
}

const makeFile = (type: string, size = 4, name = 'song'): File => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('isAudioFile', () => {
  it('erkennt Audio-MIME-Typen', () => {
    expect(isAudioFile(makeFile('audio/mpeg'))).toBe(true)
    expect(isAudioFile(makeFile('audio/wav'))).toBe(true)
    expect(isAudioFile(makeFile('audio/ogg'))).toBe(true)
  })

  it('erkennt Nicht-Audio-Dateien', () => {
    expect(isAudioFile(makeFile('image/png'))).toBe(false)
    expect(isAudioFile(makeFile('application/pdf'))).toBe(false)
    expect(isAudioFile(makeFile(''))).toBe(false)
  })
})

describe('fileToAudioDataUrl', () => {
  beforeEach(() => {
    readerResult = AUDIO_DATA_URL
    readerFails = false
    vi.stubGlobal('FileReader', MockFileReader)
  })

  it('wirft bei Nicht-Audiodateien', async () => {
    await expect(fileToAudioDataUrl(makeFile('image/png'))).rejects.toThrow(
      'Bitte eine Audiodatei auswählen.'
    )
  })

  it('gibt eine Audiodatei als Data-URL zurück', async () => {
    const result = await fileToAudioDataUrl(makeFile('audio/mpeg'))

    expect(result).toBe(AUDIO_DATA_URL)
  })

  it('akzeptiert eine Datei genau an der Größengrenze', async () => {
    const result = await fileToAudioDataUrl(makeFile('audio/mpeg', MAX_AUDIO_BYTES))

    expect(result).toBe(AUDIO_DATA_URL)
  })

  it('wirft bei zu großen Dateien', async () => {
    await expect(
      fileToAudioDataUrl(makeFile('audio/mpeg', MAX_AUDIO_BYTES + 1))
    ).rejects.toThrow('Die Audiodatei ist zu groß (max. 10 MB).')
  })

  it('wirft, wenn der Reader fehlschlägt', async () => {
    readerFails = true

    await expect(fileToAudioDataUrl(makeFile('audio/mpeg'))).rejects.toThrow('read failed')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
