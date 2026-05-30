import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

const GMAPS_ACTOR = 'compass~crawler-google-places'

const IDENTITY_KEYS = new Set([
  'Identifies as Black-owned', 'Identifies as women-owned', 'Identifies as LGBTQ+ owned',
  'Identifies as Asian-owned', 'Identifies as Latino-owned', 'Identifies as veteran-owned',
  'Identifies as disabled-owned', 'Identifies as Indigenous-owned',
  'LGBTQ+ friendly', 'Transgender safespace',
])

const upsize = (u: string) =>
  u.includes('googleusercontent') ? u.replace(/=w\d+-h\d+-k-no/, '=w1600-h1200-k-no') : u

function extractIdentities(additionalInfo: Record<string, unknown>) {
  const out: string[] = []
  for (const vals of Object.values(additionalInfo || {})) {
    if (!Array.isArray(vals)) continue
    for (const entry of vals) {
      if (entry && typeof entry === 'object') {
        for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
          if (v === true && IDENTITY_KEYS.has(k)) out.push(k)
        }
      }
    }
  }
  return out
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

function mapRecord(r: any) {
  const identities = extractIdentities(r.additionalInfo)
  const images = (r.imageUrls || []).map((u: string) => upsize(u))
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

async function runActor(token: string, input: object) {
  const start = await fetch(
    `https://api.apify.com/v2/acts/${GMAPS_ACTOR}/runs?token=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
  )
  if (!start.ok) throw new Error(`actor start failed: ${start.status}`)
  const run = (await start.json()).data

  let status = run.status
  let datasetId = run.defaultDatasetId
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    await new Promise((r) => setTimeout(r, 5000))
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${token}`)
    const d = (await poll.json()).data
    status = d.status
    datasetId = d.defaultDatasetId
  }
  if (status !== 'SUCCEEDED') throw new Error(`actor ended ${status}`)

  const items = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`)
  return items.json()
}

async function fetchExistingSlugs(url: string, key: string) {
  const slugs = new Set<string>()
  let from = 0
  const PAGE = 1000
  while (true) {
    const res = await fetch(`${url}/rest/v1/businesses?select=slug`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE - 1}` },
    })
    if (!res.ok) throw new Error(`slug fetch failed: ${res.status}`)
    const rows: { slug: string }[] = await res.json()
    rows.forEach((r) => r.slug && slugs.add(r.slug))
    if (rows.length < PAGE) break
    from += PAGE
  }
  return slugs
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const APIFY_TOKEN = process.env.APIFY_TOKEN!

  const searchStringsArray = ['thrift store', 'consignment shop', 'reuse store']
  const locationQuery = 'Washington State, USA'

  const items = await runActor(APIFY_TOKEN, {
    searchStringsArray,
    locationQuery,
    maxCrawledPlacesPerSearch: 50,
    language: 'en',
    maxImages: 10,
    maxReviews: 0,
    scrapeContacts: false,
    skipClosedPlaces: true,
  })

  const byPlace = new Map<string, any>()
  for (const r of items) {
    const row = mapRecord(r)
    if (row.place_id && row.name) byPlace.set(row.place_id, row)
  }
  const rows = Array.from(byPlace.values())

  const taken = await fetchExistingSlugs(SB_URL, SERVICE_KEY)
  for (const row of rows) {
    let base = slugify(row.name) || row.place_id.toLowerCase()
    let slug = base
    let n = 1
    while (taken.has(slug)) { n++; slug = `${base}-${n}` }
    taken.add(slug)
    ;(row as any).slug = slug
  }

  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    const res = await fetch(`${SB_URL}/rest/v1/businesses?on_conflict=place_id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows.slice(i, i + BATCH)),
    })
    if (!res.ok) throw new Error(`upsert failed: ${res.status} ${await res.text()}`)
  }

  return NextResponse.json({ success: true, upserted: rows.length })
}
