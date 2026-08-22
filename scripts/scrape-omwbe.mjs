// Scrape the WA State OMWBE certified business directory at
// omwbe.diversitycompliance.com. Free — pure fetch, no Apify needed.
//
// Fetches the search form to discover hidden session fields, then POSTs
// for each certification type. Matches against existing businesses and:
//   - Sets omwbe_certified=true, omwbe_cert_types[]
//   - Sets appropriate is_* boolean flags
//   - Upserts new businesses with source='omwbe'
//
// Usage:
//   node scripts/scrape-omwbe.mjs --sample   # dry run
//   node scripts/scrape-omwbe.mjs --write     # write to Supabase

import { loadEnv, sbSelect, sbUpdateByPlaceId, sbUpsertBusiness, normalizeName, matchBusiness } from './lib.mjs'

const OMWBE_BASE = 'https://omwbe.diversitycompliance.com'
const SEARCH_URL = `${OMWBE_BASE}/FrontEnd/SearchCertifiedDirectory.asp`

// Cert type numeric IDs from OMWBE form (field name: Certifications)
const CERT_TYPES = [
  { code: 'MBE',     id: '1',   label: 'Minority Business Enterprise',      flags: [] },
  { code: 'WBE',     id: '2',   label: 'Women Business Enterprise',          flags: ['is_women_owned'] },
  { code: 'MWBE',    id: '13',  label: 'Minority/Women Business Enterprise', flags: ['is_women_owned'] },
  { code: 'DBE',     id: '7',   label: 'Disadvantaged Business Enterprise',  flags: [] },
  { code: 'LGBTQBE', id: '152', label: 'LGBTQ Business Enterprise',          flags: ['is_lgbtq_owned'] },
  { code: 'SBE',     id: '3',   label: 'Small Business Enterprise',          flags: [] },
]

// MBE ethnicity subtype → identity flag (OMWBE lists ethnicity in result rows)
const MBE_ETHNICITY_FLAGS = {
  'african american': 'is_black_owned',
  'black':            'is_black_owned',
  'asian':            'is_asian_owned',
  'asian american':   'is_asian_owned',
  'hispanic':         'is_latino_owned',
  'latino':           'is_latino_owned',
  'native american':  'is_indigenous_owned',
  'indigenous':       'is_indigenous_owned',
  'american indian':  'is_indigenous_owned',
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Extract hidden form fields (ViewState, EventValidation, etc.) from HTML
function extractHiddenFields(html) {
  const fields = {}
  const re = /<input[^>]+type=["']?hidden["']?[^>]*>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const nameM = m[0].match(/name=["']([^"']+)["']/i)
    const valueM = m[0].match(/value=["']([^"']*)["']/i)
    if (nameM) fields[nameM[1]] = valueM ? valueM[1] : ''
  }
  return fields
}

// Parse business rows from OMWBE result table HTML
function parseResults(html) {
  const businesses = []
  // Results appear in <tr> rows within the results table
  const rowRe = /<tr[^>]*class=["'][^"']*(?:row|result|cert)[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi
  // Simpler: grab all <td> text content in sequence and group by expected column count
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
  const cells = []
  let td
  while ((td = tdRe.exec(html)) !== null) {
    const text = td[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) cells.push(text)
  }

  // OMWBE table columns (approximate): Firm Name | Cert Type | Ethnicity | Address | City | State | Zip
  // Group into rows of 7; skip header row
  const COL = 7
  for (let i = COL; i + COL <= cells.length; i += COL) {
    const [name, certType, ethnicity, address, city, state, zip] = cells.slice(i, i + COL)
    if (!name || name.toLowerCase().includes('firm name')) continue
    businesses.push({ name, certType, ethnicity, address, city, state, zip })
  }
  return businesses
}

async function fetchWithCookies(url, options = {}, cookieJar = {}) {
  const cookieStr = Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ')
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; directory-enrichment/1.0)',
    ...(cookieStr ? { Cookie: cookieStr } : {}),
    ...options.headers,
  }
  const res = await fetch(url, { ...options, headers })
  // Capture Set-Cookie headers
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    for (const part of setCookie.split(',')) {
      const m = part.trim().match(/^([^=]+)=([^;]*)/)
      if (m) cookieJar[m[1].trim()] = m[2].trim()
    }
  }
  return res
}

