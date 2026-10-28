import test from 'node:test';
import assert from 'node:assert/strict';
import {createQueue} from '../web/js/core/queue.js';
const id = 'dQw4w9WgXcQ', other = '9bZkp7q19f0';
const fakeStore = () => ({saved: null, async getSetting() { return this.saved; }, async setSetting(k, v) { this.saved = v; return v; }});

test('adding parses YouTube links, applies defaults and persists; invalid links are refused', async () => {
  const store = fakeStore(); const q = createQueue({store}); await q.init();
  const item = await q.add({url: `https://youtu.be/${id}?t=12`, title: ' Beat one ', start: '5'});
  assert.equal(item.videoId, id); assert.equal(item.title, 'Beat one'); assert.equal(item.start, 5); assert.equal(item.loop, false); assert.equal(item.state, 'queued');
  assert.equal(store.saved.items.length, 1);
  await assert.rejects(q.add({url: 'https://evil.test/?v=' + id}), /YouTube/);
  await assert.rejects(q.add({url: `https://youtu.be/${id}`, start: -4}), /start/i);
});
test('remove keeps an undo buffer that restores the item at its original index', async () => {
  const q = createQueue({store: fakeStore()}); await q.init();
  const a = await q.add({url: id}); const b = await q.add({url: other}); const c = await q.add({url: id, title: 'third'});
  await q.remove(b.id);
  assert.deepEqual(q.items.map(x => x.id), [a.id, c.id]);
  const restored = await q.undo();
  assert.equal(restored.id, b.id); assert.deepEqual(q.items.map(x => x.id), [a.id, b.id, c.id]);
  assert.equal(await q.undo(), null);
});
test('move clamps at the ends and rename/start/loop edits validate', async () => {
  const q = createQueue({store: fakeStore()}); await q.init();
  const a = await q.add({url: id}); const b = await q.add({url: other});
  await q.move(a.id, -1); assert.deepEqual(q.items.map(x => x.id), [a.id, b.id]);
  await q.move(a.id, 1); assert.deepEqual(q.items.map(x => x.id), [b.id, a.id]);
  await q.rename(a.id, '  Renamed  '); assert.equal(q.get(a.id).title, 'Renamed');
  await q.setStart(a.id, 72.5); assert.equal(q.get(a.id).start, 72.5);
  await assert.rejects(q.setStart(a.id, 'nope'), /start/i);
  await q.setLoop(a.id, true); assert.equal(q.get(a.id).loop, true);
  q.setState(a.id, 'buffering'); assert.equal(q.get(a.id).state, 'buffering');
});
test('skip and restore move items between lists; clear all can be undone', async () => {
  const q = createQueue({store: fakeStore()}); await q.init();
  const a = await q.add({url: id}); const b = await q.add({url: other});
  await q.skip(a.id); assert.deepEqual(q.items.map(x => x.id), [b.id]); assert.deepEqual(q.skipped.map(x => x.id), [a.id]);
  await q.restore(a.id); assert.deepEqual(q.items.map(x => x.id), [b.id, a.id]);
  await q.clear(); assert.equal(q.items.length, 0);
  await q.undo(); assert.equal(q.items.length, 2);
});
test('shift removes and returns the first item for loading', async () => {
  const q = createQueue({store: fakeStore()}); await q.init();
  const a = await q.add({url: id}); await q.add({url: other});
  const next = await q.shift(); assert.equal(next.id, a.id); assert.equal(q.items.length, 1);
});
test('init restores a persisted queue and ignores corrupt entries', async () => {
  const store = fakeStore(); store.saved = {items: [{id: 'x', videoId: id, title: 'Kept', start: 3, loop: true}, {id: 'bad'}], skipped: 'nope'};
  const q = createQueue({store}); await q.init();
  assert.equal(q.items.length, 1); assert.equal(q.items[0].title, 'Kept'); assert.deepEqual(q.skipped, []);
});
