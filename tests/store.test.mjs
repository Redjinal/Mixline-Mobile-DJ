import test from 'node:test';
import assert from 'node:assert/strict';
import {Store, DB_NAME, DB_VERSION, DEFAULT_COLLECTIONS} from '../web/js/core/store.js';

test('database identity is kept so existing libraries survive the update', () => {
  assert.equal(DB_NAME, 'mixline-studio-4');
  assert.equal(DB_VERSION, 1);
});
test('session-only source blobs use a bounded transient cache without IndexedDB writes', async () => {
  const s = new Store(); s.transaction = async () => assert.fail('Transient operations must not write persistent audio'); const blob = new Blob(['audio']);
  const t = s.cacheTrack({id: 'jamendo:1', title: 'Online', capabilities: {offline: false}}, blob);
  assert.equal(t.transient, true); assert.equal((await s.getTrack('jamendo:1')).blob, blob);
  await s.updateTrack('jamendo:1', {start: 3}); assert.equal((await s.getTrack('jamendo:1')).track.start, 3);
  for (let i = 2; i < 10; i++) s.cacheTrack({id: `jamendo:${i}`}, blob);
  assert.equal(s.transientTracks.size, 6); assert.equal(s.transientTracks.has('jamendo:1'), false);
});
test('collections default shape and normalisation', async () => {
  const saved = {};
  const s = new Store();
  s.transaction = async (name, mode, op) => { const store = {get: id => ({result: saved[id]}), put: row => { saved[row.id] = row; }}; const r = op(store); return r?.result; };
  assert.deepEqual(await s.getCollections(), DEFAULT_COLLECTIONS);
  await s.setCollections({favorites: ['a', 'a', 'b'], recents: ['x'], crates: [{id: 'c1', name: 'Set', ids: ['a']}], junk: true});
  const c = await s.getCollections();
  assert.deepEqual(c.favorites, ['a', 'b']); assert.deepEqual(c.recents, ['x']); assert.equal(c.crates[0].name, 'Set'); assert.equal('junk' in c, false);
});
test('saveTrack requires audio for non-demo records', async () => {
  const s = new Store(); s.transaction = async (name, mode, op) => { const store = {get: () => ({result: undefined}), put: () => ({result: undefined})}; return op(store)?.result; };
  await assert.rejects(s.saveTrack({id: 'x', title: 'No audio'}), /Select an audio file/);
  const meta = await s.saveTrack({id: 'demo-red', demo: 'red', title: 'Demo'});
  assert.equal(meta.id, 'demo-red'); assert.equal('blob' in meta, false); assert.ok(meta.added);
});
