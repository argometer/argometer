// Data acuan yang dipakai di beberapa tempat (Catat, Beranda, Dompet, Analisis)

const PLATFORMS = [
  { name: 'Gojek', color: '#00AA13' },
  { name: 'Grab', color: '#00B14F' },
  { name: 'ShopeeFood', color: '#EE4D2D' },
  { name: 'Maxim', color: '#FFCC00' },
  { name: 'Indriver', color: '#A6E22E' },
  { name: 'Lalamove', color: '#F6821F' },
  { name: 'Q Move', color: '#4F9BFF' },
  { name: 'Green SM', color: '#00B074' },
  { name: 'Lainnya', color: '#8B92A1' },
];

const EXPENSE_CATEGORIES = ['Makan', 'Kopi', 'Parkir', 'Bensin', 'Service', 'Tarik Saldo', 'Lainnya'];

const WALLETS = ['Gopay', 'Shopeepay', 'Ovo', 'Wallet Aplikasi'];
const WALLETS_WITH_CASH = ['Gopay', 'Shopeepay', 'Ovo', 'Wallet Aplikasi', 'Tunai'];

const fmtRupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
const onlyDigits = (str) => (str || '').toString().replace(/[^0-9]/g, '');

// Format input angka jadi "1.000.000" secara live saat diketik (keyboard tetap angka)
function formatRupiahLive(el) {
  el.addEventListener('input', () => {
    const digits = onlyDigits(el.value);
    el.value = digits ? Number(digits).toLocaleString('id-ID') : '';
  });
}

// Export semua transaksi ke CSV -- dipakai di Analisis (premium) & Profil > Export Data (semua user)
function exportTransactionsCSV() {
  const header = 'Tanggal,Tipe,Kategori/Platform,Pembayaran,Jarak(km),Nominal,Tip,Catatan\n';
  const rows = allTransactions.map(t => {
    const date = new Date(t.created_at).toLocaleString('id-ID');
    const label = t.type === 'income' ? t.platform : t.category;
    return `${date},${t.type},${label},${t.wallet || ''},${t.distance_km || ''},${t.amount},${t.tip_amount || 0},"${(t.note || '').replace(/"/g, '')}"`;
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'argometer-data.csv';
  a.click();
}

function platformColor(name) {
  const p = PLATFORMS.find(p => p.name === name);
  return p ? p.color : '#8B92A1';
}

function shadeColor(hex, percent) {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function platformGradient(name) {
  const c = platformColor(name);
  return `linear-gradient(135deg, ${shadeColor(c, 25)} 0%, ${shadeColor(c, -30)} 100%)`;
}

const WALLET_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"/><path d="M17 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`;

const WALLET_META = {
  'Cash': { color: '#3ECF8E' },
  'Tunai': { color: '#3ECF8E' },
  'Gopay': { color: '#00AED6' },
  'Shopeepay': { color: '#EE4D2D' },
  'Ovo': { color: '#4C3494' },
  'Wallet Aplikasi': { color: '#8B92A1' },
};
const CUSTOM_WALLET_COLORS = ['#F2A93B', '#4F9BFF', '#A6E22E', '#F6821F', '#FF6B5B'];

function getAllWallets() {
  const custom = currentProfile?.custom_wallets || [];
  return [...WALLETS, ...custom];
}
function getAllWalletsWithCash() {
  const custom = currentProfile?.custom_wallets || [];
  return [...WALLETS_WITH_CASH.slice(0, -1), ...custom, 'Tunai'];
}
function walletMeta(name) {
  if (WALLET_META[name]) return WALLET_META[name];
  const custom = currentProfile?.custom_wallets || [];
  const idx = custom.indexOf(name);
  return { color: CUSTOM_WALLET_COLORS[idx % CUSTOM_WALLET_COLORS.length] || '#8B92A1' };
}

// Kata-kata penyemangat setelah catat pemasukan
const HYPE_INCOME = [
  'Yeayy, saldo nambah! 🔥 Terus gaskeun, cuan lagi jalan!',
  'Mantap! Satu order lagi, satu langkah lebih deket ke target hari ini 💪',
  'Cuan masuk! Semangat terus, jangan lupa istirahat ya 🙌',
  'Order clear! Dompet makin tebel, kamu keren hari ini 🚀',
  'Nice! Terus jaga ritme, target harian makin deket nih ✨',
];
const HYPE_EXPENSE = [
  'Dicatat! Biar semua transparan, biar cuan bersihnya makin jelas 📒',
  'Oke, tercatat rapi. Kontrol pengeluaran itu kunci cuan maksimal 👍',
  'Sip, sudah kesimpan. Tetap semangat cari orderan lagi ya 🔥',
];

function randomHype(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
