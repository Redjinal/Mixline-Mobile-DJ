// <mdj-art seed="aurora" size="40|56|96" label="AURORA DRIVE" state="placeholder|loading|cached">
//
// Deterministic procedural artwork placeholder (AS-15): an original geometric pattern derived only from
// the seed, drawn in muted Crystal Current tones (titanium, brass, deck accents at low opacity — all
// tokens). It is never a performer photo or a real album cover, and it is decoration: the title text
// beside it carries identity. The same seed always draws the same pattern, so a track is recognisable
// across rows, decks and the queue.
//   placeholder — the pattern (no artwork has been fetched or none exists)
//   loading     — a region-sized skeleton while artwork for this track is genuinely being fetched
//                 (Document 04 §4 "Loading"); pulses only under full motion
//   cached      — the pattern plus a small opaque CACHED tag: a derived artwork cache exists for the track
// Engine binding: none. Units: size in dp (40 list / 56 row / 96 deck summary). Gesture: none (hit 0).
// Pending vs acknowledged: n/a. Cancellation: n/a.
// Accessible: role=img, name "Artwork placeholder for AURORA DRIVE (procedural pattern)".
import { MdjElement, define, h, s, icon } from './base.js';

const SIZES = [40, 56, 96];
// Muted tone palette, all tokens. Opacity keeps them quiet on the pale stage and the lowlight stage.
const TONES = ['var(--titanium)', 'var(--titanium-lo)', 'var(--brass-hi)', 'var(--brass)', 'var(--deck-a-accent)', 'var(--deck-b-accent)', 'var(--deck-c-accent)', 'var(--deck-d-accent)', 'var(--info)', 'var(--ink-3)'];

export function hashSeed(str) {
  let x = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
  return x >>> 0;
}
export function prng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Each family returns SVG children for a 96×96 box. Pure functions of the generator.
const FAMILIES = [
  function bands(r, tone) { // diagonal bands of varying width
    const out = []; const n = 3 + Math.floor(r() * 4); const angle = Math.floor(r() * 4) * 45 - 45;
    let x = -40;
    for (let i = 0; i < n * 2; i++) {
      const w = 6 + r() * 22;
      out.push(s('rect', { x, y: -40, width: w, height: 176, fill: tone(i % 3), 'fill-opacity': (0.28 + r() * 0.3).toFixed(2), transform: `rotate(${angle} 48 48)` }));
      x += w + 4 + r() * 14;
    }
    return out;
  },
  function rings(r, tone) { // concentric rings around an off-centre point
    const out = []; const cx = 24 + r() * 48, cy = 24 + r() * 48; const n = 4 + Math.floor(r() * 4);
    for (let i = n; i >= 1; i--) {
      out.push(s('circle', { cx, cy, r: (i * (14 + r() * 6)).toFixed(1), fill: 'none', stroke: tone(i % 3), 'stroke-width': (3 + r() * 7).toFixed(1), 'stroke-opacity': (0.3 + r() * 0.35).toFixed(2) }));
    }
    return out;
  },
  function tiles(r, tone) { // truchet quarter-circle tiles
    const out = []; const n = 3 + Math.floor(r() * 2); const cell = 96 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const rot = Math.floor(r() * 4) * 90; const x = i * cell, y = j * cell;
      out.push(s('path', { d: `M${x} ${y} A${cell} ${cell} 0 0 1 ${x + cell} ${y + cell} L${x + cell} ${y} Z`, fill: tone((i + j) % 3), 'fill-opacity': (0.25 + r() * 0.3).toFixed(2), transform: `rotate(${rot} ${x + cell / 2} ${y + cell / 2})` }));
    }
    return out;
  },
  function rays(r, tone) { // wedges fanning from a corner
    const out = []; const corner = Math.floor(r() * 4); const [cx, cy] = [[0, 0], [96, 0], [96, 96], [0, 96]][corner];
    const n = 4 + Math.floor(r() * 5); let a = 0;
    for (let i = 0; i < n; i++) {
      const w = 8 + r() * 24; const a0 = (a * Math.PI) / 180, a1 = ((a + w) * Math.PI) / 180;
      const R = 150;
      out.push(s('path', { d: `M${cx} ${cy} L${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R} L${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R} Z`, fill: tone(i % 3), 'fill-opacity': (0.22 + r() * 0.3).toFixed(2) }));
      a += w + 4 + r() * 20;
    }
    return out;
  },
  function steps(r, tone) { // stepped horizontal bars
    const out = []; const n = 5 + Math.floor(r() * 4); const hgt = 96 / n;
    for (let i = 0; i < n; i++) {
      const w = 20 + r() * 76; const left = r() > 0.5;
      out.push(s('rect', { x: left ? 0 : 96 - w, y: i * hgt + 1, width: w, height: hgt - 2, fill: tone(i % 3), 'fill-opacity': (0.25 + r() * 0.35).toFixed(2) }));
    }
    return out;
  },
];

