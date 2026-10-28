/** Minimal Web Audio stand-ins for node tests. */
export class Param {
  constructor(value = 0) { this.value = value; }
  setValueAtTime(v) { this.value = v; }
  setTargetAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  cancelScheduledValues() {}
}
export class Node {
  constructor() {
    for (const k of ['gain', 'frequency', 'Q', 'delayTime', 'threshold', 'knee', 'ratio', 'attack', 'release', 'playbackRate']) this[k] = new Param();
    this.fftSize = 512; this.connections = [];
  }
  connect(n) { this.connections.push(n); }
  disconnect() { this.connections = []; }
  start(t, offset) { this.started = {t, offset}; }
  stop() { this.stopped = true; }
  getFloatTimeDomainData(a) { a.fill(0); }
}
export class Buffer {
  constructor(channels = 1, length = 441000, sampleRate = 44100) {
    this.numberOfChannels = channels; this.length = length; this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channels = Array.from({length: channels}, () => new Float32Array(length));
  }
  getChannelData(i) { return this.channels[i]; }
}
export class Context {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = new Node(); this.decode = async () => new Buffer(); }
  createGain() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createAnalyser() { return new Node(); }
  createMediaStreamDestination() { return Object.assign(new Node(), {stream: {}}); }
  createBiquadFilter() { return new Node(); }
  createDelay() { return new Node(); }
  createConvolver() { return new Node(); }
  createBufferSource() { const node = new Node(); this.lastSource = node; return node; }
  createBuffer(c, n, s) { return new Buffer(c, n, s); }
  decodeAudioData(bytes) { return this.decode(bytes); }
  resume() { this.state = 'running'; }
  close() { this.state = 'closed'; }
  addEventListener() {}
}
