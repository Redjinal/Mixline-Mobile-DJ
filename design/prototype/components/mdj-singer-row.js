// <mdj-singer-row singer="Marla V." song="aurora" version="Karaoke mix" key="-2" position="2" total="5" local note="…"
//                 state="waiting|active|next|skipped|paused">
//
// One entry of the karaoke singer queue (Document 15 §4, FR-046). The operator controls the order; the stage
// name is LOCAL data (badge "Local") and never leaves the device by default. Reorder (Move up / Move down) and
// Remove are real 48 dp buttons; on the ACTIVE row they are rendered but disabled with a printed reason, so
// reordering or removing a waiting singer can never replace the active song. The active row offers Pause and
// Next singer; a skipped row offers Return to queue; a paused row offers Resume.
// Engine binding: NONE directly. Buttons emit mdj:singer-move { id, dir }, mdj:singer-remove { id } and
// mdj:singer-action { id, action }; the karaoke screen applies them to the queue model and, for the active song,
// to the deck through the normal transport path (never from a swipe).
// Units / range: key shift in semitones (−6..+6, printed with sign), tempo BPM (fixture), position 1..total.
// Gesture: tap only (no drag handle on a phone row; the handle is the Move buttons). Pending vs acknowledged:
// a move is applied by the screen and re-rendered; nothing animates to imply it happened. Cancellation: n/a.
// Accessible: role=listitem named "2 of 5, DJ Pocket, COPPER SKY, instrumental, key −2, up next"; buttons name
// the singer ("Move up, DJ Pocket"); the active row's disabled buttons say why ("unavailable: now singing").
import { MdjElement, define, h, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';

const STATES = ['waiting', 'active', 'next', 'skipped', 'paused'];
const WORD = { waiting: 'Waiting', active: 'Now singing', next: 'Up next', skipped: 'Skipped', paused: 'Paused' };
const ICON = { waiting: 'clock', active: 'mic', next: 'arrow-up', skipped: 'chevron-right', paused: 'pause' };

export class MdjSingerRow extends MdjElement {
  static tag = 'mdj-singer-row';
  static states = STATES;
  static fr = ['FR-046'];
  static hit = 0; // container: Move / Remove / Pause buttons carry data-hit="48"
  static fixture = false;
  static observed = ['singer', 'song', 'version', 'key', 'tempo', 'position', 'total', 'local', 'note'];
  static samples = {
    default: { singer: 'DJ Pocket', song: 'copper', version: 'Instrumental (fixture)', key: -2, tempo: 126, position: 2, total: 5, local: true, style: 'width:min(100%, 380px)' },
    variants: [{}],
    active: { singer: 'Marla V.', song: 'aurora', version: 'Karaoke mix (fixture)', key: 0, tempo: 124, position: 1, note: 'Wants the bridge lower' },
    next: {},
    waiting: { singer: 'The Very Long Stage Name That Someone Chose On The Night', song: 'longtitle', key: 0, tempo: 122, position: 4, note: '' },
    skipped: { singer: 'Sunny', song: 'calypso', key: 3, tempo: 136, position: 5, note: 'Stepped out — return later' },
    paused: { singer: 'Marla V.', song: 'aurora', key: 0, tempo: 124, position: 1 },
  };

  btn(label, { ic = null, disabled = false, why = '', cls = 'btn--secondary', iconOnly = false, on }) {
    const name = `${label}${disabled && why ? ` (unavailable: ${why})` : ''}`;
    return h('button', {
      type: 'button', class: `btn ${cls} singer-row__btn${iconOnly ? ' btn--icon' : ''}`, dataset: { hit: '48' }, 'aria-label': name,
      'aria-disabled': disabled ? 'true' : undefined, on: { click: () => { if (!disabled) on(); } },
    }, [ic ? icon(ic, { size: 18 }) : null, iconOnly ? null : h('span', { class: 'btn-label', text: label })]);
  }

  render() {
    const state = STATES.includes(this.state) ? this.state : 'waiting';
    const singer = this.attr('singer', 'Singer');
    const songAttr = this.attr('song', '');
    const track = fixtures.track(songAttr);
    const song = track?.title || songAttr || '—';
    const version = this.attr('version', '');
    const key = Math.round(this.num('key', 0));
    const tempo = this.hasAttribute('tempo') ? this.num('tempo', 0) : null;
    const position = Math.max(1, Math.round(this.num('position', 1)));
    const total = Math.max(position, Math.round(this.num('total', position)));
    const local = this.bool('local');
    const note = this.attr('note', '');
    const id = this.attr('id', '') || `singer-${position}`;
    const active = state === 'active' || state === 'paused';
    this.className = `singer-row raised singer-row--${state}`;
    this.setAttribute('role', 'listitem');
    const keyText = key === 0 ? '0' : `${key > 0 ? '+' : '−'}${Math.abs(key)}`;
    this.setAttribute('aria-label', `${position} of ${total}, ${singer}, ${song}${version ? `, ${version}` : ''}, key ${keyText.replace('−', '-')}, ${WORD[state].toLowerCase()}`);
    delete this.dataset.hit;

    const pos = h('span', { class: 'singer-row__pos numeral', 'aria-hidden': 'true', text: active ? '●' : String(position) });
    const stateChip = h('span', { class: `singer-row__state label singer-row__state--${state}` }, [icon(ICON[state], { size: 11 }), h('span', { text: WORD[state] })]);
    const main = h('div', { class: 'singer-row__main' }, [
      h('div', { class: 'singer-row__who' }, [
        h('span', { class: 'singer-row__name title wrap-2', text: singer }),
        local ? h('span', { class: 'singer-row__local label', title: 'Stage name stored on this device only' }, [icon('lock', { size: 9 }), h('span', { text: 'Local' })]) : null,
      ]),
      h('div', { class: 'singer-row__song' }, [
        h('span', { class: 'singer-row__title truncate', text: song }),
        version ? h('span', { class: 'singer-row__version label', text: version }) : null,
      ]),
      h('div', { class: 'singer-row__facts' }, [
        stateChip,
        h('span', { class: 'singer-row__fact label' }, [h('span', { text: 'Key ' }), h('span', { class: 'numeral', text: keyText })]),
        tempo != null ? h('span', { class: 'singer-row__fact label' }, [h('span', { class: 'numeral', text: tempo.toFixed(1) }), h('span', { text: ' BPM' })]) : null,
        note ? h('span', { class: 'singer-row__note body muted truncate', text: note }) : null,
      ]),
    ]);

    const protectedWhy = 'now singing — the active song is protected';
    const controls = h('div', { class: 'singer-row__controls' }, [
      this.btn('Move up', { ic: 'arrow-up', iconOnly: true, disabled: active || position <= 1, why: active ? protectedWhy : 'already first', on: () => this.emit('mdj:singer-move', { id, dir: -1 }) }),
      this.btn('Move down', { ic: 'arrow-down', iconOnly: true, disabled: active || position >= total, why: active ? protectedWhy : 'already last', on: () => this.emit('mdj:singer-move', { id, dir: 1 }) }),
      this.btn('Remove', { ic: 'trash', iconOnly: true, disabled: active, why: active ? protectedWhy : '', on: () => this.emit('mdj:singer-remove', { id }) }),
    ]);
    for (const b of controls.children) b.setAttribute('aria-label', `${b.getAttribute('aria-label').replace(/ \(unavailable.*$/, '')}, ${singer}${b.getAttribute('aria-disabled') ? ` (unavailable: ${active ? protectedWhy : b.getAttribute('aria-label').includes('up') ? 'already first' : b.getAttribute('aria-label').includes('down') ? 'already last' : ''})` : ''}`);

    const actions = [];
    if (state === 'active') {
      actions.push(this.btn('Pause', { ic: 'pause', on: () => this.emit('mdj:singer-action', { id, action: 'pause' }) }));
      actions.push(this.btn('Next singer', { ic: 'chevron-right', cls: 'btn--primary', on: () => this.emit('mdj:singer-action', { id, action: 'next' }) }));
    } else if (state === 'paused') {
      actions.push(this.btn('Resume', { ic: 'play', cls: 'btn--primary', on: () => this.emit('mdj:singer-action', { id, action: 'resume' }) }));
      actions.push(this.btn('Return to DJ', { ic: 'music', on: () => this.emit('mdj:singer-action', { id, action: 'return-to-dj' }) }));
    } else if (state === 'skipped') {
      actions.push(this.btn('Return to queue', { ic: 'undo', on: () => this.emit('mdj:singer-action', { id, action: 'return' }) }));
    }
    const children = [pos, main, controls];
    if (active) children.push(h('p', { class: 'singer-row__protected body muted' }, [icon('lock', { size: 11 }), h('span', { text: ' Active song protected: reorder and remove act on waiting singers only.' })]));
    if (actions.length) children.push(h('div', { class: 'singer-row__actions' }, actions));
    this.replaceChildren(...children);
  }
}
define(MdjSingerRow);
