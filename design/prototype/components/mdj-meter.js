// <mdj-meter l="0.6" r="0.58" peak="0.71" clip clip-latched gr="-4.2" kind="master|channel|cue" deck="A"
//            orientation="horizontal|vertical" scale="compact|full" label="Master"
//            state="idle|active|clipping|muted|unavailable">
//
// Engine binding: READ-ONLY. Shows the fixture level the scenario supplies; real meters read the engine
// snapshot's post-limiter master tap, the per-channel post-fader tap or the cue bus tap (Document 06,
// AE-04; FR-021). Ballistics, peak-hold time and the exact tap are DSP contract decisions, so this
// component documents units only. It sends no command: clearing a latched clip is the Master panel's
// explicit "Reset clip" action (screen), not a tap on the meter. ALWAYS renders a FIXTURE mark.
// Units / range: l, r, peak are 0..1 of full scale (linear), printed as dBFS with marks at the
// −12 / −6 / −3 / 0 dBFS equivalents (0.25 / 0.5 / 0.71 / 1.0); gr is limiter gain reduction in dB.
// `clip` = clipping now (state → clipping, CLIP chip); `clip-latched` = a clip happened since the last reset:
// the latch block at the top of each bar stays filled and the LATCHED chip is printed (never colour alone).
// Vertical full meters are 72 px wide by default (a screen may set a width); the FIXTURE mark takes a 12 px
// strip above the latch blocks so it never covers a value.
// Variants: scale=compact (the persistent dock, unchanged: 8 px bars, no scale text) · scale=full (mixer /
// master: dB labels at −12 / −6 / −3 / 0, peak-hold line with its dB value, clip latch blocks) ·
// kind=cue (the headphone / PFL bus: headphones icon in the label; state=unavailable prints "No cue
// route" when the route has no isolated cue, FR-022 — never implies isolation without route evidence).
// Public attributes and class names from the foundation version are unchanged (app/shell.js uses l, r,
// peak, clip, gr, label, scale, orientation, state); its base styles stay in app/app.css, the full-scale
// and cue additions are in components/families/waveform.css.
// Accessible: role=meter "Master" with aria-valuetext "left −6 dB, right −6 dB, peak −3 dB, clipping,
// clip latched, limiter −4.2 dB".
import { MdjElement, define, h, icon } from './base.js';

const MARKS = [[0.25, '−12'], [0.5, '−6'], [0.71, '−3'], [1, '0']];
const KINDS = ['master', 'channel', 'cue'];

export class MdjMeter extends MdjElement {
  static tag = 'mdj-meter';
  static states = ['idle', 'active', 'clipping', 'muted', 'unavailable'];
  static fr = ['FR-021', 'FR-022'];
  static hit = 0;
  static fixture = true;
  static observed = ['l', 'r', 'peak', 'clip', 'clip-latched', 'orientation', 'scale', 'label', 'gr', 'kind', 'deck'];
  static samples = {
    default: { l: 0.6, r: 0.57, peak: 0.71, label: 'Master', scale: 'full', style: 'width:220px' },
    variants: [
      { orientation: 'horizontal' },
      { orientation: 'vertical', style: 'height:224px' },
      { orientation: 'vertical', kind: 'channel', deck: 'B', label: 'Ch B', style: 'height:224px' },
      { orientation: 'vertical', kind: 'cue', label: 'Cue', style: 'height:224px' },
      { scale: 'compact', orientation: 'horizontal', style: 'width:150px' },
    ],
    idle: { l: 0, r: 0, peak: null },
    clipping: { l: 1, r: 1, peak: 1, clip: true, 'clip-latched': true, gr: -4.2 },
    muted: { l: 0, r: 0 },
    unavailable: { l: 0, r: 0, peak: null, kind: 'cue', label: 'Cue' },
  };

