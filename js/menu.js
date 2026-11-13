'use strict';
/* MIE PEDIA · menu — daftar menu, editor menu + resep (HPP otomatis) + opsi/topping + foto */
const MN = { q: '', cat: 'Semua' };
let ED = null;

PAGES.menu = {
  title: 'Menu & Resep', live: true,
  render() {
    const q = MN.q.toLowerCase(), cats = ['Semua'].concat([...new Set(S.menu.map(m => m.kategori))]);
    const list = S.menu.filter(m => (MN.cat === 'Semua' || m.kategori === MN.cat) && (!q || m.nama.toLowerCase().includes(q)));
    $('#pg-menu').innerHTML = '<div class="row wrap mb"><input class="in" style="flex:1;min-width:160px" data-in="mnQ" placeholder="🔍 Cari menu…" value="' + esc(MN.q) + '"><button class="btn pri" data-act="mnNew">＋ Menu baru</button><button class="btn" data-act="impMenu">⬆ Impor</button></div>' +
      '<div class="tabs">' + cats.map(k => '<button class="tab' + (MN.cat === k ? ' on' : '') + '" data-act="mnCat" data-k="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div>' +
      (list.length ? '<div class="card" style="padding:4px 14px"><div class="list">' + list.map(m => {
        const h = hppMenu(m), mg = m.harga - h, pct = m.harga ? Math.round(mg / m.harga * 100) : 0;
        return '<div class="it" style="cursor:pointer" data-act="mnEdit" data-id="' + m.id_menu + '"><div class="pv" style="width:52px;height:52px;font-size:24px;border-radius:12px">' + (m.foto_id ? '<img loading="lazy" alt="" src="' + fotoUrl(m.foto_id, 120) + '" onerror="this.replaceWith(document.createTextNode(\'' + emoOf(m.kategori) + '\'))">' : emoOf(m.kategori)) + '</div><div class="sp" style="min-width:0"><div class="b ell">' + esc(m.nama) + '</div><div class="xs muted">' + esc(m.kategori) + (m.opsi.length ? ' · ' + m.opsi.length + ' grup opsi' : '') + '</div><div class="xs">' + (m.resep.length ? 'HPP ' + rp(h) + ' · <b style="color:' + (pct >= 40 ? 'var(--ok)' : pct >= 20 ? 'var(--warn)' : 'var(--bad)') + '">margin ' + pct + '%</b>' : '<span class="chip warn">Belum ada resep</span>') + '</div></div><div class="col" style="align-items:flex-end"><b>' + rp(m.harga) + '</b><button class="btn sm ' + (m.tersedia ? '' : 'dng') + '" data-act="mnTog" data-id="' + m.id_menu + '">' + (m.tersedia ? 'Tersedia' : 'Habis') + '</button></div></div>';
      }).join('') + '</div></div>' : '<div class="empty"><div class="big">📖</div>' + (S.menu.length ? 'Menu tidak ditemukan.' : 'Belum ada menu. Tekan “Menu baru” atau “Impor” dari aplikasi lama.') + '</div>');
  }
};
INP.mnQ = el => { MN.q = el.value; PAGES.menu.render(); const i = $('[data-in=mnQ]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
ACT.mnCat = el => { MN.cat = el.dataset.k; PAGES.menu.render(); };
ACT.mnTog = e0 => { const m = menuOf(e0.dataset.id); if (!m) return; const v = !m.tersedia; m.tersedia = v; enqueue('menu.tersedia', { id_menu: m.id_menu, tersedia: v }, (v ? 'Tersedia: ' : 'Habis: ') + m.nama); event && event.stopPropagation(); PAGES.menu.render(); };
ACT.mnNew = () => openMenuEditor(null);
ACT.mnEdit = el => { if (event && event.target.closest('[data-act=mnTog]')) return; openMenuEditor(menuOf(el.dataset.id)); };

/* ---------- editor ---------- */
function openMenuEditor(m) {
  ED = m ? JSON.parse(JSON.stringify(m)) : { id_menu: '', nama: '', kategori: '', harga: '', kode: '', catatan: '', tersedia: true, foto_id: '', opsi: [], resep: [] };
  ED._foto = null; ED._isNew = !m;
  const mo = openModal({ title: m ? 'Ubah menu' : 'Menu baru', wide: true, noFocus: true, body: '', foot: '' });
  const draw = () => {
    const bhn = S.bahan, opt = id => '<option value="">— pilih bahan —</option>' + bhn.map(b => '<option value="' + b.id_bahan + '"' + (b.id_bahan === id ? ' selected' : '') + '>' + esc(b.nama) + ' (' + esc(b.satuan) + ')</option>').join('');
    const satuan = id => { const b = bahanOf(id); return b ? b.satuan : ''; };
    const hpp = ED.resep.reduce((a, r) => { const b = bahanOf(r.b); return a + num(String(r.q).replace(',', '.')) * (b ? num(b.harga_beli) : 0); }, 0), harga = num(ED.harga), mg = harga - hpp;
    const kats = [...new Set(String(cfg().kategori_menu).split(',').map(s => s.trim()).filter(Boolean).concat(S.menu.map(x => x.kategori)))];
    const fotoSrc = ED._foto ? ED._foto.url : fotoUrl(ED.foto_id, 200);
    mo.setBody('<div class="row gap3 mb" style="align-items:flex-start"><div class="pv" id="edPv">' + (fotoSrc ? '<img alt="" src="' + fotoSrc + '">' : emoOf(ED.kategori)) + '</div><div class="sp"><label class="btn sm" style="cursor:pointer">📷 ' + (fotoSrc ? 'Ganti foto' : 'Tambah foto') + '<input type="file" accept="image/*" id="edFile" hidden></label><div class="hint mt">Foto dikompres otomatis (±40 KB) dan disimpan di Drive.</div></div></div>' +
      '<div class="grid2"><div class="fld"><label>Nama menu <span class="req">*</span></label><input class="in" data-b="nama" maxlength="80" value="' + esc(ED.nama) + '"></div><div class="fld"><label>Kategori</label><input class="in" data-b="kategori" list="edKat" value="' + esc(ED.kategori) + '"><datalist id="edKat">' + kats.map(k => '<option>' + esc(k) + '</option>').join('') + '</datalist></div></div>' +
      '<div class="grid3"><div class="fld"><label>Harga jual (Rp) <span class="req">*</span></label><input class="in m" data-b="harga" data-t="m" data-money inputmode="numeric" value="' + (ED.harga !== '' ? rpn(ED.harga) : '') + '"></div><div class="fld"><label>Kode (opsional)</label><input class="in" data-b="kode" maxlength="20" value="' + esc(ED.kode) + '"></div><div class="fld"><label>Status</label><label class="chk"><input type="checkbox" data-b="tersedia" data-t="c"' + (ED.tersedia ? ' checked' : '') + '> Tersedia dijual</label></div></div>' +
      '<div class="ed-sec"><div class="row mb"><b>🥣 Resep per porsi</b><span class="sp"></span><span class="chip ' + (!ED.resep.length ? 'warn' : '') + '">HPP ' + rp(hpp) + '</span>' + (harga ? '<span class="chip ' + (mg / harga >= .4 ? 'ok' : mg / harga >= .2 ? 'warn' : 'bad') + '">Margin ' + Math.round(mg / harga * 100) + '% · ' + rp(mg) + '</span>' : '') + '</div>' +
      (ED.resep.map((r, i) => '<div class="ed-row"><select class="sel" style="flex:2" data-b="resep.' + i + '.b" data-t="s">' + opt(r.b) + '</select><input class="in m" style="flex:1;max-width:110px" data-b="resep.' + i + '.q" data-t="d" inputmode="decimal" placeholder="jumlah" value="' + esc(r.q) + '"><span class="xs muted" style="width:44px">' + esc(satuan(r.b)) + '</span><button class="ibtn" data-ed="rdel" data-i="' + i + '" aria-label="Hapus">✕</button></div>').join('') || '<div class="hint mb">Tanpa resep, stok bahan tidak berkurang saat menu terjual.</div>') +
      (bhn.length ? '<button class="btn sm" data-ed="radd">＋ Bahan</button>' : '<div class="note">Tambahkan bahan di halaman Stok Bahan dulu agar bisa dipakai di resep.</div>') + '</div>' +
      '<div class="ed-sec"><div class="row mb"><b>🌶️ Opsi & topping</b><span class="sp"></span><span class="xs muted">mis. Level Pedas, Topping</span></div>' +
      ED.opsi.map((g, gi) => '<div class="ed-sec" style="background:var(--surface)"><div class="ed-row"><input class="in" style="flex:2" data-b="opsi.' + gi + '.nama" placeholder="Nama grup" value="' + esc(g.nama) + '"><select class="sel" style="flex:1;max-width:130px" data-b="opsi.' + gi + '.pilih" data-t="s"><option value="satu"' + (g.pilih !== 'banyak' ? ' selected' : '') + '>Pilih satu</option><option value="banyak"' + (g.pilih === 'banyak' ? ' selected' : '') + '>Boleh banyak</option></select><label class="chk" style="white-space:nowrap"><input type="checkbox" data-b="opsi.' + gi + '.wajib" data-t="c"' + (g.wajib ? ' checked' : '') + '> wajib</label><button class="ibtn" data-ed="gdel" data-g="' + gi + '" aria-label="Hapus grup">🗑</button></div>' +
        g.item.map((it, ii) => '<div class="ed-row" style="padding-left:10px"><input class="in" style="flex:2" data-b="opsi.' + gi + '.item.' + ii + '.nama" placeholder="Pilihan (mis. Level 2)" value="' + esc(it.nama) + '"><input class="in m" style="flex:1;max-width:110px" data-b="opsi.' + gi + '.item.' + ii + '.harga" data-t="m" data-money inputmode="numeric" placeholder="+Rp" value="' + (num(it.harga) ? rpn(it.harga) : '') + '"><button class="btn sm' + ((it.bahan || []).length ? ' pri' : '') + '" data-ed="ibhn" data-g="' + gi + '" data-i="' + ii + '" title="Bahan terpakai">🥣' + ((it.bahan || []).length ? ' ' + it.bahan.length : '') + '</button><button class="ibtn" data-ed="idel" data-g="' + gi + '" data-i="' + ii + '" aria-label="Hapus">✕</button></div>' +
          (it._open ? '<div style="padding-left:18px">' + (it.bahan || []).map((r, ri) => '<div class="ed-row"><select class="sel" style="flex:2" data-b="opsi.' + gi + '.item.' + ii + '.bahan.' + ri + '.b" data-t="s">' + opt(r.b) + '</select><input class="in m" style="flex:1;max-width:100px" data-b="opsi.' + gi + '.item.' + ii + '.bahan.' + ri + '.q" data-t="d" inputmode="decimal" placeholder="jml" value="' + esc(r.q) + '"><span class="xs muted" style="width:40px">' + esc(satuan(r.b)) + '</span><button class="ibtn" data-ed="ibdel" data-g="' + gi + '" data-i="' + ii + '" data-r="' + ri + '">✕</button></div>').join('') + '<button class="btn sm" data-ed="ibadd" data-g="' + gi + '" data-i="' + ii + '">＋ Bahan untuk pilihan ini</button></div>' : '')).join('') +
        '<button class="btn sm" data-ed="iadd" data-g="' + gi + '">＋ Pilihan</button></div>').join('') + '<button class="btn sm" data-ed="gadd">＋ Grup opsi</button></div>' +
      '<div class="fld"><label>Catatan internal</label><input class="in" data-b="catatan" maxlength="120" value="' + esc(ED.catatan) + '"></div><div id="edErr" class="err hidden"></div>');
    mo.setFoot((ED._isNew ? '' : '<button class="btn dng" data-ed="del">Hapus</button><span class="sp"></span>') + '<button class="btn" data-x>Batal</button><button class="btn pri" data-ed="save">Simpan menu</button>');
  };
  draw();
  const typed = el => { const p = el.dataset.b; if (!p) return; const t = el.dataset.t; let v = el.value; if (t === 'm') v = mv(el); else if (t === 'c') v = el.checked; setPath(ED, p, v); };
  mo.el.addEventListener('input', e => { typed(e.target); if (e.target.dataset.b === 'harga' || /\.q$/.test(e.target.dataset.b || '')) refreshHpp(); });
  mo.el.addEventListener('change', e => { typed(e.target); if (e.target.dataset.t === 's' || e.target.dataset.b === 'kategori') { const a = document.activeElement; draw(); } });
  function refreshHpp() {
    const hpp = ED.resep.reduce((a, r) => { const b = bahanOf(r.b); return a + num(String(r.q).replace(',', '.')) * (b ? num(b.harga_beli) : 0); }, 0), h = num(ED.harga), chips = $$('.ed-sec:first-of-type .chip', mo.el);
    const sec = $$('.ed-sec', mo.el)[0]; if (!sec) return; const c = $$('.chip', sec); if (c[0]) c[0].textContent = 'HPP ' + rp(hpp); if (c[1] && h) { c[1].textContent = 'Margin ' + Math.round((h - hpp) / h * 100) + '% · ' + rp(h - hpp); }
  }
  mo.el.addEventListener('change', async e => {
    if (e.target.id !== 'edFile' || !e.target.files[0]) return;
    try { ED._foto = await compressImage(e.target.files[0], 480, .72); draw(); } catch (x) { toast(x.message, 'bad'); }
  });
  mo.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-ed]'); if (!b) return; const a = b.dataset.ed, g = +b.dataset.g, i = +b.dataset.i, r = +b.dataset.r;
    if (a === 'radd') { ED.resep.push({ b: '', q: '' }); draw(); }
    else if (a === 'rdel') { ED.resep.splice(i, 1); draw(); }
    else if (a === 'gadd') { ED.opsi.push({ nama: '', pilih: 'satu', wajib: false, item: [{ nama: '', harga: 0, bahan: [] }] }); draw(); }
    else if (a === 'gdel') { ED.opsi.splice(g, 1); draw(); }
    else if (a === 'iadd') { ED.opsi[g].item.push({ nama: '', harga: 0, bahan: [] }); draw(); }
    else if (a === 'idel') { ED.opsi[g].item.splice(i, 1); draw(); }
    else if (a === 'ibhn') { const it = ED.opsi[g].item[i]; it._open = !it._open; if (it._open && !(it.bahan || []).length) it.bahan = [{ b: '', q: '' }]; draw(); }
    else if (a === 'ibadd') { const it = ED.opsi[g].item[i]; (it.bahan = it.bahan || []).push({ b: '', q: '' }); draw(); }
    else if (a === 'ibdel') { ED.opsi[g].item[i].bahan.splice(r, 1); draw(); }
    else if (a === 'del') { if (!(await confirmDlg('Hapus menu “' + ED.nama + '”? Riwayat penjualan tetap aman.', { danger: true, ok: 'Hapus' }))) return; try { await call('menu.delete', { id_menu: ED.id_menu }); S.vers.Menu = -1; mo.close(); toast('Menu dihapus', 'ok'); await syncNow(); } catch (x) { toast(needNet(x), 'bad'); } }
    else if (a === 'save') await saveMenu(mo);
  });
}
async function saveMenu(mo) {
  const err = m => { const e = $('#edErr', mo.el); e.textContent = m; e.classList.remove('hidden'); e.scrollIntoView({ block: 'center' }); };
  if (!ED.nama.trim()) return err('Nama menu wajib diisi.'); if (ED.harga === '' || num(ED.harga) < 0) return err('Isi harga jual.');
  const q = v => Math.round(num(String(v).replace(',', '.')) * 1000) / 1000, bad = [];
  const resep = ED.resep.filter(r => r.b || r.q).map(r => ({ b: r.b, q: q(r.q) })); if (resep.some(r => !r.b || r.q <= 0)) return err('Lengkapi bahan & jumlah di resep (atau hapus barisnya).');
  const opsi = ED.opsi.map(g => ({ nama: g.nama.trim(), pilih: g.pilih, wajib: !!g.wajib, item: g.item.filter(i => i.nama.trim()).map(i => ({ nama: i.nama.trim(), harga: num(i.harga), bahan: (i.bahan || []).filter(r => r.b || r.q).map(r => ({ b: r.b, q: q(r.q) })) })) }));
  if (opsi.some(g => !g.nama || !g.item.length)) return err('Setiap grup opsi perlu nama dan minimal satu pilihan.');
  if (opsi.some(g => g.item.some(i => i.bahan.some(r => !r.b || r.q <= 0)))) return err('Lengkapi bahan pada pilihan opsi (atau hapus barisnya).');
  const btn = $('[data-ed=save]', mo.el); btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    const r = await call('menu.save', { id_menu: ED.id_menu, nama: ED.nama, kategori: ED.kategori, harga: num(ED.harga), kode: ED.kode, catatan: ED.catatan, tersedia: ED.tersedia, urut: ED.urut || 0, resep, opsi });
    if (ED._foto) { try { await call('menu.foto', { id_menu: r.data.id_menu, mime: ED._foto.mime, data: ED._foto.data }, { timeout: 60000 }); } catch (x) { toast('Menu tersimpan, tetapi foto gagal: ' + needNet(x), 'bad'); } }
    S.vers.Menu = -1; mo.close(); toast('Menu tersimpan', 'ok'); await syncNow(); refresh();
  } catch (x) { err(needNet(x)); btn.disabled = false; btn.textContent = 'Simpan menu'; }
}
