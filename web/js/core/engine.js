/**
 * MixEngine — the single source of truth for both decks, the mixer, effects,
 * transitions, scratching and recording. Player-provider audio (YouTube) never
 * enters this graph. Every public action applies to the audio graph immediately.
 */
import {clamp, crossfadeGains, loopPosition, phaseAlignedPosition, peaksFromBuffer, estimateBpm} from './analysis.js';
import {makeDemo, makeSamplerBuffer} from './demos.js';
import {createChannel, applyChannelFX, setParam, rmsLevel} from './channel.js';
import {createRecorder} from './recorder.js';

export const RATE_MIN = 0.84;
export const RATE_MAX = 1.16;
export const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
export const RECORD_LIMIT_BYTES = 48 * 1024 * 1024;
export const CUE_SLOTS = 8;
const BANDS = ['low', 'mid', 'high'];

const canMix = track => track?.capabilities?.mix !== false && track?.capabilities?.load !== false;
const canRecord = track => track?.capabilities?.record !== false && track?.capabilities?.recording !== false;
const safeColor = value => /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? String(value) : '';
const blankCueMeta = () => Array.from({length: CUE_SLOTS}, () => ({name: '', color: ''}));
const cueMetaFrom = (track, fallback = blankCueMeta()) => Array.from({length: CUE_SLOTS}, (_, j) => ({
  name: String(track?.cueMeta?.[j]?.name || track?.cueNames?.[j] || fallback[j]?.name || '').slice(0, 40),
  color: safeColor(track?.cueMeta?.[j]?.color || track?.cueColors?.[j] || fallback[j]?.color)
}));
const markersFrom = (list, duration) => (Array.isArray(list) ? list : []).slice(0, 128).map((m, j) => ({
  id: String(m.id || `marker-${j}`), name: String(m.name || 'Marker').slice(0, 40), position: clamp(m.position ?? m.time, 0, duration), color: safeColor(m.color)
}));

function blankDeck() {
  return {
    track: null, buffer: null, playing: false, loading: false, loadError: null, loadToken: 0,
    duration: 0, offset: 0, anchorTime: 0, rate: 1, bend: 0, gain: 1, trim: 1,
    bpm: 0, bpmSource: 'unknown', tapTimes: [],
    cue: 0, cues: Array(CUE_SLOTS).fill(null), cueMeta: blankCueMeta(), cueHeld: null, cueHoldToken: 0,
    markers: [], grid: {downbeat: 0}, quantize: false, loop: null,
    eq: {low: 0, mid: 0, high: 0}, eqKills: {low: false, mid: false, high: false},
    filter: 0, fx: {echo: 0, reverb: 0}, fxBypass: false, echoBeats: 0.5, echoFeedback: 0.32,
    slip: false, scratching: false, scratchState: null, scratchSources: new Set(),
    source: null, nodes: null, peaks: new Float32Array(0)
  };
}

export class MixEngine extends EventTarget {
  constructor({contextFactory} = {}) {
    super();
    this.contextFactory = contextFactory;
    this.ctx = null;
    this.decks = [blankDeck(), blankDeck()];
    this.crossfade = 0.5;
    this.curve = 'blend';
    this.master = 0.8;
    this.masterMuted = false;
    this.fade = null;
    this.recorder = null;
    this._fadeTimer = null;
    this._samplerBuffers = new Map();
    this.decks.forEach((deck, i) => Object.defineProperty(deck, 'position', {enumerable: true, get: () => this.position(i)}));
  }

  emit(type = 'change', detail = {}) { this.dispatchEvent(new CustomEvent(type, {detail})); }
  deck(i) { if (i !== 0 && i !== 1) throw new Error('Choose Deck 1 or Deck 2.'); return this.decks[i]; }

  /* ---------- lifecycle ---------- */
  async init() {
    if (!this.ctx) {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!this.contextFactory && !Ctx) throw new Error('This device does not provide Web Audio playback.');
      const ctx = this.contextFactory ? this.contextFactory() : new Ctx({latencyHint: 'interactive'});
      this.ctx = ctx;
      this.masterNode = ctx.createGain();
      this.masterNode.gain.value = this.masterMuted ? 0 : this.master;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1; this.limiter.knee.value = 0; this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.003; this.limiter.release.value = 0.15;
      this.masterMeter = ctx.createAnalyser(); this.masterMeter.fftSize = 512;
      this.masterNode.connect(this.limiter); this.limiter.connect(this.masterMeter); this.masterMeter.connect(ctx.destination);
      this.recordDestination = ctx.createMediaStreamDestination();
      this.limiter.connect(this.recordDestination);
      this.decks.forEach(deck => { deck.nodes = createChannel(ctx, this.masterNode, deck); applyChannelFX(ctx, deck); });
      this.applyCrossfade();
      ctx.addEventListener?.('statechange', () => this.emit('change', {audioState: ctx.state}));
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this;
  }
  async destroy() {
    this.pauseAll();
    if (this.recording) await this.stopRecording();
    await this.ctx?.close();
    this.ctx = null;
  }
  get audioState() { return this.ctx?.state || 'closed'; }

