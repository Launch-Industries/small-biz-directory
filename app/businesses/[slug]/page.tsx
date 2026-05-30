import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { IdentityBadge } from '@/components/IdentityBadge'
import { Nav } from '@/components/Nav'
import { displayableImage } from '@/lib/images'
import type { Business } from '@/types/business'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select('*').eq('slug', slug).single()
  if (!data) return {}
  return { title: `${data.name} — ${data.category_name ?? 'Seattle Business Directory'}`, description: `${data.name} in ${data.neighborhood ?? 'Seattle'}` }
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select('*').eq('slug', slug).single()
  if (!data) notFound()
  const biz = data as Business
  const images = biz.image_urls.map(displayableImage).filter((u): u is string => u !== null)
  const thumb = displayableImage(biz.thumbnail_url)

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to directory</Link>

        <h1 className="font-formula font-extrabold text-3xl mt-4">{biz.name}</h1>
        <p className="text-gray-600 mt-1">{biz.category_name}{biz.neighborhood && ` · ${biz.neighborhood}`}</p>
        {biz.address && <p className="text-gray-500 text-sm">{biz.address}</p>}

        {/* Image gallery */}
        <div className="mt-6">
          {images.length > 0 ? (
            <>
              <div className="relative w-full h-72 rounded-lg overflow-hidden">
                <Image src={images[0]} alt={biz.name} fill className="object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {images.slice(1, 5).map((url) => (
                    <div key={url} className="relative w-20 h-20 rounded overflow-hidden">
                      <Image src={url} alt={biz.name} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
              {thumb ? (
                <Image src={thumb} alt={biz.name} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No image available</div>
              )}
            </div>
          )}
        </div>

        {/* Identity badges */}
        {biz.business_identities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {biz.business_identities.map((id) => <IdentityBadge key={id} identity={id} />)}
          </div>
        )}

        {/* Rating */}
        {biz.total_score != null && (
          <p className="mt-4 text-sm">⭐ {biz.total_score.toFixed(1)}{biz.reviews_count != null && ` (${biz.reviews_count} reviews)`}</p>
        )}

        {/* Website */}
        {biz.website && (
          <a href={biz.website} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-blue-600 hover:underline text-sm">
            Visit website ↗
          </a>
        )}

        {/* Owner info (claimed) */}
        {biz.owner_description && (
          <div className="mt-6">
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

        {/* Map placeholder */}
        <div className="mt-6 w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">
          Map coming soon
        </div>

        {!biz.claimed && (
          <Link href={`/businesses/${biz.slug}/claim`} className="inline-block mt-6 text-sm text-ink-500 hover:underline">
            Claim this listing
          </Link>
        )}
      </main>
    </>
  )
}
