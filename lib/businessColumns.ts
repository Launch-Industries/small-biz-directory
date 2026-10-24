/**
 * Every businesses column the public may read. The database grants the public
 * and signed-in roles SELECT on these columns only (Launch directory lockdown,
 * 2026-10-24), so select('*') on businesses fails: name the columns instead.
 * Not here, on purpose: directory_facts (research notes and contacts collected
 * from websites), identity_evidence (who attested an ownership identity),
 * owner_doc_box_file_ids and contact_name.
 */
export const BUSINESS_COLUMNS = [
  'id', 'place_id', 'slug', 'name', 'category_name', 'categories', 'address', 'neighborhood', 'city', 'state',
  'postal_code', 'latitude', 'longitude', 'website', 'thumbnail_url', 'image_urls', 'total_score', 'reviews_count',
  'business_identities', 'is_women_owned', 'permanently_closed', 'claimed', 'claimed_by', 'claimed_at',
  'owner_description', 'owner_hours', 'created_at', 'phone', 'email', 'yelp_url', 'yelp_rating', 'facebook_url',
  'instagram_url', 'twitter_url', 'tiktok_url', 'linkedin_url', 'youtube_url', 'contacts_scraped_at',
  'places_scraped_at', 'yelp_scraped_at', 'is_black_owned', 'is_lgbtq_owned', 'is_lgbtq_friendly', 'is_asian_owned',
  'is_latino_owned', 'is_veteran_owned', 'is_disabled_owned', 'is_indigenous_owned', 'is_transgender_safespace',
  'industry', 'verified_identities', 'location_type', 'owner_image_urls', 'source', 'omwbe_certified',
  'omwbe_cert_types', 'yelp_identity_scraped_at', 'intentionalist_scraped_at', 'phone_e164', 'directory_photo_url',
  'owner_verified_at', 'directory_description', 'directory_description_source', 'directory_description_url',
  'directory_category', 'directory_industry', 'directory_logo_url', 'directory_enriched_at',
].join(',') as '*' // typed as '*' so query results keep the Business row type
