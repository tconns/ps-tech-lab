/** CacheStorage name shared by the worker (write) and the page (read). */
export const IMAGE_CACHE_NAME = 'ps-lab-images'

/**
 * Byte length of the stored body.
 * CacheStorage has no size field, so the worker records it on the response.
 */
export const IMAGE_BYTES_HEADER = 'X-Image-Bytes'

export type CacheImageRequest = {
  id: number
  url: string
}

export type CacheImageResponse =
  | { id: number; url: string; ok: true; bytes: number }
  | { id: number; url: string; ok: false; error: string }
