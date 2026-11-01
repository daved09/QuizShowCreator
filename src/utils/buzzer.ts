// Synthesized buzzer sound, so no audio asset has to be shipped.

let context: AudioContext | null = null

const getContext = (): AudioContext | null => {
  if (typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  return context
}

// Plays a short, harsh two-tone buzz. Silently does nothing where audio is
// unavailable (e.g. blocked by the autoplay policy before any user interaction).
export const playBuzzerSound = (): void => {
  try {
    const ctx = getContext()
    if (!ctx) return
    void ctx.resume()
    const start = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
    gain.gain.setValueAtTime(0.4, start + 0.35)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
    gain.connect(ctx.destination)
    for (const frequency of [220, 277]) {
      const oscillator = ctx.createOscillator()
      oscillator.type = 'sawtooth'
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      oscillator.start(start)
      oscillator.stop(start + 0.5)
    }
  } catch {
    // Sound is a nicety; never let it break the game.
  }
}
