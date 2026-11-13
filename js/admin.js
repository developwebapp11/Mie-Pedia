'use strict';
/* MIE PEDIA · admin — Pengaturan (usaha, pengguna, email), impor Excel/CSV, backup & pemulihan */
const AD = { tab: 'usaha', email: null, backup: null };
PAGES.pengaturan = {
  title: 'Pengaturan', live: false,
  render() {
    const T = [['usaha', '🏪 Usaha'], ['user', '👥 Pengguna'], ['email', '✉️ Laporan Email'], ['data', '💾 Data & Backup'], ['app', '📱 Perangkat']];
    $('#pg-pengaturan').innerHTML = '<div class="tabs">' + T.map(t => '<button class="tab' + (AD.tab === t[0] ? ' on' : '') + '" data-act="adTab" data-k="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div id="adBody"></div>';
    ({ usaha: tabUsaha, user: tabUser, email: tabEmail, data: tabData, app: tabApp }[AD.tab])();
  }
};
ACT.adTab = el => { AD.tab = el.dataset.k; PAGES.pengaturan.render(); };
const adErr = (id, m) => { const e = $(id); if (e) { e.textContent = m; e.classList.remove('hidden'); } };

/* ---------- usaha ---------- */
function tabUsaha() {
  const c = cfg();
  $('#adBody').innerHTML = '<div class="card"><h3>Profil usaha & struk</h3><div class="grid2"><div class="fld"><label>Nama usaha</label><input class="in" id="uNama" value="' + esc(c.namaUsaha) + '"></div><div class="fld"><label>No. telepon</label><input class="in" id="uTelp" value="' + esc(c.telp) + '"></div></div><div class="fld"><label>Alamat (di struk)</label><input class="in" id="uAl" value="' + esc(c.alamat) + '"></div><div class="fld"><label>Pesan di bawah struk</label><input class="in" id="uFoot" value="' + esc(c.footer) + '"></div><div class="grid3"><div class="fld"><label>Pajak (%)</label><input class="in m" id="uPjk" inputmode="decimal" value="' + num(c.pajak_persen) + '"><span class="hint">0 = tanpa pajak. Mis. PB1 restoran 10.</span></div><div class="fld"><label>Lebar kertas struk</label><select class="sel" id="uKrt"><option value="58"' + (c.kertas === '58' ? ' selected' : '') + '>58 mm</option><option value="80"' + (c.kertas === '80' ? ' selected' : '') + '>80 mm</option></select></div><div class="fld"><label>Jumlah meja</label><input class="in m" id="uMeja" inputmode="numeric" value="' + num(c.jumlah_meja) + '"></div></div></div>' +
    '<div class="card mt"><h3>Aturan kasir</h3><div class="grid2"><div class="fld"><label>Batas diskon kasir (% dari subtotal)</label><input class="in m" id="uDis" inputmode="numeric" value="' + num(c.diskon_maks_kasir) + '"><span class="hint">Lebih dari ini harus oleh Owner.</span></div><div class="fld"><label>Daftar shift (pisahkan koma)</label><input class="in" id="uShift" value="' + esc(c.shift_list) + '"></div></div><label class="chk"><input type="checkbox" id="uBlok"' + (num(c.blokir_stok) ? ' checked' : '') + '> Blokir penjualan bila stok bahan tidak cukup <span class="muted xs">(default mati: pesanan tetap bisa dibuat, stok bisa minus lalu dikoreksi lewat opname)</span></label></div>' +
    '<div class="card mt"><h3>Daftar pilihan</h3><div class="fld"><label>Kategori menu</label><input class="in" id="uKm" value="' + esc(c.kategori_menu) + '"></div><div class="fld"><label>Kategori biaya</label><input class="in" id="uKb" value="' + esc(c.kategori_biaya) + '"></div></div><div id="uErr" class="err hidden mt"></div><div class="row mt"><button class="btn pri lg" data-act="uSave">Simpan pengaturan</button></div>';
}
ACT.uSave = async () => {
  const d = { namaUsaha: $('#uNama').value, telp: $('#uTelp').value, alamat: $('#uAl').value, footer: $('#uFoot').value, pajak_persen: num(String($('#uPjk').value).replace(',', '.')), kertas: $('#uKrt').value, jumlah_meja: num($('#uMeja').value), diskon_maks_kasir: num($('#uDis').value), shift_list: $('#uShift').value, blokir_stok: $('#uBlok').checked ? 1 : 0, kategori_menu: $('#uKm').value, kategori_biaya: $('#uKb').value };
  try { await call('config.save', d); S.vers.AppConfig = -1; toast('Pengaturan tersimpan', 'ok'); await syncNow(); $('#sSia').textContent = cfg().namaUsaha; } catch (e) { adErr('#uErr', needNet(e)); }
};

/* ---------- pengguna ---------- */
function tabUser() {
  $('#adBody').innerHTML = '<div class="row mb"><button class="btn pri" data-act="usForm" data-id="">＋ Pengguna</button></div><div class="card" style="padding:4px 14px"><div class="list">' + S.users.map(u => '<div class="it"><div class="av" style="background:var(--primary-soft);color:var(--primary)">' + esc((u.nama || u.username).slice(0, 2).toUpperCase()) + '</div><div class="sp"><b>' + esc(u.nama) + '</b><div class="xs muted">' + esc(u.username) + '</div></div><span class="chip ' + (u.role === 'Owner' ? 'pri' : '') + '">' + esc(u.role) + '</span>' + (u.aktif ? '' : '<span class="chip bad">nonaktif</span>') + '<button class="btn sm" data-act="usForm" data-id="' + esc(u.username) + '">Ubah</button></div>').join('') + '</div></div><div class="hint mt"><b>Owner</b>: semua fitur. <b>Kasir</b>: kasir, riwayat pesanan sendiri, catat belanja/biaya/bahan terbuang; tidak bisa void, ubah menu/harga, opname, atau lihat laporan & harga beli.</div>';
}
ACT.usForm = el => {
  const u = S.users.find(x => x.username === el.dataset.id) || null;
  const m = openModal({ title: u ? 'Ubah pengguna' : 'Pengguna baru', body: '<div class="fld"><label>ID karyawan (untuk login)</label><input class="in" id="usU" autocapitalize="off" value="' + esc(u ? u.username : '') + '"' + (u ? ' disabled' : '') + ' placeholder="mis. kasir2"></div><div class="fld"><label>Nama lengkap</label><input class="in" id="usN" value="' + esc(u ? u.nama : '') + '"></div><div class="grid2"><div class="fld"><label>Peran</label><select class="sel" id="usR"><option' + (u && u.role === 'Kasir' || !u ? ' selected' : '') + '>Kasir</option><option' + (u && u.role === 'Owner' ? ' selected' : '') + '>Owner</option></select></div><div class="fld"><label>' + (u ? 'Reset PIN (kosongkan = tetap)' : 'PIN awal (min. 6)') + '</label><input class="in" id="usP" type="password" autocomplete="new-password"></div></div>' + (u ? '<label class="chk"><input type="checkbox" id="usA"' + (u.aktif ? ' checked' : '') + '> Akun aktif</label>' : '') + '<div class="hint">Pengguna wajib mengganti PIN saat login pertama / setelah reset.</div><div id="usErr" class="err hidden mt"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="usOk">Simpan</button>' });
  $('#usOk', m.el).onclick = async () => {
    try { await call('user.save', { username: u ? u.username : $('#usU', m.el).value, nama_lengkap: $('#usN', m.el).value, role: $('#usR', m.el).value, pin: $('#usP', m.el).value, aktif: u ? $('#usA', m.el).checked : true }); S.vers.Users = -1; m.close(); toast('Pengguna tersimpan', 'ok'); await syncNow(); PAGES.pengaturan.render(); } catch (e) { adErr('#usErr', needNet(e)); }
  };
};

/* ---------- email ---------- */
async function tabEmail() {
  $('#adBody').innerHTML = '<div class="sk" style="height:200px"></div>';
  try { AD.email = (await call('email.get', {})).data; } catch (e) { $('#adBody').innerHTML = '<div class="empty"><div class="big">📡</div>' + esc(needNet(e)) + '</div>'; return; }
  const e = AD.email;
  $('#adBody').innerHTML = '<div class="card"><h3>Laporan otomatis ke email Owner</h3><div class="fld"><label>Email Owner</label><input class="in" id="eMail" type="email" inputmode="email" value="' + esc(e.email) + '" placeholder="owner@gmail.com"></div>' +
    [['eShift', e.shift, 'Tutup shift', 'setiap kasir menutup shift: omzet, rekonsiliasi kas & selisih, menu terlaris'], ['eHari', e.harian, 'Rekap harian', 'tiap hari pada jam yang dipilih: penjualan, laba, biaya, stok menipis'], ['eMing', e.minggu, 'Rekap mingguan', 'Senin 07.00 (Senin–Minggu lalu) + tren dibanding minggu sebelumnya'], ['eBul', e.bulan, 'Rekap bulanan', 'tanggal 1, 07.00 (bulan lalu)'], ['eStruk', e.struk, 'Struk email ke pelanggan', 'bila pelanggan mengisi email saat memesan (memakai kuota email harian)']].map(x => '<label class="chk"><input type="checkbox" id="' + x[0] + '"' + (x[1] ? ' checked' : '') + '><span><b>' + x[2] + '</b> <span class="muted xs">— ' + x[3] + '</span></span></label>').join('') +
    '<div class="fld mt" style="max-width:220px"><label>Jam kirim rekap harian</label><select class="sel" id="eJam">' + Array.from({ length: 24 }, (_, i) => '<option value="' + i + '"' + (e.jam === i ? ' selected' : '') + '>' + pad(i) + ':00</option>').join('') + '</select></div><div class="hint">Terakhir terkirim: ' + esc(e.terakhir || '—') + ' · sisa kuota email hari ini: ' + e.kuota + '</div><div id="eErr" class="err hidden mt"></div><div class="row wrap mt"><button class="btn pri" data-act="eSave">Simpan</button><button class="btn" data-act="eTest">Kirim email uji</button><button class="btn" data-act="eRekap" data-k="harian">Kirim rekap hari ini</button><button class="btn" data-act="eRekap" data-k="mingguan">Rekap mingguan</button><button class="btn" data-act="eRekap" data-k="bulanan">Rekap bulanan</button></div></div><div class="note mt">Pertama kali: jalankan fungsi <b>aktifkanLaporanEmail</b> di editor Apps Script (memberi izin kirim email & memasang jadwal), lalu Deploy → New version. Cek folder Spam bila email tidak masuk.</div>';
}
ACT.eSave = async () => {
  try { await call('email.save', { email: $('#eMail').value.trim(), shift: $('#eShift').checked, harian: $('#eHari').checked, minggu: $('#eMing').checked, bulan: $('#eBul').checked, struk: $('#eStruk').checked, jam: +$('#eJam').value }); toast('Pengaturan email tersimpan', 'ok'); } catch (e) { adErr('#eErr', needNet(e)); }
};
ACT.eTest = async () => { try { await ACT.eSave(); const r = await call('email.test', {}, { timeout: 60000 }); toast(r.message, 'ok'); } catch (e) { adErr('#eErr', needNet(e) + ' (sudah menjalankan aktifkanLaporanEmail?)'); } };
ACT.eRekap = async el => { try { const r = await call('email.kirim', { jenis: el.dataset.k }, { timeout: 60000 }); toast(r.message, 'ok'); } catch (e) { adErr('#eErr', needNet(e)); } };

/* ---------- data & backup ---------- */
async function tabData() {
  $('#adBody').innerHTML = '<div class="card"><h3>Impor dari aplikasi kasir lama / Excel</h3><p class="muted sm" style="margin-top:0">Pindahkan daftar menu dan bahan dari file Excel (.xlsx) atau CSV. Selalu ada simulasi sebelum data masuk; impor ulang tidak membuat data ganda (kunci: nama).</p><div class="row wrap"><button class="btn" data-act="impMenu">⬆ Impor menu</button><button class="btn" data-act="impBahan">⬆ Impor bahan & stok awal</button></div></div><div class="card mt" id="bkCard"><h3>Backup & pemulihan</h3><div class="sk" style="height:60px"></div></div>';
  try { AD.backup = (await call('backup.info', {})).data; } catch (e) { $('#bkCard').innerHTML = '<h3>Backup & pemulihan</h3><div class="muted">' + esc(needNet(e)) + '</div>'; return; }
  const b = AD.backup;
  $('#bkCard').innerHTML = '<h3>Backup & pemulihan</h3><div class="' + (b.ada ? 'okbox' : 'note') + ' mb">' + (b.ada ? '✓ Backup terakhir: <b>' + esc(b.waktu) + '</b> (otomatis tiap malam 02.00, selalu 1 salinan terbaru)' : 'Belum ada backup. Tekan “Backup sekarang”.') + '</div><div class="row wrap"><button class="btn pri" data-act="bkNow">💾 Backup sekarang</button><button class="btn" data-act="bkXlsx">📗 Ekspor Excel ke Drive</button><a class="btn" href="' + esc(b.folderUrl) + '" target="_blank" rel="noopener">📁 Buka folder Drive</a></div><div class="hint mt">Jangan bagikan file database ke siapa pun (berisi hash PIN).</div><hr style="border:0;border-top:1px solid var(--border);margin:16px 0"><div class="row wrap"><div class="sp"><b>Pulihkan dari backup</b><div class="xs muted">Mengganti SEMUA data dengan isi backup terakhir. Gunakan hanya bila data rusak.</div></div><button class="btn dng" data-act="bkRestore">Pulihkan…</button></div>';
}
ACT.bkNow = async el => { el.disabled = true; try { const r = await call('backup.now', {}, { timeout: 90000 }); toast('Backup selesai', 'ok'); tabData(); } catch (e) { toast(needNet(e), 'bad'); el.disabled = false; } };
ACT.bkXlsx = async el => { el.disabled = true; try { const r = await call('backup.xlsx', {}, { timeout: 120000 }); toast('Tersimpan: ' + r.data.nama, 'ok'); window.open(r.data.url, '_blank', 'noopener'); } catch (e) { toast(needNet(e), 'bad'); } el.disabled = false; };
ACT.bkRestore = () => {
  const m = openModal({ title: 'Pulihkan dari backup', body: '<div class="err">Semua data saat ini (menu, bahan, transaksi, pengguna) akan diganti dengan isi backup. Tindakan ini tidak bisa dibatalkan.</div><div class="fld"><label>Ketik PULIHKAN untuk melanjutkan</label><input class="in" id="rsK" autocomplete="off"></div><div id="rsErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn dng" id="rsOk">Pulihkan</button>' });
  $('#rsOk', m.el).onclick = async () => { try { await call('backup.restore', { konfirmasi: $('#rsK', m.el).value }, { timeout: 120000 }); S.vers = {}; S.trxRow = 0; S.logRow = 0; m.close(); toast('Data dipulihkan. Memuat ulang…', 'ok'); await syncNow(); setTimeout(() => location.reload(), 900); } catch (e) { adErr('#rsErr', needNet(e)); } };
};

/* ---------- impor ---------- */
const IMP = {
  menu: { judul: 'Impor menu', act: 'import.menu', cols: { nama: ['nama', 'menu', 'nama menu', 'produk', 'nama produk', 'item'], harga: ['harga', 'harga jual', 'price', 'harga_jual'], kategori: ['kategori', 'category', 'jenis'], kode: ['kode', 'sku', 'barcode', 'code'] }, tpl: [['nama', 'harga', 'kategori', 'kode'], ['Mie Ayam', '14000', 'Mie', ''], ['Es Teh Manis', '4000', 'Minuman', '']] },
  bahan: { judul: 'Impor bahan & stok awal', act: 'import.bahan', cols: { nama: ['nama', 'bahan', 'nama bahan', 'item', 'barang'], satuan: ['satuan', 'unit', 'sat'], stok: ['stok', 'stock', 'qty', 'jumlah'], stok_min: ['stok_min', 'stok minimum', 'min', 'minimum', 'stok min'], harga_beli: ['harga_beli', 'harga beli', 'harga', 'hpp', 'cost'], kategori: ['kategori', 'jenis'], supplier: ['supplier', 'pemasok', 'toko'] }, tpl: [['nama', 'satuan', 'stok', 'stok_min', 'harga_beli', 'kategori', 'supplier'], ['Mie basah', 'kg', '20', '5', '14000', 'Bahan utama', ''], ['Sawi hijau', 'kg', '5', '2', '12000', 'Sayur', '']] }
};
ACT.impMenu = () => importDlg('menu'); ACT.impBahan = () => importDlg('bahan');
function loadXLSX() { return window.XLSX ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Pustaka Excel tidak bisa dimuat (butuh internet). Simpan berkas sebagai CSV.')); document.head.appendChild(s); }); }
async function readFileRows(f) {
  if (/\.xlsx?$/i.test(f.name)) { await loadXLSX(); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).filter(r => r.some(c => String(c).trim() !== '')); }
  return parseCSV(await f.text());
}
function mapRows(raw, cols) {
  const head = raw[0].map(h => String(h).trim().toLowerCase()), idx = {}; Object.keys(cols).forEach(k => { idx[k] = head.findIndex(h => cols[k].includes(h)); });
  return raw.slice(1).map(r => { const o = {}; Object.keys(idx).forEach(k => { o[k] = idx[k] >= 0 ? String(r[idx[k]] == null ? '' : r[idx[k]]).trim() : ''; }); return o; });
}
function importDlg(kind) {
  const I = IMP[kind]; let rows = null;
  const m = openModal({ title: I.judul, wide: true, body: '<div class="note mb">Berkas Excel/CSV dengan baris pertama berupa judul kolom. Nama kolom fleksibel (mis. “Nama Menu”, “Harga Jual”).</div><div class="row wrap mb"><label class="btn" style="cursor:pointer">📂 Pilih berkas<input type="file" id="ifile" accept=".csv,.xlsx,.xls,text/csv" hidden></label><button class="btn" id="itpl">⬇ Unduh template</button><label class="chk"><input type="checkbox" id="iUp"> Perbarui yang sudah ada</label></div><div id="iInfo" class="muted sm">Belum ada berkas dipilih.</div><div id="iRes" class="mt"></div>', foot: '<button class="btn" data-x>Tutup</button><button class="btn" id="iSim" disabled>Periksa dulu (simulasi)</button><button class="btn pri" id="iGo" disabled>Impor</button>' });
  $('#itpl', m.el).onclick = () => download('template-' + kind + '.csv', toCSV(I.tpl));
  $('#ifile', m.el).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const raw = await readFileRows(f); if (raw.length < 2) throw new Error('Berkas kosong atau hanya berisi judul.'); rows = mapRows(raw, I.cols); const miss = Object.keys(I.cols).filter(k => (k === 'nama' || (kind === 'menu' && k === 'harga') || (kind === 'bahan' && k === 'satuan')) && !raw[0].map(h => String(h).trim().toLowerCase()).some(h => I.cols[k].includes(h)));
      $('#iInfo', m.el).innerHTML = '<b>' + esc(f.name) + '</b> · ' + rows.length + ' baris' + (miss.length ? ' <span class="chip bad">kolom wajib tidak ditemukan: ' + miss.join(', ') + '</span>' : ''); $('#iSim', m.el).disabled = !!miss.length; $('#iGo', m.el).disabled = !!miss.length; $('#iRes', m.el).innerHTML = ''; }
    catch (x) { rows = null; $('#iInfo', m.el).innerHTML = '<span class="chip bad">' + esc(x.message) + '</span>'; }
  };
  const run = async sim => {
    if (!rows) return; const b = sim ? $('#iSim', m.el) : $('#iGo', m.el); b.disabled = true;
    try { const r = await call(I.act, { rows: rows.slice(0, 600), simulasi: sim, perbarui: $('#iUp', m.el).checked }, { timeout: 120000 }), d = r.data;
      $('#iRes', m.el).innerHTML = '<div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><div class="l">Baru</div><div class="v">' + d.baru + '</div></div><div class="kpi"><div class="l">Diperbarui</div><div class="v">' + d.diubah + '</div></div><div class="kpi"><div class="l">Dilewati</div><div class="v">' + d.lewati + '</div></div></div>' + (d.error.length ? '<div class="err"><b>' + d.error.length + ' baris bermasalah (tidak diimpor):</b><br>' + d.error.map(esc).join('<br>') + '</div>' : '<div class="okbox">Tidak ada masalah.</div>') + (rows.length > 600 ? '<div class="note mt">Hanya 600 baris pertama yang diproses. Bagi berkas menjadi beberapa bagian.</div>' : '');
      if (!sim) { S.vers.Menu = -1; S.vers.Bahan = -1; toast(r.message, 'ok'); await syncNow(); }
    } catch (x) { $('#iRes', m.el).innerHTML = '<div class="err">' + esc(needNet(x)) + '</div>'; } b.disabled = false;
  };
  $('#iSim', m.el).onclick = () => run(true); $('#iGo', m.el).onclick = () => run(false);
}

