import { useEffect } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
import { PlayerPane } from '../components/PlayerPane'
import { isPs5Runtime } from '../device'
import { STREAMS } from '../streams'

export function DualPlayerPage() {
  useEffect(() => {
    const detected = PlatformDetector.detect()
    console.log('[Lab] DualPlayer mounted', {
      platform: detected.platform,
      isPs5Runtime: isPs5Runtime(),
    })
  }, [])

  return (
    <main className="dual">
      <PlayerPane src={STREAMS.left} />
      <PlayerPane src={STREAMS.right} />
    </main>
  )
}
