// sources/resolve — requested identity vs the actual source (Document 14 §4–5, Document 16 §4–5, §11
// DLA-02 / DLA-11 / DLA-13; FR-049, FR-036). Shell screen, dock in both orientations.
//
// Every candidate prints the requested recording next to what the adapter actually found: source and
// uploader, duration and its difference, explicit/clean, version, the edition evidence and the match
// class. Classes are exact file / probable recording / ambiguous — never a percentage (no calibrated
// confidence exists). A matching title alone cannot approve a substitute; probable matches need a
// confirmation before cues, grids or loops attach. Resolution is deterministic, never ParDay.
// No resolver runs: the "matching" state is RESOLVING with unknown progress, and its fixture answer is
// revealed by an explicitly labelled fixture step.
//
// States
//   matching              RESOLVING the pasted Spotify link; progress unknown; Cancel
//   exact                 a shared YouTube link — same media ID → Choose format
//   probable              Spotify → YouTube audio upload; confirm before cues attach
//   ambiguous             SODA LIGHTS: Radio Edit 3:21 (fan re-upload) vs Extended 6:05 (artist channel)
//   no-match              the linked live recording has no equivalent; studio version not offered
//   adapter-unavailable   "YouTube extractor adapter: unverified — not enabled"
//   blocked-access        login required (members only) + a rate-limited job; no credential prompt
//   collection-selection  a 6-track playlist: enumerated, order kept, choose the set
import { register } from '../../app/registry.js';
import { h, icon, button } from '../../components/base.js';
import { AQ, withData, sourcesHead, statusQuad, classFlag, stateTag, note, dur, adapter, handoff } from './index.js';

const FR = ['FR-049', 'FR-036'];
const SHOW_ANSWER = 'Show resolver answer (fixture)';

register({
  id: 'sources/resolve',
  family: 'sources',
  title: 'Resolve link — requested vs actual',
  order: 2,
  fr: FR,
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    matching: { label: 'Matching — RESOLVING, progress unknown', exercised: true, scenario: 'set-ready', via: { from: 'sources/add:pasted-link', control: 'Resolve' } },
    exact: { label: 'Exact file — same media ID', exercised: true, scenario: 'set-ready', via: { from: 'sources/add:share-received', control: 'Resolve' } },
    probable: { label: 'Probable recording — confirm first', exercised: false, scenario: 'set-ready' },
    ambiguous: { label: 'Ambiguous version — Radio Edit or Extended', exercised: true, scenario: 'set-ready', via: { from: 'matching', control: SHOW_ANSWER } },
    'no-match': { label: 'No match — no substitute offered', exercised: false, scenario: 'set-ready' },
    'adapter-unavailable': { label: 'Adapter unavailable — not enabled', exercised: false, scenario: 'set-ready' },
    'blocked-access': { label: 'Blocked — login required / rate limited', exercised: false, scenario: 'set-ready' },
    'collection-selection': { label: 'Playlist — choose the set (6 items)', exercised: false, scenario: 'set-ready' },
  },
  defaultState: 'matching',
  render(ctx) {
    const root = h('div', { class: `sources-page sources-resolve sources-resolve--${ctx.state}` });
    return withData(root, () => root.replaceChildren(...build(ctx)));
  },
});

const TITLES = {
  matching: 'Resolving link', exact: 'Exact match', probable: 'Confirm the recording', ambiguous: 'Choose the recording',
  'no-match': 'No matching recording', 'adapter-unavailable': 'Adapter not available', 'blocked-access': 'Access blocked', 'collection-selection': 'Choose playlist tracks',
};

