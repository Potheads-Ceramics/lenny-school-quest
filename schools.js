/* =====================================================================
   SCHOOLS — puts every school from data/schools.json on the map as a
   building with a name sign, plus home, the quest board, the golden
   podium and Kit the cat. Returns "targets" Lenny can walk into.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Schools = (function () {
  const TS = 16;
  let labels = {}, sparkles = {}, sceneRef = null, posOf = {}, imgs = {};

  function sign(scene, x, y, text, col) {
    const t = scene.add.text(x, y, text, {
      fontFamily: '"Fredoka", "Trebuchet MS", sans-serif', fontSize: '8px', color: '#2b1d16',
      backgroundColor: '#f6ead0', padding: { x: 3, y: 1 }, resolution: 6
    }).setOrigin(0.5, 1).setDepth(100000);
    if (col) t.setStroke(col, 0);
    return t;
  }

  function create(scene, map, data) {
    labels = {}; sparkles = {}; posOf = {}; imgs = {}; sceneRef = scene;
    const targets = [];
    // home
    const hk = 'home'; if (!scene.textures.exists(hk)) scene.textures.addCanvas(hk, LQ.Sprites.home());
    const hd = map.home.door;
    scene.add.image(hd.x * TS, hd.y * TS + 2, hk).setOrigin(0.5, 1).setDepth(hd.y * TS);
    sign(scene, hd.x * TS, (hd.y - 4) * TS - 2, '🏠 Thuis');
    targets.push({ kind: 'home', x: hd.x * TS + 8, y: hd.y * TS + 12, label: '🏠 Thuis: open het missiebord', open: () => LQ.UI.questBoard() });

    // quest board
    if (!scene.textures.exists('board')) scene.textures.addCanvas('board', LQ.Sprites.questBoard());
    const b = map.board;
    scene.add.image(b.x * TS + 8, (b.y + 1) * TS, 'board').setOrigin(0.5, 1).setDepth((b.y + 1) * TS);
    targets.push({ kind: 'board', x: b.x * TS + 8, y: (b.y + 1) * TS + 10, label: '📜 Open het missiebord', open: () => LQ.UI.questBoard() });

    // podium
    if (!scene.textures.exists('podium')) scene.textures.addCanvas('podium', LQ.Sprites.podium());
    const pd = map.podium.door;
    scene.add.image(pd.x * TS + 8, pd.y * TS, 'podium').setOrigin(0.5, 1).setDepth(pd.y * TS);
    sign(scene, pd.x * TS + 8, pd.y * TS - 32, '🏆 Gouden Podium');
    targets.push({ kind: 'podium', x: pd.x * TS + 8, y: pd.y * TS + 12, label: '🏆 Bekijk mijn top 3', open: () => {
      const st = LQ.Game.state; LQ.UI.results(LQ.UI.readyForResults() && !st.revealed);
    } });

    // Kit, Lenny's cat
    if (!scene.textures.exists('kit')) {
      const tex = scene.textures.addCanvas('kit', LQ.Sprites.kitSheet()); tex.add(0, 0, 0, 0, 16, 16); tex.add(1, 0, 16, 0, 16, 16);
      scene.anims.create({ key: 'kit-idle', frames: [{ key: 'kit', frame: 0 }, { key: 'kit', frame: 0 }, { key: 'kit', frame: 0 }, { key: 'kit', frame: 1 }], frameRate: 2, repeat: -1 });
    }
    const g = map.kit;
    const kitSpr = scene.add.sprite(g.x * TS + 8, g.y * TS + 14, 'kit', 0).setOrigin(0.5, 1).setDepth(g.y * TS + 14).play('kit-idle');
    const kitT = { kind: 'kit', x: g.x * TS + 8, y: g.y * TS + 12, label: '💬 Praat met Kit', open: () => kit() };
    targets.push(kitT);
    // Kit can walk along with Lenny (extras.js moves her; she keeps her home spot)
    LQ.Schools.kitRef = { spr: kitSpr, target: kitT, home: { x: kitSpr.x, y: kitSpr.y } };

    // schools
    const byId = Object.fromEntries(data.schools.map(s => [s.id, s]));
    for (const bd of map.buildings) {
      const s = byId[bd.id];
      const key = 'school-' + s.id;
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, LQ.Sprites.building(s.style, s.roof));
      const x = bd.door.x * TS + 8, y = bd.door.y * TS;
      imgs[s.id] = scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
      labels[s.id] = sign(scene, x, y - 78, s.short);
      posOf[s.id] = { x, y: y - 92 };
      targets.push({ kind: 'school', school: s, building: bd, x, y: y + 12,
        label: s.interior ? `🚪 Loop ${s.short} binnen` : `🚪 Ga ${s.short} binnen`,
        open: () => s.interior ? LQ.Game.enterSchool(s) : LQ.UI.schoolVisit(s) });
    }

    // landmarks along the two bike routes (Abu Ana, De Blijberg, football, Plaswijck, park, zoo...)
    const LMD = Object.fromEntries((data.landmarks || []).map(l => [l.id, l]));
    (map.landmarks || []).forEach(lm => {
      const l = LMD[lm.id]; if (!l) return;
      const x = (lm.x0 + lm.x1 + 1) / 2 * TS, y = (lm.y1 + 1) * TS;
      if (lm.kind !== 'roundabout') {
        const key = 'lm-' + lm.id;
        if (!scene.textures.exists(key)) scene.textures.addCanvas(key, LQ.Sprites.landmark(lm.kind, lm.id));
        scene.add.image(x, y + 2, key).setOrigin(0.5, 1).setDepth(y);
      }
      if (LQ.Extras) LQ.Extras.addLandmark(scene, lm, l, x, y);
      const icon = { family: '🏡', shed: '🌻', playground: '🎡', zoo: '🦒', park: '🌳', roundabout: '🔄', streetsign: '🪧', primary: '🎒', football: '⚽' }[lm.kind] || '📍';
      const top = lm.kind === 'roundabout' ? (lm.y0 - 1) * TS : y - ({ family: 48, shed: 36, playground: 50, zoo: 58, park: 28, streetsign: 28, primary: 52, football: 40 }[lm.kind] || 30);
      const t = sign(scene, x, top, icon + ' ' + l.label);
      if (lm.kind === 'family' || lm.kind === 'shed' || lm.kind === 'primary' || lm.kind === 'football') t.setBackgroundColor('#ffe0e6');
      const d = lm.door;
      targets.push({ kind: 'landmark', x: d.x * TS + 8, y: d.y * TS + 12, label: icon + ' ' + l.label, open: () => LQ.UI.toast((LQ.Extras && LQ.Extras.poke(l.id)) || l.say || l.label) });
    });
    // a signpost at the start of each family bike route
    (map.routes || []).filter(r => !r.parent && r.icon).forEach(r => {
      const t0 = r.tiles[0], t1 = r.tiles[1];
      const arrow = Math.abs(t1.y - t0.y) >= Math.abs(t1.x - t0.x) ? (t1.y < t0.y ? '⬆' : '⬇') : (t1.x < t0.x ? '⬅' : '➡');
      const tx = t1.x, ty = Math.round((t0.y + t1.y) / 2);
      sign(scene, tx * TS + 40, ty * TS + 8, `${r.icon} ${r.name} ${arrow}`).setBackgroundColor('#ffd9cf');
    });

    // lake / river names
    map.names.forEach(n => scene.add.text(n.tile.x * TS, n.tile.y * TS, n.name, { fontFamily: '"Fredoka", sans-serif', fontSize: '8px', color: '#e8f6ff', resolution: 6 }).setOrigin(0.5).setAlpha(0.85).setDepth(5));

    refreshStamps();
    return targets;
  }

  // Signs show a ★ when visited and the icons of Lenny's likes this school has.
  // The 3 best matches get a bouncing sparkle so he knows where to go first.
  // Schools outside the family minimums stay on the map, but greyed out.
  function refreshStamps() {
    const G = LQ.Game, v = (G && G.state.visits) || {};
    const Sc = LQ.Scoring, p = Sc.profileFrom(G.state), hasLikes = Sc.likes(p).length > 0;
    const top = hasLikes ? Sc.passing(Sc.rank(G.data.schools, G.state)).slice(0, 3).map(r => r.id) : [];
    Object.entries(labels).forEach(([id, t]) => {
      const s = G.data.schools.find(x => x.id === id);
      const m = Sc.matchedLikes(s, p).slice(0, 3).map(tag => Sc.LIKE_ICONS[tag]).join('');
      const done = v[id] && v[id].done;
      t.setText((done ? '★ ' : '') + (s.interior ? '🚪 ' : '') + s.short + (m ? ' ' + m : ''));
      const off = Sc.blockedBy(s, G.state).length > 0;
      t.setBackgroundColor(off ? '#d9d3c8' : done ? '#ffe9a6' : m ? '#d6f0c2' : '#f6ead0');
      t.setColor(off ? '#7a7166' : '#2b1d16');
      if (imgs[id]) { imgs[id].setAlpha(off ? 0.55 : 1); off ? imgs[id].setTint(0xbbbbbb) : imgs[id].clearTint(); }
      const want = top.includes(id);
      if (want && !sparkles[id] && sceneRef) {
        const sp = sceneRef.add.text(posOf[id].x, posOf[id].y, '✨', { fontSize: '12px', resolution: 6 }).setOrigin(0.5, 1).setDepth(100001);
        sceneRef.tweens.add({ targets: sp, y: posOf[id].y - 5, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
        sparkles[id] = sp;
      } else if (!want && sparkles[id]) { sparkles[id].destroy(); delete sparkles[id]; }
    });
  }

  // "Walk with me" / "Stay here": Kit follows Lenny on the map (an option, off by default).
  function kitToggle() {
    const on = !!LQ.Game.state.kitFollow;
    return LQ.h('button', { class: 'btn', onclick: () => {
      LQ.Game.state.kitFollow = !on; LQ.Game.save(); LQ.UI.closePanel();
      LQ.UI.toast(on ? 'Kit gaat terug naar huis. Kom je me opzoeken? 🐾' : 'Kit loopt met je mee! 🐾');
      if (LQ.Extras) LQ.Extras.kitChanged();
    } }, on ? '🏠 Ga maar naar huis, Kit' : '🐾 Loop met me mee!');
  }

  // Kit gives a friendly hint about what to do next.
  function kit() {
    const st = LQ.Game.state, C = LQ.Challenges;
    const todo = C.STEPS.filter(s => s.n <= 5 && !st.steps[s.n]);
    const visits = Object.values(st.visits).filter(v => v.done).length;
    let msg;
    const inside = LQ.Game.data.schools.filter(s => s.interior && !(st.visits[s.id] && st.visits[s.id].done));
    const psst = inside.length ? ` Psst: je kunt naar binnen lopen bij ${inside.map(s => s.short).join(' en ')}. Zoek de 🚪 op het bordje!` : '';
    if (todo.length) msg = `Volgende missie: "${todo[0].title}". Het houten bord staat vlak naast je huis!` + psst;
    else if (visits < C.VISITS_NEEDED) {
      // point to the best-matching school he hasn't visited yet
      const Sc = LQ.Scoring, p = Sc.profileFrom(st);
      const r = Sc.passing(Sc.rank(LQ.Game.data.schools, st)).find(r => !(st.visits[r.id] && st.visits[r.id].done));
      const unvisited = r && r.school;
      const m = unvisited ? Sc.matchedLikes(unvisited, p).slice(0, 2) : [];
      const why = !unvisited ? '' : m.length ? `${unvisited.short} heeft ${m.map(t => Sc.LIKE_ICONS[t] + ' ' + Sc.TAG_WORDS[t]).join(' en ')}. Dat vind jij leuk!` : `${unvisited.short} kan goed bij je passen.`;
      msg = `Bezoek nog ${C.VISITS_NEEDED - visits} ${C.VISITS_NEEDED - visits > 1 ? 'scholen' : 'school'}. ${why} Zal ik je de weg wijzen?`;
      const body = LQ.UI.openPanel('Kit');
      C.screen(body, [C.say(msg), C.row([unvisited ? C.next('Wijs me de weg', () => { LQ.UI.closePanel(); LQ.Game.goTo(unvisited.id); }) : null, kitToggle(), LQ.h('button', { class: 'btn', onclick: () => LQ.UI.closePanel() }, 'Bedankt, Kit!')])]);
      return;
    } else msg = (st.revealed ? 'Je hebt je top 3 gevonden! Bezoek meer scholen of verander je antwoorden wanneer je wilt.' : 'Alles is klaar! Ga naar het gouden podium naast je huis.') + psst;
    const body = LQ.UI.openPanel('Kit');
    C.screen(body, [C.say(msg), C.row([kitToggle(), C.next('Bedankt, Kit!', () => LQ.UI.closePanel())])]);
  }

  return { create, refreshStamps };
})();
