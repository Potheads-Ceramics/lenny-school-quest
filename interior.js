/* =====================================================================
   INTERIOR — the inside of a school, as its own Phaser scene.
   The layout comes from data/schools.json (school.interior.rows):
     #  wall         .  hall floor     ,  room floor     :  aula floor
     G  grass        =  exit door      @  where Lenny starts
     T table  B bookshelf  P plant  L lockers  S lab bench  C column
     K bust   O sofa  R stage  X piano  Y goal  N notice board  Q computer desk
     1-9  a person with a challenge (school.interior.stations)
     a-z  something to look at, or a guide (school.interior.info)
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Interior = (function () {
  const TS = 16;
  const NEED = 2; // challenges needed before the school stamp
  const FURN = { T: 8, B: 9, P: 10, L: 11, S: 12, C: 13, K: 14, O: 15, R: 16, X: 17, Y: 18, N: 20, Q: 27 };
  const INFO_SPRITE = { poster: 19, board: 20, sign: 21, case: 22, trophy: 23, window: 24, timetable: 25, screen: 26, shelf: 9 };
  const FLOOR = { '.': 0, '@': 0, ',': 1, ':': 2, 'G': 6, '=': 5 };

  /* ---------- build the tile grid (pure logic) ---------- */
  function build(school) {
    const I = school.interior, rows = I.rows, H = rows.length, W = rows[0].length, N = W * H;
    const ground = new Array(N).fill(0), objects = new Array(N).fill(-1);
    const walk = new Uint8Array(N), kind = new Uint8Array(N);
    const ch = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '#' : rows[y][x];
    const info = I.info || {};
    const isWall = (c) => c === '#' || (info[c] && info[c].wall);
    const stations = [], infos = [], exits = [];
    let spawn = null;
    const neighbourFloor = (x, y) => {
      const count = {};
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const c = ch(x + dx, y + dy); if (c in FLOOR && c !== '=') { const f = FLOOR[c]; count[f] = (count[f] || 0) + 1; } });
      const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      return best ? +best[0] : 1;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = ch(x, y), i = y * W + x;
      if (c === '#') { ground[i] = isWall(ch(x, y + 1)) ? 3 : 4; continue; }
      if (info[c] && info[c].wall) { ground[i] = 4; objects[i] = INFO_SPRITE[info[c].sprite]; infos.push({ key: c, x, y, info: info[c] }); continue; }
      if (c in FLOOR) {
        ground[i] = FLOOR[c]; walk[i] = 1;
        if (c === '@') spawn = { x, y };
        if (c === '=') exits.push({ x, y });
        continue;
      }
      ground[i] = neighbourFloor(x, y);
      if (c === 'Y' && ground[i] !== 6) ground[i] = 6;
      if (FURN[c] != null) { objects[i] = FURN[c]; continue; }
      if (/[1-9]/.test(c) && I.stations[c]) { stations.push({ key: c, x, y, station: I.stations[c] }); continue; }
      if (info[c]) { if (info[c].sprite !== 'npc') objects[i] = INFO_SPRITE[info[c].sprite]; infos.push({ key: c, x, y, info: info[c] }); continue; }
      walk[i] = 1; // unknown letter: treat as floor
    }
    if (!spawn) spawn = exits.length ? { x: exits[0].x, y: exits[0].y - 2 } : { x: 1, y: 1 };
    return { W, H, ground, objects, walk, kind, stations, infos, exits, spawn, rooms: I.rooms || [] };
  }

  /* ---------- progress helpers ---------- */
  function visit(s) { const st = LQ.Game.state; return st.visits[s.id] || null; }
  function stationsDone(s) {
    const v = visit(s); if (!v || !v.stations) return 0;
    return Object.keys(v.stations).filter(k => s.interior.stations[k]).length;
  }
  function stationTotal(s) { return Object.keys(s.interior.stations).length; }

  /* ---------- the scene ---------- */
  class Scene extends Phaser.Scene {
    constructor() { super('interior'); }
    init(data) { this.school = data.school; this.nearT = null; }

    create() {
      const G = LQ.Game, s = this.school, I = s.interior;
      G.activeScene = this; G.inside = s;
      const map = this.map = build(s);

      // tiles
      const tk = 'itiles-' + s.id;
      if (!this.textures.exists(tk)) {
        const tex = this.textures.addCanvas(tk, LQ.Sprites.interiorTiles(I.theme));
        for (let i = 0; i < 32; i++) tex.add(i, 0, (i % 8) * TS, Math.floor(i / 8) * TS, TS, TS);
      }
      const rowsOf = (arr) => { const out = []; for (let y = 0; y < map.H; y++) out.push(arr.slice(y * map.W, (y + 1) * map.W)); return out; };
      const gm = this.make.tilemap({ data: rowsOf(map.ground), tileWidth: TS, tileHeight: TS });
      gm.createLayer(0, gm.addTilesetImage(tk, tk, TS, TS, 0, 0), 0, 0).setDepth(0);
      const om = this.make.tilemap({ data: rowsOf(map.objects), tileWidth: TS, tileHeight: TS });
      om.createLayer(0, om.addTilesetImage(tk, tk, TS, TS, 0, 0), 0, 0).setDepth(1);

      // room name signs
      const font = '"Fredoka", "Trebuchet MS", sans-serif';
      map.rooms.forEach(rm => this.add.text(rm.x * TS, rm.y * TS + 8, rm.label, { fontFamily: font, fontSize: '8px', color: '#2b1d16', backgroundColor: '#f6ead0', padding: { x: 3, y: 1 }, resolution: 6 }).setOrigin(0.5).setDepth(100000));

      // bubbles
      ['new', 'done'].forEach(k => { if (!this.textures.exists('bubble-' + k)) this.textures.addCanvas('bubble-' + k, LQ.Sprites.bubble(k)); });

      this.targets = [];
      this.markers = {};
      // people with challenges
      map.stations.forEach(st => {
        this.person(st.x, st.y, st.station.npc, 'st' + st.key);
        const m = this.add.image(st.x * TS + 8, st.y * TS - 14, 'bubble-new').setDepth(99990);
        this.tweens.add({ targets: m, y: m.y - 3, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
        this.markers[st.key] = m;
        this.targets.push({ kind: 'station', tall: true, key: st.key, tx: st.x, ty: st.y, x: st.x * TS + 8, y: st.y * TS + 8,
          label: () => `${this.isDone(st.key) ? '✓' : '❗'} Praat met ${st.station.npc.name}: ${st.station.title}`,
          open: () => LQ.SchoolGames.openStation(s, st.key, () => this.refresh()) });
      });
      // things to look at, and guides
      map.infos.forEach(it => {
        if (it.info.sprite === 'npc') this.person(it.x, it.y, it.info.npc, 'in' + it.key);
        this.targets.push({ kind: 'info', tall: it.info.sprite === 'npc', key: it.key, tx: it.x, ty: it.y, x: it.x * TS + 8, y: it.y * TS + 8,
          label: () => it.info.sprite === 'npc' ? `💬 Praat met ${it.info.name}` : it.info.link ? `🥽 ${it.info.title}` : `👀 Kijk: ${it.info.title}`,
          open: () => LQ.UI.infoPanel(it.info) });
      });
      // the exit
      if (map.exits.length) {
        const ex = map.exits.reduce((a, e) => a + e.x, 0) / map.exits.length;
        const ey = map.exits[0].y;
        this.targets.push({ kind: 'exit', tx: Math.round(ex), ty: ey, x: ex * TS + 8, y: ey * TS + 4, label: () => '🚪 De school uit', open: () => this.leave() });
      }

      // Lenny (always walking inside: the bike waits outside)
      G.interiorPlayer = this.player = LQ.Player.create(this, map, map.spawn);
      this.player.dir = 'up';

      // camera
      const cam = this.cameras.main;
      cam.setBounds(0, 0, map.W * TS, map.H * TS);
      cam.startFollow(this.player.spr, true, 0.15, 0.15);
      cam.setRoundPixels(true);
      cam.setBackgroundColor(I.theme.wallTop);
      const fit = () => {
        const w = this.scale.width, h = this.scale.height;
        const top = Math.round(document.getElementById('hud').getBoundingClientRect().height);
        cam.setViewport(0, top, w, Math.max(100, h - top));
        cam.setZoom(Math.max(2, Math.min(4, Math.floor(Math.min(w, h - top) / 210))));
      };
      fit(); this.scale.on('resize', fit);
      this.events.once('shutdown', () => this.scale.off('resize', fit));
      cam.fadeIn(300, 0, 0, 0);

      // keyboard
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = this.input.keyboard.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D });
      this.input.keyboard.on('keydown', (ev) => {
        if (LQ.UI.isOpen()) return;
        if (['e', 'E', ' ', 'Enter'].includes(ev.key) && this.nearT) { LQ.Sound.play(); this.nearT.open(); }
      });
      this.input.keyboard.addCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.SPACE]);

      // tap to move
      this.input.on('pointerup', (p) => {
        if (LQ.UI.isOpen()) return;
        if (p.event && p.event.target !== this.game.canvas) return;
        if (p.getDistance && p.getDistance() > 12) return;
        if (LQ.Joy.dragging()) return;
        const tx = Math.floor(p.worldX / TS), ty = Math.floor(p.worldY / TS);
        const hit = this.targets.find(t => t.tx === tx && (t.ty === ty || (t.tall && t.ty - 1 === ty)));
        if (hit) {
          if (this.isNear(hit)) { hit.open(); return; }
          // walk to the tile in front of it (below), so Lenny never ends up behind a wall
          const fx = hit.tx, fy = hit.kind === 'exit' ? hit.ty : hit.ty + 1;
          const ok = map.walk[fy * map.W + fx] ? this.player.goTo(fx, fy, () => hit.open()) : this.player.goTo(hit.tx, hit.ty, () => hit.open());
          if (ok) this.showMarker(hit.tx, hit.ty);
          return;
        }
        if (this.player.goTo(tx, ty)) this.showMarker(tx, ty);
      });

      this.refresh();
      const v = visit(s);
      if (!v || !v.welcomed) {
        LQ.Game.state.visits[s.id] = Object.assign(v || {}, { welcomed: true }); LQ.Game.save();
        const guide = map.infos.find(i => i.info.sprite === 'npc');
        if (guide) setTimeout(() => { if (LQ.Game.inside === s && !LQ.UI.isOpen()) LQ.UI.infoPanel(guide.info); }, 450);
      } else LQ.UI.toast(`Welkom terug bij ${s.short}!`);
      LQ.UI.hud();
    }

    person(x, y, npc, key) {
      const tk = `npc-${this.school.id}-${key}`;
      if (!this.textures.exists(tk)) {
        const tex = this.textures.addCanvas(tk, LQ.Sprites.npcSheet(npc || {}));
        tex.add(0, 0, 0, 0, 16, 24); tex.add(1, 0, 16, 0, 16, 24);
      }
      if (!this.anims.exists(tk)) this.anims.create({ key: tk, frames: [{ key: tk, frame: 0 }, { key: tk, frame: 1 }], frameRate: 2, repeat: -1 });
      const spr = this.add.sprite(x * TS + 8, y * TS + 16, tk, 0).setOrigin(0.5, 1).setDepth(y * TS + 16);
      spr.play({ key: tk, delay: Math.random() * 600 });
      this.add.ellipse(spr.x, spr.y - 1, 10, 3, 0x000000, 0.18).setDepth(y * TS + 15);
      return spr;
    }

    isDone(key) { const v = visit(this.school); return !!(v && v.stations && v.stations[key]); }
    isNear(t) { const p = this.player.spr; return Math.hypot(t.x - p.x, t.y - (p.y - 4)) < 22; }

    refresh() {
      Object.entries(this.markers).forEach(([k, m]) => m.setTexture(this.isDone(k) ? 'bubble-done' : 'bubble-new'));
      this.nearT = undefined; // force the prompt to redraw
    }

    chipText() {
      const s = this.school, n = stationsDone(s), tot = stationTotal(s);
      return `🏫 Opdrachten ${n}/${tot}` + (n < NEED ? ' · zoek de ❗' : n < tot ? ' · of ga naar de deur' : ' · alles klaar!');
    }

    showMarker(tx, ty) {
      if (this.marker) this.marker.destroy();
      this.marker = this.add.image(tx * TS + 8, ty * TS + 4, 'tiles', 24).setDepth(99999);
      this.tweens.add({ targets: this.marker, y: ty * TS - 2, yoyo: true, repeat: -1, duration: 400 });
    }

    update(time, delta) {
      const dt = Math.min(delta, 50) / 1000, k = this.keys;
      if (LQ.UI.isOpen()) { this.player.update(0, null, 'indoor'); return; }
      this.player.update(dt, Object.assign({ up: k.up.isDown || k.w.isDown, down: k.down.isDown || k.s.isDown, left: k.left.isDown || k.a.isDown, right: k.right.isDown || k.d.isDown }, LQ.Joy.vec() || {}), 'indoor');
      if (this.marker && !this.player.path) { this.marker.destroy(); this.marker = null; }
      let best = null, bd = 22;
      const px = this.player.spr.x, py = this.player.spr.y - 4;
      for (const t of this.targets) { const d = Math.hypot(t.x - px, t.y - py); if (d < bd) { bd = d; best = t; } }
      if (best !== this.nearT) {
        this.nearT = best;
        LQ.UI.near(best ? { label: best.label(), open: best.open } : null, this.chipText());
      }
    }

    /* Leaving: ask how the school felt (needs 2 challenges for the stamp). */
    leave() {
      const s = this.school, n = stationsDone(s), tot = stationTotal(s);
      const go = () => this.exitNow();
      if (n === 0) return go();
      if (n < NEED) {
        const body = LQ.UI.openPanel('Ga je al weg?');
        const C = LQ.Challenges;
        C.screen(body, [C.say(`Je deed ${n} van de ${tot} opdrachten. Doe er nog ${NEED - n} om de stempel van ${s.short} te verdienen!`),
          C.row([C.next('Blijven en ontdekken', () => LQ.UI.closePanel()), LQ.h('button', { class: 'btn', onclick: () => { LQ.UI.closePanel(true); go(); } }, 'Toch weggaan')])]);
        return;
      }
      LQ.UI.feelPanel(s, go);
    }

    exitNow() {
      const G = LQ.Game, cam = this.cameras.main;
      LQ.UI.near(null);
      cam.fadeOut(220, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        G.inside = null; G.interiorPlayer = null;
        this.scene.stop();
        G.scene.scene.wake('world');
      });
    }
  }

  return { Scene, build, stationsDone, stationTotal, NEED };
})();
