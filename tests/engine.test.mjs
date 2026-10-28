import test from 'node:test';
import assert from 'node:assert/strict';
import {MixEngine} from '../web/js/core/engine.js';
import {Context, Buffer} from './_mocks.mjs';

const make = () => { const ctx = new Context(); return {ctx, e: new MixEngine({contextFactory: () => ctx})}; };
const file = new Blob(['audio']);

test('play/pause/rate change preserve the audio-clock position', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'a', title: 'Track', bpm: 120}, file);
  await e.play(0); ctx.currentTime = 2; assert.equal(e.position(0), 2);
  e.setRate(0, 1.1); ctx.currentTime = 4; assert.equal(e.position(0), 4.2);
  e.pause(0); ctx.currentTime = 8; assert.equal(e.position(0), 4.2); assert.equal(e.decks[0].playing, false);
  await e.play(0); ctx.currentTime = 9; assert.ok(Math.abs(e.position(0) - 5.3) < 1e-12);
  await e.destroy();
});
test('failed replacement preserves currently playing track and clock', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'old', bpm: 120}, file); await e.play(0); ctx.currentTime = 1;
  ctx.decode = async () => { throw new Error('Unsupported codec'); };
  await assert.rejects(e.load(0, {id: 'bad'}, file), /Unsupported codec/);
  assert.equal(e.decks[0].track.id, 'old'); assert.equal(e.decks[0].playing, true); assert.equal(e.position(0), 1);
  assert.equal(e.decks[0].loadError, 'Unsupported codec');
  await e.destroy();
});
test('out-of-order decode completion cannot replace a newer load', async () => {
  const {ctx, e} = make(); await e.init(); const pending = []; ctx.decode = () => new Promise(resolve => pending.push(resolve));
  const a = e.load(0, {id: 'first'}, file); await new Promise(r => setImmediate(r));
  const b = e.load(0, {id: 'second'}, file); await new Promise(r => setImmediate(r));
  pending[1](new Buffer()); assert.equal(await b, true); pending[0](new Buffer()); assert.equal(await a, false);
  assert.equal(e.decks[0].track.id, 'second'); await e.destroy();
});
test('cancelLoad discards a pending decode and keeps the deck as it was', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'keep'}, file); let finish; ctx.decode = () => new Promise(r => finish = r);
  const pending = e.load(0, {id: 'late'}, file); await new Promise(r => setImmediate(r)); e.cancelLoad(0); finish(new Buffer());
  assert.equal(await pending, false); assert.equal(e.decks[0].track.id, 'keep'); await e.destroy();
});
test('cue and loop transport match source clock and loop disable preserves position', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'track', bpm: 120}, file); e.seek(0, 2); e.setCue(0, 0);
  e.setLoopPoints(0, 2, 4); await e.play(0); ctx.currentTime = 5; assert.equal(e.position(0), 3);
  e.loop(0, 0); assert.equal(e.position(0), 3); ctx.currentTime = 6; assert.equal(e.position(0), 4);
  e.goCue(0, 0); assert.equal(e.position(0), 2); e.setStartCue(0, 1.5); e.cue(0); assert.equal(e.position(0), 1.5); assert.equal(e.decks[0].playing, false);
  await e.destroy();
});
test('beat loops need a tempo and beat jumps move by beats', async () => {
  const {e} = make(); await e.load(0, {id: 'nobpm'}, file);
  assert.throws(() => e.loop(0, 4), /BPM/); assert.throws(() => e.beatJump(0, 4), /BPM/);
  e.setBpm(0, 120); e.seek(0, 1); e.loop(0, 4); assert.deepEqual(e.decks[0].loop, {start: 1, end: 3, beats: 4});
  e.beatJump(0, 4); assert.equal(e.position(0), 3); assert.equal(e.decks[0].loop, null);
  await e.destroy();
});
test('fade requires an explicitly playing incoming deck and manual movement cancels', async () => {
  const {e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.load(1, {id: 'b', bpm: 126}, file);
  assert.throws(() => e.fadeTo(1, 4), /Start the incoming/); await e.play(0); await e.play(1);
  e.fadeTo(1, 4); assert.ok(e.fade); e.setCrossfade(0.3); assert.equal(e.fade, null); assert.equal(e.crossfade, 0.3);
  assert.equal(e.decks[0].playing, true); assert.equal(e.decks[1].playing, true); await e.destroy();
});
test('sync cannot claim matching outside supported rate range', async () => {
  const {e} = make(); await e.load(0, {id: 'a', bpm: 80}, file); await e.load(1, {id: 'b', bpm: 160}, file);
  assert.throws(() => e.sync(0), /outside/); assert.equal(e.decks[0].rate, 1); await e.destroy();
});
test('sync matches tempo and aligns phase within range', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.load(1, {id: 'b', bpm: 126}, file);
  await e.play(1); ctx.currentTime = 1; e.sync(0); assert.ok(Math.abs(e.decks[0].rate - 1.05) < 1e-9);
  const phase = (position, bpm) => (position / (60 / bpm)) % 1;
  assert.ok(Math.abs(phase(e.position(0), 120) - phase(e.position(1), 126)) < 1e-9); await e.destroy();
});
test('slip scratch returns to the underlying timeline and respects pause interruption', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.play(0); ctx.currentTime = 2;
  e.setSlip(0, true); e.startScratch(0); ctx.currentTime = 2.1; e.scratchTo(0, 1.5); assert.equal(e.position(0), 1.5);
  ctx.currentTime = 3; e.endScratch(0); assert.equal(e.position(0), 3); assert.equal(e.decks[0].playing, true);
  e.startScratch(0); ctx.currentTime = 4; e.pauseAll(); assert.equal(e.decks[0].scratching, false); assert.equal(e.decks[0].playing, false);
  await e.destroy();
});
test('scratch without slip resumes from the scratched position', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.play(0); ctx.currentTime = 2;
  e.startScratch(0); ctx.currentTime = 2.1; e.scratchTo(0, 4); ctx.currentTime = 2.2; e.scratchTo(0, 4.5);
  assert.ok(e.decks[0].scratchSources.size >= 1);
  e.endScratch(0); assert.equal(e.position(0), 4.5); assert.equal(e.decks[0].playing, true); assert.equal(e.decks[0].scratchSources.size, 0);
  await e.destroy();
});
test('session restore validates both files before replacing any live deck', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'old-a', bpm: 120}, file); await e.load(1, {id: 'old-b', bpm: 126}, file); await e.play(0); ctx.currentTime = 2;
  const snapshot = e.snapshot(); snapshot.decks[0].track = {id: 'new-a', title: 'New A'}; snapshot.decks[1].track = {id: 'missing', title: 'Missing'};
  await assert.rejects(e.restore(snapshot, async id => id === 'missing' ? null : {track: {id}, blob: file}), /missing/);
  assert.equal(e.decks[0].track.id, 'old-a'); assert.equal(e.decks[1].track.id, 'old-b'); assert.equal(e.decks[0].playing, true);
  assert.equal(e.position(0), 2); await e.destroy();
});
test('successful restore preserves cues, loop, mixer and positions but never auto-plays', async () => {
  const {e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.load(1, {id: 'b', bpm: 126}, file);
  e.seek(0, 2); e.setCue(0, 3); e.setLoopPoints(0, 2, 4); e.setRate(0, 1.05); e.setEQ(0, 'low', -6); e.setCrossfade(0.25); await e.play(0);
  const snapshot = e.snapshot(); e.seek(0, 6); e.clearCue(0, 3); e.setCrossfade(1);
  await e.restore(snapshot, async id => ({track: {id}, blob: file}));
  assert.equal(e.decks[0].playing, false); assert.equal(e.position(0), 2); assert.equal(e.decks[0].cues[3], 2); assert.equal(e.decks[0].loop.end, 4);
  assert.equal(e.decks[0].rate, 1.05); assert.equal(e.decks[0].eq.low, -6); assert.equal(e.crossfade, 0.25); await e.destroy();
});
test('a recording is not overwritten while its final chunk is pending', async () => {
  const previous = globalThis.MediaRecorder;
  class FakeRecorder {
    static isTypeSupported() { return true; }
    constructor() { this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; }
    complete() { this.ondataavailable({data: new Blob(['recorded sound'])}); this.onstop(); }
  }
  globalThis.MediaRecorder = FakeRecorder;
  const {e} = make();
  try {
    await e.startRecording(); const recorder = e.recorder.media; const stopped = e.stopRecording();
    await assert.rejects(e.startRecording(), /still finishing/);
    recorder.complete(); const blob = await stopped; assert.equal(await blob.text(), 'recorded sound');
    await e.startRecording(); const second = e.recorder.media; const result = e.stopRecording(); second.complete(); assert.equal((await result).size, 14);
  } finally { globalThis.MediaRecorder = previous; await e.destroy(); }
});
test('recording stops itself at the size limit and reports it', async () => {
  const previous = globalThis.MediaRecorder;
  class FakeRecorder {
    static isTypeSupported() { return true; }
    constructor() { this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.onstop(); }
  }
  globalThis.MediaRecorder = FakeRecorder;
  const {e} = make(); const events = []; e.addEventListener('recording', ev => events.push(ev.detail)); e.addEventListener('error', ev => events.push(ev.detail));
  try {
    await e.startRecording(); e.recorder.media.ondataavailable({data: new Blob([new Uint8Array(49 * 1024 * 1024)])});
    assert.equal(e.recording, false); assert.ok(events.some(x => x.autoStop)); assert.ok(events.some(x => /limit/.test(x.message || '')));
  } finally { globalThis.MediaRecorder = previous; await e.destroy(); }
});
test('timed fade completes once; pausing and manual takeover never emit completion', async t => {
  t.mock.timers.enable({apis: ['setInterval']});
  const {ctx, e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.load(1, {id: 'b', bpm: 126}, file);
  await e.play(0); await e.play(1); const completions = []; e.addEventListener('transitionend', event => completions.push(event.detail));
  e.fadeTo(1, 1); ctx.currentTime = 0.5; t.mock.timers.tick(20); assert.ok(e.crossfade > 0.5 && e.crossfade < 1);
  e.pause(1); assert.equal(e.fade, null); ctx.currentTime = 2; t.mock.timers.tick(200); assert.equal(completions.length, 0);
  await e.play(1); e.fadeTo(1, 1); e.setCrossfade(0.2); ctx.currentTime = 4; t.mock.timers.tick(200); assert.equal(completions.length, 0); assert.equal(e.crossfade, 0.2);
  e.fadeTo(1, 1); ctx.currentTime = 5; t.mock.timers.tick(20); assert.deepEqual(completions, [{incoming: 1}]); assert.equal(e.crossfade, 1); assert.equal(e.fade, null);
  t.mock.timers.tick(1000); assert.equal(completions.length, 1); await e.destroy();
});
test('cancelling from the final fader update does not emit a stale transitionend', async t => {
  t.mock.timers.enable({apis: ['setInterval']});
  const {ctx, e} = make(); await e.load(1, {id: 'b', bpm: 126}, file); await e.play(1); let completed = 0;
  e.addEventListener('transitionend', () => completed++);
  e.addEventListener('change', () => { if (e.crossfade === 1) e.cancelFade(); });
  e.fadeTo(1, 1); ctx.currentTime = 1; t.mock.timers.tick(20); assert.equal(completed, 0); assert.equal(e.fade, null); await e.destroy();
});
test('main cue auditions a paused position, returns on release and cancels a rapid release', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'cue', bpm: 120}, file); e.seek(0, 2);
  await e.cueDown(0); ctx.currentTime = 1; assert.equal(e.position(0), 3); assert.equal(e.decks[0].playing, true);
  e.cueUp(0); assert.equal(e.position(0), 2); assert.equal(e.decks[0].playing, false);
  const pending = e.cueDown(0); e.cueUp(0); await pending; assert.equal(e.decks[0].playing, false);
  await e.play(0); ctx.currentTime = 2; await e.cueDown(0); e.cueUp(0); assert.equal(e.position(0), 2); assert.equal(e.decks[0].playing, false);
  await e.destroy();
});
test('interrupting a cue audition releases it at the cue without restarting', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'cue-interruption'}, file); e.seek(0, 2); await e.cueDown(0); ctx.currentTime = 1; e.pauseAll(); e.cueUp(0);
  assert.equal(e.position(0), 2); assert.equal(e.decks[0].cueHeld, null); assert.equal(e.decks[0].playing, false); await e.destroy();
});
test('temporary nudge changes clock speed then returns to selected tempo without jumping', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'nudge', bpm: 120}, file); e.setRate(0, 1.05); await e.play(0);
  ctx.currentTime = 2; e.bend(0, 0.04); assert.equal(e.position(0), 2.1); assert.equal(e.decks[0].rate, 1.05);
  ctx.currentTime = 3; assert.ok(Math.abs(e.position(0) - 3.19) < 1e-9); e.endBend(0);
  ctx.currentTime = 4; assert.ok(Math.abs(e.position(0) - 4.24) < 1e-9); assert.equal(e.decks[0].source.playbackRate.value, 1.05);
  e.bend(0, -0.04); e.pauseAll(); assert.equal(e.decks[0].bend, 0); await e.destroy();
});
test('manual downbeat quantizes independent cue placement and preserves the live playhead', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'grid', bpm: 120}, file); e.setGrid(0, {downbeat: 0.1}); e.setQuantize(0, true); await e.play(0); ctx.currentTime = 1.25;
  e.setCue(0, 2, 2.32); assert.equal(e.decks[0].cues[2], 2.1); assert.equal(e.position(0), 1.25);
  e.renameCue(0, 2, 'Drop', '#ff4455'); assert.deepEqual(e.decks[0].cueMeta[2], {name: 'Drop', color: '#ff4455'});
  const marker = e.addMarker(0, {name: 'Vocal', position: 4.8}); e.updateMarker(0, marker.id, {name: 'Chorus', position: 5}); assert.equal(e.decks[0].markers[0].name, 'Chorus');
  e.setLoopPoints(0, 2.21, 4.24); assert.deepEqual(e.decks[0].loop, {start: 2.1, end: 4.1, beats: 3.999999999999999});
  e.seek(0, 7); assert.equal(e.decks[0].loop, null); assert.equal(e.decks[0].playing, true);
  e.removeMarker(0, marker.id); assert.equal(e.decks[0].markers.length, 0); await e.destroy();
});
test('XY retains position across bypass; reset clears effect state without changing track', async () => {
  const {e} = make(); await e.load(0, {id: 'xy', bpm: 120}, file); e.setXY(0, 0.3, 0.6); e.setEcho(0, {beats: 1, feedback: 0.55});
  assert.equal(e.decks[0].nodes.echo.gain.value, 0.39); assert.equal(e.decks[0].nodes.delay.delayTime.value, 0.5);
  e.setFXBypass(0, true); assert.equal(e.decks[0].fx.echo, 0.6); assert.equal(e.decks[0].filter, 0.3); assert.equal(e.decks[0].nodes.echo.gain.value, 0);
  e.setFXBypass(0, false); assert.equal(e.decks[0].nodes.echo.gain.value, 0.39); assert.equal(e.decks[0].nodes.filter.type, 'highpass');
  e.resetFX(0); assert.equal(e.decks[0].filter, 0); assert.equal(e.decks[0].fx.echo, 0); assert.equal(e.decks[0].track.id, 'xy'); await e.destroy();
});
test('EQ kill and master mute preserve their chosen levels for restoration', async () => {
  const {e} = make(); await e.init(); e.setEQ(0, 'low', -3); e.setEQKill(0, 'low', true); assert.equal(e.decks[0].eq.low, -3); assert.equal(e.decks[0].nodes.low.gain.value, -90);
  e.setEQKill(0, 'low', false); assert.equal(e.decks[0].nodes.low.gain.value, -3);
  e.setMaster(0.7); e.setMasterMute(true); assert.equal(e.master, 0.7); assert.equal(e.masterNode.gain.value, 0); e.setMasterMute(false); assert.equal(e.masterNode.gain.value, 0.7); await e.destroy();
});
test('new session fields round trip paused; original v1 sessions still migrate', async () => {
  const {e} = make(); await e.load(0, {id: 'saved', bpm: 120}, file); e.setCue(0, 0, 2); e.renameCue(0, 0, 'Intro', '#ffc000'); e.addMarker(0, {name: 'Drop', position: 4});
  e.setGrid(0, {downbeat: 0.1}); e.setQuantize(0, true); e.setXY(0, -0.4, 0.5); e.setFXBypass(0, true); e.setEQKill(0, 'high', true); e.setEcho(0, {beats: 1, feedback: 0.6}); e.setMasterMute(true);
  const saved = e.snapshot(); e.resetFX(0); e.clearCue(0, 0); await e.restore(saved, async id => ({track: {id}, blob: file}));
  assert.equal(e.decks[0].playing, false); assert.equal(e.decks[0].cueMeta[0].name, 'Intro'); assert.equal(e.decks[0].markers[0].name, 'Drop'); assert.equal(e.decks[0].grid.downbeat, 0.1);
  assert.equal(e.decks[0].quantize, true); assert.equal(e.decks[0].fxBypass, true); assert.equal(e.decks[0].eqKills.high, true); assert.equal(e.decks[0].echoFeedback, 0.6); assert.equal(e.masterMuted, true);
  await e.restore({version: 1, decks: [{track: {id: 'old'}, cue: 0, cues: [null]}, {track: null}]}, async id => ({track: {id}, blob: file}));
  assert.equal(e.decks[0].fxBypass, false); assert.equal(e.decks[0].quantize, false); assert.equal(e.masterMuted, false); assert.equal(e.decks[1].track, null); await e.destroy();
});
test('bass exchange follows the audio clock; manual channel changes stop automation at current state', async t => {
  t.mock.timers.enable({apis: ['setInterval']}); const {ctx, e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.load(1, {id: 'b', bpm: 120}, file);
  await e.play(0); await e.play(1); e.setCrossfade(0); e.transitionTo(1, 2, 'bass'); ctx.currentTime = 1; t.mock.timers.tick(20);
  assert.equal(e.decks[0].eq.low, -15); assert.equal(e.decks[1].eq.low, -15); assert.equal(e.crossfade, 0.5);
  e.setGain(0, 0.7); assert.equal(e.fade, null); ctx.currentTime = 2; t.mock.timers.tick(100); assert.equal(e.decks[0].eq.low, -15); assert.equal(e.crossfade, 0.5); await e.destroy();
});
test('echo-out transition raises the outgoing echo while blending', async t => {
  t.mock.timers.enable({apis: ['setInterval']}); const {ctx, e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.load(1, {id: 'b', bpm: 120}, file);
  await e.play(0); await e.play(1); e.setCrossfade(0); e.transitionTo(1, 2, 'echo'); ctx.currentTime = 2; t.mock.timers.tick(20);
  assert.equal(e.decks[0].fx.echo, 0.75); assert.equal(e.crossfade, 1); assert.equal(e.fade, null); await e.destroy();
});
test('prepared metadata loads independently using both legacy and new field names', async () => {
  const {e} = make(); const track = {id: 'prepared', bpm: 124, start: 1, downbeat: 0.2, quantize: true, cues: [1, 3], cueNames: ['Intro', 'Drop'], cueColors: ['#ffaa00', '#ff3355'], markers: [{id: 'm', name: 'Vocal', time: 4}], loop: {start: 1, end: 3}};
  await e.load(0, track, file); assert.equal(e.decks[0].grid.downbeat, 0.2); assert.equal(e.decks[0].cueMeta[1].name, 'Drop'); assert.equal(e.decks[0].markers[0].position, 4);
  assert.equal(e.position(0), 1); assert.deepEqual(e.decks[0].loop, {start: 1, end: 3, beats: null});
  track.cues[0] = 9; track.markers[0].time = 8; assert.equal(e.decks[0].cues[0], 1); assert.equal(e.decks[0].markers[0].position, 4); await e.destroy();
});
test('source capability restrictions protect recording and an existing deck', async () => {
  const {e} = make(); await e.load(0, {id: 'local'}, file);
  await assert.rejects(e.load(0, {id: 'restricted', capabilities: {load: false}}, file), /does not currently allow/); assert.equal(e.decks[0].track.id, 'local');
  await e.load(1, {id: 'stream', capabilities: {load: true, record: false}}, file); await assert.rejects(e.startRecording(), /cannot be recorded/);
  e.eject(1); e.recorder = {get recording() { return true; }, pending: false};
  await assert.rejects(e.load(1, {id: 'stream', capabilities: {load: true, record: false}}, file), /Stop recording/); assert.equal(e.decks[1].track, null);
  e.recorder = null; await e.destroy();
});
test('restoring old source metadata cannot relax fresh recording restrictions', async () => {
  const {e} = make(); await e.load(0, {id: 'stream', capabilities: {load: true, record: true}}, file); const snapshot = e.snapshot();
  await e.restore(snapshot, async id => ({track: {id, capabilities: {load: true, record: false}}, blob: file}));
  assert.equal(e.decks[0].track.capabilities.record, false); await assert.rejects(e.startRecording(), /cannot be recorded/); await e.destroy();
});
test('starting a recording while a restricted replacement decodes cannot commit that replacement', async () => {
  const {ctx, e} = make(); await e.load(0, {id: 'local'}, file); let finish; ctx.decode = () => new Promise(resolve => finish = resolve);
  const pending = e.load(0, {id: 'stream', capabilities: {load: true, record: false}}, file); await new Promise(r => setImmediate(r));
  e.recorder = {get recording() { return true; }, pending: false}; finish(new Buffer()); await assert.rejects(pending, /Recording started/); assert.equal(e.decks[0].track.id, 'local');
  e.recorder = null; await e.destroy();
});
test('long bar transitions and slow-tempo echo time retain requested duration', async () => {
  const {e} = make(); await e.load(0, {id: 'slow', bpm: 30}, file); await e.load(1, {id: 'other', bpm: 30}, file); await e.play(1);
  e.transitionTo(1, 128, 'blend'); assert.equal(e.fade.duration, 128); e.cancelFade(); e.setEcho(0, {beats: 4}); assert.equal(e.decks[0].nodes.delay.delayTime.value, 8); await e.destroy();
});
test('restoration preserves custom short loop exactly even when quantize was later enabled', async () => {
  const {e} = make(); await e.load(0, {id: 'custom', bpm: 120}, file); e.setLoopPoints(0, 2.1, 2.2); e.setQuantize(0, true); const snapshot = e.snapshot();
  await e.restore(snapshot, async id => ({track: {id}, blob: file})); assert.equal(e.decks[0].loop.start, 2.1); assert.equal(e.decks[0].loop.end, 2.2); await e.destroy();
});
test('tap tempo averages intervals and analyzeBpm rejects silence', async () => {
  const {e} = make(); await e.load(0, {id: 'tap'}, file);
  e.tap(0, 0); e.tap(0, 500); e.tap(0, 1000); assert.equal(e.decks[0].bpm, 120); assert.equal(e.decks[0].bpmSource, 'manual');
  assert.throws(() => e.analyzeBpm(0), /No reliable tempo/); await e.destroy();
});
test('eject clears a deck, cancels fades and leaves the other deck playing', async () => {
  const {e} = make(); await e.load(0, {id: 'a', bpm: 120}, file); await e.load(1, {id: 'b', bpm: 120}, file); await e.play(0); await e.play(1);
  e.fadeTo(1, 4); e.eject(1); assert.equal(e.fade, null); assert.equal(e.decks[1].track, null); assert.equal(e.decks[1].playing, false); assert.equal(e.decks[0].playing, true); await e.destroy();
});
test('sampler plays a short buffer into the master bus', async () => {
  const {ctx, e} = make(); await e.init(); await e.sampler(0); assert.ok(ctx.lastSource?.started); await e.destroy();
});
