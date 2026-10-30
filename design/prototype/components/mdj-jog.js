// <mdj-jog deck="A" size="160|200|240" mode="vinyl|nudge|explicit-scratch|explicit-nudge" position="0.34"
//          playing slip-marker="0.41" track="AURORA DRIVE" state="idle|held-scratch|held-nudge|slip|disabled|pending">
//
// Engine binding: scratch = EngineCommand(jog_touch, { deck, zone: 'scratch' }) on contact, then
// jog_move { deltaDeg } at pointer rate and jog_release on release; nudge = EngineCommand(nudge,
// { deck, delta }) while the rim moves; the accessible Nudge −/+ buttons send one bounded nudge each.
// Every command carries the deck generation, and a held gesture keeps the deck id it started on even
// if focus changes (Document 03 §4). The platter angle drawn here is a FIXTURE (position × 360°); the
// real platter angle derives from the engine sample clock, never from UI animation (FR-013).
// Units: position 0..1 of the track; slip-marker 0..1 = where the slipped timeline continues
// (the continuation marker, FR-019). `track` is only used for the accessible name.
// Zones: at size ≥ 200 the centre scratch zone (titanium-radial disc with concentric calibration
// lines) and the rim nudge zone (brushed band with radial calibration lines) are distinguishable by
// surface, a seam and printed captions. At size < 200, or with mode="explicit-*", an explicit
// Scratch/Nudge mode toggle is part of the component: the Scratch button beneath the platter
// (aria-pressed) chooses the mode and the whole platter follows it.
// Pending vs acknowledged: `playing` and `position` come from the engine snapshot; the deck-colour
// glow ring appears only when `playing` is acknowledged. held-scratch / held-nudge are set while the
// finger is down (HELD badge, zone outline) and emit mdj:jog { phase }. `pending` = a quantized jog
// command (e.g. slip release at the next beat) that the engine has not acknowledged: dashed ring, SENT.
// `slip` draws the continuation marker and the SLIP flag; nothing animates to imply progress.
// Cancellation: POINTER-CANCEL, CAPTURE LOSS, APP BACKGROUND, ROUTE LOSS AND ROTATION RELEASE A HELD
// SCRATCH SAFELY — the component emits mdj:jog { phase: 'cancel' }, drops the hold state and the deck
// returns to its engine-defined release behaviour (FR-013); the platter is never left held.
// Accessible alternative: role=slider on the platter "Jog wheel, deck A, AURORA DRIVE, vinyl mode"
// with aria-valuetext "playing, position 34 %, slip continues at 41 %"; ArrowLeft/ArrowRight nudge
// −/+, Space toggles scratch. Real buttons Nudge −, Scratch (toggle) and Nudge + (48 dp) sit in a row
// beneath the platter so they never overlap the platter's hit area. Waveform scratch and the labelled
// transport remain available (Document 03 §4).
import { MdjElement, define, h, s, icon } from './base.js';

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const C = 120; // viewBox 0 0 240 240
let uid = 0;
function polar(r, deg) { const rad = ((deg - 90) * Math.PI) / 180; return [C + r * Math.cos(rad), C + r * Math.sin(rad)]; }
// Shortest arc from a1 to a2 (degrees, 0 = top, clockwise positive) at radius r.
function arc(r, a1, a2) {
  let d = ((a2 - a1) % 360 + 540) % 360 - 180;
  if (Math.abs(d) < 0.01) return '';
  const [x1, y1] = polar(r, a1), [x2, y2] = polar(r, a1 + d);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export class MdjJog extends MdjElement {
  static tag = 'mdj-jog';
  static states = ['idle', 'held-scratch', 'held-nudge', 'slip', 'disabled', 'pending'];
  static fr = ['FR-013', 'FR-019'];
  static hit = 48;
  static fixture = true;
  static observed = ['deck', 'size', 'mode', 'position', 'playing', 'slip-marker', 'track'];
  static samples = {
    default: { deck: 'A', size: 160, mode: 'vinyl', position: 0.34, track: 'AURORA DRIVE' },
    variants: [
      { size: 160 },
      { deck: 'B', size: 240, position: 0.62, playing: true, track: 'COPPER SKY' },
    ],
    slip: { playing: true, 'slip-marker': 0.41 },
    disabled: { playing: false, position: 0, track: '' },
    pending: { playing: true },
  };

  constructor() { super(); this._uid = ++uid; this._drag = null; }

  model() {
    const deck = this.attr('deck', 'A').toUpperCase();
    const size = clamp(this.num('size', 160), 120, 320);
    const modeAttr = this.attr('mode', 'vinyl');
    const mode = ['vinyl', 'nudge', 'explicit-scratch', 'explicit-nudge'].includes(modeAttr) ? modeAttr : 'vinyl';
    const explicit = mode.startsWith('explicit') || size < 200;
    const scratchOn = mode === 'vinyl' || mode === 'explicit-scratch';
    const zones = !explicit && mode === 'vinyl';
    const position = clamp(this.num('position', 0));
    const playing = this.bool('playing');
    const slip = this.hasAttribute('slip-marker') ? clamp(this.num('slip-marker', position)) : null;
    const track = this.attr('track', '');
    return { deck, size, mode, explicit, scratchOn, zones, position, playing, slip, track, state: this.state };
  }

  render() {
    const m = this.model();
    const active = document.activeElement;
    const focusKey = this.contains(active) ? (active.dataset.alt ? `[data-alt='${active.dataset.alt}']` : '.jog__platter') : null;
    const disabled = m.state === 'disabled';
    const slipping = m.state === 'slip' && m.slip != null;
    this.className = `jog deck-${m.deck.toLowerCase()} jog--${m.explicit ? 'explicit' : 'zones'} ${m.playing && !disabled ? 'jog--playing' : ''} ${m.scratchOn ? 'jog--scratch' : 'jog--nudge'}`.trim();
    this.style.setProperty('--size', `${m.size}px`);
    const modeText = m.zones ? 'vinyl mode, centre scratch and rim nudge' : m.scratchOn ? 'scratch mode' : 'nudge mode';
    const name = `Jog wheel, deck ${m.deck}${m.track ? `, ${m.track}` : ''}, ${modeText}`;
    const valuetext = disabled ? 'no track loaded' : `${m.playing ? 'playing' : 'paused'}, position ${Math.round(m.position * 100)} %${slipping ? `, slip continues at ${Math.round(m.slip * 100)} %` : ''}${m.state === 'pending' ? ', sent, waiting for the engine' : ''}${m.state === 'held-scratch' ? ', scratching' : m.state === 'held-nudge' ? ', nudging' : ''}`;

    const status = h('div', { class: 'jog__status' }, [
      h('span', { class: 'jog__deck numeral', text: m.deck }),
      h('span', { class: 'jog__mode label label-strong', text: disabled ? 'No track' : m.zones ? 'Vinyl · zones' : m.scratchOn ? 'Scratch mode' : 'Nudge mode' }),
      m.playing && !disabled ? h('span', { class: 'jog__play label', text: 'Playing' }) : null,
      slipping ? h('span', { class: 'jog__flag tone-info label' }, [icon('slip', { size: 12 }), h('span', { text: `Slip · ${Math.round(m.slip * 100)} %` })]) : null,
    ]);

    const platter = h('div', {
      class: 'jog__platter', role: 'slider', tabindex: disabled ? -1 : 0, 'aria-label': name,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(m.position * 100), 'aria-valuetext': valuetext,
      'aria-disabled': disabled ? 'true' : undefined, dataset: { hit: '48' },
      on: {
        keydown: (e) => this.onKey(e, m),
        pointerdown: (e) => this.onDown(e, m),
        pointermove: (e) => this.onMove(e, m),
        pointerup: (e) => this.onUp(e, m),
        pointercancel: (e) => this.onCancel(e, m),
        lostpointercapture: (e) => this.onCancel(e, m),
      },
    });
    platter.appendChild(this.buildSvg(m, slipping));
    if (m.zones) {
      platter.appendChild(h('span', { class: 'jog__zone-cap jog__zone-cap--scratch ink-backing label', text: 'Scratch', 'aria-hidden': 'true' }));
      platter.appendChild(h('span', { class: 'jog__zone-cap jog__zone-cap--nudge ink-backing label', text: 'Nudge', 'aria-hidden': 'true' }));
    }
    const badgeText = { 'held-scratch': 'HELD · SCRATCH', 'held-nudge': 'HELD · NUDGE', pending: 'SENT' }[m.state] || '';
    platter.appendChild(h('span', { class: `jog__badge jog__badge--${m.state}`, hidden: badgeText ? null : true, text: badgeText, 'aria-hidden': 'true' }));

    const alt = (key, label, ic, extra = {}) => h('button', {
      type: 'button', class: `btn btn--secondary jog__alt jog__alt--${key}`, dataset: { hit: '48', alt: key }, disabled: disabled ? true : null, ...extra,
    }, [icon(ic, { size: 18 }), h('span', { class: 'btn-label', text: label })]);
    const alts = h('div', { class: 'jog__alts', role: 'group', 'aria-label': `Jog alternatives, deck ${m.deck}` }, [
      alt('nudge-minus', 'Nudge −', 'chevron-left', { 'aria-label': `Nudge back, deck ${m.deck}`, on: { click: () => this.emit('mdj:jog', { deck: m.deck, zone: 'nudge', delta: -1, phase: 'tap', source: 'button' }) } }),
      alt('scratch', 'Scratch', 'scratch', { 'aria-pressed': String(m.scratchOn), 'aria-label': `Scratch ${m.explicit ? 'mode' : 'enabled'}, deck ${m.deck}`, on: { click: () => this.emit('mdj:jog-mode', { deck: m.deck, scratch: !m.scratchOn, mode: m.scratchOn ? (m.explicit ? 'explicit-nudge' : 'nudge') : (m.explicit ? 'explicit-scratch' : 'vinyl') }) } }),
      alt('nudge-plus', 'Nudge +', 'chevron-right', { 'aria-label': `Nudge forward, deck ${m.deck}`, on: { click: () => this.emit('mdj:jog', { deck: m.deck, zone: 'nudge', delta: 1, phase: 'tap', source: 'button' }) } }),
    ]);
    this.replaceChildren(status, platter, alts);
    if (focusKey) this.querySelector(focusKey)?.focus({ preventScroll: true });
  }

  buildSvg(m, slipping) {
    const u = this._uid;
    const svg = s('svg', { class: 'jog__svg', viewBox: '0 0 240 240', 'aria-hidden': 'true', focusable: 'false' });
    const defs = s('defs');
    const brass = s('linearGradient', { id: `jog-brass-${u}`, x1: '0', y1: '0', x2: '1', y2: '1' });
    for (const [o, c] of [['0', 'var(--brass-hi)'], ['0.5', 'var(--brass)'], ['1', 'var(--brass-lo)']]) brass.appendChild(s('stop', { offset: o, style: { stopColor: c } }));
    const rim = s('linearGradient', { id: `jog-rim-${u}`, x1: '0', y1: '0', x2: '1', y2: '1' });
    for (const [o, c] of [['0', 'var(--titanium-hi)'], ['0.45', 'var(--titanium)'], ['0.6', 'var(--titanium-hi)'], ['1', 'var(--titanium-lo)']]) rim.appendChild(s('stop', { offset: o, style: { stopColor: c } }));
    const face = s('radialGradient', { id: `jog-face-${u}`, cx: '0.38', cy: '0.32', r: '0.75' });
    for (const [o, c] of [['0', 'var(--titanium-hi)'], ['0.55', 'var(--titanium)'], ['1', 'var(--titanium-lo)']]) face.appendChild(s('stop', { offset: o, style: { stopColor: c } }));
    defs.append(brass, rim, face);
    svg.appendChild(defs);
    // Deck-colour glow ring: only when the engine says playing.
    svg.appendChild(s('circle', { class: 'jog__glow jog__glow--soft', cx: C, cy: C, r: 115, fill: 'none' }));
    svg.appendChild(s('circle', { class: 'jog__glow', cx: C, cy: C, r: 113, fill: 'none' }));
    // Brass rim.
    svg.appendChild(s('circle', { class: 'jog__rim', cx: C, cy: C, r: 109, fill: 'none', stroke: `url(#jog-brass-${u})` }));
    // Nudge band (brushed titanium) with radial calibration lines.
    svg.appendChild(s('circle', { class: 'jog__band', cx: C, cy: C, r: 95.5, fill: 'none', stroke: `url(#jog-rim-${u})`, 'stroke-width': 23 }));
    const cal = s('g', { class: 'jog__cal' });
    for (let i = 0; i < 60; i++) {
      const a = i * 6, major = i % 5 === 0;
      const [x1, y1] = polar(major ? 88 : 92, a), [x2, y2] = polar(104, a);
      cal.appendChild(s('line', { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), class: major ? 'jog__cal-line jog__cal-line--major' : 'jog__cal-line' }));
    }
    svg.appendChild(cal);
    // Seam, then the centre (scratch) disc with concentric calibration circles.
    svg.appendChild(s('circle', { class: 'jog__seam', cx: C, cy: C, r: 84, fill: 'none' }));
    svg.appendChild(s('circle', { class: 'jog__disc', cx: C, cy: C, r: 82, fill: `url(#jog-face-${u})` }));
    for (const r of [74, 66, 58, 50, 42, 34, 26]) svg.appendChild(s('circle', { class: `jog__groove ${r % 16 === 10 ? 'jog__groove--major' : ''}`.trim(), cx: C, cy: C, r, fill: 'none' }));
    svg.appendChild(s('circle', { class: 'jog__disc-edge', cx: C, cy: C, r: 81, fill: 'none' }));
    // Position index (fixture angle) and slip continuation marker.
    const angle = m.position * 360;
    svg.appendChild(s('line', { class: 'jog__index', x1: C, y1: C - 78, x2: C, y2: C - 40, transform: `rotate(${angle.toFixed(2)} ${C} ${C})` }));
    svg.appendChild(s('circle', { class: 'jog__index-dot', cx: C, cy: C - 96, r: 3.5, transform: `rotate(${angle.toFixed(2)} ${C} ${C})` }));
    if (slipping) {
      const sa = m.slip * 360;
      svg.appendChild(s('path', { class: 'jog__slip-arc', d: arc(96, angle, sa), fill: 'none' }));
      svg.appendChild(s('circle', { class: 'jog__slip-marker', cx: C, cy: C - 96, r: 6, transform: `rotate(${sa.toFixed(2)} ${C} ${C})` }));
    }
    // Zone outlines for held states and the dashed pending ring.
    svg.appendChild(s('circle', { class: 'jog__hold jog__hold--scratch', cx: C, cy: C, r: 82, fill: 'none' }));
    svg.appendChild(s('circle', { class: 'jog__hold jog__hold--nudge', cx: C, cy: C, r: 95.5, fill: 'none' }));
    svg.appendChild(s('circle', { class: 'jog__pending', cx: C, cy: C, r: 104, fill: 'none' }));
    // Centre spindle.
    svg.appendChild(s('circle', { class: 'jog__spindle', cx: C, cy: C, r: 11, fill: `url(#jog-brass-${u})` }));
    svg.appendChild(s('circle', { class: 'jog__spindle-dot', cx: C, cy: C, r: 3 }));
    return svg;
  }

  zoneAt(e, m) {
    if (m.explicit || !m.zones) return m.scratchOn ? 'scratch' : 'nudge';
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    return Math.hypot(dx, dy) / (r.width / 2) > 0.7 ? 'nudge' : 'scratch';
  }
  angleAt(e) {
    const r = e.currentTarget.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  }
  setTransient(state, badge) {
    this.dataset.state = state;
    const b = this.querySelector('.jog__badge');
    if (b) { b.textContent = badge; b.hidden = !badge; b.className = `jog__badge jog__badge--${state}`; }
    this.querySelector('.jog__platter')?.setAttribute('aria-valuetext', state === 'held-scratch' ? 'scratching, held' : state === 'held-nudge' ? 'nudging, held' : '');
  }
  onDown(e, m) {
    if (m.state === 'disabled' || this._drag) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const zone = this.zoneAt(e, m);
    this._drag = { id: e.pointerId, zone, a: this.angleAt(e) };
    this.setTransient(zone === 'scratch' ? 'held-scratch' : 'held-nudge', zone === 'scratch' ? 'HELD · SCRATCH' : 'HELD · NUDGE');
    this.emit('mdj:jog', { deck: m.deck, zone, phase: 'start' });
  }
  onMove(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    const a = this.angleAt(e);
    let delta = a - d.a; if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
    d.a = a;
    if (Math.abs(delta) > 0.1) this.emit('mdj:jog', { deck: m.deck, zone: d.zone, deltaDeg: delta, phase: 'move' });
  }
  onUp(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    this._drag = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    this.syncState(); this.render();
    this.emit('mdj:jog', { deck: m.deck, zone: d.zone, phase: 'end' });
  }
  onCancel(e, m) {
    const d = this._drag; if (!d) return;
    this._drag = null;
    this.syncState(); this.render(); // a held scratch is released safely; the deck follows its release contract
    this.emit('mdj:jog', { deck: m.deck, zone: d.zone, phase: 'cancel' });
  }
  onKey(e, m) {
    if (m.state === 'disabled') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this.emit('mdj:jog', { deck: m.deck, zone: 'nudge', delta: -1, phase: 'tap', source: 'keyboard' }); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this.emit('mdj:jog', { deck: m.deck, zone: 'nudge', delta: 1, phase: 'tap', source: 'keyboard' }); }
    else if (e.key === ' ') { e.preventDefault(); this.emit('mdj:jog-mode', { deck: m.deck, scratch: !m.scratchOn, mode: m.scratchOn ? (m.explicit ? 'explicit-nudge' : 'nudge') : (m.explicit ? 'explicit-scratch' : 'vinyl') }); }
  }
}
define(MdjJog);
