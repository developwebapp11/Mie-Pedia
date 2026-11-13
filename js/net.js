'use strict';
/* MIE PEDIA · net — API, antrean offline (idempoten), sinkron berbasis versi */
let ONLINE = navigator.onLine, flushing = false, syncing = false;
class NetErr extends Error {}
function setOnline(v) { if (ONLINE !== v) { ONLINE = v; updateStatus(); if (v) { flushSoon(); syncSoon(); } } }

async function API(action, data, opt) {
  opt = opt || {};
  if (!CFG.GAS_URL || /GANTI/.test(CFG.GAS_URL)) throw new Error('GAS_URL belum diisi di js/config.js');
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), opt.timeout || 30000); let res;
  try {
    res = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, data: data || {}, token: opt.noAuth ? undefined : (opt.token || S.token) }), signal: ctl.signal });
  } catch (e) { clearTimeout(to); setOnline(false); throw new NetErr('Tidak dapat terhubung ke server.'); }
  clearTimeout(to); let j;
  try { j = await res.json(); } catch (e) { setOnline(false); throw new NetErr('Respons server tidak valid. Pastikan deployment: Execute as "Me", akses "Anyone".'); }
  setOnline(true); return j;
}
// Panggilan langsung dari UI (butuh internet). Melempar Error berisi pesan ramah.
async function call(action, data, opt) {
  const j = await API(action, data, opt);
  if (!j.success) { if (j.code === 'SESI_HABIS') needRelogin(); throw new Error(j.message || 'Gagal'); }
  return j;
}
const needNet = e => e instanceof NetErr ? 'Fitur ini butuh internet. Sambungkan lalu coba lagi.' : e.message;

/* ---------- antrean ---------- */
const flushSoon = debounce(() => flushQ(), 300), syncSoon = debounce(() => syncNow(), 600);
function enqueue(action, data, label) {
  const it = { id: uid('Q'), action, data, label: label || action, ts: Date.now(), state: 'WAIT', tries: 0, user: S.user && S.user.username };
  Q.push(it); saveQ(); applyEffect(it); saveState(); flushSoon(); return it;
}
async function tokenFor(it) { if (S.user && it.user === S.user.username && S.token) return S.token; const r = await kv.get('tok:' + it.user); return r && r.token; }
async function flushQ() {
  if (flushing || !Q.some(x => x.state === 'WAIT')) return; flushing = true; updateStatus();
  try {
    for (;;) {
      const it = Q.find(x => x.state === 'WAIT'); if (!it) break;
      const tk = await tokenFor(it);
      if (!tk) { rejectItem(it, 'Sesi ' + it.user + ' tidak ada. Masuk sebagai ' + it.user + ' untuk mengirim.'); continue; }
      let res; try { res = await API(it.action, it.data, { token: tk, timeout: 40000 }); } catch (e) { if (e instanceof NetErr) break; rejectItem(it, e.message); continue; }
      it.tries++;
      if (res.success) { Q = Q.filter(x => x !== it); onQueued(it, res); saveQ(); }
      else if (res.code === 'SESI_HABIS') { if (S.user && it.user === S.user.username) { needRelogin(); saveQ(); break; } rejectItem(it, 'Sesi ' + it.user + ' berakhir — masuk sebagai ' + it.user + ' untuk mengirim.'); }
      else rejectItem(it, res.message);
    }
  } finally { flushing = false; updateStatus(); }
  if (!Q.some(x => x.state === 'WAIT')) syncSoon();
}
function rejectItem(it, msg) { it.state = 'REVIEW'; it.err = msg; S.vers.Bahan = -1; saveQ(); saveState(); }
function onQueued(it, res) {
  const d = res.data || {};
  if (it.action === 'trx.save' && d.trx) upsertTrx(d.trx);
  if (it.action === 'shift.close' && d.shift) { if (S.shift && S.shift.id_shift === d.shift.id_shift) S.shift = d.shift; const i = S.shifts.findIndex(x => x.id_shift === d.shift.id_shift); if (i >= 0) S.shifts[i] = d.shift; }
  saveState(); syncSoon(); if (window.refresh) refresh();
}
function applyEffect(it) {
  const d = it.data;
  if (it.action === 'trx.save') localDeduct(d.items, 1);
  else if (it.action === 'stock.ops') d.ops.forEach(op => { const b = bahanOf(op.id_bahan); if (!b) return; if (op.type === 'WASTE') b.stok = round3(num(b.stok) - num(op.qty)); else if (op.type === 'OPNAME') b.stok = num(op.fisik); });
  else if (it.action === 'purchase.save') d.items.forEach(i => { const b = bahanOf(i.id_bahan); if (b) b.stok = round3(num(b.stok) + num(i.qty)); });
  else if (it.action === 'menu.tersedia') { const m = menuOf(d.id_menu); if (m) m.tersedia = d.tersedia !== false; }
}
const reapplyQueue = () => Q.filter(x => x.state === 'WAIT').forEach(applyEffect);
function upsertTrx(t) { delete t._local; t.items = t.items || []; const i = S.trx.findIndex(x => x.id_transaksi === t.id_transaksi); if (i >= 0) { S.trx[i] = Object.assign(S.trx[i], t); delete S.trx[i]._local; } else S.trx.push(t); }

