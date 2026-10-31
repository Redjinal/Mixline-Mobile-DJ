// av/video — video mixing workspace (Document 03 §7, Document 15 §3, FR-045; AV-001…004).
//
// A shell screen reached through the labelled workspace switcher. Composition: the two labelled frames
// side by side — "Preview on this device" (private, what the DJ checks) and "Program output" (the clean
// composited surface an external display would show) — then the visual crossfader (linked to or unlinked
// from the audio crossfader), the program transition type, each deck's video mode, captions (offset,
// visibility, language), the declared frame-drop fallback and the external display.
//
// Honesty: no decoder, compositor or display exists. Pictures are the component's labelled procedural
// placeholders; frame counts, decoder lag, reported display modes and caption timing are fixtures
// (fixtures/av.json + fixtures/av-screens.json) and carry FIXTURE marks. A display is never printed as
// verified. The audio crossfader in the dock is never moved by this screen; unlinking only separates the
// visual crossfader. Audio is never slowed for pictures.
//
// The screen stands in for the compositor in exercised states: Unlink video crossfader → unlinked;
// "Audio only, deck B" → audio-only-fallback; Verify display → display-verifying. Other mode choices are
// shown as SENT (no compositor to acknowledge them).
//
// Shared helpers for the av family are exported from here (karaoke, broadcast and mic import them).
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';

const AV = await load('av');
const AVS = await load('av-screens');

// ---------------------------------------------------------------- shared av helpers

export const AV_WORKSPACES = { video: 'av/video', karaoke: 'av/karaoke', broadcast: 'av/broadcast', mic: 'av/mic', library: 'launch/library' };

export function avSwitcher(ctx, current) {
  const ws = h('mdj-workspace-switcher', { items: 'video,karaoke,broadcast,mic,library', current, max: 5, compact: ctx.orientation === 'landscape' ? true : null });
  ws.addEventListener('mdj:workspace', (e) => { const id = e.detail?.id; if (id && id !== current && AV_WORKSPACES[id]) ctx.navigate(AV_WORKSPACES[id]); });
  return h('nav', { class: 'av-ws', 'aria-label': 'Workspace switcher' }, [ws]);
}

export function avStatus(word, tone, iconName) {
  return h('span', { class: `av-status tone-${tone} label`, role: 'status' }, [icon(iconName, { size: 14 }), h('span', { text: word })]);
}

export function avSection(title, children, { tone = null, cls = '', fixture = null } = {}) {
  const sec = h('section', { class: `av-section ink-backing${tone ? ` av-section--${tone}` : ''}${fixture ? ' av-fixture-box' : ''} ${cls}`.trim(), 'aria-label': title }, [
    h('h3', { class: 'av-section__title label', text: title }),
    ...[].concat(children).filter(Boolean),
  ]);
  if (fixture) sec.appendChild(h('mdj-fixture-mark', { for: fixture }));
  return sec;
}

export function avNote(text, iconName = 'info', tone = null) {
  return h('p', { class: `av-note body${tone ? ` av-note--${tone}` : ''}` }, [icon(iconName, { size: 16 }), h('span', { text })]);
}

// SENT: the prototype has no engine / compositor / pipeline to acknowledge the command, so it stays sent.
export function avMarkSent(btn, text) {
  btn.dataset.state = 'pending';
  btn.setAttribute('aria-disabled', 'true');
  const lab = btn.querySelector('.btn-label');
  if (lab) lab.textContent = text;
}
export function avSentButton({ label, sentText, ...rest }) {
  const b = button({ label, ...rest, on: { click: () => { if (b.dataset.state !== 'pending') avMarkSent(b, sentText); } } });
  return b;
}

