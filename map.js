/* =====================================================================
   MAP — builds the neighbourhood around home as a tile grid.
   Pure logic (no Phaser), so it can be tested on its own.
   Real positions: lat/lon -> km from home -> tiles (65 m per tile).
   The map is a friendly cartoon: lakes, river and roads are rough.
   The two family bike routes (data.bikeRoutes) are drawn as red
   fietspad, and the family landmarks (data.landmarks) sit along them.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Map = (function () {
  const KM_PER_TILE = 0.045; // 27 Oct 2026: finer grid (was 0.065) so buildings look less squashed together
  const BOUNDS = { x0: -2.4, x1: 7.0, y0: -2.9, y1: 4.9 }; // km, x east, y south of home
  const T = { GRASS: 0, GRASS2: 1, TUFT: 2, ROAD: 3, WATER: 4, BRIDGE: 5, PLAZA: 6, WATER2: 7,
              TREE: 8, PINE: 9, BUSH: 10, FLOW_R: 11, FLOW_Y: 12, FENCE: 13, LAMP: 14, REEDS: 15, HOUSE_A: 16, HOUSE_B: 20, BIKE: 25, BIKE_CROSS: 26 };

  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  function geoToKm(home, lat, lon) {
    return { x: (lon - home.lon) * 68.75, y: (home.lat - lat) * 111.2 };
  }

  function build(data) {
    const W = Math.round((BOUNDS.x1 - BOUNDS.x0) / KM_PER_TILE);
    const H = Math.round((BOUNDS.y1 - BOUNDS.y0) / KM_PER_TILE);
    const N = W * H;
    const R = rng(3051);
    const ground = new Array(N).fill(T.GRASS);
    const objects = new Array(N).fill(-1);
    const walk = new Uint8Array(N).fill(1);
    const kind = new Uint8Array(N); // 0 grass, 1 road, 2 water, 3 reserved(building), 4 bridge, 5 keep-clear
    const bike = new Uint8Array(N); // 1 = red fietspad (a family bike route)
    const park = new Uint8Array(N); // 1 = inside a park (lots of trees, no houses)
    const idx = (x, y) => y * W + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const kmToTile = (kx, ky) => ({ x: Math.round((kx - BOUNDS.x0) / KM_PER_TILE), y: Math.round((ky - BOUNDS.y0) / KM_PER_TILE) });

    for (let i = 0; i < N; i++) { const v = R(); ground[i] = v < 0.08 ? T.TUFT : v < 0.35 ? T.GRASS2 : T.GRASS; }

    /* ---- water ---- */
    function setWater(x, y) { if (!inb(x, y)) return; const i = idx(x, y); kind[i] = 2; walk[i] = 0; ground[i] = ((x + y) % 5 === 0) ? T.WATER2 : T.WATER; }
    function ellipse(kx, ky, rx, ry) {
      const c = kmToTile(kx, ky), tx = rx / KM_PER_TILE, ty = ry / KM_PER_TILE;
      for (let y = Math.floor(c.y - ty) - 1; y <= c.y + ty + 1; y++) for (let x = Math.floor(c.x - tx) - 1; x <= c.x + tx + 1; x++) {
        const nx = (x - c.x) / tx, ny = (y - c.y) / ty;
        if (nx * nx + ny * ny <= 1) setWater(x, y);
      }
    }
    function river(pts, rad) {
      for (let s = 0; s < pts.length - 1; s++) {
        const a = kmToTile(pts[s][0], pts[s][1]), b = kmToTile(pts[s + 1][0], pts[s + 1][1]);
        const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 2;
        for (let k = 0; k <= steps; k++) {
          const cx = a.x + (b.x - a.x) * k / steps, cy = a.y + (b.y - a.y) * k / steps;
          for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad + 0.5) setWater(Math.round(cx + dx), Math.round(cy + dy));
        }
      }
    }
    const waterNames = [];
    ellipse(1.45, -1.05, 0.25, 0.3); ellipse(1.72, -1.48, 0.24, 0.3); waterNames.push({ name: 'Bergse Plassen', km: [1.6, -1.35] });
    ellipse(3.1, 1.35, 0.5, 0.4); waterNames.push({ name: 'Kralingse Plas', km: [3.1, 1.35] });
    river([[2.6, -2.3], [2.45, -0.8], [2.25, 0.5], [2.05, 1.45]], 1); waterNames.push({ name: 'Rotte', km: [2.45, -0.4] });
    for (let x = 0; x < W; x++) {
      const kx = BOUNDS.x0 + x * KM_PER_TILE;
      const top = kmToTile(0, 4.62 + 0.08 * Math.sin(kx * 2)).y;
      for (let y = top; y < H; y++) setWater(x, y);
    }
    waterNames.push({ name: 'De Maas', km: [1.5, 4.78] });
    ellipse(-1.45, 1.52, 0.09, 0.06); // pond in the Vroesenpark

    /* ---- reserve home + landmarks ---- */
    const reserved = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) { const i = idx(x, y); kind[i] = 3; walk[i] = 0; } };
    const homeDoor = kmToTile(0, 0.03);
    // home sprite 64x60 = 4 x ~4 tiles; door in the middle bottom
    const home = { x0: homeDoor.x - 2, x1: homeDoor.x + 1, y0: homeDoor.y - 4, y1: homeDoor.y - 1, door: { x: homeDoor.x, y: homeDoor.y } };
    reserved(home.x0, home.y0, home.x1, home.y1);
    const board = { x: homeDoor.x + 3, y: homeDoor.y - 1 };
    reserved(board.x, board.y, board.x, board.y);
    const kit = { x: homeDoor.x - 3, y: homeDoor.y };
    const podium = { x0: homeDoor.x + 6, x1: homeDoor.x + 8, y0: homeDoor.y - 2, y1: homeDoor.y - 1, door: { x: homeDoor.x + 7, y: homeDoor.y } };
    reserved(podium.x0, podium.y0, podium.x1, podium.y1);

    /* ---- the family bike routes (red fietspad, 2 tiles wide) ---- */
    function paintBike(x, y) {
      if (!inb(x, y)) return; const i = idx(x, y);
      if (kind[i] === 3) return;
      bike[i] = 1; walk[i] = 1;
      if (kind[i] === 2 || kind[i] === 4) { kind[i] = 4; ground[i] = T.BRIDGE; return; }
      kind[i] = 1; ground[i] = T.BIKE;
    }
    const geoTile = (p) => { const k = geoToKm(data.home, p[0], p[1]); return kmToTile(k.x, k.y); };
    const routes = ((data.bikeRoutes && data.bikeRoutes.routes) || []).map(r => ({ id: r.id, name: r.name, icon: r.icon, parent: r.parent, tiles: r.points.map(geoTile) }));
    routes.forEach(r => {
      for (let s = 0; s < r.tiles.length - 1; s++) {
        const a = r.tiles[s], b = r.tiles[s + 1];
        const steps = Math.max(1, Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 2);
        for (let k = 0; k <= steps; k++) {
          const cx = Math.round(a.x + (b.x - a.x) * k / steps), cy = Math.round(a.y + (b.y - a.y) * k / steps);
          paintBike(cx, cy); paintBike(cx + 1, cy); paintBike(cx, cy + 1); paintBike(cx + 1, cy + 1);
        }
      }
    });
    // the bike route that starts at home leaves from the street next to the house
    const LM = Object.fromEntries((data.landmarks || []).map(l => [l.id, l]));
    // roundabout: a ring of fietspad around a little flower island
    let roundabout = null;
    if (LM.rotonde) {
      const c = geoTile([LM.rotonde.lat, LM.rotonde.lon]); const cx = c.x + 0.5, cy = c.y + 0.5;
      for (let y = c.y - 4; y <= c.y + 4; y++) for (let x = c.x - 4; x <= c.x + 4; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= 3.2 && d > 1.3) paintBike(x, y);
      }
      roundabout = { x: c.x, y: c.y };
      for (let y = c.y - 1; y <= c.y + 1; y++) for (let x = c.x - 1; x <= c.x + 1; x++) if (inb(x, y) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 1.3) { const i = idx(x, y); kind[i] = 5; walk[i] = 0; ground[i] = T.GRASS; objects[i] = (x === c.x && y === c.y) ? T.TREE : T.FLOW_R; }
    }
    // parks: marked so the decoration puts trees there instead of houses
    (data.landmarks || []).filter(l => l.kind === 'park' || l.kind === 'zoo' || l.kind === 'playground').forEach(l => {
      const c = geoTile([l.lat, l.lon]), rad = l.kind === 'park' ? 6 : 4;
      for (let y = c.y - rad; y <= c.y + rad; y++) for (let x = c.x - rad - 1; x <= c.x + rad + 1; x++) if (inb(x, y) && Math.hypot((x - c.x) / 1.2, y - c.y) <= rad) park[idx(x, y)] = 1;
    });

    /* ---- main roads (2 tiles wide) ---- */
    function paintRoad(x, y) {
      if (!inb(x, y)) return; const i = idx(x, y);
      if (kind[i] === 3) return;
      if (kind[i] === 2 || kind[i] === 4) { kind[i] = 4; ground[i] = T.BRIDGE; walk[i] = 1; return; }
      if (bike[i]) { ground[i] = T.BIKE_CROSS; walk[i] = 1; return; }
      kind[i] = 1; ground[i] = T.ROAD; walk[i] = 1;
    }
    const maasTop = kmToTile(0, 4.52).y;
    function hRoad(ky, kxa, kxb) { const a = kmToTile(kxa, ky), b = kmToTile(kxb, ky); for (let x = Math.max(0, a.x); x <= Math.min(W - 1, b.x); x++) { paintRoad(x, a.y); paintRoad(x, a.y + 1); } }
    function vRoad(kx, kya, kyb) { const a = kmToTile(kx, kya), b = kmToTile(kx, kyb); for (let y = Math.max(0, a.y); y <= Math.min(maasTop, b.y); y++) { paintRoad(a.x, y); paintRoad(a.x + 1, y); } }
    // the street goes right past the front door
    for (let x = 0; x < W; x++) { paintRoad(x, homeDoor.y + 1); paintRoad(x, homeDoor.y + 2); }
    hRoad(1.9, BOUNDS.x0, BOUNDS.x1);
    hRoad(3.3, BOUNDS.x0, BOUNDS.x1);
    hRoad(-2.7, -1.0, 2.6); // (moved north 27 Oct so Wolfert Dalton fits in its real spot)
    vRoad(-0.15, BOUNDS.y0, 4.2);
    vRoad(4.0, 0.0, 2.0);
    vRoad(1.75, -0.95, 0.1); // (moved east 27 Oct so Wolfert Dalton fits in its real spot)

    /* ---- place school buildings near their real spot ---- */
    const BW = 5; // footprint 5 wide x 4 tall (rows door-4..door-1)
    function free(cx, cy) {
      for (let y = cy - 5; y <= cy + 1; y++) for (let x = cx - 3; x <= cx + 3; x++) {
        if (!inb(x, y)) return false;
        const k = kind[idx(x, y)];
        if (k === 3 || k === 2 || k === 4) return false;
        if (k === 1 && y < cy) return false; // roads only in the door row or below
      }
      return true;
    }
    const buildings = [];
    const sorted = data.schools.slice().sort((a, b) => a.distanceKm - b.distanceKm);
    for (const s of sorted) {
      const km = geoToKm(data.home, s.lat, s.lon);
      const t = kmToTile(km.x, km.y); t.y += 2; // the door sits below the middle of the building
      let spot = null;
      for (let rad = 0; rad < 18 && !spot; rad++) {
        let best = null, bestD = 1e9;
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
          const cx = t.x + dx, cy = t.y + dy;
          if (free(cx, cy)) { const d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = { x: cx, y: cy }; } }
        }
        spot = best;
      }
      if (!spot) { console.warn('No spot for', s.id); continue; }
      const b = { id: s.id, x0: spot.x - 2, x1: spot.x + 2, y0: spot.y - 4, y1: spot.y - 1, door: { x: spot.x, y: spot.y }, km };
      reserved(b.x0, b.y0, b.x1, b.y1);
      // keep a little clear space around it
      for (let y = b.y0 - 1; y <= b.y1 + 2; y++) for (let x = b.x0 - 1; x <= b.x1 + 1; x++) if (inb(x, y) && kind[idx(x, y)] === 0) kind[idx(x, y)] = 5;
      const di = idx(spot.x, spot.y); if (kind[di] !== 1) { ground[di] = T.PLAZA; kind[di] = 1; walk[di] = 1; }
      buildings.push(b);
    }

    /* ---- family landmarks along the routes (houses, park, zoo, ...) ---- */
    const LSIZE = { family: [3, 3], shed: [2, 2], playground: [4, 3], zoo: [4, 3], park: [1, 1], streetsign: [1, 1] };
    function freeBox(cx, cy, w, h) {
      const xa = cx - Math.floor(w / 2) - 1, xb = xa + w + 1;
      for (let y = cy - h - 1; y <= cy + 1; y++) for (let x = xa; x <= xb; x++) {
        if (!inb(x, y)) return false;
        const k = kind[idx(x, y)];
        if (k === 3 || k === 2 || k === 4) return false;
        if (k === 1 && y < cy) return false;
      }
      return true;
    }
    const landmarks = [];
    (data.landmarks || []).forEach(l => {
      const sz = LSIZE[l.kind]; if (!sz) return; // the roundabout is painted above
      const t = geoTile([l.lat, l.lon]); t.y += Math.ceil(sz[1] / 2); // door below the middle
      let spot = null;
      for (let rad = 0; rad < 14 && !spot; rad++) {
        let best = null, bestD = 1e9;
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
          if (freeBox(t.x + dx, t.y + dy, sz[0], sz[1])) { const d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = { x: t.x + dx, y: t.y + dy }; } }
        }
        spot = best;
      }
      if (!spot) { console.warn('No spot for landmark', l.id); return; }
      const x0 = spot.x - Math.floor(sz[0] / 2), lm = { id: l.id, kind: l.kind, x0, x1: x0 + sz[0] - 1, y0: spot.y - sz[1], y1: spot.y - 1, door: { x: spot.x, y: spot.y } };
      reserved(lm.x0, lm.y0, lm.x1, lm.y1);
      for (let y = lm.y0 - 1; y <= lm.y1 + 1; y++) for (let x = lm.x0 - 1; x <= lm.x1 + 1; x++) if (inb(x, y) && kind[idx(x, y)] === 0) kind[idx(x, y)] = 5;
      const di = idx(spot.x, spot.y); if (kind[di] !== 1) { ground[di] = T.PLAZA; kind[di] = 1; walk[di] = 1; }
      landmarks.push(lm);
    });
    if (roundabout && LM.rotonde) landmarks.push({ id: 'rotonde', kind: 'roundabout', x0: roundabout.x - 1, x1: roundabout.x + 1, y0: roundabout.y - 1, y1: roundabout.y + 1, door: { x: roundabout.x, y: roundabout.y + 2 } });

    /* ---- connect every door to the road network (cheapest path, bridges over water) ---- */
    function connect(sx, sy) {
      const dist = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1);
      const heap = [];
      const push = (i, d) => { heap.push([d, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      const s = idx(sx, sy); dist[s] = 0; push(s, 0);
      let goal = -1;
      while (heap.length) {
        const [d, i] = pop(); if (d > dist[i]) continue;
        const x = i % W, y = (i / W) | 0;
        if (i !== s && (kind[i] === 1 || kind[i] === 4)) { goal = i; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue;
          const j = idx(nx, ny), k = kind[j];
          if (k === 3) continue;
          if (ny >= maasTop + 1 && k === 2) continue;
          const c = k === 2 ? 8 : 1;
          if (d + c < dist[j]) { dist[j] = d + c; prev[j] = i; push(j, d + c); }
        }
      }
      for (let i = goal; i !== -1 && i !== s; i = prev[i]) { const x = i % W, y = (i / W) | 0; paintRoad(x, y); }
      paintRoad(sx, sy);
    }
    const doorRow = (d) => ({ x: d.x, y: d.y + 1 });
    connect(doorRow(home.door).x, doorRow(home.door).y);
    for (const b of buildings) { const d = doorRow(b.door); if (kind[idx(b.door.x, b.door.y)] !== 1 || true) connect(d.x, d.y); paintRoad(b.door.x, b.door.y); ground[idx(b.door.x, b.door.y)] = T.PLAZA; }
    connect(podium.door.x, podium.door.y);
    for (const l of landmarks) if (l.kind !== 'roundabout') { const d = doorRow(l.door); connect(d.x, d.y); paintRoad(l.door.x, l.door.y); ground[idx(l.door.x, l.door.y)] = T.PLAZA; }

    /* ---- decoration: houses, trees, flowers (never next to roads) ---- */
    const nearRoad = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (inb(nx, ny)) { const k = kind[idx(nx, ny)]; if (k === 1 || k === 4 || k === 3) return true; } } return false; };
    const nearWater = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && kind[idx(nx, ny)] === 2) return true; } return false; };
    const canUse = (x, y) => inb(x, y) && kind[idx(x, y)] === 0 && objects[idx(x, y)] === -1 && !nearRoad(x, y) && !(Math.abs(x - kit.x) < 2 && Math.abs(y - kit.y) < 2);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!canUse(x, y)) continue;
      const kx = BOUNDS.x0 + x * KM_PER_TILE, ky = BOUNDS.y0 + y * KM_PER_TILE;
      const city = ky > 0.4 && kx < 2.0;
      const inPark = park[idx(x, y)] === 1;
      const lakeside = nearWater(x, y, 4) && ky < 4.0;
      const v = R();
      if (!inPark && !lakeside && v < (city ? 0.09 : 0.035) && canUse(x + 1, y) && canUse(x, y + 1) && canUse(x + 1, y + 1)) {
        const base = R() < 0.5 ? T.HOUSE_A : T.HOUSE_B;
        const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
        cells.forEach(([cx, cy], k) => { const i = idx(cx, cy); objects[i] = base + k; walk[i] = 0; kind[i] = 5; });
        continue;
      }
      const tv = inPark ? 0.55 : lakeside ? 0.2 : city ? 0.035 : 0.075;
      if (v < tv + 0.1 && v >= 0.1) { const i = idx(x, y); objects[i] = R() < 0.3 ? T.PINE : (R() < 0.25 ? T.BUSH : T.TREE); walk[i] = 0; continue; }
      if (nearWater(x, y, 1) && R() < 0.25) { objects[idx(x, y)] = T.REEDS; continue; }
      if (R() < 0.035) objects[idx(x, y)] = R() < 0.5 ? T.FLOW_R : T.FLOW_Y;
    }
    // lamps along roads near home, flowers by the door
    for (let x = home.x0 - 6; x <= podium.x1 + 4; x += 4) { const y = homeDoor.y; if (inb(x, y) && kind[idx(x, y)] === 0 && objects[idx(x, y)] === -1 && Math.abs(x - kit.x) > 1 && Math.abs(x - homeDoor.x) > 1 && Math.abs(x - board.x) > 1) { objects[idx(x, y)] = T.LAMP; walk[idx(x, y)] = 0; } }
    // border trees keep Lenny on the map
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const i = idx(x, y); if (kind[i] === 0 || kind[i] === 5) { objects[i] = T.TREE; walk[i] = 0; } }
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { const i = idx(x, y); if (kind[i] === 0 || kind[i] === 5) { objects[i] = T.PINE; walk[i] = 0; } if (kind[i] === 1) { walk[i] = 0; } }

    const names = waterNames.map(w => ({ name: w.name, tile: kmToTile(w.km[0], w.km[1]) }));
    return { W, H, ground, objects, walk, kind, bike, home, board, kit, podium, buildings, landmarks, routes, names, kmToTile, KM_PER_TILE, T };
  }

  /* ---- A* path finding for tap-to-move ---- */
  function findPath(map, sx, sy, tx, ty) {
    const { W, H, walk, kind, bike } = map;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const ok = (x, y) => inb(x, y) && walk[y * W + x] === 1;
    if (!ok(tx, ty)) {
      let best = null, bd = 1e9;
      for (let r = 1; r <= 4 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (ok(tx + dx, ty + dy)) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [tx + dx, ty + dy]; } }
      }
      if (!best) return null; [tx, ty] = best;
    }
    if (!ok(sx, sy)) return null;
    const N = W * H, g = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [];
    const h = (x, y) => (Math.abs(x - tx) + Math.abs(y - ty)) * 0.5;
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const s = sy * W + sx, goal = ty * W + tx;
    g[s] = 0; push(h(sx, sy), s);
    let guard = 0;
    while (heap.length && guard++ < 120000) {
      const [, i] = pop(); if (closed[i]) continue; closed[i] = 1;
      if (i === goal) break;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!ok(nx, ny)) continue;
        const j = ny * W + nx; if (closed[j]) continue;
        const k = kind[j], c = bike && bike[j] ? 0.5 : (k === 1 || k === 4) ? 0.8 : 1.2; // the red fietspad is the nicest way
        if (g[i] + c < g[j]) { g[j] = g[i] + c; prev[j] = i; push(g[j] + h(nx, ny), j); }
      }
    }
    if (prev[goal] === -1 && goal !== s) return null;
    const path = [];
    for (let i = goal; i !== -1; i = prev[i]) { path.push({ x: i % W, y: (i / W) | 0 }); if (i === s) break; }
    return path.reverse();
  }

  return { build, findPath, geoToKm, KM_PER_TILE, T };
})();
