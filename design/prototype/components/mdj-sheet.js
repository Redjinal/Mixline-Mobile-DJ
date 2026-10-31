// <mdj-sheet title="Replace the track on Deck A?" variant="sheet|dialog|confirm" body="…" icon="lock" deck="A"
//            actions='[{"id":"cancel","label":"Keep playing"},{"id":"confirm","label":"Replace Deck A","tone":"danger"}]'
//            dismiss-label="Close" state="open|closed">
//   <p>Light-DOM children are the body slot; the `body` attribute is the text fallback.</p>
// </mdj-sheet>
//
// A bottom sheet (variant=sheet: brass handle, top corners rounded, docked above the transport dock by
// the owning screen so Play / Cue / crossfader stay reachable), a dialog (centred panel) or a confirm
// dialog (warning header, a danger action; used for the protected-load confirmation, FR-035, and other
// deliberate destructive choices). The explicit Dismiss button is 48 dp and always present; Escape also
// dismisses. Actions are real <button>s (48 dp) in a row that wraps at 200 % font scale.
// Engine binding: none. The confirm variant's action emits mdj:sheet-action { id }; the owning screen
// turns "confirm" into the EngineCommand and shows SENT / acknowledged state on the control that sent it;
// the sheet itself never prints "Done".
// Units / range: n/a. Gesture: tap; the handle is decorative here (drag-to-dismiss is a screen gesture
// with Dismiss as its accessible alternative). Pending vs acknowledged: n/a. Cancellation: Dismiss,
// Escape, or the cancel action; all leave music and preparation unchanged.
// closed → not rendered (display none, aria-hidden); the sheet is in-flow so screens position it.
// Accessible: role=dialog (aria-modal for dialog / confirm) labelled by the title; "Close sheet".
import { MdjElement, define, h, icon } from './base.js';
import { parseJsonAttr } from './mdj-chip.js';

const VARIANTS = ['sheet', 'dialog', 'confirm'];
let uid = 0;

export class MdjSheet extends MdjElement {
  static tag = 'mdj-sheet';
  static states = ['open', 'closed'];
  static fr = ['FR-035', 'FR-039'];
  static hit = 48;
  static fixture = false;
  static observed = ['title', 'variant', 'body', 'icon', 'deck', 'actions', 'dismiss-label'];
  static samples = {
    default: { style: 'width:100%' },
    variants: [
      { variant: 'sheet', title: 'Track options', body: 'AURORA DRIVE · Nyx Meridian · 124.0 BPM · 8A. Choose a deck below or add the track to a crate or the queue.', actions: JSON.stringify([{ id: 'queue', label: 'Add to queue', icon: 'queue' }, { id: 'crate', label: 'Add to crate', icon: 'folder' }, { id: 'prepare', label: 'Open in Prepare', icon: 'edit', primary: true }]) },
      { variant: 'dialog', title: 'Rename crate', body: 'The crate name is shown in the browser and in ParDay proposals. Tracks are not changed.', actions: JSON.stringify([{ id: 'cancel', label: 'Cancel' }, { id: 'save', label: 'Save name', primary: true, icon: 'save' }]) },
      { variant: 'confirm', deck: 'A', icon: 'lock', title: 'Replace the track on Deck A?', body: 'Deck A is playing AURORA DRIVE and is audible on the master. Loading COPPER SKY replaces it immediately. The engine confirms the load before anything changes on the deck.', actions: JSON.stringify([{ id: 'cancel', label: 'Keep playing', primary: true }, { id: 'confirm', label: 'Replace Deck A', tone: 'danger', icon: 'import' }]) },
    ],
  };

  constructor() { super(); this._slot = null; this._id = `mdj-sheet-${++uid}`; }

  render() {
    if (this._slot === null) this._slot = Array.from(this.childNodes).filter((n) => !(n.nodeType === 1 && n.dataset && n.dataset.sheetPart));
    const variantAttr = this.attr('variant', 'sheet');
    const variant = VARIANTS.includes(variantAttr) ? variantAttr : 'sheet';
    // The host's `title` attribute is removed below (no native tooltip); cache it so a later re-render keeps it.
    if (this.hasAttribute('title')) this._title = this.getAttribute('title');
    const title = this._title ?? 'Sheet';
    const bodyText = this.attr('body', '');
    const ic = this.attr('icon', variant === 'confirm' ? 'warning' : '');
    const deck = this.attr('deck', '').toUpperCase();
    const dismissLabel = this.attr('dismiss-label', 'Close');
    const actions = parseJsonAttr(this.getAttribute('actions'), []).filter((a) => a && a.label);
    const state = this.state;
    const closed = state === 'closed';
    this.className = `sheet sheet--${variant} sheet--${state}${deck ? ` deck-${deck.toLowerCase()}` : ''}`;
    this.removeAttribute('title');
    delete this.dataset.hit; // the dismiss and action buttons are the targets
    if (closed) { this.setAttribute('aria-hidden', 'true'); this.replaceChildren(); return; }
    this.removeAttribute('aria-hidden');
    const titleId = `${this._id}-title`;

    const head = h('header', { class: 'sheet__head ink-backing' }, [
      ic ? h('span', { class: `sheet__icon${variant === 'confirm' ? ' sheet__icon--confirm' : ''}`, 'aria-hidden': 'true' }, [icon(ic, { size: 18 })]) : null,
      deck ? h('span', { class: 'sheet__deck numeral', 'aria-hidden': 'true', text: deck }) : null,
      h('h2', { id: titleId, class: 'sheet__title title', text: title }),
      h('button', { type: 'button', class: 'sheet__dismiss', dataset: { hit: '48' }, 'aria-label': `${dismissLabel} ${variant === 'sheet' ? 'sheet' : 'dialog'}`, on: { click: () => this.emit('mdj:sheet-dismiss', { variant }) } }, [
        h('span', { class: 'sheet__dismiss-face', 'aria-hidden': 'true' }, [icon('x', { size: 16 })]),
        h('span', { class: 'sheet__dismiss-text label', text: dismissLabel }),
      ]),
    ]);
    const body = h('div', { class: 'sheet__body body' }, this._slot.length ? this._slot : (bodyText ? [h('p', { class: 'sheet__p', text: bodyText })] : []));
    const row = h('div', { class: 'sheet__actions' });
    actions.forEach((a, i) => {
      const primary = a.primary === true || (a.tone !== 'danger' && i === actions.length - 1 && !actions.some((x) => x.primary));
      row.appendChild(h('button', {
        type: 'button', class: `btn sheet__btn${a.tone === 'danger' ? ' btn--danger' : primary ? ' btn--primary' : ''}`, dataset: { hit: '48' },
        on: { click: () => this.emit('mdj:sheet-action', { id: a.id || a.label, variant, deck }) },
      }, [a.icon ? icon(a.icon, { size: 16 }) : null, h('span', { class: 'btn-label', text: a.label })]));
    });
    const panel = h('div', {
      class: 'sheet__panel glass', role: 'dialog', 'aria-modal': variant === 'sheet' ? undefined : 'true', 'aria-labelledby': titleId, tabindex: -1, dataset: { sheetPart: 'root' },
      on: { keydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); this.emit('mdj:sheet-dismiss', { variant, via: 'escape' }); } } },
    }, [
      variant === 'sheet' ? h('span', { class: 'sheet__handle brass', 'aria-hidden': 'true' }) : null,
      head, body,
      actions.length ? row : null,
    ]);
    this.replaceChildren(panel);
  }
}
define(MdjSheet);
