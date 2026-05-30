import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const businessId = String(form.get('businessId') || '')
  if (!file || !businessId) return NextResponse.json({ error: 'Missing file or businessId' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${businessId}/${Date.now()}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('business-photos')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
