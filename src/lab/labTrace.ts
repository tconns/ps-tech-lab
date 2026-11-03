export type LabTraceEntry = {
  t: number
  elapsedMs: number
  scope: string
  message: string
  data?: unknown
}

type Listener = (entries: readonly LabTraceEntry[]) => void

declare global {
  interface Window {
    /** Live trace log. Same array the overlay reads. */
    logTrace: LabTraceEntry[]
    /** One line per entry, for a single console or DevTools read. */
    logTraceText: string
  }
}

const MAX = 80
const startedAt = performance.now()
const entries: LabTraceEntry[] = []
const listeners = new Set<Listener>()

function publish(): void {
  if (typeof window === 'undefined') return
  window.logTrace = entries
  window.logTraceText = entries
    .map((entry) => {
      const data = entry.data === undefined ? '' : ` ${formatData(entry.data)}`
      return `+${entry.elapsedMs}ms [${entry.scope}] ${entry.message}${data}`
    })
    .join('\n')
}

function formatData(data: unknown): string {
  try {
    return JSON.stringify(data)
  } catch {
    return String(data)
  }
}

function emit(): void {
  publish()
  const snapshot = entries.slice()
  for (const listener of listeners) listener(snapshot)
}

publish()

/** Structured lab trace — console + on-screen overlay. */
export function labTrace(scope: string, message: string, data?: unknown): void {
  const now = performance.now()
  const entry: LabTraceEntry = {
    t: Date.now(),
    elapsedMs: Math.round(now - startedAt),
    scope,
    message,
    data,
  }
  entries.push(entry)
  if (entries.length > MAX) entries.shift()

  const prefix = `[LabTrace +${entry.elapsedMs}ms][${scope}] ${message}`
  if (data !== undefined) console.log(prefix, data)
  else console.log(prefix)

  emit()
}

export function subscribeLabTrace(listener: Listener): () => void {
  listeners.add(listener)
  listener(entries.slice())
  return () => {
    listeners.delete(listener)
  }
}

export function getLabTraceEntries(): readonly LabTraceEntry[] {
  return window.logTrace
}
