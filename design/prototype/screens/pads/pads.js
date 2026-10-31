// pads/pads — performance pads for the focused deck (Document 03 §4 "Hot cues / loop pads": cue numbers
// and bank always visible, quantized commands display pending execution, editing/deleting requires an
// explicit edit state, no destructive long-press; FR-011 / FR-017 / FR-026; Document 19 §4 pads:
// bank/mode, edit, pending/active latch, unavailable stems).
//
// Composition: the pads workspace row (Pads · Loops · FX · Stems), a deck line that names the deck, its
// track and the quantize setting on opaque backing, then <mdj-pad-bank> (mode tabs for the eight FR-026
// modes, bank 1–4 radios, a 2 × 4 grid of 56 dp pads) and a caption panel under the bank that explains
// the current mode/state in words with the next action. Portrait shows ONE deck (the focused deck of the
// pair, chosen with the 56 dp deck selectors in the deck line); landscape shows both decks of the focused
// pair side by side, each with its own bank, caption and Edit button.
//
// No engine exists. The screen stands in for the engine: a tap on hot cue 3 moves to the
// pending-quantized state (the pad shows Q · 1 beat; nothing claims it fired); tapping it again cancels.
// Mode and bank selection are view state (acknowledged immediately, never a pad hit). Other pad taps and
// edit actions print what would be sent and stay unacknowledged.
import { register } from '../../app/registry.js';
import { h, button, icon } from '../../components/base.js';
import { load } from '../../app/fixtures.js';

const data = await load('pads'); // fixtures/pads.json

export const QUANTIZE = '1 beat';
const MODE_TITLE = { cue: 'Hot cues', loop: 'Loops', roll: 'Loop roll', jump: 'Beat jump', slicer: 'Slicer', sampler: 'Sampler', 'pitch-play': 'Pitch play', stem: 'Stems' };

// ---------- shared helpers for the pads family ----------
const WORKSPACES = [['pads/pads', 'Pads', 'pads'], ['pads/loops', 'Loops', 'loop'], ['pads/fx', 'FX', 'fx'], ['pads/stems', 'Stems', 'stems']];

// Workspace row: the four pads-family views. Navigation only — never a deck or transport command.
export function padsNav(ctx, current) {
  return h('nav', { class: 'pads-nav', 'aria-label': 'Pads, loops, FX and stems' }, WORKSPACES.map(([id, label, ic]) => h('button', {
    type: 'button', class: `pads-nav__tab${id === current ? ' is-current' : ''}`, dataset: { hit: '48' },
    'aria-current': id === current ? 'page' : null, 'aria-label': `${label} workspace`,
    on: { click: () => { if (id !== current) ctx.navigate(id); } },
  }, [icon(ic, { size: 16 }), h('span', { class: 'pads-nav__label', text: label })])));
}

// Deck identity chip: letter + deck colour edge (identity never by colour alone).
export function deckChip(letter, extra = '') {
  return h('span', { class: `pads-deckchip numeral deck-${letter.toLowerCase()} ${extra}`.trim(), 'aria-hidden': 'true', text: letter });
}

// One-line deck identity: chip, "Deck A · playing", track title (wraps to two lines), BPM / key.
export function deckLine(deck, { extra = [] } = {}) {
  const L = deck.letter;
  const t = deck.track;
  const stateWord = { playing: 'Playing', paused: 'Paused', loading: 'Loading', empty: 'Empty', missing: 'Missing' }[deck.state] || deck.state;
  return h('div', { class: `pads-deckline deck-${L.toLowerCase()}` }, [
    deckChip(L),
    h('div', { class: 'pads-deckline__text' }, [
      h('span', { class: 'label', text: `Deck ${L} · ${stateWord}` }),
      h('span', { class: 'title pads-deckline__title wrap-2', text: t ? t.title : 'No track loaded' }),
    ]),
    t ? h('span', { class: 'pads-deckline__meta numeral', text: `${t.bpm.toFixed(1)} BPM · ${t.key}` }) : null,
    ...extra,
  ]);
}

