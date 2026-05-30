'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import HoursEditor from '@/components/HoursEditor'
import PhotoUploader from '@/components/PhotoUploader'
import type { Business } from '@/types/business'

const LOCATION_TYPES = [
  { value: 'storefront',      label: 'Storefront' },
  { value: 'by_appointment',  label: 'By Appointment' },
  { value: 'service_area',    label: 'Service Area' },
  { value: 'online_only',     label: 'Online Only' },
] as const

export default function EditForm({ business }: { business: Business }) {
  const router = useRouter()
  const supabase = createClient()

  const [description, setDescription] = useState(business.owner_description ?? '')
  const [hours, setHours] = useState(business.owner_hours ?? '')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('businesses').update({
      owner_description: description,
      owner_hours: hours,
    }).eq('id', business.id)
    setSaving(false)
    setMsg(error ? error.message : 'Saved!')
  }

  const labelCls = 'block text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-2'
  const inputCls = 'w-full border border-ink-200 rounded-lg p-3 text-sm focus:outline-none focus:border-ink-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Tell people what makes your business worth supporting…"
          className={`${inputCls} resize-y`}
        />
      </div>

      <div>
        <label className={labelCls}>Hours</label>
        <div className="border border-ink-200 rounded-lg p-3">
          <HoursEditor value={hours} onChange={setHours} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Photos</label>
        <PhotoUploader
          slug={business.slug}
          existingUrls={business.image_urls ?? []}
        />
      </div>

      <div className="border-t border-ink-150 pt-5">
        <a
          href={`/businesses/${business.slug}/claim`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#E0241F] hover:text-[#A8160F] transition-colors"
        >
          <span>🛡</span> Add verification badges →
        </a>
        <p className="text-xs text-ink-400 mt-1">Upload certifications or sign an ownership attestation via Box.</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-ink-900 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {msg && (
          <p className={`text-sm font-semibold ${msg === 'Saved!' ? 'text-[#0fae77]' : 'text-[#E0241F]'}`}>
            {msg}
          </p>
        )}
      </div>
    </form>
  )
}
