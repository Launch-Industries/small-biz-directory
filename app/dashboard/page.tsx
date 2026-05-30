import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { Nav } from '@/components/Nav'
import EditForm from './EditForm'
import type { Business } from '@/types/business'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select('*').eq('claimed_by', user.id).single()

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-formula font-extrabold text-2xl mb-1">My 5S Account</h1>
        <p className="text-ink-500 text-sm mb-6">Signed in as {user.email}</p>
        {data ? (
          <>
            <p className="text-ink-600 mb-4">Managing listing: <strong>{(data as Business).name}</strong></p>
            <EditForm business={data as Business} />
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-ink-600">What would you like to do?</p>
            <div className="grid grid-cols-1 gap-3">
              <Link href="/claim" className="flex items-start gap-3 rounded-xl border border-ink-150 p-4 hover:bg-ink-50 transition-colors">
                <span className="text-xl">🏪</span>
                <div>
                  <p className="font-semibold text-sm">Claim a listing</p>
                  <p className="text-ink-500 text-xs mt-0.5">Manage a local business, credit union, share org, or barter network you run</p>
                </div>
              </Link>
              <Link href="/support" className="flex items-start gap-3 rounded-xl border border-ink-150 p-4 hover:bg-ink-50 transition-colors">
                <span className="text-xl">🤝</span>
                <div>
                  <p className="font-semibold text-sm">Post a support request</p>
                  <p className="text-ink-500 text-xs mt-0.5">Ask the community for help — for yourself, your business, or your org</p>
                </div>
              </Link>
              <Link href="/swap" className="flex items-start gap-3 rounded-xl border border-ink-150 p-4 hover:bg-ink-50 transition-colors">
                <span className="text-xl">🔄</span>
                <div>
                  <p className="font-semibold text-sm">Post a swap</p>
                  <p className="text-ink-500 text-xs mt-0.5">Offer something to trade or list what you're looking for</p>
                </div>
              </Link>
              <Link href="/share" className="flex items-start gap-3 rounded-xl border border-ink-150 p-4 hover:bg-ink-50 transition-colors">
                <span className="text-xl">🎁</span>
                <div>
                  <p className="font-semibold text-sm">Give something away</p>
                  <p className="text-ink-500 text-xs mt-0.5">Post to the Buy Nothing / mutual aid board</p>
                </div>
              </Link>
              <Link href="/" className="flex items-start gap-3 rounded-xl border border-ink-150 p-4 hover:bg-ink-50 transition-colors">
                <span className="text-xl">🗺️</span>
                <div>
                  <p className="font-semibold text-sm">Browse the directory</p>
                  <p className="text-ink-500 text-xs mt-0.5">Find local businesses, lenders, swap networks, and more</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
