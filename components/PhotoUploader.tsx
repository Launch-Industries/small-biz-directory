'use client'
import { useRef, useState } from 'react'

interface Props {
  slug: string
  existingUrls?: string[]
  onUploaded?: (url: string) => void
}

export default function PhotoUploader({ slug, existingUrls = [], onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState<string[]>(existingUrls)
  const [error, setError] = useState('')

  async function upload(file: File) {
    if (uploading) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('slug', slug)
      fd.append('file', file)
      const res = await fetch('/api/upload-photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setPhotos(prev => [...prev, data.url])
      onUploaded?.(data.url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden border border-ink-200 bg-ink-100">
              {url.startsWith('box:') ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-ink-400">
                  Box file<br />{url.slice(4).slice(0, 8)}…
                </div>
              ) : (
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
          dragging ? 'border-[#E0241F] bg-[#ffd9de]/30' : 'border-ink-300 hover:border-ink-500'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFileChange} />
        <p className="text-xl mb-1">📷</p>
        <p className="text-sm font-semibold text-ink-700">
          {uploading ? 'Uploading…' : 'Add a photo'}
        </p>
        <p className="text-xs text-ink-400 mt-0.5">JPG, PNG, WebP · Max 10 MB</p>
      </div>

      {error && <p className="text-xs text-[#E0241F] font-semibold">{error}</p>}
    </div>
  )
}
