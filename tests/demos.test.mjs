import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_TRACKS, SAMPLER_SOUNDS, makeDemo, makeSamplerBuffer} from '../web/js/core/demos.js';
import {Context} from './_mocks.mjs';

test('six distinct original demos are self-contained WAV files with truthful duration and BPM', async () => {
  assert.equal(DEMO_TRACKS.length, 6);
  const ids = new Set(), sizes = new Set();
  for (const track of DEMO_TRACKS) {
    assert.match(track.id, /^demo-/);
    assert.equal(track.source, 'original');
    assert.match(track.artwork, /^assets\/covers\/.+\.svg$/);
    const generated = await makeDemo(track.id);
    ids.add(generated.track.id); sizes.add(generated.blob.size);
    assert.equal(generated.blob.type, 'audio/wav');
    assert.ok(generated.blob.size > 100000);
    const a = await generated.blob.arrayBuffer(), v = new DataView(a);
    assert.equal(new TextDecoder().decode(a.slice(0, 4)), 'RIFF');
    assert.equal(v.getUint16(22, true), 1);
    const samples = (a.byteLength - 44) / 2, rate = v.getUint32(24, true);
    assert.ok(Math.abs(samples / rate - generated.track.duration) < 0.001);
    let peak = 0; for (let i = 44; i < a.byteLength; i += 2) peak = Math.max(peak, Math.abs(v.getInt16(i, true)));
    assert.ok(peak > 1000 && peak < 32767);
    assert.equal(generated.track.bpm, track.bpm);
  }
  assert.equal(ids.size, 6); assert.equal(sizes.size, 6);
  assert.equal((await makeDemo('red')).track.id, 'demo-red');
});
test('sampler sounds are eight distinct non-silent buffers', () => {
  assert.equal(SAMPLER_SOUNDS.length, 8);
  const ctx = new Context();
  const peaks = SAMPLER_SOUNDS.map((_, i) => { const b = makeSamplerBuffer(ctx, i, 0.7); let p = 0; for (const v of b.getChannelData(0)) p = Math.max(p, Math.abs(v)); return p; });
  assert.ok(peaks.every(p => p > 0.05 && p <= 1), JSON.stringify(peaks));
  assert.ok(makeSamplerBuffer(ctx, 7).length > makeSamplerBuffer(ctx, 0).length);
});
