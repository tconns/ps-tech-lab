import { useCallback, useEffect, useState } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
import { CanvasPreviewPane } from '../components/CanvasPreviewPane'
import { NativePlayerPane } from '../components/NativePlayerPane'
import { PlayerPane } from '../components/PlayerPane'
import { isPs5Runtime } from '../device'
import { LabTraceOverlay } from '../lab/LabTraceOverlay'
import { labTrace } from '../lab/labTrace'
import {
  DUAL_MODE,
  ENABLED_PANES,
  SECOND_PLAYER_DELAY_MS,
  STREAMS,
} from '../streams'

/**
 * Dual-pane lab for PS5.
 *
 * Default `shaka-canvas`: one Shaka MSE decoder on the left; right pane paints
 * the same `<video>` onto canvas (preview only — no second decoder).
 */
export function DualPlayerPage() {
  const [rightActive, setRightActive] = useState(DUAL_MODE === 'shaka-canvas')
  const [shakaVideo, setShakaVideo] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    const detected = PlatformDetector.detect()
    labTrace('page', 'DualPlayer mounted', {
      platform: detected.platform,
      isPs5Runtime: isPs5Runtime(),
      mode: DUAL_MODE,
      enabled: ENABLED_PANES,
      secondDelayMs: SECOND_PLAYER_DELAY_MS,
    })
  }, [])

  const onVideoElement = useCallback((video: HTMLVideoElement | null) => {
    setShakaVideo(video)
    labTrace('page', video ? 'shaka video element ready for canvas' : 'shaka video element cleared')
  }, [])

  const onLeftPlaying = useCallback(() => {
    if (DUAL_MODE === 'shaka-canvas') {
      labTrace('gate', 'shaka playing — arm captureStream/canvas preview on same decoder')
      return
    }
    if (!ENABLED_PANES.right) {
      labTrace('gate', 'right pane disabled — skip second player')
      return
    }
    labTrace('gate', `left playing — arm right (${DUAL_MODE}) in ${SECOND_PLAYER_DELAY_MS}ms`)
    window.setTimeout(() => {
      labTrace('gate', 'activate right player')
      setRightActive(true)
    }, SECOND_PLAYER_DELAY_MS)
  }, [])

  const onRightPlaying = useCallback(() => {
    labTrace('gate', `both players reported playing (mode=${DUAL_MODE})`)
  }, [])

  const onLeftError = useCallback((message: string) => {
    labTrace('gate', 'left error', message)
  }, [])

  const onRightError = useCallback((message: string) => {
    labTrace('gate', 'right error', message)
  }, [])

  const left =
    DUAL_MODE === 'dual-native' ? (
      <NativePlayerPane
        src={STREAMS.leftHls}
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
        onVideoElement={DUAL_MODE === 'shaka-canvas' ? onVideoElement : undefined}
      />
    )

  let right: React.ReactNode
  if (DUAL_MODE === 'shaka-canvas') {
    right = <CanvasPreviewPane source={shakaVideo} label="right" />
  } else if (DUAL_MODE === 'dual-mse') {
    right = (
      <PlayerPane
        src={STREAMS.rightDash}
        label="right"
        active={rightActive}
        onPlaying={onRightPlaying}
        onError={onRightError}
      />
    )
  } else {
    right = (
      <NativePlayerPane
        src={STREAMS.rightHls}
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
