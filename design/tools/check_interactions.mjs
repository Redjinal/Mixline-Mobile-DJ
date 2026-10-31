#!/usr/bin/env node
// Exercise the registry's declared interaction paths in both compositions.
// This checks prototype navigation only, never audio or persisted application state.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, openPrototype, renderScreen, listScreens, browserOptions } from './smoke.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((v, i, a) => v.startsWith('--') ? [v.slice(2), a[i + 1]] : []).filter(Boolean));
const server = await startServer(Number(args.port || 8892));
let browser;
const results = [], scenes = [];
try {
  browser = await chromium.launch(browserOptions);
  const { page, errors } = await openPrototype(browser, Number(args.port || 8892));
  const screens = await listScreens(page);
  for (const scene of await page.evaluate(() => window.mdj.scenes())) {
    const screen = screens.find(s => s.id === scene.screen);
    scenes.push({ screen: scene.screen, state: scene.state, pass: !!screen?.states[scene.state] });
  }
  for (const sc of screens.filter(s => s.family !== 'foundation' && (!args.family || s.family === args.family))) {
    for (const [state, def] of Object.entries(sc.states)) {
      if (!def.exercised || (state === sc.defaultState && !def.via)) continue;
      for (const orientation of sc.orientations) {
        const result = { screen: sc.id, state, orientation, via: def.via, pass: false };
        try {
          if (!def.via?.from || !def.via?.control) throw new Error('Exercised state needs via.from and via.control');
          const from = def.via.from;
          const split = from.lastIndexOf(':');
          const source = split >= 0 ? { screen: from.slice(0, split), state: from.slice(split + 1) } : { screen: sc.id, state: from };
          await renderScreen(page, { ...source, o: orientation });
          const device = page.locator('#device');
          let control = device.getByRole('button', { name: def.via.control, exact: true });
          for (const role of ['link', 'tab', 'checkbox', 'switch', 'radio']) control = control.or(device.getByRole(role, { name: def.via.control, exact: true }));
          if (await control.count() !== 1) throw new Error(`Expected one named control, found ${await control.count()}`);
          await control.click({ timeout: 4000 });
          await page.waitForFunction(({ id, state }) => window.mdj.current?.id === id && window.mdj.current?.state === state, { id: sc.id, state }, { timeout: 3000 });
          result.pass = true;
        } catch (err) { result.error = String(err.message).split('\n')[0]; }
        results.push(result);
        console.log(`${result.pass ? 'ok' : 'FAIL'} ${sc.id}:${state} ${orientation}${result.error ? ` — ${result.error}` : ''}`);
      }
    }
  }
  const report = { scope: 'Prototype navigation only', scenes, results, consoleErrors: errors, passed: results.every(r => r.pass) && scenes.every(s => s.pass) && !errors.length };
  const file = resolve(root, args.out || 'spec/interactions.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`${results.filter(r => r.pass).length}/${results.length} declared paths passed; ${scenes.filter(s => s.pass).length}/${scenes.length} walkthrough scenes exist.`);
  if (!report.passed) process.exitCode = 1;
} finally { await browser?.close(); server.kill(); }