  /* ---------- loading ---------- */
  async load(i, track, blob) {
    const deck = this.deck(i), token = ++deck.loadToken;
    deck.loadError = null; deck.loading = true; this.emit('change', {loading: i});
    try {
      if (!canMix(track)) throw new Error('This source does not currently allow loading into the DJ mixer.');
      if (this.recording && !canRecord(track)) throw new Error('Stop recording before loading this source; recording is unavailable for this track.');
      await this.init();
      if (track?.demo && !blob) ({blob} = await makeDemo(track.demo));
      if (!(blob instanceof Blob)) throw new Error('The audio file is missing. Import it again from Library.');
      if (blob.size > MAX_AUDIO_BYTES) throw new Error('Choose an audio file smaller than 150 MB.');
      const bytes = await blob.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(bytes);
      if (token !== deck.loadToken) return false;
      if (!buffer.length || buffer.duration < 0.05) throw new Error('This audio file has no playable audio.');
      if (this.recording && !canRecord(track)) throw new Error('Recording started while this track was loading. Stop recording before loading this source.');
      this.commitDecoded(i, track, buffer);
      deck.loading = false;
      this.emit('loaded', {deck: i});
      this.emit('change', {loaded: i});
      return true;
    } catch (error) {
      if (token !== deck.loadToken) return false;
      deck.loading = false; deck.loadError = error.message;
      this.emit('error', {deck: i, message: error.message});
      this.emit('change', {loadFailed: i});
      throw error;
    } finally {
      if (token === deck.loadToken) deck.loading = false;
    }
  }
  /** Replace a deck's audio only after a successful decode; failed loads never touch the old track. */
  commitDecoded(i, track, buffer) {
    const deck = this.deck(i);
    this.cancelFade();
    if (deck.scratching) this.endScratch(i, {resume: false});
    this.stopSource(deck);
    deck.buffer = buffer;
    deck.track = {...track, duration: buffer.duration};
    deck.duration = buffer.duration;
    deck.offset = clamp(track.start || track.cue || 0, 0, Math.max(0, deck.duration - 0.01));
    deck.bpm = Number(track.bpm) || 0;
    deck.bpmSource = track.bpmSource || (deck.bpm ? 'provided' : 'unknown');
    deck.cue = deck.offset; deck.rate = 1; deck.bend = 0; deck.playing = false; deck.loop = null;
    deck.cueHeld = null; deck.cueHoldToken++;
    deck.cueMeta = cueMetaFrom(track);
    deck.cues = Array.from({length: CUE_SLOTS}, (_, j) => Number.isFinite(track.cues?.[j]) ? clamp(track.cues[j], 0, deck.duration) : null);
    deck.grid = {downbeat: clamp(track.grid?.downbeat ?? track.downbeat ?? 0, 0, deck.duration)};
    deck.quantize = !!track.quantize;
    deck.markers = markersFrom(track.markers, deck.duration);
    if (track.loop?.end > track.loop?.start && track.loop.end <= deck.duration) deck.loop = {start: track.loop.start, end: track.loop.end, beats: null};
    deck.peaks = peaksFromBuffer(buffer);
    deck.tapTimes = []; deck.loadError = null;
    applyChannelFX(this.ctx, deck);
  }
  /** Restore both decks transactionally and paused; resolver(id) → {track, blob}. */
  async restore(snapshot, resolver) {
    if (!snapshot || !Array.isArray(snapshot.decks) || snapshot.decks.length !== 2) throw new Error('This is not a supported Mixline session.');
    await this.init();
    const tokens = this.decks.map(deck => ++deck.loadToken);
    const stale = () => this.decks.some((deck, i) => deck.loadToken !== tokens[i]);
    try {
      const prepared = await Promise.all(snapshot.decks.map(async saved => {
        if (!saved.track) return null;
        if (!canMix(saved.track)) throw new Error('A saved source is unavailable for DJ mixing. Replace it before restoring.');
        if (this.recording && !canRecord(saved.track)) throw new Error('Stop recording before restoring this source.');
        const item = saved.track.demo ? await makeDemo(saved.track.demo) : await resolver(saved.track.id);
        if (!canMix(item?.track)) throw new Error('A saved source no longer permits loading into the mixer.');
        if (this.recording && !canRecord(item?.track)) throw new Error('Stop recording before restoring this source.');
        if (!item?.blob) throw new Error(`The saved file for ${saved.track.title || 'a track'} is missing. Re-import it before restoring.`);
        if (item.blob.size > MAX_AUDIO_BYTES) throw new Error('A saved track exceeds the 150 MB limit.');
        const buffer = await this.ctx.decodeAudioData(await item.blob.arrayBuffer());
        if (!buffer.length) throw new Error('A saved audio file could not be decoded.');
        const capabilities = {...item.track?.capabilities, ...saved.track.capabilities};
        for (const [key, value] of Object.entries(item.track?.capabilities || {})) if (value === false) capabilities[key] = false;
        return {track: {...item.track, ...saved.track, capabilities}, buffer};
      }));
      if (stale()) return false;
      if (this.recording && prepared.some(item => item && !canRecord(item.track))) throw new Error('Recording started during restoration. Stop recording before restoring this source.');
      this.pauseAll();
      prepared.forEach((item, i) => {
        if (!item) { this.eject(i); return; }
        const saved = snapshot.decks[i];
        this.commitDecoded(i, item.track, item.buffer);
        const deck = this.deck(i);
        deck.bpm = Number(saved.bpm) || deck.bpm;
        deck.bpmSource = saved.bpmSource || deck.bpmSource;
        deck.cue = clamp(saved.cue || 0, 0, deck.duration);
        deck.cues = Array.from({length: CUE_SLOTS}, (_, j) => Number.isFinite(saved.cues?.[j]) ? clamp(saved.cues[j], 0, deck.duration) : null);
        deck.cueMeta = cueMetaFrom(saved, deck.cueMeta);
        if (Array.isArray(saved.markers)) deck.markers = markersFrom(saved.markers, deck.duration);
        this.setGrid(i, saved.grid || deck.grid);
        this.setQuantize(i, saved.quantize ?? deck.quantize);
        this.seek(i, saved.position || 0);
        this.setRate(i, saved.rate ?? 1); this.setGain(i, saved.gain ?? 1); this.setTrim(i, saved.trim ?? 1);
        for (const band of BANDS) { this.setEQ(i, band, saved.eq?.[band] ?? 0); this.setEQKill(i, band, !!saved.eqKills?.[band]); }
        this.setFilter(i, saved.filter ?? 0); this.setFX(i, 'echo', saved.fx?.echo ?? 0); this.setFX(i, 'reverb', saved.fx?.reverb ?? 0);
        this.setEcho(i, {beats: saved.echoBeats ?? 0.5, feedback: saved.echoFeedback ?? 0.32});
        this.setFXBypass(i, !!saved.fxBypass); this.setSlip(i, saved.slip ?? false);
        if (saved.loop && saved.loop.end > saved.loop.start && saved.loop.end <= deck.duration) this.setLoopPoints(i, saved.loop.start, saved.loop.end, {quantize: false});
      });
      this.setCrossfadeCurve(snapshot.curve); this.setCrossfade(snapshot.crossfade ?? 0.5);
      this.setMaster(snapshot.master ?? 0.8); this.setMasterMute(!!snapshot.masterMuted);
      this.emit('change', {restored: true});
      return true;
    } catch (error) {
      if (stale()) return false;
      this.emit('error', {message: error.message});
      throw error;
    }
  }
  cancelLoad(i) { const deck = this.deck(i); deck.loadToken++; deck.loading = false; this.emit('change', {cancelled: i}); }
  eject(i) {
    const deck = this.deck(i);
    this.cancelFade();
    if (deck.scratching) this.endScratch(i, {resume: false});
    this.stopSource(deck);
    const kept = {gain: deck.gain, trim: deck.trim, eq: deck.eq, eqKills: deck.eqKills, filter: deck.filter, fx: deck.fx, fxBypass: deck.fxBypass, echoBeats: deck.echoBeats, echoFeedback: deck.echoFeedback, slip: deck.slip, nodes: deck.nodes, loadToken: deck.loadToken + 1, cueHoldToken: deck.cueHoldToken + 1};
    Object.assign(deck, blankDeck(), kept);
    this.emit('change', {ejected: i});
  }

