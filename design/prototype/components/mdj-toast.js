// <mdj-toast tone="neutral|ok|info|warning|critical" icon="save" message="Session saved" detail="…"
//            action="undo" action-label="Undo" no-dismiss state="visible|hidden">
//
// A transient notice. PLACEMENT (documented, enforced by the owning screen): in portrait the toast sits
// directly above the transport dock and below the content; in landscape it sits at the top of the content
// area under the status strip. It never covers the dock, the deck selectors, the crossfader, the Master
// button or a sheet's action row, and it never moves them (Document 04 §3: persistent transport locations
// do not move with changing values, badges or labels).
// Engine binding: none. A toast prints an acknowledged outcome ("Session saved", "Load failed: file
// missing") or an engine-confirmed state; it never prints "Done" for a command that is still pending.
// Units / range: n/a. Tone is paired with an icon and the printed words; colour never carries meaning
// alone. critical / warning use role=alert, the rest role=status.
// Gesture: optional action button (48 dp, mdj:toast-action { id }) and an explicit Dismiss (48 dp,
// mdj:toast-dismiss) unless `no-dismiss` (then the screen removes it on its own timer — only for ok /
// neutral tones; warnings and errors always keep a dismiss).
// Pending vs acknowledged: n/a. Cancellation: Dismiss. hidden → not rendered (display none, aria-hidden).
// Accessible: "Session saved. Saved to Sets / 2026-10-29. Undo. Dismiss notification".
import { MdjElement, define, h, icon } from './base.js';

const TONES = ['neutral', 'ok', 'info', 'warning', 'critical'];
const TONE_ICON = { neutral: 'info', ok: 'check', info: 'info', warning: 'warning', critical: 'warning' };

export class MdjToast extends MdjElement {
  static tag = 'mdj-toast';
  static states = ['visible', 'hidden'];
  static fr = ['FR-034', 'FR-038'];
  static hit = 48;
  static fixture = false;
  static observed = ['tone', 'icon', 'message', 'detail', 'action', 'action-label', 'no-dismiss'];
  static samples = {
    default: { tone: 'ok', icon: 'save', message: 'Session saved', detail: 'Saved to Sets / Saturday order · 23:41', action: 'undo', 'action-label': 'Undo', style: 'width:100%' },
    variants: [
      {},
      { tone: 'info', icon: 'download', message: 'Download finished', detail: 'SODA LIGHTS (Radio Edit) · actual source YouTube (fixture) · ready to prepare', action: 'open', 'action-label': 'Open' },
      { tone: 'warning', icon: 'thermal', message: 'Phone is getting hot', detail: 'Enhanced visuals reduced. Audio and controls unchanged.', action: null, 'action-label': null },
      { tone: 'critical', icon: 'unavailable', message: 'Load failed: file missing', detail: 'BRASS CANYON was not loaded. Deck B keeps playing COPPER SKY.', action: 'locate', 'action-label': 'Locate file' },
    ],
  };

  render() {
    const toneAttr = this.attr('tone', 'neutral');
    const tone = TONES.includes(toneAttr) ? toneAttr : 'neutral';
    const ic = this.attr('icon', TONE_ICON[tone]);
    const message = this.attr('message', '');
    const detail = this.attr('detail', '');
    const actionId = this.attr('action', '');
    const actionLabel = this.attr('action-label', '');
    const noDismiss = this.bool('no-dismiss') && (tone === 'ok' || tone === 'neutral');
    const state = this.state;
    const hidden = state === 'hidden';
    this.className = `toast toast--${tone} toast--${state}`;
    delete this.dataset.hit; // the action and dismiss buttons are the targets
    if (hidden) { this.setAttribute('aria-hidden', 'true'); this.replaceChildren(); return; }
    this.removeAttribute('aria-hidden');
    const panel = h('div', { class: `toast__panel ink-backing tone-${tone}`, role: tone === 'critical' || tone === 'warning' ? 'alert' : 'status' }, [
      h('span', { class: 'toast__icon', 'aria-hidden': 'true' }, [icon(ic, { size: 18 })]),
      h('div', { class: 'toast__text' }, [
        h('span', { class: 'toast__message title', text: message }),
        detail ? h('span', { class: 'toast__detail body', text: detail }) : null,
      ]),
      actionId && actionLabel ? h('button', { type: 'button', class: 'btn toast__action', dataset: { hit: '48' }, on: { click: () => this.emit('mdj:toast-action', { id: actionId, tone }) } }, [h('span', { class: 'btn-label', text: actionLabel })]) : null,
      noDismiss ? null : h('button', { type: 'button', class: 'toast__dismiss', dataset: { hit: '48' }, 'aria-label': 'Dismiss notification', on: { click: () => this.emit('mdj:toast-dismiss', { tone }) } }, [h('span', { class: 'toast__dismiss-face', 'aria-hidden': 'true' }, [icon('x', { size: 14 })])]),
    ]);
    this.replaceChildren(panel);
  }
}
define(MdjToast);
