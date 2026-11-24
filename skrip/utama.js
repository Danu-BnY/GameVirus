// impor
import { LEBAR, TINGGI, ARENA, PEMAIN, JENIS, GELOMBANG, SUB_GELOMBANG } from './konfigurasi.js';
import { bunyi, aktifkanSuara, setBisu, apakahBisu } from './suara.js';


// lingkaran, batas efek(partikel), urutan serangan bos
const lingkar = Math.PI * 2, BATAS_PARTIKEL = 650, URUTAN_BOS = ['persiapan', 'tembak', 'normal'];

// posisi random
const rnd = (a, b) => a + Math.random() * (b - a);

/* Fungsi pembatas nilai (clamp) agar angka 'v' tidak lebih kecil dari 'a' dan tidak lebih besar dari 'b'.
   Gunanya seperti pagar pengaman, misalnya menahan koordinat pemain agar tidak tembus keluar dari arena. */
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const $ = (id) => document.getElementById(id);


// set arena
const canvas = $('Corona'); canvas.width = LEBAR; canvas.height = TINGGI;
const g = canvas.getContext('2d');


// cek tombol
const tombol = new Set();

// mouse
const tetikus = { x: LEBAR / 2, y: TINGGI / 2, kiri: false, kanan: false };

/* S: Objek utama penyimpan seluruh status dunia game saat ini (pemain, daftar musuh, proyektil, gelombang).
   rafId: Nomor pengenal animasi browser agar putaran frame game bisa dihentikan sewaktu-waktu.
   tAwal: Jam patokan waktu terakhir untuk menghitung jeda waktu per frame (delta time). */
let S = null, rafId = 0, tAwal = 0;

// status game
export const ambilStatus = () => S;

/* --- PERSIAPAN TAMPILAN LATAR BELAKANG --- */

// bg arena
const latar = buatLatar();

const vinyet = (() => { const r = g.createRadialGradient(LEBAR / 2, TINGGI / 2, 260, LEBAR / 2, TINGGI / 2, 650); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.7)'); return r; })();
const debu = Array.from({ length: 40 }, () => ({ x: rnd(ARENA.x, ARENA.x + ARENA.s), y: rnd(ARENA.y, ARENA.y + ARENA.s), r: rnd(1, 3), f: rnd(0, lingkar) }));

// arena
function buatLatar() {
  const c = document.createElement('canvas'); c.width = LEBAR; c.height = TINGGI;
  const x = c.getContext('2d'), { x: ax, y: ay, s } = ARENA;
  x.fillStyle = '#0b0306'; x.fillRect(0, 0, LEBAR, TINGGI);
  const gr = x.createLinearGradient(ax, ay, ax + s, ay + s); gr.addColorStop(0, '#3d101c'); gr.addColorStop(1, '#2a0b1c');
  x.fillStyle = gr; x.fillRect(ax, ay, s, s);
  x.save(); x.beginPath(); x.rect(ax, ay, s, s); x.clip();
  for (let i = 0; i < 4; i++) { // pembuluh darah
    x.strokeStyle = 'rgba(120,25,40,.25)'; x.lineWidth = rnd(50, 90); x.beginPath(); x.moveTo(ax - 50, ay + rnd(0, s));
    x.bezierCurveTo(ax + s * .3, ay + rnd(0, s), ax + s * .7, ay + rnd(0, s), ax + s + 50, ay + rnd(0, s)); x.stroke();
  }
  for (let i = 0; i < 45; i++) { // sel-sel
    const px = rnd(ax, ax + s), py = rnd(ay, ay + s), r = rnd(18, 50);
    x.fillStyle = 'rgba(160,50,70,.10)'; x.beginPath(); x.ellipse(px, py, r, r * rnd(.6, 1), rnd(0, 3), 0, lingkar); x.fill();
    x.fillStyle = 'rgba(60,10,30,.25)'; x.beginPath(); x.arc(px, py, r * .35, 0, lingkar); x.fill();
  }
  x.strokeStyle = 'rgba(200,90,110,.08)'; x.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) { x.beginPath(); x.moveTo(rnd(ax, ax + s), rnd(ay, ay + s)); x.quadraticCurveTo(rnd(ax, ax + s), rnd(ay, ay + s), rnd(ax, ax + s), rnd(ay, ay + s)); x.stroke(); }
  x.restore();
  return c;
}

