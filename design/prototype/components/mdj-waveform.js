// <mdj-waveform track="aurora" deck="A" mode="overview|detailed" position="92" zoom="8" height="64"
//               seek-lock seek-target="161" markers="cues loops phrases grid" no-head
//               state="empty|loading|idle|playing|seek-preview|held-scratch|uncertain|missing">
//
// Engine binding: the waveform READS the engine snapshot (deck generation, position in seconds, playing
// flag) and the preparation store (cues, loops, phrases, grid, analysis confidence). Its own commands:
//   overview drag → preview only; release emits mdj:seek-preview { sec } and, with Seek Lock on an
//     audible deck (Document 03 §4), waits for the screen's explicit Seek button, which sends
//     EngineCommand(seek, { deck, generation, sec, quantize }). Without seek-lock the release itself
//     emits mdj:seek { sec } (stopped / cued decks may seek directly, subject to quantize);
//   detailed drag → EngineCommand(jog_touch / jog_move / jog_release) as waveform scrub / scratch
//     (FR-014: a first-class action distinct from jog scratching; Nudge while playing and Scrub while
//     paused are the proposed mappings, pending DJ testing);
//   pinch → mdj:zoom { bars }: ZOOM ONLY, never a seek (Document 03 §4). Zoom is view state.
// Every command carries the deck generation the gesture started on; focus changes never re-target it.
// Units / range: position and seek-target in seconds 0..durationSec; zoom in bars visible (1..64,
// detailed only; 8 by default = 32 beats); height in CSS px for the lane (32..). `markers` lists the
// overlay sets to draw: cues loops phrases grid (grid lines are detailed-only).
// Data: fixtures.waveform(track) gives the peak / rms / lows / highs bins, beats, downbeats,
// uncertainAfterSec and silence regions; fixtures.track(track) gives cues, loops, phrases, bpm, grid
// confidence and lock. An unknown id renders the empty state. EVERYTHING DRAWN IS A FIXTURE: the
// FIXTURE mark is mandatory and the bins are synthetic (design/tools/gen_waveforms.py), not analysis.
// Drawing: <canvas> at devicePixelRatio; overview = whole track, played portion muted titanium /
// ink, unplayed in the deck accent with lows darker (--deck) and highs lighter (--raised core); loop
// region band, silence hatch, phrase lines; detailed = a multiresolution window of `zoom` bars with the
// engine-aligned playhead fixed at the centre, beat lines with downbeat emphasis and bar numerals,
// dashed lines plus warning hatch and an "Uncertain grid" tag after uncertainAfterSec. Cue markers
// (<mdj-marker>: shape + number + colour), loop marker, phrase labels, bar numerals, the seek caption
// and the state chips are DOM overlays on opaque backing so text scales with the font scale. Overlay
// glyphs that would collide are nudged sideways (their marker lines stay at the true position) or
// hidden when the nudge would mislead. Peaks are normalised per track so the loudest bin fills the
// lane (display gain only; the fixture arrays are not changed). `no-head` hides the header row for
// slim dock lanes (the lane keeps its accessible name).
// Pending vs acknowledged: the playhead and the played / unplayed split follow `position`, i.e. the
// ACKNOWLEDGED engine position; a seek preview is a dashed deck-coloured target line with a "Seek to
// 2:41" caption and never moves the playhead; a held scratch prints HELD · SCRATCH. Nothing animates
// to imply a command succeeded (the loading skeleton's spinner means "unknown progress").
// Cancellation: pointer-cancel, pointer-capture loss, app background, route loss and rotation drop the
// preview / hold, keep the acknowledged position and emit { phase: 'cancel' }; the playback is
// unchanged (Document 03 §4). Re-render on attribute change and on resize (ResizeObserver).
// Accessible: the lane is role=img named "Deck A waveform, overview: AURORA DRIVE, 124.0 BPM, playing,
// 1:32 of 6:12, next cue 3 Break at 3:06, …". The accessible alternatives are the screen's Seek /
// beat jump / time entry actions (Document 03 §4), <mdj-zoom-controls> and <mdj-time-display>.
import { MdjElement, define, h, icon, fmt } from './base.js';
import { fixtures } from '../app/fixtures.js';
import { cueColorVar, iconId } from './mdj-marker.js';

const MODES = ['overview', 'detailed'];
const STATES = ['empty', 'loading', 'idle', 'playing', 'seek-preview', 'held-scratch', 'uncertain', 'missing'];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ZOOM_MIN = 1, ZOOM_MAX = 64;

