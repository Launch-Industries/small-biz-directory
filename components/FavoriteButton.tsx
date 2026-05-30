'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export function FavoriteButton({
  entityId,
  section = 'spend',
}: {
  entityId: string
  section?: string
}) {
  const supabase = createClient()
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setChecked(true); return }
      supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('entity_id', entityId)
        .eq('section', section)
        .maybeSingle()
        .then(({ data }) => {
          setFavorited(!!data)
          setChecked(true)
        })
    })
  }, [entityId, section])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading || !checked) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    if (favorited) {
      await supabase.from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('entity_id', entityId)
        .eq('section', section)
      setFavorited(false)
    } else {
      await supabase.from('user_favorites').insert({ user_id: user.id, entity_id: entityId, section })
      setFavorited(true)
    }
    setLoading(false)
  }

  if (!checked) return null

  return (
    <button
      onClick={toggle}
      aria-label={favorited ? 'Remove from saved' : 'Save listing'}
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
        favorited
          ? 'bg-[#E0241F] text-white'
          : 'bg-white/80 text-ink-400 hover:text-[#E0241F] border border-ink-150'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
