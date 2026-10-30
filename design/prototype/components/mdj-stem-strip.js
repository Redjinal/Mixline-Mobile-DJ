// <mdj-stem-strip deck="A" track="AURORA DRIVE" progress="0.42" reason="…" model="v2"
//                 stems='[{"id":"vocals","mute":false,"solo":false,"gain":0}, …]'
//                 state="unavailable|preparing|ready|failed|restricted|live-denied">
//
// Engine binding: Mute / Solo issue EngineCommand(stem.mute | stem.solo, { deck, generation,
// stem }) and the gain rail issues stem.gain in dB; the strip draws the ACKNOWLEDGED values from
// the snapshot. Readiness comes from the stem-set record (AE-06: unavailable, preparing, ready,
// failed) plus the two refusals FR-029 requires: restricted by source permission and live
// separation refused by device capacity. Full-mix fallback: while stems are not ready the original
// mix plays unchanged and every stem control is inert (aria-disabled, still visible, still named),
// and the strip says so.
// Units / range: gain −24 … +6 dB with a 0 dB index mark on the rail (0 dB default); progress is
// 0..1 from real work units or "unknown" when the job cannot report. Here readiness, progress and
// the gain values are fixtures: the readiness line and the progress bar carry FIXTURE marks
// (static fixture = true, rendered inline next to the data).
// Gesture: taps for Mute / Solo; the rail is a 48 dp horizontal fader with pickup on the thumb
// (no jump from an incidental tap; jump-to-touch is an advanced preference, off).
// Pending vs acknowledged: Mute / Solo are immediate engine commands and the pressed look is the
// acknowledged state; preparation progress is never animated to look finished, and "ready" is
// printed only when the stem set has passed its integrity check.
// Cancellation: Cancel (preparing) stops the job and keeps the full mix; Retry (failed) re-runs
// the preparation; pointer-cancel on a rail leaves the last acknowledged gain.
// Accessible: Mute / Solo are aria-pressed buttons named with stem and deck ("Mute vocals, deck
// A"); each rail is role=slider with aria-valuetext in dB and arrow keys (±0.5 dB); the readiness
// line is role=status.
import { MdjElement, define, h, icon } from './base.js';

const STEMS = [
  { id: 'vocals', name: 'Vocals', icon: 'stem-vocals', letter: 'V' },
  { id: 'drums', name: 'Drums', icon: 'stem-drums', letter: 'D' },
  { id: 'bass', name: 'Bass', icon: 'stem-bass', letter: 'B' },
  { id: 'other', name: 'Other', icon: 'stem-other', letter: 'O' },
];
const GAIN_MIN = -24, GAIN_MAX = 6;

export class MdjStemStrip extends MdjElement {
  static tag = 'mdj-stem-strip';
  static states = ['unavailable', 'preparing', 'ready', 'failed', 'restricted', 'live-denied'];
  static fr = ['FR-028', 'FR-029', 'FR-036'];
  static hit = 0; // layout container: the mute / solo buttons and gain rails carry data-hit="48"
  static fixture = true; // readiness, progress and gain values are fixtures; marks are rendered inline
  static observed = ['deck', 'track', 'progress', 'reason', 'model', 'stems'];
  static samples = {
    default: { deck: 'A', track: 'AURORA DRIVE', model: 'v2', style: 'width:min(100%, 380px)' },
    variants: [{}],
    ready: { stems: '[{"id":"vocals","gain":-3},{"id":"drums","solo":true,"gain":0},{"id":"bass","gain":0},{"id":"other","mute":true,"gain":-6}]' },
    preparing: { progress: 0.42 },
    failed: { reason: 'integrity check mismatch' },
    restricted: { track: 'SODA LIGHTS (Radio Edit)', reason: 'this source does not permit separation' },
    'live-denied': { deck: 'B', track: 'COPPER SKY', reason: 'thermal headroom too low' },
    unavailable: { track: 'EVERYTHING WE SAID ON THE WAY BACK FROM THE HARBOUR (Rooftop Dub Reprise, 2026 Remaster)' },
  };

