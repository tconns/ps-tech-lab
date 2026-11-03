import { useEffect, useState } from 'react'
import { subscribeLabTrace, type LabTraceEntry } from './labTrace'

export function LabTraceOverlay() {
  const [entries, setEntries] = useState<readonly LabTraceEntry[]>([])

  useEffect(() => subscribeLabTrace(setEntries), [])

  const recent = entries.slice(-12)

  return (
    <aside className="trace" aria-label="Lab trace">
      {recent.map((e, i) => (
        <div key={`${e.t}-${i}`} className="trace__line">
          <span className="trace__t">+{e.elapsedMs}</span>
          <span className="trace__s">[{e.scope}]</span>
          <span>{e.message}</span>
        </div>
      ))}
    </aside>
  )
}
