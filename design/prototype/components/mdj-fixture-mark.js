// <mdj-fixture-mark for="wave:aurora"> — the honesty badge.
// Rendered by every component that shows waveform, meter, level, progress or
// analysis data. It cannot be hidden by the state switcher; CSS uses !important.
import { MdjElement, define, h } from './base.js';

export class MdjFixtureMark extends MdjElement {
  static tag = 'mdj-fixture-mark';
  static states = ['default'];
  static hit = 0;
  static observed = ['for', 'inline'];
  render() {
    this.replaceChildren(h('span', { class: 'fixture-mark__text', text: 'FIXTURE' }));
    this.setAttribute('role', 'note');
    this.setAttribute('aria-label', `Fixture data: ${this.attr('for', 'not real audio or progress')}`);
    this.title = `Fixture data (${this.attr('for', 'prototype')}) — not measured audio, progress or analysis`;
  }
}
define(MdjFixtureMark);