  /* ---------- transport ---------- */
  stopSource(deck) {
    if (!deck.source) return;
    deck.source.onended = null;
    try { deck.source.stop(); } catch { /* already stopped */ }
    deck.source.disconnect();
    deck.source = null;
  }
  startSource(i) {
    const deck = this.deck(i);
    if (!deck.buffer) return false;
    this.stopSource(deck);
    if (deck.offset >= deck.duration - 0.001) deck.offset = deck.loop?.start || 0;
    const source = this.ctx.createBufferSource();
    source.buffer = deck.buffer;
    source.playbackRate.value = deck.rate + deck.bend;
    if (deck.loop) { source.loop = true; source.loopStart = deck.loop.start; source.loopEnd = deck.loop.end; }
    source.connect(deck.nodes.input);
    deck.source = source; deck.anchorTime = this.ctx.currentTime; deck.playing = true;
    source.onended = () => {
      if (deck.source !== source) return;
      deck.offset = deck.duration; deck.playing = false; deck.source = null; source.disconnect();
      this.emit('change', {ended: i});
    };
    source.start(0, deck.offset);
    return true;
  }
  position(i) {
    const deck = this.decks[i];
    if (!deck) return 0;
    const elapsed = deck.playing && this.ctx ? (this.ctx.currentTime - deck.anchorTime) * (deck.rate + deck.bend) : 0;
    return loopPosition(deck.offset + elapsed, deck.loop, deck.duration);
  }
  async play(i) {
    await this.init();
    const deck = this.deck(i);
    if (this.recording && !canRecord(deck.track)) throw new Error('Stop recording before playing this source.');
    deck.cueHeld = null; deck.cueHoldToken++;
    if (deck.scratching) this.endScratch(i, {resume: false});
    if (!deck.buffer) throw new Error('Load a track first.');
    if (!deck.playing) this.startSource(i);
    this.emit('change', {playing: i});
  }
  pause(i) {
    this.cancelFade();
    const deck = this.deck(i), audition = deck.cueHeld === 'audition';
    deck.cueHeld = null; deck.cueHoldToken++;
    if (deck.scratching) this.endScratch(i, {resume: false});
    deck.offset = audition ? deck.cue : this.position(i);
    this.stopSource(deck);
    deck.playing = false; deck.bend = 0;
    this.emit('change', {paused: i});
  }
  pauseAll() { this.cancelFade(); this.pause(0); this.pause(1); }
  async toggle(i) { return this.deck(i).playing ? this.pause(i) : this.play(i); }
  seek(i, position) {
    const deck = this.deck(i);
    deck.offset = clamp(position, 0, Math.max(0, deck.duration - 0.001));
    if (deck.loop && (deck.offset < deck.loop.start || deck.offset >= deck.loop.end)) deck.loop = null;
    if (deck.playing) this.startSource(i);
    this.emit('change', {seek: i});
  }
  returnToStart(i) { this.seek(i, 0); }

