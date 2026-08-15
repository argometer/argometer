-- ============================================
-- ARGO METER - MIGRASI FASE 5
-- Jalankan di Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================

-- Fungsi ini ngitung rata-rata pendapatan kotor per hari aktif, digabung dari SEMUA user.
-- Aman secara privasi: fungsi cuma balikin 1 angka rata-rata + jumlah driver,
-- BUKAN data transaksi siapapun. security definer dipakai supaya fungsi ini bisa
-- baca lintas-user (RLS biasa cuma izinin baca data sendiri), tapi output-nya
-- cuma agregat, jadi nggak bocorin data pribadi siapapun.
create or replace function get_driver_average_stats()
returns table(avg_daily_income numeric, driver_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(avg(daily_total), 0) as avg_daily_income,
    count(distinct user_id) as driver_count
  from (
    select user_id, date_trunc('day', created_at) as day, sum(amount) as daily_total
    from transactions
    where type = 'income'
    group by user_id, date_trunc('day', created_at)
  ) per_day_per_driver;
$$;

-- Izinkan semua user yang login manggil fungsi ini
grant execute on function get_driver_average_stats() to authenticated;
