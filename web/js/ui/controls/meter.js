/** Segmented level meter with smoothing and peak hold, drawn on canvas. */
export function createMeter(canvas, {getLevel, horizontal = false, segments = 18} = {}) {
  const ctx = canvas.getContext('2d');
  let level = 0, peak = 0, peakAt = 0, raf = 0, alive = true;
  const reduced = () => document.documentElement.dataset.motion === 'reduced';
  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    return {w: canvas.width, h: canvas.height};
  }
  function colour(fraction) { return fraction > 0.92 ? '#ff4d5e' : fraction > 0.75 ? '#ffb020' : '#39e58c'; }
  function draw() {
    if (!alive) return;
    const raw = Math.min(1, (getLevel?.() || 0) * 2.2);
    level = raw > level ? raw : level * (reduced() ? 0.6 : 0.85);
    if (raw >= peak) { peak = raw; peakAt = performance.now(); } else if (performance.now() - peakAt > 900) peak = Math.max(raw, peak * 0.95);
    const {w, h} = size();
    ctx.clearRect(0, 0, w, h);
    const gap = Math.max(1, Math.round((horizontal ? w : h) / segments * 0.22));
    const seg = ((horizontal ? w : h) - gap * (segments - 1)) / segments;
    for (let i = 0; i < segments; i++) {
      const fraction = (i + 1) / segments;
      const lit = fraction <= level;
      const isPeak = Math.abs(fraction - peak) < 1 / segments / 2 + 0.001 && peak > 0.02;
      ctx.globalAlpha = lit || isPeak ? 1 : 0.18;
      ctx.fillStyle = colour(fraction);
      if (horizontal) ctx.fillRect(i * (seg + gap), 0, seg, h);
      else ctx.fillRect(0, h - (i + 1) * (seg + gap) + gap, w, seg);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  return {destroy() { alive = false; cancelAnimationFrame(raf); }};
}
