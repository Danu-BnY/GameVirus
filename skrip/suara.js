// aktif / nonaktif suara
let ctx = null, bisu = false;
const terakhir = {};

export function aktifkanSuara() {
  if (!ctx) { try { ctx = new AudioContext(); } catch (e) { ctx = null; } }
  if (ctx) ctx.resume();
}
export const setBisu = (b) => { bisu = b; };
export const apakahBisu = () => bisu;

// tone
function tone(f1, f2, d, tipe = 'sine', v = 0.05) {
  const t = ctx.currentTime, o = ctx.createOscillator(), n = ctx.createGain();
  o.type = tipe; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
  n.gain.setValueAtTime(v, t); n.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(n); n.connect(ctx.destination); o.start(t); o.stop(t + d);
}

// noise
function noise(d, v) {
  const t = ctx.currentTime, buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * d), ctx.sampleRate);
  const a = buf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), n = ctx.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 900;
  n.gain.setValueAtTime(v, t); n.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(n); n.connect(ctx.destination); s.start(t);
}

// efek suara
const efek = {
  tembak: () => tone(900, 300, 0.07, 'square', 0.025),
  kena: () => tone(220, 90, 0.08, 'triangle', 0.06),
  mati: () => { tone(320, 60, 0.18, 'sawtooth', 0.04); noise(0.12, 0.05); },
  dash: () => tone(250, 900, 0.2, 'sine', 0.07),
  tameng: () => tone(700, 500, 0.06, 'square', 0.035),
  luka: () => tone(160, 50, 0.3, 'sawtooth', 0.1),
  bosTembak: () => tone(220, 110, 0.15, 'sine', 0.08),
  hantam: () => { noise(0.3, 0.2); tone(100, 40, 0.3, 'sine', 0.12); },
  ledakan: () => { noise(1.2, 0.25); tone(120, 30, 1, 'sawtooth', 0.1); },
  gelombang: () => tone(300, 600, 0.25, 'sine', 0.06),
};

// Putar efek, dibatasi agar tidak menumpuk setiap frame.
export function bunyi(nama) {
  if (!ctx || bisu) return;
  const t = performance.now();
  if (t - (terakhir[nama] || 0) < 45) return;
  terakhir[nama] = t; efek[nama]();
}
