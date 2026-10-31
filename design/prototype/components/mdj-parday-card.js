// <mdj-parday-card proposal="P42" kind="crate|cue|transition|route|readiness|acquisition"
//                  state="proposed|needs_review|applied|rejected|expired|stale|thinking|unavailable"
//                  sent="preview|apply|arm|review|refresh|undo" compact>
//
// One structured ParDay proposal (Document 03 §6, Document 04 §4 "suggestion card family", Document 13
// lifecycle; FR-048, FR-005 crates, FR-011 cues). The card is READ/PROPOSE output: it never changes
// audio or preparation by itself. Each actionable proposal prints the affected deck/track, the source
// eligibility, the intended musical effect, the timing and whether it can be undone, plus a provenance
// tag on every claim. Audible history is never called undoable.
// Engine binding: none directly. Actions emit mdj:parday-action { action, proposalId, kind, digest,
// bindings }; the owning screen turns `apply` into a preparation transaction (ATOMIC_PREPARATION_EDITS),
// `arm` into the arm panel (SINGLE_PERFORMANCE_ACTION → ADMIT_AUTOMATION_BATCH) and `preview` into a
// cue-bus audition. The card shows acknowledged state from the fixture only.
// Units / range: bars, seconds (m:ss.d), BPM, dB, revisions and generations as printed by the fixture.
// Gesture: tap on a 48 dp button; the card body does not react to taps. Preview / Apply to preparation /
// Arm transition / Dismiss are separate buttons that wrap at 380 px and at 200 % font scale.
// Pending vs acknowledged: `sent="apply"` prints a dashed SENT badge on that button and holds the others
// (aria-disabled) until the screen acknowledges by changing `state`; `applied` is a solid check with the
// saved revision / engine time. Nothing animates to imply success.
// Lifecycle visuals: proposed · needs_review (prints WHAT changed; the proposal keeps describing the
// version you saw) · applied · rejected (reason) · expired (Refresh proposal) · stale (bound state then vs
// now; reviewable again, never silently retargeted) · thinking (retained request + "Progress unknown" +
// Cancel) · unavailable (reason + what still works).
// Cancellation: Cancel stops future work; the screen reports already-applied changes in the next card.
// Accessible: <article aria-labelledby=title>, status as text, buttons named with the proposal
// ("Arm transition — proposal P42, deck A to deck B").
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';
import { pardayFixture, trackTitle, pardayIcon } from './mdj-provenance-tag.js';

export const CARD_STATES = ['proposed', 'needs_review', 'applied', 'rejected', 'expired', 'stale', 'thinking', 'unavailable'];
const KINDS = {
  crate:       { text: 'Crate proposal',      icon: ['crate', 'folder'] },
  cue:         { text: 'Cue proposal',        icon: ['marker', 'marker'] },
  transition:  { text: 'Transition proposal', icon: ['automix', 'arm'] },
  route:       { text: 'Route explanation',   icon: ['route', 'route'] },
  readiness:   { text: 'Readiness check',     icon: ['ready', 'check'] },
  acquisition: { text: 'Acquisition help',    icon: ['download', 'download'] },
};
const STATUS = {
  proposed:     { text: 'Proposed',     tone: 'info',     icon: ['parday', 'parday'] },
  needs_review: { text: 'Needs review', tone: 'warning',  icon: ['warning', 'warning'] },
  applied:      { text: 'Applied',      tone: 'ok',       icon: ['check', 'check'] },
  rejected:     { text: 'Rejected',     tone: 'neutral',  icon: ['x', 'x'] },
  expired:      { text: 'Expired',      tone: 'neutral',  icon: ['expiry', 'clock'] },
  stale:        { text: 'Stale',        tone: 'warning',  icon: ['warning', 'warning'] },
  thinking:     { text: 'Thinking',     tone: 'info',     icon: ['thinking', 'loader'] },
  unavailable:  { text: 'Unavailable',  tone: 'critical', icon: ['unavailable', 'unavailable'] },
};
let uid = 0;

