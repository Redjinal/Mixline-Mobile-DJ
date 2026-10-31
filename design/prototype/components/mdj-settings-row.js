// <mdj-settings-row kind="toggle|select|value|nav|action" name="keylock-default" label="Key lock on load"
//                   value="on|off|Equal power|+6.0 dB" detail="Applies to newly loaded tracks" unit="dB" icon="keylock"
//                   scope="Mixer settings" error="Storage full" dirty state="idle|dirty|disabled|error">
//
// One settings row (Document 04 §4 "Settings": explicit Save, dirty-state protection, preview / discard,
// scoped Reset; Document 03 §5: settings are drafts, performance controls are not). The row prints the
// DRAFT value; the dirty indicator (brass-ringed dot + the word "Unsaved") says it differs from the saved
// value until <mdj-save-bar> Save is acknowledged by the store.
// Engine binding: none directly — a saved setting reaches the engine as EngineCommand(set_config) from the
// settings screen after Save; this row only edits the draft (mdj:setting-change { name, value }).
//   toggle — role=switch button (48 dp) printing On / Off beside the knob (never colour alone)
//   select — button (48 dp) showing the current option with a chevron; opens the screen's option sheet
//   value  — button (48 dp) showing a numeral with its unit; opens numeric entry / stepper
//   nav    — the whole row is a button (48 dp) with a chevron: a sub-page
//   action — a scoped action button (48 dp), e.g. "Reset Mixer settings" (scoped Reset, never global)
// States: idle · dirty (unsaved draft) · disabled (aria-disabled, `detail` says why) · error (the last
// save of this row failed; `error` prints the reason and the draft is kept).
// Units / range: `unit` is printed after a numeric value; ranges are the owning screen's.
// Gesture: tap; toggle also Space / Enter. Pending vs acknowledged: dirty = draft, clean = saved; a
// value shown here is never "applied" until Save is acknowledged. Cancellation: Discard in the save bar.
// Accessible: "Key lock on load, switch, on, unsaved"; "Crossfader curve, Equal power, unsaved, button".
import { MdjElement, define, h, icon } from './base.js';

const KINDS = ['toggle', 'select', 'value', 'nav', 'action'];
let uid = 0;

export class MdjSettingsRow extends MdjElement {
  static tag = 'mdj-settings-row';
  static states = ['idle', 'dirty', 'disabled', 'error'];
  static fr = ['FR-038', 'FR-040'];
  static hit = 48;
  static fixture = false;
  static observed = ['kind', 'name', 'label', 'value', 'detail', 'unit', 'icon', 'scope', 'error', 'dirty'];
  static samples = {
    default: { style: 'width:100%' },
    variants: [
      { kind: 'toggle', name: 'keylock-default', label: 'Key lock on load', value: 'on', detail: 'Applies to newly loaded tracks', icon: 'keylock' },
      { kind: 'select', name: 'xf-curve', label: 'Crossfader curve', value: 'Equal power', detail: 'Linear · Equal power · Cut', icon: 'eq' },
      { kind: 'value', name: 'cue-gain', label: 'Headphone cue gain', value: '-3.0', unit: 'dB', detail: '−12 to +6 dB', icon: 'headphones' },
      { kind: 'nav', name: 'routes', label: 'Audio routes', value: 'USB Master + Cue', detail: 'Master, cue and sample rate', icon: 'route' },
      { kind: 'action', name: 'reset-mixer', label: 'Reset Mixer settings', detail: 'Resets this section only; your library is untouched', icon: 'undo', scope: 'Mixer settings' },
    ],
    dirty: { dirty: true },
    disabled: { detail: 'Unavailable: no cue route on the current output' },
    error: { error: 'Save failed: storage full. The draft is kept.' },
  };

