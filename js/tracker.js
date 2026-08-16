let currentUser = null;
let currentProfile = null;
let allTransactions = [];

// ===== Splash screen: minimal 900ms biar animasinya kelihatan, tapi nggak lama-lama =====
const splashMinTime = new Promise(resolve => setTimeout(resolve, 900));
function hideSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) splash.classList.add('hide');
}
setTimeout(hideSplash, 4000); // pengaman: paksa hilang maksimal 4 detik apapun yang terjadi

// ===== Auth guard =====
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = session.user;
  await loadProfile();
  populateSelects();
  applyTheme();
  await loadTransactions();
  if (typeof renderProfileTab === 'function') renderProfileTab();
  await splashMinTime;
  hideSplash();
})();

// ===== Bottom nav tab switching =====
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
document.getElementById('goToIncomeBtn').onclick = () => { switchTab('catat'); setTxType('income'); };
document.getElementById('goToExpenseBtn').onclick = () => { switchTab('catat'); setTxType('expense'); };

function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'beranda' && typeof renderBeranda === 'function') renderBeranda();
  if (tab === 'dompet' && typeof renderDompet === 'function') renderDompet();
  if (tab === 'analisis' && typeof renderAnalisis === 'function') renderAnalisis();
  if (tab === 'profil' && typeof renderProfileTab === 'function') renderProfileTab();
}

// ===== Populate dropdowns from constants.js =====
function populateSelects() {
  const incPlatform = document.getElementById('incPlatform');
  incPlatform.innerHTML = PLATFORMS.map(p => `<option value="${p.name}">${p.name}</option>`).join('');

  const incWallet = document.getElementById('incWallet');
  incWallet.innerHTML = getAllWallets().map(w => `<option value="${w}">${w}</option>`).join('');

  const expCategory = document.getElementById('expCategory');
  expCategory.innerHTML = EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');

  const expWallet = document.getElementById('expWallet');
  expWallet.innerHTML = getAllWalletsWithCash().map(w => `<option value="${w}">${w}</option>`).join('');

  const platformFilter = document.getElementById('analyticsPlatformFilter');
  if (platformFilter) {
    platformFilter.innerHTML = '<option value="all">Semua Platform</option>' +
      PLATFORMS.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  }
}

// ===== Apply dark/light theme =====
function applyTheme() {
  const theme = currentProfile?.theme || 'dark';
  document.body.classList.toggle('light-mode', theme === 'light');
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = theme === 'dark';
}

// ===== Load profile =====
async function loadProfile() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  if (!error) currentProfile = data;
}

// ===== Load all transactions =====
async function loadTransactions() {
  const { data, error } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) { console.error(error); return; }
  allTransactions = data || [];

  if (typeof renderBeranda === 'function') renderBeranda();
  if (typeof applyPremiumUI === 'function') applyPremiumUI();
}

// ===== Toast / pesan penyemangat =====
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('hypeToast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ===== Tab Catat: toggle Pemasukan/Pengeluaran =====
let currentTxType = 'income';

document.getElementById('toggleIncomeBtn').onclick = () => setTxType('income');
document.getElementById('toggleExpenseBtn').onclick = () => setTxType('expense');

function setTxType(type) {
  currentTxType = type;
  document.getElementById('toggleIncomeBtn').classList.toggle('active', type === 'income');
  document.getElementById('toggleExpenseBtn').classList.toggle('active', type === 'expense');
  document.getElementById('incomeForm').style.display = type === 'income' ? 'block' : 'none';
  document.getElementById('expenseForm').style.display = type === 'expense' ? 'block' : 'none';
}

// ===== Segmented control: Tunai / Non-Tunai =====
document.querySelectorAll('#incPaymentSeg .seg-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#incPaymentSeg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('incWalletField').style.display = btn.dataset.val === 'Non-Tunai' ? 'flex' : 'none';
  };
});

// ===== Format Rupiah live saat mengetik nominal =====
['incAmount', 'incTip', 'expAmount'].forEach(id => formatRupiahLive(document.getElementById(id)));
document.getElementById('incDistance').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^0-9.,]/g, '');
});

// ===== Stepper Waktu Narik =====
let incHourValue = new Date().getHours(); // 0-23

function renderIncHour() {
  const label = incHourValue === 0 ? 24 : incHourValue;
  document.getElementById('incTimeDisplay').textContent = `${String(label).padStart(2, '0')}.00`;
}
document.getElementById('incTimeMinus').onclick = () => { incHourValue = (incHourValue + 23) % 24; renderIncHour(); };
document.getElementById('incTimePlus').onclick = () => { incHourValue = (incHourValue + 1) % 24; renderIncHour(); };
renderIncHour();