// Labelled radio row (48 dp options, visible text, disabled options say why).
export function avRadios({ label, options, value, fr = [], onPick, cls = '' }) {
  const group = h('div', { class: `av-radios ${cls}`.trim(), role: 'radiogroup', 'aria-label': label });
  for (const o of options) {
    const on = o.id === value;
    const disabled = !!o.disabled;
    const b = h('button', {
      type: 'button', role: 'radio', class: `av-radio${on ? ' av-radio--on' : ''}`, dataset: { hit: '48', ...(fr.length ? { fr: fr.join(' ') } : {}), value: o.id },
      'aria-checked': String(on), 'aria-label': `${o.name || o.text}${disabled && o.why ? ` (unavailable: ${o.why})` : ''}`, 'aria-disabled': disabled ? 'true' : undefined,
      on: { click: () => { if (!disabled && !on) onPick(o.id, b); } },
    }, [
      h('span', { class: 'av-radio__dot', 'aria-hidden': 'true' }),
      h('span', { class: 'av-radio__text' }, [h('span', { class: 'av-radio__label', text: o.text }), o.detail ? h('span', { class: 'av-radio__detail muted', text: o.detail }) : null]),
    ]);
    group.appendChild(b);
  }
  return group;
}

export function avDeck(letter) {
  return h('span', { class: `av-deck numeral deck-${letter.toLowerCase()}`, 'aria-hidden': 'true', text: letter });
}

// Custom element with every key set as an attribute (h() treats `text` as textContent, which the
// caption line reads as an attribute).
export function avEl(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v === null || v === undefined || v === false) continue; el.setAttribute(k, v === true ? '' : String(v)); }
  return el;
}

// Portrait: head · switcher · lead · hero · actions · main · aside, one column.
// Landscape: the switcher spans the top (its current tab names the workspace); then two columns — left
// holds the hero (and aside), right holds the status, actions, lead and main — so the first screenful
// shows the hero and the primary action.
export function avLayout(ctx, { screen, title, status, lead = null, hero = null, actions = [], main = [], aside = [], current }) {
  const root = h('div', { class: `av-screen av-screen--${screen} av-screen--${ctx.state}`, dataset: { orientation: ctx.orientation } });
  const head = h('header', { class: 'av-head' }, [h('h2', { class: 'title av-head__title', text: title }), status]);
  const ws = avSwitcher(ctx, current);
  const leadEl = lead ? h('p', { class: 'av-lead body', text: lead }) : null;
  const heroEl = hero ? h('div', { class: 'av-hero' }, [].concat(hero)) : null;
  const actionsEl = actions.length ? h('div', { class: 'av-actions' }, actions) : null;
  const mainEl = h('div', { class: 'av-main' }, main.filter(Boolean));
  const asideEl = aside.length ? h('div', { class: 'av-aside' }, aside.filter(Boolean)) : null;
  if (ctx.orientation === 'landscape') {
    root.append(
      ws,
      h('div', { class: 'av-col av-col--left' }, [heroEl, asideEl]),
      h('div', { class: 'av-col av-col--right' }, [head, actionsEl, leadEl, mainEl]),
    );
  } else {
    root.append(...[head, ws, leadEl, heroEl, actionsEl, mainEl, asideEl].filter(Boolean));
  }
  return root;
}

// ---------------------------------------------------------------- video view state

// Prototype view state only (no compositor): kept for the page so choices survive a state change.
const view = { previewDeck: null, transition: AV.video.program.transition || 'dissolve', policy: 'freeze', captionOffset: AV.karaoke.captions.offsetMs, captionVis: 'both', visual: AVS.video.unlinkedVisual };

const FR = ['FR-045'];
const MODE_TEXT = { follow: 'Follows audio', independent: 'Independent', 'audio-only': 'Audio only' };
const MODE_NAME = { follow: 'Video follows audio', independent: 'Independent visual', 'audio-only': 'Audio only' };
const pct = (v) => `${Math.round(v * 100)} %`;

