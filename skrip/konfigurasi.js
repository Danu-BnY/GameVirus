// arena
export const LEBAR = 1000, TINGGI = 880;
export const ARENA = { x: 120, y: 70, s: 760 }; // arena persegi

// player
export const PEMAIN = { hp: 100, r: 22, kec: 260, dashDurasi: 0.7, dashCd: 0.5, dashKec: 700, jedaTembak: 0.12, kebal: 0.5 };

// set up virus
export const JENIS = {
  biasa:  { r: 16, kec: 95,  hp: 1,   dmg: 5,  warna: '#7dff6b', duri: 10 },
  cepat:  { r: 13, kec: 190, hp: 1,   dmg: 5,  warna: '#ffd84a', duri: 8 },
  lambat: { r: 27, kec: 55,  hp: 10,  dmg: 5,  warna: '#b57bff', duri: 12 },
  dash:   { r: 17, kec: 0,   hp: 5,   dmg: 5,  warna: '#ff4d6d', duri: 6 },
  bos:    { r: 72, kec: 80,  hp: 500, dmg: 10, warna: '#c0267e', duri: 16 },
};

// t = jenis, n = jumlah, i = interval spawn (detik)
export const GELOMBANG = [
  [{ t: 'biasa', n: 50, i: 0.5 }],
  [{ t: 'biasa', n: 35, i: 0.7 }, { t: 'cepat', n: 15, i: 1 }],
  [{ t: 'biasa', n: 30, i: 0.8 }, { t: 'cepat', n: 15, i: 1.2 }, { t: 'lambat', n: 5, i: 2 }],
  [{ t: 'biasa', n: 20, i: 1 }, { t: 'cepat', n: 10, i: 1.5 }, { t: 'lambat', n: 5, i: 2.5 }, { t: 'dash', n: 15, i: 1 }],
  [{ t: 'biasa', n: 30, i: 0.8 }, { t: 'cepat', n: 20, i: 1.1 }, { t: 'lambat', n: 10, i: 2.2 }, { t: 'dash', n: 20, i: 1.2 }, { t: 'bos', n: 1, i: 3 }],
];
export const SUB_GELOMBANG = ['Virus biasa menyerbu!', 'Virus cepat bergabung!', 'Virus lambat yang tangguh!', 'Virus dash menerjang!', 'RAJA VIRUS muncul!'];