  ensureFixtureMark() { /* marks are rendered inline next to the readiness line and progress bar */ }

  render() {
    const deck = (this.attr('deck', 'A') || 'A').toUpperCase();
    const track = this.attr('track', '');
    const state = this.state;
    const model = this.attr('model', 'v2');
    const reason = this.attr('reason', '');
    const progress = this.hasAttribute('progress') ? Math.min(1, Math.max(0, this.num('progress', 0))) : null;
    const stems = readStems(this.attr('stems', ''));
    const ready = state === 'ready';
    this.className = `stems stems--${state} ${ready ? '' : 'stems--inert'} deck-${deck.toLowerCase()}`.replace(/\s+/g, ' ').trim();

    // ---- readiness line ----
    const line = readiness(state, { progress, reason, model, track });
    const readyEl = h('div', { class: `stems__ready ${line.tone}`, role: 'status', 'aria-label': `Stems, deck ${deck}: ${line.text}` }, [
      icon(line.icon, { size: 14 }), h('span', { class: 'stems__ready-text', 'aria-hidden': 'true', text: line.text }),
      h('mdj-fixture-mark', { inline: '', for: 'stem readiness' }),
    ]);
    const head = h('div', { class: 'stems__head' }, [
      h('span', { class: 'stems__deck numeral', 'aria-hidden': 'true', text: deck }),
      h('div', { class: 'stems__title' }, [h('span', { class: 'label', text: `Stems · deck ${deck}` }), h('span', { class: 'title stems__track truncate', text: track || '—' })]),
    ]);
    const bits = [head, readyEl];
    if (state === 'preparing') {
      bits.push(h('div', { class: 'stems__progress-row' }, [
        h('div', { class: 'stems__progress sunken', role: 'progressbar', 'aria-label': 'Stem preparation', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': progress == null ? undefined : String(Math.round(progress * 100)), 'aria-valuetext': progress == null ? 'unknown' : `${Math.round(progress * 100)} %` }, [
          progress == null ? h('span', { class: 'stems__progress-unknown', 'aria-hidden': 'true' }) : h('span', { class: 'stems__progress-fill', style: { width: `${(progress * 100).toFixed(1)}%` }, 'aria-hidden': 'true' }),
        ]),
        h('mdj-fixture-mark', { inline: '', for: 'stem preparation progress' }),
      ]));
    }
    const action = line.action ? h('button', { type: 'button', class: `btn ${line.action.cls}`, dataset: { hit: '48' }, 'aria-label': `${line.action.text}, stems, deck ${deck}`, on: { click: () => this.emit('mdj:stem-action', { deck, action: line.action.id }) } }, [icon(line.action.icon, { size: 18 }), h('span', { class: 'btn-label', text: line.action.text })]) : null;

    // ---- four stem rows ----
    const rowsEl = h('div', { class: 'stems__rows', role: 'group', 'aria-label': `Stem mixer, deck ${deck}` });
    for (const def of STEMS) {
      const st = stems[def.id];
      const gain = Math.min(GAIN_MAX, Math.max(GAIN_MIN, st.gain));
      const pos = (gain - GAIN_MIN) / (GAIN_MAX - GAIN_MIN);
      const dbText = `${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`;
      const tog = (kind, text, pressed) => h('button', {
        type: 'button', class: `stems__tog stems__tog--${kind}`, 'aria-pressed': String(pressed), 'aria-label': `${text} ${def.name.toLowerCase()}, deck ${deck}${ready ? '' : ' (stems not ready)'}`,
        'aria-disabled': ready ? undefined : 'true', dataset: { hit: '48' }, on: { click: () => { if (ready) this.emit('mdj:stem-toggle', { deck, stem: def.id, kind, value: !pressed }); } },
      }, [h('span', { 'aria-hidden': 'true', text: kind === 'mute' ? 'M' : 'S' }), h('span', { class: 'stems__tog-word label', 'aria-hidden': 'true', text: text })]);
      const rail = h('div', {
        class: 'stems__rail', role: 'slider', tabindex: ready ? '0' : '-1', dataset: { hit: '48' },
        'aria-label': `${def.name} gain, deck ${deck}`, 'aria-valuemin': String(GAIN_MIN), 'aria-valuemax': String(GAIN_MAX), 'aria-valuenow': gain.toFixed(1), 'aria-valuetext': dbText, 'aria-disabled': ready ? undefined : 'true',
        on: { keydown: (e) => { if (!ready) return; const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.5 : 0; if (d) { e.preventDefault(); this.emit('mdj:stem-gain', { deck, stem: def.id, gain: gain + d }); } } },
      }, [
        h('span', { class: 'stems__rail-guide', 'aria-hidden': 'true' }),
        h('span', { class: 'stems__rail-zero index-mark', 'aria-hidden': 'true', style: { left: `calc(10px + (100% - 20px) * ${((0 - GAIN_MIN) / (GAIN_MAX - GAIN_MIN)).toFixed(3)})` } }),
        h('span', { class: 'stems__thumb brass-rim', 'aria-hidden': 'true', style: { left: `calc(10px + (100% - 20px) * ${pos.toFixed(3)})` } }, [h('span', { class: 'stems__thumb-face titanium' }, [h('span', { class: 'stems__grip' })])]),
      ]);
      rowsEl.appendChild(h('div', { class: `stems__row${st.mute ? ' stems__row--muted' : ''}${st.solo ? ' stems__row--solo' : ''}` }, [
        h('span', { class: 'stems__name', 'aria-hidden': 'true' }, [h('span', { class: 'stems__letter numeral', text: def.letter }), icon(def.icon, { size: 14 }), h('span', { class: 'label label-strong', text: def.name })]),
        tog('mute', 'Mute', st.mute), tog('solo', 'Solo', st.solo),
        h('div', { class: 'stems__fader' }, [rail, h('span', { class: 'stems__db numeral', 'aria-hidden': 'true', text: dbText })]),
      ]));
    }
    bits.push(rowsEl);
    const foot = h('p', { class: 'stems__foot' }, [
      h('span', { text: ready ? `Prepared stems (model ${model}): separation artefacts are possible; these are not studio stems.` : 'Full mix plays unchanged. Stem controls are inert until a stem set is ready.' }),
    ]);
    bits.push(h('div', { class: 'stems__footrow' }, [foot, action].filter(Boolean)));
    this.replaceChildren(...bits);
  }
}