  render() {
    const kindAttr = this.attr('kind', 'toggle');
    const kind = KINDS.includes(kindAttr) ? kindAttr : 'toggle';
    const name = this.attr('name', kind);
    const label = this.attr('label', 'Setting');
    const value = this.attr('value', '');
    const detail = this.attr('detail', '');
    const unit = this.attr('unit', '');
    const ic = this.attr('icon', '');
    const scope = this.attr('scope', '');
    const error = this.attr('error', '');
    const state = this.state;
    const dirty = this.bool('dirty') || state === 'dirty';
    const disabled = state === 'disabled';
    this.className = `settings-row settings-row--${kind} settings-row--${state}${dirty ? ' settings-row--dirty' : ''}`;
    delete this.dataset.hit; // the control (or the whole-row button) is the target
    // One id per instance: the same setting can be drawn more than once (gallery states, preview vs draft).
    this._uid ??= ++uid;
    const id = `settings-${name.replace(/\W+/g, '-')}-${this._uid}`;
    const on = value === 'on' || value === 'true';
    const dirtyText = dirty ? ', unsaved' : '';
    const disabledText = disabled ? `, unavailable${detail ? ': ' + detail : ''}` : '';

    const dirtyMark = dirty ? h('span', { class: 'settings-row__dirty', role: 'img', 'aria-label': 'Unsaved change' }, [h('span', { class: 'settings-row__dirty-dot brass-rim' }, [h('span', { class: 'settings-row__dirty-core' })]), h('span', { class: 'label', text: 'Unsaved' })]) : null;
    const text = h('div', { class: 'settings-row__text' }, [
      h('span', { class: 'settings-row__label title', id: `${id}-label`, text: label }),
      detail ? h('span', { class: `settings-row__detail ${disabled ? 'tone-warning' : 'muted'}`, id: `${id}-detail`, text: detail }) : null,
      state === 'error' && error ? h('span', { class: 'settings-row__error tone-critical', role: 'alert' }, [icon('warning', { size: 12 }), h('span', { text: error })]) : null,
    ]);
    const lead = ic ? h('span', { class: 'settings-row__icon', 'aria-hidden': 'true' }, [icon(ic, { size: 18 })]) : null;
    const change = (v) => { if (!disabled) this.emit('mdj:setting-change', { name, value: v, kind }); };

    let control = null, main;
    if (kind === 'toggle') {
      control = h('button', {
        type: 'button', role: 'switch', class: 'settings-row__switch', dataset: { hit: '48' }, 'aria-checked': String(on), 'aria-labelledby': `${id}-label`,
        'aria-describedby': detail ? `${id}-detail` : undefined, 'aria-disabled': disabled ? 'true' : undefined,
        on: { click: () => change(on ? 'off' : 'on') },
      }, [
        h('span', { class: 'settings-row__state label', text: on ? 'On' : 'Off' }),
        h('span', { class: `settings-row__track sunken${on ? ' settings-row__track--on' : ''}`, 'aria-hidden': 'true' }, [h('span', { class: 'settings-row__knob titanium' })]),
      ]);
    } else if (kind === 'select') {
      control = h('button', { type: 'button', class: 'settings-row__select raised', dataset: { hit: '48' }, 'aria-haspopup': 'listbox', 'aria-label': `${label}, ${value || 'not set'}${dirtyText}${disabledText}`, 'aria-disabled': disabled ? 'true' : undefined, on: { click: () => change(value) } }, [
        h('span', { class: 'settings-row__value truncate', text: value || '—' }), icon('chevron-down', { size: 16 }),
      ]);
    } else if (kind === 'value') {
      control = h('button', { type: 'button', class: 'settings-row__select settings-row__numeric raised', dataset: { hit: '48' }, 'aria-label': `${label}, ${value || '—'}${unit ? ' ' + unit : ''}${dirtyText}${disabledText}, edit`, 'aria-disabled': disabled ? 'true' : undefined, on: { click: () => change(value) } }, [
        h('span', { class: 'numeral', text: value || '—' }), unit ? h('span', { class: 'settings-row__unit label', text: unit }) : null, icon('edit', { size: 14 }),
      ]);
    } else if (kind === 'action') {
      control = h('button', { type: 'button', class: 'btn settings-row__action', dataset: { hit: '48' }, 'aria-label': `${label}${scope ? `, scope ${scope}` : ''}${disabledText}`, 'aria-disabled': disabled ? 'true' : undefined, on: { click: () => change(scope || 'action') } }, [
        ic ? icon(ic, { size: 16 }) : null, h('span', { class: 'btn-label', text: label }),
      ]);
    }

    if (kind === 'nav') {
      main = h('button', { type: 'button', class: 'settings-row__main settings-row__nav', dataset: { hit: '48' }, 'aria-label': `${label}${value ? ', ' + value : ''}${dirtyText}${disabledText}`, 'aria-disabled': disabled ? 'true' : undefined, on: { click: () => change('open') } }, [
        h('span', { class: 'settings-row__bar', 'aria-hidden': 'true' }), lead, text,
        h('span', { class: 'settings-row__side' }, [dirtyMark, value ? h('span', { class: 'settings-row__value settings-row__value--nav truncate', text: value }) : null, icon('chevron-right', { size: 18 })]),
      ]);
    } else if (kind === 'action') {
      main = h('div', { class: 'settings-row__main settings-row__main--action' }, [h('span', { class: 'settings-row__bar', 'aria-hidden': 'true' }), control, h('div', { class: 'settings-row__text settings-row__text--action' }, [detail ? h('span', { class: 'settings-row__detail muted', text: detail }) : null, state === 'error' && error ? h('span', { class: 'settings-row__error tone-critical', role: 'alert' }, [icon('warning', { size: 12 }), h('span', { text: error })]) : null])]);
    } else {
      main = h('div', { class: 'settings-row__main' }, [h('span', { class: 'settings-row__bar', 'aria-hidden': 'true' }), lead, text, h('span', { class: 'settings-row__side' }, [dirtyMark, control])]);
    }
    this.replaceChildren(main);
  }
}
define(MdjSettingsRow);
