// <mdj-parday-button state="ready|local_only|thinking|proposal_ready|needs_review|applied|rejected|unavailable|cost_limit" compact>
//
// Compact labelled access button with a stable hit region (Document 03 §6). Opening
// ParDay leaves deck focus, recording, automation and routing unchanged. The status
// dot is accompanied by text; colour is never the only signal. Voice replies are off
// in Perform; nothing here listens. Hit 48 dp.
import { MdjElement, define, h, icon } from './base.js';

export const PARDAY_STATES = {
  ready: { text: 'Ready', tone: 'neutral' },
  local_only: { text: 'Local only', tone: 'info' },
  thinking: { text: 'Thinking', tone: 'info' },
  proposal_ready: { text: 'Proposal ready', tone: 'ok' },
  needs_review: { text: 'Needs review', tone: 'warning' },
  applied: { text: 'Applied', tone: 'ok' },
  rejected: { text: 'Rejected', tone: 'neutral' },
  unavailable: { text: 'Unavailable', tone: 'critical' },
  cost_limit: { text: 'Cost limit', tone: 'warning' },
  armed: { text: 'Armed', tone: 'warning' },
};

export class MdjPardayButton extends MdjElement {
  static tag = 'mdj-parday-button';
  static states = Object.keys(PARDAY_STATES);
  static fr = ['FR-048'];
  static hit = 48;
  static observed = ['compact', 'count'];
  static samples = { default: {}, variants: [{}, { compact: true }], proposal_ready: { count: 2 } };

  render() {
    const state = this.state;
    const def = PARDAY_STATES[state] || PARDAY_STATES.ready;
    const compact = this.bool('compact');
    const count = this.num('count', 0);
    this.className = `parday-btn parday-btn--${state} ${compact ? 'parday-btn--compact' : ''}`.trim();
    const btn = h('button', {
      type: 'button', class: 'parday-btn__btn raised', 'aria-label': `ParDay assistant, ${def.text}${count ? `, ${count} proposals` : ''}`, dataset: { hit: '48' },
      on: { click: () => this.emit('mdj:open-parday', { state }) },
    });
    btn.appendChild(icon('parday', { size: 18 }));
    btn.appendChild(h('span', { class: 'parday-btn__name', text: 'ParDay' }));
    btn.appendChild(h('span', { class: `parday-btn__state tone-${def.tone} label`, text: compact ? def.text.split(' ')[0] : def.text }));
    if (count > 0 && count < 100) btn.appendChild(h('span', { class: 'badge', text: String(count), 'aria-hidden': 'true' }));
    else if (count >= 100) btn.appendChild(h('span', { class: 'badge', text: '99+', 'aria-hidden': 'true' }));
    this.replaceChildren(btn);
  }
}
define(MdjPardayButton);
