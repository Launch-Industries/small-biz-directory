import { createClient } from '@/lib/supabase-server'
import { Nav } from '@/components/Nav'
import { DirectoryExplorer, type DirectoryFilters } from '@/components/DirectoryExplorer'
import type { Business } from '@/types/business'

function parseList(v: string | undefined): string[] {
  return v ? v.split('~').filter(Boolean) : []
}

export default async function Home({
  searchParams,
}: {
  searchParams: { industry?: string; category?: string; location?: string; identity?: string }
}) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .order('total_score', { ascending: false, nullsFirst: false })
    .limit(1000)

  const businesses = (data as Business[] | null) ?? []
  const initial: DirectoryFilters = {
    industries: parseList(searchParams.industry),
    categories: parseList(searchParams.category),
    locations: parseList(searchParams.location),
    identities: parseList(searchParams.identity),
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="font-formula font-extrabold text-3xl text-ink-1000">Seattle Small Business Directory</h1>
          <p className="text-ink-600">Discover and support local businesses across Seattle&apos;s diverse communities.</p>
        </div>
        <DirectoryExplorer businesses={businesses} initial={initial} />
      </main>
    </>
  )
}
