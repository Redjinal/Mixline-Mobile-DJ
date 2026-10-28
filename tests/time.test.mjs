import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTime, parseTime, timeInput, formatRemaining} from '../web/js/core/time.js';

test('formatTime renders minutes and seconds, optionally milliseconds', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(76.125), '01:16');
  assert.equal(formatTime(76.125, {ms: true}), '01:16.125');
  assert.equal(formatTime(3723), '62:03');
  assert.equal(formatTime(NaN), '00:00');
  assert.equal(formatTime(-4), '00:00');
});
test('formatRemaining prefixes a minus sign', () => {
  assert.equal(formatRemaining(130, 10), '-02:00');
  assert.equal(formatRemaining(10, 12), '-00:00');
});
test('precise times accept seconds and clock values but reject malformed input', () => {
  assert.equal(parseTime('01:16.125'), 76.125);
  assert.equal(parseTime('1:02:03.004'), 3723.004);
  assert.equal(parseTime('16.5'), 16.5);
  assert.equal(parseTime(''), null);
  for (const value of ['-1', '01:60', 'NaN', '1e3', '10<script>']) assert.throws(() => parseTime(value), value);
  assert.equal(timeInput(76.125), '01:16.125');
  assert.equal(timeInput(null), '');
});
