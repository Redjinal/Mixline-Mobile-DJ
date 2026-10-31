// <mdj-parday-message message="m8" role="user|assistant" text="…" at="21:13:52" claims='[…]' retained="…"
//                     error="timeout" state="sent|thinking|local-only|error">
//
// One conversation bubble in the ParDay panel (Document 03 §6 "Prepare may use a full-height
// conversation"; FR-048, FR-040 cloud disclosure). The `message` attribute names a message in
// fixtures/parday.json (conversation.messages); `role`, `text`, `at`, `claims` override or stand alone.
// Assistant claims carry a provenance tag each (measured / you / retrieved / inferred / excluded).
// Engine binding: none. A message never changes audio or preparation; proposals it mentions are
// separate cards. Cancel / Retry emit mdj:parday-message { action, messageId } for the screen.
// Units / range: timestamps as printed by the fixture (hh:mm:ss). Gesture: tap on the 48 dp Cancel or
// Retry button only; the bubble text is selectable, not tappable.
// States (role × state): sent = delivered / answered · thinking = user: SENT, waiting (dashed) /
// assistant: retained request + "Progress unknown" + Cancel · local-only = user: kept on this phone /
// assistant: answered from saved analysis and app help, no cloud request · error = user: not delivered,
// Retry / assistant: the retained request ("Was working on …") + the failure notice + Retry — a failed turn
// never prints an answer. The failure text is the message `text` only when the message IS an error (`error`
// in the fixture or the `error` attribute, e.g. "timeout"); otherwise a generic notice is printed. Retry sends
// the same request once and cannot duplicate a cue, crate entry or transport action.
// Gallery samples use m5 / m6 (the route question and its locally answered reply) so every state shows a
// coherent user + assistant pair; the fixture's real timeout is m10.
// Pending vs acknowledged: thinking (dashed SENT) and sent (solid) never share a visual; nothing animates
// to imply success. Cancellation: Cancel stops future work; already-applied changes are named by the
// next assistant message, not hidden. Accessible: <article> named "ParDay, 21:13:52" / "You, 21:13:40"
// with the state word; claims are a list with their provenance as text.
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';
import { pardayFixture, parseJsonAttr } from './mdj-provenance-tag.js';

const STATES = ['sent', 'thinking', 'local-only', 'error'];
let uid = 0;

export class MdjPardayMessage extends MdjElement {
  static tag = 'mdj-parday-message';
  static states = STATES;
  static fr = ['FR-048', 'FR-040'];
  static hit = 48;
  static fixture = true;
  static observed = ['message', 'role', 'text', 'at', 'claims', 'proposal', 'retained', 'error'];
  // Each state renders the m5 (user) + m6 (assistant) pair; the state attribute forces the visual, so no
  // per-state override is needed (an override would print the same message twice).
  static samples = {
    default: { message: 'm6', style: 'width:100%' },
    variants: [{ message: 'm5' }, { message: 'm6' }],
  };

  ensureFixtureMark() {
    if (this.querySelector('mdj-fixture-mark')) return;
    const m = document.createElement('mdj-fixture-mark');
    m.setAttribute('for', 'conversation: timestamps and quoted analysis values');
    m.setAttribute('inline', '');
    (this.querySelector('.pmsg__meta') || this).appendChild(m);
  }

