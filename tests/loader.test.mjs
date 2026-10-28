import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoader} from '../web/js/core/loader.js';

function fakeEngine() {
  const calls = [];
  return {
    calls,
    decks: [{track: null, playing: false}, {track: {id: 'playing'}, playing: true}],
    async load(i, track, blob) { calls.push(['load', i, track.id, blob ? blob.size : null]); this.decks[i].track = track; return true; },
    cancelLoad(i) { calls.push(['cancel', i]); }
  };
}
const blob = new Blob(['123']);
const fakeStore = () => ({
  tracks: {local1: {track: {id: 'local1', title: 'Local', source: 'local'}, blob}},
  async getTrack(id) { return this.tracks[id] || null; },
  collections: {favorites: [], recents: [], crates: []},
  async getCollections() { return this.collections; },
  async setCollections(c) { this.collections = c; return c; },
  cacheTrack(track, b) { return {...track, transient: true}; },
  async saveTrack(track, b) { this.tracks[track.id] = {track, blob: b}; return track; }
});

test('demo tracks load through the engine without a blob and are added to recents', async () => {
  const engine = fakeEngine(), store = fakeStore();
  const loader = createLoader({engine, store, sources: null, confirm: async () => true, isLocked: () => false});
  const result = await loader.load(0, {id: 'demo-red', demo: 'red', title: 'Afterhours'});
  assert.equal(result, true);
  assert.deepEqual(engine.calls[0], ['load', 0, 'demo-red', null]);
  assert.deepEqual(store.collections.recents, ['demo-red']);
});
test('local tracks resolve their stored audio', async () => {
  const engine = fakeEngine(), store = fakeStore();
  const loader = createLoader({engine, store, sources: null, confirm: async () => true, isLocked: () => false});
  await loader.load(0, {id: 'local1'});
  assert.deepEqual(engine.calls[0], ['load', 0, 'local1', 3]);
});
test('a missing local file is reported and the deck is untouched', async () => {
  const engine = fakeEngine(), store = fakeStore();
  const loader = createLoader({engine, store, sources: null, confirm: async () => true, isLocked: () => false});
  await assert.rejects(loader.load(0, {id: 'gone', source: 'local', title: 'Gone'}), /no longer in the library|missing/i);
  assert.equal(engine.calls.length, 0); assert.equal(engine.decks[0].track, null);
});
test('replacing a playing deck asks first and a refusal changes nothing', async () => {
  const engine = fakeEngine(), store = fakeStore();
  let asked = 0;
  const loader = createLoader({engine, store, sources: null, confirm: async () => { asked++; return false; }, isLocked: () => false});
  assert.equal(await loader.load(1, {id: 'local1'}), false);
  assert.equal(asked, 1); assert.equal(engine.calls.length, 0); assert.equal(engine.decks[1].track.id, 'playing');
});
test('performance lock refuses loads with a clear message', async () => {
  const engine = fakeEngine(), store = fakeStore();
  const loader = createLoader({engine, store, sources: null, confirm: async () => true, isLocked: () => true});
  await assert.rejects(loader.load(0, {id: 'local1'}), /locked/i);
  assert.equal(engine.calls.length, 0);
});
test('online tracks are prepared through sources and cached for the session unless offline is allowed', async () => {
  const engine = fakeEngine(), store = fakeStore();
  const sources = {async prepare(track) { return {track: {...track, capabilities: {load: true, offline: track.sourceId === 'keep'}}, blob}; }};
  const loader = createLoader({engine, store, sources, confirm: async () => true, isLocked: () => false});
  await loader.load(0, {id: 'audius:x', provider: 'audius', sourceId: 'x', online: true, title: 'Stream'});
  assert.equal(engine.calls[0][1], 0); assert.equal(engine.calls[0][3], 3);
  assert.equal('audius:x' in store.tracks, false);
  await loader.load(0, {id: 'archive:keep', provider: 'archive', sourceId: 'keep', online: true, title: 'Keep'});
  assert.equal('archive:keep' in store.tracks, true);
});
test('loading the same deck again cancels the earlier load first', async () => {
  const engine = fakeEngine(), store = fakeStore();
  const releases = [];
  engine.load = (i, track) => new Promise(resolve => { engine.calls.push(['load', i, track.id]); releases.push(() => resolve(true)); });
  const loader = createLoader({engine, store, sources: null, confirm: async () => true, isLocked: () => false});
  const first = loader.load(0, {id: 'local1'});
  await new Promise(r => setImmediate(r));
  const second = loader.load(0, {id: 'demo-red', demo: 'red'});
  await new Promise(r => setImmediate(r));
  assert.ok(engine.calls.some(c => c[0] === 'cancel'));
  releases.forEach(release => release());
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(loader.busy(0), false);
});