  /* ---------- main cue and hot cues ---------- */
  cue(i) { const deck = this.deck(i); this.pause(i); this.seek(i, deck.cue || 0); }
  /** Hold: audition from the cue point while playing paused; tap while playing: return to cue. */
  async cueDown(i) {
    const deck = this.deck(i);
    if (!deck.buffer) return;
    if (this.recording && !canRecord(deck.track)) throw new Error('Stop recording before auditioning this source.');
    if (deck.playing) { this.cue(i); deck.cueHeld = 'return'; return; }
    const token = ++deck.cueHoldToken;
    deck.cue = this.quantizedPosition(i, this.position(i));
    deck.offset = deck.cue; deck.cueHeld = 'audition';
    await this.init();
    if (deck.cueHoldToken !== token || deck.cueHeld !== 'audition') return;
    this.startSource(i);
    this.emit('change', {audition: i});
  }
  cueUp(i) {
    const deck = this.deck(i), held = deck.cueHeld;
    deck.cueHeld = null; deck.cueHoldToken++;
    if (held === 'audition') { this.pause(i); this.seek(i, deck.cue); }
  }
  quantizedPosition(i, value) {
    const deck = this.deck(i);
    if (!deck.quantize || !deck.bpm) return clamp(value, 0, deck.duration);
    const beat = 60 / deck.bpm, base = deck.grid.downbeat;
    return clamp(base + Math.round((value - base) / beat) * beat, 0, deck.duration);
  }
  setStartCue(i, value = this.position(i)) { const deck = this.deck(i); deck.cue = this.quantizedPosition(i, value); this.emit('change', {cue: i}); }
  setCue(i, slot, position = this.position(i)) {
    const deck = this.deck(i);
    if (!deck.buffer) return;
    deck.cues[Math.round(clamp(slot, 0, CUE_SLOTS - 1))] = this.quantizedPosition(i, position);
    this.emit('change', {cues: i});
  }
  clearCue(i, slot) { const deck = this.deck(i); slot = Math.round(clamp(slot, 0, CUE_SLOTS - 1)); deck.cues[slot] = null; deck.cueMeta[slot] = {name: '', color: ''}; this.emit('change', {cues: i}); }
  renameCue(i, slot, name, color) {
    const deck = this.deck(i); slot = Math.round(clamp(slot, 0, CUE_SLOTS - 1));
    deck.cueMeta[slot] = {name: String(name || '').slice(0, 40), color: safeColor(color ?? deck.cueMeta[slot].color)};
    this.emit('change', {cues: i});
  }
  goCue(i, slot) { const position = this.deck(i).cues[Math.round(clamp(slot, 0, CUE_SLOTS - 1))]; if (position !== null) this.seek(i, position); }

