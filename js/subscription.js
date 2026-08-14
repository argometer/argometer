// ===== Cek status premium & tampilkan konten yang sesuai =====
function isPremiumActive() {
  if (!currentProfile) return false;
  if (currentProfile.is_admin) return true; // pemilik app selalu punya akses penuh
  if (!currentProfile.is_premium) return false;
  if (currentProfile.premium_until && new Date(currentProfile.premium_until) < new Date()) return false;
  return true;
}

function applyPremiumUI() {
  const unlocked = isPremiumActive();
  const detailSection = document.getElementById('detailSection');
  const cta = document.getElementById('analisisCta');
  if (detailSection) detailSection.style.display = unlocked ? 'block' : 'none';
  if (cta) cta.style.display = unlocked ? 'none' : 'block';
  const navLockDot = document.getElementById('navLockDot');
  if (navLockDot) navLockDot.style.display = unlocked ? 'none' : 'block';
  const upgradeSection = document.getElementById('profileUpgradeSection');
  if (upgradeSection) upgradeSection.style.display = unlocked ? 'none' : 'block';
  if (typeof renderFeatureCards === 'function') renderFeatureCards();
}

// (Statistik & grafik analisis lengkap sekarang ditangani oleh analysis.js)


// ===== Upgrade / Midtrans Snap checkout =====
const PREMIUM_PRICE = 10000;
const PREMIUM_LABEL = 'Upgrade — Rp 10.000/bulan';

async function startCheckout(btn) {
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Menyiapkan pembayaran...';

  try {
    // Panggil Supabase Edge Function "create-transaction" (lihat supabase-functions/create-transaction)
    const { data, error } = await supabaseClient.functions.invoke('create-transaction', {
      body: { user_id: currentUser.id, amount: PREMIUM_PRICE }
    });

    if (error || !data?.token) {
      throw new Error('Gagal membuat transaksi pembayaran.');
    }

    // Buka popup pembayaran Midtrans Snap
    window.snap.pay(data.token, {
      onSuccess: async () => {
        alert('Pembayaran berhasil! Status premium akan aktif dalam beberapa detik.');
        setTimeout(async () => {
          await loadProfile();
          applyPremiumUI();
          if (typeof renderAnalisis === 'function') renderAnalisis();
          if (typeof renderProfileTab === 'function') renderProfileTab();
        }, 3000);
      },
      onPending: () => alert('Pembayaran sedang diproses. Status premium akan aktif setelah pembayaran dikonfirmasi.'),
      onError: () => alert('Pembayaran gagal. Coba lagi ya.'),
      onClose: () => {}
    });
  } catch (err) {
    alert(err.message || 'Terjadi kesalahan. Coba lagi.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

document.getElementById('ctaUpgradeBtn').onclick = (e) => startCheckout(e.target);
document.getElementById('profileUpgradeBtn').onclick = (e) => startCheckout(e.target);
