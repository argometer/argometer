function computeWalletBalances() {
  const wallets = getAllWalletsWithCash();
  const balances = {};
  wallets.forEach(w => { balances[w === 'Tunai' ? 'Cash' : w] = 0; });

  allTransactions.forEach(t => {
    const w = t.wallet === 'Tunai' ? 'Cash' : (t.wallet || 'Cash');
    if (!(w in balances)) balances[w] = 0;
    if (t.type === 'income') balances[w] += Number(t.amount) + Number(t.tip_amount || 0);
    else balances[w] -= Number(t.amount);
  });
  return balances;
}

function renderDompet() {
  const balances = computeWalletBalances();
  const grid = document.getElementById('walletGrid');

  grid.innerHTML = Object.entries(balances).map(([name, bal]) => {
    const meta = walletMeta(name);
    const iconHtml = `<span class="wallet-icon" style="background:linear-gradient(135deg, ${shadeColor(meta.color,25)}, ${shadeColor(meta.color,-25)})">${WALLET_ICON_SVG}</span>`;
    const infoHtml = `<div class="wallet-info"><p class="w-name">${name === 'Cash' ? 'Tunai' : name}</p><p class="w-balance">${fmtRupiah(bal)}</p></div>`;

    return `
      <div class="wallet-swipe-wrap">
        <div class="wallet-swipe-delete" data-wallet="${name}">🗑 Hapus</div>
        <div class="wallet-card wallet-swipeable" data-wallet="${name}">${iconHtml}${infoHtml}</div>
      </div>
    `;
  }).join('');

  initWalletSwipe();
  renderDompetTxList(allTransactions.slice(0, 3), 'dompetTxList');
}

// ===== Swipe-to-delete (geser ke kiri, tombol hapus muncul di kanan) =====
function initWalletSwipe() {
  const OPEN_X = -76;
  let openCard = null;
  let closeTimer = null;

  function closeCard(card) {
    if (!card) return;
    card.style.transition = 'transform .25s ease';
    card.style.transform = 'translateX(0)';
    clearTimeout(closeTimer);
    if (openCard === card) openCard = null;
  }

  document.querySelectorAll('.wallet-swipeable').forEach(card => {
    let startX = 0, currentX = 0, dragging = false;

    card.addEventListener('pointerdown', (e) => {
      if (openCard && openCard !== card) closeCard(openCard);
      startX = e.clientX;
      dragging = true;
      card.style.transition = 'none';
      card.setPointerCapture(e.pointerId);
    });

    card.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      currentX = Math.min(0, Math.max(OPEN_X, e.clientX - startX));
      card.style.transform = `translateX(${currentX}px)`;
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      card.style.transition = 'transform .2s ease';
      if (currentX < OPEN_X / 2) {
        card.style.transform = `translateX(${OPEN_X}px)`;
        openCard = card;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => closeCard(card), 3000);
      } else {
        card.style.transform = 'translateX(0)';
        if (openCard === card) openCard = null;
      }
      currentX = 0;
    };

    card.addEventListener('pointerup', endDrag);
    card.addEventListener('pointercancel', endDrag);
  });

  document.querySelectorAll('.wallet-swipe-delete').forEach(btn => {
    btn.onclick = () => {
      const name = btn.dataset.wallet;
      clearTimeout(closeTimer);
      openGenericModal(`
        <h3>Hapus Dompet "${name === 'Cash' ? 'Tunai' : name}"?</h3>
        <p class="policy-text">Dompet ini akan hilang dari pilihan waktu catat transaksi baru. Transaksi lama yang udah pakai dompet ini tetap aman, cuma nggak bisa dipilih lagi ke depannya.</p>
        <button class="btn-secondary full" id="cancelDeleteWalletBtn" style="margin-top:16px">Batal</button>
        <button class="btn-primary full" id="confirmDeleteWalletBtn" style="margin-top:10px;background:linear-gradient(135deg,#FF8577,#E14E3E);color:#fff">Ya, Hapus</button>
      `);
      document.getElementById('cancelDeleteWalletBtn').onclick = () => document.getElementById('genericModal').classList.remove('open');
      document.getElementById('confirmDeleteWalletBtn').onclick = async () => {
        const isCustom = (currentProfile.custom_wallets || []).includes(name);
        let payload;
        if (isCustom) {
          payload = { custom_wallets: (currentProfile.custom_wallets || []).filter(w => w !== name) };
        } else {
          payload = { hidden_wallets: [...(currentProfile.hidden_wallets || []), name] };
        }
        const { error } = await supabaseClient.from('profiles').update(payload).eq('id', currentUser.id);
        if (error) { alert('Gagal menghapus dompet.'); return; }
        await loadProfile();
        populateSelects();
        renderDompet();
        document.getElementById('genericModal').classList.remove('open');
        showToast('Dompet dihapus.');
      };
    };
  });
}

