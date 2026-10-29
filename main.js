/* =====================================================================
   MAIN — loads data/schools.json, keeps the game state, saves it,
   and runs the Phaser scene that ties map, player and schools together.
   ===================================================================== */
window.LQ = window.LQ || {};

(function () {
  const SAVE_KEY = 'lennySchoolQuest.v1';
  const TS = 16;

  function fresh() {
    return { v: 1, introDone: false, mode: 'bike', sound: false, steps: {}, answers: {}, visits: {}, revealed: false, lastRanking: [], pos: null };
  }
  function load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) return Object.assign(fresh(), s); } } catch (e) {}
    return fresh();
  }

  const Game = LQ.Game = {
    state: load(), data: null, map: null, scene: null, player: null, paused: false,
    save() {
      this.state.savedAt = Date.now();
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) {}
      if (LQ.Cloud) LQ.Cloud.queue(this.state);
    },
    setMode(m) { this.state.mode = m; this.save(); LQ.UI.hud(); },
    // Start over: the online save (if any) is cleared too, so other devices start over as well.
    async reset() {
      this.state = fresh(); this.state.savedAt = Date.now();
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) {}
      if (LQ.Cloud && LQ.Cloud.code()) { try { await LQ.Cloud.saveNow(this.state); } catch (e) {} }
      location.reload();
    },
    // Parents: take this device off Lenny's code (the online save stays).
    unlinkDevice() {
      if (LQ.Cloud) LQ.Cloud.forget();
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      location.reload();
    },
    refreshStamps() { LQ.Schools.refreshStamps(); },
    // Walk into a school that has an inside (see interior.js).
    enterSchool(s) {
      const sc = this.scene; if (!sc || this.inside) return;
      if (this.player) this.player.stop();
      this.inside = s;
      if (LQ.Minimap) LQ.Minimap.enteredSchool(s.id);
      LQ.UI.near(null);
      this.state.pos = this.player.tile(); this.save();
      sc.cameras.main.fadeOut(220, 0, 0, 0);
      sc.cameras.main.once('camerafadeoutcomplete', () => { sc.scene.sleep(); sc.scene.launch('interior', { school: s }); });
    },
    goTo(id) {
      const t = this.targets.find(x => x.school && x.school.id === id); if (!t || !this.player) return;
      const d = t.building.door;
      if (this.player.goTo(d.x, d.y, () => t.open())) this.showMarker(d.x, d.y);
    },
    showMarker(tx, ty) {
      const s = this.scene; if (!s) return;
      if (this.marker) this.marker.destroy();
      this.marker = s.add.image(tx * TS + 8, ty * TS + 4, 'tiles', 24).setDepth(99999);
      s.tweens.add({ targets: this.marker, y: ty * TS - 2, yoyo: true, repeat: -1, duration: 400 });
    }
  };

  /* --------------------------- Phaser scene --------------------------- */
  class World extends Phaser.Scene {
    constructor() { super('world'); }
    create() {
      Game.scene = this; Game.activeScene = this;
      const map = Game.map;
      // tiles
      const tex = this.textures.addCanvas('tiles', LQ.Sprites.tileset());
      for (let i = 0; i < 32; i++) tex.add(i, 0, (i % 8) * TS, Math.floor(i / 8) * TS, TS, TS);
      const rows = (arr) => { const out = []; for (let y = 0; y < map.H; y++) out.push(arr.slice(y * map.W, (y + 1) * map.W)); return out; };
      const gm = this.make.tilemap({ data: rows(map.ground), tileWidth: TS, tileHeight: TS });
      gm.createLayer(0, gm.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0), 0, 0).setDepth(0);
      const om = this.make.tilemap({ data: rows(map.objects), tileWidth: TS, tileHeight: TS });
      om.createLayer(0, om.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0), 0, 0).setDepth(1);

      Game.targets = LQ.Schools.create(this, map, Game.data);

      // player starts at saved spot or in front of home
      // the map changed on 27 Oct 2026 (bike routes, real school spots, finer grid): old saved spots no longer match, so start at home once
      if (Game.state.mapV !== 3) { Game.state.pos = null; Game.state.mapV = 3; Game.save(); }
      const start = Game.state.pos && map.walk[Game.state.pos.y * map.W + Game.state.pos.x] ? Game.state.pos : { x: map.home.door.x, y: map.home.door.y + 1 };
      Game.player = LQ.Player.create(this, map, start);

      const cam = this.cameras.main;
      cam.setBounds(0, 0, map.W * TS, map.H * TS);
      cam.startFollow(Game.player.spr, true, 0.15, 0.15);
      cam.setRoundPixels(true);
      cam.setBackgroundColor('#4f9fd6');
      const fit = () => {
        const w = this.scale.width, h = this.scale.height;
        const top = Math.round(document.getElementById('hud').getBoundingClientRect().height);
        cam.setViewport(0, top, w, Math.max(100, h - top));
        cam.setZoom(Math.max(2, Math.min(4, Math.floor(Math.min(w, h - top) / 210))));
      };
      fit(); this.scale.on('resize', fit);

      // keyboard
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = this.input.keyboard.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D, e: K.E, space: K.SPACE, enter: K.ENTER });
      this.input.keyboard.on('keydown', (ev) => {
        if (LQ.UI.isOpen()) return;
        if (['e', 'E', ' ', 'Enter'].includes(ev.key) && this.nearT) { ev.preventDefault && ev.preventDefault(); LQ.Sound.play(); this.nearT.open(); }
      });
      this.input.keyboard.addCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.SPACE]);

      // tap / click to move
      this.input.on('pointerup', (p) => {
        if (LQ.UI.isOpen() || Game.paused) return;
        if (p.event && p.event.target !== this.game.canvas) return; // taps on the map/buttons are not walking taps
        if (p.getDistance && p.getDistance() > 12) return;
        if (LQ.Joy.dragging()) return; // that was a joystick drag, not a tap
        const tx = Math.floor(p.worldX / TS), ty = Math.floor(p.worldY / TS);
        // tapped a building or landmark? walk to its door and open it
        const hit = Game.targets.find(t => t.kind === 'school' && tx >= t.building.x0 && tx <= t.building.x1 && ty >= t.building.y0 - 1 && ty <= t.building.y1 + 1)
          || Game.targets.find(t => t.kind !== 'school' && Math.abs(Math.floor(t.x / TS) - tx) <= 1 && Math.abs(Math.floor((t.y - 12) / TS) - ty) <= 2);
        if (hit) {
          const dx = Math.floor(hit.x / TS), dy = Math.floor((hit.y - 12) / TS);
          if (Game.player.goTo(dx, dy, () => hit.open())) Game.showMarker(dx, dy);
          return;
        }
        if (Game.player.goTo(tx, ty)) Game.showMarker(tx, ty);
      });

      // back from inside a school
      this.events.on('wake', () => {
        Game.activeScene = this; Game.inside = null; this.nearT = undefined;
        this.input.keyboard.resetKeys();
        cam.fadeIn(250, 0, 0, 0);
        LQ.UI.hud(); Game.refreshStamps();
      });

      this.saveTimer = 0;
      LQ.Minimap.init();
      if (!Game.state.introDone) setTimeout(() => LQ.UI.intro(), 400);
      LQ.UI.hud();
      document.getElementById('loading').hidden = true;
    }

    update(time, delta) {
      const dt = Math.min(delta, 50) / 1000;
      const k = this.keys;
      const keys = (LQ.UI.isOpen() || Game.paused) ? null : Object.assign({ up: k.up.isDown || k.w.isDown, down: k.down.isDown || k.s.isDown, left: k.left.isDown || k.a.isDown, right: k.right.isDown || k.d.isDown }, LQ.Joy.vec() || {});
      if (LQ.UI.isOpen()) { Game.player.update(0, null, Game.state.mode); return; }
      Game.player.update(dt, keys, Game.state.mode);
      if (Game.marker && !Game.player.path) { Game.marker.destroy(); Game.marker = null; }

      // what is Lenny standing next to?
      const px = Game.player.spr.x, py = Game.player.spr.y;
      let best = null, bd = 22;
      for (const t of Game.targets) { const d = Math.hypot(t.x - px, t.y - py); if (d < bd) { bd = d; best = t; } }
      if (best !== this.nearT) { this.nearT = best; LQ.UI.near(best); }

      this.saveTimer += delta;
      if (this.saveTimer > 3000) { this.saveTimer = 0; Game.state.pos = Game.player.tile(); Game.save(); }
    }
  }

  /* --------------------------- boot --------------------------- */
  async function start(hotData) {
    if (hotData && hotData.state) Game.state = Object.assign(fresh(), hotData.state);
    LQ.UI.init();
    LQ.Joy.init();
    try {
      const res = await fetch('schools.json', { cache: 'no-cache' });
      Game.data = await res.json();
    } catch (e) {
      document.getElementById('loading').textContent = 'De lijst met scholen kon niet laden (schools.json). Laad de pagina opnieuw.';
      return;
    }
    // player code + online save (see cloud.js); without config this just returns the local save
    if (LQ.Cloud) {
      Game.state = await LQ.Cloud.begin(Game.state, fresh);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(Game.state)); } catch (e) {}
    }
    try { await Promise.race([Promise.all([document.fonts.load('16px "Pixelify Sans"'), document.fonts.load('600 16px "Fredoka"'), document.fonts.load('400 16px "Fredoka"')]), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    Game.map = LQ.Map.build(Game.data);
    new Phaser.Game({
      type: Phaser.AUTO, parent: 'game', backgroundColor: '#4f9fd6', pixelArt: true, roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [World, LQ.Interior.Scene]
    });
  }

  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ state: Game.state }));
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
