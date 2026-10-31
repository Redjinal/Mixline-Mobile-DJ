// parday/arm — the arm sheet for a bounded ParDay performance plan (Document 13 "Authority and live-session
// behavior", "Engine-owned execution and cancellation", worked example P42; Document 03 §6; FR-048, FR-032;
// AI-005, AI-008 bounded arming, AI-009 manual takeover, AI-011 accurate completion, AI-022 timely cancel).
//
// A shell screen: transport, crossfader, route and master stay in the dock. The arm panel
// (mdj-parday-arm-panel) names A→B, the exit and intro markers, bars, tempo envelope, gain ceiling, start
// condition, expiry, bound state and the takeover rule. "Arm this transition" first shows SENT (the arm
// request waits for the engine's all-or-nothing admission) and then the acknowledged `armed` state that the
// fixture declares. The persistent Stop automation control keeps the same place as on parday/perform.
//
// Cancelled-before-start: the component's `cancelled` state is drawn from the fixture's crossfader-takeover
// story (bar 6, frame 580 160), which does not match a Cancel pressed before the start condition. This
// screen therefore prints its own acknowledged receipt from fixtures/parday-screens.json for that state and
// keeps the plan facts visible as the reviewed (no longer armable) version; parday/perform:takeover-cancelled
// uses the component's cancelled state, where its story fits.
import { register } from '../../app/registry.js';
import { h, button, icon } from '../../components/base.js';
import { iconId } from '../../components/mdj-marker.js';
import { trackTitle } from '../../components/mdj-provenance-tag.js';
import { PS, PLAN, statePill, fixtureControl, ackLater, statusLine, say, notice, section, remainsList, liveWorld, deckLetter, pardayHead } from './perform.js';

const FR = ['FR-048', 'FR-032'];

const STATES = {
  review:    { label: 'Review before arming', exercised: true, scenario: 'a-playing', via: { from: 'parday/perform:read-propose', control: 'Arm transition — proposal P42, deck A to deck B' } },
  armed:     { label: 'Armed — waiting for the start condition', exercised: true, scenario: 'a-playing', via: { from: 'review', control: 'Arm this transition — P42, deck A to deck B, 16 bars' } },
  executing: { label: 'Executing — fixture progress against engine frames', exercised: true, scenario: 'transition', via: { from: 'armed', control: 'Fixture: plan starts' } },
  expired:   { label: 'Expired — proposal expired 20 s ago, Refresh', exercised: false, scenario: 'a-playing' },
  cancelled: { label: 'Cancelled before start — nothing heard', exercised: true, scenario: 'a-playing', via: { from: 'armed', control: 'Cancel P42 — remaining events stop at the next control boundary; faders hold' } },
};

function stop(ctx, st, line) {
  const el = h('mdj-stop-automation', { state: st, plan: st === 'idle' ? null : 'P42', count: st === 'idle' ? 0 : 1 });
  el.addEventListener('mdj:stop-automation', () => {
    if (st === 'idle') { say(line, 'Nothing to stop — P42 is not armed. Your controls are unchanged.', 'check'); return; }
    el.setAttribute('sent', '');
    if (st === 'armed') ackLater(ctx, () => ctx.setState('cancelled'));
    else ackLater(ctx, () => ctx.navigate('parday/perform', { state: 'stopped' }));
  });
  return h('div', { class: 'parday-stop' }, [el]);
}

