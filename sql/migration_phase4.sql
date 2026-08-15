-- ============================================
-- ARGO METER - MIGRASI FASE 4
-- Jalankan di Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================

-- Dompet bawaan (Gopay, Ovo, dst) yang disembunyikan user (nggak bisa dihapus dari daftar hardcode,
-- jadi kita simpan daftar mana yang "disembunyikan" aja)
alter table profiles add column if not exists hidden_wallets jsonb default '[]'::jsonb;
