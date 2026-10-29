/** Studio Settings: searchable grouped preferences with explicit Save, plus Sessions & Recordings. */
import {html, render, delegate, $, $$} from '../ui/dom.js';
import {icon} from '../ui/icons.js';
import {SETTINGS_SCHEMA, settingsSearch, DEFAULT_SETTINGS} from '../core/settings.js';
import {formatTime} from '../core/time.js';
import {haptics} from '../ui/haptics.js';

const VERSION = '6.0.0';

export function createSettingsScreen(ctx) {
  const {settings, store, sessions, engine, toast, confirm, prompt, sheet, sources, exporter} = ctx;
  let container = null, query = '', counts = {sessions: 0, recordings: 0}, recovery = null, unsubscribe = null;
  const offs = []; const on = (el, type, selector, handler) => offs.push(delegate(el, type, selector, handler));
  const onError = e => toast(e.message, {kind: 'error'});

  function control(item) {
    const value = settings.draft[item.key];
    const mark = settings.changed(item.key) ? html`<span class="changed" title="Unsaved change">●</span>` : !settings.isDefault(item.key) ? html`<span class="nondefault" title="Differs from default">◆</span>` : '';
    if (item.type === 'switch') return html`<button class="switch" role="switch" data-setting="${item.key}" aria-checked="${value}" aria-label="${item.label}"></button>${mark}`;
    if (item.type === 'select') return html`<select class="select" data-setting="${item.key}" aria-label="${item.label}">${item.options.map(([v, label]) => html`<option value="${v}" ${v === value ? 'selected' : ''}>${label}</option>`)}</select>${mark}`;
    if (item.type === 'range') return html`<div class="range-wrap"><input class="range" type="range" data-setting="${item.key}" min="${item.min}" max="${item.max}" step="${item.step}" value="${value}" aria-label="${item.label}" style="--fill:${((value - item.min) / (item.max - item.min)) * 100}%"><span class="num" data-range-value>${Math.round(value * 100)}%</span>${mark}</div>`;
    return '';
  }
  function group(g, items) {
    return html`<article class="panel settings-group"><div class="panel-title"><h2>${icon(g.icon, {size: 16})} ${g.label}</h2></div>
      ${g.id === 'audio' ? html`<div class="setting-row is-static"><div><strong>Master output</strong><small>Uses the route Android has selected: speaker, USB-C or Bluetooth. Change it in system settings.</small></div><span class="pill">System</span></div><div class="setting-row is-static"><div><strong>Headphone cue</strong><small>Not available in this build: there is one stereo output. Preview in Library plays on the same output.</small></div><span class="pill">Unavailable</span></div>` : ''}
      ${items.map(item => html`<div class="setting-row" data-setting-row="${item.key}"><div><strong>${item.label}</strong><small>${item.help}</small></div><div class="setting-control">${control(item)}</div></div>`)}
      ${g.id === 'haptics' ? html`<div class="setting-row is-static"><div><strong>Test feedback</strong><small>${haptics.available ? 'Plays a load cue with the current profile.' : 'This browser cannot vibrate; Android and the installed app can.'}</small></div><button class="btn btn-sm" data-settings-haptic-test ${settings.draft.haptics ? '' : 'disabled'}>${icon('vibrate', {size: 14})} Test</button></div>` : ''}
    </article>`;
  }
  function view() {
    const hits = settingsSearch(query);
    const groups = SETTINGS_SCHEMA.map(g => ({g, items: hits.filter(h => h.group === g.id)})).filter(x => x.items.length);
    return html`<section class="screen settings">
      <div class="screen-head"><div><h1>Studio Settings</h1><p>Tailor your Mixline experience. Changes preview immediately and apply when you save.</p></div></div>
      <div class="search"><span>${icon('search')}</span><input class="input" type="search" data-settings-search placeholder="Search settings…" value="${query}" aria-label="Search settings" autocomplete="off"></div>
      ${groups.length ? groups.map(x => group(x.g, x.items)) : html`<div class="empty"><h3>No settings match “${query}”</h3><p>Try “haptics”, “colour” or “motion”.</p><button class="btn btn-violet" data-settings-clear>Clear search</button></div>`}
      ${!query ? html`
      <article class="panel settings-group"><div class="panel-title"><h2>${icon('layers', {size: 16})} Sessions and recordings</h2></div>
        <button class="setting-row is-link" data-settings-sessions><div><strong>Your sessions</strong><small>Named snapshots of both decks, mixer and queue. Restores are always paused.</small></div><span class="cluster"><span class="pill">${counts.sessions} ${counts.sessions === 1 ? 'session' : 'sessions'}</span>${icon('chevronRight')}</span></button>
        <button class="setting-row is-link" data-settings-recordings><div><strong>Recordings</strong><small>Takes of the master bus from the record button. Export to a file from here.</small></div><span class="cluster"><span class="pill">${counts.recordings} ${counts.recordings === 1 ? 'recording' : 'recordings'}</span>${icon('chevronRight')}</span></button>
        ${recovery ? html`<div class="setting-row is-static"><div><strong>Recover last session</strong><small>${recovery.tracks} ${recovery.tracks === 1 ? 'track' : 'tracks'} saved ${new Date(recovery.savedAt).toLocaleString()}: ${recovery.titles.join(', ')}</small></div><button class="btn btn-sm btn-violet" data-settings-recover>Restore</button></div>` : ''}
      </article>
      <article class="panel settings-group"><div class="panel-title"><h2>${icon('info', {size: 16})} About</h2></div>
        <div class="kv"><dt>Version</dt><dd>Mixline ${VERSION}</dd><dt>Audio engine</dt><dd>Web Audio · ${engine.audioState}</dd><dt>Sources</dt><dd><button class="btn btn-sm btn-ghost" data-settings-sources>${icon('cloud', {size: 14})} Manage sources</button></dd><dt>Storage</dt><dd data-settings-storage>…</dd></div>
      </article>` : ''}
      <div class="settings-bar"><button class="btn btn-ghost" data-settings-reset>${icon('reset', {size: 15})} Defaults</button><span class="grow"></span><button class="btn btn-ghost" data-settings-discard ${settings.dirty ? '' : 'disabled'}>Discard</button><button class="btn btn-primary" data-settings-save ${settings.dirty ? '' : 'disabled'}>${icon('check', {size: 16})} ${settings.dirty ? 'Save settings' : 'Saved'}</button></div>
    </section>`;
  }
  function refresh() {
    if (!container) return;
    const focused = document.activeElement?.dataset?.settingsSearch !== undefined;
    render(container, view());
    if (focused) $('[data-settings-search]', container)?.focus();
    store.storageEstimate().then(est => { const el = $('[data-settings-storage]', container); if (el && est.usage != null) el.textContent = `${(est.usage / 1048576).toFixed(1)} MB used${est.quota ? ` of ${(est.quota / 1073741824).toFixed(1)} GB` : ''}`; else if (el) el.textContent = 'Unknown'; }).catch(() => {});
  }
  async function loadCounts() {
    try { counts = {sessions: (await store.listSessions()).length, recordings: (await store.listRecordings()).length}; recovery = await sessions.hasRecovery(); } catch { /* storage unavailable */ }
    refresh();
  }
  async function openSessions() {
    const list = await sessions.list();
    const s = sheet({title: 'Your sessions', body: body()});
    function body() { return html`<div class="stack"><button class="btn btn-primary" data-session-save>${icon('save', {size: 16})} Save current session</button>${list.length ? list.map(r => html`<div class="row" data-session-id="${r.id}"><div class="row-art crate-art">${icon('layers', {size: 22})}</div><div class="row-body"><span class="row-title">${r.name}</span><span class="row-sub">${new Date(r.updated).toLocaleString()} · ${(r.data?.snapshot?.decks || r.data?.decks || []).filter(d => d?.track).map(d => d.track.title).join(' + ') || 'empty decks'}</span></div><div class="row-side"><button class="btn btn-sm" data-session-restore>Restore</button><button class="btn btn-icon btn-sm btn-quiet" data-session-delete aria-label="Delete">${icon('trash', {size: 16})}</button></div></div>`) : html`<p class="muted">No saved sessions yet.</p>`}</div>`; }
    const rerender = async () => { list.length = 0; list.push(...await sessions.list()); s.setBody(body()); loadCounts(); };
    delegate(s.el, 'click', '[data-session-save]', async () => { const name = await prompt({title: 'Save session', label: 'Session name', value: `Session ${new Date().toLocaleDateString()}`, validate: v => v ? null : 'Enter a name.'}); if (!name) return; try { await sessions.saveNamed(name); toast(`Saved “${name}”`, {kind: 'success'}); await rerender(); } catch (e) { onError(e); } });
    delegate(s.el, 'click', '[data-session-restore]', async (e, b) => { const id = b.closest('[data-session-id]').dataset.sessionId; if (engine.decks.some(d => d.playing) && !await confirm({title: 'Restore this session?', body: 'Both decks will be replaced and left paused.', confirmLabel: 'Restore', danger: true})) return; try { const ok = await sessions.restore(id); if (ok) { toast('Session restored, paused.', {kind: 'success'}); haptics.play('load'); } } catch (err) { onError(err); } });
    delegate(s.el, 'click', '[data-session-delete]', async (e, b) => { const id = b.closest('[data-session-id]').dataset.sessionId; if (!await confirm({title: 'Delete this session?', confirmLabel: 'Delete', danger: true})) return; await sessions.remove(id); await rerender(); });
  }
  async function openRecordings() {
    let list = await store.listRecordings();
    let playing = null;
    const s = sheet({title: 'Recordings', body: body(), onClose: () => { playing?.pause(); }});
    function body() { return html`<div class="stack">${list.length ? list.map(r => html`<div class="row" data-recording-id="${r.id}"><div class="row-art crate-art">${icon('record', {size: 22})}</div><div class="row-body"><span class="row-title">${r.name}</span><span class="row-sub">${new Date(r.created).toLocaleString()} · ${(r.size / 1048576).toFixed(2)} MB · ${r.mime || ''}</span></div><div class="row-side"><button class="btn btn-icon btn-sm" data-recording-play aria-label="Play">${icon('play', {size: 16})}</button><button class="btn btn-sm" data-recording-export>${icon('download', {size: 14})} Save</button><button class="btn btn-icon btn-sm btn-quiet" data-recording-delete aria-label="Delete">${icon('trash', {size: 16})}</button></div></div>`) : html`<p class="muted">No recordings yet. Tap the record button in the header while playing.</p>`}<p class="dim" style="font-size:11px">Recordings capture the master bus including effects and sampler; video audio and the microphone are not included.</p></div>`; }
    const rerender = async () => { list = await store.listRecordings(); s.setBody(body()); loadCounts(); };
    delegate(s.el, 'click', '[data-recording-play]', async (e, b) => { const r = list.find(x => x.id === b.closest('[data-recording-id]').dataset.recordingId); if (!r) return; if (playing) { playing.pause(); playing = null; render(b, icon('play', {size: 16})); return; } playing = new Audio(URL.createObjectURL(r.blob)); playing.play(); render(b, icon('pause', {size: 16})); playing.addEventListener('ended', () => { playing = null; render(b, icon('play', {size: 16})); }); });
    delegate(s.el, 'click', '[data-recording-export]', async (e, b) => { const r = list.find(x => x.id === b.closest('[data-recording-id]').dataset.recordingId); if (r) exporter.save(r.blob, `${r.name}.${(r.mime || 'audio/webm').includes('mp4') ? 'm4a' : 'webm'}`, r.mime); });
    delegate(s.el, 'click', '[data-recording-delete]', async (e, b) => { const id = b.closest('[data-recording-id]').dataset.recordingId; if (!await confirm({title: 'Delete this recording?', body: 'It cannot be recovered after deletion.', confirmLabel: 'Delete', danger: true})) return; await store.deleteRecording(id); await rerender(); });
  }
  return {
    name: 'settings',
    mount(el) {
      container = el; query = '';
      refresh(); loadCounts();
      unsubscribe = settings.subscribe(() => refresh());
      on(el, 'input', '[data-settings-search]', (e, input) => { query = input.value; refresh(); });
      on(el, 'click', '[data-settings-clear]', () => { query = ''; refresh(); });
      on(el, 'click', 'button.switch[data-setting]', (e, b) => { settings.set(b.dataset.setting, b.getAttribute('aria-checked') !== 'true'); haptics.play('toggle'); });
      on(el, 'change', 'select[data-setting]', (e, s) => { settings.set(s.dataset.setting, s.value); haptics.play('select'); });
      on(el, 'input', 'input[data-setting]', (e, r) => { settings.set(r.dataset.setting, Number(r.value)); const v = $('[data-range-value]', r.parentElement); if (v) v.textContent = `${Math.round(Number(r.value) * 100)}%`; r.style.setProperty('--fill', `${((Number(r.value) - Number(r.min)) / (Number(r.max) - Number(r.min))) * 100}%`); });
      on(el, 'click', '[data-settings-haptic-test]', () => { const ok = haptics.play('load', {force: true}); toast(ok ? 'Haptic cue sent.' : 'No haptic hardware is reachable from this browser.', {kind: ok ? 'success' : 'warning'}); });
      on(el, 'click', '[data-settings-save]', async () => { try { await settings.save(); toast('Settings saved.', {kind: 'success'}); haptics.play('load'); } catch (e) { onError(e); } });
      on(el, 'click', '[data-settings-discard]', () => { settings.discard(); toast('Changes discarded.'); });
      on(el, 'click', '[data-settings-reset]', async () => { if (!await confirm({title: 'Reset to defaults?', body: 'The defaults are previewed now and apply when you save.', confirmLabel: 'Reset'})) return; settings.resetDraft(); });
      on(el, 'click', '[data-settings-sessions]', () => openSessions());
      on(el, 'click', '[data-settings-recordings]', () => openRecordings());
      on(el, 'click', '[data-settings-recover]', async () => { try { const ok = await sessions.restoreRecovery(); if (ok) { toast('Last session restored, paused.', {kind: 'success'}); recovery = null; refresh(); } } catch (e) { onError(e); } });
      on(el, 'click', '[data-settings-sources]', () => ctx.openSources?.());
    },
    unmount() { offs.forEach(off => off()); offs.length = 0; unsubscribe?.(); container = null; },
    update() {},
    get defaults() { return DEFAULT_SETTINGS; }
  };
}
