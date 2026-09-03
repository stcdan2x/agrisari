import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500 disabled:bg-slate-100'
export const btnPrimary = 'rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white disabled:opacity-40'
export const btnSecondary = 'rounded-xl bg-white px-4 py-2.5 font-semibold text-slate-600 ring-1 ring-slate-300'
export const btnDanger = 'rounded-xl bg-white px-4 py-2.5 font-semibold text-red-600 ring-1 ring-red-200'

export const peso = (n: number) => '₱' + n.toLocaleString('en-PH', { maximumFractionDigits: 2 })

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-4 mb-4 rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span>
        {label} {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function Check({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-slate-500">{hint}</span>}
      </span>
    </label>
  )
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="text-sm font-medium text-red-600">{error}</p> : null
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

type Tone = 'brand' | 'slate' | 'amber' | 'red' | 'green'
const TONES: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  green: 'bg-green-50 text-green-700',
}
export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400">{children}</p>
}

export function LinkButton({ to, children, secondary }: { to: string; children: ReactNode; secondary?: boolean }) {
  return (
    <Link to={to} className={`inline-block text-center text-sm ${secondary ? btnSecondary : btnPrimary}`}>
      {children}
    </Link>
  )
}

export function SubNav({ items }: { items: { to: string; label: string; end?: boolean }[] }) {
  return (
    <nav className="mx-4 mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          className={({ isActive }) =>
            `flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm font-medium ${
              isActive ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
            }`
          }
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function ListItem({ to, title, subtitle, right }: { to: string; title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <div className="truncate font-semibold">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-right text-xs text-slate-500">{right}</div>}
    </Link>
  )
}
