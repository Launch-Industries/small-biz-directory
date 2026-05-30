// The 7 business-model industry buckets. The canonical classification lives in
// the DB (public.classify_industry → businesses.industry generated column,
// migration 004). This file is the UI-side ordering + display metadata only;
// the app reads business.industry directly and never re-classifies.

export const INDUSTRIES = [
  'Retail',
  'Food & Beverage',
  'B2B Services',
  'B2C / Personal Services',
  'Wholesale & Supply',
  'Nonprofit & Community',
  'Media & Creative',
] as const

export type Industry = (typeof INDUSTRIES)[number]

// Canonical display order (index = sort rank) for the Industry sort option.
export const INDUSTRY_ORDER: Record<string, number> = Object.fromEntries(
  INDUSTRIES.map((name, i) => [name, i])
)
