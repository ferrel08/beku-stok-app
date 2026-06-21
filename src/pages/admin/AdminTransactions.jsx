import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatNumber, formatRupiah, formatDateTime } from '../../lib/format'

const PAGE_SIZE = 25

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    setPage(0)
  }, [typeFilter])

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('stock_transactions')
        .select(
          'id, type, quantity, unit_price, cost_price, note, created_at, products(name, unit), profiles(full_name)'
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }

      const { data, error } = await query
      if (!error) {
        setTransactions(data || [])
        setHasMore((data || []).length === PAGE_SIZE)
      }
      setLoading(false)
    }
    load()
  }, [typeFilter, page])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-eyebrow mb-1">Riwayat Transaksi</p>
          <p className="text-sm text-slate-450">Seluruh catatan barang masuk dan keluar</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'in', label: 'Masuk' },
            { key: 'out', label: 'Keluar' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                typeFilter === f.key
                  ? 'bg-navy-900 text-frost-50 border-navy-900'
                  : 'border-frost-200 text-slate-450 hover:text-navy-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-frost-50 border-b border-frost-200">
              <Th>Tanggal</Th>
              <Th>Produk</Th>
              <Th>Tipe</Th>
              <Th>Jumlah</Th>
              <Th>Nilai</Th>
              <Th>Dicatat oleh</Th>
              <Th>Catatan</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-450">
                  Memuat…
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-450">
                  Belum ada transaksi.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-frost-200 last:border-0">
                  <td className="px-4 py-3 text-slate-450 whitespace-nowrap">
                    {formatDateTime(tx.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-navy-900">{tx.products?.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`label-eyebrow ${
                        tx.type === 'in' ? 'text-ice-600' : 'text-amber-500'
                      }`}
                    >
                      {tx.type === 'in' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 num">
                    {formatNumber(tx.quantity)} {tx.products?.unit}
                  </td>
                  <td className="px-4 py-3 num">
                    {formatRupiah(Number(tx.quantity) * Number(tx.unit_price))}
                  </td>
                  <td className="px-4 py-3 text-slate-450">{tx.profiles?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-450">{tx.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="text-xs font-medium text-slate-450 hover:text-navy-900 disabled:opacity-30"
        >
          ← Sebelumnya
        </button>
        <span className="label-eyebrow">Halaman {page + 1}</span>
        <button
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
          className="text-xs font-medium text-slate-450 hover:text-navy-900 disabled:opacity-30"
        >
          Selanjutnya →
        </button>
      </div>
    </div>
  )
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left label-eyebrow font-medium text-slate-450">{children}</th>
  )
}
