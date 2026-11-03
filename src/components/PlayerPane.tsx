import { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player'
import { labTrace } from '../lab/labTrace'
import { installShakaPolyfills } from '../player/installShakaPolyfills'
import { registerStripAudioNetworkFilter } from '../player/registerStripAudioNetworkFilter'
import { PLAYER_MAX_HEIGHT } from '../streams'

type PlayerPaneProps = {
  src: string
  label?: string
  /** When false, mount the pane shell but do not create Shaka / MSE yet. */
  active?: boolean
  onPlaying?: () => void
  onError?: (message: string) => void
}

type Status = 'idle' | 'boot' | 'loading' | 'playing' | 'error'

function formatShakaError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const e = err as { code?: number; message?: string; data?: unknown[] }
    return `shaka ${e.code ?? '?'} ${e.message ?? ''} ${JSON.stringify(e.data ?? [])}`
  }
  if (err instanceof Error) return err.message
  return String(err)
}

export function PlayerPane({
  src,
  label = 'player',
  active = true,
  onPlaying,
  onError,
}: PlayerPaneProps) {
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

    installShakaPolyfills()

    if (!shaka.Player.isBrowserSupported()) {
      const msg = 'Shaka Player is not supported in this browser'
      labTrace(label, msg)
      setStatus('error')
      setError(msg)
      onError?.(msg)
      return
    }

    const player = new shaka.Player()
    registerStripAudioNetworkFilter(player)
    let cancelled = false
    setStatus('loading')
    setError(null)
    labTrace(label, 'create player + strip-audio filter')

    const onShakaError = (event: Event) => {
      const detail = (event as CustomEvent).detail
      labTrace(label, 'shaka error event', detail)
    }
    player.addEventListener('error', onShakaError)

    const start = async () => {
      try {
        player.configure({
          abr: { enabled: true },
          restrictions: { maxHeight: PLAYER_MAX_HEIGHT },
          streaming: {
            bufferingGoal: 10,
            rebufferingGoal: 2,
            bufferBehind: 5,
          },
        })
        labTrace(label, `configure maxHeight=${PLAYER_MAX_HEIGHT}`)

        // Defer MSE init until load() — same pattern as react-playstation ShakaEngine.
        labTrace(label, 'attach(video, initializeMediaSource=false)')
        await player.attach(video, /* initializeMediaSource */ false)
        if (cancelled) return

        labTrace(label, 'load manifest', src)
        await player.load(src)
        if (cancelled) return

        const variants = player.getVariantTracks()
        labTrace(label, `loaded variants=${variants.length}`, {
          variants: variants.map((v) => ({
            id: v.id,
            h: v.height,
            w: v.width,
            bandwidth: v.bandwidth,
            audioId: v.audioId,
          })),
        })

        video.muted = true
        video.loop = true
        labTrace(label, 'play()')
        await video.play()
        if (cancelled) return

        labTrace(label, 'playing')
        setStatus('playing')
        onPlaying?.()
      } catch (err) {
        if (cancelled) return
        const msg = formatShakaError(err)
        labTrace(label, `load failed: ${msg}`, err)
        setStatus('error')
        setError(msg)
        onError?.(msg)
      }
    }

    void start()

    return () => {
      cancelled = true
      labTrace(label, 'cleanup destroy()')
      player.removeEventListener('error', onShakaError)
      void player.destroy()
    }
  }, [src, label, active, onPlaying, onError])

  return (
    <div className="pane">
      <video ref={videoRef} playsInline muted autoPlay />
      <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
        <strong>{label}</strong>
        <span>{status}</span>
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
