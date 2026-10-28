/** Shared transport bindings so the dock and deck views behave identically. */
import {haptics} from './haptics.js';
import {icon} from './icons.js';
import {render} from './dom.js';

/** Hold to audition from the cue point; tap while playing returns to cue. Releases on cancel/blur. */
export function bindCue(button, {engine, deck, onError}) {
  let held = false;
  const down = async event => {
    if (held) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    held = true;
    button.classList.add('is-pressed');
    button.setPointerCapture?.(event.pointerId);
    haptics.play('press');
    try { await engine.cueDown(deck); } catch (e) { onError?.(e); }
  };
  const up = () => {
    if (!held) return;
    held = false;
    button.classList.remove('is-pressed');
    engine.cueUp(deck);
  };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('lostpointercapture', up);
  button.addEventListener('keydown', event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); down({pointerType: 'keyboard', preventDefault() {}}); } });
  button.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Enter') up(); });
  button.addEventListener('blur', up);
  return {release: up};
}

export function bindPlay(button, {engine, deck, onError}) {
  button.addEventListener('click', async () => {
    haptics.play('press');
    try { await engine.toggle(deck); } catch (e) { onError?.(e); }
  });
}

export function bindSync(button, {engine, deck, onError, onDone}) {
  button.addEventListener('click', () => {
    try { engine.sync(deck); haptics.play('toggle'); onDone?.(); } catch (e) { onError?.(e); }
  });
}

/** Keep a play button's glyph and glow in sync with the deck. */
export function paintPlay(button, deck) {
  const playing = deck.playing && deck.cueHeld !== 'audition';
  button.classList.toggle('is-active', playing);
  button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  button.setAttribute('aria-pressed', String(playing));
  const want = playing ? 'pause' : 'play';
  if (button.dataset.glyph !== want) { button.dataset.glyph = want; render(button, icon(want, {size: 26})); }
  button.disabled = !deck.track;
}

export function deckStatus(engine, i) {
  const d = engine.decks[i];
  if (d.loading) return {text: 'Loading…', cls: 'is-buffering'};
  if (!d.track) return {text: 'Empty', cls: 'is-idle'};
  if (d.scratching) return {text: 'Scratch', cls: `tone-${i + 1}`};
  if (d.cueHeld === 'audition') return {text: 'Cue', cls: `tone-${i + 1}`};
  if (d.playing) return engine.audible(i) ? {text: 'Playing', cls: 'is-playing'} : {text: 'Playing · silent', cls: 'is-silent'};
  return {text: 'Ready', cls: 'is-ready'};
}
