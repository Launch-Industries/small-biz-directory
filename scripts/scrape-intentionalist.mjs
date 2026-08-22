// Scrape intentionalist.com by crawling all listing URLs from their sitemaps.
// Individual listing pages are static HTML with identity tags embedded.
// Free — pure fetch, no Apify needed. ~8-12 min for full run.
//
// For businesses already in the DB: merges identity tags and updates flags.
// For new businesses: upserts with source='intentionalist'.
//
// Usage:
//   node scripts/scrape-intentionalist.mjs --sample          # first 50 listings, dry run
//   node scripts/scrape-intentionalist.mjs --sample --limit=200
//   node scripts/scrape-intentionalist.mjs --write            # full run, write to Supabase

import { loadEnv, sbSelect, sbUpdateByPlaceId, sbUpsertBusiness, normalizeName, matchBusiness, arg } from './lib.mjs'

const BASE = 'https://intentionalist.com'
const CONCURRENCY = 6
const DELAY_MS = 250
const WRITE_EVERY = 100 // flush to Supabase after this many identity-tagged listings

// Identity tag slugs we care about → identity string → boolean flag
const TAG_MAP = {
  'black-owned':       { identity: 'Identifies as Black-owned',       flag: 'is_black_owned' },
  'woman-owned':       { identity: 'Identifies as women-owned',        flag: 'is_women_owned' },
  'women-owned':       { identity: 'Identifies as women-owned',        flag: 'is_women_owned' },
  'lgbtq-owned':       { identity: 'Identifies as LGBTQ+ owned',       flag: 'is_lgbtq_owned' },
  'asian-owned':       { identity: 'Identifies as Asian-owned',        flag: 'is_asian_owned' },
  'latino-owned':      { identity: 'Identifies as Latino-owned',       flag: 'is_latino_owned' },
  'latinx-owned':      { identity: 'Identifies as Latino-owned',       flag: 'is_latino_owned' },
  'native-owned':      { identity: 'Identifies as Indigenous-owned',   flag: 'is_indigenous_owned' },
  'indigenous-owned':  { identity: 'Identifies as Indigenous-owned',   flag: 'is_indigenous_owned' },
  'disability-owned':  { identity: 'Identifies as disabled-owned',     flag: 'is_disabled_owned' },
  'veteran-owned':     { identity: 'Identifies as veteran-owned',      flag: 'is_veteran_owned' },
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function decodeHtml(str) {
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&lsquo;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"')
}

// Fetch all listing URLs from all Intentionalist sitemaps
async function getAllListingUrls() {
  const urls = []
  const sitemapNums = ['', '2', '3', '4', '5', '6']
  for (const n of sitemapNums) {
    const r = await fetch(`${BASE}/listing-sitemap${n}.xml`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) continue
    const xml = await r.text()
    const found = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(m => m[1])
      .filter(u => u.includes('/b/') && u !== `${BASE}/b/`)
    urls.push(...found)
  }
  return urls
}

// Parse identity tags and name from a listing page HTML
function parseListing(html, url) {
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
    || html.match(/property="og:title"\s+content="([^"]+)"/)
    || html.match(/name="og:title"\s+content="([^"]+)"/)
  const name = nameMatch ? decodeHtml(nameMatch[1].trim()) : null
  if (!name) return null

  // Extract all tag slugs linked from this page
  const tagSlugs = [...new Set(
    [...html.matchAll(/href="[^"]*\/b\/tag\/([^"\/]+)\//gi)].map(m => m[1])
  )]

  // Map to identity entries
  const identities = []
  const flags = {}
  for (const slug of tagSlugs) {
    if (TAG_MAP[slug]) {
      identities.push(TAG_MAP[slug].identity)
      flags[TAG_MAP[slug].flag] = true
    }
  }

  if (identities.length === 0) return null // not an identity-tagged business

  // Try to get address from structured data or visible text
  const addrMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/)
    || html.match(/itemprop="streetAddress"[^>]*>([^<]+)</)
  const address = addrMatch ? decodeHtml(addrMatch[1].trim()) : null

  const websiteMatch = html.match(/"url"\s*:\s*"(https?:\/\/(?!intentionalist)[^"]+)"/)
  const website = websiteMatch ? websiteMatch[1] : null

  const slug = url.split('/b/')[1]?.replace(/\/$/, '') || slugify(name)

  return { name, address, website, slug, identities, flags, url }
}

// Fetch with retry
async function fetchWithRetry(url, opts = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) })
      if (r.ok) return r
      if (r.status === 404) return null
    } catch (e) {
      if (i === retries) return null
      await new Promise(r => setTimeout(r, 1500))
    }
  }
  return null
}

