-- ============================================
-- ARGO METER - MIGRASI FASE 2
-- Jalankan di Supabase Dashboard > SQL Editor > New Query > Run
-- Aman dijalankan walau sebagian sudah pernah dijalankan (pakai "if not exists")
-- ============================================

-- Kolom baru di transactions: metode bayar, wallet tujuan, durasi, jarak, tip
alter table transactions add column if not exists payment_method text; -- 'Tunai' / 'Non-Tunai' (income) atau nama wallet langsung (expense)
alter table transactions add column if not exists wallet text; -- Gopay / Shopeepay / Ovo / Wallet Aplikasi / Cash
alter table transactions add column if not exists duration_minutes integer;
alter table transactions add column if not exists distance_km numeric;
alter table transactions add column if not exists tip_amount numeric default 0;

-- Kolom baru di profiles: nama tampilan, foto, kendaraan, tema
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists monthly_target numeric default 3000000;
alter table profiles add column if not exists theme text default 'dark';
alter table profiles add column if not exists vehicle_type text;      -- Motor / Mobil
alter table profiles add column if not exists vehicle_subtype text;   -- Matic / Bebek / Sport (khusus motor)
alter table profiles add column if not exists vehicle_model text;
alter table profiles add column if not exists vehicle_year integer;
alter table profiles add column if not exists fuel_type text;         -- Pertalite / Pertamax
alter table profiles add column if not exists fuel_price numeric;     -- harga per liter, auto-isi tapi bisa diedit
alter table profiles add column if not exists fuel_efficiency_km_per_liter numeric default 40; -- rata-rata konsumsi kendaraan