/* ---------- perangkat ---------- */
function tabApp() {
  $('#adBody').innerHTML = '<div class="card"><h3>Perangkat ini</h3><div class="list"><div class="it"><span class="sp">Versi aplikasi</span><b>' + esc(CFG.VER) + '</b></div><div class="it"><span class="sp">Sinkron terakhir</span><b>' + (S.lastSync ? esc(nowStr(new Date(S.lastSync))) : '—') + '</b></div><div class="it"><span class="sp">Antrean belum terkirim</span><b>' + Q.length + '</b></div><div class="it"><span class="sp">Mode offline</span><b>' + ('serviceWorker' in navigator ? 'Aktif' : 'Tidak didukung') + '</b></div></div><div class="row wrap mt"><button class="btn" data-act="pin">🔑 Ganti PIN saya</button><button class="btn" data-act="adReload">🔄 Muat ulang data dari server</button></div></div><div class="note mt">Pasang sebagai aplikasi: menu browser → <b>Install app / Tambahkan ke layar utama</b>. Setelah login online sekali, aplikasi tetap bisa dipakai tanpa internet.</div><div class="hint mt">' + esc(CFG.CREDIT) + '</div>';
}
ACT.adReload = async () => { S.vers = {}; S.trxRow = 0; S.logRow = 0; saveState(); await syncNow(); toast('Data dimuat ulang', 'ok'); };
