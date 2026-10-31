// queue/queue — queue and automix (FR-032; Document 03 §2 "Queue and automix": reorder, prepare
// transitions, inspect next item, manual takeover; §4 "Queue reorder": drag by a handle, the current item
// and a committed next transition are protected, Move up / Move down are the accessible alternative and
// the engine's acknowledgement decides whether a late change took effect; Document 13: automix execution
// is engine-owned, Stop automation cancels at an acknowledged frame and never resets faders; QA-23).
// Shell screen, dock on in both orientations: transport, crossfader, route and master stay reachable.
//
// One world for every state (scenario a-playing): Deck A plays AURORA DRIVE at 1:32 and is the current,
// protected item; Deck B holds COPPER SKY paused at its cue, not audible. The session queue (DRIFT HOUR,
// GLASSWORK, CALYPSO WIRE) follows, with the long-title fixture pinned as the closer.
// No scheduler exists. Revisions, frames, bar counts and readiness checks come from fixtures/queue.json.
// The screen stands in for the engine only where a walkthrough needs an acknowledgement (a reorder is SENT
// first, then reprinted at the next revision); nothing here plays, loads or mixes audio.
//
// States
//   ready                 Automix on (Assisted): COPPER SKY next on B, ready; transition at the marked exit
//   inspect-next          the next item's readiness checks, tempo / key comparison, intro and exit markers
//   committed-transition  "Transition committed — begins in 8 bars": next-item edits blocked with the reason
//   expired-edit          a late reorder (rev 41) reached the engine after the commit (rev 42): not applied
//   takeover              Stop automation acknowledged at frame N: automation cancelled, faders not reset
//   automix-off           Automix off: the queue is a list; nothing loads or mixes by itself
//   missing-next          BRASS CANYON is next and missing: never treated as ready; skip or pick another
//   tempo-mismatch        CALYPSO WIRE 136 BPM vs 124: sync would exceed the range — manual or cut
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, icon, button, fmt } from '../../components/base.js';

let QX = null;
const ready = load('queue').then((d) => { QX = d; return d; });
let flash = null; // a one-shot acknowledgement carried into the next state's first paint

const FR = ['FR-032', 'FR-035', 'FR-048', 'FR-016', 'FR-033'];
const STOP_RUNNING = 'Stop automation — Automix running';

const STATES = {
  ready: { label: 'Automix ready — next track ready', exercised: true, scenario: 'a-playing' },
  'inspect-next': { label: 'Inspect next — COPPER SKY readiness', exercised: true, scenario: 'a-playing', via: { from: 'ready', control: 'Inspect next' } },
  'committed-transition': { label: 'Transition committed — begins in 8 bars', exercised: true, scenario: 'a-playing', via: { from: 'ready', control: 'Start transition at next phrase' } },
  'expired-edit': { label: 'Expired edit — late reorder not applied', exercised: false, scenario: 'a-playing' },
  takeover: { label: 'Manual takeover — automation cancelled', exercised: true, scenario: 'a-playing', via: { from: 'ready', control: STOP_RUNNING } },
  'automix-off': { label: 'Automix off — queue is a list', exercised: true, scenario: 'a-playing', via: { from: 'ready', control: 'Automix' } },
  'missing-next': { label: 'Missing next track — BRASS CANYON', exercised: false, scenario: 'a-playing' },
  'tempo-mismatch': { label: 'Tempo mismatch — CALYPSO WIRE 136 vs 124', exercised: false, scenario: 'a-playing' },
};

register({
  id: 'queue/queue',
  family: 'queue',
  title: 'Queue and automix',
  order: 1,
  fr: FR,
  shell: true,
  dock: { portrait: true, landscape: true },
  states: STATES,
  defaultState: 'ready',
  render(ctx) {
    const root = h('div', { class: `queue queue--${ctx.state} queue--${ctx.orientation}` });
    const fill = () => mount(ctx, root);
    if (QX) fill(); else ready.then(fill);
    return root;
  },
});

const TYPES = [
  { id: 'cut', label: 'Cut', note: 'Hard cut on the downbeat — no overlap' },
  { id: 'fade', label: 'Fade', note: 'Equal-power fade over the duration' },
  { id: 'exit', label: 'At marked exit', note: 'Blend starts at the marked exit of the current track' },
];