export class MdjWaveform extends MdjElement {
  static tag = 'mdj-waveform';
  static states = STATES;
  static fr = ['FR-009', 'FR-014', 'FR-007'];
  static hit = 48;
  static fixture = true;
  static observed = ['track', 'deck', 'mode', 'position', 'zoom', 'height', 'seek-lock', 'seek-target', 'markers', 'no-head'];
  static samples = {
    default: { track: 'aurora', deck: 'A', position: 92, mode: 'overview', style: 'width:100%' },
    variants: [{ mode: 'overview' }, { mode: 'detailed', zoom: 8 }],
    empty: { track: '' },
    loading: { track: 'glasswork', deck: 'B', position: 0 },
    idle: { track: 'longtitle', deck: 'C', position: 298 },
    playing: {},
    'seek-preview': { 'seek-target': 161, 'seek-lock': true },
    'held-scratch': { track: 'copper', deck: 'B', position: 48 },
    uncertain: { track: 'tide', deck: 'D', position: 150 },
    missing: { track: 'brass', deck: 'B', position: 24.5 },
  };

  constructor() {
    super();
    this._ro = null; this._model = null; this._drag = null; this._pointers = new Map(); this._pinch = null;
    this._preview = null; this._offset = 0; this._pinchZoom = null;
  }
  disconnectedCallback() { if (this._ro) { this._ro.disconnect(); this._ro = null; } }

  // ---- model ----
  model() {
    const id = this.attr('track', '');
    const track = id ? fixtures.track(id) : null;
    const wave = id ? fixtures.waveform(id) : null;
    const deck = this.attr('deck', '').toUpperCase();
    const modeAttr = this.attr('mode', 'overview');
    const mode = MODES.includes(modeAttr) ? modeAttr : 'overview';
    const duration = wave?.durationSec ?? track?.durationSec ?? 0;
    const position = clamp(this.num('position', 0), 0, duration || 0);
    const bpm = track?.bpm || 120;
    const zoom = clamp(Math.round(this.num('zoom', 8)), ZOOM_MIN, ZOOM_MAX);
    const height = Math.max(32, this.num('height', mode === 'detailed' ? 96 : 64));
    let state = this.hasAttribute('state') ? this.getAttribute('state') : null;
    if (!state) state = !track ? 'empty' : track.availability === 'missing' ? 'missing' : track.analysis === 'pending' ? 'loading' : 'idle';
    if (!STATES.includes(state)) state = 'idle';
    if (!track && state !== 'loading') state = 'empty';
    const markers = new Set(this.attr('markers', 'cues loops phrases grid').split(/\s+/).filter(Boolean));
    const seekLock = this.bool('seek-lock');
    const seekTarget = this.hasAttribute('seek-target') && duration ? clamp(this.num('seek-target', 0), 0, duration) : null;
    const cues = (track?.cues || []).slice().sort((a, b) => a.sec - b.sec);
    const nextCue = cues.find((c) => c.sec > position + 0.01) || null;
    const loops = (track?.loops || []).map((l) => ({ ...l, outSec: l.inSec + l.bars * 4 * 60 / bpm }));
    const uncertainAfter = wave?.uncertainAfterSec ?? null;
    const uncertain = state === 'uncertain' || uncertainAfter != null;
    return { id, track, wave, deck, mode, duration, position, bpm, zoom, height, state, markers, seekLock, seekTarget, cues, nextCue, loops, phrases: track?.phrases || [], silence: wave?.silence || [], uncertainAfter, uncertain, gridLocked: !!track?.gridLocked };
  }

  window(m, zoom = m.zoom, pos = m.position) {
    if (m.mode === 'overview' || !m.duration) return { t0: 0, t1: m.duration || 1 };
    const span = zoom * 4 * 60 / m.bpm;
    return { t0: pos - span / 2, t1: pos + span / 2 };
  }

