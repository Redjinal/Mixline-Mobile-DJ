/** Challenge workspace: two visible video decks, video crossfader, NEXT / CUT / NEXT and the Up Next queue. */
import {html, render, delegate, $, $$, raw, esc} from '../ui/dom.js';
import {icon} from '../ui/icons.js';
import {formatTime, parseTime, timeInput} from '../core/time.js';
import {youtubeThumbnail} from '../core/video.js';
import {createFader} from '../ui/controls/fader.js';
import {haptics} from '../ui/haptics.js';
import {fallbackCover} from '../ui/artwork.js';

const STATUS = {empty: ['Empty', 'is-idle'], loading: ['Loading…', 'is-buffering'], cued: ['Ready', 'is-ready'], playing: ['Playing', 'is-playing'], paused: ['Paused', 'is-idle'], buffering: ['Buffering', 'is-buffering'], ended: ['Ended', 'is-idle'], error: ['Blocked', 'is-blocked'], unknown: ['—', 'is-idle']};
const FADES = [['cut', 'Cut'], ['2', '2 s'], ['4', '4 s'], ['8', '8 s']];

export function createChallengeScreen(ctx) {
  const {engine, video, queue, toast, confirm, prompt, router} = ctx;
  const state = {fade: 'cut', local: false, busy: [false, false], shownPauseNote: false};
  let container = null, fader = null, timer = 0;
  const offs = []; const on = (el, type, selector, handler) => offs.push(delegate(el, type, selector, handler));
  const onError = e => toast(e.message, {kind: 'error'});
  const live = () => (video.crossfade >= 0.5 ? 1 : 0);
  const thumb = item => html`<span class="art-stack"><span class="art-fallback">${icon('video', {size: 22})}</span><img class="art" src="${youtubeThumbnail(item.videoId)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('is-missing')"></span>`;

  function videoCard(i) {
    const d = video.decks[i], [label, cls] = STATUS[d.state] || STATUS.unknown;
    return html`<article class="video-card tone-${i + 1}" data-video-deck="${i}">
      <header class="video-head"><span class="pill video-tag tone-${i + 1}">Deck ${i + 1}</span><span class="status ${cls}" data-video-status="${i}">${label}${d.error ? ` · ${d.error}` : ''}</span><span class="pill num" data-video-time="${i}">${formatTime(d.position)} / ${d.duration ? formatTime(d.duration) : '--:--'}</span></header>
      <div class="video-frame-wrap"><div id="video-player-${i}" class="video-host"></div>
        ${!d.track ? html`<div class="video-empty">${icon('video', {size: 28})}<span>Queue a video below, then tap NEXT · Deck ${i + 1}</span></div>` : ''}
        ${d.error ? html`<div class="video-error"><p>${d.error}</p><div class="cluster"><button class="btn btn-sm" data-video-retry="${i}">${icon('refresh', {size: 14})} Retry</button>${video.getURL(i) ? html`<a class="btn btn-sm btn-ghost" href="${video.getURL(i)}" target="_blank" rel="noopener">${icon('external', {size: 14})} Open in YouTube</a>` : ''}</div></div>` : ''}
      </div>
      <footer class="video-foot"><strong class="truncate" data-video-title="${i}">${d.track ? d.track.title : 'No video loaded'}</strong><div class="cluster"><button class="btn btn-sm btn-icon" data-video-play="${i}" aria-label="Play or pause deck ${i + 1}" ${!d.track || !d.ready ? 'disabled' : ''}>${icon(d.playing ? 'pause' : 'play', {size: 16})}</button><button class="btn btn-sm" data-video-start="${i}" ${!d.track ? 'disabled' : ''}>Start</button><button class="btn btn-sm" data-video-loop="${i}" aria-pressed="${d.repeat?.enabled}" ${!d.track ? 'disabled' : ''}>${icon('loop', {size: 14})} Loop</button></div></footer>
    </article>`;
  }
  function queueItem(item, index) {
    const [label, cls] = {queued: ['Queued', 'is-idle'], ready: ['Ready', 'is-ready'], buffering: ['Buffering', 'is-buffering'], blocked: ['Blocked', 'is-blocked'], playing: ['Playing', 'is-playing']}[item.state] || ['Queued', 'is-idle'];
    return html`<div class="queue-item" data-queue-id="${item.id}">
      <div class="queue-handle" aria-hidden="true">${icon('drag', {size: 18})}</div>
      <div class="row-art">${thumb(item)}</div>
      <div class="row-body"><span class="row-title" data-queue-title>${item.title}</span><div class="row-meta"><span class="badge badge-video">${icon('video', {size: 11})} Video</span><button class="btn btn-sm btn-quiet num" data-queue-start>${icon('clock', {size: 13})} Start at ${timeInput(item.start).slice(0, 5) || '00:00'}</button></div>${item.error ? html`<small class="danger">${item.error}</small>` : ''}</div>
      <div class="queue-side"><span class="status ${cls}">${label}</span><label class="cluster queue-loop"><span class="label">Loop</span><button class="switch" role="switch" data-queue-loop aria-checked="${item.loop}" aria-label="Loop"></button></label></div>
      <div class="queue-tools"><button class="btn btn-icon btn-sm btn-quiet" data-queue-move="-1" aria-label="Move up" ${index === 0 ? 'disabled' : ''}>${icon('arrowUp', {size: 16})}</button><button class="btn btn-icon btn-sm btn-quiet" data-queue-move="1" aria-label="Move down" ${index === queue.items.length - 1 ? 'disabled' : ''}>${icon('arrowDown', {size: 16})}</button><button class="btn btn-icon btn-sm btn-quiet" data-queue-more aria-label="More">${icon('more', {size: 16})}</button><button class="btn btn-icon btn-sm btn-quiet" data-queue-remove aria-label="Remove">${icon('close', {size: 16})}</button></div>
    </div>`;
  }
  function view() {
    const both = video.decks.every(d => d.playing);
    const audioPlaying = engine.decks.filter(d => d.playing).length;
    return html`<section class="screen challenge">
      <div class="ch-decks">${videoCard(0)}${videoCard(1)}</div>
      <article class="panel ch-mix">
        <div class="ch-ids">
          <div class="ch-id tone-1"><strong class="truncate">${video.decks[0].track?.title || 'Deck 1'}</strong><span class="num muted">${video.decks[0].volume}%</span></div>
          <span class="pill ${both ? 'is-live' : ''}">${icon('beat', {size: 14})} ${both ? 'Both playing' : video.decks.some(d => d.playing) ? `Deck ${video.decks.findIndex(d => d.playing) + 1} playing` : 'Idle'}</span>
          <div class="ch-id tone-2 is-right"><strong class="truncate">${video.decks[1].track?.title || 'Deck 2'}</strong><span class="num muted">${video.decks[1].volume}%</span></div>
        </div>
        <div class="xfader"><span class="xfader-label deck1">1</span><div data-video-xfader></div><span class="xfader-label deck2">2</span></div>
        <div class="ch-actions"><button class="btn btn-deck1 btn-lg" data-ch-next="0">${icon('chevronLeft', {size: 18})} <span>Next<small>Deck 1</small></span></button><button class="btn btn-violet btn-lg" data-ch-cut>${icon('scissors', {size: 18})} <span>Cut<small>swap now</small></span></button><button class="btn btn-deck2 btn-lg" data-ch-next="1"><span>Next<small>Deck 2</small></span> ${icon('chevronRight', {size: 18})}</button></div>
        <div class="ch-options"><span class="label">Fade</span><div class="segmented">${FADES.map(([k, label]) => html`<button data-ch-fade="${k}" aria-selected="${state.fade === k}" class="tone-v">${label}</button>`)}</div><button class="btn btn-sm" data-ch-local aria-pressed="${state.local}">${icon('music', {size: 14})} Local layer</button></div>
        ${audioPlaying ? html`<p class="notice">${icon('info')}<span class="grow">${audioPlaying === 1 ? 'An audio deck is still playing.' : 'Both audio decks are still playing.'}</span><button class="btn btn-sm" data-ch-pause-audio>Pause audio decks</button></p>` : ''}
      </article>
      <article class="panel queue-panel">
        <div class="panel-title"><h2>${icon('layers', {size: 16})} Up next <span class="count">(${queue.items.length})</span></h2>${queue.items.length ? html`<button class="btn btn-sm btn-quiet" data-ch-clear>Clear all</button>` : ''}</div>
        <form class="ch-add" data-ch-add-form><div class="search">${icon('link')}<input class="input" data-ch-add-link type="url" placeholder="Paste a YouTube link or video ID" autocomplete="off" inputmode="url"></div><button class="btn btn-violet" data-ch-add type="submit">${icon('plus', {size: 16})} Add</button></form>
        ${queue.items.length ? queue.items.map(queueItem) : html`<div class="empty">${raw(QUEUE_ART)}<h3>Your queue is empty</h3><p>Paste YouTube links above. Each beat gets a start point and an optional loop.</p></div>`}
        ${queue.skipped.length ? html`<details class="skipped"><summary>Skipped (${queue.skipped.length})</summary>${queue.skipped.map(item => html`<div class="row" data-skipped-id="${item.id}"><div class="row-art">${thumb(item)}</div><div class="row-body"><span class="row-title">${item.title}</span></div><div class="row-side"><button class="btn btn-sm" data-queue-restore>Restore</button></div></div>`)}</details>` : ''}
        <p class="dim" style="font-size:11px">Video audio stays inside the official players; it is not mixed with the audio decks or recorded.</p>
      </article>
    </section>`;
  }
  function patchTimes() {
    if (!container) return;
    for (const i of [0, 1]) {
      const d = video.decks[i];
      const t = $(`[data-video-time="${i}"]`, container); if (t) t.textContent = `${formatTime(d.position)} / ${d.duration ? formatTime(d.duration) : '--:--'}`;
      const [label, cls] = STATUS[d.state] || STATUS.unknown;
      const s = $(`[data-video-status="${i}"]`, container); if (s) { s.textContent = `${label}${d.error ? ` · ${d.error}` : ''}`; s.className = `status ${cls}`; }
      const p = $(`[data-video-play="${i}"]`, container); if (p) { render(p, icon(d.playing ? 'pause' : 'play', {size: 16})); p.disabled = !d.track || !d.ready; }
    }
    fader?.set(video.crossfade);
  }
  let key = '';
  function refresh(force) {
    const k = JSON.stringify([video.decks.map(d => [d.track?.videoId, d.state, d.error, d.ready, d.repeat?.enabled, d.playing]), queue.items, queue.skipped, state.fade, state.local, engine.decks.map(d => d.playing), video.crossfade]);
    if (!force && k === key) { patchTimes(); return; }
    key = k;
    const typed = $('[data-ch-add-link]', container)?.value || '';
    const hosts = [0, 1].map(i => $(`#video-player-${i}`, container));
    render(container, view());
    // Keep live iframes: move the existing player hosts back into the new cards.
    hosts.forEach((host, i) => { const slot = $(`#video-player-${i}`, container); if (host && slot && host !== slot) slot.replaceWith(host); });
    const input = $('[data-ch-add-link]', container); if (input && typed) input.value = typed;
    fader = createFader($('[data-video-xfader]', container), {orientation: 'horizontal', min: 0, max: 1, value: video.crossfade, detents: [0.5], tone: 'v', ariaLabel: 'Video crossfader', onInput: v => video.setCrossfade(v)});
    patchTimes();
  }
  async function loadNext(i) {
    const item = queue.peek();
    if (!item) { toast('Queue a video first.', {kind: 'warning'}); return; }
    if (state.busy[i]) return;
    state.busy[i] = true;
    queue.setState(item.id, 'buffering'); refresh(true);
    try {
      await video.load(i, {videoId: item.videoId, title: item.title, start: item.start, loop: item.loop});
      await queue.shift();
      toast(`${item.title} is cued on Deck ${i + 1}. Tap play in the player or CUT when ready.`, {kind: 'success'});
      haptics.play('load');
    } catch (e) {
      queue.setState(item.id, 'blocked', e.message);
      video.decks[i].track = video.decks[i].track || {videoId: item.videoId, title: item.title, start: item.start};
      video.markError(i, e.message);
      toast(e.message, {kind: 'error', timeout: 6000});
    } finally { state.busy[i] = false; refresh(true); }
  }
  async function cut() {
    const incoming = 1 - live();
    try {
      if (state.fade === 'cut') await video.cutTo(incoming); else await video.fadeTo(incoming, Number(state.fade));
      haptics.play('load');
    } catch (e) { onError(e); }
  }
  function moreSheet(item) {
    const s = ctx.sheet({title: item.title, body: html`<div class="stack"><button class="btn" data-q-rename>${icon('edit', {size: 16})} Rename</button><button class="btn" data-q-start>${icon('clock', {size: 16})} Set start time</button><button class="btn" data-q-skip>${icon('next', {size: 16})} Skip for now</button><a class="btn btn-ghost" href="https://www.youtube.com/watch?v=${esc(item.videoId)}" target="_blank" rel="noopener">${icon('external', {size: 16})} Open in YouTube</a></div>`});
    delegate(s.el, 'click', '[data-q-rename]', async () => { s.close(); const title = await prompt({title: 'Rename', label: 'Title', value: item.title, validate: v => v ? null : 'Enter a title.'}); if (title) { await queue.rename(item.id, title); refresh(true); } });
    delegate(s.el, 'click', '[data-q-start]', async () => { s.close(); editStart(item); });
    delegate(s.el, 'click', '[data-q-skip]', async () => { s.close(); await queue.skip(item.id); refresh(true); });
  }
  async function editStart(item) {
    const value = await prompt({title: 'Start time', label: 'mm:ss or seconds', value: timeInput(item.start), placeholder: '01:12', validate: v => { try { parseTime(v); return null; } catch (e) { return e.message; } }});
    if (value === null) return;
    await queue.setStart(item.id, parseTime(value) ?? 0); refresh(true);
  }
  return {
    name: 'challenge',
    get state() { return state; },
    mount(el, params = {}) {
      container = el; key = '';
      refresh(true);
      video.addEventListener('change', onVideo); video.addEventListener('tick', patchTimes); video.addEventListener('error', onVideoError);
      if (params.queue) { /* reserved: queue a library video reference */ }
      on(el, 'submit', '[data-ch-add-form]', async (e, form) => { e.preventDefault(); const input = $('[data-ch-add-link]', form); try { const item = await queue.add({url: input.value, title: ''}); input.value = ''; haptics.play('load'); toast(`Queued ${item.title}`, {kind: 'success'}); refresh(true); } catch (err) { onError(err); } });
      on(el, 'click', '[data-ch-next]', (e, b) => loadNext(Number(b.dataset.chNext)));
      on(el, 'click', '[data-ch-cut]', () => cut());
      on(el, 'click', '[data-ch-fade]', (e, b) => { state.fade = b.dataset.chFade; haptics.play('select'); refresh(true); });
      on(el, 'click', '[data-ch-local]', async () => { state.local = !state.local; try { if (state.local) { if (!engine.decks[0].track) throw new Error('Load a track on audio Deck 1 in the Library first.'); await engine.play(0); } else engine.pause(0); } catch (err) { state.local = false; onError(err); } refresh(true); });
      on(el, 'click', '[data-ch-pause-audio]', () => { engine.pauseAll(); state.local = false; refresh(true); });
      on(el, 'click', '[data-ch-clear]', async () => { if (!await confirm({title: 'Clear the queue?', body: `${queue.items.length} queued videos will be removed. You can undo right after.`, confirmLabel: 'Clear all', danger: true})) return; await queue.clear(); refresh(true); toast('Queue cleared', {action: {label: 'Undo', onClick: async () => { await queue.undo(); refresh(true); }}}); });
      on(el, 'click', '[data-queue-remove]', async (e, b) => { const id = b.closest('[data-queue-id]').dataset.queueId; const item = await queue.remove(id); refresh(true); if (item) toast(`Removed ${item.title}`, {action: {label: 'Undo', onClick: async () => { await queue.undo(); refresh(true); }}}); });
      on(el, 'click', '[data-queue-move]', async (e, b) => { const id = b.closest('[data-queue-id]').dataset.queueId; await queue.move(id, Number(b.dataset.queueMove)); haptics.play('step'); refresh(true); });
      on(el, 'click', '[data-queue-loop]', async (e, b) => { const id = b.closest('[data-queue-id]').dataset.queueId; await queue.setLoop(id, b.getAttribute('aria-checked') !== 'true'); haptics.play('toggle'); refresh(true); });
      on(el, 'click', '[data-queue-start]', (e, b) => { const item = queue.get(b.closest('[data-queue-id]').dataset.queueId); if (item) editStart(item); });
      on(el, 'click', '[data-queue-more]', (e, b) => { const item = queue.get(b.closest('[data-queue-id]').dataset.queueId); if (item) moreSheet(item); });
      on(el, 'click', '[data-queue-restore]', async (e, b) => { await queue.restore(b.closest('[data-skipped-id]').dataset.skippedId); refresh(true); });
      on(el, 'click', '[data-video-play]', (e, b) => { try { video.toggle(Number(b.dataset.videoPlay)); } catch (err) { onError(err); } });
      on(el, 'click', '[data-video-retry]', async (e, b) => { const i = Number(b.dataset.videoRetry); try { await video.retry(i); } catch (err) { onError(err); } refresh(true); });
      on(el, 'click', '[data-video-start]', (e, b) => { const i = Number(b.dataset.videoStart); const d = video.decks[i]; try { video.seek(i, d.track?.start || 0); } catch (err) { onError(err); } });
      on(el, 'click', '[data-video-loop]', (e, b) => { const i = Number(b.dataset.videoLoop); const d = video.decks[i]; try { video.setRepeat(i, {enabled: !d.repeat.enabled, start: d.track?.start || 0, end: null}); haptics.play('toggle'); refresh(true); } catch (err) { onError(err); } });
      timer = setInterval(patchTimes, 500);
    },
    unmount() {
      offs.forEach(off => off()); offs.length = 0; clearInterval(timer);
      video.removeEventListener('change', onVideo); video.removeEventListener('tick', patchTimes); video.removeEventListener('error', onVideoError);
      if (video.decks.some(d => d.playing)) { video.pauseAll(); if (!state.shownPauseNote) { toast('Video decks pause while you work in another workspace.'); state.shownPauseNote = true; } }
      container = null;
    },
    update() { if (container) refresh(false); }
  };
  function onVideo() { if (container) refresh(false); }
  function onVideoError(e) { if (e.detail?.message) toast(e.detail.message, {kind: 'error', timeout: 6000}); }
}

const QUEUE_ART = `<svg class="empty-art" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="qa" x1="0" x2="1"><stop offset="0" stop-color="#ff3b3b"/><stop offset="1" stop-color="#a855ff"/></linearGradient></defs><rect x="18" y="34" width="84" height="56" rx="10" fill="none" stroke="url(#qa)" stroke-width="2"/><path d="M52 50l20 12-20 12z" fill="url(#qa)"/><rect x="30" y="100" width="60" height="4" rx="2" fill="#ede6dd" opacity=".35"/><rect x="40" y="108" width="40" height="4" rx="2" fill="#ede6dd" opacity=".2"/></svg>`;
