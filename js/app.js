/* app.js — inti SPA + halaman publik (daftar, konfirmasi, Tiket Saya, evaluasi, login). Backend: GAS REST API. */
/* ============================================================
 * JavaScript.html (bagian 1): inti SPA + halaman publik
 * Bagian 2 (panel admin & panitia) ada di JavaScriptAdmin.html
 * Aturan iframe-safe: tanpa window.location / window.open / ?page=
 * Navigasi = navigateTo() + injectPage() ke #app-container.
 * ============================================================ */
var W = {
  sesi: null, user: null, rute: '', params: {}, semId: '', semList: [], linkDasar: '',
  rutaPublik: {}, rutaStaf: {}, penyelenggara: '', logoUrl: '', tujuan: null, timer: null, hapusSaatPindah: []
};

/* ---------- util ---------- */
W.$ = function (s, r) { return (r || document).querySelector(s); };
W.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
W.esc = function (s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
};
W.ico = function (n, fill, ekstra) { return '<span class="ms' + (fill ? ' fill' : '') + (ekstra ? ' ' + ekstra : '') + '" aria-hidden="true">' + n + '</span>'; };
W.inisial = function (n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); };
var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
W.tgl = function (s, panjang) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); if (!m) return s || '';
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return (panjang === false ? '' : HARI[d.getUTCDay()] + ', ') + (+m[3]) + ' ' + (panjang === false ? BLN[+m[2] - 1].substring(0, 3) : BLN[+m[2] - 1]) + ' ' + m[1];
};
W.jam = function (s) { return s ? String(s).substring(11, 16) : '–'; };
W.waktu = function (s) { return s ? W.tgl(s.substring(0, 10), false) + ' ' + s.substring(11, 16) : '–'; };
W.badgeStatus = function (st) {
  var m = { 'Hadir': 'ok', 'Hadir tanpa check-out': 'warn', 'Belum hadir': '', 'Tidak hadir': 'bad', 'Dibatalkan': 'bad', 'Dibuka': 'ok', 'Draf': '', 'Ditutup': 'warn', 'Selesai': 'blue', 'Diarsip': '', 'Terkirim': 'ok', 'Antre': 'warn', 'Gagal': 'bad' };
  var k = (st || '').indexOf('Mengirim') === 0 ? 'Antre' : st;
  return '<span class="badge ' + (m[k] || '') + '">' + W.esc(k === 'Antre' && st !== 'Antre' ? 'Mengirim' : st) + '</span>';
};

/* ---------- panggilan server (fetch ke GAS REST API) ---------- */
/** POST text/plain agar tidak memicu preflight CORS yang ditolak GAS. Body: {fn, args}. */
var BACA = { apiInfoPublik: 1, apiTiketSaya: 1, apiDashboard: 1, apiDaftarSeminar: 1, apiDaftarPeserta: 1, apiDaftarPengguna: 1, apiRiwayat: 1, apiEvaluasi: 1, apiLogScan: 1, apiStatusSertifikat: 1, apiAuditLog: 1, apiPengaturan: 1, apiCariPeserta: 1, apiPulihSesi: 1, apiVerifikasiSertifikat: 1 };
var terbang = {};      // permintaan baca yang sedang berjalan (dipakai bersama agar tidak dobel)
W.epoch = 0;           // naik setiap ada perubahan data → cache halaman dibuang
W.cacheH = {};         // cache halaman: kunci → {html, bind, t}
W.rpc = function (fn, args, opsi) {
  var kunci = BACA[fn] ? fn + JSON.stringify(args || []) : null;
  if (kunci && terbang[kunci]) return terbang[kunci];
  var p = rpcMentah(fn, args, opsi);
  if (kunci) { terbang[kunci] = p; var lepas = function () { delete terbang[kunci]; }; p.then(lepas, lepas); }
  else { var ubah = function () { W.epoch++; W.cacheH = {}; W.infoLanding = null; }; p.then(ubah, ubah); }
  return p;
};
function rpcMentah(fn, args, opsi) {
  opsi = opsi || {};
  return new Promise(function (resolve, reject) {
    var coba = 0;
    function jalan() {
      coba++;
      var ctl = ('AbortController' in window) ? new AbortController() : null;
      var tmr = ctl ? setTimeout(function () { ctl.abort(); }, opsi.batas || 90000) : null;
      fetch(APP_CONFIG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args || [] }), redirect: 'follow', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('Server tidak merespons (' + r.status + ').'); return r.json(); })
        .then(function (res) {
          clearTimeout(tmr);
          if (res && res.ok === false) {
            var e = new Error(res.pesan || 'Terjadi kesalahan.'); e.dariServer = true;
            if (/Sesi berakhir/i.test(e.message) && W.user) { W.sesiHabis(); }
            reject(e);
          } else resolve(res);
        })
        .catch(function (err) {
          clearTimeout(tmr);
          if (opsi.ulang && coba < 3) { setTimeout(jalan, 700 * coba); return; }
          var pesan = err && err.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' :
            /Failed to fetch|NetworkError|Load failed/i.test((err && err.message) || '') ? 'Tidak dapat menghubungi server. Periksa internet Anda atau alamat GAS_URL di js/config.js.' : ((err && err.message) || 'Koneksi bermasalah.');
          reject(new Error(pesan));
        });
    }
    jalan();
  });
}

/* ---------- toast & modal ---------- */
W.toast = function (pesan, tipe) {
  var el = document.createElement('div');
  el.className = 'toast ' + (tipe || '');
  el.innerHTML = W.ico(tipe === 'bad' ? 'error' : tipe === 'ok' ? 'check_circle' : 'info', true) + '<span>' + W.esc(pesan) + '</span>';
  W.$('#toast-root').appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 320); }, tipe === 'bad' ? 5200 : 3200);
};