  // ---- render ----
  render() {
    const m = this.model();
    this._model = m;
    this._preview = null; this._offset = 0; this._pinchZoom = null; this._drag = null; this._pinch = null; this._pointers.clear();
    const deckClass = m.deck ? `deck-${m.deck.toLowerCase()}` : 'deck-none';
    this.className = `waveform waveform--${m.mode} waveform--${m.state} ${deckClass}${m.seekLock ? ' waveform--seek-lock' : ''}${this.bool('no-head') ? ' waveform--no-head' : ''}`;
    this.setAttribute('fixture', `wave:${m.id || 'none'}`);
    const dataOk = !['empty', 'loading'].includes(m.state) && m.wave;

    // header: deck letter · mode · position · tags (the FIXTURE mark lives here too)
    const modeText = m.mode === 'detailed' ? `Detail · ${m.zoom} bar${m.zoom === 1 ? '' : 's'}` : 'Overview';
    const head = h('div', { class: 'waveform__head', 'aria-hidden': 'true' }, [
      m.deck ? h('span', { class: 'waveform__deck numeral', text: m.deck }) : null,
      h('span', { class: 'waveform__mode label', text: modeText }),
      dataOk ? h('span', { class: 'waveform__pos numeral' }, [
        icon(m.state === 'playing' ? 'play' : m.state === 'missing' ? 'warning' : 'pause', { size: 11 }),
        h('span', { class: 'waveform__pos-text', text: `${fmt.time(m.position)} / ${fmt.time(m.duration)}` }),
      ]) : null,
      h('span', { class: 'waveform__tags' }, [
        m.seekLock && m.track ? h('span', { class: 'waveform__tag waveform__tag--lock' }, [icon(iconId('seek-lock', 'lock'), { size: 11 }), h('span', { text: 'Seek lock' })]) : null,
        m.uncertain && dataOk ? h('span', { class: 'waveform__tag tone-warning' }, [icon(iconId('grid-uncertain', 'warning'), { size: 11 }), h('span', { text: 'Uncertain grid' })]) : null,
        m.gridLocked && dataOk ? h('span', { class: 'waveform__tag waveform__tag--locked' }, [icon(iconId('grid-locked', 'lock'), { size: 11 }), h('span', { text: 'Grid locked' })]) : null,
        h('span', { class: 'waveform__badge', hidden: m.state === 'held-scratch' ? null : true, text: 'HELD · SCRATCH' }),
      ]),
    ]);

    // lane
    const name = this.describe(m);
    const lane = h('div', {
      class: 'waveform__lane sunken', role: 'img', 'aria-label': name, dataset: { hit: '48' }, style: { height: `${m.height}px` },
      on: {
        pointerdown: (e) => this.onDown(e), pointermove: (e) => this.onMove(e), pointerup: (e) => this.onUp(e),
        pointercancel: (e) => this.onCancel(e), lostpointercapture: (e) => this.onCancel(e),
      },
    });
    const canvas = h('canvas', { class: 'waveform__canvas', 'aria-hidden': 'true' });
    const overlay = h('div', { class: 'waveform__overlay', 'aria-hidden': 'true' });
    lane.append(canvas, overlay);
    if (dataOk) this.buildOverlay(m, overlay);
    const chip = this.stateChip(m);
    if (chip) overlay.appendChild(chip);
    this.replaceChildren(head, lane);

    if (this._ro) this._ro.disconnect();
    this._ro = new ResizeObserver(() => this.draw());
    this._ro.observe(lane);
    this.draw();
  }

  describe(m) {
    const parts = [`Deck ${m.deck || 'unassigned'} waveform, ${m.mode}${m.mode === 'detailed' ? ` ${m.zoom} bars` : ''}`];
    if (!m.track) { parts.push(m.state === 'loading' ? 'loading' : 'no track loaded'); return parts.join(': '); }
    const body = [`${m.track.title}, ${fmt.bpm(m.bpm)} BPM`];
    if (m.state === 'loading') body.push('analysis pending, progress unknown');
    else if (m.state === 'missing') body.push('file missing, cues kept');
    else body.push(m.state === 'playing' ? 'playing' : m.state === 'held-scratch' ? 'held, scratch' : 'paused');
    body.push(`position ${fmt.time(m.position)} of ${fmt.time(m.duration)}`);
    if (m.nextCue) body.push(`next cue ${m.nextCue.n} ${m.nextCue.name} at ${fmt.time(m.nextCue.sec)}`);
    if (m.seekTarget != null) body.push(`seek preview to ${fmt.time(m.seekTarget)}${m.seekLock ? ', seek lock on, tap Seek to commit' : ''}`);
    if (m.uncertain && m.uncertainAfter != null) body.push(`grid uncertain after ${fmt.time(m.uncertainAfter)}`);
    if (m.gridLocked) body.push('grid locked');
    for (const [a, b] of m.silence) body.push(`silence ${fmt.time(a)} to ${fmt.time(b)}`);
    return `${parts[0]}: ${body.join(', ')}`;
  }

  stateChip(m) {
    const deckWord = m.deck ? `Deck ${m.deck}` : 'Deck';
    if (m.state === 'empty') return h('span', { class: 'waveform__state raised' }, [icon('plus', { size: 14 }), h('span', { text: `${deckWord} empty · load a track` })]);
    if (m.state === 'loading') return h('span', { class: 'waveform__state raised waveform__state--loading' }, [icon(iconId('analysis-pending', 'loader'), { size: 14, cls: 'waveform__spin' }), h('span', { class: 'truncate', text: `Analysing ${m.track ? m.track.title : ''} · progress unknown` })]);
    if (m.state === 'missing') return h('span', { class: 'waveform__state raised waveform__state--missing' }, [icon('warning', { size: 14 }), h('span', { text: 'File missing · cues and grid kept' })]);
    return null;
  }

