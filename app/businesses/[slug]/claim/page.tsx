'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { Nav } from '@/components/Nav'
import DocumentUploader from '@/components/DocumentUploader'
import { IDENTITY_CERTS } from '@/lib/identity-verify'

type AttestState = 'idle' | 'sending' | 'sent' | 'error'

export default function ClaimPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [biz, setBiz] = useState<{ id: string; name: string; claimed_by: string | null; business_identities: string[]; verified_identities: string[] } | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(new Set())

  const [attestState, setAttestState] = useState<AttestState>('idle')
  const [attestError, setAttestError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUserEmail(data.user.email ?? '')
      setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    supabase
      .from('businesses')
      .select('id, name, claimed_by, business_identities, verified_identities')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setBiz(data)
          setVerifiedSet(new Set(data.verified_identities ?? []))
        }
        setLoading(false)
      })
  }, [slug])

  async function handleClaim() {
    setClaiming(true); setClaimError('')
    const { error } = await supabase.from('businesses').update({
      claimed: true, claimed_by: userId, claimed_at: new Date().toISOString(),
    }).eq('slug', slug)
    if (error) { setClaimError(error.message); setClaiming(false); return }
    router.push('/dashboard')
  }

  async function sendAttestation() {
    setAttestState('sending'); setAttestError('')
    try {
      const res = await fetch('/api/attest-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setAttestState('sent')
    } catch (e) {
      setAttestError((e as Error).message)
      setAttestState('error')
    }
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className="max-w-xl mx-auto px-4 py-12 text-center text-ink-400 text-sm">Loading…</main>
      </>
    )
  }

  if (!biz) {
    return (
      <>
        <Nav />
        <main className="max-w-xl mx-auto px-4 py-12 text-center">
          <p className="text-ink-500">Listing not found.</p>
          <Link href="/dashboard" className="text-[#E0241F] text-sm font-semibold mt-4 inline-block">← Back to dashboard</Link>
        </main>
      </>
    )
  }

  if (biz.claimed_by && biz.claimed_by !== userId) {
    return (
      <>
        <Nav />
        <main className="max-w-xl mx-auto px-4 py-12 text-center">
          <p className="font-formula font-extrabold text-xl mb-2 stencil">Already Claimed</p>
          <p className="text-ink-500 text-sm">This listing has been claimed by another account.</p>
        </main>
      </>
    )
  }

  const isUnclaimed = !biz.claimed_by
  const verifiableIdentities = (biz.business_identities ?? []).filter(id => IDENTITY_CERTS[id])
  const label = 'block text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-3'

  return (
    <>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-10 pb-20">
        <Link href="/dashboard" className="text-xs text-ink-500 hover:text-ink-900 mb-5 inline-block">← Dashboard</Link>

        <div className="hazard-stripe mb-6 -mx-4" />

        <h1 className="font-formula font-extrabold text-2xl mb-1 stencil">
          {isUnclaimed ? 'Claim & Verify' : 'Verify Your Listing'}
        </h1>
        <p className="text-ink-500 text-sm mb-8">
          <span className="font-semibold text-ink-900">{biz.name}</span>
          {isUnclaimed
            ? ' — claim this listing to manage it, then add verification badges.'
            : ' — add verified badges to build trust with customers.'}
        </p>

        {/* ── Claim step (only if unclaimed) ── */}
        {isUnclaimed && (
          <section className="border border-ink-200 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 bg-ink-50 border-b border-ink-200">
              <p className={label} style={{ marginBottom: 0 }}>Step 1 — Claim This Listing</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-ink-500 mb-4">
                Confirm you're the owner. This links the listing to your account so you can manage it.
              </p>
              {claimError && <p className="text-xs text-[#E0241F] mb-2">{claimError}</p>}
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full bg-ink-900 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-ink-800 transition-colors disabled:opacity-50"
              >
                {claiming ? 'Claiming…' : 'Claim This Business'}
              </button>
            </div>
          </section>
        )}

        {/* ── Path A: Identity Certification ── */}
        {verifiableIdentities.length > 0 && (
          <section className="mb-8">
            <p className={label}>
              {isUnclaimed ? 'Step 2 — ' : ''}Certify Your Identity
            </p>
            <p className="text-xs text-ink-500 mb-4">
              Upload an official certification for each identity your business holds. Box AI reads it and confirms it matches your listing automatically.
            </p>
            <div className="space-y-4">
              {verifiableIdentities.map(identity => {
                const cfg = IDENTITY_CERTS[identity]
                const isVerified = verifiedSet.has(identity)
                return (
                  <div key={identity} className="border border-ink-200 rounded-lg overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-3 ${isVerified ? 'bg-[#c9f4e2]' : 'bg-ink-50'} border-b border-ink-200`}>
                      <div>
                        <p className="font-semibold text-sm text-ink-900">{cfg.label}</p>
                        <p className="text-xs text-ink-400">e.g. {cfg.sampleCert}</p>
                      </div>
                      {isVerified && (
                        <span className="text-xs font-bold text-[#0a5c3a] bg-white border border-[#0fae77] px-2 py-0.5 rounded-full shrink-0 ml-2">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    {!isVerified && (
                      <div className="p-4">
                        <DocumentUploader
                          slug={slug}
                          identity={identity}
                          identityLabel={cfg.label}
                          onVerified={() => setVerifiedSet(prev => new Set(Array.from(prev).concat(identity)))}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Path B: Box Sign Attestation ── */}
        <section className="border border-ink-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-ink-50 border-b border-ink-200">
            <p className={label} style={{ marginBottom: 0 }}>
              {isUnclaimed && verifiableIdentities.length > 0 ? 'Step 3 — ' : ''}Sign an Ownership Attestation
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-ink-500 mb-4">
              E-sign a short ownership statement sent to{' '}
              <span className="font-semibold text-ink-700">{userEmail}</span> via Box Sign.
              This adds an additional layer of verified ownership to your listing.
            </p>

            {attestState === 'idle' && (
              <button
                onClick={sendAttestation}
                className="w-full bg-ink-900 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-ink-800 transition-colors"
              >
                Send Attestation to Sign
              </button>
            )}
            {attestState === 'sending' && (
              <p className="text-sm text-ink-400 text-center py-2">Sending…</p>
            )}
            {attestState === 'sent' && (
              <div className="bg-[#c9f4e2] border border-[#0fae77] rounded-lg p-3">
                <p className="font-semibold text-sm text-[#0a5c3a]">✓ Attestation sent</p>
                <p className="text-xs mt-0.5 text-[#0a5c3a] opacity-80">
                  Check <span className="font-semibold">{userEmail}</span> for the Box Sign link.
                </p>
              </div>
            )}
            {attestState === 'error' && (
              <div className="space-y-2">
                <p className="text-xs text-[#E0241F]">{attestError}</p>
                <button
                  onClick={() => setAttestState('idle')}
                  className="text-xs font-bold underline underline-offset-2 text-ink-500 hover:text-ink-900"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </section>

        {verifiableIdentities.length === 0 && !isUnclaimed && (
          <p className="text-xs text-ink-400 mt-6 text-center">
            No verifiable identities on this listing.{' '}
            <Link href="/dashboard" className="underline hover:text-ink-700">Update your profile</Link>{' '}
            to add identity certifications.
          </p>
        )}
      </main>
    </>
  )
}
