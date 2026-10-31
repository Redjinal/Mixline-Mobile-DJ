// <mdj-parday-input value="…" placeholder="…" mode="prepare|perform" reason="…"
//                   state="idle|typing|sending|disabled|offline">
//
// The typed ParDay input: a text field, a 48 dp Send button and a Voice button that is VISIBLY OFF with
// a one-line explanation (Document 03 §6: voice is optional and explicitly started; microphone
// permission for ParDay is separate in meaning from sending a microphone to the master or a broadcast;
// spoken replies are off in Perform and never injected into the master; no always-listening). Typed and
// touch controls are the complete alternative; this prototype listens to nothing. FR-048, FR-040.
// Engine binding: none. Send emits mdj:parday-send { text, mode }; Cancel emits mdj:parday-cancel;
// Voice emits mdj:parday-voice { intent: 'explain' } so the screen can show the permission explanation
// — it never starts a capture.
// Units / range: text; the length counter prints characters against the proposed capped request size
// (fixture 600). Gesture: type, tap Send (Enter also sends; Shift+Enter breaks a line).
// States: idle (empty field) · typing (draft kept; Send active) · sending (field read-only, dashed SENT
// badge on Send, Cancel available — acknowledged by the message list, not here) · disabled (`reason`
// printed: cost limit, thermal pause, unavailable model; field and Send held) · offline (Send still
// works — local tools answer; the notice says which capabilities wait for the network).
// Pending vs acknowledged: SENT is dashed and transient; the delivered message appears in the
// conversation with a solid timestamp. Cancellation: Cancel stops future work; already-applied changes
// are named by the next message. Accessible: labelled textbox "Message ParDay", "Send message",
// "Voice is off — separate microphone permission; nothing is listening" (aria-pressed=false).
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';

const STATES = ['idle', 'typing', 'sending', 'disabled', 'offline'];
const MAX = 600;
let uid = 0;

export class MdjPardayInput extends MdjElement {
  static tag = 'mdj-parday-input';
  static states = STATES;
  static fr = ['FR-048', 'FR-040'];
  static hit = 48;
  static fixture = false;
  static observed = ['value', 'placeholder', 'mode', 'reason'];
  static samples = {
    default: { style: 'width:100%' },
    variants: [{}],
    typing: { value: 'Suggest a 16-bar blend from A into B at the next marked exit; keep the vocals separate.' },
    sending: { value: 'Find a compatible next track after COPPER SKY.' },
    disabled: { reason: 'Daily AI limit reached — 40 of 40 requests. New model requests are blocked until tomorrow; local search, saved proposals and every manual control keep working.' },
    offline: { mode: 'perform' },
  };

