/** Pads workspace: per-deck hot cues, beat loops and the sampler on an eight-pad grid. */
import {html, render, delegate, $, $$} from '../ui/dom.js';
import {icon} from '../ui/icons.js';
import {formatTime} from '../core/time.js';
import {SAMPLER_SOUNDS} from '../core/demos.js';
import {bindLongPress} from '../ui/gestures.js';
import {haptics} from '../ui/haptics.js';

const LOOPS = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
const CUE_COLORS = ['', '#ff3b3b', '#ffb020', '#39e58c', '#00e5ff', '#a855ff', '#ff577f', '#ffffff'];
const loopLabel = n => n < 1 ? `1/${Math.round(1 / n)}` : String(n);

export function createPadsScreen(ctx) {
  const {engine, toast, sheet} = ctx;
  const state = {deck: 0, mode: 'cues'};
  let container = null, key = '', timer = 0;
  const offs = [];
  const on = (el, type, selector, handler) => offs.push(delegate(el, type, selector, handler));

  function pads() {
    const i = state.deck, d = engine.decks[i], tone = `tone-${i + 1}`;
    if (state.mode === 'cues') return Array.from({length: 8}, (_, n) => {
      const at = d.cues[n], set = at !== null, meta = d.cueMeta[n] || {};
      return html`<button class="pad ${tone} ${set ? 'is-set' : 'is-empty'}" data-pad="${n}" ${!d.track ? 'disabled' : ''} style="${set && meta.color ? `--tone:${meta.color};--tone-rgb:${hexRgb(meta.color)}` : ''}">
        ${set ? html`<span class="pad-n">${n + 1}</span><span class="pad-label">${meta.name || formatTime(at)}</span><div class="pad-bar"><i style="--fill:${d.duration ? (at / d.duration) * 100 : 0}%"></i></div>` : html`<span class="pad-n">${n + 1}</span>${icon('plus', {size: 22})}<span class="pad-label">Set</span>`}
      </button>`;
    });
    if (state.mode === 'loops') return LOOPS.map(n => {
      const active = !!d.loop && Math.abs((d.loop.beats || 0) - n) < 0.01;
      return html`<button class="pad ${tone} ${active ? 'is-set is-active' : ''}" data-pad-loop="${n}" ${!d.track || !d.bpm ? 'disabled' : ''}><span class="pad-n">${icon('loop', {size: 14})}</span><span class="pad-label">${loopLabel(n)}</span><span class="pad-sub">${n === 1 ? 'beat' : 'beats'}</span></button>`;
    });
    return SAMPLER_SOUNDS.map((name, n) => html`<button class="pad tone-v" data-pad="${n}"><span class="pad-n">${n + 1}</span><span class="pad-label">${name}</span><span class="pad-sub">one-shot</span></button>`);
  }
  function footer() {
    const i = state.deck, d = engine.decks[i];
    if (state.mode === 'cues') return html`<div class="pads-footer"><button class="btn btn-sm" data-pad-slip aria-pressed="${d.slip}">Slip</button><div class="cluster">${[-16, -4, 4, 16].map(n => html`<button class="btn btn-sm num" data-pad-jump="${n}" ${!d.bpm ? 'disabled' : ''}>${n > 0 ? '+' : ''}${n}</button>`)}</div><span class="dim">Hold a pad to rename or clear</span></div>`;
    if (state.mode === 'loops') return html`<div class="pads-footer"><div class="cluster"><button class="btn btn-sm" data-pad-loop-in>In</button><button class="btn btn-sm" data-pad-loop-out ${!d.loopIn && d.loopIn !== 0 ? '' : ''}>Out</button><button class="btn btn-sm btn-ghost" data-pad-loop-exit ${!d.loop ? 'disabled' : ''}>Exit</button></div><button class="btn btn-sm" data-pad-slip aria-pressed="${d.slip}">Slip</button>${d.bpm ? html`<span class="dim num">${d.bpm.toFixed(1)} BPM</span>` : html`<button class="btn btn-sm btn-violet" data-pad-tap>${icon('tap', {size: 15})} Tap tempo</button>`}</div>`;
    return html`<div class="pads-footer"><span class="dim">Eight original one-shots play on the master bus and are included in recordings.</span></div>`;
  }
  function view() {
    const i = state.deck, d = engine.decks[i];
    return html`<section class="screen pads">
      <div class="pads-head">
        <div class="segmented" role="tablist" aria-label="Deck">${[0, 1].map(n => html`<button role="tab" class="tone-${n + 1}" data-pad-deck="${n}" aria-selected="${state.deck === n}">Deck ${n + 1}</button>`)}</div>
        <div class="pads-track"><span class="deck-number tone-${i + 1}">${i + 1}</span><strong class="truncate" data-pads-title>${d.track ? d.track.title : `Deck ${i + 1} · Empty`}</strong></div>
      </div>
      <div class="tabs" role="tablist" aria-label="Pad mode">${[['cues', 'Cues'], ['loops', 'Loops'], ['sampler', 'Sampler']].map(([m, label]) => html`<button role="tab" data-pad-mode="${m}" aria-selected="${state.mode === m}" class="${m === 'sampler' ? 'tone-v' : `tone-${i + 1}`}">${label}</button>`)}</div>
      <div class="pad-grid" data-pad-grid>${pads()}</div>
      ${footer()}
      ${!d.track && state.mode !== 'sampler' ? html`<p class="notice">${icon('info')}<span>Load a track on Deck ${i + 1} to use ${state.mode}.</span></p>` : ''}
      ${state.mode === 'loops' && d.track && !d.bpm ? html`<p class="notice is-warning">${icon('warning')}<span>Beat loops need a tempo. Tap the tempo here or analyse it in the Library.</span></p>` : ''}
    </section>`;
  }
  function structuralKey() { const d = engine.decks[state.deck]; return JSON.stringify([state.deck, state.mode, d.track?.id || null, d.bpm, d.cues, d.cueMeta, d.loop?.beats ?? null, d.slip, d.duration]); }
  function refresh(force) { const k = structuralKey(); if (force || k !== key) { key = k; render(container, view()); bindLong(); } }
  function bindLong() {
    if (state.mode !== 'cues') return;
    $$('[data-pad]', container).forEach(b => bindLongPress(b, () => editCue(Number(b.dataset.pad))));
  }
  function hexRgb(hex) { const m = String(hex).replace('#', ''); const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m; return `${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)}`; }
  function editCue(n) {
    const i = state.deck, d = engine.decks[i];
    if (d.cues[n] === null) return;
    const meta = d.cueMeta[n];
    const s = sheet({title: `Hot cue ${n + 1} · ${formatTime(d.cues[n])}`, body: html`<form class="stack" data-cue-form>
      <label class="field"><span>Name</span><input class="input" name="name" value="${meta.name}" maxlength="40" placeholder="e.g. Drop"></label>
      <div class="field"><span>Colour</span><div class="cluster">${CUE_COLORS.map(c => html`<button type="button" class="swatch ${meta.color === c ? 'is-selected' : ''}" data-color="${c}" style="--swatch:${c || 'var(--deck' + (i + 1) + ')'}" aria-label="${c || 'Deck colour'}"></button>`)}</div></div>
      <div class="between"><button type="button" class="btn btn-danger" data-cue-clear>${icon('trash', {size: 16})} Clear cue</button><button type="submit" class="btn btn-primary">Save</button></div>
    </form>`});
    let color = meta.color;
    delegate(s.el, 'click', '[data-color]', (e, b) => { color = b.dataset.color; $$('[data-color]', s.el).forEach(x => x.classList.toggle('is-selected', x === b)); });
    $('[data-cue-clear]', s.el).addEventListener('click', () => { engine.clearCue(i, n); haptics.play('warning'); s.close(); });
    $('[data-cue-form]', s.el).addEventListener('submit', e => { e.preventDefault(); engine.renameCue(i, n, $('[name="name"]', s.el).value, color); s.close(); toast(`Hot cue ${n + 1} saved`, {kind: 'success'}); });
  }
  const flash = b => { b.classList.add('is-active'); setTimeout(() => b.classList.remove('is-active'), 160); };
  return {
    name: 'pads',
    get state() { return state; },
    mount(el) {
      container = el; key = ''; refresh(true);
      on(el, 'click', '[data-pad-deck]', (e, b) => { state.deck = Number(b.dataset.padDeck); haptics.play('select'); refresh(true); });
      on(el, 'click', '[data-pad-mode]', (e, b) => { state.mode = b.dataset.padMode; haptics.play('select'); refresh(true); });
      on(el, 'click', '[data-pad]', (e, b) => {
        const n = Number(b.dataset.pad), i = state.deck, d = engine.decks[i];
        if (state.mode === 'sampler') { engine.sampler(n); flash(b); haptics.play('press'); return; }
        if (!d.track) return;
        if (d.cues[n] === null) { engine.setCue(i, n); haptics.play('load'); toast(`Hot cue ${n + 1} set at ${formatTime(d.cues[n])}`, {kind: 'success'}); }
        else { engine.goCue(i, n); flash(b); haptics.play('press'); }
      });
      on(el, 'click', '[data-pad-loop]', (e, b) => { const n = Number(b.dataset.padLoop), i = state.deck, d = engine.decks[i]; try { if (d.loop && Math.abs((d.loop.beats || 0) - n) < 0.01) engine.loop(i, 0); else engine.loop(i, n); haptics.play('toggle'); } catch (err) { toast(err.message, {kind: 'error'}); } });
      on(el, 'click', '[data-pad-loop-exit]', () => { engine.loop(state.deck, 0); haptics.play('toggle'); });
      on(el, 'click', '[data-pad-loop-in]', () => { const i = state.deck; engine.decks[i].loopIn = engine.position(i); haptics.play('press'); toast(`Loop in at ${formatTime(engine.decks[i].loopIn)}`); });
      on(el, 'click', '[data-pad-loop-out]', () => { const i = state.deck, d = engine.decks[i]; const start = d.loopIn ?? d.cue; try { engine.setLoopPoints(i, start, engine.position(i), {quantize: d.quantize}); haptics.play('toggle'); } catch (err) { toast(err.message, {kind: 'error'}); } });
      on(el, 'click', '[data-pad-slip]', () => { const i = state.deck; engine.setSlip(i, !engine.decks[i].slip); haptics.play('toggle'); });
      on(el, 'click', '[data-pad-jump]', (e, b) => { try { engine.beatJump(state.deck, Number(b.dataset.padJump)); haptics.play('step'); } catch (err) { toast(err.message, {kind: 'error'}); } });
      on(el, 'click', '[data-pad-tap]', () => { const bpm = engine.tap(state.deck); haptics.play('step'); if (bpm) toast(`Tapped ${bpm.toFixed(1)} BPM`); });
      timer = setInterval(() => { if (container && state.mode === 'cues') { /* keep pad bars static; nothing to tick */ } }, 1000);
    },
    unmount() { offs.forEach(off => off()); offs.length = 0; clearInterval(timer); container = null; },
    update() { if (container) refresh(false); }
  };
}
