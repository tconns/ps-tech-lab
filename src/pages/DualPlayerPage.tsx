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
 * Default `shaka-mp4`: left Shaka MSE; right progressive MP4 native (no 2nd MSE).
 * Canvas mirror of MSE is documented black on this PS5 (`shaka-canvas`).
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
      labTrace('gate', 'shaka playing — canvas path (expect black frames on PS5)')
      return
    }
    if (!ENABLED_PANES.right) {
      labTrace('gate', 'right pane disabled')
      return
    }
    labTrace('gate', `left playing — arm right (${DUAL_MODE}) in ${SECOND_PLAYER_DELAY_MS}ms`)
    window.setTimeout(() => {
      labTrace('gate', 'activate right player')
      setRightActive(true)
    }, SECOND_PLAYER_DELAY_MS)
  }, [])

  const onRightPlaying = useCallback(() => {
    labTrace('gate', `both panes reported playing (mode=${DUAL_MODE}) — watch left for 3015`)
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
  } else if (DUAL_MODE === 'shaka-mp4' || DUAL_MODE === 'hybrid') {
    right = (
      <NativePlayerPane
        src={DUAL_MODE === 'shaka-mp4' ? STREAMS.rightMp4 : STREAMS.rightHls}
        kind={DUAL_MODE === 'shaka-mp4' ? 'mp4' : 'hls'}
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
