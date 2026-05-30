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

// Search terms grouped by destination table
const SHARE_SEARCHES = [
  'thrift store', 'consignment shop', 'reuse store', 'vintage store',
  'flea market', 'salvage store', 'used furniture store', 'donation center',
]
const SAVE_SEARCHES = ['credit union', 'financial planner', 'fee only financial advisor']

const FINANCIAL_CATEGORIES = new Set([
  'credit union', 'financial planner', 'financial consultant', 'bank',
  'atm', 'mortgage lender', 'financial institution', 'investment company',
])

function classifySaveType(cat: string) {
  const cl = (cat || '').toLowerCase()
  if (cl.includes('credit union') || cl.includes('bank') || cl.includes('atm')) return 'credit_union'
  return 'financial_advisor'
}

function isFinancial(r: any) {
  const cat = (r.categoryName || '').toLowerCase()
  const search = (r.searchString || '').toLowerCase()
  return FINANCIAL_CATEGORIES.has(cat) || SAVE_SEARCHES.includes(search)
}

async function fetchSlugs(url: string, key: string, table: string) {
  const slugs = new Set<string>()
  let from = 0
  while (true) {
    const res = await fetch(`${url}/rest/v1/${table}?select=slug`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
    })
    if (!res.ok) break
    const rows: { slug: string }[] = await res.json()
    rows.forEach((r) => r.slug && slugs.add(r.slug))
    if (rows.length < 1000) break
    from += 1000
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
  const locationQuery = 'Washington State, USA'

  // Run one actor call with all search terms
  const allSearches = [...SHARE_SEARCHES, ...SAVE_SEARCHES]
  const items = await runActor(APIFY_TOKEN, {
    searchStringsArray: allSearches,
    locationQuery,
    maxCrawledPlacesPerSearch: 50,
    language: 'en',
    maxImages: 10,
    maxReviews: 0,
    scrapeContacts: false,
    skipClosedPlaces: true,
  })

  // Split results into financial (save_institutions) vs everything else (businesses)
  const saveByPlace = new Map<string, any>()
  const bizByPlace = new Map<string, any>()

  for (const r of items) {
    const pid = r.placeId || r.inputPlaceId
    if (!pid || !r.title) continue
    if (isFinancial(r)) {
      saveByPlace.set(pid, r)
    } else {
      bizByPlace.set(pid, r)
    }
  }

  // Upsert businesses (Share/Spend)
  const bizSlugs = await fetchSlugs(SB_URL, SERVICE_KEY, 'businesses')
  const bizRows = Array.from(bizByPlace.values()).map((r) => {
    const row = mapRecord(r) as any
    let base = slugify(row.name) || row.place_id.toLowerCase()
    let slug = base
    let n = 1
    while (bizSlugs.has(slug)) { n++; slug = `${base}-${n}` }
    bizSlugs.add(slug)
    row.slug = slug
    return row
  })

  for (let i = 0; i < bizRows.length; i += 200) {
    const res = await fetch(`${SB_URL}/rest/v1/businesses?on_conflict=place_id`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(bizRows.slice(i, i + 200)),
    })
    if (!res.ok) throw new Error(`biz upsert failed: ${res.status} ${await res.text()}`)
  }

  // Upsert save_institutions (Save)
  const saveSlugs = await fetchSlugs(SB_URL, SERVICE_KEY, 'save_institutions')
  const saveRows = Array.from(saveByPlace.values()).map((r) => {
    const images = (r.imageUrls || []).map((u: string) => upsize(u))
    let base = slugify(r.title) || r.placeId.toLowerCase()
    let slug = base
    let n = 1
    while (saveSlugs.has(slug)) { n++; slug = `${base}-${n}` }
    saveSlugs.add(slug)
    return {
      place_id: r.placeId || r.inputPlaceId,
      slug,
      name: r.title,
      type: classifySaveType(r.categoryName),
      category_name: r.categoryName ?? null,
      categories: r.categories ?? [],
      address: r.address ?? null,
      city: r.city ?? null,
      state: r.state ?? null,
      postal_code: r.postalCode ?? null,
      latitude: r.location?.lat ?? null,
      longitude: r.location?.lng ?? null,
      website: r.website ?? null,
      phone: r.phone ?? null,
      thumbnail_url: r.imageUrl ? upsize(r.imageUrl) : null,
      image_urls: images,
      total_score: r.totalScore ?? null,
      reviews_count: r.reviewsCount ?? null,
      permanently_closed: r.permanentlyClosed ?? false,
      source: 'google_maps',
    }
  })

  for (let i = 0; i < saveRows.length; i += 200) {
    const res = await fetch(`${SB_URL}/rest/v1/save_institutions?on_conflict=place_id`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(saveRows.slice(i, i + 200)),
    })
    if (!res.ok) throw new Error(`save upsert failed: ${res.status} ${await res.text()}`)
  }

  return NextResponse.json({ success: true, businesses: bizRows.length, save_institutions: saveRows.length })
}
