import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ navItems, title, children }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen flex bg-frost-100">
      <aside className="w-60 shrink-0 bg-navy-900 text-frost-50 flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="font-display text-[15px] tracking-tight leading-none">BEKU.STOK</p>
          <p className="label-eyebrow text-ice-400 mt-1.5">Frozen Food Ledger</p>
        </div>

        <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ice-500/20 text-frost-50'
                    : 'text-frost-50/60 hover:text-frost-50 hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-white/10">
          <p className="text-sm font-medium truncate">{profile?.full_name}</p>
          <p className="label-eyebrow text-frost-50/40 mb-3">
            {profile?.role === 'admin' ? 'Admin' : 'Kasir'}
          </p>
          <button
            onClick={signOut}
            className="text-xs font-medium text-frost-50/70 hover:text-rust-500 transition-colors"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-frost-200 bg-white flex items-center px-8">
          <h1 className="text-lg font-semibold text-navy-900">{title}</h1>
        </header>
        <main className="flex-1 px-8 py-7 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
