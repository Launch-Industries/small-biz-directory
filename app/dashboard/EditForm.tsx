'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Business } from '@/types/business'

export default function EditForm({ business }: { business: Business }) {
  const supabase = createClient()
  const [description, setDescription] = useState(business.owner_description ?? '')
  const [hours, setHours] = useState(business.owner_hours ?? '')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    const { error } = await supabase.from('businesses').update({
      owner_description: description, owner_hours: hours
    }).eq('id', business.id)
    setMsg(error ? error.message : 'Saved!')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ink-700 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
          className="w-full border border-ink-200 rounded-lg p-3 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink-700 mb-1">Hours</label>
        <textarea value={hours} onChange={e => setHours(e.target.value)} rows={4}
          className="w-full border border-ink-200 rounded-lg p-3 text-sm" />
      </div>
      <button type="submit" className="bg-ink-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-ink-800">
        Save
      </button>
      {msg && <p className={msg === 'Saved!' ? 'text-li-green-700 text-sm' : 'text-li-red text-sm'}>{msg}</p>}
    </form>
  )
}
