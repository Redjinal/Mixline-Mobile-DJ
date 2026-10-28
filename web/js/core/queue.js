/** Challenge "Up next" queue of video references with undo, reorder, skip/restore and persistence. */
import {parseYouTubeURL} from './video.js';

const KEY = 'challenge-queue';
const STATES = new Set(['queued', 'ready', 'buffering', 'blocked', 'playing']);
const toSeconds = value => { if (value === '' || value == null) return 0; const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new Error('Enter a start time of zero seconds or more.'); return Math.round(n * 1000) / 1000; };
const cleanTitle = (value, fallback) => String(value ?? '').trim().slice(0, 120) || fallback;

export function createQueue({store, key = KEY} = {}) {
  let items = [], skipped = [];
  const undoStack = [];
  const normalise = raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.videoId !== 'string') return null;
    try { parseYouTubeURL(raw.videoId); } catch { return null; }
    return {id: String(raw.id || globalThis.crypto.randomUUID()), videoId: raw.videoId, title: cleanTitle(raw.title, raw.videoId), artist: String(raw.artist || '').slice(0, 120), start: Number(raw.start) > 0 ? Number(raw.start) : 0, loop: !!raw.loop, state: STATES.has(raw.state) ? raw.state : 'queued', error: '', added: Number(raw.added) || Date.now(), source: 'video'};
  };
  async function persist() { if (store) await store.setSetting(key, {items, skipped}); }
  const api = {
    get items() { return items; },
    get skipped() { return skipped; },
    get(id) { return items.find(x => x.id === id) || skipped.find(x => x.id === id) || null; },
    async init() {
      if (!store) return api;
      const saved = await store.getSetting(key, null);
      items = (Array.isArray(saved?.items) ? saved.items : []).map(normalise).filter(Boolean).map(x => ({...x, state: 'queued'}));
      skipped = (Array.isArray(saved?.skipped) ? saved.skipped : []).map(normalise).filter(Boolean);
      return api;
    },
    async add({url, videoId, title, start = 0, loop = false, artist = ''} = {}) {
      const id = parseYouTubeURL(videoId || url || '');
      const item = normalise({id: globalThis.crypto.randomUUID(), videoId: id, title: cleanTitle(title, id), artist, start: toSeconds(start), loop});
      items.push(item); undoStack.length = 0;
      await persist();
      return item;
    },
    async remove(id) {
      const index = items.findIndex(x => x.id === id);
      if (index < 0) return null;
      const [item] = items.splice(index, 1);
      undoStack.push({type: 'remove', item, index});
      await persist();
      return item;
    },
    async undo() {
      const action = undoStack.pop();
      if (!action) return null;
      if (action.type === 'remove') { items.splice(Math.min(action.index, items.length), 0, action.item); await persist(); return action.item; }
      if (action.type === 'clear') { items = [...action.items, ...items]; await persist(); return action.items; }
      return null;
    },
    async move(id, direction) {
      const i = items.findIndex(x => x.id === id), j = i + Math.sign(direction);
      if (i < 0 || j < 0 || j >= items.length) return false;
      [items[i], items[j]] = [items[j], items[i]];
      await persist();
      return true;
    },
    async rename(id, title) { const item = api.get(id); if (!item) return; item.title = cleanTitle(title, item.videoId); await persist(); },
    async setStart(id, start) { const item = api.get(id); if (!item) return; item.start = toSeconds(start); await persist(); },
    async setLoop(id, enabled) { const item = api.get(id); if (!item) return; item.loop = !!enabled; await persist(); },
    setState(id, state, error = '') { const item = api.get(id); if (!item || !STATES.has(state)) return; item.state = state; item.error = error; },
    async skip(id) { const index = items.findIndex(x => x.id === id); if (index < 0) return; const [item] = items.splice(index, 1); skipped.push(item); await persist(); },
    async restore(id) { const index = skipped.findIndex(x => x.id === id); if (index < 0) return; const [item] = skipped.splice(index, 1); item.state = 'queued'; items.push(item); await persist(); },
    async clear() { if (!items.length) return; undoStack.push({type: 'clear', items: [...items]}); items = []; await persist(); },
    async shift() { const item = items.shift() || null; if (item) await persist(); return item; },
    peek() { return items[0] || null; }
  };
  return api;
}
