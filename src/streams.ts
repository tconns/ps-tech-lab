/** Hardcoded Google / Shaka demo DASH manifests */
export const STREAMS = {
  left: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
  right: 'https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd',
} as const

/** Lab debug: only one pane until dual-player is stable on PS5. */
export const ENABLED_PANES = {
  left: true,
  right: false,
} as const
