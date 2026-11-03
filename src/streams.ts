/** Hardcoded Google / Shaka demo manifests + progressive MP4 for native preview */
export const STREAMS = {
  leftDash: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  rightDash: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
  leftHls: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/hls.m3u8',
  rightHls: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
  /** Progressive MP4 (no MSE) — lab right-pane candidate on PS5 */
  rightMp4: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  leftMp4: 'https://www.w3schools.com/html/mov_bbb.mp4',
} as const

/**
 * PS5 lab findings:
 * - dual Shaka MSE → 3015 after both "playing"
 * - captureStream missing; canvas drawImage from MSE → black frames
 * - HLS blob native → NotSupportedError
 *
 * Next experiment (default): `shaka-mp4` = Shaka MSE left + progressive MP4 native right
 * (second picture without a second MSE; may still contend for HW decoder — watch left 3015).
 *
 * `shaka-canvas` kept to document MSE→canvas black limitation.
 */
export type DualMode = 'shaka-mp4' | 'shaka-canvas' | 'hybrid' | 'dual-mse' | 'dual-native'

export const DUAL_MODE: DualMode = 'shaka-mp4'

export const ENABLED_PANES = {
  left: true,
  right: true,
} as const

/** Delay before starting the second pane (after first `playing`). */
export const SECOND_PLAYER_DELAY_MS = 3000

/** Cap Shaka ABR height so the MSE session stays light. */
export const PLAYER_MAX_HEIGHT = 360
