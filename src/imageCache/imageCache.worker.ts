import {
  IMAGE_BYTES_HEADER,
  IMAGE_CACHE_NAME,
  type CacheImageRequest,
  type CacheImageResponse,
} from './protocol.ts'

self.onmessage = (event: MessageEvent<CacheImageRequest>) => {
  void storeImage(event.data)
}

async function storeImage(message: CacheImageRequest): Promise<void> {
  const { id, url } = message
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const body = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
    const stored = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        [IMAGE_BYTES_HEADER]: String(body.byteLength),
      },
    })

    const cache = await caches.open(IMAGE_CACHE_NAME)
    await cache.put(url, stored)

    const result: CacheImageResponse = { id, url, ok: true, bytes: body.byteLength }
    self.postMessage(result)
  } catch (err) {
    const result: CacheImageResponse = {
      id,
      url,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(result)
  }
}
