/* =====================================================================
   EXTRAS — small surprises that never change the ranking.
   - Easter eggs at the family landmarks (Abu Ana, the giraffe, the
     football pitch, Plaswijck, De Blijberg, Vroesenpark, la casita azul
     with Jiska chopping wood). Lucia, Lenny's sister, sings karaoke and
     dances next to the house (dancing with her plays disco music), and runs
     over to cheer at the bike rewards and the cube.
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
    'voetbal': () => { penalty(); return false; }, // false = no toast, the game opens instead
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
    'mam': (s, p) => {
      // Mam steps out of her front door, waves, and throws Lenny a cookie.
      if (EGGS.mamBusy) return 'Mam zwaait naar je! 💛';
      EGGS.mamBusy = true;
      const pl = G().player;
      stepOut(s, 'mam', LQ.Sprites.mamSheet, p.x + 1, p.y, MAM_SAYS, (x, y) => {
        if (!pl) return;
        const c = emo(s, x + 6, y - 14, '🍪', 8).setOrigin(0.5);
        s.tweens.add({ targets: c, x: pl.spr.x, duration: 800, ease: 'Linear' });
        s.tweens.add({ targets: c, y: Math.min(y, pl.spr.y) - 30, duration: 400, yoyo: true, ease: 'Sine.out', onComplete: () => { c.destroy(); snack(s); } });
        s.tweens.add({ targets: c, angle: 540, duration: 800 });
      }, () => { EGGS.mamBusy = false; });
      beep([523, 784, 659], 'triangle', 0.05, 0.11);
      return 'Mam komt naar buiten en gooit je een koekje toe! 🍪';
    },
    'blauwe-huisje': (s, p) => {
      ['🥕', '🌻', '🍅'].forEach((c, i) => floatUp(s, p.x - 10 + i * 10, p.y - 8, c, { size: 9, rise: 20, delay: i * 200 }));
      jiskaChat();
      return false; // Jiska's chat opens instead of a toast
    },

  };
  /* ---------- Penalty at RBFA: 3 shots, about 20 seconds, no points ----------
     The arrow swings left and right; tap (or space) to shoot where it points.
     The keeper dives a bit late, so a shot into a corner is a goal. */
  function penalty() {
    const C = LQ.Challenges, h = LQ.h;
    const body = LQ.UI.openPanel('⚽ Penalty bij RBFA');
    const W = 300, H = 200, dpr = Math.min(3, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr; cv.className = 'pen-cv';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    const info = h('p', { class: 'lead center-t', 'aria-live': 'polite' }, 'Tik op het veld of op "Schiet!" als de pijl goed staat.');
    const shootBtn = h('button', { class: 'btn primary big', onclick: () => shoot() }, '⚽ Schiet!');
    const again = h('button', { class: 'btn', hidden: true, onclick: () => reset() }, 'Nog een keer');
    const done = h('button', { class: 'btn', onclick: () => LQ.UI.closePanel() }, 'Klaar');
    C.screen(body, [C.say('Drie penalty\'s, net als op je club. Lukt het je om te scoren?', 'Kit'), h('div', { class: 'pen-wrap' }, cv), info, C.row([shootBtn, again, done])]);
    const GX0 = 70, GX1 = 230, GY = 52;                 // goal mouth
    let aim, dir, keeper, kv, ball, shots, goals, phase, raf, last, result;
    function reset() { aim = 150; dir = 1; keeper = 150; kv = 0; ball = null; shots = 0; goals = 0; phase = 'aim'; result = ''; again.hidden = true; shootBtn.disabled = false; info.textContent = 'Tik op het veld of op "Schiet!" als de pijl goed staat.'; }
    function shoot() {
      if (phase !== 'aim') return;
      phase = 'fly'; shootBtn.disabled = true;
      ball = { x: 150, y: 172, tx: aim, ty: GY + 14, t: 0 };
      // the keeper guesses: dives toward the ball, but a little late and not all the way
      const guess = 150 + (aim - 150) * (0.35 + Math.random() * 0.6);
      kv = (guess - keeper) / 0.5;
      beep([330], 'square', 0.04, 0.05);
    }
    function draw() {
      ctx.fillStyle = '#4f9a42'; ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 30) { ctx.fillStyle = '#5aa84d'; ctx.fillRect(x, 0, 15, H); }
      ctx.fillStyle = '#f4efe4'; ctx.fillRect(40, GY + 26, 220, 2); ctx.fillRect(149, 165, 3, 3);
      // goal and net
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let x = GX0; x <= GX1; x += 8) ctx.fillRect(x, GY - 26, 1, 26); for (let y = GY - 26; y <= GY; y += 6) ctx.fillRect(GX0, y, GX1 - GX0, 1);
      ctx.fillStyle = '#f7f4ee'; ctx.fillRect(GX0 - 3, GY - 30, 3, 32); ctx.fillRect(GX1, GY - 30, 3, 32); ctx.fillRect(GX0 - 3, GY - 30, GX1 - GX0 + 6, 3);
      // keeper (yellow shirt, gloves)
      const kx = Math.round(keeper);
      ctx.fillStyle = '#2b1d16'; ctx.fillRect(kx - 9, GY - 22, 18, 24);
      ctx.fillStyle = '#f5c518'; ctx.fillRect(kx - 8, GY - 12, 16, 12); ctx.fillStyle = '#f1c7a5'; ctx.fillRect(kx - 4, GY - 21, 8, 8);
      ctx.fillStyle = '#2f6fd6'; ctx.fillRect(kx - 8, GY, 16, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(kx - 12, GY - 10, 4, 4); ctx.fillRect(kx + 8, GY - 10, 4, 4);
      // aim arrow
      if (phase === 'aim') {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(150, 168); ctx.lineTo(aim, GY + 14); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(aim - 4, GY + 10, 8, 8);
      }
      // ball
      const b = ball || { x: 150, y: 172, t: 0 }, r = 6 - (b.t || 0) * 2;
      ctx.fillStyle = '#f7f4ee'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b1d16'; ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
      // score
      ctx.fillStyle = 'rgba(43,29,22,.75)'; ctx.fillRect(6, 6, 92, 18); ctx.fillStyle = '#ffffff'; ctx.font = '600 12px Fredoka, sans-serif';
      ctx.fillText(`⚽ ${goals} van ${shots}  (${3 - shots} over)`, 10, 19);
      if (result) { ctx.font = '700 26px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#2b1d16'; ctx.fillText(result, 151, 121); ctx.fillStyle = '#ffffff'; ctx.fillText(result, 150, 120); ctx.textAlign = 'left'; }
    }
    function step(ts) {
      if (!cv.isConnected) return;
      const dt = Math.min(0.05, ((ts - (last || ts)) / 1000)); last = ts;
      if (phase === 'aim') { aim += dir * 150 * dt; if (aim > GX1 - 6) { aim = GX1 - 6; dir = -1; } if (aim < GX0 + 6) { aim = GX0 + 6; dir = 1; } keeper += Math.sin(ts / 300) * 20 * dt; }
      if (phase === 'fly' && ball) {
        ball.t = Math.min(1, ball.t + dt / 0.5);
        ball.x = 150 + (ball.tx - 150) * ball.t; ball.y = 172 + (ball.ty - 172) * ball.t - Math.sin(ball.t * Math.PI) * 14;
        keeper += kv * dt; keeper = Math.max(GX0 + 8, Math.min(GX1 - 8, keeper));
        if (ball.t >= 1) {
          shots++;
          const saved = Math.abs(ball.x - keeper) < 13;
          if (saved) { result = 'Gered!'; beep([300, 220], 'square', 0.04, 0.1); }
          else { goals++; result = 'GOAL!'; beep([392, 523, 659, 784, 1046], 'square', 0.05, 0.08); }
          phase = 'wait';
          setTimeout(() => {
            if (!cv.isConnected) return;
            result = ''; ball = null; keeper = 150;
            if (shots >= 3) {
              phase = 'end';
              info.textContent = goals === 3 ? 'Drie uit drie! Wat een spits! 🏆' : goals ? `${goals} van de 3 erin. Mooi geschoten!` : 'De keeper had een goede dag. Nog een keer?';
              again.hidden = false;
            } else { phase = 'aim'; shootBtn.disabled = false; }
          }, 1100);
        }
      }
      draw(); raf = requestAnimationFrame(step);
    }
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); shoot(); });
    const key = (e) => { if ((e.key === ' ' || e.key === 'Enter') && cv.isConnected) { e.preventDefault(); shoot(); } };
    document.addEventListener('keydown', key);
    const veil = document.getElementById('veil');
    const obs = new MutationObserver(() => { if (veil.hidden || !cv.isConnected) { cancelAnimationFrame(raf); document.removeEventListener('keydown', key); obs.disconnect(); } });
    obs.observe(veil, { attributes: true, attributeFilter: ['hidden'] }); obs.observe(body, { childList: true });
    reset(); raf = requestAnimationFrame(step);
  }

  /* A family member walks out of a front door, waves, says something, then goes
     back in (Mam; Mami uses the same idea). onWave(x, y) runs while waving. */
  function stepOut(s, key, sheetFn, x, y0, text, onWave, onDone) {
    if (!s.textures.exists(key)) {
      const tex = s.textures.addCanvas(key, sheetFn());
      for (let f = 0; f < 4; f++) tex.add(f, 0, f * 20, 0, 20, 24);
      s.anims.create({ key: key + '-walk', frames: [0, 1].map(n => ({ key, frame: n })), frameRate: 6, repeat: -1 });
      s.anims.create({ key: key + '-wave', frames: [2, 3].map(n => ({ key, frame: n })), frameRate: 5, repeat: -1 });
    }
    const y1 = y0 + 18;
    const who = s.add.sprite(x, y0, key, 0).setOrigin(0.5, 1).setDepth(y0 + 3).setAlpha(0).play(key + '-walk');
    const sh = s.add.ellipse(x, y0 - 1, 10, 3, 0x000000, 0.18).setDepth(y0 + 2).setAlpha(0);
    const keep = () => { sh.y = who.y - 1; who.setDepth(who.y + 3); sh.setDepth(who.y + 2); };
    s.tweens.add({ targets: [who, sh], alpha: 1, duration: 200 });
    s.tweens.add({ targets: who, y: y1, duration: 800, onUpdate: keep, onComplete: () => {
      who.play(key + '-wave');
      const say = s.add.text(x, y1 - 28, text, { fontFamily: '"Fredoka", sans-serif', fontSize: '8px', color: '#2b1d16', backgroundColor: '#fff3f6', padding: { x: 3, y: 1 }, resolution: 6 }).setOrigin(0.5, 1).setDepth(100003);
      floatUp(s, x + 6, y1 - 22, '💛', { size: 8, rise: 20, delay: 300 });
      if (onWave) onWave(x, y1);
      s.time.delayedCall(3000, () => {
        say.destroy(); who.play(key + '-walk');
        s.tweens.add({ targets: who, y: y0, duration: 800, onUpdate: keep });
        s.tweens.add({ targets: [who, sh], alpha: 0, delay: 600, duration: 200, onComplete: () => { who.destroy(); sh.destroy(); if (onDone) onDone(); } });
      });
    } });
  }

  // What Mam says (change it here).
  const MAM_SAYS = 'Hoi Len! Hier, een koekje voor onderweg!';
  // The cookie: a little 🍪 floats above Lenny for a while, then "nom!".
  let snackIcon = null;
  function snack(s) {
    const pl = G().player; if (!pl) return;
    if (snackIcon) snackIcon.destroy();
    snackIcon = emo(s, pl.spr.x + 7, pl.spr.y - 22, '🍪', 7).setOrigin(0.5);
    s.time.delayedCall(25000, () => {
      if (!snackIcon) return;
      const t = snackIcon; snackIcon = null;
      floatUp(s, t.x, t.y, 'nom!', { size: 7, rise: 10, dur: 900 }); t.destroy();
    });
  }
  // These also happen by themselves when Lenny passes by.
  const AUTO = { 'abu-ana': 3, 'dierentuin': 4 };

  function addLandmark(scene, lm, l, x, y) {
    lms[l.id] = { x, y, scene, door: lm.door };
    if (l.id === 'mam') return [addFifi(scene, lm)];   // extra things to talk to
    if (l.id === 'blauwe-huisje') return [addJiska(scene, x, y)];
    return [];
  }

  // Called when Lenny opens a landmark. Returns the text to show (or null).
  function poke(id) {
    const p = lms[id], fn = EGGS[id];
    if (!p || !fn) return null;
    cool[id] = Date.now();
    return fn(p.scene, p);
  }

  let mamiHello = false; // Mami's hello once per game session
  // Mami talks to Lenny in Spanish (30 Oct 2026)
  const MAMI_HELLO = ['¡Hola Len! ¡Que te diviertas explorando! 💛', '¡Hola, mi amor! ¿Andás con cuidado en la bici?', '¡Suerte, Len! Quiero saber qué escuela te gusta.'];
  /* Mami at home: when Lenny comes back after visiting a school, she steps
     out of the front door and asks how it was. Once per visited school. */
  function checkMami(scene, t) {
    const home = G().map && G().map.home; if (!home) return;
    const d = home.door; if (Math.abs(d.x - t.x) > 3 || Math.abs(d.y - t.y) > 4) return;
    const e = ex(); e.mamiAsked = e.mamiAsked || [];
    const v = G().state.visits || {};
    const fresh = Object.keys(v).filter(id => v[id] && v[id].done && !e.mamiAsked.includes(id));
    if (!fresh.length) {
      // no new school to ask about: she still says hi the first time he passes home in a game session
      if (mamiHello) return;
      mamiHello = true;
      stepOut(scene, 'mami', LQ.Sprites.mamiSheet, d.x * TS + 1, d.y * TS + 2, MAMI_HELLO[Math.floor(Math.random() * MAMI_HELLO.length)]);
      beep([523, 659], 'triangle', 0.05, 0.12);
      return;
    }
    mamiHello = true;
    const s = G().data.schools.find(x => x.id === fresh[fresh.length - 1]);
    e.mamiAsked.push(...fresh); G().save();
    // Mami steps out of the front door, waves and asks, then goes back in
    stepOut(scene, 'mami', LQ.Sprites.mamiSheet, d.x * TS + 1, d.y * TS + 2, `¡Hola Len! ¿Cómo te fue en ${s.short}?`);
    beep([523, 659], 'triangle', 0.05, 0.12);
    LQ.UI.toast(`Mami komt naar buiten: "¡Hola Len! ¿Cómo te fue en ${s.short}? ¡Contame!" 💛`);
  }

  function checkAuto(scene) {
    const pl = G().player; if (!pl || G().inside || LQ.UI.isOpen() || G().paused) return;
    const t = pl.tile(), now = Date.now();
    checkMami(scene, t);
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
    if (n >= BELL_AT && !e.bell) { e.bell = true; G().save(); later('🔔 Je fiets heeft nu een bel! Druk op B, of tik op jezelf als je fietst.'); luciaCheer('Een bel! Tring tring! 🔔'); }
    if (n >= GOLD_AT && !e.gold) { e.gold = true; G().save(); later('✨ Wow, je fiets is nu van goud! Dat krijg je voor 5 scholen.'); luciaCheer('Een gouden fiets! Wauw, Len! ✨'); }
    if (n >= CUBE_FACES && !e.cubeDone) { e.cubeDone = true; G().save(); later('🎉 Je kubus is opgelost! Je hebt 6 scholen bekeken.', 'fanfare'); cubePulse(); luciaCheer('Je kubus is klaar! Hoera! 🎉'); }
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

  /* ---------- cats: walk when moving, sit when still ---------- */
  function catAnims(scene, key, P) {
    if (!scene.textures.exists(key + '-walk')) {
      const tex = scene.textures.addCanvas(key + '-walk', LQ.Sprites.catWalkSheet(P));
      for (let f = 0; f < 4; f++) tex.add(f, 0, f * 16, 0, 16, 16);
    }
    if (!scene.anims.exists(key + '-walk')) scene.anims.create({ key: key + '-walk', frames: [0, 1, 2, 3].map(n => ({ key: key + '-walk', frame: n })), frameRate: 8, repeat: -1 });
    if (!scene.anims.exists(key + '-run')) scene.anims.create({ key: key + '-run', frames: [0, 1, 2, 3].map(n => ({ key: key + '-walk', frame: n })), frameRate: 13, repeat: -1 });
  }
  // spr.texture key 'kit' (sitting) or e.g. 'fifi'; walking uses '<key>-walk'
  // moving: walk (or run); 'stand': stand still, side view; false: sit, facing you
  function catAnim(scene, spr, moving, fast) {
    const base = spr.catKey || (spr.catKey = spr.texture.key);
    catAnims(scene, base, spr.catPal);
    if (moving === 'stand') {
      if (spr.anims.isPlaying) spr.anims.stop();
      if (spr.texture.key !== base + '-walk' || spr.frame.name !== 1) spr.setTexture(base + '-walk', 1);
      return;
    }
    const want = moving ? base + (fast ? '-run' : '-walk') : base + '-idle';
    if (spr.anims.currentAnim && spr.anims.currentAnim.key === want) return;
    if (want.endsWith('-idle') && !scene.anims.exists(want)) { spr.anims.stop(); spr.setTexture(base, 0); return; }
    spr.play(want);
  }

  /* ---------- Fifi, the family's cat (a boy), at Mam's house ---------- */
  let fifi = null;
  function addFifi(scene, lm) {
    if (!scene.textures.exists('fifi')) {
      const tex = scene.textures.addCanvas('fifi', LQ.Sprites.fifiSheet()); tex.add(0, 0, 0, 0, 16, 16); tex.add(1, 0, 16, 0, 16, 16);
    }
    if (!scene.anims.exists('fifi-idle')) scene.anims.create({ key: 'fifi-idle', frames: [0, 0, 0, 1].map(n => ({ key: 'fifi', frame: n })), frameRate: 2, repeat: -1 });
    const hx = (lm.door.x + 1) * TS + 10, hy = lm.door.y * TS + 14;
    const spr = scene.add.sprite(hx, hy, 'fifi', 0).setOrigin(0.5, 1).setDepth(hy).play('fifi-idle');
    spr.catKey = 'fifi'; spr.catPal = LQ.Sprites.FIFI;
    const target = { kind: 'fifi', x: hx, y: hy - 2, label: '🐾 Fifi', open: fifiChat };
    fifi = { spr, target, home: { x: hx, y: hy } };
    scene.events.once('shutdown', () => { fifi = null; });
    return target;
  }
  function fifiChat() {
    const C = LQ.Challenges, h = LQ.h, on = !!G().state.fifiFollow;
    const body = LQ.UI.openPanel('Fifi');
    C.screen(body, [C.say(on ? 'Miauw! Fifi loopt lekker met je mee. Blijft hij nog even, of breng je hem naar huis?' : 'Miauw! Dit is Fifi. Hij wil mee op avontuur!', 'Fifi'),
      C.row([C.next(on ? '🏠 Breng Fifi naar huis' : '🐾 Kom mee, Fifi!', () => {
        G().state.fifiFollow = !on; G().save(); LQ.UI.closePanel();
        LQ.UI.toast(on ? 'Fifi rent terug naar huis. Doei Fifi! 🐾' : 'Fifi loopt met je mee! 🐾');
        followChanged();
      }), h('button', { class: 'btn', onclick: () => LQ.UI.closePanel() }, 'Aai Fifi 🤍')])]);
  }


  /* ---------- Jiska, chopping wood at la casita azul ---------- */
  let jiska = null;
  function anim4(scene, key, sheetFn) {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.addCanvas(key, sheetFn());
    for (let f = 0; f < 4; f++) tex.add(f, 0, f * 20, 0, 20, 24);
  }
  function addJiska(scene, x, y) {
    anim4(scene, 'jiska', LQ.Sprites.jiskaSheet);
    if (!scene.textures.exists('chopblock')) { const t = scene.textures.addCanvas('chopblock', LQ.Sprites.chopBlock()); t.add(0, 0, 0, 0, 16, 12); t.add(1, 0, 16, 0, 16, 12); }
    if (!scene.anims.exists('jiska-chop')) scene.anims.create({ key: 'jiska-chop', frames: [0, 0, 0, 1, 1].map(n => ({ key: 'jiska', frame: n })), frameRate: 5, repeat: -1 });
    if (!scene.anims.exists('jiska-wave')) scene.anims.create({ key: 'jiska-wave', frames: [2, 3].map(n => ({ key: 'jiska', frame: n })), frameRate: 5, repeat: -1 });
    const jx = x + 26, jy = y + 4;
    const block = scene.add.image(jx + 12, jy, 'chopblock', 0).setOrigin(0.5, 1).setDepth(jy);
    const spr = scene.add.sprite(jx, jy, 'jiska', 0).setOrigin(0.5, 1).setDepth(jy + 1).play('jiska-chop');
    // a little wood chip each time the axe comes down
    spr.on('animationupdate', (a, fr) => {
      if (a.key !== 'jiska-chop' || fr.index !== 4 || !spr.visible) return;
      block.setFrame(1); scene.time.delayedCall(500, () => block.setFrame(0));
      if (Math.random() < 0.6) floatUp(scene, jx + 12 + (Math.random() * 8 - 4), jy - 8, '🪵', { size: 5, rise: 8, dur: 600, drift: Math.random() * 10 - 5 });
    });
    const target = { kind: 'jiska', x: jx, y: jy - 2, label: '🪓 Jiska', open: () => jiskaChat() };
    jiska = { spr, block, scene };
    scene.events.once('shutdown', () => { jiska = null; });
    return target;
  }
  const JISKA_HI = 'Hoi Lenny! Ik hak hout voor het kampvuurtje bij la casita azul. Help je even mee?';
  function jiskaChat() {
    const C = LQ.Challenges, h = LQ.h;
    if (jiska) jiska.spr.play('jiska-wave');
    const body = LQ.UI.openPanel('Jiska');
    const back = () => { if (jiska && jiska.spr.scene) jiska.spr.play('jiska-chop'); };
    C.screen(body, [jiskaFace(C.say(JISKA_HI, 'Jiska')),
      C.row([C.next('🪓 Ja, ik help mee!', () => chopGame(body, back)), h('button', { class: 'btn', onclick: () => { LQ.UI.closePanel(); back(); } }, 'Nu even niet, doei Jiska! 👋')])]);
    watchClose(body, back);
  }
  function jiskaFace(el) {
    try { const f = document.createElement('canvas'); f.width = 20; f.height = 14; f.getContext('2d').drawImage(LQ.Sprites.jiskaSheet(), 40, 0, 20, 14, 0, 0, 20, 14); f.className = 'mami-face'; const w = el.querySelector('.who'); if (w) w.prepend(f); el.classList.add('fam-say'); } catch (e) {}
    return el;
  }
  function watchClose(body, fn) {
    const veil = document.getElementById('veil'); if (!veil) return;
    const obs = new MutationObserver(() => { if (veil.hidden || !body.isConnected) { obs.disconnect(); fn(); } });
    obs.observe(veil, { attributes: true, attributeFilter: ['hidden'] });
  }
  /* Three logs, tap "Hak!" when the axe is up. About 10 seconds, no points. */
  function chopGame(body, after) {
    const C = LQ.Challenges, h = LQ.h;
    const W = 240, H = 150, dpr = Math.min(3, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr; cv.className = 'pen-cv';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    const info = h('p', { class: 'lead center-t', 'aria-live': 'polite' }, 'Tik op "Hak!" of op het blok. Drie blokken hout.');
    const btn = h('button', { class: 'btn primary big', onclick: () => hit() }, '🪓 Hak!');
    const done = h('button', { class: 'btn', hidden: true, onclick: () => { LQ.UI.closePanel(); } }, 'Klaar 👋');
    C.screen(body, [jiskaFace(C.say('Hout op het blok... en hak! Niet te hard, hoor.', 'Jiska')), h('div', { class: 'pen-wrap' }, cv), info, C.row([btn, done])]);
    let logs = 0, split = 0, swing = 0, raf, chips = [];
    function hit() {
      if (logs >= 3 || swing > 0) return;
      swing = 1; beep([196, 147], 'square', 0.05, 0.06);
      setTimeout(() => {
        split = 1; logs++;
        for (let i = 0; i < 6; i++) chips.push({ x: 120, y: 92, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60, t: 0 });
        info.textContent = logs < 3 ? `Krak! Nog ${3 - logs} ${3 - logs === 1 ? 'blok' : 'blokken'}.` : 'Top! Genoeg hout voor een warm vuurtje. 🔥';
        setTimeout(() => { split = 0; swing = 0; if (logs >= 3) finish(); }, 650);
      }, 180);
    }
    function finish() {
      btn.hidden = true; done.hidden = false; beep([392, 523, 659, 784], 'triangle', 0.05, 0.1);
      const first = body.querySelector('.bubble'), thanks = jiskaFace(C.say('Dankjewel, Lenny! Jij bent een echte houthakker. Kom je straks een marshmallow roosteren? 🔥', 'Jiska'));
      if (first) first.replaceWith(thanks); else body.prepend(thanks);
      if (jiska && jiska.spr.scene) floatUp(jiska.scene, jiska.spr.x + 12, jiska.spr.y - 4, '🔥', { size: 10, rise: 16, dur: 3000 });
    }
    function draw(dt) {
      ctx.fillStyle = '#7fbf5a'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#6aa84a'; for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 12, H);
      // the pile of chopped wood
      for (let i = 0; i < logs * 2; i++) { const px = 30 + (i % 4) * 10, py = 120 - Math.floor(i / 4) * 8; ctx.fillStyle = '#9a6a3c'; ctx.fillRect(px, py, 9, 7); ctx.fillStyle = '#e3c493'; ctx.fillRect(px, py, 9, 2); }
      // chopping block
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(95, 100, 50, 26); ctx.fillStyle = '#c79a5e'; ctx.fillRect(95, 100, 50, 5);
      if (logs < 3 || split) {
        ctx.fillStyle = '#9a6a3c';
        if (!split) { ctx.fillRect(108, 70, 24, 30); ctx.fillStyle = '#e3c493'; ctx.fillRect(108, 70, 24, 5); }
        else { ctx.fillRect(98, 76, 14, 24); ctx.fillRect(128, 76, 14, 24); ctx.fillStyle = '#e3c493'; ctx.fillRect(98, 76, 14, 4); ctx.fillRect(128, 76, 14, 4); }
      }
      // axe: up, or coming down
      const a = swing ? 0.45 : 1.35, cx = 178, cy = 118;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = '#9a6a3c'; ctx.fillRect(-60, -3, 64, 6);
      ctx.fillStyle = '#c9ccd1'; ctx.fillRect(-66, -14, 12, 24); ctx.fillStyle = '#8e9299'; ctx.fillRect(-66, -14, 3, 24);
      ctx.restore();
      chips = chips.filter(c => (c.t += dt) < 0.8);
      chips.forEach(c => { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; ctx.fillStyle = '#c79a5e'; ctx.fillRect(c.x, c.y, 3, 3); });
      ctx.fillStyle = 'rgba(43,29,22,.75)'; ctx.fillRect(6, 6, 74, 18); ctx.fillStyle = '#fff'; ctx.font = '600 12px Fredoka, sans-serif'; ctx.fillText(`🪵 ${logs} van 3`, 10, 19);
    }
    let last = 0;
    function step(ts) { if (!cv.isConnected) { after && after(); return; } const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; draw(dt); raf = requestAnimationFrame(step); }
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(); });
    const key = (e) => { if ((e.key === ' ' || e.key === 'Enter') && cv.isConnected) { e.preventDefault(); hit(); } else if (!cv.isConnected) document.removeEventListener('keydown', key); };
    document.addEventListener('keydown', key);
    raf = requestAnimationFrame(step);
  }

  /* ---------- Lucia, Lenny's little sister ----------
     She sings and dances at home (see addHome), and she runs over to cheer
     when Lenny earns something: the bell, the golden bike, the cube. */
  let lucia = null;
  function luciaAnims(scene) {
    anim4(scene, 'lucia', LQ.Sprites.luciaSheet);
    if (!scene.anims.exists('lucia-run')) scene.anims.create({ key: 'lucia-run', frames: [0, 1].map(n => ({ key: 'lucia', frame: n })), frameRate: 8, repeat: -1 });
    if (!scene.anims.exists('lucia-jump')) scene.anims.create({ key: 'lucia-jump', frames: [2, 3].map(n => ({ key: 'lucia', frame: n })), frameRate: 5, repeat: -1 });
    if (!scene.anims.exists('lucia-idle')) scene.anims.create({ key: 'lucia-idle', frames: [0, 0, 0, 3].map(n => ({ key: 'lucia', frame: n })), frameRate: 2, repeat: -1 });
  }
  /* Lucia lives at home now (30 Oct 2026): she sings and dances next to her
     karaoke machine, beside the house. Tapping her opens a short chat with a
     high five. Tapping the machine makes Lenny sing and dance with her, and
     the music switches to her disco song (no panel, no game). */
  let karaokeSpr = null, danceT = null;
  function addHome(scene, map) {
    luciaAnims(scene);
    if (!scene.anims.exists('lucia-dance')) scene.anims.create({ key: 'lucia-dance', frames: [2, 0, 3, 1].map(n => ({ key: 'lucia', frame: n })), frameRate: 4, repeat: -1 });
    if (!scene.textures.exists('karaoke')) { const t = scene.textures.addCanvas('karaoke', LQ.Sprites.karaoke()); t.add(0, 0, 0, 0, 20, 24); t.add(1, 0, 20, 0, 20, 24); }
    if (!scene.anims.exists('karaoke-blink')) scene.anims.create({ key: 'karaoke-blink', frames: [0, 1].map(n => ({ key: 'karaoke', frame: n })), frameRate: 3, repeat: -1 });
    const h = map.home, ky = (h.y1 + 1) * TS - 2, kx = (h.x0 - 3) * TS + 2;
    karaokeSpr = scene.add.sprite(kx, ky, 'karaoke', 0).setOrigin(0.5, 1).setDepth(ky).play('karaoke-blink');
    const lx = kx - 18, ly = ky + 2;
    const spr = scene.add.sprite(lx, ly, 'lucia', 0).setOrigin(0.5, 1).setDepth(ly).play('lucia-dance');
    lucia = { spr, scene, home: { x: lx, y: ly }, busy: false };
    // she sways while she dances, and little notes float up from the machine
    const sway = scene.time.addEvent({ delay: 500, loop: true, callback: () => {
      if (!spr.visible) return;
      spr.setFlipX(!spr.flipX);
      if (Math.random() < 0.45) floatUp(scene, kx + (Math.random() * 10 - 5), ky - 22, Math.random() < 0.5 ? '🎵' : '🎶', { size: 6, rise: 14, dur: 1200, drift: Math.random() * 8 - 4 });
    } });
    scene.events.once('shutdown', () => { lucia = null; karaokeSpr = null; sway.remove(); stopDance(true); });
    return addJaques(scene, map).concat([
      { kind: 'lucia', x: lx, y: ly - 2, label: '💜 Lucia', open: () => luciaChat() },
      { kind: 'karaoke', x: kx, y: ky - 2, label: '🎤 Zing en dans met Lucia', open: () => startDance() }
    ]);
  }
  const LUCIA_HI = ['Hoi Len! Ik oefen een nieuw liedje. Welke school vond jij het leukst?', 'Len! Als jij naar de middelbare gaat, mag ik dan je oude fietsbel? 😄', 'Hoi grote broer! Wist je dat een giraf maar 7 nekwervels heeft? Net als wij!'];
  function luciaChat() {
    const C = LQ.Challenges, h = LQ.h, n = visits();
    const body = LQ.UI.openPanel('Lucia');
    const line = n >= 1 && Math.random() < 0.5 ? `Je hebt al ${n} ${n === 1 ? 'school' : 'scholen'} bekeken! Goed bezig, grote broer! 💜` : LUCIA_HI[Math.floor(Math.random() * LUCIA_HI.length)];
    C.screen(body, [luciaFace(C.say(line, 'Lucia')), C.row([C.next('🙌 High five!', () => { LQ.UI.closePanel(); luciaHop(); }), h('button', { class: 'btn', onclick: () => LQ.UI.closePanel() }, 'Doei Lucia! 👋')])]);
  }
  function luciaHop() {
    if (!lucia || !lucia.spr.scene) return;
    const s = lucia.scene, spr = lucia.spr, y = lucia.home.y;
    beep([659, 784, 1046], 'triangle', 0.05, 0.1);
    s.tweens.add({ targets: spr, y: y - 6, yoyo: true, repeat: 2, duration: 180, onComplete: () => spr.setY(y) });
    ['✋', '💜'].forEach((c, i) => floatUp(s, spr.x + 4 + i * 6, y - 20, c, { size: 8, rise: 18, delay: i * 200 }));
  }
  function luciaFace(el) {
    try { const f = document.createElement('canvas'); f.width = 20; f.height = 14; f.getContext('2d').drawImage(LQ.Sprites.luciaSheet(), 0, 0, 20, 14, 0, 0, 20, 14); f.className = 'mami-face'; const w = el.querySelector('.who'); if (w) w.prepend(f); el.classList.add('fam-say'); } catch (e) {}
    return el;
  }
  function needSound() { if (!G().state.sound) LQ.UI.toast('Zet het geluid aan 🔊, dan hoor je de dansmuziek!'); }

  /* ---------- singing and dancing: just the animation, the music turns into disco ---------- */
  let dance = null;
  function startDance() {
    const s = G().scene, pl = G().player; if (!s || !pl || !lucia) return;
    stopDance(true);
    LQ.Music.override('disco');
    lucia.spr.anims.timeScale = 2;
    const t0 = Date.now(), x0 = pl.spr.x, y0 = pl.spr.y;
    dance = { x0, y0, ev: s.time.addEvent({ delay: 250, loop: true, callback: () => {
      const p = G().player; if (!p) return stopDance();
      if (p.moving || Math.hypot(p.spr.x - x0, p.spr.y - y0) > 6 || Date.now() - t0 > 24000) return stopDance();
      dance.k = (dance.k || 0) + 1;
      p.spr.setScale(1, dance.k % 2 ? 0.9 : 1.05);
      if (dance.k % 2 === 0) p.spr.setFlipX(!p.spr.flipX);
      if (dance.k % 3 === 0) floatUp(s, p.spr.x + (Math.random() * 16 - 8), p.spr.y - 22, ['🎵', '🎤', '🎶', '✨'][dance.k % 4], { size: 7, rise: 16, dur: 1000 });
      if (dance.k % 4 === 2 && lucia && lucia.spr.scene) floatUp(s, lucia.spr.x + (Math.random() * 10 - 5), lucia.spr.y - 22, ['🎤', '🎶', '💜'][dance.k % 3], { size: 7, rise: 16, dur: 1000 });
    } }) };
    if (G().state.sound) LQ.UI.toast('🎤 Lenny en Lucia zingen en dansen! Loop weg om te stoppen.'); else needSound();
    beep([523, 659, 784], 'triangle', 0.05, 0.08);
  }
  function stopDance(quiet) {
    if (!dance) return;
    try { dance.ev.remove(); } catch (e) {}
    const p = G().player; if (p && p.spr && p.spr.scene) { p.spr.setScale(1); p.spr.setFlipX(false); }
    if (lucia && lucia.spr.scene) lucia.spr.anims.timeScale = 1;
    dance = null;
    LQ.Music.override(null);
    if (!quiet) LQ.UI.toast('Wat een dansje! 💜 Lucia: "Nog een keer?"');
  }


  /* ---------- Jaques, a very hidden easter egg (30 Oct 2026) ----------
     He sits behind the bush furthest to the top right of the map. To find
     him: ride 3 circles around the house on the bike, then 1 circle on foot,
     one right after the other. Then tap that bush and he appears. */
  const LAP_R = 14 * TS;         // a circle counts within 14 tiles of the house
  const lap = { acc: 0, last: null, mode: null, seq: '' };
  function trackLaps(scene) {
    const map = G().map, pl = G().player; if (!map || !pl || G().inside) return;
    const h = map.home, cx = (h.x0 + h.x1 + 1) / 2 * TS, cy = (h.y0 + h.y1 + 1) / 2 * TS;
    const dx = pl.spr.x - cx, dy = pl.spr.y - cy, mode = G().state.mode === 'bike' ? 'b' : 'f';
    if (Math.hypot(dx, dy) > LAP_R) { lap.acc = 0; lap.last = null; lap.seq = ''; return; }   // went away: start over
    if (lap.mode !== mode) { lap.acc = 0; lap.mode = mode; }                                     // changed bike/foot: this circle starts over
    const a = Math.atan2(dy, dx);
    if (lap.last != null) { let d = a - lap.last; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; lap.acc += d; }
    lap.last = a;
    if (Math.abs(lap.acc) >= 2 * Math.PI - 0.05) {
      lap.acc = 0; lap.seq = (lap.seq + mode).slice(-4);
      floatUp(scene, pl.spr.x, pl.spr.y - 22, '✨', { size: 5, rise: 8, dur: 700 });
      if (lap.seq === 'bbbf' && !ex().jaquesOpen) {
        ex().jaquesOpen = true; G().save();
        if (jaques) jaques.target.hidden = false;
        beep([392, 523, 659, 523, 784], 'triangle', 0.05, 0.12);
        LQ.UI.toast('🌿 Ritsel, ritsel... Helemaal rechtsboven op de kaart, in de verste struik, verstopt zich iemand!');
      }
    }
  }
  let jaques = null;
  function findBush(map) {
    const { W, H, objects, walk, T } = map, idx = (x, y) => y * W + x;
    // which tiles can Lenny reach from home?
    const seen = new Uint8Array(W * H), q = [idx(map.home.door.x, map.home.door.y)]; seen[q[0]] = 1;
    for (let k = 0; k < q.length; k++) { const i = q[k], x = i % W, y = (i / W) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx >= W || ny >= H) return; const j = idx(nx, ny); if (!seen[j] && walk[j]) { seen[j] = 1; q.push(j); } }); }
    let best = null;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (objects[idx(x, y)] !== T.BUSH) continue;
      const n = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([a, b]) => ({ x: x + a, y: y + b })).find(p => p.x >= 0 && p.y >= 0 && p.x < W && p.y < H && seen[idx(p.x, p.y)]);
      if (!n) continue;
      const score = x - y;       // furthest to the top right
      if (!best || score > best.score) best = { x, y, n, score };
    }
    return best;
  }
  function addJaques(scene, map) {
    const b = findBush(map); if (!b) return [];
    if (!scene.textures.exists('jaques')) { const t = scene.textures.addCanvas('jaques', LQ.Sprites.jaquesSheet()); t.add(0, 0, 0, 0, 20, 24); t.add(1, 0, 20, 0, 20, 24); }
    if (!scene.anims.exists('jaques-tremble')) scene.anims.create({ key: 'jaques-tremble', frames: [0, 1].map(n => ({ key: 'jaques', frame: n })), frameRate: 14, repeat: -1 });
    // he sits tucked in right behind the bush (a copy of the bush is drawn in
    // front of him, so it half covers him); invisible until he is found
    const jx = b.x * TS + 15, jy = b.y * TS + 15;
    const spr = scene.add.sprite(jx, jy, 'jaques', 0).setOrigin(0.5, 1).setDepth(jy).play('jaques-tremble').setVisible(!!ex().jaquesFound);
    const front = scene.add.image(b.x * TS + 8, b.y * TS + 16, 'tiles', map.T.BUSH).setOrigin(0.5, 1).setDepth(jy + 1);
    const target = { kind: 'bush', x: b.n.x * TS + 8, y: b.n.y * TS + 12, label: ex().jaquesFound ? '📱 Jaques' : '🌿 Struik', hidden: !ex().jaquesOpen, open: () => openBush() };
    jaques = { spr, scene, target, bush: b, front, popping: false };
    // he trembles: the whole body shakes a pixel left/right, up/down, many times a second
    const shake = scene.time.addEvent({ delay: 55, loop: true, callback: () => {
      if (!spr.visible || (jaques && jaques.popping)) return;
      spr.setPosition(jx + Math.round(Math.random() * 2 - 1), jy + (Math.random() < 0.3 ? -1 : 0));
    } });
    scene.events.once('shutdown', () => shake.remove());
    scene.events.once('shutdown', () => { jaques = null; });
    return [target];
  }
  const JAQUES_SAYS = ['O! Hoi Lenny... Ik zat hier even rustig op mijn telefoon. Niet verder vertellen, hè? 🤫', 'Hé Lenny! Goed verstopt, toch? Hoe heb je me gevonden?', 'Ssst... ik lees even het nieuws. Welke school vond jij het leukst?'];
  function openBush() {
    if (!jaques) return;
    if (!ex().jaquesOpen) return;                  // just a bush, nothing happens
    const s = jaques.scene, spr = jaques.spr;
    if (!spr.visible) {
      jaques.popping = true;
      spr.setVisible(true).setAlpha(0).setY(spr.y + 6);
      s.tweens.add({ targets: spr, alpha: 1, y: spr.y - 6, duration: 600, ease: 'Back.out', onComplete: () => { if (jaques) jaques.popping = false; } });
      s.tweens.add({ targets: jaques.front, angle: { from: -8, to: 8 }, yoyo: true, repeat: 3, duration: 90, onComplete: () => jaques && jaques.front.setAngle(0) });
      ['🌿', '🍃', '🌿'].forEach((c, i) => floatUp(s, jaques.bush.x * TS + 2 + i * 6, jaques.bush.y * TS + 6, c, { size: 7, rise: 14, delay: i * 120 }));
      ex().jaquesFound = true; G().save();
      jaques.target.label = '📱 Jaques'; if (G().scene) G().scene.nearT = undefined;
      beep([523, 440, 659], 'triangle', 0.05, 0.12);
    }
    LQ.UI.toast('Jaques: "' + JAQUES_SAYS[Math.floor(Math.random() * JAQUES_SAYS.length)] + '"');
    return;
  }

  /* ---------- Kit (and Fifi) walk along ---------- */
  const trail = [];
  // the cats that can follow Lenny, with how far behind they walk (in trail steps)
  function followers() {
    const k = LQ.Schools.kitRef, list = [];
    if (k) list.push({ ref: k, on: !!G().state.kitFollow, gap: 7 });
    if (fifi) list.push({ ref: fifi, on: !!G().state.fifiFollow, gap: G().state.kitFollow ? 13 : 7 });
    return list;
  }
  function followChanged() {
    const sc = G().scene; if (!sc) return;
    followers().forEach(({ ref, on }) => {
      if (on || ref.spr.x === ref.home.x && ref.spr.y === ref.home.y) return;
      catAnim(sc, ref.spr, true, false); ref.spr.setFlipX(ref.home.x > ref.spr.x);
      const d = Math.hypot(ref.home.x - ref.spr.x, ref.home.y - ref.spr.y);
      if (d > 300) { ref.spr.setPosition(ref.home.x, ref.home.y); syncCat(ref); catAnim(sc, ref.spr, false); ref.spr.setFlipX(false); return; }
      sc.tweens.add({ targets: ref.spr, x: ref.home.x, y: ref.home.y, duration: 500 + d * 4, ease: 'Sine.inOut', onUpdate: () => syncCat(ref), onComplete: () => { catAnim(sc, ref.spr, false); ref.spr.setFlipX(false); } });
    });
  }
  function syncCat(ref) { ref.target.x = ref.spr.x; ref.target.y = ref.spr.y - 2; ref.spr.setDepth(ref.spr.y); }
  function tickFollowers(scene, delta) {
    const pl = G().player; if (!pl || G().scene !== scene) return;
    const list = followers().filter(f => f.on && f.ref.spr.scene === scene);
    followers().forEach(f => { f.ref.target.hidden = !!(f.on && pl.moving); });
    if (!list.length) return;
    const px = pl.spr.x, py = pl.spr.y, last = trail[trail.length - 1];
    if (!last || Math.hypot(px - last.x, py - last.y) > 3) { trail.push({ x: px, y: py }); if (trail.length > 80) trail.shift(); }
    list.forEach(({ ref, gap }) => {
      const g = G().state.mode === 'bike' ? gap + 2 : gap;
      const goal = trail.length > g ? trail[trail.length - 1 - g] : null;
      if (!goal) return;
      const k = ref, dx = goal.x - k.spr.x, dy = goal.y - k.spr.y, d = Math.hypot(dx, dy);
      if (d > 260) { k.spr.setPosition(goal.x, goal.y); syncCat(k); return; }
      const sp = (G().state.mode === 'bike' ? 140 : 75) * Math.min(delta, 50) / 1000 * (d > 40 ? 1.4 : 1);
      // No flicker: while Lenny moves, the cat keeps walking. When he stops, the
      // cat stands still (side view) and only sits down after a moment.
      const now = scene.time.now;
      if (pl.moving || d > 3) k.lastMove = now;
      const still = now - (k.lastMove || 0);
      catAnim(scene, k.spr, still < 150 ? true : still < 1800 ? 'stand' : false, G().state.mode === 'bike' || d > 40);
      if (still >= 1800 && !k.satFront) { k.spr.setFlipX(false); k.satFront = true; } else if (still < 1800) k.satFront = false;
      if (d > 1) { k.spr.x += dx / d * Math.min(sp, d); k.spr.y += dy / d * Math.min(sp, d); if (Math.abs(dx) > 0.5) k.spr.setFlipX(dx > 0); }
      syncCat(k);
    });
  }

  /* ---------- Kit walks along (an option in Kit's chat) ---------- */
  function kitChanged() { followChanged(); }

  function tickKit(scene, delta) { tickFollowers(scene, delta); }

  /* ---------- hook into the scenes ---------- */
  function attach(scene) {
    if (scene._lqExtras) return; scene._lqExtras = true;
    let acc = 0;
    scene.events.on('update', (t, d) => {
      tickIdle(scene, d);
      tickKit(scene, d);
      if (scene.scene.key === 'world') trackLaps(scene);
      const pl = G().player; // the cookie floats along with Lenny
      if (snackIcon && pl && snackIcon.scene === scene) snackIcon.setPosition(pl.spr.x + 7, pl.spr.y - 22 + Math.sin(t / 250));
      acc += d; if (acc > 300 && scene.scene.key === 'world') { acc = 0; checkAuto(scene); }
    });
    scene.events.once('shutdown', () => { scene._lqExtras = false; if (idleCube && idleCube.scene === scene) idleCube = null; });
    if (scene.scene.key === 'world') {
      paintBike.cur = null; paintBike(scene);
      // following Kit starts next to Lenny when the game loads
      const pl = G().player;
      followers().forEach(({ ref, on }, i) => { if (on && pl) { ref.spr.setPosition(pl.spr.x - 14 - i * 12, pl.spr.y); syncCat(ref); } });
      scene.input.keyboard.on('keydown-B', () => { if (!LQ.UI.isOpen()) ring(); });
      scene.input.on('pointerup', (p) => {
        const pl = G().player; if (!pl || LQ.UI.isOpen() || G().inside) return;
        if (Math.abs(p.worldX - pl.spr.x) < 10 && p.worldY < pl.spr.y + 2 && p.worldY > pl.spr.y - 24) ring();
      });
    }
  }

  function init() { initCube(); }

  return { init, attach, addLandmark, addHome, poke, checkRewards, ring, drawCube, visits, kitChanged, followChanged, luciaFace };
})();
