export interface Business {
  id: string; place_id: string; slug: string; name: string;
  category_name: string | null; categories: string[];
  address: string | null; neighborhood: string | null;
  city: string | null; state: string | null; postal_code: string | null;
  latitude: number | null; longitude: number | null;
  website: string | null; thumbnail_url: string | null; image_urls: string[];
  total_score: number | null; reviews_count: number | null;
  business_identities: string[]; is_women_owned: boolean;
  permanently_closed: boolean; claimed: boolean; claimed_by: string | null;
  owner_description: string | null; owner_hours: string | null;
}
