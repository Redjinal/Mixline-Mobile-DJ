// system/diagnostics — route, storage, battery / thermal, source readiness and versions (FR-042), with a
// redacted export and an explicit, reviewable crash-report opt-in (Document 11 §3 privacy; FR-040).
//
// Full-screen page. Nothing is measured: every reading comes from the fixture scenario (route, storage,
// thermal) or fixtures/system.json (battery, budgets, versions) and the readings panels carry FIXTURE marks.
// Export writes nothing in the prototype; the review state lists exactly what would be included and
// excluded, and private paths are excluded unless the person selects them.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { pageHead, notice, panel, kv, statusWord, bullets, setFlash, takeFlash } from './index.js';

const SYS = await load('system');
const D = SYS.diagnostics;
const ID = 'system/diagnostics';

register({
  id: ID, family: 'system', title: 'Diagnostics', order: 3,
  fr: ['FR-042', 'FR-040', 'FR-022', 'FR-023', 'FR-037'],
  shell: false,
  states: {
    normal: { label: 'All readings normal', exercised: true, scenario: 'set-ready' },
    'fault-route': { label: 'Fault: output route lost', exercised: false, scenario: 'route-lost' },
    'fault-storage': { label: 'Fault: storage nearly full', exercised: false, scenario: 'low-storage' },
    'telemetry-consent': { label: 'Crash-report sharing — explicit opt-in', exercised: true, scenario: 'set-ready', via: { from: 'normal', control: 'Review crash-report sharing' } },
    'export-review': { label: 'Export redacted diagnostics — review', exercised: true, scenario: 'set-ready', via: { from: 'normal', control: 'Export diagnostics' } },
  },
  defaultState: 'normal',
  render(ctx) {
    const s = ctx.session;
    const st = ctx.state;
    const flash = takeFlash(ID, st);
    const root = h('div', { class: 'system-page system-diag stage', dataset: { state: st } });
    const head = pageHead(ctx, { title: 'Diagnostics', sub: 'Readings for troubleshooting. Nothing leaves the phone unless you export or opt in.', back: { label: 'Back to Settings', to: 'system/settings' } });
    const live = h('div', { class: 'system-live', 'aria-live': 'polite' });
    if (flash) live.appendChild(notice({ tone: flash.tone, ic: flash.ic, lead: flash.lead, text: flash.text, role: 'status' }));

    if (st === 'export-review') { root.append(head, h('div', { class: 'system-page__scroll' }, [live, exportReview(ctx)])); return root; }
    if (st === 'telemetry-consent') { root.append(head, h('div', { class: 'system-page__scroll' }, [live, consent(ctx)])); return root; }

    // ---- summary line ----
    const faults = [];
    if (st === 'fault-route' || s.route.status === 'lost') faults.push(notice({ tone: 'critical', ic: 'route-lost', lead: 'Output lost — decks paused and muted.', text: 'The USB interface disappeared at 21:40 (fixture). Nothing was rerouted to the speaker. Reconnect and verify the channels, then resume deliberately.', children: [h('div', { class: 'system-actions' }, [
      button({ label: 'Open recovery', icon: 'recover', hit: 48, cls: 'btn--primary', fr: ['FR-022'], on: { click: () => ctx.navigate('system/recovery', { state: 'route-lost' }) } }),
      button({ label: 'Open route check', icon: 'route', hit: 48, cls: 'btn--secondary', fr: ['FR-023'], on: { click: () => ctx.navigate('route/check') } }),
    ])] }));
    if (st === 'fault-storage' || (s.storage?.freeBytes ?? Infinity) < 1e9) faults.push(notice({ tone: 'critical', ic: 'storage', lead: `Storage nearly full — ${fmt.bytes(s.storage.freeBytes)} free.`, text: 'Recording stopped and kept 3 recoverable segments; playback continues. Free space by clearing regenerable caches — your media, cues and recordings are not touched.', children: [h('div', { class: 'system-actions' }, [
      button({ label: 'Clear regenerable caches', icon: 'trash', hit: 48, cls: 'btn--primary', fr: ['FR-042'], on: { click: () => live.replaceChildren(notice({ tone: 'info', ic: 'loader', lead: 'Cache cleanup sent — waiting for the library store.', text: 'Waveform, analysis and stem caches can be rebuilt later. Space freed: unknown until the store reports it.', role: 'status' })) } }),
      button({ label: 'Open recording', icon: 'rec', hit: 48, cls: 'btn--secondary', fr: ['FR-031'], on: { click: () => ctx.navigate('rec/panel') } }),
    ])] }));

    // ---- panels ----
    const r = s.route;
    const routeLost = r.status === 'lost';
    const routePanel = panel({ title: 'Audio route', ic: routeLost ? 'route-lost' : 'route', fixture: 'route descriptor', tone: routeLost ? 'critical' : null, children: [
      h('div', { class: 'system-diag__line' }, [h('span', { class: 'title truncate', text: r.name }), statusWord(routeLost ? 'critical' : r.cue !== 'none' ? 'ok' : 'warning', routeLost ? 'Lost' : routeKind(r))]),
      kv([
        ['Master', routeLost ? 'none — decks paused and muted' : `${r.master} · ${r.channels} channels`],
        ['Cue', r.cue && r.cue !== 'none' ? r.cue : 'none on this route'],
        ['Channel map', routeLost ? 'invalidated — verify after reconnecting' : r.verified ? 'verified (fixture)' : 'not verified'],
        ['Sample rate', r.sampleRate ? `${r.sampleRate} Hz` : 'unknown'],
        ['Buffer', r.bufferFrames ? `${r.bufferFrames} frames` : 'unknown'],
      ]),
    ] });
    const st0 = s.storage || {};
    const low = (st0.freeBytes ?? Infinity) < 1e9;
    const storagePanel = panel({ title: 'Storage', ic: 'storage', fixture: 'storage readings', tone: low ? 'critical' : null, children: [
      h('div', { class: 'system-diag__line' }, [h('span', { class: 'numeral system-diag__big', text: `${fmt.bytes(st0.freeBytes)} free` }), statusWord(low ? 'critical' : 'ok', low ? 'Nearly full' : 'OK')]),
      h('p', { class: 'body muted', text: `of ${fmt.bytes(st0.totalBytes)} on this phone` }),
      kv(D.storage.budgets),
    ] });
    const b = D.battery;
    const hot = s.thermal === 'hot';
    const batteryPanel = panel({ title: 'Battery and thermal', ic: hot ? 'thermal' : 'battery', fixture: 'battery and thermal', tone: hot ? 'warning' : null, children: [
      kv([
        ['Battery', `${b.levelPct} % · ${b.charging ? 'charging' : 'not charging'}`],
        ['Thermal', hot ? 'Hot — optional work paused' : b.thermal],
        ['Throttling', hot ? 'Analysis and stem preparation paused; audio unchanged' : b.throttling],
      ]),
    ] });
    const sourcesPanel = panel({ title: 'Source readiness', ic: 'library', fixture: 'source statuses', children: [
      h('ul', { class: 'system-diag__sources' }, D.sources.map(([name, tone, text]) => h('li', { class: 'system-diag__source' }, [h('span', { class: 'body system-diag__source-name', text: name }), statusWord(tone, text)]))),
    ] });
    const versionsPanel = panel({ title: 'Versions', ic: 'info', children: [kv(D.versions)] });
    const telemetryPanel = panel({ title: 'Crash-report sharing', ic: 'share', children: [
      h('div', { class: 'system-diag__line' }, [h('span', { class: 'body', text: 'Off — nothing is sent automatically.' }), statusWord('neutral', 'Off')]),
      button({ label: 'Review crash-report sharing', icon: 'info', hit: 48, cls: 'btn--secondary', fr: ['FR-040'], on: { click: () => ctx.setState('telemetry-consent') } }),
    ] });
    const exportPanel = panel({ title: 'Export', ic: 'export', cls: 'system-diag__export', children: [
      h('p', { class: 'body', text: 'Writes a redacted report file you can share yourself. Track contents, tokens and private paths are excluded unless you select them.' }),
      button({ label: 'Export diagnostics', icon: 'export', hit: 48, cls: 'btn--primary', fr: ['FR-042', 'FR-040'], on: { click: () => ctx.setState('export-review') } }),
    ] });

    const order = st === 'fault-storage' ? [storagePanel, routePanel] : [routePanel, storagePanel];
    const grid = h('div', { class: 'system-grid' }, [...order, batteryPanel, sourcesPanel, exportPanel, telemetryPanel, versionsPanel]);
    root.append(head, h('div', { class: 'system-page__scroll' }, [live, ...faults, grid]));
    return root;
  },
});

