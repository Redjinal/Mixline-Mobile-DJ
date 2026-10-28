/** Rotary control: vertical drag (1 px = 1 % of range, fine = 0.2 %), double-tap reset, arrow keys, detent. */
import {html, render} from '../dom.js';
import {haptics} from '../haptics.js';

const ANGLE = 135; // degrees either side of twelve o'clock
const svgArc = (r, from, to) => {
  const point = a => ({x: 50 + r * Math.cos((a - 90) * Math.PI / 180), y: 50 + r * Math.sin((a - 90) * Math.PI / 180)});
  const p1 = point(from), p2 = point(to), large = Math.abs(to - from) > 180 ? 1 : 0, sweep = to > from ? 1 : 0;
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
};

export function createKnob(el, {label = '', min = 0, max = 1, step = 0, value = min, defaultValue, detent, format = v => String(Math.round(v * 100) / 100), tone = 'v', size = '', onInput, onChange, disabled = false, ariaLabel} = {}) {
  const range = max - min;
  let current = clamp(value);
  const reset = defaultValue ?? (detent ?? min);
  el.classList.add('knob', `tone-${tone}`);
  if (size) el.classList.add(`knob-${size}`);
  render(el, html`<div class="knob-dial" tabindex="${disabled ? -1 : 0}" role="slider" aria-label="${ariaLabel || label}" aria-valuemin="${min}" aria-valuemax="${max}"><svg class="knob-arc" viewBox="0 0 100 100"><path class="arc-bg" d="${svgArc(46, -ANGLE, ANGLE)}" fill="none" stroke-width="4" stroke-linecap="round"/><path class="arc-fg" d="" fill="none" stroke-width="4" stroke-linecap="round"/></svg><i class="knob-pointer"></i></div><div class="knob-label">${label}</div><div class="knob-value num" aria-hidden="true"></div>`);
  const dial = el.querySelector('.knob-dial'), pointer = el.querySelector('.knob-pointer'), arc = el.querySelector('.arc-fg'), valueEl = el.querySelector('.knob-value');

  function clamp(v) { v = Math.min(max, Math.max(min, Number(v) || 0)); if (step > 0) v = Math.round(v / step) * step; return v; }
  function angleOf(v) { return -ANGLE + ((v - min) / range) * ANGLE * 2; }
  function paint() {
    const a = angleOf(current);
    pointer.style.transform = `rotate(${a}deg)`;
    const origin = detent !== undefined ? angleOf(detent) : -ANGLE;
    arc.setAttribute('d', Math.abs(a - origin) < 0.5 ? '' : svgArc(46, Math.min(origin, a), Math.max(origin, a)));
    valueEl.textContent = format(current);
    dial.setAttribute('aria-valuenow', String(Math.round(current * 1000) / 1000));
    dial.setAttribute('aria-valuetext', format(current));
  }
  function apply(v, {commit = false, silent = false} = {}) {
    const next = clamp(v);
    const changed = next !== current;
    current = next; paint();
    if (silent) return;
    if (changed || !commit) onInput?.(current);
    if (commit) onChange?.(current);
  }

  let drag = null, lastTap = 0, lastTapPoint = null, fingers = 0;
  const onDown = event => {
    if (disabled || (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse')) return;
    event.preventDefault();
    fingers++;
    if (fingers > 1) { if (drag) drag.fine = true; return; }
    const now = performance.now();
    const tap = lastTapPoint && now - lastTap < 320 && Math.hypot(event.clientX - lastTapPoint.x, event.clientY - lastTapPoint.y) < 14;
    lastTap = now; lastTapPoint = {x: event.clientX, y: event.clientY};
    if (tap) { apply(reset, {commit: true}); haptics.play('detent'); drag = {ignore: true, pointerId: event.pointerId}; dial.setPointerCapture?.(event.pointerId); return; }
    drag = {pointerId: event.pointerId, startY: event.clientY, startValue: current, fine: event.shiftKey, moved: false, snapped: false};
    dial.setPointerCapture?.(event.pointerId);
    el.classList.add('is-dragging');
    haptics.play('contact');
  };
  const onMove = event => {
    if (!drag || drag.ignore || event.pointerId !== drag.pointerId) return;
    const dy = drag.startY - event.clientY;
    if (Math.abs(dy) > 1) drag.moved = true;
    const perPixel = (drag.fine || event.shiftKey ? 0.002 : 0.01) * range;
    let next = drag.startValue + dy * perPixel;
    if (detent !== undefined && Math.abs(next - detent) < range * 0.015) {
      next = detent;
      if (!drag.snapped) { haptics.play('detent'); drag.snapped = true; }
    } else drag.snapped = false;
    apply(next);
  };
  const onUp = event => {
    if (!drag || event.pointerId !== drag.pointerId) { fingers = Math.max(0, fingers - 1); return; }
    fingers = Math.max(0, fingers - 1);
    const wasDrag = !drag.ignore && drag.moved;
    drag = null;
    el.classList.remove('is-dragging');
    if (wasDrag) onChange?.(current);
  };
  dial.addEventListener('pointerdown', onDown);
  dial.addEventListener('pointermove', onMove);
  dial.addEventListener('pointerup', onUp);
  dial.addEventListener('pointercancel', onUp);
  dial.addEventListener('lostpointercapture', () => { if (drag) { drag = null; fingers = 0; el.classList.remove('is-dragging'); } });
  dial.addEventListener('keydown', event => {
    if (disabled) return;
    const big = event.shiftKey ? 10 : 1;
    const unit = step > 0 ? step : range / 100;
    const map = {ArrowUp: unit * big, ArrowRight: unit * big, ArrowDown: -unit * big, ArrowLeft: -unit * big, PageUp: range / 10, PageDown: -range / 10};
    if (event.key in map) { event.preventDefault(); apply(current + map[event.key], {commit: true}); haptics.play('step'); }
    else if (event.key === 'Home') { event.preventDefault(); apply(min, {commit: true}); }
    else if (event.key === 'End') { event.preventDefault(); apply(max, {commit: true}); }
    else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') { event.preventDefault(); apply(reset, {commit: true}); }
  });
  paint();
  return {
    el, get value() { return current; },
    set(v) { apply(v, {silent: true}); },
    setDisabled(flag) { disabled = !!flag; dial.tabIndex = disabled ? -1 : 0; el.classList.toggle('is-disabled', disabled); },
    setKilled(flag) { el.classList.toggle('is-killed', !!flag); },
    destroy() { dial.replaceWith(dial.cloneNode(true)); }
  };
}
