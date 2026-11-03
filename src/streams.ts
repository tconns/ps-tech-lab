/** Hardcoded Google / Shaka demo assets for the PS5 lab */
export const STREAMS = {
  /** Main Shaka MSE stream (DASH) */
  mainDash: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  /** Static poster for the non-decoding right pane */
  sidePoster: 'https://peach.blender.org/wp-content/uploads/poster_bunny_big.jpg',
} as const

/** Cap Shaka ABR height to keep the single MSE session light on PS5. */
export const PLAYER_MAX_HEIGHT = 360
