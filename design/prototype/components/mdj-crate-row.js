// <mdj-crate-row crate="crate-warmup" kind="crate|playlist|smart" name="Warm-up" count="4|?" color="cyan" demo
//                note="Opening hour" selected state="idle|selected|dragging|editing">
//
// One library structure row: a crate, a playlist or a smart rule (FR-005). Reads fixtures.library by id;
// name / count / color / note / demo attributes override the fixture.
// Engine binding: none. Opening a crate changes the browse scope only — never a deck or transport.
// Units / range: count is a non-negative integer or unknown ("?" with the accessible text "unknown
// count"). Colour tag = a folded-corner swatch + the spoken colour name; kind = icon + printed word
// ("Crate", "Playlist", "Smart rule"), so colour never carries meaning alone.
//   selected — aria-selected, raised, brass index bar
//   dragging — lifted (shadow), grip visible, meta prints "Moving — release to place"; the drag has an
//              accessible alternative in the owning screen (Move up / Move down)
//   editing  — the name becomes a labelled text field with Save and Cancel (48 dp); Enter saves, Escape
//              cancels; mdj:crate-rename { id, name } / mdj:crate-cancel
// Gesture: tap or Enter / Space selects (mdj:select { crateId }). Pending vs acknowledged: a rename is
// shown only after the library store confirms it; until then the row keeps the old name (the screen may
// print "Saving…"). Cancellation: Escape / Cancel leaves the name unchanged.
// Accessible: option "Warm-up, crate, 4 tracks, colour cyan, note Opening hour".
import { MdjElement, define, h, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';
import { countText } from './mdj-chip.js';
import { cueColorVar, iconId } from './mdj-marker.js';
import './mdj-chip.js';

const KIND_WORD = { crate: 'Crate', playlist: 'Playlist', smart: 'Smart rule' };

export class MdjCrateRow extends MdjElement {
  static tag = 'mdj-crate-row';
  static states = ['idle', 'selected', 'dragging', 'editing'];
  static fr = ['FR-005'];
  static hit = 48;
  static fixture = false;
  static observed = ['crate', 'kind', 'name', 'count', 'color', 'demo', 'note', 'selected'];
  static samples = {
    default: { crate: 'crate-warmup', style: 'width:100%' },
    variants: [{}, { crate: 'crate-demo' }, { crate: 'pl-saturday', kind: 'playlist' }, { crate: 'sr-compatible', kind: 'smart' }],
  };

  lookup(id) {
    const lib = fixtures.library || {};
    const c = (lib.crates || []).find((x) => x.id === id);
    if (c) return { kind: 'crate', name: c.name, count: c.trackIds.length, color: c.color, note: c.note, demo: !!c.demo };
    const p = (lib.playlists || []).find((x) => x.id === id);
    if (p) return { kind: 'playlist', name: p.name, count: p.entries.length, color: null, note: null, demo: false };
    const s = (lib.smartRules || []).find((x) => x.id === id);
    if (s) return { kind: 'smart', name: s.name, count: s.resultIds.length, color: null, note: `${s.rules.length} rules`, demo: false };
    return null;
  }

  render() {
    const id = this.attr('crate', '');
    const fx = this.lookup(id) || { kind: 'crate', name: '', count: null, color: null, note: null, demo: false };
    const kindAttr = this.attr('kind', fx.kind);
    const kind = KIND_WORD[kindAttr] ? kindAttr : 'crate';
    const name = this.attr('name', fx.name || 'Untitled crate');
    const count = countText(this.hasAttribute('count') ? this.getAttribute('count') : fx.count);
    const color = this.attr('color', fx.color || '');
    const demo = this.bool('demo') || fx.demo;
    const note = this.attr('note', fx.note || '');
    const state = this.state;
    const selected = this.bool('selected') || state === 'selected';
    this.className = `crate-row crate-row--${kind} crate-row--${state}${selected ? ' crate-row--selected' : ''}`;
    delete this.dataset.hit; // the option body and the edit buttons are the targets
    const kindIcon = kind === 'playlist' ? iconId('playlist', 'list') : kind === 'smart' ? iconId('smart-rule', 'filter') : iconId('crate', 'folder');
    const unit = kind === 'smart' ? 'matches' : 'tracks';

    const swatch = h('span', { class: `crate-row__swatch${color ? ' crate-row__swatch--tagged' : ''}`, 'aria-hidden': 'true' }, [icon(kindIcon, { size: 16 })]);
    if (color) swatch.style.setProperty('--tag', cueColorVar(color));

    const metaBits = [KIND_WORD[kind], `${count.text} ${unit}`];
    if (note) metaBits.push(note);
    if (state === 'dragging') metaBits.push('Moving — release to place');

    const nameEl = state === 'editing'
      ? h('span', { class: 'crate-row__edit' }, [
          h('label', { class: 'crate-row__edit-label label', for: `${this.constructor.tag}-${id || 'new'}-name`, text: 'Crate name' }),
          h('input', {
            id: `${this.constructor.tag}-${id || 'new'}-name`, class: 'crate-row__input raised', type: 'text', value: name, 'aria-label': `Crate name, editing ${name}`,
            on: {
              keydown: (e) => {
                if (e.key === 'Enter') { e.preventDefault(); this.emit('mdj:crate-rename', { id, name: e.target.value.trim() }); }
                if (e.key === 'Escape') { e.preventDefault(); this.emit('mdj:crate-cancel', { id }); }
              },
            },
          }),
        ])
      : h('span', { class: 'crate-row__name title truncate', text: name });

    const body = h('div', { class: 'crate-row__body' }, [
      nameEl,
      h('span', { class: 'crate-row__meta truncate', text: metaBits.join(' · ') }),
      demo ? h('mdj-chip', { kind: 'availability', value: 'demo', size: 'sm' }) : null,
    ]);
    const countEl = h('span', { class: 'crate-row__count numeral ink-backing', 'aria-hidden': 'true', text: count.text });
    const grip = h('span', { class: 'crate-row__grip', 'aria-hidden': 'true' }, [icon('drag', { size: 16 })]);

    const nameParts = [name, KIND_WORD[kind].toLowerCase(), count.known ? `${count.text} ${unit}` : `unknown count of ${unit}`];
    if (color) nameParts.push(`colour ${color}`);
    if (demo) nameParts.push('demo media');
    if (note) nameParts.push(`note ${note}`);
    if (state === 'dragging') nameParts.push('moving');
    const select = () => this.emit('mdj:select', { crateId: id, kind });

    let main;
    if (state === 'editing') {
      main = h('div', { class: 'crate-row__main crate-row__main--editing' }, [
        h('span', { class: 'crate-row__bar', 'aria-hidden': 'true' }), swatch, body,
        h('span', { class: 'crate-row__edit-actions' }, [
          h('button', { type: 'button', class: 'btn btn--primary crate-row__btn', dataset: { hit: '48' }, 'aria-label': `Save crate name`, on: { click: () => this.emit('mdj:crate-rename', { id, name: (this.querySelector('.crate-row__input')?.value || name).trim() }) } }, [icon('save', { size: 16 }), h('span', { class: 'btn-label', text: 'Save' })]),
          h('button', { type: 'button', class: 'btn crate-row__btn', dataset: { hit: '48' }, 'aria-label': `Cancel renaming ${name}`, on: { click: () => this.emit('mdj:crate-cancel', { id }) } }, [h('span', { class: 'btn-label', text: 'Cancel' })]),
        ]),
      ]);
    } else {
      main = h('div', {
        class: 'crate-row__main', role: 'option', tabindex: 0, 'aria-selected': String(selected), 'aria-label': nameParts.join(', '), dataset: { hit: '48' },
        on: { click: select, keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } } },
      }, [h('span', { class: 'crate-row__bar', 'aria-hidden': 'true' }), swatch, body, countEl, grip]);
    }
    this.replaceChildren(main);
  }
}
define(MdjCrateRow);