// Per state: which deck the preview shows, each frame's reported state, deck modes, link and display.
const STATES = {
  linked: { preview: 'A', pState: 'playing', program: 'B', gState: 'playing', modes: { A: 'follow', B: 'follow' }, linked: true, display: 'none' },
  unlinked: { preview: 'A', pState: 'playing', program: 'B', gState: 'playing', modes: { A: 'follow', B: 'follow' }, linked: false, display: 'none' },
  'audio-only-fallback': { preview: 'A', pState: 'playing', program: 'B', gState: 'audio-only', modes: { A: 'follow', B: 'audio-only' }, linked: true, display: 'none' },
  'frozen-dropped': { preview: 'B', pState: 'dropped-frames', program: 'B', gState: 'frozen', modes: { A: 'follow', B: 'follow' }, linked: true, display: 'none' },
  'unsupported-stream': { preview: 'zinc', pState: 'unsupported', program: 'B', gState: 'playing', modes: { A: 'follow', B: 'follow' }, linked: true, display: 'none' },
  'external-display-connected': { preview: 'A', pState: 'playing', program: 'B', gState: 'playing', modes: { A: 'follow', B: 'follow' }, linked: true, display: 'wired-connected' },
  'display-verifying': { preview: 'A', pState: 'playing', program: 'B', gState: 'playing', modes: { A: 'follow', B: 'follow' }, linked: true, display: 'verifying' },
  'external-disconnected': { preview: 'A', pState: 'playing', program: 'B', gState: 'no-output', modes: { A: 'follow', B: 'follow' }, linked: true, display: 'wired-disconnected' },
  'late-decoding': { preview: 'A', pState: 'late-decoding', program: 'A', gState: 'frozen', modes: { A: 'follow', B: 'follow' }, linked: true, display: 'none' },
};

const STATUS = {
  linked: ['Linked · picture follows the audio crossfader', 'info', 'link'],
  unlinked: ['Unlinked · visual crossfader is separate', 'warning', 'crossfader'],
  'audio-only-fallback': ['Deck B audio only · app visual', 'neutral', 'music'],
  'frozen-dropped': ['Frames dropped · audio unaffected', 'warning', 'warning'],
  'unsupported-stream': ['Stream rejected · HDR not handled', 'critical', 'unavailable'],
  'external-display-connected': ['Display connected · not verified', 'info', 'display'],
  'display-verifying': ['Verifying display', 'info', 'loader'],
  'external-disconnected': ['Display lost · program hidden', 'critical', 'display'],
  'late-decoding': ['Decoder behind · audio not slowed', 'warning', 'clock'],
};

const LEAD = {
  linked: 'Program output is what the audience sees; the preview stays on this phone. The picture follows the audio crossfader until you unlink it.',
  unlinked: 'The visual crossfader now moves the picture on its own. The audio crossfader in the dock still mixes the sound; neither moves the other.',
  'audio-only-fallback': 'Deck B plays audio only. The program shows the restrained app visual — no invented cover and no unrelated video is substituted.',
  'frozen-dropped': 'The video decoder for deck B dropped frames under load. The program keeps the last good frame by the policy you chose; the music is not slowed or skipped.',
  'unsupported-stream': 'The video file for ZINC HARBOUR was checked before loading and rejected: it is HDR, and HDR-to-SDR conversion is not handled on this profile. It is not shown washed out.',
  'external-display-connected': 'A wired display is connected. It is not live yet: verify it before the program is presented. Controls, cue, stream keys and singer notes stay on this phone.',
  'display-verifying': 'Checking resolution, colour range and a test pattern on the external display. The program is not presented until the check reports.',
  'external-disconnected': 'The external display went away. Program output is hidden; private UI was never on that surface, so nothing was exposed. Music continues.',
  'late-decoding': 'Deck A is being scratched. Exact reverse / scratch video is not certified here, so its picture is held by your policy; the audio scratch is unaffected.',
};

function frame(kind, deckOrTrack, state, s) {
  const isTrack = !['A', 'B', 'C', 'D'].includes(deckOrTrack);
  const letter = isTrack ? 'B' : deckOrTrack;
  const trackId = isTrack ? deckOrTrack : (s.decks[letter]?.track?.id || AV.video.decks[letter]?.trackId);
  const d = AV.video.decks[letter] || {};
  const attrs = { kind, deck: letter, track: trackId, aspect: d.aspect || '16:9', mode: state === 'audio-only' ? 'audio-only' : 'follow', state, policy: view.policy };
  if (state === 'dropped-frames') attrs.dropped = String(AV.video.decks.B.droppedFrames);
  if (state === 'late-decoding') attrs.behind = String(AVS.video.scratch.behindFrames);
  if (kind === 'program' && state === 'playing' && view.captionVis !== 'hidden' && view.captionVis !== 'preview') attrs.caption = AV.karaoke.captions.lines[1].text;
  if (kind === 'preview' && state === 'playing' && (view.captionVis === 'both' || view.captionVis === 'preview')) attrs.caption = AV.karaoke.captions.lines[1].text;
  return h('mdj-video-frame', attrs);
}

