// sources/add — the Add music sheet (Document 16 §4: Paste link, Receive share, Import files, Download
// queue; Document 03 §3 "Discover and download"; FR-049, FR-002). Shell screen, dock in both orientations:
// transport, crossfader, route and master stay reachable while adding music.
//
// No clipboard polling: Paste reads the clipboard only when tapped (the prototype fills a fixture link).
// A share from another app arrives as a request to review; nothing downloads until the person chooses.
// Each adapter prints its four statuses separately (technical / service access / content use /
// distribution); they are planning positions from Document 16, not test results.
//
// States
//   idle              empty link field, the four ways to add, adapter list
//   pasted-link       Paste → a recognised Spotify track link, canonicalised (DLA-01) → Resolve
//   share-received    a YouTube link shared from the YouTube app → Resolve (exact media)
//   unsupported-link  an Apple Music link: specific reason + working alternatives
//   offline           offline scenario: resolving/downloading wait for a network; local import works
import { register } from '../../app/registry.js';
import { h, icon, button } from '../../components/base.js';
import { AQ, withData, sourcesHead, statusQuad, note } from './index.js';

const FR = ['FR-049', 'FR-002', 'FR-036'];
const PASTE_FOR = { 'pasted-link': 'spotify-soda', 'share-received': 'youtube-halcyon', 'unsupported-link': 'unsupported', offline: 'spotify-soda' };

register({
  id: 'sources/add',
  family: 'sources',
  title: 'Add music',
  order: 1,
  fr: FR,
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    idle: { label: 'Add music — paste, share, import, queue', exercised: true, scenario: 'set-ready' },
    'pasted-link': { label: 'Spotify link pasted and recognised', exercised: true, scenario: 'set-ready', via: { from: 'idle', control: 'Paste' } },
    'share-received': { label: 'Link received from a share', exercised: false, scenario: 'set-ready' },
    'unsupported-link': { label: 'Unsupported link — reason and alternatives', exercised: false, scenario: 'set-ready' },
    offline: { label: 'Offline — downloads wait, import works', exercised: false, scenario: 'offline' },
  },
  defaultState: 'idle',
  render(ctx) {
    const root = h('div', { class: `sources-page sources-add sources-add--${ctx.state}` });
    return withData(root, () => root.replaceChildren(...build(ctx)));
  },
});

function build(ctx) {
  const offline = ctx.state === 'offline' || ctx.session.network === 'offline';
  const head = sourcesHead(ctx, { title: 'Add music', step: 'add' });
  const main = h('div', { class: 'sources-col sources-col--main' }, [
    offline ? h('div', { class: 'sources-banner tone-neutral', role: 'status' }, [icon('wifi-off', { size: 16 }), h('span', { class: 'body' }, [h('strong', { text: 'Offline. ' }), 'Resolving links and downloading need a network. Import files still works, and everything on this phone keeps playing.'])]) : null,
    intake(ctx, offline),
  ]);
  const side = h('div', { class: 'sources-col sources-col--side' }, [routes(ctx, offline), adapters()]);
  return [head, h('div', { class: 'sources-body sources-add__body' }, [main, side])];
}

// ---------- paste / share intake ----------
function intake(ctx, offline) {
  const reqId = PASTE_FOR[ctx.state];
  const req = reqId ? AQ.requests[reqId] : null;
  const shown = ctx.state === 'idle' ? '' : (req?.pasted || '');
  const input = h('input', {
    id: 'sources-link', class: 'sources-field__input', type: 'url', inputmode: 'url', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'https://…', value: shown, dataset: { hit: '48', fr: 'FR-049' }, 'aria-describedby': 'sources-link-hint',
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const v = input.value.toLowerCase();
    if (v.includes('spotify.com')) ctx.setState('pasted-link');
    else if (v.includes('youtu')) ctx.setState('share-received');
    else if (v.trim()) ctx.setState('unsupported-link');
  });
  const field = h('div', { class: 'sources-field' }, [
    h('label', { class: 'label label-strong sources-field__label', for: 'sources-link', text: 'Link to resolve' }),
    h('div', { class: 'sources-field__row' }, [
      input,
      button({ label: 'Paste', icon: 'paste', cls: 'btn--secondary sources-field__paste', fr: ['FR-049'], on: { click: () => ctx.setState('pasted-link') } }),
    ]),
    h('p', { id: 'sources-link-hint', class: 'sources-hint', text: 'Spotify, YouTube or a direct audio file link. Paste reads the clipboard only when you tap it — the app never watches the clipboard.' }),
  ]);

  let result = null;
  if (ctx.state === 'idle') result = kinds();
  else if (ctx.state === 'pasted-link' || ctx.state === 'offline') result = recognised(ctx, req, offline);
  else if (ctx.state === 'share-received') result = shared(ctx, req);
  else if (ctx.state === 'unsupported-link') result = unsupported(ctx, req);

  return h('section', { class: 'sources-panel glass', 'aria-labelledby': 'sources-intake-t' }, [
    h('div', { class: 'ink-backing sources-pad' }, [
      h('h2', { id: 'sources-intake-t', class: 'sources-h2' }, [icon('link', { size: 16 }), h('span', { text: ctx.state === 'share-received' ? 'Received from a share' : 'Paste link' })]),
      ctx.state === 'share-received' ? null : field,
      result,
    ]),
  ]);
}

