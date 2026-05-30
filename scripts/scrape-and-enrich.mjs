// Re-scrape Google Maps by place_id (Compass actor, scrapeContacts=true) and
// enrich existing businesses rows in place: phone, email, social profiles, more
// photos, refreshed identities. Idempotent — upserts on place_id, never dupes.
//
// Usage:
//   node scripts/scrape-and-enrich.mjs --sample          # map /tmp/gmaps_out.json, print, NO write
//   node scripts/scrape-and-enrich.mjs --limit=10 --write # scrape 10 rows + write
//   node scripts/scrape-and-enrich.mjs --write            # scrape ALL + write
import { readFileSync } from 'fs'
import { loadEnv, sbSelect, sbUpdateByPlaceId, runActor, arg, cleanSocial } from './lib.mjs'

const GMAPS_ACTOR = 'compass~crawler-google-places'

// Self-reported identity attributes we preserve (matches existing convention).
const IDENTITY_KEYS = new Set([
  'Identifies as Black-owned', 'Identifies as women-owned', 'Identifies as LGBTQ+ owned',
  'Identifies as Asian-owned', 'Identifies as Latino-owned', 'Identifies as veteran-owned',
  'Identifies as disabled-owned', 'Identifies as Indigenous-owned',
  'LGBTQ+ friendly', 'Transgender safespace',
])

// Upsize lh3.googleusercontent.com thumbnails to full resolution (same rule as
// migration 002 — Google fits within the box, preserving aspect ratio).
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

const first = (a) => (Array.isArray(a) && a.length ? a[0] : null)

// Map one raw Compass record -> a partial businesses row patch.
// Only includes fields we actually got, so a re-run never nulls existing data.
export function mapRecord(r) {
  const identities = extractIdentities(r.additionalInfo)
  const has = (s) => identities.includes(s)
  const images = (r.imageUrls || []).map(upsize)

  const patch = {
    name: r.title || undefined,
    category_name: r.categoryName ?? undefined,
    categories: r.categories ?? undefined,
    address: r.address ?? undefined,
    neighborhood: r.neighborhood ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    postal_code: r.postalCode ?? undefined,
    latitude: r.location?.lat ?? undefined,
    longitude: r.location?.lng ?? undefined,
    website: r.website ?? undefined,
    phone: r.phone ?? undefined,
    email: first(r.emails) ?? undefined,
    facebook_url: cleanSocial(first(r.facebooks), /facebook\.com\/([^/?#]+)/) ?? undefined,
    instagram_url: cleanSocial(first(r.instagrams), /instagram\.com\/([^/?#]+)/) ?? undefined,
    twitter_url: cleanSocial(first(r.twitters), /(?:twitter|x)\.com\/([^/?#]+)/) ?? undefined,
    tiktok_url: cleanSocial(first(r.tiktoks), /tiktok\.com\/@?([^/?#]+)/) ?? undefined,
    linkedin_url: first(r.linkedIns) ?? undefined,
    youtube_url: first(r.youtubes) ?? undefined,
    thumbnail_url: r.imageUrl ? upsize(r.imageUrl) : undefined,
    image_urls: images.length ? images : undefined,
    total_score: r.totalScore ?? undefined,
    reviews_count: r.reviewsCount ?? undefined,
    permanently_closed: r.permanentlyClosed ?? undefined,
    business_identities: identities.length ? identities : undefined,
    is_women_owned: has('Identifies as women-owned') || undefined,
    is_black_owned: has('Identifies as Black-owned') || undefined,
    is_lgbtq_owned: has('Identifies as LGBTQ+ owned') || undefined,
    is_lgbtq_friendly: has('LGBTQ+ friendly') || undefined,
    is_asian_owned: has('Identifies as Asian-owned') || undefined,
    is_latino_owned: has('Identifies as Latino-owned') || undefined,
    is_veteran_owned: has('Identifies as veteran-owned') || undefined,
    is_disabled_owned: has('Identifies as disabled-owned') || undefined,
    is_indigenous_owned: has('Identifies as Indigenous-owned') || undefined,
    is_transgender_safespace: has('Transgender safespace') || undefined,
    places_scraped_at: new Date().toISOString(),
    contacts_scraped_at: new Date().toISOString(),
  }
  // drop undefined keys so PATCH only touches fields we have
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k]
  return { place_id: r.placeId || r.inputPlaceId, patch }
}

async function main() {
  const env = loadEnv()

  // --sample: map the already-fetched test output, print, do not write or scrape.
  if (process.argv.includes('--sample')) {
    const raw = JSON.parse(readFileSync('/tmp/gmaps_out.json', 'utf8'))
    for (const r of raw.slice(0, 3)) {
      const { place_id, patch } = mapRecord(r)
      console.log(`\n=== ${patch.name}  (place_id ${place_id}) ===`)
      console.log(JSON.stringify(patch, null, 2))
    }
    return
  }

  const write = process.argv.includes('--write')
  const limit = arg('limit', null)
  let q = 'businesses?select=place_id&order=reviews_count.desc.nullslast'
  if (limit) q += `&limit=${limit}`
  const rows = await sbSelect(env, q)
  const placeIds = rows.map((r) => r.place_id)
  console.log(`Scraping ${placeIds.length} places (write=${write})…`)

  // Compass actor accepts placeIds directly; chunk to keep runs modest.
  const CHUNK = 120
  let updated = 0
  for (let i = 0; i < placeIds.length; i += CHUNK) {
    const chunk = placeIds.slice(i, i + CHUNK)
    const items = await runActor(env, GMAPS_ACTOR, {
      placeIds: chunk, language: 'en', maxImages: 15, maxReviews: 0,
      scrapeContacts: true, skipClosedPlaces: false,
    }, { label: `gmaps ${i + 1}-${i + chunk.length}` })

    for (const r of items) {
      const { place_id, patch } = mapRecord(r)
      if (!place_id) continue
      if (write) { await sbUpdateByPlaceId(env, place_id, patch); updated++ }
    }
    console.log(`  chunk done — ${items.length} scraped${write ? `, ${updated} written` : ''}`)
  }
  console.log(write ? `Done. Updated ${updated} rows.` : 'Dry run complete (no --write).')
}

main().catch((e) => { console.error(e); process.exit(1) })