  render() {
    const data = pardayFixture(this);
    const id = this.attr('message', '');
    const fx = id ? data?.conversation?.messages?.find((m) => m.id === id) : null;
    if (id && !data) { this.className = 'pmsg pmsg--loading'; this.replaceChildren(h('div', { class: 'pmsg__bubble body muted', text: 'Loading…' })); return; }
    const role = this.attr('role', fx?.role || 'assistant') === 'user' ? 'user' : 'assistant';
    const given = this.getAttribute('state');
    const inferred = fx?.error ? 'error' : fx?.localOnly ? 'local-only' : 'sent';
    const state = STATES.includes(given) ? given : inferred;
    const text = this.attr('text', fx?.text || '');
    const at = this.attr('at', fx?.at || '');
    const claims = parseJsonAttr(this.getAttribute('claims'), fx?.claims || []);
    const retained = this.attr('retained', fx?.retained || '');
    const errorKind = this.attr('error', fx?.error || '');
    const proposalId = this.attr('proposal', fx?.proposalId || '');
    delete this.dataset.hit;
    this.className = `pmsg pmsg--${role} pmsg--${state}`;
    const who = role === 'user' ? 'You' : 'ParDay';
    const stateWord = { sent: role === 'user' ? 'sent' : 'answered', thinking: role === 'user' ? 'sent, waiting for ParDay' : 'thinking, progress unknown', 'local-only': role === 'user' ? 'kept on this phone' : 'answered locally, no cloud request', error: role === 'user' ? 'not delivered' : 'request failed' }[state];
    const labelId = `pmsg-${++uid}`;

    const meta = h('div', { class: 'pmsg__meta', id: labelId }, [
      h('span', { class: 'pmsg__who label label-strong', text: who }),
      at ? h('span', { class: 'pmsg__time numeral', text: at }) : null,
      h('span', { class: 'pmsg__state-word label', text: stateWord }),
      proposalId ? h('span', { class: 'pmsg__ref numeral', text: proposalId }) : null,
    ]);

    const body = [];
    if (role === 'assistant' && state === 'thinking') {
      body.push(h('p', { class: 'pmsg__text body' }, [h('span', { class: 'label', text: 'Working on · ' }), retained || text || 'Working…']));
      body.push(h('div', { class: 'pmsg__progress', role: 'status', 'aria-label': 'Progress unknown' }, [
        h('span', { class: 'pmsg__progress-track sunken', 'aria-hidden': 'true' }, [h('span', { class: 'pmsg__progress-dash' })]),
        h('span', { class: 'pmsg__progress-text label' }, [icon(iconId('thinking', 'loader'), { size: 12, cls: 'pmsg__spin' }), h('span', { text: 'Progress unknown · 20-second deadline' })]),
      ]));
    } else if (role === 'assistant' && state === 'error') {
      // A failed turn has no answer: keep the retained request visible, then say what failed (below).
      body.push(h('p', { class: 'pmsg__text pmsg__text--retained body' }, [h('span', { class: 'label', text: 'Was working on · ' }), retained || 'this request']));
    } else {
      body.push(h('p', { class: 'pmsg__text body', text: text }));
      if (role === 'assistant' && claims.length) {
        const ul = h('ul', { class: 'pmsg__claims', 'aria-label': 'Claims and their provenance' });
        for (const c of claims) ul.appendChild(h('li', { class: 'pmsg__claim' }, [
          h('span', { class: 'pmsg__claim-text', text: c.text }),
          h('mdj-provenance-tag', { kind: c.provenance, size: 'sm', source: c.source || null, confidence: c.confidence || null }),
        ]));
        body.push(ul);
      }
    }

    // Notices are words with an icon; the tone is secondary.
    let notice = null;
    if (state === 'local-only') notice = this.notice('info', iconId('local-only', 'cloud-off'), role === 'user' ? 'Kept on this phone — offline, nothing was sent to a provider.' : 'Local only — answered from saved analysis and app help; no cloud request was made. Crate building and lookups wait for the network.');
    else if (state === 'error') notice = this.notice('critical', 'warning', role === 'user'
      ? 'Not delivered — the request did not reach ParDay. Nothing was changed.'
      : (errorKind && text) ? text : 'Request failed — nothing was changed. Retry sends the same request once; it cannot duplicate a cue, a crate entry or a transport action.');
    else if (state === 'thinking' && role === 'user') notice = this.notice('info', 'arrow-up', 'Sent · waiting for ParDay');

    const actions = [];
    if (state === 'thinking' && role === 'assistant') actions.push(this.button('cancel', 'Cancel', iconId('cancel', 'x'), id));
    if (state === 'error') actions.push(this.button('retry', 'Retry', iconId('retry', 'refresh'), id));

    const bubble = h('div', { class: 'pmsg__bubble' }, [meta, ...body, notice, actions.length ? h('div', { class: 'pmsg__actions' }, actions) : null]);
    if (state === 'thinking' && role === 'user') bubble.appendChild(h('span', { class: 'pmsg__sent label', text: 'SENT', 'aria-hidden': 'true' }));
    const avatar = role === 'assistant' ? h('span', { class: 'pmsg__avatar brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'pmsg__avatar-face titanium-radial' }, [icon('parday', { size: 14 })])]) : null;
    const article = h('article', { class: 'pmsg__article', 'aria-labelledby': labelId }, [avatar, bubble]);
    this.replaceChildren(article);
  }

  notice(tone, ic, text) {
    return h('p', { class: `pmsg__notice tone-${tone}`, role: 'status' }, [icon(ic, { size: 14 }), h('span', { text })]);
  }
  button(action, label, ic, messageId) {
    return h('button', {
      type: 'button', class: `btn pmsg__btn pmsg__btn--${action}`, dataset: { hit: '48' },
      'aria-label': `${label}${action === 'retry' ? ' — sends the same request once' : ' — stop this request'}`,
      on: { click: () => this.emit('mdj:parday-message', { action, messageId }) },
    }, [icon(ic, { size: 18 }), h('span', { class: 'btn-label', text: label })]);
  }
}
define(MdjPardayMessage);
