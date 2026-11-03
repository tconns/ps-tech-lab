import { useEffect, useState } from 'react'
import {
  cacheImage,
  closeImageCacheWorker,
  readCachedImage,
} from '../imageCache/imageCacheClient'
import { IMAGE_BYTES_HEADER } from '../imageCache/protocol'
import { STREAMS } from '../streams'

const SAMPLES = [
  { label: 'favicon', url: '/favicon.svg' },
  { label: 'lab poster', url: '/lab-poster.svg' },
  { label: 'poster', url: STREAMS.sidePoster },
] as const

const STEP_MS = 20_000

type Phase = 'queued' | 'caching' | 'reading' | 'ok' | 'error'

type Row = {
  label: string
  url: string
  phase: Phase
  bytes: number | null
  blobUrl: string | null
  error: string | null
}

function absoluteUrl(input: string): string {
  return new URL(input, location.href).href
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

function initialRows(): Row[] {
  return SAMPLES.map((sample) => ({
    label: sample.label,
    url: absoluteUrl(sample.url),
    phase: 'queued',
    bytes: null,
    blobUrl: null,
    error: null,
  }))
}

export function ImageCachePage() {
  const [rows, setRows] = useState<Row[]>(initialRows)

  useEffect(() => {
    let cancelled = false
    const blobs: string[] = []

    function patch(index: number, partial: Partial<Row>): void {
      setRows((current) => current.map((row, i) => (i === index ? { ...row, ...partial } : row)))
    }

    async function run(): Promise<void> {
      for (let index = 0; index < SAMPLES.length; index++) {
        if (cancelled) return
        const url = absoluteUrl(SAMPLES[index].url)
        patch(index, { phase: 'caching', error: null })
        try {
          const stored = await withTimeout(cacheImage(url), STEP_MS)
          if (cancelled) return
          patch(index, { phase: 'reading', bytes: stored })
          const image = await withTimeout(readCachedImage(url), STEP_MS)
          if (cancelled) {
            URL.revokeObjectURL(image.blobUrl)
            return
          }
          blobs.push(image.blobUrl)
          patch(index, { phase: 'ok', bytes: image.bytes, blobUrl: image.blobUrl })
        } catch (err) {
          if (cancelled) return
          patch(index, {
            phase: 'error',
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
      closeImageCacheWorker()
      for (const blobUrl of blobs) URL.revokeObjectURL(blobUrl)
    }
  }, [])

  return (
    <main className="imgcache">
      <h1>Image cache</h1>
      <p className="imgcache__lead">Tự chạy khi mở trang. Không cần bấm.</p>
      <ul className="imgcache__list">
        {rows.map((row) => (
          <li key={row.url} className={`imgcache__row imgcache__row--${row.phase}`}>
            {row.blobUrl ? (
              <img className="imgcache__preview" src={row.blobUrl} alt={row.label} />
            ) : (
              <div className="imgcache__preview imgcache__preview--empty" />
            )}
            <div className="imgcache__copy">
              <p className="imgcache__label">{row.label}</p>
              <p className="imgcache__url">{row.url}</p>
              <p className="imgcache__status">{statusText(row)}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

function statusText(row: Row): string {
  if (row.phase === 'queued') return 'Chờ'
  if (row.phase === 'caching') return 'Worker đang tải và ghi CacheStorage'
  if (row.phase === 'reading') return `Đã ghi ${row.bytes} bytes. Đang đọc blob`
  if (row.phase === 'ok') return `OK · ${IMAGE_BYTES_HEADER}: ${row.bytes}`
  return `Lỗi · ${row.error}`
}