function kinds() {
  const rows = [
    ['music', 'Spotify track, album or playlist', 'Looks up the catalog entry, then searches for a playable recording elsewhere. Audio is never taken from Spotify.'],
    ['video', 'YouTube video', 'Uses the on-device extractor — an unofficial adapter. Its restrictions are shown before you download.'],
    ['download', 'Direct audio file', 'Transfers the file itself, then checks the bytes are really audio.'],
  ];
  return h('ul', { class: 'sources-kinds', 'aria-label': 'Link types the app recognises' }, rows.map(([ic, t, d]) => h('li', { class: 'sources-kind raised' }, [
    h('span', { class: 'sources-kind__icon', 'aria-hidden': 'true' }, [icon(ic, { size: 16 })]),
    h('span', { class: 'sources-kind__text' }, [h('span', { class: 'title sources-kind__t', text: t }), h('span', { class: 'sources-hint', text: d })]),
  ])));
}

function recognised(ctx, req, offline) {
  return h('div', { class: 'sources-result sources-result--ok raised', role: 'status' }, [
    h('p', { class: 'sources-result__head' }, [h('span', { class: 'flag label tone-ok' }, [icon('check', { size: 12 }), h('span', { text: `Recognised · ${req.kind}` })])]),
    h('dl', { class: 'sources-facts' }, [
      row('Canonical ID', h('span', { class: 'sources-mono', text: req.canonical })),
      row('Cleaned', req.removed),
      row('Route', 'Spotify catalog lookup → YouTube extractor search. You review the match before anything downloads.'),
    ]),
    offline
      ? h('div', { class: 'sources-actions' }, [
        button({ label: 'Resolve', icon: 'link', hit: 56, cls: 'btn--primary', fr: ['FR-049'], attrs: { disabled: true, 'aria-describedby': 'sources-offline-why' } }),
        h('p', { id: 'sources-offline-why', class: 'sources-hint', text: 'Resolve needs a network. The link stays here; nothing is queued yet.' }),
      ])
      : h('div', { class: 'sources-actions' }, [
        button({ label: 'Resolve', icon: 'link', hit: 56, cls: 'btn--primary', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/resolve', { state: 'matching' }) } }),
        button({ label: 'Clear link', icon: 'x', cls: 'btn--ghost', fr: ['FR-049'], on: { click: () => ctx.setState('idle') } }),
      ]),
  ]);
}

function shared(ctx, req) {
  return h('div', { class: 'sources-result sources-result--ok raised', role: 'status' }, [
    h('p', { class: 'sources-result__head' }, [h('span', { class: 'flag label tone-info' }, [icon('share-in', { size: 12 }), h('span', { text: req.shareFrom })])]),
    h('blockquote', { class: 'sources-quote', text: req.shareText }),
    h('dl', { class: 'sources-facts' }, [
      row('Link found', h('span', { class: 'sources-mono', text: req.pasted })),
      row('Canonical ID', h('span', { class: 'sources-mono', text: req.canonical })),
      row('Cleaned', req.removed),
    ]),
    note('info', 'A share only brings the link here. Nothing is resolved or downloaded until you tap Resolve.'),
    h('div', { class: 'sources-actions' }, [
      button({ label: 'Resolve', icon: 'link', hit: 56, cls: 'btn--primary', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/resolve', { state: 'exact' }) } }),
      button({ label: 'Discard share', icon: 'x', cls: 'btn--ghost', fr: ['FR-049'], on: { click: () => ctx.setState('idle') } }),
    ]),
  ]);
}

function unsupported(ctx, req) {
  return h('div', { class: 'sources-result sources-result--critical raised', role: 'alert' }, [
    h('p', { class: 'sources-result__head' }, [h('span', { class: 'flag label tone-critical' }, [icon('blocked', { size: 12 }), h('span', { text: `Not supported · ${req.kind}` })])]),
    h('p', { class: 'body', text: req.reason }),
    h('p', { class: 'label', text: 'What you can do instead' }),
    h('div', { class: 'sources-actions sources-actions--wrap' }, [
      button({ label: 'Import files', icon: 'import', cls: 'btn--primary', fr: ['FR-002'], attrs: { 'aria-label': 'Import a file you already have' }, on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
      button({ label: 'Search library', icon: 'search', cls: 'btn--secondary', fr: ['FR-004'], attrs: { 'aria-label': 'Search your library by title' }, on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
      button({ label: 'Clear link', icon: 'x', cls: 'btn--ghost', fr: ['FR-049'], attrs: { 'aria-label': 'Clear link and paste a different one' }, on: { click: () => ctx.setState('idle') } }),
    ]),
  ]);
}

function row(k, v) { return h('div', { class: 'sources-facts__row' }, [h('dt', { class: 'label', text: k }), h('dd', {}, [].concat(v))]); }

// ---------- the four ways to add ----------
function routes(ctx, offline) {
  const jobs = Object.entries(AQ.jobs).filter(([id]) => id !== 'soda').map(([, j]) => j);
  const active = jobs.filter((j) => !['COMPLETED', 'CANCELLED', 'FAILED', 'BLOCKED'].includes(j.jobState)).length;
  const attention = jobs.filter((j) => ['FAILED', 'BLOCKED'].includes(j.jobState)).length;
  const queueNote = offline ? `${active} waiting for a network · ${attention} need attention` : `${active} in progress or waiting · ${attention} need attention`;
  const routeBtn = (id, ic, title, detail, onClick, extra = null) => h('button', {
    type: 'button', class: 'sources-route raised', dataset: { hit: '56', fr: id === 'import' ? 'FR-002' : 'FR-049' }, 'aria-labelledby': `sources-route-${id}`, 'aria-describedby': `sources-route-${id}-d`, on: { click: onClick },
  }, [
    h('span', { class: 'sources-route__icon brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'sources-route__face titanium-radial' }, [icon(ic, { size: 18 })])]),
    h('span', { class: 'sources-route__text' }, [h('span', { id: `sources-route-${id}`, class: 'title sources-route__t', text: title }), h('span', { id: `sources-route-${id}-d`, class: 'sources-hint', text: detail })]),
    extra,
    icon('chevron-right', { size: 16 }),
  ]);
  return h('section', { class: 'sources-routes', 'aria-labelledby': 'sources-routes-t' }, [
    h('h2', { id: 'sources-routes-t', class: 'label sources-label', text: 'Other ways to add' }),
    h('div', { class: 'sources-route sources-route--static raised' }, [
      h('span', { class: 'sources-route__icon brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'sources-route__face titanium-radial' }, [icon('share-in', { size: 18 })])]),
      h('span', { class: 'sources-route__text' }, [
        h('span', { class: 'title sources-route__t', text: 'Receive share' }),
        h('span', { class: 'sources-hint', text: 'In Spotify or YouTube tap Share → Mobile DJ. The link arrives here for you to review.' }),
      ]),
    ]),
    routeBtn('import', 'import', 'Import files', 'Music already on this phone. Works offline.', () => ctx.navigate('launch/import', { state: 'picker' })),
    routeBtn('queue', 'queue', 'Download queue', queueNote, () => ctx.navigate('sources/queue', { state: 'active' }),
      h('mdj-badge', { count: String(active + attention), label: 'downloads' })),
  ]);
}

// ---------- adapters with their four statuses ----------
function adapters() {
  const items = AQ.adapters.map((a) => h('li', { class: `sources-adapter raised${a.enabled ? '' : ' sources-adapter--off'}` }, [
    h('div', { class: 'sources-adapter__head' }, [
      h('span', { class: 'title sources-adapter__name', text: a.name }),
      h('span', { class: `flag label ${a.official === 'Unofficial' ? 'tone-warning' : 'tone-neutral'}`, text: a.mechanism }),
      h('span', { class: `flag label ${a.enabled ? 'tone-info' : 'tone-neutral'}` }, [icon(a.enabled ? 'check' : 'x', { size: 11 }), h('span', { text: a.enabled ? 'On' : 'Not enabled' })]),
    ]),
    h('p', { class: 'sources-hint', text: a.handles }),
    statusQuad(a.statuses, { title: `${a.name} — four statuses`, compact: true }),
  ]));
  return h('section', { class: 'sources-adapters', 'aria-labelledby': 'sources-adapters-t' }, [
    h('div', { class: 'sources-adapters__head' }, [
      h('h2', { id: 'sources-adapters-t', class: 'label sources-label', text: `Adapters · ${AQ.adapters.length}` }),
      h('span', { class: 'sources-hint', text: 'Planning positions, not test results. No adapter is verified working.' }),
    ]),
    h('div', { class: 'sources-fixture-box' }, [h('ul', { class: 'sources-adapters__list' }, items), h('mdj-fixture-mark', { for: 'adapter statuses (Document 16 planning positions)' })]),
  ]);
}
