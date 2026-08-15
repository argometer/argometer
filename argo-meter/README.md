# Argo Meter — Panduan Deploy (buat pemula, tanpa coding)

**Tampilan:** app ini mobile-only — kalau dibuka di PC pun tampilannya
tetap seperti HP (dengan navigasi bawah: Beranda, Catat, Analisis, Profil),
dan bisa di-**install** jadi aplikasi asli lewat browser (bukan cuma
shortcut) karena sudah dilengkapi PWA (`manifest.json` + `service-worker.js`).

Ikuti urutan ini persis. Total waktu ±30-45 menit untuk bagian 1-3 (app-nya sudah bisa
dipakai). Bagian 4 (pembayaran Midtrans) bisa disusul belakangan.

## Bagian 1 — Setup Database (Supabase, gratis)

1. Buka [supabase.com](https://supabase.com) → daftar/login → **New Project**.
2. Kasih nama project (bebas), buat password database (simpan baik-baik), pilih region
   Singapore (paling dekat).
3. Setelah project selesai dibuat (±2 menit), buka menu **SQL Editor** di sidebar kiri.
4. Klik **New query**, buka file `sql/schema.sql` dari folder ini, copy semua isinya,
   paste ke SQL Editor, lalu klik **Run**.
5. Buka menu **Project Settings** (ikon gear) → **API**. Catat dua hal ini:
   - `Project URL`
   - `anon public` key
6. Buka file `js/supabase-config.js`, ganti `SUPABASE_URL` dan `SUPABASE_ANON_KEY`
   dengan nilai yang kamu catat tadi. Simpan.

## Bagian 2 — Upload ke Hosting (Netlify, gratis)

1. Buka [netlify.com](https://netlify.com) → daftar/login.
2. Di dashboard, cari area **"Drag and drop your site output folder here"**.
3. Buka folder `ojol-tracker` di komputer kamu, **drag seluruh folder itu** ke area
   tersebut.
4. Tunggu proses upload selesai → Netlify kasih kamu link (misal
   `https://nama-acak.netlify.app`). Website kamu sudah LIVE.
5. (Opsional) Klik **Site settings > Change site name** untuk ganti jadi nama yang
   lebih rapi, misal `argometer.netlify.app`.

Coba buka link-nya, daftar akun baru, dan coba catat transaksi — harusnya sudah
jalan di titik ini (fitur premium masih dalam status locked, itu normal).

## Bagian 3 — Cek semua jalan

- [ ] Bisa daftar akun baru
- [ ] Bisa login
- [ ] Bisa tambah pemasukan & pengeluaran
- [ ] Angka "Bersih hari ini" berubah sesuai transaksi
- [ ] Section "Analisis Mendalam" muncul terkunci dengan tombol Upgrade

Kalau ada yang error, buka halaman web-nya, klik kanan → **Inspect** → tab
**Console**, lihat pesan errornya (biasanya karena salah copy Project URL/anon key).

## Cara Install Jadi Aplikasi (bukan cuma shortcut)

Setelah website live di Netlify, buka link-nya di HP:

- **Android (Chrome):** akan muncul notifikasi "Add to Home screen" /
  "Install app" otomatis, atau buka menu titik tiga → **Install app**.
- **iPhone (Safari):** tap tombol Share (ikon kotak panah ke atas) →
  **Add to Home Screen**.

Setelah di-install, ikon Argo Meter muncul di homescreen dan kebuka
tanpa address bar browser — kayak aplikasi asli.

## Bagian 3.5 — Jadiin akun kamu Admin (akses semua fitur gratis)

Karena kamu pemilik app, akun kamu bisa dikasih akses penuh tanpa perlu bayar
langganan. Caranya:

1. Daftar dulu akun kamu sendiri lewat app (halaman Daftar), kalau belum
2. Buka Supabase Dashboard → **SQL Editor** → **New query**
3. Paste dan jalankan (ganti `email-kamu@sini.com` dengan email yang kamu
   pakai daftar):
   ```sql
   -- Kalau tabel profiles kamu belum punya kolom is_admin (dibuat sebelum fitur ini),
   -- jalankan baris ini dulu sekali saja:
   alter table profiles add column if not exists is_admin boolean default false;

   -- Baru jadikan akun kamu admin:
   update profiles set is_admin = true
   where id = (select id from auth.users where email = 'email-kamu@sini.com');
   ```
4. Klik **Run**. Logout-login lagi di app, sekarang tab Analisis kamu
   otomatis terbuka dan status di Profil berubah jadi "Admin".

Mau jadiin lebih dari satu email admin? Ulangi query `update` di atas dengan
email lain.

## Bagian 4 — Aktifkan Pembayaran Midtrans (bisa nanti)

1. Daftar akun di [midtrans.com](https://midtrans.com) (perlu data usaha/pribadi +
   verifikasi). Untuk coba-coba dulu, kamu bisa pakai **Sandbox mode** tanpa
   verifikasi penuh.
2. Di Midtrans Dashboard (mode Sandbox) → **Settings > Access Keys**, catat:
   - `Client Key`
   - `Server Key`
3. Buka `app.html`, cari baris:
   ```html
   <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="MIDTRANS_CLIENT_KEY_DISINI"></script>
   ```
   Ganti `MIDTRANS_CLIENT_KEY_DISINI` dengan Client Key kamu.
4. Deploy 2 Edge Function yang ada di folder `supabase-functions/` — ini butuh
   Supabase CLI (satu-satunya bagian yang butuh command line, karena server key
   tidak boleh taruh di kode frontend demi keamanan). Kalau kamu belum familiar
   command line, bagian ini paling gampang diminta tolong ke Claude Code atau
   teman yang ngerti — cukup kasih lihat folder `supabase-functions/`.
   Ringkasnya:
   ```
   supabase functions deploy create-transaction
   supabase functions deploy midtrans-webhook
   supabase secrets set MIDTRANS_SERVER_KEY=server-key-kamu
   ```
5. Di Midtrans Dashboard → **Settings > Configuration**, isi **Payment
   Notification URL** dengan URL function `midtrans-webhook` kamu (didapat
   setelah deploy).
6. Kalau sudah siap terima pembayaran asli, ganti semua URL
   `app.sandbox.midtrans.com` jadi `app.midtrans.com` (di `app.html` dan di
   `create-transaction/index.ts`), lalu ganti Client/Server Key ke versi
   Production.

## Struktur file

```
ojol-tracker/
├── index.html              → landing page + login/register
├── app.html                → app utama: 4 tab (Beranda, Catat, Analisis, Profil) + bottom nav
├── manifest.json           → konfigurasi biar bisa di-install jadi app
├── service-worker.js       → wajib ada supaya PWA bisa di-install
├── icons/                  → ikon app (192px & 512px)
├── css/style.css           → semua styling (termasuk mobile-locked frame & bottom nav)
├── js/
│   ├── supabase-config.js  → ⚠️ isi URL & key Supabase kamu di sini
│   ├── auth.js              → logic login/register
│   ├── tracker.js           → navigasi tab, catat transaksi, hitung bersih harian
│   ├── subscription.js      → cek status premium, grafik, checkout Midtrans
│   └── profile.js           → tab Profil: info user, target harian, logout
├── sql/schema.sql          → jalankan sekali di Supabase SQL Editor
└── supabase-functions/     → kode server untuk proses pembayaran (opsional, bagian 4)
```

## Fitur yang sudah jalan vs yang bisa ditambah nanti

**Sudah jalan (gratis, semua user):**
- Login/register, catat pemasukan per platform & pengeluaran per kategori
- Ringkasan bersih hari ini + progress bar target harian

**Terkunci di balik subscription (Rp 10.000/bulan):**
- Grafik tren 7 hari, rata-rata cuan per jam, platform paling untung, export CSV

**Ide pengembangan lanjutan** (bilang saja ke Claude kalau mau ditambahkan):
- Reminder servis motor berdasarkan km
- Mode offline
- Notifikasi kalau belum capai target
- Halaman "Riwayat Pembayaran"
