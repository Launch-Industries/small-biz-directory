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
      <div className="hazard-stripe" />
      <header className="bg-[#0B0B0B] text-[#F6F3EA]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <p className="font-narrow text-[13px] font-bold uppercase tracking-[0.2em] text-[#F2B400] mb-3">The directory · five ways to give a f*ck</p>
          <h1 className="stencil text-[clamp(40px,7vw,84px)] text-[#F6F3EA]">
            Find local. <span className="text-[#E0241F]">Keep it local.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[#d9d4c7] text-lg">
            Discover and support independent, diverse-owned businesses across Seattle. Every listing here is real.
          </p>
        </div>
      </header>
      <div className="hazard-stripe" />
      <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <DirectoryExplorer businesses={businesses} initial={initial} />
      </main>
    </>
  )
}
