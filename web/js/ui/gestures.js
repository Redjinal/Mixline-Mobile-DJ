/** Long-press detection that does not interfere with taps. */
export function bindLongPress(el, onLong, {delay = 480, onTap} = {}) {
  let timer = 0, fired = false, start = null;
  el.addEventListener('pointerdown', event => {
    fired = false; start = {x: event.clientX, y: event.clientY};
    timer = setTimeout(() => { fired = true; onLong(event); }, delay);
  });
  const cancel = () => { clearTimeout(timer); };
  el.addEventListener('pointermove', event => { if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancel(); });
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('click', event => { if (fired) { event.preventDefault(); event.stopImmediatePropagation(); fired = false; return; } onTap?.(event); }, true);
  el.addEventListener('contextmenu', event => event.preventDefault());
}
