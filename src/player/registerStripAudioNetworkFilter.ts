import shaka from 'shaka-player'
import { stripAudioFromManifestText } from './stripAudioFromManifest'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/**
 * Shaka response filter: on every MANIFEST response, rewrite the body so no
 * audio AdaptationSets / HLS AUDIO tracks remain. Register before `player.load`.
 */
export function registerStripAudioNetworkFilter(player: shaka.Player): void {
  const net = player.getNetworkingEngine()
  if (!net) {
    console.warn('[Lab] No NetworkingEngine — cannot register strip-audio filter')
    return
  }

  net.registerResponseFilter((type, response) => {
    if (type !== shaka.net.NetworkingEngine.RequestType.MANIFEST) return
    if (!response.data) return

    let text: string
    try {
      text = decoder.decode(response.data)
    } catch (err) {
      console.warn('[Lab] Manifest decode failed', err)
      return
    }

    const stripped = stripAudioFromManifestText(text)
    if (stripped === text) {
      console.log('[Lab] Manifest had no audio tracks to strip', response.uri)
      return
    }

    response.data = encoder.encode(stripped).buffer as ArrayBuffer
    console.log('[Lab] Stripped audio from manifest', response.uri)
  })
}
