// Derived external links + social presence helpers for a business.
import type { Business } from '@/types/business'

// Google Maps listing URL is derived from place_id — no need to store it.
export function googleMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`
}

// Directions deep-link (uses lat/lng when available, else the place_id).
export function directionsUrl(b: Pick<Business, 'place_id' | 'latitude' | 'longitude'>): string {
  if (b.latitude != null && b.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}&destination_place_id=${b.place_id}`
  }
  return googleMapsUrl(b.place_id)
}

export type SocialKey =
  | 'facebook_url' | 'instagram_url' | 'twitter_url'
  | 'tiktok_url' | 'linkedin_url' | 'youtube_url'

export const SOCIALS: { key: SocialKey; label: string }[] = [
  { key: 'instagram_url', label: 'Instagram' },
  { key: 'facebook_url', label: 'Facebook' },
  { key: 'twitter_url', label: 'X' },
  { key: 'tiktok_url', label: 'TikTok' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'linkedin_url', label: 'LinkedIn' },
]

export function socialLinks(b: Business) {
  return SOCIALS.map((s) => ({ ...s, url: b[s.key] })).filter(
    (s): s is { key: SocialKey; label: string; url: string } => Boolean(s.url),
  )
}
