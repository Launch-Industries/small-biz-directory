ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS location_type text,
  ADD COLUMN IF NOT EXISTS owner_image_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS owner_doc_box_file_ids text[] DEFAULT '{}';

ALTER TABLE business_verifications
  ADD COLUMN IF NOT EXISTS claimed_identities text[];
