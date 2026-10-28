/** Mixer workspace: two channel strips (trim, 3-band EQ with kills, filter, level + meter), master and crossfader. */
import {html, render, delegate, $, $$} from '../ui/dom.js';
import {icon} from '../ui/icons.js';
import {createKnob} from '../ui/controls/knob.js';
import {createFader} from '../ui/controls/fader.js';
import {createMeter} from '../ui/controls/meter.js';
import {haptics} from '../ui/haptics.js';

const BANDS = ['high', 'mid', 'low'];

export function createMixerScreen(ctx) {
  const {engine, toast} = ctx;
  let container = null, controls = [], knobs = {}, faders = {}, key = '';
  const offs = [];
  const on = (el, type, selector, handler) => offs.push(delegate(el, type, selector, handler));

  function strip(i) {
    const d = engine.decks[i];
    return html`<article class="panel mixer-strip tone-${i + 1}" data-strip="${i}">
      <div class="strip-head"><span class="deck-number tone-${i + 1}">${i + 1}</span><strong class="truncate" data-strip-title="${i}">${d.track ? d.track.title : `Deck ${i + 1} · Empty`}</strong></div>
      <div class="strip-eq">${BANDS.map(band => html`<div class="eq-cell"><div data-mix-knob="${i}:${band}"></div><button class="btn btn-sm kill" data-kill="${i}:${band}" aria-pressed="${d.eqKills[band]}">Kill</button></div>`)}</div>
      <div class="strip-lower">
        <div class="strip-knobs"><div data-mix-knob="${i}:trim"></div><div data-mix-knob="${i}:filter"></div></div>
        <div class="strip-fader"><div data-channel="${i}"></div><div class="meter" data-meter="${i}"><canvas></canvas></div><span class="label">Level</span></div>
      </div>
    </article>`;
  }
  function view() {
    return html`<section class="screen mixer">
      <div class="mixer-grid">${strip(0)}${strip(1)}</div>
      <article class="panel master-panel">
        <div class="panel-title"><h2>${icon('speaker', {size: 16})} Master</h2><button class="btn btn-sm" data-master-mute aria-pressed="${engine.masterMuted}">${icon('speaker', {size: 15})} Mute</button></div>
        <div class="master-row"><span class="label">Level</span><div data-master-level></div><span class="num master-value" data-master-value>${Math.round(engine.master * 100)}%</span></div>
        <div class="meter horizontal" data-meter="master"><canvas></canvas></div>
        <div class="master-row"><span class="label">Curve</span><div class="segmented curve-select"><button data-curve="blend" aria-selected="${engine.curve === 'blend'}" class="tone-v">Blend</button><button data-curve="cut" aria-selected="${engine.curve === 'cut'}" class="tone-v">Cut</button></div></div>
        <div class="xfader"><span class="xfader-label deck1">1</span><div data-xfader></div><span class="xfader-label deck2">2</span></div>
      </article>
      <p class="notice">${icon('info')}<span>Channel meters show each deck before the crossfader; the master meter shows what the room hears after the limiter.</span></p>
    </section>`;
  }
  function bind() {
    for (const i of [0, 1]) {
      const d = engine.decks[i];
      for (const band of BANDS) {
        knobs[`${i}:${band}`] = createKnob($(`[data-mix-knob="${i}:${band}"]`, container), {label: band, min: -30, max: 12, value: d.eq[band], defaultValue: 0, detent: 0, tone: String(i + 1), size: 'sm', format: v => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`, onInput: v => engine.setEQ(i, band, v)});
        knobs[`${i}:${band}`].setKilled(d.eqKills[band]);
      }
      knobs[`${i}:trim`] = createKnob($(`[data-mix-knob="${i}:trim"]`, container), {label: 'Trim', min: 0, max: 2, value: d.trim, defaultValue: 1, detent: 1, tone: String(i + 1), size: 'sm', format: v => `${(20 * Math.log10(Math.max(0.001, v))).toFixed(1)} dB`, onInput: v => engine.setTrim(i, v)});
      knobs[`${i}:filter`] = createKnob($(`[data-mix-knob="${i}:filter"]`, container), {label: 'Filter', min: -1, max: 1, value: d.filter, defaultValue: 0, detent: 0, tone: String(i + 1), size: 'sm', format: v => v === 0 ? 'Off' : `${v > 0 ? 'HP' : 'LP'} ${Math.round(Math.abs(v) * 100)}%`, onInput: v => engine.setFilter(i, v)});
      Object.values(knobs).forEach(k => controls.push(k));
      faders[i] = createFader($(`[data-channel="${i}"]`, container), {orientation: 'vertical', min: 0, max: 1.5, value: d.gain, detents: [1], tone: String(i + 1), ariaLabel: `Deck ${i + 1} level`, onInput: v => engine.setGain(i, v)});
      controls.push(faders[i]);
      controls.push(createMeter($(`[data-meter="${i}"] canvas`, container), {getLevel: () => engine.meter(i)}));
    }
    faders.master = createFader($('[data-master-level]', container), {orientation: 'horizontal', min: 0, max: 1, value: engine.master, tone: 'v', ariaLabel: 'Master level', onInput: v => { engine.setMaster(v); $('[data-master-value]', container).textContent = `${Math.round(v * 100)}%`; }});
    faders.x = createFader($('[data-xfader]', container), {orientation: 'horizontal', min: 0, max: 1, value: engine.crossfade, detents: [0.5], tone: 'v', ariaLabel: 'Crossfader', onInput: v => engine.setCrossfade(v)});
    controls.push(faders.master, faders.x, createMeter($('[data-meter="master"] canvas', container), {getLevel: () => engine.meter(), horizontal: true, segments: 28}));
  }
  function patch() {
    for (const i of [0, 1]) {
      const d = engine.decks[i];
      for (const band of BANDS) { knobs[`${i}:${band}`]?.set(d.eq[band]); knobs[`${i}:${band}`]?.setKilled(d.eqKills[band]); const k = $(`[data-kill="${i}:${band}"]`, container); if (k) { k.setAttribute('aria-pressed', String(d.eqKills[band])); k.classList.toggle('btn-danger', d.eqKills[band]); } }
      knobs[`${i}:trim`]?.set(d.trim); knobs[`${i}:filter`]?.set(d.filter); faders[i]?.set(d.gain);
      const title = $(`[data-strip-title="${i}"]`, container); if (title) title.textContent = d.track ? d.track.title : `Deck ${i + 1} · Empty`;
    }
    faders.master?.set(engine.master); faders.x?.set(engine.crossfade);
    const mute = $('[data-master-mute]', container); if (mute) { mute.setAttribute('aria-pressed', String(engine.masterMuted)); mute.classList.toggle('btn-danger', engine.masterMuted); }
    $$('[data-curve]', container).forEach(b => b.setAttribute('aria-selected', String(b.dataset.curve === engine.curve)));
    $('[data-master-value]', container).textContent = `${Math.round(engine.master * 100)}%`;
  }
  return {
    name: 'mixer',
    mount(el) {
      container = el; controls = []; knobs = {}; faders = {};
      render(el, view()); bind(); patch();
      on(el, 'click', '[data-kill]', (e, b) => { const [i, band] = b.dataset.kill.split(':'); engine.setEQKill(Number(i), band, !engine.decks[Number(i)].eqKills[band]); haptics.play('toggle'); });
      on(el, 'click', '[data-master-mute]', () => { engine.setMasterMute(!engine.masterMuted); haptics.play('toggle'); if (engine.masterMuted) toast('Master muted. Deck clocks keep running.', {kind: 'warning'}); });
      on(el, 'click', '[data-curve]', (e, b) => { engine.setCrossfadeCurve(b.dataset.curve); haptics.play('toggle'); });
    },
    unmount() { offs.forEach(off => off()); offs.length = 0; controls.forEach(c => c.destroy?.()); controls = []; container = null; },
    update() { if (container) patch(); }
  };
}
