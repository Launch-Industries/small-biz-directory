import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'

const WEBHOOK_SECRET = process.env.BOX_WEBHOOK_SECRET ?? ''
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

function verifySignature(body: string, sigPrimary: string | null, sigSecondary: string | null): boolean {
  if (!WEBHOOK_SECRET || (!sigPrimary && !sigSecondary)) return false
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  const expectedBuf = Buffer.from(expected)
  for (const sig of [sigPrimary, sigSecondary]) {
    if (!sig) continue
    try {
      const sigBuf = Buffer.from(sig)
      if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) return true
    } catch {}
  }
  return false
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sigPrimary = req.headers.get('box-signature-primary')
  const sigSecondary = req.headers.get('box-signature-secondary')

  if (!verifySignature(body, sigPrimary, sigSecondary)) {
    console.warn('Box webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { trigger?: string; source?: { id?: string; status?: string; sign_files?: unknown } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // only handle sign request events
  if (!event.trigger?.startsWith('SIGN_REQUEST')) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const signRequestId: string | undefined = event.source?.id
  const newStatus: string | undefined = event.source?.status

  if (signRequestId && newStatus) {
    await fetch(`${SB_URL}/rest/v1/business_verifications?sign_request_id=eq.${encodeURIComponent(signRequestId)}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ sign_status: newStatus }),
    })

    // if signed, promote to 'verified'
    if (newStatus === 'signed') {
      await fetch(`${SB_URL}/rest/v1/business_verifications?sign_request_id=eq.${encodeURIComponent(signRequestId)}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'verified' }),
      })
    }
  }

  return NextResponse.json({ ok: true })
}
