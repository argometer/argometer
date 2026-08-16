let currentPeriod = 'day';
let periodOffset = 0; // 0 = sekarang, -1 = sebelumnya, dst
let customRange = null; // { start, end } kalau user pilih rentang custom
let weekChartInstance = null;

document.querySelectorAll('.period-tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    periodOffset = 0;
    customRange = null;
    renderBeranda();
  };
});
document.getElementById('periodPrevBtn').onclick = () => { periodOffset -= 1; customRange = null; renderBeranda(); };
document.getElementById('periodNextBtn').onclick = () => { if (periodOffset < 0) { periodOffset += 1; customRange = null; renderBeranda(); } };

document.getElementById('periodCustomBtn').onclick = () => {
  const today = new Date().toISOString().slice(0, 10);
  const html = `
    <h3>Pilih Rentang Tanggal</h3>
    <p class="field-hint" style="margin-bottom:14px">Maksimal rentang 1 bulan (31 hari).</p>
    <label style="display:block;font-size:13px;color:var(--text-muted);margin:10px 0 6px">Dari Tanggal</label>
    <input type="date" id="rangeStartInput" value="${today}" max="${today}" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">
    <label style="display:block;font-size:13px;color:var(--text-muted);margin:14px 0 6px">Sampai Tanggal</label>
    <input type="date" id="rangeEndInput" value="${today}" max="${today}" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">
    <p class="form-error" id="rangeError"></p>
    <button class="btn-primary full" id="applyRangeBtn" style="margin-top:16px">Terapkan</button>
  `;
  openGenericModal(html);
  document.getElementById('applyRangeBtn').onclick = () => {
    const startVal = document.getElementById('rangeStartInput').value;
    const endVal = document.getElementById('rangeEndInput').value;
    const errEl = document.getElementById('rangeError');
    const start = new Date(startVal); start.setHours(0,0,0,0);
    const end = new Date(endVal); end.setHours(23,59,59,999);
    const diffDays = (end - start) / 86400000;

    if (!startVal || !endVal || diffDays < 0) { errEl.textContent = 'Rentang tanggal tidak valid.'; return; }
    if (diffDays > 31) { errEl.textContent = 'Maksimal rentang 1 bulan (31 hari).'; return; }

    customRange = { start, end: new Date(end.getTime() + 1) };
    currentPeriod = 'custom';
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('genericModal').classList.remove('open');
    renderBeranda();
  };
};

