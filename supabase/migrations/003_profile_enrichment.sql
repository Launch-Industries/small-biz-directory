-- Profile enrichment: contact info, social profiles, and structured ownership
-- flags. Additive only — no existing columns touched.
--
-- Google Maps listing URL is intentionally NOT stored: it is derivable from
-- place_id (see lib/links.ts googleMapsUrl) and storing it would only go stale.

-- Contact details (sourced from Apify Contact Details Scraper + Google Maps re-scrape)
alter table businesses add column if not exists phone text;
alter table businesses add column if not exists email text;
alter table businesses add column if not exists yelp_url text;
alter table businesses add column if not exists yelp_rating real;

-- Social profiles
alter table businesses add column if not exists facebook_url text;
alter table businesses add column if not exists instagram_url text;
alter table businesses add column if not exists twitter_url text;
alter table businesses add column if not exists tiktok_url text;
alter table businesses add column if not exists linkedin_url text;
alter table businesses add column if not exists youtube_url text;

-- When each enrichment source last ran (so re-runs are idempotent + auditable)
alter table businesses add column if not exists contacts_scraped_at timestamptz;
alter table businesses add column if not exists places_scraped_at timestamptz;
alter table businesses add column if not exists yelp_scraped_at timestamptz;

-- Structured ownership / identity flags (is_women_owned already exists).
-- These power the browse-by-ownership filter pages and are backfilled below
-- from the self-reported business_identities array scraped from Google Maps.
alter table businesses add column if not exists is_black_owned boolean default false;
alter table businesses add column if not exists is_lgbtq_owned boolean default false;
alter table businesses add column if not exists is_lgbtq_friendly boolean default false;
alter table businesses add column if not exists is_asian_owned boolean default false;
alter table businesses add column if not exists is_latino_owned boolean default false;
alter table businesses add column if not exists is_veteran_owned boolean default false;
alter table businesses add column if not exists is_disabled_owned boolean default false;
alter table businesses add column if not exists is_indigenous_owned boolean default false;

-- Backfill structured flags from self-reported Google identities.
update businesses set
  is_women_owned      = is_women_owned      or 'Identifies as women-owned'     = any(business_identities),
  is_black_owned      = 'Identifies as Black-owned'      = any(business_identities),
  is_lgbtq_owned      = 'Identifies as LGBTQ+ owned'     = any(business_identities),
  is_lgbtq_friendly   = 'LGBTQ+ friendly'                = any(business_identities),
  is_asian_owned      = 'Identifies as Asian-owned'      = any(business_identities),
  is_latino_owned     = 'Identifies as Latino-owned'     = any(business_identities),
  is_veteran_owned    = 'Identifies as veteran-owned'    = any(business_identities),
  is_disabled_owned   = 'Identifies as disabled-owned'   = any(business_identities),
  is_indigenous_owned = 'Identifies as Indigenous-owned' = any(business_identities)
where business_identities is not null;

-- Indexes for the browse-by-ownership filter pages
create index if not exists idx_biz_black_owned on businesses (is_black_owned) where is_black_owned;
create index if not exists idx_biz_lgbtq_owned on businesses (is_lgbtq_owned) where is_lgbtq_owned;
create index if not exists idx_biz_women_owned on businesses (is_women_owned) where is_women_owned;
create index if not exists idx_biz_asian_owned on businesses (is_asian_owned) where is_asian_owned;
create index if not exists idx_biz_latino_owned on businesses (is_latino_owned) where is_latino_owned;
