/** Mixline 6 bootstrap: one engine, one store, one router; screens are views over the live session. */
import {$, html, render} from './ui/dom.js';
import {icon} from './ui/icons.js';
import {toast} from './ui/toast.js';
import {confirmDialog, promptDialog, sheet, closeTopDialog} from './ui/dialog.js';
import {haptics} from './ui/haptics.js';
import {artwork} from './ui/artwork.js';
import {createRouter} from './shell/router.js';
import {createNav, WORKSPACES} from './shell/nav.js';
import {createDock} from './shell/dock.js';
import {MixEngine} from './core/engine.js';
import {DEMO_TRACKS} from './core/demos.js';
import {store} from './core/store.js';
import {createSources} from './core/sources.js';
import {createLoader} from './core/loader.js';
import {createSettings} from './core/settings.js';
import {createSessionManager} from './core/session.js';
import {VideoMixer} from './core/video.js';
import {createQueue} from './core/queue.js';
import {formatTime} from './core/time.js';
import {createDecksScreen} from './screens/decks.js';
import {createMixerScreen} from './screens/mixer.js';
import {createPadsScreen} from './screens/pads.js';
import {createFXScreen} from './screens/fx.js';
import {createLibraryScreen} from './screens/library.js';
import {createChallengeScreen} from './screens/challenge.js';
import {createSettingsScreen} from './screens/settings.js';
import {createKeyboard} from './shell/keyboard.js';
import {installNativeBridge} from './shell/native.js';

const ROUTES = [...WORKSPACES.map(w => w.name), 'settings'];
const router = createRouter({routes: ROUTES, initial: 'decks'});
const engine = new MixEngine();
const sources = createSources({store});
const state = {locked: false};
const settings = createSettings({store, engine});
const loader = createLoader({engine, store, sources, confirm: confirmDialog, isLocked: () => state.locked});
const video = new VideoMixer();
const queue = createQueue({store});
const sessions = createSessionManager({store, engine, queue});

