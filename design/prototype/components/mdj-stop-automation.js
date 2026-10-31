// <mdj-stop-automation state="idle|armed|executing" plan="P42" count="1" compact size="56">
//
// The persistent Stop Automation control (Document 13 "pressing a persistent Stop Automation control
// cancels all armed ParDay actions"; Document 03 §6; AI-009; FR-048, FR-032). It is high-contrast,
// always the same size and position, and reads as text: "Stop automation" plus a second line that
// says what it would stop ("Nothing armed" / "P42 armed" / "P42 running"). It is never hidden while
// a plan is armed or running.
// Engine binding: one tap emits mdj:stop-automation { plans } → CANCEL_AUTOMATION through the engine's
// reserved cancellation capacity; the acknowledgement reports the effective frame after which no event
// of any armed plan can run. Faders hold their current value; nothing resets or jumps; audible history
// stays heard. The control shows acknowledged state only (the owning screen moves it back to idle when
// the cancellation is acknowledged) and never animates to imply success.
// Units / range: none; `count` is the number of armed / running ParDay actions. Gesture: single tap;
// no hold, no confirmation (manual takeover must be immediate). Hit 56 dp by default (48 with
// `compact`, for the landscape dock). Pending vs acknowledged: the screen may set `sent` to print a
// dashed SENT badge until the cancellation frame is acknowledged.
// Cancellation: n/a — this IS the cancellation path. Accessible: <button> "Stop automation — P42
// armed, 1 action"; aria-disabled is never set (idle presses are harmless and acknowledged as "nothing
// to stop").
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';

const STATES = ['idle', 'armed', 'executing'];

export class MdjStopAutomation extends MdjElement {
  static tag = 'mdj-stop-automation';
  static states = STATES;
  static fr = ['FR-048', 'FR-032'];
  static hit = 56;
  static fixture = false;
  static observed = ['plan', 'count', 'compact', 'size', 'sent'];
  static samples = {
    default: { plan: 'P42' },
    variants: [{}, { compact: true }],
    idle: { plan: '' },
    armed: { count: 1 },
    executing: { count: 1 },
  };

  render() {
    const state = STATES.includes(this.state) ? this.state : 'idle';
    const compact = this.bool('compact');
    const size = compact ? 48 : Math.max(48, this.num('size', 56));
    const plan = this.attr('plan', '');
    const count = Math.max(0, Math.round(this.num('count', state === 'idle' ? 0 : 1)));
    const sent = this.bool('sent');
    this.className = `stopauto stopauto--${state}${compact ? ' stopauto--compact' : ''}${sent ? ' stopauto--sent' : ''}`;
    this.style.setProperty('--size', `${size}px`);
    this.dataset.hit = String(size);
    const sub = state === 'idle' ? 'Nothing armed' : state === 'armed' ? `${plan || 'Plan'} armed${count > 1 ? ` · ${count} actions` : ''}` : `${plan || 'Plan'} running${count > 1 ? ` · ${count} actions` : ''}`;
    const name = `Stop automation — ${sub}${sent ? ', stop request sent, waiting for the engine' : ''}`;
    const btn = h('button', {
      type: 'button', class: 'stopauto__btn', 'aria-label': name, dataset: { hit: String(size) },
      on: { click: () => this.emit('mdj:stop-automation', { state, plan, count }) },
    }, [
      h('span', { class: 'stopauto__rim', 'aria-hidden': 'true' }),
      h('span', { class: 'stopauto__face' }, [
        h('span', { class: 'stopauto__glyph' }, [icon(iconId('stop-automation', 'stop'), { size: compact ? 18 : 22 })]),
        h('span', { class: 'stopauto__text' }, [
          h('span', { class: 'stopauto__label', text: 'Stop automation' }),
          compact ? null : h('span', { class: 'stopauto__sub label', text: sub }),
        ]),
      ]),
      sent ? h('span', { class: 'stopauto__sent label', text: 'SENT', 'aria-hidden': 'true' }) : null,
    ]);
    this.replaceChildren(btn);
  }
}
define(MdjStopAutomation);
