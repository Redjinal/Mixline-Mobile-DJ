/** Time formatting and precise time entry. */
const pad = (n, width = 2) => String(n).padStart(width, '0');

export function formatTime(seconds, {ms = false} = {}) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60), whole = Math.floor(total % 60);
  const base = `${pad(minutes)}:${pad(whole)}`;
  return ms ? `${base}.${pad(Math.round((total - Math.floor(total)) * 1000), 3)}` : base;
}

export function formatRemaining(duration, position) {
  return '-' + formatTime(Math.max(0, (Number(duration) || 0) - (Number(position) || 0)));
}

/** Accepts "16.5", "01:16.125" or "1:02:03.004". Returns null for empty input; throws for malformed. */
export function parseTime(text) {
  const value = String(text ?? '').trim();
  if (!value) return null;
  if (!/^\d+(?::[0-5]?\d){0,2}(?:\.\d{1,3})?$/.test(value)) throw new Error('Enter a time like 01:16.125 or seconds like 16.5.');
  const [main, fraction = ''] = value.split('.');
  const parts = main.split(':').map(Number);
  const seconds = parts.reduce((total, part) => total * 60 + part, 0) + (fraction ? Number(`0.${fraction}`) : 0);
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Enter a valid time.');
  return Math.round(seconds * 1000) / 1000;
}

export const timeInput = seconds => (seconds == null || !Number.isFinite(Number(seconds))) ? '' : formatTime(seconds, {ms: true});
