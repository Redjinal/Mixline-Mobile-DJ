// perform/focus-map — the A–D focus path (Document 03 §1: "A nonfocused deck is one selector tap from
// its transport. Selection only changes the view. If a held gesture would disappear, defer the focus
// change until release; never redirect that finger to another deck." Document 19 §4: A–D focus map).
//
// Four stable deck identities as cards (letter + label + shape + colour; colour is secondary). The
// focused pair's transport lives in the shell dock, so its cards say so instead of duplicating Cue /
// Play; every other deck card carries its own 56 dp Cue / Play. The pair chooser (A/B, C/D, A/C,
// B/D) only changes the view and opens Perform on that pair. Nothing here changes musical state.
// Deck states, positions and levels are fixtures (sessions.json + performance.json overlays).
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { prepare, withShell, standInTransport, fixtureNote, stateWord, wrapC } from './ab.js';

const PAIRS = [['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D']];
const PAIR_STATE = { 'A/B': 'four-deck', 'C/D': 'four-deck-cd', 'A/C': 'four-deck-ac', 'B/D': 'four-deck-bd' };

register({
  id: 'perform/focus-map', family: 'performance', title: 'Perform — deck focus map (A–D)', order: 2,
  fr: ['FR-010', 'FR-012', 'FR-013', 'FR-035', 'FR-039'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    'two-deck': { label: 'Two decks — C and D off', exercised: false, scenario: 'set-ready' },
    'four-deck': { label: 'Four decks — focus A/B, C looping', exercised: false, scenario: 'four-deck' },
    'held-gesture-deferred': { label: 'Focus change deferred while A is held', exercised: false, scenario: 'four-deck' },
    'loading-d': { label: 'Deck D loading', exercised: false, scenario: 'four-deck' },
    'missing-c': { label: 'Deck C file missing', exercised: false, scenario: 'four-deck' },
  },
  defaultState: 'two-deck',
  render(ctx) { return renderFocusMap(ctx); },
});

function renderFocusMap(ctx) {
  const s = prepare(ctx);
  const st = ctx.state;
  const land = ctx.orientation === 'landscape';
  const held = st === 'held-gesture-deferred';
  const pair = s.focus;
  const enabled = ['A', 'B', 'C', 'D'].filter((L) => s.decks[L].enabled);
  const root = h('div', { class: `performance-fm performance-fm--${land ? 'landscape' : 'portrait'}`, dataset: { state: st } });

  root.appendChild(h('header', { class: 'performance-fm__head ink-backing' }, [
    h('h1', { class: 'title performance-fm__title' }, [icon('deck-focus', { size: 18 }), h('span', { text: 'Deck focus' })]),
    h('p', { class: 'body performance-fm__lede', text: 'Choosing a pair only changes what you see. Each deck keeps its transport, loops and position; a finger that is down keeps its deck until you lift it.' }),
  ]));

  if (held) {
    root.appendChild(h('section', { class: 'performance-banner tone-info performance-fm__held', role: 'status', 'aria-label': 'Focus change deferred' }, [
      h('div', { class: 'performance-banner__text' }, [
        h('p', { class: 'title performance-banner__title' }, [icon('hand', { size: 18 }), h('span', { text: 'Focus change waits for the held scratch on A to end' })]),
        h('p', { class: 'body', text: 'You asked for C/D while a finger is down on the A jog. The scratch stays on Deck A; C/D comes into view when you lift your finger. Nothing is redirected to another deck.' }),
      ]),
    ]));
  }

  // Pair chooser.
  const chooser = h('section', { class: 'performance-fm__pairs', role: 'group', 'aria-label': 'Focused pair' }, [
    h('p', { class: 'label performance-fm__pairs-label', text: `In focus: ${pair.join('/')}${held ? ' · C/D requested' : ''}` }),
  ]);
  for (const [a, b] of PAIRS) {
    const key = `${a}/${b}`;
    const available = s.decks[a].enabled && s.decks[b].enabled;
    const current = pair.join('/') === key;
    const requested = held && key === 'C/D';
    const btn = button({
      label: key, fr: ['FR-012'], cls: `performance-fm__pair${requested ? ' performance-fm__pair--requested' : ''}`,
      attrs: { 'aria-label': `Focus pair ${key}`, 'aria-pressed': String(current), disabled: available ? null : true, title: available ? null : 'Decks C and D are off in this session' },
      on: { click: () => {
        if (held && !current) { flagDeferred(root, key); return; }
        if (s.deckCount > 2) ctx.navigate('perform/ab', { state: PAIR_STATE[key] });
        else ctx.navigate('perform/ab', { state: key === 'A/B' ? 'set-ready' : null });
      } },
    });
    if (requested) btn.appendChild(h('span', { class: 'performance-fm__waits label', text: 'Waits' }));
    chooser.appendChild(btn);
  }
  if (s.deckCount <= 2) chooser.appendChild(h('p', { class: 'body performance-fm__off', text: 'Decks C and D are off in this session. Four decks are a selected capability; turning them on is a session setting, not a performance control.' }));
  root.appendChild(chooser);

  // Deck cards.
  const grid = h('section', { class: 'performance-fm__grid', 'aria-label': 'Decks A to D' });
  for (const L of ['A', 'B', 'C', 'D']) grid.appendChild(deckCard(ctx, s, s.decks[L], { pair, held, enabled: enabled.includes(L), st }));
  root.appendChild(grid);
  root.appendChild(fixtureNote('Deck states, positions and levels are fixtures. Cue / Play here show SENT until the prototype acknowledges.'));

  standInTransport(root);
  withShell(root, (shell) => {
    shell.querySelector('.shell__dock')?.addEventListener('mdj:focus-deck', (e) => {
      const L = e.detail?.deck;
      if (!L) return;
      if (held && L !== 'A' && L !== 'B') { flagDeferred(root, 'C/D'); return; }
      if (s.deckCount > 2) ctx.navigate('perform/ab', { state: L === 'C' || L === 'D' ? 'four-deck-cd' : 'four-deck' });
      else ctx.navigate('perform/ab', { state: L === 'B' ? 'focus-b' : 'set-ready' });
    });
  });
  return root;
}

