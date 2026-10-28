/** Online discovery adapters (Audius, Jamendo, Internet Archive, Wikimedia Commons). Live availability is never assumed. */
export const SOURCE_CATALOG = Object.freeze([
  {id: 'audius', name: 'Audius', status: 'Not checked', searchable: true, description: 'Search and trending independent music. Live audio access needs device verification.', url: 'https://audius.co', setupFields: [{key: 'apiKey', label: 'Public API key (optional)', type: 'text', placeholder: 'Optional developer API key'}]},
  {id: 'jamendo', name: 'Jamendo', status: 'Setup required', searchable: true, description: 'Search independent music with a public Client ID. Session audio only; recording and offline storage are unavailable.', url: 'https://devportal.jamendo.com/', setupFields: [{key: 'clientId', label: 'Public Client ID', type: 'text', placeholder: 'Your Jamendo Client ID'}]},
  {id: 'archive', name: 'Internet Archive', status: 'Not checked', searchable: true, description: 'Experimental audio discovery. Only items with a supported declared open license can load into decks.', url: 'https://archive.org/details/audio', setupFields: []},
  {id: 'wikimedia', name: 'Wikimedia Commons', status: 'Not checked', searchable: true, description: 'Experimental musical audio search with file credits and license information.', url: 'https://commons.wikimedia.org/', setupFields: []},
  {id: 'freetouse', name: 'Free To Use', status: 'Research pending', searchable: false, description: 'Current API access and DJ-use terms could not be verified. Browse the service directly; integration is not enabled.', url: 'https://freetouse.com/api', setupFields: []},
  {id: 'spotify', name: 'Spotify', status: 'Partner access required', searchable: false, description: 'Spotify DJ audio requires an approved integration. This build does not connect Spotify playback.', url: 'https://developer.spotify.com/', setupFields: []}
]);
export const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
const MAX_JSON_BYTES = 4 * 1024 * 1024;

const clean = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const first = value => Array.isArray(value) ? value[0] : value;
const seconds = value => (typeof value === 'string' && value.includes(':')) ? value.split(':').reduce((n, x) => n * 60 + (Number(x) || 0), 0) : Number(value) || 0;
const bpmOf = value => { const n = Number(value); return Number.isFinite(n) && n >= 30 && n <= 300 ? n : 0; };
function abortError() { const e = new Error('Loading cancelled.'); e.name = 'AbortError'; return e; }
export function safeURL(value) {
  try {
    const u = new URL(String(value));
    if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/i.test(u.hostname)) return '';
    return u.href;
  } catch { return ''; }
}
/** Accept only explicit standardised licenses, never the word "free" alone. */
export function licenseInfo(value) {
  const text = clean(first(value));
  let code = '', url = '';
  try {
    const u = new URL(text);
    if (['creativecommons.org', 'www.creativecommons.org'].includes(u.hostname) && ['http:', 'https:'].includes(u.protocol)) {
      const m = u.pathname.match(/^\/licenses\/(by(?:-sa|-nc(?:-sa|-nd)?|-nd)?)\/(\d\.\d)\/?$/i);
      if (m) { code = `CC-${m[1].toUpperCase()}`; url = `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/`; }
      if (/^\/publicdomain\/zero\/1\.0\/?$/.test(u.pathname)) { code = 'CC0'; url = 'https://creativecommons.org/publicdomain/zero/1.0/'; }
    }
  } catch { /* not a URL */ }
  if (!code) {
    const normalized = text.toUpperCase().replace(/[_ ]+/g, '-');
    const m = normalized.match(/^(?:CC-|CREATIVE-COMMONS-)(BY(?:-SA|-NC(?:-SA|-ND)?|-ND)?)(?:-\d\.\d)?$/);
    if (m) code = 'CC-' + m[1]; else if (/^(CC0|CC-0)(?:-1\.0)?$/.test(normalized)) code = 'CC0';
  }
  const remixAllowed = ['CC0', 'CC-BY', 'CC-BY-SA'].includes(code);
  return {label: code || text || 'License not specified', url, code, remixAllowed, attributionRequired: code !== 'CC0', shareAlike: code === 'CC-BY-SA'};
}
export function sourceCapabilities(source, license, {streamable = true, gated = false} = {}) {
  const info = typeof license === 'object' ? license : licenseInfo(license);
  const open = info.remixAllowed === true && streamable && !gated;
  const retains = ['archive', 'wikimedia'].includes(source);
  return {preview: !!streamable && !gated, load: open, record: open && retains, offline: open && retains, analysis: open};
}
function restriction(source, license, caps) {
  if (!caps.preview) return 'This track does not offer an accessible preview.';
  if (!caps.load) return /NC|ND/.test(license.code) ? 'This license needs additional permission or usage review before DJ processing.' : 'An explicit supported remix license is required before loading this online track into a deck.';
  if (source === 'jamendo') return 'Session audio only. Recording and offline storage are unavailable under this adapter.';
  if (source === 'audius') return 'Open-license session audio. Recording and offline retention await provider-term verification.';
  return license.shareAlike ? 'Declared CC BY-SA: preserve credits and share-alike conditions for adaptations.' : license.attributionRequired ? 'Preserve the artist, source and license credits when exporting.' : 'Declared CC0 audio. Source and credits remain attached.';
}
function makeTrack(source, id, data) {
  const license = licenseInfo(data.license);
  const capabilities = sourceCapabilities(source, license, {streamable: data.streamable !== false, gated: !!data.gated});
  const result = {
    id: `${source}:${id}`, source, provider: source, sourceId: String(id), sourceName: SOURCE_CATALOG.find(s => s.id === source)?.name || source,
    title: clean(data.title) || 'Untitled track', artist: clean(data.artist) || 'Artist not supplied', duration: seconds(data.duration), bpm: bpmOf(data.bpm), start: 0,
    artwork: safeURL(data.artwork), url: safeURL(data.url), audioUrl: safeURL(data.audioUrl),
    license: license.label, licenseUrl: license.url, licenseInfo: license, credit: clean(data.credit || data.artist),
    capabilities, restriction: restriction(source, license, capabilities), online: true
  };
  if (data.extra) Object.assign(result, data.extra);
  return result;
}

