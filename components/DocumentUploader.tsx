'use client'
import { useRef, useState } from 'react'

interface VerifyResult {
  status: 'verified' | 'needs_review' | 'rejected'
  reason: string
  label: string
  boxUploadLive: boolean
  aiLive: boolean
}

interface Props {
  slug: string
  identity: string
  identityLabel: string
  onVerified?: () => void
}

export default function DocumentUploader({ slug, identity, identityLabel, onVerified }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState('')

  async function submit(file: File) {
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('slug', slug)
      fd.append('identity', identity)
      fd.append('file', file)
      const res = await fetch('/api/verify-ownership', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setResult(data as VerifyResult)
      if (data.status === 'verified') onVerified?.()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) submit(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) submit(file)
  }

  const verdictStyle = result
    ? result.status === 'verified'
      ? 'bg-[#c9f4e2] border-[#0fae77] text-[#0a5c3a]'
      : result.status === 'needs_review'
      ? 'bg-[#fff6cc] border-[#d9b000] text-[#6b4c00]'
      : 'bg-[#ffd9de] border-[#d9304a] text-[#7a0f1e]'
    : ''

  const verdictIcon = result
    ? result.status === 'verified' ? '✓' : result.status === 'needs_review' ? '~' : '✗'
    : ''

  return (
    <div className="space-y-3">
      {!result && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragging ? 'border-[#E0241F] bg-[#ffd9de]/30' : 'border-ink-300 hover:border-ink-500'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={onFileChange} />
          <p className="text-2xl mb-2">📄</p>
          <p className="text-sm font-semibold text-ink-700">
            {uploading ? 'Uploading & verifying…' : 'Drop your certification here'}
          </p>
          <p className="text-xs text-ink-400 mt-1">PDF, JPG, PNG, WebP accepted</p>
          <p className="text-xs text-ink-400">For: <span className="font-semibold">{identityLabel}</span></p>
        </div>
      )}

      {error && (
        <p className="text-xs text-[#E0241F] font-semibold">{error}</p>
      )}

      {result && (
        <div className={`border rounded-lg p-4 ${verdictStyle}`}>
          <div className="flex items-start gap-3">
            <span className="font-extrabold text-lg leading-none mt-0.5">{verdictIcon}</span>
            <div>
              <p className="font-semibold text-sm">
                {result.status === 'verified' && `${result.label} Verified`}
                {result.status === 'needs_review' && 'Submitted — Under Review'}
                {result.status === 'rejected' && 'Verification Failed'}
              </p>
              <p className="text-xs mt-0.5 opacity-80">{result.reason}</p>
              {!result.aiLive && (
                <p className="text-xs mt-1 opacity-60 italic">Running in demo mode — AI extraction not active</p>
              )}
            </div>
          </div>
          {result.status !== 'verified' && (
            <button
              onClick={() => { setResult(null); setError('') }}
              className="mt-3 text-xs font-bold underline underline-offset-2 opacity-70 hover:opacity-100"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
