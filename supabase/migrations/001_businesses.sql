create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  place_id text unique not null,
  slug text unique not null,
  name text not null,
  category_name text,
  categories text[],
  address text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  latitude float8,
  longitude float8,
  website text,
  thumbnail_url text,
  image_urls text[],
  total_score float4,
  reviews_count int,
  business_identities text[],
  is_women_owned boolean default false,
  permanently_closed boolean default false,
  claimed boolean default false,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  owner_description text,
  owner_hours text,
  created_at timestamptz default now()
);

alter table businesses enable row level security;

create policy "public read businesses"
  on businesses for select
  using (permanently_closed = false);

create policy "owner update own business"
  on businesses for update
  using (auth.uid() = claimed_by)
  with check (auth.uid() = claimed_by);
