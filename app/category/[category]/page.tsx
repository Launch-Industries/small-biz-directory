import { createClient } from '@/lib/supabase-server'
import { BusinessListing } from '@/components/BusinessListing'
import { Nav } from '@/components/Nav'
import { SITE_URL, itemListSchema, breadcrumbSchema } from '@/lib/schema'
import type { Business } from '@/types/business'
import type { Metadata } from 'next'
import { BUSINESS_COLUMNS } from '@/lib/businessColumns'

type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = decodeURIComponent((await params).category)
  return { title: `${category} in Seattle`, description: `Find ${category} businesses in Seattle.` }
}

export default async function CategoryPage({ params }: Props) {
  const category = decodeURIComponent((await params).category)
  const supabase = await createClient()
  const { data: businesses } = await supabase
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .ilike('category_name', category)
    .order('total_score', { ascending: false, nullsFirst: false })
    .limit(100)

  const list = (businesses ?? []) as Business[]
  const itemListLd = itemListSchema(list, { name: `${category} in Seattle` })
  const breadcrumbLd = breadcrumbSchema([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: category, url: `${SITE_URL}/category/${encodeURIComponent(category)}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-formula font-extrabold text-2xl mb-1">{category} in Seattle</h1>
        <p className="text-ink-500 text-sm mb-6">{businesses?.length ?? 0} results</p>
        {businesses?.length ? (
          <BusinessListing businesses={businesses as Business[]} />
        ) : (
          <p className="text-ink-500">No businesses found in this category.</p>
        )}
      </main>
    </>
  )
}