function visualCrossfader(ctx, st) {
  const audio = AVS.video.audioCrossfader;
  const wrap = h('div', { class: `av-vxf${st.linked ? ' av-vxf--linked' : ''} av-fixture-box` });
  const value = st.linked ? audio : view.visual;
  const readout = h('span', { class: 'av-vxf__value numeral', text: `${pct(1 - value)} A · ${pct(value)} B` });
  const thumb = h('span', { class: 'av-vxf__thumb brass-rim', 'aria-hidden': 'true', style: { left: `${value * 100}%` } }, [h('span', { class: 'av-vxf__thumb-face titanium' })]);
  const ghost = st.linked ? null : h('span', { class: 'av-vxf__audio', 'aria-hidden': 'true', style: { left: `${audio * 100}%` }, title: 'Audio crossfader position' });
  const setVisual = (v) => {
    view.visual = Math.min(1, Math.max(0, Math.round(v * 100) / 100));
    thumb.style.left = `${view.visual * 100}%`;
    readout.textContent = `${pct(1 - view.visual)} A · ${pct(view.visual)} B`;
    rail.setAttribute('aria-valuenow', String(Math.round(view.visual * 100)));
    rail.setAttribute('aria-valuetext', `${pct(1 - view.visual)} deck A picture, ${pct(view.visual)} deck B picture`);
  };
  const rail = h('div', {
    class: 'av-vxf__rail', role: 'slider', tabindex: st.linked ? -1 : 0, dataset: { hit: '48', fr: 'FR-045' },
    'aria-label': st.linked ? 'Visual crossfader, linked to the audio crossfader' : 'Visual crossfader, program picture A to B',
    'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(value * 100), 'aria-valuetext': `${pct(1 - value)} deck A picture, ${pct(value)} deck B picture`,
    'aria-disabled': st.linked ? 'true' : undefined,
    on: {
      keydown: (e) => {
        if (st.linked) return;
        const step = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, PageUp: 0.2, PageDown: -0.2 }[e.key];
        if (step != null) { e.preventDefault(); setVisual(view.visual + step); }
        if (e.key === 'Home') { e.preventDefault(); setVisual(0); }
        if (e.key === 'End') { e.preventDefault(); setVisual(1); }
      },
    },
  }, [
    h('span', { class: 'av-vxf__end numeral', 'aria-hidden': 'true', text: 'A' }),
    h('span', { class: 'av-vxf__track sunken', 'aria-hidden': 'true' }, [h('span', { class: 'av-vxf__mid brass' }), ghost, thumb]),
    h('span', { class: 'av-vxf__end numeral', 'aria-hidden': 'true', text: 'B' }),
  ]);
  const head = h('div', { class: 'av-vxf__head' }, [
    h('span', { class: 'label', text: st.linked ? 'Visual crossfader · linked' : 'Visual crossfader · unlinked' }),
    readout,
  ]);
  wrap.append(head, rail);
  if (st.linked) {
    wrap.appendChild(h('p', { class: 'av-vxf__note body muted', text: `Follows the audio crossfader in the dock (${pct(audio)} B). Unlink to move the picture on its own.` }));
    wrap.appendChild(button({ label: 'Unlink video crossfader', icon: 'unlock', hit: 48, cls: 'btn--secondary av-vxf__btn', fr: FR, on: { click: () => ctx.setState('unlinked') } }));
  } else {
    wrap.appendChild(h('div', { class: 'av-vxf__steps' }, [
      button({ label: 'Picture toward A', icon: 'chevron-left', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => setVisual(view.visual - 0.1) } }),
      button({ label: 'Picture toward B', icon: 'chevron-right', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => setVisual(view.visual + 0.1) } }),
    ]));
    wrap.appendChild(h('p', { class: 'av-vxf__note body muted', text: `The dashed mark is the audio crossfader (${pct(audio)} B). Moving the picture never changes the sound.` }));
    wrap.appendChild(button({ label: 'Link to audio crossfader', icon: 'link', hit: 48, cls: 'btn--secondary av-vxf__btn', fr: FR, on: { click: () => ctx.setState('linked') } }));
  }
  wrap.appendChild(h('mdj-fixture-mark', { for: 'crossfader positions' }));
  return wrap;
}

