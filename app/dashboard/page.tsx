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
        <h1 className="font-formula font-extrabold text-2xl mb-6">Owner Dashboard</h1>
        {data ? (
          <>
            <p className="text-ink-600 mb-4">Editing: <strong>{(data as Business).name}</strong></p>
            <EditForm business={data as Business} />
          </>
        ) : (
          <p className="text-ink-600">You haven&apos;t claimed a business yet. <Link href="/" className="text-li-red hover:underline">Browse listings</Link></p>
        )}
      </main>
    </>
  )
}
