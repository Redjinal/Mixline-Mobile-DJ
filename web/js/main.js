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
import {createDecksScreen} from './screens/decks.js';
import {createMixerScreen} from './screens/mixer.js';
import {createPadsScreen} from './screens/pads.js';
import {createFXScreen} from './screens/fx.js';

const ROUTES = [...WORKSPACES.map(w => w.name), 'settings'];
const router = createRouter({routes: ROUTES, initial: 'decks'});
const engine = new MixEngine();
const sources = createSources({store});
const state = {locked: false};
const settings = {haptics: true, hapticProfile: 'essential', theme: 'dark', decks: 'red', motion: 'system', glow: 1, curve: 'blend', stopOutgoing: true, safeLevel: true};
const loader = createLoader({engine, store, sources, confirm: confirmDialog, isLocked: () => state.locked});

const ctx = {
  engine, store, sources, loader, router, toast, haptics, artwork, settings, demos: DEMO_TRACKS,
  confirm: confirmDialog, prompt: promptDialog, sheet,
  get locked() { return state.locked; },
  openLibrary(deck) { router.navigate('library', deck === undefined ? {} : {forDeck: deck}); }
};

/* ---------- header ---------- */
render($('#header'), html`
  <a class="brand" href="#" aria-label="Mixline decks"><span class="brand-name">MIXLINE</span><span class="brand-sep">/</span><span class="brand-space" data-space>Decks</span></a>
  <div class="header-actions">
    <button class="btn btn-icon btn-ghost is-rec" data-record aria-label="Record" aria-pressed="false"><span class="rec-dot"></span></button>
    <button class="btn btn-icon btn-ghost" data-lock aria-label="Performance lock" aria-pressed="false">${icon('unlock')}</button>
    <button class="btn btn-icon btn-ghost" data-settings aria-label="Studio settings">${icon('settings')}</button>
  </div>`);
$('.brand').addEventListener('click', event => { event.preventDefault(); router.navigate('decks', {}); });
$('[data-settings]').addEventListener('click', () => router.navigate('settings'));
$('[data-lock]').addEventListener('click', () => {
  state.locked = !state.locked;
  const b = $('[data-lock]');
  b.setAttribute('aria-pressed', String(state.locked));
  render(b, icon(state.locked ? 'lock' : 'unlock'));
  toast(state.locked ? 'Performance lock on: loading, seeking and queue edits are protected.' : 'Performance lock off.');
  haptics.play('toggle');
});

/* ---------- screens ---------- */
function placeholder(name, label) {
  return {name, mount(el) { render(el, html`<section class="screen"><div class="screen-head"><div><h1>${label}</h1><p>This workspace arrives in a later step of the build.</p></div></div></section>`); }, unmount() {}, update() {}};
}
const screens = {
  decks: createDecksScreen(ctx),
  mixer: createMixerScreen(ctx), pads: createPadsScreen(ctx), fx: createFXScreen(ctx),
  library: placeholder('library', 'Library'), challenge: placeholder('challenge', 'Challenge'), settings: placeholder('settings', 'Studio settings')
};
createNav($('#nav'), router);
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
router.subscribe(show);
show(router.current);

/* ---------- engine events ---------- */
let frame = 0;
const scheduleUpdate = detail => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; active?.update(detail); dock.update(); }); };
engine.addEventListener('change', e => scheduleUpdate(e.detail));
engine.addEventListener('error', e => toast(e.detail.message, {kind: 'error'}));
engine.addEventListener('loaded', e => { const d = engine.decks[e.detail.deck]; toast(`${d.track.title} is ready on Deck ${e.detail.deck + 1}`, {kind: 'success'}); haptics.play('load'); });
engine.addEventListener('transitionend', e => { toast(`Transition complete: Deck ${e.detail.incoming + 1} is live`, {kind: 'success'}); if (settings.stopOutgoing) engine.pause(1 - e.detail.incoming); });

/* ---------- startup ---------- */
async function ensureDemos() {
  try {
    await store.init();
    const existing = new Set((await store.listTracks()).map(t => t.id));
    for (const demo of DEMO_TRACKS) if (!existing.has(demo.id)) await store.saveTrack(demo);
  } catch (e) { console.warn('Library unavailable', e); }
}
ensureDemos();
sources.init().catch(() => {});

window.Mixline = {
  engine, store, router, loader, sources, haptics, toast, settings, screens, demos: DEMO_TRACKS,
  loadDemo: (deck, id) => loader.load(deck, DEMO_TRACKS.find(t => t.id === id || t.demo === id)),
  back: () => closeTopDialog() || router.back()
};
window.mixlineBack = () => window.Mixline.back();
