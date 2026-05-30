import { createClient } from '@/lib/supabase-server'
import { Nav } from '@/components/Nav'
import { SearchBar } from '@/components/SearchBar'
import { BusinessListing } from '@/components/BusinessListing'
import type { Business } from '@/types/business'

export default async function Home({ searchParams }: { searchParams: { q?: string; identity?: string } }) {
  const { q, identity } = searchParams
  const supabase = await createClient()

  let query = supabase.from('businesses').select('*')
  if (q) query = query.ilike('name', `%${q}%`)
  if (identity) query = query.contains('business_identities', [identity])
  query = query.order('total_score', { ascending: false, nullsFirst: false }).limit(50)

  const { data: businesses } = await query

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="font-formula font-extrabold text-3xl text-ink-1000">Seattle Small Business Directory</h1>
          <p className="text-ink-600">Discover and support local businesses across Seattle&apos;s diverse communities.</p>
        </div>
        <SearchBar />
        <BusinessListing businesses={(businesses as Business[] | null) ?? []} />
      </main>
    </>
  )
}