/** Save a blob through the Android document picker when available, otherwise as a download. */
const exporter = {
  save(blob, name, mime = blob.type || 'application/octet-stream') {
    if (globalThis.MixlineAndroid?.postMessage) {
      const reader = new FileReader();
      reader.onload = () => globalThis.MixlineAndroid.postMessage(JSON.stringify({type: 'export', mime, name, base64: String(reader.result).split(',')[1]}));
      reader.readAsDataURL(blob);
      return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
};

const ctx = {
  engine, store, sources, loader, router, toast, haptics, artwork, settings, sessions, exporter, demos: DEMO_TRACKS, video, queue,
  confirm: confirmDialog, prompt: promptDialog, sheet,
  get locked() { return state.locked; },
  openLibrary(deck) { go('library', deck === undefined ? {} : {forDeck: deck}); },
  openSources() { go('library'); setTimeout(() => $('[data-lib-sources]')?.click(), 50); }
};

/* ---------- header ---------- */
render($('#header'), html`
  <a class="brand" href="#" aria-label="Mixline decks"><span class="brand-name">MIXLINE</span><span class="brand-sep">/</span><span class="brand-space" data-space>Decks</span></a>
  <div class="header-actions">
    <span class="rec-time num" data-record-time hidden></span>
    <button class="btn btn-icon btn-ghost is-rec" data-record aria-label="Record the master bus" aria-pressed="false"><span class="rec-dot"></span></button>
    <button class="btn btn-icon btn-ghost" data-lock aria-label="Performance lock" aria-pressed="false">${icon('unlock')}</button>
    <button class="btn btn-icon btn-ghost" data-settings aria-label="Studio settings">${icon('settings')}</button>
  </div>`);
$('.brand').addEventListener('click', event => { event.preventDefault(); go('decks', {}); });
$('[data-settings]').addEventListener('click', () => go('settings'));
$('[data-lock]').addEventListener('click', () => {
  state.locked = !state.locked;
  const b = $('[data-lock]');
  b.setAttribute('aria-pressed', String(state.locked));
  render(b, icon(state.locked ? 'lock' : 'unlock'));
  toast(state.locked ? 'Performance lock on: loading and deck replacement are protected.' : 'Performance lock off.');
  haptics.play('toggle');
});

/* ---------- recording ---------- */
let recordTimer = 0;
async function toggleRecording() {
  const button = $('[data-record]'), time = $('[data-record-time]');
  try {
    if (engine.recording) {
      const blob = await engine.stopRecording();
      clearInterval(recordTimer); time.hidden = true;
      button.classList.remove('is-active'); button.setAttribute('aria-pressed', 'false');
      if (!blob || !blob.size) { toast('The recording was empty.', {kind: 'warning'}); return; }
      const record = await store.saveRecording(blob, `Mixline ${new Date().toLocaleString()}`);
      toast(`Recording saved (${(blob.size / 1048576).toFixed(2)} MB)`, {kind: 'success', timeout: 7000, action: {label: 'Save file', onClick: () => exporter.save(blob, `${record.name}.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, blob.type)}});
      haptics.play('load');
    } else {
      await engine.startRecording();
      button.classList.add('is-active'); button.setAttribute('aria-pressed', 'true');
      time.hidden = false;
      recordTimer = setInterval(() => { time.textContent = `REC ${formatTime(engine.recordingElapsed)}`; }, 500);
      time.textContent = 'REC 00:00';
      toast('Recording the master bus. Tap again to stop.', {kind: 'info'});
      haptics.play('press');
    }
  } catch (e) { toast(e.message, {kind: 'error'}); }
}
$('[data-record]').addEventListener('click', toggleRecording);

/* ---------- screens ---------- */
const screens = {
  decks: createDecksScreen(ctx), mixer: createMixerScreen(ctx), pads: createPadsScreen(ctx), fx: createFXScreen(ctx),
  library: createLibraryScreen(ctx), challenge: createChallengeScreen(ctx), settings: createSettingsScreen(ctx)
};
createNav($('#nav'), router, {guard: name => go(name)});
const dock = createDock($('#dock'), {engine, toast});
let active = null;
function show(route) {
  active?.unmount();
  active = screens[route.name];
  const main = $('#main');
  main.scrollTop = 0;
  active.mount(main, route.params);
  const space = WORKSPACES.find(w => w.name === route.name);
  $('[data-space]').textContent = route.name === 'decks' && (route.params.focus === 0 || route.params.focus === 1) ? `Deck ${route.params.focus + 1}` : space ? space.label : 'Settings';
  dock.setVisible(route.name !== 'challenge');
}
/** Navigate with unsaved-settings protection. */
async function go(name, params = {}) {
  if (router.current.name === 'settings' && name !== 'settings' && settings.dirty) {
    const ok = await confirmDialog({title: 'Discard unsaved settings?', body: 'Your saved preferences stay in place; the previewed changes will be reverted.', confirmLabel: 'Discard', danger: true});
    if (!ok) return false;
    settings.discard();
  }
  return router.navigate(name, params);
}
router.subscribe(show);
show(router.current);

/* ---------- engine events ---------- */
let frame = 0;
const scheduleUpdate = detail => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; active?.update(detail); dock.update(); }); };
engine.addEventListener('change', e => scheduleUpdate(e.detail));
engine.addEventListener('error', e => toast(e.detail.message, {kind: 'error'}));
engine.addEventListener('loaded', e => {
  const d = engine.decks[e.detail.deck];
  toast(`${d.track.title} is ready on Deck ${e.detail.deck + 1}`, {kind: 'success'});
  haptics.play('load');
  if (d.track.id && !d.track.transient) store.updateTrack(d.track.id, {peaks: Array.from(d.peaks), duration: d.duration, ...(d.bpm && d.track.bpm !== d.bpm ? {bpm: d.bpm, bpmSource: d.bpmSource} : {})}).then(() => screens.library.reload?.()).catch(() => {});
});
engine.addEventListener('transitionend', e => { toast(`Transition complete: Deck ${e.detail.incoming + 1} is live`, {kind: 'success'}); if (settings.current.stopOutgoing) engine.pause(1 - e.detail.incoming); });
engine.addEventListener('recording', e => { if (e.detail.autoStop) { clearInterval(recordTimer); $('[data-record-time]').hidden = true; $('[data-record]').classList.remove('is-active'); $('[data-record]').setAttribute('aria-pressed', 'false'); store.saveRecording(e.detail.blob, `Mixline ${new Date().toLocaleString()}`).then(() => toast('The recording hit the safety limit and was saved.', {kind: 'warning'})); } });
let warnedLevel = false;
engine.addEventListener('change', e => { if (e.detail?.master && settings.current.safeLevel) { if (engine.master > 0.9 && !warnedLevel) { warnedLevel = true; toast('Master is above 90%. The limiter protects the output, but keep an ear on levels.', {kind: 'warning'}); } else if (engine.master <= 0.9) warnedLevel = false; } });
// Persist preparation edits (hot cues, markers, grid, loop, tempo) so they return on the next load.
const prepTimers = [0, 0];
engine.addEventListener('change', e => {
  const detail = e.detail || {};
  const i = detail.cues ?? detail.markers ?? detail.grid ?? detail.loop ?? detail.bpm;
  if (i !== 0 && i !== 1) return;
  const d = engine.decks[i];
  if (!d.track?.id || d.track.transient) return;
  clearTimeout(prepTimers[i]);
  prepTimers[i] = setTimeout(() => {
    const deck = engine.decks[i];
    if (!deck.track?.id) return;
    store.updateTrack(deck.track.id, {cues: [...deck.cues], cueMeta: deck.cueMeta.map(x => ({...x})), markers: deck.markers.map(x => ({...x})), grid: {...deck.grid}, quantize: deck.quantize, loop: deck.loop ? {start: deck.loop.start, end: deck.loop.end} : null, bpm: deck.bpm, bpmSource: deck.bpmSource}).catch(() => {});
  }, 800);
});

/* ---------- startup ---------- */
async function ensureDemos() {
  try {
    await store.init();
    const existing = new Set((await store.listTracks()).map(t => t.id));
    for (const demo of DEMO_TRACKS) if (!existing.has(demo.id)) await store.saveTrack(demo);
  } catch (e) { console.warn('Library unavailable', e); }
}
async function startup() {
  await ensureDemos();
  await settings.load().catch(() => {});
  await Promise.all([sources.init().catch(() => {}), queue.init().catch(() => {})]);
  screens.library.reload?.();
  sessions.startAutosave();
  try {
    const recovery = await sessions.hasRecovery();
    if (recovery) toast(`Recover your last session? ${recovery.titles.join(' + ')}`, {kind: 'info', timeout: 15000, action: {label: 'Restore', onClick: async () => { try { await sessions.restoreRecovery(); toast('Session restored, paused.', {kind: 'success'}); } catch (e) { toast(e.message, {kind: 'error'}); } }}});
  } catch { /* storage unavailable */ }
}
startup();
document.addEventListener('visibilitychange', () => { if (document.hidden) sessions.snapshotNow().catch(() => {}); });

/* ---------- keyboard and native bridge ---------- */
const back = () => {
  if (closeTopDialog()) return true;
  if (router.current.name === 'settings' && settings.dirty) {
    confirmDialog({title: 'Discard unsaved settings?', body: 'Your saved preferences stay in place; the previewed changes will be reverted.', confirmLabel: 'Discard', danger: true})
      .then(ok => { if (ok) { settings.discard(); router.back(); } });
    return true;
  }
  return router.back();
};
const keyboard = createKeyboard({engine, router, navigate: name => go(name), workspaces: WORKSPACES.map(w => w.name), toast, sheet, onRecord: toggleRecording, onBack: back});
const native = installNativeBridge({engine, video, sessions, toast, back});

window.Mixline = {
  engine, store, router, loader, sources, haptics, toast, settings, sessions, screens, demos: DEMO_TRACKS, video, queue, go,
  loadDemo: (deck, id) => loader.load(deck, DEMO_TRACKS.find(t => t.id === id || t.demo === id)),
  keyboard, native, back
};
