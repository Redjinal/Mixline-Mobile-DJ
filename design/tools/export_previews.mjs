#!/usr/bin/env node
// Export previews: every screen × orientation in daylight (default state) at 1×, the
// walkthrough scenes in all three themes at 2×, and a contact sheet (design/previews/index.html).
//
//   node design/tools/export_previews.mjs [--port 8791] [--family launch] [--states all]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserOptions, startServer, openPrototype, renderScreen, listScreens, shot } from './smoke.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const OUT = resolve(ROOT, 'previews');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, l) => a.startsWith('--') ? [a.slice(2), l[i + 1] && !l[i + 1].startsWith('--') ? l[i + 1] : true] : []).filter(Boolean));
const PORT = Number(args.port || 8791);
const FAMILY = typeof args.family === 'string' ? args.family : null;
const ALL_STATES = args.states === 'all';

async function main() {
  const server = await startServer(PORT);
  const browser = await chromium.launch(browserOptions);
  const entries = [];
  try {
    // 1× context for the bulk
    const one = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await one.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/#/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('html[data-ready="true"]');
    const screens = (await listScreens(page)).filter((s) => !FAMILY || s.family === FAMILY);
    for (const sc of screens) {
      if (!FAMILY) rmSync(resolve(OUT, sc.family), { recursive: true, force: true });
    }
    for (const sc of screens) {
      const states = ALL_STATES ? Object.keys(sc.states) : [Object.keys(sc.states)[0]];
      for (const state of states) for (const o of sc.orientations) {
        await renderScreen(page, { screen: sc.id, state, o, theme: 'daylight' });
        const file = resolve(OUT, sc.family, `${sc.id.split('/')[1]}--${state}--${o}.png`);
        await shot(page, file);
        entries.push({ family: sc.family, screen: sc.id, title: sc.title, state, label: sc.states[state]?.label, exercised: !!sc.states[state]?.exercised, orientation: o, theme: 'daylight', file: relative(OUT, file) });
        console.log('ok', relative(OUT, file));
      }
    }
    await one.close();
    // 2× walkthrough scenes in all themes
    if (!FAMILY) {
      const { page: p2 } = await openPrototype(browser, PORT);
      const scenes = await p2.evaluate(() => window.mdj.scenes());
      rmSync(resolve(OUT, 'walkthrough'), { recursive: true, force: true });
      for (const scene of scenes) for (const theme of ['daylight', 'lowlight', 'contrast']) for (const o of ['portrait', 'landscape']) {
        await renderScreen(p2, { screen: scene.screen, state: scene.state, o, theme, scenario: scene.scenario });
        const missing = await p2.$('.missing');
        if (missing) { console.log(`skip scene ${scene.n} (${scene.screen} not registered)`); continue; }
        const file = resolve(OUT, 'walkthrough', `scene-${String(scene.n).padStart(2, '0')}--${scene.screen.replace('/', '-')}--${scene.state}--${o}--${theme}.png`);
        await shot(p2, file);
        entries.push({ family: 'walkthrough', screen: scene.screen, title: `Scene ${scene.n} — ${scene.title}`, state: scene.state, label: scene.caption, exercised: true, orientation: o, theme, file: relative(OUT, file) });
        console.log('ok', relative(OUT, file));
      }
    }
    writeFileSync(resolve(OUT, 'index.html'), contactSheet(entries));
    writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(entries, null, 1));
    console.log(`wrote ${entries.length} previews and design/previews/index.html`);
  } finally {
    await browser.close();
    server.kill();
  }
}

function contactSheet(entries) {
  const groups = {};
  for (const e of entries) (groups[e.family] ||= []).push(e);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prototype previews</title>
<style>body{font:14px/1.4 system-ui,sans-serif;margin:0;padding:24px;background:#DCE6EA;color:#15252E}h1{font-size:22px}h2{margin-top:32px;font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;background:#F1F5F6;border:1px solid rgba(21,37,46,.12);border-radius:10px;padding:8px}img{width:100%;height:auto;display:block;border-radius:6px;background:#fff}figcaption{font-size:12px;margin-top:6px}.id{font-family:ui-monospace,monospace;color:#455C68}.tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid currentColor;margin-left:4px}.ex{color:#246A45}.dr{color:#455C68;border-style:dashed}p.note{max-width:70ch}</style></head><body>
<h1>Crystal Current prototype — previews</h1><p class="note">Design evidence only. Every waveform, meter and progress value is a labelled fixture; the device canvas is an assumed 412 × 892 dp, not a measured S26 Ultra. Generated by design/tools/export_previews.mjs.</p>
${Object.entries(groups).map(([fam, list]) => `<h2>${esc(fam)}</h2><div class="grid">${list.map((e) => `<figure><a href="${esc(e.file)}"><img loading="lazy" src="${esc(e.file)}" alt="${esc(e.title)} — ${esc(e.label)} (${esc(e.orientation)}, ${esc(e.theme)})"></a><figcaption><strong>${esc(e.title)}</strong><br><span class="id">${esc(e.screen)} · ${esc(e.state)} · ${esc(e.orientation)} · ${esc(e.theme)}</span><br>${esc(e.label)} <span class="tag ${e.exercised ? 'ex' : 'dr'}">${e.exercised ? 'exercised' : 'drawn'}</span></figcaption></figure>`).join('')}</div>`).join('')}
</body></html>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
