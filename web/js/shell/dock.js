/** Persistent two-deck transport dock: identities, CUE/PLAY per deck and the crossfader. */
import {html, render, $} from '../ui/dom.js';
import {createFader} from '../ui/controls/fader.js';
import {bindCue, bindPlay, paintPlay, deckStatus} from '../ui/transport.js';

export function createDock(el, {engine, toast}) {
  const onError = e => toast(e.message, {kind: 'error'});
  render(el, html`<div class="dock-inner">
    ${[0, 1].map(i => html`<div class="dock-deck tone-${i + 1} ${i === 1 ? 'is-right' : ''}" data-dock-deck="${i}">
      <div class="dock-id"><span class="deck-number tone-${i + 1}">${i + 1}</span><div class="dock-text"><strong class="truncate" data-dock-title="${i}"></strong><span class="status is-idle" data-dock-status="${i}"></span></div></div>
      <div class="dock-buttons">${i === 0 ? html`<button class="round round-sm tone-1" data-dock-cue="0" aria-label="Cue deck 1">CUE</button><button class="round tone-1" data-dock-play="0"></button>` : html`<button class="round tone-2" data-dock-play="1"></button><button class="round round-sm tone-2" data-dock-cue="1" aria-label="Cue deck 2">CUE</button>`}</div>
    </div>${i === 0 ? html`<div class="dock-center"><div class="xfader"><span class="xfader-label deck1">1</span><div data-dock-xfader></div><span class="xfader-label deck2">2</span></div><span class="dock-hint num" data-dock-hint></span></div>` : ''}`)}
  </div>`);
  const fader = createFader($('[data-dock-xfader]', el), {orientation: 'horizontal', min: 0, max: 1, value: engine.crossfade, detents: [0.5], tone: 'v', ariaLabel: 'Crossfader', onInput: v => engine.setCrossfade(v)});
  const cues = [], plays = [];
  for (const i of [0, 1]) {
    cues[i] = bindCue($(`[data-dock-cue="${i}"]`, el), {engine, deck: i, onError});
    plays[i] = $(`[data-dock-play="${i}"]`, el);
    bindPlay(plays[i], {engine, deck: i, onError});
  }
  function update() {
    for (const i of [0, 1]) {
      const d = engine.decks[i];
      $(`[data-dock-title="${i}"]`, el).textContent = d.track ? d.track.title : `Deck ${i + 1} · Empty`;
      const status = deckStatus(engine, i);
      const s = $(`[data-dock-status="${i}"]`, el);
      s.textContent = status.text; s.className = `status ${status.cls}`;
      paintPlay(plays[i], d);
      $(`[data-dock-cue="${i}"]`, el).disabled = !d.track;
      $(`[data-dock-cue="${i}"]`, el).classList.toggle('is-active', d.cueHeld === 'audition');
    }
    fader.set(engine.crossfade);
    const pctLeft = Math.round((1 - engine.crossfade) * 100);
    $('[data-dock-hint]', el).textContent = engine.fade ? `${engine.fade.style.toUpperCase()} · ${Math.round(engine.fade.progress * 100)}%` : `${engine.curve === 'cut' ? 'CUT' : 'BLEND'} · ${pctLeft} / ${100 - pctLeft}`;
  }
  update();
  return {update, release() { cues.forEach(c => c.release()); }, setVisible(v) { el.hidden = !v; }};
}