function actionsFor(kind, state, p) {
  const A = (id, label, ic, extra = {}) => ({ id, label, icon: ic, ...extra });
  const dismiss = A('dismiss', 'Dismiss', 'dismiss');
  const nav = (p.actions || []).map((a) => A(a.id, a.label, a.icon || 'external'));
  const prop = {
    crate: [A('preview', 'Preview', 'preview'), A('apply', 'Apply to preparation', 'apply', { primary: true })],
    cue: [A('preview', 'Preview', 'preview'), A('apply', 'Apply to preparation', 'apply', { primary: true })],
    transition: [A('preview', 'Preview', 'preview'), A('arm', 'Arm transition', 'arm', { primary: true, arm: true })],
    route: nav, readiness: nav, acquisition: nav,
  }[kind] || nav;
  switch (state) {
    case 'proposed': return [...prop, dismiss];
    case 'needs_review': return [A('review', 'Review again', 'refresh', { primary: true }), dismiss];
    case 'stale': return [A('review', 'Review again', 'refresh', { primary: true }), dismiss];
    case 'applied': return [p.undo?.reversible ? A('undo', 'Undo (preparation)', 'undo') : null, ...(kind === 'route' || kind === 'readiness' || kind === 'acquisition' ? nav : []), dismiss].filter(Boolean);
    case 'rejected': return [A('refresh', 'Refresh proposal', 'refresh'), dismiss];
    case 'expired': return [A('refresh', 'Refresh proposal', 'refresh', { primary: true }), dismiss];
    case 'thinking': return [A('cancel', 'Cancel', 'cancel')];
    case 'unavailable': return [dismiss];
    default: return [dismiss];
  }
}

function deckBlock(letter) {
  return h('span', { class: `pcard__deck deck-${letter.toLowerCase()}`, text: letter, 'aria-label': `Deck ${letter}` });
}

export class MdjPardayCard extends MdjElement {
  static tag = 'mdj-parday-card';
  static states = CARD_STATES;
  static fr = ['FR-048', 'FR-005', 'FR-011'];
  static hit = 48;
  static fixture = true;
  static observed = ['proposal', 'kind', 'sent', 'compact'];
  static samples = {
    default: { proposal: 'P42', style: 'width:min(100%, 380px)' },
    variants: [{ proposal: 'P42' }, { proposal: 'P37' }, { proposal: 'P38' }, { proposal: 'P40' }, { proposal: 'P41' }, { proposal: 'P43' }, { proposal: 'P42', compact: true }],
    proposed: {},
  };

  ensureFixtureMark() {
    if (this.querySelector('mdj-fixture-mark')) return;
    const m = document.createElement('mdj-fixture-mark');
    m.setAttribute('for', `proposal ${this.attr('proposal', '')}: timing, analysis and revisions`);
    m.setAttribute('inline', '');
    (this.querySelector('.pcard__head') || this).appendChild(m);
  }

