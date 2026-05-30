// Shared helpers for enrichment scripts. Loads env from .env.local, talks to
// Supabase REST with the service-role key, and runs Apify Actors.
import { readFileSync } from 'fs'

// --- env ---------------------------------------------------------------
export function loadEnv() {
  let txt = ''
  try { txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8') } catch {}
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const APIFY_TOKEN = process.env.APIFY_TOKEN
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing Supabase env (URL or SERVICE_ROLE_KEY)')
  if (!APIFY_TOKEN) throw new Error('Missing APIFY_TOKEN')
  return { SUPABASE_URL, SERVICE_KEY, APIFY_TOKEN }
}

// --- supabase REST -----------------------------------------------------
export async function sbSelect(env, query) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: env.SERVICE_KEY, Authorization: `Bearer ${env.SERVICE_KEY}` },
  })
  if (!res.ok) throw new Error(`select failed: ${res.status} ${await res.text()}`)
  return res.json()
}

// Update a single row by place_id. `patch` is a partial column object.
export async function sbUpdateByPlaceId(env, placeId, patch) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/businesses?place_id=eq.${encodeURIComponent(placeId)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: env.SERVICE_KEY,
        Authorization: `Bearer ${env.SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    },
  )
  if (!res.ok) throw new Error(`update ${placeId} failed: ${res.status} ${await res.text()}`)
}

// --- apify -------------------------------------------------------------
// Start an Actor run, poll until terminal, return dataset items.
export async function runActor(env, actorId, input, { pollMs = 5000, label = actorId } = {}) {
  const start = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${env.APIFY_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
  )
  if (!start.ok) throw new Error(`actor start failed: ${start.status} ${await start.text()}`)
  const run = (await start.json()).data
  console.log(`[${label}] run ${run.id} started…`)

  let status = run.status
  let datasetId = run.defaultDatasetId
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    await new Promise((r) => setTimeout(r, pollMs))
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${env.APIFY_TOKEN}`)
    const d = (await poll.json()).data
    status = d.status
    datasetId = d.defaultDatasetId
    process.stdout.write(`[${label}] ${status}\r`)
  }
  console.log(`\n[${label}] finished: ${status}`)
  if (status !== 'SUCCEEDED') throw new Error(`actor ${label} ended ${status}`)

  const items = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${env.APIFY_TOKEN}&clean=true`,
  )
  return items.json()
}

// Normalize a URL to a bare hostname for matching (strip proto, www, path).
export function domainOf(url) {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

// Website footers (Shopify/Wix/Squarespace etc.) and platform-reserved paths
// leak into scraped social links. These handles are never a real business.
export const JUNK_HANDLES = new Set([
  'shopify', 'tv', 'wixstudio', 'wix', 'squarespace', 'godaddy', 'explore',
  'reel', 'reels', 'p', 'accounts', 'about', 'linktr.ee', 'linktree',
  'instagram', 'facebook', 'meta', 'weebly', 'square', 'clover', 'toasttab',
  'doordash', 'ubereats', 'grubhub', 'yelp', 'google', 'mailchimp', 'sharer', 'profile.php',
])
export const isJunkHandle = (h) => !h || JUNK_HANDLES.has(h.toLowerCase())

// Return the social URL only if its handle isn't junk, else null.
export function cleanSocial(url, re) {
  if (!url) return null
  const m = url.match(re)
  const handle = m ? m[1].split('/')[0] : null
  return isJunkHandle(handle) ? null : url
}

export const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : fallback
}
