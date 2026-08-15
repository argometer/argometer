let analysisChartInstance = null;
let analyticsMode = 'date';
let freeHeroPeriod = 'day';

// ===== Toggle Harian/Mingguan/Bulanan buat preview gratis =====
document.querySelectorAll('#analisisPeriodToggle button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#analisisPeriodToggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    freeHeroPeriod = btn.dataset.p;
    renderAnalisis();
  };
});

function renderAnalisis() {
  renderFreeHero();
  renderMarginGauge();
  renderBusyHours();
  renderFeatureCards();

  if (!isPremiumActive()) return;
  renderDetailSection();
}

// ===== Free Hero: Pendapatan Bersih (Kotor - Bensin) =====
function estimateFuelForTx(tx) {
  const efficiency = currentProfile?.fuel_efficiency_km_per_liter || 40;
  const fuelPrice = currentProfile?.fuel_price || 10000;
  const totalKm = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.distance_km || 0), 0);
  return (totalKm / efficiency) * fuelPrice;
}

function renderFreeHero() {
  const { start, end, label } = getPeriodRange(freeHeroPeriod, 0);
  const prevRange = getPeriodRange(freeHeroPeriod, -1);
  const inRange = (t, r) => { const d = new Date(t.created_at); return d >= r.start && d < r.end; };

  const curTx = allTransactions.filter(t => inRange(t, { start, end }));
  const prevTx = allTransactions.filter(t => inRange(t, prevRange));

  const kotor = sumByType(curTx, 'income');
  const opsExpense = sumByType(curTx, 'expense');
  const fuelCost = estimateFuelForTx(curTx);
  const operasional = opsExpense + fuelCost;
  const net = kotor - fuelCost; // definisi: Pendapatan Bersih = Kotor - Bensin

  const prevKotor = sumByType(prevTx, 'income');
  const prevFuel = estimateFuelForTx(prevTx);
  const prevNet = prevKotor - prevFuel;

  const periodTitle = { day: 'HARI INI', week: 'MINGGU INI', month: 'BULAN INI' }[freeHeroPeriod];
  document.getElementById('freeHeroLabel').textContent = `PENDAPATAN BERSIH · ${periodTitle}`;
  document.getElementById('freeHeroAmount').textContent = fmtRupiah(net);
  document.getElementById('freeHeroKotor').textContent = fmtRupiah(kotor);
  document.getElementById('freeHeroOperasional').textContent = fmtRupiah(operasional);

  const trendEl = document.getElementById('freeHeroTrend');
  if (prevNet === 0 && net === 0) {
    trendEl.textContent = '—';
  } else {
    const delta = net - prevNet;
    const pct = prevNet !== 0 ? Math.round((delta / Math.abs(prevNet)) * 100) : 100;
    trendEl.textContent = `${delta >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% dari ${freeHeroPeriod === 'day' ? 'kemarin' : freeHeroPeriod === 'week' ? 'minggu lalu' : 'bulan lalu'}`;
  }
}

// ===== Margin Bersih gauge (gratis) =====
function renderMarginGauge() {
  const { start, end } = getPeriodRange(freeHeroPeriod, 0);
  const curTx = allTransactions.filter(t => { const d = new Date(t.created_at); return d >= start && d < end; });
  const kotor = sumByType(curTx, 'income');
  const fuelCost = estimateFuelForTx(curTx);
  const net = kotor - fuelCost;
  const margin = kotor > 0 ? Math.max(0, Math.min(100, Math.round((net / kotor) * 100))) : 0;

  document.getElementById('marginGaugeFill').style.strokeDashoffset = 100 - margin;
  document.getElementById('marginGaugePct').textContent = `${margin}%`;

  const subEl = document.getElementById('marginGaugeSub');
  if (kotor === 0) subEl.textContent = 'Belum ada data';
  else if (margin >= 50) subEl.textContent = 'Sehat — di atas rata-rata driver';
  else if (margin >= 25) subEl.textContent = 'Standar — masih wajar';
  else subEl.textContent = 'Rendah — bensin makan banyak margin';
}

