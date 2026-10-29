// Fixture loader. Shared core fixtures (tracks, sessions, routes, library, waveforms)
// are loaded once at start. Family fixtures (parday.json, acquisition.json, av.json,
// plugins.json, ...) are loaded lazily with load(name) and cached.
//
// Everything in fixtures/ is invented prototype data. Components that show any of it
// as waveform, meter, level, progress or analysis must render a FIXTURE mark.

const CORE = ['tracks', 'sessions', 'routes', 'library', 'waveforms'];
const cache = new Map();
const base = new URL('../fixtures/', import.meta.url);

export async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const res = await fetch(new URL(`${name}.json`, base));
  if (!res.ok) throw new Error(`fixture ${name}.json: ${res.status}`);
  const data = await res.json();
  cache.set(name, data);
  return data;
}

export const fixtures = {
  tracks: [], trackById: new Map(), sessions: null, routes: {}, library: null, waveforms: {},
  track(id) { return this.trackById.get(id) || null; },
  route(id) { return this.routes[id] || null; },
  waveform(trackId) { return this.waveforms[trackId] || null; },
  scenario(id) {
    const s = this.sessions?.scenarios?.[id];
    if (!s) return null;
    return hydrateScenario(s, this.sessions.deckDefaults, this);
  },
  async family(name) { return load(name); },
};

export async function initFixtures() {
  const [tracks, sessions, routes, library, waveforms] = await Promise.all(CORE.map(load));
  fixtures.tracks = tracks.tracks;
  fixtures.trackById = new Map(tracks.tracks.map((t) => [t.id, t]));
  fixtures.sessions = sessions;
  fixtures.routes = routes.routes;
  fixtures.library = library;
  fixtures.waveforms = waveforms.waveforms;
  return fixtures;
}

// Fill each deck with defaults and resolve its track so screens get one object.
function hydrateScenario(raw, deckDefaults, fx) {
  const decks = {};
  for (const letter of ['A', 'B', 'C', 'D']) {
    const d = { ...deckDefaults, ...(raw.decks?.[letter] || {}) };
    d.letter = letter;
    d.track = d.trackId ? fx.track(d.trackId) : null;
    if (!d.track && d.state !== 'empty' && d.state !== 'missing') d.state = 'empty';
    d.remainingSec = d.track ? Math.max(0, d.track.durationSec - d.positionSec) : 0;
    d.enabled = letter === 'A' || letter === 'B' || !!raw.decks?.[letter];
    decks[letter] = d;
  }
  const route = fx.route(raw.route) || fx.route('speaker');
  const session = raw.session ? fx.sessions.sessions[raw.session] : null;
  return { id: raw.id, ...raw, decks, route, session, deckCount: Object.values(decks).filter((d) => d.enabled).length };
}
