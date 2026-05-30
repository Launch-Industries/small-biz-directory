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

const IDENTITIES = [
  { key: 'Identifies as women-owned', label: 'Women-Owned', flag: 'is_women_owned' },
  { key: 'Identifies as Black-owned', label: 'Black-Owned', flag: 'is_black_owned' },
  { key: 'Identifies as LGBTQ+ owned', label: 'LGBTQ+ Owned', flag: 'is_lgbtq_owned' },
  { key: 'LGBTQ+ friendly', label: 'LGBTQ+ Friendly', flag: 'is_lgbtq_friendly' },
  { key: 'Identifies as Asian-owned', label: 'Asian-Owned', flag: 'is_asian_owned' },
  { key: 'Identifies as Latino-owned', label: 'Latino-Owned', flag: 'is_latino_owned' },
  { key: 'Identifies as veteran-owned', label: 'Veteran-Owned', flag: 'is_veteran_owned' },
  { key: 'Identifies as Indigenous-owned', label: 'Indigenous-Owned', flag: 'is_indigenous_owned' },
  { key: 'Identifies as disabled-owned', label: 'Disabled-Owned', flag: 'is_disabled_owned' },
  { key: 'Transgender safespace', label: 'Transgender Safespace', flag: 'is_transgender_safespace' },
]

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const input = 'w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900'
const label = 'block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1'
const groupHead = 'font-narrow font-bold text-[11px] uppercase tracking-[0.2em] text-[#6E6A60] mt-6 mb-3 border-b border-ink-150 pb-2'

function NewListingForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [section, setSection] = useState<string | null>(null)
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [website, setWebsite] = useState('')
  const [contactFirst, setContactFirst] = useState('')
  const [contactLast, setContactLast] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Seattle')
  const [state, setState] = useState('WA')
  const [zip, setZip] = useState('')
  const [description, setDescription] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleIdentity(key: string) {
    setSelectedIdentities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function draftWithAI() {
    if (!name.trim()) return
    setDrafting(true)
    try {
      const res = await fetch('/api/draft-description', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), section, city: city.trim() }),
      })
      const data = await res.json()
      if (data.description) setDescription(data.description)
    } catch { /* silent */ }
    setDrafting(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!section) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`
    const selected = SECTIONS.find(s => s.key === section)!
    const contactName = [contactFirst.trim(), contactLast.trim()].filter(Boolean).join(' ') || null

    const identityFlags: Record<string, boolean> = {}
    for (const id of IDENTITIES) identityFlags[id.flag] = selectedIdentities.includes(id.key)

    const base = {
      name: name.trim(), slug,
      category_name: selected.label,
      address: address.trim() || null,
      city: city.trim() || null,
      website: website.trim() || null,
      claimed: true, claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    }

    const tableExtra =
      selected.table === 'businesses' ? {
        phone: phone.trim() || null,
        email: email.trim() || null,
        state: state.trim() || null,
        postal_code: zip.trim() || null,
        owner_description: description.trim() || null,
        contact_name: contactName,
        business_identities: selectedIdentities,
        verified_identities: [],
        categories: [],
        image_urls: [],
        ...identityFlags,
      }
      : selected.table === 'share_listings' ? {
        image_urls: [],
        business_identities: selectedIdentities,
      }
      : {
        type: 'other',
        services: [],
        categories: [],
        image_urls: [],
      }

    const { error: err } = await supabase.from(selected.table).insert({ ...base, ...tableExtra })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard')
  }

  // Step 1: section picker
  if (!section) {
    return (
      <>
        <Nav />
        <main className="max-w-xl mx-auto px-4 py-10">
          <h1 className="font-formula font-extrabold text-2xl mb-1">Which section does your listing belong in?</h1>
          <p className="text-ink-500 text-sm mb-6">Pick the one that best fits what you do.</p>
          <div className="space-y-3">
            {SECTIONS.map(s => (
              <button key={s.key} onClick={() => setSection(s.key)}
                className="w-full text-left flex items-center gap-4 rounded-xl border-2 border-[#0B0B0B] p-4 hover:bg-[#F6F3EA] transition-colors">
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

  // Step 2: detail form
  const selected = SECTIONS.find(s => s.key === section)!
  return (
    <>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-10 pb-16">
        <button onClick={() => setSection(null)} className="text-xs text-ink-500 hover:text-ink-900 mb-4">← Back</button>
        <h1 className="font-formula font-extrabold text-2xl mb-1">Add your {selected.label} listing</h1>
        <p className="text-ink-500 text-sm mb-2">{selected.blurb}</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Business Info */}
          <p className={groupHead}>Business Info</p>
          <div>
            <label className={label}>Business Name <span className="text-[#E0241F]">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Your business or org name" className={input} />
          </div>
          <div>
            <label className={label}>Website <span className="font-normal normal-case text-ink-400">(optional)</span></label>
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="https://…" className={input} />
          </div>

          {/* Contact Person */}
          <p className={groupHead}>Contact Person</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>First Name</label>
              <input type="text" value={contactFirst} onChange={e => setContactFirst(e.target.value)}
                placeholder="First" className={input} />
            </div>
            <div>
              <label className={label}>Last Name</label>
              <input type="text" value={contactLast} onChange={e => setContactLast(e.target.value)}
                placeholder="Last" className={input} />
            </div>
          </div>
          <div>
            <label className={label}>Email <span className="font-normal normal-case text-ink-400">(optional)</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="hello@yourbusiness.com" className={input} />
          </div>
          <div>
            <label className={label}>Phone <span className="font-normal normal-case text-ink-400">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="(206) 555-0100" className={input} />
          </div>

          {/* Location */}
          <p className={groupHead}>Location</p>
          <div>
            <label className={label}>Address <span className="font-normal normal-case text-ink-400">(optional)</span></label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Street address" className={input} />
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label className={label}>City <span className="text-[#E0241F]">*</span></label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} required className={input} />
            </div>
            <div className="col-span-1">
              <label className={label}>State</label>
              <input type="text" value={state} onChange={e => setState(e.target.value)}
                maxLength={2} className={input} />
            </div>
            <div className="col-span-2">
              <label className={label}>Zip</label>
              <input type="text" value={zip} onChange={e => setZip(e.target.value)}
                placeholder="98101" className={input} />
            </div>
          </div>

          {/* Description */}
          <p className={groupHead}>About Your Business</p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={label} style={{ marginBottom: 0 }}>
                Description <span className="font-normal normal-case text-ink-400">(optional)</span>
              </label>
              <button type="button" onClick={draftWithAI}
                disabled={drafting || !name.trim()}
                className="text-[11px] font-bold uppercase tracking-wide text-[#E0241F] hover:text-[#A8160F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {drafting ? 'Drafting…' : '✦ Draft with AI'}
              </button>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Tell people what makes your business worth supporting…"
              className={`${input} resize-y`} />
          </div>

          {/* Identity */}
          <p className={groupHead}>Identity &amp; Ownership</p>
          <p className="text-xs text-ink-500 -mt-2 mb-3">Check all that apply — helps people find and support you.</p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {IDENTITIES.map(id => (
              <label key={id.key} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox"
                  checked={selectedIdentities.includes(id.key)}
                  onChange={() => toggleIdentity(id.key)}
                  className="rounded border-ink-300 text-[#E0241F] focus:ring-[#E0241F]" />
                <span className="text-sm text-ink-700 group-hover:text-ink-900 leading-tight">{id.label}</span>
              </label>
            ))}
          </div>

          {error && <p className="text-[#E0241F] text-sm pt-1">{error}</p>}
          <div className="pt-4">
            <button type="submit" disabled={loading}
              className="w-full bg-[#E0241F] text-white py-3 font-semibold text-sm hover:bg-[#A8160F] transition-colors disabled:opacity-50">
              {loading ? 'Saving…' : 'Add listing & claim it'}
            </button>
          </div>
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
