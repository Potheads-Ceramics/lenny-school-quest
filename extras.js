/* =====================================================================
   EXTRAS — small surprises that never change the ranking.
   - Easter eggs at the family landmarks (Abu Ana, the giraffe, the
     football pitch, Plaswijck, De Blijberg, Vroesenpark, la casita azul).
     Each takes a few seconds and gives no points.
   - Bike rewards for visiting schools: a bell at 3 visits, a golden
     bike at 5 visits.
   - The cube: Lenny twists a cube when he stands still (on foot), and a
     progress cube (top-left) gets a sixth more solved per visited school.
     All schools count the same, so the cube never favours a school.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Extras = (function () {
  const TS = 16;
  const BELL_AT = 3, GOLD_AT = 5, CUBE_FACES = 6, IDLE_MS = 3500;
  const G = () => LQ.Game;
  const lms = {};          // landmark id -> { x, y, top, scene }
  const cool = {};         // landmark id -> time of last surprise
  let idleCube = null, idleSince = 0, idleFrame = 0, idleT = 0;

  function visits() { return Object.values(G().state.visits || {}).filter(v => v && v.done).length; }
  function ex() { const st = G().state; st.extras = st.extras || {}; return st.extras; }

  /* ---------- tiny sounds (only when sound is on) ---------- */
  let ac = null;
  function beep(notes, type, vol, len) {
    if (!G().state.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * (len || 0.09);
        o.type = type || 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (len || 0.09) * 1.6);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + (len || 0.09) * 1.7);
      });
    } catch (e) {}
  }
  const bellSound = () => beep([1760, 2349, 1760, 2349], 'triangle', 0.07, 0.07);

  /* ---------- floating emoji helper ---------- */
  function emo(scene, x, y, ch, size) {
    return scene.add.text(x, y, ch, { fontSize: (size || 12) + 'px', resolution: 6 }).setOrigin(0.5, 1).setDepth(100002);
  }
  function floatUp(scene, x, y, ch, opts) {
    opts = opts || {};
    const t = emo(scene, x, y, ch, opts.size);
    scene.tweens.add({ targets: t, y: y - (opts.rise || 24), x: x + (opts.drift || 0), alpha: 0, duration: opts.dur || 1400, delay: opts.delay || 0, ease: 'Sine.out', onComplete: () => t.destroy() });
    return t;
  }

  /* ---------- the surprises ---------- */
  const EGGS = {
    'abu-ana': (s, p) => {
      // Abu Ana comes out of her front door, waves, says "te amo" and goes back in.
      if (!s.textures.exists('abu-ana')) {
        const tex = s.textures.addCanvas('abu-ana', LQ.Sprites.abuAnaSheet());
        for (let f = 0; f < 4; f++) tex.add(f, 0, f * 20, 0, 20, 24);
        s.anims.create({ key: 'abu-walk', frames: [0, 1].map(n => ({ key: 'abu-ana', frame: n })), frameRate: 6, repeat: -1 });
        s.anims.create({ key: 'abu-wave', frames: [2, 3].map(n => ({ key: 'abu-ana', frame: n })), frameRate: 5, repeat: -1 });
      }
      beep([523, 659, 784], 'triangle', 0.05, 0.12);
      if (EGGS.abuBusy) return 'Abu Ana zwaait naar je: "¡Te amo, Lenny!" 💛';
      EGGS.abuBusy = true;
      const x = p.x + 1, y0 = p.y, y1 = p.y + 20;
      const abu = s.add.sprite(x, y0, 'abu-ana', 0).setOrigin(0.5, 1).setDepth(y0 + 3).setAlpha(0);
      const sh = s.add.ellipse(x, y0 - 1, 10, 3, 0x000000, 0.18).setDepth(y0 + 2).setAlpha(0);
      abu.play('abu-walk');
      s.tweens.add({ targets: [abu, sh], alpha: 1, duration: 200 });
      s.tweens.add({ targets: abu, y: y1, duration: 900, onUpdate: () => { sh.y = abu.y - 1; abu.setDepth(abu.y + 3); sh.setDepth(abu.y + 2); }, onComplete: () => {
        abu.play('abu-wave');
        const say = s.add.text(x, y1 - 28, '¡Te amo, Lenny!', { fontFamily: '"Fredoka", sans-serif', fontSize: '8px', color: '#2b1d16', backgroundColor: '#fff3f6', padding: { x: 3, y: 1 }, resolution: 6 }).setOrigin(0.5, 1).setDepth(100003);
        ['💛', '❤️', '💛', '❤️', '💛'].forEach((c, i) => floatUp(s, x - 10 + i * 5, y1 - 22, c, { size: 9, rise: 26, drift: (i - 2) * 3, delay: i * 160, dur: 1600 }));
        s.time.delayedCall(2600, () => {
          say.destroy();
          abu.play('abu-walk');
          s.tweens.add({ targets: abu, y: y0, duration: 900, onUpdate: () => { sh.y = abu.y - 1; abu.setDepth(abu.y + 3); sh.setDepth(abu.y + 2); } });
          s.tweens.add({ targets: [abu, sh], alpha: 0, delay: 650, duration: 250, onComplete: () => { abu.destroy(); sh.destroy(); EGGS.abuBusy = false; } });
        });
      } });
      return 'Abu Ana komt naar buiten om je gedag te zeggen! 💛';
    },
    'dierentuin': (s, p) => {
      const g = emo(s, p.x + 10, p.y - 26, '🦒', 16).setDepth(p.y - 1);
      g.setAlpha(0);
      s.tweens.add({ targets: g, y: p.y - 44, alpha: 1, duration: 500, ease: 'Back.out',
        onComplete: () => s.tweens.add({ targets: g, angle: { from: -8, to: 8 }, yoyo: true, repeat: 2, duration: 220,
          onComplete: () => s.tweens.add({ targets: g, y: p.y - 26, alpha: 0, duration: 450, onComplete: () => g.destroy() }) }) });
      return 'Een giraf kijkt over het hek. Hoi Lenny! 🦒';
    },
    'voetbal': (s, p) => {
      const b = emo(s, p.x + 14, p.y - 12, '⚽', 7);
      const gx = p.x - 30, gy = p.y - 14;
      s.tweens.add({ targets: b, x: gx, duration: 700, ease: 'Linear' });
      s.tweens.add({ targets: b, y: p.y - 30, duration: 350, yoyo: true, ease: 'Sine.out', onComplete: () => {
        b.destroy();
        const g = emo(s, gx + 12, gy - 6, 'GOAL!', 10).setColor('#ffffff').setStroke('#2b1d16', 3);
        s.tweens.add({ targets: g, scale: { from: 0.4, to: 1.2 }, duration: 300, yoyo: true, hold: 500, onComplete: () => g.destroy() });
        beep([392, 523, 659, 784, 1046], 'square', 0.05, 0.08);
      } });
      return 'Hij zit erin! Mooi geschoten, Lenny! ⚽';
    },
    'plaswijck': (s, p) => {
      const w = emo(s, p.x, p.y - 34, '🎡', 16).setOrigin(0.5);
      s.tweens.add({ targets: w, angle: 720, duration: 1600, ease: 'Cubic.inOut', onComplete: () => s.tweens.add({ targets: w, alpha: 0, duration: 300, onComplete: () => w.destroy() }) });
      return 'Wieee! Nog een rondje? 🎡';
    },
    'blijberg': (s, p) => {
      const b = emo(s, p.x, p.y - 50, '🔔', 12).setOrigin(0.5, 0);
      s.tweens.add({ targets: b, angle: { from: -25, to: 25 }, yoyo: true, repeat: 4, duration: 120, onComplete: () => b.destroy() });
      beep([1046, 784, 1046, 784], 'triangle', 0.05, 0.12);
      return 'Tring! Daar gaat de bel van De Blijberg. 🎒';
    },
    'vroesenpark': (s, p) => {
      const q = emo(s, p.x - 20, p.y - 2, '🐿️', 9);
      s.tweens.add({ targets: q, x: p.x + 26, duration: 1200, ease: 'Sine.inOut', onComplete: () => q.destroy() });
      s.tweens.add({ targets: q, y: p.y - 6, yoyo: true, repeat: 5, duration: 100 });
      return 'Kijk, een eekhoorn! 🐿️';
    },
    'blauwe-huisje': (s, p) => {
      ['🥕', '🌻', '🍅'].forEach((c, i) => floatUp(s, p.x - 10 + i * 10, p.y - 8, c, { size: 9, rise: 20, delay: i * 200 }));
      return null; // keep the normal text
    }
  };
  // These also happen by themselves when Lenny passes by.
  const AUTO = { 'abu-ana': 3, 'dierentuin': 4 };

  function addLandmark(scene, lm, l, x, y) { lms[l.id] = { x, y, scene, door: lm.door }; }

  // Called when Lenny opens a landmark. Returns the text to show (or null).
  function poke(id) {
    const p = lms[id], fn = EGGS[id];
    if (!p || !fn) return null;
    cool[id] = Date.now();
    return fn(p.scene, p);
  }

  function checkAuto(scene) {
    const pl = G().player; if (!pl || G().inside || LQ.UI.isOpen() || G().paused) return;
    const t = pl.tile(), now = Date.now();
    Object.entries(AUTO).forEach(([id, r]) => {
      const p = lms[id]; if (!p || p.scene !== scene) return;
      if (Math.abs(p.door.x - t.x) > r || Math.abs(p.door.y - t.y) > r) return;
      if (cool[id] && now - cool[id] < 60000) return;
      const msg = poke(id); if (msg) LQ.UI.toast(msg);
    });
  }

  /* ---------- bike rewards ---------- */
  function hasBell() { return visits() >= BELL_AT; }
  function hasGold() { return visits() >= GOLD_AT; }
  function ring() {
    const sc = G().activeScene, pl = G().inside ? null : G().player;
    if (!hasBell() || !pl || G().state.mode !== 'bike') return false;
    bellSound();
    floatUp(sc, pl.spr.x + 6, pl.spr.y - 22, '🔔', { size: 9, rise: 14, dur: 900 });
    const t = sc.add.text(pl.spr.x, pl.spr.y - 26, 'tring tring!', { fontFamily: '"Fredoka", sans-serif', fontSize: '8px', color: '#2b1d16', backgroundColor: '#f6ead0', padding: { x: 2, y: 1 }, resolution: 6 }).setOrigin(0.5, 1).setDepth(100003);
    sc.tweens.add({ targets: t, y: t.y - 8, alpha: 0, delay: 500, duration: 600, onComplete: () => t.destroy() });
    return true;
  }
  function paintBike(scene) {
    if (!scene || !scene.textures.exists('lenny')) return;
    const want = hasGold() ? 'gold' : 'black';
    if (paintBike.cur === want) return;
    const tex = scene.textures.get('lenny');
    if (!tex.context) return;
    const sheet = LQ.Sprites.lennySheet(want === 'gold' ? { bike: '#d9a521', bikeHi: '#f6dc6a' } : null);
    tex.context.clearRect(0, 0, tex.width, tex.height);
    tex.context.drawImage(sheet, 0, 0);
    tex.refresh();
    paintBike.cur = want;
  }

  // Tell Lenny once when he earns something.
  function checkRewards() {
    const e = ex(), n = visits();
    const scene = G().scene;
    if (n >= BELL_AT && !e.bell) { e.bell = true; G().save(); later('🔔 Je fiets heeft nu een bel! Druk op B, of tik op jezelf als je fietst.'); }
    if (n >= GOLD_AT && !e.gold) { e.gold = true; G().save(); later('✨ Wow, je fiets is nu van goud! Dat krijg je voor 5 scholen.'); }
    if (n >= CUBE_FACES && !e.cubeDone) { e.cubeDone = true; G().save(); later('🎉 Je kubus is opgelost! Je hebt 6 scholen bekeken.', 'fanfare'); cubePulse(); }
    paintBike(scene);
    drawCube();
  }
  let queue = [];
  function later(msg, snd) {
    queue.push([msg, snd]);
    if (queue.length > 1) return;
    const next = () => {
      if (!queue.length) return;
      if (LQ.UI.isOpen()) { setTimeout(next, 1200); return; }
      const [m, s] = queue[0];
      LQ.UI.toast(m); LQ.Sound.play(s || 'win');
      setTimeout(() => { queue.shift(); next(); }, 2900);
    };
    setTimeout(next, 900);
  }

  /* ---------- the cube ---------- */
  // Faces: up, front, right, back, left, down.
  const COLS = ['#f7f4ee', '#2fa84f', '#d3192c', '#2f6fd6', '#f08a24', '#f5c518'];
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function seed() { const e = ex(); if (!e.cubeSeed) { e.cubeSeed = 1 + Math.floor(Math.random() * 1e9); G().save(); } return e.cubeSeed; }
  // Each visited school puts 1/6 of the stickers back in place (spread over
  // the whole cube, so it looks like a real cube getting closer to solved).
  // The middle sticker of each side never moves, like on a real cube.
  function stickers() {
    const n = Math.min(CUBE_FACES, visits());
    const out = COLS.map(c => Array(9).fill(c));
    const spots = [];
    COLS.forEach((c, f) => { for (let i = 0; i < 9; i++) if (i !== 4) spots.push([f, i]); });
    const r1 = rng(seed()), r2 = rng(seed() + 1);
    const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    shuffle(spots, r1);
    const loose = spots.slice(Math.round(spots.length * n / CUBE_FACES));
    if (loose.length) {
      let cols = shuffle(loose.map(([f]) => COLS[f]), r2);
      for (let k = 0; k < cols.length && cols.every((c, i) => c === COLS[loose[i][0]]); k++) cols = cols.slice(1).concat(cols[0]);
      loose.forEach(([f, i], k) => { out[f][i] = cols[k]; });
    }
    return out;
  }

  // Isometric cube: three faces (top, left, right) on a 2D canvas.
  function iso(ctx, cx, cy, s, top, left, right) {
    const k = s / 3, dx = Math.cos(Math.PI / 6) * k, dy = Math.sin(Math.PI / 6) * k;
    const poly = (pts, col) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); };
    ctx.lineWidth = Math.max(1, s / 26); ctx.strokeStyle = '#1b1410'; ctx.lineJoin = 'round';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      // top: rows go down-left, columns go down-right
      const x = cx + (c - r) * dx, y = cy - 3 * k + (c + r) * dy;
      poly([[x, y], [x + dx, y + dy], [x, y + 2 * dy], [x - dx, y + dy]], top[r * 3 + c]);
      // left face
      const lx = cx - 3 * dx + c * dx, ly = cy + c * dy + r * k;
      poly([[lx, ly], [lx + dx, ly + dy], [lx + dx, ly + dy + k], [lx, ly + k]], left[r * 3 + c]);
      // right face
      const rx = cx + c * dx, ry = cy + 3 * dy - c * dy + r * k;
      poly([[rx, ry], [rx + dx, ry - dy], [rx + dx, ry - dy + k], [rx, ry + k]], right[r * 3 + c]);
    }
  }

  let cubeEl = null, cubeCv = null, cubeLbl = null, view = 0;
  function initCube() {
    cubeCv = document.createElement('canvas');
    cubeLbl = LQ.h('span', { class: 'cube-n' });
    cubeEl = LQ.h('button', { id: 'cube', type: 'button', 'aria-label': 'Jouw kubus', onclick: () => { LQ.Sound.play(); cubePanel(); } }, [cubeCv, cubeLbl]);
    document.body.appendChild(cubeEl);
    setInterval(() => { view = 1 - view; drawCube(); }, 4000);
    drawCube();
  }
  function drawCube() {
    if (!cubeCv || !G().data) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1), S = 46;
    cubeCv.width = S * dpr; cubeCv.height = S * dpr; cubeCv.style.width = S + 'px'; cubeCv.style.height = S + 'px';
    const ctx = cubeCv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
    const st = stickers();
    if (view === 0) iso(ctx, S / 2, S / 2 + 2, 20, st[0], st[1], st[2]);
    else iso(ctx, S / 2, S / 2 + 2, 20, st[5], st[3], st[4]);
    const n = Math.min(CUBE_FACES, visits());
    cubeLbl.textContent = n >= CUBE_FACES ? '✓' : n + '/6';
    cubeEl.setAttribute('aria-label', n >= CUBE_FACES ? 'Jouw kubus is opgelost!' : `Jouw kubus: ${n} van de 6 stappen klaar`);
    cubeEl.classList.toggle('solved', n >= CUBE_FACES);
  }
  function cubePulse() { if (!cubeEl) return; cubeEl.classList.remove('pulse'); void cubeEl.offsetWidth; cubeEl.classList.add('pulse'); }

  // Flat net of the cube, big, in a panel.
  function net(st, px) {
    const cv = document.createElement('canvas'), W = 12 * px + 8, H = 9 * px + 8, dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.className = 'cube-net';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pos = [[3, 0], [3, 3], [6, 3], [9, 3], [0, 3], [3, 6]]; // up, front, right, back, left, down
    pos.forEach(([fx, fy], f) => st[f].forEach((c, i) => {
      const x = 4 + (fx + i % 3) * px, y = 4 + (fy + Math.floor(i / 3)) * px;
      ctx.fillStyle = '#1b1410'; ctx.fillRect(x, y, px, px);
      ctx.fillStyle = c; ctx.fillRect(x + 2, y + 2, px - 4, px - 4);
    }));
    return cv;
  }
  function cubePanel() {
    const C = LQ.Challenges, h = LQ.h, n = Math.min(CUBE_FACES, visits());
    const body = LQ.UI.openPanel('Jouw kubus');
    const wrap = h('div', { class: 'cube-wrap' });
    const draw = () => { wrap.innerHTML = ''; wrap.appendChild(net(stickers(), 22)); };
    draw();
    const msg = n >= CUBE_FACES
      ? 'Opgelost! 🎉 Je hebt 6 scholen bekeken. Elke school telt even zwaar voor je kubus.'
      : `Elke school die je bezoekt draait je kubus een stukje verder goed. Nog ${CUBE_FACES - n} ${CUBE_FACES - n === 1 ? 'school' : 'scholen'} en hij is helemaal opgelost!`;
    const mix = h('button', { class: 'btn', onclick: () => {
      ex().cubeSeed = 1 + Math.floor(Math.random() * 1e9); G().save(); draw(); drawCube(); beep([330, 392, 494], 'square', 0.04, 0.05);
    } }, '🔄 Husselen');
    C.screen(body, [C.say(msg), wrap, n < CUBE_FACES ? h('p', { class: 'hint' }, 'De blokjes die nog niet goed zitten kun je husselen. Het middelste blokje van elke kant staat altijd goed, net als bij een echte kubus.') : null,
      C.row([n < CUBE_FACES ? mix : null, C.next('Verder spelen', () => LQ.UI.closePanel())])]);
  }

  /* ---------- Lenny twists his cube when he stands still ---------- */
  function cubeFrames(scene) {
    if (scene.textures.exists('mini-cube')) return;
    const N = 4, S = 8, cv = document.createElement('canvas'); cv.width = S * N; cv.height = S;
    const ctx = cv.getContext('2d'), r = rng(7);
    for (let f = 0; f < N; f++) {
      ctx.fillStyle = '#1b1410'; ctx.fillRect(f * S, 0, 7, 7);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = COLS[Math.floor(r() * 6)]; ctx.fillRect(f * S + 1 + (i % 3) * 2, 1 + Math.floor(i / 3) * 2, 2, 2); }
    }
    const tex = scene.textures.addCanvas('mini-cube', cv);
    for (let f = 0; f < N; f++) tex.add(f, 0, f * S, 0, 7, 7);
  }
  function tickIdle(scene, delta) {
    const pl = G().inside ? G().interiorPlayer : G().player;
    if (!pl || !pl.spr || !pl.spr.scene || pl.spr.scene !== scene) return;
    const onBike = !G().inside && G().state.mode === 'bike';
    const now = scene.time.now;
    if (pl.moving || onBike || LQ.UI.isOpen() || pl.dir === 'up') { idleSince = now; if (idleCube) idleCube.setVisible(false); return; }
    if (now - idleSince < IDLE_MS) return;
    if (!idleCube || idleCube.scene !== scene) { cubeFrames(scene); idleCube = scene.add.image(0, 0, 'mini-cube', 0).setOrigin(0.5); }
    idleT += delta;
    if (idleT > 260) { idleT = 0; idleFrame = (idleFrame + 1) % 4; idleCube.setFrame(idleFrame); }
    const side = pl.dir === 'left' ? -5 : pl.dir === 'right' ? 5 : 0;
    idleCube.setVisible(true).setPosition(Math.round(pl.spr.x + side), Math.round(pl.spr.y - 9 + (idleFrame % 2 ? -1 : 0))).setDepth(pl.spr.y + 1);
  }

  /* ---------- Kit walks along (an option in Kit's chat) ---------- */
  const trail = [];
  function kitChanged() {
    const k = LQ.Schools.kitRef, sc = G().scene; if (!k || !sc) return;
    trail.length = 0;
    if (!G().state.kitFollow) sc.tweens.add({ targets: k.spr, x: k.home.x, y: k.home.y, duration: 700, ease: 'Sine.inOut', onUpdate: syncKit });
  }
  function syncKit() {
    const k = LQ.Schools.kitRef; if (!k) return;
    k.target.x = k.spr.x; k.target.y = k.spr.y - 2; k.spr.setDepth(k.spr.y);
  }
  function tickKit(scene, delta) {
    const k = LQ.Schools.kitRef, pl = G().player;
    if (k) k.target.hidden = !!(G().state.kitFollow && pl && pl.moving); // no "talk to Kit" button while walking together
    if (!k || !pl || !G().state.kitFollow || k.spr.scene !== scene) return;
    const px = pl.spr.x, py = pl.spr.y, last = trail[trail.length - 1];
    if (!last || Math.hypot(px - last.x, py - last.y) > 3) { trail.push({ x: px, y: py }); if (trail.length > 60) trail.shift(); }
    const gap = G().state.mode === 'bike' ? 9 : 7;           // trail steps behind Lenny
    const goal = trail.length > gap ? trail[trail.length - 1 - gap] : null;
    if (!goal) return;
    const dx = goal.x - k.spr.x, dy = goal.y - k.spr.y, d = Math.hypot(dx, dy);
    if (d > 260) { k.spr.setPosition(goal.x, goal.y); syncKit(); return; } // far behind (map jump): catch up
    const sp = (G().state.mode === 'bike' ? 140 : 75) * Math.min(delta, 50) / 1000 * (d > 40 ? 1.4 : 1);
    if (d > 1) {
      k.spr.x += dx / d * Math.min(sp, d); k.spr.y += dy / d * Math.min(sp, d);
      if (Math.abs(dx) > 0.5) k.spr.setFlipX(dx > 0);
    }
    syncKit();
  }

  /* ---------- hook into the scenes ---------- */
  function attach(scene) {
    if (scene._lqExtras) return; scene._lqExtras = true;
    let acc = 0;
    scene.events.on('update', (t, d) => {
      tickIdle(scene, d);
      tickKit(scene, d);
      acc += d; if (acc > 300 && scene.scene.key === 'world') { acc = 0; checkAuto(scene); }
    });
    scene.events.once('shutdown', () => { scene._lqExtras = false; if (idleCube && idleCube.scene === scene) idleCube = null; });
    if (scene.scene.key === 'world') {
      paintBike.cur = null; paintBike(scene);
      // following Kit starts next to Lenny when the game loads
      const k = LQ.Schools.kitRef, pl = G().player;
      if (k && pl && G().state.kitFollow) { k.spr.setPosition(pl.spr.x - 14, pl.spr.y); syncKit(); }
      scene.input.keyboard.on('keydown-B', () => { if (!LQ.UI.isOpen()) ring(); });
      scene.input.on('pointerup', (p) => {
        const pl = G().player; if (!pl || LQ.UI.isOpen() || G().inside) return;
        if (Math.abs(p.worldX - pl.spr.x) < 10 && p.worldY < pl.spr.y + 2 && p.worldY > pl.spr.y - 24) ring();
      });
    }
  }

  function init() { initCube(); }

  return { init, attach, addLandmark, poke, checkRewards, ring, drawCube, visits, kitChanged };
})();
