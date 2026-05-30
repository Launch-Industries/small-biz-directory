// Server-only Box client: upload a document, then run Box AI Extract over it.
// Auth priority: Client Credentials Grant (no manual expiry) → BOX_TOKEN (60-min
// dev token) → DEV MOCK. Every step fails safe to mock so the verification flow
// always completes, even if Box AI isn't enabled or a token lapses.
import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'

const { BOX_CLIENT_ID, BOX_CLIENT_SECRET, BOX_ENTERPRISE_ID, BOX_TOKEN } = process.env
const BOX_FOLDER_ID = process.env.BOX_FOLDER_ID ?? '0'
const BOX_SIGN_FOLDER_ID = process.env.BOX_SIGN_FOLDER_ID ?? ''
const BOX_PHOTO_FOLDER_ID = process.env.BOX_PHOTO_FOLDER_ID ?? '0'
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

// Upload an image to the Box photo folder. Same fail-safe pattern as uploadToBox.
export async function uploadPhotoToBox(bytes: Buffer, filename: string): Promise<{ fileId: string; sharedLink: string | null; uploadLive: boolean }> {
  const token = await getAccessToken()
  if (!token) return { fileId: `mock_${Date.now()}`, sharedLink: null, uploadLive: false }

  const form = new FormData()
  form.append('attributes', JSON.stringify({ name: filename, parent: { id: BOX_PHOTO_FOLDER_ID } }))
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
    console.warn(`Box photo upload failed (${res.status}); using mock.`)
    return { fileId: `mock_${Date.now()}`, sharedLink: null, uploadLive: false }
  }
  const fileId = (await res.json()).entries[0].id as string

  let sharedLink: string | null = null
  try {
    const sl = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shared_link: { access: 'open' } }),
    })
    if (sl.ok) sharedLink = (await sl.json()).shared_link?.download_url ?? (await fetch(`https://api.box.com/2.0/files/${fileId}?fields=shared_link`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(j => j.shared_link?.url ?? null).catch(() => null))
  } catch {}

  return { fileId, sharedLink, uploadLive: true }
}

// Send a Box Sign request for an ownership attestation. Uploads the attestation
// text to Box, then creates a sign request emailing the owner to e-sign.
// Returns { signRequestId, status, signLive }. Fails safe (signLive=false).
export async function sendOwnershipAttestation(
  businessName: string,
  signerEmail: string,
  signerName: string,
): Promise<{ signRequestId: string | null; status: string; signLive: boolean }> {
  const token = await getAccessToken()
  if (!token || !BOX_SIGN_FOLDER_ID) return { signRequestId: null, status: 'mock', signLive: false }

  const doc = `OWNERSHIP ATTESTATION — 5S Ethos\n\nI attest that I am an owner of "${businessName}" and that the ownership and certification information submitted to the 5S Ethos directory is true and accurate.\n\nSigner: ${signerName}\nSignature: [[s|1]]\nDate: [[d|1]]\n`

  try {
    // 1) upload the attestation document
    const form = new FormData()
    form.append('attributes', JSON.stringify({ name: `attestation-${Date.now()}.txt`, parent: { id: BOX_SIGN_FOLDER_ID } }))
    form.append('file', new Blob([new Uint8Array(Buffer.from(doc))]), 'attestation.txt')
    const up = await fetch('https://upload.box.com/api/2.0/files/content', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    })
    if (!up.ok) return { signRequestId: null, status: 'mock', signLive: false }
    const fileId = (await up.json()).entries[0].id as string

    // 2) create the sign request (Box emails the signer)
    const sr = await fetch('https://api.box.com/2.0/sign_requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_files: [{ id: fileId, type: 'file' }],
        signers: [{ email: signerEmail, role: 'signer' }],
        parent_folder: { id: BOX_SIGN_FOLDER_ID, type: 'folder' },
      }),
    })
    if (!sr.ok) {
      console.warn('Box Sign create failed:', sr.status, await sr.text())
      return { signRequestId: null, status: 'error', signLive: false }
    }
    const j = await sr.json()
    return { signRequestId: j.id ?? null, status: j.status ?? 'created', signLive: true }
  } catch (e) {
    console.warn('Box Sign error:', e)
    return { signRequestId: null, status: 'error', signLive: false }
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

// Box computes: base64(HMAC-SHA256(deliveryTimestamp + rawBody, signingKey))
export function verifyBoxWebhookSignature(
  rawBody: string,
  deliveryTimestamp: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false
  const message = deliveryTimestamp + rawBody
  const expected = createHmac('sha256', secret).update(message).digest('base64')
  try {
    return timingSafeEqual(Buffer.from(signature, 'base64'), Buffer.from(expected, 'base64'))
  } catch {
    return false
  }
}
