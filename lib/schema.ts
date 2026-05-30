import type { Business } from '@/types/business'

export const SITE_URL = 'https://small-biz-directory.vercel.app'

/** Greater Seattle bounding box — only emit geo coordinates that fall inside it. */
function withinGreaterSeattle(lat: number, lng: number): boolean {
  return lat >= 47.0 && lat <= 48.1 && lng >= -122.7 && lng <= -121.5
}

export function businessUrl(slug: string): string {
  return `${SITE_URL}/businesses/${slug}`
}

/** schema.org LocalBusiness for a single business detail page. */
export function localBusinessSchema(business: Business): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    url: businessUrl(business.slug),
  }

  if (business.thumbnail_url) {
    schema.image = business.thumbnail_url
  }

  // PostalAddress — include any parts that are present.
  const address: Record<string, unknown> = { '@type': 'PostalAddress', addressCountry: 'US' }
  if (business.address) address.streetAddress = business.address
  if (business.city) address.addressLocality = business.city
  if (business.state) address.addressRegion = business.state
  if (business.postal_code) address.postalCode = business.postal_code
  schema.address = address

  // GeoCoordinates — only when both present and inside Greater Seattle.
  if (
    business.latitude != null &&
    business.longitude != null &&
    withinGreaterSeattle(business.latitude, business.longitude)
  ) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.latitude,
      longitude: business.longitude,
    }
  }

  if (business.phone) {
    schema.telephone = business.phone
  }

  if (business.website) {
    schema.sameAs = [business.website]
  }

  if (business.total_score != null && business.reviews_count != null) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: business.total_score,
      reviewCount: business.reviews_count,
    }
  }

  return schema
}

export interface ItemListOptions {
  name?: string
}

/** schema.org ItemList of business detail links, for browse/facet pages. */
export function itemListSchema(
  businesses: Business[],
  opts: ItemListOptions = {}
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: businesses.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: businessUrl(b.slug),
      name: b.name,
    })),
  }
  if (opts.name) schema.name = opts.name
  return schema
}

export interface BreadcrumbItem {
  name: string
  url: string
}

/** schema.org BreadcrumbList. */
export function breadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
