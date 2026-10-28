/** Two-axis pad: x ∈ [-1, 1] (left → right), y ∈ [0, 1] (bottom → top). Position latches after release. */
import {html, render} from '../dom.js';
import {haptics} from '../haptics.js';

export function createXYPad(el, {value = {x: 0, y: 0}, labels = {top: 'ECHO', bottom: 'DRY', left: 'LOW PASS', right: 'HIGH PASS'}, onInput, onChange, ariaLabel = 'Filter and echo pad'} = {}) {
  let current = {x: clampX(value.x), y: clampY(value.y)};
  el.classList.add('xy');
  el.setAttribute('role', 'application'); el.setAttribute('aria-label', ariaLabel + '. Arrow keys adjust; position holds after release.'); el.tabIndex = 0;
  render(el, html`<span class="xy-axis top">${labels.top}</span><span class="xy-axis bottom">${labels.bottom}</span><span class="xy-axis left">${labels.left}</span><span class="xy-axis right">${labels.right}</span><i class="xy-puck"></i>`);
  const puck = el.querySelector('.xy-puck');
  function clampX(v) { return Math.min(1, Math.max(-1, Number(v) || 0)); }
  function clampY(v) { return Math.min(1, Math.max(0, Number(v) || 0)); }
  function paint() { puck.style.left = `${(current.x + 1) * 50}%`; puck.style.top = `${(1 - current.y) * 100}%`; el.setAttribute('aria-valuetext', `filter ${Math.round(current.x * 100)}%, echo ${Math.round(current.y * 100)}%`); }
  function fromPointer(event) {
    const r = el.getBoundingClientRect();
    const x = clampX(((event.clientX - r.left) / r.width) * 2 - 1);
    const y = clampY(1 - (event.clientY - r.top) / r.height);
    return {x, y};
  }
  function apply(next, {commit = false, silent = false} = {}) {
    current = {x: clampX(next.x), y: clampY(next.y)}; paint();
    if (silent) return;
    onInput?.(current.x, current.y);
    if (commit) onChange?.(current.x, current.y);
  }
  let pointerId = null;
  el.addEventListener('pointerdown', event => {
    if (pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId; el.setPointerCapture?.(event.pointerId); el.classList.add('is-touching');
    haptics.play('contact');
    apply(fromPointer(event));
  });
  el.addEventListener('pointermove', event => { if (event.pointerId === pointerId) apply(fromPointer(event)); });
  const end = event => { if (event.pointerId !== pointerId) return; pointerId = null; el.classList.remove('is-touching'); onChange?.(current.x, current.y); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', event => {
    const stepSize = event.shiftKey ? 0.1 : 0.02;
    const map = {ArrowLeft: {x: -stepSize}, ArrowRight: {x: stepSize}, ArrowUp: {y: stepSize}, ArrowDown: {y: -stepSize}};
    if (event.key in map) { event.preventDefault(); apply({x: current.x + (map[event.key].x || 0), y: current.y + (map[event.key].y || 0)}, {commit: true}); }
  });
  paint();
  return {el, get value() { return {...current}; }, set(x, y) { apply({x, y}, {silent: true}); }, destroy() { el.replaceWith(el.cloneNode(true)); }};
}
