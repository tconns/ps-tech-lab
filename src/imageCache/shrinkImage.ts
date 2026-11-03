/** Bytes above this are redrawn on a normal canvas before CacheStorage. */
export const SHRINK_OVER_BYTES = 80_000

const MAX_EDGE = 480
const QUALITY = 0.7

export type PackedImage = {
  body: ArrayBuffer
  contentType: string
  note: string
}

/**
 * Shrink a large image on the main-thread canvas.
 * PS5 has no OffscreenCanvas, so this must not run inside the worker.
 * Keeps the original bytes when the image is already small, or the encode is not smaller.
 */
export async function shrinkIfLarge(body: ArrayBuffer, contentType: string): Promise<PackedImage> {
  const original = { body, contentType, note: '' }
  if (body.byteLength <= SHRINK_OVER_BYTES) return original

  const blob = new Blob([body], { type: contentType })
  const url = URL.createObjectURL(blob)
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.position = 'fixed'
  canvas.style.left = '-10000px'
  canvas.style.pointerEvents = 'none'
  document.body.appendChild(canvas)

  try {
    const img = await loadImage(url)
    const longest = Math.max(img.naturalWidth, img.naturalHeight)
    if (longest < 1) return original
    const scale = Math.min(1, MAX_EDGE / longest)
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ...original, note: 'shrink skipped: no 2d context' }
    ctx.drawImage(img, 0, 0, width, height)

    const encoded = await lightestBlob(canvas)
    if (!encoded || encoded.size >= body.byteLength) {
      return { ...original, note: 'shrink skipped: encode not smaller' }
    }

    return {
      body: await encoded.arrayBuffer(),
      contentType: encoded.type,
      note: `shrink ${img.naturalWidth}x${img.naturalHeight} ${body.byteLength}B → ${width}x${height} ${encoded.type} ${encoded.size}B`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ...original, note: `shrink skipped: ${message}` }
  } finally {
    canvas.remove()
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = url
  })
}

/** WebP when the browser can encode it, otherwise JPEG. Pick the smaller file. */
async function lightestBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const webp = await canvasToBlob(canvas, 'image/webp', QUALITY)
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', QUALITY)
  const options = [webp, jpeg].filter((blob): blob is Blob => {
    if (!blob) return false
    return blob.type === 'image/webp' || blob.type === 'image/jpeg'
  })
  options.sort((a, b) => a.size - b.size)
  return options[0] ?? null
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality))
}
