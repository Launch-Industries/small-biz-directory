import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'
describe('slugify', () => {
  it('lowercases and replaces spaces', () => { expect(slugify('Black Arts Love')).toBe('black-arts-love') })
  it('strips special characters', () => { expect(slugify("Monica's Café")).toBe('monicas-caf') })
  it('collapses multiple hyphens', () => { expect(slugify('A  B---C')).toBe('a-b-c') })
})