function build(ctx) {
  const head = sourcesHead(ctx, { title: TITLES[ctx.state] || 'Resolve link', step: 'resolve', back: () => ctx.navigate('sources/add', { state: 'idle' }), backName: 'Back to Add music' });
  const live = h('p', { class: 'sources-sr', role: 'status', 'aria-live': 'polite' });
  if (ctx.state === 'collection-selection') return [head, collection(ctx, live), live];
  const r = ctx.state === 'matching' ? null : AQ.resolutions[ctx.state];
  const req = ctx.state === 'matching' ? matchingRequested() : r.requested;
  const reqLink = ctx.state === 'matching' ? AQ.requests['spotify-soda'] : (AQ.requests[r.requestId] || { canonical: r.requestedLink, kind: `${req.service} link` });
  const left = h('div', { class: 'sources-col sources-col--main' }, [requested(req, reqLink)]);
  const right = h('div', { class: 'sources-col sources-col--side' });
  const body = { matching, exact: candidatesView, probable: candidatesView, ambiguous: candidatesView, 'no-match': noMatch, 'adapter-unavailable': unavailable, 'blocked-access': blocked }[ctx.state];
  right.append(...body(ctx, r, req, live));
  if (r?.explanation && ctx.state !== 'no-match') (ctx.orientation === 'landscape' ? left : right).append(note('info', [h('strong', { text: 'Why: ' }), r.explanation]));
  if (r?.explanation && ctx.state === 'no-match') right.firstElementChild?.insertBefore(note('info', [h('strong', { text: 'Why: ' }), r.explanation]), right.firstElementChild.children[2] || null);
  return [head, h('div', { class: 'sources-body sources-resolve__body' }, [left, right]), live];
}

function matchingRequested() {
  const c = AQ.requests['spotify-soda'].catalog;
  return { service: 'Spotify', title: c.title, artist: c.artist, durationSec: c.durationSec, explicit: c.explicit, version: c.version };
}

// ---------- requested identity (compact: the comparison below is the decision) ----------
function requested(req, link) {
  const spotify = req.service === 'Spotify';
  return h('section', { class: 'sources-panel sources-requested raised', 'aria-labelledby': 'sources-req-t' }, [
    h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'label', text: 'Requested' }), h('span', { class: 'flag label tone-neutral' }, [icon('link', { size: 11 }), h('span', { text: `Your ${req.service} link` })])]),
    h('h2', { id: 'sources-req-t', class: 'title sources-requested__title wrap-2', text: req.title }),
    h('p', { class: 'body muted', text: req.artist === 'unknown' ? 'Artist unknown' : req.artist }),
    h('dl', { class: 'sources-reqline' }, [
      reqFact('Duration', h('span', { class: 'numeral', text: `${dur(req.durationSec)}${req.durationSec != null && spotify ? ' catalog' : ''}` })),
      reqFact('Explicit / clean', req.explicit),
      reqFact('Version', req.version),
    ]),
    h('p', { class: 'sources-hint' }, [h('span', { class: 'label', text: 'Link ' }), h('span', { class: 'sources-mono', text: link?.canonical || '—' })]),
    spotify
      ? h('mdj-provenance-tag', { kind: 'restricted', label: 'Spotify catalog fields · kept out of ParDay', size: 'sm' })
      : h('mdj-provenance-tag', { kind: 'user', label: 'Link you supplied', size: 'sm' }),
  ]);
}
function reqFact(k, v) { return h('div', { class: 'sources-reqline__f' }, [h('dt', { class: 'label', text: k }), h('dd', {}, [].concat(v))]); }

function fact(k, v) { return h('div', { class: 'sources-facts__row' }, [h('dt', { class: 'label', text: k }), h('dd', {}, [].concat(v))]); }

