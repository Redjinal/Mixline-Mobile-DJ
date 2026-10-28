/**
 * Android shell bridge. The shell posts into window.mixline* callbacks; the app posts
 * {type:'playback'|'haptic'|'export'} messages through window.MixlineAndroid.postMessage.
 * Everything degrades to no-ops in an ordinary browser.
 */
export function installNativeBridge({engine, video, sessions, toast, back}) {
  let playing = false;
  const post = payload => { try { globalThis.MixlineAndroid?.postMessage?.(JSON.stringify(payload)); } catch { /* bridge unavailable */ } };
  const sync = () => {
    const now = engine.decks.some(d => d.playing || d.scratching) || engine.recording;
    if (now !== playing) { playing = now; post({type: 'playback', playing}); }
  };
  engine.addEventListener('change', sync);
  engine.addEventListener('recording', sync);
  window.mixlineLifecycle = kind => {
    if (kind === 'pause') {
      engine.pauseAll();
      try { video.pauseAll(); } catch { /* players may not exist */ }
      sessions.snapshotNow().catch(() => {});
      sync();
    }
    // 'picker': a document picker is opening; local playback may continue.
  };
  window.mixlineNativeResult = response => {
    if (!response || response.type !== 'export') return;
    const kind = response.status === 'saved' ? 'success' : response.status === 'cancelled' ? 'info' : 'error';
    toast(response.message || (kind === 'success' ? 'Saved.' : 'The export did not complete.'), {kind});
  };
  window.mixlineBack = () => back() === true;
  window.addEventListener('pagehide', () => { sessions.snapshotNow().catch(() => {}); });
  return {sync, get playing() { return playing; }};
}
