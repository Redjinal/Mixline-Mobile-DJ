import test from 'node:test';
import assert from 'node:assert/strict';
import {filterTracks, parseQuery, normalizeRecipe, sourceKind} from '../web/js/core/library.js';
const tracks = [
  {id: 'a', title: 'Coastline', artist: 'Luna', bpm: 124, added: 1, source: 'local'},
  {id: 'b', title: 'Harbour', artist: 'Coastline Crew', bpm: 128, added: 3, source: 'original', demo: 'harbour'},
  {id: 'c', title: 'Unknown', artist: 'Luna', bpm: 0, added: 2, provider: 'audius', online: true},
  {id: 'd', title: 'Slow', artist: 'Luna', bpm: 90, added: 4, videoId: 'dQw4w9WgXcQ'}
];
test('query parsing extracts BPM ranges and keeps the text', () => {
  assert.deepEqual(parseQuery('Luna bpm:120-130'), {text: 'luna', bpmMin: 120, bpmMax: 130});
  assert.deepEqual(parseQuery('120–126 BPM'), {text: '', bpmMin: 120, bpmMax: 126});
  assert.deepEqual(parseQuery('128 BPM'), {text: '', bpmMin: 126, bpmMax: 130});
  assert.deepEqual(parseQuery('  '), {text: '', bpmMin: null, bpmMax: null});
});
test('structured BPM queries filter known values and preserve the unknown option', () => {
  assert.deepEqual(filterTracks(tracks, {query: '120–126 BPM', unknownBpm: false}).map(t => t.id), ['a']);
  assert.deepEqual(filterTracks(tracks, {query: 'Luna bpm:120-130', unknownBpm: true}).map(t => t.id), ['c', 'a']);
  assert.deepEqual(filterTracks(tracks, {query: '128 BPM', unknownBpm: false}).map(t => t.id), ['b']);
});
test('title and artist modes do not accidentally search the other field', () => {
  assert.deepEqual(filterTracks(tracks, {query: 'Coastline', mode: 'title'}).map(t => t.id), ['a']);
  assert.deepEqual(filterTracks(tracks, {query: 'Coastline', mode: 'artist'}).map(t => t.id), ['b']);
  assert.deepEqual(filterTracks(tracks, {query: 'Coastline'}).map(t => t.id).sort(), ['a', 'b']);
});
test('source chips and sorting behave; unknown BPM sorts last', () => {
  assert.deepEqual(filterTracks(tracks, {source: 'local'}).map(t => t.id), ['a']);
  assert.deepEqual(filterTracks(tracks, {source: 'original'}).map(t => t.id), ['b']);
  assert.deepEqual(filterTracks(tracks, {source: 'online'}).map(t => t.id), ['c']);
  assert.deepEqual(filterTracks(tracks, {source: 'video'}).map(t => t.id), ['d']);
  assert.deepEqual(filterTracks([tracks[1], tracks[0], tracks[2]], {sort: 'manual'}).map(t => t.id), ['b', 'a', 'c']);
  assert.deepEqual(filterTracks(tracks, {sort: 'bpm'}).map(t => t.id), ['d', 'a', 'b', 'c']);
  assert.deepEqual(filterTracks(tracks, {sort: 'title'}).map(t => t.id), ['a', 'b', 'd', 'c']);
  assert.deepEqual(filterTracks(tracks, {}).map(t => t.id), ['d', 'b', 'c', 'a']);
  assert.equal(sourceKind(tracks[2]), 'online');
});
test('recipe import validates schema, limits and preserves order without audio', () => {
  const r = normalizeRecipe({format: 'mixline-set', version: 1, name: 'Night set', bars: 16, tracks: [{id: 'b', title: 'Second'}, {id: 'a', title: 'First'}]});
  assert.deepEqual(r.ids, ['b', 'a']); assert.equal(r.bars, 16); assert.equal(r.refs.length, 2); assert.equal(r.name, 'Night set');
  assert.throws(() => normalizeRecipe({tracks: []}));
  assert.throws(() => normalizeRecipe({format: 'mixline-set', version: 1, tracks: [{id: 45}]}));
  assert.throws(() => normalizeRecipe({format: 'mixline-set', version: 1, tracks: Array(501).fill({id: 'a'})}));
});
