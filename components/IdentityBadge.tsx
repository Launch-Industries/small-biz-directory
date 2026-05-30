import { IDENTITY_COLORS } from '@/lib/identity-colors'
export function IdentityBadge({ identity }: { identity: string }) {
  const colors = IDENTITY_COLORS[identity]
  if (!colors) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-narrow font-semibold tracking-wide ${colors.bg} ${colors.text}`}>
      {colors.label}
    </span>
  )
}