// ===== Jam Tersibuk mini chart (gratis) =====
function renderBusyHours() {
  const incomeTx = allTransactions.filter(t => t.type === 'income');
  const buckets = new Array(12).fill(0); // 12 bucket @ 2 jam
  incomeTx.forEach(t => {
    const h = new Date(t.created_at).getHours();
    buckets[Math.floor(h / 2)] += 1;
  });

  const max = Math.max(...buckets, 1);
  const container = document.getElementById('busyHoursMini');
  const labelsContainer = document.getElementById('busyHoursLabels');
  const peakIdx = buckets.indexOf(Math.max(...buckets));

  container.innerHTML = buckets.map((v, i) => `
    <div class="bar ${v === max && v > 0 ? 'peak' : ''}" style="height:${Math.max(6, (v / max) * 44)}px"></div>
  `).join('');

  // Label jam di bawah tiap bar ke-2 (00, 04, 08, 12, 16, 20) biar nggak sesak tapi tetap kebaca
  if (labelsContainer) {
    labelsContainer.innerHTML = buckets.map((_, i) => {
      const hourLabel = i % 2 === 0 ? String(i * 2).padStart(2, '0') : '';
      return `<span class="busy-hour-tick">${hourLabel}</span>`;
    }).join('');
  }

  const textEl = document.getElementById('busyHoursText');
  if (incomeTx.length < 3) {
    textEl.textContent = 'Belum cukup data';
  } else {
    const fmtHour = (h) => `${String(h).padStart(2, '0')}.00`;
    textEl.textContent = `Puncak jam ${fmtHour(peakIdx * 2)}–${fmtHour(peakIdx * 2 + 2)}`;
  }
}

// ===== 4 kartu fitur (lock/unlock sesuai status premium) =====
const FEATURES = [
  { id: 'trend', icon: '📈', title: 'Tren & Proyeksi Pendapatan', desc: 'Lihat arah pendapatanmu beberapa minggu terakhir dan proyeksi bulan ini kalau ritme narik tetap sama.', type: 'premium' },
  { id: 'ranking', icon: '🏆', title: 'Aplikasi Mana Paling Untung?', desc: 'Bandingkan pendapatan dari Gojek, Grab, Maxim, dan lainnya — biar tau mana yang layak diprioritaskan.', type: 'premium' },
  { id: 'bocor', icon: '🕳️', title: 'Ke Mana Uangmu Bocor?', desc: 'Rincian pengeluaran non-operasional (makan, kopi, dll) plus estimasi tabungan kalau dikurangi 20%.', type: 'premium' },
  { id: 'compare', icon: '👥', title: 'Posisimu di Antara Driver Lain', desc: 'Bandingkan rata-rata pendapatan kotor per hari kamu dengan rata-rata semua driver Argo Meter (anonim, cuma angka rata-rata yang ditampilkan).', type: 'premium' },
];

function renderFeatureCards() {
  const unlocked = isPremiumActive();
  const list = document.getElementById('featureList');
  if (!list) return;

  list.innerHTML = FEATURES.map(f => {
    let btnClass = 'locked', btnLabel = 'Fitur Premium';
    if (f.type === 'soon') { btnClass = 'soon'; btnLabel = 'Segera Hadir'; }
    else if (unlocked) { btnClass = 'unlocked'; btnLabel = 'Lihat Detail'; }
    return `
      <button class="feature-card" data-feature="${f.id}">
        <span class="fc-icon">${f.icon}</span>
        <p class="fc-title">${f.title}</p>
        <p class="fc-desc">${f.desc}</p>
        <span class="fc-btn ${btnClass}">${btnLabel}</span>
      </button>
    `;
  }).join('');

  document.querySelectorAll('.feature-card').forEach(card => {
    card.onclick = () => {
      const feature = FEATURES.find(f => f.id === card.dataset.feature);
      if (feature.type === 'soon') {
        openGenericModal(`<h3>${feature.icon} ${feature.title}</h3><p class="policy-text">${feature.desc}</p>`);
        return;
      }
      if (!unlocked) { startCheckout(document.getElementById('ctaUpgradeBtn')); return; }
      openFeatureDetail(feature.id);
    };
  });
}

