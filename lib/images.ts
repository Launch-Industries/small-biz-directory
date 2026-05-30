// next/image only renders hosts allow-listed in next.config.mjs, and the
// Street View fallback thumbnails Google returned for photo-less businesses are
// dead (403). Treat any non-displayable thumbnail as absent so callers fall back
// to their placeholder instead of crashing the render.
const DISPLAYABLE_HOSTS = ['googleusercontent.com', 'supabase.co', 'googleapis.com']

export function displayableImage(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    return DISPLAYABLE_HOSTS.some(d => host === d || host.endsWith(`.${d}`)) ? url : null
  } catch {
    return null
  }
}
