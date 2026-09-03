import { useState } from 'react'
import { Badge } from '../../components/ui'
import type { Explanation } from '../../knowledge/cite'
import type { Priority } from '../../engine/buying'

// One recommendation card body: the explanation paragraph and, on demand, the assumptions
// it used with their value, source row and origin (research default, store setting, history).
export function Explain({ e }: { e: Explanation }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1 text-sm text-slate-600">
      <p>{e.text}</p>
      <button type="button" className="mt-1 text-xs font-semibold text-brand-700" onClick={() => setOpen(!open)}>
        {open ? 'Hide assumptions' : `Assumptions (${e.assumptions.length})`}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
          {e.assumptions.map((a, i) => (
            <li key={i}>
              <span className="font-medium text-slate-700">{a.label}:</span> {String(a.value)}{' '}
              <span className="text-slate-400">
                ({a.source}, {a.origin === 'research' ? 'research default' : a.origin === 'store' ? 'your setting' : 'your history'})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PriorityBadge({ p }: { p: Priority }) {
  return <Badge tone={p === 'high' ? 'red' : p === 'medium' ? 'amber' : 'slate'}>{p}</Badge>
}

export function Notes({ notes }: { notes: Explanation[] }) {
  if (notes.length === 0) return null
  return (
    <div className="mx-4 mb-4 rounded-xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
      <h2 className="mb-2 text-base font-bold">What the rules could not do</h2>
      {notes.map((n, i) => (
        <Explain key={i} e={n} />
      ))}
    </div>
  )
}
