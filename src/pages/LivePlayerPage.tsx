import { useCallback, useEffect } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
import { PlayerPane } from '../components/PlayerPane'
import { isPs5Runtime } from '../device'
import { LabTraceOverlay } from '../lab/LabTraceOverlay'
import { labTrace } from '../lab/labTrace'
import { PLAYER_MAX_HEIGHT, STREAMS } from '../streams'

/** One Shaka player — live HLS with video + audio. */
export function LivePlayerPage() {
  useEffect(() => {
    const detected = PlatformDetector.detect()
    labTrace('page', 'LivePlayer mounted', {
      platform: detected.platform,
      isPs5Runtime: isPs5Runtime(),
      maxHeight: PLAYER_MAX_HEIGHT,
      src: STREAMS.mainDash,
    })
  }, [])

  const onPlaying = useCallback(() => {
    labTrace('gate', 'shaka playing live A/V')
  }, [])

  const onError = useCallback((message: string) => {
    labTrace('gate', 'shaka error', message)
  }, [])

  return (
    <>
      <main className="live">
        <PlayerPane
          src={STREAMS.mainDash}
          label="live"
          active
          withAudio
          onPlaying={onPlaying}
          onError={onError}
        />
      </main>
      <LabTraceOverlay />
    </>
  )
}
