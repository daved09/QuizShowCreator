import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fileToImageDataUrl, isImageFile } from '@/utils/image'

const SMALL_DATA_URL = 'data:image/png;base64,AAAA'
const RESIZED_DATA_URL = 'data:image/png;base64,RESIZED'

// Controllable test doubles for the browser APIs that jsdom does not reliably
// provide (i.e. no image decoding / canvas).
let readerResult: string | null = SMALL_DATA_URL
let readerFails = false
let imageSize = { width: 100, height: 100 }
let imageFails = false

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

class MockImage {
  width = 0
  height = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  set src(_value: string) {
    queueMicrotask(() => {
      if (imageFails) {
        this.onerror?.()
      } else {
        this.width = imageSize.width
        this.height = imageSize.height
        this.onload?.()
      }
    })
  }
}

const makeFile = (type: string, name = 'bild'): File => new File(['inhalt'], name, { type })

const drawImage = vi.fn()
const toDataURL = vi.fn(() => RESIZED_DATA_URL)

const installCanvasMocks = (): void => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL)
}

describe('isImageFile', () => {
  it('recognizes image MIME types', () => {
    expect(isImageFile(makeFile('image/png'))).toBe(true)
    expect(isImageFile(makeFile('image/jpeg'))).toBe(true)
    expect(isImageFile(makeFile('image/webp'))).toBe(true)
  })

  it('recognizes non-images', () => {
    expect(isImageFile(makeFile('application/pdf'))).toBe(false)
    expect(isImageFile(makeFile('text/plain'))).toBe(false)
    expect(isImageFile(makeFile(''))).toBe(false)
  })
})

describe('fileToImageDataUrl', () => {
  beforeEach(() => {
    readerResult = SMALL_DATA_URL
    readerFails = false
    imageSize = { width: 100, height: 100 }
    imageFails = false
    vi.stubGlobal('FileReader', MockFileReader)
    vi.stubGlobal('Image', MockImage)
    drawImage.mockClear()
    toDataURL.mockClear()
    installCanvasMocks()
  })

  it('throws for non-image files', async () => {
    await expect(fileToImageDataUrl(makeFile('application/pdf'))).rejects.toThrow(
      'Bitte eine Bilddatei auswählen.'
    )
  })

  it('returns small images unchanged as a data URL', async () => {
    const result = await fileToImageDataUrl(makeFile('image/png'))

    expect(result).toBe(SMALL_DATA_URL)
    expect(drawImage).not.toHaveBeenCalled()
    expect(toDataURL).not.toHaveBeenCalled()
  })

  it('downscales images over 1280px and keeps PNG', async () => {
    imageSize = { width: 2560, height: 1440 }

    const result = await fileToImageDataUrl(makeFile('image/png'))

    expect(result).toBe(RESIZED_DATA_URL)
    expect(drawImage).toHaveBeenCalledTimes(1)
    const [, , , width, height] = drawImage.mock.calls[0]
    expect(width).toBe(1280)
    expect(height).toBe(720)
    expect(toDataURL).toHaveBeenCalledWith('image/png', 0.85)
  })

  it('saves non-PNG images as JPEG', async () => {
    imageSize = { width: 1440, height: 2560 }

    await fileToImageDataUrl(makeFile('image/jpeg'))

    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)
  })

  it('returns the original when no canvas context is available', async () => {
    imageSize = { width: 4000, height: 4000 }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const result = await fileToImageDataUrl(makeFile('image/png'))

    expect(result).toBe(SMALL_DATA_URL)
    expect(toDataURL).not.toHaveBeenCalled()
  })

  it('throws when the image cannot be loaded', async () => {
    imageFails = true

    await expect(fileToImageDataUrl(makeFile('image/png'))).rejects.toThrow(
      'Bild konnte nicht geladen werden.'
    )
  })

  it('throws when the reader fails', async () => {
    readerFails = true

    await expect(fileToImageDataUrl(makeFile('image/png'))).rejects.toThrow('read failed')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
