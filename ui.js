/* =====================================================================
   UI — everything outside the map: top bar, panels, quest board,
   school visits, passport, results podium, parent info, sound.
   Reads/writes the shared game object LQ.Game (see main.js).
   ===================================================================== */
window.LQ = window.LQ || {};

/* Tiny DOM helper: h('div', {class:'x', onclick:fn}, [children | 'text']) */
LQ.h = function (tag, attrs, kids) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'hidden') el.hidden = !!v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  });
  (Array.isArray(kids) ? kids : kids == null ? [] : [kids]).forEach(c => { if (c == null || c === false) return; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
  return el;
};

/* ---------------- Sound (off by default) ---------------- */
LQ.Sound = (function () {
  let ac = null;
  function play(kind) {
    const G = LQ.Game; if (!G || !G.state.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'win' ? [660, 880, 1320] : kind === 'fanfare' ? [523, 659, 784, 1046] : [520];
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.09;
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.13);
      });
    } catch (e) { /* audio not available */ }
  }
  return { play };
})();

LQ.UI = (function () {
  const h = LQ.h;
  const $ = (id) => document.getElementById(id);
  const G = () => LQ.Game;
  const C = () => LQ.Challenges;
  let cleanup = null;

  /* ---------------- Panel (modal) ---------------- */
  function openPanel(title, opts) {
    opts = opts || {};
    closePanel(true);
    const panel = $('panel'), body = $('panel-body');
    $('panel-title').textContent = title;
    panel.className = 'panel' + (opts.wide ? ' wide' : '') + (opts.cls ? ' ' + opts.cls : '');
    $('panel-close').hidden = !!opts.noClose;
    body.innerHTML = '';
    $('veil').hidden = false;
    $('toast').hidden = true; $('action').hidden = true;
    G().paused = true;
    panel.onclose = opts.onClose || null;
    setTimeout(() => { const f = body.querySelector('button,a') || $('panel-close'); f && f.focus({ preventScroll: true }); }, 30);
    return body;
  }
  function closePanel(silent) {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    const panel = $('panel');
    if ($('veil').hidden) return;
    $('veil').hidden = true;
    if (G()) { G().paused = false; if (G().activeScene) G().activeScene.nearT = undefined; }
    const cb = panel.onclose; panel.onclose = null;
    if (!silent && cb) cb();
    hud();
  }

  function toast(text) {
    const t = $('toast'); t.textContent = text; t.hidden = false; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------------- HUD ---------------- */
  function stepsDone() { return C().STEPS.filter(s => isDone(s.n)).length; }
  function visitsCount() { return Object.values(G().state.visits).filter(v => v.done).length; }
  function isDone(n) { return n === 6 ? visitsCount() >= C().VISITS_NEEDED : !!G().state.steps[n]; }
  function readyForResults() { return [1, 2, 3, 4, 5].every(n => G().state.steps[n]) && visitsCount() >= C().VISITS_NEEDED; }

  function hud() {
    const st = G().state;
    const pips = $('pips'); pips.innerHTML = '';
    C().STEPS.forEach(s => pips.appendChild(h('span', { class: 'pip' + (isDone(s.n) ? ' on' : ''), title: `Stap ${s.n}: ${s.title}` }, String(s.n))));
    $('btn-mode').querySelector('.i').textContent = st.mode === 'bike' ? '🚲' : '🚶';
    $('btn-mode').querySelector('.lbl').textContent = st.mode === 'bike' ? 'Fiets' : 'Lopen';
    $('btn-mode').setAttribute('aria-label', st.mode === 'bike' ? 'Reizen: met de fiets. Tik om te lopen.' : 'Reizen: lopend. Tik om te fietsen.');
    $('btn-sound').querySelector('.i').textContent = st.sound ? '🔊' : '🔇';
    $('btn-sound').setAttribute('aria-label', st.sound ? 'Muziek en geluid aan. Tik om uit te zetten.' : 'Muziek en geluid uit. Tik om aan te zetten.');
    $('btn-sound').title = st.sound ? 'Muziek aan' : 'Muziek uit';
    if (LQ.Music) LQ.Music.sync();
    $('btn-results').classList.toggle('glow', readyForResults() && !st.revealed);
    $('stamps').textContent = `${visitsCount()}/${G().data.schools.length}`;
  }

  /* ---------------- Proximity prompt ---------------- */
  function near(target, chipText) {
    const act = $('action'), chip = $('near');
    const setChip = (t) => { chip.hidden = !t; if (t) chip.textContent = t; };
    if (!target) { act.hidden = true; setChip(chipText); return; }
    act.hidden = false; act.textContent = target.label;
    act.onclick = () => { LQ.Sound.play(); target.open(); };
    if (target.school) {
      const s = target.school, m = G().state.mode;
      const off = S().blockedBy(s, G().state).length > 0;
      setChip(`${s.short} · ${s.distanceKm} km van huis · ${m === 'bike' ? '🚲 ' + s.bikeMin : '🚶 ' + s.walkMin} min` + (s.interior ? ' · 🚪 je kunt naar binnen!' : '') + (off ? ' · niet op de route van dit avontuur' : ''));
    } else setChip(chipText);
  }

  /* ---------------- Inside a school: things to look at, guides ---------------- */
  function infoPanel(info) {
    if (info.sprite === 'npc') {
      const body = openPanel(`${info.name} · ${info.role}`);
      let i = 0;
      const last = () => i === info.lines.length - 1;
      // The guide ends with the same comparable facts every school has (27 Oct 2026).
      const show = () => C().screen(body, [C().say(info.lines[i], info.name), i === 0 && G().inside ? photoBlock(G().inside) : null, last() && G().inside ? compareBlock(G().inside) : null,
        C().row([last() ? C().next('Op ontdekkingstocht!', () => closePanel()) : C().next('Verder', () => { i++; show(); })])]);
      show();
      return;
    }
    const body = openPanel(info.title);
    C().screen(body, [h('div', { class: 'center' }, [h('div', { class: 'ic big', 'aria-hidden': 'true' }, info.icon || '📌')]), h('p', { class: 'info' }, info.text), C().row([info.link ? h('a', { class: 'btn primary', href: info.link, target: '_blank', rel: 'noopener' }, info.linkLabel || 'Openen ↗') : null, h('button', { class: info.link ? 'btn' : 'btn primary', onclick: () => closePanel() }, info.link ? 'Terug naar het spel' : 'Snap ik!')])]);
  }

  const REACT_FACE = ['😍', '🙂', '😐'];
  /* Leaving a school with an inside: recap + how does it feel? */
  function feelPanel(s, after) {
    const body = openPanel(`${s.short} verlaten`, { noClose: true });
    const v = G().state.visits[s.id] || {}, st = v.stations || {};
    const recap = h('ul', { class: 'facts' }, Object.entries(s.interior.stations).map(([k, x]) => h('li', {}, `${st[k] ? REACT_FACE[st[k].react] : '·'} ${x.title}${st[k] ? '' : ' (niet gespeeld)'}`)));
    const guide = Object.values(s.interior.info || {}).find(i => i.sprite === 'npc');
    C().screen(body, [C().say(`Voor je gaat: hoe voelt ${s.short} voor jou? Elk antwoord is goed.`, guide ? guide.name : 'Kit'), h('div', { class: 'info' }, [h('b', {}, 'Jouw opdrachten hier:'), recap]),
      h('div', { class: 'opts col' }, [['❤️ Super leuk!', 0], ['🙂 Best leuk', 1], ['😐 Niet echt iets voor mij', 2]].map(([l, k]) => C().next(l, () => stampVisit(s, k, body, after), 'big left'))),
      C().row([h('button', { class: 'btn ghost', onclick: () => { closePanel(true); after && after(); } }, 'Weet ik nog niet, gewoon weggaan')])]);
  }
  function stampVisit(s, k, body, after) {
    const first = !(G().state.visits[s.id] && G().state.visits[s.id].done);
    G().state.visits[s.id] = Object.assign(G().state.visits[s.id] || {}, { done: true, heart: k });
    G().save(); hud(); G().refreshStamps();
    LQ.Sound.play('win');
    const left = Math.max(0, C().VISITS_NEEDED - visitsCount());
    const od = (s.openDays || []).filter(o => o.date >= todayISO());
    C().screen(body, [h('div', { class: 'stampmark', style: `--c:${s.roof}` }, [h('small', {}, 'OPEN DAG'), h('b', {}, s.short), h('small', {}, 'BEZOCHT')]),
      C().say(first ? (left ? `Stempel verdiend! Nog ${left} ${left > 1 ? 'scholen' : 'school'} te bezoeken.` : 'Stempel verdiend! Je kunt nu je top 3 zien bij het gouden podium.') : 'Gevoel bijgewerkt!'),
      od.length ? h('p', { class: 'info' }, `Echte open dag: ${fmtDate(od[0].date)} (${od[0].label}). Vraag het aan je ouders!`) : h('p', { class: 'info' }, 'Wil je de echte school zien? Vraag je ouders om de open dagen op te zoeken.'),
      C().row([C().next(after ? 'Weer naar buiten' : 'OK', () => { closePanel(true); after && after(); })])]);
    if (readyForResults() && !G().state.revealed) toast('Het gouden podium is klaar!');
  }

  /* ---------------- Intro with Kit ---------------- */
  function intro() {
    const body = openPanel('Hoi Lenny!', { noClose: true });
    const pages = [
      ['Hoi Lenny! Ik ben het, Kit, je kat! Ik sluip door de hele buurt, dus ik ken elke school hier.', null],
      ['Een nieuwe school kiezen voelt soms best groot. Wij maken er een spel van. Er zijn geen foute antwoorden!', null],
      ['Speel de 5 missies op het houten bord naast je huis. Bezoek daarna minstens 3 scholen op de kaart.', null],
      ['Je familie heeft een paar regels gekozen voor dit avontuur. De rest bepaal jij!', null],
      ['Aan het eind laat het gouden podium je top 3 scholen zien. Hoe wil je reizen?', 'mode']
    ];
    let i = 0;
    function show() {
      const [t, kind] = pages[i];
      const kids = [C().say(t)];
      if (kind === 'mode') kids.push(h('div', { class: 'opts' }, [['🚲 Met de fiets', 'bike'], ['🚶 Lopend', 'walk']].map(([l, m]) => C().next(l, () => { G().setMode(m); G().state.introDone = true; G().save(); closePanel(); toast('Tip: loop naar het houten bord naast je huis!'); }, 'big'))));
      else kids.push(C().row([C().next('Verder', () => { i++; show(); })]));
      C().screen(body, kids);
    }
    show();
  }

  /* ---------------- Quest board ---------------- */
  function questBoard() {
    const body = openPanel('Missiebord', { wide: true });
    const list = h('div', { class: 'quests' }, C().STEPS.map(s => {
      const done = isDone(s.n);
      const sub = s.n === 6 ? `${visitsCount()} van de ${C().VISITS_NEEDED} scholen bezocht` : (done ? 'Klaar! Speel opnieuw om je antwoorden te veranderen.' : 'Tik om te spelen');
      return h('button', { class: 'quest' + (done ? ' done' : ''), onclick: () => { LQ.Sound.play(); s.n === 6 ? schoolList() : runStep(s.n); } }, [
        h('span', { class: 'qn' }, done ? '★' : String(s.n)),
        h('span', { class: 'qt' }, [h('b', {}, s.title), h('small', {}, sub), h('em', {}, 'VO Gids: ' + s.vo)])
      ]);
    }));
    const kids = [C().say(readyForResults() ? 'Alle missies klaar! Ga naar het gouden podium naast je huis.' : 'Doe de missies in welke volgorde je wilt. Elke missie geeft je een ster.'), likesBar(), list];
    if (readyForResults()) kids.push(C().row([C().next('Laat mijn top 3 zien!', () => results(true))]));
    C().screen(body, kids);
  }

  function runStep(n) {
    const s = C().STEPS.find(x => x.n === n);
    const body = openPanel(`Stap ${n}: ${s.title}`);
    const hadLikes = S().likes(prof()).length > 0;
    const ctx = {
      state: G().state, data: G().data,
      setMode: (m) => G().setMode(m),
      finish: (msg) => {
        const first = !G().state.steps[n];
        G().state.steps[n] = true; G().save(); hud(); G().refreshStamps();
        LQ.Sound.play('win');
        C().screen(body, [h('div', { class: 'starburst' }, '★'), C().say(msg + (first ? ' Je hebt een ster verdiend!' : ' Antwoorden bijgewerkt.')),
          C().row([C().next('Terug naar het bord', questBoard), h('button', { class: 'btn ghost', onclick: () => closePanel() }, 'De kaart verkennen')])]);
        if (readyForResults() && !G().state.revealed) toast('Het gouden podium is klaar!');
        else if ((n === 1 || n === 4) && !hadLikes && S().likes(prof()).length) toast('Kijk op de kaart! Scholen met jouw icoontjes hebben dingen die jij leuk vindt.');
      }
    };
    C().STEP_FNS[n](body, ctx);
  }

  /* ---------------- School list (step 6) ---------------- */
  function schoolList() {
    const body = openPanel('Open dagen: scholen bezoeken', { wide: true });
    const m = G().state.mode;
    const sorted = G().data.schools.slice().sort((a, b) => a.distanceKm - b.distanceKm);
    const pp = prof();
    C().screen(body, [C().say(`Bezoek minstens ${C().VISITS_NEEDED} scholen. Tik er een aan en ik wijs je de weg. Loop dan door de deur naar binnen!`),
      h('div', { class: 'slist' }, sorted.map(s => {
        const v = G().state.visits[s.id];
        return h('button', { class: 'srow' + (v && v.done ? ' done' : ''), onclick: () => { closePanel(); G().goTo(s.id); toast(`Op naar ${s.short}!`); } }, [
          h('span', { class: 'roof', style: `background:${s.roof}` }), h('span', { class: 'sn' }, [h('b', {}, s.short), h('small', {}, `${s.distanceKm} km · ${m === 'bike' ? '🚲 ' + s.bikeMin : '🚶 ' + s.walkMin} min`), (() => { const mm = S().matchedLikes(s, pp); return mm.length ? h('small', { class: 'hasmatch' }, 'Heeft wat jij leuk vindt: ' + mm.slice(0, 3).map(t => S().LIKE_ICONS[t]).join(' ')) : null; })()]),
          h('span', { class: 'st' }, v && v.done ? ['❤️', '🙂', '😐'][v.heart] || '✓' : 'Ga ›')
        ]);
      }))]);
  }

  /* ---------------- Likes helpers ---------------- */
  const S = () => LQ.Scoring;
  const prof = () => S().profileFrom(G().state);
  function words(tags) { const w = tags.map(t => S().TAG_WORDS[t]); return w.length > 1 ? w.slice(0, -1).join(', ') + ' en ' + w[w.length - 1] : w[0]; }
  // Row of icon chips. `on` = tags to highlight (things Lenny likes).
  function likeChips(tags, on) {
    on = on || [];
    return h('div', { class: 'likes' }, tags.map(t => h('span', { class: 'like' + (on.includes(t) ? ' on' : '') }, S().likeLabel(t))));
  }
  function likesBar() {
    const l = S().likes(prof());
    if (!l.length) return h('p', { class: 'hint' }, 'Je lijstje met dingen die je leuk vindt is nog leeg. Speel missie 1 en 4 om het te vullen!');
    return h('div', { class: 'likesbar' }, [h('b', {}, 'Wat jij leuk vindt: '), likeChips(l, l), h('small', {}, 'Zoek deze icoontjes op de kaart!')]);
  }
  // What Kit says when Lenny walks into a school: links his likes to this school and its game.
  /* ---------------- Same facts for every school, with context (27 Oct 2026) ----------------
     A number alone says nothing to Lenny ("is 8:30 early?"), so each line compares
     the school with the other schools on the map. Unknown = ask at the open day. */
  const ASK = '❓ Nog niet gevonden. Vraag het op de open dag!';
  function compareRows(s) {
    const all = G().data.schools, c = s.compare || {}, m = G().state.mode;
    const mins = (x) => m === 'walk' ? x.walkMin : x.bikeMin;
    const sortedP = all.map(x => x.pupils).sort((a, b) => a - b), sortedT = all.map(mins).sort((a, b) => a - b);
    const third = (arr, v) => { const i = arr.indexOf(v); return i < arr.length / 3 ? 0 : i < arr.length * 2 / 3 ? 1 : 2; };
    const rows = [];
    rows.push(['👥', 'Leerlingen', `ongeveer ${s.pupils.toLocaleString('nl')}`, ['een van de kleinere scholen', 'een middelgrote school', 'een van de grootste scholen'][third(sortedP, s.pupils)]]);
    rows.push([m === 'walk' ? '🚶' : '🚲', 'Reistijd', `${mins(s)} min (${s.distanceKm} km)`, ['dichtbij, vergeleken met de andere scholen', 'niet dichtbij, niet ver', 'een van de verste'][third(sortedT, mins(s))]]);
    if (c.start) {
      const [hh, mm] = c.start.split(':').map(Number), t = hh * 60 + mm;
      rows.push(['⏰', 'Eerste les', c.start + (c.startNote ? ` (${c.startNote})` : ''), t < 510 ? 'vroeg: de meeste scholen beginnen om 8:30' : t === 510 ? 'zoals de meeste scholen' : 'later dan de meeste scholen (die beginnen om 8:30)']);
    } else rows.push(['⏰', 'Eerste les', ASK, '']);
    if (c.lessonMin) rows.push(['⏱️', 'Een les duurt', `${c.lessonMin} min` + (c.lessonNote ? ` ${c.lessonNote}` : ''),
      c.lessonMin <= 45 ? 'kort: meer, kortere lessen per dag' : c.lessonMin <= 50 ? 'gewoon: zoals op veel scholen' : c.lessonMin <= 60 ? 'lang: minder vakken op één dag' : 'heel lang: weinig vakken op één dag']);
    else rows.push(['⏱️', 'Een les duurt', ASK, '']);
    // Gym: compare minutes, not the number of lessons (2 x 60 min is about as much as 3 x 45 min).
    const gymMin = (x) => { const k = x.compare || {}; return k.gymLessons && k.lessonMin ? k.gymLessons * k.lessonMin : null; };
    if (c.gymNote) rows.push(['🏃', 'Gym per week', c.gymNote, c.gymExtra || '']);
    else if (c.gymLessons) {
      const tot = gymMin(s), others = all.map(gymMin).filter(v => v != null).sort((a, b) => a - b);
      const mid = others.length ? others[Math.floor(others.length / 2)] : null;
      const cmp = tot == null || mid == null ? '' : tot >= mid + 20 ? 'meer gymtijd dan op de meeste scholen' : tot <= mid - 30 ? 'minder gymtijd dan op de meeste scholen' : 'ongeveer even veel gymtijd als op de meeste scholen';
      rows.push(['🏃', 'Gym per week', `${c.gymLessons} lessen` + (tot ? ` (${tot} min)` : ''), [cmp, c.gymExtra ? '➕ ' + c.gymExtra : ''].filter(Boolean).join('. ')]);
    } else rows.push(['🏃', 'Gym per week', ASK, c.gymExtra ? '➕ ' + c.gymExtra : '']);
    rows.push(['🏟️', 'Waar je sport', c.sport || ASK, '']);
    // Trips and camps (30 Oct 2026): the same two lines for every school.
    rows.push(['⛺', 'Kamp in klas 1', c.camp1 || ASK, '']);
    rows.push(['✈️', 'Reizen later', c.later || ASK, '']);
    // GSA club (30 Oct 2026): the same line for every school.
    rows.push(['🏳️‍🌈', 'GSA-club', c.gsa || ASK, c.gsaNote || '']);
    return rows;
  }
  /* ---------------- What the school looks like (30 Oct 2026) ----------------
     Every school: a real photo (Wikimedia Commons, free licence, with credit)
     when one exists, and Google Street View at the school's address to look
     around. Schools without a free photo show Street View straight away. */
  // The old Street View embed showed a world map on phones, so: a map from
  // above (always works) plus a button that opens Street View in Google Maps.
  function aerial(s) {
    return h('iframe', { class: 'sv-frame', src: `https://maps.google.com/maps?q=${s.lat},${s.lon}&t=k&z=18&output=embed`, title: `${s.short} van bovenaf`, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' });
  }
  const svLink = (s) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${s.lat},${s.lon}`;
  function photoBlock(s) {
    const p = s.photo, wrap = h('div', { class: 'photo-box' });
    const slot = h('div', { class: 'photo-slot' });
    const showAir = () => { slot.innerHTML = ''; slot.appendChild(aerial(s)); slot.appendChild(h('p', { class: 'small' }, `🛰️ ${s.short} van bovenaf, zoals een vogel het ziet. Kaart: Google.`)); if (btn) btn.textContent = '📷 Terug naar de foto'; showing = 'air'; };
    const showPhoto = () => { slot.innerHTML = ''; slot.appendChild(h('img', { class: 'school-photo', src: p.src, alt: `Het gebouw van ${s.short}` }));
      slot.appendChild(h('p', { class: 'small' }, ['Foto: ', p.credit, ' (', h('a', { href: p.page, target: '_blank', rel: 'noopener' }, p.license), '), Wikimedia Commons'])); if (btn) btn.textContent = '🛰️ Van bovenaf'; showing = 'photo'; };
    let showing = null;
    const btn = p ? h('button', { class: 'btn', onclick: () => (showing === 'photo' ? showAir() : showPhoto()) }, '') : null;
    const sv = h('a', { class: 'btn', href: svLink(s), target: '_blank', rel: 'noopener' }, '🧭 Kijk rond op straat ↗');
    [h('b', {}, `📷 Zo ziet ${s.short} eruit`), slot, C().row([btn, sv])].forEach(x => x && wrap.appendChild(x));
    p ? showPhoto() : showAir();
    return wrap;
  }

  function compareBlock(s) {
    const c = s.compare || {}, info = G().data.compareInfo || {};
    return h('div', { class: 'compare' }, [h('b', {}, '📏 Zo is het hier (vergeleken met de andere scholen)'),
      h('ul', { class: 'cmp' }, compareRows(s).map(([ic, k, v, why]) => h('li', {}, [h('span', { class: 'ci', 'aria-hidden': 'true' }, ic), h('span', {}, [h('b', {}, k + ': '), v, why ? h('small', {}, why) : null])]))),
      info.tripsNote ? h('p', { class: 'small' }, '⛺ ' + info.tripsNote) : null,
      h('p', { class: 'small' }, ['📖 Tik op een woord met stippellijntjes om te zien wat het betekent.',
        c.tripSrc ? h('br') : null, c.tripSrc ? 'Bron kamp en reizen: ' : null, c.tripSrc ? h('a', { href: c.tripSrc[1], target: '_blank', rel: 'noopener' }, c.tripSrc[0]) : null,
        c.gsaSrc ? h('br') : null, c.gsaSrc ? 'Bron GSA: ' : null, c.gsaSrc ? h('a', { href: c.gsaSrc[1], target: '_blank', rel: 'noopener' }, c.gsaSrc[0]) : null])]);
  }
  // All schools side by side, same columns for each.
  function compareAll() {
    const st = G().state, m = st.mode;
    const body = openPanel('Scholen naast elkaar', { wide: true });
    const sorted = G().data.schools.slice().sort((a, b) => (m === 'walk' ? a.walkMin - b.walkMin : a.bikeMin - b.bikeMin));
    const v = (x) => x == null ? '❓' : x;
    C().screen(body, [C().say('Dezelfde vragen voor elke school. ❓ = nog niet gevonden: vraag het op de open dag!'),
      h('div', { class: 'tablewrap' }, [h('table', { class: 'cmptable' }, [
        h('thead', {}, h('tr', {}, ['School', '👥 Leerlingen', m === 'walk' ? '🚶 min' : '🚲 min', '⏰ Begint', '⏱️ Les', '🏃 Gym', '⛺ Kamp klas 1', '🏳️‍🌈 GSA'].map(t => h('th', {}, t)))),
        h('tbody', {}, sorted.map(s => { const c = s.compare || {}; return h('tr', {}, [h('td', {}, h('b', {}, s.short)), h('td', {}, s.pupils.toLocaleString('nl')), h('td', {}, String(m === 'walk' ? s.walkMin : s.bikeMin)), h('td', {}, v(c.start)), h('td', {}, c.lessonMin ? c.lessonMin + ' min' : '❓'), h('td', {}, c.gymNote ? 'dans/muziek' : c.gymLessons ? c.gymLessons + '×' + (c.lessonMin ? ' ' + c.lessonMin + '′' : '') + (c.gymExtraShort ? ' ' + c.gymExtraShort : '') : '❓'), h('td', {}, v(c.camp1Short)), h('td', {}, c.gsa ? '✅' : '❓')]); }))])]),
      C().row([C().next('Terug', ranking)])]);
  }

  function linkLine(s) {
    const p = prof(), mine = S().likes(p), m = S().matchedLikes(s, p), off = S().offers(s);
    const game = (s.challenge && s.challenge.title) || 'Raadspel';
    if (!mine.length) return `Tip: doe eerst missie 1 en 4. Dan kan ik je vertellen of ${s.short} de dingen heeft die jij leuk vindt.`;
    if (m.length) return `Je zei dat je ${words(m.slice(0, 2))} leuk vindt. Dat heeft ${s.short}! Speel "${game}" om het te proberen.`;
    if (off.length) return `${s.short} is goed in ${words(off.slice(0, 2))}. Dat staat nog niet op je lijstje. Speel "${game}". Misschien vind je het leuk!`;
    return `Ik weet nog niet wat hier bijzonder is. Speel het raadspel en vraag ernaar op de open dag!`;
  }

  /* ---------------- School visit ---------------- */
  function schoolVisit(s) {
    if (s.interior) return insideCard(s);
    const body = openPanel(s.name, { wide: true });
    const v = G().state.visits[s.id];
    const ch = s.challenge || { type: 'quizAuto' };
    const p0 = prof(), off = S().offers(s), mineNow = S().likes(p0);
    const facts = h('div', { class: 'schoolcard' }, [
      h('div', { class: 'sc-top' }, [h('span', { class: 'roof big', style: `background:${s.roof}` }), h('div', {}, [h('p', { class: 'lead' }, s.kid),
        h('p', { class: 'meta' }, `${s.distanceKm} km van huis · 🚲 ${s.bikeMin} min · 🚶 ${s.walkMin} min · ongeveer ${s.pupils.toLocaleString('nl')} leerlingen`)])]),
      off.length ? h('div', { class: 'offers' }, [h('small', {}, 'Deze school heeft:'), likeChips(off, mineNow)]) : null,
      h('ul', { class: 'facts' }, s.facts.map(f => h('li', {}, f))),
      h('p', { class: 'meta' }, 'VWO hier: ' + s.streams.join(', '))
    ]);
    // What this visit teaches the game. Replaying replaces it (no farming points).
    let learned = { likes: {}, concept: {} };
    const addL = (t, n) => { learned.likes[t] = (learned.likes[t] || 0) + n; };
    const gameTags = ch.tags || [];
    const play = () => {
      learned = { likes: {}, concept: {} };
      C().screen(body, []);
      cleanup = C().runSchoolGame(body, s, { state: G().state }, afterGame) || null;
    };
    const afterGame = (res) => {
      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
      if (res && res.picked) res.picked.forEach(t => addL(t, 1));
      if (gameTags.length || ch.concept) fun(); else feel();
    };
    const fun = () => {
      const what = gameTags.length ? `Dat was ${words(gameTags)}.` : { dalton: 'Dat was je eigen werk plannen, zoals bij Dalton.', montessori: 'Dat was je eigen werk kiezen, zoals bij Montessori.', vrijeschool: 'Dat was leren door dingen te maken, zoals op de vrijeschool.' }[ch.concept];
      C().screen(body, [C().say(`${what} Vond je het leuk?`), gameTags.length ? likeChips(gameTags, []) : null,
        h('div', { class: 'opts col' }, [['🤩 Ja, super leuk!', 1], ['🙂 Het was oké', 0], ['😕 Niet mijn ding', -1]].map(([l, n]) => C().next(l, () => {
          gameTags.forEach(t => addL(t, n));
          if (ch.concept && n) learned.concept[ch.concept] = n > 0 ? 1 : 0;
          feel();
        }, 'big left')))]);
    };
    const feel = () => {
      C().screen(body, [C().say(`En de school zelf: hoe voelt ${s.short} voor jou? Elk antwoord is goed.`),
        h('div', { class: 'opts col' }, [['❤️ Super leuk!', 0], ['🙂 Best leuk', 1], ['😐 Niet echt iets voor mij', 2]].map(([l, k]) => C().next(l, () => stamp(k), 'big left')))]);
    };
    const changeFeel = () => { const old = G().state.visits[s.id] || {}; learned = { likes: old.likes || {}, concept: old.concept || {} }; feel(); };
    const stamp = (k) => {
      const before = S().likes(prof());
      const first = !(G().state.visits[s.id] && G().state.visits[s.id].done);
      G().state.visits[s.id] = { done: true, heart: k, likes: learned.likes, concept: learned.concept };
      G().save(); hud(); G().refreshStamps();
      LQ.Sound.play('win');
      const after = S().likes(prof());
      const gained = after.filter(t => !before.includes(t)), lost = before.filter(t => !after.includes(t));
      const plus = Object.entries(learned.likes).filter(([, n]) => n > 0).map(([t]) => t).filter(t => !gained.includes(t));
      const learnedEl = (gained.length || lost.length || plus.length) ? h('div', { class: 'learned' }, [
        h('b', {}, '🧠 Kit heeft iets over jou geleerd!'),
        gained.length ? h('div', {}, [h('small', {}, 'Nieuw op je lijstje:'), likeChips(gained, gained)]) : null,
        plus.length ? h('div', {}, [h('small', {}, 'Deze vind je nu wat leuker:'), likeChips(plus, plus)]) : null,
        lost.length ? h('div', {}, [h('small', {}, 'Van je lijstje af. Geen probleem!'), likeChips(lost, [])]) : null,
        h('small', {}, 'Scholen met deze dingen gaan omhoog in je lijstje.')
      ]) : null;
      const left = Math.max(0, C().VISITS_NEEDED - visitsCount());
      const od = (s.openDays || []).filter(o => o.date >= todayISO());
      C().screen(body, [h('div', { class: 'stampmark', style: `--c:${s.roof}` }, [h('small', {}, 'OPEN DAG'), h('b', {}, s.short), h('small', {}, 'BEZOCHT')]),
        C().say(first ? (left ? `Stempel verdiend! Nog ${left} ${left > 1 ? 'scholen' : 'school'} te bezoeken.` : 'Stempel verdiend! Je kunt nu je top 3 zien bij het gouden podium.') : 'Bijgewerkt!'),
        learnedEl,
        od.length ? h('p', { class: 'info' }, `Echte open dag: ${fmtDate(od[0].date)} (${od[0].label}). Vraag het aan je ouders!`) : h('p', { class: 'info' }, 'Wil je de echte school zien? Vraag je ouders om de open dagen op te zoeken.'),
        C().row([C().next('Terug naar de kaart', () => closePanel())])]);
      if (readyForResults() && !G().state.revealed) toast('Het gouden podium is klaar!');
    };
    const kids = [C().say(linkLine(s)), facts];
    if (v && v.done) kids.push(C().say(`Je was hier al! Je zei: ${['Super leuk', 'Best leuk', 'Niet echt iets voor mij'][v.heart]}.`));
    kids.push(C().row([C().next(v && v.done ? 'Nog een keer spelen' : `Speel: ${ch.title || 'Raadspel'}`, play), v && v.done ? h('button', { class: 'btn', onclick: changeFeel }, 'Mijn gevoel veranderen') : null]));
    C().screen(body, kids);
  }

  function insideCard(s) {
    const body = openPanel(s.name, { wide: true });
    const v = G().state.visits[s.id] || {}, st = v.stations || {};
    const inside = !!G().inside;
    const off = S().offers(s), mineNow = S().likes(prof());
    C().screen(body, [
      h('div', { class: 'schoolcard' }, [
        h('div', { class: 'sc-top' }, [h('span', { class: 'roof big', style: `background:${s.roof}` }), h('div', {}, [h('p', { class: 'lead' }, s.kid),
          h('p', { class: 'meta' }, `${s.distanceKm} km van huis · 🚲 ${s.bikeMin} min · 🚶 ${s.walkMin} min · ongeveer ${s.pupils.toLocaleString('nl')} leerlingen`)])]),
        photoBlock(s),
        compareBlock(s),
        off.length ? h('div', { class: 'offers' }, [h('small', {}, 'Deze school heeft:'), likeChips(off, mineNow)]) : null,
        h('b', {}, '✨ Bijzonder aan deze school'),
        h('ul', { class: 'facts' }, s.facts.map(f => h('li', {}, f)))]),
      h('div', { class: 'info' }, [h('b', {}, '🚪 Opdrachten binnen:'), h('ul', { class: 'facts' }, Object.entries(s.interior.stations).map(([k, x]) => h('li', {}, `${st[k] ? REACT_FACE[st[k].react] : '❗'} ${x.title} (${x.npc.name})`)))]),
      v.done ? C().say(`Je zei: ${['Super leuk', 'Best leuk', 'Niet voor mij'][v.heart]}.`) : null,
      C().row([inside ? null : C().next(v.done ? 'Er nog eens heen' : 'Wijs me de weg', () => { closePanel(); G().goTo(s.id); toast(`Op naar ${s.short}!`); }),
        v.done ? h('button', { class: 'btn', onclick: () => feelPanel(s, null) }, 'Mijn gevoel veranderen') : null])
    ]);
  }

  /* ---------------- Passport ---------------- */
  function passport() {
    const body = openPanel('Open Dag Paspoort', { wide: true });
    const sorted = G().data.schools.slice().sort((a, b) => a.distanceKm - b.distanceKm);
    C().screen(body, [C().say(`Je hebt ${visitsCount()} van de ${sorted.length} stempels. Tik op een stempel om de school te zien.`),
      h('div', { class: 'passport' }, sorted.map(s => {
        const v = G().state.visits[s.id];
        return h('button', { class: 'pstamp' + (v && v.done ? ' on' : ''), style: `--c:${s.roof}`, onclick: () => schoolVisit(s) }, [h('span', { class: 'pmark' }, v && v.done ? ['❤️', '🙂', '😐'][v.heart] : '?'), h('span', {}, s.short)]);
      }))]);
  }

  /* ---------------- Results: podium reveal ---------------- */
  function results(ceremony) {
    const st = G().state;
    if (![1, 2, 3, 4, 5].every(n => st.steps[n]) || visitsCount() < 1) {
      const body = openPanel('Jouw top 3');
      const missing = C().STEPS.filter(s => !isDone(s.n)).map(s => `Stap ${s.n}: ${s.title}`);
      C().screen(body, [C().say('Het podium heeft eerst nog wat meer info nodig. Maak deze missies af:'), h('ul', { class: 'facts' }, missing.map(m => h('li', {}, m))), C().row([C().next('Naar het missiebord', questBoard)])]);
      return;
    }
    if (!S().coinsUsed(st)) { LQ.Coins.open(() => results(ceremony)); return; }
    const ranked = LQ.Scoring.rank(G().data.schools, st);
    // The podium is for schools Lenny has really visited. A school that only fits "on paper"
    // gets a "maybe a surprise" card instead, so he goes and looks first.
    const pass = S().passing(ranked);
    const seenList = pass.filter(r => r.seen), unseenList = pass.filter(r => !r.seen);
    const top = seenList.slice(0, 3).concat(unseenList).slice(0, 3);
    const surprise = unseenList.find(r => !top.includes(r) && (!top[2] || r.score >= top[2].score - 5));
    const best = Math.max(1, ranked[0].score);
    const starsOf = (r) => Math.max(1, Math.min(5, Math.round(r.score / best * 5)));
    const body = openPanel(ceremony ? 'Het Gouden Podium' : 'Jouw top 3', { wide: true, cls: 'results' });
    const order = [1, 0, 2];
    const pod = h('div', { class: 'podium' }, order.map(i => {
      const r = top[i]; if (!r) return null;
      return h('div', { class: `pcol p${i + 1}` + (ceremony ? ' hide' : '') }, [
        h('div', { class: 'medal' }, ['🥇', '🥈', '🥉'][i]),
        h('div', { class: 'pname' }, r.school.short + (r.seen ? '' : ' 👀')),
        h('div', { class: 'pstars', 'aria-label': `${starsOf(r)} van de 5 sterren` }, '★'.repeat(starsOf(r)) + '☆'.repeat(5 - starsOf(r))),
        h('div', { class: 'pblock', style: `--c:${r.school.roof}` }, String(i + 1))
      ]);
    }));
    const why = h('div', { class: 'why' + (ceremony ? ' hide' : '') }, top.map((r, i) => h('div', { class: 'whycard', style: `--c:${r.school.roof}` }, [
      h('h3', {}, `${i + 1}. ${r.school.name}`), h('p', { class: 'meta' }, `${'★'.repeat(starsOf(r))} · ${r.school.distanceKm} km · ${st.mode === 'walk' ? '🚶 ' + r.school.walkMin : '🚲 ' + r.school.bikeMin} min`),
      (() => { const mm = S().matchedLikes(r.school, prof()); return mm.length ? h('div', { class: 'offers' }, [h('small', {}, 'Wat jij leuk vindt en deze school heeft:'), likeChips(mm.slice(0, 4), mm)]) : null; })(),
      h('ul', { class: 'facts' }, LQ.Scoring.reasons(r, st).map(t => h('li', {}, t)))])));
    const confetti = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    C().screen(body, [confetti, C().say(ceremony ? 'Tromgeroffel... dit zijn de scholen die het best bij jou passen!' : 'Deze scholen passen nu het best bij jou.'), pod, why,
      surprise ? h('div', { class: 'whycard', style: `--c:${surprise.school.roof}` }, [h('h3', {}, `👀 Misschien een verrassing: ${surprise.school.short}`),
        h('p', {}, 'Deze school past op papier ook goed bij jou, maar je bent er nog niet binnen geweest. Ga eerst kijken!'),
        C().row([C().next('Wijs me de weg', () => { closePanel(); G().goTo(surprise.school.id); })])]) : null,
      h('p', { class: 'hint' }, 'Dit is een spel, geen definitieve keuze. Ga met je ouders naar open dagen en kijk hoe het voelt!'),
      C().row([C().next('Alle scholen', ranking), h('button', { class: 'btn', onclick: () => LQ.Coins.open(() => results(false)) }, '🪙 Mijn munten verschuiven'), h('button', { class: 'btn', onclick: changeAnswers }, 'Mijn antwoorden veranderen'), h('button', { class: 'btn', onclick: parentGate }, 'Voor mijn ouders')])]);
    if (ceremony) {
      const cols = [...pod.children];
      [2, 1, 0].forEach((k, n) => setTimeout(() => { const el = cols.find(c => c.classList.contains('p' + (k + 1))); el && el.classList.remove('hide'); LQ.Sound.play(k === 0 ? 'fanfare' : 'win'); if (k === 0) burst(confetti); }, 700 + n * 900));
      setTimeout(() => why.classList.remove('hide'), 700 + 3 * 900);
      // Mami is there too (30 Oct 2026)
      setTimeout(() => { if (!$('veil').hidden) { const m = C().say('👏👏 ¡Qué bien, Len! Estoy re orgullosa de vos. ¡Ahora vamos juntos a las open dagen!', 'Mami'); const face = document.createElement('canvas'); face.width = 20; face.height = 14; face.getContext('2d').drawImage(LQ.Sprites.mamiSheet(), 40, 0, 20, 14, 0, 0, 20, 14); face.className = 'mami-face'; m.querySelector('.who').prepend(face); m.classList.add('mami-cheer'); body.insertBefore(m, body.children[2] || null); } }, 700 + 3 * 900 + 400);
    }
    st.revealed = true; st.lastRanking = ranked.map(r => r.id); G().save(); hud();
  }

  function burst(el) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['#d3192c', '#f5c518', '#2f6fd6', '#5bbf6a', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const p = h('i', { style: `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.6 + Math.random()}s` });
      el.appendChild(p);
    }
    setTimeout(() => { el.innerHTML = ''; }, 3200);
  }

  function ranking() {
    const st = G().state;
    const ranked = LQ.Scoring.rank(G().data.schools, st);
    const prev = st.lastRanking || [];
    const body = openPanel('Alle scholen', { wide: true });
    C().screen(body, [C().say('Hier staat elke school, de beste match bovenaan. 👀 = daar ben je nog niet binnen geweest. Verschuif je munten of verander je antwoorden en kijk hoe ze bewegen!'),
      h('ol', { class: 'rank' }, ranked.map((r, i) => {
        const was = prev.indexOf(r.id), mv = was < 0 ? '' : was > i ? '▲' : was < i ? '▼' : '';
        const off = r.blocked && r.blocked.length;
        return h('li', { class: off ? 'off' : '' }, [h('span', { class: 'rk' }, off ? '–' : String(i + 1)), h('span', { class: 'rn' }, [h('b', {}, r.school.short + (r.seen ? '' : ' 👀') + (off ? ' · niet op de route van dit avontuur' : '')), h('span', { class: 'bar' }, [h('i', { style: `width:${r.score}%;background:${off ? '#b9b2a6' : r.school.roof}` })])]), h('span', { class: 'rs' }, `${r.score}%`), h('span', { class: 'mv ' + (mv === '▲' ? 'up' : 'down') }, off ? '' : mv)]);
      })),
      h('p', { class: 'hint' }, 'Grijze scholen staan niet op de route van dit avontuur: je familie heeft een paar regels gekozen.'),
      C().row([C().next('📊 Scholen naast elkaar', compareAll), C().next('🪙 Mijn munten verschuiven', () => LQ.Coins.open(ranking)), h('button', { class: 'btn', onclick: changeAnswers }, 'Mijn antwoorden veranderen'), h('button', { class: 'btn', onclick: () => results(false) }, 'Terug naar de top 3')])]);
    st.lastRanking = ranked.map(r => r.id); G().save();
  }

  function changeAnswers() {
    const body = openPanel('Mijn antwoorden veranderen', { wide: true });
    C().screen(body, [C().say('Kies een missie om opnieuw te spelen. Je lijstje verandert meteen mee.'),
      h('div', { class: 'quests' }, C().STEPS.filter(s => s.n <= 5).map(s => h('button', { class: 'quest', onclick: () => runStep(s.n) }, [h('span', { class: 'qn' }, String(s.n)), h('span', { class: 'qt' }, [h('b', {}, s.title), h('small', {}, 'Nog een keer spelen')])]))),
      C().row([C().next('🪙 Mijn munten verschuiven', () => LQ.Coins.open(ranking)), h('button', { class: 'btn', onclick: passport }, 'Gevoel over scholen veranderen'), h('button', { class: 'btn', onclick: ranking }, 'Alle scholen bekijken')])]);
  }

  /* ---------------- Parents ---------------- */
  function todayISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
  function fmtDate(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function parents() {
    const d = G().data, reg = d.registration, st = G().state;
    const body = openPanel('Voor ouders', { wide: true, cls: 'parents' });
    const ranked = LQ.Scoring.rank(d.schools, st);
    const pure = LQ.Scoring.rank(d.schools, st, { pure: true });
    const rows = ranked.map((r, i) => {
      const s = r.school;
      const od = (s.openDays || []).length ? h('ul', { class: 'od' }, s.openDays.map(o => h('li', { class: o.date < todayISO() ? 'past' : '' }, `${fmtDate(o.date)} · ${o.label}${o.verified ? ' ✓' : ' (niet gecontroleerd)'}`))) : h('span', { class: 'warn' }, 'Nog niet gevonden. Kijk op de website van de school (meestal nov–feb).');
      return h('tr', { class: r.blocked.length ? 'off' : '' }, [
        h('td', {}, [h('b', {}, `${r.blocked.length ? '–' : i + 1 + '.'} ${s.name}`), h('div', { class: 'small' }, s.address), h('a', { href: s.website, target: '_blank', rel: 'noopener' }, s.websiteVerified ? 'Website van de school' : 'Schoolgegevens (DUO via AlleCijfers)')]),
        h('td', {}, [`${s.distanceKm} km`, h('div', { class: 'small' }, `fiets ~${s.bikeMin} min · lopen ~${s.walkMin} min`), r.blocked.length ? h('div', { class: 'small warn' }, '✗ Valt buiten de minimumeisen van de familie: ' + r.blocked.join(', ')) : null]),
        h('td', {}, [s.streams.join(', '), h('div', { class: 'small' }, `~${s.pupils.toLocaleString('nl')} leerlingen · ${({ regular: 'regulier', dalton: 'Dalton', montessori: 'Montessori', vrijeschool: 'vrijeschool' })[s.concept] || s.concept}`)]),
        h('td', {}, [h('div', { class: 'small' }, s.specialties.join(' · ')),
          s.admission ? h('div', { class: 'small adm' }, [h('b', {}, 'Toelating: '), s.admission.join(' ')]) : null,
          s.flags && s.flags.length ? h('div', { class: 'small warn' }, '⚠ ' + s.flags.join(' · ')) : null,
          s.tour ? h('div', { class: 'small' }, ['Rondleiding: ', h('a', { href: s.tour.url, target: '_blank', rel: 'noopener' }, s.tour.label)]) : null,
          parentFacts(s),
          insideNotes(s),
          s.sources ? h('div', { class: 'small' }, ['Bronnen: ', ...s.sources.map(([t, u], i) => [i ? ' · ' : '', h('a', { href: u, target: '_blank', rel: 'noopener' }, t)]).flat()]) : null]),
        h('td', {}, od)
      ]);
    });
    C().screen(body, [
      cloudSection(),
      familySection(ranked, pure),
      h('section', {}, [h('h3', {}, 'Zo werkt aanmelden in Rotterdam'), h('p', {}, `Systeem: ${reg.system}. ${reg.nationalWeek}. ${reg.regionDates} Plaatsing vanaf ${reg.placementsFrom}.`),
        h('ol', {}, reg.steps.map(t => h('li', {}, t)))]),
      h('section', {}, [h('h3', {}, 'Alle scholen, met de details'), h('p', { class: 'small' }, 'Gerangschikt met de munten van Lenny en jullie minimumeisen. Open dagen met ✓ zijn op 23 okt 2026 gecontroleerd op de website van de school. Data in het verleden zijn grijs. Afstanden zijn schattingen in vogelvlucht vanaf huis; reistijden rekenen met +25% afstand, 15 km/u op de fiets en 5 km/u lopend.'),
        h('div', { class: 'tablewrap' }, h('table', {}, [h('thead', {}, h('tr', {}, ['School', 'Afstand', 'VWO', 'Extra’s & notities', 'Open dagen'].map(t => h('th', {}, t)))), h('tbody', {}, rows)]))]),
      h('section', {}, [h('h3', {}, 'Niet meegenomen'), h('ul', {}, d.excluded.map(e => h('li', {}, `${e.name}: ${e.reason}`)))]),
      h('section', {}, [h('h3', {}, 'Bronnen'), h('ul', {}, reg.sources.concat(['https://allecijfers.nl/middelbare-scholen-overzicht/rotterdam/']).map(u => h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener' }, u))))]),
      C().row([h('button', { class: 'btn danger', onclick: resetAsk }, 'Het spel opnieuw beginnen')])
    ]);
  }
  // Lenny's player code and the online save (cloud.js).
  function cloudSection() {
    const Cl = LQ.Cloud;
    if (!Cl || !Cl.enabled()) return h('section', {}, [h('h3', {}, 'Opslaan'), h('p', { class: 'small' }, 'De voortgang wordt alleen op dit apparaat bewaard. Vul cloud-config.js in om op meerdere apparaten te spelen.')]);
    const st = Cl.status(), t = st.lastOk ? st.lastOk.toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' }) : null;
    return h('section', { class: 'cloudbox' }, [
      h('h3', {}, 'Spelerscode van Lenny'),
      h('p', { class: 'gate-code' }, Cl.code() || '–'),
      h('p', { class: 'small' }, 'Met deze code speelt Lenny verder op elk apparaat. Op een nieuw apparaat kiest hij "Ik heb al een code". ' +
        (st.status === 'offline' ? '⚠ Nu geen verbinding: alles staat veilig op dit apparaat en gaat online zodra er internet is.' : t ? `☁️ Online bewaard (laatst om ${t}).` : '')),
      C().row([h('button', { class: 'btn', onclick: () => { if (confirm('Dit apparaat loskoppelen? De voortgang blijft online bewaard en komt terug met de code.')) G().unlinkDevice(); } }, 'Dit apparaat loskoppelen')])
    ]);
  }
  function parentFacts(s) {
    const out = [];
    if (s.vwoOnlyBrugklas) out.push(h('div', {}, [h('b', {}, 'Pure vwo-brugklas: '), ({ yes: 'ja', no: 'nee', unverified: 'niet gecontroleerd' })[s.vwoOnlyBrugklas] || s.vwoOnlyBrugklas]));
    const sf = s.safety;
    if (sf) out.push(h('div', {}, [h('b', {}, 'Voelt zich veilig (leerlingen): '),
      `vwo ${sf.feelSafeVwo != null ? sf.feelSafeVwo : '?'}${sf.nationalVwo != null ? ' (landelijk ' + sf.nationalVwo + ')' : ''}` +
      (sf.feelSafeBrugjaar != null ? ` · brugjaar ${sf.feelSafeBrugjaar}${sf.nationalBrugjaar != null ? ' (landelijk ' + sf.nationalBrugjaar + ')' : ''}` : '') +
      ` · peiling ${sf.year}${sf.old ? ' ⚠ oud' : ''}${sf.label ? ' · ' + sf.label : ''}`]));
    const sp = s.support;
    if (sp) out.push(h('div', {}, [h('b', {}, 'Ondersteuning: '), sp.items.length ? sp.items.join(' · ') : 'niets gepubliceerd', sp.score != null ? h('span', { class: 'small' }, ` (schatting ondersteuning ${Math.round(sp.score * 10)}/10)`) : null, sp.gaps && sp.gaps.length ? h('span', { class: 'warn' }, ' ⚠ ' + sp.gaps.join(' · ')) : null]));
    if (s.askAtOpenDay) out.push(h('div', {}, [h('b', {}, 'Vraag op de open dag: '), s.askAtOpenDay.join(' · ')]));
    return out.length ? h('div', { class: 'small pfacts' }, out) : null;
  }
  function insideNotes(s) {
    const v = G().state.visits[s.id]; if (!s.interior || !v || !v.stations) return null;
    const rows = Object.entries(v.stations).filter(([k]) => s.interior.stations[k]).map(([k, r]) => h('li', {}, `${REACT_FACE[r.react]} ${s.interior.stations[k].title}${r.note ? ': ' + r.note : ''}`));
    return rows.length ? h('div', { class: 'small inside' }, [h('b', {}, 'Wat Lenny binnen deed:'), h('ul', {}, rows)]) : null;
  }
  /* Lenny's coins, the family minimums and the two rankings. */
  function familySection(ranked, pure) {
    const st = G().state, d = G().data, R = S().rules(st), Sc = S();
    st.family = st.family || {};
    const set = (rule, key, val) => { st.family[rule] = Object.assign({}, st.family[rule] || {}, { [key]: val }); G().save(); G().refreshStamps(); parents(); };
    const check = (rule, key, label) => h('label', { class: 'tog' }, [h('input', { type: 'checkbox', checked: R[rule][key] ? true : null, onchange: (e) => set(rule, key, e.target.checked) }), ' ', label]);
    const margin = h('select', { onchange: (e) => set('safety', 'margin', +e.target.value), 'aria-label': 'Hoeveel onder het landelijk gemiddelde is nog oké' },
      [0, 0.2, 0.3, 0.5, 0.8].map(m => h('option', { value: m, selected: (R.safety.margin != null ? R.safety.margin : 0.3) === m ? true : null }, m === 0 ? 'helemaal niet lager' : `tot ${String(m).replace('.', ',')} lager`)));
    const removed = ranked.filter(r => r.blocked.length);
    const jars = Sc.jars(), coins = st.coins || {}, used = Sc.coinsUsed(st);
    const coinList = used ? h('ul', {}, jars.filter(j => coins[j.id]).sort((a, b) => coins[b.id] - coins[a.id]).map(j => h('li', {}, `${j.icon} ${j.label}: ${'🪙'.repeat(coins[j.id])} (${coins[j.id]})`)))
      : h('p', { class: 'small warn' }, 'Lenny heeft zijn munten nog niet verdeeld (einde van missie 5). Tot die tijd gebruikt het spel standaardgewichten.');
    const col = (title, list, withRules) => h('div', { class: 'rcol' }, [h('h4', {}, title), h('ol', {}, (withRules ? Sc.passing(list) : list).map(r => h('li', {}, `${r.school.short} · ${r.score}%`)))]);
    const diff = Sc.passing(ranked).slice(0, 3).map(r => r.id).join() !== pure.slice(0, 3).map(r => r.id).join();
    return h('section', {}, [
      h('h3', {}, 'De munten van Lenny en jullie minimumeisen'),
      h('p', { class: 'small' }, 'Lenny bepaalt met zijn munten hoe belangrijk elk ding is. Jullie stellen alleen minimumeisen: scholen die daar niet aan voldoen blijven grijs op de kaart staan, maar kunnen niet in zijn top 3 komen. Het spel vertelt hem dat de familie een paar regels heeft gekozen.'),
      h('div', {}, [h('b', {}, `Munten van Lenny (${used}/${LQ.Coins.total()}):`), coinList]),
      h('div', { class: 'rules' }, [
        check('vwoOnlyBrugklas', 'on', 'Een pure vwo-brugklas moet mogelijk zijn'),
        h('div', { class: 'small' }, 'Scholen met "niet gecontroleerd" gaan door.'),
        check('safety', 'on', 'Score van leerlingen op "Voel je je veilig op school?" niet duidelijk onder het landelijk gemiddelde:'),
        h('div', { class: 'indent' }, [margin, ' ', check('safety', 'countBrugjaar', 'tel ook de score van het brugjaar mee, niet alleen vwo')]),
        h('div', { class: 'small' }, 'Scholen zonder gepubliceerde score gaan door (getoond als onbekend, nooit als onveilig).')
      ]),
      h('p', { class: removed.length ? 'small warn' : 'small' }, removed.length ? `Deze regels halen ${removed.length} ${removed.length > 1 ? 'scholen' : 'school'} weg: ` + removed.map(r => `${r.school.short} (${r.blocked.join(', ')})`).join('; ') : 'Deze regels halen geen scholen weg.'),
      h('div', { class: 'rcols' }, [col('Alleen de munten van Lenny', pure, false), col('Met jullie minimumeisen (wat Lenny ziet)', ranked, true)]),
      diff ? h('p', { class: 'small warn' }, 'De twee top 3’s zijn verschillend. Dat is geen fout: het is juist een mooi gespreksonderwerp met Lenny.') : h('p', { class: 'small' }, 'Beide top 3’s zijn hetzelfde.'),
      h('p', { class: 'small' }, `Veiligheidsscore: het antwoord van leerlingen op "Voel je je veilig op school?" (Scholen op de Kaart), vergeleken met het landelijk gemiddelde. Als de pagina van een school geen landelijk cijfer toont, wordt ${d.nationalFallback ? d.nationalFallback.vwo : 8.3} (vwo) gebruikt. Schatting ondersteuning: een schatting van 0-10 door Claude op basis van wat de school publiceert; check het op de open dag.`)
    ]);
  }

  /* A small gate so Lenny doesn't land in the parents' screen by accident. Not real security. */
  function parentGate() {
    const body = openPanel('Voor ouders');
    let t = null;
    const btn = h('button', { class: 'btn primary big hold' }, '3 seconden vasthouden');
    const bar = h('span', { class: 'holdbar' }, h('i'));
    const start = (e) => { e.preventDefault(); btn.classList.add('holding'); t = setTimeout(() => { t = null; parents(); }, 3000); };
    const stop = () => { btn.classList.remove('holding'); if (t) { clearTimeout(t); t = null; } };
    btn.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !t && !e.repeat) start(e); });
    btn.addEventListener('keyup', stop);
    cleanup = stop;
    C().screen(body, [C().say('Dit deel is voor je ouders of andere volwassenen. Lenny, jij kunt terug naar de kaart!'),
      h('div', { class: 'center' }, [h('p', { class: 'hint' }, 'Ouders: houd de knop ingedrukt.'), btn, bar]),
      C().row([h('button', { class: 'btn ghost', onclick: () => closePanel() }, 'Terug naar het spel')])]);
  }

  function resetAsk() {
    const body = openPanel('Opnieuw beginnen?');
    C().screen(body, [C().say(LQ.Cloud && LQ.Cloud.code() ? 'Dit wist alle antwoorden en stempels, op alle apparaten met deze code. Weet je het zeker?' : 'Dit wist alle antwoorden en stempels op dit apparaat. Weet je het zeker?'),
      C().row([h('button', { class: 'btn danger', onclick: () => { G().reset(); } }, 'Ja, opnieuw beginnen'), C().next('Nee, verder spelen', () => closePanel())])]);
  }

  /* ---------------- Radio: Lenny picks the music ---------------- */
  function radio() {
    const M = LQ.Music, st = G().state;
    const body = openPanel('📻 Radio');
    const cards = h('div', { class: 'cards radio' });
    const draw = () => {
      cards.innerHTML = '';
      M.STATIONS.forEach(id => {
        const s = M.SONGS[id], on = st.sound && M.station() === id;
        cards.appendChild(h('button', { class: 'card' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: () => pick(id) },
          [h('span', { class: 'ic' }, s.icon), h('b', {}, s.title), h('small', {}, s.blurb)]));
      });
    };
    const pick = (id) => {
      st.station = id; st.sound = true; G().save(); hud(); draw();
      if (G().inside) toast('Je zender speelt als je naar buiten gaat. 🎶');
    };
    draw();
    C().screen(body, [C().say('Kies je muziek! Die speelt terwijl je rondloopt of fietst.'), cards,
      h('p', { class: 'hint' }, 'Binnen in een school is de muziek rustig. Tik op 🔊 om alles uit te zetten.'),
      C().row([st.sound ? h('button', { class: 'btn', onclick: () => { st.sound = false; G().save(); hud(); draw(); closePanel(); } }, '🔇 Muziek uit') : null,
        C().next('Klaar', () => closePanel())])]);
  }

  /* ---------------- Wire top bar ---------------- */
  function init() {
    $('panel-close').onclick = () => closePanel();
    $('veil').addEventListener('click', (e) => { if (e.target === $('veil') && !$('panel-close').hidden) closePanel(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('veil').hidden && !$('panel-close').hidden) closePanel(); });
    $('btn-quests').onclick = () => { LQ.Sound.play(); questBoard(); };
    $('btn-passport').onclick = () => { LQ.Sound.play(); passport(); };
    $('btn-results').onclick = () => { LQ.Sound.play(); G().state.revealed ? results(false) : results(readyForResults()); };
    $('btn-parents').onclick = () => { LQ.Sound.play(); parentGate(); };
    $('btn-mode').onclick = () => { if (G().inside) { toast('Je fiets staat buiten. Binnen loop je! 🚶'); return; } G().setMode(G().state.mode === 'bike' ? 'walk' : 'bike'); LQ.Sound.play(); toast(G().state.mode === 'bike' ? 'Op de fiets! 🚲' : 'Lopen! 🚶'); };
    $('btn-sound').onclick = () => { G().state.sound = !G().state.sound; G().save(); hud(); LQ.Sound.play('win'); };
    $('btn-radio').onclick = () => { LQ.Sound.play(); radio(); };
  }

  return { init, hud, near, compareAll, compareBlock, photoBlock, toast, radio, intro, questBoard, schoolVisit, passport, results, ranking, parents, openPanel, closePanel, readyForResults, infoPanel, feelPanel, isOpen: () => !$('veil').hidden || !!(LQ.Minimap && LQ.Minimap.isOpen()) };
})();
