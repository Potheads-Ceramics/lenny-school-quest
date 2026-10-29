/* =====================================================================
   SCORING — turns Lenny's choices into a match score per school.
   Pure functions. Weights are easy to tune at the top.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Scoring = (function () {
  const W = { extras: 33, style: 15, size: 10, travel: 12, friends: 10, visit: 20 };

  const TAG_WORDS = {
    classics: 'Latijn & Grieks', english: 'lessen in het Engels', international: 'reizen naar het buitenland', tech: 'het Technasium',
    coding: 'programmeren', science: 'wetenschap', arts: 'kunst', crafts: 'dingen maken', music: 'muziek', dance: 'dans',
    theatre: 'toneel', sport: 'sport', debate: 'debatteren & grote vragen', nature: 'natuur', business: 'een eigen bedrijf beginnen'
  };
  // One icon per "like" so Lenny can spot his likes on the map, in schools and on the podium.
  const LIKE_ICONS = {
    classics: '🏛️', english: '🗣️', international: '✈️', tech: '🛠️', coding: '🤖', science: '🔬', arts: '🎨',
    crafts: '🔧', music: '🎵', dance: '🕺', theatre: '🎭', sport: '⚽', debate: '💬', nature: '🌳', business: '💼'
  };
  const LIKE_MIN = 1.5;   // a tag counts as "Lenny likes this" from this many points
  const OFFER_MIN = 1;    // a school "has" a tag from this many points

  const CONCEPT_WORDS = {
    regular: 'Leraren leggen uit, daarna ga je oefenen. Duidelijk en simpel.',
    dalton: 'Ze geven les op de Dalton-manier: je plant je eigen werk.',
    montessori: 'Ze geven les op de Montessori-manier: je kiest zelf een deel van je werk.',
    vrijeschool: 'Het is een vrijeschool: veel kunst en dingen maken.'
  };

  function emptyProfile() {
    return { tags: {}, concept: { regular: 0, dalton: 0, montessori: 0, vrijeschool: 0 }, size: null, maxMin: null, mode: 'bike', friends: [], visits: {} };
  }

  const schoolsList = () => (LQ.Game && LQ.Game.data && LQ.Game.data.schools) || [];
  const REACT_VAL = [1, 0.6, 0];

  // Reactions to challenges inside a school (😍 / 🙂 / 😐).
  function stationRecs(s, visits) {
    const v = visits && visits[s.id];
    if (!s.interior || !v || !v.stations) return [];
    return Object.entries(v.stations).filter(([k]) => s.interior.stations[k]).map(([k, r]) => Object.assign({ key: k, station: s.interior.stations[k] }, r));
  }

  // Build the preference profile from the saved answers.
  function profileFrom(state, schools) {
    schools = schools || schoolsList();
    const p = emptyProfile();
    const a = state.answers || {};
    const add = (t, v) => { p.tags[t] = Math.max(0, Math.min(3, (p.tags[t] || 0) + v)); };
    (a.interests || []).forEach(card => (card.tags || []).forEach(t => add(t, 2)));
    if (a.latin != null) add('classics', [2.5, 1, 0][a.latin]);
    Object.entries(a.extras || {}).forEach(([t, v]) => add(t, [3, 1.5, 0][v]));
    (a.style || []).forEach(c => { if (c) p.concept[c] = (p.concept[c] || 0) + 1; });
    // What Lenny showed during school mini-games also counts.
    Object.values(state.visits || {}).forEach(v => {
      Object.entries(v.likes || {}).forEach(([t, n]) => add(t, n));
      Object.entries(v.concept || {}).forEach(([c, n]) => { p.concept[c] = Math.max(0, (p.concept[c] || 0) + n); });
    });
    // Challenges inside schools: a 😍 on the Latin puzzle means he likes Latin, at EVERY school.
    schools.forEach(s => stationRecs(s, state.visits || {}).forEach(r => {
      const w = [1, 0.4, 0][r.react] || 0;
      (r.tags || []).forEach(t => add(t, w));
      if (r.station.conceptPlus && r.react === 0) p.concept[r.station.conceptPlus] = (p.concept[r.station.conceptPlus] || 0) + 1;
    }));
    p.size = a.size || null;
    p.maxMin = a.maxMin || null;
    p.mode = state.mode || 'bike';
    p.friends = a.friends || [];
    p.visits = state.visits || {};
    p.coins = state.coins || {};
    return p;
  }

  const UNSEEN = 0.85;
  // Did Lenny visit this school (walked in, played something or got the stamp)?
  function visited(s, visits) {
    const v = visits && visits[s.id];
    return !!(v && (v.done || v.heart != null || (v.stations && Object.keys(v.stations).length)));
  }

  function minutes(s, mode) { return mode === 'walk' ? s.walkMin : s.bikeMin; }
  function sizeClass(n) { return n < 700 ? 'small' : n <= 1100 ? 'medium' : 'big'; }

  function scoreSchool(s, p) {
    const parts = {};
    // 1. extras & interests
    const prefs = Object.entries(p.tags).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (prefs.length) {
      // Share of ALL of Lenny's likes that this school offers (27 Oct 2026).
      // A school "fully" offers a like from 2 points on, so one school that is extreme
      // in a single rare like (e.g. only it has tech) can no longer beat schools
      // that fit several of his likes.
      const total = prefs.reduce((n, [, v]) => n + v, 0);
      let raw = 0;
      prefs.forEach(([t, v]) => { raw += v * Math.min(1, (s.tags[t] || 0) / 2); });
      let x = total ? raw / total : 0;
      if (s.gymOnly && (p.tags.classics || 0) < 1.5) x *= 0.5;
      if (s.audition) {
        const main = Object.entries(s.tags).sort((a, b) => b[1] - a[1])[0][0];
        if ((p.tags[main] || 0) < 2) x *= 0.35;
      }
      parts.extras = x;
    } else parts.extras = 0.4;
    // 2. teaching style
    const cmax = Math.max(...Object.values(p.concept));
    parts.style = cmax > 0 ? (p.concept[s.concept] || 0) / cmax : 0.5;
    // 3. size
    if (!p.size || p.size === 'any') parts.size = 0.7;
    else {
      const order = ['small', 'medium', 'big'], d = Math.abs(order.indexOf(p.size) - order.indexOf(sizeClass(s.pupils)));
      parts.size = d === 0 ? 1 : d === 1 ? 0.5 : 0.1;
    }
    // 4. travel
    const m = minutes(s, p.mode), max = p.maxMin || 20;
    parts.travel = m <= max ? 1 : Math.max(0, 1 - (m - max) / max);
    // 5. friends
    parts.friends = p.friends.includes(s.id) ? 1 : 0;
    // 6. visit feeling
    const v = p.visits[s.id], recs = stationRecs(s, p.visits);
    const avg = recs.length ? recs.reduce((n, r) => n + (REACT_VAL[r.react] || 0), 0) / recs.length : null;
    const heart = v && v.heart != null ? REACT_VAL[v.heart] : null;
    parts.visit = heart != null && avg != null ? 0.6 * heart + 0.4 * avg : heart != null ? heart : avg != null ? 0.2 + 0.6 * avg : 0.4;

    // 7. safety: how safe pupils say they feel, compared with the national average
    const sd = safetyDiff(s);
    parts.safety = sd == null ? 0.5 : Math.max(0, Math.min(1, 0.5 + sd / 0.8));
    // 8. support (zorg): estimate from what the school publishes (see support.score in the data)
    parts.support = s.support && s.support.score != null ? s.support.score : 0.5;
    // 9. a VWO-only first-year class
    parts.vwoBrug = s.vwoOnlyBrugklas === 'yes' ? 1 : s.vwoOnlyBrugklas === 'no' ? 0 : 0.5;

    const w = weights(p);
    let total = 0, sum = 0;
    Object.keys(w).forEach(k => { total += w[k] * (parts[k] || 0); sum += w[k]; });
    // What Lenny really saw counts more than what only fits "on paper":
    // a school he has not visited yet keeps 85% of its score.
    const seen = visited(s, p.visits);
    const score = Math.round((sum ? total / sum * 100 : 0) * (seen ? 1 : UNSEEN));
    return { id: s.id, score, parts, minutes: m, weights: w, seen };
  }

  /* ---------- Lenny's coins = the weights ---------- */
  // Each jar in data.coinJars points to one part of the score. No coins yet = the old default weights.
  function jars() { const d = LQ.Game && LQ.Game.data; return (d && d.coinJars && d.coinJars.jars) || []; }
  function coinsUsed(state) { return Object.values((state && state.coins) || {}).reduce((n, c) => n + (c || 0), 0); }
  function weights(p) {
    const coins = p.coins || {}, out = {};
    if (Object.values(coins).some(c => c > 0)) {
      jars().forEach(j => { out[j.part] = (out[j.part] || 0) + (coins[j.id] || 0); });
      return out;
    }
    return Object.assign({ safety: 0, support: 0, vwoBrug: 0 }, W);
  }

  /* ---------- safety numbers ---------- */
  function nat(kind) { const d = LQ.Game && LQ.Game.data; return d && d.nationalFallback ? d.nationalFallback[kind] : null; }
  // Average gap between the school's "feel safe" score and the national one (null = no data).
  function safetyDiff(s, onlyVwo) {
    const f = s.safety; if (!f) return null;
    const ds = [];
    if (f.feelSafeVwo != null) ds.push(f.feelSafeVwo - (f.nationalVwo != null ? f.nationalVwo : nat('vwo')));
    if (!onlyVwo && f.feelSafeBrugjaar != null) ds.push(f.feelSafeBrugjaar - (f.nationalBrugjaar != null ? f.nationalBrugjaar : nat('brugjaar')));
    return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
  }

  /* ---------- the family minimums ---------- */
  // Returns a list of reasons a school does not pass (empty = passes).
  function rules(state) {
    const d = LQ.Game && LQ.Game.data, base = (d && d.familyRules) || {};
    const fam = (state && state.family) || {};
    const pick = (k) => Object.assign({}, base[k] || {}, fam[k] || {});
    return { vwoOnlyBrugklas: pick('vwoOnlyBrugklas'), safety: pick('safety') };
  }
  function blockedBy(s, state) {
    const R = rules(state), out = [];
    if (R.vwoOnlyBrugklas.on) {
      const v = s.vwoOnlyBrugklas;
      if (v === 'no' || (!v || v === 'unverified') && !R.vwoOnlyBrugklas.unverifiedPasses) out.push('geen pure vwo-brugklas');
    }
    if (R.safety.on) {
      const f = s.safety || {}, m = R.safety.margin != null ? R.safety.margin : 0.3;
      const gap = (v, n, kind) => v == null ? null : v - (n != null ? n : nat(kind));
      const g = [gap(f.feelSafeVwo, f.nationalVwo, 'vwo')];
      if (R.safety.countBrugjaar) g.push(gap(f.feelSafeBrugjaar, f.nationalBrugjaar, 'brugjaar'));
      const bad = g.filter(x => x != null && x < -m - 1e-9);
      if (bad.length) out.push('veiligheidsscore meer dan ' + String(m).replace('.', ',') + ' onder het landelijk gemiddelde');
    }
    return out;
  }

  // Ranked list. By default the family minimums apply: schools that don't pass go to the end, with r.blocked.
  function rank(schools, state, opts) {
    opts = opts || {};
    const p = profileFrom(state, schools);
    const list = schools.map(s => Object.assign(scoreSchool(s, p), { school: s, blocked: opts.pure ? [] : blockedBy(s, state) }));
    return list.sort((a, b) => (a.blocked.length > 0) - (b.blocked.length > 0) || b.score - a.score || a.school.distanceKm - b.school.distanceKm);
  }
  function passing(ranked) { return ranked.filter(r => !r.blocked || !r.blocked.length); }

  // Lenny's likes (strongest first).
  function likes(p) { return Object.entries(p.tags).filter(([, v]) => v >= LIKE_MIN).sort((a, b) => b[1] - a[1]).map(([t]) => t); }
  // Likes that this school offers, best match first.
  function matchedLikes(s, p) {
    return Object.entries(p.tags).filter(([t, v]) => v >= LIKE_MIN && (s.tags[t] || 0) >= OFFER_MIN)
      .sort((a, b) => b[1] * (s.tags[b[0]] || 0) - a[1] * (s.tags[a[0]] || 0)).map(([t]) => t);
  }
  // What a school is strong in (for "this school has..." lines).
  function offers(s) { return Object.entries(s.tags || {}).filter(([, v]) => v >= OFFER_MIN).sort((a, b) => b[1] - a[1]).map(([t]) => t); }
  const likeLabel = (t) => `${LIKE_ICONS[t]} ${TAG_WORDS[t]}`;

  // Short kid-friendly reasons, best first.
  function reasons(r, state) {
    const p = profileFrom(state), s = r.school, out = [];
    const matches = matchedLikes(s, p);
    if (matches.length) {
      const words = matches.slice(0, 2).map(t => TAG_WORDS[t]);
      out.push({ w: r.parts.extras * W.extras, t: `Jij houdt van ${words.join(' en ')}. Dat heeft deze school!` });
    }
    const v = p.visits[s.id];
    if (v && v.heart === 0) out.push({ w: 20, t: 'Je vond je bezoek hier super!' });
    const loved = stationRecs(s, p.visits).filter(x => x.react === 0);
    if (loved.length) out.push({ w: 18, t: loved.length > 1 ? `Binnen vond je "${loved[0].station.title}" en "${loved[1].station.title}" super.` : `Binnen vond je "${loved[0].station.title}" super.` });
    if (p.friends.includes(s.id)) out.push({ w: 12, t: 'Misschien gaan vrienden van jou hier ook heen.' });
    if (r.parts.style >= 0.99 && Math.max(...Object.values(p.concept)) > 0) out.push({ w: 14, t: CONCEPT_WORDS[s.concept] });
    if (r.parts.travel >= 1) out.push({ w: 10 + (30 - r.minutes) / 3, t: `Maar ongeveer ${r.minutes} min ${p.mode === 'walk' ? 'lopen' : 'fietsen'}.` });
    const cw = (part) => (r.weights && r.weights[part]) || 0;
    if (cw('safety') && r.parts.safety >= 0.75) out.push({ w: 6 + cw('safety') * 3, t: 'Kinderen hier zeggen dat ze zich heel veilig voelen op school.' });
    if (cw('support') && r.parts.support >= 0.7) out.push({ w: 6 + cw('support') * 3, t: 'Hier zijn mensen met wie je kunt praten als het even moeilijk is.' });
    if (cw('vwoBrug') && r.parts.vwoBrug >= 1) out.push({ w: 5 + cw('vwoBrug') * 3, t: 'Je kunt beginnen in een klas met alleen vwo-kinderen.' });
    if (r.parts.size >= 0.99 && p.size && p.size !== 'any') out.push({ w: 9, t: { small: 'Het is een knusse, kleine school.', medium: 'Hij is niet te groot en niet te klein.', big: 'Het is een grote school waar veel gebeurt.' }[p.size] });
    if (!out.length) out.push({ w: 1, t: 'Een goede school voor van alles. Ga kijken hoe het voelt!' });
    if (!visited(s, p.visits)) out.unshift({ w: 99, t: 'Je bent hier nog niet binnen geweest. Ga eerst kijken!' });
    const list = out.sort((a, b) => b.w - a.w).slice(0, 3).map(x => x.t);
    if (s.audition) list.push('Let op: hier moet je auditie doen of een intake hebben.');
    return list;
  }

  function stars(score) { return Math.max(1, Math.min(5, Math.round(score / 20))); }

  return { rank, passing, visited, blockedBy, rules, safetyDiff, coinsUsed, jars, weights, reasons, profileFrom, stars, sizeClass, minutes, likes, matchedLikes, offers, likeLabel, WEIGHTS: W, TAG_WORDS, LIKE_ICONS };
})();