// ===== Submit: Pemasukan =====
document.getElementById('incomeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('incSubmitBtn');
  const amount = Number(onlyDigits(document.getElementById('incAmount').value));
  if (!amount) { alert('Isi nominal pendapatan dulu ya.'); return; }

  const payment_method = document.querySelector('#incPaymentSeg .seg-btn.active').dataset.val;
  const wallet = payment_method === 'Non-Tunai' ? document.getElementById('incWallet').value : 'Tunai';
  const distanceRaw = document.getElementById('incDistance').value;

  // Waktu narik yang dipilih user, tanggal hari ini jam sesuai stepper
  const chosenTime = new Date();
  chosenTime.setHours(incHourValue, 0, 0, 0);

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const payload = {
    user_id: currentUser.id,
    type: 'income',
    category: 'Order',
    platform: document.getElementById('incPlatform').value,
    payment_method,
    wallet,
    distance_km: distanceRaw ? Number(distanceRaw.replace(',', '.')) : null,
    amount,
    tip_amount: Number(onlyDigits(document.getElementById('incTip').value)) || 0,
    created_at: chosenTime.toISOString(),
  };

  const { error } = await supabaseClient.from('transactions').insert(payload);
  btn.disabled = false;
  btn.textContent = 'Simpan Pendapatan';

  if (error) { alert('Gagal menyimpan. Coba lagi.'); console.error(error); return; }

  document.getElementById('incomeForm').reset();
  document.querySelectorAll('#incPaymentSeg .seg-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.getElementById('incWalletField').style.display = 'none';
  incHourValue = new Date().getHours();
  renderIncHour();

  await loadTransactions();
  showToast(randomHype(HYPE_INCOME));
  switchTab('beranda');
});

// ===== Submit: Pengeluaran =====
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('expSubmitBtn');
  const amount = Number(onlyDigits(document.getElementById('expAmount').value));
  if (!amount) { alert('Isi nominal pengeluaran dulu ya.'); return; }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const wallet = document.getElementById('expWallet').value;
  const payload = {
    user_id: currentUser.id,
    type: 'expense',
    category: document.getElementById('expCategory').value,
    payment_method: wallet,
    wallet,
    amount,
  };

  const { error } = await supabaseClient.from('transactions').insert(payload);
  btn.disabled = false;
  btn.textContent = 'Simpan Pengeluaran';

  if (error) { alert('Gagal menyimpan. Coba lagi.'); console.error(error); return; }

  document.getElementById('expenseForm').reset();
  await loadTransactions();
  showToast(randomHype(HYPE_EXPENSE));
  switchTab('beranda');
});

// ===== Generic modal helpers (dipakai profile.js, dompet.js, dll) =====
function openGenericModal(html) {
  document.getElementById('genericModalBody').innerHTML = html;
  document.getElementById('genericModal').classList.add('open');
}
document.getElementById('genericModalClose').onclick = () => document.getElementById('genericModal').classList.remove('open');
document.getElementById('genericModal').addEventListener('click', (e) => { if (e.target.id === 'genericModal') e.currentTarget.classList.remove('open'); });

// ===== Bell notification panel =====
document.getElementById('bellBtn').onclick = () => {
  const body = document.getElementById('bellPanelBody');
  const premium = typeof isPremiumActive === 'function' && isPremiumActive();
  if (!premium) {
    body.innerHTML = `<p class="empty-state">Notifikasi rekomendasi & peringatan khusus pelanggan Premium. <br><br><button class="btn-primary full" onclick="document.getElementById('bellPanel').classList.remove('open'); switchTab('analisis');">Lihat Analisis</button></p>`;
  } else if (typeof getBellNotifications === 'function') {
    const items = getBellNotifications();
    body.innerHTML = items.length
      ? items.map(i => `<div class="reminder-card"><span class="r-icon">${i.icon}</span><span>${i.text}</span></div>`).join('')
      : '<p class="empty-state">Belum ada notifikasi baru.</p>';
  }
  document.getElementById('bellPanel').classList.add('open');
};
document.getElementById('bellPanelClose').onclick = () => document.getElementById('bellPanel').classList.remove('open');
document.getElementById('bellPanel').addEventListener('click', (e) => { if (e.target.id === 'bellPanel') e.currentTarget.classList.remove('open'); });
