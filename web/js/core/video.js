/** Visible official YouTube players for Challenge mode. Their audio stays inside the players; it is never decoded or recorded. */
const ID = /^[A-Za-z0-9_-]{11}$/;
const STATES = {'-1': 'cued', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued'};
const ERROR_MESSAGES = {
  2: 'This video link is invalid. Check the link or choose another video.',
  5: 'The YouTube player could not play this video. Retry, or open it in YouTube.',
  100: 'This video is unavailable or private. Choose another video.',
  101: 'The owner does not allow embedded playback. Open this video in YouTube or choose another.',
  150: 'The owner does not allow embedded playback. Open this video in YouTube or choose another.',
  153: 'YouTube could not identify this embedded player. Open the video in YouTube; embedded playback needs device verification.'
};
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
let apiPromise;

export function parseYouTubeURL(input) {
  const value = String(input ?? '').trim();
  if (ID.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { throw new Error('Paste a complete YouTube link or an 11-character video ID.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a YouTube HTTPS link.');
  const host = url.hostname.toLowerCase();
  let id;
  if (['youtu.be', 'www.youtu.be'].includes(host)) id = url.pathname.split('/')[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1];
  }
  if (!ID.test(id || '')) throw new Error('This is not a playable YouTube video link. Paste a watch, Shorts, live or youtu.be link.');
  return id;
}
export const youtubeThumbnail = id => ID.test(id || '') ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';

function loadAPI(timeoutMs) {
  if (globalThis.YT?.Player) return Promise.resolve(globalThis.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = globalThis.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (globalThis.onYouTubeIframeAPIReady === ready) globalThis.onYouTubeIframeAPIReady = previous;
      if (error) { script.remove(); apiPromise = undefined; reject(error); } else resolve(globalThis.YT);
    };
    const ready = () => {
      try { if (typeof previous === 'function') previous(); } catch { /* keep bootstrapping */ }
      globalThis.YT?.Player ? finish() : finish(new Error('YouTube player API did not initialize. Retry when online.'));
    };
    const timer = setTimeout(() => finish(new Error('YouTube could not connect. Check your connection and retry. Local music is still available.')), timeoutMs);
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => finish(new Error('YouTube could not connect. Check your connection and retry.'));
    globalThis.onYouTubeIframeAPIReady = ready;
    document.head.append(script);
  });
  return apiPromise;
}

export class VideoMixer extends EventTarget {
  constructor({timeoutMs = 15000, bufferingTimeoutMs = 15000} = {}) {
    super();
    this.timeoutMs = timeoutMs;
    this.bufferingTimeoutMs = bufferingTimeoutMs;
    this.crossfade = 0;
    this.players = [null, null];
    this.decks = [0, 1].map(() => ({track: null, state: 'empty', playing: false, ready: false, position: 0, duration: 0, volume: 0, error: null, repeat: {enabled: false, start: 0, end: null}}));
    this.decks[0].volume = 100;
    this._bufferTimers = [null, null]; this._loadTimers = [null, null]; this._playerTimers = [null, null];
    this._hosts = [null, null]; this._transition = null; this._destroyed = false;
  }
  _deck(index) {
    if (index !== 0 && index !== 1) throw new Error('Choose Deck 1 or Deck 2.');
    if (this._destroyed) throw new Error('Video players have been closed.');
    return this.decks[index];
  }
  _emit(type = 'change', detail = {}) { this.dispatchEvent(new CustomEvent(type, {detail})); }
  _call(index, name, ...args) { const player = this.players[index]; if (typeof player?.[name] === 'function') return player[name](...args); }
  _volume() { [1 - this.crossfade, this.crossfade].forEach((gain, i) => { this.decks[i].volume = Math.round(gain * 100); this._call(i, 'setVolume', this.decks[i].volume); }); }

