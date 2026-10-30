// <mdj-sample-bank bank="1|2" slots="16" layout="2x4|4x2" size="56|64" quantized="1 bar"
//                  voices="2" max-voices="8" selected="3"
//                  slots-json='[{"n":1,"name":"Kick","trigger":"one-shot","choke":1,"level":0.9,"state":"loaded"}, …]'
//                  state="normal|edit">
//
// Engine binding: bank selection is a view (SamplerViewCommand) and never triggers a slot; the
// grid shows the eight slots of the selected bank (1–8 or 9–16) over the sixteen the sampler holds
// (FR-027). "Stop all" issues sampler.stopAll IMMEDIATELY (a quantized stop belongs to the
// sequencer transport, see <mdj-step-grid>). Slot taps are handled by <mdj-sample-slot>.
// Units / range: bank 1..2, sixteen slots, choke groups 1..4; the voice readout is the acknowledged
// voice count over the certified profile's eight simultaneous voices (AE-06) — a fixture here, so
// it carries an inline FIXTURE mark (static fixture = true).
// Gesture: taps only; the grid never scrolls. Bank tabs and Stop all are rectangular and sit above
// the grid so they cannot be mistaken for a slot hit.
// Pending vs acknowledged: carried by each slot. Bank and edit state are local view state.
// Edit state: explicit (state="edit"): every slot shows "Edit" / "Assign", and a labelled action
// bar applies to the selected slot — Assign sample, Trigger mode, Choke group, Clear (asks to
// confirm) and Done. No long-press shortcuts.
// Cancellation: Stop all stops sounding and pending voices and clears choke state; rotation keeps
// the bank and edit state.
// Accessible: bank tabs are role=tablist; Stop all is a real button named "Stop all samples now";
// the choke legend is text, not colour alone.
// Fixture: slot contents below are prototype fixtures; screens may pass `slots-json`.
import { MdjElement, define, h, icon } from './base.js';
import { clampInt } from './mdj-pad.js';

const FIXTURE_SLOTS = [
  { n: 1, name: 'Kick', trigger: 'one-shot', choke: 1, level: 0.9, state: 'loaded' },
  { n: 2, name: 'Clap', trigger: 'one-shot', choke: 1, level: 0.8, state: 'loaded' },
  { n: 3, name: 'Hat', trigger: 'one-shot', choke: 1, level: 0.7, state: 'choked' },
  { n: 4, name: 'Riser', trigger: 'loop', choke: 3, level: 0.6, state: 'loaded' },
  { n: 5, name: 'Vox hit', trigger: 'gate', choke: 2, level: 1, state: 'loaded' },
  { n: 6, name: 'Sweep', trigger: 'loop', choke: 3, level: 0.75, state: 'playing' },
  { n: 7, name: '', trigger: 'one-shot', choke: 'none', level: 1, state: 'empty' },
  { n: 8, name: 'Crash', trigger: 'one-shot', choke: 'none', level: 0.9, state: 'missing', reason: 'File moved' },
  { n: 9, name: 'Shaker', trigger: 'loop', choke: 4, level: 0.7, state: 'loaded' },
  { n: 10, name: 'Stab', trigger: 'one-shot', choke: 'none', level: 0.85, state: 'pending' },
  { n: 11, name: 'Air', trigger: 'gate', choke: 3, level: 0.5, state: 'loaded' },
  { n: 12, name: 'Shout', trigger: 'gate', choke: 2, level: 1, state: 'loaded' },
  { n: 13, name: 'Sub', trigger: 'one-shot', choke: 1, level: 0.9, state: 'loaded' },
  { n: 14, name: '', trigger: 'one-shot', choke: 'none', level: 1, state: 'empty' },
  { n: 15, name: '', trigger: 'one-shot', choke: 'none', level: 1, state: 'empty' },
  { n: 16, name: '', trigger: 'one-shot', choke: 'none', level: 1, state: 'empty' },
];
const CHOKE_LEGEND = { 1: 'Drums', 2: 'Vox', 3: 'FX', 4: 'Perc' };

