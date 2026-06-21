-- =========================================================
-- BEKU.STOK — Skema Database Supabase
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- 1. PROFILES — menyimpan nama & role (admin/user) tiap akun
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamptz not null default now()
);

-- Otomatis membuat baris profile saat akun baru daftar di Supabase Auth.
-- Role default 'user'. Untuk membuat akun admin, lihat catatan di bagian
-- paling bawah file ini.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper untuk cek role tanpa memicu rekursi RLS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable set search_path = public;

-- ---------------------------------------------------------
-- 2. PRODUCTS — daftar produk frozen food
-- ---------------------------------------------------------
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null default 'Lainnya',
  unit text not null default 'pcs',
  price_buy numeric(12, 2) not null default 0,
  price_sell numeric(12, 2) not null default 0,
  stock numeric(12, 2) not null default 0,
  reorder_point numeric(12, 2) not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. STOCK_TRANSACTIONS — ledger barang masuk & keluar
--    type = 'in'  -> restock (hanya admin)
--    type = 'out' -> penjualan (admin & user)
-- ---------------------------------------------------------
create table public.stock_transactions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete restrict,
  type text not null check (type in ('in', 'out')),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,   -- harga jual (out) / harga beli (in) saat transaksi
  cost_price numeric(12, 2) default 0,             -- snapshot harga beli, dipakai hitung keuntungan utk 'out'
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_stock_tx_product on public.stock_transactions(product_id);
create index idx_stock_tx_created_at on public.stock_transactions(created_at desc);
create index idx_stock_tx_type on public.stock_transactions(type);
create index idx_stock_tx_created_by on public.stock_transactions(created_by);

-- Trigger: setiap transaksi baru otomatis menambah/mengurangi stok produk,
-- dan menolak transaksi keluar yang melebihi stok yang tersedia.
create or replace function public.apply_stock_transaction()
returns trigger as $$
declare
  current_stock numeric(12, 2);
begin
  if new.type = 'in' then
    update public.products
      set stock = stock + new.quantity, updated_at = now()
      where id = new.product_id;
  elsif new.type = 'out' then
    select stock into current_stock from public.products where id = new.product_id for update;
    if current_stock is null then
      raise exception 'Produk tidak ditemukan';
    end if;
    if current_stock < new.quantity then
      raise exception 'Stok tidak cukup. Sisa stok: %', current_stock;
    end if;
    update public.products
      set stock = stock - new.quantity, updated_at = now()
      where id = new.product_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_stock_transaction_insert
  after insert on public.stock_transactions
  for each row execute procedure public.apply_stock_transaction();

-- ---------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stock_transactions enable row level security;

-- PROFILES
create policy "Lihat profil sendiri" on public.profiles
  for select using (auth.uid() = id);

create policy "Admin lihat semua profil" on public.profiles
  for select using (public.is_admin());

-- PRODUCTS (semua yang login boleh baca, hanya admin boleh ubah)
create policy "User login bisa lihat produk" on public.products
  for select using (auth.role() = 'authenticated');

create policy "Admin tambah produk" on public.products
  for insert with check (public.is_admin());

create policy "Admin ubah produk" on public.products
  for update using (public.is_admin());

create policy "Admin hapus produk" on public.products
  for delete using (public.is_admin());

-- STOCK_TRANSACTIONS
create policy "Admin lihat semua transaksi" on public.stock_transactions
  for select using (public.is_admin());

create policy "User lihat transaksi sendiri" on public.stock_transactions
  for select using (created_by = auth.uid());

create policy "Admin input transaksi apa saja" on public.stock_transactions
  for insert with check (public.is_admin());

create policy "User hanya boleh input penjualan (keluar)" on public.stock_transactions
  for insert with check (
    type = 'out'
    and created_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'user')
  );

create policy "Admin hapus transaksi" on public.stock_transactions
  for delete using (public.is_admin());

-- =========================================================
-- CATATAN SETUP AKUN
-- =========================================================
-- 1. Buat akun lewat Supabase Dashboard > Authentication > Users > Add user
--    (atau lewat halaman sign-up jika Anda menambahkannya nanti).
-- 2. Trigger di atas otomatis membuat baris di tabel `profiles` dengan
--    role default 'user'.
-- 3. Untuk menjadikan suatu akun sebagai admin, jalankan query berikut
--    (ganti email sesuai akun yang dimaksud):
--
--    update public.profiles
--    set role = 'admin'
--    where id = (select id from auth.users where email = 'admin@tokokamu.com');
--
-- =========================================================
