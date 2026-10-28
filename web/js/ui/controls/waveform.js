/**
 * Waveform canvas bound to a deck. Kinds: 'compact' (whole track, deck view), 'overview' (whole track with
 * detail window), 'detail' (zoomable window), 'thumb' (static strip). Gestures by getMode(): seek | pan | scratch.
 */
import {fitWaveWindow, zoomWaveWindow, timeAtWavePoint, clamp} from '../../core/analysis.js';
import {haptics} from '../haptics.js';

const CSS = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export function createWaveform(canvas, {engine, deck, kind = 'compact', getMode = () => 'seek', interactive = true, onWindow, follow: initialFollow = true, peaks: staticPeaks = null, color: staticColor = null} = {}) {
  const ctx = canvas.getContext('2d');
  let alive = true, raf = 0, staged = null, gesture = null, cache = null;
  let win = null, follow = initialFollow;
  const d = () => engine?.decks[deck];
  const colour = () => staticColor || (deck === 1 ? CSS('--deck2', '#00e5ff') : CSS('--deck1', '#ff3b3b'));
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);

  function size() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight), s = dpr();
    if (canvas.width !== Math.round(w * s) || canvas.height !== Math.round(h * s)) { canvas.width = Math.round(w * s); canvas.height = Math.round(h * s); cache = null; }
    return {w: canvas.width, h: canvas.height};
  }
  function windowFor(duration) {
    if (kind !== 'detail') return {start: 0, span: duration};
    if (!win || win.span > duration || win.span <= 0) win = fitWaveWindow(duration, engine.position(deck), Math.min(duration, 16));
    if (follow && !gesture) {
      const position = engine.position(deck);
      if (position < win.start || position > win.start + win.span * 0.85) win = fitWaveWindow(duration, position + win.span * 0.3, win.span);
    }
    return win;
  }
  function background(peaks, w, h, start, span, duration, c) {
    const key = `${w}|${h}|${start}|${span}|${peaks?.length}|${c}`;
    if (cache && cache.key === key && cache.peaks === peaks) return cache.canvas;
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const o = off.getContext('2d');
    if (kind !== 'thumb') { o.fillStyle = '#08090c'; o.fillRect(0, 0, w, h); }
    o.fillStyle = c; o.globalAlpha = 0.38;
    barsInto(o, peaks, w, h, start, span, duration);
    o.globalAlpha = 1;
    cache = {key, canvas: off, peaks};
    return off;
  }
  function barsInto(o, peaks, w, h, start, span, duration) {
    if (!peaks?.length || !duration) return;
    const first = Math.floor((start / duration) * peaks.length), count = Math.max(1, Math.ceil((span / duration) * peaks.length));
    const barW = w / count, mid = h / 2;
    for (let i = 0; i < count; i++) {
      const p = peaks[Math.min(peaks.length - 1, first + i)] || 0;
      const bh = Math.max(1, p * (h * 0.92));
      o.fillRect(i * barW, mid - bh / 2, Math.max(1, barW - (barW > 3 ? 1 : 0)), bh);
    }
  }
  function draw() {
    if (!alive) return;
    const deckState = d();
    const {w, h} = size();
    const duration = deckState?.duration || 0, peaks = staticPeaks || deckState?.peaks;
    const c = colour();
    ctx.clearRect(0, 0, w, h);
    if (!duration || !peaks?.length) {
      ctx.fillStyle = kind === 'thumb' ? 'transparent' : '#08090c'; if (kind !== 'thumb') ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1 * dpr(); ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      raf = requestAnimationFrame(draw); return;
    }
    const {start, span} = windowFor(duration);
    const x = time => ((time - start) / span) * w;
    ctx.drawImage(background(peaks, w, h, start, span, duration, c), 0, 0);
    const position = engine.position(deck);
    // played region brighter
    const px = clamp(x(position), 0, w);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, px, h); ctx.clip();
    ctx.fillStyle = c; ctx.globalAlpha = 1; barsInto(ctx, peaks, w, h, start, span, duration); ctx.restore();
    if (kind === 'thumb') { raf = requestAnimationFrame(draw); return; }
    const s = dpr();
    // loop region
    if (deckState.loop) {
      const g = CSS('--green', '#39e58c');
      ctx.fillStyle = g; ctx.globalAlpha = 0.18; ctx.fillRect(x(deckState.loop.start), 0, x(deckState.loop.end) - x(deckState.loop.start), h);
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x(deckState.loop.start) - s, 0, 2 * s, h); ctx.fillRect(x(deckState.loop.end) - s, 0, 2 * s, h);
    }
    // markers
    for (const m of deckState.markers || []) { const mx = x(m.position); if (mx < 0 || mx > w) continue; ctx.fillStyle = m.color || CSS('--violet', '#a855ff'); ctx.globalAlpha = 0.9; ctx.fillRect(mx - s / 2, 0, s, h); }
    // hot cues as flags
    (deckState.cues || []).forEach((cue, i) => {
      if (cue === null) return; const cx = x(cue); if (cx < -8 || cx > w + 8) return;
      ctx.globalAlpha = 1; ctx.fillStyle = deckState.cueMeta?.[i]?.color || '#ffffff';
      ctx.fillRect(cx - s, 0, 2 * s, h);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx + 9 * s, 0); ctx.lineTo(cx, 9 * s); ctx.closePath(); ctx.fill();
    });
    // main cue
    if (deckState.cue > 0) { const cx = x(deckState.cue); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7; ctx.fillRect(cx - s / 2, h * 0.3, s, h * 0.7); ctx.globalAlpha = 1; }
    // overview window
    if (kind === 'overview' && onWindow) { const ww = onWindow(); if (ww) { ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = s; ctx.strokeRect(x(ww.start) + s / 2, s / 2, Math.max(2, x(ww.start + ww.span) - x(ww.start)) - s, h - s); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x(ww.start), 0, x(ww.start + ww.span) - x(ww.start), h); } }
    // staged seek
    if (staged !== null) { const sx = x(staged); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(sx - s, 0, 2 * s, h); }
    // playhead
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1; ctx.fillRect(px - s, 0, 2 * s, h);
    ctx.shadowBlur = 0;
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  /* gestures */
  const timeAt = clientX => { const r = canvas.getBoundingClientRect(); const duration = d()?.duration || 0; const wnd = windowFor(duration); return timeAtWavePoint(wnd, (clientX - r.left) / r.width, duration); };
  const pointers = new Map();
  if (interactive) {
    canvas.addEventListener('pointerdown', event => {
      if (!d()?.track) return;
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (pointers.size === 2 && kind === 'detail') {
        const [a, b] = [...pointers.values()];
        gesture = {kind: 'pinch', distance: Math.abs(a.x - b.x) || 1, window: {...windowFor(d().duration)}, centre: (a.x + b.x) / 2};
        if (staged !== null) staged = null;
        return;
      }
      if (gesture) return;
      const mode = getMode();
      const r = canvas.getBoundingClientRect();
      gesture = {kind: mode, pointerId: event.pointerId, startX: event.clientX, startWindow: {...windowFor(d().duration)}, width: r.width, lastTime: timeAt(event.clientX)};
      haptics.play('contact');
      if (mode === 'seek') staged = timeAt(event.clientX);
      else if (mode === 'scratch') { engine.startScratch(deck); gesture.position = engine.position(deck); }
      follow = mode === 'seek' ? follow : false;
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (!gesture) return;
      if (gesture.kind === 'pinch') {
        const [a, b] = [...pointers.values()]; if (!b) return;
        const distance = Math.abs(a.x - b.x) || 1;
        const r = canvas.getBoundingClientRect();
        win = zoomWaveWindow(d().duration, gesture.window, gesture.distance / distance, (gesture.centre - r.left) / r.width);
        return;
      }
      if (event.pointerId !== gesture.pointerId) return;
      if (gesture.kind === 'seek') staged = timeAt(event.clientX);
      else if (gesture.kind === 'pan' && kind === 'detail') {
        const dt = ((gesture.startX - event.clientX) / gesture.width) * gesture.startWindow.span;
        win = fitWaveWindow(d().duration, gesture.startWindow.start + dt + gesture.startWindow.span / 2, gesture.startWindow.span);
      } else if (gesture.kind === 'scratch') {
        const t = timeAt(event.clientX);
        gesture.position = clamp(gesture.position + (t - gesture.lastTime), 0, d().duration);
        gesture.lastTime = t;
        engine.scratchTo(deck, gesture.position);
      }
    });
    const end = (event, cancelled = false) => {
      pointers.delete(event.pointerId);
      if (!gesture) return;
      if (gesture.kind === 'pinch') { if (pointers.size < 2) gesture = null; return; }
      if (event.pointerId !== gesture.pointerId) return;
      const g = gesture; gesture = null;
      if (g.kind === 'seek') { const target = staged; staged = null; if (!cancelled && target !== null) { engine.seek(deck, target); haptics.play('press'); } }
      else if (g.kind === 'scratch') engine.endScratch(deck);
    };
    canvas.addEventListener('pointerup', e => end(e));
    canvas.addEventListener('pointercancel', e => end(e, true));
    canvas.addEventListener('lostpointercapture', e => { if (gesture && e.pointerId === gesture.pointerId) end(e, true); });
  }
  return {
    canvas,
    get window() { return win; },
    setWindow(w) { win = w; follow = false; },
    zoom(factor) { const duration = d()?.duration || 0; if (duration) { win = zoomWaveWindow(duration, windowFor(duration), factor, 0.5); follow = false; } },
    fit() { win = null; follow = true; },
    setFollow(flag) { follow = !!flag; },
    get follow() { return follow; },
    cancel() { staged = null; if (gesture?.kind === 'scratch') engine.endScratch(deck); gesture = null; pointers.clear(); },
    destroy() { alive = false; cancelAnimationFrame(raf); this.cancel(); }
  };
}

