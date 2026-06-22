import { formatRupiah, formatDateTime } from '../lib/format'

// Komponen modal preview struk — muncul setelah penjualan berhasil disimpan.
// Struk didesain ramping (58mm thermal printer) tapi tetap bisa dicetak
// dari printer biasa karena pakai @media print CSS.
export default function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null

  const {
    receiptNumber,
    productName,
    quantity,
    unit,
    unitPrice,
    paymentMethod,
    note,
    createdAt,
    cashierName,
  } = transaction

  const total = quantity * unitPrice

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4 print:hidden"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header modal */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-frost-200">
            <p className="label-eyebrow">Preview Struk</p>
            <button
              onClick={onClose}
              className="text-slate-450 hover:text-navy-900 transition-colors"
              aria-label="Tutup"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Area struk */}
          <div id="receipt-print-area" className="px-5 py-5 font-mono text-[12px] text-navy-900 leading-relaxed">
            {/* Logo & nama toko */}
            <div className="text-center mb-3">
              <img
                src="/logo.jpg"
                alt="Bunds Kitchen"
                className="w-14 h-14 rounded-full object-cover mx-auto mb-2 border border-frost-200"
              />
              <p className="font-bold text-[13px] tracking-wide">BUNDS KITCHEN</p>
              <p className="text-[10px] text-slate-450">Homemade With Love</p>
              <p className="text-[10px] text-slate-450">0811-1440-912</p>
            </div>

            <Divider />

            {/* Info transaksi */}
            <Row label="No." value={receiptNumber} />
            <Row label="Tanggal" value={formatDateTime(createdAt)} />
            <Row label="Kasir" value={cashierName} />

            <Divider />

            {/* Detail produk */}
            <p className="font-bold mb-1">Detail Pembelian</p>
            <p className="truncate">{productName}</p>
            <div className="flex justify-between mt-0.5">
              <span className="text-slate-450">
                {quantity} {unit} × {formatRupiah(unitPrice)}
              </span>
              <span className="font-bold">{formatRupiah(total)}</span>
            </div>

            <Divider />

            {/* Total & pembayaran */}
            <div className="flex justify-between font-bold text-[13px]">
              <span>TOTAL</span>
              <span>{formatRupiah(total)}</span>
            </div>
            <Row
              label="Pembayaran"
              value={paymentMethod === 'cash' ? 'Cash' : 'Transfer'}
            />
            {note && <Row label="Catatan" value={note} />}

            <Divider />

            <p className="text-center text-[10px] text-slate-450 mt-1">
              Terima kasih sudah berbelanja!
            </p>
            <p className="text-center text-[10px] text-slate-450">
              Semoga harimu menyenangkan 🧡
            </p>
          </div>

          {/* Tombol aksi */}
          <div className="px-5 pb-5 flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 bg-navy-900 hover:bg-navy-800 text-frost-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              🖨️ Cetak Struk
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-frost-200 text-sm font-medium text-slate-450 hover:text-navy-900 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* CSS khusus untuk print — hanya tampilkan area struk, sembunyikan yang lain */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print-area,
          #receipt-print-area * { visibility: visible !important; }
          #receipt-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 58mm !important;
            padding: 4mm !important;
            font-size: 11px !important;
            color: #000 !important;
          }
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}

function Divider() {
  return <div className="border-t border-dashed border-navy-900/20 my-2" />
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-450 shrink-0">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  )
}
