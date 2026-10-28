import test from 'node:test';
import assert from 'node:assert/strict';
import {createSources, SOURCE_CATALOG, licenseInfo, sourceCapabilities} from '../web/js/core/sources.js';
const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers: {'content-type': 'application/json'}});
const bytes = () => new Response(new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]), {headers: {'content-type': 'audio/wav'}});
const by = 'https://creativecommons.org/licenses/by/4.0/';
const sample = {id: 'audius:abc', provider: 'audius', source: 'audius', sourceId: 'abc', title: 'Allowed track', licenseUrl: by, capabilities: {preview: true, load: true}, audioUrl: 'https://api.audius.co/v1/tracks/abc/stream'};

test('license matching requires explicit supported license and rejects misleading URLs', () => {
  for (const value of [by, 'CC BY 4.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://creativecommons.org/publicdomain/zero/1.0/']) assert.equal(licenseInfo(value).remixAllowed, true, value);
  for (const value of ['Free music', 'All rights reserved', 'CC BY-NC 4.0', 'CC BY-ND', 'https://evil.example/licenses/by/4.0/', 'https://creativecommons.org.evil.example/licenses/by/4.0/', 'https://creativecommons.org/licenses/by/4.0/extra']) assert.equal(licenseInfo(value).remixAllowed, false, value);
});
test('source capability restrictions distinguish playback, recording and retention', () => {
  assert.deepEqual(sourceCapabilities('jamendo', by), {preview: true, load: true, record: false, offline: false, analysis: true});
  assert.equal(sourceCapabilities('audius', by).record, false);
  assert.equal(sourceCapabilities('archive', by).record, true);
  assert.equal(sourceCapabilities('wikimedia', by).offline, true);
  assert.equal(sourceCapabilities('audius', by, {gated: true}).load, false);
  assert.equal(sourceCapabilities('audius', 'Unknown').preview, true);
  assert.equal(sourceCapabilities('audius', 'Unknown').load, false);
});
test('catalog setup does not pretend connection success', async () => {
  const saved = {}; const store = {getSetting: async () => saved.config || {}, setSetting: async (k, v) => { saved.config = v; }};
  const sources = createSources({store, fetchImpl: () => assert.fail('configuration must not contact source')}); await sources.init();
  assert.equal(sources.list().find(x => x.id === 'jamendo').status, 'Setup required');
  await sources.configure('jamendo', {clientId: 'demo-public-id', clientSecret: 'ignored'});
  assert.equal(sources.list().find(x => x.id === 'jamendo').status, 'Not checked');
  assert.deepEqual(saved.config.jamendo, {clientId: 'demo-public-id'});
  assert.equal(sources.list().some(x => x.liveAudioVerified), false);
});
test('Audius search uses metadata only, normalizes tracks and preserves unknown BPM', async () => {
  const urls = []; const sources = createSources({fetchImpl: async u => { urls.push(u); return json({data: [{id: 'a b', title: 'Practice', user: {name: 'Artist'}, duration: 60, license: by, artwork: {'150x150': 'https://cdn.example/art.png'}}, {id: 'gated', title: 'Gated', license: by, is_stream_gated: true}]}); }});
  const result = await sources.search('audius', 'funk & soul', {page: 1, limit: 2}); const u = new URL(urls[0]);
  assert.equal(u.searchParams.get('query'), 'funk & soul'); assert.equal(u.searchParams.get('offset'), '2'); assert.equal(urls.length, 1);
  assert.equal(result.tracks[0].bpm, 0); assert.equal(result.tracks[0].id, 'audius:a b'); assert.equal(result.tracks[0].capabilities.load, true); assert.equal(result.tracks[1].capabilities.load, false); assert.equal(result.nextPage, 2);
  assert.equal(result.tracks[0].artwork, 'https://cdn.example/art.png');
  assert.equal(sources.list()[0].status, 'Catalog available');
});
test('Audius empty search chooses trending, unknown rights block loading before fetch', async () => {
  let calls = 0; const sources = createSources({fetchImpl: async u => { calls++; assert.ok(u.includes('tracks/trending')); return json({data: [{id: 'x', license: 'All rights reserved'}]}); }});
  const {tracks} = await sources.search('audius'); await assert.rejects(sources.prepare(tracks[0]), /license|required|processing/i); assert.equal(calls, 1);
});
test('Jamendo requires public ID and sends exact search pagination', async () => {
  let calls = 0; const sources = createSources({fetchImpl: async u => { calls++; const url = new URL(u); assert.equal(url.searchParams.get('client_id'), 'public'); assert.equal(url.searchParams.get('offset'), '20'); return json({results: [{id: '77', name: 'CC practice', artist_name: 'Artist', license_ccurl: by, audio: 'https://prod.example/77.mp3', musicinfo: {speed: 'high'}}]}); }});
  await assert.rejects(sources.search('jamendo', 'test'), /Client ID/); assert.equal(calls, 0); await sources.configure('jamendo', {clientId: 'public'});
  const result = await sources.search('jamendo', 'test', {page: 1}); assert.equal(result.tracks[0].bpm, 0); assert.equal(result.tracks[0].capabilities.offline, false); assert.equal(result.tracks[0].capabilities.record, false);
});
test('rate limits and service errors produce recoverable honest states', async () => {
  const sources = createSources({fetchImpl: async () => json({}, 429)}); await assert.rejects(sources.search('audius', 'x'), /rate-limiting/); assert.equal(sources.list()[0].status, 'Unavailable'); assert.ok(sources.list()[0].error);
});
test('malformed and non-JSON catalog responses are rejected', async () => {
  await assert.rejects(createSources({fetchImpl: async () => json({bogus: []})}).search('audius', 'x'), /unexpected/);
  await assert.rejects(createSources({fetchImpl: async () => new Response('<html>oops</html>')}).search('audius', 'x'), /unreadable/);
});
test('archive search defers audio metadata/download until explicit preparation', async () => {
  const urls = []; const sources = createSources({fetchImpl: async u => { urls.push(u); return json({response: {numFound: 1, docs: [{identifier: 'collection-one', title: ['A piece'], creator: ['Artist'], licenseurl: [by]}]}}); }});
  const result = await sources.search('archive', 'drums'); assert.equal(urls.length, 1); assert.ok(urls[0].includes('advancedsearch.php')); assert.equal(result.tracks[0].artist, 'Artist'); assert.equal(result.nextPage, null);
});
test('archive explicit prepare resolves a supported file and retains credits', async () => {
  const urls = []; const sources = createSources({fetchImpl: async u => { urls.push(u); return u.includes('/metadata/') ? json({metadata: {licenseurl: by}, files: [{name: 'notes.txt', size: 10}, {name: 'Drums one.mp3', size: 20, length: '01:20'}]}) : bytes(); }});
  const {track, blob} = await sources.prepare({id: 'archive:abc', provider: 'archive', sourceId: 'abc', title: 'Drums', artist: 'Artist'});
  assert.equal(blob.size, 8); assert.equal(track.capabilities.record, true); assert.equal(track.duration, 80); assert.ok(urls[1].includes('Drums%20one.mp3')); assert.equal(track.archiveFile, 'Drums one.mp3');
});
test('Wikimedia strips HTML credits and uses explicit audio license', async () => {
  const sources = createSources({fetchImpl: async () => json({query: {pages: {'42': {pageid: 42, title: 'File:Practice.ogg', imageinfo: [{url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Practice.ogg', mime: 'audio/ogg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Practice.ogg', extmetadata: {Artist: {value: '<a href="example">A &amp; B</a>'}, LicenseUrl: {value: by}}}]}}}})});
  const result = await sources.search('wikimedia', 'music'); assert.equal(result.tracks[0].artist, 'A & B'); assert.equal(result.tracks[0].capabilities.load, true); assert.equal(result.tracks[0].sourceId, '42');
});
test('Free To Use and Spotify are clearly unavailable integrations', async () => {
  let called = false; const sources = createSources({fetchImpl: async () => { called = true; return json({}); }});
  for (const id of ['freetouse', 'spotify']) { assert.equal(SOURCE_CATALOG.find(s => s.id === id).searchable, false); await assert.rejects(sources.search(id, 'test')); } assert.equal(called, false);
});
test('audio loads reject unsafe addresses and HTML responses', async () => {
  const sources = createSources({fetchImpl: async () => new Response('<html>sign in</html>', {headers: {'content-type': 'text/html'}})});
  await assert.rejects(sources.prepare(sample), /page instead/);
  await assert.rejects(sources.prepare({...sample, provider: 'wikimedia', source: 'wikimedia', audioUrl: 'http://127.0.0.1/file'}), /accessible audio/);
});
test('audio loading enforces declared and streamed size limits', async () => {
  const sources = createSources({fetchImpl: async () => new Response('x', {headers: {'content-type': 'audio/mpeg', 'content-length': String(151 * 1024 * 1024)}})});
  await assert.rejects(sources.prepare(sample), /150 MB/);
});
test('cancel aborts an in-flight request without reporting a failed connection', async () => {
  const c = new AbortController(); const sources = createSources({fetchImpl: async (u, {signal}) => new Promise((resolve, reject) => signal.addEventListener('abort', () => { const e = new Error('abort'); e.name = 'AbortError'; reject(e); }))});
  const pending = sources.search('audius', 'x', {signal: c.signal}); c.abort(); await assert.rejects(pending, {name: 'AbortError'}); assert.equal(sources.list()[0].status, 'Not checked');
});
test('timeouts end stalled requests with retry guidance', async () => {
  const sources = createSources({timeoutMs: 5, fetchImpl: async (u, {signal}) => new Promise((resolve, reject) => signal.addEventListener('abort', () => { const e = new Error('abort'); e.name = 'AbortError'; reject(e); }))});
  await assert.rejects(sources.search('audius', 'x'), /too long/);
});
test('archive preparation rechecks current rights rather than trusting stale search license', async () => {
  let calls = 0; const sources = createSources({fetchImpl: async () => { calls++; return json({metadata: {}, files: [{name: 'music.mp3', size: 30}]}); }});
  await assert.rejects(sources.prepare({id: 'archive:x', source: 'archive', sourceId: 'x', license: by, licenseUrl: by, capabilities: {load: true}}), /license|required|processing/i); assert.equal(calls, 1);
});
test('network failures explain connectivity instead of raw TypeError text', async () => {
  const sources = createSources({fetchImpl: async () => { throw new TypeError('Failed to fetch'); }});
  await assert.rejects(sources.search('audius', 'x'), /Could not reach/);
});
