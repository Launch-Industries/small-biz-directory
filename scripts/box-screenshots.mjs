// Capture Box-listing screenshots from the live site using the Playwright
// install in the website project. Public pages only (no auth needed).
import { createRequire } from 'module'
const require = createRequire('/Users/monicacolgan/Developer/website-launchindustries.biz/')
const { chromium } = require('playwright')

const BASE = 'https://small-biz-directory.vercel.app'
const OUT = '/Users/monicacolgan/Desktop/box-listing-screenshots'
const SLUG = 'communion-restaurant-bar'

const shots = [
  { name: '1-directory-home', url: `${BASE}/`, wait: 'h1' },
  { name: '2-business-profile', url: `${BASE}/businesses/${SLUG}`, wait: 'h1' },
  { name: '3-claim-box-verify', url: `${BASE}/businesses/${SLUG}/claim`, wait: 'text=Verify your ownership' },
  { name: '4-get-started', url: `${BASE}/get-started`, wait: 'h1' },
]

import { mkdirSync } from 'fs'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
for (const s of shots) {
  try {
    await page.goto(s.url, { waitUntil: 'networkidle', timeout: 30000 })
    try { await page.waitForSelector(s.wait, { timeout: 8000 }) } catch {}
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: true })
    console.log(`✓ ${s.name}.png`)
  } catch (e) {
    console.log(`✗ ${s.name}: ${e.message}`)
  }
}
await browser.close()
console.log(`\nSaved to ${OUT}`)
