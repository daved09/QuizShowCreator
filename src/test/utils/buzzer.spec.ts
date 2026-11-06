import { afterEach, describe, expect, it, vi } from 'vitest'

// The module caches its AudioContext, so every test loads a fresh copy.
const loadBuzzer = async () => {
  vi.resetModules()
  return import('@/utils/buzzer')
}

const createFakeContext = () => {
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  const oscillators: Array<Record<string, unknown>> = []
  const ctx = {
    currentTime: 1,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(() => gain),
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: '',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(oscillator)
      return oscillator
    }),
  }
  return { ctx, gain, oscillators }
}

describe('playBuzzerSound', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when AudioContext is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { playBuzzerSound } = await loadBuzzer()

    expect(() => playBuzzerSound()).not.toThrow()
  })

  it('plays two sawtooth oscillators through a gain envelope', async () => {
    const fake = createFakeContext()
    const AudioContextMock = vi.fn(function () {
      return fake.ctx
    })
    vi.stubGlobal('AudioContext', AudioContextMock)
    const { playBuzzerSound } = await loadBuzzer()

    playBuzzerSound()

    expect(fake.ctx.resume).toHaveBeenCalled()
    expect(fake.gain.connect).toHaveBeenCalledWith(fake.ctx.destination)
    expect(fake.oscillators.map((o) => (o.frequency as { value: number }).value)).toEqual([
      220, 277,
    ])
    for (const oscillator of fake.oscillators) {
      expect(oscillator.type).toBe('sawtooth')
      expect(oscillator.start).toHaveBeenCalledWith(1)
      expect(oscillator.stop).toHaveBeenCalledWith(1.5)
    }
  })

  it('reuses the audio context across calls', async () => {
    const fake = createFakeContext()
    const AudioContextMock = vi.fn(function () {
      return fake.ctx
    })
    vi.stubGlobal('AudioContext', AudioContextMock)
    const { playBuzzerSound } = await loadBuzzer()

    playBuzzerSound()
    playBuzzerSound()

    expect(AudioContextMock).toHaveBeenCalledTimes(1)
  })

  it('swallows audio errors', async () => {
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        throw new Error('blocked')
      }),
    )
    const { playBuzzerSound } = await loadBuzzer()

    expect(() => playBuzzerSound()).not.toThrow()
  })
})
