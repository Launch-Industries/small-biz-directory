// Server-only Box client: upload a document, then run Box AI Extract over it.
// Falls back to a DEV MOCK when BOX_TOKEN is unset so the flow is demo-able
// before Box credentials are wired in. Set BOX_TOKEN (developer or app token)
// and optional BOX_FOLDER_ID to switch to the real Box AI pipeline.
import 'server-only'

const BOX_TOKEN = process.env.BOX_TOKEN
const BOX_FOLDER_ID = process.env.BOX_FOLDER_ID ?? '0'

export const boxEnabled = () => Boolean(BOX_TOKEN)

export interface BoxField {
  key: string
  type: 'string' | 'date' | 'enum'
  prompt: string
}

// Upload bytes to Box; returns the new file id (and a shared link if grantable).
export async function uploadToBox(bytes: Buffer, filename: string): Promise<{ fileId: string; sharedLink: string | null }> {
  if (!BOX_TOKEN) return { fileId: `mock_${Date.now()}`, sharedLink: null }

  const form = new FormData()
  form.append('attributes', JSON.stringify({ name: filename, parent: { id: BOX_FOLDER_ID } }))
  form.append('file', new Blob([new Uint8Array(bytes)]), filename)

  const res = await fetch('https://upload.box.com/api/2.0/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${BOX_TOKEN}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Box upload failed: ${res.status} ${await res.text()}`)
  const fileId = (await res.json()).entries[0].id as string

  // best-effort shared link (non-fatal)
  let sharedLink: string | null = null
  try {
    const sl = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${BOX_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shared_link: { access: 'company' } }),
    })
    if (sl.ok) sharedLink = (await sl.json()).shared_link?.url ?? null
  } catch {}

  return { fileId, sharedLink }
}

// Run Box AI Extract (structured) over an uploaded file.
export async function boxAiExtract(fileId: string, fields: BoxField[]): Promise<Record<string, string>> {
  if (!BOX_TOKEN) return mockExtract()

  const res = await fetch('https://api.box.com/2.0/ai/extract_structured', {
    method: 'POST',
    headers: { Authorization: `Bearer ${BOX_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: fileId, type: 'file' }],
      fields: fields.map((f) => ({ key: f.key, type: f.type, prompt: f.prompt })),
    }),
  })
  if (!res.ok) throw new Error(`Box AI Extract failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  // Box returns extracted values either at top level or under `answer`.
  return (json.answer ?? json) as Record<string, string>
}

// DEV MOCK — simulates a clean certificate extraction so the end-to-end flow
// (upload -> extract -> match -> verify) demos without real Box credentials.
// Values are filled in by the caller from the business name; here we just shape it.
let _mockCtx: { businessName?: string; certType?: string } = {}
export function setMockContext(ctx: { businessName?: string; certType?: string }) { _mockCtx = ctx }
function mockExtract(): Record<string, string> {
  return {
    business_name: _mockCtx.businessName ?? 'Unknown Business',
    certification_type: _mockCtx.certType ?? 'Minority Business Enterprise (MBE)',
    certifying_organization: 'DEV MOCK — National Certification Body',
    owner_name: 'Jane Q. Owner',
    expiration_date: '2027-12-31',
  }
}
