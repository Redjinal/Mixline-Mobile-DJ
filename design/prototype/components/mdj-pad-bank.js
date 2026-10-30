// <mdj-pad-bank deck="A" mode="cue|loop|roll|jump|slicer|sampler|pitch-play|stem" bank="1..4"
//               layout="2x4|4x2" size="56|64" quantized="1 beat" unavailable="Restricted" selected="3"
//               pads='[{"label":"Break","color":"cyan","state":"loaded"}, …8]' state="normal|edit">
//
// Engine binding: the bank is a view over EngineSnapshot.pads[deck][mode][bank]. Changing the mode
// or the bank is a view selection (PadViewCommand), never an engine command, and it is drawn so it
// cannot be mistaken for a pad hit: rectangular segmented selectors above the grid, pads are frosted
// squares below. Pad taps are handled by <mdj-pad> (EngineCommand(pad, …)).
// Units / range: bank 1..4, mode one of the eight FR-026 modes, eight pads per bank, n 1..8.
// Gesture: taps only. The grid never scrolls, so no parent scroll region can steal a pad touch.
// The mode row is an auto-fit grid of 48 dp chips (two rows at 380 dp), never a clipped scroll
// strip, so no hit box is ever hidden; all eight modes are reachable by keyboard (role=tablist).
// Pending vs acknowledged: carried by each pad. Mode and bank selection are local view state,
// acknowledged immediately; the deck letter, mode name and bank number are legible at all times
// in the header, on opaque backing.
// Edit state: explicit (state="edit"). Every pad shows its edit affordance ("Edit" / "Set") and a
// labelled action bar applies to the selected pad: Rename, Colour, Clear (destructive, asks for a
// second labelled confirmation in the real app) and Done. There is no long-press shortcut and no
// deletion outside this state (Document 03 §4). Unavailable or disabled pads are not editable.
// Cancellation: a held pad keeps its original deck id until release even if deck focus changes
// (Document 03 deck-selector rule); rotation keeps the same bank and mode.
// Accessible: mode selector role=tablist, bank selector role=radiogroup, names carry the deck
// ("Pad mode Hot cues, deck A"; "Bank 2 of 4, deck A").
// Fixture: pad contents below are prototype fixtures keyed by mode (the same eight labels a
// prepared track would carry); screens may pass `pads` as JSON instead.
import { MdjElement, define, h, icon } from './base.js';
import { PAD_MODES, clampInt } from './mdj-pad.js';

const FIXTURE_PADS = {
  cue: [['Intro', 'cyan', 'loaded'], ['Break', 'orange', 'playing'], ['Drop', 'red', 'loaded'], ['Vox', 'purple', 'loaded'], ['Bridge', 'green', 'loaded'], ['Out', 'yellow', 'loaded'], ['', 'none', 'empty'], ['', 'none', 'empty']],
  loop: [['1/4', 'none', 'loaded'], ['1/2', 'none', 'loaded'], ['1', 'none', 'loaded'], ['2', 'none', 'loaded'], ['4', 'none', 'playing'], ['8', 'none', 'loaded'], ['16', 'none', 'loaded'], ['32', 'none', 'loaded']],
  roll: [['1/16', 'none', 'loaded'], ['1/8', 'none', 'loaded'], ['1/4', 'none', 'held'], ['1/2', 'none', 'loaded'], ['1', 'none', 'loaded'], ['2', 'none', 'loaded'], ['4', 'none', 'loaded'], ['8', 'none', 'loaded']],
  jump: [['−16', 'none', 'loaded'], ['−8', 'none', 'loaded'], ['−4', 'none', 'loaded'], ['−1', 'none', 'loaded'], ['+1', 'none', 'loaded'], ['+4', 'none', 'pending'], ['+8', 'none', 'loaded'], ['+16', 'none', 'loaded']],
  slicer: [['Slice 1', 'none', 'loaded'], ['Slice 2', 'none', 'loaded'], ['Slice 3', 'none', 'loaded'], ['Slice 4', 'none', 'loaded'], ['Slice 5', 'none', 'loaded'], ['Slice 6', 'none', 'loaded'], ['Slice 7', 'none', 'loaded'], ['Slice 8', 'none', 'loaded']],
  sampler: [['Kick', 'none', 'loaded'], ['Clap', 'none', 'loaded'], ['Hat', 'none', 'loaded'], ['Riser', 'none', 'loaded'], ['Vox hit', 'none', 'loaded'], ['Sweep', 'none', 'playing'], ['', 'none', 'empty'], ['Crash', 'none', 'error']],
  'pitch-play': [['−3 st', 'none', 'loaded'], ['−2 st', 'none', 'loaded'], ['−1 st', 'none', 'loaded'], ['0 st', 'none', 'playing'], ['+1 st', 'none', 'loaded'], ['+2 st', 'none', 'loaded'], ['+3 st', 'none', 'loaded'], ['+4 st', 'none', 'loaded']],
  stem: [['Vocals', 'none', 'loaded'], ['Drums', 'none', 'loaded'], ['Bass', 'none', 'playing'], ['Other', 'none', 'loaded'], ['Vocals solo', 'none', 'loaded'], ['Drums solo', 'none', 'loaded'], ['Bass solo', 'none', 'loaded'], ['Other solo', 'none', 'loaded']],
};
const MODE_TITLE = { cue: 'Hot cues', loop: 'Loops', roll: 'Loop roll', jump: 'Beat jump', slicer: 'Slicer', sampler: 'Sampler', 'pitch-play': 'Pitch play', stem: 'Stems' };
// Short chip words; the full mode name is in the header title and in every chip's accessible name.
const MODE_CHIP = { cue: 'Cues', loop: 'Loops', roll: 'Roll', jump: 'Jump', slicer: 'Slicer', sampler: 'Sampler', 'pitch-play': 'Pitch', stem: 'Stems' };

