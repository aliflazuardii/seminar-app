/* admin.js — panel Admin & Panitia (dashboard, seminar, peserta, pemindai, riwayat, laporan, sertifikat, pengaturan, pengguna). */
/* ============================================================
 * JavaScriptAdmin.html (bagian 2): panel Admin & Panitia
 * ============================================================ */
(function () {
  var esc = W.esc, ico = W.ico, rpc = W.rpc, $ = W.$, $$ = W.$$;

  var MENU = [
    { k: 'dashboard', l: 'Dashboard', i: 'dashboard' },
    { k: 'seminar', l: 'Manajemen Seminar', i: 'event_note', admin: true },
    { k: 'peserta', l: 'Peserta & Tiket', i: 'groups' },
    { k: 'pindai', l: 'Pemindai QR', i: 'qr_code_scanner' },
    { k: 'riwayat', l: 'Riwayat Kehadiran', i: 'fact_check' },
    { k: 'evaluasiHasil', l: 'Evaluasi', i: 'rate_review' },
    { k: 'laporan', l: 'Laporan', i: 'summarize' },
    { k: 'sertifikat', l: 'Sertifikat', i: 'workspace_premium', admin: true },
    { k: 'pengaturan', l: 'Pengaturan', i: 'settings', admin: true },
    { k: 'pengguna', l: 'Pengguna & Audit', i: 'manage_accounts', admin: true }
  ];
  var TANPA_SEMINAR = { seminar: 1, pengaturan: 1, pengguna: 1, akun: 1 };

  function admin() { return W.user && W.user.peran === 'Admin'; }
  function semAktif() { return W.semList.filter(function (s) { return s.id === W.semId; })[0]; }

  /* ---------- kerangka staf ---------- */
  W.layoutStaf = function (aktif, isi) {
    var menu = MENU.filter(function (m) { return !m.admin || admin(); });
    var side = '<aside class="sidebar"><div class="brand"><div class="logo">' + ico('event_available', true) + '</div><div>SemiManage<small>' + esc(W.penyelenggara || 'Manajemen Seminar') + '</small></div></div><nav aria-label="Menu utama"><div class="lbl">Menu utama</div>' +
      menu.map(function (m) { return '<a href="javascript:void(0)" data-nav="' + m.k + '" class="' + (aktif === m.k ? 'on' : '') + '"' + (aktif === m.k ? ' aria-current="page"' : '') + '>' + ico(m.i, aktif === m.k) + '<span>' + m.l + '</span></a>'; }).join('') + '</nav></aside>';
    var pilih = '';
    if (!TANPA_SEMINAR[aktif] && W.semList.length) {
      pilih = '<label class="sr" for="pilih-sem">Pilih seminar</label><select class="sel grow" id="pilih-sem" style="max-width:420px">' +
        W.semList.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === W.semId ? ' selected' : '') + '>' + esc(s.nama) + ' (' + W.tgl(s.tanggal, false) + ')</option>'; }).join('') + '</select>';
    } else pilih = '<div class="grow"></div>';
    var top = '<header class="topbar"><div class="brand"><div class="logo">' + ico('event_available', true) + '</div></div>' + pilih +
      '<button class="btn ghost" data-nav="akun" aria-label="Akun saya"><span class="avatar">' + esc(W.inisial(W.user.nama)) + '</span><span class="nm sm tb-user" style="text-align:left"><span class="nm b" style="display:block">' + esc(W.user.nama) + '</span><span class="nm xs muted">' + esc(W.user.peran) + '</span></span></button></header>';
    var bn = [['dashboard', 'Dashboard', 'dashboard'], ['peserta', 'Peserta', 'groups'], ['pindai', 'Pindai', 'qr_code_scanner'], ['riwayat', 'Kehadiran', 'fact_check'], ['akun', 'Akun', 'account_circle']];
    var bottom = '<nav class="bottomnav" aria-label="Navigasi utama">' + bn.map(function (b) {
      var on = aktif === b[0] || (b[0] === 'akun' && ['seminar', 'laporan', 'sertifikat', 'pengaturan', 'pengguna', 'evaluasiHasil'].indexOf(aktif) >= 0);
      return '<a href="javascript:void(0)" data-nav="' + b[0] + '" class="' + (on ? 'on' : '') + (b[0] === 'pindai' ? ' fab' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' +
        (b[0] === 'pindai' ? '<span class="circ">' + ico(b[2], true) + '</span>' : ico(b[2], on)) + '<span>' + b[1] + '</span></a>';
    }).join('') + '</nav>';
    return '<div class="shell">' + side + '<div><div id="staf-top">' + top + '</div><main class="main" id="staf-main">' + isi + '</main></div></div>' + bottom;
  };

  function bindLayout(c) {
    var p = $('#pilih-sem', c);
    if (p) p.addEventListener('change', function () { W.semId = p.value; try { sessionStorage.setItem('semId', W.semId); } catch (e) {} W.navigateTo(W.rute, W.params); });
  }

  function terapkanSemList(r) {
      W.semList = r.seminar.filter(function (s) { return s.status !== 'Diarsip'; });
      W.semSemua = r.seminar; W.linkDasar = location.origin + location.pathname.replace(/index\.html$/, '');
      var baru = W.semList.filter(function (s) { return s.id === W.semId; })[0];
      if (!baru && W.semList.length) {
        var kini = Date.now();
        var urut = W.semList.slice().sort(function (a, b) { return Math.abs(new Date(a.tanggal) - kini) - Math.abs(new Date(b.tanggal) - kini); });
        var jalan = urut.filter(function (s) { return s.status === 'Dibuka' || s.status === 'Ditutup'; })[0];
        W.semId = (jalan || urut[0]).id;
      } else if (!baru) W.semId = '';
  }
  function muatSemList() {
    return rpc('apiDaftarSeminar', [W.sesi], { ulang: true }).then(terapkanSemList);
  }

  /** Bungkus halaman staf: pastikan daftar seminar ada, lalu render dalam kerangka. */
  function halaman(nama, pakaiSeminar, fn) {
    W.rutaStaf[nama] = function (p) {
      var awal = W.semList.length || W.semMuat ? Promise.resolve() : muatSemList().then(function () { W.semMuat = true; });
      return awal.then(function () {
        if (pakaiSeminar && !W.semId) {
          return { html: W.layoutStaf(nama, '<div class="card"><div class="empty">' + ico('event_busy') + '<h3>Belum ada seminar</h3><p>' + (admin() ? 'Buat seminar pertama Anda untuk mulai.' : 'Anda belum ditugaskan pada seminar mana pun.') + '</p>' + (admin() ? '<button class="btn mt2" data-nav="seminar">Buat Seminar</button>' : '') + '</div></div>'), bind: bindLayout };
        }
        return fn(p);
      }).then(function (h) {
        var inner = h.html;
        return { html: h.penuh ? inner : W.layoutStaf(nama, inner), bind: function (c) { bindLayout(c); if (h.bind) h.bind(c); } };
      });
    };
  }

  W.setelahLogin = function (pulih, data) {
    try { W.semId = sessionStorage.getItem('semId') || ''; } catch (e) {}
    if (admin()) {
      // simpan alamat frontend ini agar tautan di email peserta mengarah ke sini (cukup sekali per alamat; ingat di browser)
      var basis = location.origin + location.pathname.replace(/index\.html$/, '');
      var sudah = ''; try { sudah = localStorage.getItem('urlFrontendOk') || ''; } catch (e) {}
      if (/^https:/.test(basis) && sudah !== basis) setTimeout(function () {
        rpc('apiPengaturan', [W.sesi]).then(function (r) { return r.pengaturan.urlFrontend === basis ? true : rpc('apiSimpanPengaturan', [W.sesi, { urlFrontend: basis }]).then(function () { return true; }); })
          .then(function () { try { localStorage.setItem('urlFrontendOk', basis); } catch (e) {} }).catch(function () {});
      }, 3000);
    }
    var siap = data && data.seminar ? Promise.resolve(terapkanSemList(data)) : muatSemList();   // sudah dibawa oleh respons login → 0 panggilan tambahan
    return siap.then(function () {
      W.semMuat = true;
      var t = W.tujuan; W.tujuan = null;
      if (W.user.wajibGanti) { W.toast('Silakan ganti kata sandi sementara Anda.', 'ok'); return W.navigateTo('akun'); }
      var tuju = (!pulih && t) ? W.navigateTo(t.nama, t.params) : W.navigateTo('dashboard');
      return tuju.then(function () { setTimeout(W.prefetchAwal, 800); });
    });
  };

  function pad(a) { return a; }
  function terdaftarLabel(r) { return r.terdaftar + (r.kuota ? '<small>/ ' + r.kuota + '</small>' : ''); }

  /* ============================================================
   *  DASHBOARD
   * ============================================================ */
  halaman('dashboard', false, function () {
    return rpc('apiDashboard', [W.sesi, W.semId], { ulang: true }).then(function (r) {
      W.semId = r.seminarId || W.semId;
      if (r.kosong) {
        return { html: W.layoutStaf('dashboard', '<div class="card"><div class="empty">' + ico('event_busy') + '<h3>Belum ada seminar</h3><p>' + (admin() ? 'Buat seminar pertama Anda untuk mulai.' : 'Anda belum ditugaskan pada seminar mana pun.') + '</p>' + (admin() ? '<button class="btn mt2" data-nav="seminar">Buat Seminar</button>' : '') + '</div></div>'), penuh: true };
      }
      var s = r.seminar, k = r.kartu;
      var kuotaPct = k.kuota ? Math.min(100, Math.round(k.terdaftar * 100 / k.kuota)) : 0;
      var sisa = Math.max(0, k.kuota - k.terdaftar);
      var stat = function (judul, ikon, kelas, val, sub, bar) {
        return '<div class="stat"><div class="top"><span>' + judul + '</span><span class="ico ' + kelas + '">' + ico(ikon) + '</span></div><div class="val num">' + val + '</div>' + (bar !== undefined ? '<div class="bar" aria-hidden="true"><i style="width:' + bar + '%"></i></div>' : '') + '<div class="sub">' + sub + '</div></div>';
      };
      var hero = '<section class="hero"><span class="tag">' + ico('sensors', true) + (s.status === 'Dibuka' ? 'PENDAFTARAN DIBUKA' : s.status === 'Selesai' ? 'SEMINAR SELESAI' : s.status.toUpperCase()) + '</span>' +
        '<h1>Halo, ' + esc(W.user.nama.split(' ')[0]) + '</h1><p><b>' + esc(s.nama) + '</b>. ' + k.hadir + ' dari ' + k.terdaftar + ' peserta terdaftar telah hadir' + (k.belumHadir ? ' — ' + k.belumHadir + ' belum hadir.' : '.') + '</p>' +
        '<div class="meta"><span>' + ico('calendar_month') + esc(W.tgl(s.tanggal)) + '</span><span>' + ico('schedule') + esc(s.jamMulai) + ' – ' + esc(s.jamSelesai) + ' WIB</span><span>' + ico('location_on') + esc(s.lokasi) + '</span></div>' +
        '<div class="actions"><button class="btn white" data-nav="pindai">' + ico('qr_code_scanner') + 'Buka Pemindai QR</button><button class="btn glass" data-nav="laporan">' + ico('download') + 'Unduh Rekap</button></div></section>';
      var stats = '<div class="stats mt2">' +
        stat('Terdaftar', 'groups', 'i-blue', terdaftarLabel(k), 'Kuota terisi ' + kuotaPct + '%', kuotaPct) +
        stat('Hadir', 'how_to_reg', 'i-green', k.hadir, k.sudahPulang + ' sudah check-out') +
        stat('Belum Hadir', 'pending_actions', 'i-orange', k.belumHadir + k.tidakHadir, k.tidakHadir ? k.tidakHadir + ' tidak hadir' : 'Menunggu check-in') +
        stat('Kehadiran', 'donut_large', 'i-blue', k.persen + '<small>%</small>', k.hadir + ' dari ' + k.terdaftar + ' peserta', k.persen) +
        stat('Sisa Kuota', 'event_seat', sisa ? 'i-green' : 'i-red', sisa, sisa ? 'Kursi tersedia' : 'Kuota penuh') + '</div>';
      var tbl = W.Tbl.html({
        id: 'tb-belum', rows: r.belumHadir, perPage: 8, cari: function (x) { return x.nama + ' ' + x.email + ' ' + x.institusi + ' ' + x.telepon; }, placeholder: 'Cari nama, email, atau institusi…',
        kosong: { ikon: 'celebration', judul: 'Semua peserta sudah hadir', teks: 'Tidak ada peserta yang belum check-in.' },
        cols: [
          { h: 'Peserta', f: function (x) { return '<div class="who"><span class="avatar">' + esc(W.inisial(x.nama)) + '</span><div style="min-width:0"><div class="n">' + esc(x.nama) + '</div><div class="e">' + esc(x.email) + '</div></div></div>'; } },
          { h: 'Institusi & Kontak', l: 'Institusi', f: function (x) { return '<div>' + esc(x.institusi || '–') + '</div><div class="xs muted">' + esc(x.telepon) + '</div>'; } },
          { h: 'Status', f: function (x) { return W.badgeStatus(x.status); } },
          { h: 'Aksi', cls: 'act', f: function (x) { return '<button class="btn sm" data-act="absenkan" data-id="' + esc(x.id) + '" data-nm="' + esc(x.nama) + '">' + ico('login') + 'Absenkan</button>'; } }
        ]
      });
      var aktivitas = r.terbaru.length ? '<div class="timeline">' + r.terbaru.map(function (l) {
        return '<div class="it"><span class="dot ' + (l.hasil === 'Berhasil' ? '' : 'bad') + '"></span><div class="grow"><div class="b">' + esc(l.nama) + '</div><div class="xs muted">' + esc(l.pesan) + ' · ' + esc(l.petugas) + ' · ' + esc(W.jam(l.waktu)) + '</div></div>' + W.badgeStatus(l.hasil === 'Berhasil' ? 'Hadir' : 'Dibatalkan').replace(/>[^<]*</, '>' + esc(l.hasil) + '<') + '</div>';
      }).join('') + '</div>' : '<p class="sm muted">Belum ada aktivitas scan.</p>';
      var kap = r.kapasitas ? '<div class="card mt2"><h2>' + ico('mail') + ' Kapasitas Email</h2><div class="mt2 sm"><div class="row between"><span>Sisa kuota email hari ini</span><b class="num">' + r.kapasitas.sisaEmail + '</b></div>' +
        '<div class="row between mt1"><span>Antrean email</span><b class="num">' + r.kapasitas.antreEmail + '</b></div></div>' +
        (r.kapasitas.sisaEmail < 20 ? '<div class="alert warn mt2 sm">' + ico('warning') + '<span>Kuota email hampir habis. Peserta tetap dapat melihat QR di layar konfirmasi dan Tiket Saya.</span></div>' : '') + '</div>' : '';
      var html = hero + stats + '<div class="grid2 s-r mt2"><section class="card"><div class="row between wrap mb2"><div><h2>Peserta Belum Hadir</h2><p class="sm muted">' + (k.belumHadir + k.tidakHadir) + ' peserta belum tercatat check-in</p></div><button class="btn out sm" data-act="segarkan">' + ico('sync') + 'Sinkronkan</button></div>' + tbl + '</section>' +
        '<aside><section class="card"><h2>' + ico('history') + ' Aktivitas Terbaru</h2><div class="mt2">' + aktivitas + '</div></section>' + kap + '</aside></div>';
      return {
        html: html, bind: function () {
          W.Tbl.mulai('tb-belum');
          W.timer = setInterval(function () { if (W.rute === 'dashboard' && !document.hidden && !$('.overlay')) W.navigateTo('dashboard', {}, { tanpaSkeleton: true }); }, 30000);
        }
      };
    });
  });
  W.ACT.segarkan = function (el) { W.sibuk(el, function () { return W.navigateTo(W.rute, W.params, { tanpaSkeleton: true }); }); };
  W.ACT.absenkan = function (el) {
    W.konfirmasi('Catat check-in manual?', 'Peserta <b>' + esc(el.dataset.nm) + '</b> akan dicatat hadir sekarang.', 'Catat check-in').then(function (ya) {
      if (!ya) return;
      W.sibuk(el, function () {
        return rpc('apiScanManual', [W.sesi, W.semId, el.dataset.id, 'in']).then(function (r) {
          W.toast(r.hasil.tipe === 'sukses' ? r.hasil.nama + ': check-in tercatat' : r.hasil.pesan, r.hasil.tipe === 'sukses' ? 'ok' : 'bad');
          return W.navigateTo(W.rute, W.params, { tanpaSkeleton: true });
        });
      });
    });
  };

  /* ============================================================
   *  MANAJEMEN SEMINAR (admin)
   * ============================================================ */
  halaman('seminar', false, function () {
    if (!admin()) return Promise.reject(new Error('Hanya Admin yang dapat mengelola seminar.'));
    return muatSemList().then(function () {
      var semua = W.semSemua || [];
      var tbl = W.Tbl.html({
        id: 'tb-sem', rows: semua, perPage: 10, cari: function (s) { return s.nama + ' ' + s.lokasi; }, placeholder: 'Cari seminar…',
        chips: { opsi: ['Semua', 'Draf', 'Dibuka', 'Ditutup', 'Selesai', 'Diarsip'], f: function (s) { return s.status; } },
        kosong: { ikon: 'event_note', judul: 'Belum ada seminar', teks: 'Klik "Seminar Baru" untuk membuat.' },
        cols: [
          { h: 'Seminar', f: function (s) { return '<div class="b">' + esc(s.nama) + '</div><div class="xs muted">' + esc(s.lokasi) + '</div>'; } },
          { h: 'Jadwal', f: function (s) { return '<div>' + esc(W.tgl(s.tanggal, false)) + '</div><div class="xs muted">' + esc(s.jamMulai) + '–' + esc(s.jamSelesai) + '</div>'; } },
          { h: 'Peserta', f: function (s) { return '<span class="num b">' + s.terdaftar + '</span> / ' + s.kuota; } },
          { h: 'Status', f: function (s) { return W.badgeStatus(s.status); } },
          { h: 'Aksi', cls: 'act', f: function (s) {
            return '<button class="btn out sm" data-act="ubahSem" data-id="' + esc(s.id) + '">' + ico('edit') + 'Ubah</button> ' +
              '<button class="btn out sm icon" data-act="linkSem" data-id="' + esc(s.id) + '" aria-label="Salin tautan pendaftaran" title="Salin tautan pendaftaran">' + ico('link') + '</button> ' +
              '<button class="btn danger out sm icon" data-act="hapusSem" data-id="' + esc(s.id) + '" aria-label="Hapus atau arsipkan" title="Hapus / arsipkan">' + ico('delete') + '</button>'; } }
        ],
        extra: '<button class="btn" data-act="barusem">' + ico('add') + 'Seminar Baru</button>'
      });
      var info = '<div class="alert info mb2 sm">' + ico('link') + '<div>Tautan pendaftaran tiap seminar berbentuk <b>' + esc(W.linkDasar) + '?s=ID-SEMINAR</b>. Gunakan tombol <b>tautan</b> di baris seminar untuk menyalinnya lalu bagikan ke calon peserta.</div></div>';
      return { html: '<div class="pagehead"><div><h1>Manajemen Seminar</h1><p class="muted sm">Atur jadwal, kuota, pemateri, dan status pendaftaran.</p></div></div>' + info + '<div class="card">' + tbl + '</div>', bind: function () { W.Tbl.mulai('tb-sem'); } };
    });
  });

  function cariSem(id) { return (W.semSemua || []).filter(function (s) { return s.id === id; })[0]; }
  W.ACT.barusem = function () { formSeminar(null); };
  W.ACT.ubahSem = function (el) { formSeminar(cariSem(el.dataset.id)); };
  W.ACT.linkSem = function (el) {
    var s = cariSem(el.dataset.id);
    if (s.status === 'Draf') W.toast('Seminar masih berstatus Draf: ubah ke "Dibuka" agar pendaftaran bisa dipakai.', 'bad');
    W.salin(W.linkDasar + '?s=' + s.id);
  };
  W.ACT.hapusSem = function (el) {
    var s = cariSem(el.dataset.id);
    W.konfirmasi('Hapus atau arsipkan seminar?', 'Seminar <b>' + esc(s.nama) + '</b>' + (s.terdaftar ? ' sudah punya peserta, sehingga hanya akan <b>diarsipkan</b> (data tetap tersimpan).' : ' belum punya peserta dan akan <b>dihapus</b>.'), s.terdaftar ? 'Arsipkan' : 'Hapus', true).then(function (ya) {
      if (!ya) return;
      rpc('apiHapusSeminar', [W.sesi, s.id]).then(function (r) { W.toast(r.pesan, 'ok'); return muatSemList().then(function () { return W.navigateTo('seminar', {}, { tanpaSkeleton: true }); }); }).catch(function (e) { W.toast(e.message, 'bad'); });
    });
  };

  function unggahKe(jenis, file) {
    return W.bacaGambar(file, jenis === 'template' ? 2000 : jenis === 'foto' ? 600 : 1600, jenis === 'logo' || jenis === 'ttd').then(function (g) {
      return rpc('apiUnggahAset', [W.sesi, jenis, g.nama, g.mime, g.base64]).then(function (r) { r.pratinjau = g.url; return r; });
    });
  }

  function barisPemateri(m) {
    m = m || {};
    return '<div class="list-item pem" data-foto="' + esc(m.fotoId || '') + '" style="align-items:flex-start"><div class="grow"><div class="form-grid c2"><div class="field"><label>Nama pemateri</label><input class="in p-nama" value="' + esc(m.nama || '') + '"></div>' +
      '<div class="field"><label>Jabatan / instansi</label><input class="in p-jab" value="' + esc(m.jabatan || '') + '"></div></div>' +
      '<div class="row mt1"><img class="p-img" src="' + esc(m.fotoUrl || '') + '" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;background:var(--blue-soft);' + (m.fotoUrl ? '' : 'visibility:hidden') + '">' +
      '<label class="btn out sm">' + ico('add_a_photo') + 'Foto<input type="file" accept="image/*" class="sr p-file"></label></div></div>' +
      '<button type="button" class="btn danger out sm icon" data-act="hapusPem" aria-label="Hapus pemateri">' + ico('close') + '</button></div>';
  }
  W.ACT.hapusPem = function (el) { el.closest('.pem').remove(); };

  function formSeminar(s) {
    s = s || { nama: '', deskripsi: '', tanggal: '', jamMulai: '08:00', jamSelesai: '12:00', lokasi: '', kuota: 100, batasDaftar: '', status: 'Draf', posterId: '', posterUrl: '', pemateri: [] };
    var st = { posterId: s.posterId || '' };
    var isi = '<form id="f-sem" novalidate class="form-grid c2">' +
      '<div class="field span2"><label for="s-nama">Nama seminar <span class="req">*</span></label><input class="in" id="s-nama" value="' + esc(s.nama) + '"></div>' +
      '<div class="field span2"><label for="s-desk">Deskripsi</label><textarea class="ta" id="s-desk" maxlength="2000">' + esc(s.deskripsi) + '</textarea></div>' +
      '<div class="field"><label for="s-tgl">Tanggal <span class="req">*</span></label><input class="in" type="date" id="s-tgl" value="' + esc(s.tanggal) + '"></div>' +
      '<div class="field"><label for="s-lokasi">Lokasi <span class="req">*</span></label><input class="in" id="s-lokasi" value="' + esc(s.lokasi) + '"></div>' +
      '<div class="field"><label for="s-mulai">Jam mulai <span class="req">*</span></label><input class="in" type="time" id="s-mulai" value="' + esc(s.jamMulai) + '"></div>' +
      '<div class="field"><label for="s-selesai">Jam selesai <span class="req">*</span></label><input class="in" type="time" id="s-selesai" value="' + esc(s.jamSelesai) + '"></div>' +
      '<div class="field"><label for="s-kuota">Kuota <span class="req">*</span></label><input class="in" type="number" min="1" id="s-kuota" value="' + esc(s.kuota) + '">' + (s.terdaftar ? '<div class="hint">Saat ini ' + s.terdaftar + ' peserta terdaftar (kuota tidak boleh lebih kecil).</div>' : '') + '</div>' +
      '<div class="field"><label for="s-batas">Batas akhir pendaftaran</label><input class="in" type="datetime-local" id="s-batas" value="' + esc((s.batasDaftar || '').replace(' ', 'T')) + '"><div class="hint">Kosongkan jika tanpa batas waktu. Pendaftaran ditutup otomatis.</div></div>' +
      '<div class="field"><label for="s-status">Status</label><select class="sel" id="s-status" style="width:100%">' + ['Draf', 'Dibuka', 'Ditutup', 'Selesai'].map(function (x) { return '<option' + (s.status === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select><div class="hint">Peserta hanya bisa mendaftar saat status "Dibuka".</div></div>' +
      '<div class="field"><div class="lb">Poster seminar</div><div class="upl"><img id="s-poster" src="' + esc(s.posterUrl || '') + '" alt="" style="' + (s.posterUrl ? '' : 'visibility:hidden') + '"><label class="btn out sm">' + ico('upload') + 'Pilih gambar<input type="file" accept="image/*" id="s-posterfile" class="sr"></label></div></div>' +
      '<div class="span2"><div class="row between mb2"><div class="b">Pemateri</div><button type="button" class="btn out sm" data-act="tambahPem">' + ico('add') + 'Tambah pemateri</button></div><div id="s-pem">' + (s.pemateri.length ? s.pemateri.map(barisPemateri).join('') : barisPemateri()) + '</div></div>' +
      '<div id="s-err" class="alert bad span2 hidden" role="alert"></div></form>';
    W.modal({
      judul: s.id ? 'Ubah Seminar' : 'Seminar Baru', isi: isi, lebar: true, kunci: true,
      tombol: [{ label: 'Batal', kelas: 'out' }, {
        label: 'Simpan', aksi: function (m, b) {
          var err = $('#s-err', m.el); err.classList.add('hidden');
          var d = {
            id: s.id, nama: $('#s-nama', m.el).value, deskripsi: $('#s-desk', m.el).value, tanggal: $('#s-tgl', m.el).value, jamMulai: $('#s-mulai', m.el).value, jamSelesai: $('#s-selesai', m.el).value,
            lokasi: $('#s-lokasi', m.el).value, kuota: $('#s-kuota', m.el).value, batasDaftar: $('#s-batas', m.el).value, status: $('#s-status', m.el).value, posterId: st.posterId,
            pemateri: $$('.pem', m.el).map(function (r) { return { nama: $('.p-nama', r).value, jabatan: $('.p-jab', r).value, fotoId: r.dataset.foto }; })
          };
          W.sibuk(b, function () {
            return rpc('apiSimpanSeminar', [W.sesi, d]).then(function () {
              m.tutup(); W.toast('Seminar tersimpan', 'ok');
              return muatSemList().then(function () { return W.navigateTo('seminar', {}, { tanpaSkeleton: true }); });
            }).catch(function (e) { err.innerHTML = ico('error') + '<span>' + esc(e.message) + '</span>'; err.classList.remove('hidden'); });
          });
          return false;
        }
      }],
      bind: function (m) {
        $('#s-posterfile', m.el).addEventListener('change', function (e) {
          var f = e.target.files[0]; if (!f) return;
          var im = $('#s-poster', m.el); W.toast('Mengunggah poster…');
          unggahKe('poster', f).then(function (r) { st.posterId = r.id; im.src = r.pratinjau; im.style.visibility = 'visible'; W.toast('Poster terunggah', 'ok'); }).catch(function (x) { W.toast(x.message, 'bad'); });
        });
        m.el.addEventListener('change', function (e) {
          if (!e.target.classList.contains('p-file')) return;
          var row = e.target.closest('.pem'), f = e.target.files[0]; if (!f) return;
          unggahKe('foto', f).then(function (r) { row.dataset.foto = r.id; var im = $('.p-img', row); im.src = r.pratinjau; im.style.visibility = 'visible'; }).catch(function (x) { W.toast(x.message, 'bad'); });
        });
      }
    });
  }
  W.ACT.tambahPem = function () { var w = $('#s-pem'); w.insertAdjacentHTML('beforeend', barisPemateri()); };

  /* ============================================================
   *  PESERTA
   * ============================================================ */
  var PES = {};
  halaman('peserta', true, function () {
    return rpc('apiDaftarPeserta', [W.sesi, W.semId], { ulang: true }).then(function (r) {
      PES = {}; r.peserta.forEach(function (p) { PES[p.id] = p; });
      var tbl = W.Tbl.html({
        id: 'tb-pes', rows: r.peserta, perPage: 10, cari: function (p) { return p.nama + ' ' + p.email + ' ' + p.institusi + ' ' + p.telepon; }, placeholder: 'Cari nama, email, atau institusi…',
        chips: { opsi: ['Semua', 'Belum hadir', 'Hadir', 'Hadir tanpa check-out', 'Tidak hadir', 'Dibatalkan'], f: function (p) { return p.status; } },
        kosong: { ikon: 'groups', judul: 'Belum ada peserta', teks: 'Peserta yang mendaftar akan muncul di sini.' },
        extra: '<button class="btn" data-act="tambahPes">' + ico('person_add') + 'Tambah Peserta</button>',
        cols: [
          { h: 'Peserta', f: function (p) { return '<div class="who"><span class="avatar">' + esc(W.inisial(p.nama)) + '</span><div style="min-width:0"><div class="n">' + esc(p.nama) + '</div><div class="e">' + esc(p.email) + '</div></div></div>'; } },
          { h: 'Institusi & HP', l: 'Institusi', f: function (p) { return '<div>' + esc(p.institusi || '–') + '</div><div class="xs muted">' + esc(p.telepon) + '</div>'; } },
          { h: 'Status', f: function (p) { return W.badgeStatus(p.status); } },
          { h: 'Email', f: function (p) { return W.badgeStatus(p.emailStatus); } },
          { h: 'Aksi', cls: 'act', f: function (p) {
            if (p.status === 'Dibatalkan') return '<span class="xs muted">–</span>';
            return '<button class="btn out sm icon" data-act="ubahPes" data-id="' + esc(p.id) + '" aria-label="Ubah data" title="Ubah data">' + ico('edit') + '</button> ' +
              '<button class="btn out sm icon" data-act="emailPes" data-id="' + esc(p.id) + '" aria-label="Kirim ulang email" title="Kirim ulang email">' + ico('forward_to_inbox') + '</button> ' +
              '<button class="btn out sm icon" data-act="tokenPes" data-id="' + esc(p.id) + '" aria-label="Buat QR baru" title="Buat QR baru (QR lama hangus)">' + ico('autorenew') + '</button> ' +
              '<button class="btn danger out sm icon" data-act="batalPes" data-id="' + esc(p.id) + '" aria-label="Batalkan pendaftaran" title="Batalkan pendaftaran">' + ico('person_off') + '</button>'; } }
        ]
      });
      var s = r.seminar, k = r.kartu;
      var html = '<div class="pagehead"><div><h1>Peserta & Tiket</h1><p class="muted sm">' + esc(s.nama) + ' · ' + k.terdaftar + ' terdaftar dari kuota ' + k.kuota + '</p></div></div><div class="card">' + tbl + '</div>';
      return { html: html, bind: function () { W.Tbl.mulai('tb-pes'); } };
    });
  });

  function formPeserta(p) {
    p = p || { nama: '', email: '', telepon: '', institusi: '' };
    var isi = '<form class="form-grid" novalidate><div class="field"><label for="p-nama">Nama lengkap <span class="req">*</span></label><input class="in" id="p-nama" value="' + esc(p.nama) + '"></div>' +
      '<div class="field"><label for="p-email">Email <span class="req">*</span></label><input class="in" id="p-email" type="email" value="' + esc(p.email) + '"></div>' +
      '<div class="field"><label for="p-hp">Nomor HP <span class="req">*</span></label><input class="in" id="p-hp" type="tel" value="' + esc(p.telepon) + '"></div>' +
      '<div class="field"><label for="p-inst">Institusi</label><input class="in" id="p-inst" value="' + esc(p.institusi) + '"></div><div id="p-err" class="alert bad hidden" role="alert"></div></form>';
    W.modal({
      judul: p.id ? 'Ubah Peserta' : 'Tambah Peserta', isi: isi, kunci: true,
      tombol: [{ label: 'Batal', kelas: 'out' }, {
        label: 'Simpan', aksi: function (m, b) {
          var err = $('#p-err', m.el); err.classList.add('hidden');
          var d = { id: p.id, nama: $('#p-nama', m.el).value, email: $('#p-email', m.el).value, telepon: $('#p-hp', m.el).value, institusi: $('#p-inst', m.el).value };
          W.sibuk(b, function () {
            return rpc('apiSimpanPeserta', [W.sesi, W.semId, d]).then(function () { m.tutup(); W.toast(p.id ? 'Data peserta diperbarui' : 'Peserta ditambahkan, email tiket diantrekan', 'ok'); return W.navigateTo('peserta', {}, { tanpaSkeleton: true }); })
              .catch(function (e) { err.innerHTML = ico('error') + '<span>' + esc(e.message) + '</span>'; err.classList.remove('hidden'); });
          });
          return false;
        }
      }]
    });
  }
  W.ACT.tambahPes = function () { formPeserta(null); };
  W.ACT.ubahPes = function (el) { formPeserta(PES[el.dataset.id]); };
  W.ACT.emailPes = function (el) { W.sibuk(el, function () { return rpc('apiKirimUlangEmail', [W.sesi, W.semId, el.dataset.id]).then(function (r) { W.toast(r.pesan, 'ok'); }); }); };
  W.ACT.tokenPes = function (el) {
    var p = PES[el.dataset.id];
    W.konfirmasi('Buat QR baru?', 'QR lama milik <b>' + esc(p.nama) + '</b> langsung <b>tidak berlaku</b>. QR baru akan dikirim ke emailnya.', 'Buat QR baru', true).then(function (ya) {
      if (ya) W.sibuk(el, function () { return rpc('apiTokenBaru', [W.sesi, W.semId, p.id]).then(function (r) { W.toast(r.pesan, 'ok'); }); });
    });
  };
  W.ACT.batalPes = function (el) {
    var p = PES[el.dataset.id];
    W.konfirmasi('Batalkan pendaftaran?', 'Pendaftaran <b>' + esc(p.nama) + '</b> dibatalkan dan QR-nya tidak bisa dipakai lagi. Kuota akan kembali tersedia.', 'Batalkan pendaftaran', true).then(function (ya) {
      if (ya) W.sibuk(el, function () { return rpc('apiBatalkanPeserta', [W.sesi, W.semId, p.id]).then(function () { W.toast('Pendaftaran dibatalkan', 'ok'); return W.navigateTo('peserta', {}, { tanpaSkeleton: true }); }); });
    });
  };

  /* ============================================================
   *  PEMINDAI QR
   * ============================================================ */
  var SC = { stream: null, timer: null, det: null, busy: false, mode: 'in', terakhir: '', tTerakhir: 0, sukses: 0, riwayat: [], canvas: null, tutupHasil: null };

  W.hentikanKamera = function () {
    if (SC.timer) { clearInterval(SC.timer); SC.timer = null; }
    if (SC.stream) { try { SC.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} SC.stream = null; }
    var v = $('#cam'); if (v) v.srcObject = null;
  };

  function bunyi(ok) {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      SC.audio = SC.audio || new A();
      var o = SC.audio.createOscillator(), g = SC.audio.createGain();
      o.type = 'sine'; o.frequency.value = ok ? 880 : 220; g.gain.value = 0.15;
      o.connect(g); g.connect(SC.audio.destination); o.start(); o.stop(SC.audio.currentTime + (ok ? 0.12 : 0.35));
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(ok ? 60 : [120, 60, 120]); } catch (e) {}
  }

  function tampilHasil(h) {
    var ok = h.tipe === 'sukses';
    bunyi(ok);
    var lama = $('#hasil'); if (lama) lama.remove();
    var el = document.createElement('div');
    el.id = 'hasil'; el.className = 'hasil ' + h.tipe; el.setAttribute('role', 'alert');
    el.innerHTML = '<div class="jd">' + ico(ok ? 'check_circle' : 'cancel', true) + esc(h.judul) + '</div>' + (h.nama ? '<div class="nm">' + esc(h.nama) + '</div>' : '') + '<div class="ps">' + esc(h.pesan) + (h.durasi ? ' Durasi: ' + esc(h.durasi) + '.' : '') + '</div><div class="xs mt1" style="opacity:.8">Ketuk untuk menutup</div>';
    $('#app-container').appendChild(el);
    SC.riwayat.unshift({ ok: ok, nama: h.nama || '—', pesan: h.pesan, jam: new Date().toTimeString().substring(0, 5), mode: SC.mode });
    SC.riwayat = SC.riwayat.slice(0, 6);
    if (ok) SC.sukses++;
    var rs = $('#sesi-riwayat'); if (rs) rs.innerHTML = htmlRiwayatSesi();
    var cs = $('#sesi-hitung'); if (cs) cs.textContent = SC.sukses;
    var tutup = function () { if (el.parentNode) el.remove(); SC.busy = false; clearTimeout(SC.tutupHasil); };
    SC.tutupHasil = setTimeout(tutup, ok ? 2200 : 3400);
    el.addEventListener('click', tutup);
  }

  function htmlRiwayatSesi() {
    if (!SC.riwayat.length) return '<p class="sm muted">Belum ada pemindaian pada sesi ini.</p>';
    return SC.riwayat.map(function (r) { return '<div class="it" style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px"><span class="dot ' + (r.ok ? '' : 'bad') + '" style="width:10px;height:10px;border-radius:50%;margin-top:6px;flex:none;background:' + (r.ok ? 'var(--ok)' : 'var(--bad)') + '"></span><div class="grow"><div class="b">' + esc(r.nama) + '</div><div class="xs muted">' + (r.mode === 'in' ? 'Check-in' : 'Check-out') + ' · ' + esc(r.pesan) + ' · ' + r.jam + '</div></div></div>'; }).join('');
  }

  function kirimScan(kode) {
    SC.busy = true;
    var pending = $('#hasil'); if (pending) pending.remove();
    var tunggu = document.createElement('div');
    tunggu.id = 'hasil'; tunggu.className = 'hasil'; tunggu.style.background = '#1E3A8A';
    tunggu.innerHTML = '<div class="jd"><span class="spin"></span>MEMERIKSA…</div>';
    $('#app-container').appendChild(tunggu);
    return rpc('apiScan', [W.sesi, W.semId, kode, SC.mode]).then(function (r) { tampilHasil(r.hasil); })
      .catch(function (e) { tampilHasil({ tipe: 'ditolak', judul: 'GAGAL', pesan: e.message, nama: '' }); });
  }

  function tanganiKode(kode) {
    kode = String(kode || '').trim();
    var m = /[?&]t=([^&#\s]+)/.exec(kode); if (m) kode = decodeURIComponent(m[1]);
    if (!kode || SC.busy) return;
    if (kode === SC.terakhir && Date.now() - SC.tTerakhir < 4000) return;
    SC.terakhir = kode; SC.tTerakhir = Date.now();
    kirimScan(kode);
  }

  /** Cadangan tanpa izin kamera langsung: baca QR dari foto yang dipotret lewat aplikasi kamera HP. */
  function bacaQrDariFoto(file) {
    return new Promise(function (res, rej) {
      if (!window.jsQR) return rej(new Error('Pembaca QR belum siap. Muat ulang halaman.'));
      var url = URL.createObjectURL(file), im = new Image();
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Foto tidak dapat dibuka.')); };
      im.onload = function () {
        URL.revokeObjectURL(url);
        var hasil = null, ukuran = [1280, 800, 1920, 500];
        for (var i = 0; i < ukuran.length && !hasil; i++) {
          var k = Math.min(1, ukuran[i] / Math.max(im.width, im.height));
          var w = Math.round(im.width * k), h = Math.round(im.height * k);
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h);
          var d = g.getImageData(0, 0, w, h);
          var r = window.jsQR(d.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (r && r.data) hasil = r.data;
        }
        res(hasil);
      };
      im.src = url;
    });
  }

  function mulaiKamera() {
    var v = $('#cam'), info = $('#cam-info'), off = $('#cam-off');
    if (!v) return;
    W.hentikanKamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      off.innerHTML = '<div>' + ico('no_photography') + '<p class="mt1">Kamera tidak tersedia di peramban ini. Gunakan tombol <b>Foto QR</b> di bawah, input kode manual, atau pencarian nama.</p></div>'; off.classList.remove('hidden'); return;
    }
    off.classList.add('hidden');
    info.textContent = 'Menyalakan kamera…';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }).then(function (stream) {
      if (W.rute !== 'pindai') { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      SC.stream = stream; v.srcObject = stream; v.setAttribute('playsinline', ''); v.muted = true;
      return v.play().then(function () {
        info.textContent = 'Arahkan kamera ke QR peserta';
        SC.det = null;
        try { if ('BarcodeDetector' in window) SC.det = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { SC.det = null; }
        SC.canvas = SC.canvas || document.createElement('canvas');
        SC.timer = setInterval(function () {
          if (SC.busy || !v.videoWidth) return;
          if (SC.det) {
            SC.det.detect(v).then(function (c) { if (c && c.length) tanganiKode(c[0].rawValue); }).catch(function () { SC.det = null; });
          } else if (window.jsQR) {
            var k = Math.min(1, 560 / v.videoWidth), w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
            SC.canvas.width = w; SC.canvas.height = h;
            var g = SC.canvas.getContext('2d', { willReadFrequently: true }); g.drawImage(v, 0, 0, w, h);
            var d = g.getImageData(0, 0, w, h);
            var c = window.jsQR(d.data, w, h, { inversionAttempts: 'dontInvert' });
            if (c && c.data) tanganiKode(c.data);
          }
        }, 160);
      });
    }).catch(function (e) {
      var izin = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      off.innerHTML = '<div>' + ico('videocam_off') + '<p class="b mt1">' + (izin ? 'Izin kamera ditolak' : 'Kamera tidak bisa dibuka') + '</p><p class="sm mt1">' + (izin ? 'Ketuk ikon gembok / pengaturan di samping alamat situs, izinkan <b>Kamera</b>, lalu tekan Coba lagi.' : 'Pastikan kamera tidak dipakai aplikasi lain.') + ' Gunakan tombol <b>Foto QR</b> di bawah (paling mudah), atau input kode manual / cari nama.</p><p class="xs mt1" style="opacity:.8">Kode galat: ' + esc((e && e.name) || 'tidak diketahui') + '</p><button class="btn mt2" data-act="kameraUlang">Coba lagi</button></div>';
      off.classList.remove('hidden'); info.textContent = '';
    });
  }
  W.ACT.kameraUlang = function () { mulaiKamera(); };

  halaman('pindai', true, function () {
    var s = semAktif();
    var html = '<div class="pagehead"><div><h1>Pemindai QR</h1><p class="muted sm">' + esc(s ? s.nama : '') + '</p></div><div class="badge blue">' + ico('verified', true) + '<span id="sesi-hitung">' + SC.sukses + '</span> berhasil sesi ini</div></div>' +
      '<div class="grid2 s-r"><div><div class="seg mb2" role="group" aria-label="Mode absensi"><button type="button" data-act="mode" data-m="in" class="' + (SC.mode === 'in' ? 'on' : '') + '" aria-pressed="' + (SC.mode === 'in') + '">' + ico('login') + 'Check-in</button><button type="button" data-act="mode" data-m="out" class="' + (SC.mode === 'out' ? 'on' : '') + '" aria-pressed="' + (SC.mode === 'out') + '">' + ico('logout') + 'Check-out</button></div>' +
      '<div class="scanner"><video id="cam" autoplay playsinline muted></video><div class="frame"></div><div class="off hidden" id="cam-off"></div><div class="hint" id="cam-info"></div></div>' +
      '<div class="row mt2 wrap"><button class="btn out grow" data-act="kameraUlang">' + ico('cameraswitch') + 'Mulai ulang kamera</button><label class="btn warn grow" style="cursor:pointer">' + ico('photo_camera') + 'Foto QR (cadangan)<input type="file" accept="image/*" capture="environment" id="foto-qr" class="sr"></label></div><p class="xs muted mt1">Jika kamera langsung tidak bisa dibuka, ketuk <b>Foto QR</b>: kamera HP terbuka, potret QR peserta, lalu terbaca otomatis.</p></div>' +
      '<aside><section class="card"><h2>' + ico('keyboard') + ' Cadangan manual</h2><p class="sm muted mt1">Jika kamera bermasalah atau QR rusak.</p>' +
      '<div class="field mt2"><label for="kode-manual">Kode QR</label><div class="row"><input class="in grow" id="kode-manual" placeholder="Tempel / ketik kode"><button class="btn" data-act="kirimManual">Kirim</button></div></div>' +
      '<div class="field mt2"><label for="cari-nama">Cari nama peserta</label><div class="searchbox">' + ico('search') + '<input class="in" id="cari-nama" type="search" placeholder="Ketik minimal 2 huruf"></div></div><div id="hasil-cari" class="mt2"></div></section>' +
      '<section class="card mt2"><h2>' + ico('history') + ' Sesi ini</h2><div class="mt1" id="sesi-riwayat">' + htmlRiwayatSesi() + '</div></section></aside></div>';
    return {
      html: html, bind: function () {
        mulaiKamera();
        $('#foto-qr').addEventListener('change', function (e) {
          var f = e.target.files[0]; e.target.value = ''; if (!f) return;
          if (SC.busy) return;
          W.toast('Membaca foto…');
          bacaQrDariFoto(f).then(function (kode) {
            if (!kode) { W.toast('QR tidak terbaca. Dekatkan kamera, pastikan QR utuh dan terang, lalu foto ulang.', 'bad'); return; }
            SC.terakhir = ''; tanganiKode(kode);
          }).catch(function (x) { W.toast(x.message, 'bad'); });
        });
        var tmr = null;
        $('#cari-nama').addEventListener('input', function (e) {
          clearTimeout(tmr); var q = e.target.value;
          tmr = setTimeout(function () {
            if (q.trim().length < 2) { $('#hasil-cari').innerHTML = ''; return; }
            rpc('apiCariPeserta', [W.sesi, W.semId, q]).then(function (r) {
              $('#hasil-cari').innerHTML = r.hasil.length ? r.hasil.map(function (p) { return '<div class="list-item"><span class="avatar">' + esc(W.inisial(p.nama)) + '</span><div class="grow"><div class="b trunc">' + esc(p.nama) + '</div><div class="xs muted trunc">' + esc(p.institusi || p.email) + '</div></div><button class="btn sm" data-act="absenManual" data-id="' + esc(p.id) + '">' + (SC.mode === 'in' ? 'Check-in' : 'Check-out') + '</button></div>'; }).join('') : '<p class="sm muted">Tidak ditemukan.</p>';
            }).catch(function (x) { W.toast(x.message, 'bad'); });
          }, 350);
        });
        $('#kode-manual').addEventListener('keydown', function (e) { if (e.key === 'Enter') W.ACT.kirimManual(); });
      }
    };
  });
  W.ACT.mode = function (el) {
    SC.mode = el.dataset.m;
    $$('.seg button').forEach(function (b) { var on = b.dataset.m === SC.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    SC.terakhir = '';
  };
  W.ACT.kirimManual = function () {
    var i = $('#kode-manual'); var v = i.value; if (!v.trim()) { W.toast('Isi kode QR dahulu.', 'bad'); return; }
    SC.terakhir = ''; tanganiKode(v); i.value = '';
  };
  W.ACT.absenManual = function (el) {
    if (SC.busy) return;
    SC.busy = true;
    rpc('apiScanManual', [W.sesi, W.semId, el.dataset.id, SC.mode]).then(function (r) { tampilHasil(r.hasil); }).catch(function (e) { SC.busy = false; W.toast(e.message, 'bad'); });
  };

  /* ============================================================
   *  RIWAYAT KEHADIRAN
   * ============================================================ */
  var RIW = {};
  halaman('riwayat', true, function (p) {
    var tab = p.tab || 'hadir';
    var tabs = '<div class="seg mb2" style="max-width:360px"><button data-nav="riwayat" data-p=\'{"tab":"hadir"}\' class="' + (tab === 'hadir' ? 'on' : '') + '">Kehadiran</button><button data-nav="riwayat" data-p=\'{"tab":"log"}\' class="' + (tab === 'log' ? 'on' : '') + '">Log Scan</button></div>';
    if (tab === 'log') {
      return rpc('apiLogScan', [W.sesi, W.semId]).then(function (r) {
        var tbl = W.Tbl.html({
          id: 'tb-log', rows: r.log, perPage: 12, cari: function (l) { return l.petugas + ' ' + l.pesan + ' ' + l.hasil; }, placeholder: 'Cari petugas atau keterangan…',
          chips: { opsi: ['Semua', 'Berhasil', 'Ditolak'], f: function (l) { return l.hasil; } },
          kosong: { ikon: 'qr_code_scanner', judul: 'Belum ada log scan', teks: 'Semua percobaan scan tercatat di sini.' },
          cols: [
            { h: 'Waktu', f: function (l) { return '<span class="num">' + esc(W.waktu(l.waktu)) + '</span>'; } },
            { h: 'Mode', f: function (l) { return l.mode === 'in' ? 'Check-in' : 'Check-out'; } },
            { h: 'Petugas', f: function (l) { return esc(l.petugas); } },
            { h: 'Hasil', f: function (l) { return '<span class="badge ' + (l.hasil === 'Berhasil' ? 'ok' : 'bad') + '">' + esc(l.hasil) + '</span>'; } },
            { h: 'Keterangan', f: function (l) { return esc(l.pesan); } }
          ]
        });
        return { html: '<div class="pagehead"><div><h1>Riwayat Kehadiran</h1></div></div>' + tabs + '<div class="card">' + tbl + '</div>', bind: function () { W.Tbl.mulai('tb-log'); } };
      });
    }
    return rpc('apiRiwayat', [W.sesi, W.semId], { ulang: true }).then(function (r) {
      RIW = {}; r.riwayat.forEach(function (x) { RIW[x.id] = x; });
      var k = r.kartu;
      var tbl = W.Tbl.html({
        id: 'tb-riw', rows: r.riwayat, perPage: 12, cari: function (x) { return x.nama + ' ' + x.email + ' ' + x.institusi; }, placeholder: 'Cari peserta…',
        chips: { opsi: ['Semua', 'Hadir', 'Hadir tanpa check-out', 'Belum hadir', 'Tidak hadir', 'Dibatalkan'], f: function (x) { return x.status; } },
        kosong: { ikon: 'fact_check', judul: 'Belum ada data', teks: 'Belum ada peserta pada seminar ini.' },
        cols: [
          { h: 'Peserta', f: function (x) { return '<div class="who"><span class="avatar">' + esc(W.inisial(x.nama)) + '</span><div style="min-width:0"><div class="n">' + esc(x.nama) + '</div><div class="e">' + esc(x.email) + '</div></div></div>'; } },
          { h: 'Status', f: function (x) { return W.badgeStatus(x.status); } },
          { h: 'Check-in', f: function (x) { return '<span class="num">' + esc(W.jam(x.checkIn)) + '</span>'; } },
          { h: 'Check-out', f: function (x) { return '<span class="num">' + esc(W.jam(x.checkOut)) + '</span>'; } },
          { h: 'Durasi', f: function (x) { return '<span class="num">' + esc(x.durasi || '–') + '</span>'; } },
          { h: 'Petugas', f: function (x) { return esc(x.petugas || '–'); } },
          { h: 'Aksi', cls: 'act', f: function (x) { return x.status === 'Dibatalkan' ? '' : '<button class="btn out sm" data-act="koreksi" data-id="' + esc(x.id) + '">' + ico('edit_note') + 'Koreksi</button>'; } }
        ]
      });
      var ringkas = '<div class="stats mb2"><div class="stat"><div class="top"><span>Terdaftar</span></div><div class="val num">' + k.terdaftar + '</div></div><div class="stat"><div class="top"><span>Hadir</span></div><div class="val num">' + k.hadir + '</div></div>' +
        '<div class="stat"><div class="top"><span>Check-out</span></div><div class="val num">' + k.sudahPulang + '</div></div><div class="stat"><div class="top"><span>Belum / tidak hadir</span></div><div class="val num">' + (k.belumHadir + k.tidakHadir) + '</div></div><div class="stat"><div class="top"><span>Dibatalkan</span></div><div class="val num">' + k.dibatalkan + '</div></div></div>';
      return { html: '<div class="pagehead"><div><h1>Riwayat Kehadiran</h1><p class="muted sm">' + esc(r.seminar.nama) + '</p></div></div>' + tabs + ringkas + '<div class="card">' + tbl + '</div>', bind: function () { W.Tbl.mulai('tb-riw'); } };
    });
  });
  W.ACT.koreksi = function (el) {
    var x = RIW[el.dataset.id];
    var v = function (s) { return s ? s.substring(0, 16).replace(' ', 'T') : ''; };
    W.modal({
      judul: 'Koreksi kehadiran', kunci: true,
      isi: '<p class="sm muted mb2">Peserta: <b>' + esc(x.nama) + '</b>. Koreksi tercatat di Audit Log beserta alasannya.</p><form class="form-grid" novalidate><div class="field"><label for="k-in">Waktu check-in</label><input class="in" type="datetime-local" id="k-in" value="' + esc(v(x.checkIn)) + '"></div>' +
        '<div class="field"><label for="k-out">Waktu check-out</label><input class="in" type="datetime-local" id="k-out" value="' + esc(v(x.checkOut)) + '"><div class="hint">Kosongkan jika belum pulang.</div></div>' +
        '<div class="field"><label for="k-alasan">Alasan koreksi <span class="req">*</span></label><textarea class="ta" id="k-alasan" placeholder="Contoh: QR rusak, diverifikasi dengan KTP"></textarea></div><div id="k-err" class="alert bad hidden" role="alert"></div></form>',
      tombol: [{ label: 'Batal', kelas: 'out' }, {
        label: 'Simpan koreksi', aksi: function (m, b) {
          var err = $('#k-err', m.el); err.classList.add('hidden');
          W.sibuk(b, function () {
            return rpc('apiKoreksiAbsensi', [W.sesi, W.semId, x.id, $('#k-in', m.el).value, $('#k-out', m.el).value, $('#k-alasan', m.el).value]).then(function () { m.tutup(); W.toast('Koreksi tersimpan', 'ok'); return W.navigateTo('riwayat', W.params, { tanpaSkeleton: true }); })
              .catch(function (e) { err.innerHTML = ico('error') + '<span>' + esc(e.message) + '</span>'; err.classList.remove('hidden'); });
          });
          return false;
        }
      }]
    });
  };

  /* ============================================================
   *  EVALUASI
   * ============================================================ */
  halaman('evaluasiHasil', true, function () {
    return rpc('apiEvaluasi', [W.sesi, W.semId], { ulang: true }).then(function (r) {
      var e = r.rekap;
      var nama = { materi: 'Materi', pemateri: 'Pemateri', penyelenggaraan: 'Penyelenggaraan', fasilitas: 'Lokasi & Fasilitas', keseluruhan: 'Kepuasan Keseluruhan' };
      var kartu = Object.keys(nama).map(function (k) {
        return '<div class="stat"><div class="top"><span>' + nama[k] + '</span></div><div class="val num">' + (e.jumlah ? e.rata[k].toFixed(2) : '–') + '<small>/ 5</small></div><div class="bar" aria-hidden="true"><i style="width:' + Math.round(e.rata[k] * 20) + '%"></i></div></div>';
      }).join('');
      var kom = e.komentar.length ? e.komentar.map(function (c) {
        return '<div class="list-item" style="align-items:flex-start;flex-direction:column;gap:6px">' + (c.kritik ? '<div><span class="badge warn">Kritik</span> ' + esc(c.kritik) + '</div>' : '') + (c.saran ? '<div><span class="badge blue">Saran</span> ' + esc(c.saran) + '</div>' : '') + '</div>';
      }).join('') : '<div class="empty">' + ico('chat_bubble') + '<h3>Belum ada komentar</h3></div>';
      var html = '<div class="pagehead"><div><h1>Evaluasi Seminar</h1><p class="muted sm">' + esc(r.seminar.nama) + '</p></div></div>' +
        '<div class="stats">' + kartu + '</div>' +
        '<div class="grid2 two mt2"><div class="card"><h2>Ringkasan</h2><dl class="kv mt2"><dt>Responden</dt><dd class="num">' + e.jumlah + ' dari ' + r.hadir + ' peserta hadir</dd><dt>Tingkat respons</dt><dd class="num">' + (r.hadir ? Math.round(e.jumlah * 100 / r.hadir) : 0) + '%</dd><dt>Ikut lagi</dt><dd class="num">' + e.ikutLagiPersen + '%</dd></dl></div>' +
        '<div class="card"><h2>Kritik & Saran <span class="sm muted">(anonim)</span></h2><div class="mt2" style="max-height:420px;overflow:auto">' + kom + '</div></div></div>';
      return { html: html };
    });
  });

  /* ============================================================
   *  LAPORAN
   * ============================================================ */
  halaman('laporan', true, function () {
    return rpc('apiRiwayat', [W.sesi, W.semId]).then(function (r) {
      var k = r.kartu, s = r.seminar;
      var kv = function (a, b) { return '<dt>' + a + '</dt><dd class="num">' + b + '</dd>'; };
      var html = '<div class="pagehead"><div><h1>Laporan Seminar</h1><p class="muted sm">' + esc(s.nama) + '</p></div></div>' +
        '<div class="grid2 two"><div class="card"><h2>Ringkasan</h2><dl class="kv mt2">' + kv('Tanggal', esc(W.tgl(s.tanggal))) + kv('Lokasi', esc(s.lokasi)) + kv('Kuota', k.kuota) + kv('Terdaftar', k.terdaftar) + kv('Hadir', k.hadir) + kv('Sudah check-out', k.sudahPulang) + kv('Hadir tanpa check-out', k.tanpaCheckout) + kv('Belum / tidak hadir', k.belumHadir + k.tidakHadir) + kv('Dibatalkan', k.dibatalkan) + kv('Persentase hadir', k.persen + '%') + '</dl></div>' +
        '<div class="card"><h2>Unduh Laporan</h2><p class="sm muted mt1">Berisi ringkasan, daftar peserta & kehadiran, rekap evaluasi, dan log scan. Salinan juga disimpan di folder <b>Laporan</b> pada Google Drive.</p>' +
        '<div class="stack mt3"><button class="btn lg block" data-act="ekspor" data-f="xlsx">' + ico('table_view') + 'Unduh Excel (.xlsx)</button><button class="btn lg block out" data-act="ekspor" data-f="pdf">' + ico('picture_as_pdf') + 'Unduh PDF</button></div></div></div>';
      return { html: html };
    });
  });
  W.ACT.ekspor = function (el) {
    W.sibuk(el, function () {
      return rpc('apiEksporLaporan', [W.sesi, W.semId, el.dataset.f]).then(function (r) { W.unduh(r.nama, r.mime, r.base64); W.toast('Laporan diunduh', 'ok'); });
    });
  };

  /* ============================================================
   *  SERTIFIKAT (admin)
   * ============================================================ */
  halaman('sertifikat', true, function () {
    if (!admin()) return Promise.reject(new Error('Hanya Admin yang dapat menerbitkan sertifikat.'));
    return rpc('apiStatusSertifikat', [W.sesi, W.semId]).then(function (r) {
      var tbl = W.Tbl.html({
        id: 'tb-cert', rows: r.daftar, perPage: 10, cari: function (x) { return x.nama + ' ' + x.email + ' ' + x.nomor; }, placeholder: 'Cari peserta atau nomor…',
        chips: { opsi: ['Semua', 'Terbit', 'Siap terbit', 'Belum memenuhi'], f: function (x) { return x.terbit ? 'Terbit' : x.memenuhi ? 'Siap terbit' : 'Belum memenuhi'; } },
        kosong: { ikon: 'workspace_premium', judul: 'Belum ada peserta', teks: '' },
        cols: [
          { h: 'Peserta', f: function (x) { return '<div class="who"><span class="avatar">' + esc(W.inisial(x.nama)) + '</span><div style="min-width:0"><div class="n">' + esc(x.nama) + '</div><div class="e">' + esc(x.email) + '</div></div></div>'; } },
          { h: 'Status', f: function (x) { return x.terbit ? '<span class="badge ok">Terbit</span>' : x.memenuhi ? '<span class="badge blue">Siap terbit</span>' : '<span class="badge">Belum memenuhi</span>'; } },
          { h: 'Nomor / Alasan', f: function (x) { return x.terbit ? '<span class="num">' + esc(x.nomor) + '</span>' : '<span class="xs muted">' + esc(x.alasan) + '</span>'; } },
          { h: 'Aksi', cls: 'act', f: function (x) { return x.terbit ? '<button class="btn out sm" data-act="unduhCert" data-id="' + esc(x.id) + '">' + ico('download') + 'Unduh</button>' : ''; } }
        ]
      });
      var html = '<div class="pagehead"><div><h1>Sertifikat</h1><p class="muted sm">Terbit otomatis untuk peserta yang memenuhi syarat. Atur syarat di menu Pengaturan.</p></div></div>' +
        '<div class="stats mb2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><div class="stat"><div class="top"><span>Memenuhi syarat</span></div><div class="val num">' + r.memenuhi + '</div></div><div class="stat"><div class="top"><span>Sudah terbit</span></div><div class="val num">' + r.terbit + '</div></div><div class="stat"><div class="top"><span>Menunggu terbit</span></div><div class="val num">' + r.antri + '</div></div></div>' +
        '<div class="card"><div class="row between wrap mb2"><h2>Daftar peserta</h2><button class="btn warn" data-act="terbitSemua"' + (r.antri ? '' : ' disabled') + '>' + ico('auto_awesome') + 'Terbitkan ' + r.antri + ' sertifikat</button></div><div id="progres" class="hidden mb2"></div>' + tbl + '</div>';
      return { html: html, bind: function () { W.Tbl.mulai('tb-cert'); } };
    });
  });
  W.ACT.terbitSemua = function (el) {
    var prog = $('#progres'); prog.classList.remove('hidden');
    var total = 0;
    function putaran() {
      return rpc('apiTerbitkanSertifikat', [W.sesi, W.semId]).then(function (r) {
        total += r.dibuat;
        prog.innerHTML = '<div class="alert info">' + ico('hourglass_top') + '<span>Menerbitkan… ' + total + ' selesai, sisa ' + r.sisa + (r.gagal ? ', ' + r.gagal + ' gagal' : '') + '.</span></div>';
        if (r.sisa > 0 && (r.dibuat > 0)) return putaran();
        return r;
      });
    }
    W.sibuk(el, function () {
      return putaran().then(function (r) { W.toast(total + ' sertifikat diterbitkan' + (r.gagal ? ' (' + r.gagal + ' gagal, coba ulang)' : ''), r.gagal ? 'bad' : 'ok'); return W.navigateTo('sertifikat', {}, { tanpaSkeleton: true }); });
    });
  };
  W.ACT.unduhCert = function (el) {
    W.sibuk(el, function () { return rpc('apiUnduhSertifikat', [W.sesi, el.dataset.id]).then(function (r) { W.unduh(r.nama, r.mime, r.base64); }); });
  };

  /* ============================================================
   *  PENGATURAN (admin)
   * ============================================================ */
  halaman('pengaturan', false, function () {
    if (!admin()) return Promise.reject(new Error('Hanya Admin yang dapat mengubah pengaturan.'));
    return rpc('apiPengaturan', [W.sesi]).then(function (r) {
      var c = r.pengaturan, pr = r.pratinjau;
      var up = function (jenis, judul, hint, src) {
        return '<div class="field"><div class="lb">' + judul + '</div><div class="upl"><img id="pv-' + jenis + '" src="' + esc(src || '') + '" alt="" style="' + (src ? '' : 'visibility:hidden') + '"><div class="grow"><label class="btn out sm">' + ico('upload') + 'Pilih gambar<input type="file" accept="image/*" class="sr" data-up="' + jenis + '"></label><div class="hint">' + hint + '</div></div></div></div>';
      };
      var html = '<div class="pagehead"><div><h1>Pengaturan</h1><p class="muted sm">Identitas penyelenggara, tampilan sertifikat, dan aturan absensi.</p></div></div>' +
        '<form id="f-set" class="grid2 two" novalidate><div class="card"><h2>Penyelenggara & Sertifikat</h2><div class="form-grid mt2">' +
        '<div class="field"><label for="c-nama">Nama penyelenggara</label><input class="in" id="c-nama" value="' + esc(c.namaPenyelenggara) + '"></div>' +
        '<div class="field"><label for="c-judul">Judul sertifikat</label><input class="in" id="c-judul" value="' + esc(c.judulSertifikat) + '"></div>' +
        '<div class="field"><label for="c-fmt">Format nomor sertifikat</label><input class="in" id="c-fmt" value="' + esc(c.formatNomor) + '"><div class="hint">Gunakan {NO} (urut, wajib), {KODE}, {BLN}, {THN}. Contoh: {NO}/SEM/{BLN}/{THN}</div></div>' +
        '<div class="field"><label for="c-url">Alamat situs ini (untuk tautan di email)</label><input class="in" id="c-url" value="' + esc(c.urlFrontend) + '" placeholder="https://namaanda.github.io/nama-repo/"><div class="hint">Terisi otomatis saat Admin login. Dipakai sebagai tautan "Buka Tiket Saya" di email peserta.</div></div>' +
        '<div class="field"><label for="c-ttd-nama">Nama penandatangan</label><input class="in" id="c-ttd-nama" value="' + esc(c.ttdNama) + '"></div>' +
        '<div class="field"><label for="c-ttd-jab">Jabatan penandatangan</label><input class="in" id="c-ttd-jab" value="' + esc(c.ttdJabatan) + '"></div></div></div>' +
        '<div class="card"><h2>Aturan</h2><div class="form-grid mt2">' +
        '<div class="field"><label for="c-jendela">Jendela absensi (menit sebelum acara dimulai)</label><input class="in" id="c-jendela" type="number" min="0" max="720" value="' + esc(c.jendelaMenit) + '"><div class="hint">Absensi dibuka sejak sekian menit sebelum jam mulai sampai jam selesai.</div></div>' +
        '<div class="field"><div class="lb">Syarat terbit sertifikat</div><label class="switch"><input type="checkbox" checked disabled> <span class="sm">Sudah check-in (selalu wajib)</span></label>' +
        '<label class="switch"><input type="checkbox" id="c-co"' + (c.syaratCheckout === 'ya' ? ' checked' : '') + '> <span class="sm">Wajib sudah check-out</span></label>' +
        '<label class="switch"><input type="checkbox" id="c-ev"' + (c.syaratEvaluasi === 'ya' ? ' checked' : '') + '> <span class="sm">Wajib sudah mengisi evaluasi</span></label></div></div></div>' +
        '<div class="card" style="grid-column:1/-1"><h2>Gambar</h2><div class="grid2 two mt2" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
        up('logo', 'Logo penyelenggara', 'PNG transparan disarankan.', pr.logo) + up('ttd', 'Tanda tangan', 'PNG transparan, latar putih/transparan.', pr.ttd) + up('template', 'Gambar latar / template sertifikat', 'Ukuran A4 mendatar (landscape). Kosongkan untuk desain standar.', pr.template) + '</div></div>' +
        '<div class="card" style="grid-column:1/-1"><h2>' + ico('mail') + ' Pengiriman Email Tiket</h2><p class="sm mt1" style="color:var(--muted,#64748B)">Kirim email uji ke alamat Anda untuk memastikan QR tiket peserta dapat terkirim otomatis. Bila gagal, pesan error asli akan ditampilkan. Tombol ini juga memasang ulang pemicu antrean yang hilang dan mengulang pengiriman yang tertunda.</p><div class="mt2"><button class="btn ghost" type="button" id="btn-tes">' + ico('send') + 'Kirim Email Uji</button></div><div id="tes-hasil" class="alert hidden mt2 sm" role="status"></div></div>' +
        '<div style="grid-column:1/-1"><div id="c-err" class="alert bad hidden mb2" role="alert"></div><button class="btn lg" type="submit" id="btn-set">' + ico('save') + 'Simpan Pengaturan</button></div></form>';
      return {
        html: html, bind: function (cn) {
          $$('[data-up]', cn).forEach(function (inp) {
            inp.addEventListener('change', function () {
              var f = inp.files[0]; if (!f) return; var j = inp.dataset.up;
              W.toast('Mengunggah…');
              unggahKe(j, f).then(function (r) { var im = $('#pv-' + j); im.src = r.pratinjau; im.style.visibility = 'visible'; W.toast('Gambar tersimpan', 'ok'); W.logoUrl = j === 'logo' ? r.url : W.logoUrl; }).catch(function (e) { W.toast(e.message, 'bad'); });
            });
          });
          $('#btn-tes').addEventListener('click', function () {
            var h = $('#tes-hasil'); h.classList.add('hidden'); h.classList.remove('bad', 'ok');
            W.sibuk($('#btn-tes'), function () {
              return rpc('apiTesEmail', [W.sesi]).then(function (r) {
                h.className = 'alert ok mt2 sm';
                h.innerHTML = ico('check_circle') + '<span>Email uji terkirim ke <b>' + esc(r.email) + '</b>. Sisa kuota hari ini: ' + r.sisaKuota + '.' + (r.pemicuDipasangUlang ? ' Pemicu antrean email dipasang ulang.' : '') + (r.antre ? ' ' + r.antre + ' email tertunda akan dikirim dalam 5 menit.' : '') + ' Cek kotak masuk (dan Spam).</span>';
              }).catch(function (x) {
                h.className = 'alert bad mt2 sm';
                h.innerHTML = ico('error') + '<span>' + esc(x.message) + '</span>';
              });
            });
          });
          $('#f-set').addEventListener('submit', function (e) {
            e.preventDefault();
            var err = $('#c-err'); err.classList.add('hidden');
            var d = { namaPenyelenggara: $('#c-nama').value, judulSertifikat: $('#c-judul').value, formatNomor: $('#c-fmt').value, ttdNama: $('#c-ttd-nama').value, ttdJabatan: $('#c-ttd-jab').value, jendelaMenit: $('#c-jendela').value, urlFrontend: $('#c-url').value.trim(), syaratCheckout: $('#c-co').checked ? 'ya' : 'tidak', syaratEvaluasi: $('#c-ev').checked ? 'ya' : 'tidak' };
            W.sibuk($('#btn-set'), function () {
              return rpc('apiSimpanPengaturan', [W.sesi, d]).then(function () { W.penyelenggara = d.namaPenyelenggara; W.toast('Pengaturan tersimpan', 'ok'); })
                .catch(function (x) { err.innerHTML = ico('error') + '<span>' + esc(x.message) + '</span>'; err.classList.remove('hidden'); });
            });
          });
        }
      };
    });
  });

  /* ============================================================
   *  PENGGUNA & AUDIT (admin)
   * ============================================================ */
  var USR = {}, USR_SEM = [];
  halaman('pengguna', false, function (p) {
    if (!admin()) return Promise.reject(new Error('Hanya Admin yang dapat mengelola pengguna.'));
    var tab = p.tab || 'akun';
    var tabs = '<div class="seg mb2" style="max-width:360px"><button data-nav="pengguna" data-p=\'{"tab":"akun"}\' class="' + (tab === 'akun' ? 'on' : '') + '">Akun</button><button data-nav="pengguna" data-p=\'{"tab":"audit"}\' class="' + (tab === 'audit' ? 'on' : '') + '">Jejak Audit</button></div>';
    if (tab === 'audit') {
      return rpc('apiAuditLog', [W.sesi]).then(function (r) {
        var tbl = W.Tbl.html({ id: 'tb-aud', rows: r.log, perPage: 15, cari: function (l) { return l.pengguna + ' ' + l.aksi + ' ' + l.detail; }, placeholder: 'Cari pengguna atau aksi…',
          cols: [{ h: 'Waktu', f: function (l) { return '<span class="num">' + esc(W.waktu(l.waktu)) + '</span>'; } }, { h: 'Pengguna', f: function (l) { return esc(l.pengguna); } }, { h: 'Aksi', f: function (l) { return '<span class="badge">' + esc(l.aksi) + '</span>'; } }, { h: 'Detail', f: function (l) { return '<span class="sm">' + esc(l.detail) + '</span>'; } }] });
        return { html: '<div class="pagehead"><div><h1>Pengguna & Audit</h1></div></div>' + tabs + '<div class="card">' + tbl + '</div>', bind: function () { W.Tbl.mulai('tb-aud'); } };
      });
    }
    return rpc('apiDaftarPengguna', [W.sesi]).then(function (r) {
      USR = {}; r.pengguna.forEach(function (u) { USR[u.id] = u; }); USR_SEM = r.seminar;
      var tbl = W.Tbl.html({
        id: 'tb-usr', rows: r.pengguna, perPage: 10, cari: function (u) { return u.nama + ' ' + u.email; }, placeholder: 'Cari nama atau email…', extra: '<button class="btn" data-act="userBaru">' + ico('person_add') + 'Akun Baru</button>',
        cols: [
          { h: 'Pengguna', f: function (u) { return '<div class="who"><span class="avatar">' + esc(W.inisial(u.nama)) + '</span><div style="min-width:0"><div class="n">' + esc(u.nama) + '</div><div class="e">' + esc(u.email) + '</div></div></div>'; } },
          { h: 'Peran', f: function (u) { return '<span class="badge ' + (u.peran === 'Admin' ? 'blue' : '') + '">' + esc(u.peran) + '</span>'; } },
          { h: 'Penugasan', f: function (u) { return u.peran === 'Admin' ? '<span class="xs muted">Semua seminar</span>' : '<span class="xs">' + u.seminarIds.length + ' seminar</span>'; } },
          { h: 'Status', f: function (u) { return '<span class="badge ' + (u.status === 'Aktif' ? 'ok' : 'bad') + '">' + esc(u.status) + '</span>'; } },
          { h: 'Login terakhir', f: function (u) { return '<span class="xs num">' + esc(u.loginTerakhir ? W.waktu(u.loginTerakhir) : '–') + '</span>'; } },
          { h: 'Aksi', cls: 'act', f: function (u) { return '<button class="btn out sm" data-act="userUbah" data-id="' + esc(u.id) + '">' + ico('edit') + 'Ubah</button>'; } }
        ]
      });
      return { html: '<div class="pagehead"><div><h1>Pengguna & Audit</h1><p class="muted sm">Akun dinonaktifkan, tidak dihapus. Panitia hanya melihat seminar yang ditugaskan.</p></div></div>' + tabs + '<div class="card">' + tbl + '</div>', bind: function () { W.Tbl.mulai('tb-usr'); } };
    });
  });
  W.ACT.userBaru = function () { formUser(null); };
  W.ACT.userUbah = function (el) { formUser(USR[el.dataset.id]); };
  function formUser(u) {
    u = u || { nama: '', email: '', peran: 'Panitia', status: 'Aktif', seminarIds: [] };
    var cek = USR_SEM.map(function (s) { return '<label class="switch"><input type="checkbox" class="u-sem" value="' + esc(s.id) + '"' + (u.seminarIds.indexOf(s.id) >= 0 ? ' checked' : '') + '> <span class="sm">' + esc(s.nama) + ' (' + esc(W.tgl(s.tanggal, false)) + ')</span></label>'; }).join('') || '<p class="sm muted">Belum ada seminar.</p>';
    W.modal({
      judul: u.id ? 'Ubah Akun' : 'Akun Baru', kunci: true, lebar: true,
      isi: '<form class="form-grid c2" novalidate><div class="field"><label for="u-nama">Nama <span class="req">*</span></label><input class="in" id="u-nama" value="' + esc(u.nama) + '"></div>' +
        '<div class="field"><label for="u-email">Email <span class="req">*</span></label><input class="in" id="u-email" type="email" value="' + esc(u.email) + '"></div>' +
        '<div class="field"><label for="u-peran">Peran</label><select class="sel" id="u-peran" style="width:100%"><option' + (u.peran === 'Admin' ? ' selected' : '') + '>Admin</option><option' + (u.peran === 'Panitia' ? ' selected' : '') + '>Panitia</option></select></div>' +
        '<div class="field"><label for="u-status">Status</label><select class="sel" id="u-status" style="width:100%"><option' + (u.status === 'Aktif' ? ' selected' : '') + '>Aktif</option><option' + (u.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div>' +
        '<div class="field span2"><label for="u-sandi">' + (u.id ? 'Kata sandi baru (kosongkan jika tidak diubah)' : 'Kata sandi sementara') + (u.id ? '' : ' <span class="req">*</span>') + '</label><input class="in" id="u-sandi" type="text" autocomplete="off" placeholder="Min. 8 karakter, huruf dan angka"><div class="hint">Pengguna wajib menggantinya saat login pertama.</div></div>' +
        '<div class="field span2" id="u-tugas"><div class="lb">Ditugaskan pada seminar (khusus Panitia)</div><div style="max-height:160px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:6px 12px">' + cek + '</div></div>' +
        '<div id="u-err" class="alert bad hidden span2" role="alert"></div></form>',
      tombol: [{ label: 'Batal', kelas: 'out' }, {
        label: 'Simpan', aksi: function (m, b) {
          var err = $('#u-err', m.el); err.classList.add('hidden');
          var d = { id: u.id, nama: $('#u-nama', m.el).value, email: $('#u-email', m.el).value, peran: $('#u-peran', m.el).value, status: $('#u-status', m.el).value, sandi: $('#u-sandi', m.el).value, seminarIds: $$('.u-sem:checked', m.el).map(function (x) { return x.value; }) };
          W.sibuk(b, function () {
            return rpc('apiSimpanPengguna', [W.sesi, d]).then(function () { m.tutup(); W.toast('Akun tersimpan', 'ok'); return W.navigateTo('pengguna', {}, { tanpaSkeleton: true }); })
              .catch(function (e) { err.innerHTML = ico('error') + '<span>' + esc(e.message) + '</span>'; err.classList.remove('hidden'); });
          });
          return false;
        }
      }],
      bind: function (m) {
        var sel = $('#u-peran', m.el), t = $('#u-tugas', m.el);
        function atur() { t.classList.toggle('hidden', sel.value === 'Admin'); } sel.addEventListener('change', atur); atur();
      }
    });
  }

  /* ============================================================
   *  AKUN
   * ============================================================ */
  halaman('akun', false, function () {
    var u = W.user;
    var pintas = MENU.filter(function (m) { return !m.admin || admin(); }).filter(function (m) { return ['dashboard', 'peserta', 'pindai', 'riwayat'].indexOf(m.k) < 0; }).map(function (m) {
      return '<a href="javascript:void(0)" data-nav="' + m.k + '" class="list-item" style="text-decoration:none;color:inherit">' + ico(m.i) + '<span class="grow b">' + m.l + '</span>' + ico('chevron_right') + '</a>';
    }).join('');
    var html = '<div class="pagehead"><div><h1>Akun Saya</h1></div></div>' +
      (u.wajibGanti ? '<div class="alert warn mb2">' + ico('lock_reset') + '<div><b>Ganti kata sandi sementara Anda</b><br><span class="sm">Demi keamanan, buat kata sandi baru sebelum melanjutkan.</span></div></div>' : '') +
      '<div class="grid2 two"><div class="card"><div class="row"><span class="avatar" style="width:52px;height:52px">' + esc(W.inisial(u.nama)) + '</span><div><div class="b">' + esc(u.nama) + '</div><div class="sm muted">' + esc(u.email) + '</div><span class="badge blue mt1">' + esc(u.peran) + '</span></div></div>' +
      '<form id="f-sandi" class="stack mt3" novalidate><h2>Ganti kata sandi</h2>' +
      '<div class="field"><label for="g-lama">Kata sandi lama</label><input class="in" type="password" id="g-lama" autocomplete="current-password"></div>' +
      '<div class="field"><label for="g-baru">Kata sandi baru</label><input class="in" type="password" id="g-baru" autocomplete="new-password"><div class="hint">Minimal 8 karakter, memuat huruf dan angka.</div></div>' +
      '<div id="g-err" class="alert bad hidden" role="alert"></div><button class="btn" type="submit" id="btn-sandi">Simpan kata sandi</button></form></div>' +
      '<div class="stack"><div class="card"><h2>Menu lainnya</h2><div class="mt2">' + pintas + '</div></div><button class="btn danger out block lg" data-act="keluar">' + ico('logout') + 'Keluar</button></div></div>';
    return {
      html: html, bind: function () {
        $('#f-sandi').addEventListener('submit', function (e) {
          e.preventDefault(); var err = $('#g-err'); err.classList.add('hidden');
          W.sibuk($('#btn-sandi'), function () {
            return rpc('apiUbahKataSandi', [W.sesi, $('#g-lama').value, $('#g-baru').value]).then(function (r) { W.user = r.user; W.toast('Kata sandi diperbarui', 'ok'); return W.navigateTo('dashboard'); })
              .catch(function (x) { err.innerHTML = ico('error') + '<span>' + esc(x.message) + '</span>'; err.classList.remove('hidden'); });
          });
        });
      }
    };
  });
  W.ACT.keluar = function (el) {
    W.sibuk(el, function () {
      return rpc('apiLogout', [W.sesi]).catch(function () {}).then(function () {
        W.user = null; W.sesi = null; W.semList = []; W.semMuat = false; W.semId = '';
        try { sessionStorage.removeItem('sesi'); sessionStorage.removeItem('semId'); } catch (e) {}
        W.toast('Anda sudah keluar', 'ok');
        return W.navigateTo('landing');
      });
    });
  };
})();