  /* ---------- markers, grid, tempo analysis ---------- */
  addMarker(i, {name = 'Marker', position = this.position(i), color = '', id} = {}) {
    const deck = this.deck(i);
    if (deck.markers.length >= 128) throw new Error('This track already has 128 markers.');
    const marker = {id: id || globalThis.crypto.randomUUID(), name: String(name).slice(0, 40), position: clamp(position, 0, deck.duration), color: safeColor(color)};
    deck.markers.push(marker); deck.markers.sort((a, b) => a.position - b.position);
    this.emit('change', {markers: i});
    return marker;
  }
  updateMarker(i, id, updates = {}) {
    const deck = this.deck(i), marker = deck.markers.find(m => m.id === id);
    if (!marker) return;
    Object.assign(marker, {name: String(updates.name ?? marker.name).slice(0, 40), position: clamp(updates.position ?? marker.position, 0, deck.duration), color: safeColor(updates.color ?? marker.color)});
    deck.markers.sort((a, b) => a.position - b.position);
    this.emit('change', {markers: i});
  }
  removeMarker(i, id) { const deck = this.deck(i); deck.markers = deck.markers.filter(m => m.id !== id); this.emit('change', {markers: i}); }
  setGrid(i, {downbeat, bpm} = {}) { const deck = this.deck(i); if (bpm !== undefined) this.setBpm(i, bpm); deck.grid = {downbeat: clamp(downbeat ?? deck.grid.downbeat, 0, deck.duration)}; this.emit('change', {grid: i}); }
  setQuantize(i, enabled) { this.deck(i).quantize = !!enabled; this.emit('change', {grid: i}); }
  analyzeBpm(i) {
    const deck = this.deck(i), estimate = estimateBpm(deck.buffer);
    if (!estimate) throw new Error('No reliable tempo estimate. Use Tap or enter BPM manually.');
    this.setBpm(i, estimate.bpm); deck.bpmSource = 'estimated';
    this.emit('change', {bpm: i});
    return estimate;
  }
  setBpm(i, bpm) {
    const deck = this.deck(i);
    deck.bpm = clamp(bpm, 30, 300); deck.bpmSource = 'manual';
    if (deck.track) deck.track.bpm = deck.bpm;
    applyChannelFX(this.ctx, deck);
    this.emit('change', {bpm: i});
  }
  tap(i, time = performance.now()) {
    const deck = this.deck(i);
    if (deck.tapTimes.length && time - deck.tapTimes.at(-1) > 2500) deck.tapTimes = [];
    deck.tapTimes.push(time); deck.tapTimes = deck.tapTimes.slice(-8);
    if (deck.tapTimes.length > 1) this.setBpm(i, 60000 * (deck.tapTimes.length - 1) / (time - deck.tapTimes[0]));
    return deck.bpm;
  }

  /* ---------- tempo ---------- */
  setRate(i, rate) {
    const deck = this.deck(i);
    deck.offset = this.position(i); deck.anchorTime = this.ctx?.currentTime || 0;
    deck.rate = clamp(rate, RATE_MIN, RATE_MAX);
    if (deck.source) deck.source.playbackRate.setValueAtTime(deck.rate + deck.bend, this.ctx.currentTime);
    this.emit('change', {rate: i});
  }
  /** Momentary pitch bend (nudge); endBend returns to the chosen tempo without a jump. */
  bend(i, amount = 0.04) {
    const deck = this.deck(i);
    deck.offset = this.position(i); deck.anchorTime = this.ctx?.currentTime || 0;
    deck.bend = clamp(amount, -0.08, 0.08);
    if (deck.source) deck.source.playbackRate.setValueAtTime(deck.rate + deck.bend, this.ctx.currentTime);
    this.emit('change', {bend: i});
  }
  endBend(i) { this.bend(i, 0); }
  beatJump(i, beats) { const deck = this.deck(i); if (!deck.bpm) throw new Error('Set or tap BPM before beat jumps.'); this.seek(i, this.position(i) + (60 / deck.bpm) * beats); }
  /** One-time tempo match plus phase alignment to the other deck. Playback speed changes pitch. */
  sync(i) {
    const deck = this.deck(i), other = this.deck(1 - i);
    if (!deck.bpm || !other.bpm) throw new Error('Set BPM on both decks before tempo sync.');
    const desired = (other.bpm * other.rate) / deck.bpm;
    if (desired < RATE_MIN || desired > RATE_MAX) throw new Error('These tempos are outside the ±16% pitch range. Correct BPM or choose a closer track.');
    this.setRate(i, desired);
    this.seek(i, deck.grid.downbeat + phaseAlignedPosition(this.position(i) - deck.grid.downbeat, deck.bpm, this.position(1 - i) - other.grid.downbeat, other.bpm));
  }

