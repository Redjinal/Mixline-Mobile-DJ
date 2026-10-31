// <mdj-parday-quick-actions actions='[…]' unavailable='{"practice-transition":"Needs two loaded decks"}'
//                           reason="Daily AI limit reached" state="idle|thinking|offline|disabled">
//
// The task-specific quick actions from Document 03 §6: "Find a compatible next track", "Explain this
// route", "Draft cues", "Build a 30-minute crate", "Practice this transition" (FR-048). Each chip is a
// real 48 dp button that starts a typed request using actual eligible content and state; a chip never
// performs an audible action by itself (every result arrives as a proposal card in read/propose).
// Engine binding: none. A tap emits mdj:parday-quick { id, label, local }; the screen composes the
// request with the current deck / track / route and shows the thinking state.
// Default actions come from fixtures/parday.json (quickActions); `actions` overrides them. `local`
// marks actions that work offline (library search, route explanation: deterministic local tools);
// the others need the model and say "Needs network" when offline instead of disappearing.
// States: idle · thinking (one interactive request per session — chips are held with the reason "One
// request at a time") · offline (local chips stay available, cloud chips print "Needs network") ·
// disabled (`reason` printed once above the row, e.g. the daily cost limit; every chip held).
// Per-chip unavailability (`unavailable` map) prints its reason under the label and sets aria-disabled.
// Units / range: n/a. Gesture: tap. Pending vs acknowledged: the chip does not change on tap; the
// conversation shows the sent request. Cancellation: n/a here (the message's Cancel).
// Accessible: group "ParDay quick actions"; each chip "Draft cues — needs network, unavailable offline".
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';
import { pardayFixture, parseJsonAttr } from './mdj-provenance-tag.js';

const STATES = ['idle', 'thinking', 'offline', 'disabled'];

export class MdjPardayQuickActions extends MdjElement {
  static tag = 'mdj-parday-quick-actions';
  static states = STATES;
  static fr = ['FR-048'];
  static hit = 48;
  static fixture = false;
  static observed = ['actions', 'unavailable', 'reason'];
  static samples = {
    default: { style: 'width:100%' },
    variants: [{}],
    idle: { unavailable: JSON.stringify({ 'practice-transition': 'Needs two loaded decks' }) },
    disabled: { reason: 'Daily AI limit reached — 40 of 40 requests. Local search, saved proposals and every manual control keep working.' },
  };

  render() {
    const data = pardayFixture(this);
    const state = STATES.includes(this.state) ? this.state : 'idle';
    const actions = parseJsonAttr(this.getAttribute('actions'), data?.quickActions || []);
    const unavailable = parseJsonAttr(this.getAttribute('unavailable'), {});
    const reason = this.attr('reason', '');
    delete this.dataset.hit;
    this.className = `pquick pquick--${state}`;
    const parts = [];
    if (state === 'disabled') parts.push(this.notice('warning', iconId('cost-limit', 'warning'), reason || 'ParDay requests are paused.'));
    if (state === 'thinking') parts.push(this.notice('info', iconId('thinking', 'loader'), 'One request at a time — quick actions resume when the current request finishes or is cancelled.'));
    if (state === 'offline') parts.push(this.notice('info', iconId('offline', 'wifi-off'), 'Offline — local actions still work; actions that need the model say so.'));
    const row = h('div', { class: 'pquick__row', role: 'group', 'aria-label': 'ParDay quick actions' });
    if (!actions.length) row.appendChild(h('span', { class: 'body muted', text: data ? 'No quick actions for this state.' : 'Loading…' }));
    for (const a of actions) {
      let hold = '';
      if (state === 'disabled') hold = reason ? 'Paused' : 'Unavailable';
      else if (state === 'thinking') hold = 'One request at a time';
      else if (state === 'offline' && !a.local) hold = 'Needs network';
      if (unavailable[a.id]) hold = unavailable[a.id];
      const held = !!hold;
      const btn = h('button', {
        type: 'button', class: `pquick__chip raised${held ? ' pquick__chip--held' : ''}${a.local ? ' pquick__chip--local' : ''}`, dataset: { hit: '48' },
        'aria-label': `${a.label}${held ? ` — ${hold}, unavailable` : a.local ? ' — works offline' : ' — uses the model'}`,
        'aria-disabled': held ? 'true' : undefined,
        on: { click: () => { if (!held) this.emit('mdj:parday-quick', { id: a.id, label: a.label, local: !!a.local }); } },
      }, [
        h('span', { class: 'pquick__glyph', 'aria-hidden': 'true' }, [icon(iconId(a.icon, a.icon === 'crate' ? 'folder' : 'parday'), { size: 16 })]),
        h('span', { class: 'pquick__text' }, [
          h('span', { class: 'pquick__label', text: a.label }),
          held ? h('span', { class: 'pquick__hold label', text: hold }) : (state === 'offline' && a.local ? h('span', { class: 'pquick__hold label', text: 'Works offline' }) : null),
        ]),
      ]);
      row.appendChild(btn);
    }
    parts.push(row);
    this.replaceChildren(...parts);
  }
  notice(tone, ic, text) {
    return h('p', { class: `pquick__notice tone-${tone}`, role: 'status' }, [icon(ic, { size: 14 }), h('span', { class: 'body', text })]);
  }
}
define(MdjPardayQuickActions);
