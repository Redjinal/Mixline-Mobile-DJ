// <mdj-route-chip route-id="speaker" state="ok|lost|unsupported|checking" compact>
//
// The output-route status in the persistent shell (Document 03 §1). It names the
// device and the master/cue arrangement from the RouteDescriptor fixture; tapping
// opens the route check. Never claims an isolated cue without route evidence.
import { MdjElement, define, h, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';

const KIND_ICON = { builtin: 'speaker', bluetooth: 'bluetooth', usb: 'usb', none: 'warning' };

export class MdjRouteChip extends MdjElement {
  static tag = 'mdj-route-chip';
  static states = ['ok', 'lost', 'unsupported', 'checking'];
  static fr = ['FR-022', 'FR-023'];
  static hit = 48;
  static observed = ['route-id', 'compact'];
  static samples = { default: { 'route-id': 'speaker', style: 'width:220px' }, variants: [{}, { compact: true }], ok: { 'route-id': 'usb-4ch' }, lost: { 'route-id': 'disconnected' }, unsupported: { 'route-id': 'unsupported' }, checking: { 'route-id': 'usb-4ch' } };

  render() {
    const route = fixtures.route(this.attr('route-id', 'speaker')) || { name: 'Unknown route', kind: 'none', master: '?', cue: '?', status: 'unsupported' };
    const compact = this.bool('compact');
    const state = this.hasAttribute('state') ? this.state : (route.status === 'ok' ? 'ok' : route.status === 'lost' ? 'lost' : 'unsupported');
    this.className = `route-chip route-chip--${state} ${compact ? 'route-chip--compact' : ''}`.trim();
    const cueText = route.cue === 'none' ? 'no cue' : `cue ${route.cue}`;
    const summary = state === 'lost' ? 'Output lost' : state === 'unsupported' ? 'Mapping unverified' : state === 'checking' ? 'Checking…' : `master ${route.master} · ${cueText}`;
    const btn = h('button', {
      type: 'button', class: 'route-chip__btn', dataset: { hit: '48' }, 'aria-label': `Output route: ${route.name}, ${summary}. Open route check.`,
      on: { click: () => this.emit('mdj:open-route', { routeId: route.id }) },
    });
    btn.appendChild(icon(KIND_ICON[route.kind] || 'usb', { size: 18 }));
    btn.appendChild(h('span', { class: 'route-chip__text' }, [
      h('span', { class: 'route-chip__name truncate', text: route.name }),
      h('span', { class: `route-chip__summary label ${state !== 'ok' ? 'route-chip__summary--alert' : ''}`.trim(), text: summary }),
    ]));
    this.replaceChildren(btn);
  }
}
define(MdjRouteChip);
