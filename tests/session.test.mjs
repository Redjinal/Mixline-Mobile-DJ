import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionManager} from '../web/js/core/session.js';

function fakes() {
  const settings = {}; const sessions = new Map();
  const store = {
    async getSetting(k, fallback = null) { return k in settings ? settings[k] : fallback; },
    async setSetting(k, v) { settings[k] = v; return v; },
    async saveSession(name, data, id) { const record = {id: id || `s${sessions.size + 1}`, name, data, updated: Date.now()}; sessions.set(record.id, record); return record; },
    async listSessions() { return [...sessions.values()]; },
    async getSession(id) { return sessions.get(id); },
    async deleteSession(id) { sessions.delete(id); },
    async getTrack(id) { return {track: {id}, blob: new Blob(['x'])}; }
  };
  const engine = {decks: [{track: {id: 'a'}}, {track: null}], restored: null, snapshot() { return {version: 2, decks: [{track: {id: 'a'}, position: 3}, {track: null}], crossfade: 0.4}; }, async restore(snapshot) { this.restored = snapshot; return true; }};
  const queue = {items: [{id: 'q1'}], skipped: []};
  return {store, engine, queue, settings};
}
test('recovery snapshots are written while a track is loaded and cleared on demand', async () => {
  const {store, engine, settings} = fakes();
  const manager = createSessionManager({store, engine, queue: null, intervalMs: 5});
  manager.startAutosave();
  await new Promise(r => setTimeout(r, 30));
  manager.stopAutosave();
  assert.equal(settings['recovery']?.snapshot?.crossfade, 0.4);
  assert.ok(settings['recovery'].savedAt > 0);
  await manager.clearRecovery();
  assert.equal(settings['recovery'], null);
});
test('no recovery snapshot is written for an empty session', async () => {
  const {store, engine, settings} = fakes(); engine.decks[0].track = null;
  const manager = createSessionManager({store, engine, queue: null, intervalMs: 5});
  manager.startAutosave(); await new Promise(r => setTimeout(r, 25)); manager.stopAutosave();
  assert.equal(settings['recovery'], undefined);
});
test('named sessions save, list, restore paused and delete', async () => {
  const {store, engine} = fakes();
  const manager = createSessionManager({store, engine, queue: null});
  const record = await manager.saveNamed('Friday set');
  assert.equal(record.name, 'Friday set');
  assert.equal((await manager.list()).length, 1);
  const ok = await manager.restore(record.id);
  assert.equal(ok, true); assert.equal(engine.restored.crossfade, 0.4);
  await manager.remove(record.id);
  assert.equal((await manager.list()).length, 0);
  await assert.rejects(manager.restore('missing'), /no longer/);
});
test('hasRecovery reports a usable snapshot and restoreRecovery clears it after use', async () => {
  const {store, engine, settings} = fakes();
  settings['recovery'] = {savedAt: Date.now(), snapshot: engine.snapshot()};
  const manager = createSessionManager({store, engine, queue: null});
  const info = await manager.hasRecovery();
  assert.ok(info && info.tracks === 1);
  assert.equal(await manager.restoreRecovery(), true);
  assert.equal(settings['recovery'], null);
});