function routeKind(r) {
  if (r.cue && r.cue !== 'none') return 'Master + cue';
  return 'Master only · no cue';
}

function exportReview(ctx) {
  const e = D.export;
  let includePaths = false;
  const wrap = h('div', { class: 'system-diag__review' });
  const pathsRow = h('mdj-settings-row', { kind: 'toggle', name: 'include-paths', label: 'Include private folder paths', value: 'off', detail: 'Off: folder names are replaced by placeholders such as <music-folder-1>.' });
  pathsRow.addEventListener('mdj:setting-change', (ev) => {
    includePaths = ev.detail.value === 'on';
    pathsRow.setAttribute('value', includePaths ? 'on' : 'off');
    pathsRow.setAttribute('detail', includePaths ? 'On: real folder paths are written into the report. Only share it with someone you trust.' : 'Off: folder names are replaced by placeholders such as <music-folder-1>.');
  });
  const status = h('div', { class: 'system-live', 'aria-live': 'polite' });
  wrap.append(
    notice({ tone: 'info', ic: 'export', lead: `Review before writing ${e.file}`, text: 'The file is written to Downloads on this phone. Nothing is uploaded; you choose where to share it.' }),
    h('div', { class: 'system-grid system-grid--two' }, [
      panel({ title: 'Included', ic: 'check', children: [bullets(e.included, 'check')] }),
      panel({ title: 'Excluded', ic: 'x', tone: 'neutral', children: [bullets(e.excluded, 'x', 'system-bullets--excluded')] }),
    ]),
    h('div', { class: 'system-panel raised' }, [pathsRow]),
    status,
    h('div', { class: 'system-actions system-actions--end' }, [
      button({ label: 'Cancel', hit: 48, cls: 'btn--ghost', on: { click: () => ctx.setState('normal') } }),
      button({ label: 'Write report file', icon: 'save', hit: 48, cls: 'btn--primary', fr: ['FR-042', 'FR-040'], on: { click: () => status.replaceChildren(notice({ tone: 'info', ic: 'loader', lead: 'Writing — sent.', text: `${e.file}${includePaths ? ' (with private paths)' : ' (paths redacted)'} is being written. The file is ready only when the writer confirms; size unknown until then.`, role: 'status' })) } }),
    ]),
  );
  return wrap;
}

