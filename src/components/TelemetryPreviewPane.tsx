import { useEffect, useState } from 'react'
import { labTrace } from '../lab/labTrace'

type TelemetryPreviewPaneProps = {
  source: HTMLVideoElement | null
  label?: string
  posterUrl?: string
}

type Snapshot = {
  currentTime: number
  duration: number
  videoWidth: number
  videoHeight: number
  paused: boolean
  readyState: number
}

/**
 * Right pane that never opens a 2nd decoder: poster + live telemetry from the
 * Shaka `<video>`. PS5 evidence: any 2nd `<video>` (MSE or MP4) triggers left 3015.
 */
export function TelemetryPreviewPane({
  source,
  label = 'preview',
  posterUrl,
}: TelemetryPreviewPaneProps) {
  const [snap, setSnap] = useState<Snapshot | null>(null)

  useEffect(() => {
    if (!source) {
      setSnap(null)
      labTrace(label, 'waiting for shaka video (telemetry only — no 2nd decoder)')
      return
    }

    labTrace(label, 'telemetry preview armed (PS5-safe: no 2nd video decode)')

    const read = () => {
      setSnap({
        currentTime: source.currentTime,
        duration: source.duration,
        videoWidth: source.videoWidth,
        videoHeight: source.videoHeight,
        paused: source.paused,
        readyState: source.readyState,
      })
    }

    read()
    const id = window.setInterval(read, 500)
    source.addEventListener('timeupdate', read)
    source.addEventListener('loadedmetadata', read)
    source.addEventListener('playing', read)
    source.addEventListener('pause', read)

    return () => {
      window.clearInterval(id)
      source.removeEventListener('timeupdate', read)
      source.removeEventListener('loadedmetadata', read)
      source.removeEventListener('playing', read)
      source.removeEventListener('pause', read)
    }
  }, [source, label])

  return (
    <div className="pane pane--telemetry">
      {posterUrl ? (
        <img className="pane__poster" src={posterUrl} alt="" />
      ) : (
        <div className="pane__poster pane__poster--fallback" />
      )}
      <div className="pane__hud pane__hud--telemetry" aria-live="polite">
        <strong>{label}</strong>
        <span className="pane__engine">no 2nd decoder</span>
        <span>PS5: 1 HW video decoder — 2nd video kills Shaka (3015)</span>
        {snap ? (
          <>
            <span>
              t={snap.currentTime.toFixed(1)}s /{' '}
              {Number.isFinite(snap.duration) ? `${snap.duration.toFixed(1)}s` : '—'}
            </span>
            <span>
              {snap.videoWidth}×{snap.videoHeight} readyState={snap.readyState}{' '}
              {snap.paused ? 'paused' : 'playing'}
            </span>
          </>
        ) : (
          <span>waiting for shaka…</span>
        )}
      </div>
    </div>
  )
}
