import Link from 'next/link'
export function Nav() {
  return (
    <nav className="border-b border-ink-150 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-li-red inline-block" />
          <span className="font-narrow font-semibold text-sm uppercase tracking-widest text-ink-1000">Launch Industries</span>
          <span className="text-ink-400 text-sm">/ Directory</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/map" className="text-sm text-ink-600 hover:text-ink-1000 transition-colors">Map</Link>
          <Link href="/dashboard" className="text-sm font-semibold bg-ink-1000 text-white px-4 py-1.5 rounded-full hover:bg-ink-800 transition-colors">My Listing</Link>
        </div>
      </div>
    </nav>
  )
}
