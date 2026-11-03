/** Hardcoded Google / Shaka demo manifests */
export const STREAMS = {
  leftDash: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  rightDash: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
  leftHls: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/hls.m3u8',
  rightHls: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
} as const

/**
 * PS5 lab findings:
 * - dual Shaka MSE → 3015 MEDIA_SOURCE_OPERATION_THREW after both "playing"
 * - native HLS blob / 2nd decoder attempt can also kill the first MSE session
 *
 * Workable dual *pane*: one Shaka decoder + canvas `drawImage` preview (same frames).
 * True simultaneous dual *stream* decode is not available on this PS5 WebKit path.
 *
 * - `shaka-canvas` (default): left Shaka, right canvas mirror/preview
 * - `dual-mse` / `hybrid` / `dual-native`: kept for repro experiments
 */
export type DualMode = 'shaka-canvas' | 'hybrid' | 'dual-mse' | 'dual-native'

export const DUAL_MODE: DualMode = 'shaka-canvas'

export const ENABLED_PANES = {
  left: true,
  right: true,
} as const

/** Delay before starting a second MSE/native pane (ignored for shaka-canvas). */
export const SECOND_PLAYER_DELAY_MS = 2500

/** Cap Shaka ABR height so the MSE session stays light. */
export const PLAYER_MAX_HEIGHT = 360
