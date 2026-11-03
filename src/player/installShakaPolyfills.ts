/**
 * Install Shaka media polyfills (MediaSource, EME, …) once per document.
 * Must run **before** any playback attach on PS5 WebKit.
 *
 * Adapted from react-playstation `installShakaPolyfills.ts`.
 */
import shaka from 'shaka-player'

let installed = false

export function installShakaPolyfills(): void {
  if (typeof window === 'undefined' || installed) return
  installed = true
  try {
    shaka.polyfill?.installAll?.()
    console.log('[Lab] Shaka polyfills installed')
  } catch (e) {
    console.warn('[Lab] Failed to install Shaka polyfills', e)
  }
}
