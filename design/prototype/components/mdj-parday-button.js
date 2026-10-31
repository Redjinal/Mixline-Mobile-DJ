// <mdj-parday-button state="ready|local_only|thinking|proposal_ready|needs_review|applied|rejected|unavailable|cost_limit|armed"
//                    compact count="2">
//
// Compact labelled access button with a stable hit region (Document 03 §6; FR-048). Opening ParDay
// leaves deck focus, recording, automation and routing unchanged. Every state reads as TEXT with an
// icon; the tone colour is secondary and never the only signal. In the compact shell variant the full
// state word is replaced by a short word (`parday-btn__short`: Ready / Local / Thinking / Proposal /
// Review / Applied / Rejected / Off / Limit / Armed) so the state is still printed, not implied.
// `armed` (a bounded plan is armed or running) prints ARMED with the arm icon on a brass rim so the
// persistent button itself says that automation is live; Stop automation is a separate control.
// Engine binding: none — a tap emits mdj:open-parday { state } and the shell navigates to the panel.
// Units / range: `count` = actionable proposals (1–99, then 99+; zero hidden). Gesture: tap, 48 dp.
// Pending vs acknowledged: the button shows the acknowledged ParDay state only; `thinking` is a
// state word (with a slow pulse on the glyph under full motion), never a progress claim.
// Cancellation: n/a. Voice replies are off in Perform; nothing here listens.
// Accessible: "ParDay assistant, Needs review, 2 proposals". Public attributes (state, compact, count)
// and class names (parday-btn, parday-btn__btn, parday-btn__name, parday-btn__state, badge) are
// unchanged for app/shell.js; the base styles stay in app/app.css, the additions are in parday.css.
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';

export const PARDAY_STATES = {
  ready:          { text: 'Ready',          short: 'Ready',    tone: 'neutral',  icon: ['check', 'check'] },
  local_only:     { text: 'Local only',     short: 'Local',    tone: 'info',     icon: ['local-only', 'cloud-off'] },
  thinking:       { text: 'Thinking',       short: 'Thinking', tone: 'info',     icon: ['thinking', 'loader'] },
  proposal_ready: { text: 'Proposal ready', short: 'Proposal', tone: 'ok',       icon: ['parday', 'parday'] },
  needs_review:   { text: 'Needs review',   short: 'Review',   tone: 'warning',  icon: ['warning', 'warning'] },
  applied:        { text: 'Applied',        short: 'Applied',  tone: 'ok',       icon: ['check', 'check'] },
  rejected:       { text: 'Rejected',       short: 'Rejected', tone: 'neutral',  icon: ['x', 'x'] },
  unavailable:    { text: 'Unavailable',    short: 'Off',      tone: 'critical', icon: ['unavailable', 'unavailable'] },
  cost_limit:     { text: 'Cost limit',     short: 'Limit',    tone: 'warning',  icon: ['cost-limit', 'warning'] },
  armed:          { text: 'Armed',          short: 'Armed',    tone: 'warning',  icon: ['arm', 'arm'] },
};

export class MdjPardayButton extends MdjElement {
  static tag = 'mdj-parday-button';
  static states = Object.keys(PARDAY_STATES);
  static fr = ['FR-048'];
  static hit = 48;
  static observed = ['compact', 'count'];
  static samples = { default: {}, variants: [{}, { compact: true }], proposal_ready: { count: 2 }, needs_review: { count: 1 }, armed: { count: 1 } };

  render() {
    const state = PARDAY_STATES[this.state] ? this.state : 'ready';
    const def = PARDAY_STATES[state];
    const compact = this.bool('compact');
    const count = this.num('count', 0);
    this.className = `parday-btn parday-btn--${state} ${compact ? 'parday-btn--compact' : ''}`.trim();
    const btn = h('button', {
      type: 'button', class: 'parday-btn__btn raised', 'aria-label': `ParDay assistant, ${def.text}${count ? `, ${count} proposal${count === 1 ? '' : 's'}` : ''}`, dataset: { hit: '48' },
      on: { click: () => this.emit('mdj:open-parday', { state }) },
    });
    btn.appendChild(h('span', { class: 'parday-btn__glyph', 'aria-hidden': 'true' }, [icon('parday', { size: 18 })]));
    btn.appendChild(h('span', { class: 'parday-btn__name', text: 'ParDay' }));
    const stateIcon = icon(iconId(def.icon[0], def.icon[1]), { size: 11, cls: 'parday-btn__state-icon' });
    btn.appendChild(h('span', { class: `parday-btn__state tone-${def.tone} label` }, [stateIcon, h('span', { text: def.text })]));
    if (compact) btn.appendChild(h('span', { class: `parday-btn__short tone-${def.tone} label`, 'aria-hidden': 'true' }, [icon(iconId(def.icon[0], def.icon[1]), { size: 10 }), h('span', { text: def.short })]));
    if (count > 0 && count < 100) btn.appendChild(h('span', { class: 'badge', text: String(count), 'aria-hidden': 'true' }));
    else if (count >= 100) btn.appendChild(h('span', { class: 'badge', text: '99+', 'aria-hidden': 'true' }));
    this.replaceChildren(btn);
  }
}
define(MdjPardayButton);
