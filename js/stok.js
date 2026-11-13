'use strict';
/* MIE PEDIA · stok — bahan baku, belanja (hutang), waste, opname, supplier, riwayat stok */
const ST = { tab: 'bahan', q: '', f: 'all', lq: '', lj: 'all' };
const SATUAN = ['kg', 'gram', 'liter', 'ml', 'pcs', 'butir', 'bungkus', 'botol', 'pak', 'ikat'];

PAGES.stok = {
  title: 'Stok Bahan', live: true,
  render() {
    const own = isOwner(), tabs = [['bahan', '📦 Bahan']].concat(own ? [['belanja', '🛒 Belanja'], ['supplier', '🏪 Supplier'], ['log', '📜 Riwayat']] : []);
    $('#pg-stok').innerHTML = '<div class="row wrap mb"><button class="btn pri" data-act="blNew">🛒 Catat belanja</button>' + (own ? '<button class="btn" data-act="bhNew">＋ Bahan baru</button><button class="btn" data-act="impBahan">⬆ Impor</button>' : '') + '</div><div class="tabs">' + tabs.map(t => '<button class="tab' + (ST.tab === t[0] ? ' on' : '') + '" data-act="stTab" data-k="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div id="stBody"></div>';
    this.body();
  },
  body() { const f = { bahan: tabBahan, belanja: tabBelanja, supplier: tabSupplier, log: tabLog }[ST.tab] || tabBahan; $('#stBody').innerHTML = f(); },
  refresh() { if (!$('#stBody')) return this.render(); if (ST.tab === 'bahan' && !inputFocused()) this.body(); else if (ST.tab !== 'bahan') this.body(); }
};
ACT.stTab = el => { ST.tab = el.dataset.k; PAGES.stok.render(); };
INP.stQ = el => { ST.q = el.value; const list = $('#bhList'); if (list) list.innerHTML = bhRows(); };
CHG.stF = el => { ST.f = el.value; PAGES.stok.body(); };
INP.lgQ = el => { ST.lq = el.value; $('#lgBody').innerHTML = logRows(); }; CHG.lgJ = el => { ST.lj = el.value; $('#lgBody').innerHTML = logRows(); };

/* ---------- tab bahan ---------- */
function bhRows() {
  const own = isOwner(), q = ST.q.toLowerCase();
  const list = S.bahan.filter(b => (!q || (b.nama + ' ' + (b.kategori || '')).toLowerCase().includes(q)) && (ST.f === 'all' || (ST.f === 'low' && bahanStatus(b) !== 'ok') || (ST.f === 'ed' && expState(b))));
  if (!list.length) return '<div class="empty"><div class="big">📦</div>' + (S.bahan.length ? 'Tidak ada bahan yang cocok.' : 'Belum ada bahan. ' + (own ? 'Tambahkan bahan baku (mie, ayam, sambal, dll.) atau impor dari berkas.' : '')) + '</div>';
  return '<div class="tw"><table class="tbl"><thead><tr><th>Bahan</th><th class="r">Stok</th><th class="r">Min</th>' + (own ? '<th class="r">Harga/sat.</th>' : '') + '<th>Status</th><th></th></tr></thead><tbody>' + list.map(b => {
    const s = bahanStatus(b), e = expState(b), col = s === 'habis' ? 'var(--bad)' : s === 'tipis' ? 'var(--warn)' : 'inherit';
    return '<tr><td><b>' + esc(b.nama) + '</b><div class="xs muted">' + esc(b.kategori || '') + (b.supplier ? ' · ' + esc(b.supplier) : '') + '</div></td><td class="r b" style="color:' + col + '">' + fq(b.stok) + ' <span class="xs muted">' + esc(b.satuan) + '</span></td><td class="r muted">' + (num(b.stok_min) ? fq(b.stok_min) : '—') + '</td>' + (own ? '<td class="r">' + rp(b.harga_beli) + '</td>' : '') + '<td>' + (s === 'habis' ? '<span class="chip bad">Habis</span>' : s === 'tipis' ? '<span class="chip warn">Menipis</span>' : '<span class="chip ok">Aman</span>') + (e ? ' <span class="chip ' + (e === 'lewat' ? 'bad' : 'warn') + '">ED ' + tglIndo(b.exp_terdekat).slice(0, -5) + '</span>' : '') + '</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-act="wsOpen" data-id="' + b.id_bahan + '" title="Catat bahan rusak/terbuang">🗑 Buang</button>' + (own ? ' <button class="btn sm" data-act="opOpen" data-id="' + b.id_bahan + '">Opname</button> <button class="btn sm gh" data-act="bhEdit" data-id="' + b.id_bahan + '" aria-label="Ubah">✎</button>' : '') + '</td></tr>';
  }).join('') + '</tbody></table></div>';
}
function tabBahan() {
  const own = isOwner(), low = S.bahan.filter(b => bahanStatus(b) !== 'ok').length, nilai = S.bahan.reduce((a, b) => a + Math.max(0, num(b.stok)) * num(b.harga_beli), 0);
  return '<div class="kpis"><div class="kpi"><div class="l">Jenis bahan</div><div class="v">' + S.bahan.length + '</div></div><div class="kpi' + (low ? '' : '') + '"><div class="l">Perlu dibeli</div><div class="v" style="color:' + (low ? 'var(--bad)' : 'var(--ok)') + '">' + low + '</div></div>' + (own ? '<div class="kpi"><div class="l">Nilai stok</div><div class="v">' + rp(nilai) + '</div></div>' : '') + '</div>' +
    '<div class="row wrap mb"><input class="in" style="flex:1;min-width:160px" data-in="stQ" placeholder="🔍 Cari bahan…" value="' + esc(ST.q) + '"><select class="sel" style="max-width:170px" data-ch="stF"><option value="all">Semua</option><option value="low"' + (ST.f === 'low' ? ' selected' : '') + '>Menipis / habis</option><option value="ed"' + (ST.f === 'ed' ? ' selected' : '') + '>ED dekat</option></select></div><div id="bhList">' + bhRows() + '</div>';
}

/* ---------- bahan: tambah/ubah ---------- */
ACT.bhNew = () => bahanForm(null); ACT.bhEdit = el => bahanForm(bahanOf(el.dataset.id));
function bahanForm(b) {
  const kats = [...new Set(S.bahan.map(x => x.kategori).filter(Boolean).concat(['Bahan utama', 'Lauk', 'Sayur', 'Bumbu', 'Minuman', 'Kemasan']))];
  const m = openModal({ title: b ? 'Ubah bahan' : 'Bahan baru', body: '<div class="fld"><label>Nama bahan <span class="req">*</span></label><input class="in" id="hNama" maxlength="60" value="' + esc(b ? b.nama : '') + '"></div><div class="grid2"><div class="fld"><label>Satuan <span class="req">*</span></label><input class="in" id="hSat" list="hSatL" value="' + esc(b ? b.satuan : '') + '" placeholder="kg / pcs / liter"><datalist id="hSatL">' + SATUAN.map(s => '<option>' + s + '</option>').join('') + '</datalist></div><div class="fld"><label>Kategori</label><input class="in" id="hKat" list="hKatL" value="' + esc(b ? b.kategori : '') + '"><datalist id="hKatL">' + kats.map(k => '<option>' + esc(k) + '</option>').join('') + '</datalist></div></div><div class="grid2"><div class="fld"><label>Stok minimum (peringatan)</label><input class="in m" id="hMin" inputmode="decimal" value="' + (b ? fq(b.stok_min) : '') + '"></div><div class="fld"><label>Harga beli / satuan (Rp)</label><input class="in m" id="hHrg" data-money inputmode="numeric" value="' + (b && num(b.harga_beli) ? rpn(b.harga_beli) : '') + '"></div></div>' + (b ? '<div class="hint">Stok saat ini <b>' + fq(b.stok) + ' ' + esc(b.satuan) + '</b>. Ubah stok lewat Belanja / Opname agar tercatat.</div>' : '<div class="fld"><label>Stok awal</label><input class="in m" id="hAwal" inputmode="decimal" placeholder="0"></div>') + '<div class="fld mt"><label>Supplier utama</label><input class="in" id="hSup" list="hSupL" value="' + esc(b ? b.supplier : '') + '"><datalist id="hSupL">' + S.suppliers.map(s => '<option>' + esc(s.nama) + '</option>').join('') + '</datalist></div><div id="hErr" class="err hidden"></div>',
    foot: (b ? '<button class="btn dng" id="hDel">Hapus</button><span class="sp"></span>' : '') + '<button class="btn" data-x>Batal</button><button class="btn pri" id="hOk">Simpan</button>' });
  const err = t => { const e = $('#hErr', m.el); e.textContent = t; e.classList.remove('hidden'); }, dec = id => num(String($(id, m.el).value).replace(',', '.'));
  $('#hOk', m.el).onclick = async () => {
    if (!$('#hNama', m.el).value.trim() || !$('#hSat', m.el).value.trim()) return err('Nama dan satuan wajib diisi.');
    try { await call('bahan.save', { id_bahan: b ? b.id_bahan : '', nama: $('#hNama', m.el).value, satuan: $('#hSat', m.el).value, kategori: $('#hKat', m.el).value, stok_min: dec('#hMin'), harga_beli: mv($('#hHrg', m.el)), supplier: $('#hSup', m.el).value, stok_awal: b ? 0 : dec('#hAwal') }); S.vers.Bahan = -1; m.close(); toast('Bahan tersimpan', 'ok'); await syncNow(); refresh(); } catch (e) { err(needNet(e)); }
  };
  if (b) $('#hDel', m.el).onclick = async () => { if (!(await confirmDlg('Hapus bahan “' + b.nama + '”?', { danger: true, ok: 'Hapus' }))) return; try { await call('bahan.delete', { id_bahan: b.id_bahan }); S.vers.Bahan = -1; m.close(); toast('Bahan dihapus', 'ok'); await syncNow(); refresh(); } catch (e) { err(needNet(e)); } };
}

/* ---------- waste & opname (bisa offline) ---------- */
ACT.wsOpen = el => {
  const b = bahanOf(el.dataset.id); if (!b) return;
  const m = openModal({ title: 'Bahan rusak / terbuang', body: '<div class="note mb">' + esc(b.nama) + ' · stok sistem <b>' + fq(b.stok) + ' ' + esc(b.satuan) + '</b></div><div class="fld"><label>Jumlah (' + esc(b.satuan) + ')</label><input class="in m" id="wQ" inputmode="decimal" placeholder="0"></div><div class="fld"><label>Alasan</label><select class="sel" id="wAl">' + ['Rusak / basi', 'Kedaluwarsa', 'Tumpah / jatuh', 'Salah masak', 'Dikonsumsi sendiri', 'Lainnya'].map(x => '<option>' + x + '</option>').join('') + '</select></div><div class="fld"><label>Catatan</label><input class="in" id="wCat" maxlength="80"></div><div id="wErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="wOk">Catat</button>' });
  $('#wOk', m.el).onclick = () => {
    const q = num(String($('#wQ', m.el).value).replace(',', '.')); if (q <= 0) { $('#wErr', m.el).textContent = 'Isi jumlah lebih dari 0.'; $('#wErr', m.el).classList.remove('hidden'); return; }
    enqueue('stock.ops', { opId: uid('OP'), ops: [{ type: 'WASTE', id_bahan: b.id_bahan, qty: q, alasan: $('#wAl', m.el).value, catatan: $('#wCat', m.el).value }] }, 'Buang ' + fq(q) + ' ' + b.satuan + ' ' + b.nama); m.close(); toast('Tercatat', 'ok'); refresh();
  };
};
ACT.opOpen = el => {
  const b = bahanOf(el.dataset.id); if (!b) return;
  const m = openModal({ title: 'Stok opname', body: '<div class="note mb">' + esc(b.nama) + ' · stok sistem <b>' + fq(b.stok) + ' ' + esc(b.satuan) + '</b></div><div class="fld"><label>Stok fisik hasil hitung (' + esc(b.satuan) + ')</label><input class="in m" id="oF" inputmode="decimal" placeholder="0"><div id="oSel" class="hint"></div></div><div class="fld"><label>Alasan selisih</label><input class="in" id="oAl" maxlength="80" placeholder="mis. hitung bulanan"></div><div id="oErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="oOk">Terapkan</button>' });
  $('#oF', m.el).oninput = e => { const v = String(e.target.value).replace(',', '.'), s = round3(num(v) - num(b.stok)); $('#oSel', m.el).innerHTML = v === '' ? '' : s === 0 ? '✓ Sesuai' : '<b style="color:' + (s < 0 ? 'var(--bad)' : 'var(--ok)') + '">Selisih ' + (s > 0 ? '+' : '') + fq(s) + ' ' + esc(b.satuan) + '</b>'; };
  $('#oOk', m.el).onclick = () => { const v = $('#oF', m.el).value; if (v === '') { $('#oErr', m.el).textContent = 'Isi stok fisik.'; $('#oErr', m.el).classList.remove('hidden'); return; } enqueue('stock.ops', { opId: uid('OP'), ops: [{ type: 'OPNAME', id_bahan: b.id_bahan, fisik: num(String(v).replace(',', '.')), alasan: $('#oAl', m.el).value }] }, 'Opname ' + b.nama); m.close(); toast('Opname diterapkan', 'ok'); refresh(); };
};

/* ---------- belanja ---------- */
ACT.blNew = () => {
  const own = isOwner(), rows = [{ b: '', q: '', h: '', e: '' }];
  const m = openModal({ title: 'Catat belanja bahan', wide: true, noFocus: true, body: '', foot: '' });
  let meta = { sup: '', nota: '', tgl: todayStr(), met: 'Tunai', jt: addDaysStr(todayStr(), 14), kas: !!S.shift };
  const draw = () => {
    const tot = rows.reduce((a, r) => a + num(String(r.q).replace(',', '.')) * num(r.h), 0);
    m.setBody('<div class="grid2"><div class="fld"><label>Supplier / toko</label><input class="in" data-m="sup" list="blSupL" value="' + esc(meta.sup) + '" placeholder="mis. Pasar / Toko Mie Jaya"><datalist id="blSupL">' + S.suppliers.map(s => '<option>' + esc(s.nama) + '</option>').join('') + '</datalist></div><div class="fld"><label>No. nota</label><input class="in" data-m="nota" value="' + esc(meta.nota) + '" placeholder="opsional"></div></div><div class="grid3"><div class="fld"><label>Tanggal</label><input type="date" class="in" data-m="tgl" value="' + meta.tgl + '"></div><div class="fld"><label>Pembayaran</label><select class="sel" data-m="met">' + ['Tunai', 'Transfer', 'Hutang'].map(x => '<option' + (meta.met === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' + (meta.met === 'Hutang' ? '<div class="fld"><label>Jatuh tempo</label><input type="date" class="in" data-m="jt" value="' + meta.jt + '"></div>' : '<div></div>') + '</div>' + (S.shift && meta.met === 'Tunai' ? '<label class="chk mb"><input type="checkbox" data-m="kas"' + (meta.kas ? ' checked' : '') + '> Dibayar dari kas laci</label>' : '') +
      '<div class="lbl mb">Bahan dibeli</div>' + rows.map((r, i) => '<div class="ed-row"><select class="sel" style="flex:2;min-width:120px" data-r="' + i + '.b"><option value="">— pilih bahan —</option>' + S.bahan.map(b => '<option value="' + b.id_bahan + '"' + (b.id_bahan === r.b ? ' selected' : '') + '>' + esc(b.nama) + ' (' + esc(b.satuan) + ')</option>').join('') + '</select><input class="in m" style="flex:1;max-width:86px" data-r="' + i + '.q" inputmode="decimal" placeholder="jml" value="' + esc(r.q) + '"><input class="in m" style="flex:1;max-width:110px" data-r="' + i + '.h" data-money inputmode="numeric" placeholder="harga/sat." value="' + (r.h ? rpn(r.h) : '') + '"><button class="ibtn" data-rd="' + i + '" aria-label="Hapus">✕</button></div>' + (r.b ? '<div class="row xs muted" style="margin:-2px 0 8px 4px"><span>ED (opsional):</span><input type="date" class="in" style="max-width:150px;min-height:32px" data-r="' + i + '.e" value="' + (r.e || '') + '"><span class="sp"></span><b>' + rp(num(String(r.q).replace(',', '.')) * num(r.h)) + '</b></div>' : '')).join('') + '<button class="btn sm" id="blAdd">＋ Tambah baris</button><div class="row mt"><span class="sp"></span><span class="muted">Total</span><b style="font-size:20px">' + rp(tot) + '</b></div><div id="blErr" class="err hidden"></div>');
    m.setFoot('<button class="btn" data-x>Batal</button><button class="btn pri" id="blOk">Simpan belanja</button>');
  };
  draw();
  m.el.addEventListener('input', e => { const t = e.target; if (t.dataset.m) meta[t.dataset.m] = t.type === 'checkbox' ? t.checked : t.value; if (t.dataset.r) { const [i, k] = t.dataset.r.split('.'); rows[+i][k] = k === 'h' ? mv(t) : t.value; if (k === 'q' || k === 'h') softTotal(); } });
  function softTotal() { const tot = rows.reduce((a, r) => a + num(String(r.q).replace(',', '.')) * num(r.h), 0), b = $$('.row.mt b', m.el)[0]; if (b) b.textContent = rp(tot); }
  m.el.addEventListener('change', e => { const t = e.target; if (t.dataset.m) { meta[t.dataset.m] = t.type === 'checkbox' ? t.checked : t.value; if (t.dataset.m === 'met') draw(); } if (t.dataset.r) { const [i, k] = t.dataset.r.split('.'); rows[+i][k] = k === 'h' ? mv(t) : t.value; if (k === 'b') { const b = bahanOf(t.value); if (b && own && !rows[+i].h) rows[+i].h = num(b.harga_beli); draw(); } } });
  m.el.addEventListener('click', e => {
    if (e.target.closest('#blAdd')) { rows.push({ b: '', q: '', h: '', e: '' }); draw(); return; }
    const d = e.target.closest('[data-rd]'); if (d) { rows.splice(+d.dataset.rd, 1); if (!rows.length) rows.push({ b: '', q: '', h: '', e: '' }); draw(); return; }
    if (!e.target.closest('#blOk')) return;
    const items = rows.filter(r => r.b || r.q || r.h), er = t => { const x = $('#blErr', m.el); x.textContent = t; x.classList.remove('hidden'); };
    if (!items.length) return er('Isi minimal satu bahan.'); if (items.some(r => !r.b || num(String(r.q).replace(',', '.')) <= 0)) return er('Lengkapi bahan dan jumlah di setiap baris.');
    const dariKas = S.shift && meta.met === 'Tunai' && meta.kas, id = uid('BLJ'), total = items.reduce((a, r) => a + num(String(r.q).replace(',', '.')) * num(r.h), 0);
    const rec = { id_belanja: id, no_nota: meta.nota.trim(), supplier: meta.sup.trim(), tgl: meta.tgl, metode_bayar: meta.met, sumber: dariKas ? 'Kas Laci' : 'Owner', shift_id: dariKas ? S.shift.id_shift : '', jatuh_tempo: meta.met === 'Hutang' ? meta.jt : '', items: items.map(r => ({ id_bahan: r.b, qty: num(String(r.q).replace(',', '.')), harga: num(r.h), exp: r.e || '' })) };
    if (dariKas) S.kasOut.push({ id, shift_id: S.shift.id_shift, jumlah: Math.round(total), ket: 'Belanja ' + (meta.sup || '') });
    enqueue('purchase.save', rec, 'Belanja ' + (meta.sup || 'bahan') + ' · ' + rp(total)); m.close(); toast('Belanja dicatat, stok bertambah', 'ok'); refresh();
  });
};
function tabBelanja() {
  const list = S.purchases.slice().sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat))), hut = list.filter(p => p.status === 'BELUM LUNAS'), th = hut.reduce((a, p) => a + num(p.total) - num(p.dibayar), 0);
  return '<div class="kpis"><div class="kpi"><div class="l">Hutang supplier</div><div class="v" style="color:' + (th ? 'var(--warn)' : 'inherit') + '">' + rp(th) + '</div></div><div class="kpi"><div class="l">Nota belum lunas</div><div class="v">' + hut.length + '</div></div></div>' +
    (list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Tanggal</th><th>Supplier / nota</th><th>Bayar</th><th class="r">Total</th><th>Status</th></tr></thead><tbody>' + list.slice(0, 100).map(p => '<tr class="click" data-act="blOpen" data-id="' + esc(p.id_belanja) + '"><td class="sm">' + tglIndo(p.tgl) + '</td><td><b>' + esc(p.supplier || '—') + '</b><div class="xs muted">' + esc(p.no_nota || 'tanpa nota') + ' · ' + (p.items || []).length + ' bahan</div></td><td class="sm">' + esc(p.metode_bayar) + '</td><td class="r b">' + rp(p.total) + '</td><td>' + (p.status === 'LUNAS' ? '<span class="chip ok">Lunas</span>' : '<span class="chip warn">Sisa ' + rp(num(p.total) - num(p.dibayar)) + '</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty"><div class="big">🛒</div>Belum ada belanja tercatat.</div>');
}
ACT.blOpen = el => {
  const p = S.purchases.find(x => x.id_belanja === el.dataset.id); if (!p) return; const sisa = num(p.total) - num(p.dibayar);
  const m = openModal({ title: 'Nota belanja', body: '<div class="row wrap mb"><span class="chip">' + tglIndo(p.tgl) + '</span><span class="chip">' + esc(p.supplier || '—') + '</span><span class="chip">' + esc(p.no_nota || 'tanpa nota') + '</span><span class="chip ' + (p.status === 'LUNAS' ? 'ok' : 'warn') + '">' + esc(p.status) + '</span>' + (p.jatuh_tempo ? '<span class="chip">JT ' + tglIndo(p.jatuh_tempo) + '</span>' : '') + '</div><div class="tw"><table class="tbl">' + (p.items || []).map(i => '<tr><td>' + esc(i.nama) + '</td><td class="r">' + fq(i.qty) + ' ' + esc(i.satuan) + '</td><td class="r">' + rp(i.harga) + '</td><td class="r b">' + rp(i.subtotal) + '</td></tr>').join('') + '<tr><td colspan="3" class="b">Total</td><td class="r b">' + rp(p.total) + '</td></tr><tr><td colspan="3">Dibayar</td><td class="r">' + rp(p.dibayar) + '</td></tr></table></div>' + (sisa > 0 ? '<div class="fld mt"><label>Bayar hutang (Rp)</label><input class="in m" id="pyJ" data-money inputmode="numeric" value="' + rpn(sisa) + '"></div><div id="pyErr" class="err hidden"></div>' : ''), foot: '<button class="btn" data-x>Tutup</button>' + (sisa > 0 ? '<button class="btn pri" id="pyOk">Catat pembayaran</button>' : '') });
  if (sisa > 0) $('#pyOk', m.el).onclick = async () => { try { await call('purchase.pay', { id_belanja: p.id_belanja, jumlah: mv($('#pyJ', m.el)) }); S.vers.Purchases = -1; m.close(); toast('Pembayaran dicatat', 'ok'); await syncNow(); refresh(); } catch (e) { $('#pyErr', m.el).textContent = needNet(e); $('#pyErr', m.el).classList.remove('hidden'); } };
};

/* ---------- supplier ---------- */
function tabSupplier() {
  return '<div class="row mb"><button class="btn" data-act="spForm" data-id="">＋ Supplier</button></div>' + (S.suppliers.length ? '<div class="card" style="padding:4px 14px"><div class="list">' + S.suppliers.map(s => '<div class="it"><div class="sp"><b>' + esc(s.nama) + '</b><div class="xs muted">' + esc(s.telp || '') + (s.alamat ? ' · ' + esc(s.alamat) : '') + '</div></div>' + (s.telp ? '<a class="btn sm" href="' + waLink(s.telp, 'Halo ' + s.nama + ', ') + '" target="_blank" rel="noopener">💬</a>' : '') + '<button class="btn sm" data-act="spForm" data-id="' + s.id_supplier + '">Ubah</button></div>').join('') + '</div></div>' : '<div class="empty"><div class="big">🏪</div>Belum ada supplier. Supplier bersifat opsional — nama toko bisa diketik langsung saat belanja.</div>');
}
ACT.spForm = el => {
  const s = S.suppliers.find(x => x.id_supplier === el.dataset.id) || null;
  const m = openModal({ title: s ? 'Ubah supplier' : 'Supplier baru', body: '<div class="fld"><label>Nama</label><input class="in" id="sNama" value="' + esc(s ? s.nama : '') + '"></div><div class="fld"><label>No. HP / WA</label><input class="in" id="sTelp" inputmode="tel" value="' + esc(s ? s.telp : '') + '"></div><div class="fld"><label>Alamat</label><input class="in" id="sAl" value="' + esc(s ? s.alamat : '') + '"></div><div id="sErr" class="err hidden"></div>', foot: (s ? '<button class="btn dng" id="sDel">Hapus</button><span class="sp"></span>' : '') + '<button class="btn" data-x>Batal</button><button class="btn pri" id="sOk">Simpan</button>' });
  const go = async del => { try { await call('supplier.save', { id_supplier: s ? s.id_supplier : '', nama: s ? (del ? s.nama : $('#sNama', m.el).value) : $('#sNama', m.el).value, telp: $('#sTelp', m.el).value, alamat: $('#sAl', m.el).value, aktif: !del }); S.vers.Suppliers = -1; m.close(); toast('Supplier tersimpan', 'ok'); await syncNow(); refresh(); } catch (e) { $('#sErr', m.el).textContent = needNet(e); $('#sErr', m.el).classList.remove('hidden'); } };
  $('#sOk', m.el).onclick = () => go(false); if (s) $('#sDel', m.el).onclick = () => go(true);
};

/* ---------- riwayat stok ---------- */
const JN = { JUAL: ['Terjual', 'info'], VOID: ['Void', ''], BELI: ['Belanja', 'ok'], WASTE: ['Buang', 'bad'], OPNAME: ['Opname', 'warn'], AWAL: ['Stok awal', ''] };
function logRows() {
  const q = ST.lq.toLowerCase(), list = S.logs.slice().reverse().filter(l => (ST.lj === 'all' || l.jenis === ST.lj) && (!q || (l.nama_bahan + ' ' + l.catatan + ' ' + l.petugas).toLowerCase().includes(q))).slice(0, 200);
  return list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Waktu</th><th>Bahan</th><th>Jenis</th><th class="r">Ubah</th><th class="r">Sisa</th><th>Oleh</th></tr></thead><tbody>' + list.map(l => '<tr><td class="sm">' + esc(String(l.tanggal_waktu).substr(5, 11)) + '</td><td><b>' + esc(l.nama_bahan) + '</b><div class="xs muted">' + esc(l.catatan || '') + '</div></td><td><span class="chip ' + ((JN[l.jenis] || [])[1] || '') + '">' + esc((JN[l.jenis] || [l.jenis])[0]) + '</span></td><td class="r b" style="color:' + (num(l.perubahan) < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + (num(l.perubahan) > 0 ? '+' : '') + fq(l.perubahan) + '</td><td class="r">' + fq(l.sisa) + '</td><td class="sm">' + esc(l.petugas) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty"><div class="big">📜</div>Belum ada riwayat.</div>';
}
function tabLog() { return '<div class="row wrap mb"><input class="in" style="flex:1;min-width:160px" data-in="lgQ" placeholder="🔍 Cari bahan / catatan…" value="' + esc(ST.lq) + '"><select class="sel" style="max-width:160px" data-ch="lgJ"><option value="all">Semua jenis</option>' + Object.keys(JN).map(k => '<option value="' + k + '"' + (ST.lj === k ? ' selected' : '') + '>' + JN[k][0] + '</option>').join('') + '</select></div><div id="lgBody">' + logRows() + '</div><div class="hint mt">Menampilkan 200 catatan terbaru dari 300 terakhir yang disinkronkan.</div>'; }