function renderBerandaHeader() {
  const name = currentProfile?.full_name || currentUser?.user_metadata?.full_name || 'Driver';
  const avatarEl = document.getElementById('berandaAvatar');
  if (currentProfile?.avatar_url) {
    avatarEl.style.backgroundImage = `url(${currentProfile.avatar_url})`;
    avatarEl.textContent = '';
  } else {
    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = name.charAt(0).toUpperCase();
  }
  document.getElementById('berandaUserName').textContent = `Halo, ${name}`;
  document.getElementById('berandaDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}
document.getElementById('userHeaderBtn').onclick = () => switchTab('profil');

function getPeriodRange(period, offset) {
  if (period === 'custom' && customRange) {
    return { start: customRange.start, end: customRange.end, label: `${customRange.start.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} - ${new Date(customRange.end-1).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}` };
  }
  const now = new Date();
  let start, end, label;

  if (period === 'day') {
    start = new Date(now); start.setDate(start.getDate() + offset); start.setHours(0,0,0,0);
    end = new Date(start); end.setDate(end.getDate() + 1);
    label = offset === 0 ? 'Hari ini' : start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
  } else if (period === 'week') {
    const day = now.getDay() || 7;
    start = new Date(now); start.setDate(start.getDate() - day + 1 + offset * 7); start.setHours(0,0,0,0);
    end = new Date(start); end.setDate(end.getDate() + 7);
    label = offset === 0 ? 'Minggu ini' : `${start.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} - ${new Date(end-1).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}`;
  } else {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    label = offset === 0 ? 'Bulan ini' : start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  return { start, end, label };
}

function sumByType(tx, type) {
  return tx.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0);
}

function renderBeranda() {
  if (!allTransactions) return;
  renderBerandaHeader();

  const { start, end, label } = getPeriodRange(currentPeriod, periodOffset);
  const prevRange = currentPeriod === 'custom' ? null : getPeriodRange(currentPeriod, periodOffset - 1);

  const inRange = (t, r) => { const d = new Date(t.created_at); return d >= r.start && d < r.end; };
  const curTx = allTransactions.filter(t => inRange(t, { start, end }));
  const prevTx = prevRange ? allTransactions.filter(t => inRange(t, prevRange)) : [];

  const income = sumByType(curTx, 'income');
  const expense = sumByType(curTx, 'expense');
  const net = income - expense;
  const tip = curTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.tip_amount || 0), 0);

  const prevNet = sumByType(prevTx, 'income') - sumByType(prevTx, 'expense');

  document.getElementById('periodLabel').textContent = label;
  document.getElementById('netToday').textContent = fmtRupiah(net);
  document.getElementById('expenseToday').textContent = fmtRupiah(expense);
  document.getElementById('tipToday').textContent = fmtRupiah(tip);

  // Trend badge
  const trendEl = document.getElementById('trendBadge');
  if (!prevRange) {
    trendEl.textContent = 'Custom'; trendEl.className = 'trend-badge';
  } else if (prevNet === 0 && net === 0) {
    trendEl.textContent = '—'; trendEl.className = 'trend-badge';
  } else {
    const delta = net - prevNet;
    const pct = prevNet !== 0 ? Math.round((delta / Math.abs(prevNet)) * 100) : 100;
    trendEl.textContent = `${delta >= 0 ? '▲' : '▼'} ${fmtRupiah(Math.abs(delta))} (${Math.abs(pct)}%)`;
    trendEl.className = 'trend-badge ' + (delta >= 0 ? 'up' : 'down');
  }

  // Platform breakdown (hanya yang ada transaksinya)
  try { renderPlatformBreakdown(curTx); } catch (err) { console.error('platform breakdown error:', err); }

  // Target gauges (selalu berbasis hari ini / bulan ini, terlepas dari filter period)
  try { renderGauges(); } catch (err) { console.error('gauge error:', err); }

  // 7-day chart
  try { renderWeekChart(); } catch (err) { console.error('chart error:', err); }

  // Reminders
  try { renderReminders(); } catch (err) { console.error('reminder error:', err); }

  // Bell dot indicator
  const bellDot = document.getElementById('bellDot');
  if (bellDot && typeof isPremiumActive === 'function' && isPremiumActive() && typeof getBellNotifications === 'function') {
    bellDot.style.display = getBellNotifications().length ? 'block' : 'none';
  }
}

function renderPlatformBreakdown(curTx) {
  const byPlatform = {};
  curTx.filter(t => t.type === 'income').forEach(t => {
    const p = t.platform || 'Lainnya';
    byPlatform[p] = (byPlatform[p] || 0) + Number(t.amount);
  });
  const breakdownEl = document.getElementById('platformBreakdown');
  const entries = Object.entries(byPlatform).sort((a, b) => b[1] - a[1]);
  breakdownEl.innerHTML = entries.length ? entries.map(([name, amt]) => `
    <div class="platform-card" style="background:${platformGradient(name)}">
      <span class="pc-name">${name}</span>
      <span class="pc-amount">${fmtRupiah(amt)}</span>
    </div>
  `).join('') : '<p class="empty-state" style="padding:0 20px 8px">Belum ada pemasukan di periode ini.</p>';
}

function renderGauges() {
  const dailyTarget = currentProfile?.daily_target || 100000;
  const monthlyTarget = currentProfile?.monthly_target || 3000000;

  const todayStr = new Date().toDateString();
  const todayNet = allTransactions.filter(t => new Date(t.created_at).toDateString() === todayStr)
    .reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);

  const now = new Date();
  const monthTx = allTransactions.filter(t => { const d = new Date(t.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const monthNet = monthTx.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);

  const dailyPct = Math.max(0, Math.min(100, Math.round((todayNet / dailyTarget) * 100)));
  const monthlyPct = Math.max(0, Math.min(100, Math.round((monthNet / monthlyTarget) * 100)));

  document.getElementById('gaugeDailyFill').style.strokeDashoffset = 100 - dailyPct;
  document.getElementById('gaugeMonthlyFill').style.strokeDashoffset = 100 - monthlyPct;
  document.getElementById('gaugeDailyText').textContent = `${fmtRupiah(todayNet)} / ${fmtRupiah(dailyTarget)}`;
  document.getElementById('gaugeMonthlyText').textContent = `${fmtRupiah(monthNet)} / ${fmtRupiah(monthlyTarget)}`;
}

function renderWeekChart() {
  const picker = document.getElementById('chartDatePicker');
  const anchor = picker.value ? new Date(picker.value) : new Date();
  if (!picker.value) picker.value = anchor.toISOString().slice(0, 10);

  const labels = [];
  const netByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
    const dayTx = allTransactions.filter(t => new Date(t.created_at).toDateString() === dayStr);
    const net = dayTx.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    netByDay.push(net);
  }

  const ctx = document.getElementById('weekChart');
  if (weekChartInstance) weekChartInstance.destroy();
  weekChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: netByDay, backgroundColor: netByDay.map(v => v >= 0 ? '#3ECF8E' : '#FF6B5B'), borderRadius: 6 }] },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8B92A1', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#8B92A1' }, grid: { color: '#2A2F3A' } }
      }
    }
  });
}
document.getElementById('chartDatePicker').addEventListener('change', renderWeekChart);

