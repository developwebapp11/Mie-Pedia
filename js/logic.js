'use strict';
/* MIE PEDIA · logic — resep, stok, harga, total, agregasi, struk (dipakai kasir, offline & online) */
const round3 = v => Math.round(v * 1000) / 1000;
const menuOf = id => S.menu.find(m => m.id_menu === id), bahanOf = id => S.bahan.find(b => b.id_bahan === id);

function usageOfItem(it) {
  const m = menuOf(it.id_menu), u = {}; if (!m) return u;
  const add = (b, q) => { if (b && q > 0) u[b] = round3((u[b] || 0) + q * it.qty); };
  m.resep.forEach(r => add(r.b, num(r.q)));
  (it.opsi || []).forEach(o => { const g = m.opsi.find(x => x.nama === o.g), i = g && g.item.find(x => x.nama === o.n); if (i) (i.bahan || []).forEach(r => add(r.b, num(r.q))); });
  return u;
}
function localDeduct(items, sign) { items.forEach(it => { const u = usageOfItem(it); Object.keys(u).forEach(b => { const bh = bahanOf(b); if (bh) bh.stok = round3(num(bh.stok) - sign * u[b]); }); }); }
const unitPrice = (m, opsi) => num(m.harga) + (opsi || []).reduce((a, o) => a + num(o.h), 0);
function hppMenu(m) { return Math.round(m.resep.reduce((a, r) => { const b = bahanOf(r.b); return a + num(r.q) * (b ? num(b.harga_beli) : 0); }, 0)); }
// Sisa porsi dari stok bahan (null = menu tanpa resep)
function porsi(m) {
  if (!m.resep.length) return null; let min = Infinity;
  m.resep.forEach(r => { const b = bahanOf(r.b); if (!b || num(r.q) <= 0) return; min = Math.min(min, Math.floor((num(b.stok) + 1e-9) / num(r.q))); });
  return min === Infinity ? null : Math.max(0, min);
}
function calcTotals(sub, diskon) {
  diskon = Math.min(Math.max(0, Math.round(num(diskon))), sub);
  const pajak = Math.round((sub - diskon) * num(cfg().pajak_persen) / 100);
  return { sub, diskon, pajak, total: sub - diskon + pajak };
}
function bahanStatus(b) { const s = num(b.stok), mn = num(b.stok_min); return s <= 0 ? 'habis' : (mn > 0 && s <= mn) ? 'tipis' : 'ok'; }
function expState(b) { if (!b.exp_terdekat || num(b.stok) <= 0) return ''; const t = todayStr(); return b.exp_terdekat < t ? 'lewat' : b.exp_terdekat <= addDaysStr(t, 7) ? 'dekat' : ''; }
function alerts() {
  const a = [];
  S.bahan.forEach(b => { const s = bahanStatus(b); if (s === 'habis') a.push({ t: 'bad', ic: '⛔', x: b.nama + ' habis' }); else if (s === 'tipis') a.push({ t: 'warn', ic: '📉', x: b.nama + ' menipis (' + fq(b.stok) + ' ' + b.satuan + ')' }); const e = expState(b); if (e) a.push({ t: e === 'lewat' ? 'bad' : 'warn', ic: '⏳', x: b.nama + (e === 'lewat' ? ' kedaluwarsa ' : ' hampir ED ') + tglIndo(b.exp_terdekat) }); });
  if (isOwner()) S.purchases.forEach(p => { if (p.status === 'BELUM LUNAS' && p.jatuh_tempo && p.jatuh_tempo <= addDaysStr(todayStr(), 3)) a.push({ t: 'warn', ic: '💳', x: 'Hutang ' + (p.supplier || 'supplier') + ' jatuh tempo ' + tglIndo(p.jatuh_tempo) + ' (' + rp(num(p.total) - num(p.dibayar)) + ')' }); });
  const rv = Q.filter(x => x.state === 'REVIEW').length; if (rv) a.unshift({ t: 'bad', ic: '📤', x: rv + ' data gagal terkirim — periksa antrean' });
  return a;
}
function aggLocal(list) {
  const a = { n: 0, omzet: 0, hpp: 0, total: 0, diskon: 0, byMetode: {}, byJam: {}, byMenu: {}, byTipe: {} };
  list.forEach(t => {
    if (t.status === 'VOID') return; const om = num(t.total) - num(t.pajak);
    a.n++; a.omzet += om; a.total += num(t.total); a.hpp += num(t.hpp); a.diskon += num(t.diskon);
    a.byMetode[t.metode_bayar] = (a.byMetode[t.metode_bayar] || 0) + num(t.total);
    const j = String(t.tanggal_waktu).substr(11, 2); a.byJam[j] = (a.byJam[j] || 0) + om; a.byTipe[t.tipe] = (a.byTipe[t.tipe] || 0) + om;
    (t.items || []).forEach(l => { const r = a.byMenu[l.id_menu] = a.byMenu[l.id_menu] || { nama: l.nama, qty: 0, omzet: 0, hpp: 0 }; r.qty += num(l.qty); r.omzet += num(l.subtotal); r.hpp += num(l.hpp); });
  });
  a.laba = a.omzet - a.hpp; return a;
}
/* ---------- struk ---------- */
function rcptLines(t) {
  return (t.items || []).map(l => ({ a: l.qty + 'x ' + l.nama, b: rpn(l.subtotal), o: (l.opsi || []).map(o => o.n).join(', '), c: l.catatan }));
}
function receiptHTML(t) {
  const c = cfg(), w = c.kertas === '80' ? '72mm' : '48mm';
  const ln = (a, b, bold) => '<div class="ln"' + (bold ? ' style="font-weight:700"' : '') + '><span>' + esc(a) + '</span><span>' + esc(b) + '</span></div>';
  let h = '<div class="rcpt" style="width:' + w + '"><div class="ct"><b style="font-size:14px">' + esc(c.namaUsaha) + '</b><br>' + esc(c.alamat) + (c.telp ? '<br>Telp ' + esc(c.telp) : '') + '</div><hr>' +
    ln('No', '#' + (t.no_pesanan || '-')) + ln('Tgl', String(t.tanggal_waktu).substr(0, 16)) + ln('Kasir', t.kasir || '') + ln('Tipe', t.tipe + (t.meja ? ' · Meja ' + t.meja : '')) + (t.pelanggan ? ln('Pelanggan', t.pelanggan) : '') + '<hr>';
  rcptLines(t).forEach(l => { h += ln(l.a, l.b) + (l.o ? '<div style="padding-left:8px;font-size:11px">' + esc(l.o) + '</div>' : '') + (l.c ? '<div style="padding-left:8px;font-size:11px">“' + esc(l.c) + '”</div>' : ''); });
  h += '<hr>' + ln('Subtotal', rpn(t.subtotal)); if (num(t.diskon)) h += ln('Diskon', '-' + rpn(t.diskon)); if (num(t.pajak)) h += ln('Pajak', rpn(t.pajak));
  h += ln('TOTAL', rpn(t.total), true) + ln('Bayar ' + t.metode_bayar, rpn(t.tunai)); if (num(t.kembalian)) h += ln('Kembali', rpn(t.kembalian));
  return h + '<hr><div class="ct">' + esc(c.footer) + '</div>' + (t.status === 'VOID' ? '<div class="ct"><b>*** VOID ***</b></div>' : '') + '</div>';
}
function receiptText(t) {
  const c = cfg(); let s = '*' + c.namaUsaha + '*\nPesanan #' + (t.no_pesanan || '-') + ' · ' + String(t.tanggal_waktu).substr(0, 16) + '\n\n';
  rcptLines(t).forEach(l => { s += l.a + (l.o ? ' (' + l.o + ')' : '') + ' — ' + l.b + '\n'; });
  s += '\nTotal: *' + rp(t.total) + '* (' + t.metode_bayar + ')\n' + c.footer; return s;
}
function printHTML(html) { const r = $('#print-root'); r.innerHTML = html; setTimeout(() => { window.print(); setTimeout(() => { r.innerHTML = ''; }, 800); }, 60); }
function waLink(telp, text) { let n = String(telp || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '62' + n.slice(1); return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text); }
