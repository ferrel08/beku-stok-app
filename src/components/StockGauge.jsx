import { formatNumber } from '../lib/format'

// Elemen signature aplikasi: gauge bergaya indikator suhu cold-storage,
// dipakai untuk menampilkan level stok tiap produk secara konsisten
// di Dashboard maupun halaman Produk.
export default function StockGauge({ stock, reorderPoint = 5, unit = 'pcs' }) {
  const safeStock = Number(stock) || 0
  const safeReorder = Number(reorderPoint) || 1
  const ceiling = Math.max(safeReorder * 3, safeStock, 1)
  const pct = Math.min(100, Math.max(0, (safeStock / ceiling) * 100))
  const reorderPct = Math.min(100, (safeReorder / ceiling) * 100)

  let status = 'AMAN'
  let barColor = 'bg-ice-500'
  let dotColor = 'bg-ice-500'
  let textColor = 'text-ice-600'

  if (safeStock <= 0) {
    status = 'HABIS'
    barColor = 'bg-rust-500'
    dotColor = 'bg-rust-500'
    textColor = 'text-rust-500'
  } else if (safeStock <= safeReorder) {
    status = 'MENIPIS'
    barColor = 'bg-amber-400'
    dotColor = 'bg-amber-400'
    textColor = 'text-amber-500'
  }

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="num text-sm font-semibold text-navy-900">
          {formatNumber(safeStock)} <span className="text-xs text-slate-450 font-body">{unit}</span>
        </span>
        <span className={`label-eyebrow ${textColor} flex items-center gap-1`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {status}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-navy-900/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
        {/* penanda titik reorder, seperti garis batas pada gauge suhu */}
        <div
          className="absolute top-0 bottom-0 w-px bg-navy-900/30"
          style={{ left: `${reorderPct}%` }}
          title={`Titik pesan ulang: ${formatNumber(safeReorder)} ${unit}`}
        />
      </div>
    </div>
  )
}
