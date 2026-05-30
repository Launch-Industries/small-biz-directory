import Link from 'next/link'

// 5S Ethos nav — black bar, shock-red underline, amber hovers, stencil wordmark.
export function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-[#0B0B0B] text-[#F6F3EA] border-b-[3px] border-[#E0241F]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-stencil uppercase tracking-wide text-lg text-[#F6F3EA]">5S Ethos</span>
          <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.18em] text-[#F2B400]">Directory</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/map" className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] hover:text-[#F2B400] transition-colors">Map</Link>
          <Link href="/get-started" className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] hover:text-[#F2B400] transition-colors">Get Started</Link>
          <Link href="/dashboard" className="font-narrow text-[12px] font-extrabold uppercase tracking-[0.04em] bg-[#E0241F] text-white px-4 py-1.5 border-2 border-[#F6F3EA] hover:bg-[#A8160F] transition-colors">My Listing</Link>
        </div>
      </div>
    </nav>
  )
}
