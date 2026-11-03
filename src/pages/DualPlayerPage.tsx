import { useCallback, useEffect, useState } from 'react'
import { PlatformDetector } from '@osiris-smarttv/device'
import { PlayerPane } from '../components/PlayerPane'
import { TelemetryPreviewPane } from '../components/TelemetryPreviewPane'
import { isPs5Runtime } from '../device'
import { LabTraceOverlay } from '../lab/LabTraceOverlay'
import { labTrace } from '../lab/labTrace'
import { PLAYER_MAX_HEIGHT, STREAMS } from '../streams'

/**
 * PS5-safe dual pane (see docs/PS5-DUAL-PLAYER-FINDINGS.md):
 * - left: one Shaka MSE player
 * - right: poster + telemetry (no 2nd video decode — dual decode is impossible here)
 */
export function DualPlayerPage() {
  const [shakaVideo, setShakaVideo] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    const detected = PlatformDetector.detect()
    labTrace('page', 'DualPlayer mounted (PS5-safe telemetry mode)', {
      platform: detected.platform,
      isPs5Runtime: isPs5Runtime(),
      maxHeight: PLAYER_MAX_HEIGHT,
      note: 'Dual live decode not supported — see docs/PS5-DUAL-PLAYER-FINDINGS.md',
    })
  }, [])

  const onVideoElement = useCallback((video: HTMLVideoElement | null) => {
    setShakaVideo(video)
  }, [])

  const onPlaying = useCallback(() => {
    labTrace('gate', 'shaka playing — right pane is poster/telemetry only')
  }, [])

  const onError = useCallback((message: string) => {
    labTrace('gate', 'shaka error', message)
  }, [])

  return (
    <>
      <main className="dual">
        <PlayerPane
          src={STREAMS.mainDash}
          label="main"
          active
          onPlaying={onPlaying}
          onError={onError}
          onVideoElement={onVideoElement}
        />
        <TelemetryPreviewPane
          source={shakaVideo}
          label="side"
          posterUrl={STREAMS.sidePoster}
        />
      </main>
      <LabTraceOverlay />
    </>
  )
}
