// <mdj-caption-line text="…" active offset="120" lang="en" visibility="both|program|preview|hidden" late="420"
//                   words='[["Copper",68400],["sky,",68900],…]' word="2" compact
//                   state="line-timed|word-timed|missing|late">
//
// One karaoke caption line (Document 15 §4, FR-046). Timing is stored in source-media time; the mapper follows
// tempo, seeks and loops, so this component only prints the line and its declared timing kind:
//   line-timed — the WHOLE line is highlighted when `active`; no word is singled out (a line-timed file has no
//                word precision and the app never fabricates it)
//   word-timed — words up to `word` are highlighted; requires `words` with per-word start times
//   missing    — no cue for this interval: a dashed placeholder, never an invented line
//   late       — the line arrived after its start: the lateness is printed; the audio is never shifted to fit
// Engine binding: NONE. `offset` is the adjustable MEASURED display offset in ms (+ delays the picture text);
// it changes only when the caption is drawn, never the singer's audio. Units / range: offset −2000..+2000 ms,
// late ≥ 0 ms, word index 0..n. Gesture: none (hit 0; the offset stepper lives on the karaoke screen).
// Pending vs acknowledged: n/a. Cancellation: n/a.
// Flags: language (ISO code, printed), visibility (Program + preview / Program only / Preview only / Hidden),
// timing kind, offset. `compact` is the overlay variant inside <mdj-video-frame> (text on an opaque backing
// within the safe margin; flags hidden).
// Accessible: role=status with "Caption, active, line-timed: <text>, offset +120 ms"; the missing state reads
// "No caption for this interval". Highlight is weight + brass index bar + backing, never colour alone.
import { MdjElement, define, h, icon } from './base.js';

const STATES = ['line-timed', 'word-timed', 'missing', 'late'];
const VIS = { both: 'Program + preview', program: 'Program only', preview: 'Preview only', hidden: 'Hidden' };

function parseWords(raw) {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.map((w) => (Array.isArray(w) ? { text: String(w[0]), ms: Number(w[1]) } : { text: String(w), ms: null })) : []; } catch { return []; }
}
function fmtOffset(ms) { return `${ms > 0 ? '+' : ms < 0 ? '−' : ''}${Math.abs(Math.round(ms))} ms`; }

export class MdjCaptionLine extends MdjElement {
  static tag = 'mdj-caption-line';
  static states = STATES;
  static fr = ['FR-046'];
  static hit = 0;
  static fixture = false;
  static observed = ['text', 'active', 'offset', 'lang', 'visibility', 'late', 'words', 'word', 'compact'];
  static samples = {
    default: { text: 'We counted the harbour in four-four time', lang: 'en', offset: 120, visibility: 'both', style: 'width:min(100%, 380px)' },
    variants: [{ active: true }, {}],
    'word-timed': { text: 'Copper sky, hold the chorus', words: '[["Copper",68400],["sky,",68900],["hold",69600],["the",70000],["chorus",70300]]', word: 2 },
    missing: { text: '' },
    late: { text: 'Aurora drive, we’re nearly home', late: 420 },
  };

  render() {
    const state = STATES.includes(this.state) ? this.state : 'line-timed';
    const text = this.attr('text', '');
    const active = this.bool('active');
    const offset = Math.max(-2000, Math.min(2000, this.num('offset', 0)));
    const lang = this.attr('lang', 'en');
    const visKey = VIS[this.attr('visibility', 'both')] ? this.attr('visibility', 'both') : 'both';
    const late = Math.max(0, Math.round(this.num('late', 0)));
    const words = state === 'word-timed' ? parseWords(this.attr('words', '')) : [];
    const wordIdx = Math.max(-1, Math.round(this.num('word', -1)));
    const compact = this.bool('compact');
    this.className = `caption-line caption-line--${state}${active ? ' caption-line--active' : ''}${compact ? ' caption-line--compact' : ''}${visKey === 'hidden' ? ' caption-line--hidden-flag' : ''}`;
    const timingWord = { 'line-timed': 'Line-timed', 'word-timed': 'Word-timed', missing: 'Missing', late: 'Late' }[state];

    let body;
    if (state === 'missing') {
      body = h('span', { class: 'caption-line__missing body', text: 'No caption for this interval' });
    } else if (state === 'word-timed' && words.length) {
      body = h('span', { class: 'caption-line__words' }, words.map((w, i) => h('span', { class: `caption-line__word${active && i <= wordIdx ? ' caption-line__word--sung' : ''}${active && i === wordIdx ? ' caption-line__word--now' : ''}`, text: w.text })));
    } else {
      body = h('span', { class: 'caption-line__text', text: text || '—' });
    }
    const status = state === 'missing' ? 'No caption for this interval' : `Caption${active ? ', active' : ''}, ${timingWord.toLowerCase()}: ${text}${state === 'late' ? `, late by ${late} ms` : ''}, display offset ${fmtOffset(offset).replace('−', '-')}`;
    const line = h('div', { class: 'caption-line__line ink-backing', role: 'status', 'aria-label': status }, [
      h('span', { class: 'caption-line__index', 'aria-hidden': 'true' }),
      body,
      state === 'late' ? h('span', { class: 'caption-line__late tone-warning label' }, [icon('clock', { size: 10 }), h('span', { text: `late ${late} ms` })]) : null,
    ]);
    const children = [line];
    if (!compact) children.push(h('div', { class: 'caption-line__flags' }, [
      h('span', { class: `caption-line__flag label${state === 'word-timed' ? ' caption-line__flag--strong' : ''}`, text: timingWord }),
      h('span', { class: 'caption-line__flag label' }, [h('span', { text: 'Offset ' }), h('span', { class: 'numeral caption-line__offset', text: fmtOffset(offset) })]),
      h('span', { class: 'caption-line__flag label', text: lang.toUpperCase() }),
      h('span', { class: `caption-line__flag label${visKey === 'hidden' ? ' caption-line__flag--hidden' : ''}` }, [icon(visKey === 'hidden' ? 'unavailable' : 'display', { size: 10 }), h('span', { text: VIS[visKey] })]),
      state === 'line-timed' ? h('span', { class: 'caption-line__flag caption-line__flag--note label', text: 'no word precision' }) : null,
    ]));
    this.replaceChildren(...children);
  }
}
define(MdjCaptionLine);
