/** Pure library helpers: query parsing, filtering/sorting, source classification and set recipes. */
const YT = /^[A-Za-z0-9_-]{11}$/;

export function sourceKind(track = {}) {
  if (track.videoId && YT.test(track.videoId)) return 'video';
  if (track.online || (track.provider && !['local', 'original'].includes(track.provider))) return 'online';
  if (track.demo || track.source === 'original' || track.provider === 'original') return 'original';
  return 'local';
}

/** "Luna bpm:120-130", "120–126 BPM" and "128 BPM" (±2) become {text, bpmMin, bpmMax}. */
export function parseQuery(input) {
  let text = String(input ?? '').toLowerCase();
  let bpmMin = null, bpmMax = null;
  const range = text.match(/(?:bpm:\s*)?(\d{2,3})\s*[-–]\s*(\d{2,3})(?:\s*bpm)?/) || text.match(/bpm:\s*(\d{2,3})(?:\s*[-–]\s*(\d{2,3}))?/);
  const single = !range && text.match(/(\d{2,3})\s*bpm/);
  if (range) { bpmMin = Number(range[1]); bpmMax = Number(range[2] ?? range[1]); text = text.replace(range[0], ' '); }
  else if (single) { bpmMin = Number(single[1]) - 2; bpmMax = Number(single[1]) + 2; text = text.replace(single[0], ' '); }
  if (bpmMin !== null && bpmMax < bpmMin) [bpmMin, bpmMax] = [bpmMax, bpmMin];
  return {text: text.replace(/\s+/g, ' ').trim(), bpmMin, bpmMax};
}

const by = {
  recent: (a, b) => (b.added || 0) - (a.added || 0),
  title: (a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, {sensitivity: 'base'}),
  artist: (a, b) => String(a.artist || '').localeCompare(String(b.artist || ''), undefined, {sensitivity: 'base'}) || by.title(a, b),
  bpm: (a, b) => (a.bpm || Infinity) - (b.bpm || Infinity) || by.title(a, b)
};

export function filterTracks(tracks, {query = '', mode = 'all', source = 'all', sort = 'recent', unknownBpm = true} = {}) {
  const {text, bpmMin, bpmMax} = parseQuery(query);
  const matches = track => {
    if (source !== 'all' && sourceKind(track) !== source) return false;
    if (bpmMin !== null) {
      const bpm = Number(track.bpm) || 0;
      if (bpm === 0 ? !unknownBpm : (bpm < bpmMin || bpm > bpmMax)) return false;
    }
    if (!text) return true;
    const title = String(track.title || '').toLowerCase(), artist = String(track.artist || '').toLowerCase();
    if (mode === 'title') return title.includes(text);
    if (mode === 'artist') return artist.includes(text);
    return title.includes(text) || artist.includes(text) || String(track.sourceName || '').toLowerCase().includes(text);
  };
  const result = tracks.filter(matches);
  return sort === 'manual' || !by[sort] ? result : result.sort(by[sort]);
}

/** Validate an imported set recipe: ordered references only, never audio. */
export function normalizeRecipe(input) {
  if (!input || typeof input !== 'object' || input.format !== 'mixline-set' || input.version !== 1) throw new Error('This file is not a Mixline set recipe.');
  if (!Array.isArray(input.tracks) || !input.tracks.length) throw new Error('The set recipe has no tracks.');
  if (input.tracks.length > 500) throw new Error('A set recipe can hold at most 500 tracks.');
  const refs = input.tracks.map(t => {
    if (!t || typeof t.id !== 'string' || !t.id) throw new Error('A track reference in the recipe is missing its identifier.');
    return {id: t.id, title: String(t.title || '').slice(0, 120), artist: String(t.artist || '').slice(0, 120), bpm: Number(t.bpm) || 0, source: String(t.source || '')};
  });
  return {name: String(input.name || 'Imported set').slice(0, 60), bars: [4, 8, 16].includes(input.bars) ? input.bars : 8, ids: refs.map(r => r.id), refs};
}
export function recipeFrom(crate, tracks) {
  const index = new Map(tracks.map(t => [t.id, t]));
  return {format: 'mixline-set', version: 1, name: crate.name, bars: crate.bars || 8, exported: new Date().toISOString(), tracks: crate.ids.map(id => { const t = index.get(id) || {id}; return {id, title: t.title || '', artist: t.artist || '', bpm: t.bpm || 0, source: sourceKind(t)}; })};
}
