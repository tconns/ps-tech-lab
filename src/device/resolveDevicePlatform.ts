import { Platform, PlatformDetector } from '@osiris-smarttv/device'
import { isPs5Runtime } from './ps5Runtime'

/**
 * Platform override for device `bootstrap`. The device package falls back to the user agent, so a
 * desktop browser spoofing the PS5 UA would get the PlayStation adapter without an msdk.
 * A PlayStation detected from the UA alone runs as Web; a real PS5 (`window.msdk`) or PS4 shell
 * (`window.PlayStation`) keeps its detection.
 *
 * Adapted from react-playstation `src/shared/device/resolveDevicePlatform.ts`.
 */
export function resolveForcedDevicePlatform(): Platform | undefined {
  const detected = PlatformDetector.detect().platform
  if (detected !== Platform.PlayStation5 && detected !== Platform.PlayStation4) return undefined
  if (isPs5Runtime()) return undefined
  if (typeof window !== 'undefined' && 'PlayStation' in window) return undefined
  return Platform.Web
}
