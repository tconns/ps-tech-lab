/** Hardcoded streams for the PS5 lab */
export const STREAMS = {
  /** Main Shaka MSE stream (HLS live) */
  mainDash:
    'https://pass.madielab.site/pb/p_NWc16CRK9--JQS7KOvZstQEMbUkFluy2FwVC9q0ix50/live/01a1d085-f5f8-73cc-97a1-71c41fa8f583/live.m3u8',
  /** Static poster for the non-decoding right pane */
  sidePoster: 'https://peach.blender.org/wp-content/uploads/poster_bunny_big.jpg',
} as const

/** Cap Shaka ABR height. Allow up to 1080p live. */
export const PLAYER_MAX_HEIGHT = 1080
