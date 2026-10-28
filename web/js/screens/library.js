/** Library workspace: collection tabs, search and chips, online sources, rows, inspector/prepare, crates and import. */
import {html, render, delegate, $, $$, raw} from '../ui/dom.js';
import {icon} from '../ui/icons.js';
import {artwork} from '../ui/artwork.js';
import {formatTime, parseTime, timeInput} from '../core/time.js';
import {filterTracks, sourceKind, normalizeRecipe, recipeFrom} from '../core/library.js';
import {peaksFromBuffer, estimateBpm} from '../core/analysis.js';
import {makeDemo} from '../core/demos.js';
import {SOURCE_CATALOG} from '../core/sources.js';
import {drawPeaks} from '../ui/controls/waveform.js';
import {haptics} from '../ui/haptics.js';

const SOURCE_CHIPS = [['all', 'All', 'library'], ['local', 'Local', 'folder'], ['original', 'Originals', 'disc'], ['online', 'Online', 'cloud'], ['video', 'Video', 'video']];
const PROVIDERS = ['audius', 'jamendo', 'archive', 'wikimedia'];
const BADGE = {local: ['badge-local', 'folder', 'Local'], original: ['badge-original', 'disc', 'Original'], online: ['badge-online', 'cloud', 'Online'], video: ['badge-video', 'video', 'Video']};
const SORTS = [['recent', 'Recently added'], ['title', 'Title'], ['artist', 'Artist'], ['bpm', 'BPM']];

