-- ============================================
-- OJOL TRACKER - DATABASE SCHEMA
-- Jalankan file ini di Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================

-- 1. Tabel profil user (menyimpan status premium)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  is_premium boolean default false,
  is_admin boolean default false,
  premium_until timestamptz,
  daily_target numeric default 100000,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "User bisa lihat profil sendiri"
  on profiles for select
  using (auth.uid() = id);

create policy "User bisa update profil sendiri"
  on profiles for update
  using (auth.uid() = id);

-- 2. Trigger: otomatis bikin baris profile setiap ada user baru daftar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Tabel transaksi (pemasukan & pengeluaran)
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  platform text, -- gojek / grab / maxim / lainnya (khusus income)
  amount numeric not null check (amount >= 0),
  note text,
  created_at timestamptz default now()
);

alter table transactions enable row level security;

create policy "User bisa lihat transaksi sendiri"
  on transactions for select
  using (auth.uid() = user_id);

create policy "User bisa tambah transaksi sendiri"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "User bisa update transaksi sendiri"
  on transactions for update
  using (auth.uid() = user_id);

create policy "User bisa hapus transaksi sendiri"
  on transactions for delete
  using (auth.uid() = user_id);

-- 4. Tabel riwayat pembayaran subscription
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  order_id text unique not null,
  amount numeric not null,
  status text default 'pending', -- pending / settlement / expire / failed
  created_at timestamptz default now()
);

alter table payments enable row level security;

create policy "User bisa lihat pembayaran sendiri"
  on payments for select
  using (auth.uid() = user_id);

create policy "User bisa insert pembayaran sendiri"
  on payments for insert
  with check (auth.uid() = user_id);

-- Index biar query cepat
create index if not exists idx_transactions_user_date on transactions(user_id, created_at desc);

-- ============================================
-- FASE 2: kolom tambahan (lihat migration_phase2.sql untuk detail)
-- ============================================
alter table transactions add column if not exists payment_method text;
alter table transactions add column if not exists wallet text;
alter table transactions add column if not exists duration_minutes integer;
alter table transactions add column if not exists distance_km numeric;
alter table transactions add column if not exists tip_amount numeric default 0;

alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists monthly_target numeric default 3000000;
alter table profiles add column if not exists theme text default 'dark';
alter table profiles add column if not exists vehicle_type text;
alter table profiles add column if not exists vehicle_subtype text;
alter table profiles add column if not exists vehicle_model text;
alter table profiles add column if not exists vehicle_year integer;
alter table profiles add column if not exists fuel_type text;
alter table profiles add column if not exists fuel_price numeric;
alter table profiles add column if not exists fuel_efficiency_km_per_liter numeric default 40;

-- ============================================
-- FASE 3
-- ============================================
alter table profiles add column if not exists custom_wallets jsonb default '[]'::jsonb;

-- ============================================
-- FASE 4
-- ============================================
alter table profiles add column if not exists hidden_wallets jsonb default '[]'::jsonb;
