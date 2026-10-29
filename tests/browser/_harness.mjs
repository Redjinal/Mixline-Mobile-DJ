/** Shared Playwright harness: serves web/ on a local port and runs named checks. */
import {createServer} from 'node:http';
import {readFile, stat, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../web');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wav': 'audio/wav'};

export async function serve(port = 0) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let file = path.join(ROOT, decodeURIComponent(url.pathname));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return {server, url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(r => server.close(r))};
}

export async function launch({viewport = {width: 412, height: 915}, reducedMotion} = {}) {
  const playwright = require('playwright');
  const browser = await playwright.chromium.launch({headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const context = await browser.newContext({viewport, acceptDownloads: true, hasTouch: true, reducedMotion});
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  // Errors thrown inside third-party player scripts (YouTube embeds) are environment noise, not application errors.
  page.on('pageerror', e => { if (/youtube\.com|ytimg\.com/.test(String(e.stack || ''))) return; errors.push(e.message + (e.stack ? '\n' + String(e.stack).split('\n').slice(0, 4).join('\n') : '')); });
  // Blocked network resources (YouTube, thumbnails) are environment conditions, not application errors.
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  return {browser, context, page, errors, close: () => browser.close()};
}

export function createRunner(name) {
  const output = process.env.MIXLINE_TEST_OUTPUT || path.join('artifacts', name);
  const checks = [], failures = [];
  let page = null, diagnostics = null;
  const run = async (title, fn) => {
    try {
      const evidence = await fn();
      checks.push({title, evidence: evidence ?? {}});
      console.log('PASS ' + title);
    } catch (e) {
      const state = diagnostics ? await Promise.resolve().then(diagnostics).catch(err => ({diagnosticsFailed: err.message})) : undefined;
      failures.push({title, message: e.message, stack: e.stack, state});
      console.error('FAIL ' + title + ': ' + e.message);
      if (state) console.error('  state: ' + JSON.stringify(state));
      if (page) { await mkdir(output, {recursive: true}).catch(() => {}); await page.screenshot({path: path.join(output, `failure-${failures.length}.png`)}).catch(() => {}); }
    }
  };
  return {
    output, checks, failures, run,
    setPage(p) { page = p; },
    /** App-level state captured on each failure, written to results.json and the log. */
    setDiagnostics(fn) { diagnostics = fn; },
    async finish(extra = {}) {
      await mkdir(output, {recursive: true});
      await writeFile(path.join(output, 'results.json'), JSON.stringify({name, checks, failures, ...extra}, null, 2));
      console.log(JSON.stringify({name, passed: checks.length, failed: failures.length, output}));
      if (failures.length) process.exitCode = 1;
    }
  };
}
