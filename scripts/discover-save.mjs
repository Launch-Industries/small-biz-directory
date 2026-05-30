// Discovery scrape for the SAVE category -> save_institutions (credit unions).
// Mirrors discover-businesses.mjs but targets save_institutions and stamps type.
// Usage:
//   node scripts/discover-save.mjs --write
//   node scripts/discover-save.mjs --write --search="credit union" --location="Washington State, USA" --per=120
import { loadEnv, runActor, arg } from './lib.mjs'

const GMAPS_ACTOR = 'compass~crawler-google-places'
const TYPE = arg('type', 'credit_union')  // credit_union | cdfi | financial_advisor

const upsize = (u) =>
  typeof u === 'string' && u.includes('googleusercontent')
    ? u.replace(/=w\d+-h\d+-k-no/, '=w1600-h1200-k-no')
    : u

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

function mapRecord(r) {
  return {
    place_id: r.placeId || r.inputPlaceId,
    name: r.title || null,
    type: TYPE,
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
    phone: r.phone ?? null,
    thumbnail_url: r.imageUrl ? upsize(r.imageUrl) : null,
    image_urls: (r.imageUrls || []).map(upsize),
    total_score: r.totalScore ?? null,
    reviews_count: r.reviewsCount ?? null,
    permanently_closed: r.permanentlyClosed ?? false,
    source: 'google_maps',
  }
}

async function fetchExistingSlugs(env) {
  const slugs = new Set(); let from = 0; const PAGE = 1000
  while (true) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/save_institutions?select=slug`, {
      headers: { apikey: env.SERVICE_KEY, Authorization: `Bearer ${env.SERVICE_KEY}`, Range: `${from}-${from + PAGE - 1}` },
    })
    if (!res.ok) throw new Error(`slug fetch failed: ${res.status} ${await res.text()}`)
    const rows = await res.json(); rows.forEach((r) => r.slug && slugs.add(r.slug))
    if (rows.length < PAGE) break; from += PAGE
  }
  return slugs
}

async function upsertBatch(env, batch) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/save_institutions?on_conflict=place_id`, {
    method: 'POST',
    headers: {
      apikey: env.SERVICE_KEY, Authorization: `Bearer ${env.SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  })
  if (!res.ok) throw new Error(`upsert failed: ${res.status} ${await res.text()}`)
}

async function count(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/save_institutions?select=place_id`, {
    method: 'HEAD',
    headers: { apikey: env.SERVICE_KEY, Authorization: `Bearer ${env.SERVICE_KEY}`, Prefer: 'count=exact', Range: '0-0' },
  })
  const cr = res.headers.get('content-range'); return cr ? parseInt(cr.split('/')[1], 10) : null
}

async function main() {
  const env = loadEnv()
  const write = process.argv.includes('--write')
  const search = arg('search', 'credit union')
  const location = arg('location', 'Washington State, USA')
  const per = parseInt(arg('per', '120'), 10)
  const searchStringsArray = search.split(',').map((s) => s.trim()).filter(Boolean)

  console.log(`Searching ${JSON.stringify(searchStringsArray)} in "${location}" (max ${per}/term)…`)
  const items = await runActor(env, GMAPS_ACTOR, {
    searchStringsArray, locationQuery: location, maxCrawledPlacesPerSearch: per,
    language: 'en', maxImages: 5, maxReviews: 0, scrapeContacts: true, skipClosedPlaces: true,
  }, { label: 'gmaps-save' })

  const byPlace = new Map()
  for (const r of items) {
    const row = mapRecord(r)
    if (row.place_id && row.name) byPlace.set(row.place_id, row)
  }
  let rows = [...byPlace.values()]
  console.log(`Scraped ${items.length} raw -> ${rows.length} unique.`)

  const taken = write ? await fetchExistingSlugs(env) : new Set()
  for (const row of rows) {
    let base = slugify(row.name) || row.place_id.toLowerCase()
    let slug = base, n = 1
    while (taken.has(slug)) { n += 1; slug = `${base}-${n}` }
    taken.add(slug); row.slug = slug
  }

  console.log('\n--- sample ---')
  for (const row of rows.slice(0, 3)) console.log(`${row.name} | ${row.city}, ${row.state} | ${row.phone ?? 'no phone'}`)

  if (!write) { console.log(`\nDry run. Would upsert ${rows.length}.`); return }
  const before = await count(env)
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) { await upsertBatch(env, rows.slice(i, i + BATCH)); console.log(`  upserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`) }
  const after = await count(env)
  console.log(`\nDone. save_institutions: ${before} -> ${after} (+${after - before} new).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
