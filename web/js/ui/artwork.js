/** Artwork rendering: real artwork when the track has it, otherwise a deterministic original cover. */
import {esc, raw} from './dom.js';

const PALETTES = [['#ff3b3b', '#a855ff'], ['#00e5ff', '#a855ff'], ['#2ee6c8', '#00e5ff'], ['#ffb020', '#ff3b3b'], ['#a855ff', '#00e5ff'], ['#ff577f', '#ffb020'], ['#39e58c', '#00e5ff']];
function hash(text) { let h = 2166136261; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }

/** Inline SVG fallback: gradient field with a tuned ring; unique per track id/title. */
export function fallbackCover(track = {}, size = 120) {
  const seed = hash(track.id || track.title || 'mixline');
  const [a, b] = PALETTES[seed % PALETTES.length];
  const angle = seed % 360, rings = 2 + (seed % 3), cx = 35 + (seed % 30), cy = 35 + ((seed >> 3) % 30);
  const id = `g${seed % 99991}`;
  let circles = '';
  for (let i = 0; i < rings; i++) circles += `<circle cx="${cx}" cy="${cy}" r="${14 + i * 11}" fill="none" stroke="rgba(255,255,255,${0.35 - i * 0.09})" stroke-width="1.5"/>`;
  return `<svg class="art" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(track.title || 'Cover')}"><defs><linearGradient id="${id}" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="100" height="100" fill="url(#${id})"/><rect width="100" height="100" fill="rgba(8,9,12,0.45)"/>${circles}<circle cx="${cx}" cy="${cy}" r="5" fill="#fff" opacity=".9"/></svg>`;
}

/** Artwork image with the original cover underneath: a failed or blocked image reveals the cover instead of a blank. */
export function artwork(track, {size = 120, className = ''} = {}) {
  if (track?.artwork) return raw(`<span class="art-stack ${className}">${fallbackCover(track, size)}<img class="art" src="${esc(track.artwork)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('is-missing')"></span>`);
  return raw(fallbackCover(track, size));
}
