import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ navItems, title, children }) {
  const { profile, signOut } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-frost-100">
      {/* Overlay gelap di belakang sidebar saat menu mobile terbuka */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-navy-950/60 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-navy-900 text-frost-50 flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0 lg:w-60
        ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-display text-[15px] tracking-tight leading-none">BEKU.STOK</p>
            <p className="label-eyebrow text-ice-400 mt-1.5">Frozen Food Ledger</p>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden text-frost-50/60 hover:text-frost-50 p-1"
            aria-label="Tutup menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileNavOpen(false)}
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
        <header className="h-16 shrink-0 border-b border-frost-200 bg-white flex items-center gap-3 px-4 sm:px-8">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden text-navy-900 p-1 -ml-1"
            aria-label="Buka menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M3 6h16M3 11h16M3 16h16"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-navy-900 truncate">{title}</h1>
        </header>
        <main className="flex-1 px-4 sm:px-8 py-5 sm:py-7 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
