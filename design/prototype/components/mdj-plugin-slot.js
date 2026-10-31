// <mdj-plugin-slot plugin="glassverb" slot="1" deck="A" compact
//                  state="compatible|loading|loaded|bypassed|failed-validation|unavailable|unsupported-format|latency-change">
//
// One slot of the plugin rack (Document 03 §7, Document 15 §6, FR-047, FR-034). It prints the plugin's declared
// contract — name, vendor, version, format, ABI, I/O — its latency and CPU budget as FIXTURE numerals, the preset
// name and the ISOLATION MODEL ("Process boundary" or "In-process · trusted", never "sandboxed" for the latter),
// plus the failure explanation for a plugin that cannot run and a kept placeholder for a plugin a restored
// session needs but this device does not have. Only validated formats and compatible plugins are offered as
// loadable; a desktop binary is named for what it is.
// Engine binding: Load / Unload / Bypass / Rebuild emit mdj:plugin { action, pluginId, slot } and the host sends
// PluginCommand(load | unload | bypass | rebuild_graph) at a QUALIFIED time (prepare / load / state parsing off
// the callback; a latency change rebuilds the graph outside active use). The state printed here is the host's
// REPORTED state for the slot; Bypass is latency-compensated dry bypass for effects (short controlled mute for
// instruments) and its pressed look is the acknowledged state.
//   compatible         — discovered and validated against the pinned host; Load available
//   loading            — prepare / state parsing in progress: LOADING stamp, controls inert, no fake progress
//   loaded             — processing; Bypass and Parameters available
//   bypassed           — dry bypass engaged (aria-pressed), latency compensation printed
//   failed-validation  — the validation report's reason; Show report / Remove
//   unavailable        — restored session references a plugin not installed here: dashed placeholder, saved
//                        state kept, never replaced by a different effect
//   unsupported-format — a desktop VST3 / AU binary: cannot be made Android-compatible; Remove file
//   latency-change     — the plugin reports a new latency: printed until the graph is rebuilt at a qualified time
// Units / range: latency in frames and ms at the declared rate; CPU budget in % of one core (fixture); tail ms;
// memory MiB. Gesture: tap. Pending vs acknowledged: `loading` is the sent state; everything else is reported.
// Cancellation: Unload; a loading plugin can be cancelled (Cancel load).
// Accessible: role=group "Slot 1, Glassverb 1.4.2 by Fixture Audio Works, effect, loaded"; Bypass is aria-pressed
// and named with the plugin; disabled buttons say why. Parameter inspection has an accessible alternative
// (the Parameters button opens the inspector list).
import { MdjElement, define, h, icon } from './base.js';
import { load } from '../app/fixtures.js';

const STATES = ['compatible', 'loading', 'loaded', 'bypassed', 'failed-validation', 'unavailable', 'unsupported-format', 'latency-change'];
const STATE_WORD = { compatible: 'Compatible', loading: 'Loading', loaded: 'Loaded', bypassed: 'Bypassed', 'failed-validation': 'Failed validation', unavailable: 'Unavailable', 'unsupported-format': 'Unsupported format', 'latency-change': 'Latency changed' };
const TONE = { compatible: 'ok', loading: 'info', loaded: 'ok', bypassed: 'neutral', 'failed-validation': 'critical', unavailable: 'warning', 'unsupported-format': 'critical', 'latency-change': 'warning' };
const DEFAULT_PLUGIN = { compatible: 'glassverb', loading: 'brasskeys', loaded: 'glassverb', bypassed: 'glassverb', 'failed-validation': 'tidecomp', unavailable: 'old-phaser', 'unsupported-format': 'desktop-chorus', 'latency-change': 'wideverb' };
let pluginsPromise = null;
const plugins = () => (pluginsPromise ||= load('plugins').catch(() => null));
const ms = (frames, rate) => (frames == null || !rate ? null : (frames / rate) * 1000);

export class MdjPluginSlot extends MdjElement {
  static tag = 'mdj-plugin-slot';
  static states = STATES;
  static fr = ['FR-047', 'FR-034'];
  static hit = 0; // container: Bypass / Load / Parameters buttons carry data-hit="48"
  static fixture = true; // latency, CPU budget, tail and memory numerals are fixtures
  static observed = ['plugin', 'slot', 'deck', 'compact'];
  static samples = {
    default: { slot: 1, style: 'width:min(100%, 380px)' },
    variants: [{}],
    compatible: { plugin: 'glassverb' },
    loading: { plugin: 'brasskeys', slot: 2 },
    loaded: { plugin: 'glassverb' },
    bypassed: { plugin: 'glassverb' },
    'failed-validation': { plugin: 'tidecomp', slot: 2 },
    unavailable: { plugin: 'old-phaser', slot: 3 },
    'unsupported-format': { plugin: 'desktop-chorus', slot: 4 },
    'latency-change': { plugin: 'wideverb', slot: 1 },
  };

  constructor() { super(); this._fx = null; }
  connectedCallback() { plugins().then((fx) => { this._fx = fx; if (this.isConnected) { this.render(); this.ensureFixtureMark(); } }); super.connectedCallback(); }

