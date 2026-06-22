import { formatRupiah, formatDateTime } from '../lib/format'

function generateReceiptHTML({ receiptNumber, productName, quantity, unit, unitPrice, paymentMethod, note, createdAt, cashierName }) {
  const total = quantity * unitPrice

  // Konversi logo jadi base64 supaya muncul di window print baru
  // (window baru tidak bisa akses /logo.jpg lewat relative path)
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Struk - ${receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 58mm;
      padding: 4mm;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 10px; color: #555; }
    .logo {
      width: 50px; height: 50px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      margin: 0 auto 6px;
    }
    .divider {
      border: none;
      border-top: 1px dashed #999;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .row .label { color: #555; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 13px;
      margin: 4px 0;
    }
    .product-name { margin-bottom: 2px; }
    .product-detail {
      display: flex;
      justify-content: space-between;
      color: #333;
    }
    .footer { text-align: center; color: #777; font-size: 10px; margin-top: 4px; }
    @media print {
      @page { margin: 0; size: 58mm auto; }
      body { width: 58mm; }
    }
  </style>
</head>
<body>
  <div class="center" style="margin-bottom:8px">
    <img src="${window.location.origin}/logo.jpg" alt="Bunds Kitchen" class="logo" />
    <div class="bold" style="font-size:13px;letter-spacing:1px">BUNDS KITCHEN</div>
    <div class="small">Homemade With Love</div>
    <div class="small">0811-1440-912</div>
  </div>

  <hr class="divider" />

  <div class="row"><span class="label">No.</span><span>${receiptNumber}</span></div>
  <div class="row"><span class="label">Tanggal</span><span>${formatDateTime(createdAt)}</span></div>
  <div class="row"><span class="label">Kasir</span><span>${cashierName}</span></div>

  <hr class="divider" />

  <div class="bold" style="margin-bottom:4px">Detail Pembelian</div>
  <div class="product-name">${productName}</div>
  <div class="product-detail">
    <span class="small">${quantity} ${unit} × ${formatRupiah(unitPrice)}</span>
    <span class="bold">${formatRupiah(total)}</span>
  </div>

  <hr class="divider" />

  <div class="total-row">
    <span>TOTAL</span>
    <span>${formatRupiah(total)}</span>
  </div>
  <div class="row">
    <span class="label">Pembayaran</span>
    <span>${paymentMethod === 'cash' ? 'Cash' : 'Transfer'}</span>
  </div>
  ${note ? `<div class="row"><span class="label">Catatan</span><span>${note}</span></div>` : ''}

  <hr class="divider" />

  <div class="footer">
    <div>Terima kasih sudah berbelanja!</div>
    <div>Semoga harimu menyenangkan 🧡</div>
  </div>

  <script>
    // Tunggu gambar logo selesai load baru print
    window.onload = function() {
      var img = document.querySelector('img');
      function doPrint() {
        setTimeout(function() {
          window.print();
          // Tutup window setelah print dialog ditutup
          setTimeout(function() { window.close(); }, 500);
        }, 300);
      }
      if (img.complete) {
        doPrint();
      } else {
        img.onload = doPrint;
        img.onerror = doPrint; // tetap print walau logo gagal load
      }
    }
  </script>
</body>
</html>`
}

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
    const html = generateReceiptHTML(transaction)
    const printWindow = window.open('', '_blank', 'width=300,height=600,scrollbars=yes')
    if (!printWindow) {
      alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.')
      return
    }
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div
      className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4"
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

        {/* Preview struk */}
        <div className="px-5 py-5 font-mono text-[12px] text-navy-900 leading-relaxed">
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
          <Row label="No." value={receiptNumber} />
          <Row label="Tanggal" value={formatDateTime(createdAt)} />
          <Row label="Kasir" value={cashierName} />
          <Divider />

          <p className="font-bold mb-1">Detail Pembelian</p>
          <p className="truncate">{productName}</p>
          <div className="flex justify-between mt-0.5">
            <span className="text-slate-450">
              {quantity} {unit} × {formatRupiah(unitPrice)}
            </span>
            <span className="font-bold">{formatRupiah(total)}</span>
          </div>

          <Divider />

          <div className="flex justify-between font-bold text-[13px]">
            <span>TOTAL</span>
            <span>{formatRupiah(total)}</span>
          </div>
          <Row label="Pembayaran" value={paymentMethod === 'cash' ? 'Cash' : 'Transfer'} />
          {note && <Row label="Catatan" value={note} />}

          <Divider />
          <p className="text-center text-[10px] text-slate-450 mt-1">Terima kasih sudah berbelanja!</p>
          <p className="text-center text-[10px] text-slate-450">Semoga harimu menyenangkan 🧡</p>
        </div>

        {/* Tombol aksi */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 bg-navy-900 hover:bg-navy-800 text-frost-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            🖨️ Cetak / Simpan PDF
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
  )
}

function Divider() {
  return <div className="border-t border-dashed border-navy-900/20 my-2" />
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-450 shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
