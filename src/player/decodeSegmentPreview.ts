import { createFile, DataStream, Endianness, MP4BoxBuffer } from 'mp4box'
import { labTrace } from '../lab/labTrace'

export type SegmentPlayerHandle = {
  stop: () => void
  meta: {
    codec: string
    width: number
    height: number
    sampleCount: number
    durationSec: number
  }
}

type SampleInfo = {
  offset: number
  size: number
  cts: number
  duration: number
  is_sync: boolean
  timescale: number
}

function getAvcDescription(file: ReturnType<typeof createFile>, trackId: number): Uint8Array {
  const trak = file.getTrackById(trackId)
  const entry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0] as
    | { avcC?: { write: (s: InstanceType<typeof DataStream>) => void } }
    | undefined
  if (!entry?.avcC) throw new Error('avcC description not found')
  const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN)
  entry.avcC.write(stream)
  return new Uint8Array(stream.buffer, 8, stream.byteLength - 8)
}

function toUs(units: number, timescale: number): number {
  return Math.round((units / timescale) * 1_000_000)
}

/**
 * Continuous preview player: fMP4 → mp4box → WebCodecs → canvas (loops).
 * No second `<video>` / MSE.
 */
export async function playSegmentOnCanvas(
  url: string,
  canvas: HTMLCanvasElement,
  options?: { label?: string },
): Promise<SegmentPlayerHandle> {
  const label = options?.label ?? 'webcodecs'

  const VideoDecoderCtor = (globalThis as { VideoDecoder?: typeof VideoDecoder }).VideoDecoder
  if (typeof VideoDecoderCtor !== 'function') {
    throw new Error('WebCodecs VideoDecoder not available')
  }

  labTrace(label, 'fetch segment mp4 (full play)', url)
  const ab = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.arrayBuffer()
  })
  labTrace(label, `fetched bytes=${ab.byteLength}`)

  const file = createFile()
  const info = await new Promise<{
    tracks: Array<{
      id: number
      codec: string
      type?: string
      nb_samples?: number
      video?: { width: number; height: number }
      track_width?: number
      track_height?: number
    }>
  }>((resolve, reject) => {
    file.onError = (e: string) => reject(new Error(String(e)))
    file.onReady = (movie) => resolve(movie)
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(ab, 0))
    file.flush()
  })

  const track = info.tracks.find((t) => t.video || t.type === 'video')
  if (!track) throw new Error('no video track')

  const width = track.video?.width ?? track.track_width ?? 250
  const height = track.video?.height ?? track.track_height ?? 144
  const codec = track.codec
  const samples = (file.getTrackSamplesInfo(track.id) ?? []) as SampleInfo[]
  if (samples.length === 0) throw new Error('no samples')

  const timescale = samples[0]!.timescale || 15360
  const last = samples[samples.length - 1]!
  const durationUnits = last.cts + last.duration
  const durationUs = toUs(durationUnits, timescale)
  const durationSec = durationUs / 1_000_000

  labTrace(label, 'mp4box ready for play', {
    id: track.id,
    codec,
    width,
    height,
    samples: samples.length,
    durationSec: Number(durationSec.toFixed(2)),
  })

  const description = getAvcDescription(file, track.id)
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('2d context unavailable')
  canvas.width = width
  canvas.height = height

  const config: VideoDecoderConfig = {
    codec,
    codedWidth: width,
    codedHeight: height,
    description,
  }
  const support =
    typeof VideoDecoderCtor.isConfigSupported === 'function'
      ? await VideoDecoderCtor.isConfigSupported(config)
      : { supported: true }
  labTrace(label, 'VideoDecoder.isConfigSupported', support)
  if (support.supported === false) throw new Error(`codec not supported: ${codec}`)

  let stopped = false
  let sampleIndex = 0
  let loopIndex = 0
  let framesDrawn = 0
  let pending: VideoFrame[] = []
  let wallStart = 0
  let raf = 0

  const decoder = new VideoDecoderCtor({
    output: (frame) => {
      if (stopped) {
        frame.close()
        return
      }
      pending.push(frame)
      pending.sort((a, b) => a.timestamp - b.timestamp)
      // Cap queue to avoid RAM blow-up on slow present.
      while (pending.length > 45) {
        pending.shift()?.close()
      }
    },
    error: (err) => {
      labTrace(label, 'VideoDecoder error', err)
    },
  })
  decoder.configure(config)

  const pumpDecode = () => {
    if (stopped) return
    while (decoder.decodeQueueSize < 12) {
      if (sampleIndex >= samples.length) {
        sampleIndex = 0
        loopIndex += 1
        labTrace(label, `loop #${loopIndex}`)
      }
      const sample = samples[sampleIndex]!
      const data = new Uint8Array(ab, sample.offset, sample.size)
      const baseUs = toUs(sample.cts, timescale)
      const timestamp = baseUs + loopIndex * durationUs
      const chunk = new EncodedVideoChunk({
        type: sample.is_sync ? 'key' : 'delta',
        timestamp,
        duration: toUs(sample.duration, timescale),
        data,
      })
      try {
        decoder.decode(chunk)
      } catch (err) {
        labTrace(label, 'decode() threw', err)
        break
      }
      sampleIndex += 1
    }
  }

  const present = (now: number) => {
    if (stopped) return
    if (!wallStart) wallStart = now
    // Media time along the looping timeline (microseconds).
    const mediaUs = ((now - wallStart) * 1000) % Math.max(durationUs, 1)

    while (pending.length > 0) {
      const frame = pending[0]!
      const localTs = frame.timestamp % Math.max(durationUs, 1)
      // Allow slight lead so we don't stall.
      if (localTs > mediaUs + 80_000 && mediaUs > 40_000) break
      pending.shift()
      try {
        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
        framesDrawn += 1
        if (framesDrawn === 1 || framesDrawn % 60 === 0) {
          labTrace(label, `playing frame #${framesDrawn}`, {
            mediaSec: Number((mediaUs / 1e6).toFixed(2)),
            pending: pending.length,
            decodeQ: decoder.decodeQueueSize,
          })
        }
      } finally {
        frame.close()
      }
    }

    pumpDecode()
    raf = requestAnimationFrame(present)
  }

  labTrace(label, 'start continuous WebCodecs→canvas play (loop)')
  pumpDecode()
  raf = requestAnimationFrame(present)

  return {
    meta: {
      codec,
      width,
      height,
      sampleCount: samples.length,
      durationSec,
    },
    stop: () => {
      stopped = true
      cancelAnimationFrame(raf)
      for (const frame of pending) frame.close()
      pending = []
      try {
        decoder.close()
      } catch {
        /* ignore */
      }
      labTrace(label, 'stopped canvas player', { framesDrawn })
    },
  }
}
