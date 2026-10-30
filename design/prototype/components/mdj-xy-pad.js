// <mdj-xy-pad effect="Filter" deck="A" x="0.42" y="0.40" x-label="Cutoff" y-label="Resonance"
//             x-unit="Hz" y-unit="%" x-min="20" x-max="20000" y-min="0" y-max="100" wet="0.6"
//             mode="momentary|latch" release-ms="240" reason="Deck A is empty"
//             state="idle|held|latched|bypassed|disabled">
//
// Engine binding: touch-move issues EngineCommand(fx.xy, { slot, x, y }) at UI rate carrying the
// FX slot revision; Engage / Bypass issues fx.bypass; Momentary / Latch is a slot setting
// (fx.holdMode). The marker draws the ACKNOWLEDGED x / y from the snapshot. On momentary release
// the UI does not animate the marker home: the engine applies the preset release envelope
// (release-ms, here 240 ms) and the marker follows the acknowledged values.
// Units / range: x, y and wet are 0..1 positions. The axis readouts map them to the preset's
// labelled range (x-min..x-max in x-unit, y-min..y-max in y-unit; Hz prints as kHz above 1000).
// Wet / dry 0..100 % wet. Nothing here is measured audio, so there is no FIXTURE mark.
// Starting-point policy: a touch PICKS UP FROM THE CURRENT acknowledged values (relative pickup,
// no jump to the touch point), the same rule as faders. Jump-to-touch is an advanced preference,
// off by default. The policy is printed under the surface so it is never implicit.
// Gesture: press-and-drag anywhere on the surface. Momentary: engaged while held, released per the
// envelope. Latch: a tap engages and the pad stays clearly active ("LATCHED" chip, deck ring on the
// surface, filled marker) until Bypass or a second tap.
// Pending vs acknowledged: XY moves are continuous and never quantized, so there is no pending
// state; `held` shows the finger is down, the marker shows the acknowledged position, `latched` is
// an acknowledged slot state. Bypassed keeps the last values visible but dimmed.
// Cancellation: pointer-cancel, app background, route loss and rotation release a momentary hold
// exactly like pointer-up (safe release through the envelope); a latched effect stays latched until
// an explicit Bypass.
// Accessible alternative: three role=slider rails beneath the surface (X, Y, Wet / dry) with arrow
// keys (±2 %), Home / End, plus Engage / Bypass and Momentary / Latch as real buttons. Names carry
// effect, axis and deck ("Cutoff, X axis, Filter on deck A, 8.4 kHz").
// Hit: the surface and each rail are ≥ 48 dp; all buttons are 48 dp.
import { MdjElement, define, h, s } from './base.js';
import { icon } from './base.js';

export class MdjXyPad extends MdjElement {
  static tag = 'mdj-xy-pad';
  static states = ['idle', 'held', 'latched', 'bypassed', 'disabled'];
  static fr = ['FR-024', 'FR-025'];
  static hit = 0; // layout container: the surface, rails and buttons carry data-hit="48"
  static fixture = false;
  static observed = ['effect', 'deck', 'x', 'y', 'x-label', 'y-label', 'x-unit', 'y-unit', 'x-min', 'x-max', 'y-min', 'y-max', 'wet', 'mode', 'release-ms', 'reason'];
  static samples = {
    default: { effect: 'Filter', deck: 'A', x: 0.42, y: 0.40, 'x-label': 'Cutoff', 'y-label': 'Resonance', 'x-unit': 'Hz', 'y-unit': '%', 'x-min': 20, 'x-max': 20000, 'y-min': 0, 'y-max': 100, wet: 0.6, mode: 'momentary', style: 'width:min(100%, 380px)' },
    variants: [
      {},
      { effect: 'Echo', deck: 'B', x: 0.3, y: 0.55, 'x-label': 'Time', 'x-unit': 'ms', 'x-min': 20, 'x-max': 1200, 'y-label': 'Feedback', 'y-unit': '%', mode: 'latch', wet: 0.35 },
    ],
    latched: { mode: 'latch' },
    disabled: { reason: 'Deck is empty' },
  };

