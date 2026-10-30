/* =====================================================================
   SPRITES — all pixel art is drawn here in code (no image files).
   Lenny: blond hair, blue eyes, red/white football shirt,
   blue-and-yellow backpack, black bike. Original art only.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Sprites = (function () {
  const C = {
    outline: '#2b1d16',
    hair: '#f2d06b', hairDark: '#c9a23a',
    skin: '#f6c9a6', skinDark: '#e0a583',
    eye: '#2f6fd6', white: '#f7f4ee',
    red: '#d3192c', redDark: '#9e1020',
    pants: '#2c3a66', shoe: '#ece7dc',
    bag: '#1d3f97', bagBand: '#f5c518',
    bike: '#18181c', bikeHi: '#4a4a55', tyre: '#2a2a2e', rim: '#9aa0a8'
  };

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    return { c, ctx };
  }
  function painter(ctx, ox, oy) {
    return function r(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, w, h); };
  }
  // Adds a 1px dark outline around every opaque pixel (cozy pixel look).
  function outline(ctx, w, h, col) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
    const marks = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) marks.push([x, y]);
    }
    ctx.fillStyle = col;
    marks.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
  }

  /* ---------- Lenny body parts (16 wide, drawn inside a 24x24 cell) ---------- */
  function legs(r, frame, side) {
    if (!side) {
      const a = frame === 1 ? 2 : 3, b = frame === 2 ? 2 : 3;
      r(5, 19, 2, a, C.skin); r(5, 19 + a, 2, 1, C.shoe);
      r(9, 19, 2, b, C.skin); r(9, 19 + b, 2, 1, C.shoe);
    } else {
      if (frame === 0) { r(6, 19, 3, 3, C.skin); r(5, 22, 4, 1, C.shoe); }
      else if (frame === 1) { r(4, 19, 2, 3, C.skin); r(3, 22, 3, 1, C.shoe); r(8, 19, 2, 3, C.skinDark); r(8, 22, 3, 1, C.shoe); }
      else { r(5, 19, 2, 3, C.skinDark); r(4, 22, 3, 1, C.shoe); r(7, 19, 2, 3, C.skin); r(7, 22, 3, 1, C.shoe); }
    }
  }
  function front(r, frame, noLegs) {
    r(5, 2, 6, 1, C.hair); r(4, 3, 8, 2, C.hair); r(4, 3, 8, 1, C.hairDark);
    r(4, 5, 8, 5, C.skin);
    r(4, 5, 8, 1, C.hair); r(4, 6, 1, 2, C.hair); r(11, 6, 1, 2, C.hair); r(6, 5, 2, 1, C.hairDark);
    r(6, 7, 1, 1, C.eye); r(9, 7, 1, 1, C.eye);
    r(7, 9, 2, 1, C.skinDark);
    r(7, 10, 2, 1, C.skin);
    r(4, 11, 4, 6, C.white); r(8, 11, 4, 6, C.red); r(8, 16, 4, 1, C.redDark);
    r(5, 11, 1, 4, C.bag); r(10, 11, 1, 4, C.bag);
    r(3, 11, 1, 2, C.white); r(12, 11, 1, 2, C.red);
    const sw = frame === 1 ? 1 : 0, sw2 = frame === 2 ? 1 : 0;
    r(3, 13 - sw, 1, 3, C.skin); r(12, 13 - sw2, 1, 3, C.skin);
    r(4, 17, 8, 2, C.pants);
    if (!noLegs) legs(r, frame, false);
  }
  function back(r, frame, noLegs) {
    r(5, 2, 6, 1, C.hair); r(4, 3, 8, 7, C.hair); r(4, 8, 8, 2, C.hairDark);
    r(7, 10, 2, 1, C.skin);
    r(3, 11, 1, 2, C.red); r(12, 11, 1, 2, C.white);
    r(4, 11, 8, 6, C.bag); r(4, 13, 8, 2, C.bagBand); r(5, 11, 6, 1, '#2a52b8');
    const sw = frame === 1 ? 1 : 0, sw2 = frame === 2 ? 1 : 0;
    r(3, 13 - sw, 1, 3, C.skin); r(12, 13 - sw2, 1, 3, C.skin);
    r(4, 17, 8, 2, C.pants);
    if (!noLegs) legs(r, frame, false);
  }
  function side(r, frame, noLegs) { // facing left
    r(5, 2, 5, 1, C.hair); r(4, 3, 7, 2, C.hair);
    r(4, 5, 6, 5, C.skin); r(3, 7, 1, 1, C.skin);
    r(4, 5, 6, 1, C.hair); r(9, 5, 2, 4, C.hair); r(8, 6, 1, 1, C.hairDark);
    r(5, 7, 1, 1, C.eye);
    r(5, 9, 1, 1, C.skinDark);
    r(6, 10, 2, 1, C.skin);
    r(5, 11, 3, 6, C.white); r(8, 11, 2, 6, C.red);
    r(10, 11, 3, 6, C.bag); r(10, 13, 3, 2, C.bagBand);
    const ax = frame === 1 ? 5 : (frame === 2 ? 8 : 7);
    r(ax, 12, 2, 2, C.white); r(ax, 14, 2, 2, C.skin);
    r(5, 17, 5, 2, C.pants);
    if (!noLegs) legs(r, frame, true);
  }
  function wheel(r, cx, cy, rad, spin) {
    for (let a = 0; a < 32; a++) {
      const t = a / 32 * Math.PI * 2;
      r(Math.round(cx + Math.cos(t) * rad), Math.round(cy + Math.sin(t) * rad), 1, 1, C.tyre);
    }
    r(cx, cy, 1, 1, C.rim);
    const k = spin ? 1 : 0;
    r(cx - 2 + k, cy - 2 + k * 3, 1, 1, C.rim); r(cx + 2 - k, cy + 2 - k * 3, 1, 1, C.rim);
  }
  function bikeSide(ctx, frame) {
    const r = painter(ctx, 0, 0);
    // bike (facing left): front wheel left
    wheel(r, 5, 18, 4, frame); wheel(r, 18, 18, 4, frame);
    r(6, 17, 7, 1, C.bike); r(12, 13, 1, 5, C.bike); r(7, 13, 6, 1, C.bike);
    r(13, 17, 5, 1, C.bike); r(13, 14, 1, 1, C.bike); r(14, 15, 2, 1, C.bike); r(16, 16, 2, 1, C.bike);
    r(6, 11, 1, 6, C.bike); r(5, 10, 3, 1, C.bikeHi);
    r(11, 12, 3, 1, C.bikeHi);
    // rider, shifted up and to the right
    const rr = painter(ctx, 5, -3);
    side(rr, 0, true);
    rr(5, 17, 5, 2, C.pants);
    // bent leg to pedal
    const p = frame ? 1 : 0;
    r(10, 16, 2, 2 + p, C.skin); r(10, 18 + p, 3, 1, C.shoe);
    // arm to handlebar
    r(7, 10, 4, 1, C.skin);
  }
  function bikeFront(ctx, frame, isBack) {
    const r = painter(ctx, 0, 0);
    r(11, 17, 2, 7, C.tyre); r(11, 20 + (frame ? 1 : 0), 2, 1, C.rim);
    const rr = painter(ctx, 4, -2);
    if (isBack) back(rr, 0, true); else front(rr, 0, true);
    r(9, 17, 2, 2, C.pants); r(13, 17, 2, 2, C.pants);
    r(8, 19, 2, 2 + (frame ? 1 : 0), C.skin); r(14, 19, 2, 3 - (frame ? 1 : 0), C.skin);
    if (!isBack) { r(5, 12, 14, 1, C.bike); r(5, 11, 1, 2, C.bikeHi); r(18, 11, 1, 2, C.bikeHi); r(11, 13, 2, 1, '#f7e27a'); }
    else { r(11, 16, 2, 1, '#e23b3b'); r(9, 15, 6, 1, C.bike); }
  }

  /* Frames (24x24 each), row of 15:
     0-2 walk down | 3-5 walk up | 6-8 walk side(left)
     9-10 bike down | 11-12 bike up | 13-14 bike side(left) */
  function lennySheet(opts) {
    const N = 15, S = 24;
    // opts.bike / opts.bikeHi recolour the bike (the golden bike reward, see extras.js)
    const keep = { bike: C.bike, bikeHi: C.bikeHi };
    if (opts && opts.bike) { C.bike = opts.bike; C.bikeHi = opts.bikeHi || opts.bike; }
    const sheet = canvas(N * S, S);
    for (let i = 0; i < N; i++) {
      const cell = canvas(S, S);
      const r = painter(cell.ctx, 4, 0);
      if (i < 3) front(r, i);
      else if (i < 6) back(r, i - 3);
      else if (i < 9) side(r, i - 6);
      else if (i < 11) bikeFront(cell.ctx, i - 9, false);
      else if (i < 13) bikeFront(cell.ctx, i - 11, true);
      else bikeSide(cell.ctx, i - 13);
      outline(cell.ctx, S, S, C.outline);
      sheet.ctx.drawImage(cell.c, i * S, 0);
    }
    C.bike = keep.bike; C.bikeHi = keep.bikeHi;
    return sheet.c;
  }

  /* Kit, Lenny's cat — the friendly guide. Brown tabby with dark stripes,
     big yellow-green eyes, pink nose, white whiskers (from the photo). */
  const KIT = { fur: '#7d6549', light: '#b39871', muzzle: '#d2b78e', dark: '#3b2c1f', ear: '#d99a8c',
                nose: '#d47f74', eye: '#d6d23e', pupil: '#17130f', white: '#fbf7ee', whisker: '#f4efe6' };

  /* Map sprite: Kit sitting, 2 frames (tail swish + blink), 16x16 each */
  function kitSheet() {
    const K = KIT, sheet = canvas(32, 16);
    for (let f = 0; f < 2; f++) {
      const cell = canvas(16, 16), r = painter(cell.ctx, 0, 0);
      // tail
      if (f) { r(11, 13, 4, 1, K.fur); r(14, 10, 1, 3, K.fur); r(14, 10, 1, 1, K.dark); }
      else { r(11, 13, 3, 1, K.fur); r(13, 9, 1, 4, K.fur); r(13, 9, 1, 1, K.dark); }
      // body
      r(4, 8, 8, 6, K.fur); r(3, 10, 10, 4, K.fur);
      r(6, 8, 4, 5, K.light); r(3, 11, 1, 1, K.dark); r(12, 11, 1, 1, K.dark); r(4, 9, 1, 1, K.dark); r(11, 9, 1, 1, K.dark);
      r(5, 14, 2, 1, K.light); r(9, 14, 2, 1, K.light);
      // head + ears
      r(4, 1, 1, 1, K.fur); r(4, 2, 2, 1, K.fur); r(11, 1, 1, 1, K.fur); r(10, 2, 2, 1, K.fur);
      r(4, 3, 8, 5, K.fur); r(3, 4, 10, 3, K.fur);
      r(7, 3, 2, 1, K.dark); r(5, 3, 1, 1, K.dark); r(10, 3, 1, 1, K.dark); r(3, 5, 1, 1, K.dark); r(12, 5, 1, 1, K.dark);
      r(6, 6, 4, 2, K.muzzle);
      if (f) { r(5, 5, 2, 1, K.dark); r(9, 5, 2, 1, K.dark); }
      else { r(5, 5, 2, 1, K.eye); r(9, 5, 2, 1, K.eye); r(6, 5, 1, 1, K.pupil); r(9, 5, 1, 1, K.pupil); }
      r(7, 6, 2, 1, K.nose);
      outline(cell.ctx, 16, 16, C.outline);
      sheet.ctx.drawImage(cell.c, f * 16, 0);
    }
    return sheet.c;
  }

  /* A cat walking, seen from the side (facing left; flip for right). 4 frames of
     16x16, a soft trot: diagonal legs move together, the paw in the air is
     lifted, the body bobs and the tail sways. P = palette (Kit by default;
     Fifi has her own). P.tux = black-and-white "tuxedo" markings. */
  function catWalkSheet(P) {
    const K = P || KIT, sheet = canvas(64, 16);
    // each leg: [x, lifted?] per frame — near-front, far-front, near-back, far-back
    const LEGS = [
      [[5, 0], [7, 1], [12, 1], [10, 0]],
      [[6, 1], [6, 0], [11, 0], [11, 1]],
      [[7, 1], [5, 0], [10, 0], [12, 1]],
      [[6, 0], [6, 1], [11, 1], [11, 0]]
    ];
    const BOB = [0, -1, 0, -1];
    const TAIL = [[[13, 7], [14, 6], [14, 5], [14, 4]], [[13, 7], [14, 6], [15, 5], [15, 4]], [[13, 7], [14, 6], [14, 5], [14, 4]], [[13, 7], [14, 7], [15, 6], [15, 5]]];
    const leg = (r, x, up, col, paw) => { if (up) { r(x, 11, 1, 2, col); r(x - 1, 12, 1, 1, paw); } else { r(x, 11, 1, 3, col); r(x, 14, 1, 1, paw); } };
    for (let f = 0; f < 4; f++) {
      const cell = canvas(16, 16), b = BOB[f], r = painter(cell.ctx, 0, b), rl = painter(cell.ctx, 0, 0);
      const L = LEGS[f];
      const farCol = K.legFar || K.dark, nearCol = K.leg || K.fur, paw = K.paw || K.light;
      // far legs first (behind the body)
      leg(rl, L[1][0], L[1][1], farCol, paw); leg(rl, L[3][0], L[3][1], farCol, paw);
      // tail
      TAIL[f].forEach(([x, y]) => r(x, y, 1, 1, K.fur)); r(TAIL[f][3][0], TAIL[f][3][1], 1, 1, K.tailTip || K.dark);
      // body: rounded back, lighter belly
      r(5, 7, 8, 4, K.fur); r(6, 6, 6, 1, K.fur); r(6, 10, 6, 1, K.belly || K.light);
      if (K.stripes !== false) { r(8, 6, 1, 2, K.dark); r(10, 6, 1, 2, K.dark); }
      if (K.tux) { r(5, 9, 3, 2, K.light); }               // white chest
      // big round head (cute proportions), soft ears with pink inside
      r(1, 3, 5, 1, K.fur); r(0, 4, 7, 4, K.fur); r(1, 8, 5, 1, K.fur);
      r(0, 2, 2, 2, K.fur); r(5, 2, 2, 2, K.fur); r(0, 1, 1, 1, K.fur); r(6, 1, 1, 1, K.fur);
      r(1, 3, 1, 1, K.ear); r(5, 3, 1, 1, K.ear);
      if (K.stripes !== false) { r(3, 3, 1, 1, K.dark); }
      if (K.tux) { r(3, 3, 1, 3, K.light); r(1, 6, 4, 3, K.light); } // white blaze and muzzle
      else { r(1, 7, 3, 2, K.muzzle); }
      // big dark eye with a white sparkle, small pink nose, tiny smile
      if (K.eyeColor) { r(1, 5, 2, 2, K.eye); r(2, 6, 1, 1, K.pupil); r(1, 5, 1, 1, '#ffffff'); } // light eyes on dark fur
      else { r(1, 5, 2, 2, K.pupil || '#17130f'); r(1, 5, 1, 1, '#ffffff'); }
      r(0, 7, 1, 1, K.nose);
      r(1, 8, 1, 1, K.cheek || K.ear);
      // near legs on top
      leg(rl, L[0][0], L[0][1], nearCol, paw); leg(rl, L[2][0], L[2][1], nearCol, paw);
      outline(cell.ctx, 16, 16, C.outline);
      sheet.ctx.drawImage(cell.c, f * 16, 0);
    }
    return sheet.c;
  }

  /* Fifi, the family's cat (a boy), who hangs out at Mam's: black and white ("tuxedo") — black head and
     back, a white stripe down the face, white muzzle, chest and paws, a pink
     nose and big green eyes (from the photo). */
  const FIFI = { fur: '#24242a', dark: '#24242a', light: '#f4f2ee', muzzle: '#f4f2ee', belly: '#f4f2ee', paw: '#f4f2ee',
                 leg: '#24242a', legFar: '#1a1a1f', ear: '#e8a3a8', nose: '#f0a2ad', eye: '#b8cf3e', pupil: '#121214',
                 whisker: '#f4efe6', tailTip: '#24242a', stripes: false, tux: true, eyeColor: true };
  /* Fifi sitting (16x16, 2 frames: tail + blink), same pose as Kit. */
  function fifiSheet() {
    const K = FIFI, sheet = canvas(32, 16);
    for (let f = 0; f < 2; f++) {
      const cell = canvas(16, 16), r = painter(cell.ctx, 0, 0);
      if (f) { r(11, 13, 4, 1, K.fur); r(14, 10, 1, 3, K.fur); } else { r(11, 13, 3, 1, K.fur); r(13, 9, 1, 4, K.fur); }
      r(4, 8, 8, 6, K.fur); r(3, 10, 10, 4, K.fur);
      r(6, 8, 4, 6, K.light);                               // white chest
      r(4, 14, 2, 1, K.paw); r(10, 14, 2, 1, K.paw); r(5, 13, 2, 1, K.paw); r(9, 13, 2, 1, K.paw);
      r(4, 1, 1, 1, K.fur); r(4, 2, 2, 1, K.fur); r(11, 1, 1, 1, K.fur); r(10, 2, 2, 1, K.fur);
      r(5, 2, 1, 1, K.ear); r(10, 2, 1, 1, K.ear);
      r(4, 3, 8, 5, K.fur); r(3, 4, 10, 3, K.fur);
      r(7, 3, 2, 5, K.light); r(6, 6, 4, 2, K.light);       // white blaze and muzzle
      if (f) { r(5, 5, 2, 1, K.pupil); r(9, 5, 2, 1, K.pupil); }
      else { r(5, 5, 2, 1, K.eye); r(9, 5, 2, 1, K.eye); r(6, 5, 1, 1, K.pupil); r(9, 5, 1, 1, K.pupil); }
      r(7, 6, 2, 1, K.nose);
      outline(cell.ctx, 16, 16, C.outline);
      sheet.ctx.drawImage(cell.c, f * 16, 0);
    }
    return sheet.c;
  }

  /* Portrait for the speech bubble: Kit's face, 24x24, shown big and pixelated */
  let kitFaceURL = null;
  function kitPortrait() {
    if (kitFaceURL) return kitFaceURL;
    const K = KIT, S = 24, cv = canvas(S, S), r = painter(cv.ctx, 0, 0);
    // ears
    [[4,2,2],[4,3,3],[3,4,4],[3,5,5],[3,6,6]].forEach(([x,y,w]) => r(x, y, w, 1, K.fur));
    [[18,2,2],[17,3,3],[17,4,4],[16,5,5],[15,6,6]].forEach(([x,y,w]) => r(x, y, w, 1, K.fur));
    r(5, 4, 1, 1, K.ear); r(4, 5, 2, 1, K.ear); r(18, 4, 1, 1, K.ear); r(18, 5, 2, 1, K.ear);
    // head
    r(4, 7, 16, 10, K.fur); r(3, 8, 18, 8, K.fur); r(5, 17, 14, 2, K.fur); r(7, 19, 10, 1, K.fur);
    r(5, 15, 3, 3, K.light); r(16, 15, 3, 3, K.light);
    // tabby "M" on the forehead and cheek stripes
    r(8, 7, 1, 2, K.dark); r(10, 7, 1, 3, K.dark); r(13, 7, 1, 3, K.dark); r(15, 7, 1, 2, K.dark); r(11, 7, 2, 1, K.dark);
    r(3, 12, 2, 1, K.dark); r(3, 14, 2, 1, K.dark); r(19, 12, 2, 1, K.dark); r(19, 14, 2, 1, K.dark);
    // big round yellow-green eyes, looking up at Lenny
    r(6, 10, 4, 4, K.eye); r(14, 10, 4, 4, K.eye); r(5, 11, 6, 2, K.eye); r(13, 11, 6, 2, K.eye);
    [[5,10],[10,10],[5,13],[10,13],[13,10],[18,10],[13,13],[18,13]].forEach(([x, y]) => r(x, y, 1, 1, K.fur));
    r(7, 10, 2, 3, K.pupil); r(15, 10, 2, 3, K.pupil);
    r(8, 10, 1, 1, K.white); r(16, 10, 1, 1, K.white);
    // muzzle, nose, mouth
    r(9, 14, 6, 4, K.muzzle); r(10, 18, 4, 1, K.muzzle);
    r(11, 14, 2, 2, K.nose); r(11, 16, 2, 1, K.dark); r(10, 17, 1, 1, K.dark); r(13, 17, 1, 1, K.dark);
    outline(cv.ctx, S, S, C.outline);
    // whiskers stick out past the outline
    r(0, 15, 4, 1, K.whisker); r(1, 17, 3, 1, K.whisker); r(20, 15, 4, 1, K.whisker); r(20, 17, 3, 1, K.whisker);
    kitFaceURL = cv.c.toDataURL();
    return kitFaceURL;
  }

  /* ---------- Tileset (16x16 tiles) ----------
     0 grass  1 grass2  2 grass tuft  3 road  4 water  5 bridge  6 plaza  7 water2
     8 tree  9 pine  10 bush  11 flowers red  12 flowers yellow  13 fence  14 lamp  15 reeds
     16-19 house A (TL TR BL BR)  20-23 house B  24 star marker */
  const TILE = 16;
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function tileset() {
    const cols = 8, rows = 4;
    const t = canvas(cols * TILE, rows * TILE);
    const ctx = t.ctx;
    const at = (i) => painter(ctx, (i % cols) * TILE, Math.floor(i / cols) * TILE);
    const grass = (i, seed, tuft) => {
      const r = at(i), R = rng(seed);
      r(0, 0, 16, 16, '#7cb655');
      for (let k = 0; k < 14; k++) r(Math.floor(R() * 16), Math.floor(R() * 16), 1, 1, R() > .5 ? '#6ea84a' : '#8cc463');
      if (tuft) { r(4, 9, 1, 3, '#5d9640'); r(6, 8, 1, 4, '#5d9640'); r(8, 9, 1, 3, '#5d9640'); r(11, 4, 1, 2, '#5d9640'); r(12, 3, 1, 3, '#5d9640'); }
    };
    grass(0, 7); grass(1, 99); grass(2, 31, true);
    { // road: warm brick path
      const r = at(3); r(0, 0, 16, 16, '#d7b98a');
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) { r(x, y, 7, 3, '#cfae7c'); r(x, y + 3, 8, 1, '#bf9c6b'); }
    }
    const water = (i, ph) => {
      const r = at(i); r(0, 0, 16, 16, '#4f9fd6');
      for (let k = 0; k < 3; k++) { const y = 3 + k * 5, x = (k * 5 + ph) % 12; r(x, y, 4, 1, '#8fd0f2'); }
    };
    water(4, 1); water(7, 6);
    { const r = at(5); r(0, 0, 16, 16, '#4f9fd6'); r(0, 1, 16, 14, '#a8743f'); for (let x = 0; x < 16; x += 4) r(x, 1, 1, 14, '#7d522a'); r(0, 1, 16, 1, '#5e3c1d'); r(0, 14, 16, 1, '#5e3c1d'); }
    { const r = at(6); r(0, 0, 16, 16, '#d9cdb4'); r(0, 0, 8, 8, '#cfc2a6'); r(8, 8, 8, 8, '#cfc2a6'); }
    const clear = (i) => ctx.clearRect((i % cols) * TILE, Math.floor(i / cols) * TILE, TILE, TILE);
    for (let i = 8; i < 32; i++) clear(i);
    { const r = at(8); r(7, 11, 2, 4, '#6b4a2b'); r(3, 3, 10, 9, '#3f8a3a'); r(2, 5, 12, 5, '#3f8a3a'); r(4, 2, 8, 1, '#3f8a3a'); r(5, 4, 4, 3, '#5aa84d'); r(10, 8, 2, 2, '#2f6e2c'); r(3, 9, 3, 2, '#2f6e2c'); }
    { const r = at(9); r(7, 12, 2, 3, '#6b4a2b'); r(6, 1, 4, 3, '#2f7445'); r(4, 4, 8, 4, '#2f7445'); r(3, 8, 10, 4, '#2f7445'); r(6, 5, 2, 2, '#449160'); r(5, 9, 2, 2, '#449160'); }
    { const r = at(10); r(2, 7, 12, 7, '#4d9a42'); r(3, 6, 10, 1, '#4d9a42'); r(4, 8, 3, 2, '#68b55a'); r(10, 11, 2, 2, '#3a7c32'); }
    { const r = at(11); [[3, 4], [10, 6], [6, 10], [12, 12], [2, 12]].forEach(([x, y]) => { r(x, y + 2, 1, 2, '#3f7d32'); r(x - 1, y, 3, 2, '#e8475f'); r(x, y, 1, 1, '#ffd3da'); }); }
    { const r = at(12); [[4, 3], [11, 5], [7, 9], [13, 12], [3, 12]].forEach(([x, y]) => { r(x, y + 2, 1, 2, '#3f7d32'); r(x - 1, y, 3, 2, '#f4c430'); r(x, y, 1, 1, '#fff1b8'); }); }
    { const r = at(13); r(0, 6, 16, 2, '#a8743f'); r(0, 11, 16, 2, '#a8743f'); r(2, 4, 2, 11, '#8a5a2b'); r(12, 4, 2, 11, '#8a5a2b'); }
    { const r = at(14); r(7, 4, 2, 11, '#3b3b44'); r(5, 1, 6, 4, '#3b3b44'); r(6, 2, 4, 2, '#ffe28a'); r(6, 14, 4, 1, '#3b3b44'); }
    { const r = at(15); [[3, 4], [6, 2], [9, 5], [12, 3]].forEach(([x, y]) => { r(x, y, 1, 12 - y, '#5f8a3a'); r(x - 1, y, 3, 3, '#7a5530'); }); }
    const house = (base, roof, roofDark, wall) => {
      // 2x2 tiles = 32x32 cottage
      const big = canvas(32, 32), r = painter(big.ctx, 0, 0);
      r(2, 14, 28, 16, wall); r(2, 28, 28, 2, '#00000022');
      for (let y = 0; y < 14; y++) r(14 - y, y, 4 + y * 2, 1, y % 3 === 2 ? roofDark : roof);
      r(1, 13, 30, 2, roofDark);
      r(6, 18, 6, 5, '#7fc7ef'); r(6, 18, 6, 1, '#ffffff'); r(8, 18, 1, 5, wall); r(20, 18, 6, 5, '#7fc7ef'); r(22, 18, 1, 5, wall);
      r(13, 21, 6, 9, '#7a4b2a'); r(17, 25, 1, 1, '#f2d06b');
      r(22, 2, 3, 6, '#8a4b3a');
      outline(big.ctx, 32, 32, C.outline);
      const ox = (base % cols) * TILE, oy = Math.floor(base / cols) * TILE;
      ctx.drawImage(big.c, 0, 0, 16, 16, ox, oy, 16, 16);
      const b1 = base + 1; ctx.drawImage(big.c, 16, 0, 16, 16, (b1 % cols) * TILE, Math.floor(b1 / cols) * TILE, 16, 16);
      const b2 = base + 2; ctx.drawImage(big.c, 0, 16, 16, 16, (b2 % cols) * TILE, Math.floor(b2 / cols) * TILE, 16, 16);
      const b3 = base + 3; ctx.drawImage(big.c, 16, 16, 16, 16, (b3 % cols) * TILE, Math.floor(b3 / cols) * TILE, 16, 16);
    };
    house(16, '#c8583f', '#a2402c', '#efe2c4');
    house(20, '#4f7fb8', '#3b628f', '#f1e8d6');
    { const r = at(24); r(7, 1, 2, 2, '#f5c518'); r(5, 3, 6, 2, '#f5c518'); r(2, 5, 12, 2, '#f5c518'); r(4, 7, 8, 3, '#f5c518'); r(3, 10, 4, 3, '#f5c518'); r(9, 10, 4, 3, '#f5c518'); }
    { // 25: red fietspad (Dutch bike path), 26: where a street crosses it
      const R = rng(25), r = at(25); r(0, 0, 16, 16, '#c25a45');
      for (let k = 0; k < 18; k++) r(Math.floor(R() * 16), Math.floor(R() * 16), 1, 1, R() > .5 ? '#ad4a37' : '#d4705a');
      const q = at(26); q(0, 0, 16, 16, '#c25a45');
      for (let x = 1; x < 16; x += 5) { q(x, 1, 3, 3, '#f4efe4'); q(x, 12, 3, 3, '#f4efe4'); }
    }
    { // 27: small street (grey stones), 28-30: rows of houses seen from above (roofs), for the real city map
      const R = rng(27), r = at(27); r(0, 0, 16, 16, '#c9c2b4');
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 2; x < 16; x += 4) r(x, y, 3, 3, '#bdb5a6');
      for (let k = 0; k < 6; k++) r(Math.floor(R() * 16), Math.floor(R() * 16), 1, 1, '#d6d0c4');
      const roof = (i, col, dark, light) => {
        const q = at(i); q(0, 0, 16, 16, col);
        q(0, 7, 16, 2, dark); q(0, 0, 16, 1, light); q(0, 15, 16, 1, '#5e4636');
        for (let x = 3; x < 16; x += 8) { q(x, 2, 3, 3, '#7a5530'); q(x, 3, 3, 1, '#9b7148'); }
        q(0, 0, 1, 16, dark);
      };
      roof(28, '#b5523c', '#8e3d2c', '#cf6a52');
      roof(29, '#6f7f8f', '#55636f', '#8898a8');
      roof(30, '#a8743f', '#7d522a', '#c08a52');
    }
    // outline trees/bushes/etc
    for (const i of [8, 9, 10, 13, 14, 24]) {
      const cell = canvas(16, 16);
      cell.ctx.drawImage(t.c, (i % cols) * TILE, Math.floor(i / cols) * TILE, 16, 16, 0, 0, 16, 16);
      outline(cell.ctx, 16, 16, C.outline);
      clear(i); ctx.drawImage(cell.c, (i % cols) * TILE, Math.floor(i / cols) * TILE);
    }
    return t.c;
  }

  /* ---------- Family landmarks along the bike routes ---------- */
  function landmark(kind, id) {
    let k, r, W, H;
    const make = (w, h) => { W = w; H = h; k = canvas(w, h); r = painter(k.ctx, 0, 0); };
    if (kind === 'family') {
      // cosy house; Abu Ana's is red-roofed, Mam's is green-roofed. A heart on the door.
      make(48, 46);
      const roof = id === 'mam' ? '#4f9a62' : '#c8583f', roofD = id === 'mam' ? '#3a7a4b' : '#a2402c', wall = id === 'mam' ? '#f3e7cf' : '#f6e3c8';
      r(4, 20, 40, 24, wall); r(4, 41, 40, 3, '#d8c7a4');
      for (let y = 0; y < 18; y++) { const w = 12 + y * 2.2; r(Math.round(24 - w / 2), 3 + y, Math.round(w), 1, y % 3 === 2 ? roofD : roof); }
      r(2, 19, 44, 2, roofD);
      r(8, 25, 8, 7, '#7fc7ef'); r(8, 25, 8, 1, '#d6f1ff'); r(12, 25, 1, 7, wall);
      r(32, 25, 8, 7, '#7fc7ef'); r(32, 25, 8, 1, '#d6f1ff'); r(36, 25, 1, 7, wall);
      r(19, 28, 10, 16, '#7a4b2a'); r(27, 36, 1, 1, '#f2d06b');
      r(22, 31, 2, 2, '#e8475f'); r(25, 31, 2, 2, '#e8475f'); r(22, 33, 5, 1, '#e8475f'); r(23, 34, 3, 1, '#e8475f'); r(24, 35, 1, 1, '#e8475f');
      r(6, 38, 10, 3, '#8a5a2b'); r(7, 36, 2, 2, '#f4c430'); r(11, 36, 2, 2, '#e8475f'); r(32, 38, 10, 3, '#8a5a2b'); r(34, 36, 2, 2, '#e8475f'); r(38, 36, 2, 2, '#f4c430');
      r(34, 4, 4, 8, '#8a4b3a');
    } else if (kind === 'shed') {
      // the little blue house in the community garden, with veggies and a sunflower
      make(36, 34);
      r(6, 12, 24, 16, '#3f7fc8'); for (let x = 8; x < 30; x += 4) r(x, 12, 1, 16, '#336aa8');
      for (let y = 0; y < 9; y++) r(18 - (3 + y * 1.6), 3 + y, Math.round(6 + y * 3.2), 1, y % 3 === 2 ? '#5e3c1d' : '#7a5530');
      r(14, 18, 7, 10, '#f4efe4'); r(15, 19, 5, 9, '#2f5f96'); r(19, 23, 1, 1, '#f2d06b');
      r(23, 15, 5, 4, '#cfeaf8');
      r(1, 29, 34, 4, '#6b4a2b'); [3, 9, 15, 21, 27, 31].forEach((x, i) => { r(x, 27, 2, 2, i % 2 ? '#e86a2c' : '#3f8a3a'); });
      r(32, 10, 1, 19, '#3f7d32'); r(30, 7, 5, 4, '#f4c430'); r(31, 8, 3, 2, '#7a4b2a');
    } else if (kind === 'playground') {
      // Plaswijckpark: fence, slide, swings and a little flag
      make(64, 48);
      r(0, 40, 64, 3, '#a8743f'); for (let x = 1; x < 64; x += 6) r(x, 34, 2, 12, '#8a5a2b');
      r(4, 14, 2, 26, '#d3192c'); r(22, 14, 2, 26, '#d3192c'); r(4, 12, 20, 3, '#d3192c');
      r(9, 15, 1, 14, '#3b3b44'); r(13, 15, 1, 14, '#3b3b44'); r(8, 29, 7, 2, '#f4c430');
      r(16, 15, 1, 12, '#3b3b44'); r(20, 15, 1, 12, '#3b3b44'); r(15, 27, 7, 2, '#2f6fd6');
      r(34, 16, 10, 2, '#8a5a2b'); r(34, 16, 2, 24, '#8a5a2b'); r(42, 16, 2, 24, '#8a5a2b');
      for (let i = 0; i < 18; i++) r(44 + i, 18 + i, 3, 2, '#f4c430');
      r(36, 9, 1, 7, '#3b3b44'); r(37, 9, 7, 4, '#3fb27f');
      r(26, 36, 6, 4, '#e8d9a8');
    } else if (kind === 'zoo') {
      // zoo gate with a giraffe peeking over it (original art)
      make(64, 56);
      r(40, 6, 4, 26, '#e7b44a'); r(38, 2, 8, 6, '#e7b44a'); r(36, 3, 2, 2, '#e7b44a'); r(46, 3, 1, 3, '#7a4b2a'); r(39, 0, 1, 3, '#7a4b2a'); r(43, 0, 1, 3, '#7a4b2a');
      [[41, 10], [42, 16], [40, 21], [42, 26], [40, 4]].forEach(([x, y]) => r(x, y, 2, 2, '#9b5a22')); r(44, 4, 1, 1, '#2b1d16');
      r(52, 20, 3, 18, '#6b4a2b'); r(46, 14, 14, 8, '#3f8a3a'); r(48, 11, 9, 4, '#4d9a42');
      r(2, 22, 10, 32, '#b9a68a'); r(52, 30, 10, 24, '#b9a68a'); r(2, 20, 10, 3, '#8f7d62'); r(52, 28, 10, 3, '#8f7d62');
      r(2, 22, 60, 8, '#3f8a3a'); r(2, 22, 60, 2, '#2f6e2c');
      r(12, 30, 40, 1, '#6b4a2b'); for (let x = 13; x < 52; x += 4) r(x, 31, 1, 23, '#3b3b44');
      r(20, 24, 24, 4, '#f6ead0');
    } else if (kind === 'primary') {
      // a friendly primary school: low building, big windows, a bell and a flag
      make(64, 52);
      r(4, 22, 56, 28, '#f2c46b'); r(4, 47, 56, 3, '#d9a94e');
      for (let y = 0; y < 12; y++) r(32 - (10 + y * 2.2), 10 + y, Math.round(20 + y * 4.4), 1, y % 3 === 2 ? '#2f6e8f' : '#3f86ad');
      r(2, 21, 60, 2, '#2f6e8f');
      [[8, 27], [20, 27], [40, 27], [52, 27]].forEach(([x, y]) => { r(x, y, 8, 8, '#7fc7ef'); r(x, y, 8, 2, '#d6f1ff'); r(x + 3, y, 1, 8, '#f2c46b'); });
      r(28, 32, 9, 18, '#c94f38'); r(35, 41, 1, 2, '#f2d06b');
      r(29, 4, 6, 6, '#f4c430'); r(31, 2, 2, 2, '#3b3b44');
      r(54, 2, 1, 12, '#3b3b44'); r(55, 2, 7, 5, '#e8475f');
      [6, 12, 46, 52].forEach((x, i) => r(x, 45, 4, 3, ['#e8475f', '#f4c430', '#3fb27f', '#2f6fd6'][i]));
    } else if (kind === 'football') {
      // a small pitch with two goals and a ball
      make(64, 40);
      r(0, 4, 64, 34, '#4f9a42'); for (let x = 0; x < 64; x += 8) r(x, 4, 4, 34, '#5aa84d');
      r(2, 6, 60, 1, '#f4efe4'); r(2, 36, 60, 1, '#f4efe4'); r(2, 6, 1, 31, '#f4efe4'); r(61, 6, 1, 31, '#f4efe4'); r(32, 6, 1, 31, '#f4efe4');
      r(28, 17, 9, 1, '#f4efe4'); r(28, 25, 9, 1, '#f4efe4'); r(28, 17, 1, 9, '#f4efe4'); r(36, 17, 1, 9, '#f4efe4');
      r(0, 16, 3, 11, '#f4efe4'); r(61, 16, 3, 11, '#f4efe4');
      r(44, 20, 4, 4, '#f7f4ee'); r(45, 21, 2, 2, '#2b1d16');
      r(6, 0, 1, 6, '#3b3b44'); r(7, 0, 6, 4, '#f4c430');
    } else if (kind === 'park') {
      make(20, 26); r(9, 10, 2, 16, '#6b4a2b'); r(1, 2, 18, 10, '#3f8a3a'); r(3, 4, 14, 1, '#d6f0c2'); r(3, 7, 10, 1, '#d6f0c2');
    } else { // street sign
      make(16, 26); r(7, 8, 2, 18, '#3b3b44'); r(0, 1, 16, 8, '#2f6fd6'); r(2, 4, 12, 2, '#f4efe4');
    }
    outline(k.ctx, W, H, C.outline);
    return k.c;
  }

  /* ---------- School buildings (80 x 76) ---------- */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function building(style, roofCol) {
    const W = 80, H = 76;
    const k = canvas(W, H), r = painter(k.ctx, 0, 0);
    const walls = { brick: '#b8664a', classic: '#e9dcc0', modern: '#dfe3e6', cottage: '#efe0bd', arts: '#f2d9e4' }[style] || '#e9dcc0';
    const wallDark = shade(walls, 0.82);
    const roofDark = shade(roofCol, 0.72), roofLight = shade(roofCol, 1.2);
    // walls
    r(6, 34, 68, 40, walls); r(6, 70, 68, 4, wallDark);
    if (style === 'brick') for (let y = 36; y < 70; y += 4) for (let x = 6 + ((y / 4) % 2) * 4; x < 74; x += 8) r(x, y, 1, 3, wallDark);
    if (style === 'modern') { r(6, 34, 68, 3, '#9aa3ab'); for (let x = 10; x < 72; x += 12) r(x, 37, 1, 33, '#c3c9ce'); }
    // roof
    if (style === 'modern') {
      r(2, 22, 76, 13, roofCol); r(2, 32, 76, 3, roofDark); r(2, 22, 76, 2, roofLight);
      r(54, 10, 16, 12, '#c9d2d9'); r(56, 12, 12, 2, '#3f8fcf'); r(56, 16, 12, 2, '#3f8fcf'); // solar panels
    } else {
      for (let y = 0; y < 26; y++) {
        const w = 24 + y * 2.2;
        r(Math.round(40 - w / 2), 8 + y, Math.round(w), 1, y % 4 === 3 ? roofDark : roofCol);
      }
      r(0, 33, 80, 3, roofDark); r(36, 8, 8, 2, roofLight);
      if (style === 'classic') { // pediment & columns
        for (let y = 0; y < 8; y++) r(28 - y * 2 + 12, 26 + y, y * 4 + 2, 1, '#f4ecd8');
        for (let x = 14; x < 70; x += 12) { r(x, 38, 4, 32, '#f7f1e2'); r(x, 38, 1, 32, '#ffffff'); }
      }
      if (style === 'cottage') { r(14, 12, 4, 10, '#8a4b3a'); r(18, 26, 6, 6, '#7fc7ef'); r(56, 26, 6, 6, '#7fc7ef'); }
    }
    // bell tower / flag
    r(39, 0, 1, 10, '#5a4636'); r(40, 0, 8, 5, roofLight);
    // windows
    const win = (x, y) => { r(x, y, 10, 10, '#3d6f94'); r(x + 1, y + 1, 8, 8, '#8fd3f5'); r(x + 1, y + 1, 8, 2, '#d6f1ff'); r(x + 5, y + 1, 1, 8, '#3d6f94'); r(x - 1, y + 10, 12, 2, '#f4ecd8'); };
    if (style !== 'classic') { win(12, 42); win(26, 42); win(46, 42); win(60, 42); win(12, 56); win(60, 56); }
    else { win(20, 44); win(50, 44); }
    // door
    r(33, 52, 14, 22, '#6e4224'); r(35, 54, 10, 20, '#8c5a32'); r(39, 54, 1, 20, '#6e4224'); r(42, 63, 1, 2, '#f2d06b');
    r(31, 50, 18, 2, roofDark);
    // arts: colourful bunting
    if (style === 'arts') { const cs = ['#e8475f', '#f4c430', '#4fb3e8', '#5bbf6a']; for (let x = 8; x < 72; x += 6) { r(x, 38, 4, 3, cs[(x / 6) % 4 | 0]); } }
    // planters
    r(8, 68, 10, 6, '#8a5a2b'); r(9, 64, 8, 4, '#4d9a42'); r(62, 68, 10, 6, '#8a5a2b'); r(63, 64, 8, 4, '#4d9a42');
    r(10, 64, 2, 2, '#e8475f'); r(66, 64, 2, 2, '#f4c430');
    outline(k.ctx, W, H, C.outline);
    return k.c;
  }

  function home() {
    const W = 64, H = 60, k = canvas(W, H), r = painter(k.ctx, 0, 0);
    r(6, 28, 52, 30, '#f0e4c8'); r(6, 54, 52, 4, '#d8c9a6');
    for (let y = 0; y < 22; y++) { const w = 18 + y * 2.4; r(Math.round(32 - w / 2), 6 + y, Math.round(w), 1, y % 4 === 3 ? '#9b3a2b' : '#c94f38'); }
    r(2, 27, 60, 3, '#9b3a2b');
    r(44, 2, 6, 12, '#8a4b3a'); r(43, 1, 8, 2, '#5e3328');
    r(12, 34, 10, 9, '#7fc7ef'); r(12, 34, 10, 2, '#d6f1ff'); r(16, 34, 1, 9, '#f0e4c8');
    r(42, 34, 10, 9, '#7fc7ef'); r(42, 34, 10, 2, '#d6f1ff'); r(46, 34, 1, 9, '#f0e4c8');
    r(26, 38, 12, 20, '#2f6fb0'); r(28, 40, 8, 18, '#3d82c6'); r(35, 48, 1, 2, '#f2d06b');
    r(10, 44, 14, 3, '#8a5a2b'); r(11, 42, 2, 2, '#e8475f'); r(15, 42, 2, 2, '#f4c430'); r(19, 42, 2, 2, '#e8475f');
    outline(k.ctx, W, H, C.outline);
    return k.c;
  }

  function questBoard() {
    const k = canvas(24, 26), r = painter(k.ctx, 0, 0);
    r(3, 14, 2, 12, '#6b4a2b'); r(19, 14, 2, 12, '#6b4a2b');
    r(1, 2, 22, 15, '#a8743f'); r(2, 3, 20, 13, '#c48d52');
    r(4, 5, 7, 4, '#f4ecd8'); r(13, 5, 7, 5, '#f4ecd8'); r(5, 11, 8, 3, '#f4ecd8'); r(7, 4, 1, 1, '#d3192c'); r(16, 4, 1, 1, '#2f6fd6');
    outline(k.ctx, 24, 26, C.outline);
    return k.c;
  }

  function podium() {
    const k = canvas(40, 30), r = painter(k.ctx, 0, 0);
    r(14, 6, 12, 22, '#f5c518'); r(2, 14, 12, 14, '#c9ced6'); r(26, 18, 12, 10, '#cd7f32');
    r(18, 10, 4, 6, '#fff3b0'); r(7, 18, 2, 6, '#ffffff'); r(31, 21, 2, 5, '#f2c08a');
    r(19, 0, 2, 6, '#5a4636'); r(21, 0, 6, 4, '#d3192c');
    outline(k.ctx, 40, 30, C.outline);
    return k.c;
  }

  /* ---------- School interiors (one tileset per school theme) ----------
     0 floorA  1 floorB  2 floorC  3 wall top  4 wall face  5 exit mat  6 grass  7 grass + line
     8 table  9 bookshelf  10 plant  11 lockers  12 lab bench  13 column  14 bust  15 sofa
     16 stage  17 piano  18 goal  19 poster (wall)  20 notice board  21 sign  22 phone case  23 trophy shelf
     24 window (wall)  25 timetable (wall)  26 (free)  27 computer desk */
  function floorTile(r, f) {
    const c = f.color, d = shade(c, 0.86), l = shade(c, 1.08);
    r(0, 0, 16, 16, c);
    if (f.pattern === 'planks') { for (let y = 0; y < 16; y += 4) { r(0, y + 3, 16, 1, d); r((y / 4) % 2 ? 5 : 11, y, 1, 3, d); } r(2, 1, 3, 1, l); r(9, 9, 3, 1, l); }
    else if (f.pattern === 'checker') { r(0, 0, 8, 8, d); r(8, 8, 8, 8, d); }
    else if (f.pattern === 'carpet') { for (let y = 1; y < 16; y += 4) for (let x = (y % 8 === 1 ? 1 : 3); x < 16; x += 4) r(x, y, 1, 1, d); r(0, 0, 16, 1, shade(c, 0.95)); }
    else { r(0, 0, 16, 1, d); r(0, 0, 1, 16, d); }
  }
  function interiorTiles(th) {
    const cols = 8, rows = 4, t = canvas(cols * 16, rows * 16), ctx = t.ctx;
    const at = (i) => painter(ctx, (i % cols) * 16, Math.floor(i / cols) * 16);
    floorTile(at(0), th.floorA); floorTile(at(1), th.floorB); floorTile(at(2), th.floorC);
    { const r = at(3), c = th.wallTop; r(0, 0, 16, 16, c); r(0, 0, 16, 1, shade(c, 1.3)); r(0, 8, 16, 1, shade(c, 0.85)); r(0, 15, 16, 1, shade(c, 0.7)); }
    { const r = at(4), c = th.wallFace; r(0, 0, 16, 16, c); r(0, 0, 16, 2, th.wallTop); r(0, 2, 16, 1, shade(c, 0.8)); for (let x = 3; x < 16; x += 8) r(x, 4, 1, 7, shade(c, 0.94)); r(0, 12, 16, 4, th.trim); r(0, 12, 16, 1, shade(th.trim, 1.25)); r(0, 15, 16, 1, shade(th.trim, 0.7)); }
    { const r = at(5); floorTile(r, th.floorA); r(2, 2, 12, 12, th.accent); r(3, 3, 10, 10, shade(th.accent, 0.85)); for (let y = 5; y < 12; y += 2) r(4, y, 8, 1, shade(th.accent, 0.7)); }
    { const r = at(6); r(0, 0, 16, 16, '#7cb655'); [[3, 4], [11, 2], [7, 10], [13, 12], [1, 13]].forEach(([x, y]) => r(x, y, 1, 2, '#5d9640')); r(9, 6, 1, 1, '#8cc463'); }
    { const r = at(7); r(0, 0, 16, 16, '#7cb655'); r(0, 7, 16, 2, '#f4f1e6'); }
    const obj = (i, fn) => { const cell = canvas(16, 16); fn(painter(cell.ctx, 0, 0)); outline(cell.ctx, 16, 16, C.outline); ctx.drawImage(cell.c, (i % cols) * 16, Math.floor(i / cols) * 16); };
    const wood = '#a8743f', woodD = '#6b4a2b', woodL = '#c48d52';
    obj(8, r => { r(1, 4, 14, 7, wood); r(1, 4, 14, 2, woodL); r(2, 11, 2, 4, woodD); r(12, 11, 2, 4, woodD); r(4, 6, 4, 2, th.accent); r(10, 6, 3, 3, '#f7f4ee'); });
    obj(9, r => { r(1, 1, 14, 14, '#7a4b2a'); r(2, 5, 12, 1, '#4a2c17'); r(2, 10, 12, 1, '#4a2c17'); const bc = ['#d3192c', '#2f6fd6', '#f5c518', '#3f8a3a', '#8e3fa8', th.accent];
      [[2, 2, 3], [2, 6, 4], [2, 11, 4]].forEach(([x0, y, hgt], row) => { for (let x = x0, k = row; x < 14; x += 2, k++) r(x, y + (k % 3 === 0 ? 1 : 0), 1, hgt - (k % 3 === 0 ? 1 : 0), bc[k % bc.length]); }); });
    obj(10, r => { r(5, 10, 6, 5, '#b5653d'); r(4, 10, 8, 1, '#c97b4f'); r(4, 3, 8, 7, '#3f8a3a'); r(2, 5, 3, 3, '#3f8a3a'); r(11, 4, 3, 3, '#3f8a3a'); r(6, 1, 3, 3, '#5aa84d'); r(5, 5, 2, 2, '#5aa84d'); });
    obj(11, r => { const c = shade(th.trim, 1.15), d = shade(th.trim, 0.8); r(1, 1, 14, 14, c); r(5, 1, 1, 14, d); r(10, 1, 1, 14, d); [2, 7, 12].forEach(x => { r(x, 3, 2, 1, d); r(x, 5, 2, 1, d); r(x + 1, 8, 1, 2, '#f2d06b'); }); });
    obj(12, r => { r(0, 6, 16, 5, '#e8eef2'); r(0, 6, 16, 1, '#ffffff'); r(0, 11, 16, 4, '#5c6f7a'); r(3, 1, 3, 5, '#8fd3f5'); r(4, 0, 1, 1, '#cfd6db'); r(3, 4, 3, 1, '#5bbf6a'); r(10, 2, 2, 4, '#f4c430'); r(9, 1, 4, 1, '#cfd6db'); });
    obj(13, r => { r(3, 0, 10, 2, '#f7f1e2'); r(4, 2, 8, 12, '#efe6d2'); r(5, 2, 1, 12, '#ffffff'); r(8, 2, 1, 12, '#e2d7bd'); r(10, 2, 1, 12, '#d8ccb0'); r(3, 14, 10, 2, '#f7f1e2'); });
    obj(14, r => { r(4, 10, 8, 6, '#d8ccb0'); r(3, 10, 10, 1, '#efe6d2'); r(5, 2, 6, 6, '#e9e4d8'); r(6, 8, 4, 2, '#e9e4d8'); r(5, 2, 6, 1, '#7a9a4a'); r(4, 3, 1, 2, '#7a9a4a'); r(11, 3, 1, 2, '#7a9a4a'); r(6, 5, 1, 1, '#b8ae98'); r(9, 5, 1, 1, '#b8ae98'); });
    obj(15, r => { const a = th.accent, d = shade(a, 0.78); r(1, 4, 14, 4, d); r(1, 7, 14, 6, a); r(0, 6, 2, 8, d); r(14, 6, 2, 8, d); r(2, 13, 2, 2, woodD); r(12, 13, 2, 2, woodD); });
    { const r = at(16); r(0, 0, 16, 16, '#8c5a32'); for (let y = 7; y < 14; y += 3) r(0, y, 16, 1, '#6e4224'); r(0, 0, 16, 6, '#a8323a'); [2, 6, 10, 14].forEach(x => r(x, 0, 1, 6, '#7a1f26')); r(0, 6, 16, 1, '#f5c518'); r(0, 14, 16, 2, '#4a2c17'); }
    obj(17, r => { r(1, 3, 14, 10, '#1d1d22'); r(1, 3, 14, 2, '#3a3a44'); r(2, 9, 12, 3, '#f7f4ee'); [3, 5, 8, 10, 12].forEach(x => r(x, 9, 1, 2, '#1d1d22')); r(2, 13, 2, 2, '#1d1d22'); r(12, 13, 2, 2, '#1d1d22'); });
    obj(18, r => { r(1, 2, 1, 13, '#ffffff'); r(14, 2, 1, 13, '#ffffff'); r(1, 2, 14, 1, '#ffffff'); for (let y = 4; y < 15; y += 2) for (let x = 3; x < 14; x += 2) r(x, y, 1, 1, '#dfe4e8'); });
    obj(19, r => { r(3, 2, 10, 10, '#fffdf5'); r(3, 2, 10, 3, th.accent); r(5, 7, 6, 1, '#9a8f80'); r(5, 9, 4, 1, '#9a8f80'); r(7, 1, 2, 2, '#d3192c'); });
    obj(20, r => { r(2, 11, 2, 5, woodD); r(12, 11, 2, 5, woodD); r(1, 1, 14, 11, woodL); r(2, 2, 12, 9, '#d9a066'); r(3, 3, 4, 3, '#fffdf5'); r(8, 3, 5, 4, '#fff1b8'); r(4, 7, 5, 3, '#cfe8ff'); r(5, 3, 1, 1, '#d3192c'); r(10, 3, 1, 1, '#2f6fd6'); });
    obj(21, r => { r(7, 9, 2, 7, woodD); r(2, 2, 12, 8, th.accent); r(3, 3, 10, 6, shade(th.accent, 1.15)); r(4, 5, 8, 1, '#ffffff'); r(5, 7, 6, 1, '#ffffff'); });
    obj(22, r => { r(1, 6, 14, 9, '#2b2b33'); r(6, 4, 4, 2, '#2b2b33'); const pc = ['#2f6fd6', '#d3192c', '#f7f4ee', '#5bbf6a', '#f5c518', '#8e3fa8']; for (let k = 0; k < 6; k++) r(2 + (k % 3) * 4, 7 + Math.floor(k / 3) * 4, 3, 3, pc[k]); });
    obj(23, r => { r(1, 10, 14, 5, '#7a4b2a'); r(1, 10, 14, 1, '#a8743f'); r(5, 2, 6, 4, '#f5c518'); r(4, 3, 1, 2, '#f5c518'); r(11, 3, 1, 2, '#f5c518'); r(7, 6, 2, 2, '#c99a00'); r(6, 8, 4, 2, '#c99a00'); r(6, 3, 1, 1, '#fff3b0'); });
    obj(24, r => { r(2, 2, 12, 9, '#3d6f94'); r(3, 3, 10, 7, '#8fd3f5'); r(3, 3, 10, 2, '#d6f1ff'); r(7, 3, 1, 7, '#3d6f94'); r(1, 11, 14, 1, '#f4ecd8'); });
    obj(25, r => { r(2, 1, 12, 10, '#f7f7f2'); [5, 8].forEach(y => r(3, y, 10, 1, '#c3c9ce')); [6, 9].forEach(x => r(x, 2, 1, 8, '#c3c9ce')); r(3, 2, 3, 3, th.accent); r(7, 6, 2, 2, '#4fb3e8'); r(10, 2, 3, 3, '#5bbf6a'); });
    obj(26, r => { r(7, 11, 2, 4, '#3a3a44'); r(4, 14, 8, 2, '#3a3a44'); r(1, 1, 14, 10, '#2b2b33'); r(2, 2, 12, 8, '#4fb3e8'); r(2, 2, 12, 2, '#9fe0ff'); r(6, 4, 1, 4, '#ffffff'); r(7, 5, 1, 2, '#ffffff'); r(8, 6, 1, 1, '#ffffff'); });
    obj(27, r => { r(1, 8, 14, 4, wood); r(1, 8, 14, 1, woodL); r(2, 12, 2, 3, woodD); r(12, 12, 2, 3, woodD); r(4, 1, 8, 6, '#2b2b33'); r(5, 2, 6, 4, '#4fb3e8'); r(7, 7, 2, 1, '#2b2b33'); r(5, 9, 6, 1, '#d9d9d9'); });
    return t.c;
  }

  /* A person for inside schools: 2 idle frames of 16x24. Colours come from the school data. */
  function npcSheet(o) {
    const sheet = canvas(32, 24);
    for (let f = 0; f < 2; f++) {
      const cell = canvas(16, 24), r = painter(cell.ctx, 0, f ? 1 : 0);
      const hair = o.hair || '#5a3a22', skin = o.skin || '#f1c7a5', shirt = o.shirt || '#2f6fd6', pants = o.pants || '#2c3a66';
      r(4, 2, 8, 3, hair); r(3, 4, 10, 2, hair);
      r(4, 5, 8, 6, skin); r(4, 5, 8, 1, hair); r(3, 6, 1, 3, hair); r(12, 6, 1, 3, hair);
      if (o.longHair) { r(3, 6, 2, 8, hair); r(11, 6, 2, 8, hair); }
      r(6, 8, 1, 1, '#2b1d16'); r(9, 8, 1, 1, '#2b1d16'); r(7, 10, 2, 1, shade(skin, 0.82));
      r(4, 11, 8, 7, shirt); r(3, 12, 1, 4, shirt); r(12, 12, 1, 4, shirt); r(3, 16, 1, 1, skin); r(12, 16, 1, 1, skin);
      if (o.coat) { r(7, 11, 1, 7, '#c9ccd1'); r(5, 14, 2, 1, '#c9ccd1'); }
      else r(4, 11, 8, 1, shade(shirt, 0.82));
      r(5, 18, 6, 3, pants); r(5, 21, 2, 1, '#3a2a20'); r(9, 21, 2, 1, '#3a2a20');
      outline(cell.ctx, 16, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 16, 0);
    }
    return sheet.c;
  }

  /* Abu Ana (Lenny's grandma): big curly orange hair, red glasses, a purple
     flowery blouse under a dark cardigan. 4 frames of 16x24:
     0-1 walking, 2-3 waving (right hand up, two positions). Frames are 20x24
     (body drawn 2px in, so the waving hand fits). Used by extras.js. */
  function abuAnaSheet() {
    const A = { hair: '#d9692b', hairL: '#f2924a', hairD: '#a5461c', skin: '#f2c4a4', skinD: '#d9a283', glass: '#c8202e',
                eye: '#3a2a20', mouth: '#9a3b34', teeth: '#fbf7ee', blouse: '#a8489a', blouseL: '#e3a2d2', blouseD: '#5e2a66',
                cardi: '#2a2430', pants: '#3a2f3f', shoe: '#1f1a20' };
    const sheet = canvas(80, 24);
    for (let f = 0; f < 4; f++) {
      const cell = canvas(20, 24), r = painter(cell.ctx, 2, 0);
      const wave = f >= 2, step = f % 2;
      // curly hair, wide and full
      r(3, 0, 10, 2, A.hair); r(2, 1, 12, 3, A.hair); r(1, 3, 14, 4, A.hair);
      r(1, 7, 3, 6, A.hair); r(12, 7, 3, 6, A.hair); r(2, 13, 2, 2, A.hair); r(12, 13, 2, 2, A.hair);
      [[4, 1], [8, 0], [11, 2], [2, 4], [13, 5], [1, 9], [14, 10], [3, 12], [12, 12], [6, 2]].forEach(([x, y]) => r(x, y, 1, 1, A.hairL));
      [[5, 3], [10, 3], [2, 6], [13, 8], [2, 11], [13, 13], [9, 1]].forEach(([x, y]) => r(x, y, 1, 1, A.hairD));
      // face
      r(4, 4, 8, 7, A.skin); r(4, 4, 8, 1, A.hair); r(5, 5, 2, 1, A.hair); r(10, 5, 1, 1, A.hair);
      // red glasses
      r(4, 6, 3, 1, A.glass); r(4, 8, 3, 1, A.glass); r(4, 7, 1, 1, A.glass); r(6, 7, 1, 1, A.glass);
      r(9, 6, 3, 1, A.glass); r(9, 8, 3, 1, A.glass); r(9, 7, 1, 1, A.glass); r(11, 7, 1, 1, A.glass);
      r(7, 7, 2, 1, A.glass); r(5, 7, 1, 1, A.eye); r(10, 7, 1, 1, A.eye);
      // big smile
      r(6, 9, 4, 1, A.mouth); r(7, 9, 2, 1, A.teeth); r(5, 8, 1, 1, A.skinD); r(10, 8, 1, 1, A.skinD);
      r(7, 11, 2, 1, A.skin);
      // dark cardigan, flowery purple blouse
      r(3, 12, 10, 7, A.cardi); r(5, 12, 6, 7, A.blouse); r(6, 12, 4, 1, '#f4eef2');
      [[5, 13], [8, 14], [6, 16], [9, 17], [10, 13]].forEach(([x, y]) => r(x, y, 1, 1, A.blouseL));
      [[7, 15], [5, 17], [10, 15], [8, 12]].forEach(([x, y]) => r(x, y, 1, 1, A.blouseD));
      // left arm down (swings a little when walking)
      r(2, 13 - (step && !wave ? 1 : 0), 1, 4, A.cardi); r(2, 17 - (step && !wave ? 1 : 0), 1, 1, A.skin);
      // right arm: down when walking, up and waving otherwise
      if (!wave) { r(13, 13 - (step ? 0 : 1), 1, 4, A.cardi); r(13, 17 - (step ? 0 : 1), 1, 1, A.skin); }
      else if (f === 2) { r(13, 10, 2, 3, A.cardi); r(15, 8, 1, 3, A.cardi); r(15, 5, 2, 3, A.skin); }
      else { r(13, 10, 2, 3, A.cardi); r(15, 10, 1, 1, A.cardi); r(16, 8, 2, 2, A.skin); }
      // trousers and shoes
      r(4, 19, 8, 2, A.pants);
      if (!wave && step) { r(4, 21, 3, 1, A.pants); r(10, 21, 2, 1, A.pants); r(4, 22, 3, 1, A.shoe); r(10, 22, 3, 1, A.shoe); }
      else { r(5, 21, 2, 1, A.pants); r(9, 21, 2, 1, A.pants); r(5, 22, 3, 1, A.shoe); r(8, 22, 3, 1, A.shoe); }
      outline(cell.ctx, 20, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 20, 0);
    }
    return sheet.c;
  }

  /* Mami (Lenny's mum, at home): shoulder-length brown hair, big light
     glasses, a grey hoodie, dark jeans (from a family photo). Same layout as
     Abu Ana: 4 frames of 20x24, 0-1 walking, 2-3 waving. Used by extras.js. */
  function mamiSheet() {
    const A = { hair: '#6b4128', hairL: '#8a5636', hairD: '#4c2d1b', skin: '#f2c9ab', skinD: '#dca889', glass: '#c9b48a', lens: '#dbe9f2',
                eye: '#3a2a20', mouth: '#a8504a', hood: '#a9adb3', hoodL: '#c4c8cd', hoodD: '#83878d', pants: '#2c3a66', shoe: '#ece7dc' };
    const sheet = canvas(80, 24);
    for (let f = 0; f < 4; f++) {
      const cell = canvas(20, 24), r = painter(cell.ctx, 2, 0);
      const wave = f >= 2, step = f % 2;
      // hair: parted, falling to the shoulders
      r(4, 1, 8, 2, A.hair); r(3, 2, 10, 3, A.hair); r(3, 5, 2, 7, A.hair); r(11, 5, 2, 7, A.hair); r(2, 9, 2, 3, A.hair); r(12, 9, 2, 3, A.hair);
      r(5, 1, 3, 1, A.hairL); r(9, 2, 2, 1, A.hairL); r(3, 7, 1, 2, A.hairD); r(12, 7, 1, 2, A.hairD); r(7, 2, 1, 2, A.hairD);
      // face
      r(5, 4, 6, 7, A.skin); r(5, 4, 6, 1, A.hair); r(5, 5, 1, 1, A.hair);
      // big light glasses
      r(4, 6, 4, 3, A.glass); r(9, 6, 4, 3, A.glass); r(5, 7, 2, 1, A.lens); r(10, 7, 2, 1, A.lens); r(8, 7, 1, 1, A.glass);
      r(6, 7, 1, 1, A.eye); r(10, 7, 1, 1, A.eye);
      // smile
      r(7, 9, 3, 1, A.mouth); r(6, 10, 1, 1, A.skinD); r(10, 10, 1, 1, A.skinD);
      r(7, 11, 2, 1, A.skin);
      // grey hoodie with a hood behind the neck and a front pocket
      r(3, 12, 10, 7, A.hood); r(5, 11, 6, 1, A.hoodD); r(4, 12, 1, 1, A.hoodL); r(11, 12, 1, 1, A.hoodL);
      r(5, 16, 6, 2, A.hoodD); r(7, 12, 1, 3, A.hoodL); r(8, 12, 1, 3, A.hoodL);
      // left arm
      r(2, 13 - (step && !wave ? 1 : 0), 1, 4, A.hood); r(2, 17 - (step && !wave ? 1 : 0), 1, 1, A.skin);
      // right arm: down when walking, up and waving otherwise
      if (!wave) { r(13, 13 - (step ? 0 : 1), 1, 4, A.hood); r(13, 17 - (step ? 0 : 1), 1, 1, A.skin); }
      else if (f === 2) { r(13, 10, 2, 3, A.hood); r(15, 8, 1, 3, A.hood); r(15, 5, 2, 3, A.skin); }
      else { r(13, 10, 2, 3, A.hood); r(15, 10, 1, 1, A.hood); r(16, 8, 2, 2, A.skin); }
      // jeans and sneakers
      r(4, 19, 8, 2, A.pants);
      if (!wave && step) { r(4, 21, 3, 1, A.pants); r(10, 21, 2, 1, A.pants); r(4, 22, 3, 1, A.shoe); r(10, 22, 3, 1, A.shoe); }
      else { r(5, 21, 2, 1, A.pants); r(9, 21, 2, 1, A.pants); r(5, 22, 3, 1, A.shoe); r(8, 22, 3, 1, A.shoe); }
      outline(cell.ctx, 20, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 20, 0);
    }
    return sheet.c;
  }

  /* Mam (at the house with Fifi): wavy, shoulder-length dark-blond hair and an
     olive-green blouse with white vertical stripes (from a family photo).
     Same layout: 4 frames of 20x24, 0-1 walking, 2-3 waving. */
  function mamSheet() {
    const A = { hair: '#9a6a3c', hairL: '#c08d55', hairD: '#6e4a28', skin: '#f2c9ab', skinD: '#dca889', eye: '#3a2a20', mouth: '#a8504a',
                top: '#4f5a3a', topD: '#3c452c', stripe: '#ece7dc', pants: '#2b2f3a', shoe: '#3a2a20' };
    const sheet = canvas(80, 24);
    for (let f = 0; f < 4; f++) {
      const cell = canvas(20, 24), r = painter(cell.ctx, 2, 0);
      const wave = f >= 2, step = f % 2;
      // wavy hair, fuller at the sides, to the shoulders
      r(4, 1, 8, 2, A.hair); r(3, 2, 10, 3, A.hair); r(2, 5, 3, 6, A.hair); r(11, 5, 3, 6, A.hair); r(2, 11, 2, 2, A.hair); r(12, 11, 2, 2, A.hair);
      [[5, 1], [9, 1], [3, 3], [12, 4], [2, 7], [13, 8], [3, 10], [12, 11]].forEach(([x, y]) => r(x, y, 1, 1, A.hairL));
      [[7, 2], [4, 6], [11, 6], [2, 9], [13, 10]].forEach(([x, y]) => r(x, y, 1, 1, A.hairD));
      // face, calm smile
      r(5, 4, 6, 7, A.skin); r(5, 4, 6, 1, A.hair); r(6, 5, 3, 1, A.hair);
      r(6, 7, 1, 1, A.eye); r(9, 7, 1, 1, A.eye); r(7, 9, 3, 1, A.mouth); r(6, 9, 1, 1, A.skinD);
      r(7, 11, 2, 1, A.skin);
      // striped green blouse, v-neck with buttons
      r(3, 12, 10, 7, A.top); [4, 6, 9, 11].forEach(x => r(x, 12, 1, 7, A.stripe)); r(7, 12, 2, 2, A.skin); r(8, 14, 1, 1, A.topD); r(8, 16, 1, 1, A.topD);
      // left arm
      r(2, 13 - (step && !wave ? 1 : 0), 1, 4, A.top); r(2, 17 - (step && !wave ? 1 : 0), 1, 1, A.skin);
      // right arm: down when walking, up and waving otherwise
      if (!wave) { r(13, 13 - (step ? 0 : 1), 1, 4, A.top); r(13, 17 - (step ? 0 : 1), 1, 1, A.skin); }
      else if (f === 2) { r(13, 10, 2, 3, A.top); r(15, 8, 1, 3, A.top); r(15, 5, 2, 3, A.skin); }
      else { r(13, 10, 2, 3, A.top); r(15, 10, 1, 1, A.top); r(16, 8, 2, 2, A.skin); }
      r(4, 19, 8, 2, A.pants);
      if (!wave && step) { r(4, 21, 3, 1, A.pants); r(10, 21, 2, 1, A.pants); r(4, 22, 3, 1, A.shoe); r(10, 22, 3, 1, A.shoe); }
      else { r(5, 21, 2, 1, A.pants); r(9, 21, 2, 1, A.pants); r(5, 22, 3, 1, A.shoe); r(8, 22, 3, 1, A.shoe); }
      outline(cell.ctx, 20, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 20, 0);
    }
    return sheet.c;
  }


  /* Jiska (at la casita azul): wavy blond hair, glasses, a dark navy outdoor
     jacket, grey trousers (from a family photo). 4 frames of 20x24:
     0 = axe up, 1 = axe down (chopping), 2-3 = waving. */
  function jiskaSheet() {
    const A = { hair: '#e3c27a', hairL: '#f3dca0', hairD: '#c19a52', skin: '#f4cdb2', skinD: '#e0ab8f', glass: '#6d6a66', lens: '#e4eef3',
                eye: '#3a2a20', mouth: '#b4544c', coat: '#2f3448', coatL: '#454b63', coatD: '#22263a', pants: '#8d9097', shoe: '#2a2420',
                axe: '#c9ccd1', axeD: '#8e9299', handle: '#9a6a3c' };
    const sheet = canvas(80, 24);
    for (let f = 0; f < 4; f++) {
      const cell = canvas(20, 24), r = painter(cell.ctx, 2, 0);
      // wavy blond hair, pulled back with loose curls at the sides
      r(4, 0, 8, 2, A.hair); r(3, 1, 10, 4, A.hair); r(3, 4, 2, 6, A.hair); r(11, 4, 2, 6, A.hair); r(11, 9, 2, 2, A.hair);
      [[5, 0], [9, 1], [3, 2], [12, 3], [3, 6], [12, 7]].forEach(([x, y]) => r(x, y, 1, 1, A.hairL));
      [[7, 1], [4, 5], [11, 5], [3, 8], [12, 9]].forEach(([x, y]) => r(x, y, 1, 1, A.hairD));
      // face with round glasses and a big smile
      r(5, 4, 6, 7, A.skin); r(5, 4, 6, 1, A.hair);
      r(4, 6, 4, 3, A.glass); r(9, 6, 4, 3, A.glass); r(5, 7, 2, 1, A.lens); r(10, 7, 2, 1, A.lens); r(8, 7, 1, 1, A.glass);
      r(6, 7, 1, 1, A.eye); r(10, 7, 1, 1, A.eye);
      r(6, 9, 4, 1, A.mouth); r(7, 10, 2, 1, '#ffffff'); r(5, 10, 1, 1, A.skinD); r(10, 10, 1, 1, A.skinD);
      r(7, 11, 2, 1, A.skin);
      // navy jacket with a zip and a chest strap (backpack)
      r(5, 12, 6, 7, A.coat); r(8, 12, 1, 7, A.coatD); r(5, 12, 1, 1, A.coatL); r(10, 12, 1, 1, A.coatL); r(5, 15, 6, 1, A.coatD);
      if (f < 2) {
        // both hands on the axe handle
        const up = f === 0;
        r(4, 13, 1, 4, A.coat); r(11, 13, 1, 4, A.coat);
        if (up) { r(5, 9, 2, 4, A.coat); r(9, 9, 2, 4, A.coat); r(7, 7, 2, 2, A.skin); r(7, 1, 2, 7, A.handle); r(4, -1 + 1, 6, 3, A.axe); r(4, 1, 6, 1, A.axeD); }
        else { r(5, 17, 2, 1, A.skin); r(9, 17, 2, 1, A.skin); r(6, 17, 9, 1, A.handle); r(14, 15, 3, 5, A.axe); r(14, 19, 3, 1, A.axeD); }
      } else {
        r(4, 13, 1, 4, A.coat); r(4, 17, 1, 1, A.skin);
        if (f === 2) { r(11, 10, 2, 3, A.coat); r(13, 8, 1, 3, A.coat); r(13, 5, 2, 3, A.skin); }
        else { r(11, 10, 2, 3, A.coat); r(13, 10, 1, 1, A.coat); r(14, 8, 2, 2, A.skin); }
      }
      r(5, 19, 6, 2, A.pants); r(5, 21, 2, 1, A.pants); r(9, 21, 2, 1, A.pants); r(5, 22, 2, 1, A.shoe); r(9, 22, 2, 1, A.shoe);
      outline(cell.ctx, 20, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 20, 0);
    }
    return sheet.c;
  }
  /* A chopping block with a log on it (16x12): frame 0 whole, frame 1 split. */
  function chopBlock() {
    const k = canvas(32, 12);
    for (let f = 0; f < 2; f++) {
      const cell = canvas(16, 12), r = painter(cell.ctx, 0, 0);
      r(3, 7, 10, 4, '#8a5a2b'); r(3, 7, 10, 1, '#c79a5e'); r(5, 8, 6, 1, '#a8743f');
      if (!f) { r(6, 1, 4, 6, '#9a6a3c'); r(6, 1, 4, 1, '#e3c493'); r(7, 2, 2, 1, '#c79a5e'); }
      else { r(3, 3, 3, 4, '#9a6a3c'); r(3, 3, 3, 1, '#e3c493'); r(10, 3, 3, 4, '#9a6a3c'); r(10, 3, 3, 1, '#e3c493'); }
      outline(cell.ctx, 16, 12, C.outline);
      k.ctx.drawImage(cell.c, f * 16, 0);
    }
    return k.c;
  }

  /* Lucia, Lenny's little sister: long brown hair with a fringe, a white
     sweater with little dark cats and bats, jeans (from a family photo).
     A bit smaller than the grown-ups. 4 frames of 20x24: 0-1 running,
     2 = jumping with arms up, 3 = landing with arms up. */
  function luciaSheet() {
    const A = { hair: '#5e3d26', hairL: '#7f5536', hairD: '#3f2817', skin: '#f6d2bb', skinD: '#e6b39a', eye: '#3a2a20', mouth: '#c0606a', cheek: '#f1a5a5',
                top: '#f1ebe2', dot: '#2b2b30', mint: '#8fd1bf', pants: '#4a6fa8', shoe: '#e8475f' };
    const sheet = canvas(80, 24);
    for (let f = 0; f < 4; f++) {
      const cell = canvas(20, 24), r = painter(cell.ctx, 3, f === 2 ? 1 : 4);
      const cheer = f >= 2, step = f % 2;
      // long hair with a fringe, down past the shoulders
      r(3, 0, 8, 2, A.hair); r(2, 1, 10, 3, A.hair); r(2, 4, 2, 9, A.hair); r(10, 4, 2, 9, A.hair); r(1, 8, 1, 4, A.hair); r(12, 8, 1, 4, A.hair);
      [[4, 0], [8, 1], [2, 5], [11, 6]].forEach(([x, y]) => r(x, y, 1, 1, A.hairL)); [[6, 1], [3, 9], [10, 10]].forEach(([x, y]) => r(x, y, 1, 1, A.hairD));
      // face: fringe, big eyes, rosy cheeks
      r(4, 3, 6, 6, A.skin); r(4, 3, 6, 2, A.hair); r(5, 5, 1, 1, A.skin);
      r(5, 5, 1, 2, A.eye); r(8, 5, 1, 2, A.eye); r(4, 7, 1, 1, A.cheek); r(9, 7, 1, 1, A.cheek);
      if (cheer) { r(6, 7, 2, 2, A.mouth); } else { r(6, 7, 2, 1, A.mouth); }
      // white sweater with tiny cats and bats
      r(3, 9, 8, 6, A.top); [[4, 10], [8, 11], [5, 13], [9, 13]].forEach(([x, y]) => r(x, y, 1, 1, A.dot)); r(7, 10, 1, 1, A.mint); r(6, 12, 1, 1, A.mint);
      if (!cheer) { r(2, 10 - (step ? 1 : 0), 1, 3, A.top); r(2, 13 - (step ? 1 : 0), 1, 1, A.skin); r(11, 10 - (step ? 0 : 1), 1, 3, A.top); r(11, 13 - (step ? 0 : 1), 1, 1, A.skin); }
      else { r(1, 6, 2, 3, A.top); r(0, 4, 2, 2, A.skin); r(11, 6, 2, 3, A.top); r(12, 4, 2, 2, A.skin); }
      // jeans and pink shoes
      r(4, 15, 6, 1, A.pants);
      if (!cheer && step) { r(3, 16, 2, 2, A.pants); r(9, 16, 2, 1, A.pants); r(3, 18, 2, 1, A.shoe); r(9, 17, 3, 1, A.shoe); }
      else if (f === 2) { r(4, 16, 2, 1, A.pants); r(8, 16, 2, 1, A.pants); r(3, 17, 3, 1, A.shoe); r(8, 17, 3, 1, A.shoe); }
      else { r(4, 16, 2, 2, A.pants); r(8, 16, 2, 2, A.pants); r(4, 18, 2, 1, A.shoe); r(8, 18, 2, 1, A.shoe); }
      outline(cell.ctx, 20, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 20, 0);
    }
    return sheet.c;
  }

  /* Lucia's karaoke machine (20x24, 2 frames: the lights blink): a speaker
     box on little wheels with a screen, and a microphone on a stand. */
  function karaoke() {
    const sheet = canvas(40, 24);
    for (let f = 0; f < 2; f++) {
      const cell = canvas(20, 24), r = painter(cell.ctx, 0, 0);
      // mic stand
      r(16, 6, 1, 15, '#3b3b44'); r(14, 21, 5, 1, '#3b3b44'); r(15, 3, 3, 4, '#2b2b30'); r(15, 3, 3, 1, '#9aa0a8');
      // speaker box
      r(2, 9, 12, 13, '#7b4fd6'); r(2, 9, 12, 1, '#a07cf0'); r(2, 21, 12, 1, '#5a36a8');
      r(3, 10, 10, 4, '#1e1e2a'); // screen
      const lit = f ? ['#ff5fa2', '#ffd23f', '#5fd3ff'] : ['#5fd3ff', '#ff5fa2', '#ffd23f'];
      r(4, 11, 2, 2, lit[0]); r(7, 11, 2, 2, lit[1]); r(10, 11, 2, 2, lit[2]);
      r(5, 15, 6, 5, '#2b2b30'); r(6, 16, 4, 3, f ? '#4a4a55' : '#3b3b44'); r(7, 17, 2, 1, '#9aa0a8'); // speaker cone
      r(3, 22, 2, 2, '#2b2b30'); r(11, 22, 2, 2, '#2b2b30');
      outline(cell.ctx, 20, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 20, 0);
    }
    return sheet.c;
  }

  /* Jaques (a hidden easter egg behind a bush): 64, short grey-brown hair,
     dark glasses, black leather jacket over a striped blue shirt, jeans,
     dark shoes (from a family photo). He sits hunched on a wooden chair with
     his legs crossed, looking at his phone. 2 frames of 20x24: his hands,
     phone and head shift a pixel, so he trembles a little. */
  function jaquesSheet() {
    const A = { hair: '#6b5646', hairG: '#9a8f84', skin: '#ecc3a3', skinD: '#d6a585', glass: '#26262c', lens: '#cfd9df',
                coat: '#25252b', coatL: '#3c3c46', shirt: '#dfe6f2', stripe: '#6f8fc8', jeans: '#6f8fbf', jeansD: '#56719e',
                shoe: '#2a2a30', wood: '#8a5a2b', woodD: '#6b4520', phone: '#2b2b30', screen: '#8fd8ff' };
    const sheet = canvas(40, 24);
    for (let f = 0; f < 2; f++) {
      const cell = canvas(20, 24), r = painter(cell.ctx, 0, 0), t = f, u = f ? -1 : 1; // t, u: tremble offsets
      // chair back and legs
      r(4, 8, 1, 10, A.wood); r(15, 8, 1, 10, A.wood); r(4, 8, 12, 2, A.wood); r(4, 9, 12, 1, A.woodD);
      r(3, 17, 14, 2, A.wood); r(3, 18, 14, 1, A.woodD); r(3, 19, 1, 5, A.woodD); r(16, 19, 1, 5, A.woodD);
      // hunched body: black leather jacket, striped shirt at the neck
      r(5, 11, 10, 6, A.coat); r(6, 11, 1, 5, A.coatL); r(13, 12, 1, 4, A.coatL);
      r(9, 11, 2, 3, A.shirt); r(9, 12, 1, 1, A.stripe); r(10, 11, 1, 1, A.stripe); r(10, 13, 1, 1, A.stripe);
      // head bent forward and down, looking at the phone
      r(6 + t, 2, 8, 2, A.hair); r(5 + t, 3, 10, 2, A.hair); r(7 + t, 2, 2, 1, A.hairG); r(12 + t, 3, 2, 1, A.hairG); r(5 + t, 5, 1, 2, A.hairG); r(14 + t, 5, 1, 2, A.hairG);
      r(6 + t, 5, 8, 6, A.skin); r(6 + t, 5, 8, 1, A.hair);
      r(6 + t, 7, 3, 2, A.glass); r(11 + t, 7, 3, 2, A.glass); r(9 + t, 7, 2, 1, A.glass); r(7 + t, 8, 1, 1, A.lens); r(12 + t, 8, 1, 1, A.lens);
      r(9 + t, 9, 2, 1, A.skinD); r(8 + t, 10, 4, 1, A.skinD);
      // arms bent in, hands holding the phone low in front of him
      r(4, 12, 2, 5, A.coat); r(14, 12, 2, 5, A.coat); r(6, 15, 2, 2, A.coat); r(12, 15, 2, 2, A.coat);
      r(7 + u, 15 + t, 2, 2, A.skin); r(11 + u, 15 + t, 2, 2, A.skin); r(9 + u, 14 + t, 2, 3, A.phone); r(9 + u, 14 + t, 2, 2, A.screen);
      // legs crossed: right leg over the left knee, foot sticking out to the side
      r(5, 17, 5, 2, A.jeans); r(5, 19, 2, 3, A.jeans); r(5, 21, 2, 1, A.jeansD); r(4, 22, 4, 2, A.shoe);
      r(8, 16, 8, 2, A.jeans); r(8, 17, 8, 1, A.jeansD); r(15, 15 + (t ? 1 : 0), 3, 2, A.shoe);
      outline(cell.ctx, 20, 24, C.outline);
      sheet.ctx.drawImage(cell.c, f * 20, 0);
    }
    return sheet.c;
  }

  /* Speech bubbles above people: "!" = challenge waiting, tick = done. */
  function bubble(kind) {
    const k = canvas(13, 14), r = painter(k.ctx, 1, 1);
    const col = kind === 'done' ? '#5bbf6a' : '#f5c518';
    r(1, 0, 9, 9, col); r(0, 1, 11, 7, col); r(4, 9, 3, 1, col); r(5, 10, 1, 1, col);
    if (kind === 'done') { r(2, 4, 1, 1, '#fff'); r(3, 5, 1, 1, '#fff'); r(4, 6, 1, 1, '#fff'); r(5, 5, 1, 1, '#fff'); r(6, 4, 1, 1, '#fff'); r(7, 3, 1, 1, '#fff'); r(8, 2, 1, 1, '#fff'); }
    else { r(5, 1, 1, 5, '#2b1d16'); r(5, 7, 1, 1, '#2b1d16'); }
    outline(k.ctx, 13, 14, C.outline);
    return k.c;
  }

  return { lennySheet, kitSheet, catWalkSheet, fifiSheet, KIT, FIFI, kitPortrait, tileset, building, landmark, home, questBoard, podium, interiorTiles, npcSheet, abuAnaSheet, mamiSheet, mamSheet, jiskaSheet, chopBlock, luciaSheet, karaoke, jaquesSheet, bubble, TILE, colors: C };
})();