function openFeatureDetail(id) {
  if (id === 'trend') return openTrendModal();
  if (id === 'ranking') return openRankingModal();
  if (id === 'bocor') return openBocorModal();
  if (id === 'compare') return openCompareModal();
}

// ===== Detail: Posisi vs Driver Lain =====
async function openCompareModal() {
  openGenericModal(`<h3>👥 Posisimu di Antara Driver Lain</h3><p class="policy-text" style="margin-top:14px">Menghitung...</p>`);

  const { data, error } = await supabaseClient.rpc('get_driver_average_stats');
  if (error || !data || !data.length) {
    document.getElementById('genericModalBody').innerHTML = `<h3>👥 Posisimu di Antara Driver Lain</h3><p class="policy-text" style="margin-top:14px">Gagal mengambil data pembanding. Coba lagi nanti.</p>`;
    return;
  }

  const { avg_daily_income, driver_count } = data[0];

  if (driver_count < 3) {
    document.getElementById('genericModalBody').innerHTML = `
      <h3>👥 Posisimu di Antara Driver Lain</h3>
      <p class="policy-text" style="margin-top:14px">Belum cukup driver lain yang pakai Argo Meter buat bikin perbandingan yang bermakna. Fitur ini bakal makin akurat begitu makin banyak driver gabung. Coba lagi nanti ya!</p>
    `;
    return;
  }

  // Rata-rata pendapatan kotor per hari aktif milik user sendiri
  const incomeTx = allTransactions.filter(t => t.type === 'income');
  const byDay = {};
  incomeTx.forEach(t => {
    const day = new Date(t.created_at).toDateString();
    byDay[day] = (byDay[day] || 0) + Number(t.amount);
  });
  const days = Object.values(byDay);
  const myAvg = days.length ? days.reduce((s, v) => s + v, 0) / days.length : 0;

  const diff = myAvg - avg_daily_income;
  const pct = avg_daily_income > 0 ? Math.round((diff / avg_daily_income) * 100) : 0;

  let message;
  if (days.length === 0) {
    message = 'Kamu belum punya catatan pendapatan, jadi belum bisa dibandingkan. Yuk mulai catat dulu!';
  } else if (pct >= 10) {
    message = `Kece! Rata-rata pendapatan kotor harian kamu <b>${Math.abs(pct)}% di atas</b> rata-rata driver Argo Meter lainnya. 🔥`;
  } else if (pct <= -10) {
    message = `Rata-rata pendapatan kotor harian kamu <b>${Math.abs(pct)}% di bawah</b> rata-rata driver lain. Coba cek tab "Tren & Proyeksi" atau "Rekomendasi jam" buat naikin performa.`;
  } else {
    message = `Rata-rata pendapatan kotor harian kamu <b>sekitar sama</b> dengan rata-rata driver Argo Meter lainnya. Solid!`;
  }

  document.getElementById('genericModalBody').innerHTML = `
    <h3>👥 Posisimu di Antara Driver Lain</h3>
    <div class="stat-grid" style="margin-top:14px">
      <div class="stat-box">
        <p class="stat-label">Rata-rata kamu / hari</p>
        <p class="stat-value">${fmtRupiah(myAvg)}</p>
      </div>
      <div class="stat-box">
        <p class="stat-label">Rata-rata ${driver_count} driver lain</p>
        <p class="stat-value">${fmtRupiah(avg_daily_income)}</p>
      </div>
    </div>
    <div class="reco-banner" style="margin-top:14px">${message}</div>
    <p class="field-hint" style="margin-top:10px">*Dihitung dari pendapatan kotor (belum dipotong bensin), berdasarkan data seluruh pengguna Argo Meter secara anonim.</p>
  `;
}

