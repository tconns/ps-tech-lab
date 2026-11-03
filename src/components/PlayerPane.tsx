import { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player'
import { labTrace } from '../lab/labTrace'
import { formatShakaError, shakaErrorPayload } from '../player/shakaError'
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
  /** Expose the underlying video for canvas preview (same decoder). */
  onVideoElement?: (video: HTMLVideoElement | null) => void
}

type Status = 'idle' | 'boot' | 'loading' | 'playing' | 'error'

export function PlayerPane({
  src,
  label = 'player',
  active = true,
  onPlaying,
  onError,
  onVideoElement,
}: PlayerPaneProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>(active ? 'boot' : 'idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onVideoElement?.(videoRef.current)
    return () => onVideoElement?.(null)
  }, [onVideoElement])

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
    labTrace(label, 'create player + strip-audio filter (MSE)')

    const onShakaError = (event: Event) => {
      const detail = (event as CustomEvent).detail
      const payload = shakaErrorPayload(detail)
      labTrace(label, `shaka error event ${formatShakaError(detail)}`, payload)
      if (detail?.code === 3015) {
        labTrace(
          label,
          '3015 MEDIA_SOURCE_OPERATION_THREW — PS5 often cannot sustain this MSE op (esp. with a 2nd decoder/MSE)',
        )
      }
    }
    player.addEventListener('error', onShakaError)

    const start = async () => {
      try {
        player.configure({
          abr: { enabled: true },
          restrictions: { maxHeight: PLAYER_MAX_HEIGHT },
          streaming: {
            bufferingGoal: 6,
            rebufferingGoal: 1,
            bufferBehind: 3,
          },
        })
        labTrace(label, `configure maxHeight=${PLAYER_MAX_HEIGHT}`)

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

        labTrace(label, 'playing (shaka/mse)')
        setStatus('playing')
        onPlaying?.()
      } catch (err) {
        if (cancelled) return
        const msg = formatShakaError(err)
        labTrace(label, `load failed: ${msg}`, shakaErrorPayload(err))
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
        <span className="pane__engine">shaka/mse</span>
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