// ---------- matching (RESOLVING) ----------
function matching(ctx) {
  const m = AQ.matching;
  const marks = { done: ['check', 'done'], current: ['loader', 'in progress'], todo: ['clock', 'to do'] };
  return [h('section', { class: 'sources-panel raised sources-matching', 'aria-labelledby': 'sources-match-t' }, [
    h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'label', text: 'Actual source' }), stateTag(m.jobState)]),
    h('h2', { id: 'sources-match-t', class: 'title sources-h2', text: 'Not known yet — searching' }),
    h('div', { class: 'sources-fixture-box' }, [
      h('ol', { class: 'sources-steplist' }, m.steps.map((s) => h('li', { class: `sources-steplist__item sources-steplist__item--${s.mark}`, 'aria-label': `${s.label}, ${marks[s.mark][1]}. ${s.detail}` }, [
        h('span', { class: 'sources-steplist__mark', 'aria-hidden': 'true' }, [icon(marks[s.mark][0], { size: 12 })]),
        h('span', { class: 'sources-steplist__text' }, [h('span', { class: 'sources-steplist__t', text: s.label }), h('span', { class: 'sources-hint', text: s.detail })]),
      ]))),
      h('p', { class: 'sources-unknown', role: 'status' }, [h('span', { class: 'sources-unknown__bar', 'aria-hidden': 'true' }), h('span', { text: `Progress unknown — the search reports no units. Started ${m.startedAt}.` })]),
      h('mdj-fixture-mark', { for: 'resolver steps' }),
    ]),
    note('lock', 'Matching uses titles, artists, versions and durations — no AI, and no Spotify audio.'),
    h('div', { class: 'sources-actions' }, [
      button({ label: 'Cancel resolving', icon: 'cancel', cls: 'btn--danger', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/add', { state: 'pasted-link' }) } }),
    ]),
    h('div', { class: 'sources-fixturestep' }, [
      h('p', { class: 'sources-hint', text: 'Prototype only: no resolver runs. This step reveals the fixture answer.' }),
      button({ label: SHOW_ANSWER, icon: 'fixture', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => ctx.setState('ambiguous') } }),
    ]),
  ])];
}

// ---------- exact / probable / ambiguous ----------
function candidatesView(ctx, r, req, live) {
  const cards = r.candidates.map((c) => candidate(ctx, r, c, req, live));
  const head = h('p', { class: 'sources-panel__kicker sources-cands__kicker' }, [
    h('span', { class: 'label', text: `Actual source · ${r.candidates.length} candidate${r.candidates.length > 1 ? 's' : ''}` }), stateTag(r.jobState, r.class === 'exact' ? 'ok' : 'warning'),
  ]);
  const out = [head, h('div', { class: `sources-cands sources-cands--${cards.length}`, role: 'list', 'aria-label': 'Candidates' }, cards)];
  if (r.class === 'ambiguous') out.push(note('warning', 'A matching title alone cannot approve a substitute. Nothing downloads until you choose one recording.', 'warning'));
  if (r.class === 'probable') out.push(note('info', 'Confirming lets the download start. Cues, grids and saved loops attach only after the file is verified — and never from a different edit.'));
  out.push(statusQuad(adapter('yt-device').statuses, { title: 'YouTube extractor · on-device — four statuses' }));
  return out;
}