export class MdjSampleBank extends MdjElement {
  static tag = 'mdj-sample-bank';
  static states = ['normal', 'edit'];
  static fr = ['FR-027'];
  static hit = 0; // layout container: bank tabs, Stop all and every <mdj-sample-slot> carry their own data-hit
  static fixture = true; // the voice count is a fixture; the mark is rendered inline next to it
  static observed = ['bank', 'slots', 'layout', 'size', 'quantized', 'voices', 'max-voices', 'selected', 'slots-json'];
  static samples = {
    default: { bank: 1, slots: 16, layout: '2x4', voices: 2, 'max-voices': 8, quantized: '1 bar', style: 'width:min(100%, 380px)' },
    variants: [{}, { bank: 2, voices: 1 }],
    edit: { selected: 5 },
  };

  ensureFixtureMark() { /* rendered inline in the voice readout by render() */ }

  render() {
    const bank = clampInt(this.num('bank', 1), 1, 2);
    const layout = this.attr('layout', '2x4') === '4x2' ? '4x2' : '2x4';
    const size = this.num('size', 56) >= 64 ? 64 : 56;
    const state = this.state;
    const quantized = this.attr('quantized', '');
    const voices = Math.max(0, Math.round(this.num('voices', 0)));
    const maxVoices = Math.max(1, Math.round(this.num('max-voices', 8)));
    const selected = this.hasAttribute('selected') ? clampInt(this.num('selected', 1), 1, 16) : 0;
    const slots = readSlots(this.attr('slots-json', ''));
    const first = (bank - 1) * 8 + 1, last = bank * 8;
    this.className = `sbank sbank--${layout} sbank--${state}`;

    // ---- header: title, bank tabs, voices, stop all ----
    const tabs = h('div', { class: 'sbank__banks', role: 'tablist', 'aria-label': 'Sampler bank' });
    for (let b = 1; b <= 2; b++) {
      const a = (b - 1) * 8 + 1;
      tabs.appendChild(h('button', { type: 'button', role: 'tab', class: 'sbank__bank numeral', 'aria-selected': String(b === bank), 'aria-label': `Bank ${b}, slots ${a} to ${a + 7}`, dataset: { hit: '48' }, text: `${a}–${a + 7}`, on: { click: () => this.emit('mdj:sample-bank', { bank: b }) } }));
    }
    const voicesEl = h('span', { class: 'sbank__voices numeral', 'aria-label': `${voices} of ${maxVoices} sampler voices in use` }, [
      h('span', { 'aria-hidden': 'true', text: `VOICES ${voices}/${maxVoices}` }),
      h('mdj-fixture-mark', { inline: '', for: 'sampler voice count' }),
    ]);
    const stopAll = h('button', { type: 'button', class: 'btn btn--danger sbank__stop', dataset: { hit: '48' }, 'aria-label': 'Stop all samples now (immediate)', on: { click: () => this.emit('mdj:sample-stop-all', {}) } }, [icon('stop', { size: 18 }), h('span', { class: 'btn-label', text: 'Stop all' })]);
    const head = h('div', { class: 'sbank__head' }, [
      h('div', { class: 'sbank__title' }, [
        h('span', { class: 'label', text: `Sampler · bank ${bank} of 2${quantized ? ` · Q ${quantized}` : ''}` }),
        h('span', { class: 'title', text: `Slots ${first}–${last}` }),
      ]),
      tabs, voicesEl, stopAll,
      state === 'edit' ? h('span', { class: 'sbank__tag label' }, [icon('edit', { size: 12 }), h('span', { text: 'Edit' })]) : null,
    ]);

    // ---- choke legend ----
    const used = new Set(slots.filter((sl) => sl.state !== 'empty' && CHOKE_LEGEND[sl.choke]).map((sl) => String(sl.choke)));
    const legend = h('div', { class: 'sbank__chokes', role: 'list', 'aria-label': 'Choke groups' }, [
      h('span', { class: 'label sbank__chokes-label', text: 'Choke groups' }),
      ...[...used].sort().map((g) => h('span', { class: 'sbank__choke label', role: 'listitem', text: `CH${g} ${CHOKE_LEGEND[g]}` })),
      used.size ? null : h('span', { class: 'sbank__choke sbank__choke--none label', role: 'listitem', text: 'none' }),
    ]);

    // ---- grid of eight slots ----
    const grid = h('div', { class: 'sbank__grid', role: 'group', 'aria-label': `Sampler bank ${bank}, slots ${first} to ${last}` });
    for (let n = first; n <= last; n++) {
      const sl = slots[n - 1];
      let slotState = sl.state;
      if (state === 'edit' && slotState !== 'missing') slotState = 'edit';
      grid.appendChild(h('mdj-sample-slot', {
        n, bank, size, name: sl.name || '', trigger: sl.trigger, choke: String(sl.choke), level: sl.level, state: slotState,
        quantized: slotState === 'pending' ? (quantized || '1 bar') : null, reason: sl.reason || null,
        class: state === 'edit' && selected === n ? 'slot--selected' : null,
      }));
    }

    const bits = [head, legend, grid];
    if (state === 'edit') {
      const sel = selected ? slots[selected - 1] : null;
      const target = selected ? `slot ${selected}${sel && sel.name ? ` '${sel.name}'` : ''}` : 'no slot selected';
      const action = (label, ic, cls, enabled, id) => h('button', { type: 'button', class: `btn ${cls}`.trim(), dataset: { hit: '48' }, 'aria-disabled': enabled ? undefined : 'true', 'aria-label': `${label}, ${target}`, on: { click: () => { if (enabled) this.emit('mdj:sample-edit', { n: selected, action: id }); } } }, [icon(ic, { size: 18 }), h('span', { class: 'btn-label', text: label })]);
      bits.push(h('div', { class: 'sbank__editbar', role: 'group', 'aria-label': `Edit sampler bank ${bank}` }, [
        h('p', { class: 'sbank__editnote', text: selected ? `Editing ${target}. Clear asks to confirm; rights and provenance travel with the pack.` : 'Tap a slot to select it, then use the labelled actions.' }),
        action('Assign', 'import', 'btn--secondary', !!selected, 'assign'),
        action('Trigger', 'sampler', 'btn--secondary', !!selected && !!(sel && sel.name), 'trigger'),
        action('Choke', 'link', 'btn--secondary', !!selected && !!(sel && sel.name), 'choke'),
        action('Clear', 'trash', 'btn--danger', !!selected && !!(sel && sel.name), 'clear'),
        h('button', { type: 'button', class: 'btn btn--primary', dataset: { hit: '48' }, 'aria-label': 'Done editing sampler', on: { click: () => this.emit('mdj:sample-edit', { action: 'done' }) } }, [icon('check', { size: 18 }), h('span', { class: 'btn-label', text: 'Done' })]),
      ]));
    }
    this.replaceChildren(...bits);
  }
}

function readSlots(json) {
  let list = null;
  if (json) { try { list = JSON.parse(json); } catch { list = null; } }
  const out = [];
  for (let n = 1; n <= 16; n++) {
    const src = (Array.isArray(list) ? list.find((x) => x && Number(x.n) === n) : null) || FIXTURE_SLOTS[n - 1];
    out.push({ n, name: src.name || '', trigger: src.trigger || 'one-shot', choke: src.choke == null ? 'none' : src.choke, level: Number.isFinite(Number(src.level)) ? Number(src.level) : 1, state: src.state || (src.name ? 'loaded' : 'empty'), reason: src.reason || '' });
  }
  return out;
}

define(MdjSampleBank);
