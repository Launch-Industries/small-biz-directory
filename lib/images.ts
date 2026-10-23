// next/image only renders hosts allow-listed in next.config.mjs. Google's photo
// links (googleusercontent.com) all return 403 now (checked 2026-10-23), so only
// Supabase-hosted images count; anything else is treated as absent and callers
// fall back to their placeholder instead of showing a broken image.
const DISPLAYABLE_HOSTS = ['supabase.co']

/**
 * The photo to show for a business: Launch's stored copy (directory_photo_url,
 * taken from the business's own website) when there is one, else a still-working
 * thumbnail.
 */
export function photoOf(b: { directory_photo_url?: string | null; thumbnail_url?: string | null }): string | null {
  return displayableImage(b.directory_photo_url) ?? displayableImage(b.thumbnail_url)
}

export function displayableImage(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    return DISPLAYABLE_HOSTS.some(d => host === d || host.endsWith(`.${d}`)) ? url : null
  } catch {
    return null
  }
}