  /* ---------- loops ---------- */
  setLoopPoints(i, start, end, {quantize = true} = {}) {
    const deck = this.deck(i);
    if (!deck.buffer) return;
    start = quantize ? this.quantizedPosition(i, start) : clamp(start, 0, deck.duration);
    end = quantize ? this.quantizedPosition(i, end) : clamp(end, 0, deck.duration);
    end = clamp(end, start, deck.duration);
    if (end - start < 0.02) throw new Error('Loop out must be after loop in.');
    deck.loop = {start, end, beats: deck.bpm ? (end - start) * deck.bpm / 60 : null};
    const position = this.position(i);
    deck.offset = position < start || position >= end ? start : position;
    if (deck.playing) this.startSource(i);
    this.emit('change', {loop: i});
  }
  /** Beat loop from the current position; loop(i, 0) exits the loop in place. */
  loop(i, beats) {
    const deck = this.deck(i);
    if (!beats) { deck.offset = this.position(i); deck.loop = null; if (deck.playing) this.startSource(i); this.emit('change', {loop: i}); return; }
    if (!deck.bpm) throw new Error('Set or tap BPM before using beat loops.');
    const length = clamp(beats, 0.25, 32) * 60 / deck.bpm;
    const start = Math.min(this.position(i), Math.max(0, deck.duration - length));
    this.setLoopPoints(i, start, Math.min(deck.duration, start + length));
  }

  /* ---------- mixer and effects ---------- */
  setEQ(i, band, db, {fromFade = false} = {}) {
    const deck = this.deck(i);
    if (!BANDS.includes(band)) return;
    if (!fromFade) this.cancelFade();
    deck.eq[band] = clamp(db, -30, 12);
    if (deck.nodes) setParam(this.ctx, deck.nodes[band].gain, deck.eqKills[band] ? -90 : deck.eq[band]);
    this.emit('change', {eq: i});
  }
  setEQKill(i, band, enabled) {
    const deck = this.deck(i);
    if (!BANDS.includes(band)) return;
    this.cancelFade();
    deck.eqKills[band] = !!enabled;
    if (deck.nodes) setParam(this.ctx, deck.nodes[band].gain, deck.eqKills[band] ? -90 : deck.eq[band]);
    this.emit('change', {eq: i});
  }
  setFilter(i, value) { this.cancelFade(); const deck = this.deck(i); deck.filter = clamp(value, -1, 1); applyChannelFX(this.ctx, deck); this.emit('change', {fx: i}); }
  setFX(i, type, amount, {fromFade = false} = {}) {
    const deck = this.deck(i);
    if (!['echo', 'reverb'].includes(type)) return;
    if (!fromFade) this.cancelFade();
    deck.fx[type] = clamp(amount, 0, 1);
    applyChannelFX(this.ctx, deck);
    this.emit('change', {fx: i});
  }
  setXY(i, x, y) { this.cancelFade(); const deck = this.deck(i); deck.filter = clamp(x, -1, 1); deck.fx.echo = clamp(y, 0, 1); applyChannelFX(this.ctx, deck); this.emit('change', {fx: i}); }
  setFXBypass(i, enabled) { this.cancelFade(); const deck = this.deck(i); deck.fxBypass = !!enabled; applyChannelFX(this.ctx, deck); this.emit('change', {fx: i}); }
  resetFX(i) { this.cancelFade(); const deck = this.deck(i); deck.filter = 0; deck.fx = {echo: 0, reverb: 0}; deck.fxBypass = false; applyChannelFX(this.ctx, deck); this.emit('change', {fx: i}); }
  setEcho(i, {beats, feedback} = {}) {
    this.cancelFade();
    const deck = this.deck(i);
    if (beats !== undefined) deck.echoBeats = clamp(beats, 0.125, 4);
    if (feedback !== undefined) deck.echoFeedback = clamp(feedback, 0, 0.85);
    applyChannelFX(this.ctx, deck);
    this.emit('change', {fx: i});
  }
  setGain(i, value) { this.cancelFade(); const deck = this.deck(i); deck.gain = clamp(value, 0, 1.5); if (deck.nodes) setParam(this.ctx, deck.nodes.channel.gain, deck.gain); this.emit('change', {gain: i}); }
  setTrim(i, value) { this.cancelFade(); const deck = this.deck(i); deck.trim = clamp(value, 0, 2); if (deck.nodes) setParam(this.ctx, deck.nodes.input.gain, deck.trim); this.emit('change', {trim: i}); }
  setMaster(value) { this.master = clamp(value, 0, 1); if (this.masterNode) setParam(this.ctx, this.masterNode.gain, this.masterMuted ? 0 : this.master); this.emit('change', {master: true}); }
  setMasterMute(enabled) { this.masterMuted = !!enabled; if (this.masterNode) setParam(this.ctx, this.masterNode.gain, this.masterMuted ? 0 : this.master); this.emit('change', {master: true}); }
  applyCrossfade() {
    const gains = crossfadeGains(this.crossfade, this.curve);
    this.decks.forEach((deck, i) => { if (deck.nodes) setParam(this.ctx, deck.nodes.mix.gain, gains[i]); });
  }
  setCrossfade(value, {fromFade = false} = {}) { if (!fromFade) this.cancelFade(); this.crossfade = clamp(value, 0, 1); this.applyCrossfade(); this.emit('change', {crossfade: true}); }
  setCrossfadeCurve(curve) { this.curve = curve === 'cut' ? 'cut' : 'blend'; this.applyCrossfade(); this.emit('change', {curve: true}); }
  /** Audibility of a deck after the crossfader, master and mute. */
  audible(i) { const gain = crossfadeGains(this.crossfade, this.curve)[i]; return !this.masterMuted && this.master > 0 && gain > 0.02 && this.deck(i).gain > 0.01; }

