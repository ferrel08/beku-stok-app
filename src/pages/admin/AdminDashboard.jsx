import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import StatCard from '../../components/StatCard'
import StockGauge from '../../components/StockGauge'
import { formatRupiah, formatNumber, dateKey, daysAgo } from '../../lib/format'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'

const RANGE_DAYS = 30

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErrorMsg('')
      const since = daysAgo(RANGE_DAYS).toISOString()

      const [{ data: productData, error: productError }, { data: txData, error: txError }] =
        await Promise.all([
          supabase
            .from('products')
            .select('id, name, category, unit, stock, reorder_point, price_sell')
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('stock_transactions')
            .select('id, product_id, quantity, unit_price, cost_price, type, created_at')
            .eq('type', 'out')
            .gte('created_at', since),
        ])

      if (productError || txError) {
        setErrorMsg(productError?.message || txError?.message || 'Gagal memuat data.')
      } else {
        setProducts(productData || [])
        setTransactions(txData || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const lowStockProducts = useMemo(
    () => products.filter((p) => Number(p.stock) <= Number(p.reorder_point)),
    [products]
  )

  const thisMonthTx = useMemo(() => {
    const now = new Date()
    return transactions.filter((t) => {
      const d = new Date(t.created_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
  }, [transactions])

  const omzetBulanIni = useMemo(
    () => thisMonthTx.reduce((sum, t) => sum + Number(t.quantity) * Number(t.unit_price), 0),
    [thisMonthTx]
  )

  const keuntunganBulanIni = useMemo(
    () =>
      thisMonthTx.reduce(
        (sum, t) => sum + Number(t.quantity) * (Number(t.unit_price) - Number(t.cost_price || 0)),
        0
      ),
    [thisMonthTx]
  )

  const dailyChartData = useMemo(() => {
    const buckets = {}
    for (let i = RANGE_DAYS - 1; i >= 0; i--) {
      const d = daysAgo(i)
      buckets[dateKey(d)] = { date: dateKey(d), omzet: 0 }
    }
    transactions.forEach((t) => {
      const key = dateKey(t.created_at)
      if (buckets[key]) {
        buckets[key].omzet += Number(t.quantity) * Number(t.unit_price)
      }
    })
    return Object.values(buckets).map((b) => ({
      ...b,
      label: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(
        new Date(b.date)
      ),
    }))
  }, [transactions])

  const topProducts = useMemo(() => {
    const byProduct = {}
    transactions.forEach((t) => {
      byProduct[t.product_id] = (byProduct[t.product_id] || 0) + Number(t.quantity)
    })
    return Object.entries(byProduct)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId)
        return { name: product?.name || 'Produk dihapus', qty }
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [transactions, products])

  if (loading) {
    return <p className="label-eyebrow">Memuat data dashboard…</p>
  }

  if (errorMsg) {
    return (
      <p className="text-sm text-rust-500 bg-rust-500/5 border border-rust-500/20 rounded-lg px-4 py-3">
        {errorMsg}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard eyebrow="Omzet Bulan Ini" value={formatRupiah(omzetBulanIni)} tone="navy" />
        <StatCard eyebrow="Keuntungan Bulan Ini" value={formatRupiah(keuntunganBulanIni)} tone="ice" />
        <StatCard eyebrow="Produk Aktif" value={formatNumber(products.length)} tone="navy" />
        <StatCard
          eyebrow="Stok Menipis / Habis"
          value={formatNumber(lowStockProducts.length)}
          tone={lowStockProducts.length > 0 ? 'amber' : 'navy'}
          footnote={lowStockProducts.length > 0 ? 'Perlu restock segera' : 'Semua stok aman'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-eyebrow mb-1">Tren Penjualan</p>
              <p className="text-sm text-slate-450">Omzet harian, {RANGE_DAYS} hari terakhir</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyChartData} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="omzetFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4D8AAD" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4D8AAD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3ECF0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#5B6B79' }}
                interval={Math.floor(RANGE_DAYS / 6)}
                axisLine={{ stroke: '#E3ECF0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#5B6B79' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : v)}
              />
              <Tooltip
                formatter={(value) => formatRupiah(value)}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E3ECF0' }}
              />
              <Area type="monotone" dataKey="omzet" stroke="#4D8AAD" fill="url(#omzetFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <p className="label-eyebrow mb-1">Produk Terlaris</p>
          <p className="text-sm text-slate-450 mb-5">{RANGE_DAYS} hari terakhir, berdasar qty</p>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-450">Belum ada penjualan tercatat.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: '#1B2A41' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${formatNumber(value)} unit`, 'Terjual']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#E3ECF0' }}
                />
                <Bar dataKey="qty" fill="#1B2A41" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-6">
        <p className="label-eyebrow mb-1">Level Stok per Produk</p>
        <p className="text-sm text-slate-450 mb-5">
          Garis vertikal menandai titik pesan ulang (reorder point)
        </p>
        {products.length === 0 ? (
          <p className="text-sm text-slate-450">Belum ada produk. Tambahkan di menu Produk.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {products.map((p) => (
              <div key={p.id}>
                <p className="text-sm font-medium text-navy-900 mb-1.5">{p.name}</p>
                <StockGauge stock={p.stock} reorderPoint={p.reorder_point} unit={p.unit} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