export class MdjPadBank extends MdjElement {
  static tag = 'mdj-pad-bank';
  static states = ['normal', 'edit'];
  static fr = ['FR-011', 'FR-026'];
  static hit = 0; // layout container: the mode tabs, bank radios and every <mdj-pad> carry their own data-hit (48 / 56)
  static fixture = false;
  static observed = ['deck', 'mode', 'bank', 'layout', 'size', 'quantized', 'unavailable', 'selected', 'pads'];
  static samples = {
    default: { deck: 'A', mode: 'cue', bank: 2, layout: '2x4', style: 'width:min(100%, 380px)' },
    variants: [
      {},
      { deck: 'B', mode: 'roll', bank: 1 },
      { deck: 'C', mode: 'stem', bank: 1, layout: '4x2', unavailable: 'Restricted', style: 'width:min(100%, 220px)' },
    ],
    edit: { selected: 2 },
  };

  render() {
    const deck = (this.attr('deck', 'A') || 'A').toUpperCase();
    const modeAttr = this.attr('mode', 'cue');
    const mode = PAD_MODES[modeAttr] ? modeAttr : 'cue';
    const bank = clampInt(this.num('bank', 1), 1, 4);
    const layout = this.attr('layout', '2x4') === '4x2' ? '4x2' : '2x4';
    const size = this.num('size', 56) >= 64 ? 64 : 56;
    const state = this.state;
    const quantized = this.attr('quantized', '');
    const unavailable = this.attr('unavailable', '');
    const selected = this.hasAttribute('selected') ? clampInt(this.num('selected', 1), 1, 8) : 0;
    const pads = readPads(this.attr('pads', ''), mode);
    this.className = `pad-bank pad-bank--${layout} pad-bank--${state} deck-${deck.toLowerCase()}`;

    // ---- header: deck letter, mode title, bank selector, edit tag ----
    const banks = h('div', { class: 'pad-bank__banks', role: 'radiogroup', 'aria-label': `Bank, deck ${deck}` });
    for (let b = 1; b <= 4; b++) {
      banks.appendChild(h('button', {
        type: 'button', role: 'radio', class: 'pad-bank__bank numeral', 'aria-checked': String(b === bank), 'aria-label': `Bank ${b} of 4, deck ${deck}`,
        dataset: { hit: '48' }, text: String(b), on: { click: () => this.emit('mdj:pad-bank', { deck, mode, bank: b }) },
      }));
    }
    const head = h('div', { class: 'pad-bank__head' }, [
      h('span', { class: 'pad-bank__deck numeral', text: deck, 'aria-hidden': 'true' }),
      h('div', { class: 'pad-bank__title' }, [
        h('span', { class: 'label', text: `Deck ${deck} · pads · bank ${bank}` }),
        h('span', { class: 'title pad-bank__mode-name', text: MODE_TITLE[mode] }),
      ]),
      state === 'edit' ? h('span', { class: 'pad-bank__tag label' }, [icon('edit', { size: 12 }), h('span', { text: 'Edit' })]) : null,
      banks,
    ]);

    // ---- mode selector ----
    const modes = h('div', { class: 'pad-bank__modes', role: 'tablist', 'aria-label': `Pad mode, deck ${deck}` });
    for (const [id, def] of Object.entries(PAD_MODES)) {
      modes.appendChild(h('button', {
        type: 'button', role: 'tab', class: 'pad-bank__mode', 'aria-selected': String(id === mode), 'aria-label': `Pad mode ${MODE_TITLE[id]}, deck ${deck}`,
        dataset: { hit: '48' }, on: { click: () => this.emit('mdj:pad-mode', { deck, mode: id, bank }) },
      }, [icon(def.icon, { size: 16 }), h('span', { class: 'pad-bank__mode-text truncate', text: MODE_CHIP[id] })]));
    }

    // ---- grid ----
    const grid = h('div', { class: 'pad-bank__grid', role: 'group', 'aria-label': `${MODE_TITLE[mode]} bank ${bank}, deck ${deck}` });
    pads.forEach((p, i) => {
      let padState = p.state || 'loaded';
      let reason = p.reason || '';
      if (unavailable) { padState = 'unavailable'; reason = unavailable; }
      else if (state === 'edit' && padState !== 'unavailable' && padState !== 'disabled') padState = 'edit';
      const el = h('mdj-pad', {
        mode, n: i + 1, bank, deck, size, label: p.label || '', color: p.color || 'none', state: padState,
        quantized: padState === 'pending' ? (quantized || '1 beat') : null, reason: reason || null,
        class: selected === i + 1 && state === 'edit' ? 'pad--selected' : null,
      });
      grid.appendChild(el);
    });

    const children = [head, modes, grid];

    // ---- edit action bar ----
    if (state === 'edit') {
      const sel = selected ? pads[selected - 1] : null;
      const target = selected ? `${PAD_MODES[mode].name} ${selected}${sel && sel.label ? ` '${sel.label}'` : ''}` : 'no pad selected';
      const action = (label, ic, cls, enabled) => h('button', {
        type: 'button', class: `btn ${cls || ''}`.trim(), dataset: { hit: '48' }, 'aria-disabled': enabled ? undefined : 'true',
        'aria-label': `${label}, ${target}, deck ${deck}`, on: { click: () => { if (enabled) this.emit('mdj:pad-edit', { deck, mode, bank, n: selected, action: label }); } },
      }, [icon(ic, { size: 18 }), h('span', { class: 'btn-label', text: label })]);
      children.push(h('div', { class: 'pad-bank__editbar', role: 'group', 'aria-label': `Edit ${MODE_TITLE[mode]} bank ${bank}, deck ${deck}` }, [
        h('p', { class: 'pad-bank__editnote', text: selected ? `Editing ${target}. Clear asks to confirm; no long-press shortcuts.` : 'Tap a pad to select it, then use the labelled actions.' }),
        action('Rename', 'edit', 'btn--secondary', !!selected),
        action('Colour', 'color-tag', 'btn--secondary', !!selected && mode === 'cue'),
        action('Clear', 'trash', 'btn--danger', !!selected && !!(sel && sel.label)),
        h('button', { type: 'button', class: 'btn btn--primary', dataset: { hit: '48' }, 'aria-label': `Done editing, deck ${deck}`, on: { click: () => this.emit('mdj:pad-edit', { deck, mode, bank, action: 'Done' }) } }, [icon('check', { size: 18 }), h('span', { class: 'btn-label', text: 'Done' })]),
      ]));
    }
    this.replaceChildren(...children);
  }
}

function readPads(json, mode) {
  let list = null;
  if (json) { try { list = JSON.parse(json); } catch { list = null; } }
  if (!Array.isArray(list)) list = FIXTURE_PADS[mode].map(([label, color, state]) => ({ label, color, state }));
  const out = [];
  for (let i = 0; i < 8; i++) out.push(list[i] && typeof list[i] === 'object' ? list[i] : { label: '', color: 'none', state: 'empty' });
  return out;
}

define(MdjPadBank);
