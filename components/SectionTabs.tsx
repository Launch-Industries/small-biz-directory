'use client'

import { useState } from 'react'
import { MapPin, Globe, Star } from 'lucide-react'
import { DirectoryExplorer, type DirectoryFilters } from './DirectoryExplorer'
import { DirListingExplorer } from './DirListingExplorer'
import { IdentityBadge } from './IdentityBadge'
import { displayableImage } from '@/lib/images'
import { googleMapsUrl } from '@/lib/links'
import type { Business } from '@/types/business'

// A row from the directory_listings view (lighter than Business).
export type DirListing = {
  id: string; section: string; name: string; slug: string | null
  category_name: string | null; city: string | null; state: string | null
  latitude: number | null; longitude: number | null; website: string | null
  thumbnail_url: string | null; total_score: number | null; reviews_count: number | null
  business_identities: string[] | null; is_women_owned: boolean | null
}

const SECTIONS = [
  { key: 'spend', label: 'Spend', blurb: 'Local businesses', accent: '#E0241F' },
  { key: 'save', label: 'Save', blurb: 'Lenders & advisors', accent: '#F2B400' },
  { key: 'swap', label: 'Swap', blurb: 'Barter, borrow, free', accent: '#6E6A60' },
  { key: 'share', label: 'Share', blurb: 'Thrift, reuse & tools', accent: '#F2B400' },
  { key: 'support', label: 'Support', blurb: 'Who needs help', accent: '#E0241F' },
] as const
type Key = (typeof SECTIONS)[number]['key']

export function SectionTabs({
  businesses, listings, initial,
}: {
  businesses: Business[]
  listings: DirListing[]
  initial: DirectoryFilters
}) {
  const [active, setActive] = useState<Key>('spend')
  const counts: Record<string, number> = { spend: businesses.length }
  for (const l of listings) counts[l.section] = (counts[l.section] ?? 0) + 1

  return (
    <div className="space-y-6">
      {/* 5 S's section tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {SECTIONS.map((s) => {
          const on = active === s.key
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`text-left border-2 border-[#0B0B0B] p-3 transition ${on ? 'bg-[#0B0B0B] text-[#F6F3EA]' : 'bg-[#F6F3EA] hover:bg-[#ECE7D6]'}`}
            >
              <span className="block h-1.5 w-full mb-2" style={{ background: s.accent }} />
              <b className="font-stencil uppercase text-lg leading-none">{s.label}</b>
              <span className={`block text-[11px] mt-1 ${on ? 'text-[#d9d4c7]' : 'text-[#6E6A60]'}`}>{s.blurb}</span>
              <span className={`block text-[11px] font-bold mt-1 ${on ? 'text-[#F2B400]' : 'text-[#B81A16]'}`}>{counts[s.key] ?? 0}</span>
            </button>
          )
        })}
      </div>

      {active === 'spend' ? (
        <DirectoryExplorer businesses={businesses} initial={initial} />
      ) : active === 'save' || active === 'share' ? (
        <DirListingExplorer
          rows={listings.filter((l) => l.section === active)}
          section={active}
          sectionLabel={SECTIONS.find((s) => s.key === active)!.label}
        />
      ) : (
        <SectionGrid rows={listings.filter((l) => l.section === active)} sectionLabel={SECTIONS.find((s) => s.key === active)!.label} />
      )}
    </div>
  )
}

function SectionGrid({ rows, sectionLabel }: { rows: DirListing[]; sectionLabel: string }) {
  if (rows.length === 0)
    return <p className="text-[#6E6A60] py-8">No {sectionLabel} listings yet — check back soon.</p>
  return (
    <>
      <p className="text-sm text-[#6E6A60]"><span className="font-bold text-[#0B0B0B]">{rows.length}</span> {sectionLabel} listings</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        {rows.map((r) => {
          const thumb = displayableImage(r.thumbnail_url)
          return (
            <div key={r.id} className="border-2 border-[#0B0B0B] bg-white pop-shadow">
              {thumb && (
                <div className="h-32 w-full overflow-hidden border-b-2 border-[#0B0B0B]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt={r.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-3">
                <h4 className="font-bold leading-tight">{r.name}</h4>
                <p className="font-narrow text-[11px] font-semibold uppercase tracking-wide text-[#6E6A60] mt-1">
                  {[r.category_name, r.city].filter(Boolean).join(' · ')}
                </p>
                {!!(r.business_identities && r.business_identities.length) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.business_identities.map((id) => <IdentityBadge key={id} identity={id} />)}
                  </div>
                )}
                {r.total_score != null && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-[#3D3A34]">
                    <Star className="w-3.5 h-3.5 fill-[#F2B400] text-[#F2B400]" />{r.total_score.toFixed(1)}
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-xs">
                  {r.website && (
                    <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#B81A16] font-semibold hover:underline">
                      <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                  {r.latitude != null && r.longitude != null && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#B81A16] font-semibold hover:underline">
                      <MapPin className="w-3.5 h-3.5" /> Map
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