  render() {
    const data = pardayFixture(this);
    const id = this.attr('proposal', 'P42');
    const state = CARD_STATES.includes(this.state) ? this.state : 'proposed';
    const compact = this.bool('compact');
    const sent = this.attr('sent', '');
    delete this.dataset.hit; // the buttons are the targets
    const p = data?.proposals?.[id];
    if (!p) {
      this.className = 'pcard pcard--loading';
      this.replaceChildren(h('div', { class: 'pcard__panel glass' }, [h('div', { class: 'pcard__inner pcard__inner--loading body muted', text: data ? `Proposal ${id} is not in the fixture.` : 'Loading proposal…' })]));
      return;
    }
    const kind = KINDS[this.attr('kind', p.kind)] ? this.attr('kind', p.kind) : (KINDS[p.kind] ? p.kind : 'route');
    const kdef = KINDS[kind], sdef = STATUS[state];
    const st = p.states?.[state] || {};
    this.className = `pcard pcard--${kind} pcard--${state}${compact ? ' pcard--compact' : ''}${sent ? ' pcard--sent' : ''} deck-none`;
    const titleId = `pcard-title-${++uid}`;
    const decks = (p.affected || []).filter((a) => a.deck).map((a) => a.deck);

    // ---- head: kind · id · status (text + icon + tone) ----
    const head = h('header', { class: 'pcard__head' }, [
      h('span', { class: 'pcard__kind label' }, [pardayIcon(kdef.icon[0], { size: 14 }), h('span', { text: kdef.text })]),
      h('span', { class: 'pcard__id numeral', text: p.id }),
      h('span', { class: `pcard__status tone-${sdef.tone} label`, role: 'status' }, [icon(iconId(sdef.icon[0], sdef.icon[1]), { size: 12 }), h('span', { text: sdef.text })]),
    ]);

    const parts = [head];
    parts.push(h('p', { class: 'pcard__context', text: p.context }));

    if (state === 'thinking') {
      // Retained content: the request and context stay readable; progress is unknown, not a percentage.
      parts.push(h('h3', { class: 'pcard__title title', id: titleId, text: p.title }));
      parts.push(h('p', { class: 'pcard__body body' }, [h('span', { class: 'label', text: 'Working on · ' }), st.retained || 'Working on this proposal…']));
      parts.push(h('div', { class: 'pcard__progress', role: 'status', 'aria-label': 'Progress unknown' }, [
        h('span', { class: 'pcard__progress-track sunken', 'aria-hidden': 'true' }, [h('span', { class: 'pcard__progress-dash' })]),
        h('span', { class: 'pcard__progress-text label' }, [icon(iconId('thinking', 'loader'), { size: 12, cls: 'pcard__spin' }), h('span', { text: `Progress unknown · started ${st.startedAt || p.requestedAt} · 20 s deadline, then Retry` })]),
      ]));
    } else if (state === 'unavailable') {
      parts.push(h('h3', { class: 'pcard__title title', id: titleId, text: p.title }));
      parts.push(h('div', { class: 'pcard__note tone-critical', role: 'status' }, [icon('unavailable', { size: 16 }), h('span', { class: 'body', text: st.reason || 'ParDay is unavailable.' })]));
      parts.push(h('p', { class: 'pcard__body body muted', text: `Last shown ${p.proposedAt}. The proposal text below is kept for reference; its actions return when ParDay does.` }));
      if (!compact) parts.push(h('p', { class: 'pcard__body body', text: p.body }));
    } else {
      parts.push(h('h3', { class: 'pcard__title title', id: titleId, text: p.title }));
      if (!compact) parts.push(h('p', { class: 'pcard__body body', text: p.body }));
      if (kind === 'cue' && !compact && p.cues) parts.push(this.cueList(p));
      if (kind === 'readiness' && !compact && p.items) parts.push(this.readinessList(p));
      if (kind === 'crate' && !compact && p.tracks) parts.push(this.crateList(p));
      if (kind === 'acquisition' && !compact && p.candidates) parts.push(this.candidateList(p));
      parts.push(compact ? this.compactFacts(p, decks) : this.facts(p, decks));
      parts.push(this.claims(p, compact));
    }

    // ---- state note: what changed / why rejected / what was applied / bound-then-vs-now ----
    const note = this.stateNote(state, st, p);
    if (note) parts.push(note);

    // ---- actions ----
    const acts = actionsFor(kind, state, p);
    const row = h('div', { class: 'pcard__actions' });
    for (const a of acts) {
      const isSent = sent && sent === a.id;
      const held = sent && !isSent;
      const btn = h('button', {
        type: 'button',
        class: `btn pcard__btn pcard__btn--${a.id}${a.primary ? ' btn--primary' : ''}${a.arm ? ' pcard__btn--armkind' : ''}${isSent ? ' pcard__btn--sent' : ''}`,
        dataset: { hit: '48' },
        'aria-label': `${a.label} — proposal ${p.id}${decks.length ? `, deck ${decks.join(' to deck ')}` : ''}${isSent ? ', sent, waiting for acknowledgement' : ''}`,
        'aria-disabled': held ? 'true' : undefined,
        on: { click: () => { if (!held) this.emit('mdj:parday-action', { action: a.id, proposalId: p.id, kind, digest: p.bindings?.digest, bindings: p.bindings }); } },
      }, [pardayIcon(a.icon, { size: 18 }), h('span', { class: 'btn-label', text: a.label })]);
      if (isSent) btn.appendChild(h('span', { class: 'pcard__sent label', text: 'SENT', 'aria-hidden': 'true' }));
      row.appendChild(btn);
    }
    parts.push(row);
    if (sent) parts.push(h('p', { class: 'pcard__pending body', role: 'status', text: 'Sent · waiting for the acknowledgement. The card changes state only when the app confirms.' }));

    const inner = h('div', { class: 'pcard__inner' }, parts);
    const panel = h('div', { class: 'pcard__panel glass' }, [h('span', { class: 'pcard__rim', 'aria-hidden': 'true' }), inner]);
    const article = h('article', { class: 'pcard__article', 'aria-labelledby': titleId }, [panel]);
    this.replaceChildren(article);
  }

