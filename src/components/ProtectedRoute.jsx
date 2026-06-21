import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowRole }) {
  const { session, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-frost-100">
        <p className="label-eyebrow">Memuat sesi…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (allowRole && role && role !== allowRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/user'} replace />
  }

  return children
}
