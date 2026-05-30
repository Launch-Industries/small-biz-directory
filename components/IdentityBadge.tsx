import { Badge } from '@/components/ui/badge'
import { IDENTITY_COLORS } from '@/lib/identity-colors'
import { cn } from '@/lib/utils'

export function IdentityBadge({ identity, verified = false }: { identity: string; verified?: boolean }) {
  const colors = IDENTITY_COLORS[identity]
  if (!colors) return null
  return (
    <Badge
      variant="outline"
      title={verified ? 'Ownership verified via Box AI' : undefined}
      className={cn(
        'gap-1 rounded-full border-transparent px-2 py-0.5 text-xs font-narrow font-semibold tracking-wide',
        colors.bg,
        colors.text,
        verified && 'ring-1 ring-li-teal'
      )}
    >
      {verified && <span aria-label="verified">✓</span>}
      {colors.label}
    </Badge>
  )
}
