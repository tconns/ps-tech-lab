import { useCallback, useEffect, useState } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
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
 * Dual playback lab.
 *
 * PS5 logs showed dual Shaka MSE: both reach `playing`, then repeating
 * 3015 MEDIA_SOURCE_OPERATION_THREW. Default `hybrid` keeps one MSE (Shaka)
 * and uses native WebKit HLS for the second pane.
 */
export function DualPlayerPage() {
  const [rightActive, setRightActive] = useState(false)

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

  const onLeftPlaying = useCallback(() => {
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
      />
    )

  const right =
    DUAL_MODE === 'dual-mse' ? (
      <PlayerPane
        src={STREAMS.rightDash}
        label="right"
        active={rightActive}
        onPlaying={onRightPlaying}
        onError={onRightError}
      />
    ) : (
      <NativePlayerPane
        src={STREAMS.rightHls}
        label="right"
        active={rightActive}
        onPlaying={onRightPlaying}
        onError={onRightError}
      />
    )

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
