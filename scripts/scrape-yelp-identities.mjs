// Scrape Yelp identity-filtered search pages for Seattle and enrich existing
// businesses with identity tags. Uses the free tri_angle~yelp-scraper Apify
// actor (~$1.50 total, no monthly subscription).
//
// The identity is known from which search URL produced each result — we don't
// need the actor to parse the identity attribute field.
//
// Usage:
//   node scripts/scrape-yelp-identities.mjs --sample   # dry run, print matches
//   node scripts/scrape-yelp-identities.mjs --write     # write to Supabase

import { loadEnv, sbSelect, sbUpdateByPlaceId, runActor, normalizeName, matchBusiness } from './lib.mjs'

const YELP_ACTOR = 'tri_angle~yelp-scraper'

// Each entry: [identity string as stored in business_identities[], Yelp search desc]
const IDENTITY_SEARCHES = [
  ['Identifies as Black-owned',       'Black Owned Businesses'],
  ['Identifies as women-owned',        'Women Owned Businesses'],
  ['Identifies as LGBTQ+ owned',       'LGBTQ Owned Businesses'],
  ['Identifies as Asian-owned',        'Asian Owned Businesses'],
  ['Identifies as Latino-owned',       'Latino Owned Businesses'],
  ['Identifies as veteran-owned',      'Veteran Owned Businesses'],
  ['Identifies as Indigenous-owned',   'Indigenous Owned Businesses'],
  ['Identifies as disabled-owned',     'Disabled Owned Businesses'],
]

// Map identity string → boolean column name
const IDENTITY_TO_FLAG = {
  'Identifies as Black-owned':     'is_black_owned',
  'Identifies as women-owned':      'is_women_owned',
  'Identifies as LGBTQ+ owned':     'is_lgbtq_owned',
  'Identifies as Asian-owned':      'is_asian_owned',
  'Identifies as Latino-owned':     'is_latino_owned',
  'Identifies as veteran-owned':    'is_veteran_owned',
  'Identifies as Indigenous-owned': 'is_indigenous_owned',
  'Identifies as disabled-owned':   'is_disabled_owned',
}

async function main() {
  const env = loadEnv()
  const write = process.argv.includes('--write')

  // Load all existing businesses for matching
  const existing = await sbSelect(env, 'businesses?select=place_id,name,business_identities,yelp_url')
  console.log(`Loaded ${existing.length} existing businesses for matching`)

  let totalMatched = 0, totalNew = 0

  for (const [identity, findDesc] of IDENTITY_SEARCHES) {
    console.log(`\n--- ${identity} ---`)

    const items = await runActor(env, YELP_ACTOR, {
      searchTerms: [findDesc],
      locations: ['Seattle, WA'],
      maxItems: 240,
    }, { label: findDesc })

    console.log(`  ${items.length} results from Yelp`)

    for (const item of items) {
      const name = item.businessName || item.name
      if (!name) continue

      const match = matchBusiness(existing, name)
      if (!match) {
        totalNew++
        if (process.argv.includes('--sample')) {
          console.log(`  [no match] ${name}`)
        }
        continue
      }

      totalMatched++
      const currentIdentities = match.business_identities || []
      const merged = currentIdentities.includes(identity)
        ? currentIdentities
        : [...currentIdentities, identity]

      const yelpUrl = item.businessUrl || item.url || match.yelp_url || null

      const patch = {
        business_identities: merged,
        [IDENTITY_TO_FLAG[identity]]: true,
        yelp_identity_scraped_at: new Date().toISOString(),
        ...(yelpUrl ? { yelp_url: yelpUrl } : {}),
      }

      if (process.argv.includes('--sample')) {
        console.log(`  [match] "${name}" → ${match.name}  flag=${IDENTITY_TO_FLAG[identity]}`)
      } else if (write) {
        await sbUpdateByPlaceId(env, match.place_id, patch)
        // Update local cache so subsequent identity loops see merged array
        match.business_identities = merged
      }
    }

    console.log(`  matched ${totalMatched} total so far, ${totalNew} unmatched`)
  }

  console.log(`\nDone. Matched: ${totalMatched}, Unmatched (skipped): ${totalNew}, Write: ${write}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
