// route/readiness — the prepared-set readiness summary (Document 03 §3 "Prepared set": confirm offline
// availability and rights, route check; Document 19 §3 steps 1–3 and §4 "Readiness and routing"; FR-042
// diagnostics of audio route, storage, battery/thermal and source readiness; FR-001 offline core; FR-031
// recording storage estimate; FR-022 / FR-023 route and cue availability).
//
// One row per area — Media, Analysis, Storage, Battery and thermal, Route, Offline readiness, Source
// restrictions — each with a status word + shape (never colour alone), the facts in plain words and the
// row's next action. The verdict at the top says what plays, not just what is wrong.
//
// Honesty: media states come from fixtures/tracks.json; scenario facts (storage, thermal, network, route,
// recording) from fixtures/sessions.json; set lists, battery and the recording-size rate from
// fixtures/routing.json. Battery and thermal readings and the recording estimate are fixtures and carry a
// FIXTURE mark. No percentage is invented: the battery figure is the fixture's own value.
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { load } from '../../app/fixtures.js';

const data = await load('routing'); // fixtures/routing.json (cached; main.js awaits screen modules)

const AVAIL_WORD = { ready: 'On this phone', missing: 'Missing', 'permission-missing': 'Access revoked', unsupported: 'Unsupported', discovered: 'Not downloaded' };
const AVAIL_SHAPE = { ready: 'full', missing: 'cross', 'permission-missing': 'question', unsupported: 'cross', discovered: 'ring' };

