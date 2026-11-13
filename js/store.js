'use strict';
/* MIE PEDIA · store — state aplikasi + penyimpanan lokal (IndexedDB, cadangan localStorage) */
const kv = (function () {
  let dbp = null;
  const ok = typeof indexedDB !== 'undefined';
  const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('miepedia', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = (m, f) => open().then(d => new Promise((res, rej) => { const t = d.transaction('kv', m), rq = f(t.objectStore('kv')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }));
  const ls = { get: k => Promise.resolve(JSON.parse(localStorage.getItem('mp_' + k) || 'null')), set: (k, v) => { try { localStorage.setItem('mp_' + k, JSON.stringify(v)); } catch (e) {} return Promise.resolve(); }, del: k => { localStorage.removeItem('mp_' + k); return Promise.resolve(); } };
  if (!ok) return ls;
  return { get: k => tx('readonly', s => s.get(k)).catch(() => ls.get(k)), set: (k, v) => tx('readwrite', s => s.put(v, k)).catch(() => ls.set(k, v)), del: k => tx('readwrite', s => s.delete(k)).catch(() => ls.del(k)) };
})();

const S = { user: null, token: '', shift: null, cfg: null, menu: [], bahan: [], suppliers: [], purchases: [], expenses: [], shifts: [], users: [], trx: [], logs: [], vers: {}, trxRow: 0, logRow: 0, hari: '', lastSync: 0, held: [], counter: { d: '', n: 0 }, lastModal: 300000 };
let Q = [];
const persist = debounce(() => { kv.set('state', JSON.parse(JSON.stringify(S))); }, 350);
const saveState = () => persist();
async function loadState() {
  try { const s = await kv.get('state'); if (s) Object.assign(S, s); Q = (await kv.get('queue')) || []; } catch (e) {}
}
function saveQ() { kv.set('queue', JSON.parse(JSON.stringify(Q))); if (window.updateStatus) updateStatus(); }
function cfg() { return Object.assign({ namaUsaha: 'Mie Pedia', alamat: '', telp: '', wa: '', pajak_persen: 0, kertas: '58', footer: 'Terima kasih!', blokir_stok: 0, diskon_maks_kasir: 10, shift_list: 'Pagi,Sore', kategori_menu: 'Mie,Minuman,Topping,Camilan', kategori_biaya: 'Gaji,Listrik & Air,Gas,Sewa,Kemasan,Transport,Lain-lain', jumlah_meja: 12 }, S.cfg || {}); }
const isOwner = () => S.user && S.user.role === 'Owner';

/* login offline: hash PIN di perangkat (PBKDF2) — PIN tidak pernah disimpan */
async function pbk(pin, salt) {
  const enc = new TextEncoder(), key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(bits)));
}
async function saveCred(username, pin, user, token, shift) {
  try { const salt = uid('S'); await kv.set('cred:' + username, { salt, hash: await pbk(pin, salt), user }); } catch (e) {}
  await kv.set('tok:' + username, { token, shift });
}
async function checkCred(username, pin) { const c = await kv.get('cred:' + username); return c && (await pbk(pin, c.salt)) === c.hash ? c : null; }
function tokenExp(t) { try { const b = String(t).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))).x || 0; } catch (e) { return 0; } }
