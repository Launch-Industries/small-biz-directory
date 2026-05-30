'use client'
import { useState } from 'react'
import { FileUp, ExternalLink, Loader2 } from 'lucide-react'

interface UploadedDoc { name: string; fileId: string; sharedLink: string | null }

interface Props {
  onUpload: (fileId: string) => void
}

export function DocumentUploader({ onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload-document', { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { setError(json.error ?? 'Upload failed'); return }
    setDocs(prev => [...prev, { name: json.name, fileId: json.fileId, sharedLink: json.sharedLink }])
    onUpload(json.fileId)
  }

  return (
    <div>
      {docs.map(doc => (
        <div key={doc.fileId} className="flex items-center gap-2 text-sm mb-2 p-2 bg-ink-50 rounded-lg border border-ink-100">
          <FileUp className="w-4 h-4 text-li-teal shrink-0" />
          <span className="flex-1 truncate text-ink-700">{doc.name}</span>
          {doc.sharedLink
            ? (
              <a href={doc.sharedLink} target="_blank" rel="noreferrer" className="text-ink-400 hover:text-ink-800 shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )
            : <span className="text-xs text-ink-400 shrink-0">saved to Box ✓</span>}
        </div>
      ))}

      <label className={`flex items-center gap-2 border border-dashed border-ink-300 rounded-lg px-3 py-3 cursor-pointer hover:bg-ink-50 text-sm ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
        {uploading
          ? <Loader2 className="w-4 h-4 animate-spin text-ink-500" />
          : <FileUp className="w-4 h-4 text-ink-500" />}
        <span className="text-ink-600">{uploading ? 'Uploading to Box…' : 'Upload a document to Box'}</span>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          disabled={uploading}
        />
      </label>
      {error && <p className="mt-1 text-xs text-li-red">{error}</p>}
    </div>
  )
}
