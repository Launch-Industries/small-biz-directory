# directory.5Sethos.com - Apify Data Pipeline

## Project
- Repo: https://github.com/Launch-Industries/small-biz-directory
- Local: /Users/monicacolgan/Developer/small-biz-directory
- Stack: Next.js, Supabase, Vercel, Apify
- Site: directory.5sethos.com

## What was done (2026-05-30)
1. Cloned repo, set up .env.local with Supabase + Apify credentials
2. Created `/api/cron/discover` Vercel cron route (runs every Monday 6am UTC)
3. Imported all 670 businesses from Apify datasets into `businesses` table (Share/Spend sections)
4. Imported 180 financial institutions into `save_institutions` table (Save section)
5. Cron searches ALL categories: thrift/reuse (Share), financial (Save), and identity-owned businesses (Spend)
6. Fixed `directory_listings` view to include `thumbnail_url` and `claimed` columns
7. Removed 1000-row limit on Spend section query

## Database structure
- `businesses` table → Spend + Share sections (via `directory_listings` UNION view)
- `save_institutions` table → Save section (type: credit_union, financial_advisor, cdfi)
- `directory_listings` view → UNION of both tables with section classification based on category_name
- Share categories matched by: thrift, consignment, antique, vintage, flea, salvage, reuse, furniture, etc.
- Swap: recycling center, tool library, barter, swap

## Current counts
- Spend: 789 | Save: 197 | Share: 307 | Swap: 4 | Total: ~1,297

## Next steps / TODO
- Identity-owned business searches (Black-owned, women-owned, LGBTQ+, etc.) have NOT been run yet — they're in the cron for next Monday but could be triggered manually
- Reddit scraping for mutual aid orgs (Support section) — needs a paid Reddit scraper actor rental on Apify (trudax/reddit-scraper-lite ~$3.40/1k results), OR could try Google Maps search for "mutual aid" orgs
- Could also expand Google Maps searches to other states beyond Washington

## Env vars needed on Vercel
- CRON_SECRET, APIFY_TOKEN, SUPABASE_SERVICE_ROLE_KEY (already added by user)
