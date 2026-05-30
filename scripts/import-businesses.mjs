import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://egnrizeybeihfavzwxfe.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

const raw = JSON.parse(readFileSync('/tmp/merged_dataset.json', 'utf8'))
const records = raw.filter(b => b.placeId && b.name).map(b => ({
  place_id: b.placeId, slug: slugify(b.name), name: b.name,
  category_name: b.categoryName ?? null, categories: b.categories ?? [],
  address: b.address ?? null, neighborhood: b.neighborhood ?? null,
  city: b.city ?? null, state: b.state ?? null, postal_code: b.postalCode ?? null,
  latitude: b.latitude ?? null, longitude: b.longitude ?? null,
  website: b.website ?? null, thumbnail_url: b.thumbnailUrl ?? null,
  image_urls: b.imageUrls ?? [], total_score: b.totalScore ?? null,
  reviews_count: b.reviewsCount ?? null, business_identities: b.businessIdentities ?? [],
  is_women_owned: b.isWomenOwned ?? false, permanently_closed: b.permanentlyClosed ?? false,
}))

const slugCounts = {}
for (const r of records) slugCounts[r.slug] = (slugCounts[r.slug] ?? 0) + 1
const slugSeen = {}
for (const r of records) {
  if (slugCounts[r.slug] > 1) {
    slugSeen[r.slug] = (slugSeen[r.slug] ?? 0) + 1
    r.slug = `${r.slug}-${slugSeen[r.slug]}`
  }
}

// Use fetch directly (Node 18+ built-in)
const BATCH = 200
let total = 0
for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/businesses?on_conflict=place_id`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,count=exact',
    },
    body: JSON.stringify(batch),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Import failed:', err)
    process.exit(1)
  }
  const countHeader = res.headers.get('content-range')
  total += batch.length
  console.log(`Batch ${Math.floor(i/BATCH)+1}: uploaded ${batch.length} records`)
}
console.log(`Imported ${total} businesses`)
