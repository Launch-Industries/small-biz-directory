'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { createClient } from '@/lib/supabase-browser'

type SupportRequest = {
  id: string
  org_name: string | null
  requester_type: string
  title: string
  description: string | null
  help_type: string | null
  city: string | null
  contact: string | null
  week_of: string | null
  created_at: string
}

const HELP_TYPES = [
  'Volunteers',
  'Donations',
  'Supplies / materials',
  'Skills / expertise',
  'Funding',
  'Space / venue',
  'Promotion / outreach',
  'Other',
]

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function SupportPage() {
  const router = useRouter()
  const supabase = createClient()

  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // form state
  const [requesterType, setRequesterType] = useState<'individual' | 'organization'>('organization')
  const [orgName, setOrgName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [helpType, setHelpType] = useState('')
  const [contact, setContact] = useState('')
  const [city, setCity] = useState('Seattle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('support_requests')
      .select('id, org_name, requester_type, title, description, help_type, city, contact, week_of, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRequests(data ?? [])
        setLoading(false)
      })
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase.from('support_requests').insert({
      user_id: user.id,
      requester_type: requesterType,
      org_name: requesterType === 'organization' ? orgName.trim() || null : null,
      title: title.trim(),
      description: description.trim() || null,
      help_type: helpType || null,
      contact: contact.trim() || null,
      city: city.trim() || 'Seattle',
      status: 'open',
      source: 'user',
    })

    if (err) { setError(err.message); setSubmitting(false); return }

    const { data } = await supabase
      .from('support_requests')
      .select('id, org_name, requester_type, title, description, help_type, city, contact, week_of, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)
    setRequests(data ?? [])
    setTitle(''); setDescription(''); setOrgName(''); setContact(''); setHelpType('')
    setShowForm(false)
    setSubmitting(false)
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="font-formula font-extrabold text-2xl">Support Board</h1>
            <p className="text-ink-500 text-sm mt-1">Who needs help this week? Ask your community.</p>
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
              <button type="button" onClick={() => setRequesterType('organization')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${requesterType === 'organization' ? 'bg-[#0B0B0B] text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                For an org
              </button>
              <button type="button" onClick={() => setRequesterType('individual')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${requesterType === 'individual' ? 'bg-[#0B0B0B] text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                For myself
              </button>
            </div>
            {requesterType === 'organization' && (
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder="Organization name"
                className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
            )}
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="What do you need help with?"
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="More details (optional)"
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900 resize-none" />
            <select value={helpType} onChange={e => setHelpType(e.target.value)}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900 bg-white">
              <option value="">Type of help needed (optional)</option>
              {HELP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                placeholder="City" className="w-1/2 border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
              <input type="text" value={contact} onChange={e => setContact(e.target.value)}
                placeholder="How to reach you (optional)" className="w-1/2 border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-[#E0241F] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#A8160F] disabled:opacity-50">
              {submitting ? 'Posting…' : 'Post support request'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-ink-400 text-sm">Loading requests…</p>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-ink-400">
            <p className="text-lg font-semibold mb-1">No open requests</p>
            <p className="text-sm">Be the first to ask for support.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="rounded-xl border border-ink-150 p-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {r.help_type && (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F2B400] text-[#0B0B0B]">
                      {r.help_type}
                    </span>
                  )}
                  {r.org_name && <span className="text-xs font-semibold text-ink-600">{r.org_name}</span>}
                  <span className="text-ink-400 text-xs">{r.city}</span>
                  <span className="text-ink-300 text-xs ml-auto">{timeAgo(r.created_at)}</span>
                </div>
                <p className="font-semibold text-sm">{r.title}</p>
                {r.description && <p className="text-ink-600 text-sm mt-0.5">{r.description}</p>}
                {r.contact && <p className="text-ink-400 text-xs mt-1.5">Contact: {r.contact}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