function consent(ctx) {
  const wrap = h('div', { class: 'system-diag__review' });
  wrap.append(
    notice({ tone: 'info', ic: 'share', lead: 'Crash-report sharing is off.', text: 'Turning it on sends a small report after a crash so problems can be fixed. It is optional; the app works the same with it off. You can turn it off at any time.' }),
    panel({ title: 'Exactly what a report contains', ic: 'list', children: [bullets(D.telemetry, 'check'), h('p', { class: 'body muted', text: 'Where it goes: the crash-report endpoint you configure for this personal build. None is configured yet, so turning it on only takes effect once one is set.' })] }),
    h('div', { class: 'system-actions system-actions--end' }, [
      button({ label: 'Keep off', hit: 48, cls: 'btn--secondary', on: { click: () => { setFlash(ID, { state: 'normal', tone: 'neutral', ic: 'check', lead: 'Crash-report sharing stays off.', text: 'Nothing changed.' }); ctx.setState('normal'); } } }),
      button({ label: 'Turn on crash reports', icon: 'check', hit: 48, cls: 'btn--primary', fr: ['FR-040'], on: { click: () => { setFlash(ID, { state: 'normal', tone: 'info', ic: 'info', lead: 'Crash reports on — waiting for an endpoint.', text: 'Saved as your choice (fixture acknowledgement). No report is sent until an endpoint is configured.' }); ctx.setState('normal'); } } }),
    ]),
  );
  return wrap;
}
