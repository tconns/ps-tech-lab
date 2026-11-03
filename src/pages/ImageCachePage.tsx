import { useEffect, useState } from 'react'
import {
  closeImageCacheWorker,
  downloadAndStoreImage,
  readCachedImage,
} from '../imageCache/imageCacheClient'
import { IMAGE_BYTES_HEADER } from '../imageCache/protocol'
import { LabTraceOverlay } from '../lab/LabTraceOverlay'
import { labTrace } from '../lab/labTrace'
import { STREAMS } from '../streams'

const LIST_SIZE = 20

const SAMPLES = [
  { label: 'favicon', url: '/favicon.svg' },
  ...Array.from({ length: LIST_SIZE }, (_, index) => ({
    label: `poster ${index + 1}`,
    url: `/lab-poster.svg?n=${index + 1}`,
  })),
  { label: 'remote poster', url: STREAMS.sidePoster },
]

const STEP_MS = 20_000

type Phase = 'queued' | 'checking' | 'downloading' | 'storing' | 'ok' | 'error'
type Source = 'cache' | 'network' | null

type Row = {
  label: string
  url: string
  phase: Phase
  source: Source
  bytes: number | null
  ms: number | null
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
    source: null,
    bytes: null,
    ms: null,
    blobUrl: null,
    error: null,
  }))
}

export function ImageCachePage() {
  const [rows, setRows] = useState<Row[]>(initialRows)

  useEffect(() => {
    let cancelled = false
    const blobs: string[] = []
    const started = performance.now()
    let hits = 0
    let misses = 0
    let errors = 0

    function patch(index: number, partial: Partial<Row>): void {
      setRows((current) => current.map((row, i) => (i === index ? { ...row, ...partial } : row)))
    }

    async function run(): Promise<void> {
      labTrace('img', `start ${SAMPLES.length} urls — cache first, download only on miss`)
      for (let index = 0; index < SAMPLES.length; index++) {
        if (cancelled) return
        const sample = SAMPLES[index]
        const url = absoluteUrl(sample.url)
        const t0 = performance.now()
        patch(index, { phase: 'checking', error: null })
        try {
          const cached = await withTimeout(readCachedImage(url), STEP_MS)
          if (cancelled) {
            if (cached) URL.revokeObjectURL(cached.blobUrl)
            return
          }
          if (cached) {
            const ms = Math.round(performance.now() - t0)
            hits += 1
            blobs.push(cached.blobUrl)
            labTrace('img', `${sample.label} HIT ${cached.bytes}B ${ms}ms`)
            patch(index, {
              phase: 'ok',
              source: 'cache',
              bytes: cached.bytes,
              ms,
              blobUrl: cached.blobUrl,
            })
            continue
          }

          misses += 1
          labTrace('img', `${sample.label} MISS — worker download`)
          patch(index, { phase: 'downloading' })
          const fetchStarted = performance.now()
          const bytes = await withTimeout(downloadAndStoreImage(url), STEP_MS)
          const fetchMs = Math.round(performance.now() - fetchStarted)
          if (cancelled) return

          patch(index, { phase: 'storing', bytes })
          const image = await withTimeout(readCachedImage(url), STEP_MS)
          if (!image) {
            throw new Error('cache miss after put')
          }
          if (cancelled) {
            URL.revokeObjectURL(image.blobUrl)
            return
          }
          const ms = Math.round(performance.now() - t0)
          blobs.push(image.blobUrl)
          labTrace('img', `${sample.label} stored ${bytes}B fetch+put ${fetchMs}ms total ${ms}ms`)
          patch(index, {
            phase: 'ok',
            source: 'network',
            bytes: image.bytes,
            ms,
            blobUrl: image.blobUrl,
          })
        } catch (err) {
          if (cancelled) return
          errors += 1
          const message = err instanceof Error ? err.message : String(err)
          labTrace('img', `${sample.label} ERROR ${message}`)
          patch(index, { phase: 'error', error: message, ms: Math.round(performance.now() - t0) })
        }
      }

      const total = Math.round(performance.now() - started)
      labTrace('img', `done HIT ${hits} MISS ${misses} ERR ${errors} ${total}ms`)
    }

    void run()
    return () => {
      cancelled = true
      closeImageCacheWorker()
      for (const blobUrl of blobs) URL.revokeObjectURL(blobUrl)
    }
  }, [])

  const hits = rows.filter((row) => row.source === 'cache').length
  const misses = rows.filter((row) => row.source === 'network').length
  const errors = rows.filter((row) => row.phase === 'error').length
  const pending = rows.length - hits - misses - errors

  return (
    <main className="imgcache">
      <h1>Image cache</h1>
      <p className="imgcache__lead">
        HIT {hits} · tải mới {misses} · lỗi {errors} · còn {pending}. Lần mở sau ảnh đã lưu phải là HIT, không tải lại.
      </p>
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
      <LabTraceOverlay />
    </main>
  )
}

function statusText(row: Row): string {
  if (row.phase === 'queued') return 'Chờ'
  if (row.phase === 'checking') return 'Đang kiểm tra CacheStorage'
  if (row.phase === 'downloading') return 'MISS — worker đang tải'
  if (row.phase === 'storing') return `Đã tải ${row.bytes} bytes. Đang đọc lại cache`
  if (row.phase === 'ok' && row.source === 'cache') {
    return `HIT · không tải lại · ${IMAGE_BYTES_HEADER}: ${row.bytes} · ${row.ms}ms`
  }
  if (row.phase === 'ok') {
    return `MISS → đã lưu · ${IMAGE_BYTES_HEADER}: ${row.bytes} · ${row.ms}ms`
  }
  return `Lỗi · ${row.error}`
}
