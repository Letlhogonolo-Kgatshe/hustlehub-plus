import { describe, it, expect } from 'vitest'
import { passwordIsStrong } from './passwordRules'

describe('passwordIsStrong', () => {
  it('accepts a long password with every character type', () => {
    expect(passwordIsStrong('Correct-Horse-9-Battery')).toBe(true)
  })

  it.each([
    ['too short', 'Aa1!aa'],
    ['no uppercase', 'alllowercase-1234!'],
    ['no lowercase', 'ALLUPPERCASE-1234!'],
    ['no number', 'NoNumbersHere-abc!'],
    ['no symbol', 'NoSymbolsHere1234'],
  ])('rejects a password with %s', (_, password) => {
    expect(passwordIsStrong(password)).toBe(false)
  })
})