/** Hardcoded Google / Shaka demo manifests + assets for PS5 lab modes */
export const STREAMS = {
  leftDash: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  rightDash: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
  leftHls: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/hls.m3u8',
  rightHls: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
  rightMp4: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  leftMp4: 'https://www.w3schools.com/html/mov_bbb.mp4',
  /** Static poster for decoder-safe right pane (image, not video) */
  rightPoster: 'https://peach.blender.org/wp-content/uploads/poster_bunny_big.jpg',
} as const

/**
 * PS5 FW 13 lab conclusions (reproduced on device):
 * 1. Dual Shaka MSE → both "playing" then 3015 MEDIA_SOURCE_OPERATION_THREW
 * 2. captureStream missing; canvas drawImage from MSE → black frames
 * 3. Starting a 2nd progressive MP4 while Shaka plays → left 3015 "Media failed to decode"
 *    immediately; right often fails too (videoWidth 0). **One HW video decoder.**
 *
 * Safe dual-*pane* (default `shaka-telemetry`):
 * - left: Shaka MSE (real decode)
 * - right: poster + live telemetry from the same `<video>` (no 2nd decode)
 *
 * Experiment modes kept: shaka-mp4 | shaka-canvas | dual-mse | hybrid | dual-native
 */
export type DualMode =
  | 'shaka-telemetry'
  | 'shaka-mp4'
  | 'shaka-canvas'
  | 'hybrid'
  | 'dual-mse'
  | 'dual-native'

export const DUAL_MODE: DualMode = 'shaka-telemetry'

export const ENABLED_PANES = {
  left: true,
  right: true,
} as const

export const SECOND_PLAYER_DELAY_MS = 3000

export const PLAYER_MAX_HEIGHT = 360
