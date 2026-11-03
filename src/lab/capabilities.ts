import { labTrace } from './labTrace'

export type LabCapabilities = {
  webAssembly: boolean
  videoDecoder: boolean
  captureStream: boolean
}

export function probeLabCapabilities(): LabCapabilities {
  const webAssembly = typeof WebAssembly === 'object' && WebAssembly != null
  const videoDecoder =
    typeof (globalThis as { VideoDecoder?: unknown }).VideoDecoder === 'function'
  const captureStream =
    typeof HTMLVideoElement !== 'undefined' &&
    typeof (
      HTMLVideoElement.prototype as HTMLVideoElement & {
        captureStream?: () => MediaStream
      }
    ).captureStream === 'function'

  const caps = { webAssembly, videoDecoder, captureStream }
  labTrace('caps', 'PS5/lab capability probe', caps)
  return caps
}

/** Soft canvas play needs WASM (TinyH264) or WebCodecs. */
export function canSoftDecodePreview(caps: LabCapabilities = probeLabCapabilities()): boolean {
  return caps.webAssembly || caps.videoDecoder
}
