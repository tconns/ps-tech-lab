import { createFile, DataStream, Endianness, MP4BoxBuffer } from 'mp4box'
import { labTrace } from '../lab/labTrace'

export type SegmentPreviewResult = {
  frames: number
  codec: string
  width: number
  height: number
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

/**
 * Fetch on-demand H.264 MP4 → mp4box demux → WebCodecs → canvas.
 * No `<video>` / MSE. Lab test: can PS5 paint a preview without killing Shaka?
 */
export async function decodeSegmentPreviewToCanvas(
  url: string,
  canvas: HTMLCanvasElement,
  options?: { maxFrames?: number; label?: string },
): Promise<SegmentPreviewResult> {
  const label = options?.label ?? 'webcodecs'
  const maxFrames = options?.maxFrames ?? 1

  const VideoDecoderCtor = (globalThis as { VideoDecoder?: typeof VideoDecoder }).VideoDecoder
  if (typeof VideoDecoderCtor !== 'function') {
    throw new Error('WebCodecs VideoDecoder not available')
  }

  labTrace(label, 'fetch segment mp4', url)
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
  labTrace(label, 'mp4box ready', {
    id: track.id,
    codec,
    width,
    height,
    samples: track.nb_samples,
  })

  const description = getAvcDescription(file, track.id)
  labTrace(label, `avcC description bytes=${description.byteLength}`)

  const sampleInfos = file.getTrackSamplesInfo(track.id) ?? []
  const syncSamples = sampleInfos.filter((s) => s.is_sync).slice(0, maxFrames)
  if (syncSamples.length === 0) throw new Error('no sync samples')
  labTrace(label, `using ${syncSamples.length} sync sample(s)`, {
    first: { offset: syncSamples[0]?.offset, size: syncSamples[0]?.size },
  })

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('2d context unavailable')
  canvas.width = width
  canvas.height = height

  let frames = 0
  let decoderError: Error | null = null

  const decoder = new VideoDecoderCtor({
    output: (frame) => {
      try {
        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
        frames += 1
        labTrace(label, `decoded frame #${frames}`, {
          w: frame.displayWidth,
          h: frame.displayHeight,
        })
      } finally {
        frame.close()
      }
    },
    error: (err) => {
      decoderError = err instanceof Error ? err : new Error(String(err))
      labTrace(label, 'VideoDecoder error', err)
    },
  })

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
  if (support.supported === false) {
    throw new Error(`codec not supported: ${codec}`)
  }

  decoder.configure(config)

  for (const sample of syncSamples) {
    const data = new Uint8Array(ab, sample.offset, sample.size)
    const chunk = new EncodedVideoChunk({
      type: 'key',
      timestamp: sample.cts,
      duration: sample.duration,
      data,
    })
    decoder.decode(chunk)
    labTrace(label, 'submitted key chunk', { bytes: data.byteLength, cts: sample.cts })
  }

  try {
    await decoder.flush()
  } finally {
    try {
      decoder.close()
    } catch {
      /* ignore */
    }
  }

  if (decoderError) throw decoderError
  if (frames === 0) throw new Error('no frames decoded')
  return { frames, codec, width, height }
}