// ===== Detail: Tren & Proyeksi =====
function openTrendModal() {
  const now = new Date();
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(now); start.setDate(start.getDate() - (now.getDay() || 7) + 1 - i * 7); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const tx = allTransactions.filter(t => { const d = new Date(t.created_at); return d >= start && d < end; });
    weeks.push({ label: i === 0 ? 'Minggu ini' : `${i} minggu lalu`, net: sumByType(tx, 'income') - estimateFuelForTx(tx) });
  }

  const daysSoFar = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthTx = allTransactions.filter(t => { const d = new Date(t.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const monthNetSoFar = sumByType(monthTx, 'income') - estimateFuelForTx(monthTx);
  const projected = daysSoFar > 0 ? (monthNetSoFar / daysSoFar) * daysInMonth : 0;

  openGenericModal(`
    <h3>📈 Tren & Proyeksi Pendapatan</h3>
    <div style="margin:16px 0">
      ${weeks.map(w => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span style="color:var(--text-muted)">${w.label}</span><b>${fmtRupiah(w.net)}</b>
        </div>
      `).join('')}
    </div>
    <div class="reco-banner">💡 Kalau ritme narik kamu bulan ini konsisten, proyeksi pendapatan bersih bulan ini sekitar <b>${fmtRupiah(projected)}</b>.</div>
  `);
}

// ===== Detail: Ranking platform =====
function openRankingModal() {
  const incomeTx = allTransactions.filter(t => t.type === 'income');
  const byPlatform = {};
  incomeTx.forEach(t => {
    const p = t.platform || 'Lainnya';
    byPlatform[p] = byPlatform[p] || { total: 0, count: 0 };
    byPlatform[p].total += Number(t.amount);
    byPlatform[p].count += 1;
  });
  const ranked = Object.entries(byPlatform).sort((a, b) => b[1].total - a[1].total);
  const html = ranked.length ? ranked.map(([name, d], i) => `
    <div class="ranking-item" style="cursor:default">
      <span class="r-rank">#${i + 1}</span>
      <span class="r-dot" style="background:${platformColor(name)}"></span>
      <span class="r-name">${name}</span>
      <span class="r-amount">${fmtRupiah(d.total)} · ${d.count}x</span>
    </div>
  `).join('') : '<p class="empty-state">Belum ada data.</p>';

  openGenericModal(`<h3>🏆 Aplikasi Mana Paling Untung?</h3><div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">${html}</div>`);
}

// ===== Detail: Ke Mana Uangmu Bocor =====
function openBocorModal() {
  const now = new Date();
  const monthExpense = allTransactions.filter(t => t.type === 'expense' && new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear());
  const byCategory = {};
  monthExpense.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount); });
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const ranked = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const nonOps = ['Makan', 'Kopi', 'Lainnya'];
  const nonOpsTotal = ranked.filter(([cat]) => nonOps.includes(cat)).reduce((s, [, v]) => s + v, 0);
  const potentialSaving = nonOpsTotal * 0.2;

  const rows = ranked.length ? ranked.map(([cat, amt]) => {
    const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
    return `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span>${cat}</span><b>${fmtRupiah(amt)} (${pct}%)</b>
        </div>
        <div style="height:6px;background:var(--surface-2);border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--expense)"></div>
        </div>
      </div>
    `;
  }).join('') : '<p class="empty-state">Belum ada pengeluaran bulan ini.</p>';

  openGenericModal(`
    <h3>🕳️ Ke Mana Uangmu Bocor?</h3>
    <p class="policy-text" style="margin-bottom:14px">Rincian pengeluaran bulan ini:</p>
    ${rows}
    ${nonOpsTotal > 0 ? `<div class="reco-banner" style="margin-top:14px">💡 Kalau kamu kurangi pengeluaran non-operasional (Makan, Kopi, Lainnya) sebesar 20%, kamu bisa hemat sekitar <b>${fmtRupiah(potentialSaving)}</b>/bulan.</div>` : ''}
  `);
}

// ===== Detail Section (laporan lengkap, khusus premium) =====
document.querySelectorAll('#analyticsModeSeg .seg-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#analyticsModeSeg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    analyticsMode = btn.dataset.mode;
    document.getElementById('analyticsDateFields').style.display = analyticsMode === 'date' ? 'flex' : 'none';
    document.getElementById('analyticsMonthInput').style.display = analyticsMode === 'month' ? 'block' : 'none';
    renderDetailSection();
  };
});

