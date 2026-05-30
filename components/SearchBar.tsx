'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { IDENTITY_FILTER_ORDER, IDENTITY_COLORS } from '@/lib/identity-colors'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const activeIdentity = searchParams.get('identity') ?? ''
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (query) params.set('q', query); else params.delete('q')
      router.push(`/?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  function toggleIdentity(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (activeIdentity === id) params.delete('identity'); else params.set('identity', id)
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search businesses..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-300"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {IDENTITY_FILTER_ORDER.map(id => {
          const active = activeIdentity === id
          const color = IDENTITY_COLORS[id]
          return (
            <button key={id} onClick={() => toggleIdentity(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${active ? `${color.bg} ${color.text}` : 'bg-ink-100 text-ink-600 hover:bg-ink-150'}`}>
              {color.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
