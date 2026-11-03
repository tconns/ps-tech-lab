import {
  IMAGE_BYTES_HEADER,
  IMAGE_CACHE_NAME,
  type CacheImageRequest,
  type CacheImageResponse,
} from './protocol.ts'
import { SHRINK_OVER_BYTES, shrinkIfLarge } from './shrinkImage.ts'

export type CachedImage = {
  blobUrl: string
  bytes: number
  blob: Blob
}

export type DownloadedImage = {
  bytes: number
  contentType: string
  body: ArrayBuffer
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, {
  resolve: (image: DownloadedImage) => void
  reject: (error: Error) => void
}>()

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(new URL('./imageCache.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<CacheImageResponse>) => {
    const message = event.data
    const slot = pending.get(message.id)
    if (!slot) return
    pending.delete(message.id)
    if (message.ok) {
      slot.resolve({
        bytes: message.bytes,
        contentType: message.contentType,
        body: message.body,
      })
    } else {
      slot.reject(new Error(message.error))
    }
  }
  worker.onerror = (event) => {
    const error = new Error(event.message || 'image cache worker failed')
    for (const slot of pending.values()) slot.reject(error)
    pending.clear()
  }
  return worker
}

function downloadImage(url: string): Promise<DownloadedImage> {
  const id = nextId++
  const request: CacheImageRequest = { id, url }
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage(request)
  })
}

export function closeImageCacheWorker(): void {
  worker?.terminate()
  worker = null
  const error = new Error('image cache worker closed')
  for (const slot of pending.values()) slot.reject(error)
  pending.clear()
}

function cacheRequest(url: string): Request {
  return new Request(url, { method: 'GET' })
}

/** Store a downloaded body in the page CacheStorage, including the size header. */
export async function storeDownloadedImage(url: string, image: DownloadedImage): Promise<void> {
  const bytes = image.body.byteLength
  const stored = new Response(image.body, {
    status: 200,
    headers: {
      'Content-Type': image.contentType,
      [IMAGE_BYTES_HEADER]: String(bytes),
    },
  })
  const cache = await caches.open(IMAGE_CACHE_NAME)
  await cache.put(cacheRequest(url), stored)
  const hit = await cache.match(cacheRequest(url))
  if (!hit) {
    const keys = await cache.keys()
    throw new Error(
      `cache miss after put bytes=${bytes} type=${image.contentType} keys=${keys.length}`,
    )
  }
}

export type StoredImage = {
  bytes: number
  note: string
}

async function packForStore(image: DownloadedImage): Promise<DownloadedImage & { note: string }> {
  const packed = await shrinkIfLarge(image.body, image.contentType)
  return {
    body: packed.body,
    contentType: packed.contentType,
    bytes: packed.body.byteLength,
    note: packed.note,
  }
}

export async function downloadAndStoreImage(url: string): Promise<StoredImage> {
  const packed = await packForStore(await downloadImage(url))
  await storeDownloadedImage(url, packed)
  return { bytes: packed.bytes, note: packed.note }
}

/** Replace an already-cached image when it is over the size limit. Does not hit the network. */
export async function shrinkCachedImage(url: string, cached: CachedImage): Promise<StoredImage & { image: CachedImage }> {
  if (cached.bytes <= SHRINK_OVER_BYTES || !cached.blob) {
    return { bytes: cached.bytes, note: '', image: cached }
  }
  const packed = await packForStore({
    body: await cached.blob.arrayBuffer(),
    contentType: cached.blob.type || 'application/octet-stream',
    bytes: cached.bytes,
  })
  if (!packed.note.startsWith('shrink ')) {
    return { bytes: cached.bytes, note: packed.note, image: cached }
  }
  URL.revokeObjectURL(cached.blobUrl)
  await storeDownloadedImage(url, packed)
  const image = await readCachedImage(url)
  if (!image) {
    throw new Error('cache miss after shrink')
  }
  return { bytes: image.bytes, note: packed.note, image }
}

/**
 * Page-side read: match the URL, require the size header, then build a blob URL.
 * Returns null when the URL is not in CacheStorage. Does not hit the network.
 */
export async function readCachedImage(url: string): Promise<CachedImage | null> {
  const cache = await caches.open(IMAGE_CACHE_NAME)
  const hit = await cache.match(cacheRequest(url))
  if (!hit) return null

  const header = hit.headers.get(IMAGE_BYTES_HEADER)
  const bytes = header == null ? Number.NaN : Number(header)
  if (!Number.isFinite(bytes)) {
    throw new Error(`missing ${IMAGE_BYTES_HEADER}`)
  }

  const blob = await hit.blob()
  if (blob.size !== bytes) {
    throw new Error(`size mismatch header=${bytes} blob=${blob.size}`)
  }

  return { blobUrl: URL.createObjectURL(blob), bytes, blob }
}
