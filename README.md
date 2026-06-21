# Beku.Stok — Catatan Stok & Penjualan Frozen Food

Aplikasi web untuk mencatat stok barang masuk/keluar dan penjualan frozen food,
lengkap dengan dashboard, login berbasis role (admin & kasir), database Supabase,
siap deploy ke Netlify.

## Fitur

**Admin**
- Dashboard: omzet & keuntungan bulan ini, jumlah produk aktif, jumlah produk
  yang stoknya menipis/habis, grafik tren penjualan 30 hari, produk terlaris,
  dan gauge level stok per produk.
- Kelola produk: tambah, ubah, nonaktifkan produk (nama, kategori, satuan,
  harga beli, harga jual, titik pesan ulang).
- Input barang masuk (restock) — hanya admin yang bisa melakukan ini.
- Riwayat seluruh transaksi (masuk & keluar), bisa difilter.

**User / Kasir**
- Input penjualan (barang keluar) dengan subtotal otomatis.
- Validasi stok: tidak bisa menjual melebihi stok yang tersedia.
- Riwayat penjualan milik sendiri, dikelompokkan per hari.

Login hanya satu form, sistem otomatis mengarahkan ke dashboard admin atau
halaman input penjualan sesuai role akun setelah login.

Stok produk **selalu dihitung otomatis** oleh database (lewat trigger di
`supabase/schema.sql`) setiap kali ada transaksi masuk/keluar — bukan
diinput manual — jadi angkanya selalu konsisten dengan riwayat transaksi.

## Struktur Proyek

```
src/
  components/    Layout, ProtectedRoute, StockGauge, StatCard
  context/       AuthContext (session & role dari Supabase)
  lib/           supabaseClient, helper format angka/tanggal
  pages/admin/   Dashboard, Produk, Barang Masuk, Transaksi
  pages/user/    Input Penjualan, Riwayat Saya
supabase/
  schema.sql     Skema lengkap: tabel, trigger stok otomatis, RLS policies
netlify.toml     Konfigurasi build & redirect untuk Netlify
```

---

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel seluruh isi file `supabase/schema.sql`, lalu
   jalankan (Run). Ini akan membuat tabel `profiles`, `products`,
   `stock_transactions`, trigger update stok otomatis, dan semua RLS policy.
3. Buka **Authentication > Users > Add user**, buat akun untuk admin (misal
   `admin@tokokamu.com`) dan akun untuk kasir/user (misal
   `kasir@tokokamu.com`). Setiap akun baru otomatis dapat baris di tabel
   `profiles` dengan role `user`.
4. Jadikan akun admin Anda sebagai admin — buka **SQL Editor** lagi dan
   jalankan (ganti email sesuai akun admin Anda):

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'admin@tokokamu.com');
   ```

5. Tambahkan beberapa produk awal lewat aplikasi (menu Produk setelah login
   sebagai admin) — tidak perlu lewat SQL.
6. Ambil URL & anon key project: **Project Settings > API**.

## 2. Setup Lokal

```bash
npm install
cp .env.example .env
```

Isi `.env` dengan kredensial dari langkah 1.6:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxx...
```

Jalankan:

```bash
npm run dev
```

Buka `http://localhost:5173`, login dengan akun admin atau kasir yang dibuat
di langkah Supabase.

## 3. Deploy ke Netlify

**Opsi A — lewat Netlify UI (paling mudah)**
1. Push folder proyek ini ke repository GitHub/GitLab.
2. Di Netlify: **Add new site > Import an existing project**, pilih repo
   tersebut.
3. Build command: `npm run build` — Publish directory: `dist`
   (sudah otomatis terbaca dari `netlify.toml`).
4. Di **Site settings > Environment variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Selesai — `netlify.toml` sudah mengatur redirect agar routing
   React Router (mis. `/admin/produk`) tidak 404 saat refresh.

**Opsi B — lewat Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --build --prod
```
(Pastikan environment variable `VITE_SUPABASE_URL` dan
`VITE_SUPABASE_ANON_KEY` sudah diset di Netlify sebelum build production,
atau lewat `netlify env:set`.)

## Menambah Akun Kasir Baru di Kemudian Hari

Cukup buat user baru lewat **Supabase Dashboard > Authentication > Users >
Add user** — role default-nya otomatis `user` (kasir), tidak perlu langkah
tambahan. Untuk membuat admin baru, jalankan query `update profiles ...`
seperti langkah 1.4 di atas.

## Catatan Desain

- "Barang masuk" (restock) hanya bisa diinput oleh admin — sesuai kebutuhan,
  dan juga ditegakkan di level database lewat RLS policy, bukan cuma di UI.
- "Barang keluar" (penjualan) bisa diinput admin maupun user.
- Setiap transaksi keluar menyimpan snapshot harga jual & harga beli saat itu
  juga (`unit_price`, `cost_price`), supaya laporan omzet dan keuntungan tetap
  akurat meskipun harga produk berubah di kemudian hari.
- Trigger database menolak transaksi keluar yang melebihi stok tersedia,
  jadi stok tidak akan pernah minus.