// Status line (role=status) the screen writes into when it prints a SENT-but-unacknowledged command.
export function statusNote(cls = 'pads-note') {
  const note = h('p', { class: `${cls} body`, role: 'status', 'aria-live': 'polite' });
  note.hidden = true;
  const say = (text) => { note.textContent = text || ''; note.hidden = !text; };
  return { note, say };
}

export function fixtureLine(text) {
  return h('p', { class: 'pads-fixture' }, [icon('fixture', { size: 12 }), h('span', { text })]);
}

export function padsData() { return data; }

// Swap a deck's track for a state that needs a different world (fresh session object per render).
export function withTrack(ctx, letter, trackId, patch = {}) {
  const d = ctx.session.decks[letter];
  const t = ctx.fixtures.track(trackId);
  Object.assign(d, { trackId, track: t, positionSec: 0, state: 'paused', enabled: true }, patch);
  d.remainingSec = t ? Math.max(0, t.durationSec - d.positionSec) : 0;
  return d;
}

// ---------- pads/pads ----------
// Per state: which deck portrait shows, and the bank configuration for deck A / deck B.
const BANK = {
  'cue-bank1': { focus: 'A', A: { mode: 'cue', bank: 1 } },
  'bank-switch': { focus: 'A', A: { mode: 'cue', bank: 2 } },
  'edit-mode': { focus: 'A', A: { mode: 'cue', bank: 1, edit: true, selected: 3 } },
  'pending-quantized': { focus: 'A', A: { mode: 'cue', bank: 1, pending: 3 } },
  slicer: { focus: 'A', A: { mode: 'slicer', bank: 1 } },
  'pitch-play': { focus: 'A', A: { mode: 'pitch-play', bank: 1 } },
  'stem-mode-unavailable': { focus: 'B', B: { mode: 'stem', bank: 1, unavailable: true } },
};

register({
  id: 'pads/pads', family: 'pads', title: 'Pads', order: 1,
  fr: ['FR-011', 'FR-017', 'FR-026', 'FR-028'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    'cue-bank1': { label: 'Hot cues, bank 1 — deck A playing', exercised: true, scenario: 'a-playing', via: { from: 'edit-mode', control: 'Done editing, deck A' } },
    'bank-switch': { label: 'Bank 2 shown — view change only, nothing triggered', exercised: true, scenario: 'a-playing', via: { from: 'cue-bank1', control: 'Bank 2 of 4, deck A' } },
    'edit-mode': { label: 'Edit state — labelled Rename / Colour / Clear / Done', exercised: true, scenario: 'a-playing', via: { from: 'cue-bank1', control: 'Edit pads, deck A' } },
    'pending-quantized': { label: 'Hot cue 3 pending — waits for the next beat', exercised: true, scenario: 'a-playing', via: { from: 'cue-bank1', control: "Hot cue 3 'Break', deck A, bank 1, loaded" } },
    slicer: { label: 'Slicer — slice 4 held (momentary, slip)', exercised: true, scenario: 'a-playing', via: { from: 'cue-bank1', control: 'Pad mode Slicer, deck A' } },
    'pitch-play': { label: 'Pitch play from hot cue 3', exercised: true, scenario: 'a-playing', via: { from: 'cue-bank1', control: 'Pad mode Pitch play, deck A' } },
    'stem-mode-unavailable': { label: 'Stem mode unavailable — stems not prepared (deck B)', exercised: false, scenario: 'a-playing' },
  },
  defaultState: 'cue-bank1',
  render(ctx) {
    const state = ctx.state;
    const cfg = BANK[state] || BANK['cue-bank1'];
    const land = ctx.orientation === 'landscape';
    const root = h('div', { class: `pads-screen pads-pads pads-pads--${land ? 'landscape' : 'portrait'}`, dataset: { state } });
    const { note, say } = statusNote();

    const column = (L, solo) => {
      const deck = ctx.session.decks[L];
      const c = cfg[L] || { mode: 'cue', bank: 1 };
      return deckColumn(ctx, deck, c, { say, solo, state });
    };

    if (land) {
      root.append(padsNav(ctx, 'pads/pads'), h('div', { class: 'pads-pads__pair' }, ctx.session.focus.map((L) => column(L, false))), note);
    } else {
      let focus = cfg.focus;
      const holder = h('div', { class: 'pads-pads__holder' });
      const draw = () => {
        holder.replaceChildren(column(focus, true));
        holder.querySelectorAll('.pads-decksel__btn').forEach((b) => b.addEventListener('click', () => {
          const L = b.dataset.deck;
          if (L === focus) return;
          focus = L; say(''); draw();
          holder.querySelector(`.pads-decksel__btn[data-deck='${L}']`)?.focus();
        }));
      };
      draw();
      root.append(padsNav(ctx, 'pads/pads'), holder, note);
    }
    return root;
  },
});

