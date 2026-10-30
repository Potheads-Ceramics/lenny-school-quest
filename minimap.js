/* =====================================================================
   UI / MINIMAP — the small map in the top-right corner, the big
   full-screen map (tap the mini-map or press M) and the
   "Show me the way" dotted trail in the world.

   Everything is drawn from the same tile grid as the world (map.js)
   and the school list in data/schools.json, so adding or removing a
   school updates both maps by itself. No art files.

   School icon status (same on both maps):
     grey + "?"   = not visited yet
     in colour    = visited
     gold star    = all challenges done
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Minimap = (function () {
  const TS = 16;
  const SIZES = { normal: 168, small: 104 };
  const COL = {
    grass: '#7cbf5a', park: '#5e9f45', road: '#f3e6c4', street: '#d6d0c4', roof: '#c0806a', bike: '#d0503a', bridge: '#b98a55', water: '#4f9fd6',
    house: '#9fcf7c', home: '#d3192c', grey: '#9a948a', ink: '#2b1d16', gold: '#f5c518', lenny: '#2f6fd6'
  };

  let G, map, base = null, open = false, sel = null, raf = 0, last = 0;
  let trail = null; // { id, gfx, flag, lastTile }
  const $ = (id) => document.getElementById(id);

  /* ---------------- status of a school ---------------- */
  function status(s) {
    const v = G.state.visits[s.id];
    if (!v) return 'new';
    if (s.interior && s.interior.stations) {
      const tot = Object.keys(s.interior.stations).length;
      const done = v.stations ? Object.keys(v.stations).filter(k => s.interior.stations[k]).length : 0;
      if (tot && done >= tot) return 'star';
    } else if (v.done) return 'star';
    return 'seen';
  }

  /* ---------------- the base picture: 1 pixel per tile ---------------- */
  function buildBase() {
    const c = document.createElement('canvas');
    c.width = map.W; c.height = map.H;
    const g = c.getContext('2d'), img = g.createImageData(map.W, map.H);
    const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    const P = Object.fromEntries(Object.entries(COL).map(([k, v]) => [k, rgb(v)]));
    const T = map.T;
    for (let i = 0; i < map.W * map.H; i++) {
      const k = map.kind[i], o = map.objects[i];
      let c3 = P.grass;
      if (k === 2) c3 = P.water;
      else if (k === 4) c3 = P.bridge;
      else if (map.bike && map.bike[i]) c3 = P.bike; // the family bike routes
      else if (k === 1) c3 = map.ground[i] === T.STREET ? P.street : P.road;
      else if (o === T.TREE || o === T.PINE || o === T.BUSH) c3 = P.park;
      else if ((o >= T.HOUSE_A && o <= T.HOUSE_B + 3) || (T.ROW_A && o >= T.ROW_A && o <= T.ROW_C)) c3 = P.roof;
      img.data.set([c3[0], c3[1], c3[2], 255], i * 4);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* ---------------- icons ---------------- */
  function schoolIcon(g, x, y, r, s, st, picked) {
    const col = st === 'new' ? COL.grey : s.roof || '#c0503a';
    g.lineWidth = Math.max(1, r / 4);
    g.strokeStyle = COL.ink;
    // body
    g.fillStyle = st === 'new' ? '#d8d2c6' : '#f6ead0';
    g.fillRect(x - r * 0.8, y - r * 0.2, r * 1.6, r * 1.1);
    g.strokeRect(x - r * 0.8, y - r * 0.2, r * 1.6, r * 1.1);
    // roof
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - r, y - r * 0.2); g.lineTo(x, y - r * 1.1); g.lineTo(x + r, y - r * 0.2); g.closePath(); g.fill(); g.stroke();
    if (st === 'new') {
      g.fillStyle = COL.ink; g.font = `bold ${Math.round(r * 1.1)}px "Fredoka", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', x, y + r * 0.38);
    } else {
      g.fillStyle = col; g.fillRect(x - r * 0.22, y + r * 0.25, r * 0.44, r * 0.65); // door
    }
    if (st === 'star') star(g, x + r * 0.85, y - r * 0.95, r * 0.7);
    if (picked) { g.strokeStyle = COL.gold; g.lineWidth = Math.max(2, r / 3); g.strokeRect(x - r * 1.3, y - r * 1.5, r * 2.6, r * 2.8); }
  }
  function star(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fillStyle = COL.gold; g.fill(); g.strokeStyle = COL.ink; g.lineWidth = Math.max(1, r / 4); g.stroke();
  }
  function homeIcon(g, x, y, r) {
    g.lineWidth = Math.max(1, r / 4); g.strokeStyle = COL.ink;
    g.fillStyle = '#fff8e8'; g.fillRect(x - r * 0.7, y - r * 0.2, r * 1.4, r * 1.0); g.strokeRect(x - r * 0.7, y - r * 0.2, r * 1.4, r * 1.0);
    g.fillStyle = COL.home; g.beginPath(); g.moveTo(x - r, y - r * 0.15); g.lineTo(x, y - r * 1.05); g.lineTo(x + r, y - r * 0.15); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = COL.ink; g.fillRect(x - r * 0.18, y + r * 0.3, r * 0.36, r * 0.5);
  }
  function lennyIcon(g, x, y, r, dir) {
    const a = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[dir] || Math.PI / 2;
    // arrow for the way he faces
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(r * 2.1, 0); g.lineTo(r * 0.7, -r * 0.9); g.lineTo(r * 0.7, r * 0.9); g.closePath();
    g.fillStyle = COL.lenny; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, r / 3); g.stroke();
    g.restore();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = COL.lenny; g.fill();
    g.lineWidth = Math.max(1.5, r / 2.5); g.strokeStyle = '#fff'; g.stroke();
  }

  /* ---------------- draw one map (mini or big) ---------------- */
  function draw(cv, opts) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = cv.clientWidth, cssH = cv.clientHeight;
    if (!cssW || !cssH) return null;
    if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    const k = Math.min(cssW / map.W, cssH / map.H), ox = (cssW - map.W * k) / 2, oy = (cssH - map.H * k) / 2;
    g.fillStyle = COL.water; g.fillRect(0, 0, cssW, cssH);
    g.drawImage(base, ox, oy, map.W * k, map.H * k);
    const P = (tx, ty) => ({ x: ox + (tx + 0.5) * k, y: oy + (ty + 0.5) * k });
    const r = opts.big ? Math.max(7, Math.min(12, k * 2.6)) : Math.max(4, k * 2.4);
    const hits = [];

    // trail on the big map
    if (opts.big && trail && trail.path) {
      g.fillStyle = COL.gold;
      trail.path.forEach((p, i) => { if (i % 3 === 0) { const q = P(p.x, p.y); g.beginPath(); g.arc(q.x, q.y, Math.max(1.5, k * 0.5), 0, Math.PI * 2); g.fill(); } });
    }
    // family landmarks (big map: icon + name; small map: a little dot)
    const LMD = Object.fromEntries((G.data.landmarks || []).map(l => [l.id, l]));
    const LICON = { family: '🏡', shed: '🌻', playground: '🎡', zoo: '🦒', park: '🌳', roundabout: '🔄', streetsign: '🪧', primary: '🎒', football: '⚽' };
    const lmPts = (map.landmarks || []).filter(l => LMD[l.id]).map(l => ({ l, p: P((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2) }));
    lmPts.forEach(({ l, p }) => {
      if (opts.big) { g.font = `${Math.round(r * 1.5)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LICON[l.kind] || '📍', p.x, p.y); }
      else if (l.kind === 'family' || l.kind === 'shed' || l.kind === 'primary' || l.kind === 'football') { g.beginPath(); g.arc(p.x, p.y, Math.max(2, r * 0.45), 0, Math.PI * 2); g.fillStyle = '#ff7aa2'; g.fill(); g.strokeStyle = COL.ink; g.lineWidth = 1; g.stroke(); }
    });
    const hd = map.home.door, hp = P(hd.x, hd.y - 2);
    homeIcon(g, hp.x, hp.y, r);
    const byId = Object.fromEntries(G.data.schools.map(s => [s.id, s]));
    map.buildings.forEach(b => {
      const s = byId[b.id]; if (!s) return;
      const p = P(b.door.x, b.door.y - 2), st = status(s);
      schoolIcon(g, p.x, p.y, r, s, st, opts.big && sel === s.id);
      hits.push({ id: s.id, x: p.x, y: p.y, r: r * 1.6 });
    });
    // labels (big map only)
    const label = (text, x, y, strong) => {
      g.font = `${strong ? 700 : 600} ${strong ? 13 : 11}px "Fredoka", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'top';
      const w = g.measureText(text).width + 8;
      g.fillStyle = strong ? COL.gold : 'rgba(246,234,208,.92)'; g.fillRect(x - w / 2, y, w, strong ? 17 : 15);
      g.strokeStyle = COL.ink; g.lineWidth = 1; g.strokeRect(x - w / 2 + .5, y + .5, w - 1, (strong ? 17 : 15) - 1);
      g.fillStyle = COL.ink; g.fillText(text, x, y + 2);
    };
    if (opts.big) {
      const roomy = cssW >= 420;
      label('Thuis', hp.x, hp.y + r + 2);
      if (roomy) lmPts.forEach(({ l, p }) => { if (l.kind !== 'roundabout' && l.kind !== 'streetsign') label(LMD[l.id].label, p.x, p.y + r + 2); });
      hits.forEach(h => { const s = byId[h.id]; if (roomy || sel === h.id) label(s.short, h.x, h.y + r + 2, sel === h.id); });
    }
    // where Lenny is travelling to (a spot he tapped on the big map)
    const pl = G.player;
    if (dest && pl && pl.path) {
      const p = P(dest.x, dest.y), pr = opts.big ? 7 : 4;
      g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y - pr * 1.6, pr, Math.PI * 0.8, Math.PI * 2.2); g.closePath();
      g.fillStyle = '#e8475f'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = opts.big ? 2 : 1; g.stroke();
      g.beginPath(); g.arc(p.x, p.y - pr * 1.6, pr * 0.4, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
      if (opts.big) label('Hierheen', p.x, p.y - pr * 3.2 - 2, true);
    } else if (dest && pl && !pl.path) dest = null;
    // Lenny
    if (pl) {
      const t = pl.tile(), p = P(t.x, t.y);
      lennyIcon(g, p.x, p.y, opts.big ? Math.max(5, r * 0.6) : Math.max(3, r * 0.6), pl.dir);
      if (opts.big) label('Hier ben jij', p.x, p.y - r * 2.6 - 4, true);
    }
    return { hits, xf: { k, ox, oy } };
  }

  /* ---------------- the small map ---------------- */
  // Two separate controls: size (big / small) and minimize (fold into a "Map" tab).
  function size() { const z = G.state.minimap; return z === 'normal' || z === 'small' ? z : (window.innerWidth < 720 ? 'small' : 'normal'); }
  function minimized() { return !!G.state.minimapMin || G.state.minimap === 'hidden'; }
  function layout() {
    const box = $('minimap'), btn = $('mm-show');
    const top = Math.round($('hud').getBoundingClientRect().height) + 8;
    const sz = size(), min = minimized(), worldOn = !G.inside && !!G.player;
    box.style.top = btn.style.top = top + 'px';
    document.documentElement.style.setProperty('--hud-h', (top - 8) + 'px');
    document.body.classList.toggle('mm-on', worldOn && !min);
    box.hidden = !worldOn || min;
    btn.hidden = !worldOn || !min;
    if (!min) {
      const w = SIZES[sz], cv = $('mm-canvas');
      cv.style.width = w + 'px'; cv.style.height = Math.round(w * map.H / map.W) + 'px';
      box.classList.toggle('small', sz === 'small');
      $('mm-size').textContent = sz === 'small' ? '⊕' : '⊖';
      $('mm-size').setAttribute('aria-label', sz === 'small' ? 'Maak de kaart groter' : 'Maak de kaart kleiner');
      $('mm-size').title = sz === 'small' ? 'Groter' : 'Kleiner';
    }
  }
  function toggleSize() { G.state.minimap = size() === 'normal' ? 'small' : 'normal'; G.save(); layout(); drawMini(); }
  function setMin(on) {
    G.state.minimapMin = on; if (G.state.minimap === 'hidden') G.state.minimap = null;
    G.save(); layout(); drawMini();
    (on ? $('mm-show') : $('mm-min')).focus();
  }
  function drawMini() { if (!$('minimap').hidden) draw($('mm-canvas'), { big: false }); }

  /* ---------------- the big map ---------------- */
  function openBig() {
    if (open || G.inside || LQ.UI.isOpen()) return;
    open = true;
    if (G.player && !dest) G.player.stop(); // a trip picked on the map just waits while the map is open
    $('bigmap').hidden = false;
    $('bm-mode').textContent = G.state.mode === 'bike' ? '🚲 Met de fiets' : '🚶 Lopend';
    list();
    requestAnimationFrame(drawBig);
    $('bm-close').focus();
  }
  function closeBig() {
    if (!open) return;
    open = false; $('bigmap').hidden = true;
    if (G.activeScene && G.activeScene.input) G.activeScene.input.keyboard.resetKeys();
  }
  let bigHits = [], bigXf = null, dest = null;
  function drawBig() { if (!open) return; const res = draw($('bm-canvas'), { big: true }); bigHits = res ? res.hits : []; bigXf = res ? res.xf : null; }
  /* Tap anywhere on the big map: Lenny walks or rides there by himself (30 Oct 2026). */
  function travelTo(x, y) {
    if (!bigXf || !G.player) return;
    const tx = Math.floor((x - bigXf.ox) / bigXf.k), ty = Math.floor((y - bigXf.oy) / bigXf.k);
    if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) return;
    clearTrail();
    if (G.player.goTo(tx, ty)) {
      const last = G.player.path[G.player.path.length - 1];
      dest = { x: last.x, y: last.y };
      G.showMarker(last.x, last.y);
      closeBig();
      LQ.UI.toast(G.state.mode === 'bike' ? '🚲 Op weg! Tik op de kaart of loop zelf om te stoppen.' : '🚶 Op weg! Tik op de kaart of loop zelf om te stoppen.');
    } else LQ.UI.toast('Daar kun je niet komen. Kies een straat of een pad! 🗺️');
  }

  // Which family bike route passes this school? ("🎡 Plaswijck-route")
  function routeOf(id) {
    const rs = (G.data.bikeRoutes && G.data.bikeRoutes.routes) || [];
    const r = rs.find(r => !r.parent && r.stops.includes(id)) || rs.find(r => r.stops.includes(id));
    if (!r) return '';
    const top = r.parent ? rs.find(x => x.id === r.parent) : r;
    return `${top.icon} ${top.name}`;
  }
  function list() {
    const m = G.state.mode, h = LQ.h;
    const rows = G.data.schools.slice().sort((a, b) => a.distanceKm - b.distanceKm).map(s => {
      const st = status(s);
      const badge = st === 'new' ? '?' : st === 'star' ? '★' : '✓';
      return h('li', { class: 'bm-row' + (sel === s.id ? ' on' : ''), 'data-id': s.id }, [
        h('button', { class: 'bm-pick', onclick: () => pick(s.id) }, [
          h('span', { class: 'bm-badge ' + st, style: st === 'new' ? '' : `--c:${s.roof}` }, badge),
          h('span', { class: 'bm-name' }, [h('b', {}, s.short), h('small', {}, `${s.distanceKm} km · ${m === 'bike' ? '🚲 ' + s.bikeMin : '🚶 ' + s.walkMin} min`), routeOf(s.id) ? h('small', { class: 'bm-route' }, routeOf(s.id)) : null])]),
        h('button', { class: 'btn primary bm-go', onclick: () => showWay(s.id) }, 'Wijs me de weg')]);
    });
    const ul = $('bm-list'); ul.innerHTML = ''; rows.forEach(r => ul.appendChild(r));
  }
  function pick(id) {
    sel = id; list(); drawBig();
    const row = document.querySelector(`.bm-row[data-id="${id}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------------- "Show me the way": dotted trail in the world ---------------- */
  function showWay(id) {
    const s = G.data.schools.find(x => x.id === id);
    const b = map.buildings.find(x => x.id === id);
    if (!s || !b) return;
    clearTrail();
    const sc = G.scene;
    trail = { id, gfx: sc.add.graphics().setDepth(2), lastTile: null, door: b.door, path: null };
    trail.flag = sc.add.text(b.door.x * TS + 8, b.door.y * TS - 2, '⬇', { fontSize: '14px', resolution: 6 }).setOrigin(0.5, 1).setDepth(99998);
    sc.tweens.add({ targets: trail.flag, y: trail.flag.y - 5, yoyo: true, repeat: -1, duration: 450, ease: 'Sine.inOut' });
    sel = id;
    closeBig();
    updateTrail(true);
    LQ.UI.toast(`Volg de gouden stippen naar ${s.short}!`);
  }
  function clearTrail() {
    if (!trail) return;
    trail.gfx.destroy(); trail.flag.destroy(); trail = null;
  }
  function updateTrail(force) {
    if (!trail || !G.player) return;
    const t = G.player.tile(), key = t.x + ',' + t.y;
    if (!force && key === trail.lastTile) return;
    trail.lastTile = key;
    const d = trail.door;
    if (Math.abs(t.x - d.x) + Math.abs(t.y - d.y) <= 1) { clearTrail(); return; }
    const path = LQ.Map.findPath(map, t.x, t.y, d.x, d.y);
    trail.path = path;
    const g = trail.gfx; g.clear();
    if (!path) return;
    path.forEach((p, i) => {
      if (i < 2 || i % 2) return;
      const x = p.x * TS + 8, y = p.y * TS + 8;
      g.fillStyle(0x4a2c17, 1); g.fillCircle(x, y, 3.2);
      g.fillStyle(0xf5c518, 1); g.fillCircle(x, y, 2.2);
    });
  }

  /* ---------------- loop + setup ---------------- */
  function tick(time) {
    if (time - last > 100) { // ~10 times a second is plenty for a map
      last = time;
      layout();
      drawMini();
      updateTrail(false);
      if (open) drawBig();
    }
    raf = requestAnimationFrame(tick);
  }

  function init() {
    G = LQ.Game; map = G.map; base = buildBase();
    $('minimap').addEventListener('click', (e) => { if (e.target.closest('.mm-ctl')) return; openBig(); });
    $('mm-size').addEventListener('click', (e) => { e.stopPropagation(); toggleSize(); });
    $('mm-min').addEventListener('click', (e) => { e.stopPropagation(); setMin(true); });
    $('mm-show').addEventListener('click', () => setMin(false));
    $('bm-close').addEventListener('click', closeBig);
    $('minimap').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === $('minimap')) { e.preventDefault(); openBig(); } });
    $('bigmap').addEventListener('click', (e) => { if (e.target === $('bigmap')) closeBig(); });
    $('bm-canvas').addEventListener('click', (e) => {
      const r = $('bm-canvas').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = bigHits.find(h => Math.hypot(h.x - x, h.y - y) <= h.r);
      if (hit) pick(hit.id); else travelTo(x, y);
    });
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (open && (e.key === 'Escape' || e.key === 'm' || e.key === 'M')) { e.preventDefault(); closeBig(); return; }
      if ((e.key === 'm' || e.key === 'M') && !open && !G.inside && !LQ.UI.isOpen()) { e.preventDefault(); openBig(); }
    });
    window.addEventListener('resize', () => { layout(); drawMini(); if (open) drawBig(); });
    layout();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }

  // Called when Lenny walks into a school: the trail is no longer needed there.
  function enteredSchool(id) { if (trail && trail.id === id) clearTrail(); if (open) closeBig(); }

  return { init, isOpen: () => open, openBig, closeBig, showWay, clearTrail, enteredSchool, status };
})();
