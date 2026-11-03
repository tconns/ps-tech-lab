export type LabTraceEntry = {
  t: number
  elapsedMs: number
  scope: string
  message: string
  data?: unknown
}

type Listener = (entries: readonly LabTraceEntry[]) => void

const MAX = 80
const startedAt = performance.now()
const entries: LabTraceEntry[] = []
const listeners = new Set<Listener>()

function emit(): void {
  const snapshot = entries.slice()
  for (const listener of listeners) listener(snapshot)
}

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
  return entries
}