export function artSvg(seed) {
  const r = prng(hashSeed(seed || 'none'));
  const picks = [TONES[Math.floor(r() * TONES.length)], TONES[Math.floor(r() * TONES.length)], TONES[Math.floor(r() * TONES.length)]];
  const tone = (i) => picks[i % picks.length];
  const family = FAMILIES[Math.floor(r() * FAMILIES.length)];
  const svg = s('svg', { class: 'art__svg', viewBox: '0 0 96 96', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid slice' });
  svg.appendChild(s('rect', { x: 0, y: 0, width: 96, height: 96, class: 'art__base' }));
  for (const el of family(r, tone)) svg.appendChild(el);
  // One small brass index mark: the family signature, like a catalogue stamp. Position from the seed.
  const mx = 8 + Math.floor(r() * 6) * 12;
  svg.appendChild(s('rect', { x: mx, y: 86, width: 10, height: 3, class: 'art__index', rx: 1 }));
  svg.appendChild(s('rect', { x: 0, y: 0, width: 96, height: 1, class: 'art__edge' }));
  return svg;
}

export class MdjArt extends MdjElement {
  static tag = 'mdj-art';
  static states = ['placeholder', 'loading', 'cached'];
  static fr = ['FR-005', 'FR-043'];
  static hit = 0;
  static observed = ['seed', 'size', 'label'];
  static samples = {
    default: { seed: 'aurora', size: 56, label: 'AURORA DRIVE' },
    variants: [{ seed: 'aurora', size: 40 }, { seed: 'copper', size: 56, label: 'COPPER SKY' }, { seed: 'tide', size: 96, label: 'TIDE SIGNAL' }, { seed: 'longtitle', size: 56, label: 'EVERYTHING WE SAID…' }],
  };

  render() {
    const seed = this.attr('seed', 'none');
    const sizeN = this.num('size', 56);
    const size = SIZES.includes(sizeN) ? sizeN : 56;
    const label = this.attr('label', seed);
    const state = this.state;
    this.className = `art art--${size} art--${state}`;
    this.style.setProperty('--art-size', `${size}px`);
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', state === 'loading' ? `Artwork loading for ${label}` : `Artwork placeholder for ${label} (procedural pattern)`);
    if (state === 'loading') this.setAttribute('aria-busy', 'true'); else this.removeAttribute('aria-busy');
    const parts = [];
    if (state === 'loading') parts.push(h('span', { class: 'art__skeleton sunken', 'aria-hidden': 'true' }));
    else parts.push(artSvg(seed));
    if (state === 'cached') {
      parts.push(h('span', { class: 'art__tag', 'aria-hidden': 'true' }, size === 40 ? [icon('check', { size: 10 })] : [icon('check', { size: 9 }), h('span', { text: 'CACHED' })]));
    }
    this.replaceChildren(...parts);
  }
}
define(MdjArt);