function deckModes(ctx, st) {
  const rows = ['A', 'B'].map((L) => {
    const d = ctx.session.decks[L];
    const title = d?.track?.title || 'Empty';
    const current = st.modes[L];
    const options = ['follow', 'independent', 'audio-only'].map((m) => ({
      id: m, text: MODE_TEXT[m], name: `${MODE_NAME[m]}, deck ${L}`,
      disabled: m === 'independent', why: m === 'independent' ? 'no independent visual is admitted for this deck — add authorized local video in Preparation' : '',
    }));
    const pick = (m, btn) => {
      if (L === 'B' && m === 'audio-only') return ctx.setState('audio-only-fallback');
      if (L === 'B' && m === 'follow' && ctx.state === 'audio-only-fallback') return ctx.setState('linked');
      btn.classList.add('av-radio--sent'); btn.dataset.state = 'pending'; btn.setAttribute('aria-disabled', 'true');
      btn.querySelector('.av-radio__label').textContent = `SENT · ${MODE_TEXT[m]}`;
    };
    return h('div', { class: `av-mode deck-${L.toLowerCase()}` }, [
      h('div', { class: 'av-mode__head' }, [avDeck(L), h('span', { class: 'av-mode__title title truncate', text: title }), h('span', { class: 'av-mode__now label', text: MODE_NAME[current] })]),
      avRadios({ label: `Video mode, deck ${L}`, options, value: current, fr: FR, onPick: pick, cls: 'av-radios--row' }),
    ]);
  });
  return avSection('Deck video mode', [
    ...rows,
    h('p', { class: 'av-small muted', text: 'Follows audio: the picture tracks the deck’s position and tempo; a loop repeats its video interval; a key change alone does not change picture speed. Decks C and D are off in this set.' }),
  ]);
}

function transitionType() {
  const opts = AVS.video.transitions.map((t) => ({ id: t.id, text: t.label, detail: t.detail, name: `Program transition: ${t.label}` }));
  const group = avRadios({ label: 'Program transition type', options: opts, value: view.transition, fr: FR, cls: 'av-radios--stack', onPick: (id) => { view.transition = id; for (const b of group.querySelectorAll('[role="radio"]')) { const on = b.dataset.value === id; b.setAttribute('aria-checked', String(on)); b.classList.toggle('av-radio--on', on); } } });
  return avSection('Program transition', [group, h('p', { class: 'av-small muted', text: 'Applies to the next program transition. A transition already running finishes as it started.' })]);
}

function captions() {
  const c = AV.karaoke.captions;
  const line = avEl('mdj-caption-line', { text: c.lines[1].text, active: true, offset: String(view.captionOffset), lang: c.language, visibility: view.captionVis, state: 'line-timed' });
  const offsetText = h('span', { class: 'av-stepper__value numeral', text: '' });
  const paint = () => { const v = view.captionOffset; offsetText.textContent = `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} ms`; line.setAttribute('offset', String(v)); };
  const step = (d) => { view.captionOffset = Math.max(-2000, Math.min(2000, view.captionOffset + d)); paint(); };
  paint();
  const stepper = h('div', { class: 'av-stepper', role: 'group', 'aria-label': 'Caption display offset' }, [
    button({ label: 'Caption earlier, 20 ms', icon: 'minus', iconOnly: true, hit: 48, cls: 'btn--secondary', fr: ['FR-045', 'FR-046'], on: { click: () => step(-20) } }),
    h('span', { class: 'av-stepper__readout ink-backing' }, [h('span', { class: 'label', text: 'Offset' }), offsetText]),
    button({ label: 'Caption later, 20 ms', icon: 'plus', iconOnly: true, hit: 48, cls: 'btn--secondary', fr: ['FR-045', 'FR-046'], on: { click: () => step(20) } }),
  ]);
  const vis = avRadios({
    label: 'Caption visibility', cls: 'av-radios--grid', fr: ['FR-045', 'FR-046'], value: view.captionVis,
    options: [{ id: 'both', text: 'Program + preview' }, { id: 'program', text: 'Program only' }, { id: 'preview', text: 'Preview only' }, { id: 'hidden', text: 'Hidden' }].map((o) => ({ ...o, name: `Captions: ${o.text}` })),
    onPick: (id) => { view.captionVis = id; line.setAttribute('visibility', id); for (const b of vis.querySelectorAll('[role="radio"]')) { const on = b.dataset.value === id; b.setAttribute('aria-checked', String(on)); b.classList.toggle('av-radio--on', on); } },
  });
  return avSection('Captions', [
    line,
    stepper,
    vis,
    h('p', { class: 'av-small muted' }, [h('span', { class: 'label', text: 'Language ' }), h('span', { text: `${c.language.toUpperCase()} — the only language in ${c.format}. The offset changes when text is drawn, never the audio.` })]),
  ]);
}

