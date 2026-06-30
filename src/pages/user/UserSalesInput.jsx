import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatNumber, formatRupiah, formatDateTime } from '../../lib/format'
import ReceiptModal from '../../components/ReceiptModal'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
]

function generateReceiptNumber() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `BK-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export default function UserSalesInput() {
  const { user, profile } = useAuth()
  const [products, setProducts] = useState([])
  const [recentReceipts, setRecentReceipts] = useState([])

  // Form tambah item ke keranjang
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')

  // Keranjang: array of { productId, name, unit, qty, priceSell, priceBuy }
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [receipt, setReceipt] = useState(null)

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, unit, price_sell, price_buy, stock')
      .eq('is_active', true)
      .order('name')
    setProducts(data || [])
  }

  // Ambil transaksi 2 hari terakhir milik kasir ini, lalu kelompokkan per receipt_number
  // supaya satu transaksi belanja (yang mungkin berisi banyak produk) tampil sebagai satu kartu.
  async function loadRecentReceipts() {
    const { data } = await supabase
      .from('stock_transactions')
      .select('id, quantity, unit_price, payment_method, note, created_at, is_void, receipt_number, products(name, unit)')
      .eq('type', 'out')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(40)

    const groups = {}
    ;(data || []).forEach((tx) => {
      const key = tx.receipt_number || tx.id // fallback untuk data lama sebelum fitur ini ada
      if (!groups[key]) {
        groups[key] = {
          key,
          receiptNumber: tx.receipt_number,
          createdAt: tx.created_at,
          paymentMethod: tx.payment_method,
          isVoid: tx.is_void,
          items: [],
          total: 0,
        }
      }
      groups[key].items.push(tx)
      if (!tx.is_void) groups[key].total += Number(tx.quantity) * Number(tx.unit_price)
      // kalau salah satu item void, anggap seluruh nota itu perlu ditandai (kasus umum: void per item)
      if (tx.is_void) groups[key].isVoid = groups[key].items.every((i) => i.is_void)
    })

    setRecentReceipts(Object.values(groups).slice(0, 8))
  }

  useEffect(() => {
    loadProducts()
    loadRecentReceipts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedProduct = products.find((p) => p.id === productId)

  // Stok yang sudah dipakai produk yang sama di keranjang (supaya tidak overselling
  // saat user menambah produk yang sama 2x sebelum disimpan)
  function stockAvailable(product) {
    const usedInCart = cart
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.qty, 0)
    return Number(product.stock) - usedInCart
  }

  function handleAddToCart(e) {
    e.preventDefault()
    setMessage(null)

    if (!productId || !quantity || Number(quantity) <= 0) {
      setMessage({ type: 'error', text: 'Pilih produk dan isi jumlah yang valid.' })
      return
    }

    const available = stockAvailable(selectedProduct)
    if (Number(quantity) > available) {
      setMessage({
        type: 'error',
        text: `Stok ${selectedProduct.name} tersisa ${formatNumber(available)} ${selectedProduct.unit} (sudah dikurangi item di keranjang).`,
      })
      return
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === productId)
      if (existingIndex >= 0) {
        // produk sudah ada di keranjang, gabungkan jumlahnya
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + Number(quantity),
        }
        return updated
      }
      return [
        ...prev,
        {
          productId,
          name: selectedProduct.name,
          unit: selectedProduct.unit,
          qty: Number(quantity),
          priceSell: Number(selectedProduct.price_sell) || 0,
          priceBuy: Number(selectedProduct.price_buy) || 0,
        },
      ]
    })

    setProductId('')
    setQuantity('')
  }

  function handleRemoveFromCart(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  function handleUpdateCartQty(productId, newQty) {
    const qty = Number(newQty)
    if (qty <= 0) {
      handleRemoveFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, qty } : item))
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.priceSell, 0)

  async function handleCheckout() {
    setMessage(null)

    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Keranjang masih kosong. Tambahkan produk dulu.' })
      return
    }

    setSaving(true)
    const receiptNumber = generateReceiptNumber()
    const now = new Date().toISOString()

    const rows = cart.map((item) => ({
      product_id: item.productId,
      type: 'out',
      quantity: item.qty,
      unit_price: item.priceSell,
      cost_price: item.priceBuy,
      payment_method: paymentMethod,
      note: note.trim() || null,
      receipt_number: receiptNumber,
      created_by: user.id,
    }))

    const { error } = await supabase.from('stock_transactions').insert(rows)
    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setReceipt({
        receiptNumber,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.qty,
          unit: item.unit,
          unitPrice: item.priceSell,
        })),
        paymentMethod,
        note: note.trim() || null,
        createdAt: now,
        cashierName: profile?.full_name || 'Kasir',
      })
      setMessage({ type: 'success', text: 'Penjualan berhasil dicatat.' })
      setCart([])
      setNote('')
      setPaymentMethod('cash')
      await Promise.all([loadProducts(), loadRecentReceipts()])
    }
  }

  return (
    <>
      {receipt && <ReceiptModal transaction={receipt} onClose={() => setReceipt(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="card p-6 flex flex-col gap-5 lg:col-span-2 h-fit">
          <p className="label-eyebrow">Catat Penjualan</p>

          {/* Form tambah produk ke keranjang */}
          <form onSubmit={handleAddToCart} className="flex flex-col gap-4">
            <label className="block">
              <span className="label-eyebrow block mb-1.5">Produk</span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="input"
              >
                <option value="">Pilih produk…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (stok: {formatNumber(stockAvailable(p))} {p.unit})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label-eyebrow block mb-1.5">
                Jumlah {selectedProduct ? `(${selectedProduct.unit})` : ''}
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                  placeholder="0"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-ice-500 hover:bg-ice-600 text-white text-sm font-medium px-4 rounded-lg transition-colors"
                >
                  + Tambah
                </button>
              </div>
            </label>
          </form>

          {/* Keranjang */}
          <div className="border-t border-frost-200 pt-4">
            <p className="label-eyebrow mb-2">
              Keranjang {cart.length > 0 && `(${cart.length} item)`}
            </p>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-450 py-2">Belum ada produk ditambahkan.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 bg-frost-50 border border-frost-200 rounded-lg px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-450">
                        {formatRupiah(item.priceSell)} / {item.unit}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => handleUpdateCartQty(item.productId, e.target.value)}
                      className="w-16 text-sm text-center rounded-md border border-frost-200 px-1 py-1.5"
                    />
                    <p className="num text-sm font-medium text-navy-900 w-20 text-right shrink-0">
                      {formatRupiah(item.qty * item.priceSell)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.productId)}
                      className="text-rust-500 hover:text-rust-600 shrink-0"
                      aria-label="Hapus dari keranjang"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metode pembayaran, catatan, total, checkout */}
          <div className="border-t border-frost-200 pt-4 flex flex-col gap-4">
            <div>
              <span className="label-eyebrow block mb-1.5">Metode Pembayaran</span>
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

            <label className="block">
              <span className="label-eyebrow block mb-1.5">Catatan</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input"
                placeholder="Mis. nama pembeli"
              />
            </label>

            <div className="flex items-center justify-between rounded-lg bg-frost-50 border border-frost-200 px-3 py-2.5">
              <span className="label-eyebrow">Total</span>
              <span className="num text-lg font-semibold text-navy-900">{formatRupiah(cartTotal)}</span>
            </div>

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
              type="button"
              onClick={handleCheckout}
              disabled={saving || cart.length === 0}
              className="bg-navy-900 hover:bg-navy-800 text-frost-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Menyimpan…' : 'Simpan Penjualan'}
            </button>
          </div>
        </div>

        {/* Riwayat penjualan terbaru — dikelompokkan per nota */}
        <div className="card p-6 lg:col-span-3">
          <p className="label-eyebrow mb-4">Penjualan Terbaru Saya</p>
          <div className="flex flex-col divide-y divide-frost-200">
            {recentReceipts.length === 0 && (
              <p className="text-sm text-slate-450 py-2">Belum ada catatan.</p>
            )}
            {recentReceipts.map((r) => (
              <div key={r.key} className={`py-3 ${r.isVoid ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-450">{formatDateTime(r.createdAt)}</p>
                    {r.isVoid && (
                      <span className="label-eyebrow text-rust-500 bg-rust-500/10 border border-rust-500/20 px-1.5 py-0.5 rounded">
                        VOID
                      </span>
                    )}
                    {r.paymentMethod && !r.isVoid && (
                      <span className={`label-eyebrow ${r.paymentMethod === 'cash' ? 'text-amber-500' : 'text-ice-600'}`}>
                        {r.paymentMethod === 'cash' ? 'Cash' : 'Transfer'}
                      </span>
                    )}
                  </div>
                  <p className={`num font-medium ${r.isVoid ? 'text-slate-450 line-through' : 'text-navy-900'}`}>
                    {formatRupiah(r.total)}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  {r.items.map((item) => (
                    <p
                      key={item.id}
                      className={`text-xs text-slate-450 ${item.is_void ? 'line-through' : ''}`}
                    >
                      {item.products?.name} — {formatNumber(item.quantity)} {item.products?.unit}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
