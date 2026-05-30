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

// Upload bytes to Box; returns the new file id (+ shared link if grantable).
// Never throws — on any failure (no token, expired token, network) it returns a
// mock id with uploadLive=false so the verification flow always completes.
export async function uploadToBox(bytes: Buffer, filename: string): Promise<{ fileId: string; sharedLink: string | null; uploadLive: boolean }> {
  if (!BOX_TOKEN) return { fileId: `mock_${Date.now()}`, sharedLink: null, uploadLive: false }

  const form = new FormData()
  form.append('attributes', JSON.stringify({ name: filename, parent: { id: BOX_FOLDER_ID } }))
  form.append('file', new Blob([new Uint8Array(bytes)]), filename)

  let res: Response
  try {
    res = await fetch('https://upload.box.com/api/2.0/files/content', {
      method: 'POST',
      headers: { Authorization: `Bearer ${BOX_TOKEN}` },
      body: form,
    })
  } catch {
    return { fileId: `mock_${Date.now()}`, sharedLink: null, uploadLive: false }
  }
  if (!res.ok) {
    console.warn(`Box upload failed (${res.status}); using mock file id.`)
    return { fileId: `mock_${Date.now()}`, sharedLink: null, uploadLive: false }
  }
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

  return { fileId, sharedLink, uploadLive: true }
}

// Run Box AI Extract (structured) over an uploaded file. Returns the extracted
// values plus `aiLive` — false when we fell back to the mock because Box AI is
// not enabled on the account (e.g. 403 insufficient_scope on a non-enterprise
// account). The upload itself still happens live, so the Box integration is real.
export async function boxAiExtract(
  fileId: string,
  fields: BoxField[],
): Promise<{ values: Record<string, string>; aiLive: boolean }> {
  if (!BOX_TOKEN) return { values: mockExtract(), aiLive: false }

  try {
    const res = await fetch('https://api.box.com/2.0/ai/extract_structured', {
      method: 'POST',
      headers: { Authorization: `Bearer ${BOX_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: fileId, type: 'file' }],
        fields: fields.map((f) => ({ key: f.key, type: f.type, prompt: f.prompt })),
      }),
    })
    if (!res.ok) {
      console.warn(`Box AI Extract unavailable (${res.status}); using mock extraction.`)
      return { values: mockExtract(), aiLive: false }
    }
    const json = await res.json()
    // Box returns extracted values either at top level or under `answer`.
    return { values: (json.answer ?? json) as Record<string, string>, aiLive: true }
  } catch (e) {
    console.warn('Box AI Extract error; using mock extraction.', e)
    return { values: mockExtract(), aiLive: false }
  }
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
