// Screen family manifest: sources. Import each screen module of this family here.
// Owned by the "sources" screen agent. Family styles live in sources.css.
//
// Link-to-file acquisition (FR-049; Documents 14 §4–5, 16 §4–6, §10–11; Document 03 §3 "Discover and
// download"): sources/add → sources/resolve → sources/format → sources/queue. No adapter, extractor or
// network exists in the prototype: every identity, candidate, byte count and status comes from
// fixtures/acquisition.json and is marked FIXTURE where it looks like progress or measurement.
//
// Shared pieces for the four screens live here (function declarations, so the screen modules can import
// them despite the manifest importing the screens).
import { load } from '../../app/fixtures.js';
import { h, icon, button, fmt } from '../../components/base.js';

export let AQ = null;
export const aqReady = load('acquisition').then((d) => { AQ = d; return d; });

// Render helper: fill `root` once the family fixture is available.
export function withData(root, fill) {
  if (AQ) fill(AQ); else aqReady.then(fill);
  return root;
}

// Which fixture the format screen shows when it is reached from a probable match or a playlist
// (resolve sets it just before navigating; a direct URL always shows the state's own fixture).
export const handoff = { format: null };

export function dur(sec) { return sec == null ? 'unknown' : fmt.time(sec); }
export function adapter(id) { return AQ.adapters.find((a) => a.id === id) || null; }

const STEPS = [['add', 'Add'], ['resolve', 'Resolve'], ['format', 'Format'], ['queue', 'Queue']];

// Screen header: Back · title · step strip (non-interactive, aria-current on the current step).
export function sourcesHead(ctx, { title, step, back = null, backName = 'Back', extra = null }) {
  const steps = h('ol', { class: 'sources-steps', 'aria-label': 'Download steps' }, STEPS.map(([id, label], i) => h('li', {
    class: `sources-steps__step${id === step ? ' is-current' : ''}${STEPS.findIndex(([s]) => s === step) > i ? ' is-done' : ''}`,
    'aria-current': id === step ? 'step' : null,
  }, [h('span', { class: 'numeral sources-steps__n', text: String(i + 1) }), h('span', { class: 'sources-steps__label', text: label })])));
  return h('header', { class: 'sources-head' }, [
    back ? button({ label: 'Back', icon: 'chevron-left', cls: 'btn--ghost sources-head__back', fr: ['FR-049'], attrs: { 'aria-label': backName }, on: { click: back } }) : null,
    h('div', { class: 'sources-head__text' }, [
      h('h1', { class: 'title sources-head__title', text: title }),
      steps,
    ]),
    extra,
  ]);
}

const TONE_ICON = { ok: 'check', info: 'info', warning: 'warning', critical: 'blocked', neutral: 'clock' };

// The four statuses, always separate and labelled (Document 16 §1, §10; DLA-15). Never one badge.
export function statusQuad(statuses, { title = 'Four separate statuses', compact = false, id = '' } = {}) {
  const cells = AQ.statusKeys.map((k) => {
    const s = statuses?.[k.id] || { word: 'Unknown', tone: 'warning', why: 'Not established' };
    return h('div', { class: `sources-status sources-status--${s.tone}`, role: 'listitem', 'aria-label': `${k.label}: ${s.word}. ${s.why}` }, [
      h('span', { class: 'label sources-status__key', text: k.label }),
      h('span', { class: `sources-status__word tone-${s.tone}` }, [icon(TONE_ICON[s.tone] || 'info', { size: 12 }), h('span', { text: s.word })]),
      compact ? null : h('span', { class: 'sources-status__why', text: s.why }),
    ]);
  });
  return h('div', { class: `sources-quad${compact ? ' sources-quad--compact' : ''}`, role: 'group', 'aria-label': title, id: id || null }, [
    h('p', { class: 'label sources-quad__title', text: title }),
    h('div', { class: 'sources-quad__cells', role: 'list' }, cells),
  ]);
}

export function jobStatuses(job) {
  const a = adapter(job.adapter);
  return { ...(a?.statuses || {}), ...(job.statuses || {}) };
}

const CLASS = {
  exact: { word: 'Exact file', tone: 'ok', ic: 'check', why: 'Same media identity' },
  probable: { word: 'Probable recording', tone: 'info', ic: 'info', why: 'Confirm before cues attach' },
  ambiguous: { word: 'Ambiguous — choose', tone: 'warning', ic: 'warning', why: 'Needs your choice' },
  different: { word: 'Different recording', tone: 'neutral', ic: 'x', why: 'Not a substitute' },
  none: { word: 'No match', tone: 'critical', ic: 'blocked', why: 'Nothing equivalent found' },
};
export function classFlag(cls) {
  const c = CLASS[cls] || CLASS.none;
  return h('span', { class: `flag label sources-class tone-${c.tone}` }, [icon(c.ic, { size: 12 }), h('span', { text: c.word })]);
}

// Contract state name, printed in mono so it reads as the job contract's word, next to plain language.
export function stateTag(jobState, tone = 'info') {
  return h('span', { class: `sources-state tone-${tone}` }, [h('span', { class: 'sources-state__k', text: 'Job state' }), h('span', { class: 'sources-state__v', text: jobState })]);
}

export function note(ic, children, tone = '') {
  return h('p', { class: `sources-note${tone ? ` sources-note--${tone}` : ''}` }, [icon(ic, { size: 16 }), h('span', {}, [].concat(children))]);
}

export function facts(rows, cls = '') {
  return h('dl', { class: `sources-facts ${cls}`.trim() }, rows.filter(Boolean).map(([k, v, extra]) => h('div', { class: 'sources-facts__row' }, [
    h('dt', { class: 'label', text: k }),
    h('dd', { class: extra?.numeral ? 'numeral' : '' }, [].concat(v)),
  ])));
}

import './add.js';
import './resolve.js';
import './format.js';
import './queue.js';
