/** Linear fader with catch-and-drag (no jump on touch), detents, keyboard access. */
import {html, render, pct} from '../dom.js';
import {haptics} from '../haptics.js';

export function createFader(el, {orientation = 'vertical', min = 0, max = 1, step = 0, value = min, detents = [], tone, onInput, onChange, ariaLabel = 'Fader', disabled = false} = {}) {
  const vertical = orientation === 'vertical';
  const range = max - min;
  let current = clamp(value);
  el.classList.add('fader', vertical ? 'v' : 'h');
  if (tone) el.classList.add(`tone-${tone}`);
  el.setAttribute('role', 'slider'); el.setAttribute('aria-label', ariaLabel); el.setAttribute('aria-orientation', orientation);
  el.setAttribute('aria-valuemin', String(min)); el.setAttribute('aria-valuemax', String(max)); el.tabIndex = disabled ? -1 : 0;
  render(el, html`<div class="fader-rail"></div><div class="fader-ticks"></div><div class="fader-fill"></div><div class="fader-handle"></div>`);

  function clamp(v) { v = Math.min(max, Math.max(min, Number(v) || 0)); if (step > 0) v = Math.round(v / step) * step; return v; }
  function paint() {
    const pos = (current - min) / range;
    el.style.setProperty('--pos', String(pos));
    el.style.setProperty('--fill', pct(pos));
    el.setAttribute('aria-valuenow', String(Math.round(current * 1000) / 1000));
  }
  function apply(v, {commit = false, silent = false} = {}) {
    current = clamp(v); paint();
    if (silent) return;
    onInput?.(current);
    if (commit) onChange?.(current);
  }
  let drag = null;
  const travel = () => { const r = el.getBoundingClientRect(); return vertical ? Math.max(1, r.height - 20) : Math.max(1, r.width - 24); };
  const onDown = event => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    drag = {pointerId: event.pointerId, start: vertical ? event.clientY : event.clientX, startValue: current, travel: travel(), crossed: new Set(), edge: null};
    el.setPointerCapture?.(event.pointerId);
    el.classList.add('is-dragging');
    haptics.play('contact');
  };
  const onMove = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const delta = vertical ? drag.start - event.clientY : event.clientX - drag.start;
    let next = drag.startValue + (delta / drag.travel) * range;
    for (const d of detents) {
      const near = Math.abs(next - d) < range * 0.02;
      const before = current < d, after = next > d;
      if (near && !drag.crossed.has(d)) { next = d; drag.crossed.add(d); haptics.play('center'); }
      else if (!near && (before !== !after)) drag.crossed.delete(d);
      if (!near) drag.crossed.delete(d);
    }
    const clamped = clamp(next);
    const edge = clamped === min ? 'min' : clamped === max ? 'max' : null;
    if (edge && drag.edge !== edge) haptics.play('edge');
    drag.edge = edge;
    apply(clamped);
  };
  const onUp = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null; el.classList.remove('is-dragging');
    onChange?.(current);
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('keydown', event => {
    if (disabled) return;
    const unit = (step > 0 ? step : range / 100) * (event.shiftKey ? 10 : 1);
    const map = {ArrowUp: unit, ArrowRight: unit, ArrowDown: -unit, ArrowLeft: -unit, PageUp: range / 10, PageDown: -range / 10};
    if (event.key in map) { event.preventDefault(); apply(current + map[event.key], {commit: true}); haptics.play('step'); }
    else if (event.key === 'Home') { event.preventDefault(); apply(min, {commit: true}); }
    else if (event.key === 'End') { event.preventDefault(); apply(max, {commit: true}); }
  });
  paint();
  return {
    el, get value() { return current; },
    set(v) { apply(v, {silent: true}); },
    setDisabled(flag) { disabled = !!flag; el.tabIndex = disabled ? -1 : 0; el.classList.toggle('is-disabled', disabled); },
    destroy() { el.replaceWith(el.cloneNode(true)); }
  };
}
