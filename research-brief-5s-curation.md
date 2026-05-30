# Research + curation task: populate the 5S directory's curated categories

You're helping build a **cold, public small-business directory** in Supabase project `egnrizeybeihfavzwxfe`. This is reference/prospecting data about orgs we do NOT have a relationship with.

## Hard guardrails
- Do **NOT** write to or modify these tables: `companies` (warm CRM), `businesses` (Spend), `share_listings` (Share). They're done.
- Your output goes into three tables only: `save_institutions`, `barter_timebanks`, `wealth_nonprofits` (already created).
- **Geography: Washington State**, with a Greater-Seattle emphasis where the category is local.
- Don't trust marketing blurbs — verify every org against an authoritative source and capture the source.
- **Deliverable:** for each task, produce idempotent upsert SQL — `INSERT ... ON CONFLICT (slug) DO UPDATE SET ...` in batches of ~100 — and hand it back to Monica to review and run. If you have Supabase service-role access, you may run it yourself, but show a 5-row sample first. Generate `slug` as lowercased name, non-alphanumerics → hyphens.

## Task 1 — Save: CDFIs → `save_institutions` (type = 'cdfi')
Credit unions are already being scraped from Google Maps; you handle **CDFIs** (loan funds, CDFI banks, CDFI venture funds — mostly no storefront).
- **Source:** US Treasury CDFI Fund "List of Certified CDFIs" (downloadable CSV/XLSX at cdfifund.gov), filtered to State = WA. Cross-check with ProPublica Nonprofit Explorer / org websites.
- **Columns to fill:** `slug`, `name`, `type='cdfi'`, `city`, `state`, `address`, `postal_code`, `latitude`, `longitude` (geocode if easy, else null), `website`, `phone`, `cdfi_certification_id`, `low_income_designated` (bool), `services` (text[], e.g. {small business loans, mortgages, consumer loans}), `source='cdfi_fund'`. `place_id` = null (no Maps record).
- Dedupe key: `slug`.

## Task 2 — Barter & Timebanks → `barter_timebanks`
A **curated handful**, not a big list. Find every active one serving WA / Greater Seattle.
- **Barter (type='barter_exchange'):** start with BizX (Seattle-based), then check NATE (National Association of Trade Exchanges) and ITEX/IMS member listings for WA-serving exchanges; the marketing copy also names "Evergreen Exchange Network" — verify it's real and active before listing.
- **Timebanks (type='timebank'):** TimeBanks.org and hOurworld.org "find a timebank" directories, filtered to WA (e.g. West Seattle Timebank — verify it's still operating).
- **Columns:** `slug`, `name`, `type`, `description` (1–2 sentences, factual), `website`, `phone`, `email`, `city`, `state`, `address`, `service_area` (e.g. "West Seattle", "Greater Seattle", "Statewide", "Online"), `is_online` (bool), `network_affiliation` (e.g. "BizX", "hOurworld", "TimeBanks.org"), `membership_info`, `source` (the directory/URL you confirmed it from).
- Flag any that appear defunct rather than listing them.

## Task 3 — Build: wealth-building nonprofits → `wealth_nonprofits`
WA nonprofits whose mission is **building wealth in underserved communities** — financial education/coaching, microloans, IDA/matched-savings, homeownership & down-payment assistance, small-business technical assistance, worker-co-op development, community land trusts.
- **Source:** Candid/GuideStar + ProPublica Nonprofit Explorer (for EIN + NTEE + financials) + org websites. Confirm each is an active 501(c)(3) in WA.
- **Columns:** `slug`, `name`, `ein`, `mission` (their stated mission), `description`, `ntee_code`, `focus_areas` (text[], from the list above), `website`, `phone`, `email`, `city`, `state`, `address`, `service_area`, `candid_profile_url`, `source`. `place_id` = null.
- Dedupe key: `slug` (also capture `ein` so duplicates can be caught).
- Seed names to verify & expand from (don't assume — confirm each): Ventures, Business Impact NW, Washington Access Fund, Express Credit Union, Africatown / community land trusts, Homestead CLT. Add others you find.

## Task 4 (small) — verify Share heavy-hitter claims
Before publishing these on the public Share page, verify the factual claims in this blurb and give corrected one-liners: "Magpie Thrift (Capitol Hill) — supports local resource redistribution and queer senior moveout services." Confirm the business exists, the neighborhood, and whether that services claim is accurate. Same quick check for: Labels Consignment (Phinney Ridge), Lifelong Thrift Store, Two Big Blondes Plus Size Consignment, Mimi's Zero Waste Market, Out Of The Box Eco Store, Second Use (reclaimed building materials), NE Seattle Tool Library.

When each task is done, hand back the upsert SQL (or CSV) + a short note on sources and anything you couldn't verify.

---

## Reference: exact table schemas

### save_institutions
`id` uuid pk · `place_id` text uniq · `slug` text uniq NOT NULL · `name` text NOT NULL · `type` text NOT NULL CHECK in ('credit_union','cdfi') · `category_name` · `categories` text[] · `address` · `neighborhood` · `city` · `state` · `postal_code` · `latitude` float8 · `longitude` float8 · `website` · `phone` · `thumbnail_url` · `image_urls` text[] · `total_score` real · `reviews_count` int · `charter_number` · `cdfi_certification_id` · `asset_size_usd` numeric · `field_of_membership` · `services` text[] · `low_income_designated` bool · `permanently_closed` bool=false · `claimed`/`claimed_by`/`claimed_at` · `source` · `created_at`

### barter_timebanks
`id` uuid pk · `place_id` text uniq · `slug` text uniq NOT NULL · `name` text NOT NULL · `type` text NOT NULL CHECK in ('barter_exchange','timebank') · `description` · `website` · `phone` · `email` · `address` · `city` · `state` · `postal_code` · `latitude` float8 · `longitude` float8 · `service_area` · `is_online` bool=false · `network_affiliation` · `membership_info` · `permanently_closed` bool=false · `claimed`/`claimed_by`/`claimed_at` · `source` · `created_at`

### wealth_nonprofits
`id` uuid pk · `place_id` text uniq · `slug` text uniq NOT NULL · `name` text NOT NULL · `ein` · `description` · `mission` · `ntee_code` · `focus_areas` text[] · `website` · `phone` · `email` · `address` · `city` · `state` · `postal_code` · `latitude` float8 · `longitude` float8 · `service_area` · `candid_profile_url` · `permanently_closed` bool=false · `claimed`/`claimed_by`/`claimed_at` · `source` · `created_at`
