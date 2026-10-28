/** Decks workspace: dual performance view and a single-deck focus view sharing the live engine. */
import {html, render, delegate, $, $$} from '../ui/dom.js';
import {icon} from '../ui/icons.js';
import {formatTime, formatRemaining} from '../core/time.js';
import {createPlatter} from '../ui/controls/platter.js';
import {createWaveform} from '../ui/controls/waveform.js';
import {createFader} from '../ui/controls/fader.js';
import {createKnob} from '../ui/controls/knob.js';
import {artwork, fallbackCover} from '../ui/artwork.js';
import {bindCue, bindPlay, bindSync, paintPlay, deckStatus} from '../ui/transport.js';
import {bindLongPress} from '../ui/gestures.js';
import {haptics} from '../ui/haptics.js';
import {RATE_MIN, RATE_MAX} from '../core/engine.js';

const LOOP_CHOICES = [1, 2, 4, 8, 16];

export function createDecksScreen(ctx) {
  const {engine, router, toast, loader, confirm, prompt} = ctx;
  const state = {platterMode: ['vinyl', 'vinyl'], waveMode: ['seek', 'seek'], quickLoop: [4, 4]};
  let container = null, params = {}, controls = [], cueBindings = [], timer = 0, key = '', waves = {};
  const onError = e => toast(e.message, {kind: 'error'});
  const bpmText = d => d.bpm ? `${d.bpmSource === 'estimated' ? '≈' : ''}${d.bpm.toFixed(1)} BPM` : '— BPM';
  const tempoText = d => `${d.rate >= 1 ? '+' : ''}${((d.rate - 1) * 100).toFixed(1)}%`;
  const art = (d, size) => d.track ? artwork(d.track, {size}) : html`<div class="art-empty">${icon('music', {size: 22})}</div>`;

  /* ---------- markup ---------- */
  function deckPanel(i) {
    const d = engine.decks[i], t = d.track, empty = !t;
    return html`<article class="deck-panel panel tone-${i + 1} ${empty ? 'is-empty' : ''}" data-deck="${i}">
      <header class="deck-head">
        <button class="deck-art deck-art-btn" data-focus="${i}" aria-label="Expand deck ${i + 1}" ${empty ? 'disabled' : ''}>${art(d, 56)}<span class="deck-art-expand">${icon('expand', {size: 14})}</span></button>
        <div class="deck-id">
          <div class="deck-id-row"><span class="deck-number tone-${i + 1}">${i + 1}</span><span class="status is-idle" data-deck-status="${i}"></span></div>
          <strong class="deck-title truncate" data-deck-title="${i}">${t ? t.title : `Deck ${i + 1} · Empty`}</strong>
          <small class="deck-artist truncate">${t ? (t.artist || t.sourceName || '') : 'Load music from the Library'}</small>
        </div>
      </header>
      <div class="deck-meta num"><span data-deck-bpm="${i}">${bpmText(d)}</span><span class="sep">·</span><span>${t ? formatTime(d.duration) : '--:--'}</span>${t?.key ? html`<span class="sep">·</span><span>${t.key}</span>` : ''}</div>
      <div class="wave h-compact" data-wave="${i}" data-wave-kind="compact"><canvas></canvas></div>
      <div class="wave-times num"><span data-deck-elapsed="${i}">00:00</span><span data-deck-remaining="${i}">-00:00</span></div>
      <div class="platter-wrap">
        <div data-platter="${i}"></div>
        ${empty ? html`<div class="deck-empty"><button class="btn btn-violet" data-load-from-library="${i}">${icon('library', {size: 18})} Load from Library</button></div>` : ''}
        ${d.loading ? html`<div class="deck-loading" role="status"><span class="spinner"></span><span>Decoding…</span><button class="btn btn-sm btn-ghost" data-cancel-load="${i}">Cancel</button></div>` : ''}
      </div>
      <div class="deck-transport">
        <button class="round round-sm tone-${i + 1}" data-cue="${i}" aria-label="Cue deck ${i + 1}">CUE</button>
        <button class="round tone-${i + 1}" data-play="${i}"></button>
        <button class="round round-sm tone-${i + 1}" data-sync="${i}" aria-label="Sync deck ${i + 1}">SYNC</button>
      </div>
      <div class="deck-tempo">
        <span class="label">Tempo</span>
        <div data-tempo="${i}"></div>
        <button class="btn btn-sm btn-ghost num" data-tempo-reset="${i}" title="Reset tempo">${tempoText(d)}</button>
      </div>
      <div class="deck-quick">
        <button class="btn btn-sm" data-loop-quick="${i}" aria-pressed="false">${icon('loop', {size: 15})} <span data-loop-label="${i}">LOOP ${state.quickLoop[i]}</span></button>
        <button class="btn btn-sm" data-slip="${i}" aria-pressed="${d.slip}">SLIP</button>
        <button class="btn btn-sm" data-platter-mode="${i}">${state.platterMode[i] === 'vinyl' ? 'VINYL' : 'NUDGE'}</button>
      </div>
    </article>`;
  }
  function dualView() {
    return html`<section class="screen decks">
      <div class="deck-grid">${deckPanel(0)}${deckPanel(1)}</div>
      <div class="panel panel-tight xfader-panel"><div class="xfader"><span class="xfader-label deck1">1</span><div data-xfader></div><span class="xfader-label deck2">2</span></div></div>
    </section>`;
  }
  function focusView(i) {
    const d = engine.decks[i], t = d.track, o = 1 - i, od = engine.decks[o];
    return html`<section class="screen deck-focus tone-${i + 1}" data-deck="${i}">
      <header class="focus-head">
        <button class="btn btn-icon btn-quiet" data-focus-back aria-label="Back to both decks">${icon('chevronLeft')}</button>
        <div class="deck-art">${art(d, 48)}</div>
        <div class="deck-id"><strong class="deck-title truncate" data-deck-title="${i}">${t ? t.title : `Deck ${i + 1} · Empty`}</strong><small class="truncate">${t ? t.artist || '' : ''} <span class="num" data-deck-bpm="${i}">${bpmText(d)}</span> · ${formatTime(d.duration)}</small></div>
        <span class="deck-number tone-${i + 1}">${i + 1}</span>
      </header>
      <div class="focus-tools">
        <div class="segmented" role="tablist" aria-label="Waveform gesture">${['seek', 'pan', 'scratch'].map(m => html`<button role="tab" data-wave-mode="${m}" aria-selected="${state.waveMode[i] === m}" class="tone-${i + 1}">${m}</button>`)}</div>
        <div class="cluster"><button class="btn btn-sm btn-icon" data-wave-zoom="in" aria-label="Zoom in">${icon('plus', {size: 16})}</button><button class="btn btn-sm btn-icon" data-wave-zoom="out" aria-label="Zoom out">${icon('minus', {size: 16})}</button><button class="btn btn-sm" data-wave-fit>Fit</button><button class="btn btn-sm" data-wave-follow aria-pressed="true">Follow</button></div>
      </div>
      <div class="wave h-detail" data-wave="${i}" data-wave-kind="detail"><canvas></canvas></div>
      <div class="wave h-overview" data-wave="${i}" data-wave-kind="overview"><canvas></canvas></div>
      <div class="wave-times num"><span data-deck-elapsed="${i}">00:00</span><span class="status" data-deck-status="${i}"></span><span data-deck-remaining="${i}">-00:00</span></div>
      <div class="focus-grid">
        <div class="focus-eq">
          ${['high', 'mid', 'low'].map(band => html`<div data-eq="${i}:${band}"></div>`)}
        </div>
        <div class="focus-platter"><div data-platter="${i}"></div></div>
        <div class="focus-side">
          <div data-tempo-v="${i}"></div>
          <button class="btn btn-sm btn-ghost num" data-tempo-reset="${i}">${tempoText(d)}</button>
          <button class="btn btn-sm" data-slip="${i}" aria-pressed="${d.slip}">SLIP</button>
          <button class="btn btn-sm" data-platter-mode="${i}">${state.platterMode[i] === 'vinyl' ? 'VINYL' : 'NUDGE'}</button>
        </div>
      </div>
      <div class="deck-transport big">
        <button class="round tone-${i + 1}" data-cue="${i}" aria-label="Cue">CUE</button>
        <button class="round round-lg tone-${i + 1}" data-play="${i}"></button>
        <button class="round tone-${i + 1}" data-sync="${i}" aria-label="Sync">SYNC</button>
        <div class="focus-loop"><span class="label">Loop</span><div class="cluster">${LOOP_CHOICES.map(n => html`<button class="btn btn-sm" data-loop-beats="${n}" aria-pressed="false">${n}</button>`)}<button class="btn btn-sm btn-ghost" data-loop-exit>Exit</button></div></div>
      </div>
      <div class="hotcues" aria-label="Hot cues">${Array.from({length: 8}, (_, n) => html`<button class="hotcue tone-${i + 1}" data-hotcue="${n}"><span class="hotcue-n">${n + 1}</span><span class="hotcue-name truncate" data-hotcue-name="${n}"></span></button>`)}</div>
      <div class="other-deck panel panel-tight tone-${o + 1}">
        <span class="deck-number tone-${o + 1}">${o + 1}</span>
        <div class="other-text"><strong class="truncate" data-deck-title="${o}">${od.track ? od.track.title : `Deck ${o + 1} · Empty`}</strong><span class="status" data-deck-status="${o}"></span></div>
        <div class="wave h-thumb" data-wave="${o}" data-wave-kind="thumb"><canvas></canvas></div>
        <button class="round round-sm tone-${o + 1}" data-other-play="${o}" data-play="${o}"></button>
        <button class="btn btn-sm" data-sync="${o}">SYNC</button>
      </div>
    </section>`;
  }

  /* ---------- binding ---------- */
  function teardown() {
    controls.forEach(c => c.destroy?.());
    cueBindings.forEach(c => c.release());
    controls = []; cueBindings = []; waves = {};
  }
  function bindDeckControls(i) {
    const d = engine.decks[i];
    $$(`[data-platter="${i}"]`, container).forEach(el => controls.push(createPlatter(el, {engine, deck: i, mode: () => state.platterMode[i], artwork: deck => deck.track ? (deck.track.artwork ? `<img class="art" src="${deck.track.artwork}" alt="">` : fallbackCover(deck.track, 120)) : ''})));
    $$(`[data-wave="${i}"]`, container).forEach(el => {
      const kind = el.dataset.waveKind;
      const wave = createWaveform($('canvas', el), {engine, deck: i, kind, getMode: () => state.waveMode[i], interactive: kind !== 'thumb', onWindow: kind === 'overview' ? () => waves.detail?.window : undefined});
      if (kind === 'detail') waves.detail = wave;
      controls.push(wave);
    });
    $$(`[data-cue="${i}"]`, container).forEach(b => cueBindings.push(bindCue(b, {engine, deck: i, onError})));
    $$(`[data-play="${i}"]`, container).forEach(b => bindPlay(b, {engine, deck: i, onError}));
    $$(`[data-sync="${i}"]`, container).forEach(b => bindSync(b, {engine, deck: i, onError, onDone: () => toast(`Deck ${i + 1} matched to Deck ${2 - i}`, {kind: 'success'})}));
    const tempoOptions = {min: RATE_MIN, max: RATE_MAX, value: d.rate, detents: [1], tone: String(i + 1), ariaLabel: `Deck ${i + 1} tempo`, onInput: v => engine.setRate(i, v)};
    $$(`[data-tempo="${i}"]`, container).forEach(el => controls.push(createFader(el, {...tempoOptions, orientation: 'horizontal'})));
    $$(`[data-tempo-v="${i}"]`, container).forEach(el => controls.push(createFader(el, {...tempoOptions, orientation: 'vertical'})));
    for (const band of ['high', 'mid', 'low']) {
      const el = $(`[data-eq="${i}:${band}"]`, container);
      if (el) controls.push(createKnob(el, {label: band, min: -30, max: 12, value: d.eq[band], defaultValue: 0, detent: 0, tone: String(i + 1), format: v => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`, onInput: v => engine.setEQ(i, band, v)}));
    }
    $$(`[data-hotcue]`, container).forEach(b => bindLongPress(b, async () => {
      const n = Number(b.dataset.hotcue);
      if (engine.decks[i].cues[n] === null) return;
      const ok = await confirm({title: `Clear hot cue ${n + 1}?`, body: 'The cue position and its name will be removed from this deck.', confirmLabel: 'Clear', danger: true});
      if (ok) { engine.clearCue(i, n); haptics.play('warning'); }
    }));
  }
  function bindAll() {
    const focus = params.focus;
    if (focus === 0 || focus === 1) { bindDeckControls(focus); bindDeckControls(1 - focus); }
    else { bindDeckControls(0); bindDeckControls(1); const x = $('[data-xfader]', container); if (x) controls.push(createFader(x, {orientation: 'horizontal', min: 0, max: 1, value: engine.crossfade, detents: [0.5], tone: 'v', ariaLabel: 'Crossfader', onInput: v => engine.setCrossfade(v)})); }
  }
  function structuralKey() { return JSON.stringify([params.focus ?? null, engine.decks.map(d => [d.track?.id || null, !!d.loading, d.slip]), state.platterMode, state.waveMode]); }

  /* ---------- patching frequent state ---------- */
  function patch() {
    if (!container) return;
    for (const i of [0, 1]) {
      const d = engine.decks[i];
      $$(`[data-play="${i}"]`, container).forEach(b => paintPlay(b, d));
      const status = deckStatus(engine, i);
      $$(`[data-deck-status="${i}"]`, container).forEach(s => { s.textContent = status.text; s.className = `status ${status.cls}`; });
      $$(`[data-deck-bpm="${i}"]`, container).forEach(s => { s.textContent = bpmText(d); });
      $$(`[data-tempo-reset="${i}"]`, container).forEach(b => { b.textContent = tempoText(d); });
      $$(`[data-cue="${i}"]`, container).forEach(b => { b.disabled = !d.track; b.classList.toggle('is-active', d.cueHeld === 'audition'); });
      $$(`[data-sync="${i}"]`, container).forEach(b => { b.disabled = !d.track; });
      $$(`[data-loop-quick="${i}"]`, container).forEach(b => { b.setAttribute('aria-pressed', String(!!d.loop)); b.classList.toggle('btn-green', !!d.loop); });
      $$(`[data-loop-label="${i}"]`, container).forEach(s => { s.textContent = d.loop ? `LOOP ${d.loop.beats ? Math.round(d.loop.beats * 100) / 100 : 'ON'}` : `LOOP ${state.quickLoop[i]}`; });
      $$(`[data-slip="${i}"]`, container).forEach(b => b.setAttribute('aria-pressed', String(d.slip)));
      $$(`[data-deck-title="${i}"]`, container).forEach(s => { s.textContent = d.track ? d.track.title : `Deck ${i + 1} · Empty`; });
    }
    if (params.focus === 0 || params.focus === 1) {
      const d = engine.decks[params.focus];
      $$('[data-loop-beats]', container).forEach(b => { const n = Number(b.dataset.loopBeats); b.setAttribute('aria-pressed', String(!!d.loop && Math.abs((d.loop.beats || 0) - n) < 0.01)); b.classList.toggle('btn-green', !!d.loop && Math.abs((d.loop.beats || 0) - n) < 0.01); b.disabled = !d.bpm; });
      $$('[data-hotcue]', container).forEach(b => { const n = Number(b.dataset.hotcue); const set = d.cues[n] !== null; b.classList.toggle('is-set', set); b.style.setProperty('--cue-color', d.cueMeta[n]?.color || ''); $(`[data-hotcue-name="${n}"]`, b).textContent = set ? (d.cueMeta[n]?.name || formatTime(d.cues[n])) : 'Set'; });
      const follow = $('[data-wave-follow]', container); if (follow && waves.detail) follow.setAttribute('aria-pressed', String(waves.detail.follow));
    }
    const x = $('[data-xfader]', container);
    if (x && x.fader) x.fader.set(engine.crossfade);
  }
  function tick() {
    if (!container) return;
    for (const i of [0, 1]) {
      const d = engine.decks[i], p = engine.position(i);
      $$(`[data-deck-elapsed="${i}"]`, container).forEach(s => { s.textContent = formatTime(p); });
      $$(`[data-deck-remaining="${i}"]`, container).forEach(s => { s.textContent = d.duration ? formatRemaining(d.duration, p) : '-00:00'; });
    }
  }
  function refresh(force) {
    const k = structuralKey();
    if (force || k !== key) { key = k; teardown(); render(container, params.focus === 0 || params.focus === 1 ? focusView(params.focus) : dualView()); bindAll(); }
    patch();
  }

  /* ---------- delegated actions ---------- */
  function bindActions(el) {
    delegate(el, 'click', '[data-focus]', (e, b) => router.navigate('decks', {focus: Number(b.dataset.focus)}));
    delegate(el, 'click', '[data-focus-back]', () => router.navigate('decks', {}));
    delegate(el, 'click', '[data-load-from-library]', (e, b) => ctx.openLibrary(Number(b.dataset.loadFromLibrary)));
    delegate(el, 'click', '[data-cancel-load]', (e, b) => { loader.cancel(Number(b.dataset.cancelLoad)); toast('Load cancelled. The deck is unchanged.'); });
    delegate(el, 'click', '[data-tempo-reset]', (e, b) => { engine.setRate(Number(b.dataset.tempoReset), 1); haptics.play('detent'); });
    delegate(el, 'click', '[data-slip]', (e, b) => { const i = Number(b.dataset.slip); engine.setSlip(i, !engine.decks[i].slip); haptics.play('toggle'); });
    delegate(el, 'click', '[data-platter-mode]', (e, b) => { const i = Number(b.dataset.platterMode); state.platterMode[i] = state.platterMode[i] === 'vinyl' ? 'nudge' : 'vinyl'; haptics.play('toggle'); refresh(true); });
    delegate(el, 'click', '[data-loop-quick]', (e, b) => { const i = Number(b.dataset.loopQuick); try { engine.loop(i, engine.decks[i].loop ? 0 : state.quickLoop[i]); haptics.play('toggle'); } catch (err) { onError(err); } });
    delegate(el, 'click', '[data-loop-beats]', (e, b) => { const i = params.focus; const n = Number(b.dataset.loopBeats); try { const d = engine.decks[i]; if (d.loop && Math.abs((d.loop.beats || 0) - n) < 0.01) engine.loop(i, 0); else { engine.loop(i, n); state.quickLoop[i] = n; } haptics.play('toggle'); } catch (err) { onError(err); } });
    delegate(el, 'click', '[data-loop-exit]', () => { engine.loop(params.focus, 0); });
    delegate(el, 'click', '[data-hotcue]', (e, b) => { const i = params.focus, n = Number(b.dataset.hotcue); const d = engine.decks[i]; if (!d.track) return; if (d.cues[n] === null) { engine.setCue(i, n); toast(`Hot cue ${n + 1} set at ${formatTime(d.cues[n])}`, {kind: 'success'}); } else engine.goCue(i, n); haptics.play('press'); });
    delegate(el, 'click', '[data-wave-mode]', (e, b) => { state.waveMode[params.focus] = b.dataset.waveMode; $$('[data-wave-mode]', el).forEach(x => x.setAttribute('aria-selected', String(x === b))); });
    delegate(el, 'click', '[data-wave-zoom]', (e, b) => waves.detail?.zoom(b.dataset.waveZoom === 'in' ? 0.5 : 2));
    delegate(el, 'click', '[data-wave-fit]', () => waves.detail?.fit());
    delegate(el, 'click', '[data-wave-follow]', (e, b) => { waves.detail?.setFollow(!waves.detail.follow); b.setAttribute('aria-pressed', String(waves.detail.follow)); });
  }

  return {
    name: 'decks',
    mount(el, p = {}) { container = el; params = p; key = ''; bindActions(el); refresh(true); timer = setInterval(tick, 100); tick(); },
    unmount() { clearInterval(timer); teardown(); container = null; },
    update() { if (container) refresh(false); },
    get state() { return state; }
  };
}