function cueBank(trackId, bank) {
  const b = data.cueBanks[trackId];
  return b && b[String(bank)] ? b[String(bank)].map((p) => ({ ...p })) : null;
}

function deckColumn(ctx, deck, c, { say, solo, state }) {
  const L = deck.letter;
  const t = deck.track;
  const view = { mode: c.mode, bank: c.bank, edit: !!c.edit, selected: c.selected || 0, pending: c.pending || 0, unavailable: !!c.unavailable };

  const col = h('section', { class: `pads-col deck-${L.toLowerCase()}`, 'aria-label': `Pads, deck ${L}` });
  const decksel = solo ? h('div', { class: 'pads-decksel', role: 'radiogroup', 'aria-label': 'Show pads for deck' }, ctx.session.focus.map((X) => h('button', {
    type: 'button', role: 'radio', class: `pads-decksel__btn deck-${X.toLowerCase()}`, dataset: { hit: '56', deck: X },
    'aria-checked': String(X === L), 'aria-label': `Show pads for deck ${X}`,
  }, [h('span', { class: 'numeral', text: X })]))) : null;
  const qchip = h('span', { class: 'pads-qchip label' }, [icon('quantize', { size: 12 }), h('span', { text: `Q ${QUANTIZE}` })]);
  const bankBadge = h('span', { class: 'pads-bankbadge label', role: 'status' });
  const line = deckLine(deck, { extra: [qchip, bankBadge] });

  const bank = h('mdj-pad-bank', { deck: L, layout: '2x4' });
  const caption = h('div', { class: 'pads-caption raised', role: 'note' });
  const actions = h('div', { class: 'pads-actions' });

  const draw = () => {
    bank.setAttribute('mode', view.mode);
    bank.setAttribute('bank', String(view.bank));
    let pads = null;
    if (view.mode === 'cue' && t) pads = cueBank(t.id, view.bank);
    else if (view.mode === 'slicer') pads = data.slicer.pads;
    else if (view.mode === 'pitch-play') pads = data.pitchPlay.pads;
    if (pads && view.pending) pads = pads.map((p, i) => (i + 1 === view.pending ? { ...p, state: 'pending' } : p));
    if (pads) bank.setAttribute('pads', JSON.stringify(pads)); else bank.removeAttribute('pads');
    if (view.pending) bank.setAttribute('quantized', QUANTIZE); else bank.removeAttribute('quantized');
    if (view.unavailable) bank.setAttribute('unavailable', 'No stems'); else bank.removeAttribute('unavailable');
    if (view.edit) { bank.setAttribute('state', 'edit'); if (view.selected) bank.setAttribute('selected', String(view.selected)); else bank.removeAttribute('selected'); }
    else { bank.removeAttribute('state'); bank.removeAttribute('selected'); }
    // mdj-pad rewrites its own className on render, so the bank's pad--selected class is lost; mark the
    // selected pad with a data attribute instead (componentsMissing / request filed).
    // Runs after the bank is connected (its first render happens on connect).
    if (view.edit && view.selected) queueMicrotask(() => bank.querySelectorAll('mdj-pad')[view.selected - 1]?.setAttribute('data-pads-selected', ''));
    bankBadge.textContent = view.bank !== 1 ? `Bank ${view.bank} shown` : '';
    bankBadge.hidden = view.bank === 1;
    caption.replaceChildren(...captionFor(ctx, deck, view, pads));
    actions.replaceChildren(...actionsFor(ctx, deck, view, {
      edit: () => { if (isA && state === 'cue-bank1') return ctx.setState('edit-mode'); view.edit = true; view.selected = 0; view.pending = 0; draw(); say(''); },
      cue: () => { if (isA && state !== 'cue-bank1') return ctx.setState('cue-bank1'); view.mode = 'cue'; view.bank = 1; view.unavailable = false; draw(); say(''); },
    }));
  };

  // The screen stands in for the engine and the router: declared states move with setState; anything
  // else is local view state or prints SENT.
  const isA = L === 'A';
  bank.addEventListener('mdj:pad-bank', (e) => {
    const b = e.detail.bank;
    if (isA && view.mode === 'cue' && !view.edit) {
      if (b === 2 && state !== 'bank-switch') return ctx.setState('bank-switch');
      if (b === 1 && state === 'bank-switch') return ctx.setState('cue-bank1');
    }
    view.bank = b; view.pending = 0; view.selected = 0; draw(); say(`Bank ${b} shown on deck ${L}. View change only: no pad was triggered.`);
  });
  bank.addEventListener('mdj:pad-mode', (e) => {
    const m = e.detail.mode;
    if (view.edit) { say('Finish editing first: tap Done, then change the mode.'); return; }
    if (isA && m === 'slicer' && state !== 'slicer') return ctx.setState('slicer');
    if (isA && m === 'pitch-play' && state !== 'pitch-play') return ctx.setState('pitch-play');
    if (isA && m === 'cue' && state !== 'cue-bank1') return ctx.setState('cue-bank1');
    if (L === 'B' && m === 'stem' && t && t.id === 'copper' && state !== 'stem-mode-unavailable') return ctx.setState('stem-mode-unavailable');
    view.mode = m; view.bank = 1; view.pending = 0; view.unavailable = m === 'stem' && !(data.stems[t?.id]?.state === 'ready');
    draw(); say(`${MODE_TITLE[m]} shown on deck ${L}. Mode change only: no pad was triggered.`);
  });
  bank.addEventListener('mdj:pad', (e) => {
    const { n, mode, state: padState } = e.detail;
    if (view.edit) { view.selected = n; draw(); say(''); return; }
    if (isA && mode === 'cue' && view.bank === 1 && n === 3) {
      if (state === 'pending-quantized') return ctx.setState('cue-bank1'); // second tap before the beat cancels
      if (state === 'cue-bank1') return ctx.setState('pending-quantized');
    }
    if (padState === 'empty' && mode === 'cue') { say(`Set hot cue ${n} at the playhead on deck ${L}: sent, waiting for the engine (no engine in this prototype). Quantized to ${QUANTIZE}.`); return; }
    say(`${MODE_TITLE[mode]} pad ${n}, deck ${L}: sent with quantize ${QUANTIZE}. Not acknowledged — no engine exists in this prototype.`);
  });
  bank.addEventListener('mdj:pad-edit', (e) => {
    const { action, n } = e.detail;
    if (action === 'Done') {
      if (isA && state === 'edit-mode') return ctx.setState('cue-bank1');
      view.edit = false; view.selected = 0; draw(); say(''); return;
    }
    if (action === 'Clear') say(`Clear hot cue ${n} on deck ${L}? This removes the cue from the track's preparation. Confirm in the sheet; Undo stays available in preparation.`);
    else say(`${action} hot cue ${n}, deck ${L}: a preparation edit, saved with undo. Not applied in this prototype.`);
  });

  draw();
  col.append(...[decksel ? h('div', { class: 'pads-col__top' }, [decksel, line]) : line, bank, caption, actions].filter(Boolean));
  return col;
}

