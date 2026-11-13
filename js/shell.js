'use strict';
/* MIE PEDIA · shell — boot, login (online & offline), navigasi, status sinkron, antrean, tutup shift */
const PAGES = {}, ACT = {}, INP = {}, CHG = {};
const NAV = [
  { id: 'dashboard', ic: '📊', t: 'Dashboard' }, { id: 'pos', ic: '🧾', t: 'Kasir' }, { id: 'riwayat', ic: '🕘', t: 'Riwayat' },
  { id: 'menu', ic: '📖', t: 'Menu & Resep', own: 1 }, { id: 'stok', ic: '📦', t: 'Stok Bahan' }, { id: 'biaya', ic: '💸', t: 'Biaya' },
  { id: 'laporan', ic: '📈', t: 'Laporan', own: 1 }, { id: 'pengaturan', ic: '⚙️', t: 'Pengaturan', own: 1 }
];
let cur = '', pendingRefresh = false, reloginOpen = false;
const allowed = id => { const n = NAV.find(x => x.id === id); return !!n && (!n.own || isOwner()); };

/* ---------- tema ---------- */
function applyTheme(t) {
  if (t) { try { localStorage.setItem('mp_theme', t); } catch (e) {} } else { try { t = localStorage.getItem('mp_theme'); } catch (e) {} if (!t && matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) t = 'dark'; }
  t = t || 'light'; document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#1b130e' : '#c2410c';
  const b = $('#btnTheme'); if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';
}
ACT.theme = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

/* ---------- boot ---------- */
async function boot() {
  await loadState(); applyTheme();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  bindGlobal(); startLoops();
  if (S.user && S.token) { const exp = tokenExp(S.token); if (exp && exp < Date.now() && navigator.onLine) showLogin(S.user.username); else enterApp(); }
  else showLogin();
  $('#boot').classList.add('hidden');
}
function bindGlobal() {
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = ACT[el.dataset.act]; if (f) f(el, e); });
  document.addEventListener('input', e => { const t = e.target; if (t.matches && t.matches('[data-money]')) fmtMoneyInput(t); const k = t.dataset && t.dataset.in; if (k && INP[k]) INP[k](t, e); });
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.ch; if (k && CHG[k]) CHG[k](e.target, e); });
  document.addEventListener('focusout', () => { if (pendingRefresh) setTimeout(() => { if (!inputFocused()) { pendingRefresh = false; refresh(); } }, 200); });
  $('#loginForm').addEventListener('submit', doLogin);
  $('#lgEye').onclick = () => { const i = $('#lgPass'); i.type = i.type === 'password' ? 'text' : 'password'; };
  $('#lgDarurat').onclick = e => { e.preventDefault(); daruratDlg(); };
}
const inputFocused = () => { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && $('#pages').contains(a); };

