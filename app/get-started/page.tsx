import Link from 'next/link'
import { ShieldCheck, Search, FileCheck2, BadgeCheck } from 'lucide-react'
import { Nav } from '@/components/Nav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Started — 5S Ethos',
  description: 'How to use 5S Ethos and verify your business ownership with Box AI.',
}

const STEPS = [
  { icon: Search, title: 'Find your business', body: 'Search the 5S Ethos directory for your business listing — or browse by neighborhood, category, or ownership.' },
  { icon: ShieldCheck, title: 'Claim it', body: 'Sign in and claim your listing so you can manage your profile, photos, hours, and contact info.' },
  { icon: FileCheck2, title: 'Upload your certification', body: 'On the claim page, upload an official certification (MBE, WBENC, NGLCC LGBTBE, VOSB) or a business license.' },
  { icon: BadgeCheck, title: 'Get verified with Box AI', body: 'Box AI reads your document and matches it to your listing — instantly turning your ownership badge into a verified ✓.' },
]

export default function GetStartedPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 text-li-teal mb-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-narrow font-semibold tracking-wide uppercase">Powered by Box AI</span>
        </div>
        <h1 className="font-formula font-extrabold text-3xl md:text-4xl">Get started with 5S Ethos</h1>
        <p className="text-ink-600 mt-3 text-lg">
          5S Ethos is a local directory for discovering and supporting diverse-owned businesses —
          Black-owned, women-owned, LGBTQ-owned, veteran-owned, and more. Business owners can verify their
          ownership in seconds using <span className="font-semibold">Box AI</span>.
        </p>

        <ol className="mt-10 space-y-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-xl border border-ink-150 p-5">
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-li-teal-100 text-li-teal flex items-center justify-center">
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="font-semibold">{i + 1}. {s.title}</p>
                <p className="text-ink-600 text-sm mt-0.5">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="bg-ink-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-ink-800">
            Browse the directory
          </Link>
          <Link href="/login" className="border border-ink-300 px-6 py-3 rounded-lg font-semibold hover:bg-ink-50">
            Sign in to claim your business
          </Link>
        </div>

        <div className="mt-10 rounded-xl bg-ink-50 border border-ink-150 p-5">
          <h2 className="font-semibold flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-li-teal" /> How the Box integration works</h2>
          <p className="text-ink-600 text-sm mt-2">
            When you upload a certification, 5S Ethos securely stores it in Box and uses <span className="font-semibold">Box AI Extract</span>
            {' '}to read the business name, certification type, issuing organization, and expiration date. We match that against your
            listing and, on success, add a verified&nbsp;✓ badge — no manual review, no paperwork backlog. Every submission is logged for a clean audit trail.
          </p>
        </div>
      </main>
    </>
  )
}
