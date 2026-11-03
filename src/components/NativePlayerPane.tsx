import { useEffect, useRef, useState } from 'react'
import { labTrace } from '../lab/labTrace'
import {
  absolutizeHlsPlaylist,
  stripAudioFromManifestText,
} from '../player/stripAudioFromManifest'

type NativePlayerPaneProps = {
  src: string
  /** Progressive MP4 is preferred on PS5; HLS blob masters are often NotSupported. */
  kind?: 'mp4' | 'hls'
  label?: string
  active?: boolean
  onPlaying?: () => void
  onError?: (message: string) => void
}

type Status = 'idle' | 'boot' | 'loading' | 'playing' | 'error'

/**
 * Native WebKit `<video>` — no Shaka / no second MediaSource.
 */
export function NativePlayerPane({
  src,
  kind = 'mp4',
  label = 'native',
  active = true,
  onPlaying,
  onError,
}: NativePlayerPaneProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>(active ? 'boot' : 'idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) {
      setStatus('idle')
      setError(null)
      labTrace(label, 'inactive — waiting for start gate')
      return
    }

    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let objectUrl: string | null = null
    setStatus('loading')
    setError(null)

    const onVideoError = () => {
      const mediaError = video.error
      const msg = `native video error code=${mediaError?.code ?? '?'} message=${mediaError?.message ?? ''}`
      labTrace(label, msg)
      setStatus('error')
      setError(msg)
      onError?.(msg)
    }

    const onPlayingEvt = () => {
      if (cancelled) return
      labTrace(label, `playing (native ${kind})`, {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      })
      setStatus('playing')
      onPlaying?.()
    }

    video.addEventListener('error', onVideoError)
    video.addEventListener('playing', onPlayingEvt)

    const start = async () => {
      try {
        video.muted = true
        video.loop = true
        video.playsInline = true

        if (kind === 'mp4') {
          labTrace(label, 'set video.src progressive mp4', src)
          video.src = src
          await video.play()
          return
        }

        labTrace(label, 'fetch HLS master for audio strip', src)
        const text = await fetch(src).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.text()
        })
        if (cancelled) return

        const stripped = absolutizeHlsPlaylist(stripAudioFromManifestText(text), src)
        objectUrl = URL.createObjectURL(
          new Blob([stripped], { type: 'application/vnd.apple.mpegurl' }),
        )
        labTrace(label, 'set video.src blob HLS')
        video.src = objectUrl
        await video.play()
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        labTrace(label, `native load failed: ${msg}`, err)
        setStatus('error')
        setError(msg)
        onError?.(msg)
      }
    }

    void start()

    return () => {
      cancelled = true
      labTrace(label, 'cleanup native video')
      video.removeEventListener('error', onVideoError)
      video.removeEventListener('playing', onPlayingEvt)
      video.removeAttribute('src')
      video.srcObject = null
      video.load()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, kind, label, active, onPlaying, onError])

  return (
    <div className="pane">
      <video ref={videoRef} playsInline muted autoPlay preload="metadata" />
      <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
        <strong>{label}</strong>
        <span>{status}</span>
        <span className="pane__engine">native/{kind}</span>
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
