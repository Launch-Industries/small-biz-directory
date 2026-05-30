'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { parseHours, serializeHours } from '@/lib/hours'
import { HoursEditor } from './HoursEditor'
import { PhotoUploader } from './PhotoUploader'
import { DocumentUploader } from './DocumentUploader'
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
  const [locationType, setLocationType] = useState(business.location_type ?? '')
  const [hours, setHours] = useState(parseHours(business.owner_hours))
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>(business.owner_image_urls ?? [])
  const [docFileIds, setDocFileIds] = useState<string[]>(business.owner_doc_box_file_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const existingImageUrls = [
    ...(business.thumbnail_url ? [business.thumbnail_url] : []),
    ...business.image_urls,
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('businesses').update({
      owner_description: description,
      location_type: locationType || null,
      owner_hours: serializeHours(hours),
      owner_image_urls: newPhotoUrls,
      owner_doc_box_file_ids: docFileIds,
    }).eq('id', business.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    router.push(`/?q=${encodeURIComponent(business.name)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">

      {/* Section 1: About + Location */}
      <section>
        <h2 className="font-formula font-bold text-lg mb-4 pb-2 border-b border-ink-100">About Your Business</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell people about your business…"
              className="w-full border border-ink-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-li-teal"
            />
          </div>

          {business.address && (
            <div>
              <p className="text-sm font-semibold text-ink-700 mb-1">Address</p>
              <p className="text-sm text-ink-500">{business.address}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-2">Location type</label>
            <div className="flex flex-wrap gap-2">
              {LOCATION_TYPES.map(lt => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setLocationType(locationType === lt.value ? '' : lt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    locationType === lt.value
                      ? 'bg-ink-900 text-white border-ink-900'
                      : 'border-ink-200 text-ink-600 hover:border-ink-400 hover:text-ink-800'
                  }`}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Hours */}
      <section>
        <h2 className="font-formula font-bold text-lg mb-4 pb-2 border-b border-ink-100">Hours</h2>
        <HoursEditor value={hours} onChange={setHours} />
      </section>

      {/* Section 3: Photos */}
      <section>
        <h2 className="font-formula font-bold text-lg mb-4 pb-2 border-b border-ink-100">Photos</h2>
        <PhotoUploader
          businessId={business.id}
          existingUrls={existingImageUrls}
          newUrls={newPhotoUrls}
          onAdd={url => setNewPhotoUrls(prev => [...prev, url])}
          onRemove={url => setNewPhotoUrls(prev => prev.filter(u => u !== url))}
        />
      </section>

      {/* Section 4: Documents */}
      <section>
        <h2 className="font-formula font-bold text-lg mb-4 pb-2 border-b border-ink-100">Documents</h2>
        <p className="text-sm text-ink-500 mb-3">
          Business licenses and certifications are stored securely in Box.
        </p>
        <DocumentUploader onUpload={fileId => setDocFileIds(prev => [...prev, fileId])} />
      </section>

      {error && <p className="text-li-red text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-ink-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-ink-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Saving…' : 'Save & View My Listing'}
      </button>
    </form>
  )
}