/* ---------- login ---------- */
function showLogin(prefill) {
  $('#app').classList.add('hidden'); $('#login').classList.remove('hidden');
  const list = String(cfg().shift_list || '').split(',').map(s => s.trim()).filter(Boolean);
  $('#lgShift').innerHTML = (list.length ? list : CFG.SHIFT_LIST).map(s => '<option>' + esc(s) + '</option>').join('');
  $('#lgCash').value = rpn(S.lastModal || 300000); if (prefill) $('#lgUser').value = prefill; $('#lgPass').value = '';
  $('#lgCfg').classList.toggle('hidden', !/GANTI/.test(CFG.GAS_URL)); $('#lgBtn').disabled = false; $('#lgBtn').textContent = '🔓 MASUK & BUKA SHIFT'; updateStatus();
}
const lgErr = m => { const e = $('#lgErr'); e.textContent = m || ''; e.classList.toggle('hidden', !m); };
async function doLogin(e) {
  e.preventDefault(); lgErr('');
  const user = $('#lgUser').value.trim().toLowerCase(), pin = $('#lgPass').value, shift = $('#lgShift').value, modal = mv($('#lgCash')), view = $('#lgView').checked, btn = $('#lgBtn');
  btn.disabled = true; btn.textContent = 'Memeriksa…';
  try {
    const res = await API('auth.login', { username: user, pin, shift, modal, buka: !view, id_shift: uid('SHF') }, { noAuth: true });
    if (!res.success) { lgErr(res.message); return; }
    const d = res.data, beda = !S.user || S.user.username !== d.user.username;
    if (beda) { S.vers = {}; S.trxRow = 0; S.logRow = 0; S.trx = []; S.logs = []; S.kasOut = []; }
    S.user = d.user; S.token = d.token; S.shift = d.shift || null; if (modal) S.lastModal = modal;
    mergeSync(d.sync); await saveCred(user, pin, d.user, d.token, S.shift); saveState();
    enterApp(); if (d.mustChange) pinDlg(true, pin); flushQ();
  } catch (ex) {
    if (ex instanceof NetErr) await offlineLogin(user, pin, view); else lgErr(ex.message);
  } finally { btn.disabled = false; btn.textContent = '🔓 MASUK & BUKA SHIFT'; }
}
async function offlineLogin(user, pin, view) {
  const c = await checkCred(user, pin);
  if (!c) { lgErr('Tidak bisa terhubung. Login offline hanya untuk akun yang pernah masuk di perangkat ini dengan PIN yang benar.'); return; }
  const tk = await kv.get('tok:' + user), butuhShift = c.user.role === 'Kasir' || !view;
  if (butuhShift && !(tk && tk.shift && tk.shift.status === 'BUKA')) { lgErr('Shift baru hanya bisa dibuka saat online. Sambungkan internet sebentar, atau lanjutkan shift yang masih terbuka.'); return; }
  S.user = c.user; S.token = tk ? tk.token : ''; S.shift = butuhShift ? tk.shift : null; enterApp(); toast('Masuk dalam mode offline', 'ok');
}
function daruratDlg() {
  const m = openModal({ title: 'Akses darurat', body: '<p class="muted sm">Hanya jika semua akun terkunci / PIN Owner lupa. Kredensial ada di Execution log Apps Script saat setup.</p><div class="fld"><label>Nama pengguna</label><input class="in" id="dUser" autocomplete="off"></div><div class="fld"><label>Kata sandi</label><input class="in" id="dPass" type="password"></div><div id="dErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="dOk">Masuk</button>' });
  $('#dOk', m.el).onclick = async () => {
    try { const r = await call('auth.darurat', { username: $('#dUser', m.el).value, password: $('#dPass', m.el).value }, { noAuth: true }); const d = r.data;
      S.vers = {}; S.trxRow = 0; S.logRow = 0; S.trx = []; S.user = d.user; S.token = d.token; S.shift = null; mergeSync(d.sync); saveState(); m.close(); enterApp(); toast('Masuk lewat akses darurat. Segera buat/ubah PIN Owner.', 'ok');
    } catch (e) { const x = $('#dErr', m.el); x.textContent = needNet(e); x.classList.remove('hidden'); }
  };
}

/* ---------- kerangka ---------- */
function enterApp() {
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  S.kasOut = S.kasOut || []; S.held = S.held || [];
  const u = S.user; $('#uName').textContent = u.nama || u.username; $('#uSub').textContent = u.role + (S.shift ? ' · Shift ' + S.shift.shift : ''); $('#uAv').textContent = (u.nama || u.username).slice(0, 2).toUpperCase();
  $('#sSia').textContent = cfg().namaUsaha;
  const own = isOwner(); $('#nav').innerHTML = NAV.filter(n => !n.own || own).map(n => '<button data-act="nav" data-id="' + n.id + '"><span class="ic">' + n.ic + '</span>' + esc(n.t) + '</button>').join('');
  const bn = own ? ['dashboard', 'pos', 'menu', 'laporan'] : ['pos', 'riwayat', 'stok', 'biaya'];
  $('#bnav').innerHTML = bn.map(id => { const n = NAV.find(x => x.id === id); return '<button data-act="nav" data-id="' + id + '"><span class="ic">' + n.ic + '</span>' + esc(n.t.split(' ')[0]) + '</button>'; }).join('') + '<button data-act="burger"><span class="ic">☰</span>Lainnya</button>';
  applyTheme(); updateShiftPill(); go(own ? 'dashboard' : 'pos'); updateStatus(); syncSoon(); flushSoon();
}
function updateShiftPill() { const p = $('#shiftPill'); if (S.shift && S.shift.status === 'BUKA') { p.classList.remove('hidden'); p.lastElementChild.textContent = 'Shift ' + S.shift.shift; } else p.classList.add('hidden'); }
function go(id) {
  if (!allowed(id) || !PAGES[id]) id = isOwner() ? 'dashboard' : 'pos';
  cur = id; $$('.pg').forEach(p => p.classList.toggle('on', p.id === 'pg-' + id));
  $$('#nav button,#bnav button[data-id]').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  const P = PAGES[id]; $('#pTitle').textContent = P.title; $('#pSub').textContent = ''; P.render(); closeDrawer(); $('#pages').scrollTop = 0;
}
function refresh() {
  updateStatus(); updateBell();
  if (!cur || !PAGES[cur] || !S.user) return;
  if (inputFocused()) { pendingRefresh = true; return; }
  const P = PAGES[cur]; if (P.refresh) P.refresh(); else if (P.live) P.render();
}
ACT.nav = el => go(el.dataset.id);
const closeDrawer = () => { $('#side').classList.remove('open'); $('#scrim').classList.remove('show'); };
ACT.burger = () => { const o = $('#side').classList.toggle('open'); $('#scrim').classList.toggle('show', o); };

