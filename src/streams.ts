/** Hardcoded Google / Shaka demo manifests */
export const STREAMS = {
  leftDash: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  rightDash: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
  leftHls: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/hls.m3u8',
  rightHls: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
} as const

/**
 * PS5 evidence (lab logs): dual Shaka MSE reaches `playing` then both throw
 * Shaka 3015 MEDIA_SOURCE_OPERATION_THREW — WebKit will not sustain 2 MSE/decoders.
 *
 * - `hybrid` (default): left = Shaka MSE (DASH, strip audio), right = native HLS `<video>` (no 2nd MSE)
 * - `dual-mse`: both Shaka (repro 3015)
 * - `dual-native`: both native HLS
 */
export type DualMode = 'hybrid' | 'dual-mse' | 'dual-native'

export const DUAL_MODE: DualMode = 'hybrid'

export const ENABLED_PANES = {
  left: true,
  right: true,
} as const

/** Delay before starting the second pane (after first `playing`). */
export const SECOND_PLAYER_DELAY_MS = 2500

/** Cap Shaka ABR height so the MSE session stays light. */
export const PLAYER_MAX_HEIGHT = 360
