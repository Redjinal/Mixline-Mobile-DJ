// <mdj-progress-row title="SODA LIGHTS (Radio Edit)" requested="Spotify link (fixture)" actual="YouTube (fixture)"
//                   phase="transferring" bytes="12400000" total="42127360" error="Adapter returned HTTP 403" note="…"
//                   state="queued|resolving|transferring|converting|verifying|publishing|complete|failed|cancelled|paused|unknown">
//
// One acquisition / import job (FR-049, FR-002; Documents 14 / 16 and the acquisition job contract). The
// five phases — Resolve · Transfer · Convert · Verify · Publish — are SEPARATE, printed steps with done /
// current / to-do marks; the state names the current one. Byte progress is shown ONLY when both `bytes`
// and `total` are measurable ("12.4 MB of 40.2 MB · 29 %", a percentage of real work units); an unknown
// total prints "Progress unknown" over a static hatched bar — never a fake percentage, never an
// animation implying progress. Everything printed is a FIXTURE value → FIXTURE mark.
// Engine binding: none (the audio engine is not involved). Pause and Cancel send JobCommand(pause |
// resume | cancel, { jobId, jobRevision }) and print SENT until the adapter acknowledges (the owning
// screen sets `paused` / `cancelled`). A catalogue match is not a ready file: only `complete` says
// "Published to the library · ready to prepare", and only after the job contract's publish step.
//   queued     — waiting for the adapter; Cancel only
//   resolving  — matching the requested recording and the ACTUAL source (printed: requested → actual)
//   transferring / converting / verifying / publishing — the current phase; Pause + Cancel (48 dp)
//   paused     — "Paused at Transfer · 12.4 MB of 40.2 MB"; Resume + Cancel
//   failed     — the current phase is marked failed, `error` is printed, Retry + Remove
//   cancelled  — "Cancelled · nothing was published"; Start again
//   complete   — all phases done; published; Open in library
//   unknown    — the adapter reports no measurable units or phase: "Progress unknown"; Cancel
// Units / range: bytes / total in bytes (printed via fmt.bytes); phase index 0–4. Gesture: tap.
// Pending vs acknowledged: SENT (via `sent`) vs the next acknowledged state. Cancellation: Cancel.
// Events: mdj:progress-pause { paused }, mdj:progress-cancel, mdj:progress-retry, mdj:progress-open.
// Accessible: group named by the title; "Transfer, 12.4 MB of 40.2 MB, 29 percent"; "Progress unknown".
import { MdjElement, define, h, icon, fmt } from './base.js';
import { iconId } from './mdj-marker.js';

const PHASES = [
  { id: 'resolving', label: 'Resolve' },
  { id: 'transferring', label: 'Transfer' },
  { id: 'converting', label: 'Convert' },
  { id: 'verifying', label: 'Verify' },
  { id: 'publishing', label: 'Publish' },
];
const STATES = ['queued', 'resolving', 'transferring', 'converting', 'verifying', 'publishing', 'complete', 'failed', 'cancelled', 'paused', 'unknown'];
const phaseIndex = (id) => PHASES.findIndex((p) => p.id === id);

export class MdjProgressRow extends MdjElement {
  static tag = 'mdj-progress-row';
  static states = STATES;
  static fr = ['FR-049', 'FR-002'];
  static hit = 48;
  static fixture = true;
  static observed = ['title', 'requested', 'actual', 'phase', 'bytes', 'total', 'error', 'note', 'sent'];
  static samples = {
    default: { title: 'SODA LIGHTS (Radio Edit)', requested: 'Spotify link (fixture)', actual: 'YouTube (fixture)', bytes: 12400000, total: 42127360, style: 'width:100%' },
    variants: [{}],
    queued: { bytes: null, total: null, actual: '' },
    resolving: { bytes: null, total: null, actual: '' },
    transferring: { bytes: 12400000, total: 42127360 },
    converting: { bytes: null, total: null },
    verifying: { bytes: 42127360, total: 42127360 },
    publishing: { bytes: null, total: null },
    complete: { bytes: 42127360, total: 42127360 },
    failed: { phase: 'transferring', error: 'Adapter returned HTTP 403 — the source refused the request', bytes: 12400000, total: 42127360 },
    cancelled: { phase: 'transferring', bytes: 12400000, total: 42127360 },
    paused: { phase: 'transferring', bytes: 12400000, total: 42127360 },
    unknown: { bytes: 12400000, total: null, phase: 'transferring' },
  };

