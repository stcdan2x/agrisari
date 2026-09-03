import { NavLink } from 'react-router-dom'

// One list drives both layouts. `tab: true` marks the five sections that fit a
// phone tab bar; Purchasing, Guide and Settings sit in the phone top bar and in the sidebar.
export const SECTIONS = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: '🏠', tab: true },
  { to: '/sales', label: 'Sales', short: 'Sales', icon: '🧾', tab: true },
  { to: '/inventory', label: 'Inventory', short: 'Stock', icon: '📦', tab: true },
  { to: '/finance', label: 'Finance', short: 'Money', icon: '💰', tab: true },
  { to: '/plan', label: 'Plan', short: 'Plan', icon: '📈', tab: true },
  { to: '/purchasing', label: 'Purchasing', short: 'Buy', icon: '🛒', tab: false },
  { to: '/guide', label: 'Guide', short: 'Guide', icon: '📖', tab: false },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: '⚙️', tab: false },
] as const

const active = (isActive: boolean) => (isActive ? 'text-brand-600' : 'text-slate-400')

export function TabBar() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white md:hidden">
      <div className="mx-auto flex max-w-lg">
        {SECTIONS.filter((s) => s.tab).map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(isActive)}`
            }
          >
            <span className="text-xl leading-none">{s.icon}</span>
            {s.short}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function TopBar() {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 md:hidden">
      <span className="font-bold text-brand-600">AgriSari</span>
      <div className="flex gap-1">
        {SECTIONS.filter((s) => !s.tab).map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            aria-label={s.label}
            className={({ isActive }) => `rounded-lg px-2 py-1 text-xl leading-none ${active(isActive)}`}
          >
            {s.icon}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="px-5 pb-2 pt-6 text-xl font-bold text-brand-600">AgriSari</div>
      <nav className="flex flex-col gap-0.5 px-3">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <span className="text-lg leading-none">{s.icon}</span>
            {s.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
