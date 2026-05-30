import { createClient } from '@/lib/supabase-server'
import { BusinessListing } from '@/components/BusinessListing'
import { Nav } from '@/components/Nav'
import type { Business } from '@/types/business'
import type { Metadata } from 'next'

type Props = { params: Promise<{ neighborhood: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const neighborhood = decodeURIComponent((await params).neighborhood)
  return { title: `Businesses in ${neighborhood}, Seattle`, description: `Browse businesses in ${neighborhood}, Seattle.` }
}

export default async function NeighborhoodPage({ params }: Props) {
  const neighborhood = decodeURIComponent((await params).neighborhood)
  const supabase = await createClient()
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .ilike('neighborhood', neighborhood)
    .order('total_score', { ascending: false, nullsFirst: false })
    .limit(100)

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-formula font-extrabold text-2xl mb-1">Businesses in {neighborhood}, Seattle</h1>
        <p className="text-ink-500 text-sm mb-6">{businesses?.length ?? 0} results</p>
        {businesses?.length ? (
          <BusinessListing businesses={businesses as Business[]} />
        ) : (
          <p className="text-ink-500">No businesses found in this neighborhood.</p>
        )}
      </main>
    </>
  )
}
