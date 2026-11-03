import { createFile, MP4BoxBuffer } from 'mp4box'
// @ts-expect-error tinyh264 ships without types
import TinyH264Factory from 'tinyh264/es/TinyH264.js'
// @ts-expect-error tinyh264 ships without types
import TinyH264Decoder from 'tinyh264/es/TinyH264Decoder.js'
import { labTrace } from '../lab/labTrace'
import { avccSampleToAnnexB, parameterSetsToAnnexB } from './avcAnnexB'
import { drawI420ToCanvas } from './yuvCanvas'

export type SegmentPlayerHandle = {
  stop: () => void
  meta: {
    codec: string
    width: number
    height: number
    sampleCount: number
    durationSec: number
    engine: 'tinyh264'
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

/**
 * PS5 has no WebCodecs VideoDecoder. Soft-decode baseline H.264 with TinyH264 WASM
 * and paint YUV→canvas in a timed loop (playable preview, no 2nd `<video>`).
 */
export async function playSegmentOnCanvas(
  url: string,
  canvas: HTMLCanvasElement,
  options?: { label?: string },
): Promise<SegmentPlayerHandle> {
  const label = options?.label ?? 'preview'

  const hasWebCodecs =
    typeof (globalThis as { VideoDecoder?: unknown }).VideoDecoder === 'function'
  const hasWasm = typeof WebAssembly === 'object' && WebAssembly != null
  labTrace(label, 'decoder probe', { hasWebCodecs, hasWasm, engine: 'tinyh264' })

  if (!hasWasm) {
    throw new Error(
      'WebAssembly not available — TinyH264 soft-decode impossible on this PS5 WebView',
    )
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

  const samples = (file.getTrackSamplesInfo(track.id) ?? []) as SampleInfo[]
  if (samples.length === 0) throw new Error('no samples')

  const entry = file.getTrackById(track.id)?.mdia?.minf?.stbl?.stsd?.entries?.[0] as
    | {
        avcC?: {
          lengthSizeMinusOne: number
          SPS: Array<{ data: Uint8Array }>
          PPS: Array<{ data: Uint8Array }>
        }
      }
    | undefined
  if (!entry?.avcC) throw new Error('avcC missing (need baseline/avc1)')

  const spsPps = parameterSetsToAnnexB([
    ...entry.avcC.SPS.map((s) => s.data),
    ...entry.avcC.PPS.map((p) => p.data),
  ])
  const naluLengthSize = (entry.avcC.lengthSizeMinusOne & 3) + 1
  const width = track.video?.width ?? track.track_width ?? 250
  const height = track.video?.height ?? track.track_height ?? 144
  const timescale = samples[0]!.timescale || 15360
  const last = samples[samples.length - 1]!
  const durationUs = Math.round(((last.cts + last.duration) / timescale) * 1_000_000)

  labTrace(label, 'mp4box ready for tinyh264 play', {
    codec: track.codec,
    width,
    height,
    samples: samples.length,
    durationSec: Number((durationUs / 1e6).toFixed(2)),
    naluLengthSize,
  })

  labTrace(label, 'init TinyH264 WASM')
  const module = await TinyH264Factory()
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('2d context unavailable')

  let framesDrawn = 0
  const decoder = new TinyH264Decoder(
    module,
    (yuv: Uint8Array, w: number, h: number) => {
      drawI420ToCanvas(ctx, yuv, w, h)
      framesDrawn += 1
      if (framesDrawn === 1 || framesDrawn % 60 === 0) {
        labTrace(label, `tinyh264 frame #${framesDrawn}`, { w, h })
      }
    },
  )
  decoder.decode(spsPps)

  let stopped = false
  let sampleIndex = 0
  let loopIndex = 0
  let wallStart = 0
  let timer = 0

  const tick = () => {
    if (stopped) return
    const now = performance.now()
    if (!wallStart) wallStart = now
    const mediaUs = ((now - wallStart) * 1000) % Math.max(durationUs, 1)

    let decoded = 0
    while (decoded < 3) {
      if (sampleIndex >= samples.length) {
        sampleIndex = 0
        loopIndex += 1
        wallStart = now
        labTrace(label, `tinyh264 loop #${loopIndex}`)
        decoder.decode(spsPps)
        break
      }
      const sample = samples[sampleIndex]!
      const sampleUs = Math.round((sample.cts / timescale) * 1_000_000)
      if (sampleUs > mediaUs + 40_000 && mediaUs > 20_000) break

      const avcc = new Uint8Array(ab, sample.offset, sample.size)
      const annexB = avccSampleToAnnexB(avcc, naluLengthSize)
      try {
        decoder.decode(annexB)
      } catch (err) {
        labTrace(label, 'tinyh264 decode threw', err)
        break
      }
      sampleIndex += 1
      decoded += 1
    }

    timer = window.setTimeout(tick, 8)
  }

  labTrace(label, 'start TinyH264→canvas play (loop)')
  timer = window.setTimeout(tick, 0)

  return {
    meta: {
      codec: track.codec,
      width,
      height,
      sampleCount: samples.length,
      durationSec: durationUs / 1e6,
      engine: 'tinyh264',
    },
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
      try {
        decoder.release()
      } catch {
        /* ignore */
      }
      labTrace(label, 'stopped tinyh264 player', { framesDrawn })
    },
  }
}
