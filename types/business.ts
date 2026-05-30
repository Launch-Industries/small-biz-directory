export interface Business {
  id: string; place_id: string; slug: string; name: string;
  category_name: string | null; categories: string[]; industry: string | null;
  address: string | null; neighborhood: string | null;
  city: string | null; state: string | null; postal_code: string | null;
  latitude: number | null; longitude: number | null;
  website: string | null; thumbnail_url: string | null; image_urls: string[];
  total_score: number | null; reviews_count: number | null;
  business_identities: string[];
  // contact + social (enrichment)
  phone: string | null; email: string | null;
  yelp_url: string | null; yelp_rating: number | null;
  facebook_url: string | null; instagram_url: string | null; twitter_url: string | null;
  tiktok_url: string | null; linkedin_url: string | null; youtube_url: string | null;
  // structured ownership flags
  is_women_owned: boolean; is_black_owned: boolean; is_lgbtq_owned: boolean;
  is_lgbtq_friendly: boolean; is_asian_owned: boolean; is_latino_owned: boolean;
  is_veteran_owned: boolean; is_disabled_owned: boolean; is_indigenous_owned: boolean;
  is_transgender_safespace: boolean;
  verified_identities: string[];
  permanently_closed: boolean; claimed: boolean; claimed_by: string | null;
  owner_description: string | null; owner_hours: string | null;
}