register({
  id: 'route/readiness', family: 'routing', title: 'Set readiness', order: 2,
  fr: ['FR-042', 'FR-001', 'FR-002', 'FR-022', 'FR-023', 'FR-031'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    ready: { label: 'Ready — prepared set on this phone', exercised: true, scenario: 'set-ready' },
    'missing-media': { label: 'Missing media — one track in the set', exercised: false, scenario: 'missing-media' },
    'low-storage': { label: 'Low storage — recording stopped', exercised: false, scenario: 'low-storage' },
    offline: { label: 'Offline — set plays, downloads and ParDay wait', exercised: false, scenario: 'offline' },
    hot: { label: 'Hot — optional work paused', exercised: false, scenario: 'hot' },
    'restricted-source': { label: 'Restricted source — recording eligibility unknown', exercised: false, scenario: 'set-ready' },
  },
  defaultState: 'ready',
  render(ctx) {
    const state = ctx.state;
    const s = ctx.session;
    const setKey = state === 'restricted-source' ? 'restricted' : (s.session?.id && data.sets[s.session.id] ? s.session.id : 'sess-1');
    const set = data.sets[setKey];
    const tracks = set.trackIds.map((id) => ctx.fixtures.track(id)).filter(Boolean);
    const available = tracks.filter((t) => t.availability === 'ready');
    const missingInSet = tracks.filter((t) => t.availability !== 'ready');
    const pendingInSet = tracks.filter((t) => t.analysis === 'pending');
    const restricted = tracks.find((t) => t.id === data.restriction.trackId);
    const route = s.route;
    const routeHasCue = route.cue !== 'none' && route.status === 'ok';

    // ---- verdict ----
    const V = {
      ready: { word: 'Ready to play', tone: 'ok', shape: 'full', text: `All ${tracks.length} tracks in this set are on this phone. Notes: the route has no cue, and 1 track is still being analysed.` },
      'missing-media': { word: 'Needs attention', tone: 'warning', shape: 'half', text: `${missingInSet.length} of ${tracks.length} tracks is missing. The other ${available.length} play normally; locate the file or continue without it.` },
      'low-storage': { word: 'Recording stopped', tone: 'critical', shape: 'cross', text: `Storage is low: ${fmt.bytes(s.storage.freeBytes)} free. Playback is unaffected; the recording stopped and its segments are kept.` },
      offline: { word: 'Ready offline', tone: 'ok', shape: 'full', text: 'No network. This set plays from the phone; downloads wait and ParDay is local only.' },
      hot: { word: 'Playing · optional work paused', tone: 'warning', shape: 'half', text: 'The phone is hot. Optional analysis and ParDay are paused; the decks you hear are protected.' },
      'restricted-source': { word: 'Ready · recording restricted', tone: 'warning', shape: 'half', text: 'Every track plays. One track has unknown recording eligibility, so Record is unavailable while it is audible.' },
    }[state] || {};

    const head = h('section', { class: `routing-verdict raised routing-lead--${V.tone}`, 'aria-labelledby': 'routing-verdict-title' }, [
      h('p', { class: 'routing-eyebrow label' }, [h('span', { text: 'Set readiness' })]),
      h('h2', { id: 'routing-verdict-title', class: 'routing-verdict__set title', text: set.name }),
      h('p', { class: `routing-verdict__word tone-${V.tone} label`, role: 'status' }, [h('span', { class: `routing-shape routing-shape--${V.shape}`, 'aria-hidden': 'true' }), h('span', { text: V.word })]),
      h('p', { class: 'routing-verdict__text body', text: V.text }),
    ]);

    const rows = [];

    // ---- Media ----
    {
      const lib = librarySummary(ctx);
      const st = missingInSet.length ? { word: `${missingInSet.length} missing`, tone: 'warning', shape: 'cross' } : { word: `${available.length} of ${tracks.length} ready`, tone: 'ok', shape: 'full' };
      const actions = [];
      const locate = (t) => button({ label: 'Locate file', icon: 'folder', fr: ['FR-002'], cls: missingInSet.includes(t) ? 'btn--primary' : 'btn--secondary', on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } });
      const setList = h('ul', { class: 'routing-setlist', 'aria-label': `Tracks in ${set.name}` }, tracks.map((t) => h('li', { class: `routing-setlist__item routing-setlist__item--${t.availability}` }, [
        h('span', { class: `routing-shape routing-shape--${AVAIL_SHAPE[t.availability] || 'question'}`, 'aria-hidden': 'true' }),
        h('span', { class: 'routing-setlist__title body wrap-2', text: t.title }),
        h('span', { class: 'routing-setlist__state label', text: AVAIL_WORD[t.availability] || t.availability }),
      ])));
      const missingNote = missingInSet.map((t) => h('p', { class: 'body routing-row-note' }, [h('strong', { text: `${t.title}: ` }), t.missingNote || 'Not available on this phone.', ' Cues and crate entries are kept.']));
      if (missingInSet.length) for (const t of missingInSet) if (t.availability === 'missing') actions.push(locate(t));
      const libLine = h('div', { class: 'routing-lib' }, [
        h('p', { class: 'label routing-lib__title', text: 'Whole library' }),
        h('p', { class: 'numeral routing-lib__counts' }, [`ready ${lib.ready} · missing ${lib.missing.length} · permission ${lib.permission.length} · unsupported ${lib.unsupported.length}`]),
      ]);
      const libActions = [];
      if (!missingInSet.length) for (const t of lib.missing) libActions.push(locate(t));
      for (const t of lib.permission) libActions.push(button({ label: 'Restore access', icon: 'permission', fr: ['FR-002'], cls: 'btn--secondary', attrs: { 'aria-label': `Restore access, ${t.title}` }, on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }));
      for (const t of lib.unsupported) libActions.push(button({ label: 'Show in library', icon: 'library', fr: ['FR-003'], cls: 'btn--secondary', attrs: { 'aria-label': `Show in library, ${t.title}` }, on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }));
      libLine.appendChild(h('ul', { class: 'routing-lib__issues' }, [...lib.missing, ...lib.permission, ...lib.unsupported].map((t) => h('li', { class: 'body' }, [h('strong', { text: `${t.title}: ` }), t.missingNote || '']))));
      libLine.appendChild(h('div', { class: 'routing-row__actions' }, libActions));
      rows.push(row({ id: 'media', icon: 'library', title: 'Media', fr: 'FR-002', status: st, body: [h('p', { class: 'body', text: missingInSet.length ? `${available.length} of ${tracks.length} tracks in this set are on this phone.` : `All ${tracks.length} tracks in this set are on this phone.` }), ...missingNote, setList], actions, after: libLine }));
    }

    // ---- Analysis ----
    {
      const hot = s.thermal === 'hot';
      const st = pendingInSet.length ? { word: hot ? `${pendingInSet.length} paused` : `${pendingInSet.length} pending`, tone: hot ? 'warning' : 'info', shape: 'ring' } : { word: 'Complete', tone: 'ok', shape: 'full' };
      const body = pendingInSet.length
        ? pendingInSet.map((t) => h('p', { class: 'body' }, [h('strong', { text: `${t.title}: ` }), hot ? 'analysis paused under thermal pressure. It plays; beat grid and overview wait.' : 'analysis pending. It plays; beat grid and overview are not ready yet.']))
        : [h('p', { class: 'body', text: 'Every track in this set has a beat grid and overview.' })];
      body.push(h('p', { class: 'body muted', text: 'Analysis progress is not shown here: the fixture gives no measurable units.' }));
      rows.push(row({ id: 'analysis', icon: 'analysis-pending', title: 'Analysis', fr: 'FR-042', status: st, body, actions: pendingInSet.length ? [button({ label: 'Open preparation', icon: 'edit', fr: ['FR-042'], cls: 'btn--secondary', on: { click: () => ctx.navigate('prep/track') } })] : [] }));
    }

    // ---- Storage ----
    {
      const free = s.storage.freeBytes;
      const mins = Math.floor(free / data.device.recordingBytesPerMin);
      const est = mins >= 120 ? `about ${Math.floor(mins / 60)} h` : `about ${mins} min`;
      const low = free < 1e9;
      const rec = s.recording || {};
      const st = rec.state === 'stopped-storage' ? { word: 'Recording stopped', tone: 'critical', shape: 'cross' } : low ? { word: 'Low', tone: 'warning', shape: 'half' } : { word: 'Enough', tone: 'ok', shape: 'full' };
      const body = [
        h('dl', { class: 'routing-facts' }, [
          fact('Free', fmt.bytes(free)),
          fact('Recording room', `${est} of ${data.device.recordingFormat}`),
        ]),
        h('p', { class: 'body muted', text: 'Estimate from a fixture rate; actual size depends on the music.' }),
      ];
      if (rec.state === 'stopped-storage') body.unshift(h('p', { class: 'body' }, [h('strong', { text: `Recording stopped at ${fmt.time(rec.elapsedSec)}. ` }), `${rec.recoveredSegments} recoverable segments are kept. The live mix kept playing.`]));
      rows.push(row({ id: 'storage', icon: 'storage', title: 'Storage', fr: 'FR-031', status: st, body, fixture: 'storage free and recording estimate', actions: rec.state === 'stopped-storage' ? [button({ label: 'Open recording', icon: 'rec', fr: ['FR-031'], cls: 'btn--primary', on: { click: () => ctx.navigate('rec/panel', { state: 'storage-full' }) } })] : [] }));
    }

    // ---- Battery and thermal ----
    {
      const th = s.thermal || 'normal';
      const st = th === 'hot' ? { word: 'Hot', tone: 'critical', shape: 'cross' } : th === 'warm' ? { word: 'Warm', tone: 'warning', shape: 'half' } : { word: 'Normal', tone: 'ok', shape: 'full' };
      const body = [
        h('dl', { class: 'routing-facts' }, [
          fact('Battery', `${data.device.batteryPct} %${data.device.charging ? ' · charging' : ' · not charging'}`),
          fact('Thermal', th === 'hot' ? 'Hot' : th === 'warm' ? 'Warm' : 'Normal'),
        ]),
        h('p', { class: 'body', text: th === 'hot' ? 'Optional analysis, stem preparation and ParDay are paused. Tempo, key, route and the decks you hear are not changed.' : th === 'warm' ? 'Warm. Nothing is paused yet; decorative effects may reduce first.' : 'No pressure. Plug in for long sets.' }),
      ];
      rows.push(row({ id: 'thermal', icon: th === 'normal' ? 'battery' : 'thermal', title: 'Battery and thermal', fr: 'FR-042', status: st, body, fixture: 'battery and thermal — not read from the device', actions: th === 'hot' ? [button({ label: 'Diagnostics', icon: 'info', fr: ['FR-042'], cls: 'btn--secondary', on: { click: () => ctx.navigate('system/diagnostics') } })] : [] }));
    }

    // ---- Route ----
    {
      const masterOnly = route.cue === 'none';
      const st = route.status === 'lost' ? { word: 'Output lost', tone: 'critical', shape: 'cross' } : route.status === 'unsupported' ? { word: 'Unverified', tone: 'warning', shape: 'question' } : masterOnly ? { word: 'Master only', tone: 'warning', shape: 'half' } : { word: 'Master + cue', tone: 'ok', shape: 'full' };
      const body = [
        h('p', { class: 'body' }, [h('strong', { text: `${route.name}. ` }), route.summary]),
        h('dl', { class: 'routing-facts' }, [
          fact('Master', route.master),
          fact('Cue', masterOnly ? 'none' : `${route.cue}${route.verified ? ' · map checked (fixture)' : ' · unverified'}`),
        ]),
      ];
      if (!routeHasCue) body.push(h('p', { class: 'body muted', text: 'Master playback is available. Cue buttons select but do not monitor; headphone cue needs a splitter or a 4-output interface.' }));
      rows.push(row({ id: 'route', icon: route.kind === 'bluetooth' ? 'bluetooth' : route.kind === 'usb' ? 'usb' : 'speaker', title: 'Route', fr: 'FR-023', status: st, body, actions: [button({ label: 'Check route', icon: 'route', fr: ['FR-022', 'FR-023'], cls: state === 'ready' ? 'btn--primary' : 'btn--secondary', on: { click: () => ctx.navigate('route/check', { state: route.id }) } })] }));
    }

    // ---- Offline readiness ----
    {
      const off = s.network === 'offline';
      const st = off ? { word: 'Offline now', tone: 'neutral', shape: 'ring' } : { word: 'Works offline', tone: 'ok', shape: 'full' };
      const body = [
        h('p', { class: 'body', text: 'Prepared set works offline; downloads and ParDay need network.' }),
        off ? h('p', { class: 'body' }, [h('strong', { text: 'Now: ' }), 'no network. Every track above plays from the phone. Downloads are waiting and ParDay is local only.']) : null,
      ].filter(Boolean);
      if (state === 'restricted-source' || setKey === 'restricted') body.push(h('p', { class: 'body muted', text: 'SODA LIGHTS (Radio Edit) is already downloaded, so it plays offline too.' }));
      rows.push(row({ id: 'offline', icon: off ? 'offline' : 'cloud-off', title: 'Offline readiness', fr: 'FR-001', status: st, body, actions: [] }));
    }

    // ---- Source restrictions ----
    {
      const inSet = !!restricted;
      const st = inSet ? { word: 'Recording restricted', tone: 'warning', shape: 'half' } : { word: 'None in this set', tone: 'ok', shape: 'full' };
      const body = inSet
        ? [h('p', { class: 'body' }, [h('strong', { text: data.restriction.text })]), h('p', { class: 'body muted', text: data.restriction.detail })]
        : [h('p', { class: 'body', text: 'Every track in this set is a local file you imported; recording is allowed.' }), h('p', { class: 'body muted', text: `Elsewhere in the library: ${data.restriction.text}` })];
      rows.push(row({ id: 'sources', icon: 'blocked', title: 'Source restrictions', fr: 'FR-031', status: st, body, actions: inSet ? [button({ label: 'Review source', icon: 'link', fr: ['FR-031'], cls: 'btn--primary', on: { click: () => ctx.navigate('sources/resolve', { state: 'probable' }) } })] : [] }));
    }

    // Lead with what needs attention in this state.
    { const i = rows.findIndex((r) => r.dataset.row === 'route'); rows.splice(1, 0, ...rows.splice(i, 1)); }
    const firstId = { 'missing-media': 'media', 'low-storage': 'storage', hot: 'thermal', offline: 'offline', 'restricted-source': 'sources' }[state];
    if (firstId) { const i = rows.findIndex((r) => r.dataset.row === firstId); if (i > 0) rows.unshift(...rows.splice(i, 1)); }

    const list = h('div', { class: 'routing-ready__rows' }, rows);
    const root = h('div', { class: `routing-ready routing-ready--${ctx.orientation}`, dataset: { state } });
    if (ctx.orientation === 'landscape') root.append(h('div', { class: 'routing-col routing-col--verdict' }, [head]), h('div', { class: 'routing-col routing-col--rows' }, [list]));
    else root.append(head, list);
    return root;
  },
});

