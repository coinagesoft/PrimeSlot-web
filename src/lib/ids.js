// Firebase-style push IDs (20 chars, chronologically sortable, e.g. "-OdlyNUx-2kU10Qz7oka").
// Kept compatible with the IDs already stored in the database so old and new keys sort together.
const CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
let lastTime = 0;
let lastRand = [];

export function generatePushId() {
  let now = Date.now();
  const dup = now === lastTime;
  lastTime = now;

  const ts = new Array(8);
  for (let i = 7; i >= 0; i--) {
    ts[i] = CHARS.charAt(now % 64);
    now = Math.floor(now / 64);
  }
  let id = ts.join('');

  if (!dup) {
    lastRand = Array.from({ length: 12 }, () => Math.floor(Math.random() * 64));
  } else {
    let i = 11;
    for (; i >= 0 && lastRand[i] === 63; i--) lastRand[i] = 0;
    if (i >= 0) lastRand[i]++;
  }
  for (let i = 0; i < 12; i++) id += CHARS.charAt(lastRand[i]);
  return id;
}