  render() {
    const effect = this.attr('effect', 'Filter');
    const deck = (this.attr('deck', '') || '').toUpperCase();
    const x = clamp01(this.num('x', 0.5)), y = clamp01(this.num('y', 0.5)), wet = clamp01(this.num('wet', 0.5));
    const xl = this.attr('x-label', 'X'), yl = this.attr('y-label', 'Y');
    const xu = this.attr('x-unit', '%'), yu = this.attr('y-unit', '%');
    const xmin = this.num('x-min', 0), xmax = this.num('x-max', 100), ymin = this.num('y-min', 0), ymax = this.num('y-max', 100);
    const mode = this.attr('mode', 'momentary') === 'latch' ? 'latch' : 'momentary';
    const state = this.state;
    const releaseMs = Math.max(0, Math.round(this.num('release-ms', 240)));
    const reason = this.attr('reason', 'Unavailable');
    const inert = state === 'disabled';
    const engaged = state === 'held' || state === 'latched';
    this.className = `xy-pad xy-pad--${mode} ${deck ? `deck-${deck.toLowerCase()}` : 'deck-none'}`;
    this.style.setProperty('--xy-x', `${(x * 100).toFixed(2)}%`);
    this.style.setProperty('--xy-y', `${(y * 100).toFixed(2)}%`);

    const xText = fmtVal(xmin + x * (xmax - xmin), xu);
    const yText = fmtVal(ymin + y * (ymax - ymin), yu);
    const wetText = `${Math.round(wet * 100)} %`;
    const where = `${effect}${deck ? ` on deck ${deck}` : ''}`;

    // ---- header ----
    const modes = h('div', { class: 'xy-pad__modes', role: 'radiogroup', 'aria-label': `${where} hold mode` });
    for (const [id, text, ic] of [['momentary', 'Momentary', 'momentary'], ['latch', 'Latch', 'latch']]) {
      modes.appendChild(h('button', {
        type: 'button', role: 'radio', class: 'xy-pad__modebtn', 'aria-checked': String(id === mode), 'aria-label': `${text} mode, ${where}`,
        'aria-disabled': inert ? 'true' : undefined, dataset: { hit: '48' }, on: { click: () => { if (!inert) this.emit('mdj:xy-mode', { effect, deck, mode: id }); } },
      }, [icon(ic, { size: 16 }), h('span', { text })]));
    }
    const bypassed = state === 'bypassed';
    const engage = h('button', {
      type: 'button', class: `btn ${bypassed ? 'btn--primary' : 'btn--secondary'} xy-pad__engage`, 'aria-pressed': String(!bypassed && !inert),
      'aria-label': `${bypassed ? 'Engage' : 'Bypass'} ${where}`, 'aria-disabled': inert ? 'true' : undefined, dataset: { hit: '48' },
      on: { click: () => { if (!inert) this.emit('mdj:xy-engage', { effect, deck, engage: bypassed }); } },
    }, [icon(bypassed ? 'fx' : 'x', { size: 18 }), h('span', { class: 'btn-label', text: bypassed ? 'Engage' : 'Bypass' })]);
    const head = h('div', { class: 'xy-pad__head' }, [
      h('div', { class: 'xy-pad__title' }, [
        h('span', { class: 'label', text: `FX${deck ? ` · deck ${deck}` : ''} · XY pad` }),
        h('span', { class: 'title xy-pad__effect truncate', text: effect }),
      ]),
      modes, engage,
    ]);

    // ---- surface ----
    const surface = h('div', {
      class: 'xy-pad__surface', role: 'group', tabindex: '-1', dataset: { hit: '48' },
      'aria-label': `${where} XY surface: X ${xl} ${xText}, Y ${yl} ${yText}, ${wetText} wet, ${statusWord(state, mode)}. Use the sliders below for keyboard control.`,
    });
    surface.appendChild(calibration());
    surface.appendChild(h('span', { class: 'xy-pad__guide xy-pad__guide--x', 'aria-hidden': 'true' }));
    surface.appendChild(h('span', { class: 'xy-pad__guide xy-pad__guide--y', 'aria-hidden': 'true' }));
    surface.appendChild(h('span', { class: 'xy-pad__marker brass-rim', 'aria-hidden': 'true' }, [
      h('span', { class: 'xy-pad__marker-face titanium-radial' }, [h('span', { class: 'xy-pad__marker-dot' })]),
    ]));
    const statusChip = h('span', { class: `xy-pad__status xy-pad__status--${state}`, 'aria-hidden': 'true' }, [
      icon(state === 'held' ? 'hand' : state === 'latched' ? 'latch' : state === 'bypassed' ? 'x' : state === 'disabled' ? 'unavailable' : mode === 'latch' ? 'latch' : 'momentary', { size: 12 }),
      h('span', { text: statusWord(state, mode, reason) }),
    ]);
    surface.appendChild(statusChip);
    if (engaged) surface.appendChild(h('span', { class: 'xy-pad__wetchip numeral', 'aria-hidden': 'true', text: `WET ${wetText}` }));
    const body = h('div', { class: 'xy-pad__body' }, [
      h('div', { class: 'xy-pad__yaxis', 'aria-hidden': 'true' }, [
        h('span', { class: 'xy-pad__axis-max numeral', text: fmtVal(ymax, yu) }),
        h('span', { class: 'xy-pad__axis-name' }, [h('span', { class: 'label', text: yl }), h('span', { class: 'numeral xy-pad__axis-val', text: yText })]),
        h('span', { class: 'xy-pad__axis-min numeral', text: fmtVal(ymin, yu) }),
      ]),
      surface,
    ]);
    const xaxis = h('div', { class: 'xy-pad__xaxis', 'aria-hidden': 'true' }, [
      h('span', { class: 'xy-pad__axis-min numeral', text: fmtVal(xmin, xu) }),
      h('span', { class: 'xy-pad__axis-name' }, [h('span', { class: 'label', text: xl }), h('span', { class: 'numeral xy-pad__axis-val', text: xText })]),
      h('span', { class: 'xy-pad__axis-max numeral', text: fmtVal(xmax, xu) }),
    ]);
    const policy = h('p', { class: 'xy-pad__policy' }, [
      h('span', { text: `Touch picks up from the current values (no jump). ` }),
      h('span', { text: mode === 'momentary' ? `Momentary release returns in ${releaseMs} ms (preset envelope).` : 'Latch stays active until Bypass.' }),
    ]);

    // ---- independent sliders (accessible alternative) ----
    const sliders = h('div', { class: 'xy-pad__sliders', role: 'group', 'aria-label': `${where} sliders` }, [
      this.slider({ axis: 'X', label: xl, value: x, text: xText, where, inert, param: 'x' }),
      this.slider({ axis: 'Y', label: yl, value: y, text: yText, where, inert, param: 'y' }),
      this.slider({ axis: 'Wet', label: 'Wet / dry', value: wet, text: `${wetText} wet`, where, inert, param: 'wet' }),
    ]);
    this.replaceChildren(head, body, xaxis, policy, sliders);
  }

