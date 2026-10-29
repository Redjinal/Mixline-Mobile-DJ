// Hash router.
//   #/                          home: screen index by family
//   #/s/<screen-id>?state=x&o=portrait&scenario=y   a screen in a state
//   #/walk/<n>                  walkthrough scene n (1-based)
//   #/gallery                   component gallery (alias of #/s/foundation/gallery)
//
// The router renders into #outlet, wraps shell screens in <mdj-shell>, and exposes
// window.mdj for the audit/preview tools.
import * as State from './state.js';
import { getScreen, allScreens, byFamily, FAMILIES } from './registry.js';
import { fixtures } from './fixtures.js';
import { h, registry as componentRegistry } from '../components/base.js';
import { scenes, renderWalkBar } from './walkthrough.js';

let outlet, current = null, lastKey = '';
const hooks = { afterRender: new Set() };

export function parseHash() {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const [path, query = ''] = raw.split('?');
  const q = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 's' && parts.length >= 2) return { kind: 'screen', id: parts.slice(1).join('/'), state: q.get('state'), q };
  if (parts[0] === 'walk') return { kind: 'walk', n: Math.max(1, parseInt(parts[1] || '1', 10) || 1), q };
  if (parts[0] === 'gallery') return { kind: 'screen', id: 'foundation/gallery', state: q.get('state'), q };
  return { kind: 'home', q };
}

export function hrefFor(id, { state = null, o = null, scenario = null } = {}) {
  const q = new URLSearchParams();
  if (state) q.set('state', state);
  if (o) q.set('o', o);
  if (scenario) q.set('scenario', scenario);
  const qs = q.toString();
  return `#/s/${id}${qs ? `?${qs}` : ''}`;
}

export function navigate(id, opts = {}) {
  if (opts.o) State.set({ orientation: opts.o });
  location.hash = hrefFor(id, { ...opts, o: null });
}

export function navigateWalk(n) { location.hash = `#/walk/${n}`; }

export function currentRoute() { return current; }
export function onAfterRender(fn) { hooks.afterRender.add(fn); return () => hooks.afterRender.delete(fn); }

export function init(outletEl) {
  outlet = outletEl;
  window.addEventListener('hashchange', () => { State.set(queryState()); render(); });
  State.subscribe(() => render());
  State.set(queryState());
  render();
  window.mdj = {
    navigate, navigateWalk, hrefFor, parseHash,
    get current() { return current; },
    screens: () => allScreens().map(describeScreen),
    components: () => componentRegistry.components.map((c) => ({ tag: c.tag, states: c.states, fr: c.fr, hit: c.hit, fixture: !!c.fixture, file: `components/${c.tag}.js` })),
    scenes: () => scenes,
    state: State,
    fixtures,
    rerender: render,
  };
}

function queryState() {
  const { q } = parseHash();
  const patch = {};
  if (q.get('o')) patch.orientation = q.get('o');
  for (const k of ['theme', 'tier', 'motion', 'fontscale', 'viewport', 'scenario', 'hitbounds', 'insets', 'frame']) if (q.get(k)) patch[k] = q.get(k);
  return patch;
}

function describeScreen(sc) {
  return { id: sc.id, family: sc.family, title: sc.title, fr: sc.fr, shell: sc.shell, orientations: sc.orientations, states: Object.fromEntries(Object.entries(sc.states).map(([k, v]) => [k, { label: v.label, exercised: !!v.exercised, scenario: v.scenario || null }])) };
}

export function buildContext(screen, stateId) {
  const proto = State.get();
  const st = screen.states[stateId] || screen.states[screen.defaultState];
  const scenarioId = st?.scenario || proto.scenario;
  const session = fixtures.scenario(scenarioId) || fixtures.scenario('set-ready');
  return {
    screen, state: stateId, stateDef: st, orientation: proto.orientation, scenario: scenarioId, session, fixtures, prototype: proto,
    navigate, hrefFor,
    setState: (next, extra = {}) => navigate(screen.id, { state: next, ...extra }),
  };
}