// replay/set awal game
function baru() {
  S = {
    status: 'main', waktu: 0, tg: 0, tb: 0, bos: null,
    p: { x: ARENA.x + ARENA.s / 2, y: ARENA.y + ARENA.s / 2, r: PEMAIN.r, vx: 0, vy: 0, hp: PEMAIN.hp, dx: 0, dy: 0, dash: 0, dashCd: 0, tembakCd: 0, kebal: 0, perisai: false, sudut: 0, recoil: 0, jejak: [] },
    virus: [], peluru: [], bola: [], partikel: [], cincin: [],
    getar: 0, kilat: 0, kilatWarna: '255,40,60', gel: 0, antrean: [], total: 0, tewas: 0, banner: 0, bannerTeks: '',
  };
  mulaiGelombang(1);
}

// wave
function mulaiGelombang(n) {
  const d = GELOMBANG[n - 1];
  S.gel = n; S.antrean = d.map((a) => ({ ...a, sisa: a.n, w: a.i }));
  S.total = d.reduce((a, b) => a + b.n, 0); S.tewas = 0; S.banner = 2.4;
  S.bannerTeks = n === 5 ? 'GELOMBANG TERAKHIR' : 'GELOMBANG ' + n; bunyi('gelombang');
}

// spawn jenis musuh dan posisi
function munculkan(t) {
  const j = JENIS[t], p = S.p, m = j.r + 4;
  let x, y, k = 0;
  if (t === 'bos') { x = ARENA.x + ARENA.s / 2; y = ARENA.y + 120; cincin(x, y, '#ff2e90', 500, 0.9); S.getar = 20; bunyi('ledakan'); }
  else do {
    const sisi = (Math.random() * 4) | 0, u = rnd(0.05, 0.95) * ARENA.s, h = sisi < 2;
    x = h ? (sisi ? ARENA.x + ARENA.s - m : ARENA.x + m) : ARENA.x + u;
    y = h ? ARENA.y + u : (sisi === 3 ? ARENA.y + ARENA.s - m : ARENA.y + m);
  } while (Math.hypot(x - p.x, y - p.y) < 200 && ++k < 8);
  const v = { t, x, y, r: j.r, hp: j.hp, max: j.hp, sudut: rnd(0, lingkar), fase: rnd(0, lingkar), cd: 0, kb: { x: 0, y: 0 }, kilat: 0, siklus: rnd(0, 0.3), mode: 0, ax: 0, ay: 1, mati: false, sekarat: false };
  if (t === 'bos') Object.assign(v, { pola: 'normal', urut: 2, t2: -0.5, salvo: 0 });
  S.virus.push(v); if (t === 'bos') S.bos = v;
  ledak(x, y, j.warna, t === 'bos' ? 40 : 6, 120, 0.5, 4);
}

// efek efek

// efek musuh mokad
function ledak(x, y, warna, n, v = 160, umur = 0.6, uk = 4) {
  for (let i = 0; i < n && S.partikel.length < BATAS_PARTIKEL; i++) {
    const a = rnd(0, lingkar), s = rnd(0.2, 1) * v;
    S.partikel.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, u: rnd(0.5, 1) * umur, m: umur, w: warna, k: rnd(0.5, 1) * uk });
  }
}

// cincin bos
const cincin = (x, y, w, mk, d = 0.5) => S.cincin.push({ x, y, w, mk, u: 0, d });

