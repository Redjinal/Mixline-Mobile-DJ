// <mdj-parday-arm-panel plan="P42" state="review|armed|executing|cancelled|expired|rejected" sent>
//
// The ARM step of a bounded ParDay performance plan (Document 13 "Authority and live-session behavior",
// "Engine-owned execution and cancellation", worked example P42; Document 03 §6; FR-048, FR-032).
// Arming is concrete and time-bounded: the panel names the decks and tracks, the outgoing exit marker
// and the incoming intro marker (mdj-marker glyphs), the duration in bars, the allowed tempo envelope,
// the gain ceiling, the start condition, the expiry, the bound state (stream epoch · deck generations ·
// master control revision) and the takeover rule. Once armed, the deterministic controller runs that
// plan; the model does not improvise further controls.
// Engine binding: "Arm this transition" emits mdj:parday-arm { action: 'arm', planId, bindings, digest };
// the screen turns it into ADMIT_AUTOMATION_BATCH (all-or-nothing). The engine's acknowledgement
// (automationId / automationRevision) is what moves the panel to `armed`. Cancel emits
// { action: 'cancel' } → CANCEL_AUTOMATION; the acknowledgement reports the effective frame.
// Units / range: bars (whole), BPM to 0.1, tempo tolerance in %, gain in dBFS / dB, positions m:ss.d,
// engine frames as grouped integers, countdown mm:ss. Expiry countdown and executing progress are
// FIXTURE values (marked); the real values come from the engine clock, never from UI animation.
// Gesture: tap on 48 dp buttons. Pending vs acknowledged: `sent` prints a dashed SENT badge on the Arm
// button ("arm request sent, waiting for the engine") and is visually distinct from `armed` (solid,
// brass rim, engine automation id printed). Nothing animates to imply success.
// States: review (not yet armed; Arm / Cancel) · armed (waiting for the start condition; Cancel) ·
// executing (labelled fixture progress against engine frames; Cancel) · cancelled / expired / rejected
// (say exactly what remains applied — audible history is never "undone"; Refresh proposal / Dismiss).
// Cancellation: Stop automation, touching an affected control, deck/route change, permission loss or
// expiry invalidates the engine revision; faders hold their value, nothing resets or jumps.
// Accessible: <section aria-labelledby> "Arm transition P42, deck A AURORA DRIVE to deck B COPPER SKY";
// facts as a definition list; "Arm this transition — P42, A to B, 16 bars".
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';
import { pardayFixture, trackTitle, secText, mmss, groupDigits } from './mdj-provenance-tag.js';

const STATES = ['review', 'armed', 'executing', 'cancelled', 'expired', 'rejected'];
const STATUS = {
  review:    { text: 'Review before arming', tone: 'info',     icon: ['arm', 'arm'] },
  armed:     { text: 'Armed',                tone: 'warning',  icon: ['arm', 'arm'] },
  executing: { text: 'Running',              tone: 'warning',  icon: ['play', 'play'] },
  cancelled: { text: 'Cancelled',            tone: 'neutral',  icon: ['x', 'x'] },
  expired:   { text: 'Expired',              tone: 'neutral',  icon: ['expiry', 'clock'] },
  rejected:  { text: 'Rejected',             tone: 'critical', icon: ['unavailable', 'unavailable'] },
};
let uid = 0;

export class MdjPardayArmPanel extends MdjElement {
  static tag = 'mdj-parday-arm-panel';
  static states = STATES;
  static fr = ['FR-048', 'FR-032'];
  static hit = 48;
  static fixture = true;
  static observed = ['plan', 'sent'];
  static samples = {
    default: { plan: 'P42', style: 'width:min(100%, 380px)' },
    variants: [{}],
  };