function fact(k, v) { return h('div', { class: 'routing-facts__row' }, [h('dt', { class: 'label', text: k }), h('dd', { class: 'numeral', text: v })]); }

function row({ id, icon: ic, title, fr, status, body = [], actions = [], fixture = null, after = null }) {
  return h('section', { class: `routing-rrow raised routing-rrow--${status.tone}`, dataset: { row: id, fr }, 'aria-labelledby': `routing-rrow-${id}` }, [
    h('div', { class: 'routing-rrow__head' }, [
      h('span', { class: 'routing-row__disc brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'routing-row__face titanium-radial' }, [icon(ic, { size: 16 })])]),
      h('h3', { id: `routing-rrow-${id}`, class: 'routing-rrow__title title', text: title }),
      h('span', { class: `routing-rrow__status label tone-${status.tone}` }, [h('span', { class: `routing-shape routing-shape--${status.shape}`, 'aria-hidden': 'true' }), h('span', { text: status.word })]),
    ]),
    h('div', { class: 'routing-rrow__body' }, body),
    actions.length ? h('div', { class: 'routing-row__actions' }, actions) : null,
    after,
    fixture ? h('mdj-fixture-mark', { for: fixture }) : null,
  ]);
}

// Library-wide counts from fixtures/tracks.json: imported tracks only (not download candidates), a duplicate
// pair counted once.
function librarySummary(ctx) {
  const lib = ctx.fixtures.tracks.filter((t) => t.availability !== 'discovered' && !t.duplicateNote);
  return {
    ready: lib.filter((t) => t.availability === 'ready').length,
    missing: lib.filter((t) => t.availability === 'missing'),
    permission: lib.filter((t) => t.availability === 'permission-missing'),
    unsupported: lib.filter((t) => t.availability === 'unsupported'),
  };
}