/* ---------- sinkron ---------- */
function normMenu(m) { m.harga = num(m.harga); m.opsi = parseJ(m.opsi); m.resep = parseJ(m.resep); m.tersedia = isOn(m.tersedia); m.urut = num(m.urut); return m; }
async function syncNow() {
  if (syncing || flushing || !S.token || !S.user) return;
  if (Q.some(x => x.state === 'WAIT')) return flushQ();
  syncing = true; updateStatus();
  try {
    const res = await API('sync', { vers: S.vers, trxRow: S.trxRow, logRow: S.logRow, hari: S.hari }, { timeout: 40000 });
    if (res.success) mergeSync(res.data); else if (res.code === 'SESI_HABIS') needRelogin();
  } catch (e) {} finally { syncing = false; updateStatus(); }
}
function mergeSync(d) {
  let bahanBaru = false;
  ['cfg', 'suppliers', 'purchases', 'expenses', 'shifts', 'users'].forEach(k => { if (d[k] !== undefined) S[k] = d[k]; });
  if (d.menu) S.menu = d.menu.map(normMenu).sort((a, b) => a.urut - b.urut || a.nama.localeCompare(b.nama));
  if (d.bahan) { S.bahan = d.bahan.sort((a, b) => a.nama.localeCompare(b.nama)); bahanBaru = true; }
  Object.assign(S.vers, d.vers); S.hari = d.hari;
  if (d.trx) {
    if (d.trx.reset) { const lokal = S.trx.filter(t => t._local); S.trx = d.trx.rows; lokal.forEach(l => { if (!S.trx.some(x => x.id_transaksi === l.id_transaksi)) S.trx.push(l); }); }
    else d.trx.rows.forEach(upsertTrx);
    S.trxRow = d.trx.row; (d.trx.voids || []).forEach(v => { const t = S.trx.find(x => x.id_transaksi === v.id_transaksi); if (t) Object.assign(t, v); });
    if (d.trx.more) syncSoon();
  }
  if (d.logs) { if (d.logs.reset) S.logs = d.logs.rows; else S.logs = S.logs.concat(d.logs.rows).slice(-600); S.logRow = d.logs.row; if (d.logs.more) syncSoon(); }
  const hari = todayStr(); S.trx = S.trx.filter(t => String(t.tanggal_waktu).substr(0, 10) >= addDaysStr(hari, -1));
  if (bahanBaru || d.menu) reapplyQueue();
  S.lastSync = Date.now(); saveState(); if (window.refresh) refresh();
}
async function ping() {
  if (ONLINE && !Q.some(x => x.state === 'WAIT')) return;
  try { const r = await fetch(CFG.GAS_URL + '?ping=' + Date.now(), { cache: 'no-store' }); if (r.ok) { setOnline(true); flushSoon(); syncSoon(); } } catch (e) { setOnline(false); }
}
function startLoops() {
  setInterval(() => { if (document.hidden) return; if (Q.some(x => x.state === 'WAIT')) flushQ(); else if (S.token && Date.now() - S.lastSync > CFG.SYNC_MS - 1000) syncNow(); }, 15000);
  setInterval(ping, 20000);
  addEventListener('online', ping); addEventListener('offline', () => setOnline(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { ping(); if (S.token) syncSoon(); } });
}
