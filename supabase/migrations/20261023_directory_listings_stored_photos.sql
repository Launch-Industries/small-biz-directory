-- 5S directory: prefer Launch-stored photos (Google links 403), Monica 2026-10-23
create or replace view public.directory_listings as
 SELECT businesses.id,
    'spend'::text AS section,
    businesses.name,
    businesses.slug,
    businesses.category_name,
    businesses.city,
    businesses.state,
    businesses.latitude,
    businesses.longitude,
    businesses.website,
    COALESCE(businesses.directory_photo_url, businesses.thumbnail_url) AS thumbnail_url,
    businesses.total_score,
    businesses.reviews_count,
    businesses.business_identities,
    businesses.is_women_owned,
    businesses.claimed
   FROM businesses
  WHERE businesses.permanently_closed = false
UNION ALL
 SELECT save_institutions.id,
    'save'::text AS section,
    save_institutions.name,
    save_institutions.slug,
    save_institutions.category_name,
    save_institutions.city,
    save_institutions.state,
    save_institutions.latitude,
    save_institutions.longitude,
    save_institutions.website,
    save_institutions.thumbnail_url,
    save_institutions.total_score,
    save_institutions.reviews_count,
    NULL::text[] AS business_identities,
    false AS is_women_owned,
    save_institutions.claimed
   FROM save_institutions
  WHERE save_institutions.permanently_closed = false
UNION ALL
 SELECT businesses.id,
    'share'::text AS section,
    businesses.name,
    businesses.slug,
    businesses.category_name,
    businesses.city,
    businesses.state,
    businesses.latitude,
    businesses.longitude,
    businesses.website,
    COALESCE(businesses.directory_photo_url, businesses.thumbnail_url) AS thumbnail_url,
    businesses.total_score,
    businesses.reviews_count,
    businesses.business_identities,
    businesses.is_women_owned,
    businesses.claimed
   FROM businesses
  WHERE businesses.permanently_closed = false AND ((lower(businesses.category_name) = ANY (ARRAY['thrift store'::text, 'consignment
  shop'::text, 'second hand store'::text, 'vintage clothing store'::text, 'antique
  store'::text, 'flea market'::text, 'used clothing store'::text, 'architectural
  salvage store'::text, 'furniture store'::text, 'building materials
  store'::text, 'art supply store'::text, 'home goods store'::text, 'gift
  shop'::text, 'discount store'::text, 'clothing
  store'::text, 'boutique'::text, 'store'::text, 'food bank'::text, 'donations
  center'::text, 'non-profit organization'::text, 'social services
  organization'::text, 'grocery store'::text, 'market'::text, 'recycling
  center'::text, 'antique furniture store'::text, 'used furniture
  store'::text, 'salvage dealer'::text])) OR lower(businesses.category_name) ~~ '%thrift%'::text OR lower(businesses.category_name) ~~ '%consignment%'::text OR lower(businesses.category_name) ~~ '%salvage%'::text OR lower(businesses.category_name) ~~ '%reuse%'::text OR lower(businesses.category_name) ~~ '%second hand%'::text OR lower(businesses.category_name) ~~ '%antique%'::text OR lower(businesses.category_name) ~~ '%vintage%'::text OR lower(businesses.category_name) ~~ '%flea%'::text OR lower(businesses.category_name) ~~ '%used %'::text OR lower(businesses.category_name) ~~ '%farmers%'::text)
UNION ALL
 SELECT businesses.id,
    'swap'::text AS section,
    businesses.name,
    businesses.slug,
    businesses.category_name,
    businesses.city,
    businesses.state,
    businesses.latitude,
    businesses.longitude,
    businesses.website,
    COALESCE(businesses.directory_photo_url, businesses.thumbnail_url) AS thumbnail_url,
    businesses.total_score,
    businesses.reviews_count,
    businesses.business_identities,
    businesses.is_women_owned,
    businesses.claimed
   FROM businesses
  WHERE businesses.permanently_closed = false AND (lower(businesses.category_name) ~~ '%swap%'::text OR lower(businesses.category_name) ~~ '%tool library%'::text OR lower(businesses.category_name) ~~ '%barter%'::text OR lower(businesses.category_name) ~~ '%free store%'::text OR lower(businesses.category_name) = 'recycling center'::text);