function captionFor(ctx, deck, view, pads) {
  const L = deck.letter;
  const bits = [];
  const title = (ic, text) => h('p', { class: 'pads-caption__title' }, [icon(ic, { size: 16 }), h('span', { text })]);
  if (view.unavailable) {
    bits.push(title('unavailable', 'Stems not prepared for this track'));
    bits.push(h('p', { class: 'body', text: `${deck.track ? deck.track.title : 'This track'} has no prepared stem set, so the eight stem pads say "No stems" and do nothing. The full mix keeps playing unchanged.` }));
    bits.push(h('div', { class: 'pads-caption__row' }, [
      button({ label: 'Prepare stems', icon: 'stems', fr: ['FR-028'], cls: 'btn--primary', attrs: { 'aria-label': `Prepare stems, deck ${L}` }, on: { click: () => ctx.navigate('pads/stems') } }),
      button({ label: 'Back to hot cues', icon: 'cue', fr: ['FR-026'], cls: 'btn--secondary', attrs: { 'aria-label': `Back to hot cues, deck ${L}` }, on: { click: () => ctx.setState('cue-bank1') } }),
    ]));
    return bits;
  }
  if (view.edit) {
    bits.push(title('edit', `Edit state · deck ${L} · bank ${view.bank}`));
    bits.push(h('p', { class: 'body', text: 'Pads do not trigger while editing. Tap a pad to select it, then Rename, Colour or Clear. Clear asks for a second, labelled confirmation. Done returns to performance.' }));
    return bits;
  }
  if (view.pending) {
    const p = pads[view.pending - 1];
    bits.push(title('quantize', `Hot cue ${view.pending} '${p.label}' · pending`));
    bits.push(h('p', { class: 'body' }, ['Admitted, waiting for the next ', h('strong', { text: QUANTIZE }), ' grid point. It has not jumped yet. Tap the pad again before the beat to cancel.']));
    bits.push(fixtureLine('Pending is a fixture state: no engine scheduled anything.'));
    return bits;
  }
  if (view.mode === 'cue') {
    const set = (pads || []).filter((p) => p.label).length;
    if (view.bank === 2) {
      bits.push(h('p', { class: 'pads-caption__title' }, [icon('pads', { size: 16 }), h('span', { text: `Bank 2 of 4 · deck ${L}` }), h('span', { class: 'pads-bankbadge label', text: 'Bank changed' })]));
      bits.push(h('p', { class: 'body', text: `Showing hot cues 1–8 of bank 2 (${set} set). Changing bank is a view change: nothing played. Bank 1 keeps Intro, Bass in, Break and Exit.` }));
    } else {
      bits.push(title('cue', `Hot cues · bank ${view.bank} · ${set} of 8 set`));
      bits.push(h('p', { class: 'body', text: `Tap a cue to jump on the next ${QUANTIZE}. Tap an empty pad to set a cue at the playhead. Rename, recolour or clear only in Edit.` }));
    }
    return bits;
  }
  if (view.mode === 'slicer') {
    bits.push(title('slicer', `Slicer · ${data.slicer.window}`));
    bits.push(h('p', { class: 'body', text: `${data.slicer.note} Slice 4 is held now.` }));
    bits.push(fixtureLine('Slice window is a fixture; no audio is sliced.'));
    return bits;
  }
  if (view.mode === 'pitch-play') {
    bits.push(title('pitch-play', `Pitch play · ${data.pitchPlay.root}`));
    bits.push(h('p', { class: 'body', text: data.pitchPlay.note }));
    return bits;
  }
  bits.push(title('pads', `${MODE_TITLE[view.mode]} · bank ${view.bank}`));
  bits.push(h('p', { class: 'body', text: 'Mode change only — no pad was triggered. Pad contents are prototype fixtures for this mode.' }));
  return bits;
}

function actionsFor(ctx, deck, view, on) {
  const L = deck.letter;
  if (view.edit || view.unavailable) return [];
  if (view.mode !== 'cue') return [button({ label: 'Hot cues', icon: 'cue', fr: ['FR-026'], cls: 'btn--secondary', attrs: { 'aria-label': `Show hot cues, deck ${L}` }, on: { click: on.cue } })];
  return [
    button({ label: 'Edit pads', icon: 'edit', fr: ['FR-011'], cls: 'btn--secondary', attrs: { 'aria-label': `Edit pads, deck ${L}` }, on: { click: on.edit } }),
    button({ label: 'Loops', icon: 'loop', fr: ['FR-018'], cls: 'btn--ghost', attrs: { 'aria-label': `Open loops, deck ${L}` }, on: { click: () => ctx.navigate('pads/loops') } }),
  ];
}
