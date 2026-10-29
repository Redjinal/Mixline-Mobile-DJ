/** Desktop keyboard performance shortcuts. Ignored while typing or when a dialog is open (except Escape / ?). */
import {html} from '../ui/dom.js';
import {haptics} from '../ui/haptics.js';

export const SHORTCUTS = [
  {group: 'Deck 1', keys: [['Q', 'Play / pause'], ['W', 'Cue (hold to audition)'], ['E', 'Sync to Deck 2'], ['1 – 4', 'Hot cues 1–4'], ['A / S', 'Nudge slower / faster (hold)'], ['Z', 'Toggle 4-beat loop']]},
  {group: 'Deck 2', keys: [['P', 'Play / pause'], ['O', 'Cue (hold to audition)'], ['I', 'Sync to Deck 1'], ['7 – 0', 'Hot cues 1–4'], ['K / L', 'Nudge slower / faster (hold)'], ['M', 'Toggle 4-beat loop']]},
  {group: 'Mix', keys: [[', / .', 'Crossfader left / right'], ['/', 'Centre the crossfader'], ['Shift + R', 'Record / stop'], ['[ / ]', 'Previous / next workspace'], ['Esc', 'Close dialog or go back'], ['?', 'This list']]}
];

const DECK_KEYS = {
  q: {deck: 0, action: 'toggle'}, w: {deck: 0, action: 'cue'}, e: {deck: 0, action: 'sync'}, a: {deck: 0, action: 'nudge', amount: -0.04}, s: {deck: 0, action: 'nudge', amount: 0.04}, z: {deck: 0, action: 'loop'},
  p: {deck: 1, action: 'toggle'}, o: {deck: 1, action: 'cue'}, i: {deck: 1, action: 'sync'}, k: {deck: 1, action: 'nudge', amount: -0.04}, l: {deck: 1, action: 'nudge', amount: 0.04}, m: {deck: 1, action: 'loop'},
  1: {deck: 0, action: 'hotcue', slot: 0}, 2: {deck: 0, action: 'hotcue', slot: 1}, 3: {deck: 0, action: 'hotcue', slot: 2}, 4: {deck: 0, action: 'hotcue', slot: 3},
  7: {deck: 1, action: 'hotcue', slot: 0}, 8: {deck: 1, action: 'hotcue', slot: 1}, 9: {deck: 1, action: 'hotcue', slot: 2}, 0: {deck: 1, action: 'hotcue', slot: 3}
};

const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable); };
const dialogOpen = () => !!document.querySelector('dialog[open]');

export function createKeyboard({engine, router, navigate, workspaces, toast, sheet, onRecord, onBack}) {
  const held = new Set();
  const report = e => toast(e.message, {kind: 'error'});
  const settle = result => { if (result && typeof result.then === 'function') result.catch(report); };
  function act(binding, down) {
    const d = engine.decks[binding.deck];
    try {
      switch (binding.action) {
        case 'toggle': if (down) settle(engine.toggle(binding.deck)); break;
        case 'cue': if (down) { if (!held.has('cue' + binding.deck)) { held.add('cue' + binding.deck); settle(engine.cueDown(binding.deck)); } } else { held.delete('cue' + binding.deck); settle(engine.cueUp(binding.deck)); } break;
        case 'sync': if (down) engine.sync(binding.deck); break;
        case 'nudge': if (down) { if (d.track) engine.bend(binding.deck, binding.amount); } else engine.endBend(binding.deck); break;
        case 'loop': if (down) engine.loop(binding.deck, d.loop ? 0 : 4); break;
        case 'hotcue': if (down && d.track) { if (d.cues[binding.slot] === null) engine.setCue(binding.deck, binding.slot); else engine.goCue(binding.deck, binding.slot); } break;
      }
      if (down) haptics.play('press');
    } catch (e) { if (down) report(e); }
  }
  function showHelp() {
    sheet({title: 'Keyboard shortcuts', body: html`<div class="stack">${SHORTCUTS.map(g => html`<div><h3 class="label" style="margin-bottom:6px">${g.group}</h3><dl class="kv">${g.keys.map(([k, label]) => html`<dt>${label}</dt><dd><kbd>${k}</kbd></dd>`)}</dl></div>`)}<p class="dim" style="font-size:11px">Shortcuts pause while you type in a field.</p></div>`});
  }
  const onKeyDown = event => {
    if (event.key === 'Escape') { if (dialogOpen() || router.current.name === 'settings') { onBack?.(); event.preventDefault(); } return; }
    if (typing()) return;
    if (event.key === '?') { event.preventDefault(); if (!dialogOpen()) showHelp(); return; }
    if (dialogOpen() || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (event.shiftKey && key === 'r') { event.preventDefault(); onRecord?.(); return; }
    if (key === ',' || key === '.') { event.preventDefault(); engine.setCrossfade(engine.crossfade + (key === ',' ? -0.05 : 0.05)); return; }
    if (key === '/') { event.preventDefault(); engine.setCrossfade(0.5); haptics.play('center'); return; }
    if (key === '[' || key === ']') { event.preventDefault(); const i = workspaces.indexOf(router.current.name); const next = workspaces[(i + (key === ']' ? 1 : workspaces.length - 1)) % workspaces.length]; (navigate || router.navigate)(next); return; }
    const binding = DECK_KEYS[key];
    if (!binding) return;
    event.preventDefault();
    if (event.repeat) return;
    act(binding, true);
  };
  const onKeyUp = event => {
    const binding = DECK_KEYS[event.key.toLowerCase()];
    if (binding && (binding.action === 'cue' || binding.action === 'nudge')) act(binding, false);
  };
  const release = () => { for (const i of [0, 1]) { if (held.has('cue' + i)) { held.delete('cue' + i); engine.cueUp(i); } if (engine.decks[i].bend) engine.endBend(i); } };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', release);
  return {showHelp, release, destroy() { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', release); }};
}
