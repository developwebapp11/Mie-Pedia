'use strict';
/* MIE PEDIA · util — helper kecil tanpa dependensi */
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const rpn = n => { n = Math.round(num(n)); return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
const rp = n => 'Rp ' + rpn(n);
const fq = n => String(Math.round(num(n) * 1000) / 1000).replace('.', ',');
const pad = n => String(n).padStart(2, '0');
const isOn = v => !(v === false || v === 0 || v === '' || v == null || String(v).toUpperCase() === 'FALSE' || String(v) === '0');
function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function nowStr(d) { d = d || new Date(); return todayStr(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
function addDaysStr(s, n) { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return todayStr(d); }
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function tglIndo(s) { s = String(s || ''); return s.length < 10 ? s : Number(s.substr(8, 2)) + ' ' + BLN[Number(s.substr(5, 2)) - 1] + ' ' + s.substr(0, 4); }
function jam(s) { return String(s || '').substr(11, 5); }
function uid(p) { return p + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); }
function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; }
function parseJ(s) { if (Array.isArray(s)) return s; try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) { const ks = p.split('.'), l = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[l] = v; }

/* input uang: tampil 12.500, nilai angka lewat mv() */
const mv = el => num(String(el && el.value || '').replace(/\D/g, ''));
function fmtMoneyInput(el) { const d = String(el.value).replace(/\D/g, ''); el.value = d ? rpn(d) : ''; }

/* toast */
function toast(msg, type) {
  const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = msg; $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, type === 'bad' ? 4500 : 2400);
}
/* modal */
function openModal(o) {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = '<div class="md' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '"><div class="mh"><h2>' + esc(o.title) + '</h2><button class="ibtn" data-x aria-label="Tutup">✕</button></div><div class="mb">' + (o.body || '') + '</div>' + (o.foot ? '<div class="mf">' + o.foot + '</div>' : '') + '</div>';
  $('#mroot').appendChild(ov);
  const api = { el: ov, close() { ov.remove(); if (o.onClose) o.onClose(); }, $: s => $(s, ov), setBody(h) { $('.mb', ov).innerHTML = h; }, setFoot(h) { let f = $('.mf', ov); if (!f) { f = document.createElement('div'); f.className = 'mf'; $('.md', ov).appendChild(f); } f.innerHTML = h; } };
  ov.addEventListener('mousedown', e => { if (e.target === ov && !o.sticky) api.close(); });
  ov.addEventListener('click', e => { if (e.target.closest('[data-x]')) api.close(); });
  const f = $('input:not([type=hidden]),select,textarea', ov); if (f && !o.noFocus && window.innerWidth > 900) f.focus();
  return api;
}
function topModal() { const a = $$('#mroot .ov'); return a[a.length - 1]; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = topModal(); if (m) m.querySelector('[data-x]') && m.querySelector('[data-x]').click(); } });
function confirmDlg(msg, o) {
  o = o || {};
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const m = openModal({ title: o.title || 'Konfirmasi', body: '<p style="margin:0">' + esc(msg).replace(/\n/g, '<br>') + '</p>', onClose: () => fin(false),
      foot: '<button class="btn" data-x>' + esc(o.no || 'Batal') + '</button><button class="btn ' + (o.danger ? 'dng' : 'pri') + '" id="cfOk">' + esc(o.ok || 'Ya') + '</button>' });
    $('#cfOk', m.el).onclick = () => { fin(true); m.close(); };
  });
}
/* CSV / unduh */
function csvEsc(v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function toCSV(rows) { return '\ufeff' + rows.map(r => r.map(csvEsc).join(',')).join('\r\n'); }
function download(name, text, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function parseCSV(text) {
  text = text.replace(/^\ufeff/, ''); const first = text.split(/\r?\n/)[0] || '', sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}
/* kompres foto di perangkat → JPEG kecil (hemat kuota & Drive) */
function compressImage(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, (max || 480) / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      const url = c.toDataURL('image/jpeg', q || 0.72); res({ url, data: url.split(',')[1], mime: 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Foto tidak bisa dibaca.')); }; img.src = u;
  });
}
function fotoUrl(id, w) { return id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 320) : ''; }
const EMO = { Mie: '🍜', Minuman: '🥤', Topping: '🥚', Camilan: '🥟', Nasi: '🍚' };
const emoOf = k => EMO[k] || '🍽️';