  // DOM overlays carry data-sec; layoutOverlay() positions them for the current window.
  buildOverlay(m, overlay) {
    if (m.markers.has('cues')) for (const c of m.cues) {
      overlay.appendChild(h('span', { class: 'waveform__cue', dataset: { sec: String(c.sec) }, style: { '--mk': cueColorVar(c.color) } }, [
        h('mdj-marker', { kind: 'cue', n: c.n, color: c.color || 'none', label: c.name, size: 16 }),
      ]));
    }
    if (m.markers.has('loops')) for (const l of m.loops) {
      overlay.appendChild(h('span', { class: 'waveform__loopmark', dataset: { sec: String(l.inSec) } }, [h('mdj-marker', { kind: 'loop', n: l.bars, color: 'none', label: l.name, size: 16 })]));
    }
    if (m.markers.has('phrases')) for (const p of m.phrases) {
      overlay.appendChild(h('span', { class: 'waveform__phrase label', dataset: { sec: String(p.sec) }, text: p.label }));
    }
    if (m.mode === 'detailed' && m.markers.has('grid') && m.wave) {
      const phraseAt = new Set(m.phrases.map((p) => Math.round(p.sec * 10)));
      m.wave.downbeats.forEach((sec, i) => {
        if (phraseAt.has(Math.round(sec * 10))) return;
        overlay.appendChild(h('span', { class: `waveform__bar numeral${m.uncertainAfter != null && sec >= m.uncertainAfter ? ' waveform__bar--uncertain' : ''}`, dataset: { sec: String(sec) }, text: String(i + 1) }));
      });
    }
    for (const [a, b] of m.silence) overlay.appendChild(h('span', { class: 'waveform__silence', dataset: { sec: String(a), until: String(b) } }, [h('span', { class: 'waveform__silence-text label', text: 'Silence' })]));
    overlay.appendChild(h('span', { class: 'waveform__seek ink-backing', dataset: { sec: m.seekTarget == null ? '' : String(m.seekTarget) }, hidden: m.seekTarget == null ? true : null }, [
      icon(iconId('seek', 'marker'), { size: 12 }), h('span', { class: 'waveform__seek-text numeral', text: m.seekTarget == null ? '' : `Seek to ${fmt.time(m.seekTarget)}` }),
    ]));
  }

  layoutOverlay(t0, t1, W) {
    const overlay = this.querySelector('.waveform__overlay');
    if (!overlay) return;
    const span = t1 - t0 || 1;
    for (const el of overlay.children) {
      if (!('sec' in el.dataset) || el.dataset.sec === '') continue; // state chips and an unset seek chip
      const sec = parseFloat(el.dataset.sec);
      const x = (sec - t0) / span;
      const visible = x >= -0.001 && x <= 1.001;
      el.hidden = !visible;
      if (!visible) continue;
      el.style.left = `${(x * 100).toFixed(3)}%`;
      if (el.classList.contains('waveform__seek')) {
        // Caption placement is measured: right of the target line, else left of it, else centred in the lane.
        const w = el.offsetWidth, px = x * W;
        const fitsRight = px + 7 + w <= W - 2, fitsLeft = px - 7 - w >= 2;
        el.classList.toggle('waveform__seek--flip', !fitsRight && fitsLeft);
        if (!fitsRight && !fitsLeft) el.style.left = '50%';
        el.classList.toggle('waveform__seek--centre', !fitsRight && !fitsLeft);
      }
      if (el.classList.contains('waveform__silence')) {
        const until = parseFloat(el.dataset.until);
        const w = ((until - sec) / span) * W;
        el.style.width = `${Math.max(0, w).toFixed(2)}px`;
        el.hidden = w < 34;
      }
    }
    // Collision pass per band: top = cue glyphs, bottom = loop glyph, phrase labels, bar numerals.
    this.nudgeBand(overlay, '.waveform__cue', W, (el) => el.querySelector('.marker'));
    this.nudgeBand(overlay, '.waveform__loopmark, .waveform__phrase, .waveform__bar', W, (el) => el);
  }

  // Sort a band's visible items by position; push a glyph right when it would overlap the previous
  // one, and hide it when the push exceeds 40 px (a glyph far from its position would mislead).
  nudgeBand(overlay, selector, W, glyphOf) {
    const items = [...overlay.querySelectorAll(selector)].filter((el) => !el.hidden);
    items.sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
    let edge = 1; // glyphs never clip at the lane edges: the first may be pushed right, the last pulled left
    for (const el of items) {
      const glyph = glyphOf(el); if (!glyph) continue;
      glyph.style.setProperty('--nudge', '0px');
      const x = (parseFloat(el.style.left) / 100) * W;
      const w = glyph.offsetWidth || 16;
      const start = el.classList.contains('waveform__cue') ? x - w / 2 : x + 3;
      let nudge = start < edge ? edge - start : 0;
      if (start + nudge + w > W - 1) nudge = W - 1 - w - start;
      if (nudge > 40 || start + nudge < edge - 0.5) { el.hidden = true; continue; }
      glyph.style.setProperty('--nudge', `${nudge.toFixed(1)}px`);
      edge = start + nudge + w + 2;
    }
  }

