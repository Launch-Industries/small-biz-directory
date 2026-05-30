import { Badge } from '@/components/ui/badge'
import { IDENTITY_COLORS } from '@/lib/identity-colors'
import { cn } from '@/lib/utils'

export function IdentityBadge({ identity }: { identity: string }) {
  const colors = IDENTITY_COLORS[identity]
  if (!colors) return null
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border-transparent px-2 py-0.5 text-xs font-narrow font-semibold tracking-wide',
        colors.bg,
        colors.text
      )}
    >
      {colors.label}
    </Badge>
  )
}
