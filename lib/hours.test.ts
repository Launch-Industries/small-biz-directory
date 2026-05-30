import { describe, it, expect } from 'vitest'
import { parseHours, DEFAULT_HOURS, serializeHours } from './hours'

describe('parseHours', () => {
  it('returns DEFAULT_HOURS for null', () => {
    expect(parseHours(null)).toEqual(DEFAULT_HOURS)
  })

  it('returns DEFAULT_HOURS for invalid JSON', () => {
    expect(parseHours('not-json')).toEqual(DEFAULT_HOURS)
  })

  it('parses valid JSON and merges with defaults', () => {
    const schedule = parseHours(JSON.stringify({
      mon: { open: false, openTime: '08:00', closeTime: '20:00' },
    }))
    expect(schedule.mon).toEqual({ open: false, openTime: '08:00', closeTime: '20:00' })
    expect(schedule.tue).toEqual(DEFAULT_HOURS.tue)
  })

  it('round-trips through serialize/parse', () => {
    const schedule = parseHours(null)
    schedule.sat = { open: true, openTime: '11:00', closeTime: '16:00' }
    const result = parseHours(serializeHours(schedule))
    expect(result.sat).toEqual({ open: true, openTime: '11:00', closeTime: '16:00' })
  })
})
