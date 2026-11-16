/**
 * Live HLS policy for the PS5 lab — adapted from
 * `fast-media-player` `buildLivePlayerConfig` (live-channel, isPS5=true).
 *
 * Goal: stay ~15s behind the live edge (not edge-chasing), with a fat buffer.
 */

/** Assumed media segment length (s). */
export const SEGMENT_DURATION_SEC = 4

/** Target distance from the live edge (s). */
export const LIVE_TARGET_LATENCY_SEC = 15

const MANIFEST_REQUEST_TIMEOUT_MS = 30_000
export const SEGMENT_REQUEST_TIMEOUT_MS = 3 * SEGMENT_DURATION_SEC * 1000
export const SEGMENT_MAX_ATTEMPTS = 2
export const STALL_THRESHOLD_SEC = 1

function retryParameters(maxAttempts: number, timeout: number): Record<string, number> {
  return {
    maxAttempts,
    stallTimeout: 5000,
    connectionTimeout: 10000,
    baseDelay: 100,
    backoffFactor: 2,
    fuzzFactor: 0.5,
    timeout,
  }
}

export type BuildLivePlayerConfigOptions = {
  maxHeight: number
  /** Clear lab stream — ignore DRM signaling in the master. */
  ignoreDrmInfo?: boolean
}

/** Partial `player.configure` payload for live HLS on PS5. */
export function buildLivePlayerConfig({
  maxHeight,
  ignoreDrmInfo = true,
}: BuildLivePlayerConfigOptions): Record<string, unknown> {
  return {
    streaming: {
      // Lab stream is clear HLS; keep MSE like FMP live-channel (not Safari native).
      preferNativeHls: false,
      fallbackToNativeHlsOnMseError: true,
      bufferingGoal: 30,
      rebufferingGoal: 2,
      bufferBehind: 4,
      startAtSegmentBoundary: true,
      crossBoundaryStrategy: 'keep',
      allowMediaSourceRecoveries: true,
      lowLatencyMode: false,
      // PS-9397: 0 avoids fetching the segment that ends at playhead (fast flash).
      inaccurateManifestTolerance: 0,
      stallEnabled: true,
      stallThreshold: STALL_THRESHOLD_SEC,
      stallSkip: 0.1,
      safeSeekOffset: 5,
      gapDetectionThreshold: 0.5,
      updateIntervalSeconds: 3,
      ignoreTextStreamFailures: true,
      retryParameters: retryParameters(SEGMENT_MAX_ATTEMPTS, SEGMENT_REQUEST_TIMEOUT_MS),
      maxDisabledTime: 30,
      returnToEndOfLiveWindowWhenOutside: true,
      liveSync: {
        enabled: true,
        targetLatency: LIVE_TARGET_LATENCY_SEC,
        targetLatencyTolerance: 3,
        maxPlaybackRate: 1.1,
        minPlaybackRate: 1,
        panicMode: true,
        panicThreshold: 60,
      },
    },
    abr: {
      enabled: true,
      defaultBandwidthEstimate: 1_000_000,
      switchInterval: 8,
      bandwidthUpgradeTarget: 0.85,
      bandwidthDowngradeTarget: 0.9,
      restrictToScreenSize: true,
      restrictToElementSize: true,
      restrictions: { maxHeight },
    },
    restrictions: { maxHeight },
    manifest: {
      disableText: true,
      disableThumbnails: true,
      defaultPresentationDelay: LIVE_TARGET_LATENCY_SEC,
      ignoreDrmInfo,
      retryParameters: retryParameters(3, MANIFEST_REQUEST_TIMEOUT_MS),
      hls: {
        sequenceMode: false,
        liveSegmentsDelay: LIVE_TARGET_LATENCY_SEC,
        allowLowLatencyByteRangeOptimization: false,
        ignoreTextStreamFailures: true,
      },
    },
    mediaSource: {
      forceTransmux: false,
      codecSwitchingStrategy: 'reload',
    },
    preferredAudioCodecs: ['mp4a.40.2'],
  }
}
