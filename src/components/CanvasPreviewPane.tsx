import { useEffect, useRef, useState } from 'react'
import { labTrace } from '../lab/labTrace'

type CanvasPreviewPaneProps = {
  /** Shared Shaka `<video>` — same decoder, canvas only paints pixels. */
  source: HTMLVideoElement | null
  label?: string
}

type Status = 'waiting' | 'painting' | 'error'

/**
 * Second pane without a second MSE/decoder: `drawImage` from the main video.
 * On PS5 this is the workable dual-pane pattern (mirror / preview only).
 */
export function CanvasPreviewPane({ source, label = 'canvas' }: CanvasPreviewPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!source) {
      setStatus('waiting')
      labTrace(label, 'waiting for shaka video element')
      return
    }

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      const msg = '2d context unavailable'
      setStatus('error')
      setError(msg)
      labTrace(label, msg)
      return
    }

    let raf = 0
    let running = true
    let painted = false

    const resize = () => {
      const w = canvas.clientWidth || 640
      const h = canvas.clientHeight || 360
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const tick = () => {
      if (!running) return
      resize()
      try {
        if (source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
          if (!painted) {
            painted = true
            setStatus('painting')
            labTrace(label, 'first frame painted from shaka video')
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setStatus('error')
        setError(msg)
        labTrace(label, `drawImage failed: ${msg}`, err)
        return
      }
      raf = requestAnimationFrame(tick)
    }

    labTrace(label, 'start rAF drawImage loop from shaka video')
    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      labTrace(label, 'stop canvas preview loop')
    }
  }, [source, label])

  return (
    <div className="pane">
      <canvas ref={canvasRef} className="pane__canvas" />
      <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
        <strong>{label}</strong>
        <span>{status}</span>
        <span className="pane__engine">canvas preview</span>
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