  /* ---------- timed transitions ---------- */
  fadeTo(i, seconds = 4) { return this.transitionTo(i, seconds, 'blend'); }
  /** Automate the crossfader (plus bass swap or echo-out) on the audio clock. Any manual move cancels. */
  transitionTo(i, seconds = 4, style = 'blend') {
    const deck = this.deck(i);
    if (!deck.playing) throw new Error('Start the incoming deck before fading.');
    this.cancelFade();
    const start = this.crossfade, target = i === 0 ? 0 : 1, duration = clamp(seconds, 0.1, 600);
    style = ['blend', 'bass', 'echo'].includes(style) ? style : 'blend';
    const outgoing = 1 - i;
    const originalLow = this.decks.map(d => d.eq.low), originalEcho = this.deck(outgoing).fx.echo;
    const transition = {start, target, started: this.ctx.currentTime, duration, incoming: i, style, progress: 0};
    this.fade = transition;
    if (style === 'bass') this.setEQ(i, 'low', -30, {fromFade: true});
    this._fadeTimer = setInterval(() => {
      if (this.fade !== transition) return;
      const progress = clamp((this.ctx.currentTime - transition.started) / duration, 0, 1);
      transition.progress = progress;
      if (style === 'bass') {
        this.setEQ(outgoing, 'low', originalLow[outgoing] + (-30 - originalLow[outgoing]) * progress, {fromFade: true});
        if (this.fade !== transition) return;
        this.setEQ(i, 'low', -30 + (originalLow[i] + 30) * progress, {fromFade: true});
      }
      if (style === 'echo') this.setFX(outgoing, 'echo', originalEcho + (0.75 - originalEcho) * progress, {fromFade: true});
      if (this.fade !== transition) return;
      this.setCrossfade(start + (target - start) * progress, {fromFade: true});
      // A change listener may cancel or replace this fade during the fader update.
      if (progress >= 1 && this.fade === transition) { this.cancelFade(); this.emit('transitionend', {incoming: i}); this.emit('change', {transition: 'done'}); }
    }, 20);
    this.emit('change', {transition: 'start'});
  }
  cancelFade() { if (this._fadeTimer) clearInterval(this._fadeTimer); this._fadeTimer = null; this.fade = null; }

  /* ---------- metering and waveform ---------- */
  waveform(i) { return this.deck(i).peaks; }
  meter(i) { return rmsLevel(i === undefined ? this.masterMeter : this.deck(i).nodes?.analyser); }
  outputMeter(i) { if (this.masterMuted) return 0; return rmsLevel(this.deck(i).nodes?.outputAnalyser) * this.master; }

  /* ---------- recording ---------- */
  get recording() { return this.recorder?.recording === true; }
  get recordingElapsed() { return this.recorder?.elapsed || 0; }
  async startRecording() {
    await this.init();
    if (this.recording) return;
    if (this.decks.some(deck => deck.track && !canRecord(deck.track))) throw new Error('Remove the source that cannot be recorded from the decks before recording.');
    if (this.recorder?.pending) throw new Error('The previous recording is still finishing. Save it before starting another.');
    const recorder = createRecorder(this.recordDestination.stream, {
      limitBytes: RECORD_LIMIT_BYTES,
      onStop: ({blob, mime, autoStop}) => { this.emit('recording', {active: false, blob, mime, autoStop}); this.emit('change', {recording: false}); },
      onError: message => this.emit('error', {message}),
      onLimit: message => this.emit('error', {message})
    });
    this.recorder = recorder;
    recorder.start();
    this.emit('recording', {active: true, mime: recorder.mime});
    this.emit('change', {recording: true});
  }
  async stopRecording() {
    if (!this.recorder) throw new Error('No recording has been started.');
    return this.recorder.stop();
  }

