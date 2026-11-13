'use strict';
/* MIE PEDIA · pos — Kasir, pembayaran, pesanan tersimpan, Riwayat, Biaya, Dashboard */
const POS = { cart: [], cat: 'Semua', q: '', tipe: 'Dine In', meja: '', pel: '', telp: '', email: '', cat2: '', diskon: 0, diskonMode: 'rp', open: false };
const TIPE = ['Dine In', 'Take Away', 'Online'];

/* ================= KASIR ================= */
PAGES.pos = {
  title: 'Kasir', live: false,
  render() {
    const own = isOwner();
    if (!S.shift && !own) { $('#pg-pos').innerHTML = '<div class="empty"><div class="big">🔒</div>Shift belum dibuka. Keluar lalu masuk kembali untuk membuka shift.</div>'; return; }
    $('#pg-pos').innerHTML = (!S.shift ? '<div class="note mb">Anda masuk tanpa shift (mode lihat laporan). Transaksi tidak masuk rekonsiliasi kas — masuk ulang untuk membuka shift.</div>' : '') +
      '<div class="pos"><div class="pos-l"><div class="row"><input class="in" id="pSearch" data-in="posQ" placeholder="🔍 Cari menu…" value="' + esc(POS.q) + '" autocomplete="off"><button class="btn" data-act="heldList">📌 <span id="heldN">' + S.held.length + '</span></button></div><div class="cats" id="pCats"></div><div class="mgrid" id="pGrid"></div></div>' +
      '<aside class="card cart" id="cart"></aside></div><button id="cartbar" class="none" data-act="cartOpen"></button>';
    this.cats(); this.grid(); this.cart();
  },
  cats() {
    const ks = ['Semua'].concat([...new Set(S.menu.map(m => m.kategori))]);
    $('#pCats').innerHTML = ks.map(k => '<button class="tab' + (POS.cat === k ? ' on' : '') + '" data-act="posCat" data-k="' + esc(k) + '">' + esc(k) + '</button>').join('');
  },
  grid() {
    const q = POS.q.toLowerCase(), list = S.menu.filter(m => (POS.cat === 'Semua' || m.kategori === POS.cat) && (!q || (m.nama + ' ' + m.kode).toLowerCase().includes(q)));
    const blok = num(cfg().blokir_stok);
    $('#pGrid').innerHTML = list.length ? list.map(m => {
      const p = porsi(m), habis = !m.tersedia || (blok && p === 0), n = POS.cart.filter(l => l.id_menu === m.id_menu).reduce((a, l) => a + l.qty, 0);
      const bd = !m.tersedia ? '<span class="chip bad bd">Habis</span>' : p === 0 ? '<span class="chip bad bd">Stok 0</span>' : p !== null && p <= 5 ? '<span class="chip warn bd">Sisa ' + p + '</span>' : '';
      return '<button class="mc' + (habis ? ' off' : '') + '" data-act="posAdd" data-id="' + m.id_menu + '"' + (habis ? ' disabled' : '') + '><div class="ph">' + (m.foto_id ? '<img loading="lazy" alt="" src="' + fotoUrl(m.foto_id) + '" onerror="this.replaceWith(document.createTextNode(\'' + emoOf(m.kategori) + '\'))">' : emoOf(m.kategori)) + '</div>' + bd + (n ? '<span class="qb">' + n + '</span>' : '') + '<div class="nm">' + esc(m.nama) + '</div><div class="pr">' + rp(m.harga) + '</div></button>';
    }).join('') : '<div class="empty" style="grid-column:1/-1"><div class="big">🍜</div>' + (S.menu.length ? 'Menu tidak ditemukan.' : 'Belum ada menu. ' + (isOwner() ? 'Tambahkan di halaman Menu & Resep.' : 'Minta Owner menambahkan menu.')) + '</div>';
  },
  cart() {
    const t = POS.cart.reduce((a, l) => a + l.harga * l.qty, 0), dis = POS.diskonMode === 'pct' ? Math.round(t * num(POS.diskon) / 100) : num(POS.diskon), T = calcTotals(t, dis), c = cfg(), n = POS.cart.reduce((a, l) => a + l.qty, 0);
    const meja = Array.from({ length: num(c.jumlah_meja) }, (_, i) => String(i + 1));
    $('#cart').classList.toggle('open', POS.open);
    $('#cart').innerHTML = '<div class="row mb"><h3 style="margin:0">🧾 Pesanan</h3><span class="sp"></span><button class="btn sm gh" data-act="cartClose" style="display:' + (window.innerWidth <= 900 ? 'inline-flex' : 'none') + '">✕ Tutup</button>' + (POS.cart.length ? '<button class="btn sm dng" data-act="posClear">Kosongkan</button>' : '') + '</div>' +
      '<div class="seg mb">' + TIPE.map(x => '<button class="' + (POS.tipe === x ? 'on' : '') + '" data-act="posTipe" data-k="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<div class="row mb">' + (POS.tipe === 'Dine In' ? '<select class="sel" data-ch="posMeja" aria-label="Meja"><option value="">Meja…</option>' + meja.map(x => '<option' + (POS.meja === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>' : '') + '<input class="in" data-in="posPel" placeholder="Nama pelanggan (opsional)" value="' + esc(POS.pel) + '"><button class="btn" data-act="posPelMore" title="Kontak pelanggan">📇</button></div>' +
      '<div class="body">' + (POS.cart.length ? POS.cart.map((l, i) => '<div class="ci"><div class="sp"><div class="nm">' + esc(l.nama) + '</div>' + (l.opsi.length ? '<div class="op">' + esc(l.opsi.map(o => o.n).join(', ')) + '</div>' : '') + (l.catatan ? '<div class="op">“' + esc(l.catatan) + '”</div>' : '') + '<div class="xs muted">' + rp(l.harga) + '</div></div><div class="col" style="align-items:flex-end"><div class="qty"><button data-act="posQty" data-i="' + i + '" data-d="-1" aria-label="Kurang">−</button><span>' + l.qty + '</span><button data-act="posQty" data-i="' + i + '" data-d="1" aria-label="Tambah">+</button></div><b class="sm">' + rp(l.harga * l.qty) + '</b></div></div>').join('') : '<div class="empty" style="padding:24px 8px"><div class="big">🛒</div>Pilih menu untuk memulai pesanan.</div>') + '</div>' +
      '<div class="tot">' + (POS.cart.length ? '<div class="row mb"><span class="sm muted">Diskon</span><input class="in m" style="max-width:110px" data-money data-in="posDis" inputmode="numeric" value="' + (POS.diskon ? rpn(POS.diskon) : '') + '" placeholder="0"><div class="seg" style="min-width:92px"><button class="' + (POS.diskonMode === 'rp' ? 'on' : '') + '" data-act="posDM" data-k="rp">Rp</button><button class="' + (POS.diskonMode === 'pct' ? 'on' : '') + '" data-act="posDM" data-k="pct">%</button></div></div>' : '') +
      '<div class="tr"><span>Subtotal</span><b>' + rp(T.sub) + '</b></div>' + (T.diskon ? '<div class="tr"><span>Diskon</span><b>−' + rp(T.diskon) + '</b></div>' : '') + (T.pajak ? '<div class="tr"><span>Pajak ' + num(c.pajak_persen) + '%</span><b>' + rp(T.pajak) + '</b></div>' : '') + '<div class="tr gt"><span>Total</span><span>' + rp(T.total) + '</span></div></div>' +
      '<div class="row mt"><button class="btn" data-act="posHold"' + (POS.cart.length ? '' : ' disabled') + '>📌 Simpan</button><button class="btn pri lg sp" data-act="posPay"' + (POS.cart.length ? '' : ' disabled') + '>Bayar ' + (T.total ? rp(T.total) : '') + '</button></div>';
    const cb = $('#cartbar'); cb.classList.toggle('none', !POS.cart.length); cb.innerHTML = '<span>🛒 ' + n + ' item</span><span>' + rp(T.total) + ' ›</span>';
  },
  refresh() { if (!$('#pGrid')) return this.render(); this.grid(); },
  totals() { const t = POS.cart.reduce((a, l) => a + l.harga * l.qty, 0), dis = POS.diskonMode === 'pct' ? Math.round(t * num(POS.diskon) / 100) : num(POS.diskon); return calcTotals(t, dis); }
};
INP.posQ = el => { POS.q = el.value; PAGES.pos.grid(); };
INP.posPel = el => { POS.pel = el.value; };
INP.posDis = el => { POS.diskon = mv(el); PAGES.pos.cartKeepFocus(); };
PAGES.pos.cartKeepFocus = function () { const a = document.activeElement, v = a && a.value, pos = a && a.selectionStart; this.cart(); const n = $('[data-in=posDis]'); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } };
CHG.posMeja = el => { POS.meja = el.value; };
ACT.posCat = el => { POS.cat = el.dataset.k; PAGES.pos.cats(); PAGES.pos.grid(); };
ACT.posTipe = el => { POS.tipe = el.dataset.k; if (POS.tipe !== 'Dine In') POS.meja = ''; PAGES.pos.cart(); };
ACT.posDM = el => { POS.diskonMode = el.dataset.k; PAGES.pos.cart(); };
ACT.cartOpen = () => { POS.open = true; PAGES.pos.cart(); };
ACT.cartClose = () => { POS.open = false; PAGES.pos.cart(); };
ACT.posClear = async () => { if (await confirmDlg('Kosongkan semua item pesanan?', { danger: true, ok: 'Kosongkan' })) { resetCart(); } };
function resetCart() { Object.assign(POS, { cart: [], tipe: 'Dine In', meja: '', pel: '', telp: '', email: '', cat2: '', diskon: 0, diskonMode: 'rp', open: false }); PAGES.pos.render(); }
ACT.posQty = el => { const i = +el.dataset.i, l = POS.cart[i]; if (!l) return; l.qty += +el.dataset.d; if (l.qty <= 0) POS.cart.splice(i, 1); PAGES.pos.cart(); PAGES.pos.grid(); };
ACT.posPelMore = () => {
  const m = openModal({ title: 'Kontak pelanggan', body: '<div class="fld"><label>No. HP / WhatsApp</label><input class="in" id="cTelp" inputmode="tel" value="' + esc(POS.telp) + '" placeholder="08xxxxxxxxxx"><div id="cHit" class="xs muted"></div></div><div class="fld"><label>Email (struk digital, opsional)</label><input class="in" id="cMail" inputmode="email" value="' + esc(POS.email) + '"></div><div class="fld"><label>Catatan pesanan</label><input class="in" id="cCat" maxlength="120" value="' + esc(POS.cat2) + '" placeholder="mis. dibungkus terpisah"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="cOk">Simpan</button>' });
  $('#cTelp', m.el).oninput = debounce(async e => { const q = e.target.value; if (q.replace(/\D/g, '').length < 4 || !ONLINE) return; try { const r = await call('customer.find', { q }); $('#cHit', m.el).innerHTML = r.data.map(c => '<a href="#" data-p="' + esc(c.telp) + '" data-n="' + esc(c.nama) + '" data-e="' + esc(c.email) + '">' + esc(c.nama || c.telp) + ' (' + c.telp + ' · ' + c.kunjungan + '×)</a>').join(' · '); } catch (x) {} }, 350);
  m.el.addEventListener('click', e => { const a = e.target.closest('a[data-p]'); if (!a) return; e.preventDefault(); $('#cTelp', m.el).value = a.dataset.p; $('#cMail', m.el).value = a.dataset.e || ''; if (a.dataset.n) POS.pel = a.dataset.n; });
  $('#cOk', m.el).onclick = () => { POS.telp = $('#cTelp', m.el).value.trim(); POS.email = $('#cMail', m.el).value.trim(); POS.cat2 = $('#cCat', m.el).value.trim(); m.close(); PAGES.pos.cart(); };
};

/* tambah menu (dengan opsi/topping bila ada) */
ACT.posAdd = el => {
  const m = menuOf(el.dataset.id); if (!m) return;
  if (!m.opsi.length) { addLine(m, [], '', 1); return; }
  const sel = {}; m.opsi.forEach(g => { sel[g.nama] = []; if (g.wajib && g.pilih !== 'banyak') sel[g.nama] = [g.item[0].nama]; });
  let qty = 1, cat = '';
  const mm = openModal({ title: m.nama, body: '', foot: '' });
  const draw = () => {
    const opsi = []; m.opsi.forEach(g => sel[g.nama].forEach(n => { const i = g.item.find(x => x.nama === n); if (i) opsi.push({ g: g.nama, n: i.nama, h: num(i.harga) }); }));
    const h = unitPrice(m, opsi), miss = m.opsi.find(g => g.wajib && !sel[g.nama].length);
    mm.setBody(m.opsi.map(g => '<div class="optg"><div class="t">' + esc(g.nama) + ' <span class="chip ' + (g.wajib ? 'pri' : '') + '">' + (g.wajib ? 'wajib' : 'opsional') + (g.pilih === 'banyak' ? ' · boleh banyak' : '') + '</span></div>' + g.item.map(i => { const on = sel[g.nama].includes(i.nama); return '<label class="opt' + (on ? ' on' : '') + '"><input type="' + (g.pilih === 'banyak' ? 'checkbox' : 'radio') + '" name="g_' + esc(g.nama) + '" data-g="' + esc(g.nama) + '" data-n="' + esc(i.nama) + '"' + (on ? ' checked' : '') + '><span class="sp">' + esc(i.nama) + '</span><span class="muted sm">' + (num(i.harga) ? '+' + rp(i.harga) : '') + '</span></label>'; }).join('') + '</div>').join('') + '<div class="fld"><label>Catatan</label><input class="in" id="oCat" maxlength="80" placeholder="mis. tanpa sawi" value="' + esc(cat) + '"></div>');
    mm.setFoot('<div class="qty"><button data-q="-1">−</button><span>' + qty + '</span><button data-q="1">+</button></div><button class="btn pri lg sp" id="oOk"' + (miss ? ' disabled' : '') + '>' + (miss ? 'Pilih ' + esc(miss.nama) : 'Tambah · ' + rp(h * qty)) + '</button>');
  };
  draw();
  mm.el.addEventListener('change', e => { const t = e.target; if (!t.dataset.g) return; const g = m.opsi.find(x => x.nama === t.dataset.g); cat = $('#oCat', mm.el) ? $('#oCat', mm.el).value : cat; if (g.pilih === 'banyak') sel[g.nama] = t.checked ? sel[g.nama].concat(t.dataset.n) : sel[g.nama].filter(x => x !== t.dataset.n); else sel[g.nama] = [t.dataset.n]; draw(); });
  mm.el.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (q) { cat = $('#oCat', mm.el).value; qty = Math.max(1, qty + +q.dataset.q); draw(); return; }
    if (e.target.closest('#oOk')) { const opsi = []; m.opsi.forEach(g => sel[g.nama].forEach(n => { const i = g.item.find(x => x.nama === n); if (i) opsi.push({ g: g.nama, n: i.nama, h: num(i.harga) }); })); addLine(m, opsi, $('#oCat', mm.el).value.trim(), qty); mm.close(); }
  });
};
function addLine(m, opsi, catatan, qty) {
  const key = m.id_menu + '|' + opsi.map(o => o.g + ':' + o.n).sort().join(',') + '|' + catatan, ex = POS.cart.find(l => l.key === key);
  if (ex) ex.qty += qty; else POS.cart.push({ key, id_menu: m.id_menu, nama: m.nama, harga: unitPrice(m, opsi), qty, opsi, catatan });
  PAGES.pos.cart(); PAGES.pos.grid(); if (navigator.vibrate) navigator.vibrate(8);
}

/* pesanan tersimpan (hold) */
ACT.posHold = () => { if (!POS.cart.length) return; S.held.push({ id: uid('H'), t: Date.now(), cart: POS.cart, tipe: POS.tipe, meja: POS.meja, pel: POS.pel, telp: POS.telp, email: POS.email, cat2: POS.cat2 }); saveState(); resetCart(); toast('Pesanan disimpan. Buka lewat tombol 📌', 'ok'); };
ACT.heldList = () => {
  const m = openModal({ title: 'Pesanan tersimpan', body: '' });
  const draw = () => m.setBody(S.held.length ? '<div class="list">' + S.held.map(h => '<div class="it"><div class="sp"><b>' + esc(h.pel || (h.meja ? 'Meja ' + h.meja : h.tipe)) + '</b><div class="xs muted">' + h.cart.reduce((a, l) => a + l.qty, 0) + ' item · ' + rp(h.cart.reduce((a, l) => a + l.harga * l.qty, 0)) + ' · ' + jam(nowStr(new Date(h.t))) + '</div></div><button class="btn sm pri" data-hid="' + h.id + '" data-do="open">Buka</button><button class="btn sm dng" data-hid="' + h.id + '" data-do="del">Hapus</button></div>').join('') + '</div>' : '<div class="empty"><div class="big">📌</div>Tidak ada pesanan tersimpan.</div>');
  draw();
  m.el.addEventListener('click', e => { const b = e.target.closest('[data-hid]'); if (!b) return; const h = S.held.find(x => x.id === b.dataset.hid); if (!h) return;
    if (b.dataset.do === 'del') { S.held = S.held.filter(x => x !== h); saveState(); draw(); $('#heldN').textContent = S.held.length; return; }
    if (POS.cart.length) { toast('Selesaikan/simpan pesanan yang sedang dibuat dulu', 'bad'); return; }
    Object.assign(POS, { cart: h.cart, tipe: h.tipe, meja: h.meja, pel: h.pel, telp: h.telp, email: h.email, cat2: h.cat2 }); S.held = S.held.filter(x => x !== h); saveState(); m.close(); PAGES.pos.render(); });
};

/* pembayaran */
function nextNo() { const d = todayStr(); if (S.counter.d !== d) S.counter = { d, n: 0 }; S.counter.n++; return String(S.counter.n).padStart(3, '0'); }
ACT.posPay = () => {
  if (!POS.cart.length) return; const T = PAGES.pos.totals(), own = isOwner(), c = cfg();
  if (!own && T.diskon > Math.round(T.sub * num(c.diskon_maks_kasir) / 100)) { toast('Diskon melebihi batas kasir (' + c.diskon_maks_kasir + '%). Minta Owner.', 'bad'); return; }
  if (num(c.blokir_stok)) { const need = {}; POS.cart.forEach(l => { const u = usageOfItem(l); Object.keys(u).forEach(b => need[b] = (need[b] || 0) + u[b]); }); const kurang = Object.keys(need).map(bahanOf).filter(Boolean).find(b => num(b.stok) + 1e-9 < need[b.id_bahan]); if (kurang) { toast('Stok ' + kurang.nama + ' tidak cukup untuk pesanan ini', 'bad'); return; } }
  let metode = 'Tunai', tunai = 0;
  const m = openModal({ title: 'Pembayaran', body: '', foot: '' });
  const draw = () => {
    const kem = tunai - T.total, quick = [...new Set([T.total, Math.ceil(T.total / 5000) * 5000, Math.ceil(T.total / 10000) * 10000, 50000, 100000].filter(x => x >= T.total))].slice(0, 4);
    m.setBody('<div class="c mb"><div class="muted sm">Total tagihan</div><div style="font-size:34px;font-weight:800;color:var(--primary)">' + rp(T.total) + '</div></div><div class="seg mb">' + ['Tunai', 'QRIS', 'Debit', 'Transfer'].map(x => '<button class="' + (metode === x ? 'on' : '') + '" data-met="' + x + '">' + x + '</button>').join('') + '</div>' +
      (metode === 'Tunai' ? '<div class="fld"><label>Uang diterima</label><input class="in m" id="pTunai" data-money inputmode="numeric" style="font-size:22px;font-weight:700;min-height:54px" value="' + (tunai ? rpn(tunai) : '') + '" placeholder="0"></div><div class="quick mb">' + quick.map(q => '<button class="btn" data-q="' + q + '">' + (q === T.total ? 'Uang pas' : rpn(q)) + '</button>').join('') + '</div><div class="c b" style="font-size:18px;color:' + (kem >= 0 ? 'var(--ok)' : 'var(--bad)') + '">' + (tunai ? (kem >= 0 ? 'Kembalian ' + rp(kem) : 'Kurang ' + rp(-kem)) : '&nbsp;') + '</div>' : '<div class="note c">Pastikan pembayaran ' + metode + ' sudah diterima sebelum konfirmasi.</div>'));
    m.setFoot('<button class="btn" data-x>Batal</button><button class="btn pri lg sp" id="pOk"' + (metode === 'Tunai' && tunai < T.total ? ' disabled' : '') + '>✓ Konfirmasi bayar</button>');
  };
  draw();
  m.el.addEventListener('click', e => { const b = e.target.closest('[data-met]'); if (b) { metode = b.dataset.met; draw(); return; } const q = e.target.closest('[data-q]'); if (q) { tunai = +q.dataset.q; draw(); return; } if (e.target.closest('#pOk')) { if (metode === 'Tunai' && tunai < T.total) return; m.close(); finishPay(T, metode, metode === 'Tunai' ? tunai : T.total); } });
  m.el.addEventListener('input', e => { if (e.target.id === 'pTunai') { tunai = mv(e.target); const kem = tunai - T.total; $('#pOk', m.el).disabled = tunai < T.total; const c = $('.c.b', m.el); if (c) { c.style.color = kem >= 0 ? 'var(--ok)' : 'var(--bad)'; c.textContent = tunai ? (kem >= 0 ? 'Kembalian ' + rp(kem) : 'Kurang ' + rp(-kem)) : ''; } } });
  const fi = $('#pTunai', m.el); if (fi && innerWidth > 900) fi.focus();
};
function finishPay(T, metode, tunai) {
  const id = 'TRX-' + todayStr().replace(/-/g, '').slice(2) + '-' + uid('').slice(1, 11), no = nextNo(), items = POS.cart.map(l => ({ id_menu: l.id_menu, nama: l.nama, qty: l.qty, opsi: l.opsi.map(o => ({ g: o.g, n: o.n })), catatan: l.catatan }));
  const data = { id_transaksi: id, no_pesanan: no, tanggal_waktu: nowStr(), shift_id: S.shift ? S.shift.id_shift : '', tipe: POS.tipe, meja: POS.meja, pelanggan: POS.pel, telp: POS.telp, email: POS.email, catatan: POS.cat2, items, diskon: T.diskon, metode_bayar: metode, tunai };
  const lines = POS.cart.map(l => ({ id_menu: l.id_menu, nama: l.nama, qty: l.qty, harga: l.harga, opsi: l.opsi, catatan: l.catatan, subtotal: l.harga * l.qty, hpp: 0 }));
  const trx = { id_transaksi: id, no_pesanan: no, tanggal_waktu: data.tanggal_waktu, kasir: S.user.username, shift_id: data.shift_id, tipe: POS.tipe, meja: POS.meja, pelanggan: POS.pel, telp: POS.telp, items: lines, subtotal: T.sub, diskon: T.diskon, pajak: T.pajak, total: T.total, metode_bayar: metode, tunai, kembalian: tunai - T.total, hpp: 0, catatan: POS.cat2, status: 'SUKSES', _local: true };
  S.trx.push(trx); enqueue('trx.save', data, 'Pesanan #' + no + ' · ' + rp(T.total));
  resetCart(); successDlg(trx);
}
function successDlg(t) {
  const c = cfg(), pend = Q.some(x => x.data && x.data.id_transaksi === t.id_transaksi);
  const m = openModal({ title: 'Pesanan #' + t.no_pesanan, sticky: true, body: '<div class="big-ok"><div class="ck">✅</div><div class="b" style="font-size:22px">' + rp(t.total) + '</div><div class="muted">' + t.metode_bayar + (num(t.kembalian) ? ' · Kembalian <b>' + rp(t.kembalian) + '</b>' : '') + '</div>' + (pend && !ONLINE ? '<div class="chip warn mt">⏳ Tersimpan di perangkat — terkirim saat online</div>' : '') + '</div><div class="pvwrap">' + receiptHTML(t) + '</div>',
    foot: '<button class="btn" data-act="rcPrint" data-id="' + t.id_transaksi + '">🖨️ Cetak</button>' + (t.telp ? '<button class="btn" data-act="rcWA" data-id="' + t.id_transaksi + '">💬 WhatsApp</button>' : '') + '<button class="btn pri sp" data-x>Pesanan baru</button>' });
}
const trxById = id => S.trx.find(t => t.id_transaksi === id);
ACT.rcPrint = el => { const t = trxById(el.dataset.id); if (t) printHTML(receiptHTML(t)); };
ACT.rcWA = el => { const t = trxById(el.dataset.id); if (t) window.open(waLink(t.telp, receiptText(t)), '_blank', 'noopener'); };

/* ================= RIWAYAT ================= */
const RW = { q: '', st: 'all', met: 'all', rangeRows: null, from: '', to: '' };
function riwayatList() { const own = isOwner(), base = RW.rangeRows || S.trx; return base.filter(t => own || t.kasir === S.user.username); }
PAGES.riwayat = {
  title: 'Riwayat Pesanan', live: true,
  render() {
    const own = isOwner(), today = todayStr();
    $('#pg-riwayat').innerHTML = '<div class="row wrap mb"><input class="in" style="flex:1;min-width:180px" id="rwQ" data-in="rwQ" placeholder="🔍 Cari no. pesanan, meja, pelanggan, menu…" value="' + esc(RW.q) + '"><select class="sel" style="max-width:150px" data-ch="rwSt"><option value="all">Semua status</option><option value="ok"' + (RW.st === 'ok' ? ' selected' : '') + '>Sukses</option><option value="void"' + (RW.st === 'void' ? ' selected' : '') + '>Void</option><option value="pend"' + (RW.st === 'pend' ? ' selected' : '') + '>Belum terkirim</option></select><select class="sel" style="max-width:150px" data-ch="rwMet"><option value="all">Semua bayar</option>' + ['Tunai', 'QRIS', 'Debit', 'Transfer'].map(x => '<option' + (RW.met === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
      (own ? '<div class="row wrap mb"><span class="sm muted">Tanggal lain:</span><input type="date" class="in" style="max-width:160px" id="rwFrom" value="' + (RW.from || today) + '"><span>–</span><input type="date" class="in" style="max-width:160px" id="rwTo" value="' + (RW.to || today) + '"><button class="btn" data-act="rwLoad">Muat</button>' + (RW.rangeRows ? '<button class="btn gh" data-act="rwReset">↩ Hari ini</button>' : '') + '</div>' : '') + '<div id="rwBody"></div>';
    this.body();
  },
  body() {
    const q = RW.q.toLowerCase(), pend = new Set(Q.filter(x => x.action === 'trx.save').map(x => x.data.id_transaksi));
    let list = riwayatList().filter(t => (RW.st === 'all' || (RW.st === 'ok' && t.status !== 'VOID') || (RW.st === 'void' && t.status === 'VOID') || (RW.st === 'pend' && (t._local || pend.has(t.id_transaksi)))) && (RW.met === 'all' || t.metode_bayar === RW.met) &&
      (!q || [t.no_pesanan, t.meja, t.pelanggan, t.telp, t.kasir, ...(t.items || []).map(i => i.nama)].join(' ').toLowerCase().includes(q)));
    list = list.slice().sort((a, b) => String(b.tanggal_waktu).localeCompare(String(a.tanggal_waktu)));
    const ok = list.filter(t => t.status !== 'VOID'), tot = ok.reduce((a, t) => a + num(t.total), 0);
    $('#rwBody').innerHTML = '<div class="row mb sm muted"><span><b>' + ok.length + '</b> pesanan</span><span>·</span><span>Total <b>' + rp(tot) + '</b></span>' + (RW.rangeRows ? '<span class="chip info">' + esc(tglIndo(RW.from)) + ' – ' + esc(tglIndo(RW.to)) + '</span>' : '') + '</div>' +
      (list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>No</th><th>Waktu</th><th>Pesanan</th><th>Tipe</th><th>Bayar</th><th class="r">Total</th></tr></thead><tbody>' + list.slice(0, 300).map(t => '<tr class="click" data-act="trxOpen" data-id="' + esc(t.id_transaksi) + '"><td><b>#' + esc(t.no_pesanan) + '</b></td><td class="sm">' + (RW.rangeRows ? esc(String(t.tanggal_waktu).substr(5, 11)) : jam(t.tanggal_waktu)) + '</td><td class="sm">' + esc((t.items || []).map(i => i.qty + '× ' + i.nama).join(', ')).slice(0, 70) + (t.pelanggan ? '<div class="xs muted">' + esc(t.pelanggan) + '</div>' : '') + '</td><td class="sm">' + esc(t.tipe) + (t.meja ? ' · ' + esc(t.meja) : '') + '</td><td class="sm">' + esc(t.metode_bayar) + '</td><td class="r b">' + rp(t.total) + (t.status === 'VOID' ? ' <span class="chip bad">VOID</span>' : '') + (t._local || pend.has(t.id_transaksi) ? ' <span class="chip warn">⏳</span>' : '') + '</td></tr>').join('') + '</tbody></table></div>' + (list.length > 300 ? '<div class="hint mt">Menampilkan 300 pesanan terbaru dari ' + list.length + '. Persempit pencarian atau lihat Laporan.</div>' : '') : '<div class="empty"><div class="big">🧾</div>Belum ada pesanan' + (RW.q ? ' yang cocok.' : ' hari ini.') + '</div>');
  },
  refresh() { if ($('#rwBody')) this.body(); else this.render(); }
};
INP.rwQ = el => { RW.q = el.value; PAGES.riwayat.body(); };
CHG.rwSt = el => { RW.st = el.value; PAGES.riwayat.body(); }; CHG.rwMet = el => { RW.met = el.value; PAGES.riwayat.body(); };
ACT.rwReset = () => { RW.rangeRows = null; RW.from = RW.to = ''; PAGES.riwayat.render(); };
ACT.rwLoad = async () => {
  const f = $('#rwFrom').value, t = $('#rwTo').value; if (!f || !t || f > t) { toast('Rentang tanggal tidak valid', 'bad'); return; }
  try { const r = await call('trx.range', { from: f, to: t }); RW.rangeRows = r.data.rows; RW.from = f; RW.to = t; PAGES.riwayat.render(); if (r.data.total > r.data.rows.length) toast('Hanya ' + r.data.rows.length + ' pesanan terbaru yang dimuat. Persempit tanggal.', 'bad'); } catch (e) { toast(needNet(e), 'bad'); }
};
ACT.trxOpen = el => {
  const id = el.dataset.id, t = (RW.rangeRows && RW.rangeRows.find(x => x.id_transaksi === id)) || trxById(id); if (!t) return;
  const own = isOwner(), pend = Q.some(x => x.data && x.data.id_transaksi === id);
  openModal({ title: 'Pesanan #' + t.no_pesanan, body: '<div class="row wrap mb"><span class="chip">' + esc(String(t.tanggal_waktu).substr(0, 16)) + '</span><span class="chip">' + esc(t.tipe) + (t.meja ? ' · Meja ' + esc(t.meja) : '') + '</span><span class="chip">Kasir ' + esc(t.kasir) + '</span>' + (t.status === 'VOID' ? '<span class="chip bad">VOID · ' + esc(t.void_alasan || '') + '</span>' : '') + (pend ? '<span class="chip warn">⏳ belum terkirim</span>' : '') + '</div><div class="pvwrap">' + receiptHTML(t) + '</div>' + (own && t.hpp ? '<div class="hint mt">HPP bahan ' + rp(t.hpp) + ' · Laba kotor ' + rp(num(t.total) - num(t.pajak) - num(t.hpp)) + '</div>' : ''),
    foot: (own && t.status !== 'VOID' && !pend ? '<button class="btn dng" data-act="trxVoid" data-id="' + esc(id) + '">Void</button>' : '') + '<span class="sp"></span><button class="btn" data-act="rcPrint" data-id="' + esc(id) + '">🖨️ Cetak</button>' + (t.telp ? '<button class="btn" data-act="rcWA" data-id="' + esc(id) + '">💬</button>' : '') });
};
ACT.trxVoid = el => {
  const id = el.dataset.id, m = openModal({ title: 'Void pesanan', body: '<p class="muted sm">Stok bahan dikembalikan sesuai pemakaian saat dijual. Void tidak bisa dibatalkan.</p><div class="fld"><label>Alasan void <span class="req">*</span></label><input class="in" id="vAl" maxlength="100" placeholder="mis. salah input / pelanggan batal"></div><div id="vErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn dng" id="vOk">Void pesanan</button>' });
  $('#vOk', m.el).onclick = async () => {
    const al = $('#vAl', m.el).value.trim(); if (al.length < 3) { $('#vErr', m.el).textContent = 'Alasan minimal 3 huruf.'; $('#vErr', m.el).classList.remove('hidden'); return; }
    try { const r = await call('trx.void', { id, alasan: al }); const t = trxById(id) || (RW.rangeRows && RW.rangeRows.find(x => x.id_transaksi === id)); if (t) Object.assign(t, r.data.trx); S.vers.Bahan = -1; $$('#mroot .ov').forEach(o => o.remove()); toast('Pesanan di-void, stok dikembalikan', 'ok'); syncSoon(); refresh(); }
    catch (e) { $('#vErr', m.el).textContent = needNet(e); $('#vErr', m.el).classList.remove('hidden'); }
  };
};

/* ================= BIAYA ================= */
PAGES.biaya = {
  title: 'Biaya Operasional', live: true,
  render() {
    const own = isOwner(), today = todayStr(), mon = today.substr(0, 7), pend = new Set(Q.filter(x => x.action === 'expense.save').map(x => x.data.id_biaya));
    const list = S.expenses.filter(e => e.status !== 'BATAL' && (own ? String(e.tanggal).substr(0, 7) === (BY.mon || mon) : true)).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || String(b.dibuat).localeCompare(String(a.dibuat)));
    const byKat = {}; list.forEach(e => byKat[e.kategori] = (byKat[e.kategori] || 0) + num(e.jumlah)); const tot = list.reduce((a, e) => a + num(e.jumlah), 0);
    $('#pg-biaya').innerHTML = '<div class="row wrap mb"><button class="btn pri" data-act="byAdd">＋ Catat biaya</button><span class="sp"></span>' + (own ? '<input type="month" class="in" style="max-width:170px" data-ch="byMon" value="' + (BY.mon || mon) + '">' : '<span class="chip">Hari ini · milik Anda</span>') + '</div>' +
      '<div class="kpis"><div class="kpi pri"><div class="l">Total ' + (own ? 'bulan ini' : 'hari ini') + '</div><div class="v">' + rp(tot) + '</div></div>' + Object.keys(byKat).sort((a, b) => byKat[b] - byKat[a]).slice(0, 3).map(k => '<div class="kpi"><div class="l">' + esc(k) + '</div><div class="v">' + rp(byKat[k]) + '</div></div>').join('') + '</div>' +
      (list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Catatan</th><th>Sumber</th><th class="r">Jumlah</th>' + (own ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map(e => '<tr><td class="sm">' + tglIndo(e.tanggal) + '</td><td>' + esc(e.kategori) + '</td><td class="sm">' + esc(e.catatan || '') + '</td><td><span class="chip ' + (e.sumber === 'Kas Laci' ? 'warn' : '') + '">' + esc(e.sumber) + '</span>' + (pend.has(e.id_biaya) ? ' <span class="chip warn">⏳</span>' : '') + '</td><td class="r b">' + rp(e.jumlah) + '</td>' + (own ? '<td><button class="btn sm gh" data-act="byDel" data-id="' + esc(e.id_biaya) + '" aria-label="Batalkan">🗑</button></td>' : '') + '</tr>').join('') + '</tbody></table></div>' : '<div class="empty"><div class="big">💸</div>Belum ada biaya tercatat.</div>');
  }
};
const BY = { mon: '' };
CHG.byMon = el => { BY.mon = el.value; PAGES.biaya.render(); };
ACT.byAdd = () => {
  const c = cfg(), kats = String(c.kategori_biaya).split(',').map(s => s.trim()).filter(Boolean), kas = !!S.shift;
  const m = openModal({ title: 'Catat biaya', body: '<div class="grid2"><div class="fld"><label>Kategori</label><input class="in" id="bKat" list="bKatL" placeholder="Pilih / ketik"><datalist id="bKatL">' + kats.map(k => '<option>' + esc(k) + '</option>').join('') + '</datalist></div><div class="fld"><label>Tanggal</label><input type="date" class="in" id="bTgl" value="' + todayStr() + '"></div></div><div class="fld"><label>Jumlah (Rp)</label><input class="in m" id="bJml" data-money inputmode="numeric" placeholder="0"></div><div class="fld"><label>Catatan</label><input class="in" id="bCat" maxlength="120"></div>' + (kas ? '<label class="chk"><input type="checkbox" id="bKas" checked> Diambil dari kas laci (mengurangi kas seharusnya)</label>' : '') + '<div id="bErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="bOk">Simpan</button>' });
  $('#bOk', m.el).onclick = () => {
    const kat = $('#bKat', m.el).value.trim(), jml = mv($('#bJml', m.el)), e = $('#bErr', m.el); if (!kat || jml <= 0) { e.textContent = 'Isi kategori dan jumlah.'; e.classList.remove('hidden'); return; }
    const dariKas = kas && $('#bKas', m.el).checked, id = uid('BYA'), rec = { id_biaya: id, tanggal: $('#bTgl', m.el).value || todayStr(), kategori: kat, jumlah: jml, sumber: dariKas ? 'Kas Laci' : 'Owner', shift_id: dariKas ? S.shift.id_shift : '', catatan: $('#bCat', m.el).value.trim(), petugas: S.user.username, dibuat: nowStr(), status: 'AKTIF' };
    S.expenses.push(Object.assign({}, rec, { _local: true })); if (dariKas) S.kasOut.push({ id, shift_id: S.shift.id_shift, jumlah: jml, ket: kat });
    enqueue('expense.save', rec, 'Biaya ' + kat + ' · ' + rp(jml)); m.close(); toast('Biaya dicatat', 'ok'); PAGES.biaya.render();
  };
};
ACT.byDel = async el => { if (!(await confirmDlg('Batalkan biaya ini?', { danger: true, ok: 'Batalkan' }))) return; try { await call('expense.delete', { id_biaya: el.dataset.id }); const e = S.expenses.find(x => x.id_biaya === el.dataset.id); if (e) e.status = 'BATAL'; saveState(); toast('Biaya dibatalkan', 'ok'); PAGES.biaya.render(); syncSoon(); } catch (e) { toast(needNet(e), 'bad'); } };

/* ================= DASHBOARD ================= */
const DB7 = { data: null };
PAGES.dashboard = {
  title: 'Dashboard', live: true,
  render() {
    const own = isOwner(), me = S.user.username, hari = todayStr(), list = S.trx.filter(t => String(t.tanggal_waktu).substr(0, 10) === hari && (own || t.kasir === me)), a = aggLocal(list), al = alerts();
    const top = Object.keys(a.byMenu).map(k => a.byMenu[k]).sort((x, y) => y.qty - x.qty).slice(0, 5), mx = Math.max(1, ...top.map(x => x.qty));
    const jams = Object.keys(a.byJam).sort(), mj = Math.max(1, ...jams.map(j => a.byJam[j]));
    const st = S.shift && S.shift.status === 'BUKA' ? shiftStats() : null;
    $('#pg-dashboard').innerHTML = '<div class="row wrap mb"><div><div class="b" style="font-size:18px">Halo, ' + esc((S.user.nama || me).split(' ')[0]) + ' 👋</div><div class="muted sm">' + tglIndo(hari) + (S.shift ? ' · Shift ' + esc(S.shift.shift) + ' dibuka ' + jam(S.shift.mulai) : '') + '</div></div><span class="sp"></span><button class="btn pri" data-act="nav" data-id="pos">🧾 Buka Kasir</button></div>' +
      '<div class="kpis"><div class="kpi pri"><div class="l">Penjualan hari ini' + (own ? '' : ' (Anda)') + '</div><div class="v">' + rp(a.omzet) + '</div></div><div class="kpi"><div class="l">Pesanan</div><div class="v">' + a.n + '</div></div>' + (own ? '<div class="kpi"><div class="l">HPP bahan</div><div class="v">' + rp(a.hpp) + '</div></div><div class="kpi"><div class="l">Laba kotor</div><div class="v" style="color:var(--ok)">' + rp(a.laba) + '</div></div>' : '') + '<div class="kpi"><div class="l">Rata-rata / pesanan</div><div class="v">' + rp(a.n ? a.omzet / a.n : 0) + '</div></div>' + (st ? '<div class="kpi"><div class="l">Kas laci seharusnya</div><div class="v">' + rp(st.seharusnya) + '</div></div>' : '') + '</div>' +
      '<div class="two"><div class="card"><h3>Penjualan per jam</h3>' + (jams.length ? '<div class="bars">' + jams.map(j => '<div class="bar"><b>' + (a.byJam[j] >= 1000 ? Math.round(a.byJam[j] / 1000) + 'rb' : '') + '</b><i style="height:' + Math.max(3, a.byJam[j] / mj * 100) + '%"></i><span>' + j + '</span></div>').join('') + '</div>' : '<div class="empty" style="padding:24px">Belum ada penjualan hari ini.</div>') + '</div>' +
      '<div class="card"><h3>Menu terlaris hari ini</h3>' + (top.length ? top.map(x => '<div class="hb"><span class="t ell">' + esc(x.nama) + '</span><div class="tr"><i style="width:' + x.qty / mx * 100 + '%"></i></div><span class="n">' + fq(x.qty) + ' porsi</span></div>').join('') : '<div class="empty" style="padding:24px">Belum ada data.</div>') + '</div></div>' +
      '<div class="two">' + (own ? '<div class="card"><h3>Tren 7 hari</h3><div id="d7"><div class="sk" style="height:150px"></div></div></div>' : '') + '<div class="card"><h3>Perlu perhatian <span class="chip ' + (al.length ? 'warn' : 'ok') + '">' + al.length + '</span></h3>' + (al.length ? '<div class="list">' + al.slice(0, 7).map(x => '<div class="it"><span>' + x.ic + '</span><div class="sp sm">' + esc(x.x) + '</div></div>').join('') + '</div>' + (al.length > 7 ? '<div class="hint">+' + (al.length - 7) + ' lainnya — ketuk 🔔</div>' : '') : '<div class="okbox">✅ Stok bahan aman, tidak ada peringatan.</div>') + '</div></div>';
    if (own) this.week();
  },
  async week() {
    const box = () => $('#d7'); const draw = d => { if (!box()) return; const days = Object.keys(d.agg.byDay).sort(), mxv = Math.max(1, ...days.map(x => d.agg.byDay[x].omzet)); box().innerHTML = days.length ? '<div class="bars">' + days.map(x => '<div class="bar"><b>' + Math.round(d.agg.byDay[x].omzet / 1000) + 'rb</b><i style="height:' + Math.max(3, d.agg.byDay[x].omzet / mxv * 100) + '%"></i><span>' + x.substr(8, 2) + '/' + x.substr(5, 2) + '</span></div>').join('') + '</div><div class="hint mt">Total 7 hari: <b>' + rp(d.agg.omzet) + '</b> · laba kotor ' + rp(d.agg.laba) + '</div>' : '<div class="empty" style="padding:24px">Belum ada data.</div>'; };
    if (DB7.data) draw(DB7.data); else { const c = await kv.get('db7'); if (c) { DB7.data = c; draw(c); } }
    if (!ONLINE || (DB7.at && Date.now() - DB7.at < 120000)) return;
    try { const r = await call('report.get', { from: addDaysStr(todayStr(), -6), to: todayStr() }); DB7.data = r.data; DB7.at = Date.now(); kv.set('db7', r.data); draw(r.data); } catch (e) { if (!DB7.data && box()) box().innerHTML = '<div class="muted sm">Tren belum tersedia (offline).</div>'; }
  }
};
