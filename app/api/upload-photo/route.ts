import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { uploadPhotoToBox } from '@/lib/box'

export const runtime = 'nodejs'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const form = await req.formData()
    const slug = String(form.get('slug') || '')
    const file = form.get('file') as File | null
    if (!slug || !file) return NextResponse.json({ error: 'Missing slug or file' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 })

    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.length > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

    // verify the claimant owns this listing
    const bizRes = await fetch(`${SB_URL}/rest/v1/businesses?slug=eq.${encodeURIComponent(slug)}&select=id,image_urls,claimed_by`, { headers: sbHeaders })
    const [biz] = await bizRes.json()
    if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    if (biz.claimed_by !== user.id) return NextResponse.json({ error: 'Not your listing' }, { status: 403 })

    const filename = `${slug}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { sharedLink, fileId, uploadLive } = await uploadPhotoToBox(bytes, filename)

    // append to image_urls (use shared link if available, else a Box file reference)
    const photoUrl = sharedLink ?? `box:${fileId}`
    const existing: string[] = biz.image_urls ?? []
    const updated = [...existing, photoUrl]

    await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${biz.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ image_urls: updated }),
    })

    return NextResponse.json({ url: photoUrl, fileId, uploadLive })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
