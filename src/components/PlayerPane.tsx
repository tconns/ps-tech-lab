import { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player'
import { labTrace } from '../lab/labTrace'
import { formatShakaError, shakaErrorPayload } from '../player/shakaError'
import { installShakaPolyfills } from '../player/installShakaPolyfills'
import { PLAYER_MAX_HEIGHT } from '../streams'

const HLS_MIME = 'application/vnd.apple.mpegurl'

type PlayerPaneProps = {
  src: string
  label?: string
  /** When false, mount the pane shell but do not create Shaka / MSE yet. */
  active?: boolean
  /** Keep audio tracks and unmute the element. */
  withAudio?: boolean
  onPlaying?: () => void
  onError?: (message: string) => void
  /** Expose the underlying video for canvas preview (same decoder). */
  onVideoElement?: (video: HTMLVideoElement | null) => void
}

type Status = 'idle' | 'boot' | 'loading' | 'playing' | 'error'

function isHlsUrl(src: string): boolean {
  return /\.m3u8(\?|#|$)/i.test(src)
}

function logCodecSupport(label: string, video: HTMLVideoElement): void {
  const probes = [
    'video/mp4; codecs="avc1.64042a"',
    'video/mp4; codecs="avc1.42E01E"',
    'audio/mp4; codecs="mp4a.40.2"',
    'application/vnd.apple.mpegurl',
  ]
  const mse = typeof MediaSource !== 'undefined' ? MediaSource : null
  labTrace(label, 'codec support', {
    canPlayType: Object.fromEntries(probes.map((type) => [type, video.canPlayType(type)])),
    mseSupported: probes.map((type) => ({
      type,
      ok: mse ? MediaSource.isTypeSupported(type) : false,
    })),
  })
}

export function PlayerPane({
  src,
  label = 'player',
  active = true,
  withAudio = false,
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

    const hls = isHlsUrl(src)
    const player = new shaka.Player()
    let cancelled = false
    setStatus('loading')
    setError(null)
    labTrace(label, hls ? 'create player (HLS m3u8, audio on)' : 'create player (MSE)')
    logCodecSupport(label, video)

    const onShakaError = (event: Event) => {
      const detail = (event as CustomEvent).detail
      const payload = shakaErrorPayload(detail)
      labTrace(label, `shaka error event ${formatShakaError(detail)}`, payload)
      if (detail?.code === 4032) {
        labTrace(label, '4032 CONTENT_UNSUPPORTED_BY_BROWSER — codec/MSE rejected; prefer native HLS on PS5')
      }
      if (detail?.code === 3015) {
        labTrace(label, '3015 MEDIA_SOURCE_OPERATION_THREW — PS5 MSE op failed')
      }
    }
    player.addEventListener('error', onShakaError)

    const start = async () => {
      try {
        player.configure({
          abr: { enabled: true },
          restrictions: { maxHeight: PLAYER_MAX_HEIGHT },
          manifest: {
            disableText: true,
            hls: {
              ignoreTextStreamFailures: true,
              ignoreManifestProgramDateTime: false,
            },
          },
          streaming: {
            bufferingGoal: hls ? 12 : 6,
            rebufferingGoal: hls ? 2 : 1,
            bufferBehind: hls ? 6 : 3,
            // PS5 WebKit: native HLS is more reliable than MSE for m3u8.
            preferNativeHls: hls,
            fallbackToNativeHlsOnMseError: hls,
            lowLatencyMode: false,
            ignoreTextStreamFailures: true,
          },
        })
        labTrace(label, hls ? 'configure HLS native + mime m3u8' : `configure maxHeight=${PLAYER_MAX_HEIGHT}`, {
          preferNativeHls: hls,
          mime: hls ? HLS_MIME : undefined,
          maxHeight: PLAYER_MAX_HEIGHT,
        })

        labTrace(label, 'attach(video)')
        await player.attach(video)
        if (cancelled) return

        labTrace(label, 'load manifest', { src, mime: hls ? HLS_MIME : null })
        await player.load(src, /* startTime */ null, hls ? HLS_MIME : undefined)
        if (cancelled) return

        const variants = player.getVariantTracks()
        labTrace(label, `loaded variants=${variants.length} live=${player.isLive()}`, {
          variants: variants.map((v) => ({
            id: v.id,
            h: v.height,
            w: v.width,
            bandwidth: v.bandwidth,
            audioId: v.audioId,
            codecs: v.videoCodec ?? v.audioCodec,
          })),
        })

        video.muted = !withAudio
        video.loop = !hls
        labTrace(label, withAudio ? 'play() with audio' : 'play() muted')
        await video.play()
        if (cancelled) return

        labTrace(label, 'playing')
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
  }, [src, label, active, withAudio, onPlaying, onError])

  return (
    <div className="pane pane--solo">
      <video
        ref={videoRef}
        playsInline
        muted={!withAudio}
        autoPlay
        crossOrigin="anonymous"
      />
      <div className={`pane__hud pane__hud--${status}`} aria-live="polite">
        <strong>{label}</strong>
        <span>{status}</span>
        <span className="pane__engine">
          shaka{isHlsUrl(src) ? '/hls' : '/mse'}
          {withAudio ? ' · a/v' : ''}
        </span>
        {error ? <span className="pane__err">{error}</span> : null}
      </div>
    </div>
  )
}