  slider({ axis, label, value, text, where, inert, param }) {
    const pct = Math.round(value * 100);
    const rail = h('div', {
      class: 'xy-pad__rail', role: 'slider', tabindex: inert ? '-1' : '0', dataset: { hit: '48' },
      'aria-label': `${label}, ${axis === 'Wet' ? 'wet / dry' : `${axis} axis`}, ${where}`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-valuetext': text,
      'aria-disabled': inert ? 'true' : undefined,
      on: { keydown: (e) => { if (inert) return; const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 2 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -2 : e.key === 'Home' ? -100 : e.key === 'End' ? 100 : 0; if (d) { e.preventDefault(); this.emit('mdj:xy-step', { param, delta: d }); } } },
    });
    rail.appendChild(h('span', { class: 'xy-pad__rail-guide', 'aria-hidden': 'true' }));
    rail.appendChild(h('span', { class: 'xy-pad__rail-fill', style: { width: `calc(10px + (100% - 20px) * ${value.toFixed(3)})` }, 'aria-hidden': 'true' }));
    rail.appendChild(h('span', { class: 'xy-pad__thumb brass-rim', style: { left: `calc(10px + (100% - 20px) * ${value.toFixed(3)})` }, 'aria-hidden': 'true' }, [h('span', { class: 'xy-pad__thumb-face titanium' }, [h('span', { class: 'xy-pad__grip' })])]));
    return h('div', { class: 'xy-pad__slider' }, [
      h('span', { class: 'xy-pad__slider-name label', 'aria-hidden': 'true', text: `${axis} · ${label}` }),
      rail,
      h('span', { class: 'xy-pad__slider-val numeral', 'aria-hidden': 'true', text }),
    ]);
  }
}

function statusWord(state, mode, reason = '') {
  switch (state) {
    case 'held': return `Held · ${mode}`;
    case 'latched': return 'Latched';
    case 'bypassed': return 'Bypass';
    case 'disabled': return `Unavailable · ${reason || 'off'}`;
    default: return `${mode} · ready`;
  }
}

function calibration() {
  const svg = s('svg', { class: 'xy-pad__grid', viewBox: '0 0 100 60', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  for (const p of [25, 50, 75]) {
    svg.appendChild(s('line', { x1: p, y1: 0, x2: p, y2: 60, class: `xy-pad__cal ${p === 50 ? 'xy-pad__cal--centre' : ''}` }));
    svg.appendChild(s('line', { x1: 0, y1: p * 0.6, x2: 100, y2: p * 0.6, class: `xy-pad__cal ${p === 50 ? 'xy-pad__cal--centre' : ''}` }));
  }
  for (let i = 1; i < 10; i++) {
    svg.appendChild(s('line', { x1: i * 10, y1: 58, x2: i * 10, y2: 60, class: 'xy-pad__tick' }));
    svg.appendChild(s('line', { x1: 0, y1: i * 6, x2: 2, y2: i * 6, class: 'xy-pad__tick' }));
  }
  return svg;
}

export function fmtVal(v, unit) {
  if (unit === '%') return `${Math.round(v)} %`;
  if (unit === 'Hz') return v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`;
  if (unit === 'ms') return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
  if (unit === 'st') return `${v > 0 ? '+' : ''}${v.toFixed(0)} st`;
  if (unit === 'dB') return `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}${unit ? ` ${unit}` : ''}`;
}
function clamp01(v) { return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)); }

define(MdjXyPad);
