'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { BusinessListing } from './BusinessListing'
import { IDENTITY_FILTER_ORDER, IDENTITY_COLORS } from '@/lib/identity-colors'
import { INDUSTRY_ORDER } from '@/lib/industry'
import type { Business } from '@/types/business'

export type DirectoryFilters = {
  industries: string[]
  categories: string[]
  locations: string[]
  identities: string[]
}

const EMPTY: DirectoryFilters = { industries: [], categories: [], locations: [], identities: [] }

type SortKey = 'rating' | 'name' | 'industry'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'rating', label: 'Top rated' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'industry', label: 'Industry' },
]

function locationOf(b: Business) {
  return b.neighborhood ?? b.city ?? null
}

/** Distinct facet values with counts, ordered by frequency then name. */
function facet(businesses: Business[], pick: (b: Business) => string | null) {
  const counts = new Map<string, number>()
  for (const b of businesses) {
    const v = pick(b)
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }))
}

export function DirectoryExplorer({
  businesses,
  initial = EMPTY,
}: {
  businesses: Business[]
  initial?: DirectoryFilters
}) {
  const form = useForm<DirectoryFilters>({ defaultValues: { ...EMPTY, ...initial } })
  const values = form.watch()
  const [sort, setSort] = useState<SortKey>('rating')
  const [search, setSearch] = useState('')

  const industries = useMemo(
    () =>
      facet(businesses, b => b.industry).sort(
        (a, b) => (INDUSTRY_ORDER[a.value] ?? 99) - (INDUSTRY_ORDER[b.value] ?? 99)
      ),
    [businesses]
  )
  const categories = useMemo(() => facet(businesses, b => b.category_name), [businesses])
  const locations = useMemo(() => facet(businesses, locationOf), [businesses])
  const identities = useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of businesses) for (const id of b.business_identities) counts.set(id, (counts.get(id) ?? 0) + 1)
    return IDENTITY_FILTER_ORDER.filter(id => counts.has(id)).map(id => ({
      value: id,
      label: IDENTITY_COLORS[id]?.label ?? id,
      count: counts.get(id) ?? 0,
    }))
  }, [businesses])

  const filtered = useMemo(() => {
    const { industries: ind, categories: c, locations: l, identities: i } = values
    return businesses.filter(b => {
      if (ind.length && !(b.industry && ind.includes(b.industry))) return false
      if (c.length && !(b.category_name && c.includes(b.category_name))) return false
      if (l.length && !(locationOf(b) && l.includes(locationOf(b)!))) return false
      if (i.length && !i.some(id => b.business_identities.includes(id))) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!b.name.toLowerCase().includes(q) && !(b.category_name ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [businesses, values])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sort === 'name') {
      arr.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'industry') {
      arr.sort(
        (a, b) =>
          (INDUSTRY_ORDER[a.industry ?? ''] ?? 99) - (INDUSTRY_ORDER[b.industry ?? ''] ?? 99) ||
          (b.total_score ?? -1) - (a.total_score ?? -1)
      )
    } else {
      arr.sort((a, b) => (b.total_score ?? -1) - (a.total_score ?? -1))
    }
    return arr
  }, [filtered, sort])

  const activeCount =
    values.industries.length + values.categories.length + values.locations.length + values.identities.length

  // Sync filter state to the URL (shareable / back-button) without a navigation.
  useEffect(() => {
    const p = new URLSearchParams()
    if (values.industries.length) p.set('industry', values.industries.join('~'))
    if (values.categories.length) p.set('category', values.categories.join('~'))
    if (values.locations.length) p.set('location', values.locations.join('~'))
    if (values.identities.length) p.set('identity', values.identities.join('~'))
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [values])

  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-2 space-y-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search businesses…"
          className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
        />
        <Form {...form}>
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            <div className="flex items-center justify-between">
              <h2 className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-500">
                Filters
              </h2>
              {activeCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs text-ink-500 hover:text-ink-1000"
                  onClick={() => form.reset(EMPTY)}
                >
                  <X className="h-3 w-3" /> Clear ({activeCount})
                </Button>
              )}
            </div>

            <FacetGroup form={form} name="industries" title="Industry"
              options={industries.map(o => ({ value: o.value, label: o.value, count: o.count }))} />
            <FacetGroup form={form} name="identities" title="Ownership"
              options={identities.map(o => ({ value: o.value, label: o.label, count: o.count }))} />
            <FacetGroup form={form} name="categories" title="Category"
              options={categories.map(o => ({ value: o.value, label: o.value, count: o.count }))} collapsible />
            <FacetGroup form={form} name="locations" title="Location"
              options={locations.map(o => ({ value: o.value, label: o.value, count: o.count }))} collapsible />
          </form>
        </Form>
      </aside>

      <section className="col-span-12 lg:col-span-9 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-500">
            <span className="font-semibold text-ink-1000">{sorted.length}</span>{' '}
            {sorted.length === 1 ? 'business' : 'businesses'}
            {activeCount > 0 && ' match your filters'}
          </p>
          <label className="flex items-center gap-2 text-sm text-ink-500">
            <span className="font-narrow font-semibold text-xs uppercase tracking-widest">Sort</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="rounded-md border border-ink-200 bg-white px-2 py-1 text-sm text-ink-900 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SORTS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
        <BusinessListing businesses={sorted} />
      </section>
    </div>
  )
}

function FacetGroup({
  form,
  name,
  title,
  options,
  collapsible = false,
}: {
  form: ReturnType<typeof useForm<DirectoryFilters>>
  name: keyof DirectoryFilters
  title: string
  options: { value: string; label: string; count: number }[]
  collapsible?: boolean
}) {
  if (options.length === 0) return null
  const shown = collapsible ? options.slice(0, 12) : options
  return (
    <fieldset className="space-y-2.5">
      <legend className="font-narrow font-semibold text-xs uppercase tracking-widest text-ink-700 mb-1">
        {title}
      </legend>
      {shown.map(opt => (
        <FormField
          key={opt.value}
          control={form.control}
          name={name}
          render={({ field }) => {
            const checked = field.value.includes(opt.value)
            return (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={on => {
                      field.onChange(
                        on
                          ? [...field.value, opt.value]
                          : field.value.filter(v => v !== opt.value)
                      )
                    }}
                  />
                </FormControl>
                <span className="flex-1 text-sm text-ink-700 leading-tight">{opt.label}</span>
                <span className="text-xs text-ink-400 tabular-nums">{opt.count}</span>
              </FormItem>
            )
          }}
        />
      ))}
      {collapsible && options.length > shown.length && (
        <p className="text-xs text-ink-400">+{options.length - shown.length} more</p>
      )}
    </fieldset>
  )
}
