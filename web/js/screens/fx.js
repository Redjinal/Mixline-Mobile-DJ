/** FX workspace: latched filter × echo XY pad, effect cards, rack and timed transitions. */
import {html, render, delegate, $, $$} from '../ui/dom.js';
import {icon} from '../ui/icons.js';
import {createXYPad} from '../ui/controls/xypad.js';
import {createKnob} from '../ui/controls/knob.js';
import {haptics} from '../ui/haptics.js';

const STYLES = [['blend', 'Blend'], ['bass', 'Bass swap'], ['echo', 'Echo out']];
const LENGTHS = [4, 8, 16];

export function createFXScreen(ctx) {
  const {engine, toast} = ctx;
  const state = {target: 0, style: 'blend', bars: 8, held: {filter: [null, null], echo: [null, null]}};
  let container = null, xy = null, knobs = {}, controls = [], timer = 0;
  const offs = [];
  const on = (el, type, selector, handler) => offs.push(delegate(el, type, selector, handler));
  const targets = () => state.target === 'both' ? [0, 1] : [state.target];
  const shown = () => engine.decks[state.target === 'both' ? 0 : state.target];
  const seconds = incoming => { const d = engine.decks[incoming]; const bpm = d.bpm || 120; return state.bars * 4 * 60 / bpm; };

  function view() {
    const d = shown();
    return html`<section class="screen fx">
      <div class="fx-head">
        <div class="segmented" role="tablist" aria-label="FX target">${[0, 1].map(n => html`<button role="tab" class="tone-${n + 1}" data-fx-target="${n}" aria-selected="${state.target === n}">Deck ${n + 1}</button>`)}<button role="tab" class="tone-v" data-fx-target="both" aria-selected="${state.target === 'both'}">Both</button></div>
        <div class="cluster"><span class="pill" data-fx-state>${d.fxBypass ? 'BYPASSED' : 'LATCHED'}</span><button class="btn btn-sm" data-fx-bypass aria-pressed="${d.fxBypass}">Bypass</button><button class="btn btn-sm btn-ghost" data-fx-reset>${icon('reset', {size: 14})} Reset</button></div>
      </div>
      <div class="fx-pad-wrap"><div data-xy></div></div>
      <div class="fx-cards">
        <article class="panel fx-card"><div class="panel-title"><h2>Filter</h2><button class="switch" role="switch" data-fx-enable="filter" aria-checked="${state.held.filter[state.target === 'both' ? 0 : state.target] === null}" aria-label="Filter on"></button></div><div data-fx-knob="filter"></div><div class="fx-card-foot"><span>LP</span><button class="btn btn-sm btn-quiet" data-fx-knob-reset="filter">Reset</button><span>HP</span></div></article>
        <article class="panel fx-card"><div class="panel-title"><h2>Echo</h2><button class="switch" role="switch" data-fx-enable="echo" aria-checked="${state.held.echo[state.target === 'both' ? 0 : state.target] === null}" aria-label="Echo on"></button></div><div data-fx-knob="echo"></div><div class="fx-card-foot"><span>Less</span><button class="btn btn-sm btn-quiet" data-fx-knob-reset="echo">Reset</button><span>More</span></div></article>
      </div>
      <article class="panel"><div class="panel-title"><h2>${icon('fx', {size: 16})} Effect rack</h2><span class="pill">${state.target === 'both' ? 'BOTH DECKS' : `DECK ${state.target + 1}`}</span></div>
        <div class="fx-rack"><div data-fx-knob="reverb"></div><div data-fx-knob="feedback"></div><label class="field fx-time"><span>Echo time</span><select class="select" data-fx-echo-time ${!d.bpm ? 'disabled' : ''}>${[0.25, 0.5, 1, 2, 4].map(n => html`<option value="${n}" ${n === d.echoBeats ? 'selected' : ''}>${n} ${n === 1 ? 'beat' : 'beats'}</option>`)}</select>${!d.bpm ? html`<small>375 ms until BPM is set</small>` : ''}</label></div>
      </article>
      <article class="panel transition-panel"><div class="panel-title"><h2>${icon('scissors', {size: 16})} Transition</h2><span class="pill" data-transition-progress>READY</span></div>
        <div class="segmented">${STYLES.map(([s, label]) => html`<button data-transition-style="${s}" aria-selected="${state.style === s}" class="tone-v">${label}</button>`)}</div>
        <div class="transition-row"><div class="segmented">${LENGTHS.map(n => html`<button data-transition-length="${n}" aria-selected="${state.bars === n}" class="tone-v">${n} bars</button>`)}</div></div>
        <div class="two-up"><button class="btn btn-deck1 btn-lg" data-transition-go="0">${icon('chevronLeft', {size: 18})} To Deck 1</button><button class="btn btn-deck2 btn-lg" data-transition-go="1">To Deck 2 ${icon('chevronRight', {size: 18})}</button></div>
        <div class="progress" data-transition-bar><i></i></div>
        <div class="between"><small data-transition-hint>${state.bars} bars ≈ ${seconds(1).toFixed(1)} s at the incoming deck's tempo. Moving any fader or EQ takes over.</small><button class="btn btn-sm btn-ghost" data-transition-cancel hidden>Cancel</button></div>
      </article>
    </section>`;
  }
  function bind() {
    const d = shown();
    xy = createXYPad($('[data-xy]', container), {value: {x: d.filter, y: d.fx.echo}, onInput: (x, y) => { for (const i of targets()) engine.setXY(i, x, y); }});
    xy.el.classList.toggle('is-bypassed', d.fxBypass);
    controls.push(xy);
    const tone = state.target === 'both' ? 'v' : String(state.target + 1);
    knobs.filter = createKnob($('[data-fx-knob="filter"]', container), {label: 'Filter', min: -1, max: 1, value: d.filter, defaultValue: 0, detent: 0, tone, size: 'lg', format: v => `${Math.round(Math.abs(v) * 100)}%`, onInput: v => { for (const i of targets()) engine.setFilter(i, v); }});
    knobs.echo = createKnob($('[data-fx-knob="echo"]', container), {label: 'Echo', min: 0, max: 1, value: d.fx.echo, defaultValue: 0, tone, size: 'lg', format: v => `${Math.round(v * 100)}%`, onInput: v => { for (const i of targets()) engine.setFX(i, 'echo', v); }});
    knobs.reverb = createKnob($('[data-fx-knob="reverb"]', container), {label: 'Reverb', min: 0, max: 1, value: d.fx.reverb, defaultValue: 0, tone, format: v => `${Math.round(v * 100)}%`, onInput: v => { for (const i of targets()) engine.setFX(i, 'reverb', v); }});
    knobs.feedback = createKnob($('[data-fx-knob="feedback"]', container), {label: 'Feedback', min: 0, max: 0.85, value: d.echoFeedback, defaultValue: 0.32, tone, format: v => `${Math.round(v * 100)}%`, onInput: v => { for (const i of targets()) engine.setEcho(i, {feedback: v}); }});
    controls.push(...Object.values(knobs));
  }
  function patch() {
    const d = shown();
    xy?.set(d.filter, d.fx.echo); xy?.el.classList.toggle('is-bypassed', d.fxBypass);
    knobs.filter?.set(d.filter); knobs.echo?.set(d.fx.echo); knobs.reverb?.set(d.fx.reverb); knobs.feedback?.set(d.echoFeedback);
    $('[data-fx-state]', container).textContent = d.fxBypass ? 'BYPASSED' : 'LATCHED';
    const bypass = $('[data-fx-bypass]', container); bypass.setAttribute('aria-pressed', String(d.fxBypass)); bypass.classList.toggle('btn-danger', d.fxBypass);
    const fade = engine.fade, bar = $('[data-transition-bar] i', container), pill = $('[data-transition-progress]', container), cancel = $('[data-transition-cancel]', container);
    bar.style.setProperty('--fill', `${fade ? Math.round(fade.progress * 100) : 0}%`);
    pill.textContent = fade ? `${fade.style.toUpperCase()} → DECK ${fade.incoming + 1} · ${Math.round(fade.progress * 100)}%` : 'READY';
    pill.classList.toggle('is-live', !!fade); cancel.hidden = !fade;
    $$('[data-transition-go]', container).forEach(b => { const i = Number(b.dataset.transitionGo); b.disabled = !engine.decks[i].track; });
    $('[data-transition-hint]', container).textContent = `${state.bars} bars ≈ ${seconds(0).toFixed(1)} s / ${seconds(1).toFixed(1)} s at each deck's tempo. Moving any fader or EQ takes over.`;
    const sel = $('[data-fx-echo-time]', container); if (sel) { sel.disabled = !d.bpm; sel.value = String(d.echoBeats); }
  }
  function remount() { controls.forEach(c => c.destroy?.()); controls = []; knobs = {}; render(container, view()); bind(); patch(); }
  return {
    name: 'fx',
    get state() { return state; },
    mount(el) {
      container = el; remount();
      on(el, 'click', '[data-fx-target]', (e, b) => { const t = b.dataset.fxTarget; state.target = t === 'both' ? 'both' : Number(t); haptics.play('select'); remount(); });
      on(el, 'click', '[data-fx-bypass]', () => { const next = !shown().fxBypass; for (const i of targets()) engine.setFXBypass(i, next); haptics.play('toggle'); });
      on(el, 'click', '[data-fx-reset]', () => { for (const i of targets()) engine.resetFX(i); state.held.filter = [null, null]; state.held.echo = [null, null]; haptics.play('detent'); remount(); });
      on(el, 'click', '[data-fx-knob-reset]', (e, b) => { const which = b.dataset.fxKnobReset; for (const i of targets()) { if (which === 'filter') engine.setFilter(i, 0); else engine.setFX(i, 'echo', 0); } haptics.play('detent'); });
      on(el, 'click', '[data-fx-enable]', (e, b) => {
        const which = b.dataset.fxEnable, on = b.getAttribute('aria-checked') === 'true';
        for (const i of targets()) {
          const d = engine.decks[i];
          if (on) { state.held[which][i] = which === 'filter' ? d.filter : d.fx.echo; if (which === 'filter') engine.setFilter(i, 0); else engine.setFX(i, 'echo', 0); }
          else { const v = state.held[which][i] ?? 0; state.held[which][i] = null; if (which === 'filter') engine.setFilter(i, v); else engine.setFX(i, 'echo', v); }
        }
        b.setAttribute('aria-checked', String(!on)); haptics.play('toggle');
      });
      on(el, 'change', '[data-fx-echo-time]', (e, s) => { for (const i of targets()) engine.setEcho(i, {beats: Number(s.value)}); });
      on(el, 'click', '[data-transition-style]', (e, b) => { state.style = b.dataset.transitionStyle; $$('[data-transition-style]', el).forEach(x => x.setAttribute('aria-selected', String(x === b))); haptics.play('select'); });
      on(el, 'click', '[data-transition-length]', (e, b) => { state.bars = Number(b.dataset.transitionLength); $$('[data-transition-length]', el).forEach(x => x.setAttribute('aria-selected', String(x === b))); haptics.play('select'); patch(); });
      on(el, 'click', '[data-transition-go]', (e, b) => { const i = Number(b.dataset.transitionGo); try { engine.transitionTo(i, seconds(i), state.style); haptics.play('load'); toast(`${STYLES.find(s => s[0] === state.style)[1]} to Deck ${i + 1} over ${state.bars} bars`); } catch (err) { toast(err.message, {kind: 'error'}); } });
      on(el, 'click', '[data-transition-cancel]', () => { engine.cancelFade(); toast('Transition cancelled at its current position.'); });
      timer = setInterval(() => { if (container && engine.fade) patch(); }, 120);
    },
    unmount() { offs.forEach(off => off()); offs.length = 0; clearInterval(timer); controls.forEach(c => c.destroy?.()); controls = []; container = null; },
    update() { if (container) patch(); }
  };
}
