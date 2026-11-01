import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fileToAudioDataUrl, isAudioFile, MAX_AUDIO_BYTES } from '@/utils/audio'

const AUDIO_DATA_URL = 'data:audio/mpeg;base64,AAAA'

let readerResult: string | null = AUDIO_DATA_URL
let readerFails = false

// jsdom does not provide a reliable FileReader implementation, so it is controlled.
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
  it('recognizes audio MIME types', () => {
    expect(isAudioFile(makeFile('audio/mpeg'))).toBe(true)
    expect(isAudioFile(makeFile('audio/wav'))).toBe(true)
    expect(isAudioFile(makeFile('audio/ogg'))).toBe(true)
  })

  it('recognizes non-audio files', () => {
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

  it('throws for non-audio files', async () => {
    await expect(fileToAudioDataUrl(makeFile('image/png'))).rejects.toThrow(
      'Bitte eine Audiodatei auswählen.',
    )
  })

  it('returns an audio file as a data URL', async () => {
    const result = await fileToAudioDataUrl(makeFile('audio/mpeg'))

    expect(result).toBe(AUDIO_DATA_URL)
  })

  it('accepts a file exactly at the size limit', async () => {
    const result = await fileToAudioDataUrl(makeFile('audio/mpeg', MAX_AUDIO_BYTES))

    expect(result).toBe(AUDIO_DATA_URL)
  })

  it('throws for files that are too large', async () => {
    await expect(fileToAudioDataUrl(makeFile('audio/mpeg', MAX_AUDIO_BYTES + 1))).rejects.toThrow(
      'Die Audiodatei ist zu groß (max. 10 MB).',
    )
  })

  it('throws when the reader fails', async () => {
    readerFails = true

    await expect(fileToAudioDataUrl(makeFile('audio/mpeg'))).rejects.toThrow('read failed')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
