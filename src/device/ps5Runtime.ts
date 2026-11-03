/**
 * Real PS5 app runtime = the PlayStation shell exposes `window.msdk`.
 *
 * A PlayStation user agent alone is **not** a PS5: desktop browsers spoofing the PS5 UA
 * have no `msdk`. Gate PS5-only behaviour on this, never on the UA alone.
 *
 * Adapted from react-playstation `src/shared/device/ps5Runtime.ts`.
 */
export function isPs5Runtime(): boolean {
  if (typeof window === 'undefined') return false
  return (window as { msdk?: unknown }).msdk != null
}