  // ---- canvas ----
  draw() {
    const m = this._model;
    const lane = this.querySelector('.waveform__lane');
    const canvas = this.querySelector('.waveform__canvas');
    if (!m || !lane || !canvas) return;
    const rect = lane.getBoundingClientRect();
    const W = Math.round(rect.width), H = Math.round(rect.height);
    if (!W || !H) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);
    const cs = getComputedStyle(this);
    const tok = (n) => cs.getPropertyValue(n).trim();
    const root = document.documentElement;
    const contrast = root.dataset.theme === 'contrast', essential = root.dataset.tier === 'essential';
    const C = { accent: tok('--deck-accent'), deck: tok('--deck'), ink: tok('--ink'), ink2: tok('--ink-2'), ink3: tok('--ink-3'), line: tok('--line-strong'), raised: tok('--raised'), titanium: tok('--titanium'), titaniumHi: tok('--titanium-hi'), warning: tok('--warning'), stageDeep: tok('--stage-deep'), control: tok('--control') };
    const S = dpr, px = (v) => Math.max(1, Math.round(v * S));
    const zoom = this._pinchZoom ?? m.zoom;
    const pos = clamp(m.position + this._offset, 0, m.duration || 0);
    const { t0, t1 } = this.window(m, zoom, pos);
    const span = t1 - t0 || 1;
    const xOf = (t) => ((t - t0) / span) * pw;
    const mid = ph / 2;
    const dataOk = !['empty', 'loading'].includes(m.state) && m.wave;
    this.layoutOverlay(t0, t1, W);
    const modeEl = this.querySelector('.waveform__mode');
    if (modeEl && m.mode === 'detailed') modeEl.textContent = `Detail · ${zoom} bar${zoom === 1 ? '' : 's'}`;

    // out-of-track regions (detailed) and the centre line
    if (m.mode === 'detailed' && m.duration) {
      ctx.fillStyle = C.stageDeep; ctx.globalAlpha = 0.6;
      if (t0 < 0) ctx.fillRect(0, 0, Math.max(0, xOf(0)), ph);
      if (t1 > m.duration) ctx.fillRect(Math.min(pw, xOf(m.duration)), 0, pw, ph);
      ctx.globalAlpha = 1;
    }
    if (m.state === 'loading') { this.drawSkeleton(ctx, pw, ph, C, S); return; }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.line;
    const xs = m.duration ? Math.max(0, xOf(0)) : 0, xe = m.duration ? Math.min(pw, xOf(m.duration)) : pw;
    ctx.fillRect(xs, Math.round(mid) - px(0.5), Math.max(0, xe - xs), px(1));
    if (!dataOk) return;

    // envelope columns
    const w = m.wave, bins = w.bins || w.peaks.length;
    // Display gain: the loudest fixture bin reaches ~92 % of the lane; a quiet track is not drawn as a
    // hairline. This is a view transform, not a measurement of anything.
    let maxPeak = 0; for (let i = 0; i < bins; i++) if (w.peaks[i] > maxPeak) maxPeak = w.peaks[i];
    const gain = clamp(0.92 / (maxPeak || 1), 1, 3.5);
    const secPerCol = span / pw, amp = (mid - px(2)) * gain, muted = m.state === 'missing';
    const sample = (arr, ba, bb) => {
      if (bb - ba >= 1) { let v = 0; for (let i = Math.max(0, Math.floor(ba)); i < Math.min(bins, Math.ceil(bb)); i++) if (arr[i] > v) v = arr[i]; return v; }
      const f = clamp((ba + bb) / 2, 0, bins - 1), i = Math.floor(f), t = f - i;
      return arr[i] * (1 - t) + (arr[Math.min(bins - 1, i + 1)] || 0) * t;
    };
    const inSilence = (t) => m.silence.some(([a, b]) => t >= a && t <= b);
    const cols = new Array(pw);
    for (let c = 0; c < pw; c++) {
      const ta = t0 + c * secPerCol, tb = ta + secPerCol;
      if (tb <= 0 || ta >= m.duration) { cols[c] = null; continue; }
      const ba = (ta / m.duration) * bins, bb = (tb / m.duration) * bins;
      const silent = inSilence((ta + tb) / 2);
      cols[c] = silent ? [0, 0, 0, tb <= pos] : [sample(w.peaks, ba, bb), sample(w.lows, ba, bb), sample(w.highs, ba, bb), tb <= pos];
    }
    const pass = (idx, fillPlayed, fillLive, aPlayed, aLive) => {
      for (const played of [true, false]) {
        ctx.fillStyle = played ? fillPlayed : fillLive;
        ctx.globalAlpha = muted ? 0.45 : played ? aPlayed : aLive;
        for (let c = 0; c < pw; c++) {
          const col = cols[c];
          if (!col || col[3] !== played) continue;
          const hgt = col[idx] * amp;
          if (hgt < 0.5) continue;
          ctx.fillRect(c, mid - hgt, 1, hgt * 2);
        }
      }
    };
    const live = muted ? C.ink3 : C.accent, liveLows = muted ? C.ink2 : C.deck, liveHighs = muted ? C.titaniumHi : C.raised;
    pass(0, C.titanium, live, 0.55, contrast ? 0.8 : 0.6);
    pass(1, C.ink3, liveLows, 0.6, 0.9);
    pass(2, C.titaniumHi, liveHighs, 0.65, contrast ? 0.55 : 0.78);
    ctx.globalAlpha = 1;

