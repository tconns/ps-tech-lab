import {
  IMAGE_BYTES_HEADER,
  IMAGE_CACHE_NAME,
  type CacheImageRequest,
  type CacheImageResponse,
} from './protocol.ts'

export type CachedImage = {
  blobUrl: string
  bytes: number
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, {
  resolve: (bytes: number) => void
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
    if (message.ok) slot.resolve(message.bytes)
    else slot.reject(new Error(message.error))
  }
  worker.onerror = (event) => {
    const error = new Error(event.message || 'image cache worker failed')
    for (const slot of pending.values()) slot.reject(error)
    pending.clear()
  }
  return worker
}

/** Ask the worker to fetch `url` and store it. Resolves with the byte size after `cache.put` succeeds. */
export function cacheImage(url: string): Promise<number> {
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

/**
 * Page-side read: match the URL, require the size header, then build a blob URL.
 * Does not hit the network.
 */
export async function readCachedImage(url: string): Promise<CachedImage> {
  const cache = await caches.open(IMAGE_CACHE_NAME)
  const hit = await cache.match(url)
  if (!hit) {
    throw new Error('cache miss')
  }

  const header = hit.headers.get(IMAGE_BYTES_HEADER)
  const bytes = header == null ? Number.NaN : Number(header)
  if (!Number.isFinite(bytes)) {
    throw new Error(`missing ${IMAGE_BYTES_HEADER}`)
  }

  const blob = await hit.blob()
  if (blob.size !== bytes) {
    throw new Error(`size mismatch header=${bytes} blob=${blob.size}`)
  }

  return { blobUrl: URL.createObjectURL(blob), bytes }
}
