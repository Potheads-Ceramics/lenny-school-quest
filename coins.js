/* =====================================================================
   COIN GAME — Lenny shares 10 coins over jars. The coins in each jar are
   the real weights of the score (see scoring.js, weights()).
   Jar labels live in data/schools.json (coinJars), not here.
   The family only sets minimums (familyRules); Lenny sets the weights.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Coins = (function () {
  const h = (...a) => LQ.h(...a);
  const G = () => LQ.Game;
  const blip = (k) => LQ.Sound && LQ.Sound.play(k || 'blip');

  function total() { return (G().data.coinJars && G().data.coinJars.coins) || 10; }

  // Jars Lenny sees. "Learning style" only shows once he has played quest 3.
  function visibleJars(state) {
    return LQ.Scoring.jars().filter(j => j.id !== 'style' || (state.answers.style && state.answers.style.length));
  }

  // Extra line under some jars, so he remembers what they mean for him.
  function subLine(j, state) {
    const S = LQ.Scoring;
    if (j.id === 'likes') { const l = S.likes(S.profileFrom(state)); return l.length ? l.slice(0, 5).map(t => S.LIKE_ICONS[t]).join(' ') : 'Speel missie 1 en 4 om dit te vullen'; }
    if (j.id === 'size') return { small: 'Jij koos: knus en klein', medium: 'Jij koos: niet te groot, niet te klein', big: 'Jij koos: groot en druk', any: 'Jij zei: maakt me niet uit' }[state.answers.size] || '';
    if (j.id === 'close') return state.mode === 'walk' ? '🚶 lopend' : '🚲 met de fiets';
    if (j.id === 'friends') return (state.answers.friends || []).length ? 'Je tikte ' + state.answers.friends.length + (state.answers.friends.length === 1 ? ' school' : ' scholen') + ' aan' : 'Nog geen vrienden gekozen';
    return '';
  }

  /* Draw the game into `body`. onDone(coins) is called with the final coins. */
  function play(body, state, onDone, opts) {
    opts = opts || {};
    const C = LQ.Challenges, S = LQ.Scoring;
    const list = visibleJars(state);
    const coins = {};
    list.forEach(j => { coins[j.id] = (state.coins && state.coins[j.id]) || 0; });
    const used = () => Object.values(coins).reduce((n, c) => n + c, 0);

    const left = h('p', { class: 'coins', 'aria-live': 'polite' });
    const preview = h('p', { class: 'hint' });
    const rows = {};
    const rowsEl = h('div', { class: 'jars' }, list.map(j => {
      const pile = h('span', { class: 'pile', 'aria-hidden': 'true' });
      const n = h('b', { class: 'jn' });
      const minus = h('button', { class: 'btn jbtn', 'aria-label': 'Haal een munt uit: ' + j.label, onclick: () => { if (coins[j.id] > 0) { coins[j.id]--; blip(); upd(); } } }, '−');
      const plus = h('button', { class: 'btn jbtn', 'aria-label': 'Doe een munt in: ' + j.label, onclick: () => { if (used() < total()) { coins[j.id]++; blip('win'); upd(); } } }, '+');
      const sub = subLine(j, state);
      rows[j.id] = { pile, n, minus, plus };
      return h('div', { class: 'jar' }, [
        h('span', { class: 'jic', 'aria-hidden': 'true' }, j.icon),
        h('span', { class: 'jt' }, [h('b', {}, j.label), sub ? h('small', {}, sub) : null, pile]),
        h('span', { class: 'jctl' }, [minus, n, plus])
      ]);
    }));

    const done = C.next('Klaar!', () => {
      state.coins = Object.assign({}, coins);
      G().save();
      onDone && onDone(state.coins);
    });

    function upd() {
      const u = used(), t = total();
      left.textContent = u < t ? `🪙 Nog ${t - u} munt${t - u > 1 ? 'en' : ''} over` : '🪙 Alle munten zijn verdeeld!';
      list.forEach(j => {
        const r = rows[j.id], c = coins[j.id];
        r.n.textContent = String(c);
        r.pile.textContent = '🪙'.repeat(c);
        r.minus.disabled = c === 0; r.plus.disabled = u >= t;
      });
      done.disabled = u === 0;
      // live preview: what would the top 3 be with these coins?
      const tmp = Object.assign({}, state, { coins: Object.assign({}, coins) });
      const top = u ? S.passing(S.rank(G().data.schools, tmp)).slice(0, 3).map(r => r.school.short) : [];
      preview.textContent = top.length ? 'Jouw top 3 met deze munten: ' + top.join(' · ') : 'Doe een munt in en kijk hoe je top 3 verandert!';
    }

    C.screen(body, [
      C.say(opts.intro || `Je krijgt ${total()} munten. Doe ze in de potten die jij het belangrijkst vindt. Meer munten = belangrijker. Lege potten mogen ook!`),
      h('p', { class: 'hint' }, '🏡 Je familie heeft een paar regels gekozen voor dit avontuur. De rest bepaal jij!'),
      left, rowsEl, preview, C.row([done]), opts.back ? C.back(opts.back) : null
    ]);
    upd();
  }

  // Open the coin game in its own panel (from the results or "change my answers").
  function open(after) {
    const body = LQ.UI.openPanel('Jouw munten', { wide: true });
    play(body, G().state, () => {
      LQ.Sound.play('win'); LQ.UI.hud(); G().refreshStamps();
      if (after) after(); else LQ.UI.closePanel();
      LQ.UI.toast('Munten bewaard! Je lijstje is bijgewerkt.');
    }, { intro: 'Verschuif je munten en kijk hoe je top 3 verandert. Er zijn geen foute antwoorden!' });
  }

  return { play, open, total };
})();