  render() {
    const title = this.attr('title', 'Acquisition job');
    const requested = this.attr('requested', '');
    const actual = this.attr('actual', '');
    const note = this.attr('note', '');
    const error = this.attr('error', '');
    const sent = this.bool('sent');
    const state = STATES.includes(this.state) ? this.state : 'unknown';
    const bytesRaw = this.getAttribute('bytes'), totalRaw = this.getAttribute('total');
    const bytes = bytesRaw !== null && bytesRaw !== '' && bytesRaw !== 'null' && Number.isFinite(Number(bytesRaw)) ? Math.max(0, Number(bytesRaw)) : null;
    const total = totalRaw !== null && totalRaw !== '' && totalRaw !== 'null' && Number.isFinite(Number(totalRaw)) && Number(totalRaw) > 0 ? Number(totalRaw) : null;
    const measurable = bytes !== null && total !== null;
    const phaseAttr = this.attr('phase', '');
    let cur = phaseIndex(phaseAttr) >= 0 ? phaseIndex(phaseAttr) : phaseIndex(state);
    if (state === 'complete') cur = PHASES.length;
    if (state === 'queued') cur = -1;
    if (cur < -1 && state !== 'unknown') cur = 0;
    this.className = `progress-row raised progress-row--${state}${sent ? ' progress-row--sent' : ''}`;
    delete this.dataset.hit; // the Pause / Cancel / Retry buttons are the targets
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', `${title}, ${state}`);
    const active = ['resolving', 'transferring', 'converting', 'verifying', 'publishing'].includes(state);
    const transferPhase = state === 'transferring' || (state === 'paused' && cur === 1) || (state === 'failed' && cur === 1) || (state === 'unknown');

    // Phase strip: five separate steps.
    const strip = h('ol', { class: 'progress-row__phases', 'aria-label': 'Phases' });
    PHASES.forEach((p, i) => {
      let mark = 'todo';
      if (state === 'complete' || i < cur) mark = 'done';
      else if (i === cur) mark = state === 'failed' ? 'failed' : state === 'cancelled' ? 'cancelled' : state === 'paused' ? 'paused' : 'current';
      if (state === 'unknown' && cur < 0) mark = 'unknown';
      const word = { done: 'done', current: 'in progress', failed: 'failed', cancelled: 'cancelled', paused: 'paused', todo: 'to do', unknown: 'unknown' }[mark];
      strip.appendChild(h('li', { class: `progress-row__phase progress-row__phase--${mark}`, 'aria-label': `${p.label}, ${word}` }, [
        h('span', { class: 'progress-row__phase-mark', 'aria-hidden': 'true' }, [mark === 'done' ? icon('check', { size: 10 }) : mark === 'failed' ? icon('x', { size: 10 }) : mark === 'paused' ? icon('pause', { size: 9 }) : null]),
        h('span', { class: 'progress-row__phase-label label', text: p.label }),
      ]));
    });

    // Bar + readout: bytes only when measurable; otherwise an honest unknown.
    let bar = null, readout = '', pct = null;
    if (measurable) {
      pct = Math.min(100, Math.round((bytes / total) * 100));
      readout = `${fmt.bytes(bytes)} of ${fmt.bytes(total)} · ${pct} %`;
      bar = h('div', { class: 'progress-row__bar sunken', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-valuetext': `${fmt.bytes(bytes)} of ${fmt.bytes(total)}, ${pct} percent` }, [
        h('span', { class: 'progress-row__fill', style: { width: `${pct}%` } }),
        ...[25, 50, 75].map((m) => h('span', { class: 'progress-row__tick', style: { left: `${m}%` }, 'aria-hidden': 'true' })),
      ]);
    } else if (transferPhase || state === 'unknown' || active) {
      readout = bytes !== null ? `Progress unknown · ${fmt.bytes(bytes)} so far, total size not reported` : 'Progress unknown';
      bar = h('div', { class: 'progress-row__bar progress-row__bar--unknown sunken', role: 'progressbar', 'aria-valuetext': 'Progress unknown' }, [h('span', { class: 'progress-row__hatch' })]);
    }
    if (state === 'queued') readout = 'Queued · waiting for the adapter';
    else if (state === 'resolving') readout = 'Resolving the requested recording and the actual source…';
    else if (state === 'converting' && !measurable) readout = 'Converting · progress unknown (the converter reports no units)';
    else if (state === 'publishing' && !measurable) readout = 'Publishing to the library · verifying hash and metadata';
    else if (state === 'verifying') readout = `Verifying · hash, duration and format${measurable ? ` · ${fmt.bytes(total)}` : ''}`;
    else if (state === 'paused') readout = `Paused at ${PHASES[Math.max(0, cur)]?.label || 'Transfer'}${measurable ? ` · ${fmt.bytes(bytes)} of ${fmt.bytes(total)}` : ''}`;
    else if (state === 'failed') readout = `Failed at ${PHASES[Math.max(0, cur)]?.label || 'Transfer'} · ${error || 'the adapter reported an error'}${measurable ? ` · ${fmt.bytes(bytes)} of ${fmt.bytes(total)} kept` : ''}`;
    else if (state === 'cancelled') readout = 'Cancelled · nothing was published; partial data removed';
    else if (state === 'complete') readout = `Complete · published to the library${measurable ? ` · ${fmt.bytes(total)}` : ''} · ready to prepare`;
    const tone = state === 'failed' ? 'critical' : state === 'cancelled' || state === 'unknown' ? 'warning' : state === 'complete' ? 'ok' : state === 'paused' ? 'neutral' : 'info';
    const rIcon = state === 'failed' ? 'warning' : state === 'cancelled' ? 'x' : state === 'complete' ? 'check' : state === 'paused' ? 'pause' : state === 'unknown' ? 'info' : state === 'queued' ? 'clock' : 'loader';

    // Buttons by state.
    const btn = (label, ic, cls, name, fn) => h('button', { type: 'button', class: `btn ${cls} progress-row__btn`.trim(), dataset: { hit: '48' }, 'aria-label': name, on: { click: fn } }, [ic ? icon(ic, { size: 16 }) : null, h('span', { class: 'btn-label', text: label })]);
    const actions = h('div', { class: 'progress-row__actions' });
    if (active || state === 'unknown') {
      if (state !== 'resolving' && state !== 'publishing') actions.appendChild(btn('Pause', 'pause', '', `Pause ${title}`, () => this.emit('mdj:progress-pause', { paused: true, title })));
      actions.appendChild(btn('Cancel', 'x', 'btn--danger', `Cancel ${title}`, () => this.emit('mdj:progress-cancel', { title })));
    } else if (state === 'queued') {
      actions.appendChild(btn('Cancel', 'x', 'btn--danger', `Cancel ${title}`, () => this.emit('mdj:progress-cancel', { title })));
    } else if (state === 'paused') {
      actions.appendChild(btn('Resume', 'play', 'btn--primary', `Resume ${title}`, () => this.emit('mdj:progress-pause', { paused: false, title })));
      actions.appendChild(btn('Cancel', 'x', 'btn--danger', `Cancel ${title}`, () => this.emit('mdj:progress-cancel', { title })));
    } else if (state === 'failed') {
      actions.appendChild(btn('Retry', iconId('retry', 'refresh'), 'btn--primary', `Retry ${title}`, () => this.emit('mdj:progress-retry', { title })));
      actions.appendChild(btn('Remove', 'trash', '', `Remove ${title} from the download queue`, () => this.emit('mdj:progress-cancel', { title, remove: true })));
    } else if (state === 'cancelled') {
      actions.appendChild(btn('Start again', iconId('retry', 'refresh'), '', `Start ${title} again`, () => this.emit('mdj:progress-retry', { title })));
    } else if (state === 'complete') {
      actions.appendChild(btn('Open in library', 'library', 'btn--primary', `Open ${title} in the library`, () => this.emit('mdj:progress-open', { title })));
    }

    const source = requested || actual ? h('div', { class: 'progress-row__source muted' }, [
      requested ? h('span', {}, [h('span', { class: 'label', text: 'Requested ' }), h('span', { text: requested })]) : null,
      requested && actual ? h('span', { class: 'progress-row__arrow', 'aria-hidden': 'true', text: '→' }) : null,
      actual ? h('span', {}, [h('span', { class: 'label', text: 'Actual source ' }), h('span', { class: 'progress-row__actual', text: actual })]) : state === 'resolving' || state === 'queued' ? h('span', { class: 'progress-row__actual', text: 'Actual source not yet known' }) : null,
    ]) : null;

    this.replaceChildren(...[
      h('div', { class: 'progress-row__head' }, [
        h('span', { class: 'progress-row__icon', 'aria-hidden': 'true' }, [icon('download', { size: 16 })]),
        h('span', { class: 'progress-row__title title truncate', text: title }),
        sent ? h('span', { class: 'progress-row__sent', text: 'SENT', 'aria-hidden': 'true' }) : null,
      ]),
      source,
      strip,
      bar,
      h('div', { class: `progress-row__readout tone-${tone}`, role: 'status' }, [icon(rIcon, { size: 12 }), h('span', { class: measurable ? 'numeral' : '', text: readout })]),
      note ? h('p', { class: 'progress-row__note muted', text: note }) : null,
      actions.childNodes.length ? actions : null,
    ].filter(Boolean));
  }
}
define(MdjProgressRow);
