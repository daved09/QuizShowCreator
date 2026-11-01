import { describe, expect, it } from 'vitest'
import { MAX_PLAYER_NAME_LENGTH } from '@/constants'
import { normalizePlayerName } from '@/quiz/player'

describe('normalizePlayerName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizePlayerName('  Anna  ')).toBe('Anna')
  })

  it('cuts the name to the maximum length', () => {
    expect(normalizePlayerName('Maximiliane Mustermann')).toHaveLength(MAX_PLAYER_NAME_LENGTH)
  })

  it('returns an empty string for a missing name', () => {
    expect(normalizePlayerName(undefined)).toBe('')
    expect(normalizePlayerName('   ')).toBe('')
  })
})
