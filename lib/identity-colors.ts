export const IDENTITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'LGBTQ+ friendly':               { bg: 'bg-li-teal-100',   text: 'text-li-teal-700',   label: 'LGBTQ+ Friendly' },
  'Identifies as Black-owned':     { bg: 'bg-li-yellow-100', text: 'text-li-yellow-700', label: 'Black-Owned' },
  'Identifies as women-owned':     { bg: 'bg-li-green-100',  text: 'text-li-green-700',  label: 'Women-Owned' },
  'Identifies as LGBTQ+ owned':    { bg: 'bg-li-teal',       text: 'text-ink-1000',      label: 'LGBTQ+ Owned' },
  'Identifies as Asian-owned':     { bg: 'bg-li-blue-100',   text: 'text-li-blue-700',   label: 'Asian-Owned' },
  'Identifies as Latino-owned':    { bg: 'bg-li-red-100',    text: 'text-li-red-700',    label: 'Latino-Owned' },
  'Identifies as veteran-owned':   { bg: 'bg-li-red',        text: 'text-ink-0',         label: 'Veteran-Owned' },
  'Identifies as Indigenous-owned':{ bg: 'bg-li-green',      text: 'text-ink-1000',      label: 'Indigenous-Owned' },
  'Identifies as disabled-owned':  { bg: 'bg-ink-150',       text: 'text-ink-700',       label: 'Disabled-Owned' },
  'Transgender safespace':         { bg: 'bg-li-teal-100',   text: 'text-li-teal-700',   label: 'Transgender Safespace' },
}
export const IDENTITY_FILTER_ORDER = [
  'LGBTQ+ friendly','Identifies as Black-owned','Identifies as women-owned',
  'Identifies as LGBTQ+ owned','Identifies as Asian-owned','Identifies as Latino-owned',
  'Identifies as veteran-owned','Identifies as Indigenous-owned','Identifies as disabled-owned',
  'Transgender safespace',
]
