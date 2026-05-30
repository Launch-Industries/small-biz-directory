'use client'
import { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface Props {
  businessId: string
  existingUrls: string[]
  newUrls: string[]
  onAdd: (url: string) => void
  onRemove: (url: string) => void
}

export function PhotoUploader({ businessId, existingUrls, newUrls, onAdd, onRemove }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList) {
    setError('')
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('businessId', businessId)
      const res = await fetch('/api/upload-photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Upload failed'); break }
      onAdd(json.url)
    }
    setUploading(false)
  }

  return (
    <div>
      {existingUrls.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-ink-400 mb-2">Imported photos (read-only)</p>
          <div className="flex flex-wrap gap-2">
            {existingUrls.map(url => (
              <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg opacity-60" />
            ))}
          </div>
        </div>
      )}

      {newUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {newUrls.map(url => (
            <div key={url} className="relative">
              <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5 hover:bg-ink-50"
              >
                <X className="w-3 h-3 text-ink-700" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className={`flex items-center gap-2 border border-dashed border-ink-300 rounded-lg px-3 py-3 cursor-pointer hover:bg-ink-50 text-sm ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
        {uploading
          ? <Loader2 className="w-4 h-4 animate-spin text-ink-500" />
          : <Upload className="w-4 h-4 text-ink-500" />}
        <span className="text-ink-600">{uploading ? 'Uploading…' : 'Add photos from your business'}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
      </label>
      {error && <p className="mt-1 text-xs text-li-red">{error}</p>}
    </div>
  )
}
