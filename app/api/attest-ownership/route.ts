import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendOwnershipAttestation } from '@/lib/box'

export const runtime = 'nodejs'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const { slug } = await req.json()
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const r = await fetch(
      `${SB_URL}/rest/v1/businesses?slug=eq.${encodeURIComponent(slug)}&select=id,name,business_identities`,
      { headers: sbHeaders },
    )
    const [biz]: Array<{ id: string; name: string; business_identities: string[] }> = await r.json()
    if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const claimedIdentities = biz.business_identities ?? []
    const signerName = (user.user_metadata?.full_name as string) || user.email
    const { signRequestId, status, signLive } = await sendOwnershipAttestation(biz.name, user.email, signerName)

    await fetch(`${SB_URL}/rest/v1/business_verifications`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        business_id: biz.id,
        submitted_by: user.id,
        claimed_identity: 'attestation',
        claimed_identities: claimedIdentities,
        sign_request_id: signRequestId,
        sign_status: status,
        status: 'pending',
        source: signLive ? 'box_sign' : 'box_sign_mock',
      }),
    })

    return NextResponse.json({ sent: signLive, status, signerEmail: user.email })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
