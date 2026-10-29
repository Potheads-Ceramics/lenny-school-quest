/* =====================================================================
   MUSIC — original chiptune tracks, played live with Web Audio.
   No audio files: every note is generated in the browser.
   Outside, Lenny's chosen radio station plays (state.station).
   Inside a school, the calm "school" tune plays.
   Controlled by the 🔇/🔊 button (off by default) and the 📻 radio.

   How a song is written:
     res     steps per bar (8 = eighth notes, 16 = sixteenth notes)
     chords  one per bar: "C3", "A2m" (m = minor), "Bb2"
     parts   bars of melody. A bar has 8 or 16 tokens: a note ("C5", "F#4"),
             "-" holds the note before it, "." is a rest.
     bass    pattern of `res` letters: x root, o octave up, y fifth, - hold, . rest
     drums   patterns of `res` letters per sound: x = hit
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Music = (function () {
  const SONGS = {
    town: {
      title: 'Knus Dorpje', icon: '🌻', blurb: 'Vrolijk pixeldeuntje',
      bpm: 118, res: 8, volume: 0.8,
      chords: ['C3', 'G2', 'A2m', 'F2', 'C3', 'G2', 'F2', 'G2'],
      lead: { wave: 'square', vol: 0.045 },
      parts: [
        ['E5 - G5 - E5 D5 C5 -', 'D5 - B4 - D5 E5 G5 -', 'A5 - G5 E5 - E5 C5 -', 'F5 - E5 D5 C5 - A4 -',
         'E5 G5 C6 - B5 - G5 -', 'A5 G5 - E5 D5 - B4 D5', 'C5 - D5 E5 F5 - A5 -', 'G5 - - - D5 - B4 -'],
        ['. . . . G5 A5 G5 E5', 'D5 - - - . . . .', '. . . . A5 B5 C6 A5', 'G5 - - - . . . .',
         'C6 - B5 - G5 - E5 -', 'D5 - G5 - B5 - D6 -', 'C6 - A5 - F5 - A5 -', 'G5 - - - - - . .']
      ],
      bass: { wave: 'triangle', vol: 0.11, pattern: 'xoxoxoxo' },
      arp: { wave: 'triangle', vol: 0.03 },
      drums: { kick: 'x.x.x.x.', clap: '..x...x.', hat: '.x.x.x.x' }
    },
    fiesta: {
      title: 'Fiesta Beat', icon: '🎺', blurb: 'Reggaeton-swing',
      bpm: 96, res: 16, volume: 0.85,
      chords: ['A2m', 'F2', 'C3', 'G2', 'A2m', 'F2', 'C3', 'G2'],
      lead: { wave: 'square', vol: 0.045 },
      parts: [
        ['. E5 - E5 D5 C5 D5 -', 'C5 - A4 - . . C5 D5', 'E5 - G5 - E5 D5 C5 -', 'D5 - B4 - G4 - . .',
         'A5 - G5 E5 - D5 E5 -', 'C5 - . C5 D5 - E5 -', 'G5 - E5 - D5 C5 D5 -', 'B4 - - - . . . .'],
        ['A4 . C5 . E5 . . A5 . . G5 . E5 . . .', 'F4 . A4 . C5 . . F5 . . E5 . C5 . . .',
         'G4 . C5 . E5 . . G5 . . E5 . D5 . . .', 'B4 - - - D5 - - - G5 - - - . . . .',
         'A4 . C5 . E5 . . A5 . . G5 . E5 . . .', 'F4 . A4 . C5 . . F5 . . E5 . C5 . . .',
         'E5 . . E5 . . D5 . C5 . . D5 . . E5 .', 'A4 - - - - - - - . . . . . . . .']
      ],
      bass: { wave: 'triangle', vol: 0.13, pattern: 'x--x--x-x--x--o-' },
      drums: { kick: 'x...x...x...x...', snare: '...x..x....x..x.', hat: '..x...x...x...x.' }
    },
    funk: {
      title: 'Cowbell Funk', icon: '🔔', blurb: 'Brazilian funk / phonk',
      bpm: 104, res: 16, volume: 0.85,
      chords: ['D3m', 'D3m', 'Bb2', 'A2', 'D3m', 'D3m', 'G2m', 'A2'],
      lead: { wave: 'cowbell', vol: 0.05 },
      parts: [
        ['D5 . D5 . F5 . D5 . A5 . G5 . F5 . E5 .', 'D5 . D5 . F5 . A5 . C6 . A5 . G5 . F5 .',
         'D5 . D5 . F5 . D5 . Bb5 . A5 . G5 . F5 .', 'E5 . E5 . G5 . E5 . C#6 . A5 . . . . .',
         'D5 . D5 . F5 . D5 . A5 . G5 . F5 . E5 .', 'D5 . D5 . F5 . A5 . C6 . A5 . G5 . F5 .',
         'G5 . G5 . Bb5 . G5 . D6 . C6 . Bb5 . A5 .', 'A5 . . . E5 . . . C#5 . . . A4 . . .']
      ],
      bass: { wave: 'sine', vol: 0.2, pattern: 'x------xx-----o-' },
      drums: { kick: 'x..x..x...x..x..', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }
    },
    hard: {
      title: 'Hard Bounce', icon: '🔊', blurb: 'Hardstyle / Dutch dance',
      bpm: 150, res: 8, volume: 0.75, kick: 'hard',
      chords: ['E2m', 'C2', 'G2', 'D2', 'E2m', 'C2', 'G2', 'D2'],
      lead: { wave: 'supersaw', vol: 0.03 },
      parts: [
        ['B4 - E5 - G5 - F#5 E5', 'E5 - G5 - E5 - C5 -', 'D5 - G5 - B5 - A5 G5', 'F#5 - - - A5 - F#5 -',
         'G5 - G5 - B5 - G5 -', 'E5 - E5 - G5 - C6 -', 'B5 - A5 G5 F#5 - G5 A5', 'F#5 - - - D5 - - -'],
        ['. . . . . . . .', '. . . . . . . .', 'B4 - - - D5 - - -', 'F#5 - - - A5 - - -',
         'B4 - E5 - G5 - F#5 E5', 'E5 - G5 - E5 - C5 -', 'D5 - G5 - B5 - A5 G5', 'F#5 - - - - - - -']
      ],
      bass: { wave: 'square', vol: 0.05, pattern: '.o.o.o.o' },
      drums: { kick: 'x.x.x.x.', clap: '..x...x.', hat: '.x.x.x.x' }
    },
    school: {
      title: 'Rustige School', icon: '🎐', blurb: 'Muziekdoosje', inside: true,
      bpm: 80, res: 8, volume: 0.9,
      chords: ['F2', 'C3', 'D3m', 'Bb2', 'F2', 'C3', 'Bb2', 'C3'],
      lead: { wave: 'triangle', vol: 0.07 },
      parts: [
        ['A4 - - C5 - - A4 -', 'G4 - - - E4 - - -', 'F4 - A4 - D5 - C5 -', 'D5 - - - . . . .',
         'C5 - A4 - C5 - F5 -', 'E5 - D5 - C5 - G4 -', 'F4 - G4 - A4 - D5 -', 'C5 - - - - - . .']
      ],
      bass: { wave: 'triangle', vol: 0.11, pattern: 'x---y---' },
      arp: { wave: 'sine', vol: 0.035 },
      drums: null
    }
  };
  const STATIONS = ['town', 'fiesta', 'funk', 'hard'];

  /* ---------- notes ---------- */
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const m = /^([A-G])([#b]?)(-?\d)/.exec(name); if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const BASS_OFF = { x: 0, o: 12, y: 7 };

  // turn a song into a list of steps: each step lists what starts there
  function compile(song) {
    const R = song.res, steps = [];
    song.parts.forEach(part => part.forEach((bar, b) => {
      const chord = song.chords[b], root = midi(chord), minor = /m$/.test(chord);
      const tones = [root + 12, root + 12 + (minor ? 3 : 4), root + 19, root + 24];
      const bs = Array.from({ length: R }, (_, i) => ({ lead: null, bass: null, arp: null, drum: [] }));
      // melody
      const toks = bar.trim().split(/\s+/), per = Math.max(1, Math.round(R / toks.length));
      toks.forEach((t, j) => {
        if (t === '-' || t === '.' || j * per >= R) return;
        let len = 1; while (toks[j + len] === '-') len++;
        bs[j * per].lead = { n: midi(t), len: len * per };
      });
      // bass
      const bp = song.bass && song.bass.pattern;
      if (bp) for (let i = 0; i < R; i++) {
        const c = bp[i]; if (!(c in BASS_OFF)) continue;
        let len = 1; while (bp[i + len] === '-') len++;
        bs[i].bass = { n: root + BASS_OFF[c], len };
      }
      // arpeggio (on eighth notes)
      if (song.arp) { const e = R / 8; for (let k = 0; k < 8; k++) bs[k * e].arp = { n: tones[[0, 1, 2, 3, 2, 1, 0, 1][k]], len: e }; }
      // drums
      if (song.drums) Object.entries(song.drums).forEach(([k, p]) => { for (let i = 0; i < R; i++) if (p[i] === 'x') bs[i].drum.push(k); });
      steps.push(...bs);
    }));
    return steps;
  }

  /* ---------- sound making ---------- */
  let ac = null, out = null, noise = null, crunch = null;
  function ctx() {
    if (ac) return ac;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    out = ac.createGain(); out.gain.value = 0.22; out.connect(ac.destination);
    const n = ac.sampleRate * 0.4; noise = ac.createBuffer(1, n, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    crunch = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; crunch[i] = Math.tanh(x * 5); }
    return ac;
  }
  function env(g, t, dur, vol) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol * 0.75, t + Math.max(0.02, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(bus, wave, n, t, dur, vol) {
    const f = hz(n), g = ac.createGain();
    if (wave === 'cowbell') {
      // two square waves a fifth-ish apart, short and bright
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.3; bp.Q.value = 1.5;
      [1, 1.48].forEach(r => { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f * r; o.connect(bp); o.start(t); o.stop(t + 0.25); });
      g.gain.setValueAtTime(vol * 2.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      bp.connect(g).connect(bus);
      return;
    }
    env(g, t, dur, vol);
    if (wave === 'supersaw') {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      [-14, 0, 14].forEach(c => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; o.connect(lp); o.start(t); o.stop(t + dur + 0.02); });
      lp.connect(g).connect(bus);
      return;
    }
    const o = ac.createOscillator(); o.type = wave; o.frequency.value = f;
    o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function hit(bus, kind, t, hard) {
    if (kind === 'kick') {
      const o = ac.createOscillator(), g = ac.createGain();
      const len = hard ? 0.3 : 0.16;
      o.frequency.setValueAtTime(hard ? 180 : 140, t); o.frequency.exponentialRampToValueAtTime(hard ? 48 : 45, t + len * 0.8);
      g.gain.setValueAtTime(hard ? 0.3 : 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      if (hard) { const ws = ac.createWaveShaper(); ws.curve = crunch; o.connect(ws).connect(g); } else o.connect(g);
      g.connect(bus); o.start(t); o.stop(t + len + 0.02);
      return;
    }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise;
    const cfg = { hat: ['highpass', 7000, 0.05, 0.04], clap: ['bandpass', 1500, 0.14, 0.12], snare: ['bandpass', 2200, 0.16, 0.1] }[kind] || ['bandpass', 1500, 0.1, 0.1];
    f.type = cfg[0]; f.frequency.value = cfg[1];
    g.gain.setValueAtTime(cfg[2], t); g.gain.exponentialRampToValueAtTime(0.0001, t + cfg[3]);
    s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + cfg[3] + 0.02);
  }

  /* ---------- player ---------- */
  let cur = null; // { name, song, steps, i, next, bus, timer }
  function start(name) {
    ctx();
    const song = SONGS[name];
    const bus = ac.createGain(); bus.connect(out);
    const now = ac.currentTime;
    bus.gain.setValueAtTime(0.0001, now); bus.gain.exponentialRampToValueAtTime(song.volume, now + 1.2);
    const p = { name, song, steps: compile(song), i: 0, next: now + 0.08, bus };
    const stepLen = 60 / song.bpm * 4 / song.res;
    p.timer = setInterval(() => {
      while (p.next < ac.currentTime + 0.15) {
        const ev = p.steps[p.i], t = p.next;
        if (ev.lead) tone(bus, song.lead.wave, ev.lead.n, t, ev.lead.len * stepLen * 0.95, song.lead.vol);
        if (ev.bass) tone(bus, song.bass.wave, ev.bass.n, t, ev.bass.len * stepLen * 0.9, song.bass.vol);
        if (ev.arp) tone(bus, song.arp.wave, ev.arp.n, t, ev.arp.len * stepLen * 0.8, song.arp.vol);
        ev.drum.forEach(k => hit(bus, k, t, song.kick === 'hard'));
        p.next += stepLen; p.i = (p.i + 1) % p.steps.length;
      }
    }, 25);
    cur = p;
  }
  function stop() {
    if (!cur) return;
    const p = cur; cur = null;
    clearInterval(p.timer);
    const now = ac.currentTime;
    p.bus.gain.cancelScheduledValues(now);
    p.bus.gain.setValueAtTime(p.bus.gain.value || 0.0001, now);
    p.bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    setTimeout(() => { try { p.bus.disconnect(); } catch (e) {} }, 900);
  }

  function station() { const s = LQ.Game && LQ.Game.state.station; return STATIONS.includes(s) ? s : 'town'; }

  /* Called by the HUD whenever something changes (sound button, radio, enter/leave a school). */
  function sync() {
    const G = LQ.Game; if (!G || !G.state) return;
    const want = G.state.sound ? (G.inside ? 'school' : station()) : null;
    if ((cur ? cur.name : null) === want) return;
    try {
      stop();
      if (want) { start(want); if (ac.state === 'suspended') ac.resume().catch(() => {}); }
    } catch (e) { /* audio not available */ }
  }

  // Browsers only allow sound after a tap or key press: resume then.
  const wake = () => { if (ac && cur && ac.state === 'suspended') ac.resume().catch(() => {}); };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, wake, { passive: true }));
  // Quiet when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {});
    else if (cur) ac.resume().catch(() => {});
  });

  return { sync, SONGS, STATIONS, station, playing: () => cur && cur.name };
})();
