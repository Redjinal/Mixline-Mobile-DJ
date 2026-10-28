/** Shared "load into deck" operation: resolves audio by source, protects a playing deck, records recents. */
export function createLoader({engine, store, sources, confirm, isLocked, onProgress}) {
  const pending = [null, null];

  async function resolve(track, signal) {
    if (track.demo) return {track, blob: null};
    if (track.online || track.provider && track.provider !== 'local' && track.provider !== 'original') {
      const cached = await store.getTrack(track.id);
      if (cached?.blob) return {track: {...cached.track, ...track, capabilities: cached.track.capabilities || track.capabilities}, blob: cached.blob};
      if (!sources) throw new Error('Online sources are not available in this session.');
      onProgress?.({stage: 'fetching', track});
      const prepared = await sources.prepare(track, {signal, purpose: 'mix'});
      if (prepared.track.capabilities?.offline) await store.saveTrack({...prepared.track, added: Date.now()}, prepared.blob);
      else store.cacheTrack(prepared.track, prepared.blob);
      return prepared;
    }
    const item = await store.getTrack(track.id);
    if (!item?.blob) throw new Error(`${track.title || 'This track'} is no longer in the library. Import the file again.`);
    return {track: {...item.track, ...track}, blob: item.blob};
  }

  async function remember(id) {
    try {
      const collections = await store.getCollections();
      collections.recents = [id, ...collections.recents.filter(x => x !== id)].slice(0, 50);
      await store.setCollections(collections);
    } catch { /* recents are best-effort */ }
  }

  return {
    busy: deck => !!pending[deck],
    cancel(deck) { pending[deck]?.controller.abort(); pending[deck] = null; engine.cancelLoad(deck); },
    /** Returns true when the deck now holds the track, false when cancelled or refused; throws on failure. */
    async load(deck, track, {ask = true} = {}) {
      if (isLocked?.()) throw new Error('Deck controls are locked. Turn off Performance lock to load tracks.');
      if (!track?.id) throw new Error('Choose a track to load.');
      const current = engine.decks[deck];
      if (ask && current.playing && current.track && confirm) {
        const ok = await confirm({title: `Replace the playing track on Deck ${deck + 1}?`, body: `${current.track.title || 'The current track'} is still playing. Loading ${track.title || 'the new track'} will stop it.`, confirmLabel: 'Replace', danger: true});
        if (!ok) return false;
      }
      if (pending[deck]) this.cancel(deck);
      const controller = new AbortController();
      const job = {controller, id: track.id};
      pending[deck] = job;
      try {
        onProgress?.({stage: 'resolving', deck, track});
        const item = await resolve(track, controller.signal);
        if (pending[deck] !== job) return false;
        onProgress?.({stage: 'decoding', deck, track});
        const ok = await engine.load(deck, item.track, item.blob);
        if (pending[deck] !== job) return false;
        if (ok) await remember(track.id);
        return ok;
      } catch (error) {
        if (error?.name === 'AbortError' || pending[deck] !== job) return false;
        throw error;
      } finally {
        if (pending[deck] === job) pending[deck] = null;
      }
    }
  };
}
