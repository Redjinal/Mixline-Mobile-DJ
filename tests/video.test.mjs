import test from 'node:test';
import assert from 'node:assert/strict';
import {VideoMixer, parseYouTubeURL} from '../web/js/core/video.js';
const id = 'dQw4w9WgXcQ';
function readyMixer() {
  const mixer = new VideoMixer({timeoutMs: 25, bufferingTimeoutMs: 25});
  const calls = [[], []];
  mixer.players = calls.map(list => ({setVolume: v => list.push(['volume', v]), playVideo: () => list.push(['play']), pauseVideo: () => list.push(['pause']), seekTo: v => list.push(['seek', v]), getCurrentTime: () => 0, destroy: () => {}}));
  mixer.decks.forEach((deck, i) => Object.assign(deck, {ready: true, track: {videoId: id, title: `Beat ${i}`}, playing: i === 0, state: i === 0 ? 'playing' : 'cued'}));
  return {mixer, calls};
}
test('parses official URLs without accepting lookalike or arbitrary hosts', () => {
  for (const url of [id, `https://youtu.be/${id}?t=12`, `https://www.youtube.com/watch?v=${id}&list=abc`, `https://m.youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`, `https://www.youtube-nocookie.com/embed/${id}`]) assert.equal(parseYouTubeURL(url), id);
  for (const url of [`https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/?v=${id}`, `javascript:${id}`, `https://name@youtube.com/watch?v=${id}`, 'https://youtube.com/watch?v=short', 'https://youtube.com/playlist?list=abc']) assert.throws(() => parseYouTubeURL(url));
});
test('fades require confirmed playing, not merely ready or buffering', () => {
  const {mixer} = readyMixer();
  assert.throws(() => mixer.fadeTo(1, 1), /Start the incoming/);
  mixer.decks[1].playing = true; mixer.decks[1].state = 'buffering';
  assert.throws(() => mixer.fadeTo(1, 1), /Start the incoming/);
  mixer.destroy();
});
test('cut waits for PLAYING before changing the outgoing level', async () => {
  const {mixer, calls} = readyMixer();
  const pending = mixer.cutTo(1);
  assert.equal(mixer.crossfade, 0); assert.equal(mixer.decks[0].volume, 100);
  assert.deepEqual(calls[1].slice(-2), [['volume', 0], ['play']]);
  mixer._onState(1, 3); assert.equal(mixer.crossfade, 0);
  mixer._onState(1, 1);
  assert.deepEqual(await pending, {cancelled: false});
  assert.equal(mixer.crossfade, 1); assert.equal(mixer.decks[0].volume, 0);
  mixer.destroy();
});
test('failed incoming cut restores current mix and pauses incoming', async () => {
  const {mixer, calls} = readyMixer();
  mixer.setCrossfade(0.15);
  const pending = mixer.cutTo(1);
  mixer._error(1, 'Video unavailable', 100);
  assert.deepEqual(await pending, {cancelled: true});
  assert.equal(mixer.crossfade, 0.15); assert.equal(mixer.decks[0].volume, 85);
  assert.equal(mixer.decks[0].playing, true);
  assert.ok(calls[1].some(c => c[0] === 'pause'));
  assert.equal(mixer.decks[1].error, 'Video unavailable');
  mixer.destroy();
});
test('incoming buffering cancels a fade and restores its starting mix', async () => {
  const {mixer} = readyMixer();
  mixer.setCrossfade(0.2); mixer._onState(1, 1);
  const pending = mixer.fadeTo(1, 5);
  mixer._onState(1, 3);
  assert.deepEqual(await pending, {cancelled: true});
  assert.equal(mixer.crossfade, 0.2); assert.equal(mixer.decks[0].playing, true);
  mixer.destroy();
});
test('manual takeover preserves the chosen mix and cancels timed transition', async () => {
  const {mixer} = readyMixer(); mixer._onState(1, 1);
  const pending = mixer.fadeTo(1, 4); mixer.setCrossfade(0.65);
  assert.deepEqual(await pending, {cancelled: true});
  assert.equal(mixer.crossfade, 0.65); assert.equal(mixer._transition, null);
  mixer.destroy();
});
test('cut has a bounded wait and restores outgoing level on timeout', async () => {
  const {mixer} = readyMixer();
  const result = await mixer.cutTo(1);
  assert.equal(result.cancelled, true); assert.equal(mixer.crossfade, 0);
  assert.equal(mixer.decks[0].volume, 100); mixer.destroy();
});
test('repeat points reject invalid intervals and seek is bounded to duration', () => {
  const {mixer, calls} = readyMixer();
  assert.throws(() => mixer.setRepeat(0, {start: 10, end: 9}));
  mixer.setRepeat(0, {start: 10, end: 20});
  assert.deepEqual(mixer.decks[0].repeat, {enabled: true, start: 10, end: 20});
  mixer.decks[0].duration = 30; mixer.seek(0, 100);
  assert.deepEqual(calls[0].at(-1), ['seek', 30]); mixer.destroy();
});
