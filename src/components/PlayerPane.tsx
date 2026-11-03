import { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player'
import { installShakaPolyfills } from '../player/installShakaPolyfills'
import { registerStripAudioNetworkFilter } from '../player/registerStripAudioNetworkFilter'

type PlayerPaneProps = {
  src: string
  label?: string
}

type Status = 'boot' | 'loading' | 'playing' | 'error'

export function PlayerPane({ src, label = 'player' }: PlayerPaneProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('boot')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    installShakaPolyfills()

    if (!shaka.Player.isBrowserSupported()) {
      const msg = 'Shaka Player is not supported in this browser'
      console.error(`[Lab:${label}]`, msg)
      setStatus('error')
      setError(msg)
      return
    }

    const player = new shaka.Player()
    registerStripAudioNetworkFilter(player)
    let cancelled = false
    setStatus('loading')
    setError(null)

    const start = async () => {
      try {
        console.log(`[Lab:${label}] attach/load`, src)
        await player.attach(video)
        if (cancelled) return
        await player.load(src)
        if (cancelled) return
        video.muted = true
        video.loop = true
        await video.play()
        if (cancelled) return
        console.log(`[Lab:${label}] playing`)
        setStatus('playing')
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Lab:${label}] load failed`, err)
        setStatus('error')
        setError(msg)
      }
    }

    void start()

    return () => {
      cancelled = true
      void player.destroy()
    }
  }, [src, label])

  return (
    <div className="pane">
      <video ref={videoRef} playsInline muted autoPlay />
      {status !== 'playing' ? (
        <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
          <strong>{label}</strong>
          <span>{status}</span>
          {error ? <span className="pane__err">{error}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
