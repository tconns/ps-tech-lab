import { useEffect, useRef } from 'react'
import shaka from 'shaka-player'
import { installShakaPolyfills } from '../player/installShakaPolyfills'
import { registerStripAudioNetworkFilter } from '../player/registerStripAudioNetworkFilter'

type PlayerPaneProps = {
  src: string
}

export function PlayerPane({ src }: PlayerPaneProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    installShakaPolyfills()

    if (!shaka.Player.isBrowserSupported()) {
      console.error('Shaka Player is not supported in this browser')
      return
    }

    const player = new shaka.Player()
    registerStripAudioNetworkFilter(player)
    let cancelled = false

    const start = async () => {
      try {
        await player.attach(video)
        if (cancelled) return
        await player.load(src)
        if (cancelled) return
        video.muted = true
        video.loop = true
        await video.play().catch((err) => {
          console.error('Autoplay failed', err)
        })
      } catch (err) {
        if (!cancelled) console.error('Shaka load failed', err)
      }
    }

    void start()

    return () => {
      cancelled = true
      void player.destroy()
    }
  }, [src])

  return (
    <div className="pane">
      <video ref={videoRef} playsInline muted />
    </div>
  )
}
