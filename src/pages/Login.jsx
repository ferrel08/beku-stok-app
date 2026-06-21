import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, role, loading, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session && role) {
    const redirectTo = location.state?.from || (role === 'admin' ? '/admin' : '/user')
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError('Email atau kata sandi salah. Coba lagi.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl text-frost-50 tracking-tight">BEKU.STOK</p>
          <p className="label-eyebrow text-ice-400 mt-2">Catatan Stok Frozen Food</p>
        </div>

        <form onSubmit={handleSubmit} className="card bg-white p-7 flex flex-col gap-4">
          <div>
            <label className="label-eyebrow block mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-frost-200 px-3 py-2.5 text-sm focus:border-ice-500 outline-none"
              placeholder="nama@tokokamu.com"
            />
          </div>
          <div>
            <label className="label-eyebrow block mb-1.5" htmlFor="password">
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-frost-200 px-3 py-2.5 text-sm focus:border-ice-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-rust-500 bg-rust-500/5 border border-rust-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full bg-navy-900 hover:bg-navy-800 text-frost-50 font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? 'Memeriksa…' : 'Masuk'}
          </button>

          <p className="text-xs text-slate-450 text-center pt-1">
            Akun admin dan kasir dibuat lewat Supabase. Sistem akan mengarahkan ke dashboard atau
            form input penjualan sesuai peran akun Anda.
          </p>
        </form>
      </div>
    </div>
  )
}