W.modal = function (o) {
  var root = W.$('#modal-root');
  var ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = '<div class="modal ' + (o.lebar ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + W.esc(o.judul) + '"><h2>' + W.esc(o.judul) + '</h2><div class="isi">' + (o.isi || '') + '</div>' +
    (o.tombol ? '<div class="foot">' + o.tombol.map(function (t, i) { return '<button type="button" class="btn ' + (t.kelas || '') + '" data-i="' + i + '">' + (t.label) + '</button>'; }).join('') + '</div>' : '') + '</div>';
  root.appendChild(ov);
  var sebelum = document.activeElement;
  var api = {
    el: ov, isi: W.$('.isi', ov),
    tutup: function () { ov.remove(); document.removeEventListener('keydown', esc); if (sebelum && sebelum.focus) try { sebelum.focus(); } catch (e) {} if (o.saatTutup) o.saatTutup(); }
  };
  function esc(e) { if (e.key === 'Escape') api.tutup(); }
  document.addEventListener('keydown', esc);
  ov.addEventListener('mousedown', function (e) { if (e.target === ov && !o.kunci) api.tutup(); });
  W.$$('.foot .btn', ov).forEach(function (b) {
    b.addEventListener('click', function () {
      var t = o.tombol[+b.dataset.i];
      if (t.aksi) { var r = t.aksi(api, b); if (r === false) return; }
      if (t.tutup !== false) api.tutup();
    });
  });
  var f = W.$('input,select,textarea,.btn', ov.querySelector('.isi')) || W.$('.foot .btn', ov);
  if (f && !o.tanpaFokus) setTimeout(function () { try { f.focus(); } catch (e) {} }, 60);
  if (o.bind) o.bind(api);
  return api;
};

W.konfirmasi = function (judul, pesan, labelOk, bahaya) {
  return new Promise(function (res) {
    var selesai = false;
    W.modal({
      judul: judul, isi: '<p>' + pesan + '</p>',
      tombol: [{ label: 'Batal', kelas: 'out', aksi: function () { selesai = true; res(false); } }, { label: labelOk || 'Ya, lanjutkan', kelas: bahaya ? 'danger' : '', aksi: function () { selesai = true; res(true); } }],
      saatTutup: function () { if (!selesai) res(false); }
    });
  });
};

/** Jalankan aksi async pada tombol: nonaktifkan + spinner agar tidak terklik dua kali. */
W.sibuk = function (btn, fn) {
  if (!btn || btn.dataset.sibuk) return Promise.resolve();
  var asal = btn.innerHTML;
  btn.dataset.sibuk = '1'; btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span><span>Memproses…</span>';
  return Promise.resolve().then(fn).catch(function (e) { W.toast(e.message, 'bad'); }).then(function () {
    delete btn.dataset.sibuk; btn.disabled = false; btn.innerHTML = asal;
  });
};

W.unduh = function (nama, mime, base64) {
  var bin = atob(base64), n = bin.length, arr = new Uint8Array(n);
  for (var i = 0; i < n; i++) arr[i] = bin.charCodeAt(i);
  var url = URL.createObjectURL(new Blob([arr], { type: mime }));
  var a = document.createElement('a');
  a.href = url; a.download = nama; document.body.appendChild(a); a.click();
  setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
};

W.salin = function (teks) {
  function cadangan() {
    W.modal({ judul: 'Salin tautan', isi: '<p class="sm muted mb2">Tekan lama atau Ctrl+C untuk menyalin:</p><input class="in" readonly value="' + W.esc(teks) + '" id="salin-in">', tombol: [{ label: 'Tutup', kelas: 'out' }], bind: function (m) { var i = W.$('#salin-in', m.el); i.focus(); i.select(); } });
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(teks).then(function () { W.toast('Tautan disalin', 'ok'); }, cadangan); return; }
  } catch (e) {}
  cadangan();
};

