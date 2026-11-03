import { useEffect } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
import { PlayerPane } from '../components/PlayerPane'
import { isPs5Runtime } from '../device'
import { ENABLED_PANES, STREAMS } from '../streams'

export function DualPlayerPage() {
  useEffect(() => {
    const detected = PlatformDetector.detect()
    console.log('[Lab] DualPlayer mounted', {
      platform: detected.platform,
      isPs5Runtime: isPs5Runtime(),
      enabled: ENABLED_PANES,
    })
  }, [])

  return (
    <main className="dual">
      {ENABLED_PANES.left ? (
        <PlayerPane src={STREAMS.left} label="left" />
      ) : (
        <div className="pane pane--off">left off</div>
      )}
      {ENABLED_PANES.right ? (
        <PlayerPane src={STREAMS.right} label="right" />
      ) : (
        <div className="pane pane--off">right off</div>
      )}
    </main>
  )
}
