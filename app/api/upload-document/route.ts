import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { uploadToBox } from '@/lib/box'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())
  const { fileId, sharedLink, uploadLive } = await uploadToBox(bytes, file.name)

  return NextResponse.json({ fileId, sharedLink, uploadLive, name: file.name })
}