  render() {
    const state = STATES.includes(this.state) ? this.state : 'idle';
    const mode = this.attr('mode', 'prepare') === 'perform' ? 'perform' : 'prepare';
    const value = this.attr('value', '');
    const reason = this.attr('reason', '');
    const placeholder = this.attr('placeholder', mode === 'perform' ? 'Ask about the next track or this route' : 'Ask about your library, cues or route');
    delete this.dataset.hit;
    this.className = `pinput pinput--${state} pinput--${mode}`;
    const fieldId = `pinput-field-${++uid}`;
    const held = state === 'disabled';
    const sending = state === 'sending';

    const notices = [];
    if (state === 'disabled') notices.push(this.notice('warning', iconId('cost-limit', 'warning'), reason || 'ParDay requests are paused.'));
    if (state === 'offline') notices.push(this.notice('info', iconId('local-only', 'cloud-off'), 'Local only — answered from saved analysis and app help; no cloud request is made. Crate building, cue drafting and lookups wait for the network.'));

    const field = h('textarea', {
      id: fieldId, class: 'pinput__field', rows: 1, placeholder, 'aria-label': 'Message ParDay', 'aria-describedby': `${fieldId}-voice`, maxlength: MAX,
      readonly: sending ? true : null, disabled: held ? true : null,
      on: {
        input: (e) => { const n = e.target.value.length; const c = this.querySelector('.pinput__count'); if (c) c.textContent = `${n} / ${MAX}`; this.classList.toggle('pinput--has-text', n > 0); this.autosize(e.target); },
        keydown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !held && !sending) { e.preventDefault(); this.send(); } },
      },
    });
    field.value = value;

    const voice = h('button', {
      type: 'button', class: 'pinput__voice', 'aria-pressed': 'false', dataset: { hit: '48' },
      'aria-label': 'Voice is off — separate microphone permission; nothing is listening. Opens the explanation.',
      on: { click: () => this.emit('mdj:parday-voice', { intent: 'explain', mode }) },
    }, [
      h('span', { class: 'pinput__voice-face raised', 'aria-hidden': 'true' }, [icon('mic', { size: 18 }), h('span', { class: 'pinput__voice-strike' })]),
      h('span', { class: 'pinput__voice-text label', text: 'Voice off' }),
    ]);

    const send = h('button', {
      type: 'button', class: `btn btn--primary pinput__send${sending ? ' pinput__send--sent' : ''}`, dataset: { hit: '48' },
      'aria-label': sending ? 'Send message — sent, waiting for ParDay' : held ? 'Send message — unavailable' : 'Send message',
      'aria-disabled': held || sending ? 'true' : undefined,
      on: { click: () => { if (!held && !sending) this.send(); } },
    }, [icon('arrow-up', { size: 18 }), h('span', { class: 'btn-label', text: 'Send' })]);
    if (sending) send.appendChild(h('span', { class: 'pinput__sent label', text: 'SENT', 'aria-hidden': 'true' }));

    // The wrapper is the 48 dp target (the textarea itself is one line high); a tap anywhere on it focuses the field.
    const fieldwrap = h('div', { class: 'pinput__fieldwrap raised', dataset: { hit: '48' }, on: { click: () => { if (!held) field.focus(); } } }, [field, h('span', { class: 'pinput__count numeral', 'aria-hidden': 'true', text: `${value.length} / ${MAX}` })]);
    const row = h('div', { class: 'pinput__row' }, [voice, fieldwrap, send]);
    if (sending) row.appendChild(h('button', {
      type: 'button', class: 'btn pinput__cancel', dataset: { hit: '48' }, 'aria-label': 'Cancel — stop this request; nothing already applied is hidden',
      on: { click: () => this.emit('mdj:parday-cancel', {}) },
    }, [icon(iconId('cancel', 'x'), { size: 18 }), h('span', { class: 'btn-label', text: 'Cancel' })]));

    const voiceNote = h('p', { class: 'pinput__voicenote', id: `${fieldId}-voice` }, [
      icon('mic', { size: 12 }),
      h('span', { class: 'body muted', text: mode === 'perform'
        ? 'Voice is off: separate microphone permission, nothing is listening, spoken replies are off in Perform and never go to the master.'
        : 'Voice is off: it needs a separate microphone permission and an explicit start; nothing is listening and replies are text.' }),
    ]);
    const status = sending ? h('p', { class: 'pinput__pending body', role: 'status', text: 'Sent · waiting for ParDay. The message appears in the conversation when it is acknowledged.' }) : null;
    this.replaceChildren(...[...notices, row, voiceNote, status].filter(Boolean));
    this.autosize(field);
    if (value) this.classList.add('pinput--has-text');
  }
  // Grow the field with its content (one to four lines); the engine never waits on this.
  autosize(field) {
    if (!field || !field.isConnected) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(148, Math.max(40, field.scrollHeight))}px`;
  }
  send() {
    const field = this.querySelector('.pinput__field');
    const text = (field?.value || '').trim();
    if (!text) return;
    this.emit('mdj:parday-send', { text, mode: this.attr('mode', 'prepare') });
  }
  notice(tone, ic, text) {
    return h('p', { class: `pinput__notice tone-${tone}`, role: 'status' }, [icon(ic, { size: 14 }), h('span', { class: 'body', text })]);
  }
}
define(MdjPardayInput);