// Write a batch of scraped listings to Supabase, returns { matched, inserted, skipped }
async function flushListings(env, listings, existing, write, sample) {
  // Dedup by slug
  const seen = new Map()
  for (const biz of listings) {
    const key = biz.slug
    if (!seen.has(key)) { seen.set(key, biz); continue }
    const prev = seen.get(key)
    for (const id of biz.identities) if (!prev.identities.includes(id)) prev.identities.push(id)
    Object.assign(prev.flags, biz.flags)
  }

  let matched = 0, inserted = 0, skipped = 0
  for (const biz of seen.values()) {
    const match = matchBusiness(existing, biz.name)
    if (match) {
      matched++
      const current = match.business_identities || []
      const merged = [...new Set([...current, ...biz.identities])]
      const patch = {
        business_identities: merged,
        ...biz.flags,
        intentionalist_scraped_at: new Date().toISOString(),
      }
      if (sample) {
        console.log(`[match] "${biz.name}" → "${match.name}"  tags: ${biz.identities.join(', ')}`)
      } else if (write) {
        await sbUpdateByPlaceId(env, match.place_id, patch)
        match.business_identities = merged
      }
    } else {
      inserted++
      const row = {
        place_id: `intentionalist:${biz.slug}`,
        slug: biz.slug,
        name: biz.name,
        address: biz.address || null,
        website: biz.website || null,
        source: 'intentionalist',
        business_identities: biz.identities,
        ...biz.flags,
        intentionalist_scraped_at: new Date().toISOString(),
      }
      if (sample) {
        console.log(`[new]   "${biz.name}"  tags: ${biz.identities.join(', ')}`)
      } else if (write) {
        try { await sbUpsertBusiness(env, row) }
        catch (e) { console.warn(`  upsert failed for "${biz.name}": ${e.message}`); skipped++ }
      }
    }
  }
  return { matched, inserted, skipped }
}

async function main() {
  const env = loadEnv()
  const write = process.argv.includes('--write')
  const sample = process.argv.includes('--sample')
  const limit = parseInt(arg('limit', sample ? '50' : '99999'))

  const existing = await sbSelect(env, 'businesses?select=place_id,name,business_identities,slug')
  console.log(`Loaded ${existing.length} existing businesses`)

  console.log('Fetching listing URLs from sitemaps…')
  let allUrls = await getAllListingUrls()
  console.log(`Found ${allUrls.length} total listing URLs`)
  if (limit < allUrls.length) {
    console.log(`Limiting to ${limit} URLs (${sample ? '--sample' : '--limit=' + limit})`)
    allUrls = allUrls.slice(0, limit)
  }

  console.log(`Fetching listing pages (${CONCURRENCY} concurrent), flushing every ${WRITE_EVERY} tagged…`)

  let totalMatched = 0, totalInserted = 0, totalSkipped = 0
  let pending = []
  let fetched = 0

  for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
    const batch = allUrls.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(async (url) => {
      const r = await fetchWithRetry(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; directory-enrichment/1.0)' } })
      if (!r) return null
      const html = await r.text()
      return parseListing(html, url)
    }))
    pending.push(...batchResults.filter(Boolean))
    fetched += batch.length

    process.stdout.write(`  ${Math.min(fetched, allUrls.length)}/${allUrls.length} fetched, ${pending.length} pending tags\r`)

    // Flush when we've accumulated enough identity-tagged listings
    if (pending.length >= WRITE_EVERY) {
      console.log(`\n  → flushing ${pending.length} listings to Supabase…`)
      const stats = await flushListings(env, pending, existing, write, sample)
      totalMatched += stats.matched
      totalInserted += stats.inserted
      totalSkipped += stats.skipped
      console.log(`  matched: ${totalMatched}, new: ${totalInserted}, skipped: ${totalSkipped} (cumulative)`)
      pending = []
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  // Flush remainder
  if (pending.length > 0) {
    console.log(`\n  → flushing final ${pending.length} listings…`)
    const stats = await flushListings(env, pending, existing, write, sample)
    totalMatched += stats.matched
    totalInserted += stats.inserted
    totalSkipped += stats.skipped
  }

  console.log(`\nDone. Matched: ${totalMatched}, New: ${totalInserted}, Skipped: ${totalSkipped}, Write: ${write}`)
  if (!write && !sample) console.log('(dry run — pass --write to commit changes)')
}

main().catch((e) => { console.error(e); process.exit(1) })
