'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ShieldCheck, Upload, Loader2, PenLine, CheckCircle2 } from 'lucide-react'
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

type CertResult = {
  status: string; reason: string; extracted: Record<string, string>
  label: string; boxUploadLive: boolean; aiLive: boolean
}

type VerifyMode = 'cert' | 'attest'

export default function ClaimPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [identities, setIdentities] = useState<string[]>([])
  const [verified, setVerified] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [verifyMode, setVerifyMode] = useState<VerifyMode>('cert')

  const [identity, setIdentity] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [certResult, setCertResult] = useState<CertResult | null>(null)

  const [signing, setSigning] = useState(false)
  const [signMsg, setSignMsg] = useState('')

  useEffect(() => {
    supabase.from('businesses')
      .select('name, business_identities, verified_identities')
      .eq('slug', slug)
      .single()
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

  async function handleVerifyCert() {
    if (!file || !identity) return
    setSubmitting(true); setCertResult(null); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const fd = new FormData()
    fd.append('slug', slug); fd.append('identity', identity); fd.append('file', file)
    const res = await fetch('/api/verify-ownership', { method: 'POST', body: fd })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(json.error ?? 'Verification failed'); return }
    setCertResult(json)
    if (json.status === 'verified') setVerified(v => Array.from(new Set([...v, identity])))
  }

  async function handleAttest() {
    setSigning(true); setSignMsg(''); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const res = await fetch('/api/attest-ownership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    const json = await res.json()
    setSigning(false)
    if (!res.ok) { setError(json.error ?? 'Could not send attestation'); return }
    setSignMsg(
      json.sent
        ? `Attestation sent to ${json.signerEmail} — check your email to e-sign with Box Sign. ✍️`
        : 'Attestation prepared (Box Sign simulated — enable on the account to send for real).',
    )
  }

  if (loading) return <p className="p-8 text-ink-500">Loading…</p>

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-formula font-extrabold text-2xl mb-2 text-center">Claim {name}</h1>
      <p className="text-ink-600 mb-6 text-center">Are you the owner? Claim it to manage your listing.</p>

      {error && <p className="text-li-red mb-4 text-center text-sm">{error}</p>}

      <div className="text-center mb-10">
        <button onClick={handleClaim} className="bg-ink-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-ink-800">
          Claim this Business
        </button>
      </div>

      {identities.length > 0 && (
        <section className="border border-ink-150 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-li-teal" />
            <h2 className="font-semibold text-lg">Verify your identities</h2>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {identities.map(id => (
              <span key={id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                verified.includes(id)
                  ? 'bg-li-green-100 text-li-green-700'
                  : 'bg-ink-100 text-ink-600'
              }`}>
                {IDENTITY_LABELS[id]}{verified.includes(id) ? ' ✓' : ''}
              </span>
            ))}
          </div>

          <p className="text-sm text-ink-500 mb-4">
            Turn self-reported identity badges into verified&nbsp;✓ marks visible to directory visitors.
            Choose how you&apos;d like to verify:
          </p>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-ink-200 overflow-hidden mb-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => setVerifyMode('cert')}
              className={`flex-1 py-2 transition-colors ${verifyMode === 'cert' ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'}`}
            >
              Upload Certification
            </button>
            <button
              type="button"
              onClick={() => setVerifyMode('attest')}
              className={`flex-1 py-2 transition-colors ${verifyMode === 'attest' ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'}`}
            >
              Sign Attestation
            </button>
          </div>

          {/* Path A: cert upload */}
          {verifyMode === 'cert' && (
            <div>
              <p className="text-sm text-ink-500 mb-3">
                Upload a certification (MBE, WBENC, NGLCC LGBTBE, VOSB, etc.). Box AI reads it and
                confirms it matches this listing.
              </p>

              <label className="block text-sm font-medium mb-1">Identity to verify</label>
              <select
                value={identity}
                onChange={e => setIdentity(e.target.value)}
                className="w-full border border-ink-200 rounded-lg px-3 py-2 mb-3 text-sm"
              >
                {identities.map(id => (
                  <option key={id} value={id}>
                    {IDENTITY_LABELS[id]}{verified.includes(id) ? ' — already verified ✓' : ''}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 border border-dashed border-ink-300 rounded-lg px-3 py-3 mb-3 cursor-pointer hover:bg-ink-50 text-sm">
                <Upload className="w-4 h-4 text-ink-500" />
                <span className="truncate">{file ? file.name : 'Choose certificate (PDF, JPG, PNG)…'}</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>

              <button
                onClick={handleVerifyCert}
                disabled={!file || submitting}
                className="w-full bg-li-teal text-ink-1000 font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading with Box AI…</> : 'Verify with Box AI'}
              </button>

              {certResult && (
                <div className={`mt-4 rounded-lg p-3 text-sm ${
                  certResult.status === 'verified' ? 'bg-li-green-100 text-li-green-700'
                  : certResult.status === 'needs_review' ? 'bg-li-yellow-100 text-li-yellow-700'
                  : 'bg-li-red-100 text-li-red-700'}`}>
                  <p className="font-semibold mb-1">
                    {certResult.status === 'verified' ? `✓ Verified ${certResult.label}`
                      : certResult.status === 'needs_review' ? 'Needs manual review'
                      : 'Could not verify'}
                  </p>
                  <p className="mb-2">{certResult.reason}</p>
                  <details className="text-xs opacity-80">
                    <summary className="cursor-pointer">What Box AI read</summary>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(certResult.extracted).map(([k, v]) => (
                        <li key={k}><span className="font-medium">{k}:</span> {String(v)}</li>
                      ))}
                    </ul>
                  </details>
                  <p className="mt-2 text-xs italic">
                    {certResult.aiLive
                      ? 'Document stored in Box · read live by Box AI ✓'
                      : certResult.boxUploadLive
                        ? 'Stored in Box · extraction simulated (enable Box AI to go fully live)'
                        : 'Dev mock — set BOX_TOKEN to store in Box.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Path B: attestation */}
          {verifyMode === 'attest' && (
            <div>
              <p className="text-sm text-ink-500 mb-3">
                We&apos;ll send you an ownership attestation document via Box Sign. By signing, you
                attest that all identity representations listed for this business are true and
                accurate. Your listing will be marked <strong>Verified</strong> automatically
                when you complete the signature.
              </p>

              <div className="bg-ink-50 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium text-ink-700 mb-1">This attestation covers:</p>
                <ul className="space-y-0.5 text-ink-600">
                  {identities.map(id => (
                    <li key={id} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-li-teal shrink-0" />
                      {IDENTITY_LABELS[id]}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleAttest}
                disabled={signing}
                className="w-full bg-ink-900 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-ink-800 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {signing ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><PenLine className="w-4 h-4" /> Send Attestation to Sign</>}
              </button>

              {signMsg && (
                <p className="mt-3 text-sm text-li-green-700 text-center">{signMsg}</p>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