function deckCard(ctx, s, d, { pair, held, enabled, st }) {
  const L = d.letter;
  const inPair = pair.includes(L);
  const t = d.track;
  const card = h('article', { class: `performance-fm__card glass deck-${L.toLowerCase()}${inPair ? ' performance-fm__card--focus' : ''}${!enabled ? ' performance-fm__card--off' : ''}`, 'aria-label': `Deck ${L}` });
  const word = !enabled ? 'Off' : d.state === 'playing' && d.loop?.active ? `Playing · loop ${d.loop.bars}` : stateWord(d);
  card.appendChild(h('div', { class: 'performance-fm__card-head' }, [
    h('span', { class: 'performance-chip numeral performance-fm__letter', text: L }),
    h('span', { class: 'label label-strong', text: `Deck ${L}` }),
    h('span', { class: `performance-fm__state label performance-fm__state--${enabled ? d.state : 'off'}` }, [icon(!enabled ? 'unavailable' : d.state === 'playing' ? 'play' : d.state === 'loading' ? 'loader' : d.state === 'missing' ? 'missing' : d.state === 'empty' ? 'plus' : 'pause', { size: 12 }), h('span', { text: word })]),
  ]));
  card.appendChild(h('p', { class: 'title performance-fm__track wrap-2', text: !enabled ? 'Not in use' : t ? t.title : 'No track loaded' }));
  if (enabled && t) {
    card.appendChild(h('p', { class: 'performance-fm__meta numeral' }, [
      h('span', { text: `${fmt.time(d.positionSec)} / ${fmt.time(t.durationSec)}` }),
      h('span', { text: `${fmt.bpm(t.bpm)} BPM` }), h('span', { class: 'performance-fm__key', text: t.key }),
    ]));
  }
  // Notes that explain the state in plain words.
  const note = (text, tone = '') => card.appendChild(h('p', { class: `performance-fm__note body ${tone}`.trim(), text }));
  if (held && L === 'A') note('Held · scratch. This finger stays on Deck A until release.', 'tone-info');
  if (held && (L === 'C' || L === 'D')) note('Focus requested — comes into view after the A scratch is released.');
  if (enabled && d.state === 'loading') note(`Loading ${t?.title || ''}: the engine has not acknowledged the load. Progress unknown.`);
  if (enabled && d.state === 'missing') note('File missing — the saved cues and position are kept. Locate the file to play this deck.', 'tone-critical');

  // Transport: the focused pair's Cue / Play are in the dock; other decks carry their own.
  if (!enabled) {
    card.appendChild(h('p', { class: 'performance-fm__note body muted', text: 'Off in this session.' }));
  } else if (inPair) {
    card.appendChild(h('p', { class: 'performance-fm__dock label' }, [icon('arrow-down', { size: 12 }), h('span', { text: 'Cue / Play in the dock' })]));
  } else {
    const ok = !!t && !['loading', 'missing', 'empty'].includes(d.state);
    card.appendChild(h('div', { class: 'performance-fm__transport', role: 'group', 'aria-label': `Deck ${L} transport` }, [
      h('mdj-transport', { kind: 'cue', deck: L, size: 56, state: ok ? (d.cueSelected ? 'active' : 'idle') : 'disabled' }),
      h('mdj-transport', { kind: 'play', deck: L, size: 56, state: ok ? (d.state === 'playing' ? 'playing' : 'paused') : 'disabled' }),
    ]));
  }
  if (enabled && d.state === 'missing') card.appendChild(button({ label: 'Locate file', icon: 'folder', attrs: { 'aria-label': `Locate file for deck ${L}` }, on: { click: () => ctx.navigate('launch/library') } }));
  if (enabled && !inPair && s.deckCount > 2) {
    const target = L === 'C' || L === 'D' ? 'four-deck-cd' : 'four-deck';
    card.appendChild(button({ label: 'Show in Perform', icon: 'deck-focus', fr: ['FR-012'], attrs: { 'aria-label': `Show deck ${L} in Perform (pair ${L === 'C' || L === 'D' ? 'C/D' : 'A/B'})` }, on: { click: () => { if (held) flagDeferred(card.closest('.performance-fm'), 'C/D'); else ctx.navigate('perform/ab', { state: target }); } } }));
  }
  return card;
}

function flagDeferred(root, key) {
  root.querySelector('.performance-fm__toast')?.remove();
  root.appendChild(wrapC('performance-toast performance-fm__toast', h('mdj-toast', { tone: 'info', icon: 'hand', message: `Focus ${key} waits for release`, detail: 'The held scratch on Deck A keeps its deck. The view changes when you lift your finger.', state: 'visible' })));
}
