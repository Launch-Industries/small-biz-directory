'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { IdentityBadge } from './IdentityBadge'
import type { Business } from '@/types/business'

/**
 * Keyboard-driven global search (⌘K / Ctrl-K). Searches the in-memory
 * business set by name, category, and neighborhood/city; selecting a result
 * navigates to its detail page. Rendered once at the directory root.
 */
export function CommandSearch({ businesses }: { businesses: Business[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function go(slug: string) {
    setOpen(false)
    router.push(`/businesses/${slug}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-400 transition-colors hover:border-ink-300"
      >
        <Search className="h-4 w-4" />
        <span>Search businesses…</span>
        <kbd className="ml-auto hidden items-center gap-1 rounded border border-ink-200 bg-ink-50 px-1.5 font-narrow text-[10px] font-semibold uppercase tracking-widest text-ink-500 sm:inline-flex">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search by name, category, or neighborhood…" />
        <CommandList>
          <CommandEmpty>No businesses found.</CommandEmpty>
          <CommandGroup heading="Businesses">
            {businesses.map(b => (
              <CommandItem
                key={b.id}
                value={`${b.name} ${b.category_name ?? ''} ${b.neighborhood ?? b.city ?? ''}`}
                onSelect={() => go(b.slug)}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-formula font-semibold text-ink-1000">{b.name}</span>
                  <span className="truncate text-xs text-ink-500">
                    {b.category_name}
                    {b.neighborhood || b.city ? ` · ${b.neighborhood ?? b.city}` : ''}
                  </span>
                </div>
                {b.business_identities[0] && (
                  <span className="ml-auto hidden sm:block">
                    <IdentityBadge identity={b.business_identities[0]} />
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
