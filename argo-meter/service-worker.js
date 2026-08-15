const CACHE_NAME = 'argometer-v5';
const SHELL_FILES = [
  'index.html',
  'app.html',
  'css/style.css',
  'js/supabase-config.js',
  'js/constants.js',
  'js/auth.js',
  'js/tracker.js',
  'js/beranda.js',
  'js/dompet.js',
  'js/subscription.js',
  'js/analysis.js',
  'js/profile.js',
  'manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// STRATEGI: Network-first buat semua file app kita sendiri (HTML/CSS/JS) --
// jadi begitu ada update baru di-deploy, device langsung dapet versi terbaru.
// Cache cuma dipakai sebagai fallback pas offline / koneksi jelek.
// Request ke Supabase/Midtrans tetap selalu ke jaringan (nggak di-cache sama sekali).
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('supabase.co') || url.includes('midtrans.com') || url.includes('jsdelivr.net') || url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
