-- Industry classification: map the ~105 granular Google category_name values
-- into 7 business-model buckets. Implemented as an IMMUTABLE function so it can
-- back a GENERATED STORED column — every future import self-classifies with no
-- app/script wiring. Ordered keyword rules, first match wins.
--
-- Buckets: Retail | B2B Services | B2C / Personal Services | Food & Beverage |
--          Wholesale & Supply | Nonprofit & Community | Media & Creative
--
-- Ordering rationale:
--   Wholesale before Food/Retail  -> "Wholesale bakery", "Food manufacturer/supplier"
--   B2C personal before B2B       -> "Health consultant" != business consultant
--   B2B before Media              -> "Website designer" != graphic designer
--   B2B before Retail             -> "Retail space rental agency" != a store
--   '\yspa\y' is a word boundary  -> avoid matching "space" (Coworking space,
--                                    Retail space rental agency)

create or replace function public.classify_industry(cat text)
returns text
language sql
immutable
as $$
  select case
    when cat is null then 'Retail'
    when lower(cat) like '%supplier%'
      or lower(cat) like '%wholesale%'
      or lower(cat) like '%distributor%'
      or lower(cat) like '%manufacturer%'
      or lower(cat) like '%import export%'
      or lower(cat) like '%freight%'                 then 'Wholesale & Supply'
    when lower(cat) like '%non-profit%'
      or lower(cat) like '%nonprofit%'
      or lower(cat) like '%social services%'
      or lower(cat) like '%organization%'
      or lower(cat) like '%association%'
      or lower(cat) like '%chamber of commerce%'
      or lower(cat) like '%community center%'
      or lower(cat) like '%foundation%'              then 'Nonprofit & Community'
    when lower(cat) like '%restaurant%'
      or lower(cat) like '%caterer%'
      or lower(cat) like '%bakery%'
      or lower(cat) like '%coffee%'
      or lower(cat) like '%cafe%'
      or lower(cat) like '%brunch%'
      or lower(cat) like '%brewery%'
      or lower(cat) like '%grill%'
      or lower(cat) like '%deli%'
      or lower(cat) like '%pizz%'
      or lower(cat) like '%bar'
      or lower(cat) like '% bar %'                    then 'Food & Beverage'
    when lower(cat) like '%salon%'
      or lower(cat) like '%barber%'
      or lower(cat) like '%hair%'
      or lower(cat) like '%nail%'
      or lower(cat) ~ '\yspa\y'
      or lower(cat) like '%piercing%'
      or lower(cat) like '%tattoo%'
      or lower(cat) like '%massage%'
      or lower(cat) like '%cleaning%'
      or lower(cat) like '%tailor%'
      or lower(cat) like '%notary%'
      or lower(cat) like '%concierge%'
      or lower(cat) like '%counselor%'
      or lower(cat) like '%therapist%'
      or lower(cat) like '%health consultant%'
      or lower(cat) like '%wellness%'
      or lower(cat) like '%medical%'                  then 'B2C / Personal Services'
    when lower(cat) like '%website%'
      or lower(cat) like '%web design%'
      or lower(cat) like '%software%'
      or lower(cat) like '%it services%'
      or lower(cat) like '%computer support%'
      or lower(cat) like '%computer services%'
      or lower(cat) like '%support and services%'
      or lower(cat) like '%marketing%'
      or lower(cat) like '%advertising%'
      or lower(cat) like '%agency%'
      or lower(cat) like '%consultant%'
      or lower(cat) like '%consulting%'
      or lower(cat) like '%accountant%'
      or lower(cat) like '%accounting%'
      or lower(cat) like '%bookkeeping%'
      or lower(cat) like '%attorney%'
      or lower(cat) like '%legal%'
      or lower(cat) like '%law firm%'
      or lower(cat) like '%business to business%'
      or lower(cat) like '%business development%'
      or lower(cat) like '%business management%'
      or lower(cat) like '%business networking%'
      or lower(cat) like '%coworking%'
      or lower(cat) like '%employment%'
      or lower(cat) like '%staffing%'
      or lower(cat) like '%corporate office%'
      or lower(cat) like '%office%'
      or lower(cat) like '%contractor%'
      or lower(cat) like '%rental agency%'
      or lower(cat) like '%real estate%'
      or lower(cat) like '%printing%'                 then 'B2B Services'
    when lower(cat) like '%media%'
      or lower(cat) like '%recording%'
      or lower(cat) like '%studio%'
      or lower(cat) like '%photograph%'
      or lower(cat) like '%graphic%'
      or lower(cat) like '%designer%'
      or lower(cat) like '%theater%'
      or lower(cat) like '%theatre%'
      or lower(cat) like '%museum%'
      or lower(cat) like '%gallery%'
      or lower(cat) like '%art center%'
      or lower(cat) like '%dance%'
      or lower(cat) like '%film%'
      or lower(cat) like '%production%'               then 'Media & Creative'
    else 'Retail'
  end
$$;

alter table public.businesses
  add column if not exists industry text
  generated always as (public.classify_industry(category_name)) stored;

create index if not exists idx_biz_industry on public.businesses (industry);