// update efek
function ubahEfek(dt) {
  const P = S.partikel;
  for (let i = P.length - 1; i >= 0; i--) {
    const q = P[i]; q.u -= dt;
    if (q.u <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 2.5; q.vy *= 1 - dt * 2.5;
  }
  S.cincin = S.cincin.filter((c) => (c.u += dt) < c.d);
  S.p.jejak = S.p.jejak.filter((j) => (j.a -= dt * 4) > 0);
  S.getar = Math.max(0, S.getar - dt * 30); S.kilat = Math.max(0, S.kilat - dt * 1.5);
}

/* --- KELOMPOK FUNGSI PERILAKU PEMAIN --- */

// gerak, mapping, mouse
function ubahPemain(dt) {
  const p = S.p;
  let ix = (tombol.has('KeyD') ? 1 : 0) - (tombol.has('KeyA') ? 1 : 0), iy = (tombol.has('KeyS') ? 1 : 0) - (tombol.has('KeyW') ? 1 : 0);
  const m = Math.hypot(ix, iy); if (m) { ix /= m; iy /= m; p.dx = ix; p.dy = iy; }
  p.sudut = Math.atan2(tetikus.y - p.y, tetikus.x - p.x);
  p.perisai = tetikus.kanan && p.dash <= 0;
  p.kebal -= dt; p.dashCd -= dt; p.tembakCd -= dt; p.recoil = Math.max(0, p.recoil - dt * 60);
  if (p.dash > 0) {
    p.dash -= dt; p.x += p.dx * PEMAIN.dashKec * dt; p.y += p.dy * PEMAIN.dashKec * dt;
    p.jejak.push({ x: p.x, y: p.y, a: 1 }); ledak(p.x, p.y, '#bfefff', 2, 60, 0.35, 4);
    if (p.dash <= 0) { p.dash = 0; p.dashCd = PEMAIN.dashCd; }
  } else {
    const f = Math.min(1, dt * 14);
    p.vx += (ix * PEMAIN.kec - p.vx) * f; p.vy += (iy * PEMAIN.kec - p.vy) * f;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  p.x = clamp(p.x, ARENA.x + p.r, ARENA.x + ARENA.s - p.r); p.y = clamp(p.y, ARENA.y + p.r, ARENA.y + ARENA.s - p.r);
  if (tetikus.kiri && !p.perisai && p.dash <= 0 && p.tembakCd <= 0) {
    p.tembakCd = PEMAIN.jedaTembak; p.recoil = 6;
    const c = Math.cos(p.sudut), s = Math.sin(p.sudut), tx = p.x + c * 56, ty = p.y + s * 56;
    S.peluru.push({ x: p.x, y: p.y, vx: c * 900, vy: s * 900, vida: 1.1 });
    ledak(tx, ty, '#aaffee', 4, 140, 0.18, 3); bunyi('tembak');
  }
}

// dash
function mulaiDash() {
  if (!S || S.status !== 'main') return;
  const p = S.p; if (p.dash > 0 || p.dashCd > 0) return;
  if (!p.dx && !p.dy) { p.dx = Math.cos(p.sudut); p.dy = Math.sin(p.sudut); }
  p.dash = PEMAIN.dashDurasi; bunyi('dash'); cincin(p.x, p.y, '#bfefff', 60, 0.3);
}

// kena hit dan efeknya
function lukai(d) {
  const p = S.p; p.hp = Math.max(0, p.hp - d); p.kebal = PEMAIN.kebal;
  S.getar = Math.max(S.getar, 10); S.kilat = 0.35; S.kilatWarna = '255,40,60';
  ledak(p.x, p.y, '#ff3355', 14, 220, 0.5, 5); bunyi('luka');
  if (p.hp <= 0) {
    S.status = 'gugur'; S.tg = 0; S.getar = 25;
    ledak(p.x, p.y, '#ffffff', 60, 380, 0.9, 6); cincin(p.x, p.y, '#ffffff', 300, 0.8); bunyi('ledakan');
  }
}


// virus virus

// kejar player
function ubahVirus(v, dt) {
  const p = S.p;
  v.kilat = Math.max(0, v.kilat - dt); v.cd = Math.max(0, v.cd - dt);
  const dx = p.x - v.x, dy = p.y - v.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  if (v.t === 'bos') return ubahBos(v, dt, ux, uy);
  let kec = JENIS[v.t].kec, mx = ux, my = uy;
  if (v.t === 'dash') {
    v.siklus = (v.siklus + dt) % 1;
    if (v.siklus < 0.7) { v.ax = ux; v.ay = uy; v.mode = v.siklus >= 0.4 ? 1 : 0; kec = 18; }
    else { v.mode = 2; mx = v.ax; my = v.ay; kec = 650; if (Math.random() < 0.5) ledak(v.x, v.y, '#ff4d6d', 1, 30, 0.25, 5); }
    v.sudut += dt * (v.mode ? 12 : 2);
  } else {
    v.sudut += dt * (v.t === 'lambat' ? 0.8 : 2);
    const w = Math.sin(S.waktu * 5 + v.fase) * 0.25; mx += -uy * w; my += ux * w;
  }
  v.x += (mx * kec + v.kb.x) * dt; v.y += (my * kec + v.kb.y) * dt;
  const f = 1 - Math.min(1, dt * 6); v.kb.x *= f; v.kb.y *= f;
  v.x = clamp(v.x, ARENA.x + v.r, ARENA.x + ARENA.s - v.r); v.y = clamp(v.y, ARENA.y + v.r, ARENA.y + ARENA.s - v.r);
}

// virus tidak tertumpuk
function separar() {
  const V = S.virus;
  for (let i = 0; i < V.length; i++) {
    const a = V[i]; if (a.mati || a.t === 'bos') continue;
    for (let j = i + 1; j < V.length; j++) {
      const b = V[j]; if (b.mati || b.t === 'bos') continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), o = (rr - d) * 0.25; a.x -= dx / d * o; a.y -= dy / d * o; b.x += dx / d * o; b.y += dy / d * o; }
    }
  }
}

//pola boss
function pilihPola(b) { b.urut = (b.urut + 1) % 3; b.pola = URUTAN_BOS[b.urut]; b.t2 = 0; b.salvo = 0; if (b.pola === 'persiapan') bunyi('bosTembak'); }

