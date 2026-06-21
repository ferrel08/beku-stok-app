import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatNumber, formatDateTime } from '../../lib/format'

export default function AdminStockIn() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [recent, setRecent] = useState([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, unit, price_buy, stock')
      .eq('is_active', true)
      .order('name')
    setProducts(data || [])
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('stock_transactions')
      .select('id, quantity, unit_price, note, created_at, products(name, unit)')
      .eq('type', 'in')
      .order('created_at', { ascending: false })
      .limit(8)
    setRecent(data || [])
  }

  useEffect(() => {
    loadProducts()
    loadRecent()
  }, [])

  function handleProductChange(id) {
    setProductId(id)
    const product = products.find((p) => p.id === id)
    setUnitPrice(product ? product.price_buy : '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    if (!productId || !quantity || Number(quantity) <= 0) {
      setMessage({ type: 'error', text: 'Pilih produk dan isi jumlah yang valid.' })
      return
    }

    setSaving(true)
    const { error } = await supabase.from('stock_transactions').insert({
      product_id: productId,
      type: 'in',
      quantity: Number(quantity),
      unit_price: Number(unitPrice) || 0,
      note: note.trim() || null,
      created_by: user.id,
    })
    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Stok masuk berhasil dicatat.' })
      setQuantity('')
      setNote('')
      await Promise.all([loadProducts(), loadRecent()])
    }
  }

  const selectedProduct = products.find((p) => p.id === productId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4 lg:col-span-2 h-fit">
        <p className="label-eyebrow">Catat Barang Masuk</p>

        <label className="block">
          <span className="label-eyebrow block mb-1.5">Produk *</span>
          <select
            required
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
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

        <label className="block">
          <span className="label-eyebrow block mb-1.5">Harga Beli per Unit (Rp)</span>
          <input
            type="number"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="input"
          />
        </label>

        <label className="block">
          <span className="label-eyebrow block mb-1.5">Catatan</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="Mis. supplier, no. nota"
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
          {saving ? 'Menyimpan…' : 'Simpan Barang Masuk'}
        </button>
      </form>

      <div className="card p-6 lg:col-span-3">
        <p className="label-eyebrow mb-4">Riwayat Terbaru</p>
        <div className="flex flex-col divide-y divide-frost-200">
          {recent.length === 0 && <p className="text-sm text-slate-450 py-2">Belum ada catatan.</p>}
          {recent.map((tx) => (
            <div key={tx.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-navy-900">{tx.products?.name}</p>
                <p className="text-xs text-slate-450">{formatDateTime(tx.created_at)}</p>
              </div>
              <span className="num text-ice-600 font-medium">
                +{formatNumber(tx.quantity)} {tx.products?.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
