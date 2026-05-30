import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifyBoxWebhookSignature } from './box'

function makeSignature(body: string, timestamp: string, secret: string) {
  return createHmac('sha256', secret).update(timestamp + body).digest('base64')
}

describe('verifyBoxWebhookSignature', () => {
  const secret = 'test-secret-key'
  const timestamp = '2026-05-30T12:00:00Z'
  const body = '{"trigger":"SIGN_REQUEST.COMPLETED"}'

  it('accepts a valid signature', () => {
    const sig = makeSignature(body, timestamp, secret)
    expect(verifyBoxWebhookSignature(body, timestamp, sig, secret)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const sig = makeSignature(body, timestamp, secret)
    expect(verifyBoxWebhookSignature(body + 'x', timestamp, sig, secret)).toBe(false)
  })

  it('rejects a wrong secret', () => {
    const sig = makeSignature(body, timestamp, 'other-secret')
    expect(verifyBoxWebhookSignature(body, timestamp, sig, secret)).toBe(false)
  })

  it('rejects empty signature', () => {
    expect(verifyBoxWebhookSignature(body, timestamp, '', secret)).toBe(false)
  })

  it('rejects empty secret', () => {
    const sig = makeSignature(body, timestamp, secret)
    expect(verifyBoxWebhookSignature(body, timestamp, sig, '')).toBe(false)
  })
})