  btn(label, { ic = null, cls = 'btn--secondary', pressed = null, disabled = false, why = '', on }) {
    return h('button', {
      type: 'button', class: `btn ${cls} plugin-slot__btn`, dataset: { hit: '48' }, 'aria-pressed': pressed == null ? undefined : String(pressed),
      'aria-label': `${label}${disabled && why ? ` (unavailable: ${why})` : ''}`, 'aria-disabled': disabled ? 'true' : undefined, on: { click: () => { if (!disabled) on(); } },
    }, [ic ? icon(ic, { size: 16 }) : null, h('span', { class: 'btn-label', text: label })]);
  }

  render() {
    const state = STATES.includes(this.state) ? this.state : 'compatible';
    const pluginId = this.attr('plugin', '') || DEFAULT_PLUGIN[state];
    const list = this._fx?.plugins || [];
    const p = list.find((x) => x.id === pluginId) || { id: pluginId, name: this._fx ? pluginId : 'Loading plugin record…', vendor: '—', version: '—', kind: 'effect', format: '—', abi: '—', io: '—', latencyFrames: null, sampleRate: null, cpuBudgetPct: null, tailMs: null, maxMemoryMb: null, isolation: null, preset: '—', stateSchema: '—' };
    const iso = this._fx?.isolationModels?.[p.isolation] || null;
    const slot = Math.max(1, Math.round(this.num('slot', 1)));
    const compact = this.bool('compact');
    const inert = ['loading', 'failed-validation', 'unavailable', 'unsupported-format'].includes(state);
    const bypassed = state === 'bypassed';
    this.className = `plugin-slot raised plugin-slot--${state} plugin-slot--${p.kind || 'effect'}${compact ? ' plugin-slot--compact' : ''}`;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', `Slot ${slot}, ${p.name} ${p.version} by ${p.vendor}, ${p.kind}, ${STATE_WORD[state].toLowerCase()}`);
    delete this.dataset.hit;

    const latMs = ms(p.latencyFrames, p.sampleRate), prevMs = ms(p.previousLatencyFrames, p.sampleRate);
    const fmtLat = (fr, m) => (fr == null ? '—' : `${fr} fr · ${m.toFixed(1)} ms`);
    const head = h('div', { class: 'plugin-slot__head' }, [
      h('span', { class: 'plugin-slot__num numeral', 'aria-hidden': 'true', text: String(slot) }),
      h('span', { class: `plugin-slot__kind${p.kind === 'instrument' ? ' plugin-slot__kind--instrument' : ''}` }, [icon(p.kind === 'instrument' ? 'key' : 'fx', { size: 16 })]),
      h('div', { class: 'plugin-slot__titles' }, [
        h('span', { class: 'plugin-slot__name title truncate', text: p.name }),
        h('span', { class: 'plugin-slot__vendor label truncate', text: `${p.vendor} · v${p.version} · ${p.kind}` }),
      ]),
      h('span', { class: `plugin-slot__state tone-${TONE[state]} label`, role: 'status' }, [icon({ compatible: 'check', loading: 'loader', loaded: 'check', bypassed: 'slip', 'failed-validation': 'x', unavailable: 'unavailable', 'unsupported-format': 'warning', 'latency-change': 'clock' }[state], { size: 11 }), h('span', { text: STATE_WORD[state] })]),
    ]);

    const contract = compact ? null : h('dl', { class: 'plugin-slot__contract' }, [
      h('div', {}, [h('dt', { class: 'label', text: 'Format' }), h('dd', { class: 'body', text: p.format })]),
      h('div', {}, [h('dt', { class: 'label', text: 'ABI' }), h('dd', { class: 'numeral', text: p.abi })]),
      h('div', {}, [h('dt', { class: 'label', text: 'I/O' }), h('dd', { class: 'numeral', text: p.io })]),
      h('div', {}, [h('dt', { class: 'label', text: 'Latency' }), h('dd', { class: 'numeral plugin-slot__fixture-num', text: fmtLat(p.latencyFrames, latMs) })]),
      h('div', {}, [h('dt', { class: 'label', text: 'CPU budget' }), h('dd', { class: 'numeral plugin-slot__fixture-num', text: p.cpuBudgetPct == null ? '—' : `${p.cpuBudgetPct.toFixed(1)} %` })]),
      h('div', {}, [h('dt', { class: 'label', text: 'Tail · memory' }), h('dd', { class: 'numeral plugin-slot__fixture-num', text: `${p.tailMs == null ? '—' : `${p.tailMs} ms`} · ${p.maxMemoryMb == null ? '—' : `${p.maxMemoryMb} MiB`}` })]),
    ]);

    const presetRow = h('div', { class: 'plugin-slot__preset-row' }, [
      h('span', { class: 'plugin-slot__preset ink-backing' }, [h('span', { class: 'label', text: 'Preset' }), h('span', { class: 'plugin-slot__preset-name truncate', text: p.preset || '—' })]),
      h('span', { class: `plugin-slot__iso label${iso ? ` plugin-slot__iso--${p.isolation}` : ''}` }, [icon(p.isolation === 'process' ? 'lock' : p.isolation === 'in-process' ? 'unlock' : 'info', { size: 11 }), h('span', { text: iso ? iso.label : 'Isolation: not applicable' })]),
    ]);
    const isoNote = !compact && iso ? h('p', { class: 'plugin-slot__iso-note body muted', text: iso.detail }) : null;

    const notes = [];
    const note = (tone, ic, strong, text) => h('div', { class: `plugin-slot__note tone-${tone}`, role: tone === 'critical' || tone === 'warning' ? 'alert' : 'note' }, [icon(ic, { size: 16 }), h('span', { class: 'body' }, [strong ? h('strong', { text: `${strong} ` }) : null, h('span', { text })])]);
    if (state === 'loading') notes.push(h('div', { class: 'plugin-slot__stamp-row' }, [h('span', { class: 'plugin-slot__stamp', text: 'LOADING' }), h('span', { class: 'body muted', text: `Prepare and state parsing (schema ${p.stateSchema}) run off the audio callback at a qualified time. No progress figure: the host reports done or failed.` })]));
    if (state === 'bypassed') notes.push(note('neutral', 'slip', 'Dry bypass.', p.kind === 'instrument' ? 'Instrument output muted with a short controlled fade; nothing stale is repeated.' : `Latency-compensated: the dry path keeps the ${latMs == null ? '' : `${latMs.toFixed(1)} ms `}delay so the mix does not jump when you switch.`));
    if (state === 'failed-validation') notes.push(note('critical', 'x', 'Cannot load.', p.failure || 'Validation failed.'));
    if (state === 'unsupported-format') notes.push(note('critical', 'warning', 'Not an Android plugin.', p.failure || 'Desktop binaries are not assumed compatible.'));
    if (state === 'unavailable') notes.push(note('warning', 'unavailable', 'Placeholder kept.', `${p.failure || 'Saved with the session but not installed here.'}${p.savedIn ? ` Saved in ${p.savedIn}.` : ''}`));
    if (state === 'latency-change') notes.push(note('warning', 'clock', 'New latency reported.', `${fmtLat(p.latencyFrames, latMs)}${p.previousLatencyFrames != null ? ` (was ${fmtLat(p.previousLatencyFrames, prevMs)})` : ''}. ${p.note || 'The graph is rebuilt at a qualified time, not during an active transition.'}`));
    if (state === 'compatible' && p.note) notes.push(h('p', { class: 'plugin-slot__hint body muted', text: p.note }));

    const id = p.id;
    const act = (action) => () => this.emit('mdj:plugin', { action, pluginId: id, slot });
    const actions = [];
    if (state === 'compatible') { actions.push(this.btn('Load', { ic: 'plugin', cls: 'btn--primary', on: act('load') })); actions.push(this.btn('Parameters', { ic: 'list', on: act('parameters') })); }
    else if (state === 'loading') { actions.push(this.btn('Cancel load', { ic: 'x', on: act('cancel-load') })); }
    else if (state === 'loaded' || state === 'bypassed' || state === 'latency-change') {
      actions.push(this.btn(bypassed ? 'Bypassed' : 'Bypass', { ic: 'slip', cls: bypassed ? 'btn--primary' : 'btn--secondary', pressed: bypassed, on: act(bypassed ? 'unbypass' : 'bypass') }));
      actions.push(this.btn('Parameters', { ic: 'list', on: act('parameters') }));
      if (state === 'latency-change') actions.push(this.btn('Rebuild at next qualified time', { ic: 'refresh', cls: 'btn--primary', on: act('rebuild') }));
      else actions.push(this.btn('Unload', { ic: 'trash', on: act('unload') }));
    } else if (state === 'failed-validation') { actions.push(this.btn('Show report', { ic: 'info', on: act('report') })); actions.push(this.btn('Remove', { ic: 'trash', cls: 'btn--danger', on: act('remove') })); }
    else if (state === 'unavailable') { actions.push(this.btn('Install', { ic: 'download', cls: 'btn--primary', on: act('install') })); actions.push(this.btn('Keep placeholder', { ic: 'save', on: act('keep') })); actions.push(this.btn('Remove from rack', { ic: 'trash', cls: 'btn--danger', on: act('remove') })); }
    else if (state === 'unsupported-format') { actions.push(this.btn('Remove file', { ic: 'trash', cls: 'btn--danger', on: act('remove') })); actions.push(this.btn('Supported formats', { ic: 'info', on: act('formats') })); }
    if (inert && state !== 'loading') { const b = this.btn('Bypass', { ic: 'slip', pressed: false, disabled: true, why: 'not loaded', on: () => {} }); actions.unshift(b); }

    this.replaceChildren(...[head, contract, presetRow, isoNote, ...notes, h('div', { class: 'plugin-slot__actions' }, actions)].filter(Boolean));
  }
}
define(MdjPluginSlot);
