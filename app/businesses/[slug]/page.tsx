import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Phone, Mail, MapPin, Globe, Star, Navigation } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { IdentityBadge } from '@/components/IdentityBadge'
import { PhotoGallery } from '@/components/PhotoGallery'
import { Nav } from '@/components/Nav'
import { displayableImage, photoOf } from '@/lib/images'
import { googleMapsUrl, directionsUrl, socialLinks } from '@/lib/links'
import { SITE_URL, localBusinessSchema, breadcrumbSchema } from '@/lib/schema'
import type { Business } from '@/types/business'
import type { Metadata } from 'next'
import { BUSINESS_COLUMNS } from '@/lib/businessColumns'

const BusinessMap = dynamic(() => import('@/components/BusinessMap'), { ssr: false })

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select(BUSINESS_COLUMNS).eq('slug', slug).single()
  if (!data) return {}
  return {
    title: `${data.name} — ${data.category_name ?? 'Seattle Business Directory'}`,
    description: `${data.name} in ${data.neighborhood ?? 'Seattle'}`,
  }
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select(BUSINESS_COLUMNS).eq('slug', slug).single()
  if (!data) notFound()
  const biz = data as Business
  const images = biz.image_urls.map(displayableImage).filter((u): u is string => u !== null)
  const thumb = photoOf(biz)
  const gallery = images.length > 0 ? images : thumb ? [thumb] : []
  const socials = socialLinks(biz)
  const hasGeo = biz.latitude != null && biz.longitude != null

  const localBusinessLd = localBusinessSchema(biz)
  const breadcrumbLd = breadcrumbSchema([
    { name: 'Home', url: `${SITE_URL}/` },
    ...(biz.category_name
      ? [{ name: biz.category_name, url: `${SITE_URL}/category/${encodeURIComponent(biz.category_name)}` }]
      : biz.neighborhood
        ? [{ name: biz.neighborhood, url: `${SITE_URL}/neighborhood/${encodeURIComponent(biz.neighborhood)}` }]
        : []),
    { name: biz.name, url: `${SITE_URL}/businesses/${biz.slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to directory</Link>

        <h1 className="font-formula font-extrabold text-3xl mt-4">{biz.name}</h1>
        <p className="text-gray-600 mt-1">{biz.category_name}{biz.neighborhood && ` · ${biz.neighborhood}`}</p>

        {/* Identity badges */}
        {biz.business_identities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {biz.business_identities.map((id) => (
              <IdentityBadge key={id} identity={id} verified={biz.verified_identities?.includes(id)} />
            ))}
          </div>
        )}

        {/* Rating */}
        {biz.total_score != null && (
          <p className="mt-3 flex items-center gap-1 text-sm text-ink-700">
            <Star className="w-4 h-4 fill-li-yellow text-li-yellow" />
            <span className="font-semibold">{biz.total_score.toFixed(1)}</span>
            {biz.reviews_count != null && <span className="text-ink-500">({biz.reviews_count.toLocaleString()} reviews)</span>}
          </p>
        )}

        {/* Gallery */}
        <div className="mt-6">
          {gallery.length > 0 ? (
            <PhotoGallery images={gallery} alt={biz.name} />
          ) : (
            <div className="w-full h-48 rounded-lg bg-ink-100 flex items-center justify-center text-ink-400">No image available</div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {/* Contact + socials */}
          <aside className="md:col-span-1 space-y-3">
            <h2 className="font-semibold text-lg">Contact</h2>
            <ul className="space-y-2 text-sm">
              {biz.address && (
                <li className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-ink-500" /><span>{biz.address}</span></li>
              )}
              {biz.phone && (
                <li className="flex gap-2"><Phone className="w-4 h-4 mt-0.5 shrink-0 text-ink-500" />
                  <a href={`tel:${biz.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">{biz.phone}</a></li>
              )}
              {biz.email && (
                <li className="flex gap-2"><Mail className="w-4 h-4 mt-0.5 shrink-0 text-ink-500" />
                  <a href={`mailto:${biz.email}`} className="hover:underline break-all">{biz.email}</a></li>
              )}
              {biz.website && (
                <li className="flex gap-2"><Globe className="w-4 h-4 mt-0.5 shrink-0 text-ink-500" />
                  <a href={biz.website} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                    {biz.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></li>
              )}
            </ul>

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {socials.map((s) => (
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-narrow font-semibold px-2.5 py-1 rounded-full bg-ink-100 text-ink-700 hover:bg-ink-150">
                    {s.label}
                  </a>
                ))}
              </div>
            )}

            {/* External listings */}
            <div className="flex flex-col gap-1.5 pt-2 text-sm">
              <a href={googleMapsUrl(biz.place_id)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on Google Maps ↗</a>
              {biz.yelp_url && (
                <a href={biz.yelp_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  View on Yelp{biz.yelp_rating != null ? ` (${biz.yelp_rating.toFixed(1)}★)` : ''} ↗</a>
              )}
              {hasGeo && (
                <a href={directionsUrl(biz)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                  <Navigation className="w-3.5 h-3.5" /> Get directions</a>
              )}
            </div>
          </aside>

          {/* Map */}
          <div className="md:col-span-2">
            {hasGeo ? (
              <div className="w-full h-72 rounded-lg overflow-hidden border border-ink-150">
                <BusinessMap latitude={biz.latitude!} longitude={biz.longitude!} name={biz.name} />
              </div>
            ) : (
              <div className="w-full h-72 rounded-lg bg-ink-100 flex items-center justify-center text-ink-400 text-sm">Location unavailable</div>
            )}
          </div>
        </div>

        {/* Owner info (claimed) */}
        {biz.owner_description && (
          <div className="mt-8">
            <h2 className="font-semibold text-lg">About</h2>
            <p className="text-gray-700 mt-1">{biz.owner_description}</p>
          </div>
        )}
        {biz.owner_hours && (
          <div className="mt-4">
            <h2 className="font-semibold text-lg">Hours</h2>
            <p className="text-gray-700 mt-1 whitespace-pre-line">{biz.owner_hours}</p>
          </div>
        )}

        {!biz.claimed && (
          <Link href={`/businesses/${biz.slug}/claim`} className="inline-block mt-8 text-sm text-ink-500 hover:underline">
            Claim this listing
          </Link>
        )}
      </main>
    </>
  )
}