async function main() {
  const env = loadEnv()
  const write = process.argv.includes('--write')
  const sample = process.argv.includes('--sample')

  const existing = await sbSelect(env, 'businesses?select=place_id,name,business_identities,omwbe_cert_types')
  console.log(`Loaded ${existing.length} existing businesses`)

  const cookieJar = {}

  // Fetch the search form page to get session/hidden fields
  console.log('Fetching OMWBE search form…')
  const formRes = await fetchWithCookies(SEARCH_URL, {}, cookieJar)
  if (!formRes.ok) throw new Error(`OMWBE form fetch failed: ${formRes.status}`)
  const formHtml = await formRes.text()
  const hiddenFields = extractHiddenFields(formHtml)
  console.log(`  Hidden fields found: ${Object.keys(hiddenFields).join(', ')}`)

  // Collect all results keyed by normalized name+address
  const allBizMap = new Map() // key → { name, address, city, certTypes: Set, ethnicityFlags: Set }

  for (const cert of CERT_TYPES) {
    console.log(`\nQuerying cert type: ${cert.code} (${cert.label})`)

    const body = new URLSearchParams({
      ...hiddenFields,
      Certifications: cert.id,
    })

    const res = await fetchWithCookies(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }, cookieJar)

    if (!res.ok) { console.warn(`  HTTP ${res.status} — skipping`); continue }

    const html = await res.text()

    // Handle pagination — check for "Next" link
    let page = 1
    let currentHtml = html
    while (true) {
      const rows = parseResults(currentHtml)
      console.log(`  page ${page}: ${rows.length} rows`)

      for (const row of rows) {
        const key = normalizeName(row.name) + '|' + normalizeName(row.address || '')
        if (!allBizMap.has(key)) {
          allBizMap.set(key, {
            name: row.name,
            address: row.address,
            city: row.city,
            state: row.state,
            certTypes: new Set(),
            identityFlags: new Set([...cert.flags]),
          })
        }
        const entry = allBizMap.get(key)
        entry.certTypes.add(cert.code)
        for (const f of cert.flags) entry.identityFlags.add(f)

        // For MBE, try to map ethnicity to a specific flag
        if (cert.code === 'MBE' && row.ethnicity) {
          const ethKey = row.ethnicity.toLowerCase()
          for (const [pattern, flag] of Object.entries(MBE_ETHNICITY_FLAGS)) {
            if (ethKey.includes(pattern)) { entry.identityFlags.add(flag); break }
          }
        }
      }

      // Check for a "Next Page" link
      const hasNext = /Next\s*(?:Page|&gt;|>)/i.test(currentHtml)
      if (!hasNext || rows.length === 0) break

      page++
      const nextBody = new URLSearchParams({ ...hiddenFields, Page: page, Submit: 'Next' })
      const nextRes = await fetchWithCookies(SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: nextBody.toString(),
      }, cookieJar)
      if (!nextRes.ok) break
      currentHtml = await nextRes.text()
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  console.log(`\nTotal unique OMWBE certified businesses: ${allBizMap.size}`)

  let matched = 0, inserted = 0
  for (const [, biz] of allBizMap) {
    const certTypesArr = [...biz.certTypes]
    const flagObj = {}
    for (const f of biz.identityFlags) flagObj[f] = true

    const match = matchBusiness(existing, biz.name)
    if (match) {
      matched++
      const currentCerts = match.omwbe_cert_types || []
      const mergedCerts = [...new Set([...currentCerts, ...certTypesArr])]
      const currentIdentities = match.business_identities || []
      const mergedIdentities = [...new Set([...currentIdentities,
        ...[...biz.identityFlags].map((f) => {
          const inv = { is_women_owned: 'Identifies as women-owned', is_lgbtq_owned: 'Identifies as LGBTQ+ owned',
            is_black_owned: 'Identifies as Black-owned', is_asian_owned: 'Identifies as Asian-owned',
            is_latino_owned: 'Identifies as Latino-owned', is_indigenous_owned: 'Identifies as Indigenous-owned',
            is_disabled_owned: 'Identifies as disabled-owned', is_veteran_owned: 'Identifies as veteran-owned' }
          return inv[f]
        }).filter(Boolean)
      ])]

      const patch = {
        omwbe_certified: true,
        omwbe_cert_types: mergedCerts,
        business_identities: mergedIdentities,
        ...flagObj,
      }
      if (sample) {
        console.log(`[match] "${biz.name}" → ${match.name}  certs: ${certTypesArr.join(', ')}`)
      } else if (write) {
        await sbUpdateByPlaceId(env, match.place_id, patch)
      }
    } else {
      inserted++
      const nameSlug = slugify(biz.name)
      const addrSlug = slugify(biz.address || '')
      const row = {
        place_id: `omwbe:${nameSlug}${addrSlug ? '-' + addrSlug : ''}`,
        slug: nameSlug,
        name: biz.name,
        address: biz.address || null,
        city: biz.city || 'Seattle',
        state: biz.state || 'WA',
        source: 'omwbe',
        omwbe_certified: true,
        omwbe_cert_types: certTypesArr,
        business_identities: [...biz.identityFlags].map((f) => {
          const inv = { is_women_owned: 'Identifies as women-owned', is_lgbtq_owned: 'Identifies as LGBTQ+ owned',
            is_black_owned: 'Identifies as Black-owned', is_asian_owned: 'Identifies as Asian-owned',
            is_latino_owned: 'Identifies as Latino-owned', is_indigenous_owned: 'Identifies as Indigenous-owned' }
          return inv[f]
        }).filter(Boolean),
        ...flagObj,
      }
      if (sample) {
        console.log(`[new] "${biz.name}" certs: ${certTypesArr.join(', ')}  city: ${biz.city}`)
      } else if (write) {
        await sbUpsertBusiness(env, row)
      }
    }
  }

  console.log(`\nDone. Matched: ${matched}, New inserts: ${inserted}, Write: ${write}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
