import { useCallback, useEffect, useState } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
import { PlayerPane } from '../components/PlayerPane'
import { isPs5Runtime } from '../device'
import { LabTraceOverlay } from '../lab/LabTraceOverlay'
import { labTrace } from '../lab/labTrace'
import { ENABLED_PANES, SECOND_PLAYER_DELAY_MS, STREAMS } from '../streams'

/**
 * PS5 WebKit often only sustains one healthy MSE/decoder session if both
 * players race at mount. Strategy: start left → onPlaying → wait → start right.
 */
export function DualPlayerPage() {
  const [rightActive, setRightActive] = useState(false)

  useEffect(() => {
    const detected = PlatformDetector.detect()
    labTrace('page', 'DualPlayer mounted', {
      platform: detected.platform,
      isPs5Runtime: isPs5Runtime(),
      enabled: ENABLED_PANES,
      secondDelayMs: SECOND_PLAYER_DELAY_MS,
    })
  }, [])

  const onLeftPlaying = useCallback(() => {
    if (!ENABLED_PANES.right) {
      labTrace('gate', 'right pane disabled — skip second player')
      return
    }
    labTrace('gate', `left playing — arm right in ${SECOND_PLAYER_DELAY_MS}ms`)
    window.setTimeout(() => {
      labTrace('gate', 'activate right player')
      setRightActive(true)
    }, SECOND_PLAYER_DELAY_MS)
  }, [])

  const onRightPlaying = useCallback(() => {
    labTrace('gate', 'both players reported playing')
  }, [])

  const onLeftError = useCallback((message: string) => {
    labTrace('gate', 'left error', message)
  }, [])

  const onRightError = useCallback((message: string) => {
    labTrace('gate', 'right error', message)
  }, [])

  return (
    <>
      <main className="dual">
        {ENABLED_PANES.left ? (
          <PlayerPane
            src={STREAMS.left}
            label="left"
            active
            onPlaying={onLeftPlaying}
            onError={onLeftError}
          />
        ) : (
          <div className="pane pane--off">left off</div>
        )}
        {ENABLED_PANES.right ? (
          <PlayerPane
            src={STREAMS.right}
            label="right"
            active={rightActive}
            onPlaying={onRightPlaying}
            onError={onRightError}
          />
        ) : (
          <div className="pane pane--off">right off</div>
        )}
      </main>
      <LabTraceOverlay />
    </>
  )
}