function renderDompetTxList(list, targetId) {
  const el = document.getElementById(targetId);
  if (!list.length) { el.innerHTML = '<p class="empty-state">Belum ada transaksi.</p>'; return; }
  el.innerHTML = list.map(t => {
    const time = new Date(t.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const label = t.type === 'income' ? (t.platform || 'Pemasukan') : t.category;
    const sign = t.type === 'income' ? '+' : '-';
    return `
      <div class="tx-item">
        <div class="tx-info">
          <span class="tx-cat">${label}</span>
          <span class="tx-meta">${time} · ${t.wallet || '-'}${t.note ? ' · ' + t.note : ''}</span>
        </div>
        <span class="tx-amount ${t.type}">${sign} ${fmtRupiah(t.amount)}</span>
      </div>
    `;
  }).join('');
}

document.getElementById('seeAllTxBtn').onclick = () => {
  const html = `
    <h3>Semua Transaksi</h3>
    <div class="filter-bar" style="padding-left:0">
      <button class="filter-chip active" data-f="semua">Semua</button>
      <button class="filter-chip" data-f="income">Terima</button>
      <button class="filter-chip" data-f="expense">Keluar</button>
    </div>
    <div class="tx-list" id="allTxList" style="margin-top:16px; max-height:50vh; overflow-y:auto"></div>
  `;
  openGenericModal(html);
  document.getElementById('genericModalCard').classList.add('wide');

  const applyFilter = (f) => {
    const filtered = f === 'semua' ? allTransactions : allTransactions.filter(t => t.type === f);
    renderDompetTxList(filtered, 'allTxList');
  };
  applyFilter('semua');
  document.querySelectorAll('#genericModalBody .filter-chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('#genericModalBody .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilter(chip.dataset.f);
    };
  });
};

// ===== Tambah Dompet baru =====
document.getElementById('addWalletBtn').onclick = () => {
  const html = `
    <h3>Tambah Dompet</h3>
    <label style="display:block;font-size:13px;color:var(--text-muted);margin:12px 0 6px">Nama Dompet</label>
    <input type="text" id="newWalletName" placeholder="Contoh: DANA, LinkAja" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px">
    <p class="form-error" id="newWalletError"></p>
    <button class="btn-primary full" id="saveWalletBtn" style="margin-top:16px">Simpan</button>
  `;
  openGenericModal(html);
  document.getElementById('saveWalletBtn').onclick = async () => {
    const name = document.getElementById('newWalletName').value.trim();
    const errEl = document.getElementById('newWalletError');
    const existing = getAllWalletsWithCash();
    if (!name) { errEl.textContent = 'Nama dompet nggak boleh kosong.'; return; }
    if (existing.some(w => w.toLowerCase() === name.toLowerCase())) { errEl.textContent = 'Dompet ini sudah ada.'; return; }

    const updated = [...(currentProfile?.custom_wallets || []), name];
    const { error } = await supabaseClient.from('profiles').update({ custom_wallets: updated }).eq('id', currentUser.id);
    if (error) { errEl.textContent = 'Gagal menyimpan, coba lagi.'; return; }

    await loadProfile();
    populateSelects();
    renderDompet();
    document.getElementById('genericModal').classList.remove('open');
    showToast('Dompet baru ditambahkan ✓');
  };
};
