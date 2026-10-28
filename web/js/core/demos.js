/** Original synthesised practice tracks and sampler sounds. No external audio or accounts needed. */
import {clamp} from './analysis.js';

const DEMO_INFO = [
  {key: 'red', id: 'demo-red', title: 'Afterhours Circuit', artist: 'Mixline Originals', bpm: 120, root: 55, color: '#ff3b3b'},
  {key: 'blue', id: 'demo-blue', title: 'Midnight Voltage', artist: 'Mixline Originals', bpm: 126, root: 65.406, color: '#00e5ff'},
  {key: 'harbour', id: 'demo-harbour', title: 'Harbour Lights', artist: 'Mixline Originals', bpm: 124, root: 61.735, color: '#2ee6c8'},
  {key: 'warm', id: 'demo-warm', title: 'Warm Front', artist: 'Mixline Originals', bpm: 96, root: 49, color: '#ffb020'},
  {key: 'coast', id: 'demo-coast', title: 'Coastline Edit', artist: 'Mixline Originals', bpm: 128, root: 73.416, color: '#a855ff'},
  {key: 'redline', id: 'demo-redline', title: 'Redline Intro', artist: 'Mixline Originals', bpm: 110, root: 58.27, color: '#ff577f'},
];

export const DEMO_TRACKS = DEMO_INFO.map(({key, root, ...track}) => ({
  ...track, demo: key, source: 'original', provider: 'original', sourceName: 'Mixline Originals',
  artwork: `assets/covers/${key}.svg`, bpmSource: 'provided', license: 'Original recording', credit: 'Mixline Originals'
}));

export const SAMPLER_SOUNDS = ['Kick', 'Snare', 'Closed hat', 'Clap', 'Tom', 'Rim', 'Sub', 'Zap'];

function seeded(seed) {
  let state = seed;
  return () => { state = (state * 16807) % 2147483647; return state / 1073741824 - 1; };
}

function wavBlob(data, sampleRate) {
  const frames = data.length;
  const bytes = new ArrayBuffer(44 + frames * 2), view = new DataView(bytes);
  const text = (at, s) => { for (let j = 0; j < s.length; j++) view.setUint8(at + j, s.charCodeAt(j)); };
  text(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, frames * 2, true);
  for (let n = 0; n < frames; n++) view.setInt16(44 + n * 2, Math.round(clamp(data[n], -1, 1) * 32767), true);
  return new Blob([bytes], {type: 'audio/wav'});
}

/** 64-beat loop: kick, hats, backbeat snare, bass note pattern and a soft lead. */
export async function makeDemo(id = 'red') {
  const key = String(id).replace(/^demo-/, '');
  const variant = Math.max(0, DEMO_INFO.findIndex(d => d.key === key));
  const info = DEMO_INFO[variant];
  const track = DEMO_TRACKS[variant];
  const sampleRate = 22050, beats = 64, beatSeconds = 60 / info.bpm;
  const seconds = beats * beatSeconds, frames = Math.floor(seconds * sampleRate);
  const data = new Float32Array(frames);
  const random = seeded(12345 + variant * 8193);
  for (let beat = 0; beat < beats; beat++) {
    const base = Math.floor(beat * beatSeconds * sampleRate);
    for (let n = 0; n < sampleRate * 0.22 && base + n < frames; n++) {
      const t = n / sampleRate;
      data[base + n] += Math.sin(2 * Math.PI * (48 * t + 3.2 * (1 - Math.exp(-t * 30)))) * Math.exp(-t * 22) * 0.48;
    }
    for (let eighth = 0; eighth < 2; eighth++) {
      const at = base + Math.floor(eighth * beatSeconds * 0.5 * sampleRate);
      for (let n = 0; n < sampleRate * 0.045 && at + n < frames; n++) data[at + n] += random() * Math.exp(-n / sampleRate * 105) * 0.11;
    }
    if (beat % 2 === 1) {
      for (let n = 0; n < sampleRate * 0.14 && base + n < frames; n++) {
        const t = n / sampleRate;
        data[base + n] += (random() * 0.7 + Math.sin(2 * Math.PI * 180 * t) * 0.3) * Math.exp(-t * 30) * 0.24;
      }
    }
    const note = info.root * Math.pow(2, [0, 0, 7, 3][Math.floor(beat / 4) % 4] / 12);
    const offset = base + Math.floor(beatSeconds * 0.5 * sampleRate);
    for (let n = 0; n < sampleRate * beatSeconds * 0.35 && offset + n < frames; n++) {
      const t = n / sampleRate;
      data[offset + n] += Math.sin(2 * Math.PI * note * t) * Math.min(1, t * 70) * Math.exp(-t * 7) * 0.21;
    }
    if (beat % 2 === 0) {
      const lead = note * 4;
      for (let n = 0; n < sampleRate * beatSeconds * 0.7 && base + n < frames; n++) {
        const t = n / sampleRate;
        data[base + n] += (Math.sin(2 * Math.PI * lead * t) + 0.3 * Math.sin(2 * Math.PI * lead * 1.5 * t)) * Math.exp(-t * 9) * 0.065;
      }
    }
  }
  return {track: {...track, duration: seconds}, blob: wavBlob(data, sampleRate)};
}

/** Short synthesised one-shots for the sampler pads. */
export function makeSamplerBuffer(ctx, index, volume = 0.7) {
  const id = Math.floor(clamp(index, 0, 7));
  const length = id === 7 ? 0.8 : 0.45;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const a = buffer.getChannelData(0);
  const random = seeded(7919 + id);
  const level = clamp(volume, 0, 1) * 0.6;
  for (let n = 0; n < a.length; n++) {
    const t = n / ctx.sampleRate, noise = random();
    let v = 0;
    switch (id) {
      case 0: v = Math.sin(2 * Math.PI * (48 * t + 3 * (1 - Math.exp(-t * 32)))) * Math.exp(-t * 18); break;
      case 1: v = (noise * 0.7 + Math.sin(2 * Math.PI * 180 * t) * 0.3) * Math.exp(-t * 23); break;
      case 2: v = noise * Math.exp(-t * 85) * 0.45; break;
      case 3: v = noise * (Math.exp(-t * 22) + (t > 0.018 ? Math.exp(-(t - 0.018) * 30) : 0)) * 0.5; break;
      case 4: v = Math.sin(2 * Math.PI * (115 * t + 2 * (1 - Math.exp(-t * 20)))) * Math.exp(-t * 12); break;
      case 5: v = (Math.sin(2 * Math.PI * 480 * t) + Math.sin(2 * Math.PI * 1770 * t)) * 0.4 * Math.exp(-t * 70); break;
      case 6: v = Math.sin(2 * Math.PI * 55 * t) * Math.min(1, t * 120) * Math.exp(-t * 7); break;
      default: v = Math.sin(2 * Math.PI * (900 * t - 500 * t * t)) * Math.exp(-t * 6) * 0.5;
    }
    a[n] = v * level;
  }
  return buffer;
}
