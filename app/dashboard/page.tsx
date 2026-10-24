import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { Nav } from '@/components/Nav'
import EditForm from './EditForm'
import type { Business } from '@/types/business'
import { BUSINESS_COLUMNS } from '@/lib/businessColumns'

const ACTIONS = [
  {
    href: '/claim',
    tag: 'SPEND',
    tagColor: 'bg-[#E0241F] text-white',
    label: 'Claim a listing',
    desc: 'Manage a local business, credit union, share org, or barter network you run',
  },
  {
    href: '/swap',
    tag: 'SWAP',
    tagColor: 'bg-[#0B0B0B] text-[#F6F3EA]',
    label: 'Post a swap',
    desc: "Offer something to trade or list what you're looking for",
  },
  {
    href: '/share',
    tag: 'SHARE',
    tagColor: 'bg-[#F2B400] text-[#0B0B0B]',
    label: 'Give something away',
    desc: 'Post to the mutual aid board — no strings attached',
  },
  {
    href: '/support',
    tag: 'SUPPORT',
    tagColor: 'bg-[#E0241F] text-white',
    label: 'Post a support request',
    desc: 'Ask the community for help — for yourself, your business, or your org',
  },
  {
    href: '/',
    tag: 'BROWSE',
    tagColor: 'bg-[#6E6A60] text-white',
    label: 'Browse the directory',
    desc: 'Find local businesses, lenders, swap networks, and more',
  },
]

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select(BUSINESS_COLUMNS).eq('claimed_by', user.id).single()

  return (
    <>
      <Nav />
      <div className="hazard-stripe" />
      <header className="bg-[#0B0B0B] text-[#F6F3EA]">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <p className="font-narrow text-[11px] font-bold uppercase tracking-[0.2em] text-[#F2B400] mb-3">Your account</p>
          <h1 className="stencil text-[clamp(36px,6vw,60px)] text-[#F6F3EA]">My 5S Hub</h1>
          <p className="font-narrow text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6E6A60] mt-3">{user.email}</p>
        </div>
      </header>
      <div className="hazard-stripe" />

      <main className="max-w-2xl mx-auto px-4 py-10">
        {data ? (
          <div className="space-y-6">
            <div className="border-2 border-[#0B0B0B] bg-[#F6F3EA] pop-shadow">
              <div className="border-b-2 border-[#0B0B0B] px-5 py-3 flex items-center gap-3">
                <span className="font-narrow font-extrabold text-[10px] uppercase tracking-widest bg-[#E0241F] text-white px-2 py-0.5">
                  Your Listing
                </span>
                <span className="font-formula font-extrabold text-sm uppercase">{(data as Business).name}</span>
              </div>
              <div className="p-5">
                <EditForm business={data as Business} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="font-narrow font-bold text-[11px] uppercase tracking-[0.2em] text-[#6E6A60] mb-6">
              What would you like to do?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ACTIONS.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group border-2 border-[#0B0B0B] bg-[#F6F3EA] p-5 block pop-shadow hover:-translate-y-0.5 hover:-translate-x-0.5 transition-transform"
                >
                  <span className={`inline-block font-narrow font-extrabold text-[10px] uppercase tracking-widest px-2 py-0.5 mb-3 ${action.tagColor}`}>
                    {action.tag}
                  </span>
                  <p className="font-formula font-extrabold text-base uppercase leading-tight">{action.label}</p>
                  <p className="font-narrow text-[12px] text-[#6E6A60] mt-1.5 leading-snug">{action.desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