    // silence regions
    const hatch = (color, alpha, gap) => { const p = document.createElement('canvas'); p.width = p.height = Math.round(gap * S); const pc = p.getContext('2d'); pc.strokeStyle = color; pc.globalAlpha = alpha; pc.lineWidth = px(1); pc.beginPath(); pc.moveTo(0, p.height); pc.lineTo(p.width, 0); pc.moveTo(-p.width / 2, p.height / 2); pc.lineTo(p.width / 2, -p.height / 2); pc.moveTo(p.width / 2, p.height * 1.5); pc.lineTo(p.width * 1.5, p.height / 2); pc.stroke(); return ctx.createPattern(p, 'repeat'); };
    for (const [a, b] of m.silence) {
      const xa = clamp(xOf(a), 0, pw), xb = clamp(xOf(b), 0, pw);
      if (xb - xa < 1) continue;
      ctx.fillStyle = hatch(C.ink3, 0.5, 6); ctx.fillRect(xa, px(2), xb - xa, ph - px(4));
      ctx.fillStyle = C.ink3; ctx.globalAlpha = 0.7; ctx.fillRect(xa, 0, px(1), ph); ctx.fillRect(xb - px(1), 0, px(1), ph); ctx.globalAlpha = 1;
    }

    // loop region (acknowledged saved loop): accent band with deck-coloured ends and ink brackets
    if (m.markers.has('loops')) for (const l of m.loops) {
      const xa = xOf(l.inSec), xb = xOf(l.outSec);
      if (xb < 0 || xa > pw) continue;
      const a = clamp(xa, 0, pw), b = clamp(xb, 0, pw);
      ctx.fillStyle = C.accent; ctx.globalAlpha = contrast ? 0.12 : 0.18; ctx.fillRect(a, 0, b - a, ph); ctx.globalAlpha = 1;
      ctx.fillStyle = C.deck;
      if (xa >= 0) { ctx.fillRect(a, 0, px(1.5), ph); ctx.fillRect(a, 0, px(5), px(1.5)); ctx.fillRect(a, ph - px(1.5), px(5), px(1.5)); }
      if (xb <= pw) { ctx.fillRect(b - px(1.5), 0, px(1.5), ph); ctx.fillRect(b - px(5), 0, px(5), px(1.5)); ctx.fillRect(b - px(5), ph - px(1.5), px(5), px(1.5)); }
    }

    // phrase boundaries (overview) · beat grid (detailed)
    if (m.mode === 'overview' && m.markers.has('phrases')) {
      ctx.fillStyle = C.ink; ctx.globalAlpha = 0.35;
      for (const p of m.phrases) { if (p.sec <= 0) continue; const x = Math.round(xOf(p.sec)); for (let y = 0; y < ph; y += px(4)) ctx.fillRect(x, y, px(1), px(2)); }
      ctx.globalAlpha = 1;
    }
    if (m.mode === 'detailed' && m.markers.has('grid')) {
      const down = new Set(w.downbeats.map((b) => Math.round(b * 1000)));
      const beats = w.beats;
      let i = lowerBound(beats, t0);
      for (; i < beats.length && beats[i] <= t1; i++) {
        const b = beats[i], x = Math.round(xOf(b)), isDown = down.has(Math.round(b * 1000));
        const unc = m.uncertainAfter != null && b >= m.uncertainAfter;
        ctx.fillStyle = isDown ? C.ink2 : C.ink3; ctx.globalAlpha = isDown ? (unc ? 0.45 : 0.75) : (unc ? 0.3 : 0.45);
        const wdt = px(isDown ? 1.5 : 1);
        if (unc) for (let y = 0; y < ph; y += px(5)) ctx.fillRect(x, y, wdt, px(2.5));
        else ctx.fillRect(x, 0, wdt, ph);
      }
      ctx.globalAlpha = 1;
    }

