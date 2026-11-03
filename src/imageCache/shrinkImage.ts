/** Bytes above this are redrawn on a normal canvas before CacheStorage. */
export const SHRINK_OVER_BYTES = 80_000

const PASSES = [
  { edge: 480, quality: 0.7 },
  { edge: 360, quality: 0.5 },
  { edge: 240, quality: 0.4 },
] as const

export type PackedImage = {
  body: ArrayBuffer
  contentType: string
  note: string
}

/**
 * Shrink a large image on the main-thread canvas.
 * PS5 has no OffscreenCanvas, so this must not run inside the worker.
 * Keeps the original bytes when every encode is missing or not smaller.
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
    const sourceWidth = img.naturalWidth || img.width
    const sourceHeight = img.naturalHeight || img.height
    const longest = Math.max(sourceWidth, sourceHeight)
    if (longest < 1) return { ...original, note: 'shrink skipped: no dimensions' }

    let best: { blob: Blob; width: number; height: number } | null = null
    for (const pass of PASSES) {
      const scale = Math.min(1, pass.edge / longest)
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))
      if (!paint(canvas, img, sourceWidth, sourceHeight, width, height)) {
        return { ...original, note: 'shrink skipped: no 2d context' }
      }
      const encoded = await lightestBlob(canvas, pass.quality)
      if (!encoded || encoded.size >= body.byteLength) continue
      best = { blob: encoded, width, height }
      break
    }

    if (!best) {
      return {
        ...original,
        note: `shrink skipped: ${sourceWidth}x${sourceHeight} canvas ${canvas.width}x${canvas.height} not smaller than ${body.byteLength}B`,
      }
    }

    return {
      body: await best.blob.arrayBuffer(),
      contentType: best.blob.type,
      note: `shrunk ${sourceWidth}x${sourceHeight} ${body.byteLength}B → ${best.width}x${best.height} ${best.blob.type} ${best.blob.size}B`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ...original, note: `shrink skipped: ${message}` }
  } finally {
    canvas.remove()
    URL.revokeObjectURL(url)
  }
}

function paint(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): boolean {
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  ctx.drawImage(img, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height)
  return true
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = url
  })
}

/** Smallest WebP or JPEG. toDataURL covers PS5 builds where toBlob returns an empty type or nothing. */
async function lightestBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  const options = [
    await encode(canvas, 'image/webp', quality),
    await encode(canvas, 'image/jpeg', quality),
  ].filter((blob): blob is Blob => blob != null)
  options.sort((a, b) => a.size - b.size)
  return options[0] ?? null
}

async function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  const fromBlob = await blobViaToBlob(canvas, type, quality)
  const fromUrl = blobViaDataUrl(canvas, type, quality)
  const options = [fromBlob, fromUrl].filter((blob): blob is Blob => blob != null && blob.size > 0)
  options.sort((a, b) => a.size - b.size)
  return options[0] ?? null
}

function blobViaToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  if (typeof canvas.toBlob !== 'function') return Promise.resolve(null)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size < 1) {
        resolve(null)
        return
      }
      const actual = blob.type || type
      if (actual !== 'image/jpeg' && actual !== 'image/webp') {
        resolve(null)
        return
      }
      resolve(blob.type === actual ? blob : new Blob([blob], { type: actual }))
    }, type, quality)
  })
}

function blobViaDataUrl(canvas: HTMLCanvasElement, type: string, quality: number): Blob | null {
  if (typeof canvas.toDataURL !== 'function') return null
  const dataUrl = canvas.toDataURL(type, quality)
  const marker = `data:${type};base64,`
  if (!dataUrl.startsWith(marker)) return null
  const binary = atob(dataUrl.slice(marker.length))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}
