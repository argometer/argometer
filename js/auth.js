// ===== Modal open/close & tab switching =====
const authModal = document.getElementById('authModal');
const openModal = (tab) => {
  authModal.classList.add('open');
  switchTab(tab);
};
const closeModal = () => authModal.classList.remove('open');

document.getElementById('navLoginBtn').onclick = () => openModal('login');
document.getElementById('heroLoginBtn').onclick = () => openModal('login');
document.getElementById('heroRegisterBtn').onclick = () => openModal('register');
document.getElementById('modalCloseBtn').onclick = closeModal;
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(); });

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

// ===== Login =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Login error:', error); // buka Inspect > Console buat lihat detail aslinya
    if (error.message.includes('Invalid login credentials')) {
      errEl.textContent = 'Email atau password salah.';
    } else if (error.message.includes('Email not confirmed')) {
      errEl.textContent = 'Email belum dikonfirmasi. Cek inbox/spam kamu dulu.';
    } else {
      errEl.textContent = `Gagal masuk: ${error.message}`;
    }
    return;
  }
  window.location.href = 'app.html';
});

// ===== Register =====
const registerForm = document.getElementById('registerForm');
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const full_name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const errEl = document.getElementById('registerError');
  errEl.textContent = '';

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name } }
  });
  if (error) {
    console.error('Register error:', error); // buka Inspect > Console buat lihat detail aslinya
    errEl.textContent = error.message.includes('already') ? 'Email sudah terdaftar.' : `Gagal daftar: ${error.message}`;
    return;
  }

  // Selalu tampilkan pesan sukses + minta konfirmasi email, jangan auto-redirect.
  // Ini konsisten baik project Supabase kamu mewajibkan konfirmasi email atau tidak.
  errEl.style.color = '#3ECF8E';
  errEl.textContent = 'Pendaftaran berhasil. Konfirmasi email untuk mengaktifkan akun.';
  registerForm.reset();
});

// ===== Redirect kalau sudah login =====
(async () => {
  const splash = document.getElementById('splashScreen');
  const hide = () => splash && splash.classList.add('hide');
  setTimeout(hide, 2500); // pengaman

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) { window.location.href = 'app.html'; return; }

  setTimeout(hide, 500); // beri jeda dikit biar animasi sempat kelihatan
})();
