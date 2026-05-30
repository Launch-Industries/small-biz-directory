'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { createClient } from '@/lib/supabase-browser'

const SECTIONS = [
  { key: 'spend', label: 'Spend', blurb: 'Local business, restaurant, shop, service', table: 'businesses', accent: '#E0241F' },
  { key: 'save', label: 'Save', blurb: 'Credit union, CDFI, community lender', table: 'save_institutions', accent: '#F2B400' },
  { key: 'swap', label: 'Swap', blurb: 'Barter network, tool library, reuse org', table: 'businesses', accent: '#6E6A60' },
  { key: 'share', label: 'Share', blurb: 'Thrift store, mutual aid org, repair café', table: 'share_listings', accent: '#F2B400' },
  { key: 'support', label: 'Support', blurb: 'Nonprofit, community org, advocacy group', table: 'businesses', accent: '#E0241F' },
]

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function NewListingForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [section, setSection] = useState<string | null>(null)
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Seattle')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!section) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`
    const selected = SECTIONS.find(s => s.key === section)!

    const { error: err } = await supabase.from(selected.table).insert({
      name: name.trim(),
      slug,
      category_name: selected.label,
      address: address.trim() || null,
      city: city.trim() || null,
      website: website.trim() || null,
      claimed: true,
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
      ...(selected.table === 'businesses' ? {
        business_identities: [],
        verified_identities: [],
        categories: [],
        image_urls: [],
      } : {}),
      ...(selected.table === 'share_listings' ? {
        image_urls: [],
        business_identities: [],
      } : {}),
      ...(selected.table === 'save_institutions' ? {
        type: 'other',
        services: [],
        categories: [],
        image_urls: [],
      } : {}),
    })

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard')
  }

  // Step 1: choose section
  if (!section) {
    return (
      <>
        <Nav />
        <main className="max-w-xl mx-auto px-4 py-10">
          <h1 className="font-formula font-extrabold text-2xl mb-1">Which section does your listing belong in?</h1>
          <p className="text-ink-500 text-sm mb-6">Pick the one that best fits what you do.</p>
          <div className="space-y-3">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className="w-full text-left flex items-center gap-4 rounded-xl border-2 border-[#0B0B0B] p-4 hover:bg-[#F6F3EA] transition-colors"
              >
                <span className="w-2 h-10 rounded-sm shrink-0" style={{ background: s.accent }} />
                <div>
                  <p className="font-stencil uppercase text-lg leading-none">{s.label}</p>
                  <p className="text-ink-500 text-xs mt-1">{s.blurb}</p>
                </div>
              </button>
            ))}
          </div>
        </main>
      </>
    )
  }

  // Step 2: fill in details
  const selected = SECTIONS.find(s => s.key === section)!
  return (
    <>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-10">
        <button onClick={() => setSection(null)} className="text-xs text-ink-500 hover:text-ink-900 mb-4">← Back</button>
        <h1 className="font-formula font-extrabold text-2xl mb-1">Add your {selected.label} listing</h1>
        <p className="text-ink-500 text-sm mb-6">{selected.blurb}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Your business or org name"
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">
              Address <span className="text-ink-400 font-normal normal-case">(optional)</span>
            </label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Street address"
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} required
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">
              Website <span className="text-ink-400 font-normal normal-case">(optional)</span>
            </label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="https://…"
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#E0241F] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#A8160F] transition-colors disabled:opacity-50">
            {loading ? 'Adding…' : 'Add listing & claim it'}
          </button>
        </form>
      </main>
    </>
  )
}

export default function NewListingPage() {
  return (
    <Suspense>
      <NewListingForm />
    </Suspense>
  )
}