// kejar player(boss)
function ubahBos(b, dt, ux, uy) {
  b.t2 += dt; b.sudut += dt * 0.8;
  let kec = 0, mx = 0, my = 0;
  if (b.pola === 'normal') { kec = JENIS.bos.kec; mx = ux; my = uy; if (b.t2 > 3) pilihPola(b); }
  else if (b.pola === 'persiapan') { if (b.t2 < 0.75) { b.ax = ux; b.ay = uy; } if (b.t2 >= 1) { b.pola = 'dash'; b.t2 = 0; bunyi('dash'); } }
  else if (b.pola === 'dash') { kec = 760; mx = b.ax; my = b.ay; ledak(b.x, b.y, '#ff2e63', 2, 100, 0.4, 8); if (b.t2 > 0.6) akhirDash(b); }
  else if (b.pola === 'lelah') { if (b.t2 > 0.7) pilihPola(b); }
  else { if (b.salvo < 5 && b.t2 > 0.4 + b.salvo * 0.55) tembakBos(b); if (b.t2 > 3.4) pilihPola(b); }
  b.x += (mx * kec + b.kb.x) * dt; b.y += (my * kec + b.kb.y) * dt;
  const f = 1 - Math.min(1, dt * 6); b.kb.x *= f; b.kb.y *= f;
  const mnx = ARENA.x + b.r, mxx = ARENA.x + ARENA.s - b.r, mny = ARENA.y + b.r, mxy = ARENA.y + ARENA.s - b.r;
  const nabrak = b.x < mnx || b.x > mxx || b.y < mny || b.y > mxy;
  b.x = clamp(b.x, mnx, mxx); b.y = clamp(b.y, mny, mxy);
  if (b.pola === 'dash' && nabrak) akhirDash(b);
}

// efek dash boss
function akhirDash(b) { b.pola = 'lelah'; b.t2 = 0; cincin(b.x, b.y, '#ff2e63', 320, 0.6); S.getar = 18; bunyi('hantam'); }

// efek tembak boss
function tembakBos(b) {
  const a = Math.atan2(S.p.y - b.y, S.p.x - b.x) + (b.salvo % 2 ? 0.11 : 0);
  for (let k = -2; k <= 2; k++) { const an = a + k * 0.22; S.bola.push({ x: b.x, y: b.y, vx: Math.cos(an) * 270, vy: Math.sin(an) * 270, r: 11, vida: 6 }); }
  b.salvo++; ledak(b.x, b.y, '#ffae00', 12, 200, 0.4, 5); cincin(b.x, b.y, '#ffae00', 120, 0.3); S.getar = Math.max(S.getar, 5); bunyi('bosTembak');
}

// efek virus mokad
function matikan(v) {
  S.tewas++; ledak(v.x, v.y, JENIS[v.t].warna, v.t === 'lambat' ? 28 : 14, 220, 0.6, 5); ledak(v.x, v.y, '#ffffff', 3, 120, 0.3, 4);
  S.getar = Math.max(S.getar, v.t === 'lambat' ? 5 : 2); bunyi('mati');
  if (v.t === 'bos') {
    v.sekarat = true; S.status = 'bosMati'; S.tb = 0; S.bola.length = 0; bunyi('ledakan');
    for (const o of S.virus) if (o !== v && !o.mati) { o.mati = true; ledak(o.x, o.y, JENIS[o.t].warna, 5, 200, 0.6, 5); }
  } else v.mati = true;
}

// efek boss mokad
function ubahBosMati(dt) {
  S.tb += dt; const b = S.bos;
  if (!b.mati) {
    S.getar = Math.max(S.getar, 6 + S.tb * 4);
    if (Math.random() < dt * 14) { ledak(b.x + rnd(-60, 60), b.y + rnd(-60, 60), Math.random() < .5 ? '#ffb347' : '#ff2e63', 18, 260, 0.7, 6); cincin(b.x + rnd(-50, 50), b.y + rnd(-50, 50), '#ffd166', 90, 0.4); }
    if (S.tb >= 2) {
      b.mati = true; S.getar = 36; S.kilat = 1.4; S.kilatWarna = '255,255,255'; bunyi('ledakan');
      ledak(b.x, b.y, '#ffffff', 120, 520, 1.2, 8); ledak(b.x, b.y, '#ff2e90', 120, 420, 1.2, 7);
      [300, 600, 900, 1200].forEach((m, i) => cincin(b.x, b.y, i % 2 ? '#ffd166' : '#ffffff', m, 0.9 + i * 0.15));
    }
  }
  if (S.tb >= 3.8) akhir('menang');
}

/* --- KELOMPOK FUNGSI PEMBARUAN LOGIKA UTAMA (UPDATE) --- */