  affects(p) {
    const out = [];
    const withDeck = (p.affected || []).filter((a) => a.deck);
    withDeck.forEach((a, i) => {
      out.push(h('span', { class: 'pcard__affect' }, [deckBlock(a.deck), h('span', { class: 'pcard__track', text: trackTitle(a.trackId) }), a.role ? h('span', { class: 'muted', text: ` (${a.role})` }) : null]));
      if (i < withDeck.length - 1 || p.affectedText) out.push(h('span', { class: 'pcard__sep', text: ' · ' }));
    });
    if (p.affectedText) out.push(h('span', { text: p.affectedText }));
    if (!out.length) out.push(h('span', { text: '—' }));
    return out;
  }

  facts(p, decks) {
    const dl = h('dl', { class: 'pcard__facts' });
    const row = (term, children) => dl.appendChild(h('div', { class: 'pcard__fact' }, [h('dt', { class: 'label', text: term }), h('dd', { class: 'body' }, children)]));
    row('Affects', this.affects(p));
    row('Timing', [h('span', { text: p.timing || '—' })]);
    row('Effect', [h('span', { text: p.effect || '—' })]);
    row('Source', [h('span', { text: p.eligibility || '—' })]);
    const u = p.undo || {};
    const undoText = u.reversible === true ? 'Can be undone: yes (preparation)' : u.reversible === false ? 'Can be undone: no (audible)' : 'Nothing to undo';
    const rest = (u.text || '').replace(/^(Yes|No) \((preparation|audible)\)\.\s*/, '').replace(/^Nothing to undo —\s*/, '');
    row('Undo', [h('span', { class: `pcard__undo pcard__undo--${u.reversible === true ? 'yes' : u.reversible === false ? 'no' : 'na'}` }, [icon(u.reversible === true ? 'undo' : u.reversible === false ? 'lock' : 'info', { size: 12 }), h('strong', { text: undoText })]), rest ? h('span', { class: 'muted', text: ` — ${rest}` }) : null]);
    return dl;
  }

  compactFacts(p, decks) {
    const u = p.undo || {};
    const undo = u.reversible === true ? 'undo: yes (preparation)' : u.reversible === false ? 'undo: no (audible)' : 'nothing to undo';
    const line = h('p', { class: 'pcard__compact-facts body' }, [
      ...this.affects(p),
      h('span', { class: 'pcard__sep', text: ' · ' }), h('span', { text: p.timing || '' }),
      h('span', { class: 'pcard__sep', text: ' · ' }), h('span', { text: (p.eligibility || '').split('.')[0] }),
      h('span', { class: 'pcard__sep', text: ' · ' }), h('strong', { text: undo }),
    ]);
    return line;
  }

  claims(p, compact) {
    const list = h('ul', { class: `pcard__claims${compact ? ' pcard__claims--compact' : ''}`, 'aria-label': 'Claims and their provenance' });
    if (compact) {
      const seen = new Set();
      for (const c of p.claims || []) {
        if (seen.has(c.provenance)) continue; seen.add(c.provenance);
        list.appendChild(h('li', {}, [h('mdj-provenance-tag', { kind: c.provenance, size: 'sm', source: c.source || null, confidence: c.confidence || null })]));
      }
      return h('div', { class: 'pcard__claimrow' }, [h('span', { class: 'label', text: 'Provenance' }), list]);
    }
    for (const c of p.claims || []) {
      list.appendChild(h('li', { class: 'pcard__claim' }, [
        h('span', { class: 'pcard__claim-text body', text: c.text + (c.note ? ` — ${c.note}` : '') }),
        h('mdj-provenance-tag', { kind: c.provenance, size: 'sm', source: c.source || null, confidence: c.confidence || null }),
      ]));
    }
    return list;
  }

