/** Durable local library on IndexedDB. The database identity is unchanged from 4.0/5.0 so libraries survive updates. */
export const DB_NAME = 'mixline-studio-4';
export const DB_VERSION = 1;
export const STORES = ['tracks', 'sessions', 'settings', 'recordings'];
export const DEFAULT_COLLECTIONS = Object.freeze({favorites: [], recents: [], crates: []});
const MAX_TRANSIENT = 6;

const unique = list => [...new Set((Array.isArray(list) ? list : []).filter(x => typeof x === 'string' && x))];
export function normalizeCollections(input = {}) {
  return {
    favorites: unique(input.favorites),
    recents: unique(input.recents).slice(0, 50),
    crates: (Array.isArray(input.crates) ? input.crates : []).filter(c => c && typeof c === 'object').map((c, j) => ({
      id: String(c.id || `crate-${j}`), name: String(c.name || 'Crate').slice(0, 60), ids: unique(c.ids), bars: [4, 8, 16].includes(c.bars) ? c.bars : 8
    })).slice(0, 100)
  };
}

export class Store {
  constructor() { this.db = null; this.persistent = false; this._opening = null; this.transientTracks = new Map(); }
  async init() {
    if (this.db) return this;
    if (this._opening) return this._opening;
    this._opening = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('Persistent storage is unavailable in this browser.')); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => { const db = request.result; for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, {keyPath: 'id'}); };
      request.onerror = () => reject(new Error('Could not open the local library. Check available device storage.'));
      request.onblocked = () => reject(new Error('Close other Mixline tabs before upgrading local storage.'));
      request.onsuccess = () => {
        this.db = request.result; this.persistent = true;
        this.db.onversionchange = () => { this.db.close(); this.db = null; this.persistent = false; };
        resolve(this);
      };
    });
    try { return await this._opening; } catch (e) { this._opening = null; throw e; }
  }
  async transaction(name, mode, operation) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(name, mode), store = tx.objectStore(name);
      let request, result;
      try { request = operation(store); } catch (e) { reject(e); return; }
      if (request) { request.onsuccess = () => { result = request.result; }; request.onerror = () => {}; }
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(new Error(tx.error?.name === 'QuotaExceededError' ? 'Device storage is full. Remove an import or recording, then try again.' : tx.error?.message || 'Could not save local data.'));
    });
  }

  /* tracks */
  async listTracks() { const rows = await this.transaction('tracks', 'readonly', s => s.getAll()); return (rows || []).map(({blob, ...track}) => track).sort((a, b) => (b.added || 0) - (a.added || 0)); }
  async getTrack(id) {
    if (this.transientTracks.has(id)) return this.transientTracks.get(id);
    const row = await this.transaction('tracks', 'readonly', s => s.get(id));
    if (!row) return null;
    const {blob, ...track} = row;
    return {track, blob};
  }
  /** Session-only audio (sources without offline rights) lives in memory, never in IndexedDB. */
  cacheTrack(track, blob) {
    if (!track?.id || !blob) throw new Error('A prepared track needs audio and an identifier.');
    this.transientTracks.set(track.id, {track: {...track, transient: true}, blob});
    while (this.transientTracks.size > MAX_TRANSIENT) this.transientTracks.delete(this.transientTracks.keys().next().value);
    return this.transientTracks.get(track.id).track;
  }
  async saveTrack(track, blob) {
    const id = track.id || globalThis.crypto.randomUUID();
    const old = await this.transaction('tracks', 'readonly', s => s.get(id));
    const row = {...old, ...track, id, added: old?.added || Date.now(), updated: Date.now(), blob: blob || old?.blob};
    if (!row.blob && !row.demo) throw new Error('Select an audio file before importing.');
    await this.transaction('tracks', 'readwrite', s => s.put(row));
    const {blob: _omit, ...meta} = row;
    return meta;
  }
  async updateTrack(id, updates) {
    const current = await this.getTrack(id);
    if (!current) throw new Error('This track is no longer in the library.');
    if (current.track.transient) return this.cacheTrack({...current.track, ...updates, id}, current.blob);
    return this.saveTrack({...current.track, ...updates, id}, current.blob);
  }
  async deleteTrack(id) { this.transientTracks.delete(id); return this.transaction('tracks', 'readwrite', s => s.delete(id)); }

  /* sessions */
  async saveSession(name, data, id) {
    const record = {id: id || globalThis.crypto.randomUUID(), name: String(name || 'Untitled session').trim().slice(0, 100), data, updated: Date.now()};
    await this.transaction('sessions', 'readwrite', s => s.put(record));
    return record;
  }
  async listSessions() { return ((await this.transaction('sessions', 'readonly', s => s.getAll())) || []).sort((a, b) => b.updated - a.updated); }
  async getSession(id) { return this.transaction('sessions', 'readonly', s => s.get(id)); }
  async deleteSession(id) { return this.transaction('sessions', 'readwrite', s => s.delete(id)); }

  /* settings and collections */
  async getSetting(name, fallback = null) { const row = await this.transaction('settings', 'readonly', s => s.get(name)); return row ? row.value : fallback; }
  async setSetting(name, value) { await this.transaction('settings', 'readwrite', s => s.put({id: name, value})); return value; }
  async getCollections() { return normalizeCollections(await this.getSetting('collections', DEFAULT_COLLECTIONS)); }
  async setCollections(collections) { const clean = normalizeCollections(collections); await this.setSetting('collections', clean); return clean; }

  /* recordings */
  async saveRecording(blob, name) {
    const row = {id: globalThis.crypto.randomUUID(), name: name || `Mixline ${new Date().toLocaleString()}`, blob, mime: blob.type, size: blob.size, created: Date.now()};
    await this.transaction('recordings', 'readwrite', s => s.put(row));
    return row;
  }
  async listRecordings() { return ((await this.transaction('recordings', 'readonly', s => s.getAll())) || []).sort((a, b) => b.created - a.created); }
  async getRecording(id) { return this.transaction('recordings', 'readonly', s => s.get(id)); }
  async deleteRecording(id) { return this.transaction('recordings', 'readwrite', s => s.delete(id)); }

  async storageEstimate() { try { return await globalThis.navigator?.storage?.estimate?.() || {}; } catch { return {}; } }
  async requestPersistence() { try { return await globalThis.navigator?.storage?.persist?.() || false; } catch { return false; } }
}
export const store = new Store();