function render(ctx) {
  const state = ctx.state;
  const line = statusLine();
  const backTarget = { armed: 'armed', executing: 'executing' }[state] || 'read-propose';
  const stopState = state === 'armed' ? 'armed' : state === 'executing' ? 'executing' : 'idle';

  if (state === 'executing') liveWorld(ctx, 'running', 'armed');
  else liveWorld(ctx, 'before', state === 'armed' ? 'armed' : state === 'review' ? 'proposal_ready' : 'ready');
  if (state === 'expired') {
    // 21:26:20: Deck A played on past Exit (5:09.7) because the plan was never armed; B is still cued.
    const A = ctx.session.decks.A;
    A.positionSec = 326.4; A.remainingSec = A.track ? Math.max(0, A.track.durationSec - A.positionSec) : 0;
  }

  const pillFor = { review: ['proposal_ready', 'P42'], armed: ['armed', 'P42'], executing: ['armed', 'P42 running'], expired: ['rejected', 'P42 expired'], cancelled: ['ready', 'P42 cancelled'] }[state];
  // The expired pill reads as text "Expired" via the extra word; the tone is neutral.
  const pill = state === 'expired'
    ? h('span', { class: 'parday-pill tone-neutral label', role: 'status' }, [icon(iconId('expiry', 'clock'), { size: 14 }), h('span', { text: 'Expired · P42' })])
    : statePill(pillFor[0], pillFor[1]);

  const head = pardayHead({ backLabel: 'Back to ParDay', onBack: () => ctx.navigate('parday/perform', { state: backTarget }), title: 'Arm transition', pill });

  const rail = [head, stop(ctx, stopState, line)];
  const main = [];

  if (state === 'review') {
    rail.push(notice('info', 'lock', 'Nothing is armed yet.', 'Arming authorises this one plan only — these decks, these 16 bars, these limits — until it runs, expires or you cancel it. A changed deck, route or affected control invalidates it.'));
  } else if (state === 'armed') {
    rail.push(notice('warning', iconId('arm', 'arm'), 'Armed by the engine.', 'P42 starts by itself when Deck A reaches Exit. Your hands win: touch an affected control or press Stop automation to cancel at once.'));
  } else if (state === 'executing') {
    rail.push(notice('warning', iconId('automix', 'arm'), 'Running.', 'The engine is executing P42 against its own clock. Any touch on an affected control or Stop automation cancels the remaining events; faders hold.'));
  } else if (state === 'expired') {
    const ex = PS.arm.expired;
    rail.push(h('div', { class: 'parday-expired', role: 'status' }, [
      icon(iconId('expiry', 'clock'), { size: 22 }),
      h('p', { class: 'body' }, [h('strong', { text: ex.headline }), h('span', { class: 'muted', text: ` · now ${ex.now} (fixture clock)` })]),
    ]));
  } else if (state === 'cancelled') {
    const cb = PS.arm.cancelledBeforeStart;
    rail.push(notice('neutral', iconId('cancel', 'x'), 'Cancelled.', cb.text));
  }

  if (state === 'cancelled') {
    const cb = PS.arm.cancelledBeforeStart;
    main.push(section('What remains applied', [
      remainsList(cb.remains),
      h('p', { class: 'body muted', text: 'Cancelling did not move any fader or reset any value. To try again, ask for a fresh proposal bound to the decks as they are now.' }),
    ], { fixtureFor: 'cancellation acknowledgement' }));
    const A = PLAN.from, B = PLAN.to;
    main.push(h('section', { class: 'parday-section ink-backing parday-plan-was', 'aria-label': 'The plan you cancelled' }, [
      h('h3', { class: 'parday-section__title label', text: 'The plan you cancelled — no longer armable' }),
      h('p', { class: 'parday-plan-was__line body' }, [deckLetter(A.deck), h('strong', { text: ` ${trackTitle(A.trackId)} ` }), '→ ', deckLetter(B.deck), h('strong', { text: ` ${trackTitle(B.trackId)} ` }), h('span', { class: 'numeral', text: `· ${PLAN.bars} bars · ≈ ${PLAN.durationSec.toFixed(1)} s · authority ended` })]),
    ]));
    main.push(h('div', { class: 'parday-row' }, [
      button({ label: 'Refresh proposal', icon: 'refresh', hit: 48, cls: 'btn--primary', fr: FR, on: { click: (e) => { e.currentTarget.dataset.state = 'pending'; e.currentTarget.setAttribute('aria-disabled', 'true'); say(line, PS.perform.refreshSent, 'refresh'); } } }),
      button({ label: 'Return to the decks', icon: 'chevron-left', hit: 48, cls: 'btn--secondary', fr: ['FR-048'], on: { click: () => ctx.navigate('perform/ab') } }),
    ]));
  } else {
    const panel = h('mdj-parday-arm-panel', { plan: 'P42', state });
    panel.addEventListener('mdj:parday-arm', (e) => {
      const a = e.detail.action;
      if (a === 'arm') { panel.setAttribute('sent', ''); ackLater(ctx, () => ctx.setState('armed')); }
      else if (a === 'cancel') {
        if (state === 'review') ctx.navigate('parday/perform', { state: 'read-propose' });
        else if (state === 'armed') ackLater(ctx, () => ctx.setState('cancelled'), 300);
        else ackLater(ctx, () => ctx.navigate('parday/perform', { state: 'stopped' }), 300);
      } else if (a === 'refresh') say(line, PS.perform.refreshSent, 'refresh');
      else if (a === 'dismiss') ctx.navigate('perform/ab');
    });
    main.push(panel);
    if (state === 'armed') main.push(fixtureControl('Fixture: plan starts', () => ctx.setState('executing'), 'Prototype only — stands in for Deck A reaching Exit'));
  }

  return h('div', { class: `parday-perform parday-arm parday-arm--${state}`, dataset: { orientation: ctx.orientation } }, [
    h('div', { class: 'parday-perform__rail' }, rail),
    h('div', { class: 'parday-perform__main' }, [...main, line]),
  ]);
}

register({
  id: 'parday/arm',
  family: 'parday',
  title: 'ParDay — Arm transition',
  order: 3,
  fr: ['FR-048', 'FR-032'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: STATES,
  defaultState: 'review',
  render,
});
