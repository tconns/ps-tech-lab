/** Hardcoded Google / Shaka demo DASH manifests */
export const STREAMS = {
  left: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  right: 'https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd',
} as const

export const ENABLED_PANES = {
  left: true,
  right: true,
} as const

/**
 * PS5 WebKit often fights two concurrent MSE/decoder sessions.
 * Start the second pane only after the first is playing, plus this delay.
 */
export const SECOND_PLAYER_DELAY_MS = 2500

/** Cap resolution so two video-only decoders are more likely to fit. */
export const PLAYER_MAX_HEIGHT = 480