/* ---------- status, lonceng, antrean ---------- */
function updateStatus() {
  const n = Q.filter(x => x.state === 'WAIT').length, rv = Q.filter(x => x.state === 'REVIEW').length;
  const np = $('#netPill'); if (np) { np.classList.toggle('off', !ONLINE); np.lastElementChild.textContent = ONLINE ? 'Online' : 'Offline'; }
  const el = $('#stSync'); if (!el) return; let cls = 'ok', txt;
  if (!ONLINE) { cls = 'off'; txt = 'Offline' + (n ? ' · ' + n + ' menunggu' : ''); }
  else if (n || flushing) { cls = 'wait'; txt = 'Mengirim ' + n + ' data…'; }
  else if (syncing) { cls = 'wait'; txt = 'Sinkron…'; }
  else txt = 'Online' + (S.lastSync ? ' · sinkron ' + jam(nowStr(new Date(S.lastSync))) : '');
  if (rv) txt += ' · ' + rv + ' perlu tinjau';
  el.className = 'stsync ' + cls; el.lastElementChild.textContent = txt;
  const b = $('#qBadge'); if (b) { b.textContent = n + rv; b.classList.toggle('hidden', !(n + rv)); }
}
function updateBell() { const b = $('#bellN'); if (!b || !S.user) return; const n = alerts().length; b.textContent = n > 99 ? '99+' : n; b.classList.toggle('hidden', !n); }
ACT.bell = () => {
  const a = alerts(), cls = { bad: 'chip bad', warn: 'chip warn' };
  openModal({ title: 'Pemberitahuan', body: a.length ? '<div class="list">' + a.map(x => '<div class="it"><span class="' + (cls[x.t] || 'chip') + '">' + x.ic + '</span><div class="sp">' + esc(x.x) + '</div></div>').join('') + '</div>' : '<div class="empty"><div class="big">✅</div>Semua aman. Tidak ada peringatan.</div>' });
};
ACT.queue = () => {
  const m = openModal({ title: 'Antrean pengiriman', body: '', wide: true });
  const draw = () => {
    const lb = { WAIT: '<span class="chip warn">⏳ menunggu</span>', REVIEW: '<span class="chip bad">⚠ perlu tinjau</span>' };
    m.setBody((ONLINE ? '' : '<div class="note mb">Perangkat offline. Data aman tersimpan dan terkirim otomatis saat internet kembali.</div>') + (Q.length ? '<div class="list">' + Q.map(it => '<div class="it"><div class="sp"><b>' + esc(it.label) + '</b><div class="xs muted">' + esc(it.user || '') + ' · ' + jam(nowStr(new Date(it.ts))) + (it.err ? ' · ' + esc(it.err) : '') + '</div></div>' + lb[it.state] + (it.state === 'REVIEW' ? '<button class="btn sm" data-act="qRetry" data-id="' + it.id + '">Coba lagi</button><button class="btn sm dng" data-act="qDrop" data-id="' + it.id + '">Buang</button>' : '') + '</div>').join('') + '</div>' : '<div class="empty"><div class="big">📤</div>Antrean kosong — semua data sudah terkirim.</div>'));
    m.setFoot('<button class="btn" data-x>Tutup</button><button class="btn pri" data-act="qNow">Kirim sekarang</button>');
  };
  draw(); m._draw = draw; window._qm = m; m.el.addEventListener('click', () => setTimeout(draw, 120));
};
ACT.qNow = () => { ping(); flushQ(); syncSoon(); toast('Mencoba mengirim…'); };
ACT.qRetry = el => { const it = Q.find(x => x.id === el.dataset.id); if (it) { it.state = 'WAIT'; it.err = ''; saveQ(); applyEffect(it); flushQ(); } };
ACT.qDrop = async el => { const it = Q.find(x => x.id === el.dataset.id); if (!it || !(await confirmDlg('Buang data ini? Data tidak akan dikirim ke server.', { danger: true, ok: 'Buang' }))) return; Q = Q.filter(x => x !== it); if (it.action === 'trx.save') S.trx = S.trx.filter(t => t.id_transaksi !== it.data.id_transaksi); S.vers.Bahan = -1; saveQ(); saveState(); syncSoon(); refresh(); };

