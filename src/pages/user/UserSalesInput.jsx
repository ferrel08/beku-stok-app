import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatNumber, formatRupiah, formatDateTime } from '../../lib/format'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
]

export default function UserSalesInput() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [recent, setRecent] = useState([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, unit, price_sell, price_buy, stock')
      .eq('is_active', true)
      .order('name')
    setProducts(data || [])
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('stock_transactions')
      .select('id, quantity, unit_price, payment_method, note, created_at, products(name, unit)')
      .eq('type', 'out')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(8)
    setRecent(data || [])
  }

  useEffect(() => {
    loadProducts()
    loadRecent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedProduct = products.find((p) => p.id === productId)
  const subtotal = selectedProduct ? Number(quantity || 0) * Number(selectedProduct.price_sell) : 0

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    if (!productId || !quantity || Number(quantity) <= 0) {
      setMessage({ type: 'error', text: 'Pilih produk dan isi jumlah yang valid.' })
      return
    }
    if (selectedProduct && Number(quantity) > Number(selectedProduct.stock)) {
      setMessage({
        type: 'error',
        text: `Stok ${selectedProduct.name} hanya tersisa ${formatNumber(selectedProduct.stock)} ${
          selectedProduct.unit
        }.`,
      })
      return
    }

    setSaving(true)
    const { error } = await supabase.from('stock_transactions').insert({
      product_id: productId,
      type: 'out',
      quantity: Number(quantity),
      unit_price: Number(selectedProduct.price_sell) || 0,
      cost_price: Number(selectedProduct.price_buy) || 0,
      payment_method: paymentMethod,
      note: note.trim() || null,
      created_by: user.id,
    })
    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Penjualan berhasil dicatat.' })
      setQuantity('')
      setNote('')
      setProductId('')
      setPaymentMethod('cash')
      await Promise.all([loadProducts(), loadRecent()])
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4 lg:col-span-2 h-fit">
        <p className="label-eyebrow">Catat Penjualan</p>

        <label className="block">
          <span className="label-eyebrow block mb-1.5">Produk *</span>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="input"
          >
            <option value="">Pilih produk…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (stok: {formatNumber(p.stock)} {p.unit})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label-eyebrow block mb-1.5">
            Jumlah {selectedProduct ? `(${selectedProduct.unit})` : ''} *
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input"
            placeholder="0"
          />
        </label>

        {/* Pilihan metode pembayaran: tombol toggle Cash / Transfer */}
        <div>
          <span className="label-eyebrow block mb-1.5">Metode Pembayaran *</span>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPaymentMethod(m.value)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  paymentMethod === m.value
                    ? 'bg-navy-900 text-frost-50 border-navy-900'
                    : 'border-frost-200 text-slate-450 hover:text-navy-900 hover:border-navy-900/30'
                }`}
              >
                {m.value === 'cash' ? '💵' : '🏦'} {m.label}
              </button>
            ))}
          </div>
        </div>

        {selectedProduct && (
          <div className="flex items-center justify-between rounded-lg bg-frost-50 border border-frost-200 px-3 py-2.5">
            <span className="label-eyebrow">Subtotal</span>
            <span className="num text-base font-semibold text-navy-900">
              {formatRupiah(subtotal)}
            </span>
          </div>
        )}

        <label className="block">
          <span className="label-eyebrow block mb-1.5">Catatan</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="Mis. nama pembeli"
          />
        </label>

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 border ${
              message.type === 'error'
                ? 'text-rust-500 bg-rust-500/5 border-rust-500/20'
                : 'text-ice-600 bg-ice-400/10 border-ice-400/30'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-navy-900 hover:bg-navy-800 text-frost-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan Penjualan'}
        </button>
      </form>

      <div className="card p-6 lg:col-span-3">
        <p className="label-eyebrow mb-4">Penjualan Terbaru Saya</p>
        <div className="flex flex-col divide-y divide-frost-200">
          {recent.length === 0 && <p className="text-sm text-slate-450 py-2">Belum ada catatan.</p>}
          {recent.map((tx) => (
            <div key={tx.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-navy-900">{tx.products?.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-450">{formatDateTime(tx.created_at)}</p>
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
                <p className="num font-medium text-navy-900">
                  {formatRupiah(Number(tx.quantity) * Number(tx.unit_price))}
                </p>
                <p className="text-xs text-slate-450">
                  {formatNumber(tx.quantity)} {tx.products?.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
