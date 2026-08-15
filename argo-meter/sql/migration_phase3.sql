-- ============================================
-- ARGO METER - MIGRASI FASE 3
-- Jalankan di Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================

-- Wallet custom yang ditambahkan user sendiri (selain Gopay/Shopeepay/Ovo/dst bawaan)
alter table profiles add column if not exists custom_wallets jsonb default '[]'::jsonb;
