// <mdj-route-chip route-id="speaker" state="ok|lost|unsupported|checking" compact>
//
// The output-route status in the persistent shell (Document 03 §1; FR-022 / FR-023). It names the device and
// the master / cue arrangement from the RouteDescriptor fixture (fixtures.route(id)); tapping opens the route
// check (mdj:open-route). It never claims an isolated cue without route evidence: a master-only route prints
// "no cue", an unverified map prints "Mapping unverified", a lost output prints "Output lost".
// Engine binding: NONE — it prints the acknowledged route state the shell passes in; the state attribute is set
// by the shell / scenario (ok when the descriptor is qualified, lost, unsupported, checking while an isolation
// check is pending). Units: none. Gesture: tap (48 dp). Pending vs acknowledged: `checking` is the sent state,
// printed as the word "Checking…" with a hollow ring; the others are acknowledged. Cancellation: n/a.
// Accessible: button "Output route: USB interface — Quadra 4, master stereo 1–2 · cue stereo 3–4. Open route check."
// Handed over from the foundation to the routing-av family. Public attributes and the class names that
// app/shell.js and app/app.css rely on (route-id, compact; .route-chip, .route-chip__btn, __text, __name,
// __summary, --compact, --lost, --unsupported) are unchanged; routing-av.css adds the status shape, the
// brass-rimmed kind disc and the Essential / contrast refinements.
import { MdjElement, define, h, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';

const KIND_ICON = { builtin: 'speaker', bluetooth: 'bluetooth', usb: 'usb', none: 'route-lost' };
const SHAPE = { ok: 'full', lost: 'cross', unsupported: 'question', checking: 'ring' };

export class MdjRouteChip extends MdjElement {
  static tag = 'mdj-route-chip';
  static states = ['ok', 'lost', 'unsupported', 'checking'];
  static fr = ['FR-022', 'FR-023'];
  static hit = 48;
  static observed = ['route-id', 'compact'];
  static samples = { default: { 'route-id': 'speaker', style: 'width:220px' }, variants: [{}, { compact: true }], ok: { 'route-id': 'usb-4ch' }, lost: { 'route-id': 'disconnected' }, unsupported: { 'route-id': 'unsupported' }, checking: { 'route-id': 'usb-4ch' } };

  render() {
    const route = fixtures.route(this.attr('route-id', 'speaker')) || { id: this.attr('route-id', ''), name: 'Unknown route', kind: 'none', master: '?', cue: '?', status: 'unsupported' };
    const compact = this.bool('compact');
    const state = this.hasAttribute('state') ? this.state : (route.status === 'ok' ? 'ok' : route.status === 'lost' ? 'lost' : 'unsupported');
    const masterOnly = route.cue === 'none' && state === 'ok';
    this.className = `route-chip route-chip--${state} ${compact ? 'route-chip--compact' : ''} ${masterOnly ? 'route-chip--master-only' : ''}`.replace(/\s+/g, ' ').trim();
    const cueText = route.cue === 'none' ? 'no cue' : `cue ${route.cue}`;
    const summary = state === 'lost' ? 'Output lost' : state === 'unsupported' ? 'Mapping unverified' : state === 'checking' ? 'Checking…' : `master ${route.master} · ${cueText}`;
    const btn = h('button', {
      type: 'button', class: 'route-chip__btn', dataset: { hit: '48' }, 'aria-label': `Output route: ${route.name}, ${summary}. Open route check.`,
      on: { click: () => this.emit('mdj:open-route', { routeId: route.id }) },
    });
    btn.appendChild(h('span', { class: 'route-chip__disc', 'aria-hidden': 'true' }, [icon(KIND_ICON[route.kind] || 'usb', { size: 16 })]));
    btn.appendChild(h('span', { class: 'route-chip__text' }, [
      h('span', { class: 'route-chip__name truncate', text: route.name }),
      h('span', { class: `route-chip__summary label ${state !== 'ok' ? 'route-chip__summary--alert' : ''}`.trim() }, [
        h('span', { class: `route-chip__shape route-chip__shape--${SHAPE[state] || 'full'}`, 'aria-hidden': 'true' }),
        h('span', { class: 'route-chip__summary-text truncate', text: summary }),
      ]),
    ]));
    this.replaceChildren(btn);
  }
}
define(MdjRouteChip);