function readiness(state, { progress, reason, model, track }) {
  switch (state) {
    case 'ready': return { tone: 'tone-ok', icon: 'check', text: `Ready · 4 stems prepared, model ${model}, aligned` };
    case 'preparing': return { tone: 'tone-info', icon: 'loader', text: progress == null ? 'Preparing · progress unknown' : `Preparing ${Math.round(progress * 100)} %`, action: { id: 'cancel', text: 'Cancel', icon: 'x', cls: 'btn--secondary' } };
    case 'failed': return { tone: 'tone-critical', icon: 'warning', text: `Failed · ${reason || 'integrity check mismatch'}`, action: { id: 'retry', text: 'Retry', icon: 'refresh', cls: 'btn--secondary' } };
    case 'restricted': return { tone: 'tone-warning', icon: 'lock', text: `Restricted by source · ${reason || 'separation not permitted for this provider'}` };
    case 'live-denied': return { tone: 'tone-warning', icon: 'thermal', text: `Device capacity: live separation refused · ${reason || 'prepared stems only'}` };
    default: return { tone: 'tone-neutral', icon: 'stems', text: `No stems prepared${track ? ' for this track' : ''}`, action: { id: 'prepare', text: 'Prepare stems', icon: 'stems', cls: 'btn--primary' } };
  }
}
function readStems(json) {
  let list = null;
  if (json) { try { list = JSON.parse(json); } catch { list = null; } }
  const out = {};
  for (const def of STEMS) {
    const src = Array.isArray(list) ? list.find((x) => x && x.id === def.id) : null;
    out[def.id] = { mute: !!(src && src.mute), solo: !!(src && src.solo), gain: src && Number.isFinite(Number(src.gain)) ? Number(src.gain) : 0 };
  }
  return out;
}

define(MdjStemStrip);