// update game
function perbarui(dt) {
  S.waktu += dt;
  if (S.status === 'main') {
    ubahPemain(dt); ubahAntrean(dt);
    for (const v of S.virus) ubahVirus(v, dt);
    separar(); tabrakan(dt);
    S.virus = S.virus.filter((v) => !v.mati);
    if (S.status === 'main' && S.tewas >= S.total && S.antrean.every((a) => a.sisa === 0) && S.gel < 5) mulaiGelombang(S.gel + 1);
  } else if (S.status === 'bosMati') ubahBosMati(dt);
  else if (S.status === 'gugur') { S.tg += dt; if (S.tg >= 1.1) akhir('kalah'); }
  ubahEfek(dt);
}

// wave
function ubahAntrean(dt) {
  if (S.banner > 0) { S.banner -= dt; return; }
  for (const a of S.antrean) {
    if (a.sisa <= 0) continue;
    a.w -= dt; if (a.w <= 0) { a.w += a.i; a.sisa--; munculkan(a.t); }
  }
}

// collasion
function tabrakan(dt) {
  const p = S.p;
  for (const b of S.peluru) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
    if (b.x < ARENA.x || b.x > ARENA.x + ARENA.s || b.y < ARENA.y || b.y > ARENA.y + ARENA.s) { ledak(b.x, b.y, '#aaffee', 4, 120, 0.25, 3); b.vida = 0; continue; }
    for (const v of S.virus) {
      if (v.mati || v.sekarat) continue;
      const dx = b.x - v.x, dy = b.y - v.y, rr = v.r + 5;
      if (dx * dx + dy * dy < rr * rr) {
        b.vida = 0; v.hp--; v.kilat = 0.08;
        if (v.t !== 'bos') { v.kb.x += b.vx * 0.12; v.kb.y += b.vy * 0.12; }
        ledak(b.x, b.y, JENIS[v.t].warna, 5, 200, 0.35, 4); ledak(b.x, b.y, '#ffffff', 2, 160, 0.2, 3); bunyi('kena');
        if (v.hp <= 0) matikan(v);
        break;
      }
    }
  }
  S.peluru = S.peluru.filter((b) => b.vida > 0);
  for (const v of S.virus) {
    if (v.mati || v.sekarat || v.cd > 0 || p.dash > 0) continue;
    const dx = p.x - v.x, dy = p.y - v.y, d = Math.hypot(dx, dy) || 1;
    if (d < v.r + p.r * 0.85) {
      v.cd = 0.9; const kb = v.t === 'bos' ? 120 : 380; v.kb.x = -dx / d * kb; v.kb.y = -dy / d * kb;
      if (v.t === 'dash' && v.mode === 2) v.siklus = 0;
      if (p.perisai) { bunyi('tameng'); ledak(p.x + dx / d * -p.r, p.y + dy / d * -p.r, '#7ff3ff', 8, 220, 0.3, 4); cincin(p.x, p.y, '#7ff3ff', 55, 0.25); }
      else if (p.kebal <= 0) lukai(JENIS[v.t].dmg);
    }
  }
  for (const o of S.bola) {
    o.x += o.vx * dt; o.y += o.vy * dt; o.vida -= dt;
    if (o.x < ARENA.x || o.x > ARENA.x + ARENA.s || o.y < ARENA.y || o.y > ARENA.y + ARENA.s) { ledak(o.x, o.y, '#ffae00', 6, 150, 0.3, 4); o.vida = 0; continue; }
    if (p.dash > 0 || Math.hypot(o.x - p.x, o.y - p.y) >= o.r + p.r * 0.85) continue;
    o.vida = 0;
    if (p.perisai) { bunyi('tameng'); ledak(o.x, o.y, '#7ff3ff', 8, 200, 0.3, 4); }
    else if (p.kebal <= 0) { ledak(o.x, o.y, '#ffae00', 10, 220, 0.4, 5); lukai(JENIS.bos.dmg); }
  }
  S.bola = S.bola.filter((o) => o.vida > 0);
}

// cek menang/kalah
function akhir(jenis) {
  S.status = 'selesai'; cancelAnimationFrame(rafId); gambar();
  $(jenis === 'menang' ? 'menang' : 'gameover').hidden = false;
}

/* --- KELOMPOK FUNGSI MENGGAMBAR KE LAYAR KANVAS --- */

