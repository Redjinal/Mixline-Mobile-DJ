// <mdj-route-diagram kind="single-stereo|split-mono|multichannel|unverified|lost" route="usb-4ch" compact
//                    state="single-stereo|split-mono|multichannel|unverified|lost">
//
// The output-route diagram (AS-23, Document 08): an exact original vector of phone → device → outputs
// with channel labels (L/R or 1–2 / 3–4), the master / cue assignment and the mono / stereo tradeoff in
// words. Only QUALIFIED arrangements are drawn as solid wiring (AE-07: master-only stereo, split mono
// master + cue, verified four-channel USB); `unverified` draws a "?" mapping with the blocked note and
// `lost` draws the broken link with the route-loss rule (paused and muted, nothing rerouted).
// Engine binding: NONE. It is a picture of the RouteDescriptor fixture (fixtures/routes.json via
// fixtures.route(id)) or of the `kind` attribute; it never reads a device and never sends a command.
// It is not measured data, so no FIXTURE mark; instead every instance prints "Diagram, not a measurement".
// `kind` is derived from `route` when absent (speaker / bluetooth / usbc-stereo → single-stereo,
// splitter → split-mono, usb-4ch → multichannel, unsupported → unverified, disconnected → lost); the
// `state` attribute is an alias for `kind` so the gallery shows every arrangement.
// Units / range: channel numbers 1–6, L / R; no levels, no latency numbers (Bluetooth prints "delay
// unknown", never a figure). Gesture: none (hit 0). Pending / acknowledged: n/a. Cancellation: n/a.
// Accessible: role=img with a full sentence ("Route diagram: phone to DJ splitter on USB-C; left carries
// the master in mono, right carries the cue in mono") and an HTML legend that scales with the font size;
// the SVG carries only short channel letters.
import { MdjElement, define, h, s, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';

export const KINDS = ['single-stereo', 'split-mono', 'multichannel', 'unverified', 'lost'];
export const ROUTE_KIND = { speaker: 'single-stereo', bluetooth: 'single-stereo', 'usbc-stereo': 'single-stereo', splitter: 'split-mono', 'usb-4ch': 'multichannel', unsupported: 'unverified', disconnected: 'lost' };
const DEVICE_SHORT = { speaker: 'Built-in speaker', bluetooth: 'Bluetooth headset', 'usbc-stereo': 'USB-C DAC', splitter: 'DJ splitter', 'usb-4ch': 'USB interface · 4 out', unsupported: 'USB device · 6 out', disconnected: 'Previous device' };
const KIND_DEFAULT_ROUTE = { 'single-stereo': 'usbc-stereo', 'split-mono': 'splitter', multichannel: 'usb-4ch', unverified: 'unsupported', lost: 'disconnected' };

// Channel plan per kind: label printed in the SVG jack, the legend row text, and the bus it carries.
function plan(kind, route) {
  switch (kind) {
    case 'single-stereo':
      return {
        jacks: [{ ch: 'L', bus: 'master', text: 'Master · left' }, { ch: 'R', bus: 'master', text: 'Master · right' }],
        tradeoff: route?.kind === 'bluetooth' ? 'Stereo master · no cue route · added delay, unmeasured' : 'Stereo master · no cue route',
        caption: 'Both ears hear the master mix. Cue buttons select but do not monitor.',
      };
    case 'split-mono':
      return {
        jacks: [{ ch: 'L', bus: 'master', text: 'Master · mono' }, { ch: 'R', bus: 'cue', text: 'Cue · mono' }],
        tradeoff: 'Mono master + mono cue · stereo given up for independent cueing',
        caption: 'One stereo pair split by the cable: the assignment must match the splitter’s wiring.',
      };
    case 'multichannel':
      return {
        jacks: [{ ch: '1', bus: 'master', text: 'Master · left' }, { ch: '2', bus: 'master', text: 'Master · right' }, { ch: '3', bus: 'cue', text: 'Cue · left' }, { ch: '4', bus: 'cue', text: 'Cue · right' }],
        tradeoff: 'Stereo master on 1–2 · stereo cue on 3–4 · one device clock',
        caption: 'Four outputs negotiated. Master and cue are independent stereo pairs.',
      };
    case 'unverified':
      return {
        jacks: Array.from({ length: Math.min(6, Math.max(2, route?.channels || 6)) }, (_, i) => ({ ch: String(i + 1), bus: 'unknown', text: 'Unknown' })),
        tradeoff: 'Mapping unverified — playback blocked on this route',
        caption: 'The device reports its outputs but not which carry master and cue. Choose the pairs, then run the isolation check.',
      };
    default:
      return {
        jacks: [],
        tradeoff: 'Output lost — decks paused and muted · nothing rerouted',
        caption: 'The previous route disappeared. The cue mix was not sent to the speaker; resume is an explicit action.',
      };
  }
}

// Legend rows: one per jack, except an unverified map, which collapses to a single "1–6 → unknown" row.
function legendRows(m) {
  if (m.kind !== 'unverified') return m.p.jacks;
  const n = m.p.jacks.length;
  return [{ ch: `1–${n}`, bus: 'unknown', text: 'Unknown — which pair is master and which is cue has not been verified' }];
}

export class MdjRouteDiagram extends MdjElement {
  static tag = 'mdj-route-diagram';
  static states = KINDS; // the state names the arrangement drawn; `kind` is an alias
  static fr = ['FR-022', 'FR-023'];
  static hit = 0;
  static fixture = false; // a drawing of a descriptor, not measured data — it prints "Diagram, not a measurement"
  static observed = ['kind', 'route', 'compact'];
  static samples = {
    default: { style: 'width:min(100%, 380px)' },
    variants: [{}],
    'single-stereo': { route: 'usbc-stereo' },
    'split-mono': { route: 'splitter' },
    multichannel: { route: 'usb-4ch' },
    unverified: { route: 'unsupported' },
    lost: { route: 'disconnected' },
  };

  model() {
    const routeAttr = this.attr('route', '');
    let kind = this.attr('kind', '') || (ROUTE_KIND[routeAttr] || '') || (KINDS.includes(this.attr('state', '')) ? this.attr('state') : '');
    if (!KINDS.includes(kind)) kind = 'single-stereo';
    const routeId = routeAttr || KIND_DEFAULT_ROUTE[kind];
    const route = fixtures.route(routeId) || null;
    const device = DEVICE_SHORT[routeId] || route?.name || 'Output device';
    const wireless = route?.kind === 'bluetooth';
    const builtin = route?.kind === 'builtin';
    return { kind, route, routeId, device, wireless, builtin, compact: this.bool('compact'), p: plan(kind, route) };
  }

  render() {
    const m = this.model();
    this.dataset.state = m.kind;
    this.className = `route-diagram route-diagram--${m.kind}${m.compact ? ' route-diagram--compact' : ''}`;
    const sentence = `Route diagram: phone to ${m.device}${m.wireless ? ' over Bluetooth' : ''}. ${m.p.tradeoff}. ${m.p.caption}`;
    const head = h('div', { class: 'route-diagram__head' }, [
      h('span', { class: 'route-diagram__title label label-strong' }, [icon('route', { size: 12 }), h('span', { text: m.route?.name || 'Output route' })]),
      h('span', { class: 'route-diagram__disclaimer label', text: 'Diagram, not a measurement' }),
    ]);
    const svg = this.drawSvg(m);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', sentence);
    const legend = m.compact ? null : h('div', { class: 'route-diagram__legend' }, [
      h('p', { class: 'route-diagram__tradeoff body', text: m.p.tradeoff }),
      m.p.jacks.length ? h('ul', { class: 'route-diagram__rows', 'aria-label': 'Channel assignment' }, legendRows(m).map((j) => h('li', { class: `route-diagram__row route-diagram__row--${j.bus}` }, [
        h('span', { class: 'route-diagram__ch numeral', text: j.ch }),
        h('span', { class: 'route-diagram__arrow', 'aria-hidden': 'true', text: '→' }),
        h('span', { class: 'route-diagram__bus', text: j.text }),
      ]))) : null,
      h('p', { class: 'route-diagram__caption body muted', text: m.p.caption }),
    ]);
    this.replaceChildren(...[head, svg, legend].filter(Boolean));
  }

  // Geometry in a 360 × 150 box. Phone at left, device in the middle, jacks on the right.
  drawSvg(m) {
    const W = 360, H = 150;
    const svg = s('svg', { class: 'route-diagram__svg', viewBox: `0 0 ${W} ${H}`, focusable: 'false' });
    const g = (cls, children = []) => { const n = s('g', { class: cls }); for (const c of children) n.appendChild(c); return n; };
    const lost = m.kind === 'lost', unverified = m.kind === 'unverified';

    // Phone
    const phone = g('route-diagram__phone', [
      s('rect', { x: 14, y: 30, width: 46, height: 90, rx: 8, class: 'rd-phone-body' }),
      s('rect', { x: 19, y: 38, width: 36, height: 70, rx: 3, class: 'rd-phone-screen' }),
      s('rect', { x: 30, y: 33, width: 14, height: 2, rx: 1, class: 'rd-phone-speaker' }),
      s('text', { x: 37, y: 136, class: 'rd-text rd-text--name', 'text-anchor': 'middle' }, ['Phone']),
    ]);
    svg.appendChild(phone);

    // Link phone → device
    const y = 75;
    const link = g(`route-diagram__link${lost ? ' route-diagram__link--lost' : ''}${m.wireless ? ' route-diagram__link--wireless' : ''}`);
    if (lost) {
      link.appendChild(s('path', { d: `M60 ${y} H92`, class: 'rd-wire' }));
      link.appendChild(s('path', { d: `M110 ${y} H134`, class: 'rd-wire rd-wire--ghost' }));
      link.appendChild(s('path', { d: 'M95 68 L107 82 M107 68 L95 82', class: 'rd-break' }));
    } else if (m.wireless) {
      link.appendChild(s('path', { d: `M60 ${y} H134`, class: 'rd-wire rd-wire--wireless' }));
      for (const r of [8, 14, 20]) link.appendChild(s('path', { d: `M${86 - r / 2} ${y - r} A ${r} ${r} 0 0 1 ${86 - r / 2} ${y + r}`, class: 'rd-wave', transform: `translate(${r},0)` }));
    } else if (m.builtin) {
      link.appendChild(s('path', { d: `M60 ${y} H134`, class: 'rd-wire' }));
    } else {
      link.appendChild(s('path', { d: `M60 ${y} H134`, class: 'rd-wire' }));
      link.appendChild(s('rect', { x: 118, y: y - 6, width: 16, height: 12, rx: 2, class: 'rd-plug' })); // USB-C plug
    }
    svg.appendChild(link);

    // Device
    const dev = g(`route-diagram__device${lost ? ' route-diagram__device--lost' : ''}${unverified ? ' route-diagram__device--unverified' : ''}`, [
      s('rect', { x: 134, y: 44, width: 104, height: 62, rx: 6, class: 'rd-device-body' }),
      s('rect', { x: 134, y: 44, width: 104, height: 62, rx: 6, class: 'rd-device-rim' }),
      s('rect', { x: 142, y: 52, width: 88, height: 10, rx: 2, class: 'rd-device-index' }),
    ]);
    // Device name wraps onto two lines when long.
    const words = m.device.split(' ');
    const lines = [];
    for (const w of words) { const cur = lines[lines.length - 1]; if (cur && (cur + ' ' + w).length <= 14) lines[lines.length - 1] = cur + ' ' + w; else lines.push(w); }
    lines.slice(0, 2).forEach((t, i) => dev.appendChild(s('text', { x: 186, y: 80 + i * 13 - (lines.length > 1 ? 4 : 0), class: 'rd-text rd-text--device', 'text-anchor': 'middle' }, [t])));
    svg.appendChild(dev);

    // Jacks and wires. Jack rows are fixed per channel count so the picture never jitters.
    const jacks = m.p.jacks;
    const n = jacks.length;
    const ROWS = { 2: [58, 92], 4: [50, 68, 86, 104], 6: [46, 58, 70, 82, 94, 106] };
    const ys = ROWS[n] || jacks.map((_, i) => 50 + i * (54 / Math.max(1, n - 1)));
    const jg = g('route-diagram__jacks');
    if (n) {
      const jx = 290, r = n <= 4 ? 9 : 6.5;
      jacks.forEach((j, i) => {
        const jy = ys[i];
        const dy = 60 + i * (30 / Math.max(1, n - 1)); // exit point on the device's right edge
        jg.appendChild(s('path', { d: `M238 ${dy} C 256 ${dy}, 262 ${jy}, ${jx - r - 2} ${jy}`, class: `rd-wire rd-wire--${j.bus}` }));
        jg.appendChild(s('circle', { cx: jx, cy: jy, r, class: `rd-jack rd-jack--${j.bus}` }));
        jg.appendChild(s('circle', { cx: jx, cy: jy, r: n <= 4 ? 3.2 : 2.2, class: 'rd-jack-pin' }));
        jg.appendChild(s('text', { x: jx + r + 6, y: jy + 3.5, class: `rd-text rd-text--ch${unverified ? ' rd-text--unknown' : ''}` }, [unverified ? `${j.ch} ?` : j.ch]));
      });
      // Bus brackets: short bus words so the picture reads alone; the legend carries the full text.
      if (!unverified) {
        for (const b of [...new Set(jacks.map((j) => j.bus))]) {
          const idx = jacks.map((j, i) => (j.bus === b ? i : -1)).filter((i) => i >= 0);
          const yTop = ys[idx[0]], yBot = ys[idx[idx.length - 1]];
          const bx = 322;
          jg.appendChild(s('path', { d: `M${bx} ${yTop - 7} H${bx + 4} V${yBot + 7} H${bx}`, class: `rd-bracket rd-bracket--${b}` }));
          jg.appendChild(s('text', { x: bx + 9, y: (yTop + yBot) / 2 + 3.5, class: `rd-text rd-text--bus rd-text--bus-${b}` }, [b === 'master' ? 'MST' : 'CUE']));
        }
      }
    } else if (lost) {
      jg.appendChild(s('text', { x: 300, y: 79, class: 'rd-text rd-text--lost', 'text-anchor': 'middle' }, ['no output']));
    }
    svg.appendChild(jg);
    if (unverified) svg.appendChild(s('text', { x: 186, y: 136, class: 'rd-text rd-text--note', 'text-anchor': 'middle' }, ['mapping unverified · blocked']));
    else if (lost) svg.appendChild(s('text', { x: 186, y: 136, class: 'rd-text rd-text--note', 'text-anchor': 'middle' }, ['paused · muted · nothing rerouted']));
    else if (m.wireless) svg.appendChild(s('text', { x: 186, y: 136, class: 'rd-text rd-text--note', 'text-anchor': 'middle' }, ['delay unknown']));
    return svg;
  }
}
define(MdjRouteDiagram);
