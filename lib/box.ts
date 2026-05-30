// Server-only Box client: upload a document, then run Box AI Extract over it.
// Auth priority: Client Credentials Grant (no manual expiry) → BOX_TOKEN (60-min
// dev token) → DEV MOCK. Every step fails safe to mock so the verification flow
// always completes, even if Box AI isn't enabled or a token lapses.
import 'server-only'

const { BOX_CLIENT_ID, BOX_CLIENT_SECRET, BOX_ENTERPRISE_ID, BOX_TOKEN } = process.env
const BOX_FOLDER_ID = process.env.BOX_FOLDER_ID ?? '0'
const hasCCG = Boolean(BOX_CLIENT_ID && BOX_CLIENT_SECRET && BOX_ENTERPRISE_ID)

export const boxEnabled = () => hasCCG || Boolean(BOX_TOKEN)

export interface BoxField {
  key: string
  type: 'string' | 'date' | 'enum'
  prompt: string
}

// Mint + cache a CCG access token (re-minted ~1 min before expiry); else fall
// back to a pasted BOX_TOKEN; else null (→ mock).
let _tok: string | null = null
let _exp = 0
async function getAccessToken(): Promise<string | null> {
  if (hasCCG) {
    if (_tok && Date.now() < _exp) return _tok
    try {
      const res = await fetch('https://api.box.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: BOX_CLIENT_ID!, client_secret: BOX_CLIENT_SECRET!,
          box_subject_type: 'enterprise', box_subject_id: BOX_ENTERPRISE_ID!,
        }),
      })
      if (res.ok) {
        const j = await res.json()
        _tok = j.access_token
        _exp = Date.now() + ((j.expires_in ?? 3600) - 60) * 1000
        return _tok
      }
      console.warn('Box CCG token mint failed:', res.status)
    } catch (e) {
      console.warn('Box CCG token error:', e)
    }
  }
  return BOX_TOKEN ?? null
}

// Upload bytes to Box; returns file id (+ shared link). Never throws — any
// failure returns a mock id with uploadLive=false.
export async function uploadToBox(bytes: Buffer, filename: string): Promise<{ fileId: string; sharedLink: string | null; uploadLive: boolean }> {
  const token = await getAccessToken()
  if (!token) return { fileId: `mock_${Date.now()}`, sharedLink: null, uploadLive: false }

  const form = new FormData()
  form.append('attributes', JSON.stringify({ name: filename, parent: { id: BOX_FOLDER_ID } }))
  form.append('file', new Blob([new Uint8Array(bytes)]), filename)

  let res: Response
  try {
    res = await fetch('https://upload.box.com/api/2.0/files/content', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
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
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shared_link: { access: 'company' } }),
    })
    if (sl.ok) sharedLink = (await sl.json()).shared_link?.url ?? null
  } catch {}

  return { fileId, sharedLink, uploadLive: true }
}

// Run Box AI Extract (structured). Returns extracted values + `aiLive` (false
// when we fell back to mock because Box AI isn't enabled, e.g. 403). Upload still
// happens live, so the Box integration is real even when AI is gated.
export async function boxAiExtract(
  fileId: string,
  fields: BoxField[],
): Promise<{ values: Record<string, string>; aiLive: boolean }> {
  const token = await getAccessToken()
  if (!token) return { values: mockExtract(), aiLive: false }

  try {
    const res = await fetch('https://api.box.com/2.0/ai/extract_structured', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    return { values: (json.answer ?? json) as Record<string, string>, aiLive: true }
  } catch (e) {
    console.warn('Box AI Extract error; using mock extraction.', e)
    return { values: mockExtract(), aiLive: false }
  }
}

// DEV MOCK — simulates a clean certificate extraction so the end-to-end flow
// demos when Box AI isn't enabled. Caller fills businessName/certType.
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
