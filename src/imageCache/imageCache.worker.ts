import { type CacheImageRequest, type CacheImageResponse } from './protocol.ts'

self.onmessage = (event: MessageEvent<CacheImageRequest>) => {
  void downloadImage(event.data)
}

/** Download only. CacheStorage written here is not visible to the page on PS5. */
async function downloadImage(message: CacheImageRequest): Promise<void> {
  const { id, url } = message
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const body = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
    const result: CacheImageResponse = {
      id,
      url,
      ok: true,
      bytes: body.byteLength,
      contentType,
      body,
    }
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
