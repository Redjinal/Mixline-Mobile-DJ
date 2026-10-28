/** Pure audio math shared by the engine and the waveform views. */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

/** Equal-power blend (default) or hard cut at the centre. Returns [deck1Gain, deck2Gain]. */
export function crossfadeGains(value, curve = 'blend') {
  const x = clamp(value, 0, 1);
  if (curve === 'cut') return [x <= 0.5 ? 1 : 0, x >= 0.5 ? 1 : 0];
  return [Math.cos(x * Math.PI / 2), Math.sin(x * Math.PI / 2)];
}

/** Wrap a running position into an active loop; otherwise clamp to the track. */
export function loopPosition(position, loop, duration) {
  if (loop && loop.end > loop.start && position >= loop.end) {
    return loop.start + ((position - loop.start) % (loop.end - loop.start));
  }
  return clamp(position, 0, duration);
}

/** Keep the current beat number but adopt the other deck's fractional beat phase. */
export function phaseAlignedPosition(position, currentBpm, targetPosition, targetBpm) {
  if (!(currentBpm > 0 && targetBpm > 0)) return position;
  const beat = 60 / currentBpm;
  const targetPhase = (targetPosition / (60 / targetBpm)) % 1;
  return Math.floor(position / beat) * beat + targetPhase * beat;
}

/** Absolute peak per bucket across all channels. */
export function peaksFromBuffer(buffer, count = 512) {
  const output = new Float32Array(count);
  const step = Math.max(1, Math.floor(buffer.length / count));
  const stride = Math.max(1, Math.floor(step / 96));
  const channels = Array.from({length: buffer.numberOfChannels}, (_, i) => buffer.getChannelData(i));
  for (let b = 0; b < count; b++) {
    const end = Math.min(buffer.length, (b + 1) * step);
    let peak = 0;
    for (let s = b * step; s < end; s += stride) {
      for (const channel of channels) { const v = Math.abs(channel[s] || 0); if (v > peak) peak = v; }
    }
    output[b] = peak;
  }
  return output;
}

/**
 * Low-cost onset autocorrelation. Returns an estimate with a confidence score,
 * never a claimed perfect beat grid; null for silence or very short audio.
 */
export function estimateBpm(buffer) {
  if (!buffer?.length || buffer.duration < 4) return null;
  const hz = 100;
  const hop = Math.max(1, Math.floor(buffer.sampleRate / hz));
  const count = Math.min(Math.floor(buffer.length / hop), 180 * hz);
  const data = buffer.getChannelData(0);
  const onset = new Float32Array(count);
  let previous = 0, energy = 0;
  for (let n = 0; n < count; n++) {
    let sum = 0;
    for (let j = 0; j < hop; j += 4) { const v = data[n * hop + j] || 0; sum += v * v; }
    const rms = Math.sqrt(sum / Math.ceil(hop / 4));
    onset[n] = Math.max(0, rms - previous);
    previous = rms;
    energy += onset[n] * onset[n];
  }
  if (energy < 1e-7) return null;
  let best = {score: 0, lag: 0, confidence: 0};
  for (let lag = Math.ceil(hz * 60 / 180); lag <= Math.floor(hz * 60 / 65); lag++) {
    let correlation = 0, a = 0, b = 0;
    for (let n = lag; n < count; n++) { correlation += onset[n] * onset[n - lag]; a += onset[n] * onset[n]; b += onset[n - lag] * onset[n - lag]; }
    const score = correlation / Math.max(1e-12, Math.sqrt(a * b));
    // Prefer a central tempo when periodic multiples are equally plausible.
    const weighted = score * (1 - Math.abs(hz * 60 / lag - 120) * 0.0004);
    if (weighted > best.score) best = {score: weighted, lag, confidence: score};
  }
  if (best.confidence < 0.12) return null;
  return {bpm: Math.round(hz * 60 / best.lag * 10) / 10, confidence: Math.round(best.confidence * 100) / 100, method: 'estimated'};
}

/** A visible window {start, span} centred on `center`, limited to the track. */
export function fitWaveWindow(duration, center, span) {
  duration = Math.max(0, Number(duration) || 0);
  span = clamp(span, Math.min(duration, 0.5), duration);
  const start = clamp(center - span / 2, 0, Math.max(0, duration - span));
  return {start, span};
}

/** Zoom a window by `factor` keeping the point at `anchor` (0..1 across the window) fixed. */
export function zoomWaveWindow(duration, window, factor, anchor = 0.5) {
  const anchorTime = window.start + window.span * anchor;
  const span = clamp(window.span * factor, Math.min(duration, 0.5), duration);
  const start = clamp(anchorTime - span * anchor, 0, Math.max(0, duration - span));
  return {start, span};
}

/** Track time under a pointer at `fraction` (0..1) of a window's width. */
export function timeAtWavePoint(window, fraction, duration) {
  return clamp(window.start + window.span * clamp(fraction, 0, 1), 0, duration);
}
