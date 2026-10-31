// <mdj-route-card route="usb-4ch" current compact no-diagram state="ok|lost|unsupported|checking|selected">
//
// One output route as a reviewable card (Document 03 §2 "Readiness and routing", AE-07, FR-022 / FR-023):
// the device name with its kind icon, a status chip (word + shape, never colour alone), the summary, the
// tradeoffs list, the embedded <mdj-route-diagram>, and the next actions as real 48 dp buttons. Speaker and
// Bluetooth carry a prominent "Not a cue route" banner; routes with a cue path offer "Run isolation check".
// Engine binding: NONE directly. Buttons emit mdj:route-action { routeId, action } and the owning screen sends
// RouteCommand(select | isolation_check | resume | swap_pairs) carrying the route epoch; this card prints the
// ACKNOWLEDGED route state from the RouteDescriptor fixture (fixtures.route(id)). Nothing here certifies a
// channel map: "verified" is what the app would show after a real check (routes.json `_fixture`).
//   ok          — the route's own status (qualified, master-only, unverified or lost as the descriptor says)
//   lost        — output disappeared: decks paused and muted, nothing rerouted; Resume is explicit
//   unsupported — channel mapping could not be verified: playback blocked on this route until verified
//   checking    — isolation check running: CHECKING stamp (sent, not yet acknowledged), Cancel available
//   selected    — chosen but not yet applied: "Use this route" is the deliberate confirmation
// Units / range: channels, sample rate (Hz) and buffer (frames) from the descriptor; unknown prints "unknown",
// never a guess. Gesture: tap. Pending vs acknowledged: `checking` and `selected` are sent / chosen states with
// printed stamps; `ok` is acknowledged. Cancellation: Cancel check (checking), Back (selected).
// Accessible: role=group named "<route name>, <status>"; every button names the route ("Run isolation check,
// USB interface — Quadra 4"); the diagram has its own role=img sentence. The host carries no data-hit; the
// buttons do (48).
import { MdjElement, define, h, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';
import './mdj-route-diagram.js';

const KIND_ICON = { builtin: 'speaker', bluetooth: 'bluetooth', usb: 'usb', none: 'route-lost' };
const STATES = ['ok', 'lost', 'unsupported', 'checking', 'selected'];
const ACTION_ID = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export class MdjRouteCard extends MdjElement {
  static tag = 'mdj-route-card';
  static states = STATES;
  static fr = ['FR-022', 'FR-023', 'FR-042'];
  static hit = 0; // container: the action buttons carry data-hit="48"
  static fixture = false;
  static observed = ['route', 'current', 'compact', 'no-diagram'];
  static samples = {
    default: { route: 'usb-4ch', style: 'width:min(100%, 380px)' },
    variants: [
      { route: 'speaker', current: true }, { route: 'bluetooth' }, { route: 'usbc-stereo' }, { route: 'splitter' },
      { route: 'usb-4ch' }, { route: 'unsupported' }, { route: 'disconnected' },
    ],
    lost: { route: 'disconnected', current: true },
    unsupported: { route: 'unsupported' },
  };

  model() {
    const routeId = this.attr('route', 'speaker');
    const route = fixtures.route(routeId) || { id: routeId, name: 'Unknown route', kind: 'none', channels: 0, sampleRate: null, bufferFrames: null, master: 'unknown', cue: 'unknown', status: 'unsupported', verified: false, summary: 'No descriptor for this route.', detail: '', tradeoffs: [], nextActions: [] };
    let state = STATES.includes(this.state) ? this.state : 'ok';
    // `ok` means "print what the descriptor says": a lost or unverified descriptor shows as such.
    const effective = state === 'ok' ? (route.status === 'lost' ? 'lost' : route.status === 'unsupported' ? 'unsupported' : 'ok') : state;
    const noCue = route.cue === 'none';
    const masterOnly = noCue && (route.kind === 'builtin' || route.kind === 'bluetooth');
    const hasCuePath = !noCue && route.kind === 'usb';
    const status = {
      ok: masterOnly ? { word: 'Master only', shape: 'half', tone: 'warning' } : noCue ? { word: 'Qualified · no cue', shape: 'half', tone: 'neutral' } : { word: 'Qualified', shape: 'full', tone: 'ok' },
      lost: { word: 'Output lost', shape: 'cross', tone: 'critical' },
      unsupported: { word: 'Unverified', shape: 'question', tone: 'warning' },
      checking: { word: 'Checking', shape: 'ring', tone: 'info' },
      selected: { word: 'Selected', shape: 'ring-dot', tone: 'info' },
    }[effective];
    return { routeId, route, state, effective, noCue, masterOnly, hasCuePath, status, current: this.bool('current'), compact: this.bool('compact'), diagram: !this.bool('no-diagram') && !this.bool('compact') };
  }

  act(m, action, label) { this.emit('mdj:route-action', { routeId: m.routeId, action, label, state: m.effective }); }

  btn(m, label, { primary = false, danger = false, ic = null, disabled = false, action = ACTION_ID(label), why = '' } = {}) {
    return h('button', {
      type: 'button', class: `btn ${primary ? 'btn--primary' : danger ? 'btn--danger' : 'btn--secondary'} route-card__btn`, dataset: { hit: '48' },
      'aria-label': `${label}, ${m.route.name}${disabled && why ? ` (unavailable: ${why})` : ''}`, 'aria-disabled': disabled ? 'true' : undefined,
      on: { click: () => { if (!disabled) this.act(m, action, label); } },
    }, [ic ? icon(ic, { size: 16 }) : null, h('span', { class: 'btn-label', text: label })]);
  }

  render() {
    const m = this.model();
    const r = m.route;
    this.className = `route-card raised route-card--${m.effective}${m.current ? ' route-card--current' : ''}${m.compact ? ' route-card--compact' : ''}${m.masterOnly ? ' route-card--master-only' : ''}`;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', `${r.name}, ${m.status.word}${m.current ? ', current route' : ''}`);
    delete this.dataset.hit;

    const shape = h('span', { class: `route-card__shape route-card__shape--${m.status.shape}`, 'aria-hidden': 'true' });
    const head = h('div', { class: 'route-card__head' }, [
      h('span', { class: `route-card__disc brass-rim` }, [h('span', { class: 'route-card__disc-face titanium-radial' }, [icon(KIND_ICON[r.kind] || 'usb', { size: 18 })])]),
      h('div', { class: 'route-card__titles' }, [
        h('span', { class: 'route-card__name title', text: r.name }),
        h('span', { class: 'route-card__meta label' }, [
          h('span', { text: r.channels ? `${r.channels} ch` : 'no channels' }),
          h('span', { text: r.sampleRate ? `${(r.sampleRate / 1000).toFixed(1)} kHz` : 'rate unknown' }),
          h('span', { text: r.bufferFrames ? `${r.bufferFrames} frames` : 'buffer unknown' }),
        ]),
      ]),
      h('div', { class: 'route-card__flags' }, [
        m.current ? h('span', { class: 'route-card__current label', text: 'Current' }) : null,
        h('span', { class: `route-card__status tone-${m.status.tone} label`, role: 'status' }, [shape, h('span', { text: m.status.word })]),
      ]),
    ]);

    const children = [head];
    if (m.masterOnly) children.push(h('div', { class: 'route-card__banner tone-warning', role: 'note' }, [
      icon('headphones', { size: 16 }), h('span', { class: 'route-card__banner-text' }, [h('strong', { text: 'Not a cue route. ' }), h('span', { text: 'Cue buttons select but do not monitor; nothing is pre-listened on this output.' })]),
    ]));
    if (m.effective === 'lost') children.push(h('div', { class: 'route-card__banner tone-critical', role: 'alert' }, [
      icon('warning', { size: 16 }), h('span', { class: 'route-card__banner-text' }, [h('strong', { text: 'Output lost. ' }), h('span', { text: 'Decks paused and muted. Nothing was rerouted: the cue mix was not sent to the speaker.' })]),
    ]));
    if (m.effective === 'unsupported') children.push(h('div', { class: 'route-card__banner tone-warning', role: 'alert' }, [
      icon('channel-map', { size: 16 }), h('span', { class: 'route-card__banner-text' }, [h('strong', { text: 'Playback blocked on this route. ' }), h('span', { text: 'Which outputs carry master and cue could not be verified; a device name match is not a channel map.' })]),
    ]));

    children.push(h('p', { class: 'route-card__summary body', text: r.summary }));
    if (!m.compact) {
      children.push(h('dl', { class: 'route-card__assign' }, [
        h('div', {}, [h('dt', { class: 'label', text: 'Master' }), h('dd', { class: 'numeral', text: r.master })]),
        h('div', {}, [h('dt', { class: 'label', text: 'Cue' }), h('dd', { class: 'numeral', text: r.cue === 'none' ? 'none' : r.cue })]),
        h('div', {}, [h('dt', { class: 'label', text: 'Map' }), h('dd', { class: 'numeral', text: r.verified ? 'checked (fixture)' : 'unverified' })]),
      ]));
      if (m.diagram) {
        const d = document.createElement('mdj-route-diagram');
        d.setAttribute('route', r.id); d.setAttribute('compact', '');
        children.push(d);
      }
      if (r.detail) children.push(h('p', { class: 'route-card__detail body muted', text: r.detail }));
      if (r.tradeoffs?.length) children.push(h('div', { class: 'route-card__tradeoffs' }, [
        h('span', { class: 'label', text: 'Tradeoffs' }),
        h('ul', { class: 'route-card__list' }, r.tradeoffs.map((t) => h('li', { class: 'body', text: t }))),
      ]));
    }

    // Stamps for sent / chosen states: words, never animation.
    if (m.effective === 'checking') children.push(h('div', { class: 'route-card__stamp-row' }, [h('span', { class: 'route-card__stamp', text: 'CHECKING' }), h('span', { class: 'body muted', text: 'Isolation check sent — waiting for the engine to confirm that cue material stays off the master pair.' })]));
    if (m.effective === 'selected') children.push(h('div', { class: 'route-card__stamp-row' }, [h('span', { class: 'route-card__stamp', text: 'SELECTED' }), h('span', { class: 'body muted', text: 'Not applied yet. Using this route reopens the stream off-thread and verifies channels before audio.' })]));

    // Actions by state.
    const actions = [];
    if (m.effective === 'checking') {
      actions.push(this.btn(m, 'Cancel check', { ic: 'x', action: 'cancel-check' }));
    } else if (m.effective === 'selected') {
      actions.push(this.btn(m, 'Use this route', { primary: true, ic: 'check', action: 'select' }));
      actions.push(this.btn(m, 'Back', { action: 'back' }));
    } else if (m.effective === 'lost') {
      actions.push(this.btn(m, 'Choose another route', { primary: true, ic: 'route', action: 'choose' }));
      actions.push(this.btn(m, 'Resume', { ic: 'play', action: 'resume', disabled: true, why: 'no verified route yet' }));
    } else {
      if (m.hasCuePath || m.effective === 'unsupported') actions.push(this.btn(m, 'Run isolation check', { primary: m.effective !== 'unsupported', ic: 'isolation-check', action: 'isolation-check' }));
      if (!m.current && m.effective === 'ok') actions.push(this.btn(m, 'Use this route', { primary: !m.hasCuePath, ic: 'check', action: 'select' }));
      if (!m.compact) for (const a of (r.nextActions || []).slice(0, m.hasCuePath ? 2 : 3)) if (!/isolation/i.test(a)) actions.push(this.btn(m, a, { action: ACTION_ID(a) }));
    }
    if (m.effective === 'lost' || m.effective === 'unsupported') children.push(h('p', { class: 'route-card__why body muted', text: m.effective === 'lost' ? 'Resume becomes available once a route is reopened and its channels are verified.' : 'Choose the master and cue pairs manually, then run the isolation check; playback stays blocked until it passes.' }));
    children.push(h('div', { class: 'route-card__actions' }, actions));
    this.replaceChildren(...children);
  }
}
define(MdjRouteCard);
