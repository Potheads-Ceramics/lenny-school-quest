/* =====================================================================
   JOYSTICK — drag-to-move controller for phones and tablets.
   Put a thumb anywhere on the map and drag: the stick appears under the
   thumb and Lenny walks that way (further = faster). A short tap still
   uses tap-to-move. On touch screens a faint stick rests bottom-left so
   Lenny knows it is there. Read by main.js and interior.js via LQ.Joy.vec().
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Joy = (function () {
  const DEAD = 12;    // px the thumb must move before it counts as a drag (taps stay taps)
  const RADIUS = 46;  // px from the centre for full speed
  let id = null, ox = 0, oy = 0, ax = 0, ay = 0, active = false, wasDrag = false;
  let base, knob;
  const touchy = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  function rest() {
    // back to the resting spot (CSS places it); hidden on mouse-only screens
    base.style.left = ''; base.style.top = '';
    knob.style.transform = 'translate(-50%, -50%)';
    base.classList.remove('on');
    base.hidden = !touchy();
  }

  function init() {
    base = LQ.h('div', { id: 'joy', 'aria-hidden': 'true' }, [knob = LQ.h('div', { class: 'joy-knob' })]);
    document.body.appendChild(base);
    rest();
    const canvas = () => document.querySelector('#game canvas');

    document.addEventListener('pointerdown', (e) => {
      if (id !== null || e.target !== canvas() || e.pointerType === 'mouse') return;
      if (LQ.UI && LQ.UI.isOpen()) return;
      id = e.pointerId; wasDrag = false; ox = e.clientX; oy = e.clientY; active = false; ax = ay = 0;
    }, true);

    document.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (!active) {
        if (d < DEAD) return;
        active = true;
        base.hidden = false; base.classList.add('on');
        base.style.left = ox + 'px'; base.style.top = oy + 'px';
      }
      // if the thumb goes far, drag the stick along so it never gets "stuck"
      if (d > RADIUS * 1.6) {
        const k = (d - RADIUS * 1.6) / d; ox += dx * k; oy += dy * k;
        dx = e.clientX - ox; dy = e.clientY - oy;
        base.style.left = ox + 'px'; base.style.top = oy + 'px';
      }
      const dd = Math.hypot(dx, dy), m = Math.min(1, dd / RADIUS);
      ax = dd ? dx / dd * m : 0; ay = dd ? dy / dd * m : 0;
      knob.style.transform = `translate(calc(-50% + ${ax * RADIUS}px), calc(-50% + ${ay * RADIUS}px))`;
      e.preventDefault();
    }, { passive: false });

    const end = (e) => {
      if (e.pointerId !== id) return;
      wasDrag = active; id = null; active = false; ax = ay = 0;
      rest();
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    addEventListener('resize', () => { if (id === null) rest(); });
  }

  // Current push: {ax, ay} from -1..1, or null when the stick is not in use.
  function vec() {
    if (!active) return null;
    if (LQ.UI && LQ.UI.isOpen()) { cancel(); return null; }
    return (Math.abs(ax) + Math.abs(ay)) > 0.05 ? { ax, ay } : null;
  }
  function cancel() { id = null; active = false; ax = ay = 0; if (base) rest(); }
  function dragging() { return active || wasDrag; }

  return { init, vec, cancel, dragging };
})();
