'use client'

import { useMemo, useState } from 'react'
import { Globe, MapPin, Star, X } from 'lucide-react'
import { IdentityBadge } from './IdentityBadge'
import { FavoriteButton } from './FavoriteButton'
import { displayableImage } from '@/lib/images'
import type { DirListing } from './SectionTabs'

export function DirListingExplorer({
  rows,
  section,
  sectionLabel,
}: {
  rows: DirListing[]
  section: string
  sectionLabel: string
}) {
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) if (r.category_name) counts.set(r.category_name, (counts.get(r.category_name) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([v, c]) => ({ value: v, count: c }))
  }, [rows])

  const cities = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) if (r.city) counts.set(r.city, (counts.get(r.city) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([v, c]) => ({ value: v, count: c }))
  }, [rows])

  const filtered = useMemo(() => {
    let out = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter(r => r.name.toLowerCase().includes(q) || (r.category_name ?? '').toLowerCase().includes(q))
    }
    if (selectedCategories.length) out = out.filter(r => r.category_name && selectedCategories.includes(r.category_name))
    if (selectedCities.length) out = out.filter(r => r.city && selectedCities.includes(r.city))
    return out
  }, [rows, search, selectedCategories, selectedCities])

  const activeCount = selectedCategories.length + selectedCities.length
  const clearAll = () => { setSelectedCategories([]); setSelectedCities([]) }

  function toggle(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  if (rows.length === 0) {
    return <p className="text-[#6E6A60] py-8">No {sectionLabel} listings yet — check back soon.</p>
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-2 space-y-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${sectionLabel.toLowerCase()}…`}
          className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
        />

        <div className="flex items-center justify-between">
          <h2 className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-500">Filters</h2>
          {activeCount > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900">
              <X className="w-3 h-3" /> Clear ({activeCount})
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-700 mb-1">Type</legend>
            {categories.map(c => (
              <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(c.value)}
                  onChange={() => toggle(selectedCategories, setSelectedCategories, c.value)}
                  className="rounded border-ink-300 text-ink-900 focus:ring-ink-900"
                />
                <span className="flex-1 text-sm text-ink-700 leading-tight">{c.value}</span>
                <span className="text-xs text-ink-400 tabular-nums">{c.count}</span>
              </label>
            ))}
          </fieldset>
        )}

        {cities.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-700 mb-1">City</legend>
            {cities.map(c => (
              <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCities.includes(c.value)}
                  onChange={() => toggle(selectedCities, setSelectedCities, c.value)}
                  className="rounded border-ink-300 text-ink-900 focus:ring-ink-900"
                />
                <span className="flex-1 text-sm text-ink-700 leading-tight">{c.value}</span>
                <span className="text-xs text-ink-400 tabular-nums">{c.count}</span>
              </label>
            ))}
          </fieldset>
        )}
      </aside>

      {/* Listings */}
      <section className="col-span-12 lg:col-span-9 space-y-4">
        <p className="text-sm text-ink-500">
          <span className="font-semibold text-ink-1000">{filtered.length}</span> {sectionLabel.toLowerCase()} listings
          {activeCount > 0 && ' match your filters'}
        </p>
        {filtered.length === 0 ? (
          <p className="text-ink-400 py-8 text-sm">No listings match — try clearing filters.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => <DirListingCard key={r.id} row={r} section={section} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function DirListingCard({ row, section }: { row: DirListing; section: string }) {
  const thumb = displayableImage(row.thumbnail_url)
  return (
    <div className="border-2 border-[#0B0B0B] bg-white pop-shadow overflow-hidden">
      <div className="relative">
        {thumb ? (
          <div className="h-32 w-full overflow-hidden border-b-2 border-[#0B0B0B]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt={row.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-20 border-b-2 border-[#0B0B0B] bg-[#F2B400]/20 flex items-center justify-center">
            <span className="font-narrow font-semibold text-xs uppercase tracking-widest text-[#6E6A60]">
              {row.category_name ?? sectionLabelFor(section)}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <FavoriteButton entityId={row.id} section={section} />
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h4 className="font-bold leading-tight">{row.name}</h4>
        <p className="font-narrow text-[11px] font-semibold uppercase tracking-wide text-[#6E6A60]">
          {[row.category_name, row.city].filter(Boolean).join(' · ')}
        </p>
        {!!(row.business_identities && row.business_identities.length) && (
          <div className="flex flex-wrap gap-1">
            {row.business_identities.map(id => <IdentityBadge key={id} identity={id} />)}
          </div>
        )}
        {row.total_score != null && (
          <p className="flex items-center gap-1 text-xs text-[#3D3A34]">
            <Star className="w-3.5 h-3.5 fill-[#F2B400] text-[#F2B400]" />{row.total_score.toFixed(1)}
          </p>
        )}
        <div className="flex gap-3 text-xs pt-1">
          {row.website && (
            <a href={row.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#B81A16] font-semibold hover:underline">
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          )}
          {row.latitude != null && row.longitude != null && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#B81A16] font-semibold hover:underline">
              <MapPin className="w-3.5 h-3.5" /> Map
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function sectionLabelFor(section: string) {
  const map: Record<string, string> = { save: 'Lender', share: 'Share Org', swap: 'Swap', support: 'Support' }
  return map[section] ?? section
}
