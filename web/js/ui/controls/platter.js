/** Vinyl platter bound to a deck: rotates from the engine clock; touch scratches (vinyl) or bends tempo (nudge). */
import {html, render, raw} from '../dom.js';
import {haptics} from '../haptics.js';

const RPM = 100 / 3; // 33⅓
const SECONDS_PER_TURN = 60 / RPM;

export function createPlatter(el, {engine, deck, mode = () => 'vinyl', artwork = () => null, onTouch} = {}) {
  el.classList.add('platter', `tone-${deck + 1}`);
  render(el, html`<div class="platter-bezel"></div><svg class="platter-ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/><circle class="ring-progress" cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="301.6" transform="rotate(-90 50 50)"/></svg><div class="platter-vinyl"><i class="platter-marker"></i></div><div class="platter-art"></div><div class="platter-caption">VINYL · 33⅓</div>`);
  const vinyl = el.querySelector('.platter-vinyl'), ring = el.querySelector('.ring-progress'), art = el.querySelector('.platter-art'), caption = el.querySelector('.platter-caption');
  el.style.color = `var(--deck${deck + 1})`;
  let raf = 0, alive = true, lastArt = null, lastEmpty = null;
  const reduced = () => document.documentElement.dataset.motion === 'reduced';

  function paint() {
    if (!alive) return;
    const d = engine.decks[deck];
    const position = engine.position(deck);
    const empty = !d.track;
    if (empty !== lastEmpty) { el.classList.toggle('is-empty', empty); lastEmpty = empty; }
    const turns = position / SECONDS_PER_TURN;
    vinyl.style.transform = reduced() && d.playing ? 'rotate(0deg)' : `rotate(${(turns * 360) % 360}deg)`;
    const progress = d.duration ? position / d.duration : 0;
    ring.style.strokeDashoffset = String(301.6 * (1 - progress));
    const a = artwork(d) || '';
    if (a !== lastArt) { lastArt = a; render(art, a ? raw(a) : ''); }
    caption.textContent = d.scratching ? 'SCRATCH' : d.bend ? (d.bend > 0 ? 'NUDGE +' : 'NUDGE −') : mode() === 'nudge' ? 'NUDGE' : 'VINYL · 33⅓';
    raf = requestAnimationFrame(paint);
  }
  raf = requestAnimationFrame(paint);

  let touch = null;
  const centre = () => { const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, radius: r.width / 2}; };
  const angleAt = (event, c) => Math.atan2(event.clientY - c.y, event.clientX - c.x);
  el.addEventListener('pointerdown', event => {
    if (touch || !engine.decks[deck].track) return;
    event.preventDefault();
    const c = centre();
    touch = {pointerId: event.pointerId, centre: c, angle: angleAt(event, c), startX: event.clientX, mode: mode(), position: engine.position(deck)};
    el.setPointerCapture?.(event.pointerId);
    el.classList.add('is-touching');
    haptics.play('contact');
    onTouch?.(true);
    if (touch.mode === 'vinyl') engine.startScratch(deck);
  });
  el.addEventListener('pointermove', event => {
    if (!touch || event.pointerId !== touch.pointerId) return;
    if (touch.mode === 'vinyl') {
      const a = angleAt(event, touch.centre);
      let delta = a - touch.angle;
      if (delta > Math.PI) delta -= 2 * Math.PI; else if (delta < -Math.PI) delta += 2 * Math.PI;
      touch.angle = a;
      touch.position += (delta / (2 * Math.PI)) * SECONDS_PER_TURN;
      engine.scratchTo(deck, touch.position);
    } else {
      const amount = Math.max(-0.08, Math.min(0.08, (event.clientX - touch.startX) / 240 * 0.08));
      engine.bend(deck, amount);
    }
  });
  const end = event => {
    if (!touch || event.pointerId !== touch.pointerId) return;
    const was = touch; touch = null;
    el.classList.remove('is-touching');
    if (was.mode === 'vinyl') engine.endScratch(deck); else engine.endBend(deck);
    onTouch?.(false);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', event => { if (touch && event.pointerId === touch.pointerId) end(event); });
  return {
    el,
    release() { if (touch) { const was = touch; touch = null; el.classList.remove('is-touching'); if (was.mode === 'vinyl') engine.endScratch(deck); else engine.endBend(deck); } },
    destroy() { alive = false; cancelAnimationFrame(raf); this.release(); }
  };
}