function candidate(ctx, r, c, req, live) {
  const diff = req.durationSec != null && c.durationSec != null ? c.durationSec - req.durationSec : null;
  const diffText = diff == null ? '' : diff === 0 ? 'same as requested' : `${diff > 0 ? '+' : '−'}${dur(Math.abs(diff))} vs requested`;
  const short = c.title.match(/\(([^)]+)\)/)?.[1]?.replace(' Mix', '') || c.title;
  const actions = [];
  const previewOut = h('p', { class: 'sources-hint sources-cand__out', role: 'status' });
  if (c.class !== 'different') {
    actions.unshift(button({ label: 'Preview', icon: 'preview', cls: 'btn--secondary', fr: ['FR-049'], attrs: { 'aria-label': `Preview ${c.title}` }, on: { click: () => { previewOut.textContent = `Preview would stream 30 s of ${c.title} from ${c.source} without saving it. This prototype has no audio.`; } } }));
  }
  if (r.class === 'ambiguous') {
    actions.push(button({ label: `Choose ${short}`, icon: 'check', cls: 'btn--primary', fr: ['FR-049'], on: { click: () => { handoff.format = null; ctx.navigate('sources/format', { state: 'options' }); } } }));
  } else if (r.class === 'exact') {
    actions.push(button({ label: 'Choose format', icon: 'chevron-right', cls: 'btn--primary', fr: ['FR-049'], on: { click: () => { handoff.format = null; ctx.navigate('sources/format', { state: 'unknown-bitrate' }); } } }));
  } else if (r.class === 'probable' && c.class === 'probable') {
    actions.push(button({ label: 'Confirm this recording', icon: 'check', cls: 'btn--primary', fr: ['FR-049'], on: { click: () => { handoff.format = 'marlin'; live.textContent = 'Recording confirmed. Choose a format next.'; ctx.navigate('sources/format', { state: 'options' }); } } }));
  }
  actions.reverse(); // the choice first, Preview second
  return h('article', { class: `sources-cand raised sources-cand--${c.class}`, role: 'listitem', 'aria-labelledby': `sources-cand-${c.id}` }, [
    h('div', { class: 'sources-cand__top' }, [classFlag(c.class)]),
    h('h3', { id: `sources-cand-${c.id}`, class: 'title sources-cand__title wrap-2', text: c.title }),
    h('p', { class: 'sources-cand__key' }, [h('span', { class: 'numeral sources-cand__dur', text: dur(c.durationSec) }), diffText ? h('span', { class: 'sources-hint', text: ` ${diffText}` }) : null]),
    actions.length ? h('div', { class: 'sources-cand__actions' }, actions) : null,
    previewOut,
    h('p', { class: 'sources-hint sources-cand__src' }, [icon('video', { size: 12 }), h('span', { text: `${c.source} · ${c.uploader}` })]),
    h('dl', { class: 'sources-cand__facts' }, [
      fact('Explicit / clean', c.explicit),
      fact('Media ID', h('span', { class: 'sources-mono', text: c.mediaId })),
    ]),
    h('div', { class: 'sources-evidence' }, [
      h('p', { class: 'label', text: 'Edition evidence' }),
      h('ul', { class: 'sources-bullets' }, c.evidence.map((e) => h('li', { text: e }))),
    ]),
  ]);
}

// ---------- no match ----------
function noMatch(ctx, r, req, live) {
  const out = h('p', { class: 'sources-hint', role: 'status' });
  return [
    h('section', { class: 'sources-panel raised sources-result--critical', 'aria-labelledby': 'sources-nomatch-t' }, [
      h('p', { class: 'sources-panel__kicker' }, [classFlag('none'), stateTag(r.jobState, 'critical')]),
      h('h2', { id: 'sources-nomatch-t', class: 'title sources-h2', text: `${r.checked.length} candidates checked — none is this recording` }),
      h('ul', { class: 'sources-checked' }, r.checked.map((c) => h('li', { class: 'sources-checked__item' }, [
        h('span', { class: 'sources-checked__t' }, [h('span', { class: 'title', text: c.title }), h('span', { class: 'numeral', text: ` ${dur(c.durationSec)}` })]),
        h('span', { class: 'sources-hint', text: `${c.uploader} · ${c.why}` }),
        classFlag('different'),
      ]))),
      h('p', { class: 'label', text: 'What you can do' }),
      h('div', { class: 'sources-actions sources-actions--wrap' }, [
        button({ label: 'Search library', icon: 'search', cls: 'btn--secondary', fr: ['FR-004'], attrs: { 'aria-label': 'Search your library by title' }, on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
        button({ label: 'Import files', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], attrs: { 'aria-label': 'Import a file you already have' }, on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
        button({ label: 'Save as bookmark', icon: 'pin', cls: 'btn--ghost', fr: ['FR-049'], on: { click: () => { out.textContent = 'Saved as a discovery bookmark (fixture). A bookmark is not a file and never shows as Ready.'; } } }),
      ]),
      out,
    ]),
  ];
}

// ---------- adapter unavailable ----------
function unavailable(ctx, r) {
  const a = adapter('yt-device');
  const statuses = { ...a.statuses, technical: { word: 'Unverified — not enabled', tone: 'neutral', why: 'Update failed the fixture check; rolled back and off' } };
  const out = h('p', { class: 'sources-hint', role: 'status' });
  return [
    h('section', { class: 'sources-panel raised sources-result--warning', 'aria-labelledby': 'sources-unav-t' }, [
      h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'flag label tone-neutral' }, [icon('unavailable', { size: 12 }), h('span', { text: 'Adapter not enabled' })]), stateTag(r.jobState, 'warning')]),
      h('h2', { id: 'sources-unav-t', class: 'title sources-h2', text: r.adapterLine }),
      h('p', { class: 'body', text: r.why }),
      h('p', { class: 'label', text: 'What still works' }),
      h('div', { class: 'sources-actions sources-actions--wrap' }, [
        button({ label: 'Import files', icon: 'import', cls: 'btn--primary', fr: ['FR-002'], attrs: { 'aria-label': 'Import a file you already have' }, on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
        button({ label: 'Open in browser', icon: 'external', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => { out.textContent = 'Would hand the link to the browser. That is a handoff, not an in-app download; nothing was opened in this prototype.'; } } }),
        button({ label: 'Keep link for later', icon: 'pin', cls: 'btn--ghost', fr: ['FR-049'], on: { click: () => { out.textContent = 'Link kept (fixture). It resolves when the adapter is re-enabled; nothing is queued.'; } } }),
      ]),
      out,
      note('info', 'No server setup is offered as a fix: the local app does not need one.'),
    ]),
    statusQuad(statuses, { title: 'YouTube extractor · on-device — four statuses' }),
  ];
}

