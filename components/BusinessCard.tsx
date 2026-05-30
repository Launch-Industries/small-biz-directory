import Link from 'next/link'
import Image from 'next/image'
import { IdentityBadge } from './IdentityBadge'
import type { Business } from '@/types/business'

function StarRating({ score }: { score: number }) {
  return (
    <span className="text-sm text-ink-700 flex items-center gap-1">
      <span className="text-li-yellow">★</span>{score.toFixed(1)}
    </span>
  )
}

export function BusinessCard({ business }: { business: Business }) {
  return (
    <Link href={`/businesses/${business.slug}`}
      className="group block rounded-xl overflow-hidden border border-ink-150 bg-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-ink-100">
        {business.thumbnail_url ? (
          <Image src={business.thumbnail_url} alt={business.name} fill className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-li-yellow-100">
            <span className="text-li-yellow-700 font-narrow font-semibold text-sm uppercase tracking-widest">
              {business.category_name ?? 'Business'}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <p className="text-xs font-narrow font-semibold uppercase tracking-widest text-ink-500">
          {business.neighborhood ?? business.city}
        </p>
        <h3 className="font-formula font-extrabold text-ink-1000 leading-tight line-clamp-2">{business.name}</h3>
        <p className="text-sm text-ink-600 line-clamp-1">{business.category_name}</p>
        <div className="flex flex-wrap gap-1">
          {business.business_identities.slice(0, 3).map(id => <IdentityBadge key={id} identity={id} />)}
        </div>
        {business.total_score && (
          <div className="flex items-center gap-2">
            <StarRating score={business.total_score} />
            {business.reviews_count && <span className="text-xs text-ink-400">({business.reviews_count})</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
