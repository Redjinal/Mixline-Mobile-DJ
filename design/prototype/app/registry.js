// Screen registry. Every screen module registers itself here via register().
// The router, walkthrough, gallery, audit and spec generator all read this list.
//
// Screen module shape (see CONVENTIONS.md):
//   {
//     id: 'perform/ab', family: 'performance', title: 'Perform — A/B',
//     fr: ['FR-010', ...],
//     shell: true,                         // render inside <mdj-shell>
//     dock: { portrait: true, landscape: false },  // transport dock per orientation (shell screens)
//     orientations: ['portrait', 'landscape'],
//     states: { playing: { label: '...', exercised: true, scenario: 'both-playing' }, ... },
//     defaultState: 'playing',
//     render(ctx) -> Node   // ctx: { state, orientation, scenario, session, fixtures, navigate, setState, prototype }
//   }

export const FAMILIES = {
  launch:       { title: 'Launch, library and crates' },
  preparation:  { title: 'Track preparation' },
  routing:      { title: 'Readiness and routing' },
  performance:  { title: 'Performance and mixer' },
  pads:         { title: 'Pads, loops, FX and stems' },
  sampler:      { title: 'Sampler and sequencer' },
  queue:        { title: 'Queue and automix' },
  recording:    { title: 'Recording and history' },
  sources:      { title: 'Sources and downloads' },
  parday:       { title: 'ParDay' },
  av:           { title: 'Video, karaoke, broadcast and microphone' },
  system:       { title: 'Plugin rack, settings and recovery' },
  foundation:   { title: 'Foundation (gallery and shell)' },
};

const screens = new Map();

export function register(screen) {
  if (!screen || !screen.id) throw new Error('register(): screen needs an id');
  if (!FAMILIES[screen.family]) throw new Error(`register(): unknown family "${screen.family}" for ${screen.id}`);
  const normalized = {
    fr: [], shell: false, dock: { portrait: true, landscape: true }, orientations: ['portrait', 'landscape'],
    states: { default: { label: 'Default', exercised: true } }, ...screen,
  };
  if (!normalized.defaultState) normalized.defaultState = Object.keys(normalized.states)[0];
  screens.set(normalized.id, normalized);
  return normalized;
}

export function getScreen(id) { return screens.get(id) || null; }
export function allScreens() { return Array.from(screens.values()); }
export function byFamily() {
  const out = {};
  for (const sc of screens.values()) (out[sc.family] ||= []).push(sc);
  for (const k of Object.keys(out)) out[k].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
  return out;
}

// Screen modules are listed here so index.html can import them in one place.
// Agents: add your module path to the family's list. Keep alphabetical within a family.
export const SCREEN_MODULES = [
  '../screens/foundation/index.js',
  '../screens/launch/index.js',
  '../screens/preparation/index.js',
  '../screens/routing/index.js',
  '../screens/performance/index.js',
  '../screens/pads/index.js',
  '../screens/sampler/index.js',
  '../screens/queue/index.js',
  '../screens/recording/index.js',
  '../screens/sources/index.js',
  '../screens/parday/index.js',
  '../screens/av/index.js',
  '../screens/system/index.js',
];
