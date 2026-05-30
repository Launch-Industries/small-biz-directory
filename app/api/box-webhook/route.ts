import { NextRequest, NextResponse } from 'next/server'
import { verifyBoxWebhookSignature } from '@/lib/box'

export const runtime = 'nodejs'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }
const BOX_WEBHOOK_SECRET = process.env.BOX_WEBHOOK_SECRET ?? ''

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const timestamp = req.headers.get('box-delivery-timestamp') ?? ''
  const signature = req.headers.get('box-signature-primary') ?? ''

  // skip signature check in dev when secret is not configured
  if (BOX_WEBHOOK_SECRET && !verifyBoxWebhookSignature(rawBody, timestamp, signature, BOX_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let event: { trigger: string; source: { id: string; type: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // ack all events; only process sign completions
  if (event.trigger !== 'SIGN_REQUEST.COMPLETED') {
    return NextResponse.json({ ok: true })
  }

  const signRequestId = event.source?.id
  if (!signRequestId) return NextResponse.json({ ok: true })

  // find the matching verification record
  const verRes = await fetch(
    `${SB_URL}/rest/v1/business_verifications?sign_request_id=eq.${encodeURIComponent(signRequestId)}&select=business_id,claimed_identities&limit=1`,
    { headers: sbHeaders },
  )
  const rows: Array<{ business_id: string; claimed_identities: string[] | null }> = await verRes.json()
  if (!rows.length || !rows[0].claimed_identities?.length) return NextResponse.json({ ok: true })

  const { business_id, claimed_identities } = rows[0]

  // merge with existing verified_identities
  const bizRes = await fetch(
    `${SB_URL}/rest/v1/businesses?id=eq.${business_id}&select=verified_identities`,
    { headers: sbHeaders },
  )
  const bizRows: Array<{ verified_identities: string[] }> = await bizRes.json()
  const current = bizRows[0]?.verified_identities ?? []
  const next = Array.from(new Set([...current, ...claimed_identities]))

  await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${business_id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ verified_identities: next }),
  })

  // mark the verification record as verified
  await fetch(
    `${SB_URL}/rest/v1/business_verifications?sign_request_id=eq.${encodeURIComponent(signRequestId)}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'verified' }),
    },
  )

  return NextResponse.json({ ok: true })
}
