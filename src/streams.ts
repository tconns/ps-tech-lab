/** Hardcoded Google / Shaka demo manifests + assets for PS5 lab modes */
export const STREAMS = {
  leftDash: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  rightDash: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
  leftHls: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/hls.m3u8',
  rightHls: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
  rightMp4: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  leftMp4: 'https://www.w3schools.com/html/mov_bbb.mp4',
  rightPoster: 'https://peach.blender.org/wp-content/uploads/poster_bunny_big.jpg',
  /**
   * Small on-demand H.264 MP4 (144p) for WebCodecs segment→canvas preview (approach C).
   * Different file from left ABR ladder but same title family — fine for decoder-conflict test.
   */
  previewSegment:
    'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/v-0144p-0100k-libx264.mp4',
} as const

/**
 * PS5 findings + experiment modes.
 * Default `shaka-webcodecs`: left Shaka; right = mp4box+WebCodecs→canvas (no 2nd `<video>`).
 */
export type DualMode =
  | 'shaka-webcodecs'
  | 'shaka-telemetry'
  | 'shaka-mp4'
  | 'shaka-canvas'
  | 'hybrid'
  | 'dual-mse'
  | 'dual-native'

export const DUAL_MODE: DualMode = 'shaka-webcodecs'

export const ENABLED_PANES = {
  left: true,
  right: true,
} as const

export const SECOND_PLAYER_DELAY_MS = 3000

export const PLAYER_MAX_HEIGHT = 360
