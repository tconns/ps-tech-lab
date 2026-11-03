import { useEffect, useRef, useState } from 'react'
import { labTrace } from '../lab/labTrace'
import { decodeSegmentPreviewToCanvas } from '../player/decodeSegmentPreview'

type SegmentCanvasPreviewPaneProps = {
  src: string
  label?: string
  /** When false, wait (e.g. until Shaka is playing) before decoding. */
  active?: boolean
}

type Status = 'idle' | 'loading' | 'ok' | 'error'

/**
 * Approach C: fetch fMP4 → mp4box → WebCodecs → canvas (no 2nd `<video>`).
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

    let cancelled = false
    setStatus('loading')
    setError(null)
    labTrace(label, 'start segment→WebCodecs→canvas', {
      hasVideoDecoder: typeof (globalThis as { VideoDecoder?: unknown }).VideoDecoder === 'function',
    })

    void decodeSegmentPreviewToCanvas(src, canvas, { maxFrames: 1, label })
      .then((result) => {
        if (cancelled) return
        setStatus('ok')
        setMeta(`${result.codec} ${result.width}x${result.height} frames=${result.frames}`)
        labTrace(label, 'preview ok', result)
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setStatus('error')
        setError(msg)
        labTrace(label, `preview failed: ${msg}`, err)
      })

    return () => {
      cancelled = true
      labTrace(label, 'cleanup segment preview')
    }
  }, [src, label, active])

  return (
    <div className="pane">
      <canvas ref={canvasRef} className="pane__canvas" />
      <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
        <strong>{label}</strong>
        <span>{status}</span>
        <span className="pane__engine">mp4box+webcodecs</span>
        {meta ? <span>{meta}</span> : null}
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
