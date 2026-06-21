import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatRupiah } from '../../lib/format'
import StockGauge from '../../components/StockGauge'

const emptyForm = {
  id: null,
  name: '',
  category: '',
  unit: 'pcs',
  price_buy: '',
  price_sell: '',
  reorder_point: 5,
  stock: 0,
}

export default function AdminProducts() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name')
    if (error) setErrorMsg(error.message)
    else setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function openCreate() {
    setForm(emptyForm)
    setShowForm(true)
    setErrorMsg('')
  }

  function openEdit(product) {
    setForm({
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      price_buy: product.price_buy,
      price_sell: product.price_sell,
      reorder_point: product.reorder_point,
      stock: product.stock,
    })
    setShowForm(true)
    setErrorMsg('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'Lainnya',
      unit: form.unit.trim() || 'pcs',
      price_buy: Number(form.price_buy) || 0,
      price_sell: Number(form.price_sell) || 0,
      reorder_point: Number(form.reorder_point) || 0,
    }

    let error
    if (form.id) {
      // Update data produk dulu (tidak termasuk stok)
      ;({ error } = await supabase.from('products').update(payload).eq('id', form.id))

      // Kalau angka stok di form beda dari stok sebelumnya, catat selisihnya
      // sebagai transaksi penyesuaian (bukan langsung timpa angka stok),
      // supaya tetap muncul jejaknya di Riwayat Transaksi.
      if (!error) {
        const original = products.find((p) => p.id === form.id)
        const newStock = Number(form.stock) || 0
        const diff = newStock - Number(original?.stock || 0)

        if (diff !== 0) {
          const adjType = diff > 0 ? 'in' : 'out'
          const adjQty = Math.abs(diff)
          ;({ error } = await supabase.from('stock_transactions').insert({
            product_id: form.id,
            type: adjType,
            quantity: adjQty,
            unit_price: adjType === 'in' ? payload.price_buy : payload.price_sell,
            cost_price: adjType === 'out' ? payload.price_buy : 0,
            note: 'Penyesuaian stok manual',
            created_by: user.id,
          }))
        }
      }
    } else {
      payload.stock = Number(form.stock) || 0
      ;({ error } = await supabase.from('products').insert(payload))
    }

    if (error) {
      setErrorMsg(error.message)
    } else {
      setShowForm(false)
      await loadProducts()
    }
    setSaving(false)
  }

  async function toggleActive(product) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)
    if (error) setErrorMsg(error.message)
    else await loadProducts()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-eyebrow mb-1">Daftar Produk</p>
          <p className="text-sm text-slate-450">Kelola produk frozen food yang Anda jual</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-navy-900 hover:bg-navy-800 text-frost-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          + Tambah Produk
        </button>
      </div>

      {errorMsg && (
        <p className="text-sm text-rust-500 bg-rust-500/5 border border-rust-500/20 rounded-lg px-4 py-3">
          {errorMsg}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <p className="label-eyebrow mb-1">{form.id ? 'Ubah Produk' : 'Produk Baru'}</p>
          </div>
          <Field label="Nama Produk" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Nugget Ayam 500g"
            />
          </Field>
          <Field label="Kategori">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
              placeholder="Nugget & Sosis"
            />
          </Field>
          <Field label="Satuan">
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="input"
              placeholder="pcs / pack / kg"
            />
          </Field>
          <Field label="Harga Beli (Rp)">
            <input
              type="number"
              min="0"
              value={form.price_buy}
              onChange={(e) => setForm({ ...form, price_buy: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Harga Jual (Rp)">
            <input
              type="number"
              min="0"
              value={form.price_sell}
              onChange={(e) => setForm({ ...form, price_sell: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Titik Pesan Ulang">
            <input
              type="number"
              min="0"
              value={form.reorder_point}
              onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
              className="input"
            />
          </Field>
          <Field label={form.id ? 'Stok Saat Ini' : 'Stok Awal'}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="input"
            />
            {form.id && (
              <span className="text-xs text-slate-450 mt-1 block">
                Ubah hanya untuk koreksi (mis. hasil stok opname). Selisihnya otomatis tercatat
                di Riwayat Transaksi.
              </span>
            )}
          </Field>

          <div className="md:col-span-3 flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-navy-900 hover:bg-navy-800 text-frost-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-slate-450 hover:text-navy-900 px-4 py-2.5"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-frost-50 border-b border-frost-200">
              <Th>Produk</Th>
              <Th>Kategori</Th>
              <Th>Stok</Th>
              <Th>Harga Beli</Th>
              <Th>Harga Jual</Th>
              <Th>Status</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-450">
                  Memuat…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-450">
                  Belum ada produk.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-frost-200 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-450">{p.category}</td>
                  <td className="px-4 py-3 w-48">
                    <StockGauge stock={p.stock} reorderPoint={p.reorder_point} unit={p.unit} />
                  </td>
                  <td className="px-4 py-3 num">{formatRupiah(p.price_buy)}</td>
                  <td className="px-4 py-3 num">{formatRupiah(p.price_sell)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`label-eyebrow ${p.is_active ? 'text-ice-600' : 'text-slate-450'}`}
                    >
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs font-medium text-ice-600 hover:text-ice-500 mr-3"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => toggleActive(p)}
                      className="text-xs font-medium text-slate-450 hover:text-rust-500"
                    >
                      {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="label-eyebrow block mb-1.5">
        {label} {required && <span className="text-rust-500">*</span>}
      </span>
      {children}
    </label>
  )
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left label-eyebrow font-medium text-slate-450">{children}</th>
  )
}
