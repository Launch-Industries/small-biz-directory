import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { uploadToBox, boxAiExtract, boxEnabled, setMockContext } from '@/lib/box'
import { CERT_FIELDS, IDENTITY_CERTS, decideVerdict } from '@/lib/identity-verify'

export const runtime = 'nodejs'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// service-role REST helpers (server-only; bypasses RLS for the audit write)
const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }
async function sbGet(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders })
  return r.json()
}

export async function POST(req: NextRequest) {
  try {
    // must be signed in to submit a verification
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const form = await req.formData()
    const slug = String(form.get('slug') || '')
    const identity = String(form.get('identity') || '')
    const file = form.get('file') as File | null
    if (!slug || !identity || !file) return NextResponse.json({ error: 'Missing slug, identity, or file' }, { status: 400 })
    if (!IDENTITY_CERTS[identity]) return NextResponse.json({ error: 'Unknown identity' }, { status: 400 })

    const [biz] = await sbGet(`businesses?slug=eq.${encodeURIComponent(slug)}&select=id,name,verified_identities`)
    if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // 1) upload the document to Box
    const bytes = Buffer.from(await file.arrayBuffer())
    setMockContext({ businessName: biz.name, certType: IDENTITY_CERTS[identity].sampleCert })
    const { fileId, sharedLink } = await uploadToBox(bytes, `${slug}-${file.name}`)

    // 2) Box AI Extract the certificate fields
    const extracted = await boxAiExtract(fileId, CERT_FIELDS)

    // 3) decide a verdict
    const verdict = decideVerdict(identity, biz.name, extracted)

    // 4) write the audit row
    await fetch(`${SB_URL}/rest/v1/business_verifications`, {
      method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        business_id: biz.id, submitted_by: user.id, claimed_identity: identity,
        box_file_id: fileId, box_shared_link: sharedLink, document_name: file.name,
        extracted, cert_type: extracted.certification_type ?? null,
        cert_business_name: extracted.business_name ?? null,
        certifying_org: extracted.certifying_organization ?? null,
        cert_expiry: extracted.expiration_date ?? null,
        name_match: verdict.name_match, confidence: verdict.confidence, status: verdict.status,
        source: boxEnabled() ? 'box_ai' : 'box_ai_dev_mock',
      }),
    })

    // 5) on success, add the verified badge (deduped)
    if (verdict.status === 'verified') {
      const next = Array.from(new Set([...(biz.verified_identities ?? []), identity]))
      await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${biz.id}`, {
        method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ verified_identities: next }),
      })
    }

    return NextResponse.json({
      status: verdict.status, reason: verdict.reason, extracted,
      label: IDENTITY_CERTS[identity].label, boxLive: boxEnabled(),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