function fallbackPolicy() {
  const pol = AV.video.fallbackPolicies;
  const group = avRadios({
    label: 'When frames drop or scratch video is uncertified', cls: 'av-radios--stack', fr: FR, value: view.policy,
    options: Object.entries(pol).map(([id, text]) => ({ id, text, name: `Frame fallback: ${text}` })),
    onPick: (id) => { view.policy = id; for (const b of group.querySelectorAll('[role="radio"]')) { const on = b.dataset.value === id; b.setAttribute('aria-checked', String(on)); b.classList.toggle('av-radio--on', on); } },
  });
  return avSection('Declared visual fallback', [group, avNote('Audio is not slowed to let the picture catch up. Frames are dropped or held instead.', 'music')]);
}

function display(ctx, st) {
  const el = h('mdj-display-target', { state: st.display, compact: st.display === 'none' ? true : null });
  el.addEventListener('mdj:display', (e) => {
    const a = e.detail?.action;
    if (a === 'verify') ctx.setState('display-verifying');
    else if (a === 'cancel') ctx.setState('external-display-connected');
    else if (a === 'local') ctx.setState('linked');
  });
  const extra = st.display === 'wired-connected' || st.display === 'verifying'
    ? h('p', { class: 'av-small muted av-fixture-box' }, [`${AVS.video.display.connector} · ${AVS.video.display.reported}`, h('mdj-fixture-mark', { for: 'reported display mode', inline: true })]) : null;
  return avSection('External display', [el, extra]);
}

function frames(ctx, st) {
  const s = ctx.session;
  const pv = frame('preview', st.preview, st.pState, s);
  const pg = frame('program', st.program, st.gState, s);
  const progLine = st.gState === 'no-output' ? 'Program hidden — no display. Nothing private is shown on the program surface.'
    : st.linked ? `Program: ${AVS.video.transitions.find((t) => t.id === view.transition)?.label || 'Dissolve'} A → B, following the audio crossfader`
      : `Program: visual crossfader ${pct(view.visual)} B · audio ${pct(AVS.video.audioCrossfader)} B`;
  return h('div', { class: 'av-frames' }, [
    h('div', { class: 'av-frame av-frame--preview' }, [pv, h('p', { class: 'av-frame__cap body' }, [icon('lock', { size: 11 }), h('span', { text: ' Private to this phone' })])]),
    h('div', { class: 'av-frame av-frame--program' }, [pg, h('p', { class: 'av-frame__cap body' }, [icon('display', { size: 11 }), h('span', { text: ` ${progLine}` })])]),
  ]);
}

function previewPick(ctx, st) {
  if (st.preview === 'zinc') return null;
  return avRadios({
    label: 'Preview deck', cls: 'av-radios--row av-preview-pick', fr: FR, value: st.preview,
    options: ['A', 'B'].map((L) => ({ id: L, text: `Preview ${L}`, name: `Preview deck ${L}` })),
    onPick: (L, btn) => { btn.classList.add('av-radio--sent'); btn.dataset.state = 'pending'; btn.setAttribute('aria-disabled', 'true'); btn.querySelector('.av-radio__label').textContent = `SENT · Preview ${L}`; },
  });
}

