import { useEffect, useRef, useState } from 'react'
import { labTrace } from '../lab/labTrace'
import { playSegmentOnCanvas } from '../player/decodeSegmentPreview'

type SegmentCanvasPreviewPaneProps = {
  src: string
  label?: string
  /** When false, wait (e.g. until Shaka is playing) before starting playback. */
  active?: boolean
}

type Status = 'idle' | 'loading' | 'playing' | 'error'

/**
 * Approach C (playable): fMP4 → mp4box → WebCodecs → canvas, looping.
 * Not a still thumb — continuous decode/present without a 2nd `<video>`.
 */
export function SegmentCanvasPreviewPane({
  src,
  label = 'webcodecs',
  active = true,
}: SegmentCanvasPreviewPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>(active ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<string>('')

  useEffect(() => {
    if (!active) {
      setStatus('idle')
      setError(null)
      labTrace(label, 'inactive — waiting for start gate')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    let stopped = false
    let stopPlayer: (() => void) | null = null
    setStatus('loading')
    setError(null)
    labTrace(label, 'start playable segment→WebCodecs→canvas', {
      hasVideoDecoder: typeof (globalThis as { VideoDecoder?: unknown }).VideoDecoder === 'function',
    })

    void playSegmentOnCanvas(src, canvas, { label })
      .then((handle) => {
        if (stopped) {
          handle.stop()
          return
        }
        stopPlayer = handle.stop
        setStatus('playing')
        setMeta(
          `${handle.meta.codec} ${handle.meta.width}x${handle.meta.height} ${handle.meta.durationSec.toFixed(1)}s loop`,
        )
        labTrace(label, 'canvas player running', handle.meta)
      })
      .catch((err) => {
        if (stopped) return
        const msg = err instanceof Error ? err.message : String(err)
        setStatus('error')
        setError(msg)
        labTrace(label, `canvas player failed: ${msg}`, err)
      })

    return () => {
      stopped = true
      stopPlayer?.()
      labTrace(label, 'cleanup canvas player')
    }
  }, [src, label, active])

  return (
    <div className="pane">
      <canvas ref={canvasRef} className="pane__canvas" />
      <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
        <strong>{label}</strong>
        <span>{status}</span>
        <span className="pane__engine">webcodecs play</span>
        {meta ? <span>{meta}</span> : null}
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
