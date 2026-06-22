import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatNumber, formatRupiah, formatDate, daysAgo, dateKey } from '../../lib/format'

export default function UserSalesHistory() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const since = daysAgo(30).toISOString()
      const { data } = await supabase
        .from('stock_transactions')
        .select('id, quantity, unit_price, payment_method, note, created_at, products(name, unit)')
        .eq('type', 'out')
        .eq('created_by', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
      setTransactions(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const groupedByDay = useMemo(() => {
    const groups = {}
    transactions.forEach((tx) => {
      const key = dateKey(tx.created_at)
      if (!groups[key]) groups[key] = { date: tx.created_at, items: [], total: 0 }
      groups[key].items.push(tx)
      groups[key].total += Number(tx.quantity) * Number(tx.unit_price)
    })
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [transactions])

  if (loading) {
    return <p className="label-eyebrow">Memuat riwayat…</p>
  }

  if (groupedByDay.length === 0) {
    return <p className="text-sm text-slate-450">Belum ada penjualan dalam 30 hari terakhir.</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {groupedByDay.map((day) => (
        <div key={day.date} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-navy-900">{formatDate(day.date)}</p>
            <p className="num text-sm font-semibold text-ice-600">{formatRupiah(day.total)}</p>
          </div>
          <div className="flex flex-col divide-y divide-frost-200">
            {day.items.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="text-navy-900">{tx.products?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {tx.note && <p className="text-xs text-slate-450">{tx.note}</p>}
                    {tx.payment_method && (
                      <span className={`label-eyebrow ${
                        tx.payment_method === 'cash' ? 'text-amber-500' : 'text-ice-600'
                      }`}>
                        {tx.payment_method === 'cash' ? 'Cash' : 'Transfer'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="num text-navy-900">{formatRupiah(Number(tx.quantity) * Number(tx.unit_price))}</p>
                  <p className="text-xs text-slate-450">
                    {formatNumber(tx.quantity)} {tx.products?.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
