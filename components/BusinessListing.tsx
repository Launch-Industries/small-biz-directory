'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BusinessCard } from './BusinessCard'
import { IdentityBadge } from './IdentityBadge'
import { displayableImage } from '@/lib/images'
import type { Business } from '@/types/business'

type View = 'grid' | 'table'
const STORAGE_KEY = 'directoryView'
const isView = (v: string | null): v is View => v === 'grid' || v === 'table'

export function BusinessListing({ businesses }: { businesses: Business[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramView = searchParams.get('view')
  const [view, setView] = useState<View>(isView(paramView) ? paramView : 'grid')

  // "Both": URL param wins; otherwise fall back to the saved preference.
  useEffect(() => {
    if (isView(paramView)) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isView(saved)) setView(saved)
  }, [paramView])

  function selectView(next: View) {
    setView(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', next)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  if (businesses.length === 0) {
    return <p className="text-ink-500">No businesses found.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle view={view} onChange={selectView} />
      </div>
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map(b => <BusinessCard key={b.id} business={b} />)}
        </div>
      ) : (
        <BusinessTable businesses={businesses} />
      )}
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-narrow font-semibold uppercase tracking-widest transition-colors'
  return (
    <div className="inline-flex rounded-full border border-ink-200 bg-white p-0.5">
      <button
        type="button"
        aria-pressed={view === 'grid'}
        onClick={() => onChange('grid')}
        className={`${base} rounded-full ${view === 'grid' ? 'bg-ink-1000 text-white' : 'text-ink-500 hover:text-ink-1000'}`}>
        <GridIcon />Grid
      </button>
      <button
        type="button"
        aria-pressed={view === 'table'}
        onClick={() => onChange('table')}
        className={`${base} rounded-full ${view === 'table' ? 'bg-ink-1000 text-white' : 'text-ink-500 hover:text-ink-1000'}`}>
        <ListIcon />Table
      </button>
    </div>
  )
}

function BusinessTable({ businesses }: { businesses: Business[] }) {
  const th = 'text-left font-narrow font-semibold uppercase tracking-widest text-ink-500 px-3 py-2 whitespace-nowrap'
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-150">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-ink-150 bg-ink-50 text-xs">
            <th className={th}></th>
            <th className={th}>Name</th>
            <th className={th}>Category</th>
            <th className={th}>Neighborhood</th>
            <th className={th}>Identity</th>
            <th className={th}>Rating</th>
            <th className={th}>Website</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map(b => (
            <tr key={b.id} className="border-b border-ink-150 last:border-0 hover:bg-ink-50 transition-colors">
              <td className="px-3 py-2">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-ink-100 shrink-0">
                  {displayableImage(b.thumbnail_url) ? (
                    <Image src={displayableImage(b.thumbnail_url)!} alt={b.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="absolute inset-0 bg-li-yellow-100" />
                  )}
                </div>
              </td>
              <td className="px-3 py-2 min-w-[12rem]">
                <Link href={`/businesses/${b.slug}`} className="font-formula font-semibold text-ink-1000 hover:underline">
                  {b.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-700 whitespace-nowrap">{b.category_name ?? '—'}</td>
              <td className="px-3 py-2 text-ink-700 whitespace-nowrap">{b.neighborhood ?? b.city ?? '—'}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {b.business_identities.slice(0, 3).map(id => <IdentityBadge key={id} identity={id} />)}
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {b.total_score ? (
                  <span className="flex items-center gap-1 text-ink-700">
                    <span className="text-li-yellow">★</span>{b.total_score.toFixed(1)}
                    {b.reviews_count != null && <span className="text-xs text-ink-400">({b.reviews_count})</span>}
                  </span>
                ) : <span className="text-ink-400">—</span>}
              </td>
              <td className="px-3 py-2">
                {b.website ? (
                  <a href={b.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ink-600 hover:text-ink-1000" aria-label={`${b.name} website`}>
                    <ExternalLinkIcon />Visit
                  </a>
                ) : <span className="text-ink-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GridIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm9 0a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1V5zm-9 9a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zm9 0a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}