  cueList(p) {
    const ul = h('ul', { class: 'pcard__list', 'aria-label': 'Drafted cues' });
    for (const c of p.cues) ul.appendChild(h('li', { class: 'pcard__list-item' }, [
      h('mdj-marker', { kind: 'cue', n: c.n, color: c.color, label: c.name, size: 20, state: c.state || 'active' }),
      h('span', { class: 'body' }, [
        `${c.name} · `, h('span', { class: 'numeral', text: fmtSec(c.sec) }),
        c.state === 'uncertain' ? h('span', { class: 'pcard__flag tone-warning label', text: 'Uncertain' }) : h('span', { class: 'pcard__flag tone-neutral label', text: 'Draft' }),
      ]),
    ]));
    return ul;
  }
  crateList(p) {
    const ol = h('ol', { class: 'pcard__list pcard__list--crate', 'aria-label': 'Proposed crate order' });
    for (const id of p.tracks) ol.appendChild(h('li', { class: 'pcard__list-item' }, [h('span', { class: 'body pcard__track', text: trackTitle(id) })]));
    return ol;
  }
  readinessList(p) {
    const ul = h('ul', { class: 'pcard__list', 'aria-label': 'Readiness items' });
    const LV = { block: ['blocked', 'unavailable', 'critical', 'Block'], warning: ['warning', 'warning', 'warning', 'Warning'], pass: ['ready', 'check', 'ok', 'Ready'] };
    for (const it of p.items) {
      const [pref, fb, tone, word] = LV[it.level] || LV.pass;
      ul.appendChild(h('li', { class: 'pcard__list-item' }, [
        h('span', { class: `pcard__flag tone-${tone} label` }, [icon(iconId(pref, fb), { size: 11 }), h('span', { text: word })]),
        h('span', { class: 'body' }, [it.trackId ? h('strong', { text: `${trackTitle(it.trackId)} · ` }) : null, it.text]),
      ]));
    }
    return ul;
  }
  candidateList(p) {
    const ul = h('ul', { class: 'pcard__list', 'aria-label': 'Playable versions found' });
    for (const c of p.candidates) ul.appendChild(h('li', { class: 'pcard__list-item' }, [icon('music', { size: 14 }), h('span', { class: 'body' }, [h('strong', { text: `${trackTitle(c.trackId)} · ` }), c.text])]));
    return ul;
  }

  stateNote(state, st, p) {
    const box = (tone, ic, label, text) => h('div', { class: `pcard__note tone-${tone}`, role: 'status' }, [icon(ic, { size: 16 }), h('span', { class: 'body' }, [h('strong', { text: `${label} ` }), text])]);
    switch (state) {
      case 'needs_review': return box('warning', 'warning', 'What changed:', st.changed || 'The affected state changed — review before acting.');
      case 'applied': return box('ok', 'check', 'Acknowledged:', st.text || `Applied ${st.at || ''}`);
      case 'rejected': return box('neutral', 'x', 'Rejected:', st.reason || 'Rejected.');
      case 'expired': return box('neutral', 'clock', 'Expired:', st.text || `Expired ${p.expiresAt}.`);
      case 'stale': return h('div', { class: 'pcard__note tone-warning', role: 'status' }, [icon('warning', { size: 16 }), h('span', { class: 'body' }, [
        h('strong', { text: 'Stale: ' }), st.text || 'The bound state changed — reviewable again.',
        p.bindings ? h('span', { class: 'pcard__bind numeral', text: ` Bound: ${bindText(p.bindings)}` }) : null,
      ])]);
      default: return null;
    }
  }
}
function fmtSec(sec) { const m = Math.floor(sec / 60); const s = sec - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; }
function bindText(b) {
  const out = [];
  if (b.streamEpoch != null) out.push(`epoch ${b.streamEpoch}`);
  for (const [d, g] of Object.entries(b.deckGenerations || {})) out.push(`${d} gen ${g}`);
  if (b.masterControlRevision != null) out.push(`master rev ${b.masterControlRevision}`);
  if (b.routeEpoch != null) out.push(`route epoch ${b.routeEpoch}`);
  if (b.libraryRevision != null) out.push(`library rev ${b.libraryRevision}`);
  for (const [t, r] of Object.entries(b.analysisRevisions || {})) out.push(`${t} ${r}`);
  if (b.digest) out.push(`digest ${b.digest}`);
  return out.join(' · ');
}
define(MdjPardayCard);
