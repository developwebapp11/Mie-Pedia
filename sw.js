/* MIE PEDIA · Service Worker — aplikasi tetap terbuka tanpa internet. Naikkan VER setiap mengubah berkas aplikasi. */
const VER = 'miepedia-v1.0.0';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'js/config.js', 'js/util.js', 'js/store.js', 'js/net.js', 'js/logic.js', 'js/shell.js', 'js/pos.js', 'js/menu.js', 'js/stok.js', 'js/laporan.js', 'js/admin.js', 'icons/icon-192.png', 'icons/icon-512.png'];
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})).concat(fetch(XLSX_URL, { mode: 'no-cors' }).then(r => c.put(XLSX_URL, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin && u.href !== XLSX_URL) return;       // API GAS, foto Drive & lainnya: jangan dicegat
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html').then(x => x || caches.match('./')))); return; }
  e.respondWith(caches.match(r).then(hit => { const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); } return res; }).catch(() => hit); return hit || net; }));
});
