import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatNumber, formatRupiah, formatDateTime } from '../../lib/format'

const PAGE_SIZE = 25

export default function AdminTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [voidTab, setVoidTab] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [voidingId, setVoidingId] = useState(null)
  const [confirmVoid, setConfirmVoid] = useState(null)

  useEffect(() => { setPage(0) }, [typeFilter, voidTab])

  useEffect(() => {
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, voidTab, page])

  async function loadTransactions() {
    setLoading(true)
    setErrorMsg('')
    let query = supabase
      .from('stock_transactions')
      .select('id, type, quantity, unit_price, cost_price, payment_method, note, created_at, is_void, voided_at, product_id, products(name, unit), profiles!created_by(full_name)')
      .eq('is_void', voidTab)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (typeFilter !== 'all') query = query.eq('type', typeFilter)

    const { data, error } = await query
    if (!error) {
      setTransactions(data || [])
      setHasMore((data || []).length === PAGE_SIZE)
    } else {
      setErrorMsg(error.message)
    }
    setLoading(false)
  }

  async function handleVoid(tx) {
    setConfirmVoid(null)
    setVoidingId(tx.id)
    setErrorMsg('')

    const { error: voidError } = await supabase
      .from('stock_transactions')
      .update({ is_void: true, voided_at: new Date().toISOString(), voided_by: user.id })
      .eq('id', tx.id)

    if (voidError) {
      setErrorMsg('Gagal void transaksi: ' + voidError.message)
      setVoidingId(null)
      return
    }

    const reverseType = tx.type === 'out' ? 'in' : 'out'
    const { error: stockError } = await supabase.from('stock_transactions').insert({
      product_id: tx.product_id,
      type: reverseType,
      quantity: Number(tx.quantity),
      unit_price: Number(tx.unit_price),
      cost_price: Number(tx.cost_price || 0),
      note: `[VOID] Pembatalan transaksi #${tx.id.slice(0, 8)}`,
      is_void: true,
      voided_at: new Date().toISOString(),
      voided_by: user.id,
      created_by: user.id,
    })

    if (stockError) setErrorMsg('Transaksi di-void tapi stok gagal dikembalikan: ' + stockError.message)
    setVoidingId(null)
    await loadTransactions()
  }

  const colSpan = voidTab ? 7 : 9

  return (
    <div className="flex flex-col gap-5">
      {confirmVoid && (
        <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4" onClick={() => setConfirmVoid(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-semibold text-navy-900 mb-1">Void Transaksi?</p>
              <p className="text-sm text-slate-450">
                Transaksi ini akan ditandai <span className="font-medium text-rust-500">VOID</span> dan stok dikembalikan otomatis. Jejak tetap tersimpan di tab Void.
              </p>
            </div>
            <div className="rounded-lg bg-frost-50 border border-frost-200 px-4 py-3 text-sm flex flex-col gap-1">
              <div className="flex justify-between"><span className="text-slate-450">Produk</span><span className="font-medium">{confirmVoid.tx.products?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-450">Jumlah</span><span className="num">{formatNumber(confirmVoid.tx.quantity)} {confirmVoid.tx.products?.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-450">Nilai</span><span className="num">{formatRupiah(Number(confirmVoid.tx.quantity) * Number(confirmVoid.tx.unit_price))}</span></div>
              <div className="flex justify-between"><span className="text-slate-450">Tanggal</span><span>{formatDateTime(confirmVoid.tx.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-slate-450">Kasir</span><span>{confirmVoid.tx.profiles?.full_name || '-'}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleVoid(confirmVoid.tx)} className="flex-1 bg-rust-500 hover:bg-rust-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Ya, Void Transaksi</button>
              <button onClick={() => setConfirmVoid(null)} className="px-4 py-2.5 border border-frost-200 text-sm font-medium text-slate-450 hover:text-navy-900 rounded-lg transition-colors">Batal</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <p className="label-eyebrow mb-1">Riwayat Transaksi</p>
          <p className="text-sm text-slate-450">Seluruh catatan barang masuk dan keluar</p>
        </div>

        {/* Tab Aktif / Void */}
        <div className="flex gap-1 p-1 bg-frost-100 rounded-xl w-fit border border-frost-200">
          {[{ value: false, label: 'Aktif' }, { value: true, label: 'Void' }].map((t) => (
            <button
              key={String(t.value)}
              onClick={() => setVoidTab(t.value)}
              className={`text-sm font-medium px-5 py-2 rounded-lg transition-colors ${
                voidTab === t.value
                  ? t.value ? 'bg-rust-500 text-white shadow-sm' : 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-450 hover:text-navy-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter tipe — hanya tampil di tab Aktif */}
        {!voidTab && (
          <div className="flex gap-2">
            {[{ key: 'all', label: 'Semua' }, { key: 'in', label: 'Masuk' }, { key: 'out', label: 'Keluar' }].map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  typeFilter === f.key ? 'bg-navy-900 text-frost-50 border-navy-900' : 'border-frost-200 text-slate-450 hover:text-navy-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-sm text-rust-500 bg-rust-500/5 border border-rust-500/20 rounded-lg px-4 py-3">{errorMsg}</p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-frost-50 border-b border-frost-200">
                <Th>Tanggal</Th>
                <Th>Produk</Th>
                <Th>Tipe</Th>
                <Th>Jumlah</Th>
                <Th>Nilai</Th>
                {!voidTab && <Th>Pembayaran</Th>}
                <Th>Kasir</Th>
                <Th>{voidTab ? 'Waktu Void' : 'Catatan'}</Th>
                {!voidTab && <Th>Aksi</Th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colSpan} className="px-4 py-6 text-center text-slate-450">Memuat…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={colSpan} className="px-4 py-6 text-center text-slate-450">
                  {voidTab ? 'Belum ada transaksi yang di-void.' : 'Belum ada transaksi.'}
                </td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className={`border-b border-frost-200 last:border-0 ${voidTab ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-slate-450 whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-navy-900">
                      <span className={voidTab ? 'line-through' : ''}>{tx.products?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`label-eyebrow ${tx.type === 'in' ? 'text-ice-600' : 'text-amber-500'}`}>
                        {tx.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 num">{formatNumber(tx.quantity)} {tx.products?.unit}</td>
                    <td className="px-4 py-3 num">{formatRupiah(Number(tx.quantity) * Number(tx.unit_price))}</td>
                    {!voidTab && (
                      <td className="px-4 py-3">
                        {tx.payment_method
                          ? <span className={`label-eyebrow ${tx.payment_method === 'cash' ? 'text-amber-500' : 'text-ice-600'}`}>{tx.payment_method === 'cash' ? 'Cash' : 'Transfer'}</span>
                          : <span className="text-slate-450">-</span>}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-450">{tx.profiles?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-450 max-w-[160px] truncate">
                      {voidTab ? (tx.voided_at ? formatDateTime(tx.voided_at) : '-') : (tx.note || '-')}
                    </td>
                    {!voidTab && (
                      <td className="px-4 py-3 text-right">
                        {tx.type === 'out' ? (
                          <button
                            onClick={() => setConfirmVoid({ tx })}
                            disabled={voidingId === tx.id}
                            className="text-xs font-medium text-rust-500 hover:text-rust-600 disabled:opacity-40 border border-rust-500/30 hover:border-rust-500 px-2.5 py-1 rounded-md transition-colors"
                          >
                            {voidingId === tx.id ? 'Memproses…' : 'Void'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-450">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="text-xs font-medium text-slate-450 hover:text-navy-900 disabled:opacity-30">← Sebelumnya</button>
        <span className="label-eyebrow">Halaman {page + 1}</span>
        <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="text-xs font-medium text-slate-450 hover:text-navy-900 disabled:opacity-30">Selanjutnya →</button>
      </div>
    </div>
  )
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left label-eyebrow font-medium text-slate-450">{children}</th>
}