/* ---------- sesi habis, PIN, tutup shift ---------- */
function needRelogin() {
  if (reloginOpen || !S.user) return; reloginOpen = true;
  const m = openModal({ title: 'Sesi berakhir', sticky: true, onClose: () => { reloginOpen = false; },
    body: '<p class="muted sm">Masukkan PIN <b>' + esc(S.user.username) + '</b> untuk melanjutkan. Data yang belum terkirim tetap aman.</p><div class="fld"><label>PIN</label><input class="in" id="rlPin" type="password" inputmode="numeric" autocomplete="off"></div><div id="rlErr" class="err hidden"></div>',
    foot: '<button class="btn" id="rlOut">Keluar</button><button class="btn pri" id="rlOk">Lanjutkan</button>' });
  $('#rlOut', m.el).onclick = () => { m.close(); doLogout(); };
  $('#rlOk', m.el).onclick = async () => {
    try {
      const r = await call('auth.login', { username: S.user.username, pin: $('#rlPin', m.el).value, shift: S.shift && S.shift.shift, modal: 0, buka: S.user.role === 'Kasir' || !!S.shift }, { noAuth: true });
      S.token = r.data.token; if (r.data.shift) S.shift = r.data.shift; await kv.set('tok:' + S.user.username, { token: S.token, shift: S.shift }); saveState(); m.close(); toast('Sesi dipulihkan', 'ok'); flushQ(); syncSoon();
    } catch (e) { const x = $('#rlErr', m.el); x.textContent = needNet(e); x.classList.remove('hidden'); }
  };
}
function pinDlg(forced, oldPin) {
  const m = openModal({ title: forced ? 'Ganti PIN awal' : 'Ganti PIN', sticky: forced,
    body: (forced ? '<div class="note mb">Demi keamanan, ganti PIN awal sekarang (minimal 6 karakter).</div>' : '') + (oldPin ? '' : '<div class="fld"><label>PIN lama</label><input class="in" id="pLama" type="password"></div>') + '<div class="fld"><label>PIN baru</label><input class="in" id="pBaru" type="password"></div><div class="fld"><label>Ulangi PIN baru</label><input class="in" id="pUlang" type="password"></div><div id="pErr" class="err hidden"></div>',
    foot: (forced ? '' : '<button class="btn" data-x>Batal</button>') + '<button class="btn pri" id="pOk">Simpan PIN</button>' });
  $('#pOk', m.el).onclick = async () => {
    const lama = oldPin || $('#pLama', m.el).value, baru = $('#pBaru', m.el).value, x = $('#pErr', m.el); x.classList.add('hidden');
    if (baru !== $('#pUlang', m.el).value) { x.textContent = 'Ulangi PIN tidak sama.'; x.classList.remove('hidden'); return; }
    try { const r = await call('pin.ganti', { lama, baru }); S.token = r.data.token; await saveCred(S.user.username, baru, S.user, S.token, S.shift); saveState(); m.close(); toast('PIN diganti', 'ok'); }
    catch (e) { x.textContent = needNet(e); x.classList.remove('hidden'); }
  };
}
ACT.pin = () => pinDlg(false);
function kasKeluarShift() { return (S.kasOut || []).filter(k => S.shift && k.shift_id === S.shift.id_shift); }
function shiftStats() {
  const sh = S.shift, list = S.trx.filter(t => t.shift_id === sh.id_shift && t.status !== 'VOID');
  const tunai = list.filter(t => t.metode_bayar === 'Tunai').reduce((a, t) => a + num(t.total), 0), keluar = kasKeluarShift().reduce((a, k) => a + num(k.jumlah), 0);
  return { n: list.length, omzet: list.reduce((a, t) => a + num(t.total), 0), tunai, keluar, seharusnya: num(sh.modal_awal) + tunai - keluar };
}
ACT.logout = () => {
  if (!S.shift || S.shift.status !== 'BUKA') { confirmDlg('Keluar dari aplikasi?', { ok: 'Keluar' }).then(y => { if (y) doLogout(); }); return; }
  const st = shiftStats(), kas = kasKeluarShift();
  const m = openModal({ title: 'Tutup shift ' + S.shift.shift,
    body: '<div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><div class="l">Pesanan</div><div class="v">' + st.n + '</div></div><div class="kpi"><div class="l">Penjualan</div><div class="v">' + rp(st.omzet) + '</div></div></div>' +
      '<div class="tw mb"><table class="tbl"><tr><td>Modal awal</td><td class="r">' + rp(S.shift.modal_awal) + '</td></tr><tr><td>+ Penjualan tunai</td><td class="r">' + rp(st.tunai) + '</td></tr><tr><td>− Pengeluaran dari kas laci' + (kas.length ? ' <span class="xs muted">(' + kas.length + ')</span>' : '') + '</td><td class="r">' + rp(st.keluar) + '</td></tr><tr><td><b>Kas seharusnya</b></td><td class="r b">' + rp(st.seharusnya) + '</td></tr></table></div>' +
      '<div class="fld"><label>Uang fisik di laci (hitung manual) <span class="req">*</span></label><input class="in m" id="kFisik" data-money data-in="kasSel" inputmode="numeric" placeholder="0"></div><div id="kSel" class="hint">Isi jumlah uang yang Anda hitung.</div><div class="fld mt"><label>Catatan (opsional)</label><input class="in" id="kCat" maxlength="150" placeholder="mis. kurang 2.000 untuk parkir"></div>',
    foot: '<button class="btn gh" id="kTanpa">Keluar tanpa tutup</button><span class="sp"></span><button class="btn" data-x>Batal</button><button class="btn pri" id="kOk">Tutup shift & keluar</button>' });
  window._kasSeh = st.seharusnya;
  $('#kTanpa', m.el).onclick = () => { m.close(); doLogout(); };
  $('#kOk', m.el).onclick = async () => {
    const f = $('#kFisik', m.el); if (!f.value) { toast('Isi uang fisik di laci', 'bad'); f.focus(); return; }
    const ok = await confirmDlg('Tutup shift ' + S.shift.shift + '? Setelah ditutup, transaksi baru memerlukan shift baru.', { ok: 'Ya, tutup' }); if (!ok) return;
    enqueue('shift.close', { id_shift: S.shift.id_shift, kas_fisik: mv(f), catatan: $('#kCat', m.el).value, selesai: nowStr() }, 'Tutup shift ' + S.shift.shift);
    S.shift.status = 'TUTUP'; await kv.set('tok:' + S.user.username, { token: S.token, shift: null }); m.close(); await flushQ(); doLogout(true);
  };
};
INP.kasSel = el => { const s = mv(el) - (window._kasSeh || 0), h = $('#kSel'); h.className = 'hint'; h.innerHTML = !el.value ? 'Isi jumlah uang yang Anda hitung.' : s === 0 ? '<span style="color:var(--ok)">✓ Sesuai</span>' : '<b style="color:var(--bad)">Selisih ' + rp(s) + (s < 0 ? ' (kurang)' : ' (lebih)') + '</b>'; };
function doLogout(tutup) {
  S.token = ''; S.user = null; S.shift = null; S.kasOut = tutup ? [] : S.kasOut; saveState(); cur = ''; closeDrawer(); $$('#mroot .ov').forEach(o => o.remove()); showLogin(); if (tutup) toast('Shift ditutup. Laporan dikirim ke Owner jika email aktif.', 'ok');
}