// draw
function gambar() {
  const p = S.p;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(latar, 0, 0);
  g.save();
  if (S.getar > 0.3) g.translate(rnd(-1, 1) * S.getar, rnd(-1, 1) * S.getar);
  g.fillStyle = '#ffb3c6';
  for (const d of debu) { g.globalAlpha = 0.18; g.beginPath(); g.arc(d.x + Math.sin(S.waktu * 0.4 + d.f) * 25, d.y + Math.cos(S.waktu * 0.3 + d.f) * 25, d.r, 0, lingkar); g.fill(); }
  g.globalAlpha = 0.6 + 0.2 * Math.sin(S.waktu * 2); g.strokeStyle = '#ff5a7a'; g.lineWidth = 4; g.strokeRect(ARENA.x, ARENA.y, ARENA.s, ARENA.s); g.globalAlpha = 1;
  for (const v of S.virus) if (!v.mati && v.t !== 'bos') gambarVirus(v);
  for (const v of S.virus) if (!v.mati && v.t === 'bos') gambarBos(v);
  g.globalCompositeOperation = 'lighter';
  for (const b of S.peluru) {
    g.strokeStyle = 'rgba(90,255,200,.5)'; g.lineWidth = 6; g.beginPath(); g.moveTo(b.x - b.vx * 0.04, b.y - b.vy * 0.04); g.lineTo(b.x, b.y); g.stroke();
    g.fillStyle = '#ccfff0'; g.beginPath(); g.arc(b.x, b.y, 5, 0, lingkar); g.fill();
  }
  for (const o of S.bola) {
    g.fillStyle = 'rgba(255,160,0,.35)'; g.beginPath(); g.arc(o.x, o.y, o.r * 1.7, 0, lingkar); g.fill();
    g.fillStyle = '#ffb84d'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, lingkar); g.fill();
  }
  for (const q of S.partikel) { g.globalAlpha = q.u / q.m; g.fillStyle = q.w; g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, q.k * (0.4 + 0.6 * q.u / q.m)), 0, lingkar); g.fill(); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (S.status !== 'gugur' || S.tg < 0.15) gambarPemain(p);
  for (const c of S.cincin) {
    const k = c.u / c.d; g.globalAlpha = 1 - k; g.strokeStyle = c.w; g.lineWidth = 7 * (1 - k) + 1;
    g.beginPath(); g.arc(c.x, c.y, c.mk * (1 - (1 - k) * (1 - k)), 0, lingkar); g.stroke();
  }
  g.globalAlpha = 1; g.restore();
  g.fillStyle = vinyet; g.fillRect(0, 0, LEBAR, TINGGI);
  if (S.kilat > 0) { g.fillStyle = `rgba(${S.kilatWarna},${Math.min(1, S.kilat)})`; g.fillRect(0, 0, LEBAR, TINGGI); }
  gambarHud();
}

// draw virus
function gambarVirus(v) {
  const j = JENIS[v.t], r = v.r, dn = 1 + Math.sin(S.waktu * 8 + v.fase) * 0.06, putih = v.kilat > 0;
  g.save(); g.translate(v.x, v.y);
  if (v.t === 'dash' && v.mode === 1) {
    g.strokeStyle = `rgba(255,60,90,${0.35 + 0.3 * Math.sin(S.waktu * 40)})`; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(v.ax * 190, v.ay * 190); g.stroke(); g.translate(rnd(-2, 2), rnd(-2, 2));
  }
  g.rotate(v.sudut); const w = putih ? '#fff' : j.warna;
  g.strokeStyle = w; g.fillStyle = w; g.lineWidth = v.t === 'lambat' ? 5 : 3;
  for (let i = 0; i < j.duri; i++) {
    const a = i / j.duri * lingkar, c = Math.cos(a), s = Math.sin(a);
    g.beginPath(); g.moveTo(c * r * 0.8, s * r * 0.8); g.lineTo(c * r * 1.45 * dn, s * r * 1.45 * dn); g.stroke();
    g.beginPath(); g.arc(c * r * 1.5 * dn, s * r * 1.5 * dn, r * 0.14, 0, lingkar); g.fill();
  }
  g.globalAlpha = 0.92; g.beginPath(); g.arc(0, 0, r * dn, 0, lingkar); g.fill(); g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(0, 0, r * 0.5, 0, lingkar); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(r * 0.25, 0, r * 0.22, 0, lingkar); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(r * 0.3, -r * 0.06, r * 0.08, 0, lingkar); g.fill();
  g.restore();
  if (v.max > 1 && v.hp < v.max) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(v.x - 16, v.y - r - 14, 32, 5); g.fillStyle = j.warna; g.fillRect(v.x - 16, v.y - r - 14, 32 * v.hp / v.max, 5); }
}

