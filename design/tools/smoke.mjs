#!/usr/bin/env node
// Smoke render: serve the prototype, open screens in headless Chromium, capture
// screenshots and fail on console errors. Used by authors to check their work and by
// the preview/audit tools as a base.
//
//   node design/tools/smoke.mjs --screen perform/ab [--state transition] [--o landscape]
//        [--theme lowlight] [--tier essential] [--fontscale 200] [--scenario hot] [--hitbounds on]
//        [--all-states] [--all] [--out design/previews/_smoke] [--scale 2]
//
// --all renders every registered screen in both orientations (default state).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
// Playwright is resolved through NODE_PATH in the cloud session; ESM import does not see it.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const args = parseArgs(process.argv.slice(2));
const PORT = Number(args.port || 8771);
const OUT = resolve(ROOT, args.out || 'previews/_smoke');
const SCALE = Number(args.scale || 2);

// Prefer Playwright's pinned browser; managed workspaces may instead provide system Chromium.
export const browserOptions = existsSync(chromium.executablePath()) ? {} : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {};

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = list[i + 1];
    if (next && !next.startsWith('--')) { out[key] = next; i++; } else out[key] = true;
  }
  return out;
}

export async function startServer(port = PORT) {
  const proc = spawn('python3', [resolve(here, 'serve.py'), String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res, rej) => {
    const t = setTimeout(() => { proc.kill(); rej(new Error('server did not start')); }, 10000);
    proc.stdout.on('data', (d) => { if (String(d).includes('prototype at')) { clearTimeout(t); res(); } });
    proc.on('exit', (code) => { clearTimeout(t); rej(new Error(`server exited ${code}`)); });
  });
  return proc;
}

export function hashFor({ screen, state, o, theme = 'daylight', tier = 'balanced', motion = 'reduced', fontscale = '100', scenario = 'set-ready', hitbounds = 'off', viewport = 'default', insets = 'on' }) {
  const q = new URLSearchParams();
  if (state) q.set('state', state);
  q.set('o', o || 'portrait');
  for (const [k, v] of Object.entries({ theme, tier, motion, fontscale, scenario, hitbounds, viewport })) if (v) q.set(k, String(v));
  q.set('frame', 'off');
  q.set('insets', insets);
  return `#/s/${screen}?${q.toString()}`;
}

export async function openPrototype(browser, port = PORT) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: SCALE, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/#/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-ready="true"]', { timeout: 20000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  return { context, page, errors };
}

export async function renderScreen(page, opts) {
  await page.evaluate((h) => { location.hash = h; }, hashFor(opts));
  await page.waitForFunction((id) => document.documentElement.dataset.screen === id || document.querySelector('.missing'), opts.screen, { timeout: 10000 });
  await page.waitForTimeout(250); // fonts/layout settle
  await page.evaluate(() => document.fonts?.ready);
}

export async function listScreens(page) {
  return page.evaluate(() => window.mdj.screens());
}

export async function shot(page, file) {
  mkdirSync(dirname(file), { recursive: true });
  const device = await page.$('#device');
  await device.screenshot({ path: file });
}

async function main() {
  const server = await startServer();
  let browser;
  let failures = 0;
  try {
    browser = await chromium.launch(browserOptions);
    const { page, errors } = await openPrototype(browser);
    const screens = await listScreens(page);
    let jobs = [];
    if (args.all) {
      for (const sc of screens) for (const o of ['portrait', 'landscape']) jobs.push({ screen: sc.id, state: null, o, theme: args.theme, tier: args.tier, fontscale: args.fontscale, scenario: args.scenario, hitbounds: args.hitbounds });
    } else if (args.screen) {
      const sc = screens.find((s) => s.id === args.screen);
      if (!sc) throw new Error(`unknown screen ${args.screen}; known: ${screens.map((s) => s.id).join(', ')}`);
      const states = args['all-states'] ? Object.keys(sc.states) : [args.state || null];
      const os = args.o ? [args.o] : ['portrait', 'landscape'];
      for (const state of states) for (const o of os) jobs.push({ screen: sc.id, state, o, theme: args.theme, tier: args.tier, fontscale: args.fontscale, scenario: args.scenario, hitbounds: args.hitbounds });
    } else {
      throw new Error('pass --screen <id> or --all');
    }
    for (const job of jobs) {
      const before = errors.length;
      await renderScreen(page, job);
      const name = `${job.screen.replaceAll('/', '--')}${job.state ? `--${job.state}` : ''}--${job.o}--${job.theme || 'daylight'}--${job.tier || 'balanced'}--fs${job.fontscale || '100'}--hit-${job.hitbounds || 'off'}.png`;
      await shot(page, resolve(OUT, name));
      const newErrors = errors.slice(before);
      const missing = await page.$('.missing');
      if (newErrors.length || missing) { failures++; console.log(`FAIL ${name}${missing ? ' (screen missing/render error)' : ''}`); for (const e of newErrors) console.log('   ', e); }
      else console.log(`ok   ${name}`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
  if (failures) { console.log(`${failures} failure(s)`); process.exit(1); }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
