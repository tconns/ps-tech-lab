import { useEffect, useRef, useState } from 'react'
import { labTrace } from '../lab/labTrace'

type CanvasPreviewPaneProps = {
  /** Shared Shaka `<video>` — same decoder; preview must not open a 2nd MSE. */
  source: HTMLVideoElement | null
  label?: string
}

type Status = 'waiting' | 'captureStream' | 'canvas' | 'black' | 'error'

type CaptureVideo = HTMLVideoElement & {
  captureStream?: (frameRate?: number) => MediaStream
  mozCaptureStream?: (frameRate?: number) => MediaStream
}

function isMostlyBlack(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const sample = Math.max(1, Math.floor(Math.min(w, h) / 8))
    const x = Math.floor((w - sample) / 2)
    const y = Math.floor((h - sample) / 2)
    const { data } = ctx.getImageData(x, y, sample, sample)
    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i]! + data[i + 1]! + data[i + 2]!
    }
    const avg = sum / ((data.length / 4) * 3)
    return avg < 4
  } catch {
    // Tainted canvas / blocked read — treat as unreadables frames.
    return true
  }
}

/**
 * Second pane without a second MSE load.
 * Prefer `captureStream()` → preview `<video>`; fall back to canvas drawImage.
 * On PS5, MSE frames often paint black on canvas (overlay decoder) — captureStream is the better path.
 */
export function CanvasPreviewPane({ source, label = 'canvas' }: CanvasPreviewPaneProps) {
  const previewRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!source) {
      setStatus('waiting')
      labTrace(label, 'waiting for shaka video element')
      return
    }

    let cancelled = false
    let raf = 0
    let blackChecks = 0

    const cleanupPreview = () => {
      const preview = previewRef.current
      if (!preview) return
      preview.pause()
      preview.removeAttribute('src')
      preview.srcObject = null
      preview.load()
    }

    const startCanvasFallback = (reason: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
      if (!ctx) {
        setStatus('error')
        setError('2d context unavailable')
        return
      }

      labTrace(label, `canvas fallback (${reason})`)
      setStatus('canvas')
      let painted = false

      const resize = () => {
        const w = Math.max(2, canvas.clientWidth || 640)
        const h = Math.max(2, canvas.clientHeight || 360)
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
      }

      const tick = () => {
        if (cancelled) return
        resize()
        try {
          if (source.videoWidth > 0 && source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
            if (!painted) {
              painted = true
              labTrace(label, 'first canvas drawImage', {
                videoWidth: source.videoWidth,
                videoHeight: source.videoHeight,
                canvas: `${canvas.width}x${canvas.height}`,
              })
            }
            blackChecks += 1
            if (blackChecks === 30 || blackChecks === 90) {
              const black = isMostlyBlack(ctx, canvas.width, canvas.height)
              labTrace(label, `canvas pixel probe #${blackChecks}`, { black })
              if (black) {
                setStatus('black')
                setError('canvas frames are black (PS5 often cannot sample MSE video)')
              }
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

      raf = requestAnimationFrame(tick)
    }

    const startCaptureStream = (): boolean => {
      const preview = previewRef.current
      const src = source as CaptureVideo
      const capture =
        typeof src.captureStream === 'function'
          ? src.captureStream.bind(src)
          : typeof src.mozCaptureStream === 'function'
            ? src.mozCaptureStream.bind(src)
            : null

      if (!preview || !capture) {
        labTrace(label, 'captureStream API missing')
        return false
      }

      try {
        const stream = capture(30)
        preview.muted = true
        preview.playsInline = true
        preview.srcObject = stream
        void preview.play().catch((err) => {
          labTrace(label, 'preview play() failed', err)
        })
        setStatus('captureStream')
        setError(null)
        labTrace(label, 'preview via captureStream (no 2nd MSE load)', {
          tracks: stream.getTracks().map((t) => `${t.kind}:${t.readyState}`),
        })
        return true
      } catch (err) {
        labTrace(label, 'captureStream threw', err)
        return false
      }
    }

    const start = () => {
      if (cancelled) return
      labTrace(label, 'start preview from shaka video', {
        videoWidth: source.videoWidth,
        videoHeight: source.videoHeight,
        readyState: source.readyState,
      })
      if (!startCaptureStream()) {
        startCanvasFallback('no captureStream')
      }
    }

    if (!source.paused && source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      start()
    } else {
      labTrace(label, 'wait for source playing before preview')
      source.addEventListener('playing', start, { once: true })
    }

    return () => {
      cancelled = true
      source.removeEventListener('playing', start)
      cancelAnimationFrame(raf)
      cleanupPreview()
      labTrace(label, 'stop preview')
    }
  }, [source, label])

  return (
    <div className="pane">
      <video ref={previewRef} className="pane__preview" playsInline muted autoPlay />
      <canvas
        ref={canvasRef}
        className="pane__canvas"
        hidden={status === 'captureStream' || status === 'waiting'}
      />
      <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
        <strong>{label}</strong>
        <span>{status}</span>
        <span className="pane__engine">
          {status === 'captureStream' ? 'captureStream' : 'canvas preview'}
        </span>
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
