// <mdj-video-frame kind="preview|program" aspect="16:9|9:16" deck="A" track="aurora" mode="follow|independent|audio-only"
//                  caption="…" dropped="12" behind="3" policy="freeze|replace|black"
//                  state="playing|frozen|dropped-frames|audio-only|unsupported|no-output|late-decoding|stale-guard">
//
// The labelled video frame of Document 03 §7 and Document 15 §3: "Preview on this device" is what the DJ sees
// on the phone; "Program output" is the composited surface for an external display. The picture is a
// PROCEDURAL, motion-free placeholder drawn from the track id (no real video, no bitmap, nothing moves);
// every frame prints a FIXTURE mark because frame counts, decoder lag and the picture itself are fixtures.
// Engine binding: NONE. A real frame is a Surface fed by a bounded MediaCodec decoder following the engine's
// source position (follow mode) or an independent visual; this component only prints the declared state.
//   playing        — picture + mode line
//   frozen         — last good frame kept under the selected scratch / reverse policy; audio unaffected
//   dropped-frames — declared visual fallback: "Video frames dropped — audio unaffected"; dropped count (fixture)
//   audio-only     — chosen still / app visual / black; no invented cover, no unrelated video
//   unsupported    — stream rejected (e.g. HDR-to-SDR not handled) with the reason, not a washed-out picture
//   no-output      — program surface has no verified display; nothing is presented as live
//   late-decoding  — decoder behind: last good frame shown, audio is NOT slowed to let the preview catch up
//   stale-guard    — after a seek / load the old frames are invalidated; black until the new epoch's first frame
// Units / range: dropped and behind are frame counts (integers); aspect is 16:9 or 9:16. Gesture: none (hit 0;
// the deck's transport stays in the dock). Pending vs acknowledged: the state is the compositor's reported
// state; nothing animates to imply recovery. Cancellation: n/a.
// Caption overlay: `caption` renders an <mdj-caption-line compact> inside the safe margin of the picture.
// Accessible: role=img named "Preview on this device, deck A, AURORA DRIVE, video follows audio, playing";
// the fallback text is a visible role=status line, not an icon alone.
import { MdjElement, define, h, s, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';
import './mdj-caption-line.js';

const STATES = ['playing', 'frozen', 'dropped-frames', 'audio-only', 'unsupported', 'no-output', 'late-decoding', 'stale-guard'];
const MODE = { follow: 'Video follows audio', independent: 'Independent visual', 'audio-only': 'Audio only' };
const POLICY = { freeze: 'freeze the last frame', replace: 'replace with the deck still', black: 'show black' };

function hash(str) { let x = 2166136261; for (const c of String(str)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; }

export class MdjVideoFrame extends MdjElement {
  static tag = 'mdj-video-frame';
  static states = STATES;
  static fr = ['FR-045'];
  static hit = 0;
  static fixture = true; // the picture, frame counts and decoder lag are fixtures
  static observed = ['kind', 'aspect', 'deck', 'track', 'mode', 'caption', 'dropped', 'behind', 'policy'];
  static samples = {
    default: { kind: 'preview', aspect: '16:9', deck: 'A', track: 'aurora', mode: 'follow', style: 'width:min(100%, 300px)' },
    variants: [{ kind: 'preview' }, { kind: 'program', deck: 'B', track: 'copper' }, { kind: 'preview', aspect: '9:16', deck: 'C', track: 'tide', style: 'width:150px' }],
    playing: { caption: 'We counted the harbour in four-four time' },
    'dropped-frames': { dropped: 12 },
    'audio-only': { mode: 'audio-only', track: 'tide' },
    unsupported: { track: 'zinc' },
    'late-decoding': { behind: 3 },
    frozen: { policy: 'freeze' },
    'stale-guard': { track: 'longtitle' },
  };

  render() {
    const kind = this.attr('kind', 'preview') === 'program' ? 'program' : 'preview';
    const aspect = this.attr('aspect', '16:9') === '9:16' ? '9:16' : '16:9';
    const deck = (this.attr('deck', 'A') || 'A').toUpperCase();
    const trackId = this.attr('track', '');
    const track = fixtures.track(trackId);
    const title = track?.title || (trackId ? trackId.toUpperCase() : '—');
    const state = STATES.includes(this.state) ? this.state : 'playing';
    const modeAttr = this.attr('mode', state === 'audio-only' ? 'audio-only' : 'follow');
    const mode = MODE[modeAttr] ? modeAttr : 'follow';
    const dropped = Math.max(0, Math.round(this.num('dropped', 0)));
    const behind = Math.max(0, Math.round(this.num('behind', 0)));
    const policy = POLICY[this.attr('policy', 'freeze')] ? this.attr('policy', 'freeze') : 'freeze';
    const caption = this.attr('caption', '');
    const picture = !['audio-only', 'unsupported', 'no-output', 'stale-guard'].includes(state);
    this.className = `video-frame video-frame--${kind} video-frame--${aspect.replace(':', 'x')} video-frame--${state} deck-${deck.toLowerCase()}`;
    this.style.setProperty('--vf-aspect', aspect === '9:16' ? '9 / 16' : '16 / 9');

    const fallback = {
      playing: null,
      frozen: { tone: 'warning', ic: 'pause', text: `Picture frozen — ${POLICY[policy]} while scratch / reverse video is uncertified. Audio unaffected.` },
      'dropped-frames': { tone: 'warning', ic: 'warning', text: `Video frames dropped — audio unaffected.`, numeral: `${dropped} dropped` },
      'audio-only': { tone: 'neutral', ic: 'music', text: 'Audio only — app visual. No invented cover, no substituted video.' },
      unsupported: { tone: 'critical', ic: 'unavailable', text: 'Unsupported stream — HDR-to-SDR conversion is not handled on this profile; rejected rather than shown washed out.' },
      'no-output': { tone: 'neutral', ic: 'display', text: 'No program output — no display is verified. Nothing is presented as live.' },
      'late-decoding': { tone: 'warning', ic: 'clock', text: 'Decoder behind — showing the last good frame. Audio is not slowed to let the preview catch up.', numeral: `${behind} frames behind` },
      'stale-guard': { tone: 'neutral', ic: 'refresh', text: 'Seek — old frames invalidated. Black until the new epoch’s first frame; no stale imagery.' },
    }[state];

    const label = kind === 'program' ? 'Program output' : 'Preview on this device';
    const name = `${label}, deck ${deck}, ${title}, ${MODE[mode]}, ${state.replace(/-/g, ' ')}${fallback ? `. ${fallback.text}` : ''}`;
    const head = h('div', { class: 'video-frame__head' }, [
      h('span', { class: 'video-frame__kind label label-strong' }, [icon(kind === 'program' ? 'display' : 'video', { size: 12 }), h('span', { text: label })]),
      h('span', { class: 'video-frame__deck numeral', 'aria-hidden': 'true', text: deck }),
    ]);
    const pic = h('div', { class: 'video-frame__pic', role: 'img', 'aria-label': name });
    if (picture) pic.appendChild(this.placeholder(trackId || title, aspect, deck));
    else pic.appendChild(h('div', { class: `video-frame__void video-frame__void--${state}` }, [
      icon(fallback.ic, { size: 24, cls: 'video-frame__void-icon' }),
      h('span', { class: 'video-frame__void-word label', text: state === 'audio-only' ? 'App visual' : state === 'unsupported' ? 'Rejected' : state === 'no-output' ? 'No output' : 'New epoch' }),
    ]));
    if (state === 'frozen' || state === 'late-decoding') pic.appendChild(h('span', { class: 'video-frame__hold label', 'aria-hidden': 'true', text: state === 'frozen' ? 'FROZEN' : 'LAST GOOD FRAME' }));
    if (state === 'dropped-frames') pic.appendChild(h('span', { class: 'video-frame__tear', 'aria-hidden': 'true' }));
    pic.appendChild(h('span', { class: 'video-frame__placeholder-tag label', 'aria-hidden': 'true', text: picture ? 'placeholder picture' : '' }));
    if (caption && picture) {
      const c = document.createElement('mdj-caption-line');
      c.setAttribute('compact', ''); c.setAttribute('text', caption); c.setAttribute('active', ''); c.setAttribute('state', 'line-timed'); c.setAttribute('offset', '120');
      pic.appendChild(h('div', { class: 'video-frame__caption' }, [c]));
    }
    const foot = h('div', { class: 'video-frame__foot' }, [
      h('span', { class: 'video-frame__title truncate', text: title }),
      h('span', { class: 'video-frame__mode label', text: MODE[mode] }),
    ]);
    const children = [head, pic, foot];
    if (fallback) children.push(h('div', { class: `video-frame__fallback tone-${fallback.tone}`, role: 'status' }, [
      icon(fallback.ic, { size: 14 }),
      h('span', { class: 'video-frame__fallback-text body', text: fallback.text }),
      fallback.numeral ? h('span', { class: 'video-frame__numeral numeral', text: fallback.numeral }) : null,
    ]));
    this.replaceChildren(...children);
  }

  // Motion-free procedural placeholder: bands, a horizon and a few discs seeded by the track id. It is
  // obviously a placeholder (labelled), never a still from a real video.
  placeholder(seed, aspect, deck) {
    const W = aspect === '9:16' ? 90 : 160, H = aspect === '9:16' ? 160 : 90;
    const hsh = hash(seed);
    const svg = s('svg', { class: 'video-frame__svg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(s('rect', { x: 0, y: 0, width: W, height: H, class: 'vf-sky' }));
    const horizon = H * (0.45 + ((hsh >>> 4) % 25) / 100);
    svg.appendChild(s('rect', { x: 0, y: horizon, width: W, height: H - horizon, class: 'vf-sea' }));
    for (let i = 0; i < 5; i++) {
      const yy = horizon + 4 + i * ((H - horizon) / 5.5);
      svg.appendChild(s('rect', { x: 0, y: yy, width: W, height: 1.2, class: 'vf-line', opacity: 0.35 + i * 0.1 }));
    }
    const discs = 2 + ((hsh >>> 8) % 3);
    for (let i = 0; i < discs; i++) {
      const r = 5 + ((hsh >>> (10 + i * 3)) % 12);
      const cx = (W * (0.15 + ((hsh >>> (12 + i * 5)) % 70) / 100));
      const cy = horizon - r - ((hsh >>> (14 + i * 2)) % 20);
      svg.appendChild(s('circle', { cx, cy, r, class: i === 0 ? 'vf-disc vf-disc--deck' : 'vf-disc' }));
    }
    svg.appendChild(s('path', { d: `M0 ${H} L${W * 0.4} ${horizon + 6} L${W} ${H} Z`, class: 'vf-light' }));
    void deck;
    return svg;
  }
}
define(MdjVideoFrame);