    // uncertain-grid hatch after uncertainAfterSec
    if (m.uncertain && m.uncertainAfter != null) {
      const xa = clamp(xOf(m.uncertainAfter), 0, pw), xb = clamp(xOf(m.duration), 0, pw);
      if (xb - xa > 1) {
        ctx.fillStyle = C.warning; ctx.globalAlpha = 0.08; ctx.fillRect(xa, 0, xb - xa, ph);
        ctx.globalAlpha = 1; ctx.fillStyle = hatch(C.warning, 0.45, 9); ctx.fillRect(xa, 0, xb - xa, ph);
        ctx.fillStyle = C.warning; ctx.fillRect(xa, 0, px(1.5), ph);
      }
    }

    // track start / end brackets (detailed)
    if (m.mode === 'detailed') {
      ctx.fillStyle = C.ink; ctx.globalAlpha = 0.8;
      if (t0 < 0) { const x = Math.round(xOf(0)); ctx.fillRect(x, 0, px(2), ph); }
      if (t1 > m.duration) { const x = Math.round(xOf(m.duration)) - px(2); ctx.fillRect(x, 0, px(2), ph); }
      ctx.globalAlpha = 1;
    }

    // seek preview target (dashed, deck colour) — never the playhead
    const seek = this._preview ?? m.seekTarget;
    if (seek != null && m.state !== 'missing') {
      const x = Math.round(xOf(seek));
      if (x >= 0 && x <= pw) {
        ctx.fillStyle = C.raised; ctx.fillRect(x - px(2), 0, px(4), ph);
        ctx.fillStyle = C.deck;
        for (let y = 0; y < ph; y += px(6)) ctx.fillRect(x - px(1), y, px(2), px(3.5));
      }
    }