function render() {
  if (!outlet) return;
  const route = parseHash();
  const proto = State.get();
  let screen = null, stateId = null, walkIndex = null;

  if (route.kind === 'walk') {
    walkIndex = Math.min(route.n, scenes.length) - 1;
    const scene = scenes[walkIndex];
    screen = getScreen(scene.screen);
    stateId = scene.state;
    if (scene.scenario && proto.scenario !== scene.scenario) { State.set({ scenario: scene.scenario }); return; }
    if (scene.orientation && proto.orientation !== scene.orientation) { State.set({ orientation: scene.orientation }); return; }
  } else if (route.kind === 'screen') {
    screen = getScreen(route.id);
    stateId = route.state;
  }

  const key = JSON.stringify([route, proto, screen?.id, stateId]);
  if (key === lastKey) return;
  lastKey = key;

  outlet.replaceChildren();
  document.getElementById('walkbar')?.replaceChildren();

  if (route.kind === 'home') { current = { kind: 'home' }; outlet.appendChild(renderHome()); fire(); return; }
  if (!screen) { current = { kind: 'missing', id: route.id }; outlet.appendChild(renderMissing(route.id)); fire(); return; }
  if (!stateId || !screen.states[stateId]) stateId = screen.defaultState;

  const ctx = buildContext(screen, stateId);
  current = { kind: 'screen', id: screen.id, state: stateId, orientation: ctx.orientation, scenario: ctx.scenario, walk: walkIndex == null ? null : walkIndex + 1 };
  document.documentElement.dataset.screen = screen.id;
  document.documentElement.dataset.family = screen.family;
  document.documentElement.dataset.shell = screen.shell ? 'on' : 'off';

  let node;
  try { node = screen.render(ctx); } catch (err) { console.error(err); node = renderError(screen, err); }
  if (screen.shell) {
    const shell = document.createElement('mdj-shell');
    shell.ctx = ctx;
    const dock = typeof screen.dock === 'object' ? screen.dock[ctx.orientation] !== false : screen.dock !== false;
    shell.setAttribute('dock', dock ? 'on' : 'off');
    shell.content = node;
    outlet.appendChild(shell);
  } else {
    node.classList?.add('screen-root');
    outlet.appendChild(node);
  }
  if (walkIndex != null) document.getElementById('walkbar')?.appendChild(renderWalkBar(walkIndex, ctx));
  fire();
}

function fire() { for (const fn of hooks.afterRender) fn(current); document.dispatchEvent(new CustomEvent('mdj:rendered', { detail: current })); }

function renderHome() {
  const fam = byFamily();
  const root = h('div', { class: 'home stage screen-root' });
  root.appendChild(h('header', { class: 'home__head' }, [
    h('p', { class: 'label', text: 'Mobile DJ · working label' }),
    h('h1', { class: 'title home__title', text: 'Crystal Current design prototype' }),
    h('p', { class: 'body muted', text: 'Design evidence only. No audio engine, source adapter, model or device measurement. Every waveform, meter and progress value is a labelled fixture.' }),
    h('p', { class: 'home__links' }, [
      h('a', { class: 'btn btn--primary', href: '#/walk/1', dataset: { hit: '48' } }, ['Start the first-mix walkthrough']),
      h('a', { class: 'btn', href: '#/gallery', dataset: { hit: '48' } }, ['Component gallery']),
    ]),
  ]));
  for (const [famId, list] of Object.entries(fam)) {
    const sec = h('section', { class: 'home__family' });
    sec.appendChild(h('h2', { class: 'title home__family-title', text: FAMILIES[famId].title }));
    const ul = h('ul', { class: 'home__screens' });
    for (const sc of list) {
      const li = h('li', {});
      li.appendChild(h('a', { href: hrefFor(sc.id), class: 'home__screen', dataset: { hit: '48' } }, [h('span', { class: 'home__screen-title', text: sc.title }), h('span', { class: 'home__screen-id numeral', text: sc.id })]));
      const states = h('span', { class: 'home__states' });
      for (const [sid, def] of Object.entries(sc.states)) states.appendChild(h('a', { href: hrefFor(sc.id, { state: sid }), class: `chip chip--${def.exercised ? 'exercised' : 'drawn'}`, dataset: { hit: '48' }, title: def.exercised ? 'Exercised by an interaction' : 'Drawn; reached via the switcher' }, [def.label]));
      li.appendChild(states);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    root.appendChild(sec);
  }
  return root;
}

function renderMissing(id) {
  return h('div', { class: 'screen-root stage missing' }, [
    h('h1', { class: 'title', text: 'Screen not registered' }),
    h('p', { class: 'body', text: `No screen with id "${id}". Registered screens:` }),
    h('ul', {}, allScreens().map((sc) => h('li', {}, [h('a', { href: hrefFor(sc.id) }, [sc.id])]))),
  ]);
}
function renderError(screen, err) {
  return h('div', { class: 'screen-root stage missing' }, [
    h('h1', { class: 'title', text: `Render error in ${screen.id}` }),
    h('pre', { class: 'numeral', text: String(err?.stack || err) }),
  ]);
}
