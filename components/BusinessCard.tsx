'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { IdentityBadge } from './IdentityBadge'
import { FavoriteButton } from './FavoriteButton'
import { Card, CardContent } from '@/components/ui/card'
import { photoOf } from '@/lib/images'
import type { Business } from '@/types/business'

function StarRating({ score }: { score: number }) {
  return (
    <span className="text-sm text-ink-700 flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-li-yellow text-li-yellow" />
      {score.toFixed(1)}
    </span>
  )
}

export function BusinessCard({ business }: { business: Business }) {
  const thumbnail = photoOf(business)
  return (
    <Link href={`/businesses/${business.slug}`} className="group block">
      <Card className="overflow-hidden border-ink-150 p-0 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative aspect-[4/3] bg-ink-100">
          {thumbnail ? (
            <Image src={thumbnail} alt={business.name} fill className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-li-yellow-100">
              <span className="text-li-yellow-700 font-narrow font-semibold text-sm uppercase tracking-widest">
                {business.category_name ?? 'Business'}
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <FavoriteButton entityId={business.id} section="spend" />
          </div>
        </div>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-narrow font-semibold uppercase tracking-widest text-ink-500">
            {business.neighborhood ?? business.city}
          </p>
          <h3 className="font-formula font-extrabold text-ink-1000 leading-tight line-clamp-2">{business.name}</h3>
          <p className="text-sm text-ink-600 line-clamp-1">{business.category_name}</p>
          <div className="flex flex-wrap gap-1">
            {business.business_identities.slice(0, 3).map(id => <IdentityBadge key={id} identity={id} />)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {business.claimed
              ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-[#F2B400] text-[#0B0B0B] px-1.5 py-0.5">✓ Verified</span>
              : <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-ink-150 text-ink-500 px-1.5 py-0.5">Not Verified</span>
            }
            {business.total_score && <StarRating score={business.total_score} />}
            {business.total_score && business.reviews_count && <span className="text-xs text-ink-400">({business.reviews_count})</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
