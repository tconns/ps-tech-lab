import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
import { CanvasPreviewPane } from '../components/CanvasPreviewPane'
import { NativePlayerPane } from '../components/NativePlayerPane'
import { PlayerPane } from '../components/PlayerPane'
import { SegmentCanvasPreviewPane } from '../components/SegmentCanvasPreviewPane'
import { TelemetryPreviewPane } from '../components/TelemetryPreviewPane'
import { isPs5Runtime } from '../device'
import { canSoftDecodePreview, probeLabCapabilities } from '../lab/capabilities'
import { LabTraceOverlay } from '../lab/LabTraceOverlay'
import { labTrace } from '../lab/labTrace'
import {
  DUAL_MODE,
  ENABLED_PANES,
  SECOND_PLAYER_DELAY_MS,
  STREAMS,
  type DualMode,
} from '../streams'

function resolveMode(requested: DualMode): DualMode {
  if (requested !== 'shaka-webcodecs') return requested
  if (canSoftDecodePreview()) return requested
  labTrace(
    'caps',
    'shaka-webcodecs unavailable (no WASM / VideoDecoder) — falling back to shaka-telemetry',
  )
  return 'shaka-telemetry'
}

/**
 * Dual-pane lab for PS5.
 * Default safe mode: Shaka + telemetry/poster (no 2nd decoder / WASM / WebCodecs).
 */
export function DualPlayerPage() {
  const mode = useMemo(() => resolveMode(DUAL_MODE), [])
  const needsGate = mode !== 'shaka-telemetry' && mode !== 'shaka-canvas'
  const [rightActive, setRightActive] = useState(!needsGate)
  const [shakaVideo, setShakaVideo] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    const caps = probeLabCapabilities()
    const detected = PlatformDetector.detect()
    labTrace('page', 'DualPlayer mounted', {
      platform: detected.platform,
      isPs5Runtime: isPs5Runtime(),
      requestedMode: DUAL_MODE,
      effectiveMode: mode,
      caps,
      enabled: ENABLED_PANES,
      secondDelayMs: SECOND_PLAYER_DELAY_MS,
    })
  }, [mode])

  const onVideoElement = useCallback((video: HTMLVideoElement | null) => {
    setShakaVideo(video)
    labTrace('page', video ? 'shaka video element ready' : 'shaka video element cleared')
  }, [])

  const onLeftPlaying = useCallback(() => {
    if (!needsGate) {
      labTrace('gate', `shaka playing — right pane is ${mode}`)
      return
    }
    if (!ENABLED_PANES.right) return
    labTrace('gate', `left playing — arm right (${mode}) in ${SECOND_PLAYER_DELAY_MS}ms`)
    window.setTimeout(() => {
      labTrace('gate', 'activate right preview/player')
      setRightActive(true)
    }, SECOND_PLAYER_DELAY_MS)
  }, [needsGate, mode])

  const onRightPlaying = useCallback(() => {
    labTrace('gate', `both panes reported playing (mode=${mode})`)
  }, [mode])

  const onLeftError = useCallback((message: string) => {
    labTrace('gate', 'left error', message)
  }, [])

  const onRightError = useCallback((message: string) => {
    labTrace('gate', 'right error', message)
  }, [])

  const shareVideo = mode === 'shaka-telemetry' || mode === 'shaka-canvas'

  const left =
    mode === 'dual-native' ? (
      <NativePlayerPane
        src={STREAMS.leftMp4}
        kind="mp4"
        label="left"
        active
        onPlaying={onLeftPlaying}
        onError={onLeftError}
      />
    ) : (
      <PlayerPane
        src={STREAMS.leftDash}
        label="left"
        active
        onPlaying={onLeftPlaying}
        onError={onLeftError}
        onVideoElement={shareVideo ? onVideoElement : undefined}
      />
    )

  let right: React.ReactNode
  if (mode === 'shaka-webcodecs') {
    right = (
      <SegmentCanvasPreviewPane
        src={STREAMS.previewSegment}
        label="right"
        active={rightActive}
      />
    )
  } else if (mode === 'shaka-telemetry') {
    right = (
      <TelemetryPreviewPane
        source={shakaVideo}
        label="right"
        posterUrl={STREAMS.rightPoster}
      />
    )
  } else if (mode === 'shaka-canvas') {
    right = <CanvasPreviewPane source={shakaVideo} label="right" />
  } else if (mode === 'dual-mse') {
    right = (
      <PlayerPane
        src={STREAMS.rightDash}
        label="right"
        active={rightActive}
        onPlaying={onRightPlaying}
        onError={onRightError}
      />
    )
  } else if (mode === 'shaka-mp4' || mode === 'hybrid') {
    right = (
      <NativePlayerPane
        src={mode === 'shaka-mp4' ? STREAMS.rightMp4 : STREAMS.rightHls}
        kind={mode === 'shaka-mp4' ? 'mp4' : 'hls'}
        label="right"
        active={rightActive}
        onPlaying={onRightPlaying}
        onError={onRightError}
      />
    )
  } else {
    right = (
      <NativePlayerPane
        src={STREAMS.rightMp4}
        kind="mp4"
        label="right"
        active={rightActive}
        onPlaying={onRightPlaying}
        onError={onRightError}
      />
    )
  }

  return (
    <>
      <main className="dual">
        {ENABLED_PANES.left ? left : <div className="pane pane--off">left off</div>}
        {ENABLED_PANES.right ? right : <div className="pane pane--off">right off</div>}
      </main>
      <LabTraceOverlay />
    </>
  )
}