  /** Create both players inside #video-player-0/1 hosts; safe to call repeatedly. */
  async init() {
    if (this._destroyed) throw new Error('Video players have been closed.');
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      const YT = await loadAPI(this.timeoutMs);
      if (this._destroyed) throw new Error('Video players have been closed.');
      await Promise.all([0, 1].map(index => this.decks[index].ready ? Promise.resolve() : new Promise((resolve, reject) => {
        let host = document.getElementById(`video-player-${index}`);
        if (this.players[index]) {
          const place = this._hosts[index];
          this._call(index, 'destroy'); this.players[index] = null;
          host = document.getElementById(`video-player-${index}`);
          if (!host && place?.parent?.isConnected) { host = document.createElement('div'); host.id = `video-player-${index}`; place.parent.insertBefore(host, place.next?.parentNode === place.parent ? place.next : null); }
        }
        if (!host) { reject(new Error(`The visible video area for Deck ${index + 1} is missing.`)); return; }
        this._hosts[index] = {parent: host.parentNode, next: host.nextSibling};
        let settled = false;
        const timer = this._playerTimers[index] = setTimeout(() => {
          if (settled) return;
          settled = true;
          this._error(index, 'The video player did not become ready. Check your connection and retry.');
          reject(new Error(this.decks[index].error));
        }, this.timeoutMs);
        const origin = location.protocol === 'https:' || location.protocol === 'http:' ? location.origin : undefined;
        this.players[index] = new YT.Player(host, {
          width: '100%', height: '100%', host: 'https://www.youtube.com',
          playerVars: {playsinline: 1, controls: 1, autoplay: 0, rel: 0, ...(origin ? {origin} : {})},
          events: {
            onReady: event => {
              clearTimeout(timer);
              if (this._destroyed) { event.target.destroy(); return; }
              this.players[index] = event.target;
              const frame = event.target.getIframe?.();
              if (frame) { frame.classList.add('video-frame'); frame.title = `YouTube video deck ${index + 1}`; }
              const deck = this.decks[index];
              deck.ready = true; deck.error = null; deck.state = deck.track ? 'cued' : 'empty';
              this._volume(); this._emit();
              if (!settled) { settled = true; resolve(); }
            },
            onStateChange: event => this._onState(index, event.data),
            onError: event => {
              this._error(index, ERROR_MESSAGES[event.data] || `YouTube playback failed (${event.data}). Retry or choose another video.`, event.data);
              if (!settled) { settled = true; clearTimeout(timer); reject(new Error(this.decks[index].error)); }
            },
            onAutoplayBlocked: () => this._error(index, 'Tap Play in the visible video player to start this video.')
          }
        });
      })));
      if (!this._poll) this._poll = setInterval(() => this._tick(), 250);
      return this;
    })().catch(error => { this._initPromise = null; throw error; });
    return this._initPromise;
  }
  async load(index, track) {
    const deck = this._deck(index);
    const videoId = parseYouTubeURL(track?.videoId || track?.url || '');
    const prepared = {...track, videoId, title: String(track.title || videoId), start: Math.max(0, Number(track.start) || 0)};
    await this.init();
    this.cancelFade();
    this._call(index, 'pauseVideo');
    clearTimeout(this._loadTimers[index]); clearTimeout(this._bufferTimers[index]);
    Object.assign(deck, {track: prepared, state: 'loading', playing: false, error: null, position: prepared.start, duration: 0, repeat: {enabled: !!track.loop, start: prepared.start, end: null}});
    this._call(index, 'cueVideoById', {videoId, startSeconds: prepared.start});
    this._loadTimers[index] = setTimeout(() => { if (deck.state === 'loading') this._error(index, 'This video has not loaded. Check the connection, retry, or open it in YouTube.'); }, this.timeoutMs);
    this._emit();
    return deck;
  }
  play(index) {
    const deck = this._deck(index);
    if (!deck.track || !deck.ready) throw new Error('Load a video and wait for its player to become ready.');
    deck.error = null;
    this._call(index, 'playVideo');
    this._emit();
  }
  pause(index) {
    this._deck(index);
    if (this._transition?.incoming === index) this._abortTransition('Incoming video was paused. The outgoing deck stays available.');
    this._call(index, 'pauseVideo');
  }
  toggle(index) { this._deck(index).playing ? this.pause(index) : this.play(index); }
  pauseAll() { this.cancelFade(); [0, 1].forEach(i => { if (this.decks[i].ready) this._call(i, 'pauseVideo'); }); }
  seek(index, seconds) {
    const deck = this._deck(index);
    if (!deck.track || !deck.ready) throw new Error('Load a video before seeking.');
    const value = clamp(seconds, 0, deck.duration || Number.MAX_SAFE_INTEGER);
    this._call(index, 'seekTo', value, true);
    deck.position = value; this._emit();
  }
  getPosition(index) { const deck = this._deck(index); const position = this._call(index, 'getCurrentTime'); if (Number.isFinite(position)) deck.position = position; return deck.position; }
  /** Surface a load/connection failure on a deck card so it can be retried in place. */
  markError(index, message) { this._deck(index); this._error(index, message); }
  getURL(index) { const id = this._deck(index).track?.videoId; return id ? `https://www.youtube.com/watch?v=${id}` : null; }
  async retry(index) { const deck = this._deck(index); const track = deck.track; if (!track) return this.init(); if (!deck.ready) this._initPromise = null; return this.load(index, track); }
  setRepeat(index, {enabled = true, start = 0, end = null} = {}) {
    const deck = this._deck(index);
    if (!deck.track) throw new Error('Load a video before setting repeat.');
    const from = Math.max(0, Number(start) || 0);
    const to = end == null || end === '' ? null : Number(end);
    if (to != null && (!Number.isFinite(to) || to <= from + 0.5)) throw new Error('Repeat end must be at least half a second after its start.');
    deck.repeat = {enabled: !!enabled, start: from, end: to};
    this._emit();
  }
  setCrossfade(value) { this.cancelFade(); this.crossfade = clamp(value, 0, 1); this._volume(); this._emit(); }
  cancelFade() {
    const transition = this._transition;
    if (!transition) return;
    clearInterval(transition.timer); clearTimeout(transition.timeout);
    this._transition = null;
    transition.resolve?.({cancelled: true});
    this._emit();
  }
  fadeTo(index, seconds = 4) {
    const incoming = this._deck(index);
    if (!incoming.track || !incoming.playing || incoming.state !== 'playing') throw new Error('Start the incoming video and wait until it is playing before fading.');
    this.cancelFade();
    const duration = clamp(seconds, 0.1, 60) * 1000, from = this.crossfade;
    return new Promise(resolve => {
      const transition = this._transition = {kind: 'fade', incoming: index, from, started: performance.now(), duration, resolve};
      transition.timer = setInterval(() => {
        if (this._transition !== transition) return;
        if (this.decks[index].state !== 'playing') { this._abortTransition('Incoming video stopped playing. The outgoing level was restored.'); return; }
        const progress = Math.min(1, (performance.now() - transition.started) / duration);
        this.crossfade = from + (index - from) * progress;
        this._volume(); this._emit();
        if (progress === 1) { clearInterval(transition.timer); this._transition = null; resolve({cancelled: false}); this._emit('transitionend', {incoming: index}); }
      }, 30);
      this._emit();
    });
  }
  /** Start the incoming video silently, then swap levels once it is actually playing. */
  cutTo(index) {
    const incoming = this._deck(index);
    if (!incoming.track || !incoming.ready) throw new Error('Load the next video before cutting to it.');
    this.cancelFade();
    if (incoming.playing && incoming.state === 'playing') {
      this.crossfade = index; this._volume(); this._emit('transitionend', {incoming: index}); this._emit();
      return Promise.resolve({cancelled: false});
    }
    return new Promise(resolve => {
      const transition = this._transition = {kind: 'cut', incoming: index, from: this.crossfade, resolve};
      incoming.volume = 0; this._call(index, 'setVolume', 0);
      transition.timeout = setTimeout(() => this._abortTransition('The incoming video did not start. The outgoing deck keeps its level.'), this.timeoutMs);
      this.play(index);
    });
  }
  _abortTransition(message) {
    const transition = this._transition;
    if (!transition) return;
    this.crossfade = transition.from;
    this.cancelFade(); this._volume();
    this._call(transition.incoming, 'pauseVideo');
    this._emit('error', {index: transition.incoming, message, recoverable: true}); this._emit();
  }
  _error(index, message, code = null) {
    if (this._destroyed) return;
    const deck = this.decks[index];
    clearTimeout(this._bufferTimers[index]); clearTimeout(this._loadTimers[index]);
    Object.assign(deck, {error: message, errorCode: code, state: 'error', playing: false});
    if (this._transition?.incoming === index) this._abortTransition(message);
    this._emit('error', {index, message, code, recoverable: true}); this._emit();
  }
  _onState(index, code) {
    if (this._destroyed) return;
    const deck = this.decks[index];
    if (!deck.track) return;
    clearTimeout(this._bufferTimers[index]);
    deck.state = STATES[code] || 'unknown'; deck.playing = code === 1;
    if ([0, 1, 2, 5].includes(code)) clearTimeout(this._loadTimers[index]);
    if (code === 1) {
      deck.error = null;
      const transition = this._transition;
      if (transition?.kind === 'cut' && transition.incoming === index) {
        clearTimeout(transition.timeout); this._transition = null;
        this.crossfade = index; this._volume(); transition.resolve({cancelled: false});
        this._emit('transitionend', {incoming: index});
      }
    }
    if (code === 3) {
      if (this._transition?.kind === 'fade' && this._transition.incoming === index) this._abortTransition('Incoming video is buffering. The outgoing level was restored.');
      this._bufferTimers[index] = setTimeout(() => this._error(index, 'This video is still buffering. Retry or choose another beat; the other deck remains available.'), this.bufferingTimeoutMs);
    }
    if ([0, 2].includes(code) && this._transition?.incoming === index) this._abortTransition('Incoming playback stopped. The outgoing level was restored.');
    if (code === 0 && deck.repeat.enabled) { this._call(index, 'seekTo', deck.repeat.start, true); this._call(index, 'playVideo'); }
    this._emit();
  }
  _tick() {
    if (this._destroyed) return;
    this.decks.forEach((deck, index) => {
      if (!deck.ready || !deck.track) return;
      this.getPosition(index);
      const duration = this._call(index, 'getDuration');
      if (Number.isFinite(duration)) deck.duration = duration;
      const data = this._call(index, 'getVideoData');
      if (data?.title && deck.track.title === deck.track.videoId) { deck.track.title = String(data.title).slice(0, 120); this._emit(); }
      if (deck.playing && deck.repeat.enabled && deck.repeat.end != null && deck.position >= deck.repeat.end && (!deck._lastRepeat || performance.now() - deck._lastRepeat > 800)) {
        deck._lastRepeat = performance.now();
        this._call(index, 'seekTo', deck.repeat.start, true);
      }
    });
    this._emit('tick');
  }
  destroy() {
    if (this._destroyed) return;
    this.cancelFade(); this._destroyed = true;
    clearInterval(this._poll);
    this._bufferTimers.forEach(clearTimeout); this._loadTimers.forEach(clearTimeout); this._playerTimers.forEach(clearTimeout);
    [0, 1].forEach(index => this._call(index, 'destroy'));
    this.players = [null, null];
  }
}