  ensureFixtureMark() {
    if (this.querySelector('mdj-fixture-mark')) return;
    const m = document.createElement('mdj-fixture-mark');
    m.setAttribute('for', 'arm plan: expiry countdown, engine frames and progress');
    m.setAttribute('inline', '');
    (this.querySelector('.parm__head') || this).appendChild(m);
  }

  render() {
    const data = pardayFixture(this);
    const id = this.attr('plan', 'P42');
    const state = STATES.includes(this.state) ? this.state : 'review';
    const sent = this.bool('sent') && state === 'review';
    delete this.dataset.hit;
    const plan = data?.plans?.[id];
    if (!plan) {
      this.className = 'parm parm--loading';
      this.replaceChildren(h('div', { class: 'parm__panel glass' }, [h('div', { class: 'parm__inner body muted', text: data ? `Plan ${id} is not in the fixture.` : 'Loading plan…' })]));
      return;
    }
    const sdef = STATUS[state];
    const st = plan.states?.[state] || {};
    const A = plan.from, B = plan.to;
    this.className = `parm parm--${state}${sent ? ' parm--sent' : ''}`;
    const titleId = `parm-${++uid}`;
    const fromTitle = trackTitle(A.trackId), toTitle = trackTitle(B.trackId);

    const head = h('header', { class: 'parm__head' }, [
      h('span', { class: 'parm__kind label' }, [icon(iconId('automix', 'arm'), { size: 14 }), h('span', { text: 'Arm transition' })]),
      h('span', { class: 'parm__id numeral', text: plan.id }),
      h('span', { class: `parm__status tone-${sdef.tone} label`, role: 'status' }, [icon(iconId(sdef.icon[0], sdef.icon[1]), { size: 12 }), h('span', { text: sdef.text })]),
    ]);

    // A → B with letters, titles and the two markers.
    const route = h('div', { class: 'parm__route', id: titleId, 'aria-label': `Transition ${plan.id}: deck ${A.deck} ${fromTitle} to deck ${B.deck} ${toTitle}, ${plan.bars} bars` }, [
      this.deckCell(A, 'Outgoing', 'exit'),
      h('span', { class: 'parm__arrow', 'aria-hidden': 'true' }, [
        h('span', { class: 'parm__bars numeral', text: `${plan.bars} bars` }),
        icon('chevron-right', { size: 18 }),
        h('span', { class: 'parm__secs numeral', text: `≈ ${plan.durationSec.toFixed(1)} s` }),
      ]),
      this.deckCell(B, 'Incoming', 'intro'),
    ]);

    const facts = h('dl', { class: 'parm__facts' });
    const row = (term, children, cls = '') => facts.appendChild(h('div', { class: 'parm__fact' }, [h('dt', { class: 'label', text: term }), h('dd', { class: `body ${cls}`.trim() }, children)]));
    const env = plan.tempoEnvelope;
    row('Duration', [h('span', { class: 'numeral', text: `${plan.bars} bars` }), ` at `, h('span', { class: 'numeral', text: `${plan.bpm.toFixed(1)} BPM` }), ` ≈ `, h('span', { class: 'numeral', text: `${plan.durationSec.toFixed(1)} s` })]);
    row('Tempo envelope', [`Deck ${env.deck} `, h('span', { class: 'numeral', text: `${env.minBpm.toFixed(1)}–${env.maxBpm.toFixed(1)} BPM` }), ` (±${env.tolerancePct} % of ${env.centerBpm.toFixed(1)}) · no key change`]);
    row('Gain ceiling', [`Master ≤ `, h('span', { class: 'numeral', text: `${plan.gainCeiling.masterDbfs.toFixed(1)} dBFS` }), ` · channel ${B.deck} ≤ `, h('span', { class: 'numeral', text: `${plan.gainCeiling.channelDb >= 0 ? '+' : ''}${plan.gainCeiling.channelDb.toFixed(1)} dB` })]);
    row('Strategy', [plan.strategy]);
    row('Start', [plan.startCondition]);
    const remaining = state === 'review' || state === 'armed' ? plan.remainingSec : null;
    row('Expiry', [h('span', { class: 'numeral', text: plan.expiresAt }), remaining != null ? h('span', { class: 'parm__countdown numeral', text: ` · ${mmss(remaining)} remaining` }) : h('span', { class: 'muted', text: state === 'expired' ? ' · reached' : ' · no longer counting' })]);
    row('Bound to', [h('span', { class: 'numeral parm__bound', text: `epoch ${plan.bindings.streamEpoch} · ${Object.entries(plan.bindings.deckGenerations).map(([d, g]) => `${d} gen ${g}`).join(' · ')} · master rev ${plan.bindings.masterControlRevision}` }), h('span', { class: 'muted', text: ` · analysis ${Object.entries(plan.bindings.analysisRevisions).map(([t, r]) => `${t} ${r}`).join(', ')} · digest ${plan.bindings.proposalDigest}` })]);
    row('Stop rule', [plan.stopBehaviour]);

    const takeover = h('p', { class: 'parm__takeover tone-warning', role: 'note' }, [icon(iconId('takeover', 'hand'), { size: 16 }), h('span', { class: 'body' }, [h('strong', { text: 'Touching an affected control cancels the plan. ' }), `Affected: ${plan.affectedControls.join(', ')}. The persistent Stop automation control cancels every armed ParDay action.`])]);

    const parts = [head, route, facts];

    if (state === 'armed') parts.push(this.note('warning', iconId('arm', 'arm'), 'Armed by the engine:', `${st.text || 'Armed'} · the plan runs without further prompts inside these limits.`));
    if (state === 'executing') parts.push(this.progress(plan, st));
    if (state === 'cancelled') parts.push(this.remains('neutral', 'x', `Cancelled ${st.at} — ${st.cause}.`, st.text, st.remains));
    if (state === 'expired') parts.push(this.remains('neutral', 'clock', `Expired ${st.at}.`, st.text, st.remains));
    if (state === 'rejected') parts.push(this.remains('critical', 'unavailable', `Rejected by the engine ${st.at}.`, st.reason, st.remains));
    if (state === 'review' || state === 'armed' || state === 'executing') parts.push(takeover);

    // ---- actions ----
    const actions = h('div', { class: 'parm__actions' });
    const btn = (action, label, ic, cls = '', name = label, held = false) => h('button', {
      type: 'button', class: `btn parm__btn parm__btn--${action} ${cls}`.trim(), dataset: { hit: '48' }, 'aria-label': name, 'aria-disabled': held ? 'true' : undefined,
      on: { click: () => { if (!held) this.emit('mdj:parday-arm', { action, planId: plan.id, bindings: plan.bindings, digest: plan.bindings.proposalDigest }); } },
    }, [icon(ic, { size: 18 }), h('span', { class: 'btn-label', text: label })]);
    if (state === 'review') {
      const arm = btn('arm', 'Arm this transition', 'arm', 'btn--primary parm__btn--primary', `Arm this transition — ${plan.id}, deck ${A.deck} to deck ${B.deck}, ${plan.bars} bars${sent ? ', sent, waiting for the engine' : ''}`, sent);
      if (sent) { arm.classList.add('parm__btn--sent'); arm.appendChild(h('span', { class: 'parm__sent label', text: 'SENT', 'aria-hidden': 'true' })); }
      actions.append(arm, btn('cancel', 'Cancel', iconId('cancel', 'x'), '', `Cancel — do not arm ${plan.id}`));
    } else if (state === 'armed' || state === 'executing') {
      actions.append(btn('cancel', 'Cancel', iconId('cancel', 'x'), 'btn--danger', `Cancel ${plan.id} — remaining events stop at the next control boundary; faders hold`));
    } else {
      actions.append(btn('refresh', 'Refresh proposal', 'refresh', 'btn--primary', `Refresh proposal ${plan.proposalId} — ask for a new preview bound to the current state`), btn('dismiss', 'Dismiss', iconId('dismiss', 'x')));
    }
    parts.push(actions);
    if (sent) parts.push(h('p', { class: 'parm__pending body', role: 'status', text: 'Arm request sent · waiting for the engine’s admission (all-or-nothing). Nothing is scheduled until it acknowledges.' }));

    const inner = h('div', { class: 'parm__inner' }, parts);
    const section = h('section', { class: 'parm__article', 'aria-labelledby': titleId }, [h('div', { class: 'parm__panel glass' }, [h('span', { class: 'parm__rim', 'aria-hidden': 'true' }), inner])]);
    this.replaceChildren(section);
  }

