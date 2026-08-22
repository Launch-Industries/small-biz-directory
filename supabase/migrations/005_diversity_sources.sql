-- Diversity data source tracking: OMWBE certification, Yelp identity scrape,
-- and Intentionalist scrape timestamps. Additive only.

alter table businesses add column if not exists source text default 'google_maps';
alter table businesses add column if not exists omwbe_certified boolean default false;
alter table businesses add column if not exists omwbe_cert_types text[];
alter table businesses add column if not exists yelp_identity_scraped_at timestamptz;
alter table businesses add column if not exists intentionalist_scraped_at timestamptz;

create index if not exists idx_biz_omwbe on businesses (omwbe_certified) where omwbe_certified;
