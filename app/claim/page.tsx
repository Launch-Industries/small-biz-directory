'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { createClient } from '@/lib/supabase-browser'
import type { Business } from '@/types/business'

type Result = Pick<Business, 'id' | 'slug' | 'name' | 'category_name' | 'neighborhood' | 'city' | 'address' | 'claimed'>

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export default function ClaimSearchPage() {
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setSearched(false); return }
    setSearching(true)
    const { data } = await supabase
      .from('businesses')
      .select('id, slug, name, category_name, neighborhood, city, address, claimed')
      .ilike('name', `%${q.trim()}%`)
      .order('name')
      .limit(12)
    setResults(data ?? [])
    setSearched(true)
    setSearching(false)
  }, [supabase])

  const debouncedSearch = useCallback(
    (...args: [string]) => {
      const q = args[0]
      const timer = setTimeout(() => search(q), 350)
      return () => clearTimeout(timer)
    },
    [search]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (!q.trim()) { setResults(null); setSearched(false); return }
    search(q)
  }

  const unclaimed = results?.filter(r => !r.claimed) ?? []
  const claimed = results?.filter(r => r.claimed) ?? []
  const noResults = searched && results?.length === 0

  return (
    <>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="font-formula font-extrabold text-2xl mb-1">Find your listing</h1>
        <p className="text-ink-500 text-sm mb-6">
          Search by name — local business, credit union, barter network, mutual-aid org, or any entity in the directory.
        </p>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Type your business or org name…"
          autoFocus
          className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900 mb-4"
        />

        {searching && (
          <p className="text-ink-400 text-sm">Searching…</p>
        )}

        {!searching && unclaimed.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Select your listing</p>
            {unclaimed.map(b => (
              <button
                key={b.id}
                onClick={() => router.push(`/businesses/${b.slug}/claim`)}
                className="w-full text-left flex items-start gap-3 rounded-xl border border-ink-150 p-4 hover:bg-ink-50 hover:border-ink-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.name}</p>
                  <p className="text-ink-500 text-xs mt-0.5 truncate">
                    {[b.category_name, b.neighborhood ?? b.city].filter(Boolean).join(' · ')}
                  </p>
                  {b.address && <p className="text-ink-400 text-xs truncate">{b.address}</p>}
                </div>
                <span className="shrink-0 text-xs font-semibold text-[#E0241F] mt-0.5">Claim →</span>
              </button>
            ))}
          </div>
        )}

        {!searching && claimed.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Already claimed</p>
            {claimed.map(b => (
              <Link
                key={b.id}
                href={`/businesses/${b.slug}`}
                className="w-full flex items-start gap-3 rounded-xl border border-ink-100 p-4 opacity-60 hover:opacity-80 transition-opacity"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.name}</p>
                  <p className="text-ink-500 text-xs mt-0.5 truncate">
                    {[b.category_name, b.neighborhood ?? b.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-400 mt-0.5">Claimed</span>
              </Link>
            ))}
          </div>
        )}

        {!searching && noResults && (
          <div className="rounded-xl border-2 border-dashed border-ink-200 p-6 text-center">
            <p className="font-semibold text-sm mb-1">"{query}" isn't in the directory yet.</p>
            <p className="text-ink-500 text-xs mb-4">Want to add it?</p>
            <Link
              href={`/claim/new?name=${encodeURIComponent(query)}`}
              className="inline-block bg-[#E0241F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#A8160F] transition-colors"
            >
              Add your listing
            </Link>
          </div>
        )}
      </main>
    </>
  )
}
