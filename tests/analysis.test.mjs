import test from 'node:test';
import assert from 'node:assert/strict';
import {crossfadeGains, loopPosition, phaseAlignedPosition, peaksFromBuffer, estimateBpm, fitWaveWindow, zoomWaveWindow, timeAtWavePoint, clamp} from '../web/js/core/analysis.js';
import {Buffer} from './_mocks.mjs';

test('clamp coerces invalid numbers to the minimum', () => {
  assert.equal(clamp('x', 0, 1), 0);
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-2, -1, 1), -1);
});
test('equal-power blend preserves total power; endpoints isolate decks', () => {
  for (let n = 0; n <= 100; n++) { const [a, b] = crossfadeGains(n / 100); assert.ok(Math.abs(a * a + b * b - 1) < 1e-12); }
  assert.deepEqual(crossfadeGains(0), [1, 0]);
  assert.ok(crossfadeGains(1)[0] < 1e-12);
  assert.deepEqual(crossfadeGains(0.49, 'cut'), [1, 0]);
  assert.deepEqual(crossfadeGains(0.51, 'cut'), [0, 1]);
  assert.deepEqual(crossfadeGains(0.5, 'cut'), [1, 1]);
});
test('loop wrap handles multiple wraps and exact boundary without drift', () => {
  assert.equal(loopPosition(8, {start: 4, end: 8}, 30), 4);
  assert.equal(loopPosition(33.5, {start: 4, end: 8}, 40), 5.5);
  assert.equal(loopPosition(3, {start: 4, end: 8}, 30), 3);
  assert.equal(loopPosition(40, null, 30), 30);
});
test('phase alignment retains incoming beat count and target fractional beat', () => {
  assert.equal(phaseAlignedPosition(5.1, 120, 4.25, 120), 5.25);
  assert.equal(phaseAlignedPosition(5.1, 0, 4.25, 120), 5.1);
});
test('waveform peaks come from samples including negative values', () => {
  const b = new Buffer(2, 16, 8); b.channels[0][2] = -0.75; b.channels[1][10] = 0.5;
  assert.deepEqual(Array.from(peaksFromBuffer(b, 4)), [0.75, 0, 0.5, 0]);
});
test('tempo estimation recognizes steady onsets and refuses silence', () => {
  const b = new Buffer(1, 160000, 8000), a = b.getChannelData(0);
  for (let start = 0; start < a.length; start += 4000) for (let n = 0; n < 300; n++) a[start + n] = Math.sin(n * 0.3) * Math.exp(-n / 40);
  const result = estimateBpm(b);
  assert.ok(Math.abs(result.bpm - 120) < 1, String(result.bpm));
  assert.ok(result.confidence > 0.5);
  assert.equal(result.method, 'estimated');
  assert.equal(estimateBpm(new Buffer(1, 160000, 8000)), null);
  assert.equal(estimateBpm(new Buffer(1, 8000, 8000)), null);
});
test('wave windows fit, zoom and map pointer positions', () => {
  assert.deepEqual(fitWaveWindow(10, 4, 30), {start: 0, span: 10});
  assert.deepEqual(zoomWaveWindow(100, {start: 20, span: 20}, 0.5, 0.25), {start: 22.5, span: 10});
  assert.deepEqual(zoomWaveWindow(100, {start: 0, span: 20}, 2, 0.5), {start: 0, span: 40});
  assert.deepEqual(zoomWaveWindow(100, {start: 90, span: 10}, 2, 0.5), {start: 80, span: 20});
  assert.deepEqual(fitWaveWindow(0, 10, 20), {start: 0, span: 0});
  assert.deepEqual(fitWaveWindow(0.1, 0, 0.001), {start: 0, span: 0.1});
  assert.equal(timeAtWavePoint({start: 60, span: 20}, 0.75, 100), 75);
  assert.equal(timeAtWavePoint({start: 90, span: 20}, 2, 100), 100);
});