function renderReminders() {
  const hour = new Date().getHours();
  const reminders = [];

  // ===== Pengingat kontekstual (waktu & data) - prioritas utama =====
  if (hour >= 12 && hour < 14) reminders.push({ icon: '🍚', text: 'Waktunya makan siang — jangan dilewatin, biar tenaga tetap oke buat narik sore.' });
  if (hour >= 16 && hour < 18) reminders.push({ icon: '☕', text: 'Sore-sore gini enaknya istirahat sebentar sambil ngopi, isi ulang energi.' });
  if (hour >= 21 || hour < 5) reminders.push({ icon: '😴', text: 'Udah malam, jangan lupa istirahat cukup ya. Kesehatan nomor satu.' });

  const totalKm = allTransactions.filter(t => t.type === 'income' && t.distance_km).reduce((s, t) => s + Number(t.distance_km), 0);
  const kmToService = 2000 - (totalKm % 2000);
  if (kmToService <= 200) {
    reminders.push({ icon: '🔧', text: `Servis/ganti oli kira-kira ${Math.round(kmToService)} km lagi. Siapin waktu ya.` });
  }

  // ===== Pool pengingat umum, dipilih acak biar nggak itu-itu aja tiap dibuka =====
  const GENERAL_TIPS = [
    { icon: '🛢️', text: 'Cek tekanan angin ban tiap minggu biar bensin lebih irit dan berkendara lebih stabil.' },
    { icon: '🛞', text: 'Perhatikan kondisi ban, kalau sudah tipis, mending ganti sebelum musim hujan.' },
    { icon: '🧴', text: 'Oli mesin idealnya diganti tiap 2.000-4.000 km, tergantung jenis oli yang dipakai.' },
    { icon: '🪛', text: 'Servis rutin bulanan bantu deteksi masalah kecil sebelum jadi kerusakan besar & mahal.' },
    { icon: '💧', text: 'Jangan lupa minum air putih yang cukup, apalagi kalau narik seharian di bawah terik.' },
    { icon: '🧘', text: 'Sesekali berhenti sejenak buat peregangan badan, biar nggak pegal-pegal abis narik lama.' },
    { icon: '😊', text: 'Senyum dan sapaan ramah ke penumpang bisa naikin rating & peluang tip lho.' },
    { icon: '🪖', text: 'Pastikan helm & jaket selalu dipakai dengan benar, keselamatan di jalan itu prioritas.' },
    { icon: '🔋', text: 'Cek kondisi aki motor secara berkala, apalagi kalau motor sering dipakai starter elektrik.' },
    { icon: '🌧️', text: 'Kalau cuaca lagi nggak menentu, siapin jas hujan di jok biar nggak kehujanan pas order dadakan.' },
    { icon: '📱', text: 'Pastikan HP kamu terisi penuh sebelum mulai narik, biar nggak mati di tengah jalan.' },
    { icon: '🗺️', text: 'Kenali rute alternatif di area kamu, bisa bantu hindari macet dan hemat waktu antar.' },
  ];

  const shuffled = [...GENERAL_TIPS].sort(() => Math.random() - 0.5);
  const remainingSlots = Math.max(0, 4 - reminders.length);
  reminders.push(...shuffled.slice(0, remainingSlots));

  document.getElementById('reminderList').innerHTML = reminders.map(r => `
    <div class="reminder-card"><span class="r-icon">${r.icon}</span><span>${r.text}</span></div>
  `).join('');
}
