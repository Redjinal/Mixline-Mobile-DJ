/** MediaRecorder wrapper with a size safety limit and a pending-finalisation state. */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

export function supportedRecordingMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) || null;
}

export function createRecorder(stream, {limitBytes = 48 * 1024 * 1024, timeslice = 1000, onStop, onError, onLimit} = {}) {
  const mime = supportedRecordingMime();
  if (typeof MediaRecorder === 'undefined') throw new Error('Recording is unavailable in this WebView. Update Android System WebView.');
  if (!mime) throw new Error('No supported recording format is available.');
  const media = new MediaRecorder(stream, {mimeType: mime, audioBitsPerSecond: 192000});
  const chunks = [];
  let bytes = 0, started = 0, pending = false, autoStop = false, resolveStop = null;
  const done = new Promise(resolve => { resolveStop = resolve; });
  media.ondataavailable = event => {
    if (event.data?.size) { chunks.push(event.data); bytes += event.data.size; }
    if (bytes > limitBytes && media.state === 'recording') {
      autoStop = true;
      media.stop();
      onLimit?.(`Recording reached the ${Math.round(limitBytes / 1024 / 1024)} MB safety limit and was stopped. Save it before continuing.`);
    }
  };
  media.onerror = event => onError?.(event.error?.message || 'Recording failed.');
  media.onstop = () => {
    pending = false;
    const blob = new Blob(chunks, {type: mime});
    chunks.length = 0;
    resolveStop?.(blob);
    onStop?.({blob, mime, autoStop});
  };
  return {
    media, mime,
    get recording() { return media.state === 'recording'; },
    get pending() { return pending; },
    get bytes() { return bytes; },
    get elapsed() { return media.state === 'recording' ? (performance.now() - started) / 1000 : 0; },
    start() { pending = true; started = performance.now(); try { media.start(timeslice); } catch (e) { pending = false; throw e; } },
    stop() { if (media.state === 'recording') media.stop(); return done; }
  };
}