// draw boss
function gambarBos(b) {
  const r = b.r, kil = b.kilat > 0 || (b.sekarat && ((S.waktu * 20) | 0) % 2), dn = 1 + Math.sin(S.waktu * 4) * 0.04;
  g.save(); g.translate(b.x, b.y);
  if (b.sekarat) g.translate(rnd(-6, 6), rnd(-6, 6));
  if (b.pola === 'persiapan') {
    const k = (b.t2 % 0.5) / 0.5; g.strokeStyle = 'rgba(255,60,90,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r * (2.2 - k * 1.2), 0, lingkar); g.stroke();
    g.strokeStyle = 'rgba(255,60,90,.3)'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, 0); g.lineTo(b.ax * 520, b.ay * 520); g.stroke();
  }
  g.save(); g.rotate(b.sudut);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * lingkar, c = Math.cos(a), s = Math.sin(a);
    g.strokeStyle = kil ? '#fff' : '#ff5ea8'; g.lineWidth = 8; g.beginPath(); g.moveTo(c * r * 0.85, s * r * 0.85); g.lineTo(c * r * 1.35 * dn, s * r * 1.35 * dn); g.stroke();
    g.fillStyle = '#ffd166'; g.beginPath(); g.arc(c * r * 1.4 * dn, s * r * 1.4 * dn, 8, 0, lingkar); g.fill();
  }
  g.restore();
  g.fillStyle = kil ? '#fff' : '#5b1450'; g.strokeStyle = '#ff2e90'; g.lineWidth = 6;
  g.beginPath(); g.arc(0, 0, r * dn, 0, lingkar); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,46,99,.85)'; g.beginPath(); g.arc(0, 0, r * 0.3 * (1 + 0.15 * Math.sin(S.waktu * 6)), 0, lingkar); g.fill();
  g.rotate(Math.atan2(S.p.y - b.y, S.p.x - b.x));
  for (const sy of [-1, 1]) { g.fillStyle = '#ffe066'; g.beginPath(); g.arc(r * 0.42, sy * r * 0.3, 13, 0, lingkar); g.fill(); g.fillStyle = '#200'; g.beginPath(); g.arc(r * 0.47, sy * r * 0.3, 6, 0, lingkar); g.fill(); }
  g.strokeStyle = '#200'; g.lineWidth = 5; g.beginPath(); g.arc(r * 0.2, 0, b.pola === 'tembak' ? r * 0.22 : r * 0.12, -1, 1); g.stroke();
  g.restore();
}

// draw player
function gambarPemain(p) {
  for (const j of p.jejak) { g.globalAlpha = j.a * 0.35; g.fillStyle = '#bfefff'; g.beginPath(); g.arc(j.x, j.y, p.r * (0.5 + j.a * 0.5), 0, lingkar); g.fill(); }
  g.globalAlpha = 1; g.save(); g.translate(p.x, p.y);
  if (S.status === 'gugur') g.globalAlpha = Math.max(0, 1 - S.tg * 6);
  else if (p.kebal > 0 && p.dash <= 0 && ((S.waktu * 20) | 0) % 2) g.globalAlpha = 0.4;
  g.save(); g.rotate(S.waktu * 0.4);
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = i / 24 * lingkar, rr = p.r * (1 + 0.07 * Math.sin(a * 5 + S.waktu * 6)); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.fillStyle = '#eaf6ff'; g.fill(); g.strokeStyle = '#7fd4ff'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#8e6bd9'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(Math.cos(i * 2.1) * 7, Math.sin(i * 2.1) * 7, 6, 0, lingkar); g.fill(); }
  g.restore();
  g.save(); g.rotate(p.sudut); const rc = p.recoil;
  g.fillStyle = 'rgba(210,245,255,.9)'; g.fillRect(14 - rc, -5, 30, 10);
  g.fillStyle = '#5dffb0'; g.fillRect(18 - rc, -3, 22, 6);
  g.fillStyle = '#dfe'; g.fillRect(8 - rc, -7, 6, 14);
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(44 - rc, 0); g.lineTo(58 - rc, 0); g.stroke();
  g.restore();
  if (p.perisai) {
    const R = p.r + 16, pl = 0.8 + 0.2 * Math.sin(S.waktu * 12);
    g.fillStyle = 'rgba(80,220,255,.16)'; g.beginPath(); g.arc(0, 0, R, 0, lingkar); g.fill();
    g.strokeStyle = `rgba(127,243,255,${pl})`; g.lineWidth = 4;
    for (let i = 0; i < 6; i++) { const a = S.waktu * 2 + i * lingkar / 6; g.beginPath(); g.arc(0, 0, R, a, a + 0.8); g.stroke(); }
  }
  g.restore(); g.globalAlpha = 1;
}

// bar
function bar(x, y, w, h, f, warna) {
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, w, h); g.fillStyle = warna; g.fillRect(x, y, w * clamp(f, 0, 1), h);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
}

