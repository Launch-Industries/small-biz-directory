'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ShieldCheck, Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

const IDENTITY_LABELS: Record<string, string> = {
  'Identifies as Black-owned': 'Black-Owned',
  'Identifies as women-owned': 'Women-Owned',
  'Identifies as LGBTQ+ owned': 'LGBTQ+-Owned',
  'Identifies as Asian-owned': 'Asian-Owned',
  'Identifies as Latino-owned': 'Latino-Owned',
  'Identifies as veteran-owned': 'Veteran-Owned',
  'Identifies as disabled-owned': 'Disabled-Owned',
  'Identifies as Indigenous-owned': 'Indigenous-Owned',
}

type Result = { status: string; reason: string; extracted: Record<string, string>; label: string; boxUploadLive: boolean; aiLive: boolean }

export default function ClaimPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [identities, setIdentities] = useState<string[]>([])
  const [verified, setVerified] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // verification widget state
  const [identity, setIdentity] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    supabase.from('businesses').select('name, business_identities, verified_identities').eq('slug', slug).single()
      .then(({ data }) => {
        if (data) {
          setName(data.name)
          const ids = (data.business_identities ?? []).filter((i: string) => IDENTITY_LABELS[i])
          setIdentities(ids)
          setVerified(data.verified_identities ?? [])
          setIdentity(ids[0] ?? '')
        }
        setLoading(false)
      })
  }, [slug])

  async function handleClaim() {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error: err } = await supabase.from('businesses').update({
      claimed: true, claimed_by: user.id, claimed_at: new Date().toISOString(),
    }).eq('slug', slug)
    if (err) { setError(err.message); return }
    router.push('/dashboard')
  }

  async function handleVerify() {
    if (!file || !identity) return
    setSubmitting(true); setResult(null); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const fd = new FormData()
    fd.append('slug', slug); fd.append('identity', identity); fd.append('file', file)
    const res = await fetch('/api/verify-ownership', { method: 'POST', body: fd })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(json.error ?? 'Verification failed'); return }
    setResult(json)
    if (json.status === 'verified') setVerified((v) => Array.from(new Set([...v, identity])))
  }

  if (loading) return <p className="p-8">Loading…</p>

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-formula font-extrabold text-2xl mb-2 text-center">Claim {name}</h1>
      <p className="text-ink-600 mb-6 text-center">Are you the owner? Claim it to manage your listing.</p>
      {error && <p className="text-li-red mb-4 text-center">{error}</p>}
      <div className="text-center">
        <button onClick={handleClaim} className="bg-ink-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-ink-800">
          Claim this Business
        </button>
      </div>

      {/* Box AI ownership verification */}
      {identities.length > 0 && (
        <section className="mt-10 border border-ink-150 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-li-teal" />
            <h2 className="font-semibold text-lg">Verify your ownership</h2>
          </div>
          <p className="text-sm text-ink-500 mb-4">
            Upload a certification (e.g. MBE, WBENC, NGLCC LGBTBE, VOSB) or business license.
            We read it with <span className="font-semibold">Box AI</span> and confirm it matches this listing —
            turning a self-reported badge into a verified&nbsp;✓.
          </p>

          <label className="block text-sm font-medium mb-1">Identity to verify</label>
          <select value={identity} onChange={(e) => setIdentity(e.target.value)}
            className="w-full border border-ink-200 rounded-lg px-3 py-2 mb-3 text-sm">
            {identities.map((id) => (
              <option key={id} value={id}>{IDENTITY_LABELS[id]}{verified.includes(id) ? ' — already verified ✓' : ''}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 border border-dashed border-ink-300 rounded-lg px-3 py-3 mb-3 cursor-pointer hover:bg-ink-50 text-sm">
            <Upload className="w-4 h-4 text-ink-500" />
            <span className="truncate">{file ? file.name : 'Choose certificate (PDF, JPG, PNG)…'}</span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <button onClick={handleVerify} disabled={!file || submitting}
            className="w-full bg-li-teal text-ink-1000 font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading with Box AI…</> : 'Verify with Box AI'}
          </button>

          {result && (
            <div className={`mt-4 rounded-lg p-3 text-sm ${
              result.status === 'verified' ? 'bg-li-green-100 text-li-green-700'
              : result.status === 'needs_review' ? 'bg-li-yellow-100 text-li-yellow-700'
              : 'bg-li-red-100 text-li-red-700'}`}>
              <p className="font-semibold mb-1">
                {result.status === 'verified' ? `✓ Verified ${result.label}`
                  : result.status === 'needs_review' ? 'Needs manual review'
                  : 'Could not verify'}
              </p>
              <p className="mb-2">{result.reason}</p>
              <details className="text-xs opacity-80">
                <summary className="cursor-pointer">What Box AI read from the document</summary>
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(result.extracted).map(([k, v]) => (
                    <li key={k}><span className="font-medium">{k}:</span> {String(v)}</li>
                  ))}
                </ul>
              </details>
              <p className="mt-2 text-xs italic">
                {result.aiLive
                  ? 'Document stored in Box · read live by Box AI ✓'
                  : result.boxUploadLive
                    ? 'Document stored in Box (live) · extraction simulated — enable Box AI on the account to go fully live.'
                    : 'Dev mock — set BOX_TOKEN to store in Box.'}
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