/** Ambil gambar → perkecil (maks 1600px) → base64 JPEG/PNG. */
W.bacaGambar = function (file, maks, png) {
  return new Promise(function (res, rej) {
    if (!file) return rej(new Error('Pilih gambar dahulu.'));
    if (!/^image\//.test(file.type)) return rej(new Error('Berkas harus gambar.'));
    var fr = new FileReader();
    fr.onerror = function () { rej(new Error('Gagal membaca berkas.')); };
    fr.onload = function () {
      var im = new Image();
      im.onerror = function () { rej(new Error('Gambar tidak dapat dibuka.')); };
      im.onload = function () {
        var k = Math.min(1, (maks || 1600) / Math.max(im.width, im.height));
        var c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        var g = c.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(im, 0, 0, c.width, c.height);
        var mime = png ? 'image/png' : 'image/jpeg';
        var u = c.toDataURL(mime, 0.86);
        res({ mime: mime, base64: u.substring(u.indexOf(',') + 1), url: u, nama: file.name });
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
};

/* ---------- tabel interaktif (cari, filter, halaman) ---------- */
W.Tbl = {
  reg: {},
  /** o: {id, rows, cols:[{h,l,f,cls}], cari:fn(row)->teks, chips:{key:fn(row)->nilai, opsi:[..]}, perPage, kosong:{ikon,judul,teks}, extra:html} */
  html: function (o) {
    W.Tbl.reg[o.id] = { o: o, q: '', chip: o.chips ? o.chips.opsi[0] : null, p: 1, filtered: o.rows.slice() };
    return '<div id="' + o.id + '">' +
      '<div class="tools">' + (o.cari ? '<div class="searchbox grow">' + W.ico('search') + '<input class="in" type="search" placeholder="' + W.esc(o.placeholder || 'Cari…') + '" aria-label="Cari" data-tbl-q></div>' : '') + (o.extra || '') + '</div>' +
      (o.chips ? '<div class="chips mb2" role="group" aria-label="Filter">' + o.chips.opsi.map(function (x, i) { return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-tbl-chip="' + W.esc(x) + '">' + W.esc(x) + ' <span class="num" data-cnt="' + W.esc(x) + '"></span></button>'; }).join('') + '</div>' : '') +
      '<div class="tablewrap"><table class="t"><thead><tr>' + o.cols.map(function (c) { return '<th scope="col" class="' + (c.cls || '') + '">' + W.esc(c.h) + '</th>'; }).join('') + '</tr></thead><tbody data-tbl-body></tbody></table></div>' +
      '<div class="pager" data-tbl-pager></div></div>';
  },
  mulai: function (id) {
    var t = W.Tbl.reg[id], root = W.$('#' + id); if (!t || !root) return;
    var q = W.$('[data-tbl-q]', root);
    if (q) q.addEventListener('input', function () { t.q = q.value.trim().toLowerCase(); t.p = 1; W.Tbl.gambar(id); });
    W.$$('[data-tbl-chip]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        t.chip = b.dataset.tblChip; t.p = 1;
        W.$$('[data-tbl-chip]', root).forEach(function (x) { x.classList.toggle('on', x === b); });
        W.Tbl.gambar(id);
      });
    });
    root.addEventListener('click', function (e) {
      var pg = e.target.closest('[data-tbl-page]'); if (pg && !pg.disabled) { t.p = +pg.dataset.tblPage; W.Tbl.gambar(id); }
    });
    W.Tbl.gambar(id);
  },
  setRows: function (id, rows) { var t = W.Tbl.reg[id]; if (!t) return; t.o.rows = rows; W.Tbl.gambar(id); },
  gambar: function (id) {
    var t = W.Tbl.reg[id], root = W.$('#' + id); if (!t || !root) return;
    var o = t.o, per = o.perPage || 10;
    var dasar = o.rows.filter(function (r) { return !t.q || String(o.cari(r)).toLowerCase().indexOf(t.q) >= 0; });
    if (o.chips) {
      o.chips.opsi.forEach(function (x, i) {
        var n = i === 0 ? dasar.length : dasar.filter(function (r) { return o.chips.f(r) === x; }).length;
        var c = W.$('[data-cnt="' + x.replace(/"/g, '\\"') + '"]', root); if (c) c.textContent = '(' + n + ')';
      });
    }
    t.filtered = dasar.filter(function (r) { return !o.chips || t.chip === o.chips.opsi[0] || o.chips.f(r) === t.chip; });
    var total = t.filtered.length, hal = Math.max(1, Math.ceil(total / per));
    if (t.p > hal) t.p = hal;
    var irisan = t.filtered.slice((t.p - 1) * per, t.p * per);
    var body = W.$('[data-tbl-body]', root);
    if (!total) {
      var k = o.kosong || { ikon: 'search_off', judul: 'Tidak ada data', teks: 'Coba ubah kata kunci atau filter.' };
      body.innerHTML = '<tr><td colspan="' + o.cols.length + '" style="display:table-cell;text-align:center"><div class="empty">' + W.ico(k.ikon) + '<h3>' + W.esc(k.judul) + '</h3><p>' + W.esc(k.teks) + '</p></div></td></tr>';
    } else {
      body.innerHTML = irisan.map(function (r) {
        return '<tr>' + o.cols.map(function (c, i) { return '<td data-l="' + W.esc(c.l || c.h) + '" class="' + (i === 0 ? 'first ' : '') + (c.cls || '') + '">' + c.f(r) + '</td>'; }).join('') + '</tr>';
      }).join('');
    }
    var pg = W.$('[data-tbl-pager]', root);
    pg.innerHTML = total ? '<span>Menampilkan ' + ((t.p - 1) * per + 1) + '–' + Math.min(total, t.p * per) + ' dari ' + total + '</span><span class="row">' +
      '<button type="button" class="btn out sm" data-tbl-page="' + (t.p - 1) + '"' + (t.p <= 1 ? ' disabled' : '') + '>Sebelumnya</button>' +
      '<span class="num">' + t.p + ' / ' + hal + '</span>' +
      '<button type="button" class="btn out sm" data-tbl-page="' + (t.p + 1) + '"' + (t.p >= hal ? ' disabled' : '') + '>Berikutnya</button></span>' : '';
  }
};

/* ---------- navigasi SPA ---------- */
W.injectPage = function (html, bind, tetapScroll) {
  var c = W.$('#app-container');
  clearInterval(W.timer); W.timer = null;   // bind() halaman boleh dipanggil ulang tanpa menumpuk timer
  c.innerHTML = html;
  if (!tetapScroll) { try { window.scrollTo(0, 0); } catch (e) {} }
  if (bind) bind(c);
};

W.skeleton = function () {
  return '<div class="pub"><div class="skeleton" style="height:56px;margin-bottom:14px"></div><div class="skeleton" style="height:180px;margin-bottom:14px"></div><div class="skeleton" style="height:120px"></div></div>';
};

W.stopPemindai = function () { if (W.hentikanKamera) W.hentikanKamera(); };

/** Halaman baca-saja yang boleh tampil seketika dari cache lalu diperbarui diam-diam di latar belakang. */
var SWR_RUTE = { landing: 1, dashboard: 1, seminar: 1, peserta: 1, riwayat: 1, evaluasiHasil: 1, laporan: 1, sertifikat: 1, pengguna: 1 };
function kunciHalaman(nama, params) { return nama + '|' + (W.semId || '') + '|' + JSON.stringify(params || {}); }
function galatHalaman(nama, staf, e) {
  var html = '<div class="' + (staf ? '' : 'pub') + '"><div class="card center mt3">' + W.ico('cloud_off') + '<h2 class="mt1">Halaman tidak bisa dimuat</h2><p class="muted mt1">' + W.esc(e.message) + '</p><div class="mt2"><button class="btn" data-act="ulang">Coba lagi</button> <button class="btn out" data-nav="' + (staf ? 'dashboard' : 'landing') + '">Beranda</button></div></div></div>';
  W.injectPage(staf && W.layoutStaf ? W.layoutStaf(nama, html) : html, null);
}

/** nama rute → fungsi(params) => Promise<{html, bind}> */
W.navigateTo = function (nama, params, opsi) {
  params = params || {}; opsi = opsi || {};
  var r = W.rutaPublik[nama] || W.rutaStaf[nama];
  if (!r) { nama = 'landing'; r = W.rutaPublik.landing; }
  var staf = !!W.rutaStaf[nama];
  if (staf && !W.user) { W.tujuan = { nama: nama, params: params }; return W.navigateTo('login'); }
  W.stopPemindai();
  clearInterval(W.timer); W.timer = null;
  W.rute = nama; W.params = params; W.kotor = false;
  var kunci = kunciHalaman(nama, params);
  W.kunciH = kunci;
  var ep = W.epoch;
  var simpan = SWR_RUTE[nama] ? function (h) { if (ep === W.epoch) W.cacheH[kunci] = { html: h.html, bind: h.bind, t: Date.now() }; } : function () {};
  var hit = SWR_RUTE[nama] && !opsi.tanpaSkeleton ? W.cacheH[kunci] : null;

  if (hit) {
    // TAMPIL SEKETIKA dari cache, lalu ambil data terbaru di latar belakang
    W.injectPage(hit.html, hit.bind);
    return Promise.resolve().then(function () { return r(params); }).then(function (h) {
      simpan(h);
      if (W.rute !== nama || W.kunciH !== kunci || h.html === hit.html) return;
      if (W.kotor || W.$('#modal-root .overlay')) return;   // pengguna sedang berinteraksi: jangan ganggu
      var y = window.pageYOffset;
      W.injectPage(h.html, h.bind, true);
      try { window.scrollTo(0, y); } catch (e) {}
    }).catch(function () { /* tampilan cache tetap dipakai */ });
  }

  var c = W.$('#app-container');
  if (!opsi.tanpaSkeleton) c.innerHTML = staf && W.layoutStaf ? W.layoutStaf(nama, '<div class="skeleton" style="height:120px"></div><div class="skeleton mt2" style="height:260px"></div>') : W.skeleton();
  return Promise.resolve().then(function () { return r(params); }).then(function (hasil) {
    simpan(hasil);
    if (W.rute !== nama) return;       // pengguna sudah pindah halaman
    W.injectPage(hasil.html, hasil.bind);
  }).catch(function (e) {
    if (W.rute !== nama) return;
    galatHalaman(nama, staf, e);
  });
};

/** Hangatkan cache sebuah halaman tanpa menampilkannya (dipanggil saat hover/sentuh menu & setelah login). */
var sedangPrefetch = {};
W.prefetch = function (nama, params) {
  params = params || {};
  var r = W.rutaPublik[nama] || W.rutaStaf[nama];
  if (!r || !SWR_RUTE[nama]) return Promise.resolve();
  if (W.rutaStaf[nama] && !W.user) return Promise.resolve();
  var kunci = kunciHalaman(nama, params);
  if (W.cacheH[kunci] || sedangPrefetch[kunci]) return Promise.resolve();
  sedangPrefetch[kunci] = 1;
  var ep = W.epoch;
  return Promise.resolve().then(function () { return r(params); }).then(function (h) {
    if (ep === W.epoch && h && h.html) W.cacheH[kunci] = { html: h.html, bind: h.bind, t: Date.now() };
  }).catch(function () {}).then(function () { delete sedangPrefetch[kunci]; });
};
/** Setelah login: hangatkan halaman utama satu per satu saat browser menganggur. */
W.prefetchAwal = function () {
  var daftar = ['peserta', 'riwayat', 'laporan', 'sertifikat'];
  if (W.user && W.user.peran === 'Admin') daftar = ['peserta', 'seminar', 'riwayat', 'laporan', 'sertifikat', 'pengguna'];
  var i = 0;
  (function lanjut() {
    if (!W.user || i >= daftar.length) return;
    if (document.hidden || W.rute === 'pindai') { setTimeout(lanjut, 4000); return; }
    W.prefetch(daftar[i++]).then(function () { setTimeout(lanjut, 300); });
  })();
};

W.sesiHabis = function () {
  W.user = null; W.sesi = null; W.cacheH = {}; W.epoch++;
  try { sessionStorage.removeItem('sesi'); } catch (e) {}
  W.toast('Sesi berakhir. Silakan masuk kembali.', 'bad');
  W.navigateTo('login');
};

/* ---------- delegasi klik ---------- */
W.ACT = {};
document.addEventListener('click', function (e) {
  var n = e.target.closest('[data-nav]');
  if (n) {
    e.preventDefault();
    var p = {}; try { p = n.dataset.p ? JSON.parse(n.dataset.p) : {}; } catch (x) {}
    W.navigateTo(n.dataset.nav, p); return;
  }
  var a = e.target.closest('[data-act]');
  if (a && W.ACT[a.dataset.act]) { e.preventDefault(); W.ACT[a.dataset.act](a, e); }
});
W.ACT.ulang = function () { W.navigateTo(W.rute, W.params); };
(function () {
  function dariNav(e) {
    var n = e.target && e.target.closest ? e.target.closest('[data-nav]') : null;
    if (!n) return;
    var p = {}; try { p = n.dataset.p ? JSON.parse(n.dataset.p) : {}; } catch (x) {}
    W.prefetch(n.dataset.nav, p);
  }
  document.addEventListener('mouseover', dariNav, { passive: true });
  document.addEventListener('touchstart', dariNav, { passive: true });
  document.addEventListener('focusin', dariNav);
  // tandai bila pengguna sudah berinteraksi → pembaruan diam-diam tidak menimpa tampilan
  ['input', 'change', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (e.target && e.target.closest && e.target.closest('#app-container')) W.kotor = true; }, true);
  });
  // hangatkan koneksi/instance GAS begitu halaman dibuka (kurangi cold start)
  try { if (window.APP_CONFIG && APP_CONFIG.GAS_URL) fetch(APP_CONFIG.GAS_URL, { mode: 'no-cors', cache: 'no-store' }).catch(function () {}); } catch (e) {}
})();

/* ============================================================
 *  HALAMAN PUBLIK
 * ============================================================ */
function kepalaPublik(sub) {
  return '<div class="pubhead">' + (W.logoUrl ? '<img src="' + W.esc(W.logoUrl) + '" alt="Logo">' : '<div class="brand"><div class="logo">' + W.ico('event_available', true) + '</div></div>') +
    '<div><div class="b">' + W.esc(W.penyelenggara || 'Pendaftaran Seminar') + '</div><div class="xs muted">' + W.esc(sub || 'Pendaftaran & tiket seminar') + '</div></div></div>';
}
function barisInfo(s) {
  return '<div class="info-list"><div>' + W.ico('calendar_month') + '<span>' + W.esc(W.tgl(s.tanggal)) + '</span></div>' +
    '<div>' + W.ico('schedule') + '<span>' + W.esc(s.jamMulai) + ' – ' + W.esc(s.jamSelesai) + ' WIB</span></div>' +
    '<div>' + W.ico('location_on') + '<span>' + W.esc(s.lokasi) + '</span></div></div>';
}
function posterHtml(s) {
  return s.posterUrl ? '<img class="poster" src="' + W.esc(s.posterUrl) + '" alt="Poster ' + W.esc(s.nama) + '" loading="lazy" onerror="this.outerHTML=\'<div class=poster-ph><span class=ms>event</span></div>\'">' : '<div class="poster-ph">' + W.ico('event') + '</div>';
}

W.muatInfoPublik = function (seminarId) {
  // halaman Daftar dibuat dari data daftar seminar yang baru saja dimuat di Beranda (tanpa panggilan server)
  var L = W.infoLanding;
  if (seminarId && L && Date.now() - L.t < 120000) {
    var s = (L.r.daftar || []).filter(function (x) { return x.id === seminarId; })[0];
    if (s) return Promise.resolve({ ok: true, penyelenggara: L.r.penyelenggara, logoUrl: L.r.logoUrl, seminar: s });
  }
  return W.rpc('apiInfoPublik', [seminarId || ''], { ulang: true }).then(function (r) {
    W.penyelenggara = r.penyelenggara || W.penyelenggara; W.logoUrl = r.logoUrl || '';
    if (!seminarId && r.daftar) W.infoLanding = { t: Date.now(), r: r };
    return r;
  });
};

W.rutaPublik.landing = function () {
  return W.muatInfoPublik('').then(function (r) {
    var kartu = r.daftar.length ? r.daftar.map(function (s) {
      return '<div class="card sem-card mt2">' + posterHtml(s) + '<div class="mt2"><div class="row between wrap"><h2>' + W.esc(s.nama) + '</h2>' +
        (s.pendaftaranBuka ? '<span class="badge ok">' + W.ico('how_to_reg') + 'Sisa ' + s.sisa + ' kursi</span>' : '<span class="badge warn">' + W.esc(s.alasanTutup) + '</span>') + '</div>' +
        barisInfo(s) + '<button class="btn block mt2" data-nav="daftar" data-p=\'' + W.esc(JSON.stringify({ s: s.id })) + '\'>' + (s.pendaftaranBuka ? 'Daftar Sekarang' : 'Lihat Detail') + W.ico('arrow_forward') + '</button></div></div>';
    }).join('') : '<div class="card mt2"><div class="empty">' + W.ico('event_busy') + '<h3>Belum ada seminar yang dibuka</h3><p>Silakan kembali lagi nanti.</p></div></div>';
    var html = '<div class="pub">' + kepalaPublik() +
      '<div class="hero"><span class="tag">' + W.ico('event_available', true) + 'PENDAFTARAN ONLINE</span><h1>Daftar seminar, langsung dapat QR Code</h1><p>Isi formulir singkat, QR Code dikirim ke email Anda untuk absensi di lokasi.</p></div>' +
      kartu +
      '<div class="card mt3"><h2>' + W.ico('confirmation_number') + ' Sudah punya tiket?</h2><p class="sm muted mt1">Tempel tautan atau kode tiket dari email Anda.</p>' +
      '<div class="row mt2"><input class="in grow" id="kode-tiket" placeholder="Tempel tautan / kode tiket" aria-label="Kode tiket"><button class="btn" data-act="bukaTiket">Buka</button></div></div>' +
      '<div class="center mt3 sm muted">' +
      '<a href="javascript:void(0)" data-nav="verifikasi">Verifikasi sertifikat</a> &nbsp;·&nbsp; <a href="javascript:void(0)" data-nav="login">Masuk Admin / Panitia</a></div></div>';
    return { html: html };
  });
};

W.ACT.bukaTiket = function () {
  var v = (W.$('#kode-tiket').value || '').trim();
  var m = /[?&]t=([^&#\s]+)/.exec(v); var token = m ? decodeURIComponent(m[1]) : v;
  if (token.length < 20) { W.toast('Kode tiket tidak valid.', 'bad'); return; }
  W.navigateTo('tiket', { t: token });
};

/* ---------- pendaftaran ---------- */
W.rutaPublik.daftar = function (p) {
  return W.muatInfoPublik(p.s).then(function (r) {
    var s = r.seminar;
    var pem = s.pemateri.length ? '<div class="mt3"><div class="b mb2">Pemateri</div>' + s.pemateri.map(function (m) {
      return '<div class="speaker mt1">' + (m.fotoUrl ? '<img src="' + W.esc(m.fotoUrl) + '" alt="' + W.esc(m.nama) + '" onerror="this.outerHTML=\'<div class=ph>' + W.esc(W.inisial(m.nama)) + '</div>\'">' : '<div class="ph">' + W.esc(W.inisial(m.nama)) + '</div>') +
        '<div><div class="b">' + W.esc(m.nama) + '</div><div class="sm muted">' + W.esc(m.jabatan) + '</div></div></div>';
    }).join('') + '</div>' : '';
    var persen = s.kuota ? Math.min(100, Math.round(s.terdaftar * 100 / s.kuota)) : 0;
    var form = s.pendaftaranBuka ?
      '<form id="f-daftar" novalidate class="card mt3" autocomplete="on"><h2>Formulir Pendaftaran</h2><div class="form-grid mt2">' +
      campur('nama', 'Nama lengkap', 'text', true, 'Dipakai pada sertifikat. Tulis sesuai KTP/identitas.', 'name') +
      campur('email', 'Email', 'email', true, 'QR Code dikirim ke email ini.', 'email') +
      campur('telepon', 'Nomor HP', 'tel', true, 'Contoh: 081234567890', 'tel') +
      campur('institusi', 'Institusi / Instansi (opsional)', 'text', false, '', 'organization') +
      '<label class="switch span2"><input type="checkbox" name="setuju" id="setuju"><span class="sm">Saya setuju data saya dipakai untuk keperluan seminar ini (absensi, sertifikat, dan evaluasi).</span></label>' +
      '<div class="span2"><div id="f-err" class="alert bad hidden" role="alert"></div><button type="submit" class="btn lg block mt1" id="btn-daftar">' + W.ico('qr_code_2') + 'Daftar &amp; Dapatkan QR</button></div></div></form>' :
      '<div class="alert warn mt3">' + W.ico('info') + '<div><b>Pendaftaran tidak tersedia.</b><br>' + W.esc(s.alasanTutup) + '</div></div>';
    var ulang = '<div class="card mt3 flat"><div class="b">Sudah mendaftar tapi belum menerima email?</div><p class="sm muted mt1">Kami kirim ulang tiket ke email yang Anda daftarkan.</p><div class="row mt2"><input class="in grow" type="email" id="email-ulang" placeholder="email@anda.com" aria-label="Email terdaftar"><button class="btn out" data-act="kirimUlang" data-id="' + W.esc(s.id) + '">Kirim ulang</button></div></div>';
    var html = '<div class="pub">' + kepalaPublik() + '<div class="card">' + posterHtml(s) +
      '<div class="mt2 row between wrap"><h1 style="font-size:22px">' + W.esc(s.nama) + '</h1><span class="badge ' + (s.pendaftaranBuka ? 'ok' : 'warn') + '">' + (s.pendaftaranBuka ? 'Pendaftaran dibuka' : 'Tidak menerima pendaftaran') + '</span></div>' +
      (s.deskripsi ? '<p class="mt2 muted" style="white-space:pre-line">' + W.esc(s.deskripsi) + '</p>' : '') + barisInfo(s) +
      '<div class="mt3"><div class="row between sm"><span class="b">Kuota</span><span class="num muted">' + s.terdaftar + ' / ' + s.kuota + ' terdaftar</span></div><div class="bar" role="progressbar" aria-valuenow="' + persen + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + persen + '%"></i></div></div>' + pem + '</div>' +
      form + ulang +
      '<div class="center mt3"><a href="javascript:void(0)" data-nav="landing" class="sm">← Semua seminar</a></div></div>';
    return {
      html: html, bind: function () {
        var f = W.$('#f-daftar'); if (!f) return;
        f.addEventListener('submit', function (e) { e.preventDefault(); kirimDaftar(s.id); });
      }
    };
  });
};

function campur(nama, label, tipe, wajib, hint, ac) {
  return '<div class="field"><label for="f-' + nama + '">' + label + (wajib ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
    '<input class="in" id="f-' + nama + '" name="' + nama + '" type="' + tipe + '"' + (ac ? ' autocomplete="' + ac + '"' : '') + (wajib ? ' required' : '') + (tipe === 'tel' ? ' inputmode="tel"' : '') + (tipe === 'email' ? ' inputmode="email" autocapitalize="off"' : '') + '>' +
    (hint ? '<div class="hint">' + hint + '</div>' : '') + '<div class="errmsg hidden" data-err="' + nama + '"></div></div>';
}

function kirimDaftar(seminarId) {
  var f = W.$('#f-daftar'), err = W.$('#f-err');
  var d = {}; ['nama', 'email', 'telepon', 'institusi'].forEach(function (k) { d[k] = f.elements[k].value.trim(); });
  W.$$('[data-err]', f).forEach(function (x) { x.classList.add('hidden'); });
  W.$$('.in.err', f).forEach(function (x) { x.classList.remove('err'); });
  err.classList.add('hidden');
  var salah = {};
  if (d.nama.length < 3) salah.nama = 'Nama minimal 3 huruf.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) salah.email = 'Format email belum benar.';
  var dg = d.telepon.replace(/\D/g, ''); if (dg.length < 9 || dg.length > 15) salah.telepon = 'Nomor HP 9–15 angka.';
  Object.keys(salah).forEach(function (k) { var e = W.$('[data-err="' + k + '"]', f); e.textContent = salah[k]; e.classList.remove('hidden'); f.elements[k].classList.add('err'); });
  if (Object.keys(salah).length) { f.elements[Object.keys(salah)[0]].focus(); return; }
  if (!f.elements.setuju.checked) { err.innerHTML = W.ico('error') + '<span>Centang persetujuan penggunaan data untuk melanjutkan.</span>'; err.classList.remove('hidden'); return; }
  W.sibuk(W.$('#btn-daftar'), function () {
    return W.rpc('apiDaftar', [seminarId, d]).then(function (r) {
      return W.navigateTo('konfirmasi', { tiket: r.tiket });
    }).catch(function (e) { err.innerHTML = W.ico('error') + '<span>' + W.esc(e.message) + '</span>'; err.classList.remove('hidden'); err.scrollIntoView({ block: 'center' }); });
  });
}

W.ACT.kirimUlang = function (el) {
  var email = W.$('#email-ulang').value.trim();
  W.sibuk(el, function () {
    return W.rpc('apiKirimUlangTiket', [el.dataset.id, email]).then(function (r) { W.toast(r.pesan, 'ok'); });
  });
};

/* ---------- konfirmasi & tiket ---------- */
function blokQr(t) {
  return '<div class="qrbox" role="img" aria-label="QR Code tiket atas nama ' + W.esc(t.nama) + '">' + t.qrSvg + '</div>';
}

W.rutaPublik.konfirmasi = function (p) {
  var t = p.tiket;
  var html = '<div class="pub">' + kepalaPublik('Pendaftaran berhasil') +
    '<div class="card center"><div class="avatar g" style="margin:0 auto;width:56px;height:56px">' + W.ico('check_circle', true) + '</div>' +
    '<h1 style="font-size:22px" class="mt2">Pendaftaran berhasil!</h1><p class="muted mt1">Halo <b>' + W.esc(t.nama) + '</b>, ini QR Code Anda untuk absensi.</p>' +
    '<div class="mt3">' + blokQr(t) + '</div>' +
    '<div class="mt2 b">' + W.esc(t.seminar.nama) + '</div><div class="sm muted">' + W.esc(W.tgl(t.seminar.tanggal)) + ' · ' + W.esc(t.seminar.jamMulai) + ' WIB · ' + W.esc(t.seminar.lokasi) + '</div>' +
    '<div class="mt3" style="display:grid;gap:10px"><button class="btn lg" data-act="unduhKartu" data-t="' + W.esc(t.token) + '">' + W.ico('download') + 'Unduh Kartu Peserta (PDF)</button>' +
    '<button class="btn out" data-nav="tiket" data-p=\'' + W.esc(JSON.stringify({ t: t.token })) + '\'>' + W.ico('confirmation_number') + 'Buka Tiket Saya</button></div>' +
    '<div class="alert info mt3" style="text-align:left">' + W.ico('mail') + '<div class="sm">Salinan QR dikirim ke <b>' + W.esc(t.email) + '</b>. Jika belum masuk dalam beberapa menit, cek folder spam. Anda juga dapat <b>menyimpan tangkapan layar</b> halaman ini sebagai cadangan.</div></div>' +
    '</div><div class="center mt3"><a href="javascript:void(0)" data-nav="landing" class="sm">← Kembali ke daftar seminar</a></div></div>';
  return Promise.resolve({ html: html });
};

W.ACT.unduhKartu = function (el) {
  W.sibuk(el, function () {
    return W.rpc('apiKartuPeserta', [el.dataset.t]).then(function (r) { W.unduh(r.nama, r.mime, r.base64); W.toast('Kartu peserta diunduh', 'ok'); });
  });
};

W.rutaPublik.tiket = function (p) {
  return W.muatInfoPublik('').catch(function () { return {}; }).then(function () {
    return W.rpc('apiTiketSaya', [p.t], { ulang: true });
  }).then(function (r) {
    var t = r.tiket;
    var evaluasi = t.evaluasiSudah ? '<div class="alert ok">' + W.ico('check_circle', true) + '<div class="sm"><b>Evaluasi sudah terkirim.</b> Terima kasih atas masukan Anda.</div></div>'
      : t.evaluasiBisa ? '<button class="btn block" data-nav="evaluasi" data-p=\'' + W.esc(JSON.stringify({ t: t.token })) + '\'>' + W.ico('rate_review') + 'Isi Evaluasi Seminar</button>'
        : '<div class="alert info">' + W.ico('info') + '<div class="sm">Evaluasi dibuka setelah Anda check-in di lokasi.</div></div>';
    var sert = t.sertifikatBisa ? '<button class="btn block" data-act="unduhSertifikat" data-t="' + W.esc(t.token) + '">' + W.ico('workspace_premium') + 'Unduh Sertifikat (PDF)</button>' + (t.nomorSertifikat ? '<div class="xs muted center mt1">Nomor: ' + W.esc(t.nomorSertifikat) + '</div>' : '')
      : '<div class="alert warn">' + W.ico('lock') + '<div class="sm"><b>Sertifikat belum tersedia.</b><br>' + t.sertifikatAlasan.map(W.esc).join('<br>') + '</div></div>';
    var batal = t.status !== 'Terdaftar';
    var html = '<div class="pub">' + kepalaPublik('Tiket Saya') +
      '<div class="card center">' + (batal ? '<div class="alert bad">' + W.ico('block') + '<div class="sm">Pendaftaran ini sudah dibatalkan oleh panitia.</div></div>' : blokQr(t)) +
      '<h1 style="font-size:21px" class="mt3">' + W.esc(t.nama) + '</h1><div class="sm muted">' + W.esc(t.institusi || t.email) + '</div>' +
      '<div class="mt2">' + W.badgeStatus(t.statusHadir) + '</div></div>' +
      '<div class="card mt2"><div class="b">' + W.esc(t.seminar.nama) + '</div>' + barisInfo(t.seminar) +
      '<dl class="kv mt3"><dt>Check-in</dt><dd>' + W.esc(W.waktu(t.checkIn)) + '</dd><dt>Check-out</dt><dd>' + W.esc(W.waktu(t.checkOut)) + '</dd></dl></div>' +
      (batal ? '' : '<div class="card mt2"><h2>Evaluasi</h2><div class="mt2">' + evaluasi + '</div></div>' +
        '<div class="card mt2"><h2>Sertifikat</h2><div class="mt2">' + sert + '</div></div>' +
        '<button class="btn out block mt2" data-act="unduhKartu" data-t="' + W.esc(t.token) + '">' + W.ico('badge') + 'Unduh Kartu Peserta (PDF)</button>') +
      '<div class="center mt3"><a href="javascript:void(0)" data-nav="landing" class="sm">← Beranda</a></div></div>';
    return { html: html };
  });
};

W.ACT.unduhSertifikat = function (el) {
  W.sibuk(el, function () {
    return W.rpc('apiSertifikatSaya', [el.dataset.t]).then(function (r) { W.unduh(r.nama, r.mime, r.base64); W.toast('Sertifikat diunduh', 'ok'); return W.navigateTo('tiket', { t: el.dataset.t }, { tanpaSkeleton: true }); });
  });
};

/* ---------- evaluasi ---------- */
var ASPEK = [['materi', 'Materi seminar'], ['pemateri', 'Pemateri'], ['penyelenggaraan', 'Penyelenggaraan'], ['fasilitas', 'Lokasi dan fasilitas'], ['keseluruhan', 'Kepuasan secara keseluruhan']];
W.rutaPublik.evaluasi = function (p) {
  var html = '<div class="pub">' + kepalaPublik('Evaluasi seminar') + '<form id="f-eval" class="card" novalidate><h2>Bagaimana seminar tadi?</h2><p class="sm muted mt1">Skala 1 (sangat kurang) sampai 5 (sangat baik). Jawaban Anda anonim bagi panitia.</p>' +
    ASPEK.map(function (a) {
      return '<div class="field mt3" role="group" aria-labelledby="lb-' + a[0] + '"><div class="lb" id="lb-' + a[0] + '">' + a[1] + ' <span class="req">*</span></div><div class="stars" data-k="' + a[0] + '">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" aria-label="' + n + ' dari 5" aria-pressed="false">' + n + '</button>'; }).join('') + '</div></div>';
    }).join('') +
    '<div class="field mt3"><label for="e-kritik">Kritik</label><textarea class="ta" id="e-kritik" maxlength="1000" placeholder="Hal yang perlu diperbaiki"></textarea></div>' +
    '<div class="field mt2"><label for="e-saran">Saran</label><textarea class="ta" id="e-saran" maxlength="1000" placeholder="Usulan topik atau perbaikan"></textarea></div>' +
    '<div class="field mt3"><div class="lb">Bersedia mengikuti seminar berikutnya?</div><div class="row"><label class="switch"><input type="radio" name="lagi" value="ya" checked> Ya</label><label class="switch"><input type="radio" name="lagi" value="tidak"> Tidak</label></div></div>' +
    '<div id="e-err" class="alert bad hidden mt2" role="alert"></div>' +
    '<button type="submit" class="btn lg block mt3" id="btn-eval">' + W.ico('send') + 'Kirim Evaluasi</button></form>' +
    '<div class="center mt3"><a href="javascript:void(0)" data-nav="tiket" data-p=\'' + W.esc(JSON.stringify({ t: p.t })) + '\' class="sm">← Kembali ke Tiket Saya</a></div></div>';
  return Promise.resolve({
    html: html, bind: function (c) {
      var nilai = {};
      W.$$('.stars', c).forEach(function (g) {
        g.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          nilai[g.dataset.k] = +b.dataset.n;
          W.$$('button', g).forEach(function (x) { var on = +x.dataset.n <= nilai[g.dataset.k]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', +x.dataset.n === nilai[g.dataset.k]); });
        });
      });
      W.$('#f-eval').addEventListener('submit', function (e) {
        e.preventDefault();
        var err = W.$('#e-err'); err.classList.add('hidden');
        if (ASPEK.some(function (a) { return !nilai[a[0]]; })) { err.innerHTML = W.ico('error') + '<span>Isi semua penilaian bintang (1–5).</span>'; err.classList.remove('hidden'); return; }
        var d = JSON.parse(JSON.stringify(nilai)); d.kritik = W.$('#e-kritik').value; d.saran = W.$('#e-saran').value; d.ikutLagi = (W.$('input[name=lagi]:checked') || {}).value;
        W.sibuk(W.$('#btn-eval'), function () {
          return W.rpc('apiKirimEvaluasi', [p.t, d]).then(function (r) { W.toast(r.pesan, 'ok'); return W.navigateTo('tiket', { t: p.t }); })
            .catch(function (e2) { err.innerHTML = W.ico('error') + '<span>' + W.esc(e2.message) + '</span>'; err.classList.remove('hidden'); });
        });
      });
    }
  });
};

/* ---------- verifikasi sertifikat ---------- */
W.rutaPublik.verifikasi = function () {
  var html = '<div class="pub">' + kepalaPublik('Verifikasi sertifikat') + '<div class="card"><h2>Periksa keaslian sertifikat</h2><p class="sm muted mt1">Masukkan kode verifikasi yang tercetak di bagian bawah sertifikat.</p>' +
    '<div class="row mt2"><input class="in grow" id="kode-ver" placeholder="Contoh: AB12CD34" aria-label="Kode verifikasi" style="text-transform:uppercase"><button class="btn" data-act="cekVer">Periksa</button></div><div id="hasil-ver" class="mt2"></div></div>' +
    '<div class="center mt3"><a href="javascript:void(0)" data-nav="landing" class="sm">← Beranda</a></div></div>';
  return Promise.resolve({ html: html });
};
W.ACT.cekVer = function (el) {
  W.sibuk(el, function () {
    return W.rpc('apiVerifikasiSertifikat', [W.$('#kode-ver').value]).then(function (r) {
      W.$('#hasil-ver').innerHTML = r.valid ? '<div class="alert ok">' + W.ico('verified', true) + '<div class="sm"><b>Sertifikat sah.</b><br>Nama: ' + W.esc(r.nama) + '<br>Seminar: ' + W.esc(r.seminar) + '<br>Nomor: ' + W.esc(r.nomor) + '</div></div>'
        : '<div class="alert bad">' + W.ico('cancel', true) + '<div class="sm"><b>Kode tidak ditemukan.</b> Pastikan penulisan kode sudah benar.</div></div>';
    });
  });
};

/* ---------- login ---------- */
W.rutaPublik.login = function () {
  var html = '<div class="login-wrap"><div class="login-card"><div class="center mb2"><div class="brand" style="justify-content:center"><div class="logo">' + W.ico('event_available', true) + '</div><div style="text-align:left">Manajemen Seminar<small>Panel Admin &amp; Panitia</small></div></div></div>' +
    '<form id="f-login" class="card" novalidate><h2>Masuk</h2><div class="stack mt2">' +
    '<div class="field"><label for="l-email">Email</label><input class="in" id="l-email" type="email" autocomplete="username" inputmode="email" autocapitalize="off" required></div>' +
    '<div class="field"><label for="l-sandi">Kata sandi</label><div style="position:relative"><input class="in" id="l-sandi" type="password" autocomplete="current-password" required style="padding-right:48px"><button type="button" class="btn ghost icon" data-act="lihatSandi" aria-label="Tampilkan kata sandi" style="position:absolute;right:2px;top:1px">' + W.ico('visibility') + '</button></div></div>' +
    '<div id="l-err" class="alert bad hidden" role="alert"></div>' +
    '<button type="submit" class="btn lg block" id="btn-login">Masuk</button></div></form>' +
    '<div class="center mt3"><a href="javascript:void(0)" data-nav="landing" class="sm">← Halaman pendaftaran</a></div></div></div>';
  return Promise.resolve({
    html: html, bind: function () {
      W.$('#l-email').focus();
      W.$('#f-login').addEventListener('submit', function (e) {
        e.preventDefault();
        var err = W.$('#l-err'); err.classList.add('hidden');
        W.sibuk(W.$('#btn-login'), function () {
          return W.rpc('apiLogin', [W.$('#l-email').value, W.$('#l-sandi').value]).then(function (r) {
            W.sesi = r.sesi; W.user = r.user;
            try { sessionStorage.setItem('sesi', r.sesi); } catch (x) {}
            return W.setelahLogin(false, r);
          }).catch(function (e2) { err.innerHTML = W.ico('error') + '<span>' + W.esc(e2.message) + '</span>'; err.classList.remove('hidden'); });
        });
      });
    }
  });
};
W.ACT.lihatSandi = function (el) {
  var i = W.$('#l-sandi'); var t = i.type === 'password'; i.type = t ? 'text' : 'password';
  el.innerHTML = W.ico(t ? 'visibility_off' : 'visibility'); el.setAttribute('aria-label', t ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
};

/* ---------- mulai ---------- */
W.mulai = function () {
  var q = new URLSearchParams(location.search); var a = { s: q.get('s') || '', t: q.get('t') || '' };
  var pulih = null;
  try { pulih = sessionStorage.getItem('sesi'); } catch (e) {}
  if (a.t) { W.navigateTo('tiket', { t: a.t }); return; }
  if (a.s) { W.navigateTo('daftar', { s: a.s }); return; }
  if (pulih) {
    W.skeletonAwal = true;
    W.$('#app-container').innerHTML = W.skeleton();
    W.rpc('apiPulihSesi', [pulih]).then(function (r) { W.sesi = pulih; W.user = r.user; return W.setelahLogin(true, r); })
      .catch(function () { try { sessionStorage.removeItem('sesi'); } catch (e) {} W.navigateTo('landing'); });
    return;
  }
  W.navigateTo('landing');
};
document.addEventListener('DOMContentLoaded', function () { W.mulai(); });