// draw ui
function gambarHud() {
  const p = S.p; g.font = 'bold 14px "Trebuchet MS", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
  bar(120, 14, 260, 18, p.hp / PEMAIN.hp, p.hp > 30 ? '#ff4d6d' : '#ff1744');
  g.fillStyle = '#fff'; g.fillText('HP ' + Math.ceil(p.hp) + '/' + PEMAIN.hp, 128, 24);
  const f = p.dash > 0 ? 1 : 1 - Math.max(0, p.dashCd) / PEMAIN.dashCd;
  bar(120, 40, 130, 10, f, f >= 1 ? '#5ef2ff' : '#3a6a80'); g.fillStyle = '#bfefff'; g.fillText(f >= 1 ? 'DASH SIAP' : 'DASH', 258, 46);
  if (p.perisai) { g.fillStyle = '#7ff3ff'; g.fillText('SHIELD AKTIF', 340, 46); }
  g.textAlign = 'center'; g.font = 'bold 22px "Trebuchet MS", sans-serif'; g.fillStyle = '#ffd1dc'; g.fillText(`GELOMBANG ${S.gel}/5`, 560, 26);
  g.textAlign = 'right'; g.font = 'bold 16px "Trebuchet MS", sans-serif'; g.fillStyle = '#c8ffb8'; g.fillText('VIRUS TERSISA: ' + Math.max(0, S.total - S.tewas), 880, 26);
  const b = S.bos;
  if (b && !b.mati) {
    g.textAlign = 'center'; bar(ARENA.x, TINGGI - 34, ARENA.s, 20, b.hp / b.max, '#c0267e'); g.fillStyle = '#fff'; g.font = 'bold 14px "Trebuchet MS", sans-serif';
    g.fillText('RAJA VIRUS  ' + Math.max(0, b.hp) + '/' + b.max, LEBAR / 2, TINGGI - 24);
  }
  if (S.banner > 0 && S.status === 'main') {
    g.globalAlpha = Math.min(1, S.banner * 1.5, (2.4 - S.banner) * 3); g.textAlign = 'center';
    g.font = 'bold 54px "Trebuchet MS", sans-serif'; g.lineWidth = 6; g.strokeStyle = '#2a0010'; g.fillStyle = '#ffe0e8';
    g.strokeText(S.bannerTeks, LEBAR / 2, TINGGI / 2 - 70); g.fillText(S.bannerTeks, LEBAR / 2, TINGGI / 2 - 70);
    g.font = '22px "Trebuchet MS", sans-serif'; g.fillStyle = '#c8ffb8'; g.fillText(SUB_GELOMBANG[S.gel - 1], LEBAR / 2, TINGGI / 2 - 25); g.globalAlpha = 1;
  }
}

// loop, ui

// loop
function putaran(t) {
  const dt = Math.min(0.05, (t - tAwal) / 1000); tAwal = t;
  perbarui(dt); gambar();
  if (S.status !== 'selesai') rafId = requestAnimationFrame(putaran);
}

// play
function mulai() {
  aktifkanSuara();
  for (const id of ['menu', 'cerita', 'gameover', 'menang']) $(id).hidden = true;
  cancelAnimationFrame(rafId); baru(); tAwal = performance.now(); rafId = requestAnimationFrame(putaran);
}

/* --- PENGAWAS EVENT TOMBOL & PERANGKAT INPUT (EVENT LISTENERS) --- */

// fungsi button ui
$('btnMain').onclick = () => { aktifkanSuara(); $('menu').hidden = true; $('cerita').hidden = false; };
$('btnMulai').onclick = mulai; $('btnUlang').onclick = mulai; $('btnUlang2').onclick = mulai;

const ubahBisu = () => { setBisu(!apakahBisu()); $('btnBisu').textContent = apakahBisu() ? '🔇' : '🔊'; };
$('btnBisu').onclick = ubahBisu;

// cek tombol yang ditekan
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) mulaiDash(); }
  if (e.code === 'KeyM' && !e.repeat) ubahBisu();
  tombol.add(e.code);
});


window.addEventListener('keyup', (e) => tombol.delete(e.code));

window.addEventListener('blur', () => { tombol.clear(); tetikus.kiri = tetikus.kanan = false; });

// mouse
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect(); tetikus.x = (e.clientX - r.left) * LEBAR / r.width; tetikus.y = (e.clientY - r.top) * TINGGI / r.height;
});

canvas.addEventListener('mousedown', (e) => { if (e.button === 0) tetikus.kiri = true; if (e.button === 2) tetikus.kanan = true; });
window.addEventListener('mouseup', (e) => { if (e.button === 0) tetikus.kiri = false; if (e.button === 2) tetikus.kanan = false; });

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
