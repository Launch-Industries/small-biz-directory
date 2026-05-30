// Maps a self-reported ownership identity to the certifications that would prove
// it, and decides a verification verdict from Box AI's extracted certificate
// fields. Used by app/api/verify-ownership.
import type { BoxField } from '@/lib/box'

// Fields we ask Box AI to pull off the uploaded certificate / license.
export const CERT_FIELDS: BoxField[] = [
  { key: 'business_name', type: 'string', prompt: 'The legal or DBA business name on the document' },
  { key: 'certification_type', type: 'string', prompt: 'The type of certification (e.g. MBE, WBENC, LGBTBE, VOSB, business license)' },
  { key: 'certifying_organization', type: 'string', prompt: 'The organization that issued the certification' },
  { key: 'owner_name', type: 'string', prompt: 'The name of the owner the document refers to' },
  { key: 'expiration_date', type: 'date', prompt: 'The expiration date of the certification, if any' },
]

// identity (matches business_identities strings) -> accepted certifications.
export const IDENTITY_CERTS: Record<string, { label: string; accept: string[]; sampleCert: string }> = {
  'Identifies as Black-owned':      { label: 'Black-Owned',      accept: ['mbe', 'minority', 'nmsdc', 'black'],            sampleCert: 'Minority Business Enterprise (MBE)' },
  'Identifies as women-owned':      { label: 'Women-Owned',      accept: ['wbe', 'wbenc', 'wosb', 'women'],                sampleCert: 'WBENC Women-Owned Business' },
  'Identifies as LGBTQ+ owned':     { label: 'LGBTQ+-Owned',     accept: ['lgbt', 'lgbtbe', 'nglcc'],                      sampleCert: 'NGLCC LGBTBE' },
  'Identifies as Asian-owned':      { label: 'Asian-Owned',      accept: ['mbe', 'minority', 'nmsdc', 'asian'],            sampleCert: 'Minority Business Enterprise (MBE)' },
  'Identifies as Latino-owned':     { label: 'Latino-Owned',     accept: ['mbe', 'minority', 'nmsdc', 'latino', 'hispanic'], sampleCert: 'Minority Business Enterprise (MBE)' },
  'Identifies as veteran-owned':    { label: 'Veteran-Owned',    accept: ['vosb', 'sdvosb', 'veteran', 'navoba'],          sampleCert: 'Veteran-Owned Small Business (VOSB)' },
  'Identifies as disabled-owned':   { label: 'Disabled-Owned',   accept: ['dobe', 'disability', 'disabled'],               sampleCert: 'Disability:IN DOBE' },
  'Identifies as Indigenous-owned': { label: 'Indigenous-Owned', accept: ['mbe', 'tribal', 'native', 'indigenous'],        sampleCert: 'Tribal / NMSDC MBE' },
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Loose name match: one normalized name contains the other (handles "LLC", DBA, etc.).
export function namesMatch(a: string, b: string): boolean {
  const x = norm(a), y = norm(b)
  if (!x || !y) return false
  return x.includes(y) || y.includes(x) || x.split(' ').filter((w) => w.length > 3 && y.includes(w)).length >= 2
}

export interface Verdict {
  status: 'verified' | 'needs_review' | 'rejected'
  name_match: boolean
  cert_ok: boolean
  confidence: number
  reason: string
}

export function decideVerdict(
  identity: string,
  businessName: string,
  extracted: Record<string, string>,
): Verdict {
  const cfg = IDENTITY_CERTS[identity]
  const certText = norm(`${extracted.certification_type} ${extracted.certifying_organization}`)
  const cert_ok = cfg ? cfg.accept.some((k) => certText.includes(k)) : false
  const name_match = namesMatch(businessName, extracted.business_name || '')

  if (name_match && cert_ok) return { status: 'verified', name_match, cert_ok, confidence: 0.95, reason: 'Business name and certification type both matched.' }
  if (cert_ok && !name_match) return { status: 'needs_review', name_match, cert_ok, confidence: 0.5, reason: 'Valid certification, but the business name did not clearly match the listing.' }
  if (name_match && !cert_ok) return { status: 'needs_review', name_match, cert_ok, confidence: 0.5, reason: 'Name matched, but the document does not look like an accepted certification for this identity.' }
  return { status: 'rejected', name_match, cert_ok, confidence: 0.2, reason: 'Neither the business name nor an accepted certification could be confirmed.' }
}
