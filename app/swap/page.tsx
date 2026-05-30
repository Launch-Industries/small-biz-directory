'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Nav } from '@/components/Nav'
import { createClient } from '@/lib/supabase-browser'

type SwapPost = {
  id: string; author_name: string | null; kind: string
  title: string; description: string | null
  city: string | null; contact: string | null; created_at: string; user_id: string
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function SwapPage() {
  const router = useRouter()
  const supabase = createClient()
  const [posts, setPosts] = useState<SwapPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedKinds, setSelectedKinds] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])

  const [kind, setKind] = useState<'offer' | 'seek'>('offer')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [city, setCity] = useState('Seattle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('swap_posts').select('*').eq('status', 'open')
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setPosts(data ?? []); setLoading(false) })
  }, [])

  const cities = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of posts) if (p.city) m.set(p.city, (m.get(p.city) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([v, c]) => ({ value: v, count: c }))
  }, [posts])

  const filtered = useMemo(() => {
    let out = posts
    if (search.trim()) { const q = search.toLowerCase(); out = out.filter(p => p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)) }
    if (selectedKinds.length) out = out.filter(p => selectedKinds.includes(p.kind))
    if (selectedCities.length) out = out.filter(p => p.city && selectedCities.includes(p.city))
    return out
  }, [posts, search, selectedKinds, selectedCities])

  const activeCount = selectedKinds.length + selectedCities.length

  function toggleKind(v: string) { setSelectedKinds(k => k.includes(v) ? k.filter(x => x !== v) : [...k, v]) }
  function toggleCity(v: string) { setSelectedCities(c => c.includes(v) ? c.filter(x => x !== v) : [...c, v]) }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error: err } = await supabase.from('swap_posts').insert({
      user_id: user.id, author_name: user.email?.split('@')[0] ?? 'neighbor',
      kind, title: title.trim(), description: description.trim() || null,
      contact: contact.trim() || null, city: city.trim() || 'Seattle', status: 'open',
    })
    if (err) { setError(err.message); setSubmitting(false); return }
    const { data } = await supabase.from('swap_posts').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(50)
    setPosts(data ?? []); setTitle(''); setDescription(''); setContact(''); setShowForm(false); setSubmitting(false)
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-formula font-extrabold text-2xl">Swap Board</h1>
            <p className="text-ink-500 text-sm mt-1">Trade goods or services — no cash, just community.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="shrink-0 bg-[#E0241F] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#A8160F] transition-colors">
            {showForm ? 'Cancel' : '+ Post'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handlePost} className="border-2 border-[#0B0B0B] rounded-xl p-5 mb-6 space-y-3 bg-[#F6F3EA] max-w-lg">
            <div className="flex gap-2">
              {(['offer', 'seek'] as const).map(k => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === k ? 'bg-[#0B0B0B] text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                  {k === 'offer' ? "I'm offering" : 'Looking for'}
                </button>
              ))}
            </div>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder={kind === 'offer' ? 'What are you offering?' : 'What are you looking for?'}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="More details (optional)"
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900 resize-none" />
            <div className="flex gap-2">
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City"
                className="w-1/2 border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
              <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="How to reach you (optional)"
                className="w-1/2 border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#E0241F] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#A8160F] disabled:opacity-50">
              {submitting ? 'Posting…' : 'Post to swap board'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:px-2 space-y-5">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search swaps…"
              className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />

            <div className="flex items-center justify-between">
              <h2 className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-500">Filters</h2>
              {activeCount > 0 && (
                <button onClick={() => { setSelectedKinds([]); setSelectedCities([]) }}
                  className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900">
                  <X className="w-3 h-3" /> Clear ({activeCount})
                </button>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-700 mb-1">Type</legend>
              {[{ value: 'offer', label: 'Offering' }, { value: 'seek', label: 'Looking for' }].map(o => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedKinds.includes(o.value)} onChange={() => toggleKind(o.value)}
                    className="rounded border-ink-300 text-ink-900 focus:ring-ink-900" />
                  <span className="flex-1 text-sm text-ink-700">{o.label}</span>
                  <span className="text-xs text-ink-400">{posts.filter(p => p.kind === o.value).length}</span>
                </label>
              ))}
            </fieldset>

            {cities.length > 1 && (
              <fieldset className="space-y-2">
                <legend className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-700 mb-1">City</legend>
                {cities.map(c => (
                  <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedCities.includes(c.value)} onChange={() => toggleCity(c.value)}
                      className="rounded border-ink-300 text-ink-900 focus:ring-ink-900" />
                    <span className="flex-1 text-sm text-ink-700">{c.value}</span>
                    <span className="text-xs text-ink-400">{c.count}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </aside>

          {/* Posts */}
          <section className="col-span-12 lg:col-span-9 space-y-3">
            <p className="text-sm text-ink-500"><span className="font-semibold text-ink-1000">{filtered.length}</span> swap posts</p>
            {loading ? <p className="text-ink-400 text-sm">Loading…</p>
              : filtered.length === 0 ? <p className="text-ink-400 py-8 text-sm text-center">{posts.length === 0 ? 'No posts yet — be the first!' : 'No posts match your filters.'}</p>
              : filtered.map(p => (
                <div key={p.id} className="rounded-xl border border-ink-150 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.kind === 'offer' ? 'bg-[#F2B400] text-[#0B0B0B]' : 'bg-[#0B0B0B] text-white'}`}>
                      {p.kind === 'offer' ? 'Offering' : 'Looking for'}
                    </span>
                    <span className="text-ink-400 text-xs">{p.city}</span>
                    <span className="text-ink-300 text-xs ml-auto">{timeAgo(p.created_at)}</span>
                  </div>
                  <p className="font-semibold text-sm">{p.title}</p>
                  {p.description && <p className="text-ink-600 text-sm mt-0.5">{p.description}</p>}
                  {p.contact && <p className="text-ink-400 text-xs mt-1.5">Contact: {p.contact}</p>}
                </div>
              ))
            }
          </section>
        </div>
      </main>
    </>
  )
}