(function initAnalyticsDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  const monthVal = new Date().toISOString().slice(0, 7);
  const s = document.getElementById('analyticsStartDate');
  const e = document.getElementById('analyticsEndDate');
  const m = document.getElementById('analyticsMonthInput');
  if (s) s.value = today;
  if (e) e.value = today;
  if (m) m.value = monthVal;
})();

document.getElementById('analyticsStartDate').addEventListener('change', renderDetailSection);
document.getElementById('analyticsEndDate').addEventListener('change', renderDetailSection);
document.getElementById('analyticsMonthInput').addEventListener('change', renderDetailSection);
document.getElementById('analyticsPlatformFilter').addEventListener('change', renderDetailSection);

function getAnalyticsRange() {
  if (analyticsMode === 'month') {
    const val = document.getElementById('analyticsMonthInput').value;
    if (!val) return null;
    const [y, m] = val.split('-').map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
  } else {
    const startVal = document.getElementById('analyticsStartDate').value;
    const endVal = document.getElementById('analyticsEndDate').value;
    if (!startVal || !endVal) return null;
    const start = new Date(startVal); start.setHours(0, 0, 0, 0);
    const end = new Date(endVal); end.setHours(23, 59, 59, 999);
    return { start, end: new Date(end.getTime() + 1) };
  }
}

function renderDetailSection() {
  if (!isPremiumActive()) return;
  const range = getAnalyticsRange();
  if (!range) return;
  const platformFilter = document.getElementById('analyticsPlatformFilter').value;

  let tx = allTransactions.filter(t => { const d = new Date(t.created_at); return d >= range.start && d < range.end; });
  if (platformFilter !== 'all') tx = tx.filter(t => t.type === 'expense' || t.platform === platformFilter);

  const incomeTx = tx.filter(t => t.type === 'income');
  const totalIncome = incomeTx.reduce((s, t) => s + Number(t.amount), 0);
  const totalDistance = incomeTx.reduce((s, t) => s + Number(t.distance_km || 0), 0);

  const efficiency = currentProfile?.fuel_efficiency_km_per_liter || 40;
  const fuelPrice = currentProfile?.fuel_price || 10000;
  const estimatedFuelCost = (totalDistance / efficiency) * fuelPrice;
  const netAfterFuel = totalIncome - estimatedFuelCost;

  document.getElementById('fuelCost').textContent = fmtRupiah(estimatedFuelCost);
  document.getElementById('netAfterFuel').textContent = fmtRupiah(netAfterFuel);

  renderRecommendation(incomeTx);
  renderAnalysisChart(range, tx);
  renderLossAlert(incomeTx, efficiency, fuelPrice);
}

function renderRecommendation(incomeTx) {
  const banner = document.getElementById('recoBanner');
  if (incomeTx.length < 5) { banner.style.display = 'none'; return; }
  const slots = [
    { label: '05.00–10.00 (Pagi)', from: 5, to: 10 },
    { label: '10.00–13.00 (Siang)', from: 10, to: 13 },
    { label: '13.00–16.00 (Sore Awal)', from: 13, to: 16 },
    { label: '16.00–19.00 (Pulang Kerja)', from: 16, to: 19 },
    { label: '19.00–23.00 (Malam)', from: 19, to: 23 },
  ];
  const slotStats = {};
  incomeTx.forEach(t => {
    const hour = new Date(t.created_at).getHours();
    const slot = slots.find(s => hour >= s.from && hour < s.to);
    if (!slot) return;
    slotStats[slot.label] = slotStats[slot.label] || {};
    const p = t.platform || 'Lainnya';
    slotStats[slot.label][p] = (slotStats[slot.label][p] || 0) + Number(t.amount);
  });
  const curHour = new Date().getHours();
  const curSlot = slots.find(s => curHour >= s.from && curHour < s.to);
  if (curSlot && slotStats[curSlot.label]) {
    const best = Object.entries(slotStats[curSlot.label]).sort((a, b) => b[1] - a[1])[0];
    banner.style.display = 'block';
    banner.innerHTML = `📍 <b>Rekomendasi jam ini (${curSlot.label}):</b> berdasarkan histori kamu, <b>${best[0]}</b> paling cuan di jam segini (${fmtRupiah(best[1])}).`;
  } else {
    banner.style.display = 'none';
  }
}