  render() {
    const l = clamp(this.num('l', 0)), r = clamp(this.num('r', 0));
    const peak = this.hasAttribute('peak') && this.getAttribute('peak') !== 'null' ? clamp(this.num('peak', 0)) : null;
    const clip = this.bool('clip');
    const latched = this.bool('clip-latched') || clip;
    const orientation = this.attr('orientation', 'horizontal') === 'vertical' ? 'vertical' : 'horizontal';
    const scale = this.attr('scale', 'compact') === 'full' ? 'full' : 'compact';
    const kindAttr = this.attr('kind', 'master');
    const kind = KINDS.includes(kindAttr) ? kindAttr : 'master';
    const deck = this.attr('deck', '').toUpperCase();
    const label = this.attr('label', kind === 'cue' ? 'Cue' : kind === 'channel' && deck ? `Ch ${deck}` : 'Master');
    const gr = this.hasAttribute('gr') && this.getAttribute('gr') !== 'null' ? this.num('gr', 0) : null;
    const state = clip ? 'clipping' : this.state;
    const unavailable = state === 'unavailable';
    this.className = `meter meter--${orientation} meter--${scale} meter--${state} meter--kind-${kind}${latched ? ' meter--latched' : ''}${deck ? ` deck-${deck.toLowerCase()}` : ''}`;
    const db = (x) => (x <= 0 ? '−∞' : `${x >= 1 ? '' : '−'}${Math.abs(20 * Math.log10(x)).toFixed(x >= 0.5 ? 1 : 0)}`);
    const valuetext = unavailable
      ? `${label} unavailable: no isolated cue route`
      : `${label} left ${db(l)} dB, right ${db(r)} dB${peak != null ? `, peak ${db(peak)} dB` : ''}${clip ? ', clipping' : ''}${latched ? ', clip latched' : ''}${gr != null ? `, limiter ${gr.toFixed(1)} dB` : ''}${state === 'muted' ? ', muted' : ''}`;
    const wrap = h('div', { class: 'meter__wrap', role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(Math.max(l, r) * 100), 'aria-valuetext': valuetext });
    if (scale === 'full') {
      const sc = h('div', { class: 'meter__scale numeral', 'aria-hidden': 'true' });
      const track = h('div', { class: 'meter__scale-track' });
      for (const [pos, text] of MARKS) track.appendChild(h('span', { class: `meter__scale-mark${pos >= 1 ? ' meter__scale-mark--zero' : ''}`, style: { [orientation === 'horizontal' ? 'left' : 'bottom']: `${pos * 100}%` }, text }));
      sc.appendChild(track);
      wrap.appendChild(sc);
    }
    for (const [ch, val] of [['L', l], ['R', r]]) {
      const bar = h('div', { class: 'meter__bar sunken', 'aria-hidden': 'true' });
      // Full-width gradient clipped to the level, so colour maps to position rather than scaling with the fill.
      bar.appendChild(h('span', { class: 'meter__fill', style: { clipPath: orientation === 'horizontal' ? `inset(0 ${(1 - val) * 100}% 0 0)` : `inset(${(1 - val) * 100}% 0 0 0)` } }));
      if (peak != null) bar.appendChild(h('span', { class: 'meter__peak', style: { [orientation === 'horizontal' ? 'left' : 'bottom']: `${peak * 100}%` } }));
      if (scale === 'full') for (const [pos, text] of MARKS) bar.appendChild(h('span', { class: 'meter__mark', style: { [orientation === 'horizontal' ? 'left' : 'bottom']: `${pos * 100}%` }, dataset: { text } }));
      const channel = h('div', { class: `meter__channel${scale === 'full' ? ' meter__channel--full' : ''}` }, [
        h('span', { class: 'meter__ch label', text: ch }),
        bar,
        scale === 'full' ? h('span', { class: `meter__latch${latched ? ' meter__latch--on' : ''}`, 'aria-hidden': 'true' }) : null,
      ]);
      wrap.appendChild(channel);
    }
    // Flags are words, never colour alone: CLIP = clipping now · LATCHED = a clip since the last reset
    // (cleared by the Master panel's explicit Reset clip) · LIM = limiter gain reduction · MUTED · No cue route.
    const flags = h('div', { class: 'meter__flags' }, [
      clip ? h('span', { class: 'meter__clip tone-critical label', text: 'CLIP' }) : null,
      latched ? h('span', { class: `meter__latched${clip ? '' : ' meter__clip--latched'} tone-critical label`, text: 'LATCHED' }) : null,
      gr != null ? h('span', { class: 'meter__gr tone-warning label', text: `LIM ${gr.toFixed(1)} dB` }) : null,
      state === 'muted' ? h('span', { class: 'meter__muted tone-neutral label', text: 'MUTED' }) : null,
      unavailable ? h('span', { class: 'meter__unavailable tone-warning label', text: 'No cue route' }) : null,
      scale === 'full' && peak != null && !unavailable ? h('span', { class: 'meter__peakval numeral', text: orientation === 'vertical' ? `peak ${db(peak)}` : `peak ${db(peak)} dB` }) : null,
    ]);
    const labelEl = h('span', { class: 'meter__label label' }, [kind === 'cue' ? icon('headphones', { size: 12 }) : null, h('span', { text: label })]);
    this.replaceChildren(labelEl, wrap, flags);
  }
}
function clamp(x) { return Math.min(1, Math.max(0, x)); }
define(MdjMeter);
