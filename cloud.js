/* =====================================================================
   CLOUD SAVE — Lenny's player code ("VOS-WOLK-482").
   - On a new device he types his code once; after that the device
     remembers it and he just plays.
   - Every save goes to this device first (localStorage, like before) and
     a few seconds later also online (Supabase, see cloud-config.js and
     supabase-setup.sql). If the internet is down, it tries again later.
   - When the game starts, the newest save wins (this device or online).
   - With no config filled in, nothing here runs and the game saves on
     this device only.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Cloud = (function () {
  const CODE_KEY = 'lennySchoolQuest.code';
  const PUSH_EVERY = 5000; // ms between online saves at most
  const WORDS1 = ['VOS', 'UIL', 'KAT', 'BEER', 'WOLF', 'HAAS', 'DAS', 'EEND', 'PAD', 'VIS', 'MUIS', 'GEIT', 'KOE', 'LEEUW', 'TIJGER', 'PANDA', 'ZEBRA', 'OTTER', 'MOL', 'MEEUW', 'REIGER', 'KIKKER', 'EGEL', 'LAMA', 'HERT', 'BIJ', 'MIER', 'SLAK', 'ROB', 'HAAI'];
  const WORDS2 = ['ZON', 'MAAN', 'STER', 'WOLK', 'BOOM', 'BERG', 'ZEE', 'VUUR', 'IJS', 'WIND', 'REGEN', 'BLAD', 'BLOEM', 'RIVIER', 'BOS', 'DUIN', 'STRAND', 'MOLEN', 'BRUG', 'TOREN', 'HAVEN', 'PARK', 'VELD', 'MEER', 'SNEEUW', 'BLIKSEM', 'NEVEL', 'KOMEET', 'PLANEET', 'RAKET'];

  const cfg = () => LQ.CloudConfig || {};
  const enabled = () => !!(cfg().url && cfg().anonKey);
  let code = null, timer = null, lastSent = '', pending = null, status = 'off', lastOk = null;

  function readCode() { try { return localStorage.getItem(CODE_KEY); } catch (e) { return null; } }
  function writeCode(c) { try { c ? localStorage.setItem(CODE_KEY, c) : localStorage.removeItem(CODE_KEY); } catch (e) {} }
  function newCode() {
    const r = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
    return `${WORDS1[r(WORDS1.length)]}-${WORDS2[r(WORDS2.length)]}-${100 + r(900)}`;
  }
  // Lenny may type "vos wolk 482" or "Vos-Wolk-482 ": make it the same code.
  function clean(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* ---------------- talking to Supabase ---------------- */
  async function rpc(fn, body, keepalive) {
    const key = cfg().anonKey;
    const headers = { 'Content-Type': 'application/json', apikey: key };
    if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key; // old-style anon key
    const res = await fetch(cfg().url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers, body: JSON.stringify(body), keepalive: !!keepalive });
    if (!res.ok) throw new Error('cloud ' + res.status);
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }
  const getRemote = (c) => rpc('lq_get_save', { p_code: c });
  const putRemote = (c, state, keepalive) => rpc('lq_put_save', { p_code: c, p_state: state }, keepalive);

  /* ---------------- saving ---------------- */
  function queue(state) {
    if (!enabled() || !code) return;
    pending = state;
    if (!timer) timer = setTimeout(flush, PUSH_EVERY);
  }
  async function flush(keepalive) {
    clearTimeout(timer); timer = null;
    if (!enabled() || !code || !pending) return;
    const json = JSON.stringify(pending);
    if (json === lastSent) { pending = null; return; }
    const state = pending; pending = null;
    try {
      await putRemote(code, state, keepalive);
      lastSent = json; status = 'ok'; lastOk = new Date();
    } catch (e) {
      status = 'offline';
      if (!pending) pending = state;              // keep it, try again later
      if (!timer) timer = setTimeout(flush, 20000);
    }
  }
  // Save right away (used before a reload, e.g. "start over").
  async function saveNow(state) { pending = state; lastSent = ''; await flush(); }
  addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
  addEventListener('online', () => flush());

  /* ---------------- start of the game ---------------- */
  // Returns the state to play with. Shows the code screen when this device has no code yet.
  async function begin(local, fresh) {
    if (!enabled()) return local;
    code = readCode();
    if (!code) return gate(local, fresh);
    return merge(local, fresh);
  }

  // Pick the newest: this device or online.
  async function merge(local, fresh) {
    try {
      const remote = await getRemote(code);
      status = 'ok'; lastOk = new Date();
      if (remote && (remote.savedAt || 0) > (local.savedAt || 0)) {
        lastSent = JSON.stringify(remote);
        return Object.assign(fresh(), remote);
      }
      // this device is newer (or nothing online yet): send it up
      pending = local; flush();
      return local;
    } catch (e) {
      status = 'offline';
      return local; // play offline; it goes online later
    }
  }

  function el(tag, attrs, kids) { return LQ.h(tag, attrs, kids); }

  function gate(local, fresh) {
    return new Promise((resolve) => {
      document.getElementById('loading').hidden = true;
      const box = el('div', { class: 'gate-box' });
      const wrap = el('div', { id: 'cloudgate', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gate-title' }, [box]);
      document.body.appendChild(wrap);
      const done = (state) => { wrap.remove(); document.getElementById('loading').hidden = false; resolve(state); };
      const hasProgress = !!(local.introDone || Object.keys(local.steps || {}).length || Object.keys(local.visits || {}).length);

      function screen(kids) { box.innerHTML = ''; kids.forEach(k => k && box.appendChild(k)); const f = box.querySelector('input,button'); f && f.focus(); }

      function start() {
        screen([
          el('h1', { id: 'gate-title' }, "Lenny's School Quest"),
          el('p', {}, 'Speel je voor het eerst op dit apparaat?'),
          el('div', { class: 'gate-btns' }, [
            el('button', { class: 'btn primary big', onclick: makeNew }, '✨ Ik ben nieuw'),
            el('button', { class: 'btn big', onclick: enter }, '🔑 Ik heb al een code')
          ])
        ]);
      }

      async function makeNew() {
        const c = newCode();
        code = c; writeCode(c);
        const state = hasProgress ? local : fresh();
        state.savedAt = Date.now();
        screen([
          el('h1', { id: 'gate-title' }, 'Jouw geheime code'),
          el('p', { class: 'gate-code' }, c),
          el('p', {}, 'Met deze code speel je verder op elk apparaat: tablet, laptop of telefoon. Schrijf hem op of maak een foto!'),
          el('div', { class: 'gate-btns' }, [el('button', { class: 'btn primary big', onclick: () => done(state) }, 'Ik heb hem! Spelen')])
        ]);
        saveNow(state);
      }

      function enter(msg) {
        const err = el('p', { class: 'gate-err', 'aria-live': 'polite' }, typeof msg === 'string' ? msg : '');
        const input = el('input', { id: 'gate-input', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'VOS-WOLK-482', 'aria-label': 'Jouw code', oninput: () => { err.textContent = ''; } });
        const go = el('button', { class: 'btn primary big', type: 'submit' }, 'Verder spelen');
        const form = el('form', { onsubmit: async (e) => {
          e.preventDefault();
          const c = clean(input.value);
          if (c.split('-').length !== 3) { err.textContent = 'Een code ziet eruit als DIER-DING-123.'; return; }
          go.disabled = true; err.textContent = 'Even zoeken…';
          try {
            const remote = await getRemote(c);
            if (!remote) { go.disabled = false; err.textContent = 'Die code ken ik niet. Kijk nog eens goed?'; return; }
            code = c; writeCode(c); status = 'ok'; lastOk = new Date(); lastSent = JSON.stringify(remote);
            done(Object.assign(fresh(), remote));
          } catch (x) {
            go.disabled = false; err.textContent = 'Geen internet? Probeer het zo nog eens.';
          }
        } }, [input, err, el('div', { class: 'gate-btns' }, [go, el('button', { class: 'btn', type: 'button', onclick: start }, '← Terug')])]);
        screen([el('h1', { id: 'gate-title' }, 'Typ je code'), form]);
      }

      start();
    });
  }

  // Parents: unlink this device (the online save stays; the code brings it back).
  function forget() { flush(true); writeCode(null); code = null; }

  return {
    enabled, begin, queue, flush, saveNow, forget,
    code: () => code,
    status: () => ({ status, lastOk })
  };
})();