export function createSources({store = null, config: initialConfig = {}, fetchImpl = globalThis.fetch, timeoutMs = 20000} = {}) {
  let config = {audius: {}, jamendo: {}, ...initialConfig};
  const statuses = new Map(), errors = new Map();
  async function init() { if (store) { const saved = await store.getSetting('sources', {}); config = {...config, ...saved}; } return api; }
  const getConfig = () => structuredClone(config);
  async function configure(source, values = {}) {
    const descriptor = SOURCE_CATALOG.find(s => s.id === source);
    if (!descriptor) throw new Error('Unknown music source.');
    const next = {};
    for (const field of descriptor.setupFields) {
      const value = String(values[field.key] ?? '').trim();
      if (value.length > 500 || /[\r\n]/.test(value)) throw new Error('The source setting is not valid.');
      next[field.key] = value;
    }
    const candidate = {...config, [source]: next};
    if (store) await store.setSetting('sources', candidate);
    config = candidate; statuses.delete(source); errors.delete(source);
    return getConfig();
  }
  function list() {
    return SOURCE_CATALOG.map(s => ({
      ...s, setupFields: s.setupFields.map(x => ({...x})),
      status: statuses.get(s.id) || (s.id === 'jamendo' ? (config.jamendo?.clientId ? 'Not checked' : 'Setup required') : s.status),
      error: errors.get(s.id) || '', configured: s.id !== 'jamendo' || !!config.jamendo?.clientId, liveAudioVerified: false
    }));
  }
  async function request(url, {signal, type = 'json', headers = {}} = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('Online access is not available.');
    if (!safeURL(url)) throw new Error('This source returned an unsafe audio or API address.');
    if (signal?.aborted) throw abortError();
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, {once: true});
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const tooLarge = () => new Error(type === 'json' ? 'This source response is too large.' : 'Choose an audio file smaller than 150 MB.');
    try {
      const response = await fetchImpl(url, {signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers});
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Source access was refused. Check configuration and track availability.');
        if (response.status === 429) throw new Error('The source is rate-limiting requests. Wait before trying again.');
        throw new Error(`The source returned HTTP ${response.status}. Try again later.`);
      }
      const max = type === 'json' ? MAX_JSON_BYTES : MAX_AUDIO_BYTES;
      const declared = Number(response.headers?.get('content-length')) || 0;
      if (declared > max) { await response.body?.cancel?.(); throw tooLarge(); }
      const parts = [];
      let size = 0;
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const item = await reader.read();
            if (item.done) break;
            size += item.value.byteLength;
            if (size > max) { await reader.cancel(); throw tooLarge(); }
            parts.push(item.value);
          }
        } finally { reader.releaseLock(); }
      } else {
        const body = await response.arrayBuffer();
        size = body.byteLength;
        if (size > max) throw tooLarge();
        parts.push(body);
      }
      if (signal?.aborted) throw abortError();
      const contentType = response.headers?.get('content-type') || '';
      const blob = new Blob(parts, {type: contentType.split(';')[0]});
      if (type === 'json') { try { return JSON.parse(await blob.text()); } catch { throw new Error('This source returned an unreadable catalog response.'); } }
      if (!blob.size) throw new Error('This track returned no audio.');
      if (/text\/|application\/(json|xml|xhtml)/i.test(contentType)) throw new Error('The source returned a page instead of an audio file.');
      return blob;
    } catch (e) {
      if (timedOut) throw new Error('The source took too long to respond. Retry or choose another track.');
      if (signal?.aborted || e.name === 'AbortError') throw abortError();
      if (e instanceof TypeError) throw new Error('Could not reach this source. Check your connection; the source may not allow app access.');
      throw e;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  const url = (base, params) => { const u = new URL(base); for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v)); return u.href; };
  const audiusHeaders = () => config.audius?.apiKey ? {Authorization: `Bearer ${config.audius.apiKey}`} : {};

  async function search(source, query = '', options = {}) {
    if (query && typeof query === 'object') { options = query; query = options.query || ''; }
    const descriptor = SOURCE_CATALOG.find(s => s.id === source);
    if (!descriptor?.searchable) throw new Error(descriptor?.description || 'Unknown music source.');
    const page = Math.max(0, Math.floor(Number(options.page) || 0)), limit = Math.max(1, Math.min(50, Math.floor(Number(options.limit) || 20)));
    const signal = options.signal, q = String(query).trim().slice(0, 300);
    statuses.set(source, 'Searching'); errors.delete(source);
    try {
      let tracks = [], more = false;
      if (source === 'audius') {
        const payload = await request(url(`https://api.audius.co/v1/tracks/${q ? 'search' : 'trending'}`, {query: q, limit, offset: page * limit, app_name: 'Mixline'}), {signal, headers: audiusHeaders()});
        if (!Array.isArray(payload.data)) throw new Error('Audius returned an unexpected catalog response.');
        tracks = payload.data.filter(t => t?.id).map(t => makeTrack(source, t.id, {title: t.title, artist: t.user?.name || t.user?.handle, duration: t.duration, bpm: t.bpm, license: t.license, artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'], url: t.permalink ? new URL(t.permalink, 'https://audius.co').href : '', audioUrl: `https://api.audius.co/v1/tracks/${encodeURIComponent(t.id)}/stream`, streamable: t.is_streamable !== false, gated: t.is_stream_gated}));
        more = payload.data.length === limit;
      } else if (source === 'jamendo') {
        if (!config.jamendo?.clientId) throw new Error('Add your public Jamendo Client ID in source setup first.');
        const payload = await request(url('https://api.jamendo.com/v3.0/tracks/', {client_id: config.jamendo.clientId, format: 'json', limit, offset: page * limit, audioformat: 'mp32', include: 'musicinfo', search: q, order: q ? 'relevance' : 'popularity_total'}), {signal});
        if (payload.headers?.status === 'failed') throw new Error('Jamendo refused the request. Check your Client ID and try again.');
        if (!Array.isArray(payload.results)) throw new Error('Jamendo returned an unexpected catalog response.');
        tracks = payload.results.filter(t => t?.id).map(t => makeTrack(source, t.id, {title: t.name, artist: t.artist_name, duration: t.duration, bpm: t.bpm, license: t.license_ccurl, artwork: t.image, url: t.shareurl, audioUrl: t.audio, streamable: !!safeURL(t.audio)}));
        more = payload.results.length === limit;
      } else if (source === 'archive') {
        const term = q ? q.replace(/[+\-!(){}[\]^"~*?:\\/]/g, ' ') : 'music';
        const u = new URL('https://archive.org/advancedsearch.php');
        u.searchParams.set('q', `mediatype:audio AND (${term})`);
        for (const f of ['identifier', 'title', 'creator', 'licenseurl', 'runtime']) u.searchParams.append('fl[]', f);
        u.searchParams.set('rows', limit); u.searchParams.set('page', page + 1); u.searchParams.set('output', 'json');
        const payload = await request(u.href, {signal});
        if (!Array.isArray(payload.response?.docs)) throw new Error('Internet Archive returned an unexpected catalog response.');
        tracks = payload.response.docs.filter(t => t.identifier).map(t => makeTrack(source, t.identifier, {title: first(t.title), artist: first(t.creator), duration: first(t.runtime), license: first(t.licenseurl), url: `https://archive.org/details/${encodeURIComponent(t.identifier)}`, artwork: `https://archive.org/services/img/${encodeURIComponent(t.identifier)}`}));
        more = (page + 1) * limit < Number(payload.response.numFound || 0);
      } else if (source === 'wikimedia') {
        const payload = await request(url('https://commons.wikimedia.org/w/api.php', {action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `filetype:audio ${q || 'music'}`, gsrnamespace: 6, gsrlimit: limit, gsroffset: page * limit, prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime'}), {signal});
        if (payload.error) throw new Error('Wikimedia could not complete this search. Try a different query.');
        const pages = Object.values(payload.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
        tracks = pages.filter(p => p.imageinfo?.[0]?.url).map(p => { const i = p.imageinfo[0], m = i.extmetadata || {}; const license = m.LicenseUrl?.value || m.LicenseShortName?.value; return makeTrack(source, p.pageid, {title: clean(m.ObjectName?.value) || p.title.replace(/^File:/, ''), artist: clean(m.Artist?.value) || clean(m.Credit?.value), license, audioUrl: i.url, url: i.descriptionurl, credit: clean(m.Artist?.value) + ' · ' + clean(m.Credit?.value), streamable: /^audio\//.test(i.mime || '')}); });
        more = !!payload.continue;
      }
      statuses.set(source, 'Catalog available');
      return {tracks, nextPage: more ? page + 1 : null, notice: 'Catalog results retrieved. Audio decoding and live phone playback are not guaranteed; track-specific capabilities are shown.', source, page};
    } catch (e) {
      if (e.name === 'AbortError') { statuses.delete(source); throw e; }
      statuses.set(source, source === 'jamendo' && !config.jamendo?.clientId ? 'Setup required' : 'Unavailable');
      errors.set(source, e.message);
      throw e;
    }
  }
  /** Fetch eligible audio for a deck or preview; rights are rechecked at preparation time. */
  async function prepare(input, {signal, purpose = 'mix'} = {}) {
    const source = input?.provider || input?.source, descriptor = SOURCE_CATALOG.find(s => s.id === source);
    if (!descriptor?.searchable) throw new Error('This source cannot supply deck audio in this build.');
    let t = {...input};
    if (source === 'archive') {
      const metadata = await request(`https://archive.org/metadata/${encodeURIComponent(t.sourceId)}`, {signal});
      const files = (metadata.files || []).filter(f => /\.(mp3|ogg|oga|wav|flac|m4a)$/i.test(f.name || '') && Number(f.size || 0) <= MAX_AUDIO_BYTES).sort((a, b) => (/\.mp3$/i.test(a.name) ? 0 : 1) - (/\.mp3$/i.test(b.name) ? 0 : 1));
      if (!files.length) throw new Error('This archive item has no supported audio file below 150 MB.');
      const file = files[0];
      const checked = makeTrack(source, t.sourceId, {title: t.title, artist: t.artist, duration: file.length || t.duration, license: first(metadata.metadata?.licenseurl), url: t.url, artwork: t.artwork, audioUrl: `https://archive.org/download/${encodeURIComponent(t.sourceId)}/${file.name.split('/').map(encodeURIComponent).join('/')}`, credit: t.credit});
      t = {...t, ...checked, archiveFile: file.name};
    }
    const caps = sourceCapabilities(source, licenseInfo(t.licenseUrl || t.license), {streamable: t.capabilities?.preview !== false});
    if (purpose === 'preview' ? !caps.preview : !caps.load) throw new Error(t.restriction || 'This track is not eligible for deck processing.');
    let audioUrl = t.audioUrl;
    if (source === 'audius') audioUrl = url(`https://api.audius.co/v1/tracks/${encodeURIComponent(t.sourceId)}/stream`, {app_name: 'Mixline'});
    if (!safeURL(audioUrl)) throw new Error('No accessible audio file was supplied for this track.');
    const blob = await request(audioUrl, {signal, type: 'audio', headers: source === 'audius' ? audiusHeaders() : {}});
    return {track: {...t, capabilities: caps, online: true}, blob};
  }
  const api = {init, list, getConfig, configure, search, prepare, load: prepare};
  return api;
}
