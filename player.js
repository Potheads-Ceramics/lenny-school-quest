/* =====================================================================
   PLAYER — Lenny on foot or on his black bike.
   Keyboard (arrows / WASD) and tap-to-move (A* path on the tile grid).
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Player = (function () {
  const TS = 16;
  const SPEED = { walk: 62, bike: 128, indoor: 90 }; // px per second (indoor = walking inside a school)

  function makeAnims(scene) {
    if (!scene.textures.exists('lenny')) {
      const tex = scene.textures.addCanvas('lenny', LQ.Sprites.lennySheet());
      for (let i = 0; i < 15; i++) tex.add(i, 0, i * 24, 0, 24, 24);
    }
    const f = (arr) => arr.map(n => ({ key: 'lenny', frame: n }));
    const add = (key, frames, rate) => { if (!scene.anims.exists(key)) scene.anims.create({ key, frames: f(frames), frameRate: rate, repeat: -1 }); };
    add('walk-down', [1, 0, 2, 0], 8); add('walk-up', [4, 3, 5, 3], 8); add('walk-side', [7, 6, 8, 6], 8);
    add('bike-down', [9, 10], 10); add('bike-up', [11, 12], 10); add('bike-side', [13, 14], 10);
  }

  function create(scene, map, tile) {
    makeAnims(scene);
    const spr = scene.add.sprite(tile.x * TS + 8, tile.y * TS + 14, 'lenny', 0).setOrigin(0.5, 1);
    const shadow = scene.add.ellipse(spr.x, spr.y - 1, 12, 4, 0x000000, 0.18);
    const p = { spr, shadow, dir: 'down', path: null, onArrive: null, moving: false };

    const blocked = (x, y) => {
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
      if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) return true;
      return map.walk[ty * map.W + tx] === 0;
    };
    const feetFree = (x, y) => !blocked(x - 4, y - 5) && !blocked(x + 4, y - 5) && !blocked(x - 4, y - 1) && !blocked(x + 4, y - 1);

    p.tile = () => ({ x: Math.floor(spr.x / TS), y: Math.floor((spr.y - 3) / TS) });

    p.goTo = (tx, ty, onArrive) => {
      const t = p.tile();
      const path = LQ.Map.findPath(map, t.x, t.y, tx, ty);
      p.path = path && path.length ? path.slice(1) : null;
      p.onArrive = p.path ? onArrive || null : null;
      if (path && path.length === 1 && onArrive) onArrive();
      return !!p.path;
    };
    p.stop = () => { p.path = null; p.onArrive = null; };

    p.update = (dt, keys, mode) => {
      let sp = SPEED[mode] * dt;
      let dx = 0, dy = 0;
      if (keys) { dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); }
      // joystick: a small push walks slowly, a full push goes full speed
      if (keys && !dx && !dy && (keys.ax || keys.ay)) { dx = keys.ax; dy = keys.ay; sp *= Math.max(0.35, Math.min(1, Math.hypot(dx, dy))); }
      if (dx || dy) p.stop();
      else if (p.path) {
        const n = p.path[0], tx = n.x * TS + 8, ty = n.y * TS + 12;
        const ddx = tx - spr.x, ddy = ty - spr.y, d = Math.hypot(ddx, ddy);
        if (d < Math.max(1.5, sp)) {
          spr.x = tx; spr.y = ty; p.path.shift();
          if (!p.path.length) { p.path = null; const cb = p.onArrive; p.onArrive = null; if (cb) cb(); }
        } else { dx = ddx / d; dy = ddy / d; }
      }
      p.moving = !!(dx || dy);
      if (p.moving) {
        const len = Math.hypot(dx, dy) || 1, mx = dx / len * sp, my = dy / len * sp;
        if (p.path) { spr.x += mx; spr.y += my; }
        else {
          if (feetFree(spr.x + mx, spr.y)) spr.x += mx;
          if (feetFree(spr.x, spr.y + my)) spr.y += my;
        }
        if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right'; else p.dir = dy < 0 ? 'up' : 'down';
      }
      const base = mode === 'bike' ? 'bike' : 'walk';
      const d = p.dir === 'left' || p.dir === 'right' ? 'side' : p.dir;
      spr.setFlipX(p.dir === 'right');
      if (p.moving) spr.anims.play(`${base}-${d}`, true);
      else {
        spr.anims.stop();
        const idle = { walk: { down: 0, up: 3, side: 6 }, bike: { down: 9, up: 11, side: 13 } }[base][d];
        spr.setFrame(idle);
      }
      spr.setDepth(spr.y);
      shadow.setPosition(spr.x, spr.y - 1).setDepth(spr.y - 1).setSize(mode === 'bike' && d === 'side' ? 22 : 12, 4);
    };
    return p;
  }

  return { create, SPEED };
})();
