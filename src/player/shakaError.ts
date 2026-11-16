/** Pretty-print Shaka error objects (code 3015 = MEDIA_SOURCE_OPERATION_THREW). */
export function formatShakaError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as {
      code?: number
      category?: number
      severity?: number
      message?: string
      data?: unknown[]
    }
    if (e.code != null) {
      const known: Record<number, string> = {
        3015: 'MEDIA_SOURCE_OPERATION_THREW',
        4012: 'RESTRICTIONS_CANNOT_BE_MET',
        4032: 'CONTENT_UNSUPPORTED_BY_BROWSER',
        4036: 'NO_VARIANTS',
      }
      const name = known[e.code] ?? `code=${e.code}`
      return `shaka ${name} cat=${e.category} sev=${e.severity} data=${JSON.stringify(e.data ?? [])}`
    }
    if (err instanceof Error) return err.message
  }
  return String(err)
}

export function shakaErrorPayload(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== 'object') return { raw: String(err) }
  const e = err as {
    code?: number
    category?: number
    severity?: number
    message?: string
    data?: unknown[]
    handled?: boolean
  }
  return {
    code: e.code,
    name:
      e.code === 3015
        ? 'MEDIA_SOURCE_OPERATION_THREW'
        : e.code === 4032
          ? 'CONTENT_UNSUPPORTED_BY_BROWSER'
          : e.code === 4012
            ? 'RESTRICTIONS_CANNOT_BE_MET'
            : undefined,
    category: e.category,
    severity: e.severity,
    message: e.message,
    data: e.data,
    handled: e.handled,
  }
}