function stateBlock(ctx) {
  const t = ctx.fixtures.track(AVS.video.unsupported.trackId);
  switch (ctx.state) {
    case 'unsupported-stream':
      return avSection('Video file rejected', [
        h('p', { class: 'title av-strong', text: t?.title || 'ZINC HARBOUR' }),
        h('dl', { class: 'av-kv' }, [
          h('dt', { class: 'label', text: 'File' }), h('dd', { class: 'body', text: AVS.video.unsupported.file }),
          h('dt', { class: 'label', text: 'Colour' }), h('dd', { class: 'body', text: AVS.video.unsupported.colour }),
          h('dt', { class: 'label', text: 'Why' }), h('dd', { class: 'body', text: AVS.video.unsupported.reason }),
        ]),
        h('div', { class: 'av-row' }, [
          avSentButton({ label: 'Use audio only for this track', sentText: 'Sent · applies when it is loaded', icon: 'music', hit: 48, cls: 'btn--primary', fr: FR }),
          button({ label: 'Choose another video', icon: 'library', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.navigate('launch/library') } }),
        ]),
      ], { tone: 'critical' });
    case 'frozen-dropped':
      return avSection('Deck B decoder under load', [
        h('p', { class: 'body av-fixture-box' }, [`${AV.video.decks.B.droppedFrames} frames dropped in the last 10 s on ${AV.video.decks.B.decoder}. Program holds the last good frame (${AV.video.fallbackPolicies[view.policy].toLowerCase()}).`, h('mdj-fixture-mark', { for: 'dropped frame count', inline: true })]),
        avNote('The music on deck B is unaffected. Lower the load by setting deck A to audio only, or change the fallback below.', 'music'),
      ], { tone: 'warning' });
    case 'late-decoding':
      return avSection('Scratch on deck A', [
        h('p', { class: 'body av-fixture-box' }, [`Decoder ${AVS.video.scratch.behindFrames} frames behind. ${AVS.video.scratch.note}`, h('mdj-fixture-mark', { for: 'decoder lag', inline: true })]),
        avNote('Audio scratch behaves exactly as without video. When the platter is released the picture resumes from the engine position (new epoch, no stale frames).', 'scratch'),
      ], { tone: 'warning' });
    case 'audio-only-fallback':
      return avSection('Deck B audio only', [
        h('p', { class: 'body', text: `${AV.video.modes['audio-only'].detail} Chosen visual: restrained app visual. A licensed still or black can be chosen instead.` }),
      ]);
    case 'external-disconnected':
      return avSection('Display disconnected', [
        h('p', { class: 'body', text: 'Program output is hidden. A reconnect needs a valid display configuration and a new verification before anything is presented again.' }),
      ], { tone: 'critical' });
    default:
      return null;
  }
}

function render(ctx) {
  const st = STATES[ctx.state] || STATES.linked;
  const [word, tone, ic] = STATUS[ctx.state] || STATUS.linked;
  return avLayout(ctx, {
    screen: 'video', current: 'video', title: 'Video', status: avStatus(word, tone, ic), lead: LEAD[ctx.state],
    hero: [frames(ctx, st), previewPick(ctx, st), visualCrossfader(ctx, st)].filter(Boolean),
    main: [stateBlock(ctx), deckModes(ctx, st), transitionType(), captions(), fallbackPolicy(), display(ctx, st)],
  });
}

register({
  id: 'av/video',
  family: 'av',
  title: 'Video',
  order: 1,
  fr: ['FR-045', 'FR-046'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    linked: { label: 'Linked — preview vs program, picture follows audio crossfader', exercised: true, scenario: 'transition' },
    unlinked: { label: 'Visual crossfader unlinked from audio', exercised: true, scenario: 'transition', via: { from: 'linked', control: 'Unlink video crossfader' } },
    'audio-only-fallback': { label: 'Deck B audio only — app visual, no invented cover', exercised: true, scenario: 'transition', via: { from: 'linked', control: 'Audio only, deck B' } },
    'frozen-dropped': { label: 'Frames dropped — last good frame held, audio unaffected', exercised: false, scenario: 'transition' },
    'unsupported-stream': { label: 'Unsupported stream — HDR rejected with reason', exercised: false, scenario: 'transition' },
    'external-display-connected': { label: 'External display connected — not verified', exercised: false, scenario: 'transition' },
    'display-verifying': { label: 'Verifying external display', exercised: true, scenario: 'transition', via: { from: 'external-display-connected', control: 'Verify display' } },
    'external-disconnected': { label: 'External display disconnected — private UI never shown', exercised: false, scenario: 'transition' },
    'late-decoding': { label: 'Late decoding during scratch — picture held, audio unaffected', exercised: false, scenario: 'transition' },
  },
  defaultState: 'linked',
  render,
});