  /* ---------- scratching ---------- */
  setSlip(i, enabled) { this.deck(i).slip = !!enabled; this.emit('change', {slip: i}); }
  startScratch(i) {
    const deck = this.deck(i);
    if (!deck.buffer || deck.scratching) return;
    const position = this.position(i);
    deck.scratchState = {position, started: this.ctx.currentTime, wasPlaying: deck.playing, lastTime: this.ctx.currentTime, lastPosition: position};
    deck.offset = position;
    this.stopSource(deck);
    deck.playing = false; deck.scratching = true;
    this.emit('change', {scratch: i});
  }
  /** Granular forward/reverse playback following the finger. */
  scratchTo(i, position) {
    const deck = this.deck(i);
    if (!deck.scratching) this.startScratch(i);
    if (!deck.scratching) return;
    const now = this.ctx.currentTime, state = deck.scratchState;
    const target = clamp(position, 0, Math.max(0, deck.duration - 0.001));
    const dt = Math.max(0.016, now - state.lastTime), delta = target - state.lastPosition;
    deck.offset = target;
    if (now - state.lastTime < 0.012 || Math.abs(delta) < 0.0005) return;
    const speed = clamp(Math.abs(delta) / dt, 0.08, 4), reverse = delta < 0, length = 0.07;
    const source = this.ctx.createBufferSource(), amp = this.ctx.createGain();
    if (reverse) {
      const sampleRate = deck.buffer.sampleRate;
      const count = Math.max(2, Math.min(Math.floor(target * sampleRate), Math.ceil(length * speed * sampleRate)));
      const grain = this.ctx.createBuffer(deck.buffer.numberOfChannels, count, sampleRate);
      const at = Math.floor(target * sampleRate);
      for (let ch = 0; ch < grain.numberOfChannels; ch++) {
        const from = deck.buffer.getChannelData(ch), to = grain.getChannelData(ch);
        for (let n = 0; n < count; n++) to[n] = from[Math.max(0, at - n)] || 0;
      }
      source.buffer = grain;
    } else {
      source.buffer = deck.buffer;
    }
    source.playbackRate.value = speed;
    source.connect(amp); amp.connect(deck.nodes.input);
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(0.7, now + 0.008);
    amp.gain.setValueAtTime(0.7, now + length - 0.012);
    amp.gain.linearRampToValueAtTime(0, now + length);
    const entry = {source, amp};
    deck.scratchSources.add(entry);
    source.onended = () => { source.disconnect(); amp.disconnect(); deck.scratchSources.delete(entry); };
    if (reverse) source.start(now); else source.start(now, target, Math.min(length * speed, deck.duration - target));
    source.stop(now + length);
    state.lastPosition = target; state.lastTime = now;
    this.emit('change', {scratch: i});
  }
  endScratch(i, {resume = true} = {}) {
    const deck = this.deck(i);
    if (!deck.scratching) return;
    const state = deck.scratchState;
    for (const {source, amp} of deck.scratchSources) { try { source.stop(); } catch { /* ended */ } source.disconnect(); amp.disconnect(); }
    deck.scratchSources.clear();
    if (deck.slip && state.wasPlaying) deck.offset = loopPosition(state.position + (this.ctx.currentTime - state.started) * (deck.rate + deck.bend), deck.loop, deck.duration);
    if (deck.loop && (deck.offset < deck.loop.start || deck.offset >= deck.loop.end)) deck.loop = null;
    deck.scratching = false; deck.scratchState = null;
    if (resume && state.wasPlaying) this.startSource(i);
    this.emit('change', {scratch: i});
  }

  /* ---------- sampler ---------- */
  async sampler(index, volume = 0.7) {
    await this.init();
    const id = Math.floor(clamp(index, 0, 7));
    const key = `${id}:${volume}`;
    let buffer = this._samplerBuffers.get(key);
    if (!buffer) { buffer = makeSamplerBuffer(this.ctx, id, volume); this._samplerBuffers.set(key, buffer); }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterNode);
    source.onended = () => source.disconnect();
    source.start();
    this.emit('sampler', {index: id});
  }

  /* ---------- persistence ---------- */
  snapshot() {
    return {
      version: 2, crossfade: this.crossfade, curve: this.curve, master: this.master, masterMuted: this.masterMuted,
      decks: this.decks.map((d, i) => ({
        track: d.track, playing: d.playing, position: this.position(i), duration: d.duration, bpm: d.bpm, bpmSource: d.bpmSource,
        rate: d.rate, gain: d.gain, trim: d.trim, cue: d.cue, cues: [...d.cues], cueMeta: d.cueMeta.map(x => ({...x})),
        markers: d.markers.map(x => ({...x})), grid: {...d.grid}, quantize: d.quantize, eqKills: {...d.eqKills},
        fxBypass: d.fxBypass, echoBeats: d.echoBeats, echoFeedback: d.echoFeedback, loop: d.loop ? {...d.loop} : null,
        eq: {...d.eq}, filter: d.filter, fx: {...d.fx}, slip: d.slip
      }))
    };
  }
}
