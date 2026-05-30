'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { createClient } from '@/lib/supabase-browser'

type SwapPost = {
  id: string
  author_name: string | null
  kind: string
  title: string
  description: string | null
  city: string | null
  contact: string | null
  created_at: string
  user_id: string
}

const KIND_LABELS: Record<string, string> = {
  offer: 'Offering',
  seek: 'Looking for',
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

  // form state
  const [kind, setKind] = useState<'offer' | 'seek'>('offer')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [city, setCity] = useState('Seattle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('swap_posts')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPosts(data ?? [])
        setLoading(false)
      })
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase.from('swap_posts').insert({
      user_id: user.id,
      author_name: user.email?.split('@')[0] ?? 'neighbor',
      kind,
      title: title.trim(),
      description: description.trim() || null,
      contact: contact.trim() || null,
      city: city.trim() || 'Seattle',
      status: 'open',
    })

    if (err) { setError(err.message); setSubmitting(false); return }

    // reload
    const { data } = await supabase
      .from('swap_posts')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts(data ?? [])
    setTitle(''); setDescription(''); setContact('')
    setShowForm(false)
    setSubmitting(false)
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="font-formula font-extrabold text-2xl">Swap Board</h1>
            <p className="text-ink-500 text-sm mt-1">Trade goods or services — no cash, just community.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="shrink-0 bg-[#E0241F] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#A8160F] transition-colors"
          >
            {showForm ? 'Cancel' : '+ Post'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handlePost} className="border-2 border-[#0B0B0B] rounded-xl p-5 mb-6 space-y-3 bg-[#F6F3EA]">
            <div className="flex gap-2">
              <button type="button" onClick={() => setKind('offer')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === 'offer' ? 'bg-[#0B0B0B] text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                I'm offering
              </button>
              <button type="button" onClick={() => setKind('seek')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${kind === 'seek' ? 'bg-[#0B0B0B] text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                Looking for
              </button>
            </div>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder={kind === 'offer' ? 'What are you offering?' : 'What are you looking for?'}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="More details (optional)"
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900 resize-none" />
            <div className="flex gap-2">
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                placeholder="City" className="w-1/2 border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
              <input type="text" value={contact} onChange={e => setContact(e.target.value)}
                placeholder="How to reach you (optional)" className="w-1/2 border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#E0241F] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#A8160F] disabled:opacity-50">
              {submitting ? 'Posting…' : 'Post to swap board'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-ink-400 text-sm">Loading posts…</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-ink-400">
            <p className="text-lg font-semibold mb-1">Board is empty</p>
            <p className="text-sm">Be the first to post a swap.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <div key={p.id} className="rounded-xl border border-ink-150 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.kind === 'offer' ? 'bg-[#F2B400] text-[#0B0B0B]' : 'bg-[#0B0B0B] text-white'}`}>
                    {KIND_LABELS[p.kind] ?? p.kind}
                  </span>
                  <span className="text-ink-400 text-xs">{p.city}</span>
                  <span className="text-ink-300 text-xs ml-auto">{timeAgo(p.created_at)}</span>
                </div>
                <p className="font-semibold text-sm">{p.title}</p>
                {p.description && <p className="text-ink-600 text-sm mt-0.5">{p.description}</p>}
                {p.contact && <p className="text-ink-400 text-xs mt-1.5">Contact: {p.contact}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