/** Static peaks drawing for library rows and the inspector (no engine binding). */
export function drawPeaks(canvas, peaks, {color = '#a855ff', position = null, duration = 0, loop = null, cue = null, background = 'transparent'} = {}) {
  const ctx = canvas.getContext('2d');
  const s = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
  if (canvas.width !== Math.round(w * s) || canvas.height !== Math.round(h * s)) { canvas.width = Math.round(w * s); canvas.height = Math.round(h * s); }
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (background !== 'transparent') { ctx.fillStyle = background; ctx.fillRect(0, 0, W, H); }
  if (!peaks?.length) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = s; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); return; }
  const count = peaks.length, barW = W / count, mid = H / 2;
  const played = duration && position !== null ? (position / duration) * W : -1;
  for (let i = 0; i < count; i++) {
    const x = i * barW, bh = Math.max(1, (peaks[i] || 0) * H * 0.92);
    ctx.fillStyle = color; ctx.globalAlpha = x < played ? 1 : 0.45;
    ctx.fillRect(x, mid - bh / 2, Math.max(1, barW - (barW > 3 ? 1 : 0)), bh);
  }
  ctx.globalAlpha = 1;
  const xOf = t => (t / duration) * W;
  if (loop && duration) { ctx.fillStyle = '#39e58c'; ctx.globalAlpha = 0.2; ctx.fillRect(xOf(loop.start), 0, xOf(loop.end) - xOf(loop.start), H); ctx.globalAlpha = 1; ctx.fillRect(xOf(loop.start) - s, 0, 2 * s, H); ctx.fillRect(xOf(loop.end) - s, 0, 2 * s, H); }
  if (cue !== null && duration) { ctx.fillStyle = '#ffffff'; ctx.fillRect(xOf(cue) - s, 0, 2 * s, H); ctx.beginPath(); ctx.moveTo(xOf(cue), 0); ctx.lineTo(xOf(cue) + 8 * s, 0); ctx.lineTo(xOf(cue), 8 * s); ctx.closePath(); ctx.fill(); }
  if (played >= 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(played - s, 0, 2 * s, H); }
}
