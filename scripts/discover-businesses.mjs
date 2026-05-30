// Discovery scrape: search Google Maps (Compass actor) by term + location and
// upsert NEW listings into businesses. Idempotent — upserts on place_id.
//
// Maps ONLY to columns that exist in the live `businesses` table (mirrors
// import-businesses.mjs), so it won't fail on columns the enrich script assumes
// but that aren't deployed yet (phone/email/social/places_scraped_at/etc).
//
// Usage:
//   node scripts/discover-businesses.mjs --sample                      # scrape, map, print 3, NO write
//   node scripts/discover-businesses.mjs --write                       # scrape + upsert (defaults below)
//   node scripts/discover-businesses.mjs --write \
//     --search="thrift store,consignment shop,reuse store" \
//     --location="Washington State, USA" --per=50
import { loadEnv, runActor, arg } from './lib.mjs'

const GMAPS_ACTOR = 'compass~crawler-google-places'

const IDENTITY_KEYS = new Set([
  'Identifies as Black-owned', 'Identifies as women-owned', 'Identifies as LGBTQ+ owned',
  'Identifies as Asian-owned', 'Identifies as Latino-owned', 'Identifies as veteran-owned',
  'Identifies as disabled-owned', 'Identifies as Indigenous-owned',
  'LGBTQ+ friendly', 'Transgender safespace',
])

const upsize = (u) =>
  typeof u === 'string' && u.includes('googleusercontent')
    ? u.replace(/=w\d+-h\d+-k-no/, '=w1600-h1200-k-no')
    : u

function extractIdentities(additionalInfo) {
  const out = []
  for (const vals of Object.values(additionalInfo || {})) {
    if (!Array.isArray(vals)) continue
    for (const entry of vals) {
      if (entry && typeof entry === 'object') {
        for (const [k, v] of Object.entries(entry)) {
          if (v === true && IDENTITY_KEYS.has(k)) out.push(k)
        }
      }
    }
  }
  return out
}

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

// Raw Compass record -> a full businesses INSERT row (existing columns only).
function mapRecord(r) {
  const identities = extractIdentities(r.additionalInfo)
  const images = (r.imageUrls || []).map(upsize)
  return {
    place_id: r.placeId || r.inputPlaceId,
    name: r.title || null,
    category_name: r.categoryName ?? null,
    categories: r.categories ?? [],
    address: r.address ?? null,
    neighborhood: r.neighborhood ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    postal_code: r.postalCode ?? null,
    latitude: r.location?.lat ?? null,
    longitude: r.location?.lng ?? null,
    website: r.website ?? null,
    thumbnail_url: r.imageUrl ? upsize(r.imageUrl) : null,
    image_urls: images,
    total_score: r.totalScore ?? null,
    reviews_count: r.reviewsCount ?? null,
    business_identities: identities,
    is_women_owned: identities.includes('Identifies as women-owned'),
    permanently_closed: r.permanentlyClosed ?? false,
  }
}

async function fetchExistingSlugs(env) {
  // page through all slugs so cross-row uniqueness holds
  const slugs = new Set()
  let from = 0
  const PAGE = 1000
  while (true) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/businesses?select=slug`, {
      headers: {
        apikey: env.SERVICE_KEY,
        Authorization: `Bearer ${env.SERVICE_KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    })
    if (!res.ok) throw new Error(`slug fetch failed: ${res.status} ${await res.text()}`)
    const rows = await res.json()
    rows.forEach((r) => r.slug && slugs.add(r.slug))
    if (rows.length < PAGE) break
    from += PAGE
  }
  return slugs
}

async function upsertBatch(env, batch) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/businesses?on_conflict=place_id`, {
    method: 'POST',
    headers: {
      apikey: env.SERVICE_KEY,
      Authorization: `Bearer ${env.SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  })
  if (!res.ok) throw new Error(`upsert failed: ${res.status} ${await res.text()}`)
}

async function countBusinesses(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/businesses?select=place_id`, {
    method: 'HEAD',
    headers: {
      apikey: env.SERVICE_KEY,
      Authorization: `Bearer ${env.SERVICE_KEY}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })
  const cr = res.headers.get('content-range') // e.g. "0-0/236"
  return cr ? parseInt(cr.split('/')[1], 10) : null
}

async function main() {
  const env = loadEnv()
  const write = process.argv.includes('--write')
  const sample = process.argv.includes('--sample')

  const search = arg('search', 'thrift store,consignment shop,reuse store')
  const location = arg('location', 'Washington State, USA')
  const per = parseInt(arg('per', '50'), 10)
  const searchStringsArray = search.split(',').map((s) => s.trim()).filter(Boolean)

  console.log(`Searching ${JSON.stringify(searchStringsArray)} in "${location}" (max ${per}/term)…`)
  const items = await runActor(env, GMAPS_ACTOR, {
    searchStringsArray,
    locationQuery: location,
    maxCrawledPlacesPerSearch: per,
    language: 'en',
    maxImages: 10,
    maxReviews: 0,
    scrapeContacts: false,
    skipClosedPlaces: true,
  }, { label: 'gmaps-discover' })

  // map + dedupe on place_id within this run
  const byPlace = new Map()
  for (const r of items) {
    const row = mapRecord(r)
    if (row.place_id && row.name) byPlace.set(row.place_id, row)
  }
  let rows = [...byPlace.values()]
  console.log(`Scraped ${items.length} raw items -> ${rows.length} unique places.`)

  // assign unique slugs (vs existing DB + within batch)
  const taken = sample ? new Set() : await fetchExistingSlugs(env)
  for (const row of rows) {
    let base = slugify(row.name) || row.place_id.toLowerCase()
    let slug = base
    let n = 1
    while (taken.has(slug)) { n += 1; slug = `${base}-${n}` }
    taken.add(slug)
    row.slug = slug
  }

  console.log('\n--- sample (first 3 mapped) ---')
  for (const row of rows.slice(0, 3)) {
    console.log(`${row.name} | ${row.category_name} | ${row.city}, ${row.state} | reviews=${row.reviews_count} | slug=${row.slug}`)
  }

  if (!write) {
    console.log(`\nDry run (no --write). Would upsert ${rows.length} rows.`)
    return
  }

  const before = await countBusinesses(env)
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    await upsertBatch(env, rows.slice(i, i + BATCH))
    console.log(`  upserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }
  const after = await countBusinesses(env)
  console.log(`\nDone. businesses: ${before} -> ${after} (+${after - before} new, ${rows.length - (after - before)} merged/updated).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
