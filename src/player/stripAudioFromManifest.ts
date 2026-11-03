/**
 * Strip every audio AdaptationSet / HLS AUDIO track from a manifest body.
 * Used by the Shaka networking response filter before the parser runs.
 */

const DASH_AUDIO_ADAPTATION_SET =
  /<AdaptationSet\b[^>]*(?:contentType\s*=\s*["']audio["']|mimeType\s*=\s*["']audio\/[^"']*["'])[^>]*(?:\/>|>[\s\S]*?<\/AdaptationSet\s*>)/gi

/** Remove `#EXT-X-MEDIA:TYPE=AUDIO,...` lines from HLS master playlists. */
const HLS_AUDIO_MEDIA = /^#EXT-X-MEDIA:.*TYPE=AUDIO.*$/gim

/** Drop AUDIO="…" group refs on `#EXT-X-STREAM-INF` so video-only variants remain valid. */
const HLS_STREAM_INF_AUDIO_ATTR = /(\bAUDIO\s*=\s*"[^"]*"\s*,?|,?\s*\bAUDIO\s*=\s*"[^"]*")/gi

export function stripAudioFromManifestText(text: string): string {
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<') || /<MPD[\s>]/i.test(trimmed)) {
    return text.replace(DASH_AUDIO_ADAPTATION_SET, '')
  }
  if (trimmed.includes('#EXTM3U')) {
    return text
      .replace(HLS_AUDIO_MEDIA, '')
      .replace(HLS_STREAM_INF_AUDIO_ATTR, '')
      .replace(/,\s*(?=\n|$)/g, '')
  }
  return text
}

/** Rewrite relative HLS URIs so a blob: master playlist still resolves on CDN. */
export function absolutizeHlsPlaylist(text: string, baseUrl: string): string {
  const base = new URL(baseUrl)
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
          try {
            return `URI="${new URL(uri, base).href}"`
          } catch {
            return `URI="${uri}"`
          }
        })
      }
      try {
        return new URL(trimmed, base).href
      } catch {
        return line
      }
    })
    .join('\n')
}