  deckCell(side, roleWord, which) {
    const m = side.marker;
    return h('div', { class: `parm__cell deck-${side.deck.toLowerCase()}` }, [
      h('span', { class: 'parm__role label', text: roleWord }),
      h('span', { class: 'parm__deckline' }, [h('span', { class: 'parm__deck', text: side.deck, 'aria-label': `Deck ${side.deck}` }), h('span', { class: 'parm__title title wrap-2', text: trackTitle(side.trackId) })]),
      h('span', { class: 'parm__marker' }, [
        h('mdj-marker', { kind: m.kind || 'cue', n: m.n, color: m.color || 'none', label: m.name, size: 20 }),
        h('span', { class: 'parm__marker-text' }, [h('span', { class: 'body', text: `${which === 'exit' ? 'Exit marker' : 'Intro marker'} · ${m.name} ` }), h('span', { class: 'numeral', text: `${secText(m.sec)} · bar ${m.bar}` })]),
      ]),
    ]);
  }
  note(tone, ic, label, text) {
    return h('div', { class: `parm__note tone-${tone}`, role: 'status' }, [icon(ic, { size: 16 }), h('span', { class: 'body' }, [h('strong', { text: `${label} ` }), text])]);
  }
  progress(plan, st) {
    const frac = st.totalFrames ? Math.min(1, Math.max(0, st.frame / st.totalFrames)) : 0;
    return h('div', { class: 'parm__exec' }, [
      h('div', { class: 'parm__progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': plan.bars, 'aria-valuenow': st.bar, 'aria-valuetext': `bar ${st.bar} of ${plan.bars}, engine frame ${groupDigits(st.frame)} of ${groupDigits(st.totalFrames)}, fixture value` }, [
        h('span', { class: 'parm__progress-track sunken', 'aria-hidden': 'true' }, [h('span', { class: 'parm__progress-fill', style: { width: `${frac * 100}%` } }), ...Array.from({ length: plan.bars - 1 }, (_, i) => h('span', { class: 'parm__progress-tick', style: { left: `${((i + 1) / plan.bars) * 100}%` } }))]),
        h('span', { class: 'parm__progress-text numeral', text: `bar ${st.bar} of ${plan.bars} · engine frame ${groupDigits(st.frame)} of ${groupDigits(st.totalFrames)}` }),
      ]),
      h('p', { class: 'parm__exec-note body muted', text: `Started ${st.startedAt} · crossfader at ${Math.round(st.crossfader * 100)} % B · progress follows the engine clock, not this drawing.` }),
    ]);
  }
  remains(tone, ic, lead, text, remains = []) {
    return h('div', { class: `parm__remains tone-${tone}`, role: 'status' }, [
      h('p', { class: 'body' }, [icon(ic, { size: 16 }), h('strong', { text: `${lead} ` }), text || '']),
      h('p', { class: 'label', text: 'What remains applied' }),
      h('ul', { class: 'parm__remains-list body' }, remains.map((r) => h('li', { text: r }))),
      h('p', { class: 'body muted', text: 'Anything already heard stays heard; recovery is a new controlled action, not an undo.' }),
    ]);
  }
}
define(MdjPardayArmPanel);
