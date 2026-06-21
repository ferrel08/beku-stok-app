import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminStockIn from './pages/admin/AdminStockIn'
import AdminTransactions from './pages/admin/AdminTransactions'
import UserSalesInput from './pages/user/UserSalesInput'
import UserSalesHistory from './pages/user/UserSalesHistory'

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/produk', label: 'Produk' },
  { to: '/admin/barang-masuk', label: 'Barang Masuk' },
  { to: '/admin/transaksi', label: 'Transaksi' },
]

const userNav = [
  { to: '/user', label: 'Input Penjualan', end: true },
  { to: '/user/riwayat', label: 'Riwayat Saya' },
]

function AdminPage({ title, children }) {
  return (
    <Layout navItems={adminNav} title={title}>
      {children}
    </Layout>
  )
}

function UserPage({ title, children }) {
  return (
    <Layout navItems={userNav} title={title}>
      {children}
    </Layout>
  )
}

function RootRedirect() {
  const { session, role, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={role === 'admin' ? '/admin' : '/user'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowRole="admin">
                <AdminPage title="Dashboard">
                  <AdminDashboard />
                </AdminPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/produk"
            element={
              <ProtectedRoute allowRole="admin">
                <AdminPage title="Produk">
                  <AdminProducts />
                </AdminPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/barang-masuk"
            element={
              <ProtectedRoute allowRole="admin">
                <AdminPage title="Barang Masuk">
                  <AdminStockIn />
                </AdminPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transaksi"
            element={
              <ProtectedRoute allowRole="admin">
                <AdminPage title="Transaksi">
                  <AdminTransactions />
                </AdminPage>
              </ProtectedRoute>
            }
          />

          <Route
            path="/user"
            element={
              <ProtectedRoute allowRole="user">
                <UserPage title="Input Penjualan">
                  <UserSalesInput />
                </UserPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/riwayat"
            element={
              <ProtectedRoute allowRole="user">
                <UserPage title="Riwayat Saya">
                  <UserSalesHistory />
                </UserPage>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
