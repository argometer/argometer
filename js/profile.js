// ===== Ranking / julukan berdasarkan jumlah order bulan ini =====
const RANKS = [
  { min: 0, max: 10, name: 'Kaum Goler', color: '#8B92A1', bg: '#8B92A122' },
  { min: 11, max: 50, name: 'Mode Nyender', color: '#4F9BFF', bg: '#4F9BFF22' },
  { min: 51, max: 150, name: 'Pinggang Pegel', color: '#3ECF8E', bg: '#3ECF8E22' },
  { min: 151, max: 300, name: 'Pantat Tepos', color: '#F2A93B', bg: '#F2A93B22' },
  { min: 301, max: Infinity, name: 'Legenda Jalanan', color: '#FF6B5B', bg: '#FF6B5B22' },
];

function getMonthlyOrderCount() {
  const now = new Date();
  return allTransactions.filter(t => {
    if (t.type !== 'income') return false;
    const d = new Date(t.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
}

function getRank(count) {
  return RANKS.find(r => count >= r.min && count <= r.max) || RANKS[0];
}

function renderProfileTab() {
  if (!currentUser) return;

  const name = currentProfile?.full_name || currentUser.user_metadata?.full_name || 'Driver';
  const email = currentUser.email || '';

  document.getElementById('profileName').textContent = name;
  document.getElementById('profileEmail').textContent = email;

  const avatarEl = document.getElementById('profileAvatar');
  if (currentProfile?.avatar_url) {
    avatarEl.style.backgroundImage = `url(${currentProfile.avatar_url})`;
    avatarEl.textContent = '';
  } else {
    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = name.charAt(0).toUpperCase();
  }

  const statusEl = document.getElementById('profileStatus');
  const isAdmin = currentProfile?.is_admin;
  const premium = typeof isPremiumActive === 'function' && isPremiumActive();
  statusEl.textContent = isAdmin ? 'Admin' : (premium ? 'Premium Aktif' : 'Free');
  statusEl.className = 'profile-status ' + (isAdmin || premium ? 'premium' : 'free');

  // Rank badge
  const count = getMonthlyOrderCount();
  const rank = getRank(count);
  const rankEl = document.getElementById('rankBadge');
  rankEl.style.display = 'inline-block';
  rankEl.style.color = rank.color;
  rankEl.style.background = rank.bg;
  rankEl.textContent = `${rank.name} · ${count} order bulan ini`;

  document.getElementById('dailyTargetInput').value = (currentProfile?.daily_target || 100000).toLocaleString('id-ID');
  document.getElementById('monthlyTargetInput').value = (currentProfile?.monthly_target || 3000000).toLocaleString('id-ID');

  renderVehicleSummary();

  if (typeof applyPremiumUI === 'function') applyPremiumUI();
}

// ===== Edit nama =====
document.getElementById('editNameBtn').onclick = () => {
  const html = `
    <h3>Ubah Nama</h3>
    <div class="field-group">
      <label style="display:block;font-size:13px;color:var(--text-muted);margin:10px 0 6px">Nama</label>
      <input type="text" id="newNameInput" value="${currentProfile?.full_name || ''}" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">
    </div>
    <button class="btn-primary full" id="saveNameBtn" style="margin-top:16px">Simpan</button>
  `;
  openGenericModal(html);
  document.getElementById('saveNameBtn').onclick = async () => {
    const newName = document.getElementById('newNameInput').value.trim();
    if (!newName) return;
    await supabaseClient.from('profiles').update({ full_name: newName }).eq('id', currentUser.id);
    await loadProfile();
    renderProfileTab();
    document.getElementById('genericModal').classList.remove('open');
  };
};

// ===== Upload foto profil (disimpan sebagai data URL di kolom avatar_url) =====
document.getElementById('avatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 800 * 1024) { alert('Ukuran foto maksimal 800KB ya, coba pilih foto lain.'); return; }

  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    const { error } = await supabaseClient.from('profiles').update({ avatar_url: dataUrl }).eq('id', currentUser.id);
    if (!error) { await loadProfile(); renderProfileTab(); }
  };
  reader.readAsDataURL(file);
});

// ===== Kendaraan =====
function renderVehicleSummary() {
  const el = document.getElementById('vehicleSummary');
  if (!currentProfile?.vehicle_model) {
    el.innerHTML = '<p class="empty-state" id="vehicleEmptyText">Belum ada data kendaraan.</p>';
    return;
  }
  el.innerHTML = `
    <p><b>${currentProfile.vehicle_model}</b> (${currentProfile.vehicle_year || '-'})</p>
    <p style="color:var(--text-muted);margin-top:4px">${currentProfile.vehicle_type}${currentProfile.vehicle_subtype ? ' · ' + currentProfile.vehicle_subtype : ''} · ${currentProfile.fuel_type || '-'}</p>
  `;
}

document.getElementById('editVehicleBtn').onclick = () => {
  const v = currentProfile || {};
  const html = `
    <h3>Atur Kendaraan</h3>
    <label style="display:block;font-size:13px;color:var(--text-muted);margin:12px 0 6px">Model Kendaraan</label>
    <input type="text" id="vModel" value="${v.vehicle_model || ''}" placeholder="Contoh: Honda Beat" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">

    <label style="display:block;font-size:13px;color:var(--text-muted);margin:12px 0 6px">Tahun</label>
    <input type="text" inputmode="numeric" pattern="[0-9]*" id="vYear" value="${v.vehicle_year || ''}" placeholder="2022" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">

    <label style="display:block;font-size:13px;color:var(--text-muted);margin:12px 0 6px">Jenis Kendaraan</label>
    <select id="vType" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">
      <option value="Motor" ${v.vehicle_type === 'Motor' ? 'selected' : ''}>Motor</option>
      <option value="Mobil" ${v.vehicle_type === 'Mobil' ? 'selected' : ''}>Mobil</option>
    </select>

    <div id="vSubtypeField" style="display:${v.vehicle_type !== 'Mobil' ? 'block' : 'none'}">
      <label style="display:block;font-size:13px;color:var(--text-muted);margin:12px 0 6px">Jenis Motor</label>
      <select id="vSubtype" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">
        <option value="Matic" ${v.vehicle_subtype === 'Matic' ? 'selected' : ''}>Matic</option>
        <option value="Bebek" ${v.vehicle_subtype === 'Bebek' ? 'selected' : ''}>Bebek</option>
        <option value="Sport" ${v.vehicle_subtype === 'Sport' ? 'selected' : ''}>Sport</option>
      </select>
    </div>

    <label style="display:block;font-size:13px;color:var(--text-muted);margin:12px 0 6px">Bahan Bakar</label>
    <select id="vFuel" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">
      <option value="Pertalite" ${v.fuel_type === 'Pertalite' ? 'selected' : ''}>Pertalite (± Rp 10.000/L)</option>
      <option value="Pertamax" ${v.fuel_type === 'Pertamax' ? 'selected' : ''}>Pertamax (± Rp 15.950/L)</option>
    </select>
    <p class="field-hint">Harga bensin dipakai buat hitung estimasi pendapatan bersih di tab Analisis. Bisa disesuaikan manual kalau beda di daerah kamu.</p>

    <label style="display:block;font-size:13px;color:var(--text-muted);margin:12px 0 6px">Konsumsi BBM (km per liter)</label>
    <input type="text" inputmode="numeric" pattern="[0-9]*" id="vEfficiency" value="${v.fuel_efficiency_km_per_liter || 40}" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">

    <button class="btn-primary full" id="saveVehicleBtn" style="margin-top:18px">Simpan Kendaraan</button>
  `;
  openGenericModal(html);

  document.getElementById('vType').addEventListener('change', (e) => {
    document.getElementById('vSubtypeField').style.display = e.target.value === 'Motor' ? 'block' : 'none';
  });

  const fuelPriceMap = { Pertalite: 10000, Pertamax: 15950 };

  document.getElementById('saveVehicleBtn').onclick = async () => {
    const fuel_type = document.getElementById('vFuel').value;
    const payload = {
      vehicle_model: document.getElementById('vModel').value || null,
      vehicle_year: Number(document.getElementById('vYear').value) || null,
      vehicle_type: document.getElementById('vType').value,
      vehicle_subtype: document.getElementById('vType').value === 'Motor' ? document.getElementById('vSubtype').value : null,
      fuel_type,
      fuel_price: fuelPriceMap[fuel_type],
      fuel_efficiency_km_per_liter: Number(document.getElementById('vEfficiency').value) || 40,
    };
    await supabaseClient.from('profiles').update(payload).eq('id', currentUser.id);
    await loadProfile();
    renderProfileTab();
    document.getElementById('genericModal').classList.remove('open');
  };
};

// ===== Theme toggle =====
document.getElementById('themeToggle').addEventListener('change', async (e) => {
  const theme = e.target.checked ? 'dark' : 'light';
  document.body.classList.toggle('light-mode', theme === 'light');
  await supabaseClient.from('profiles').update({ theme }).eq('id', currentUser.id);
  currentProfile.theme = theme;
});

// ===== Simpan target harian & bulanan =====
document.getElementById('saveTargetBtn').onclick = async () => {
  const btn = document.getElementById('saveTargetBtn');
  const daily = Number(onlyDigits(document.getElementById('dailyTargetInput').value));
  const monthly = Number(onlyDigits(document.getElementById('monthlyTargetInput').value));
  if (!daily || !monthly) { alert('Isi kedua target dengan angka yang valid.'); return; }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const { error } = await supabaseClient
    .from('profiles')
    .update({ daily_target: daily, monthly_target: monthly })
    .eq('id', currentUser.id);

  btn.disabled = false;
  btn.textContent = 'Simpan Pengaturan';

  if (error) { alert('Gagal menyimpan target.'); return; }
  await loadProfile();
  if (typeof renderBeranda === 'function') renderBeranda();
  showToast('Pengaturan tersimpan ✓');
};

formatRupiahLive(document.getElementById('dailyTargetInput'));
formatRupiahLive(document.getElementById('monthlyTargetInput'));

// ===== Export Data (semua user, bukan cuma premium) =====
document.getElementById('exportDataBtn').onclick = () => {
  if (!allTransactions.length) { alert('Belum ada data buat di-export.'); return; }
  exportTransactionsCSV();
};

// ===== Hapus Data (kosongkan semua catatan transaksi, akun tetap ada) =====
document.getElementById('hapusDataBtn').onclick = () => {
  openGenericModal(`
    <h3>Hapus Semua Data Catatan?</h3>
    <p class="policy-text">Ini akan menghapus <b>semua</b> catatan pemasukan & pengeluaran kamu secara permanen. Akun kamu tetap ada, cuma catatannya yang kosong lagi dari nol. Tindakan ini tidak bisa dibatalkan.</p>
    <button class="btn-secondary full" id="cancelHapusDataBtn" style="margin-top:16px">Batal</button>
    <button class="btn-primary full" id="confirmHapusDataBtn" style="margin-top:10px;background:linear-gradient(135deg,#FF8577,#E14E3E);color:#fff">Ya, Hapus Semua Data</button>
  `);
  document.getElementById('cancelHapusDataBtn').onclick = () => document.getElementById('genericModal').classList.remove('open');
  document.getElementById('confirmHapusDataBtn').onclick = async () => {
    const btn = document.getElementById('confirmHapusDataBtn');
    btn.disabled = true; btn.textContent = 'Menghapus...';
    const { error } = await supabaseClient.from('transactions').delete().eq('user_id', currentUser.id);
    if (error) { alert('Gagal menghapus data. Coba lagi.'); return; }
    await loadTransactions();
    document.getElementById('genericModal').classList.remove('open');
    showToast('Semua catatan sudah dihapus.');
  };
};

// ===== Hapus Akun (permanen, hapus semua data + akun login) =====
document.getElementById('hapusAkunBtn').onclick = () => {
  openGenericModal(`
    <h3>Hapus Akun Secara Permanen?</h3>
    <p class="policy-text">Semua data kamu (catatan, kendaraan, status langganan, dan akun login) akan <b>dihapus permanen</b> dan tidak bisa dikembalikan lagi. Kalau yakin, ketik <b>HAPUS</b> di bawah ini.</p>
    <input type="text" id="confirmDeleteInput" placeholder="Ketik HAPUS" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px;margin-top:10px">
    <button class="btn-secondary full" id="cancelHapusAkunBtn" style="margin-top:16px">Batal</button>
    <button class="btn-primary full" id="confirmHapusAkunBtn" style="margin-top:10px;background:linear-gradient(135deg,#FF8577,#E14E3E);color:#fff">Ya, Hapus Akun Saya</button>
  `);
  document.getElementById('cancelHapusAkunBtn').onclick = () => document.getElementById('genericModal').classList.remove('open');
  document.getElementById('confirmHapusAkunBtn').onclick = async () => {
    if (document.getElementById('confirmDeleteInput').value.trim().toUpperCase() !== 'HAPUS') {
      alert('Ketik "HAPUS" dulu buat konfirmasi.');
      return;
    }
    const btn = document.getElementById('confirmHapusAkunBtn');
    btn.disabled = true; btn.textContent = 'Menghapus akun...';
    const { error } = await supabaseClient.functions.invoke('delete-account', { body: {} });
    if (error) { alert('Gagal menghapus akun. Coba lagi atau hubungi Pusat Bantuan.'); btn.disabled = false; btn.textContent = 'Ya, Hapus Akun Saya'; return; }
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  };
};

// ===== Bantuan / Privasi / Ketentuan =====
document.getElementById('helpBtn').onclick = () => {
  openGenericModal(`
    <h3>Pusat Bantuan</h3>
    <p class="policy-text">Ada pertanyaan, masalah, atau saran buat Argo Meter? Kirim email ke:</p>
    <p style="margin:14px 0"><a href="mailto:support.argometer@gmail.com" style="color:var(--accent);font-weight:600">support.argometer@gmail.com</a></p>
    <p class="policy-text">Kami usahakan balas secepatnya. Makasih udah pakai Argo Meter! 🙏</p>
  `);
};

document.getElementById('installBtn').onclick = () => {
  openGenericModal(`
    <h3>Cara Install Argo Meter</h3>
    <div class="policy-text">
      <h4>📱 Android (Chrome)</h4>
      <p>Buka Argo Meter di Chrome, nanti biasanya muncul notifikasi "Add to Home screen" / "Install app" otomatis. Kalau nggak muncul, ketuk menu titik tiga (⋮) di pojok kanan atas → pilih <b>"Install app"</b> atau <b>"Add to Home screen"</b>.</p>
      <h4>🍎 iPhone (Safari)</h4>
      <p>Buka Argo Meter di Safari (wajib Safari, bukan Chrome), ketuk ikon <b>Share</b> (kotak dengan panah ke atas) di bagian bawah layar, lalu pilih <b>"Add to Home Screen"</b>.</p>
      <h4>💻 Laptop/Komputer (Chrome/Edge)</h4>
      <p>Buka Argo Meter, lihat ikon kecil di ujung kanan address bar (biasanya gambar layar dengan panah), klik lalu pilih <b>"Install"</b>.</p>
      <p style="margin-top:12px">Setelah di-install, ikon Argo Meter muncul di homescreen/desktop dan kebuka layaknya aplikasi asli, tanpa address bar browser.</p>
    </div>
  `);
};

document.getElementById('privacyBtn').onclick = () => {
  openGenericModal(`
    <h3>Kebijakan Privasi</h3>
    <div class="policy-text">
      <h4>Data yang kami simpan</h4>
      <p>Argo Meter menyimpan data akun (nama, email), catatan transaksi pendapatan/pengeluaran, dan data kendaraan yang kamu masukkan sendiri, untuk keperluan menghitung ringkasan dan analisis di dalam aplikasi.</p>
      <h4>Penggunaan data</h4>
      <p>Data kamu hanya digunakan untuk menampilkan fitur di dalam aplikasi (dashboard, analisis, laporan). Kami tidak menjual atau membagikan data pribadimu ke pihak ketiga untuk kepentingan iklan.</p>
      <h4>Keamanan</h4>
      <p>Data disimpan dengan sistem yang membatasi setiap pengguna hanya bisa mengakses datanya sendiri.</p>
      <h4>Kontak</h4>
      <p>Pertanyaan soal privasi bisa dikirim ke support.argometer@gmail.com.</p>
    </div>
  `);
};

document.getElementById('tosBtn').onclick = () => {
  openGenericModal(`
    <h3>Ketentuan Layanan</h3>
    <div class="policy-text">
      <h4>Penggunaan Aplikasi</h4>
      <p>Argo Meter adalah alat bantu pencatatan keuangan pribadi untuk driver ojek online. Kamu bertanggung jawab atas keakuratan data yang dimasukkan.</p>
      <h4>Langganan Premium</h4>
      <p>Fitur Analisis memerlukan langganan berbayar Rp 10.000/bulan (berlaku 31 hari sejak pembayaran berhasil). Langganan tidak otomatis diperpanjang — kamu perlu memperpanjang manual jika ingin terus memakai fitur premium.</p>
      <h4>Estimasi & Analisis</h4>
      <p>Semua rekomendasi dan estimasi (biaya bensin, jam ramai, dll) dihitung berdasarkan data yang kamu masukkan sendiri dan bersifat perkiraan, bukan jaminan hasil.</p>
      <h4>Perubahan Layanan</h4>
      <p>Fitur aplikasi dapat berubah sewaktu-waktu untuk peningkatan kualitas layanan.</p>
    </div>
  `);
};

// ===== Logout =====
document.getElementById('logoutBtn').onclick = async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
};
