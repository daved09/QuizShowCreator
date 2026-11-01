import { describe, expect, it } from 'vitest'
import { isFiniteNumber, isRecord } from '@/utils/guards'

describe('guards', () => {
  it('accepts objects and arrays as records, rejects null and primitives', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(true)
    expect(isRecord(null)).toBe(false)
    expect(isRecord('text')).toBe(false)
    expect(isRecord(undefined)).toBe(false)
  })

  it('accepts only finite numbers', () => {
    expect(isFiniteNumber(0)).toBe(true)
    expect(isFiniteNumber(-12.5)).toBe(true)
    expect(isFiniteNumber(NaN)).toBe(false)
    expect(isFiniteNumber(Infinity)).toBe(false)
    expect(isFiniteNumber('5')).toBe(false)
  })
})