// ---------- blocked access ----------
function blocked(ctx, r) {
  const a = adapter('yt-device');
  const out = h('p', { class: 'sources-hint', role: 'status' });
  return [
    h('section', { class: 'sources-panel raised sources-result--critical', 'aria-labelledby': 'sources-block-t' }, [
      h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'flag label tone-critical' }, [icon('login-required', { size: 12 }), h('span', { text: 'Login required' })]), stateTag(r.jobState, 'critical')]),
      h('h2', { id: 'sources-block-t', class: 'title sources-h2', text: r.blockedLine }),
      h('p', { class: 'body', text: r.why }),
      h('div', { class: 'sources-actions sources-actions--wrap' }, [
        button({ label: 'Open in browser', icon: 'external', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => { out.textContent = 'Would open the page in the browser, where you can watch it as a member. That does not download it into the app.'; } } }),
        button({ label: 'Import files', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], attrs: { 'aria-label': 'Import a file you already have' }, on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
        button({ label: 'Remove request', icon: 'trash', cls: 'btn--ghost', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/add', { state: 'idle' }) } }),
      ]),
      out,
    ]),
    statusQuad({ ...a.statuses, access: { word: 'Blocked · login required', tone: 'critical', why: 'Members-only; no credential is requested' } }, { title: 'This request — four statuses' }),
    h('section', { class: 'sources-panel raised sources-result--warning', 'aria-labelledby': 'sources-rate-t' }, [
      h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'flag label tone-warning' }, [icon('rate-limit', { size: 12 }), h('span', { text: 'Also waiting' })]), stateTag(r.rateLimited.jobState, 'warning')]),
      h('h2', { id: 'sources-rate-t', class: 'title sources-h2', text: `${r.rateLimited.title} · ${r.rateLimited.line}` }),
      h('p', { class: 'body', text: r.rateLimited.detail }),
      button({ label: 'Open download queue', icon: 'queue', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/queue', { state: 'retry-wait' }) } }),
    ]),
  ];
}