    // playhead: acknowledged position (overview at xOf, detailed fixed at centre); a missing file still
    // shows the saved session position so the DJ knows where it stopped
    {
      const x = Math.round(m.mode === 'detailed' ? pw / 2 : xOf(pos));
      if (m.state === 'playing' && !essential && !contrast) { ctx.fillStyle = C.accent; ctx.globalAlpha = 0.5; ctx.fillRect(x - px(3), 0, px(6), ph); ctx.globalAlpha = 1; }
      ctx.fillStyle = C.raised; ctx.fillRect(x - px(2), 0, px(4), ph);
      ctx.fillStyle = C.ink; ctx.fillRect(x - px(1), 0, px(2), ph);
      const tri = px(5);
      ctx.beginPath(); ctx.moveTo(x - tri, 0); ctx.lineTo(x + tri, 0); ctx.lineTo(x, tri); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - tri, ph); ctx.lineTo(x + tri, ph); ctx.lineTo(x, ph - tri); ctx.closePath(); ctx.fill();
    }
  }

  // Loading: a region-sized skeleton. No invented peaks — a flat rail with a dashed centre line.
  drawSkeleton(ctx, pw, ph, C, S) {
    const px = (v) => Math.max(1, Math.round(v * S));
    ctx.fillStyle = C.control; ctx.globalAlpha = 0.6; ctx.fillRect(0, ph * 0.3, pw, ph * 0.4); ctx.globalAlpha = 1;
    ctx.fillStyle = C.ink3;
    for (let x = 0; x < pw; x += px(8)) ctx.fillRect(x, Math.round(ph / 2) - px(0.5), px(4), px(1));
  }

  // ---- gestures ----
  secAt(e) {
    const m = this._model, lane = this.querySelector('.waveform__lane');
    const r = lane.getBoundingClientRect();
    const { t0, t1 } = this.window(m, this._pinchZoom ?? m.zoom, m.position);
    return clamp(t0 + ((e.clientX - r.left) / Math.max(1, r.width)) * (t1 - t0), 0, m.duration);
  }
  detail(extra) { const m = this._model; return { kind: 'waveform', deck: m.deck, track: m.id, mode: m.mode, ...extra }; }
  onDown(e) {
    const m = this._model;
    if (!m || ['empty', 'loading', 'missing'].includes(m.state)) return;
    e.preventDefault();
    const lane = e.currentTarget;
    lane.setPointerCapture(e.pointerId);
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this._pointers.size === 2 && m.mode === 'detailed') { this.startPinch(); return; }
    if (this._pointers.size > 1) return;
    if (m.mode === 'overview') {
      this._drag = { id: e.pointerId, kind: 'seek', prev: this.dataset.state };
      this._preview = this.secAt(e);
      this.dataset.state = 'seek-preview';
      this.showSeek(this._preview);
      this.draw();
      this.emit('mdj:seek-preview', this.detail({ sec: this._preview, phase: 'start', seekLock: m.seekLock }));
    } else {
      this._drag = { id: e.pointerId, kind: 'scratch', x: e.clientX, prev: this.dataset.state, width: lane.getBoundingClientRect().width };
      this.dataset.state = 'held-scratch';
      const badge = this.querySelector('.waveform__badge'); if (badge) badge.hidden = false;
      this.emit('mdj:scratch', this.detail({ phase: 'start', playing: m.state === 'playing', sec: m.position }));
    }
  }
  onMove(e) {
    const m = this._model;
    const p = this._pointers.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (this._pinch) { this.movePinch(); return; }
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    if (d.kind === 'seek') {
      this._preview = this.secAt(e);
      this.showSeek(this._preview); this.draw();
      this.emit('mdj:seek-preview', this.detail({ sec: this._preview, phase: 'move', seekLock: m.seekLock }));
    } else {
      const { t0, t1 } = this.window(m, this._pinchZoom ?? m.zoom, m.position);
      this._offset = -((e.clientX - d.x) / Math.max(1, d.width)) * (t1 - t0);
      this.draw();
      this.emit('mdj:scratch', this.detail({ phase: 'move', deltaSec: this._offset, sec: clamp(m.position + this._offset, 0, m.duration) }));
    }
  }
  onUp(e) {
    const m = this._model;
    this._pointers.delete(e.pointerId);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (this._pinch) { if (this._pointers.size < 2) this.endPinch(); return; }
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    this._drag = null;
    if (d.kind === 'seek') {
      const sec = this._preview; this._preview = null;
      if (m.seekLock) { this.setAttribute('seek-target', String(Math.round(sec * 100) / 100)); this.setAttribute('state', 'seek-preview'); this.emit('mdj:seek-preview', this.detail({ sec, phase: 'end', seekLock: true })); }
      else { this.restore(d.prev); this.emit('mdj:seek', this.detail({ sec, phase: 'end', seekLock: false })); }
    } else {
      const sec = clamp(m.position + this._offset, 0, m.duration); this._offset = 0;
      this.restore(d.prev);
      this.emit('mdj:scratch', this.detail({ phase: 'end', sec }));
    }
  }
  onCancel(e) {
    const m = this._model;
    this._pointers.delete(e.pointerId);
    if (this._pinch) { this._pinch = null; this._pinchZoom = null; this.draw(); this.emit('mdj:zoom', this.detail({ phase: 'cancel', bars: m.zoom })); return; }
    const d = this._drag; if (!d) return;
    this._drag = null; this._preview = null; this._offset = 0;
    this.restore(d.prev);
    this.emit(d.kind === 'seek' ? 'mdj:seek-preview' : 'mdj:scratch', this.detail({ phase: 'cancel', sec: m.position }));
  }
  restore(prev) { if (prev) this.dataset.state = prev; else delete this.dataset.state; this.render(); this.ensureFixtureMark(); }
  showSeek(sec) {
    const chip = this.querySelector('.waveform__seek'); if (!chip) return;
    chip.hidden = false; chip.dataset.sec = String(sec);
    const t = chip.querySelector('.waveform__seek-text'); if (t) t.textContent = `Seek to ${fmt.time(sec)}`;
  }
  startPinch() {
    const m = this._model;
    if (this._drag) { const d = this._drag; this._drag = null; this._offset = 0; this.restore(d.prev); }
    const [a, b] = [...this._pointers.values()];
    this._pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: m.zoom };
  }
  movePinch() {
    const [a, b] = [...this._pointers.values()]; if (!a || !b) return;
    const ratio = (Math.hypot(a.x - b.x, a.y - b.y) || 1) / this._pinch.dist;
    this._pinchZoom = clamp(Math.round(this._pinch.zoom / ratio), ZOOM_MIN, ZOOM_MAX);
    this.draw();
    this.emit('mdj:zoom', this.detail({ phase: 'move', bars: this._pinchZoom }));
  }
  endPinch() {
    const bars = this._pinchZoom ?? this._model.zoom;
    this._pinch = null; this._pinchZoom = null;
    this.setAttribute('zoom', String(bars));
    this.emit('mdj:zoom', this.detail({ phase: 'end', bars }));
  }
}

function lowerBound(arr, v) { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < v) lo = mid + 1; else hi = mid; } return lo; }

define(MdjWaveform);
