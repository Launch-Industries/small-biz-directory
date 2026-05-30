import Link from 'next/link'
import { Nav } from '@/components/Nav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Started — 5S Ethos',
  description: 'Five ways to give a f*ck — spend, save, swap, share, and support your local economy.',
}

const WAYS = [
  {
    verb: 'Spend',
    color: 'bg-red-600 text-white',
    accent: 'text-red-600',
    border: 'border-red-600',
    tagline: 'Shop local. Keep money in the neighborhood.',
    body: 'Every dollar you spend at a local independent circulates 3× longer in your community than one spent at a chain. The directory makes it easy to find BIPOC-owned, women-owned, LGBTQ-owned, and other local businesses near you.',
    steps: [
      'Browse the directory — search by city, category, or ownership.',
      'Find a business that fits your need.',
      'Visit them. Buy something. Tell your people.',
    ],
    cta: { label: 'Browse local businesses', href: '/' },
  },
  {
    verb: 'Save',
    color: 'bg-amber-400 text-black',
    accent: 'text-amber-600',
    border: 'border-amber-400',
    tagline: 'Bank where your money stays local.',
    body: "Big banks extract wealth from your neighborhood. Credit unions and CDFIs keep your deposits working locally — funding small business loans, home mortgages, and community development instead of Wall Street.",
    steps: [
      'Find a credit union or CDFI in the Save tab.',
      'Open an account — most are free or low-fee.',
      'Move your direct deposit or savings. Done.',
    ],
    cta: { label: 'Find local lenders', href: '/?tab=save' },
  },
  {
    verb: 'Swap',
    color: 'bg-neutral-600 text-white',
    accent: 'text-neutral-700',
    border: 'border-neutral-400',
    tagline: 'Trade what you have for what you need.',
    body: 'Barter exchanges, timebanks, and local trade networks let you swap goods and skills without cash changing hands. Reduce waste, build relationships, and keep value circulating locally.',
    steps: [
      'Browse the Swap tab for barter networks and timebanks near you.',
      'Post something you want to trade on the swap board.',
      'Connect with someone who has what you need.',
    ],
    cta: { label: 'Explore swap & barter', href: '/?tab=swap' },
  },
  {
    verb: 'Share',
    color: 'bg-amber-400 text-black',
    accent: 'text-amber-600',
    border: 'border-amber-400',
    tagline: 'Give it away. Keep it out of the landfill.',
    body: 'Tool libraries, Buy Nothing groups, thrift stores, and reuse shops are local infrastructure for a circular economy. Share what you no longer need; find what you need for free.',
    steps: [
      'Browse the Share tab for tool libraries, Buy Nothing groups, and thrift near you.',
      'Post something you want to give away on the share board.',
      'Pick up or drop off — no cash, no waste.',
    ],
    cta: { label: 'Browse share & reuse', href: '/?tab=share' },
  },
  {
    verb: 'Support',
    color: 'bg-red-600 text-white',
    accent: 'text-red-600',
    border: 'border-red-600',
    tagline: 'Lift a neighbor. Ask when you need it.',
    body: 'People, small businesses, and community organizations fall into hard times. The Support board is for both sides — post what you need, or offer your time, skills, or resources to someone who does.',
    steps: [
      'Browse the Support tab to see who needs help this week.',
      'Offer what you can — skills, time, money, referrals.',
      'Or post your own request. This community shows up.',
    ],
    cta: { label: 'See who needs help', href: '/?tab=support' },
  },
]

export default function GetStartedPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-sm font-narrow font-semibold tracking-widest uppercase text-ink-400 mb-2">Five ways to give a f*ck</p>
        <h1 className="font-formula font-extrabold text-3xl md:text-4xl text-ink-1000">Get started with 5S Ethos</h1>
        <p className="text-ink-600 mt-3 text-lg max-w-2xl">
          The local economy doesn't fix itself. Pick one of the five verbs below — or all five — and start acting like you give a f*ck.
        </p>

        <div className="mt-10 space-y-8">
          {WAYS.map((w) => (
            <section key={w.verb} className={`rounded-xl border-2 ${w.border} overflow-hidden`}>
              <div className={`px-5 py-3 ${w.color}`}>
                <span className="font-formula font-extrabold text-xl uppercase tracking-tight">{w.verb}</span>
                <span className="ml-3 text-sm font-semibold opacity-80">{w.tagline}</span>
              </div>
              <div className="px-5 py-5 space-y-4">
                <p className="text-ink-700 text-sm leading-relaxed">{w.body}</p>
                <ol className="space-y-2">
                  {w.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink-700">
                      <span className={`shrink-0 font-formula font-extrabold text-lg leading-tight ${w.accent}`}>{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={w.cta.href}
                  className={`inline-block mt-2 text-sm font-semibold ${w.accent} hover:underline`}
                >
                  {w.cta.label} →
                </Link>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-ink-50 border border-ink-150 p-6 text-center">
          <h2 className="font-formula font-extrabold text-xl text-ink-1000">Own a local business?</h2>
          <p className="text-ink-600 text-sm mt-2 max-w-md mx-auto">
            Claim your listing in the directory and keep your info up to date. It's free and takes two minutes.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 bg-ink-900 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-ink-800 transition-colors"
          >
            Claim your listing
          </Link>
        </div>
      </main>
    </>
  )
}