// ---------- playlist: choose the set ----------
function collection(ctx, live) {
  const col = AQ.collection;
  const req = AQ.requests[col.requestId];
  const view = { checked: new Set(col.items.filter((i) => i.class !== 'ambiguous').map((i) => i.n)), choice: {} };
  const list = h('ol', { class: 'sources-coll', 'aria-label': `${col.name}, ${col.count} tracks in playlist order` });
  const foot = h('div', { class: 'sources-coll__foot' });

  function paint() {
    list.replaceChildren(...col.items.map((it) => {
      const id = `sources-coll-${it.n}`;
      const needsChoice = it.class === 'ambiguous' && !view.choice[it.n];
      const box = h('input', { id, type: 'checkbox', class: 'sources-coll__check', checked: view.checked.has(it.n) ? true : null, disabled: needsChoice ? true : null, 'aria-describedby': `${id}-d`, 'aria-label': `Download ${it.title}` });
      box.addEventListener('change', () => { if (box.checked) view.checked.add(it.n); else view.checked.delete(it.n); paint(); live.textContent = `${view.checked.size} of ${col.count} selected`; });
      const choices = it.choices ? h('div', { class: 'sources-coll__choices', role: 'group', 'aria-label': `Version for ${it.title}` }, it.choices.map((c) => button({
        label: c, cls: `btn--secondary${view.choice[it.n] === c ? ' is-chosen' : ''}`, fr: ['FR-049'], attrs: { 'aria-label': `${it.title}: choose ${c}`, 'aria-pressed': String(view.choice[it.n] === c) },
        on: { click: () => { view.choice[it.n] = c; view.checked.add(it.n); paint(); live.textContent = `${it.title}: ${c} chosen`; } },
      }))) : null;
      return h('li', { class: `sources-coll__item raised${view.checked.has(it.n) ? ' is-checked' : ''}` }, [
        h('span', { class: 'numeral sources-coll__n', text: String(it.n) }),
        h('label', { class: 'sources-coll__box', dataset: { hit: '48', fr: 'FR-049' } }, [box]),
        h('span', { class: 'sources-coll__text' }, [
          h('span', { class: 'title sources-coll__title', text: `${it.title} — ${it.artist}` }),
          h('span', { id: `${id}-d`, class: 'sources-hint' }, [h('span', { class: 'numeral', text: dur(it.durationSec) }), ` (catalog) · ${view.choice[it.n] ? `${view.choice[it.n]} chosen` : it.candidate}`]),
        ]),
        classFlag(it.class === 'ambiguous' && view.choice[it.n] ? 'probable' : it.class),
        choices,
      ]);
    }));
    const n = view.checked.size;
    const pending = col.items.filter((i) => i.class === 'ambiguous' && !view.choice[i.n]).length;
    foot.replaceChildren(
      h('p', { class: 'body', role: 'status' }, [h('strong', { class: 'numeral', text: `${n} of ${col.count}` }), ` selected${pending ? ` · ${pending} needs a version choice` : ''} · downloads keep playlist order`]),
      note('info', 'Probable matches are confirmed by choosing them here; cues attach only after each file is verified.'),
      button({ label: `Choose format for ${n} tracks`, icon: 'chevron-right', hit: 56, cls: 'btn--primary', fr: ['FR-049'], attrs: n ? {} : { disabled: true }, on: { click: () => { handoff.format = 'collection'; ctx.navigate('sources/format', { state: 'options' }); } } }),
    );
  }
  paint();

  const landscape = ctx.orientation === 'landscape';
  foot.classList.add('sources-panel', 'raised');
  const left = h('div', { class: 'sources-col sources-col--main' }, [
    h('section', { class: 'sources-panel sources-requested raised', 'aria-labelledby': 'sources-pl-t' }, [
      h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'label', text: 'Requested' }), h('span', { class: 'flag label tone-neutral' }, [icon('playlist', { size: 11 }), h('span', { text: req.kind })])]),
      h('h2', { id: 'sources-pl-t', class: 'title sources-requested__title', text: col.name }),
      h('p', { class: 'body' }, [h('strong', { class: 'numeral', text: `${col.count} tracks` }), ` · ${col.enumerated}`]),
      h('p', { class: 'sources-hint' }, [h('span', { class: 'label', text: 'Link ' }), h('span', { class: 'sources-mono', text: req.canonical })]),
      h('mdj-provenance-tag', { kind: 'restricted', label: 'Spotify playlist fields · kept out of ParDay', size: 'sm' }),
    ]),
    landscape ? foot : null,
  ]);
  const right = h('div', { class: 'sources-col sources-col--side' }, [
    h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'label', text: 'Playlist order · each track resolved on its own' }), stateTag('AWAITING_SELECTION', 'warning')]),
    list,
    landscape ? null : foot,
  ]);
  return h('div', { class: 'sources-body sources-resolve__body' }, [left, right]);
}