function renderAnalysisChart(range, tx) {
  const labels = [], netByBucket = [];
  const dayCount = Math.round((range.end - range.start) / 86400000);
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(range.start); d.setDate(d.getDate() + i);
    labels.push(dayCount > 31 ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : String(d.getDate()));
    const dayStr = d.toDateString();
    const dayTx = tx.filter(t => new Date(t.created_at).toDateString() === dayStr);
    netByBucket.push(dayTx.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0));
  }
  const ctx = document.getElementById('weeklyChart');
  if (analysisChartInstance) analysisChartInstance.destroy();
  analysisChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: netByBucket, backgroundColor: netByBucket.map(v => v >= 0 ? '#3ECF8E' : '#FF6B5B'), borderRadius: 4 }] },
    options: { plugins: { legend: { display: false } }, scales: {
      x: { ticks: { color: '#8B92A1', font: { size: 9 } }, grid: { display: false } },
      y: { ticks: { color: '#8B92A1' }, grid: { color: '#2A2F3A' } }
    } }
  });
}

// (renderRanking dipakai di modal kartu "Aplikasi Mana Paling Untung?" lewat openRankingModal,
//  jadi nggak perlu lagi di Laporan Lengkap)

function renderLossAlert(incomeTx, efficiency, fuelPrice) {
  const byPlatform = {};
  incomeTx.forEach(t => {
    const p = t.platform || 'Lainnya';
    byPlatform[p] = byPlatform[p] || { total: 0, km: 0 };
    byPlatform[p].total += Number(t.amount);
    byPlatform[p].km += Number(t.distance_km || 0);
  });
  const warnings = [];
  Object.entries(byPlatform).forEach(([name, d]) => {
    if (d.km < 5) return;
    const fuelCost = (d.km / efficiency) * fuelPrice;
    const marginPerKm = (d.total - fuelCost) / d.km;
    if (marginPerKm < 500) warnings.push(`⚠️ <b>${name}</b> marginnya tipis banget (sekitar ${fmtRupiah(marginPerKm)}/km setelah bensin).`);
  });
  const el = document.getElementById('lossAlert');
  if (warnings.length) { el.style.display = 'block'; el.innerHTML = warnings.join('<br><br>'); }
  else el.style.display = 'none';
}

// ===== Export CSV =====
document.getElementById('exportBtn').onclick = () => {
  if (!isPremiumActive()) return;
  exportTransactionsCSV();
};

// ===== Notifikasi lonceng (dipanggil dari tracker.js) =====
function getBellNotifications() {
  const items = [];
  const incomeTx = allTransactions.filter(t => t.type === 'income');
  if (incomeTx.length >= 5) {
    const hour = new Date().getHours();
    const recent = incomeTx.filter(t => Math.abs(new Date(t.created_at).getHours() - hour) <= 1);
    const byPlatform = {};
    recent.forEach(t => { const p = t.platform || 'Lainnya'; byPlatform[p] = (byPlatform[p] || 0) + Number(t.amount); });
    const best = Object.entries(byPlatform).sort((a, b) => b[1] - a[1])[0];
    if (best) items.push({ icon: '📍', text: `Jam segini biasanya ${best[0]} paling cuan buat kamu.` });
  }
  const efficiency = currentProfile?.fuel_efficiency_km_per_liter || 40;
  const fuelPrice = currentProfile?.fuel_price || 10000;
  const byPlatform = {};
  incomeTx.forEach(t => {
    const p = t.platform || 'Lainnya';
    byPlatform[p] = byPlatform[p] || { total: 0, km: 0 };
    byPlatform[p].total += Number(t.amount);
    byPlatform[p].km += Number(t.distance_km || 0);
  });
  Object.entries(byPlatform).forEach(([name, d]) => {
    if (d.km < 5) return;
    const fuelCost = (d.km / efficiency) * fuelPrice;
    const marginPerKm = (d.total - fuelCost) / d.km;
    if (marginPerKm < 500) items.push({ icon: '⚠️', text: `${name} marginnya tipis, cek tab Analisis buat detail.` });
  });
  return items;
}
