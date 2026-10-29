/* =====================================================================
   CHALLENGES — the six VO Gids steps as mini-games, plus one
   mini-game per school. No wrong answers: every choice counts.
   Each function draws into `body` (a DOM element) and calls done().
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Challenges = (function () {
  const h = (...a) => LQ.h(...a);
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const blip = (k) => LQ.Sound && LQ.Sound.play(k || 'blip');

  /* The six steps follow the VO Gids "Stappenplan voor schoolkeuze" */
  const STEPS = [
    { n: 1, title: 'Waar word je blij van?', vo: 'Begin bij wat je leuk vindt', where: 'Missiebord bij huis' },
    { n: 2, title: 'Jouw schooladvies', vo: 'Aan de slag met je schooladvies', where: 'Missiebord bij huis' },
    { n: 3, title: 'Manieren van leren', vo: 'Ontdek andere stijlen van leren', where: 'Missiebord bij huis' },
    { n: 4, title: 'Schatkist vol extra’s', vo: "Bekijk de thema's en het extra aanbod", where: 'Missiebord bij huis' },
    { n: 5, title: 'Klaar voor de brugklas?', vo: 'Kijk wat je kunt verwachten', where: 'Missiebord bij huis' },
    { n: 6, title: 'Open dagen', vo: 'Open dagen bezoeken', where: 'Loop of fiets naar de scholen' }
  ];
  const VISITS_NEEDED = 3;

  function screen(body, parts) { body.innerHTML = ''; parts.forEach(p => p && body.appendChild(p)); body.scrollTop = 0; }
  // Speech bubble. Kit (Lenny's cat) shows her face; other people show a name tag.
  function say(text, who) {
    const kit = !who || who === 'Kit';
    const tag = kit
      ? h('span', { class: 'who kit' }, [h('img', { src: LQ.Sprites.kitPortrait(), alt: '', width: 48, height: 48 }), h('span', {}, 'Kit')])
      : h('span', { class: 'who' }, who);
    return h('div', { class: 'bubble' + (kit ? ' from-kit' : '') }, [tag, h('p', {}, text)]);
  }
  function next(label, fn, cls) { return h('button', { class: 'btn ' + (cls || 'primary'), onclick: () => { blip(); fn(); } }, label); }
  function row(children, cls) { return h('div', { class: 'row ' + (cls || '') }, children); }
  // "← Terug": go back one step inside a quest or challenge (27 Oct 2026)
  function back(fn) { return fn ? row([h('button', { class: 'btn ghost back', onclick: () => { blip(); fn(); } }, '← Terug')]) : null; }

  /* ---------------- STEP 1: interest cards ---------------- */
  const INTEREST_CARDS = [
    { id: 'sport', label: 'Voetbal & sport', icon: '⚽', tags: ['sport'] },
    { id: 'make', label: 'Bouwen & maken', icon: '🔧', tags: ['tech', 'crafts'] },
    { id: 'draw', label: 'Tekenen & schilderen', icon: '🎨', tags: ['arts'] },
    { id: 'music', label: 'Muziek maken', icon: '🎵', tags: ['music'] },
    { id: 'dance', label: 'Dansen', icon: '🕺', tags: ['dance'] },
    { id: 'act', label: 'Toneel & filmpjes', icon: '🎬', tags: ['theatre'] },
    { id: 'lab', label: 'Proefjes', icon: '🧪', tags: ['science'] },
    { id: 'code', label: 'Computers & games', icon: '💻', tags: ['coding'] },
    { id: 'talk', label: 'Grote vragen & debatteren', icon: '💬', tags: ['debate'] },
    { id: 'world', label: 'Engels & reizen', icon: '🌍', tags: ['english', 'international'] },
    { id: 'myth', label: 'Mythen & geheimschrift', icon: '🏛️', tags: ['classics'] },
    { id: 'nature', label: 'Natuur & dieren', icon: '🌳', tags: ['nature'] }
  ];
  function step1(body, ctx) {
    const picked = new Set((ctx.state.answers.interests || []).map(c => c.id));
    const count = h('p', { class: 'hint' }, '');
    const go = next('Klaar!', () => {
      ctx.state.answers.interests = INTEREST_CARDS.filter(c => picked.has(c.id));
      ctx.finish('Mooi! Nu weet ik wat jij leuk vindt.');
    });
    const upd = () => { count.textContent = `${picked.size} van de 4 gekozen`; go.disabled = picked.size === 0; };
    const grid = h('div', { class: 'cards' }, INTEREST_CARDS.map(c => {
      const b = h('button', { class: 'card' + (picked.has(c.id) ? ' on' : ''), 'aria-pressed': picked.has(c.id) ? 'true' : 'false', onclick: () => {
        if (picked.has(c.id)) picked.delete(c.id); else if (picked.size < 4) picked.add(c.id); else return;
        blip(); b.classList.toggle('on', picked.has(c.id)); b.setAttribute('aria-pressed', picked.has(c.id)); upd();
      } }, [h('span', { class: 'ic' }, c.icon), h('span', {}, c.label)]);
      return b;
    }));
    screen(body, [say('We beginnen bij JOU. Wat zou je de hele dag kunnen doen? Kies tot 4 dingen.'), grid, count, row([go])]);
    upd();
  }

  /* ---------------- STEP 2: school advice + Latin taster ---------------- */
  function step2(body, ctx) {
    const qs = [
      { w: 'aqua', opts: ['water', 'banaan', 'schoen'], a: 0 },
      { w: 'mater', opts: ['meter', 'moeder', 'materie'], a: 1 },
      { w: 'schola', opts: ['scooter', 'schelp', 'school'], a: 2 }
    ];
    let qi = 0;
    function intro() {
      screen(body, [
        say('Je leerkracht gaf je een vwo-advies. Gaaf!'),
        h('div', { class: 'info' }, [
          h('p', {}, 'Het vwo duurt 6 jaar. Daarna kun je naar de universiteit.'),
          h('p', {}, 'Er zijn twee soorten vwo:'),
          h('ul', {}, [h('li', {}, [h('b', {}, 'Atheneum'), ' — vwo met alle gewone vakken.']), h('li', {}, [h('b', {}, 'Gymnasium'), ' — vwo plus Latijn en Grieks, twee oude talen.'])]),
          h('p', {}, 'Goed nieuws: elke school op jouw kaart heeft vwo.')
        ]),
        row([next('Probeer wat Latijn!', quiz)])
      ]);
    }
    function quiz() {
      const q = qs[qi];
      const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
      const opts = h('div', { class: 'opts' }, q.opts.map((o, i) => h('button', { class: 'btn', onclick: (e) => {
        [...opts.children].forEach(b => b.disabled = true);
        e.currentTarget.classList.add(i === q.a ? 'good' : 'meh');
        fb.textContent = i === q.a ? `Ja! "${q.w}" betekent ${q.opts[q.a]}.` : `Goed geprobeerd! "${q.w}" betekent ${q.opts[q.a]}.`;
        blip(i === q.a ? 'win' : 'blip');
        body.appendChild(row([next(qi < qs.length - 1 ? 'Volgend woord' : 'Verder', () => { qi++; qi < qs.length ? quiz() : ask(); })]));
      } }, o)));
      screen(body, [say(`Geheime code ${qi + 1} van 3. Wat betekent dit Latijnse woord?`), h('div', { class: 'bigword' }, q.w), opts, fb]);
    }
    function ask() {
      const labels = ['Super!', 'Misschien', 'Niks voor mij'];
      screen(body, [say('Latijn en Grieks leren op een gymnasium klinkt...'),
        h('div', { class: 'opts' }, labels.map((l, i) => next(l, () => { ctx.state.answers.latin = i; ctx.finish(['Super! Gymnasia krijgen een bonus.', 'Oké! We houden beide soorten open.', 'Geen probleem! Atheneum is ook top.'][i]); }, 'big')))]);
    }
    intro();
  }

  /* ---------------- STEP 3: learning style scenarios ---------------- */
  const STYLE_QS = [
    { q: 'Nieuw project op school! Wat vind je het leukst?', o: [['De leraar legt het uit, daarna gaan we oefenen.', 'regular'], ['Ik krijg een weekplan en bepaal zelf wanneer ik wat doe.', 'dalton'], ['Ik kies mijn eigen onderwerp en werk in mijn eigen tempo.', 'montessori'], ['We maken het met onze handen: tekenen, bouwen, muziek maken.', 'vrijeschool']] },
    { q: 'Het is vrije werktijd. Jij...', o: [['wilt duidelijke opdrachten van de leraar.', 'regular'], ['plant je eigen huiswerk.', 'dalton'], ['kiest iets waar je nieuwsgierig naar bent.', 'montessori'], ['gaat schilderen, knutselen of tuinieren.', 'vrijeschool']] },
    { q: 'Hoe werk jij het liefst?', o: [['In de klas, allemaal samen.', 'regular'], ['Met een maatje, volgens mijn plan.', 'dalton'], ['Alleen, met een leraar in de buurt.', 'montessori'], ['In een groepje, iets creatiefs maken.', 'vrijeschool']] }
  ];
  function step3(body, ctx) {
    const ans = []; let i = 0;
    function show() {
      const q = STYLE_QS[i];
      screen(body, [say(`Leerlab ${i + 1} van 3. ${q.q}`), h('div', { class: 'opts col' }, shuffle(q.o).map(([t, c]) => next(t, () => { ans[i] = c; i++; i < STYLE_QS.length ? show() : end(); }, 'big left'))), back(i > 0 ? () => { i--; show(); } : null)]);
    }
    function end() {
      ctx.state.answers.style = ans;
      const counts = {}; ans.forEach(c => counts[c] = (counts[c] || 0) + 1);
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const text = { regular: 'Jij houdt van duidelijke lessen. De meeste scholen geven zo les.', dalton: 'Jij houdt van plannen. Dat klinkt als Dalton!', montessori: 'Jij houdt van zelf kiezen. Dat klinkt als Montessori!', vrijeschool: 'Jij houdt van dingen maken. Dat klinkt als een vrijeschool!' }[top];
      ctx.finish(text);
    }
    show();
  }

  /* ---------------- STEP 4: treasure chests of extras ---------------- */
  const EXTRAS = [
    ['tech', 'Technasium', 'Echte problemen oplossen in een team. Ontwerpen en bouwen!', '🛠️'],
    ['coding', 'Programmeren', 'Laat computers en robots doen wat jij zegt.', '🤖'],
    ['english', 'Lessen in het Engels', 'Biologie of geschiedenis... in het Engels!', '🗣️'],
    ['international', 'Reizen naar het buitenland', 'Uitwisselingen en schoolreizen naar andere landen.', '✈️'],
    ['theatre', 'Toneel', 'Acteren, voorstellingen en films maken.', '🎭'],
    ['music', 'Muziek', 'Bandjes, zingen en instrumenten.', '🎸'],
    ['dance', 'Dans', 'Elke week veel danslessen.', '🕺'],
    ['sport', 'Sport', 'Extra sport, teams en toernooien.', '🏅'],
    ['debate', 'Debatteren & quizzen', 'Praten over grote ideeën, meedoen aan wedstrijden.', '🏆'],
    ['arts', 'Kunstatelier', 'Schilderen, tekenen, beeldhouwen.', '🖌️'],
    ['science', 'Scienceslab', 'Proefjes en wetenschapswedstrijden.', '🔬']
  ];
  function step4(body, ctx) {
    const res = Object.assign({}, ctx.state.answers.extras || {}); let i = 0;
    function show() {
      const [tag, name, desc, icon] = EXTRAS[i];
      const chest = h('button', { class: 'chest', 'aria-label': 'Open de kist' }, [h('span', { class: 'lid' }), h('span', { class: 'box' })]);
      const reveal = h('div', { class: 'reveal', hidden: true }, [h('div', { class: 'ic big' }, icon), h('h3', {}, name), h('p', {}, desc),
        h('div', { class: 'opts' }, [['Super!', 0], ['Leuk', 1], ['Mwah', 2]].map(([l, v]) => next(l, () => { res[tag] = v; i++; if (i < EXTRAS.length) show(); else { ctx.state.answers.extras = res; ctx.finish('Schat verzameld! Ik weet nu welke extra’s jij leuk vindt.'); } }, 'big')))]);
      chest.onclick = () => { blip('win'); chest.classList.add('open'); setTimeout(() => { chest.hidden = true; reveal.hidden = false; }, 380); };
      screen(body, [say(`Kist ${i + 1} van ${EXTRAS.length}. Tik om te openen!`), h('div', { class: 'center' }, [chest, reveal]), back(i > 0 ? () => { i--; show(); } : null)]);
    }
    show();
  }

  /* ---------------- STEP 5: what to expect (size, travel, friends, then the coin game) ---------------- */
  function step5(body, ctx) {
    const a = ctx.state.answers;
    function size() {
      const o = [['Een knusse school waar iedereen je kent', 'small'], ['Niet te groot, niet te klein', 'medium'], ['Een grote, drukke school waar veel gebeurt', 'big'], ['Maakt me niet uit', 'any']];
      screen(body, [say('Middelbare scholen zijn groter dan je school nu. Wat voelt goed?'),
        h('div', { class: 'opts col' }, o.map(([t, v]) => next(t, () => { a.size = v; travel(); }, 'big left')))]);
    }
    function travel() {
      const modes = h('div', { class: 'opts' }, [['🚲 Met de fiets', 'bike'], ['🚶 Lopend', 'walk']].map(([t, m]) => h('button', { class: 'btn big' + (ctx.state.mode === m ? ' on' : ''), onclick: (e) => { blip(); ctx.setMode(m); [...modes.children].forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, t)));
      screen(body, [say('Hoe ga je naar school? En hoe lang is oké?'), modes,
        h('p', { class: 'hint' }, 'Langste reis die nog prima voelt:'),
        h('div', { class: 'opts' }, [10, 15, 20, 30].map(mn => next(mn + ' min', () => { a.maxMin = mn; friends(); }, 'big'))), back(size)]);
    }
    function friends() {
      const sel = new Set(a.friends || []);
      const chips = h('div', { class: 'chips' }, ctx.data.schools.map(s => {
        const c = h('button', { class: 'chip' + (sel.has(s.id) ? ' on' : ''), 'aria-pressed': sel.has(s.id) ? 'true' : 'false', onclick: () => { blip(); sel.has(s.id) ? sel.delete(s.id) : sel.add(s.id); c.classList.toggle('on', sel.has(s.id)); c.setAttribute('aria-pressed', sel.has(s.id)); } }, s.short);
        return c;
      }));
      screen(body, [say('Denken vrienden aan een school? Tik ze aan. Weet je het niet? Tik dan gewoon op Klaar.'), chips,
        row([next('Klaar!', () => { a.friends = [...sel]; coins(); })]), back(() => { a.friends = [...sel]; travel(); })]);
    }
    // Last part of step 5: Lenny decides what matters most (these coins are the real weights).
    function coins() {
      LQ.Coins.play(body, ctx.state, () => ctx.finish('Brugklas, here I come! Ga nu de scholen ontdekken.'), { back: friends });
    }
    size();
  }

  const STEP_FNS = { 1: step1, 2: step2, 3: step3, 4: step4, 5: step5 };

  /* =================== SCHOOL MINI-GAMES =================== */
  function gameChoose(body, ch, done) {
    screen(body, [say(ch.intro), h('div', { class: 'opts col' }, ch.options.map(([t, resp, tags]) => next(t, () => {
      blip('win');
      // the pick tells the game something about Lenny (see ui.js > schoolVisit)
      screen(body, [say(resp), h('p', { class: 'info' }, ch.outro), row([next('Verder', () => done({ picked: tags || [] }))])]);
    }, 'big left')))]);
  }

  function gameMatch(body, ch, done) {
    const left = ch.pairs.map(p => p[0]), right = shuffle(ch.pairs.map(p => p[1]));
    let selL = null, made = 0;
    const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
    const L = h('div', { class: 'mcol' }), Rr = h('div', { class: 'mcol' });
    left.forEach(w => { const b = h('button', { class: 'btn tile' }, w); b.onclick = () => { if (b.disabled) return; [...L.children].forEach(x => x.classList.remove('sel')); b.classList.add('sel'); selL = b; blip(); }; L.appendChild(b); });
    right.forEach(w => { const b = h('button', { class: 'btn tile' }, w); b.onclick = () => {
      if (!selL || b.disabled) { fb.textContent = 'Tik eerst op een woord links.'; return; }
      const pair = ch.pairs.find(p => p[0] === selL.textContent);
      if (ch.free || pair[1] === w) {
        selL.disabled = b.disabled = true; selL.classList.remove('sel'); selL.classList.add('good'); b.classList.add('good');
        if (ch.free) selL.textContent += ' → ' + w;
        selL = null; made++; blip('win'); fb.textContent = ch.free ? 'Gepland!' : 'Match!';
        if (made === ch.pairs.length) body.appendChild(h('div', {}, [h('p', { class: 'info' }, ch.outro), row([next('Verder', done)])]));
      } else { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); fb.textContent = 'Die niet. Probeer een andere!'; }
    }; Rr.appendChild(b); });
    screen(body, [say(ch.intro), h('div', { class: 'match' }, [L, Rr]), fb]);
  }

  function gameRobot(body, ch, done) {
    const N = 5, rocks = ['1,3', '2,1', '3,3', '1,1'], start = [0, 4], goal = [4, 0];
    let prog = [], tries = 0, running = false;
    const grid = h('div', { class: 'robot-grid', role: 'img', 'aria-label': 'Robotveld' });
    const cells = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = h('div', { class: 'rc' + (rocks.includes(x + ',' + y) ? ' rock' : '') + (x === goal[0] && y === goal[1] ? ' goal' : '') }); cells.push(c); grid.appendChild(c); }
    const bot = h('div', { class: 'bot' }); grid.appendChild(bot);
    const place = (x, y) => { bot.style.transform = `translate(${x * 100}%, ${y * 100}%)`; };
    place(...start);
    const progEl = h('div', { class: 'prog', 'aria-live': 'polite' });
    const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
    const draw = () => { progEl.textContent = prog.length ? prog.join(' ') : 'Tik op pijltjes om je code te bouwen'; };
    const ARR = { '↑': [0, -1], '↓': [0, 1], '←': [-1, 0], '→': [1, 0] };
    const pad = h('div', { class: 'opts' }, Object.keys(ARR).map(k => h('button', { class: 'btn arrow', 'aria-label': 'Voeg toe: ' + k, onclick: () => { if (running || prog.length >= 12) return; prog.push(k); blip(); draw(); } }, k)));
    const run = () => {
      if (running || !prog.length) return; running = true; tries++;
      let [x, y] = start, i = 0; place(x, y);
      const tick = () => {
        if (i >= prog.length) { running = false; return fail(x, y); }
        const [dx, dy] = ARR[prog[i++]], nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || rocks.includes(nx + ',' + ny)) { running = false; bot.classList.add('shake'); setTimeout(() => bot.classList.remove('shake'), 400); return fail(x, y, true); }
        x = nx; y = ny; place(x, y); blip();
        if (x === goal[0] && y === goal[1]) { running = false; blip('win'); fb.textContent = 'Gelukt! De robot heeft de ster!'; body.appendChild(row([next('Verder', done)])); return; }
        setTimeout(tick, 380);
      };
      setTimeout(tick, 200);
    };
    const fail = (x, y, bump) => {
      fb.textContent = bump ? 'Boink! Een steen of een muur. Verander je code en probeer opnieuw.' : 'Bijna! Voeg meer pijltjes toe.';
      if (tries >= 2) fb.textContent += ' Tip: probeer ↑ ↑ ↑ ↑ → → → →';
    };
    screen(body, [say(ch.intro), grid, progEl, pad, row([h('button', { class: 'btn', onclick: () => { prog = []; draw(); place(...start); fb.textContent = ''; } }, 'Wissen'), next('Start ▶', run), h('button', { class: 'btn ghost', onclick: done }, 'Overslaan')]), fb]);
    draw();
  }

  function gameRhythm(body, ch, done) {
    const beats = ch.beats || 10; let n = 0, hits = 0, lit = 0, timer = null;
    const circle = h('div', { class: 'beat' });
    const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, 'Maak je klaar...');
    const drum = h('button', { class: 'btn drum', 'aria-label': 'Tik op de trommel' }, '🥁 TIK');
    drum.onclick = () => { if (!lit) { blip(); return; } if (Date.now() - lit < 450) { hits++; lit = 0; circle.classList.add('hit'); blip('win'); fb.textContent = `Raak: ${hits}`; } };
    const beat = () => {
      if (n >= beats) { clearInterval(timer); circle.classList.remove('on'); fb.textContent = `Je raakte ${hits} van de ${beats} tikken! ${hits >= beats * 0.6 ? 'Goed ritme!' : 'Leuk, toch?'}`; body.appendChild(h('div', {}, [h('p', { class: 'info' }, ch.outro), row([next('Verder', done)])])); return; }
      n++; circle.classList.remove('hit'); circle.classList.add('on'); lit = Date.now();
      setTimeout(() => circle.classList.remove('on'), 300);
    };
    screen(body, [say(ch.intro), h('div', { class: 'center' }, [circle]), row([drum]), fb]);
    setTimeout(() => { timer = setInterval(beat, 800); }, 900);
    return () => clearInterval(timer);
  }

  function gameQuizAuto(body, s, done, ctx) {
    const round = (v) => v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 50) * 50;
    const mode = ctx.state.mode, mins = mode === 'walk' ? s.walkMin : s.bikeMin;
    const near = (v, a, b) => shuffle([v, a, b]);
    const qs = [
      { q: `Hoeveel leerlingen zitten er op ${s.short}?`, opts: near(round(s.pupils), round(s.pupils * 0.45), round(s.pupils * 1.8)).map(v => '~' + v.toLocaleString('nl')), a: '~' + round(s.pupils).toLocaleString('nl') },
      { q: `Hoe lang ${mode === 'walk' ? 'loop' : 'fiets'} je ernaartoe vanaf huis?`, opts: near(mins, Math.max(3, Math.round(mins / 2.5)), mins * 2 + 5).map(v => v + ' min'), a: mins + ' min' },
      { q: 'Hoe ver is het van je huis?', opts: near(s.distanceKm, Math.round(s.distanceKm * 4) / 10, Math.round(s.distanceKm * 22) / 10).map(v => v + ' km'), a: s.distanceKm + ' km' }
    ];
    let i = 0;
    function show() {
      const q = qs[i], fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
      const opts = h('div', { class: 'opts' }, q.opts.map(o => h('button', { class: 'btn big', onclick: (e) => {
        [...opts.children].forEach(b => b.disabled = true);
        const ok = o === q.a; e.currentTarget.classList.add(ok ? 'good' : 'meh'); blip(ok ? 'win' : 'blip');
        fb.textContent = ok ? 'Ja! Precies goed.' : `Goed geprobeerd! Het is ${q.a}.`;
        body.appendChild(row([next(i < qs.length - 1 ? 'Verder' : 'Klaar', () => { i++; i < qs.length ? show() : done(); })]));
      } }, o)));
      screen(body, [say(`Raadvraag ${i + 1} van 3. ${q.q}`), opts, fb]);
    }
    show();
  }

  function runSchoolGame(body, s, ctx, done) {
    const ch = s.challenge || { type: 'quizAuto' };
    if (ch.type === 'choose') return gameChoose(body, ch, done);
    if (ch.type === 'match') return gameMatch(body, ch, done);
    if (ch.type === 'robot') return gameRobot(body, ch, done);
    if (ch.type === 'rhythm') return gameRhythm(body, ch, done);
    return gameQuizAuto(body, s, done, ctx);
  }

  return { back, STEPS, STEP_FNS, VISITS_NEEDED, INTEREST_CARDS, EXTRAS, runSchoolGame, say, screen, next, row };
})();