export function createLibraryScreen(ctx) {
  const {engine, store, sources, loader, toast, confirm, prompt, sheet, router} = ctx;
  const state = {tab: 'library', query: '', mode: 'all', source: 'all', sort: 'recent', unknownBpm: true, selectedId: null, prepareOpen: true, crateId: null, provider: 'audius', online: {results: [], query: '', nextPage: null, loading: false, error: '', notice: ''}, forDeck: null};
  let container = null, tracks = [], collections = {favorites: [], recents: [], crates: []}, key = '';
  const offs = []; const on = (el, type, selector, handler) => offs.push(delegate(el, type, selector, handler));
  const peaksCache = new Map(); // id → {peaks, duration}
  const preview = {audio: null, url: null, id: null, timer: 0};
  const onError = e => toast(e.message, {kind: 'error'});

  /* ---------- data ---------- */
  async function reload() {
    try { tracks = await store.listTracks(); collections = await store.getCollections(); } catch (e) { onError(e); }
    for (const t of tracks) if (Array.isArray(t.peaks) && t.peaks.length) peaksCache.set(t.id, {peaks: Float32Array.from(t.peaks), duration: t.duration || 0});
    if (container) refresh(true);
  }
  const trackById = id => tracks.find(t => t.id === id) || state.online.results.find(t => t.id === id) || null;
  const assigned = id => engine.decks.map((d, i) => d.track?.id === id ? i : -1).filter(i => i >= 0);
  const isFavorite = id => collections.favorites.includes(id);
  function visibleTracks() {
    if (state.source === 'online' && state.tab === 'library') return filterTracks(state.online.results, {query: '', sort: 'manual'});
    let list = tracks;
    if (state.tab === 'recents') list = collections.recents.map(trackById).filter(Boolean);
    if (state.tab === 'favorites') list = collections.favorites.map(trackById).filter(Boolean);
    if (state.tab === 'crates' && state.crateId) { const crate = collections.crates.find(c => c.id === state.crateId); list = crate ? crate.ids.map(trackById).filter(Boolean) : []; return filterTracks(list, {query: state.query, mode: state.mode, sort: 'manual'}); }
    return filterTracks(list, {query: state.query, mode: state.mode, source: state.source, sort: state.tab === 'library' ? state.sort : 'manual', unknownBpm: state.unknownBpm});
  }

  /* ---------- markup ---------- */
  const badge = t => { const k = sourceKind(t); const [cls, ic, label] = BADGE[k]; return html`<span class="badge ${cls}">${icon(ic, {size: 11})} ${label}</span>`; };
  const meta = t => html`<span class="num">${t.bpm ? `${Number(t.bpm).toFixed(1)} BPM` : '— BPM'}</span><span class="sep">·</span><span class="num">${t.duration ? formatTime(t.duration) : '--:--'}</span>${t.key ? html`<span class="sep">·</span><span>${t.key}</span>` : ''}`;
  function row(t) {
    const marks = assigned(t.id);
    return html`<div class="row ${state.selectedId === t.id ? 'is-selected' : ''}" data-track-id="${t.id}" role="button" tabindex="0" aria-pressed="${state.selectedId === t.id}">
      <div class="row-art">${artwork(t, {size: 52})}</div>
      <div class="row-body"><span class="row-title">${t.title || 'Untitled'}</span><span class="row-sub">${t.artist || t.sourceName || 'Unknown artist'}</span><div class="row-meta">${meta(t)}${peaksCache.has(t.id) ? html`<canvas class="row-thumb" data-thumb="${t.id}" width="1" height="1"></canvas>` : ''}</div></div>
      <div class="row-side">${badge(t)}<div class="row-marks">${marks.map(i => html`<span class="badge badge-deck${i + 1}">On ${i + 1}</span>`)}</div><button class="btn btn-icon btn-quiet btn-sm" data-row-more="${t.id}" aria-label="More for ${t.title || 'track'}">${icon('more', {size: 18})}</button></div>
    </div>`;
  }
  function emptyState() {
    if (state.source === 'online' && state.tab === 'library') return '';
    const filtered = !!state.query || state.source !== 'all';
    return html`<div class="empty">${raw(EMPTY_ART)}<h3>${filtered ? 'No tracks match' : state.tab === 'favorites' ? 'No favourites yet' : state.tab === 'recents' ? 'Nothing played yet' : 'Your library is empty'}</h3><p>${filtered ? 'Try another search or clear the filters.' : state.tab === 'library' ? 'Import audio from this device or load one of the originals.' : 'Tracks you load appear here automatically.'}</p>${filtered ? html`<button class="btn btn-violet" data-lib-clear>${icon('close', {size: 16})} Clear filters</button>` : state.tab === 'library' ? html`<button class="btn btn-violet" data-lib-import>${icon('upload', {size: 16})} Import audio</button>` : ''}</div>`;
  }
  function onlinePanel() {
    const o = state.online, list = sources.list();
    return html`<div class="online-bar">
      <div class="chips">${PROVIDERS.map(p => { const s = list.find(x => x.id === p); return html`<button class="chip" data-lib-provider="${p}" aria-pressed="${state.provider === p}">${icon('cloud', {size: 13})} ${s?.name || p}</button>`; })}</div>
      <div class="between"><small class="muted">${list.find(x => x.id === state.provider)?.status || ''} · live access not verified in this build</small><button class="btn btn-sm btn-violet" data-lib-online-search ${o.loading ? 'disabled' : ''}>${icon('search', {size: 15})} ${o.query || state.query ? 'Search' : 'Trending'}</button></div>
      ${o.error ? html`<div class="notice is-error">${icon('warning')}<span class="grow">${o.error}</span><button class="btn btn-sm" data-lib-online-search>Retry</button></div>` : ''}
      ${o.notice && !o.error ? html`<div class="notice">${icon('info')}<span>${o.notice}</span></div>` : ''}
      ${o.loading ? html`<div class="stack"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>` : ''}
      ${!o.loading && !o.results.length && !o.error ? html`<p class="dim">Search ${list.find(x => x.id === state.provider)?.name || 'the source'} for open-licensed music. Only tracks with a supported license can load into a deck.</p>` : ''}
    </div>`;
  }
  function inspector() {
    const t = trackById(state.selectedId);
    if (!t) return '';
    const cached = peaksCache.get(t.id), kind = sourceKind(t), marks = assigned(t.id);
    const canLoad = t.capabilities?.load !== false && kind !== 'video';
    return html`<article class="panel inspector" data-inspector data-track-id="${t.id}">
      <div class="inspector-head"><div class="row-art">${artwork(t, {size: 52})}</div><div class="grow" style="min-width:0"><strong class="truncate">${t.title || 'Untitled'}</strong><div class="row-meta">${badge(t)}${meta(t)}</div><div class="row-marks">${marks.map(i => html`<span class="badge badge-deck${i + 1}">On deck ${i + 1}</span>`)}</div></div><button class="btn btn-icon btn-quiet" data-lib-deselect aria-label="Deselect">${icon('close')}</button></div>
      ${kind === 'video' ? html`<p class="notice">${icon('video')}<span>Video references play in Challenge. Open Challenge to queue it.</span></p>` : html`
      <div class="wave h-compact inspector-wave" data-lib-wave><canvas></canvas>${!cached ? html`<button class="btn btn-sm btn-ghost wave-prepare" data-lib-analyze>${icon('waveform', {size: 15})} Prepare waveform</button>` : ''}</div>
      <div class="wave-times num"><span data-lib-preview-time>${timeInput(t.start || 0) || '00:00.000'}</span><span class="status ${preview.id === t.id && preview.audio && !preview.audio.paused ? 'is-playing' : 'is-idle'}" data-lib-preview-status>${preview.id === t.id && preview.audio && !preview.audio.paused ? 'Preview · public output' : 'Preview'}</span><span>${t.duration ? formatTime(t.duration) : '--:--'}</span></div>
      <div class="inspector-actions">
        <button class="btn btn-sm" data-lib-preview aria-pressed="${preview.id === t.id && preview.audio && !preview.audio.paused}" ${t.capabilities?.preview === false ? 'disabled' : ''}>${icon('headphones', {size: 15})} Preview</button>
        <button class="btn btn-sm" data-lib-cue>${icon('flag', {size: 15})} Set start</button>
        <button class="btn btn-sm" data-lib-loop-in>In</button><button class="btn btn-sm" data-lib-loop-out>Out</button>
        <button class="btn btn-sm btn-ghost" data-lib-loop-clear ${t.loop ? '' : 'disabled'}>Clear loop</button>
      </div>
      ${t.restriction && !canLoad ? html`<p class="notice is-warning">${icon('warning')}<span>${t.restriction}</span></p>` : ''}
      <div class="two-up"><button class="btn btn-deck1 btn-lg" data-load-deck="0" ${canLoad ? '' : 'disabled'}>${icon('disc', {size: 18})} Load to Deck 1</button><button class="btn btn-deck2 btn-lg" data-load-deck="1" ${canLoad ? '' : 'disabled'}>${icon('disc', {size: 18})} Load to Deck 2</button></div>
      <details class="inspector-prepare" ${state.prepareOpen ? 'open' : ''}><summary>${icon('edit', {size: 15})} Prepare: title, artist, BPM, start</summary>
        <form class="stack" data-lib-form>
          <div class="two-up"><label class="field"><span>Title</span><input class="input" name="title" value="${t.title || ''}" maxlength="120"></label><label class="field"><span>Artist</span><input class="input" name="artist" value="${t.artist || ''}" maxlength="120"></label></div>
          <div class="two-up"><label class="field"><span>BPM ${t.bpmSource === 'estimated' ? '(estimated)' : ''}</span><input class="input num" name="bpm" data-lib-bpm inputmode="decimal" value="${t.bpm || ''}" placeholder="Unknown"></label><label class="field"><span>Start</span><input class="input num" name="start" data-lib-start value="${timeInput(t.start || 0)}" placeholder="00:00.000"></label></div>
          <div class="cluster"><button type="button" class="btn btn-sm" data-lib-tap>${icon('tap', {size: 15})} Tap</button><button type="button" class="btn btn-sm" data-lib-bpm-analyze>${icon('beat', {size: 15})} Analyse</button><span class="grow"></span><button type="submit" class="btn btn-primary btn-sm" data-lib-save>${icon('check', {size: 15})} Save</button></div>
          ${t.license ? html`<small class="dim">${t.license}${t.credit ? ` · ${t.credit}` : ''}</small>` : ''}
        </form>
      </details>`}
      <div class="cluster inspector-foot">
        <button class="btn btn-sm" data-lib-favorite aria-pressed="${isFavorite(t.id)}">${icon(isFavorite(t.id) ? 'heartFilled' : 'heart', {size: 15})} ${isFavorite(t.id) ? 'Favourite' : 'Favourite'}</button>
        <button class="btn btn-sm" data-lib-crate-add>${icon('folder', {size: 15})} Crate</button>
        ${t.url ? html`<a class="btn btn-sm btn-ghost" href="${t.url}" target="_blank" rel="noopener">${icon('external', {size: 15})} Source</a>` : ''}
        ${kind === 'local' || (kind === 'online' && !t.transient && tracks.some(x => x.id === t.id)) ? html`<button class="btn btn-sm btn-danger" data-lib-delete>${icon('trash', {size: 15})} Delete</button>` : ''}
      </div>
    </article>`;
  }
  function cratesView() {
    if (state.crateId) {
      const crate = collections.crates.find(c => c.id === state.crateId);
      if (!crate) { state.crateId = null; return cratesView(); }
      const list = visibleTracks();
      return html`<div class="crate-head"><button class="btn btn-icon btn-quiet" data-lib-crate-back aria-label="All crates">${icon('chevronLeft')}</button><div class="grow" style="min-width:0"><strong class="truncate">${crate.name}</strong><small>${crate.ids.length} tracks · ${crate.bars} bar blends</small></div><button class="btn btn-sm" data-lib-crate-rename>Rename</button><button class="btn btn-sm btn-ghost" data-lib-crate-export>Export</button><button class="btn btn-sm btn-danger" data-lib-crate-delete>${icon('trash', {size: 14})}</button></div>
        ${list.length >= 2 ? html`<p class="notice">${icon('scissors')}<span class="grow">Practice a pair: loads two adjacent tracks at their starts, Deck 1 live, so you can rehearse the blend.</span></p>` : ''}
        ${list.length ? list.map((t, n) => html`<div class="crate-row">${row(t)}<div class="crate-tools"><button class="btn btn-icon btn-sm btn-quiet" data-crate-move="${t.id}:-1" aria-label="Move up" ${n === 0 ? 'disabled' : ''}>${icon('arrowUp', {size: 16})}</button><button class="btn btn-icon btn-sm btn-quiet" data-crate-move="${t.id}:1" aria-label="Move down" ${n === list.length - 1 ? 'disabled' : ''}>${icon('arrowDown', {size: 16})}</button>${n < list.length - 1 ? html`<button class="btn btn-sm btn-violet" data-lib-practice="${n}">Practice ${n + 1}→${n + 2}</button>` : ''}<button class="btn btn-icon btn-sm btn-quiet" data-crate-remove="${t.id}" aria-label="Remove from crate">${icon('close', {size: 16})}</button></div></div>`) : html`<div class="empty"><h3>This crate is empty</h3><p>Select a track in Library and tap Crate to add it here.</p></div>`}`;
    }
    return html`<div class="between"><h2>Crates</h2><div class="cluster"><button class="btn btn-sm btn-ghost" data-lib-crate-import>${icon('upload', {size: 14})} Import set</button><button class="btn btn-sm btn-violet" data-lib-crate-new>${icon('plus', {size: 14})} New crate</button></div></div>
      ${collections.crates.length ? collections.crates.map(c => html`<div class="row" data-crate-id="${c.id}" role="button" tabindex="0"><div class="row-art crate-art">${icon('folder', {size: 24})}</div><div class="row-body"><span class="row-title">${c.name}</span><span class="row-sub">${c.ids.length} ${c.ids.length === 1 ? 'track' : 'tracks'} · ${c.bars} bar blends</span></div><div class="row-side">${icon('chevronRight')}</div></div>`) : html`<div class="empty">${raw(EMPTY_ART)}<h3>No crates yet</h3><p>Crates are ordered sets you can rehearse pair by pair and export as a recipe.</p><button class="btn btn-violet" data-lib-crate-new>${icon('plus', {size: 16})} New crate</button></div>`}`;
  }
  function view() {
    const list = visibleTracks();
    const appliedChips = [state.query ? {k: 'query', label: `“${state.query}”`} : null, state.source !== 'all' ? {k: 'source', label: SOURCE_CHIPS.find(c => c[0] === state.source)[1]} : null].filter(Boolean);
    return html`<section class="screen library">
      <div class="tabs" role="tablist">${[['library', 'Library'], ['crates', 'Crates'], ['recents', 'Recents'], ['favorites', 'Favourites']].map(([k, label]) => html`<button role="tab" data-lib-tab="${k}" aria-selected="${state.tab === k}">${label}</button>`)}</div>
      ${state.forDeck !== null ? html`<p class="notice tone-${state.forDeck + 1}">${icon('disc')}<span class="grow">Choose a track for Deck ${state.forDeck + 1}, then tap Load to Deck ${state.forDeck + 1}.</span><button class="btn btn-sm btn-ghost" data-lib-for-clear>Dismiss</button></p>` : ''}
      ${state.tab === 'crates' ? cratesView() : html`
      <div class="lib-toolbar">
        <div class="search">${icon('search')}<input class="input" data-lib-search type="search" placeholder="Search tracks, artists, BPM…" value="${state.query}" autocomplete="off" aria-label="Search"></div>
        <select class="select lib-mode" data-lib-mode aria-label="Search field"><option value="all" ${state.mode === 'all' ? 'selected' : ''}>All</option><option value="title" ${state.mode === 'title' ? 'selected' : ''}>Title</option><option value="artist" ${state.mode === 'artist' ? 'selected' : ''}>Artist</option></select>
        <button class="btn btn-icon btn-violet" data-lib-import aria-label="Import audio from this device">${icon('upload')}</button>
      </div>
      ${state.tab === 'library' ? html`<div class="lib-chips"><div class="chips">${SOURCE_CHIPS.map(([k, label, ic]) => html`<button class="chip" data-lib-source="${k}" aria-pressed="${state.source === k}">${icon(ic, {size: 14})} ${label}</button>`)}</div><div class="cluster"><select class="select lib-sort" data-lib-sort aria-label="Sort">${SORTS.map(([k, label]) => html`<option value="${k}" ${state.sort === k ? 'selected' : ''}>${label}</option>`)}</select><button class="btn btn-sm btn-ghost" data-lib-sources>${icon('cloud', {size: 14})} Sources</button></div></div>` : ''}
      ${appliedChips.length ? html`<div class="chips applied">${appliedChips.map(c => html`<button class="chip is-selected" data-lib-chip-remove="${c.k}">${c.label} <span class="chip-x">${icon('close', {size: 12})}</span></button>`)}<button class="chip" data-lib-clear>Clear all</button></div>` : ''}
      ${state.source === 'online' && state.tab === 'library' ? onlinePanel() : ''}
      ${inspector()}
      <div class="lib-list">${list.length ? html`<div class="between lib-count"><small class="muted">${list.length} ${list.length === 1 ? 'track' : 'tracks'}</small>${state.tab === 'recents' && list.length ? html`<button class="btn btn-sm btn-quiet" data-lib-recents-clear>Clear recents</button>` : ''}</div>${list.map(row)}` : emptyState()}</div>
      <input type="file" accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac" multiple hidden data-lib-file>
      <input type="file" accept="application/json,.json" hidden data-lib-recipe-file>`}
    </section>`;
  }
  function refresh(force) {
    if (!container) return;
    const k = JSON.stringify([state, engine.decks.map(d => d.track?.id), tracks.length, collections]);
    if (!force && k === key) return;
    key = k;
    const focused = document.activeElement?.dataset?.libSearch !== undefined;
    const selectionStart = focused ? document.activeElement.selectionStart : null;
    render(container, view());
    drawThumbs();
    drawInspectorWave();
    if (focused) { const input = $('[data-lib-search]', container); input?.focus(); try { input?.setSelectionRange(selectionStart, selectionStart); } catch { /* not supported for type=search in some browsers */ } }
  }
  function drawThumbs() { $$('[data-thumb]', container).forEach(c => { const cached = peaksCache.get(c.dataset.thumb); if (cached) drawPeaks(c, cached.peaks, {color: getComputedStyle(document.documentElement).getPropertyValue('--violet').trim() || '#a855ff'}); }); }
  function drawInspectorWave() {
    const canvas = $('[data-lib-wave] canvas', container); if (!canvas) return;
    const t = trackById(state.selectedId); const cached = peaksCache.get(state.selectedId);
    const position = preview.id === state.selectedId && preview.audio ? preview.audio.currentTime : (t?.start || 0);
    drawPeaks(canvas, cached?.peaks, {color: getComputedStyle(document.documentElement).getPropertyValue('--violet').trim() || '#a855ff', duration: cached?.duration || t?.duration || 0, position: cached ? position : null, loop: t?.loop || null, cue: t?.start || null, background: '#08090c'});
    const time = $('[data-lib-preview-time]', container); if (time) time.textContent = timeInput(position) || '00:00.000';
  }

  /* ---------- audio helpers ---------- */
  async function blobFor(t, purpose = 'preview') {
    if (t.demo) return (await makeDemo(t.demo)).blob;
    const item = await store.getTrack(t.id);
    if (item?.blob) return item.blob;
    if (sourceKind(t) === 'online') { const prepared = await sources.prepare(t, {purpose}); if (prepared.track.capabilities?.offline) await store.saveTrack({...prepared.track, added: Date.now()}, prepared.blob); else store.cacheTrack(prepared.track, prepared.blob); return prepared.blob; }
    throw new Error(`${t.title || 'This track'} has no audio in the library. Import it again.`);
  }
  async function analyse(t, {bpm = false} = {}) {
    await engine.init();
    const blob = await blobFor(t);
    const buffer = await engine.ctx.decodeAudioData(await blob.arrayBuffer());
    const peaks = peaksFromBuffer(buffer);
    peaksCache.set(t.id, {peaks, duration: buffer.duration});
    const updates = {peaks: Array.from(peaks), duration: buffer.duration};
    let estimate = null;
    if (bpm) { estimate = estimateBpm(buffer); if (estimate) { updates.bpm = estimate.bpm; updates.bpmSource = 'estimated'; } }
    if (tracks.some(x => x.id === t.id)) { await store.updateTrack(t.id, updates); await reload(); } else Object.assign(t, updates);
    return estimate;
  }
  function stopPreview() {
    if (preview.timer) cancelAnimationFrame(preview.timer);
    preview.timer = 0;
    if (preview.audio) { preview.audio.pause(); preview.audio.src = ''; }
    if (preview.url) URL.revokeObjectURL(preview.url);
    preview.audio = null; preview.url = null; preview.id = null;
    if (container) refresh(true);
  }
  async function togglePreview(t) {
    if (preview.id === t.id && preview.audio) { stopPreview(); return; }
    stopPreview();
    const blob = await blobFor(t, 'preview');
    const audio = new Audio();
    preview.url = URL.createObjectURL(blob); audio.src = preview.url; audio.currentTime = t.start || 0;
    preview.audio = audio; preview.id = t.id;
    audio.addEventListener('ended', stopPreview);
    await audio.play();
    toast('Preview plays on the public output, not a headphone cue.', {kind: 'info', timeout: 2500});
    const loop = () => { if (!preview.audio) return; if (t.loop && audio.currentTime >= t.loop.end) audio.currentTime = t.loop.start; drawInspectorWave(); preview.timer = requestAnimationFrame(loop); };
    loop();
    refresh(true);
  }
  const previewPosition = t => preview.id === t.id && preview.audio ? preview.audio.currentTime : (t.start || 0);

  /* ---------- actions ---------- */
  async function saveCollections() { collections = await store.setCollections(collections); refresh(true); }
  async function load(deck, t) {
    try {
      const ok = await loader.load(deck, t);
      if (ok) { state.forDeck = null; haptics.play('load'); }
    } catch (e) { onError(e); }
    refresh(true);
  }
  async function importFiles(files) {
    let added = 0;
    for (const file of files) {
      try {
        if (!/^audio\//.test(file.type) && !/\.(mp3|wav|flac|ogg|m4a|aac|oga)$/i.test(file.name)) throw new Error(`${file.name} is not a supported audio file.`);
        if (file.size > 150 * 1024 * 1024) throw new Error(`${file.name} is larger than 150 MB.`);
        const id = globalThis.crypto.randomUUID();
        await store.saveTrack({id, title: file.name.replace(/\.[^.]+$/, ''), artist: '', bpm: 0, bpmSource: 'unknown', source: 'local', provider: 'local', sourceName: 'Your files', start: 0, added: Date.now(), capabilities: {load: true, record: true, offline: true}}, file);
        added++;
      } catch (e) { onError(e); }
    }
    if (added) { toast(`${added} ${added === 1 ? 'track' : 'tracks'} imported to your library`, {kind: 'success'}); haptics.play('load'); await reload(); }
  }
  async function searchOnline() {
    const o = state.online; const q = state.query;
    o.loading = true; o.error = ''; o.query = q; refresh(true);
    try {
      const result = await sources.search(state.provider, q, {limit: 25});
      o.results = result.tracks; o.nextPage = result.nextPage; o.notice = result.tracks.length ? result.notice : `No results on ${state.provider} for “${q}”.`;
    } catch (e) { o.results = []; o.error = e.name === 'AbortError' ? '' : e.message; }
    o.loading = false; refresh(true);
  }
  function openSources() {
    const list = sources.list();
    const s = sheet({title: 'Music sources', body: html`<div class="stack">
      <p class="notice">${icon('info')}<span>Online audio is loaded only after an explicit license check. Live access to each service is not verified in this build.</span></p>
      ${list.map(src => html`<article class="panel panel-tight source-card"><div class="between"><div><strong>${src.name}</strong><div class="status ${src.status === 'Catalog available' ? 'is-ready' : src.status === 'Unavailable' ? 'is-error' : 'is-idle'}">${src.status}</div></div><a class="btn btn-sm btn-ghost" href="${src.url}" target="_blank" rel="noopener">${icon('external', {size: 14})}</a></div><p class="muted" style="font-size:12px">${src.description}</p>${src.error ? html`<p class="danger" style="font-size:12px">${src.error}</p>` : ''}${src.setupFields.length ? html`<form class="stack" data-source-setup="${src.id}">${src.setupFields.map(f => html`<label class="field"><span>${f.label}</span><input class="input" name="${f.key}" type="${f.type}" value="${sources.getConfig()[src.id]?.[f.key] || ''}" placeholder="${f.placeholder}" autocomplete="off"></label>`)}<div class="between"><small class="dim">Stored on this device only. Never enter a client secret.</small><button type="submit" class="btn btn-sm btn-primary">Save setup</button></div></form>` : ''}</article>`)}
    </div>`});
    delegate(s.el, 'submit', '[data-source-setup]', async (e, form) => { e.preventDefault(); const values = Object.fromEntries(new FormData(form)); try { await sources.configure(form.dataset.sourceSetup, values); toast(`${form.dataset.sourceSetup} setup saved. Live access is still not verified.`, {kind: 'success'}); } catch (err) { onError(err); } });
  }
  function moreSheet(t) {
    const s = sheet({title: t.title || 'Track', body: html`<div class="stack">
      <div class="two-up"><button class="btn btn-deck1" data-more-load="0">Load to Deck 1</button><button class="btn btn-deck2" data-more-load="1">Load to Deck 2</button></div>
      <button class="btn" data-more-fav>${icon(isFavorite(t.id) ? 'heartFilled' : 'heart', {size: 16})} ${isFavorite(t.id) ? 'Remove favourite' : 'Add to favourites'}</button>
      <button class="btn" data-more-crate>${icon('folder', {size: 16})} Add to crate</button>
      ${sourceKind(t) === 'video' ? html`<button class="btn" data-more-challenge>${icon('challenge', {size: 16})} Queue in Challenge</button>` : ''}
      ${tracks.some(x => x.id === t.id) && !t.demo ? html`<button class="btn btn-danger" data-more-delete>${icon('trash', {size: 16})} Delete from library</button>` : ''}
    </div>`});
    delegate(s.el, 'click', '[data-more-load]', (e, b) => { s.close(); load(Number(b.dataset.moreLoad), t); });
    delegate(s.el, 'click', '[data-more-fav]', () => { s.close(); toggleFavorite(t.id); });
    delegate(s.el, 'click', '[data-more-crate]', () => { s.close(); addToCrate(t.id); });
    delegate(s.el, 'click', '[data-more-challenge]', () => { s.close(); router.navigate('challenge', {queue: t.id}); });
    delegate(s.el, 'click', '[data-more-delete]', () => { s.close(); deleteTrack(t); });
  }
  async function toggleFavorite(id) {
    collections.favorites = isFavorite(id) ? collections.favorites.filter(x => x !== id) : [id, ...collections.favorites];
    haptics.play('toggle'); await saveCollections();
  }
  async function addToCrate(id) {
    if (!collections.crates.length) { const name = await prompt({title: 'New crate', label: 'Crate name', placeholder: 'e.g. Friday warm-up', validate: v => v ? null : 'Enter a name.'}); if (!name) return; collections.crates.push({id: globalThis.crypto.randomUUID(), name, ids: [id], bars: 8}); await saveCollections(); toast(`Added to “${name}”`, {kind: 'success'}); return; }
    const s = sheet({title: 'Add to crate', body: html`<div class="stack">${collections.crates.map(c => html`<button class="btn ${c.ids.includes(id) ? 'btn-green' : ''}" data-pick-crate="${c.id}">${icon('folder', {size: 16})} ${c.name} <small class="muted">${c.ids.length}</small></button>`)}<button class="btn btn-violet" data-pick-new>${icon('plus', {size: 16})} New crate</button></div>`});
    delegate(s.el, 'click', '[data-pick-crate]', async (e, b) => { const c = collections.crates.find(x => x.id === b.dataset.pickCrate); s.close(); if (!c) return; if (!c.ids.includes(id)) c.ids.push(id); await saveCollections(); toast(`Added to “${c.name}”`, {kind: 'success'}); });
    delegate(s.el, 'click', '[data-pick-new]', async () => { s.close(); const name = await prompt({title: 'New crate', label: 'Crate name', validate: v => v ? null : 'Enter a name.'}); if (!name) return; collections.crates.push({id: globalThis.crypto.randomUUID(), name, ids: [id], bars: 8}); await saveCollections(); toast(`Added to “${name}”`, {kind: 'success'}); });
  }
  async function deleteTrack(t) {
    const ok = await confirm({title: `Delete “${t.title}”?`, body: assigned(t.id).length ? 'It is loaded on a deck and keeps playing until replaced, but the stored file and its preparation will be removed.' : 'The stored file and its preparation will be removed from this device.', confirmLabel: 'Delete', danger: true});
    if (!ok) return;
    try { await store.deleteTrack(t.id); if (state.selectedId === t.id) state.selectedId = null; collections.favorites = collections.favorites.filter(x => x !== t.id); collections.recents = collections.recents.filter(x => x !== t.id); collections.crates.forEach(c => { c.ids = c.ids.filter(x => x !== t.id); }); await store.setCollections(collections); toast('Track deleted'); await reload(); } catch (e) { onError(e); }
  }
  async function savePrepare(form) {
    const t = trackById(state.selectedId); if (!t) return;
    const data = Object.fromEntries(new FormData(form));
    try {
      const updates = {title: String(data.title || '').trim().slice(0, 120) || t.title, artist: String(data.artist || '').trim().slice(0, 120)};
      const bpm = String(data.bpm || '').trim(); if (bpm) { const n = Number(bpm); if (!Number.isFinite(n) || n < 30 || n > 300) throw new Error('Enter a BPM between 30 and 300.'); updates.bpm = Math.round(n * 10) / 10; updates.bpmSource = 'manual'; } else { updates.bpm = 0; updates.bpmSource = 'unknown'; }
      const start = parseTime(data.start); updates.start = start ?? 0;
      if (tracks.some(x => x.id === t.id)) await store.updateTrack(t.id, updates); else Object.assign(t, updates);
      state.prepareOpen = true;
      toast('Preparation saved. It applies the next time the track is loaded.', {kind: 'success'});
      await reload();
    } catch (e) { onError(e); }
  }
  async function practicePair(n) {
    const list = visibleTracks(); const a = list[n], b = list[n + 1];
    if (!a || !b) return;
    try {
      const okA = await loader.load(0, a); if (!okA) return;
      const okB = await loader.load(1, b); if (!okB) return;
      engine.setCrossfade(0);
      toast(`Practice pair ready: play Deck 1, then use FX → Transition to Deck 2.`, {kind: 'success', timeout: 5000});
      router.navigate('decks', {});
    } catch (e) { onError(e); }
  }
  function exportCrate(crate) {
    const json = JSON.stringify(recipeFrom(crate, tracks), null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    if (globalThis.MixlineAndroid) { const reader = new FileReader(); reader.onload = () => globalThis.MixlineAndroid.postMessage(JSON.stringify({type: 'export', mime: 'application/json', name: `${crate.name}.mixline-set.json`, base64: String(reader.result).split(',')[1]})); reader.readAsDataURL(blob); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${crate.name}.mixline-set.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- wiring ---------- */
  function bind(el) {
    let searchTimer = 0;
    on(el, 'input', '[data-lib-search]', (e, input) => { clearTimeout(searchTimer); const value = input.value; searchTimer = setTimeout(() => { state.query = value; refresh(true); }, 120); });
    on(el, 'keydown', '[data-lib-search]', (e) => { if (e.key === 'Enter' && state.source === 'online') { state.query = e.target.value; searchOnline(); } });
    on(el, 'change', '[data-lib-mode]', (e, s) => { state.mode = s.value; refresh(true); });
    on(el, 'change', '[data-lib-sort]', (e, s) => { state.sort = s.value; refresh(true); });
    on(el, 'click', '[data-lib-tab]', (e, b) => { state.tab = b.dataset.libTab; state.crateId = null; haptics.play('select'); refresh(true); });
    on(el, 'click', '[data-lib-source]', (e, b) => { state.source = b.dataset.libSource; haptics.play('select'); refresh(true); if (state.source === 'online' && !state.online.results.length && !state.online.loading) searchOnline(); });
    on(el, 'click', '[data-lib-provider]', (e, b) => { state.provider = b.dataset.libProvider; state.online.results = []; state.online.error = ''; refresh(true); searchOnline(); });
    on(el, 'click', '[data-lib-online-search]', () => searchOnline());
    on(el, 'click', '[data-lib-chip-remove]', (e, b) => { if (b.dataset.libChipRemove === 'query') state.query = ''; else state.source = 'all'; refresh(true); });
    on(el, 'click', '[data-lib-clear]', () => { state.query = ''; state.source = 'all'; refresh(true); });
    on(el, 'click', '[data-lib-for-clear]', () => { state.forDeck = null; refresh(true); });
    on(el, 'click', '[data-lib-sources]', () => openSources());
    on(el, 'click', '[data-lib-import]', () => $('[data-lib-file]', el)?.click());
    on(el, 'change', '[data-lib-file]', (e, input) => { importFiles([...input.files]); input.value = ''; });
    on(el, 'click', '.row[data-track-id]', (e, r) => { if (e.target.closest('[data-row-more]')) return; if (state.selectedId !== r.dataset.trackId) { state.selectedId = r.dataset.trackId; haptics.play('select'); refresh(true); } $('[data-inspector]', el)?.scrollIntoView({block: 'nearest', behavior: 'smooth'}); });
    on(el, 'keydown', '.row[data-track-id]', (e, r) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.click(); } });
    on(el, 'click', '[data-row-more]', (e, b) => { const t = trackById(b.dataset.rowMore); if (t) moreSheet(t); });
    on(el, 'click', '[data-lib-deselect]', () => { state.selectedId = null; stopPreview(); refresh(true); });
    on(el, 'click', '[data-load-deck]', (e, b) => { const t = trackById(state.selectedId); if (t) load(Number(b.dataset.loadDeck), t); });
    on(el, 'click', '[data-lib-preview]', async () => { const t = trackById(state.selectedId); if (!t) return; try { await togglePreview(t); } catch (err) { onError(err); } });
    on(el, 'click', '[data-lib-analyze]', async () => { const t = trackById(state.selectedId); if (!t) return; try { await analyse(t); toast('Waveform prepared', {kind: 'success'}); } catch (err) { onError(err); } });
    on(el, 'click', '[data-lib-bpm-analyze]', async () => { const t = trackById(state.selectedId); if (!t) return; try { const est = await analyse(t, {bpm: true}); if (!est) throw new Error('No reliable tempo estimate. Use Tap or enter BPM manually.'); state.prepareOpen = true; toast(`Estimated ${est.bpm} BPM (confidence ${Math.round(est.confidence * 100)}%). Correct it if needed.`, {kind: 'success'}); refresh(true); } catch (err) { onError(err); } });
    const taps = [];
    on(el, 'click', '[data-lib-tap]', () => { const now = performance.now(); if (taps.length && now - taps.at(-1) > 2500) taps.length = 0; taps.push(now); if (taps.length > 8) taps.shift(); if (taps.length > 1) { const bpm = Math.round(60000 * (taps.length - 1) / (now - taps[0]) * 10) / 10; $('[data-lib-bpm]', el).value = String(bpm); } haptics.play('step'); });
    on(el, 'submit', '[data-lib-form]', (e, form) => { e.preventDefault(); savePrepare(form); });
    on(el, 'click', '[data-lib-cue]', async () => { const t = trackById(state.selectedId); if (!t) return; const start = Math.round(previewPosition(t) * 1000) / 1000; if (tracks.some(x => x.id === t.id)) await store.updateTrack(t.id, {start}); else t.start = start; toast(`Start point set at ${timeInput(start)}`, {kind: 'success'}); await reload(); });
    on(el, 'click', '[data-lib-loop-in]', async () => { const t = trackById(state.selectedId); if (!t) return; state.loopIn = previewPosition(t); toast(`Loop in at ${timeInput(state.loopIn)}`); });
    on(el, 'click', '[data-lib-loop-out]', async () => { const t = trackById(state.selectedId); if (!t) return; const start = state.loopIn ?? t.start ?? 0, end = previewPosition(t); if (end - start < 0.02) { onError(new Error('Loop out must be after loop in.')); return; } const loop = {start, end}; if (tracks.some(x => x.id === t.id)) await store.updateTrack(t.id, {loop}); else t.loop = loop; toast(`Loop ${timeInput(start)} → ${timeInput(end)} saved`, {kind: 'success'}); await reload(); });
    on(el, 'click', '[data-lib-loop-clear]', async () => { const t = trackById(state.selectedId); if (!t) return; if (tracks.some(x => x.id === t.id)) await store.updateTrack(t.id, {loop: null}); else t.loop = null; await reload(); });
    on(el, 'click', '[data-lib-favorite]', () => { if (state.selectedId) toggleFavorite(state.selectedId); });
    on(el, 'click', '[data-lib-crate-add]', () => { if (state.selectedId) addToCrate(state.selectedId); });
    on(el, 'click', '[data-lib-delete]', () => { const t = trackById(state.selectedId); if (t) deleteTrack(t); });
    on(el, 'click', '[data-lib-recents-clear]', async () => { collections.recents = []; await saveCollections(); });
    on(el, 'click', '[data-crate-id]', (e, r) => { state.crateId = r.dataset.crateId; refresh(true); });
    on(el, 'click', '[data-lib-crate-back]', () => { state.crateId = null; refresh(true); });
    on(el, 'click', '[data-lib-crate-new]', async () => { const name = await prompt({title: 'New crate', label: 'Crate name', placeholder: 'e.g. Friday warm-up', validate: v => v ? null : 'Enter a name.'}); if (!name) return; const crate = {id: globalThis.crypto.randomUUID(), name, ids: [], bars: 8}; collections.crates.push(crate); state.crateId = crate.id; await saveCollections(); });
    on(el, 'click', '[data-lib-crate-rename]', async () => { const c = collections.crates.find(x => x.id === state.crateId); if (!c) return; const name = await prompt({title: 'Rename crate', label: 'Crate name', value: c.name, validate: v => v ? null : 'Enter a name.'}); if (!name) return; c.name = name; await saveCollections(); });
    on(el, 'click', '[data-lib-crate-delete]', async () => { const c = collections.crates.find(x => x.id === state.crateId); if (!c) return; if (!await confirm({title: `Delete crate “${c.name}”?`, body: 'Tracks stay in your library; only the order is removed.', confirmLabel: 'Delete', danger: true})) return; collections.crates = collections.crates.filter(x => x !== c); state.crateId = null; await saveCollections(); });
    on(el, 'click', '[data-lib-crate-export]', () => { const c = collections.crates.find(x => x.id === state.crateId); if (c) exportCrate(c); });
    on(el, 'click', '[data-lib-crate-import]', () => $('[data-lib-recipe-file]', el)?.click());
    on(el, 'change', '[data-lib-recipe-file]', async (e, input) => { const file = input.files[0]; input.value = ''; if (!file) return; try { const recipe = normalizeRecipe(JSON.parse(await file.text())); const known = recipe.ids.filter(id => tracks.some(t => t.id === id)); collections.crates.push({id: globalThis.crypto.randomUUID(), name: recipe.name, ids: known, bars: recipe.bars}); await saveCollections(); toast(`Imported “${recipe.name}”: ${known.length} of ${recipe.ids.length} tracks are in this library.`, {kind: known.length ? 'success' : 'warning'}); } catch (err) { onError(err); } });
    on(el, 'click', '[data-crate-move]', async (e, b) => { const [id, dir] = b.dataset.crateMove.split(':'); const c = collections.crates.find(x => x.id === state.crateId); if (!c) return; const i = c.ids.indexOf(id), j = i + Number(dir); if (i < 0 || j < 0 || j >= c.ids.length) return; [c.ids[i], c.ids[j]] = [c.ids[j], c.ids[i]]; await saveCollections(); });
    on(el, 'click', '[data-crate-remove]', async (e, b) => { const c = collections.crates.find(x => x.id === state.crateId); if (!c) return; c.ids = c.ids.filter(x => x !== b.dataset.crateRemove); await saveCollections(); });
    on(el, 'click', '[data-lib-practice]', (e, b) => practicePair(Number(b.dataset.libPractice)));
  }

  return {
    name: 'library',
    get state() { return state; },
    reload,
    mount(el, params = {}) { container = el; key = ''; if (params.forDeck !== undefined) state.forDeck = params.forDeck; bind(el); refresh(true); reload(); },
    unmount() { offs.forEach(off => off()); offs.length = 0; stopPreview(); container = null; },
    update(detail) { if (!container) return; if (detail?.loaded !== undefined || detail?.ejected !== undefined || detail?.loadFailed !== undefined) refresh(true); }
  };
}

const EMPTY_ART = `<svg class="empty-art" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="ea" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#a855ff"/><stop offset="1" stop-color="#00e5ff"/></linearGradient></defs><circle cx="60" cy="62" r="40" fill="none" stroke="url(#ea)" stroke-width="2" opacity=".5"/><circle cx="60" cy="62" r="26" fill="none" stroke="url(#ea)" stroke-width="2" opacity=".7"/><circle cx="60" cy="62" r="8" fill="url(#ea)"/><path d="M78 24l6 3-6 3M42 24l-6 3 6 3" stroke="#ede6dd" stroke-width="2" fill="none" opacity=".6"/><path d="M60 14v8" stroke="#ede6dd" stroke-width="2" opacity=".6"/></svg>`;
