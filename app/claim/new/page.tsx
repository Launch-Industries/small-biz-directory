'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { createClient } from '@/lib/supabase-browser'

const ENTITY_TYPES = [
  { value: 'local_business', label: 'Local business' },
  { value: 'credit_union', label: 'Credit union / community bank' },
  { value: 'barter_network', label: 'Barter / swap network' },
  { value: 'mutual_aid', label: 'Mutual aid / Buy-Nothing org' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'nonprofit', label: 'Nonprofit / community org' },
  { value: 'other', label: 'Other' },
]

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function NewListingForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [entityType, setEntityType] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Seattle')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const baseSlug = slugify(name)
    // make slug unique by appending random suffix if needed
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

    const { error: err } = await supabase.from('businesses').insert({
      name: name.trim(),
      slug,
      category_name: ENTITY_TYPES.find(t => t.value === entityType)?.label ?? entityType,
      address: address.trim() || null,
      city: city.trim() || null,
      website: website.trim() || null,
      claimed: true,
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
      business_identities: [],
      verified_identities: [],
      categories: [],
      image_urls: [],
    })

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="font-formula font-extrabold text-2xl mb-1">Add your listing</h1>
        <p className="text-ink-500 text-sm mb-6">
          Tell us about your entity and we'll create a listing you can manage.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Your business or org name"
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">Type of entity</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              required
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900 bg-white"
            >
              <option value="">Select a type…</option>
              {ENTITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">Address <span className="text-ink-400 font-normal normal-case">(optional)</span></label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street address"
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">Website <span className="text-ink-400 font-normal normal-case">(optional)</span></label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://…"
              className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E0241F] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#A8160F] transition-colors disabled:opacity-50"
          >
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
