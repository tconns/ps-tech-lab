/** Hardcoded Google / Shaka demo manifests + assets for PS5 lab modes */
export const STREAMS = {
  leftDash: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  rightDash: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
  leftHls: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/hls.m3u8',
  rightHls: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
  rightMp4: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  leftMp4: 'https://www.w3schools.com/html/mov_bbb.mp4',
  rightPoster: 'https://peach.blender.org/wp-content/uploads/poster_bunny_big.jpg',
  previewSegment:
    'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/v-0144p-0100k-libx264.mp4',
} as const

/**
 * PS5 WebView lab conclusions (device-proven):
 * - 1 HW video decoder: 2nd `<video>` (MSE or MP4) → left 3015
 * - no captureStream; MSE→canvas drawImage = black frames
 * - no WebCodecs VideoDecoder
 * - no WebAssembly → TinyH264/WASM soft-decode also impossible
 *
 * Safe dual-*pane* default: `shaka-telemetry` (Shaka + poster/telemetry).
 * Dual live video decode is not available on this runtime.
 */
export type DualMode =
  | 'shaka-telemetry'
  | 'shaka-webcodecs'
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