// ---------------------------------------------------------------- mount
function mount(ctx, root) {
  const fx = ctx.fixtures;
  const s = ctx.state;
  const landscape = ctx.orientation === 'landscape';
  const committed = s === 'committed-transition' || s === 'expired-edit';
  const automixOn = !(s === 'automix-off' || s === 'takeover');
  const deckA = ctx.session.decks.A;
  const deckB = ctx.session.decks.B;
  const current = deckA.track;
  const view = {
    order: (QX.queues[s] || QX.queues.ready).slice(),
    sent: new Set(),
    revision: QX.revision,
    type: s === 'tempo-mismatch' || committed ? 'fade' : QX.transition.type, // a phrase-start commit is a fade, not the exit blend
    bars: QX.transition.bars,
    tempoMatch: s === 'tempo-mismatch' ? false : QX.transition.tempoMatch,
    settingsSent: false,
    skipSent: false,
    cancelSent: false,
    inspect: s === 'inspect-next',
    notice: null,
  };
  if (flash) { view.notice = flash; flash = null; }

  const live = h('p', { class: 'queue-sr', role: 'status', 'aria-live': 'polite' });
  const say = (t) => { live.textContent = t; };
  const nextId = () => view.order[1];
  const T = (id) => fx.track(id);

  // ---- per-item state, derived from the world + the local order ----
  function itemState(id, pos) {
    const t = T(id);
    if (pos === 1) return { state: 'current', deck: 'A' };
    if (s === 'expired-edit' && id === QX.expiredEdit.trackId) return { state: 'expired', deck: '' };
    if (pos === 2) {
      if (t.availability === 'missing') return { state: 'missing', deck: '' };
      if (s === 'tempo-mismatch' && id === 'calypso') return { state: 'not-ready', deck: 'B', reason: QX.notReady['calypso-mismatch'] };
      if (QX.notReady[id]) return { state: 'not-ready', deck: '', reason: QX.notReady[id] };
      if (committed) return { state: 'committed', deck: 'B', bars: QX.committed.bars, transition: transitionText() };
      if (!automixOn) return { state: 'ready', deck: 'B' };
      return { state: 'next', deck: 'B', transition: transitionText() };
    }
    if (QX.locked[id]) return { state: 'locked', deck: '', reason: QX.locked[id] };
    if (QX.notReady[id]) return { state: 'not-ready', deck: '', reason: QX.notReady[id] };
    if (t.availability === 'missing') return { state: 'missing', deck: '' };
    return { state: 'ready', deck: '' };
  }
  function transitionText() {
    const ty = TYPES.find((x) => x.id === view.type);
    return view.type === 'cut' ? 'Cut' : `${ty.label} · ${view.bars} bars${view.tempoMatch ? ' · sync' : ''}`;
  }
  function nextReadiness() {
    const id = nextId();
    const t = T(id);
    if (t.availability === 'missing') return { ok: false, tone: 'critical', icon: 'missing', text: 'Not ready: file missing — never treated as ready' };
    if (s === 'tempo-mismatch' && id === 'calypso') return { ok: false, tone: 'warning', icon: 'warning', text: `Loads, but no automatic sync: ${fmt.bpm(t.bpm)} vs ${fmt.bpm(current.bpm)} BPM is beyond the ±${QX.pitchRangePct} % range` };
    if (QX.notReady[id]) return { ok: false, tone: 'critical', icon: 'analysis-pending', text: `Not ready for automix: ${QX.notReady[id]}` };
    if (committed) return { ok: true, tone: 'info', icon: 'arm', text: `Committed · begins in ${QX.committed.bars} bars on Deck B` };
    return { ok: true, tone: 'ok', icon: 'check', text: id === 'copper' ? 'Ready · loaded on Deck B, paused at its cue, not audible' : 'Ready · loads to Deck B at the exit, replacing COPPER SKY (paused, not audible)' };
  }

  // ---- regions ----
  const barEl = h('div', { class: 'queue-bar', role: 'group', 'aria-label': 'Automix and takeover' });
  const autoEl = h('section', { class: 'queue-auto glass', 'aria-label': 'Automix mode' });
  const bannerEl = h('div', { class: 'queue-banners' });
  const handoffEl = h('section', { class: 'queue-handoff glass', 'aria-label': 'Now and next' });
  const lowerEl = h('div', { class: 'queue-lower' });
  const listHead = h('div', { class: 'queue-list__head' });
  const listEl = h('div', { class: 'queue-list__items', role: 'list', 'aria-label': 'Queue, in play order' });
  const listSec = h('section', { class: 'queue-list', 'aria-label': 'Queue' }, [listHead, listEl]);

  function paint() {
    const [bar, ...auto] = buildAuto();
    barEl.replaceChildren(...bar);
    autoEl.replaceChildren(...auto);
    bannerEl.replaceChildren(...buildBanners());
    handoffEl.replaceChildren(...buildHandoff());
    lowerEl.replaceChildren(view.inspect ? buildInspect() : buildSettings());
    listHead.replaceChildren(...buildListHead());
    listEl.replaceChildren(...buildList());
  }

  // ---------------------------------------------------------------- automix header
  function buildAuto() {
    const mode = !automixOn ? 'off' : 'assisted';
    const sw = h('button', {
      type: 'button', role: 'switch', class: `queue-switch raised${automixOn ? ' is-on' : ''}`, 'aria-checked': String(automixOn), 'aria-label': 'Automix',
      dataset: { hit: '48', fr: 'FR-032' },
      on: { click: () => { if (automixOn) ctx.setState('automix-off'); else { flash = { tone: 'ok', icon: 'automix', title: 'Automix on — Assisted.', body: 'The engine will load the next ready track and transition at the marked exit. Nothing was armed by ParDay.' }; ctx.setState('ready'); } } },
    }, [
      h('span', { class: 'queue-switch__text' }, [h('span', { class: 'label label-strong', text: 'Automix' }), h('span', { class: 'queue-switch__word title' }, [automixOn ? 'On' : 'Off', automixOn ? h('span', { class: 'queue-switch__mode', text: ' · Assisted' }) : null])]),
      h('span', { class: 'queue-switch__track', 'aria-hidden': 'true' }, [h('span', { class: 'queue-switch__knob titanium' })]),
    ]);
    const stop = h('mdj-stop-automation', { state: automixOn ? 'executing' : 'idle', plan: automixOn ? 'Automix' : '', count: automixOn ? '1' : '0', compact: landscape ? true : null });
    const modes = [
      { id: 'off', label: 'Off', note: 'You load and mix' },
      { id: 'assisted', label: 'Assisted', note: 'Next at marked exit' },
      { id: 'armed', label: 'Armed plan', note: 'From ParDay' },
    ];
    const modeEl = h('ol', { class: 'queue-mode', 'aria-label': `Automix mode: ${modes.find((m) => m.id === mode).label}` }, modes.map((m) => h('li', { class: `queue-mode__seg${m.id === mode ? ' is-current ink-backing' : ''}`, 'aria-current': m.id === mode ? 'step' : null }, [
      m.id === mode ? h('span', { class: 'queue-mode__mark brass', 'aria-hidden': 'true' }) : null,
      h('span', { class: 'label label-strong', text: m.label }),
      h('span', { class: 'queue-mode__note', text: m.id === mode ? 'Current' : m.note }),
    ])));
    const desc = !automixOn
      ? (s === 'takeover' ? 'Manual. You took over; automix stays off until you turn it back on.' : 'Off. The queue is an ordered list; nothing loads or mixes by itself.')
      : committed ? 'Assisted. A transition is committed; the engine owns it until it ends or you stop it.'
        : 'Assisted. The engine loads the next ready track and mixes at the marked exit. Any touch on an affected control, or Stop automation, takes over at once.';
    return [
      [sw, stop],
      modeEl,
      h('p', { class: 'body queue-auto__desc', text: desc }),
      h('div', { class: 'queue-auto__plan' }, [
        h('span', { class: 'body muted', text: 'No ParDay plan armed.' }),
        button({ label: 'Arm a plan in ParDay', icon: 'parday', cls: 'btn--ghost queue-auto__arm', fr: ['FR-048'], on: { click: () => ctx.navigate('parday/arm') } }),
      ]),
    ];
  }

  // ---------------------------------------------------------------- banners
  function banner(tone, ic, title, body, actions = []) {
    return h('div', { class: `queue-banner raised queue-banner--${tone}`, role: tone === 'critical' || tone === 'warning' ? 'alert' : 'status' }, [
      h('span', { class: `queue-banner__icon tone-${tone}`, 'aria-hidden': 'true' }, [icon(ic, { size: 18 })]),
      h('div', { class: 'queue-banner__text' }, [
        h('p', { class: 'title queue-banner__title', text: title }),
        ...[].concat(body).map((b) => h('p', { class: 'body', text: b })),
        actions.length ? h('div', { class: 'queue-actions' }, actions) : null,
      ]),
    ]);
  }
  function buildBanners() {
    const out = [];
    if (view.notice) out.push(banner(view.notice.tone, view.notice.icon, view.notice.title, view.notice.body));
    if (s === 'committed-transition') {
      out.push(banner('info', 'arm', `Transition committed — begins in ${QX.committed.bars} bars`, [
        `COPPER SKY fades in on Deck B at ${fmt.time(QX.committed.startSec)} of AURORA DRIVE (queue revision ${QX.committed.revision}). Edits to the next item are blocked until the transition ends: the engine has already scheduled it.`,
        'To change course now, use Stop automation. The engine cancels the remaining events and leaves every fader where it is.',
      ]));
    } else if (s === 'expired-edit') {
      const e = QX.expiredEdit;
      out.push(banner('warning', 'expiry', 'Engine already committed; your change did not apply', [
        `You moved ${T(e.trackId).title} to position ${e.attemptedTo} at revision ${e.fromRevision}. The transition to COPPER SKY was committed at revision ${e.engineRevision} before your change arrived, so the queue kept its order. Nothing audible changed.`,
        `${T(e.trackId).title} stays at position 3. Move it again to send a fresh change at revision ${e.engineRevision + 1}; it can take effect after this transition.`,
      ], [button({ label: 'Keep this order', icon: 'check', cls: 'btn--secondary', fr: ['FR-032'], on: { click: () => ctx.setState('committed-transition') } })]));
    } else if (s === 'takeover') {
      const tk = QX.takeover;
      out.push(banner('ok', 'takeover', `Manual takeover — automation cancelled at frame ${tk.frame.toLocaleString('en-GB').replace(/,/g, ' ')}`, [
        `The engine acknowledged Stop automation ${fmt.time(tk.atSec)} into AURORA DRIVE (frame at ${QX.sampleRate / 1000} kHz). No automix event runs after that frame.`,
        'Faders, EQ and the crossfader were not reset: they stay exactly where they were. Deck A keeps playing; COPPER SKY stays cued on Deck B and does not start.',
      ], [
        button({ label: 'Turn automix back on', icon: 'automix', cls: 'btn--secondary', fr: ['FR-032'], on: { click: () => ctx.setState('ready') } }),
        button({ label: 'Open Perform', icon: 'deck-focus', cls: 'btn--ghost', fr: ['FR-032'], on: { click: () => ctx.navigate('perform/ab', { state: 'playing' }) } }),
      ]));
    } else if (s === 'automix-off') {
      out.push(banner('neutral', 'automix', 'Automix is off', 'Reorder freely. Nothing loads or mixes by itself; the next track waits for you to load it and mix from Perform.', [
        button({ label: 'Open Perform', icon: 'deck-focus', cls: 'btn--ghost', fr: ['FR-032'], on: { click: () => ctx.navigate('perform/ab', { state: 'playing' }) } }),
      ]));
    } else if (s === 'missing-next') {
      out.push(banner('critical', 'missing', 'Next track is missing — not treated as ready', [
        'BRASS CANYON\'s file is not on this phone, so automix will not load it or start a transition.',
        'If nothing changes, automix stops after AURORA DRIVE: Deck A plays to its end and nothing else starts. Skip it, locate the file, or pick another track.',
      ], [
        button({ label: 'Skip to COPPER SKY', icon: 'chevron-right', cls: 'btn--primary', fr: ['FR-032'], on: { click: () => { flash = { tone: 'ok', icon: 'check', title: 'BRASS CANYON skipped (queue revision 43, fixture).', body: 'It moved to the end of the queue with its cues kept. COPPER SKY is next and ready.' }; ctx.setState('ready'); } } }),
        button({ label: 'Locate BRASS CANYON', icon: 'folder', cls: 'btn--secondary', fr: ['FR-032'], on: { click: () => ctx.navigate('launch/open', { state: 'resume-missing' }) } }),
        button({ label: 'Pick another in Library', icon: 'library', cls: 'btn--ghost', fr: ['FR-032'], on: { click: () => ctx.navigate('launch/library') } }),
      ]));
    } else if (s === 'tempo-mismatch') {
      const c = T('calypso');
      const need = ((current.bpm / c.bpm) - 1) * 100;
      out.push(banner('warning', 'tempo-bend', `${c.title} ${Math.round(c.bpm)} BPM vs ${Math.round(current.bpm)}: sync would exceed range — manual`, [
        `Matching ${fmt.bpm(c.bpm)} to ${fmt.bpm(current.bpm)} needs ${need.toFixed(1).replace('-', '−')} % on Deck B; the pitch range is ±${QX.pitchRangePct} %. Automix will not tempo-match this pair and will not stretch past the range.`,
        'Use a cut at the marked exit, mix it by hand, or put COPPER SKY back next.',
      ], [
        button({ label: 'Use a cut at the marked exit', icon: 'transition-exit', cls: 'btn--secondary', fr: ['FR-032', 'FR-016'], on: { click: () => { view.type = 'cut'; view.tempoMatch = false; sendSettings('Cut at the marked exit'); } } }),
        button({ label: 'Put COPPER SKY back next', icon: 'arrow-up', cls: 'btn--ghost', fr: ['FR-032'], on: { click: () => { flash = { tone: 'ok', icon: 'check', title: 'COPPER SKY is next again (queue revision 43, fixture).', body: 'CALYPSO WIRE moved to position 3; mix it by hand when you get there.' }; ctx.setState('ready'); } } }),
      ]));
    }
    return out;
  }

  // ---------------------------------------------------------------- now → next
  function buildHandoff() {
    const next = T(nextId());
    const nr = nextReadiness();
    const remainExit = QX.currentExitSec - deckA.positionSec;
    const nowCard = h('div', { class: 'queue-card queue-card--now raised deck-a', role: 'group', 'aria-label': `Now on Deck A: ${current.title}, playing, protected` }, [
      h('div', { class: 'queue-card__head' }, [
        h('span', { class: 'queue-deck', 'aria-hidden': 'true', text: 'A' }),
        h('span', { class: 'label label-strong', text: 'Now · Deck A' }),
        h('span', { class: 'queue-flag tone-info label' }, [icon('lock', { size: 12 }), 'Protected']),
      ]),
      h('p', { class: 'title queue-card__title wrap-2', text: current.title }),
      h('p', { class: 'body muted truncate', text: `${current.artist} · ${deckA.state === 'playing' ? 'Playing' : 'Paused'}` }),
      h('div', { class: 'queue-nums ink-backing queue-fixture' }, [
        num(`${fmt.time(deckA.positionSec)} / ${fmt.time(current.durationSec)}`, 'Position'),
        num(fmt.time(QX.currentExitSec), 'Marked exit'),
        num(committed ? `${QX.committed.bars}` : (automixOn ? `${QX.barsToExit}` : '—'), committed ? 'Bars to blend' : 'Bars to exit'),
        h('mdj-fixture-mark', { for: 'position and bar count' }),
      ]),
      h('p', { class: 'queue-card__foot body muted', text: `Position 1 cannot move or be replaced while it plays (${fmt.time(remainExit)} to the exit).` }),
    ]);

    const railText = !automixOn ? 'No automatic transition — automix is off'
      : committed ? `Committed · begins in ${QX.committed.bars} bars · ${transitionText()}`
        : nr.ok ? `${transitionText()} · at ${fmt.time(QX.currentExitSec)}` : 'No transition scheduled — next is not ready';
    const rail = h('div', { class: `queue-rail${committed ? ' queue-rail--committed' : ''}${automixOn && nr.ok ? '' : ' queue-rail--idle'}` }, [
      h('span', { class: 'queue-rail__line brass', 'aria-hidden': 'true' }),
      h('span', { class: 'queue-rail__label ink-backing' }, [icon(committed ? 'arm' : 'transition-exit', { size: 14 }), h('span', { class: 'numeral', text: railText })]),
    ]);

    const isCopper = next.id === 'copper';
    const nextDeck = next.availability === 'missing' ? '' : 'B';
    const nextCard = h('div', { class: `queue-card queue-card--next raised${nextDeck ? ' deck-b' : ''}${nr.ok ? '' : ' queue-card--blocked'}`, role: 'group', 'aria-label': `Next: ${next.title}. ${nr.text}` }, [
      h('div', { class: 'queue-card__head' }, [
        nextDeck ? h('span', { class: 'queue-deck', 'aria-hidden': 'true', text: 'B' }) : h('span', { class: 'queue-deck queue-deck--none', 'aria-hidden': 'true' }, [icon('missing', { size: 14 })]),
        h('span', { class: 'label label-strong', text: nextDeck ? (isCopper ? 'Next · Deck B (loaded)' : 'Next · loads to Deck B') : 'Next · no deck' }),
      ]),
      h('p', { class: 'title queue-card__title wrap-2', text: next.title }),
      h('p', { class: 'body muted truncate', text: next.artist }),
      h('p', { class: `queue-ready tone-${nr.tone}` }, [icon(nr.icon, { size: 14 }), h('span', { text: nr.text })]),
      h('div', { class: 'queue-nums ink-backing queue-fixture' }, [
        num(next.analysis === 'complete' ? fmt.bpm(next.bpm) : '—', 'BPM'),
        num(next.analysis === 'complete' ? next.key : '—', 'Key'),
        num(fmt.time(next.durationSec), 'Length'),
        h('mdj-fixture-mark', { for: 'analysis values' }),
      ]),
    ]);

    return [
      h('div', { class: 'queue-handoff__pair' }, [nowCard, rail, nextCard]),
      buildActions(next, nr),
    ];
  }
  function num(v, l) { return h('span', { class: 'queue-num' }, [h('span', { class: 'numeral', text: v }), h('span', { class: 'label', text: l })]); }

  function buildActions(next, nr) {
    const reasons = [];
    const act = (label, ic, enabled, reason, onClick, opts = {}) => {
      const b = button({
        label: opts.sent ? `${label} — sent` : label, icon: ic, cls: `${opts.cls || 'btn--secondary'} queue-act${opts.sent ? ' queue-act--sent' : ''}`, fr: opts.fr || ['FR-032'],
        attrs: enabled ? {} : { 'aria-disabled': 'true', 'aria-label': `${label} — unavailable: ${reason}` },
        on: { click: () => { if (!enabled) { say(`${label} is unavailable: ${reason}`); return; } onClick(); } },
      });
      if (!enabled && reason && !reasons.includes(`${label}: ${reason}`)) reasons.push(`${label}: ${reason}`);
      if (opts.sent) b.appendChild(h('span', { class: 'queue-sent label', 'aria-hidden': 'true', text: 'SENT' }));
      return b;
    };
    const missing = next.availability === 'missing';
    const btns = [];
    if (view.inspect) btns.push(act('Close inspect', 'chevron-up', true, '', () => { if (s === 'inspect-next') ctx.setState('ready'); else { view.inspect = false; paint(); } }, { cls: 'btn--secondary' }));
    else btns.push(act('Inspect next', 'info', true, '', () => { if (s === 'ready') ctx.setState('inspect-next'); else { view.inspect = true; paint(); } }, { cls: 'btn--secondary' }));

    if (committed) {
      btns.push(act('Skip', 'chevron-right', false, 'the transition to COPPER SKY is committed; Stop automation to take over', null));
      btns.push(act('Cancel transition', 'cancel', !view.cancelSent, 'already sent', () => {
        view.cancelSent = true; paint();
        say('Cancel transition sent — waiting for the engine. Nothing has started yet; if the blend begins first, faders hold where they are.');
        setTimeout(() => { flash = { tone: 'ok', icon: 'check', title: 'Transition cancelled before it started (queue revision 43, fixture).', body: 'Nothing was heard. COPPER SKY stays cued on Deck B; automix will mix at the marked exit unless you change it.' }; if (ctx.state === s) ctx.setState('ready'); }, 900);
      }, { sent: view.cancelSent }));
    } else {
      btns.push(act(missing ? 'Skip BRASS CANYON' : 'Skip', 'chevron-right', !view.skipSent, 'already sent', () => {
        if (missing) { flash = { tone: 'ok', icon: 'check', title: 'BRASS CANYON skipped (queue revision 43, fixture).', body: 'It moved to the end of the queue with its cues kept. COPPER SKY is next and ready.' }; ctx.setState('ready'); return; }
        view.skipSent = true; paint();
        say(`Skip ${next.title} sent — waiting for the queue to confirm.`);
        setTimeout(() => {
          const id = view.order.splice(1, 1)[0]; view.order.push(id); view.revision += 1; view.skipSent = false;
          view.notice = { tone: 'ok', icon: 'check', title: `${T(id).title} skipped (queue revision ${view.revision}, fixture).`, body: `It moved to the end of the queue. ${T(nextId()).title} is next.` };
          paint(); say(view.notice.title);
        }, 700);
      }, { sent: view.skipSent }));
      btns.push(act('Cancel transition', 'cancel', false, 'no transition is committed yet', null));
      const canStart = automixOn && nr.ok;
      const why = !automixOn ? 'automix is off' : missing ? 'the next track is missing' : 'the next track is not ready for an automatic mix';
      btns.push(act('Start transition at next phrase', 'arm', canStart, why, () => ctx.setState('committed-transition'), { cls: 'btn--primary' }));
    }
    return h('div', { class: 'queue-handoff__actions' }, [
      h('div', { class: 'queue-actions' }, btns),
      reasons.length ? h('ul', { class: 'queue-reasons body muted' }, reasons.map((r) => h('li', {}, [icon('info', { size: 12 }), h('span', { text: r })]))) : null,
    ]);
  }

  // ---------------------------------------------------------------- transition settings
  function buildSettings() {
    const locked = committed;
    const tempoBlocked = s === 'tempo-mismatch' && nextId() === 'calypso';
    const sec = h('section', { class: 'queue-settings glass queue-fixture', 'aria-label': 'Transition to next' });
    const lockReason = 'the transition is committed; Stop automation to take over';
    const typeGroup = h('div', { class: 'queue-seg', role: 'radiogroup', 'aria-label': 'Transition type' }, TYPES.map((ty) => h('button', {
      type: 'button', role: 'radio', class: `queue-seg__btn${view.type === ty.id ? ' is-on' : ''}`, 'aria-checked': String(view.type === ty.id),
      'aria-label': `Transition type ${ty.label}${locked ? ', locked' : ''}`, 'aria-disabled': locked ? 'true' : null, dataset: { hit: '48', fr: 'FR-032' },
      on: { click: () => { if (locked) { say(`Locked: ${lockReason}`); return; } if (view.type === ty.id) return; view.type = ty.id; sendSettings(`Type ${ty.label}`); } },
    }, [icon(ty.id === 'cut' ? 'segment' : ty.id === 'fade' ? 'crossfader' : 'transition-exit', { size: 16 }), h('span', { text: ty.label })])));

    const idx = QX.barOptions.indexOf(view.bars);
    const cut = view.type === 'cut';
    const durOff = locked || cut;
    const step = (dir) => {
      const to = QX.barOptions[idx + dir];
      const name = dir < 0 ? 'Shorter transition' : 'Longer transition';
      const ok = !durOff && to != null;
      return h('button', {
        type: 'button', class: 'btn btn--secondary queue-step', dataset: { hit: '48', fr: 'FR-032' },
        'aria-label': ok ? `${name}, ${to} bars` : `${name} unavailable: ${locked ? lockReason : cut ? 'a cut has no duration' : 'at the limit'}`,
        'aria-disabled': ok ? null : 'true',
        on: { click: () => { if (!ok) return; view.bars = to; sendSettings(`Duration ${to} bars`); } },
      }, [icon(dir < 0 ? 'minus' : 'plus', { size: 18 })]);
    };
    const tempoOff = locked || tempoBlocked || cut;
    const tempo = h('button', {
      type: 'button', role: 'switch', class: `queue-switch queue-switch--small raised${view.tempoMatch && !tempoBlocked ? ' is-on' : ''}`, 'aria-checked': String(view.tempoMatch && !tempoBlocked),
      'aria-label': 'Tempo match', 'aria-disabled': tempoOff ? 'true' : null, dataset: { hit: '48', fr: 'FR-016' },
      on: { click: () => { if (tempoOff) { say(tempoBlocked ? 'Tempo match unavailable: beyond the pitch range' : locked ? `Locked: ${lockReason}` : 'A cut does not tempo-match'); return; } view.tempoMatch = !view.tempoMatch; sendSettings(`Tempo match ${view.tempoMatch ? 'on' : 'off'}`); } },
    }, [
      h('span', { class: 'queue-switch__text' }, [h('span', { class: 'label label-strong', text: 'Tempo match' }), h('span', { class: 'queue-switch__word', text: view.tempoMatch && !tempoBlocked ? 'On' : 'Off' })]),
      h('span', { class: 'queue-switch__track', 'aria-hidden': 'true' }, [h('span', { class: 'queue-switch__knob titanium' })]),
    ]);
    const next = T(nextId());
    const tempoNote = tempoBlocked ? `${fmt.bpm(next.bpm)} vs ${fmt.bpm(current.bpm)} BPM is beyond ±${QX.pitchRangePct} % — manual only`
      : cut ? 'Not used for a cut'
        : next.analysis === 'complete' ? `Deck B follows ${fmt.bpm(current.bpm)} BPM; key lock on` : 'Needs a grid — analysis pending';

    sec.append(...[
      h('div', { class: 'queue-settings__head' }, [
        h('h2', { class: 'label label-strong', text: 'Transition to next' }),
        locked ? h('span', { class: 'queue-flag tone-info label' }, [icon('lock', { size: 12 }), 'Locked · committed']) : null,
        view.settingsSent ? h('span', { class: 'queue-sent label', text: 'SENT' }) : null,
      ]),
      locked ? h('p', { class: 'body queue-settings__lock', text: `Edits to the next item are blocked: ${lockReason}.` }) : null,
      !automixOn ? h('p', { class: 'body muted', text: 'Kept for when automix is on. With automix off you mix by hand.' }) : null,
      s === 'missing-next' ? h('p', { class: 'body muted', text: 'Applies once a ready track is next.' }) : null,
      h('div', { class: 'queue-settings__row' }, [h('span', { class: 'label', text: 'Type' }), typeGroup]),
      h('p', { class: 'body muted queue-settings__note', text: TYPES.find((x) => x.id === view.type).note }),
      h('div', { class: 'queue-settings__row queue-settings__row--inline' }, [
        h('span', { class: 'label', text: 'Duration' }),
        h('div', { class: 'queue-stepper' }, [step(-1), h('span', { class: 'queue-stepper__val numeral ink-backing', text: cut ? '—' : `${view.bars} bars` }), step(1)]),
      ]),
      h('div', { class: 'queue-settings__row queue-settings__row--inline' }, [tempo, h('p', { class: `body queue-settings__tempo${tempoBlocked ? ' tone-warning' : ' muted'}`, text: tempoNote })]),
    ].filter(Boolean));
    return sec;
  }
  function sendSettings(what) {
    view.settingsSent = true; paint();
    say(`${what} sent — waiting for the engine.`);
    setTimeout(() => { view.settingsSent = false; view.revision += 1; paint(); say(`${what} — acknowledged at queue revision ${view.revision} (fixture).`); }, 650);
  }

  // ---------------------------------------------------------------- inspect next
  function buildInspect() {
    const next = T(nextId());
    const info = QX.next[next.id];
    const checks = info?.checks || genericChecks(next);
    const analysed = next.analysis === 'complete';
    const sameTempo = analysed && next.bpm === current.bpm;
    const tempoLine = !analysed ? 'Tempo unknown — analysis pending'
      : sameTempo ? `Tempo ${fmt.bpm(next.bpm)} = ${fmt.bpm(current.bpm)} · no pitch change`
        : `Tempo ${fmt.bpm(next.bpm)} vs ${fmt.bpm(current.bpm)} · ${(((current.bpm / next.bpm) - 1) * 100).toFixed(1).replace('-', '−')} % on Deck B`;
    const keyLine = !analysed ? 'Key unknown' : next.key === current.key ? `Key ${current.key} → ${next.key} · same key` : `Key ${current.key} → ${next.key}`;
    return h('section', { class: 'queue-inspect glass', 'aria-label': `Inspect next: ${next.title}` }, [
      h('div', { class: 'queue-inspect__head' }, [
        h('mdj-art', { seed: next.id, size: 56, label: next.title }),
        h('div', { class: 'queue-inspect__title' }, [
          h('p', { class: 'label', text: 'Inspect next' }),
          h('h2', { class: 'title wrap-2', text: next.title }),
          h('p', { class: 'body muted truncate', text: next.artist }),
        ]),
      ]),
      h('div', { class: 'queue-inspect__cmp ink-backing queue-fixture' }, [
        h('p', { class: 'numeral', text: tempoLine }),
        h('p', { class: 'numeral', text: keyLine }),
        h('p', { class: 'numeral', text: `Exit ${fmt.time(QX.currentExitSec)} on A → intro ${info?.introMarkerSec != null ? fmt.time(info.introMarkerSec) : '—'} on B` }),
        h('mdj-fixture-mark', { for: 'analysis and markers' }),
      ]),
      h('ul', { class: 'queue-checks', 'aria-label': 'Readiness checks' }, checks.map((c) => h('li', { class: `queue-check${c.ok ? '' : ' queue-check--no'}` }, [
        h('span', { class: `queue-check__mark tone-${c.ok ? 'ok' : 'critical'}`, 'aria-hidden': 'true' }, [icon(c.ok ? 'check' : 'unavailable', { size: 14 })]),
        h('span', { class: 'body', text: `${c.ok ? '' : 'Not ready: '}${c.text}` }),
      ]))),
      h('div', { class: 'queue-actions' }, [
        button({ label: `Open ${next.title} in Prepare`, icon: 'edit', cls: 'btn--ghost', fr: ['FR-033'], on: { click: () => ctx.navigate('prep/track') } }),
      ]),
    ]);
  }
  function genericChecks(t) {
    const out = [];
    out.push(t.availability === 'ready' ? { ok: true, text: 'File on this phone' } : { ok: false, text: t.availability === 'missing' ? 'file missing' : t.availability });
    out.push(t.analysis === 'complete' ? { ok: true, text: `Analysis complete · grid confidence ${t.gridConfidence}` } : { ok: false, text: 'analysis pending — no grid for an automatic blend' });
    out.push({ ok: true, text: 'Loads to Deck B at the exit, replacing COPPER SKY (paused, not audible)' });
    return out;
  }

  // ---------------------------------------------------------------- queue list
  function buildListHead() {
    const notReady = view.order.slice(1).filter((id, i) => { const st = itemState(id, i + 2).state; return st === 'not-ready' || st === 'missing'; }).length;
    return [
      h('mdj-section-header', { title: 'Queue', count: String(view.order.length), note: `Revision ${view.revision} · ${notReady ? `${notReady} not ready` : 'all ready'}`, level: '2' }),
      h('p', { class: 'body muted queue-list__hint', text: committed ? 'Positions 1 and 2 are protected while the transition is committed. Later items can still move.' : 'Drag a handle or use Move up / Move down. The engine confirms each move; position 1 is protected.' }),
    ];
  }
  function buildList() {
    const total = view.order.length;
    return view.order.map((id, i) => {
      const pos = i + 1;
      const st = itemState(id, pos);
      return h('mdj-queue-item', {
        track: id, position: String(pos), total: String(total), state: st.state, deck: st.deck || null,
        reason: st.reason || null, transition: st.transition || null, bars: st.bars != null ? String(st.bars) : null,
        sent: view.sent.has(id) ? true : null,
      });
    });
  }

  listEl.addEventListener('mdj:queue-move', (e) => {
    const { trackId, from, to, via } = e.detail;
    if (via === 'handle') {
      if (e.detail.phase === 'start') say(`Dragging ${T(trackId).title}. Release over a new position, or use Move up / Move down.`);
      return;
    }
    if (to == null) return;
    const title = T(trackId).title;
    if (to === 1) { say(`Not sent: position 1 is ${current.title}, playing on Deck A and protected.`); notice('neutral', 'lock', `Not sent: position 1 is protected.`, `${current.title} is playing on Deck A. Nothing can move ahead of it.`); return; }
    if (committed && (to <= 2 || from <= 2)) { notice('neutral', 'lock', 'Not sent: the next item is committed.', `${title} can move to position 3 or later. To change the next track now, use Stop automation.`); return; }
    const idx = from - 1;
    const [moved] = view.order.splice(idx, 1);
    view.order.splice(to - 1, 0, moved);
    view.sent.add(moved);
    paint();
    say(`Move ${title} to position ${to} sent — waiting for the queue to confirm.`);
    setTimeout(() => {
      view.sent.delete(moved); view.revision += 1; paint();
      say(`${title} is at position ${to} — queue revision ${view.revision} acknowledged (fixture).`);
      const el = listEl.querySelector(`mdj-queue-item[track="${moved}"] .queue-item__move--${to < from ? 'up' : 'down'}`);
      el?.focus();
    }, 650);
  });
  function notice(tone, ic, title, body) { view.notice = { tone, icon: ic, title, body }; paint(); say(title); }

  root.addEventListener('mdj:stop-automation', () => {
    if (automixOn) { ctx.setState('takeover'); return; }
    say('Nothing to stop: automix is off and no plan is armed.');
  });

  paint();
  // Portrait: the Automix bar (switch + Stop automation) stays put above one scroller holding everything else.
  // Landscape: bar + now/next/settings on the left, the queue list in its own scroller on the right.
  const scroll = h('div', { class: 'queue__scroll' }, landscape ? [bannerEl, handoffEl, lowerEl, autoEl] : [bannerEl, handoffEl, lowerEl, listSec, autoEl]);
  const left = h('div', { class: 'queue__main' }, [barEl, scroll]);
  root.replaceChildren(...[left, landscape ? h('div', { class: 'queue__side' }, [listSec]) : null, live].filter(Boolean));
  // Inspect next opens below the now / next pair: bring it into view inside this screen's own scroller.
  if (view.inspect) requestAnimationFrame(() => { const el = lowerEl.firstElementChild; if (el) scroll.scrollTop = Math.max(0, el.offsetTop - scroll.offsetTop - 8); });
}
