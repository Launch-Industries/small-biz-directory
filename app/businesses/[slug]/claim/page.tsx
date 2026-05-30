'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ClaimPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('businesses').select('name').eq('slug', slug).single()
      .then(({ data }) => { if (data) setName(data.name); setLoading(false) })
  }, [slug])

  async function handleClaim() {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase.from('businesses').update({
      claimed: true, claimed_by: user.id, claimed_at: new Date().toISOString()
    }).eq('slug', slug)

    if (err) { setError(err.message); return }
    router.push('/dashboard')
  }

  if (loading) return <p className="p-8">Loading…</p>

  return (
    <main className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="font-formula font-extrabold text-2xl mb-4">Claim {name}</h1>
      <p className="text-ink-600 mb-6">Are you the owner of {name}? Claim it to update your listing.</p>
      {error && <p className="text-li-red mb-4">{error}</p>}
      <button onClick={handleClaim} className="bg-ink-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-ink-800">
        Claim this Business
      </button>
    </main>
  )
}
