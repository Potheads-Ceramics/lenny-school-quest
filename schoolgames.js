/* =====================================================================
   SCHOOL GAMES — the challenges inside a school building.
   Each person (station) in school.interior.stations runs one game.
   Game types (all content lives in data/schools.json):
     quiz      clue / code puzzles with explanations
     kwt       plan a week of KeuzeWerkTijd around tests and friends
     sinkfloat lab experiment, 3 levels to choose from
     pick      choose from booths / jobs (gives interest tags)
     budget    design within a budget, reach 3 goals
     sequence  put steps in order (strict) or tell your own story (free)
     branch    choose a path, each path has its own game
     memory    learn word pairs against a soft timer, then recall them
     scenarios what would you do? every answer is fine, each gets a reply
   Any game can chain another with "then".
   After the game: real facts about the school + a 3-face reaction,
   which feeds the match score (see scoring.js).
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.SchoolGames = (function () {
  const h = (...a) => LQ.h(...a);
  const C = () => LQ.Challenges;
  const blip = (k) => LQ.Sound && LQ.Sound.play(k || 'blip');
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const REACT = [['😍', 'Lijkt me super'], ['🙂', 'Is oké'], ['😐', 'Niks voor mij']];

  function visitOf(s) {
    const st = LQ.Game.state;
    st.visits[s.id] = st.visits[s.id] || {};
    st.visits[s.id].stations = st.visits[s.id].stations || {};
    return st.visits[s.id];
  }

  /* ---------------- station flow: intro → game → facts → reaction ---------------- */
  function openStation(s, key, onClose) {
    const st = s.interior.stations[key], npc = st.npc;
    const body = LQ.UI.openPanel(`${npc.name}: ${st.title}`, { wide: true, onClose });
    const who = npc.name;
    const ctx = { state: LQ.Game.state, school: s, say: (t) => C().say(t, who) };
    const prev = visitOf(s).stations[key];

    C().screen(body, [
      h('p', { class: 'meta' }, `${npc.name} · ${npc.role}`),
      ctx.say(st.intro),
      prev ? h('p', { class: 'hint' }, `Je deed dit al eens en zei: ${REACT[prev.react][0]} ${REACT[prev.react][1]}.`) : null,
      C().row([C().next(prev ? 'Nog een keer' : 'Kom op!', () => run(body, st.game, ctx, reveal)), h('button', { class: 'btn', onclick: () => LQ.UI.closePanel() }, 'Misschien later')])
    ]);

    function reveal(res) {
      const facts = h('div', { class: 'factcard', style: `--c:${s.roof}` }, [h('h3', {}, `Echt waar, op ${s.short}`), h('ul', { class: 'facts' }, st.facts.map(f => h('li', {}, f)))]);
      const q = (st.react || 'Zou je dit leuk vinden?').replace('{choice}', res.choiceLabel || 'dit');
      C().screen(body, [
        res.summary ? ctx.say(res.summary) : null,
        facts,
        h('p', { class: 'lead center-t' }, q),
        h('div', { class: 'opts col' }, REACT.map(([e, l], i) => C().next(`${e} ${l}`, () => save(i, res), 'big left')))
      ]);
    }

    function save(i, res) {
      const v = visitOf(s);
      v.stations[key] = { react: i, note: res.note || '', tags: res.tags != null ? res.tags : (st.tags || []), choice: res.choice || null };
      LQ.Game.save(); LQ.UI.hud(); LQ.Sound.play('win');
      const n = LQ.Interior.stationsDone(s), tot = LQ.Interior.stationTotal(s), need = LQ.Interior.NEED;
      const msg = n >= tot ? 'Je hebt hier elke opdracht gedaan! Loop naar de deur en vertel hoe de school voelt.'
        : n >= need ? `Opdracht ${n} van ${tot} klaar! Je kunt nu via de deur weggaan, of er nog meer doen.`
        : `Opdracht ${n} van ${tot} klaar! Doe er nog ${need - n} om de stempel te verdienen.`;
      C().screen(body, [h('div', { class: 'starburst' }, '✓'), C().say(msg), C().row([C().next('Verder ontdekken', () => LQ.UI.closePanel())])]);
    }
  }

  /* ---------------- runner (supports "then" chains) ---------------- */
  function merge(a, b) {
    return {
      note: [a.note, b.note].filter(Boolean).join(' · '),
      tags: (a.tags || b.tags) ? [...(a.tags || []), ...(b.tags || [])] : undefined,
      summary: b.summary || a.summary, choice: a.choice || b.choice, choiceLabel: a.choiceLabel || b.choiceLabel
    };
  }
  function run(body, cfg, ctx, done) {
    const fn = GAMES[cfg.type];
    if (!fn) { done({ note: '' }); return; }
    const stop = fn(body, cfg, ctx, (res) => { res = res || {}; if (cfg.then) run(body, cfg.then, ctx, (r2) => done(merge(res, r2))); else done(res); });
    if (typeof stop === 'function') { const v = document.getElementById('veil'); const obs = new MutationObserver(() => { if (v.hidden) { stop(); obs.disconnect(); } }); obs.observe(v, { attributes: true, attributeFilter: ['hidden'] }); }
  }

  /* ---------------- quiz: clues, code keys, explanations ---------------- */
  function quiz(body, cfg, ctx, done) {
    const clues = (cfg.clues || []).slice(), key = (cfg.key || []).slice();
    let i = 0, score = 0;
    function show() {
      const q = cfg.qs[i], fresh = new Set();
      (q.addClues || []).forEach(c => { clues.push(c); fresh.add(c); });
      (q.addKey || []).forEach(k => { key.push(k); fresh.add(k[0]); });
      const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
      const opts = h('div', { class: 'opts col' }, shuffle(q.opts.map((o, k) => [o, k])).map(([o, k]) => h('button', { class: 'btn big left', 'data-k': String(k), onclick: (e) => {
        [...opts.children].forEach(b => b.disabled = true);
        const ok = k === q.a; if (ok) score++;
        e.currentTarget.classList.add(ok ? 'good' : 'meh');
        if (!ok) { const right = [...opts.children].find(b => b.dataset.k === String(q.a)); right && right.classList.add('good'); }
        blip(ok ? 'win' : 'blip');
        fb.textContent = (ok ? 'Ja! ' : 'Goed geprobeerd! ') + (q.explain || '');
        body.appendChild(C().row([C().next(i < cfg.qs.length - 1 ? 'Verder' : 'Klaar', () => {
          i++;
          if (i < cfg.qs.length) show();
          else done({ note: `${cfg.noteLabel || 'Puzzel'}: ${score}/${cfg.qs.length}`, score,
            summary: score === cfg.qs.length ? (cfg.perfect || 'Alles goed!') : `Je had er ${score} van de ${cfg.qs.length} goed. Lastig hoor, en je bleef doorgaan!` });
        })]));
      } }, o)));
      const parts = [ctx.say(`${cfg.label || 'Puzzel'} ${i + 1} van ${cfg.qs.length}. ${q.q}`)];
      if (clues.length) parts.push(h('div', { class: 'clues' }, [cfg.cluesTitle ? h('b', {}, cfg.cluesTitle) : null, ...clues.map(c => h('div', { class: fresh.has(c) ? 'new' : '' }, c))]));
      if (key.length) parts.push(h('div', { class: 'keybox', 'aria-label': 'Codesleutel' }, key.map(([a, b]) => h('span', { class: fresh.has(a) ? 'new' : '' }, `${a} = ${b}`))));
      if (q.big) parts.push(h('div', { class: 'bigword' }, q.big));
      parts.push(opts, fb);
      C().screen(body, parts);
    }
    show();
  }

  /* ---------------- kwt: plan the week ---------------- */
  function kwt(body, cfg, ctx, done) {
    const pick = new Array(cfg.days.length).fill(null);
    const count = h('p', { class: 'hint' }, '');
    const go = C().next('Inschrijven ✍️', () => finish(false));
    const auto = h('button', { class: 'btn ghost', onclick: () => { cfg.days.forEach((d, i) => { pick[i] = d.opts[Math.floor(Math.random() * d.opts.length)].id; }); blip(); finish(true); } }, '🤖 Laat de computer kiezen');
    const upd = () => { const n = pick.filter(Boolean).length; count.textContent = `${n} van de ${cfg.days.length} dagen gepland`; go.disabled = n < cfg.days.length; };
    const days = h('div', { class: 'kwt-days' }, cfg.days.map((d, di) => {
      const col = h('div', { class: 'kday' }, [h('h4', {}, d.day)]);
      d.opts.forEach(o => {
        const b = h('button', { class: 'kopt', 'data-id': o.id, 'aria-pressed': 'false', onclick: () => {
          pick[di] = pick[di] === o.id ? null : o.id; blip();
          [...col.querySelectorAll('.kopt')].forEach(x => { const on = x.dataset.id === pick[di]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          upd();
        } }, [h('span', {}, o.label), h('small', {}, o.seats === 1 ? 'laatste plek!' : `${o.seats} plekken`)]);
        col.appendChild(b);
      });
      return col;
    }));
    C().screen(body, [ctx.say(cfg.intro), h('div', { class: 'kwt-goals' }, cfg.goals.map(g => h('div', { class: 'goal' }, [h('span', { class: 'ic' }, g.icon), h('span', {}, g.text)]))), days, count, C().row([go, auto])]);
    upd();

    function finish(byComputer) {
      const res = cfg.goals.map(g => { const di = pick.findIndex(p => p === g.id); return { g, ok: di >= 0 && di < g.deadline, late: di >= g.deadline }; });
      const score = res.filter(r => r.ok).length, tot = cfg.goals.length;
      const head = byComputer ? 'De computer koos voor jou. Maar die weet niks van je toetsen!'
        : score === tot ? 'WAUW. Een perfect plan! Alles past erin.'
        : score === tot - 1 ? 'Goed plan! Bijna alles past.'
        : 'Plannen is lastig. Dat is precies wat je hier oefent!';
      blip(score >= tot - 1 ? 'win' : 'blip');
      C().screen(body, [ctx.say(head),
        h('div', { class: 'kwt-days compact' }, cfg.days.map((d, i) => h('div', { class: 'kday' }, [h('h4', {}, d.day), h('span', {}, (d.opts.find(o => o.id === pick[i]) || { label: '—' }).label)]))),
        h('ul', { class: 'checklist' }, res.map(r => h('li', { class: r.ok ? 'ok' : 'miss' }, [h('span', { 'aria-hidden': 'true' }, r.ok ? '✅' : '⬜'), ' ', r.ok ? r.g.ok : (r.late ? r.g.late : r.g.miss)]))),
        C().row([C().next('Verder', () => done({ note: byComputer ? `${cfg.noteLabel || 'KWT'}: liet de computer kiezen (${score}/${tot})` : `${cfg.noteLabel || 'KWT-plan'}: ${score}/${tot} doelen` })),
          h('button', { class: 'btn', onclick: () => kwt(body, cfg, ctx, done) }, 'Opnieuw plannen')])]);
    }
  }

  /* ---------------- sinkfloat: pick a level, predict, test ---------------- */
  function sinkfloat(body, cfg, ctx, done) {
    C().screen(body, [ctx.say(cfg.intro), h('div', { class: 'opts col' }, cfg.levels.map((L, li) => C().next(`${'⭐'.repeat(L.stars)} ${L.name}: ${L.text}`, () => play(li), 'big left')))]);
    function play(li) {
      const L = cfg.levels[li], trials = [];
      L.items.forEach(id => L.liquids.forEach(lq => trials.push({ o: cfg.objects[id], lq: cfg.liquids[lq], salt: lq === 'salt' })));
      let t = 0, score = 0;
      function show() {
        const { o, lq, salt } = trials[t], d = o.m / o.v, sinks = d > lq.d;
        const objEl = h('div', { class: 'obj', 'aria-hidden': 'true' }, o.icon);
        const tank = h('div', { class: 'tank' + (salt ? ' salt' : '') }, [objEl, h('span', { class: 'tlabel' }, lq.name)]);
        const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
        const btns = h('div', { class: 'opts' }, [['⬇️ Zinkt', true], ['⬆️ Drijft', false]].map(([lab, guess]) => h('button', { class: 'btn big', onclick: (e) => {
          [...btns.children].forEach(b => b.disabled = true);
          const ok = guess === sinks; if (ok) score++;
          e.currentTarget.classList.add(ok ? 'good' : 'meh');
          requestAnimationFrame(() => objEl.classList.add(sinks ? 'sink' : 'float'));
          blip(ok ? 'win' : 'blip');
          const why = L.showNumbers ? ` Dichtheid = ${o.m} ÷ ${o.v} ≈ ${d.toFixed(2).replace('.', ',')}. ${lq.name}: ${lq.d.toFixed(1).replace('.', ',')}.` : '';
          fb.textContent = (ok ? 'Goed! ' : 'Verrassing! ') + `${o.icon} ${o.name} ${sinks ? 'zinkt' : 'drijft'}.` + why;
          body.appendChild(C().row([C().next(t < trials.length - 1 ? 'Volgende test' : 'Klaar', () => { t++; t < trials.length ? show() : end(); })]));
        } }, lab)));
        C().screen(body, [ctx.say(`${'⭐'.repeat(L.stars)} Test ${t + 1} van ${trials.length}: ${o.name.toLowerCase()} in ${lq.name.toLowerCase()}.`),
          L.tip ? h('p', { class: 'info' }, L.tip) : null,
          L.showNumbers ? h('p', { class: 'meta center-t' }, `${o.icon} massa ${o.m} g · volume ${o.v} cm³`) : null,
          tank, btns, fb]);
      }
      function end() {
        done({ note: `Lab: koos ${'⭐'.repeat(L.stars)} ${L.name}, ${score}/${trials.length} goed`, level: L.stars,
          summary: `${score} van de ${trials.length} goed op niveau ${L.name}! Wetenschappers worden steeds verrast. Dat is juist het leuke.` });
      }
      show();
    }
  }

  /* ---------------- pick: booths, jobs ---------------- */
  function pick(body, cfg, ctx, done) {
    const chosen = []; let r = 0;
    function show() {
      const R = cfg.rounds[r]; let sel = null;
      const nxt = C().next(r < cfg.rounds.length - 1 ? 'Verder' : 'Klaar', () => { chosen.push(sel); r++; r < cfg.rounds.length ? show() : end(); });
      nxt.disabled = true;
      const grid = h('div', { class: 'cards booths' }, cfg.options.map(o => {
        const used = cfg.unique && chosen.includes(o);
        const b = h('button', { class: 'card booth', disabled: used, 'aria-pressed': 'false', onclick: () => {
          sel = o; blip();
          [...grid.children].forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
          b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); nxt.disabled = false;
        } }, [h('span', { class: 'ic' }, o.icon), h('b', {}, o.label), h('small', {}, used ? '(al gekozen)' : o.desc)]);
        return b;
      }));
      C().screen(body, [ctx.say(R.title), grid, C().row([nxt])]);
    }
    function end() {
      const tags = [].concat(...chosen.map(o => o.tags || []));
      const labels = chosen.map(o => o.label);
      const show = cfg.result === 'certificate'
        ? h('div', { class: 'cert', style: `--c:${ctx.school.roof}` }, [h('small', {}, cfg.certTitle || 'Certificaat'), h('b', {}, 'Lenny'), ...chosen.map((o, i) => h('div', {}, `${o.icon} ${o.label}${cfg.rounds[i].tag ? ' · ' + cfg.rounds[i].tag : ''}`))])
        : h('div', { class: 'center' }, [h('div', { class: 'ic big' }, chosen[0].icon), h('h3', { class: 'disp' }, chosen[0].label)]);
      blip('win');
      C().screen(body, [ctx.say(cfg.result === 'certificate' ? 'Hier is je (nep)certificaat!' : 'Goede keuze!'), show,
        C().row([C().next('Next', () => done({ note: `${cfg.noteLabel || 'Gekozen'}: ${labels.join(', ')}`, tags, choiceLabel: labels.join(' en ') }))])]);
    }
    show();
  }

  /* ---------------- budget: design within coins ---------------- */
  function budget(body, cfg, ctx, done) {
    const on = new Set(), keys = Object.keys(cfg.goals);
    let tries = 0, hinted = false;
    const coins = h('div', { class: 'coins' }, ''), meters = h('div', { class: 'meters' }), fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
    const totals = () => {
      const t = {}; keys.forEach(k => t[k] = 0); let cost = 0;
      cfg.items.forEach(it => { if (on.has(it.id)) { cost += it.cost; Object.entries(it.give).forEach(([k, v]) => t[k] = (t[k] || 0) + v); } });
      return { t, cost };
    };
    const items = h('div', { class: 'items' }, cfg.items.map(it => {
      const b = h('button', { class: 'card item', 'data-id': it.id, 'aria-pressed': 'false', onclick: () => {
        if (on.has(it.id)) on.delete(it.id);
        else if (totals().cost + it.cost > cfg.budget) { fb.textContent = `Niet genoeg ${cfg.unitWord || 'munten'}! Haal eerst iets weg.`; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); return; }
        else on.add(it.id);
        blip(); upd();
      } }, [h('span', { class: 'ic' }, it.icon), h('b', {}, it.label), h('small', {}, `${cfg.coinIcon || '🪙'} ${it.cost} · ` + Object.entries(it.give).map(([k, v]) => `${cfg.labels[k].split(' ')[0]}+${v}`).join(' '))]);
      return b;
    }));
    function upd() {
      const { t, cost } = totals();
      coins.textContent = `${cfg.coinIcon || '🪙'} Nog ${cfg.budget - cost} van de ${cfg.budget} ${cfg.unitWord || 'munten'} over`;
      meters.innerHTML = '';
      keys.forEach(k => { const need = cfg.goals[k], have = t[k]; meters.appendChild(h('div', { class: 'meter' + (have >= need ? ' ok' : '') }, [h('span', {}, cfg.labels[k]), h('span', { class: 'bar' }, [h('i', { style: `width:${Math.min(100, have / need * 100)}%` })]), h('span', {}, `${have}/${need}`)])); });
      [...items.children].forEach(b => { const o = on.has(b.dataset.id); b.classList.toggle('on', o); b.setAttribute('aria-pressed', o ? 'true' : 'false'); });
      fb.textContent = '';
    }
    const submit = C().next(cfg.submitLabel || 'Naar de jury sturen 📨', () => {
      tries++;
      const { t, cost } = totals(), miss = keys.filter(k => t[k] < cfg.goals[k]);
      if (miss.length) { fb.textContent = (cfg.judge || 'De jury') + ' zegt: bijna! Je hebt nog meer nodig van: ' + miss.map(k => cfg.labels[k]).join(' en ') + '.'; blip(); return; }
      blip('win');
      const left = cfg.budget - cost;
      C().screen(body, [ctx.say(`${cfg.judge || 'De jury'} vindt het geweldig! Alle doelen gehaald${left ? `, met nog ${left} ${cfg.unitWord || (left === 1 ? 'munt' : 'munten')} over` : ''}.`),
        h('p', { class: 'info' }, 'Jouw ontwerp: ' + cfg.items.filter(i => on.has(i.id)).map(i => i.icon + ' ' + i.label).join(', ')),
        C().row([C().next('Next', () => done({ note: `${cfg.noteLabel || 'Ontwerp'} opgelost in ${tries} ${tries === 1 ? 'poging' : 'pogingen'}${hinted ? ' (met hint)' : ''}` }))])]);
    });
    const hint = h('button', { class: 'btn ghost', onclick: () => { hinted = true; fb.textContent = '💡 ' + cfg.hint; } }, '💡 Tip');
    C().screen(body, [ctx.say(cfg.intro), coins, meters, items, fb, C().row([submit, hint])]);
    upd();
  }

  /* ---------------- sequence: right order, or your own story ---------------- */
  function sequence(body, cfg, ctx, done) {
    let order = [], tries = 0;
    const pool = shuffle(cfg.items.map((t, i) => ({ t, i })));
    const list = () => h('ol', { class: 'seq-out' }, order.map(o => h('li', {}, o.t)));
    function draw() {
      const left = h('div', { class: 'opts col' }, pool.filter(p => !order.includes(p)).map(p => h('button', { class: 'btn left', onclick: () => { order.push(p); blip(); order.length === cfg.items.length ? check() : draw(); } }, p.t)));
      C().screen(body, [ctx.say(cfg.intro), order.length ? list() : null, left, order.length ? C().row([h('button', { class: 'btn ghost', onclick: () => { order = []; draw(); } }, '↺ Opnieuw')]) : null]);
    }
    function check() {
      tries++;
      if (!cfg.strict) return genre();
      const firstWrong = order.findIndex((o, k) => o.i !== k);
      if (firstWrong < 0) {
        blip('win');
        C().screen(body, [ctx.say(cfg.okText || 'Perfecte volgorde!'), list(), C().row([C().next('Verder', () => done({ note: `${cfg.noteLabel}: goed in ${tries} ${tries === 1 ? 'poging' : 'pogingen'}` }))])]);
      } else {
        blip();
        C().screen(body, [ctx.say(`Hmm, stap ${firstWrong + 1} klopt nog niet. ${cfg.hint || ''}`), list(), C().row([C().next('Probeer opnieuw', () => { order = []; draw(); })])]);
      }
    }
    function genre() {
      C().screen(body, [ctx.say(cfg.genreQ || 'Mooi verhaal! Wat voor film is het?'), list(),
        h('div', { class: 'opts' }, cfg.genres.map(g => C().next(g, () => {
          const word = g.replace(/^\S+\s/, '').toLowerCase();
          blip('win');
          C().screen(body, [ctx.say(`Jouw film is een ${word}! Regisseurs maken steeds dit soort keuzes.`), list(), C().row([C().next('Verder', () => done({ note: `${cfg.noteLabel}: maakte een ${word}` }))])]);
        }, 'big')))]);
    }
    draw();
  }

  /* ---------------- branch: choose a path ---------------- */
  function branch(body, cfg, ctx, done) {
    C().screen(body, [ctx.say(cfg.intro), h('div', { class: 'opts col' }, cfg.options.map(o => h('button', { class: 'btn big left', onclick: () => {
      blip();
      run(body, o.game, ctx, (res) => done(Object.assign({}, res, {
        note: `${o.short || o.label}. ${res.note || ''}`.trim(),
        tags: (o.tags || res.tags) ? [...(o.tags || []), ...(res.tags || [])] : undefined,
        choice: o.id, choiceLabel: o.short || o.label
      })));
    } }, [h('b', {}, o.label), h('br'), h('small', {}, o.desc)])))]);
  }

  /* ---------------- memory: learn pairs, then recall ---------------- */
  function memory(body, cfg, ctx, done) {
    const pairs = cfg.pairs, secs = cfg.seconds || 20;
    let left = secs, timer = null;
    const clock = h('div', { class: 'coins', 'aria-live': 'off' }, '');
    const bar = h('span', { class: 'bar' }, [h('i', { style: 'width:100%' })]);
    const grid = h('div', { class: 'cards mem' }, pairs.map(([a, b]) => h('div', { class: 'card' }, [h('b', {}, a), h('small', {}, b)])));
    const ready = C().next('Ik ben klaar!', () => { clearInterval(timer); recall(); });
    const tick = () => {
      left--; clock.textContent = `⏳ ${Math.max(0, left)} s`; bar.firstChild.style.width = Math.max(0, left / secs * 100) + '%';
      if (left <= 0) { clearInterval(timer); recall(); }
    };
    C().screen(body, [ctx.say(cfg.intro), clock, h('div', { class: 'meter ok' }, [h('span', {}, 'Tijd'), bar, h('span', {}, '')]), grid, C().row([ready])]);
    clock.textContent = `⏳ ${left} s`;
    timer = setInterval(tick, 1000);
    let i = 0, score = 0;
    const order = shuffle(pairs);
    function recall() {
      if (i >= order.length) return end();
      const [a, b] = order[i];
      const others = shuffle(pairs.filter(p => p[1] !== b)).slice(0, 2).map(p => p[1]);
      const fb = h('p', { class: 'feedback', 'aria-live': 'polite' }, '');
      const opts = h('div', { class: 'opts' }, shuffle([b, ...others]).map(o => h('button', { class: 'btn big', onclick: (e) => {
        [...opts.children].forEach(x => x.disabled = true);
        const ok = o === b; if (ok) score++;
        e.currentTarget.classList.add(ok ? 'good' : 'meh'); blip(ok ? 'win' : 'blip');
        fb.textContent = ok ? 'Ja!' : `Het was "${b}".`;
        setTimeout(() => { i++; recall(); }, 700);
      } }, o)));
      C().screen(body, [ctx.say(`Woord ${i + 1} van ${order.length}. Wat betekent het?`), h('div', { class: 'bigword' }, a), opts, fb]);
    }
    function end() {
      done({ note: `${cfg.noteLabel || 'Geheugen'}: ${score}/${pairs.length}`, summary: `Je onthield er ${score} van de ${pairs.length}! ${score === pairs.length ? 'Doel gehaald!' : 'Kijk eens terug: wat hielp jou?'}` });
    }
    return () => clearInterval(timer);
  }

  /* ---------------- scenarios: no wrong answers ---------------- */
  function scenarios(body, cfg, ctx, done) {
    let i = 0; const picks = [], tags = [];
    function show() {
      const q = cfg.qs[i];
      C().screen(body, [ctx.say(q.q), h('div', { class: 'opts col' }, q.opts.map(([t, resp, tg]) => C().next(t, () => {
        picks.push(t); (tg || []).forEach(x => tags.push(x)); blip('win');
        C().screen(body, [ctx.say(resp), C().row([C().next(i < cfg.qs.length - 1 ? 'Verder' : 'Klaar', () => { i++; i < cfg.qs.length ? show() : done(Object.assign({ note: `${cfg.noteLabel || 'Keuzes'}: ${picks.join(' / ')}` }, tags.length ? { tags } : {})); })])]);
      }, 'big left')))]);
    }
    show();
  }

  const GAMES = { quiz, kwt, sinkfloat, pick, budget, sequence, branch, memory, scenarios };
  return { openStation, run, REACT };
})();
