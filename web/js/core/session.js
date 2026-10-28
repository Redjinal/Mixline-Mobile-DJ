/** Recovery snapshots and named sessions. Restores are always paused; nothing auto-plays. */
const RECOVERY_KEY = 'recovery';

export function createSessionManager({store, engine, queue = null, intervalMs = 10000}) {
  let timer = 0, lastJson = '';
  const hasTracks = () => engine.decks.some(d => d.track);
  async function writeRecovery() {
    if (!hasTracks()) return false;
    const snapshot = engine.snapshot();
    const payload = {savedAt: Date.now(), snapshot, queue: queue ? {items: queue.items, skipped: queue.skipped} : null};
    const json = JSON.stringify(payload.snapshot);
    if (json === lastJson) return false;
    lastJson = json;
    await store.setSetting(RECOVERY_KEY, payload);
    return true;
  }
  const resolver = id => store.getTrack(id);
  return {
    startAutosave() { this.stopAutosave(); timer = setInterval(() => { writeRecovery().catch(() => {}); }, intervalMs); },
    stopAutosave() { if (timer) clearInterval(timer); timer = 0; },
    snapshotNow: () => writeRecovery(),
    async clearRecovery() { lastJson = ''; await store.setSetting(RECOVERY_KEY, null); },
    /** Returns {savedAt, tracks, titles} when a snapshot with tracks exists, else null. */
    async hasRecovery() {
      const saved = await store.getSetting(RECOVERY_KEY, null);
      const decks = saved?.snapshot?.decks;
      if (!Array.isArray(decks)) return null;
      const titles = decks.filter(d => d?.track).map(d => d.track.title || d.track.id);
      return titles.length ? {savedAt: saved.savedAt, tracks: titles.length, titles} : null;
    },
    async restoreRecovery() {
      const saved = await store.getSetting(RECOVERY_KEY, null);
      if (!saved?.snapshot) throw new Error('There is no recovery snapshot to restore.');
      const ok = await engine.restore(saved.snapshot, resolver);
      if (ok) await this.clearRecovery();
      return ok;
    },
    async saveNamed(name, id) {
      const snapshot = engine.snapshot();
      return store.saveSession(name, {version: 2, snapshot, queue: queue ? {items: queue.items, skipped: queue.skipped} : null, savedAt: Date.now()}, id);
    },
    list: () => store.listSessions(),
    async restore(id) {
      const record = await store.getSession(id);
      if (!record) throw new Error('That session is no longer saved.');
      const snapshot = record.data?.snapshot || record.data;
      return engine.restore(snapshot, resolver);
    },
    remove: id => store.deleteSession(id)
  };
}
