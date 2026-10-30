#!/usr/bin/env node
// Prototype audit. Renders every screen × orientation (× theme) × state and checks:
//   - interactive targets below their declared hit size (48 / 56 dp)
//   - overlapping hit bounds (visible, non-nested, > 2 px intersection)
//   - interactive elements without data-hit
//   - text contrast below WCAG AA against the nearest opaque backing
//   - data-fr ids that are not in requirements_register.json
//   - fixture data (canvas, meters, progress) without a FIXTURE mark
//   - required Document 19 states per family (tools/required-states.json)
//   - console errors and horizontal overflow of the device canvas
// Writes design/spec/audit.json and design/spec/audit.md.
//
//   node design/tools/audit.mjs [--themes daylight|all] [--states default|all] [--port 8790] [--family launch]
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, openPrototype, renderScreen, listScreens } from './smoke.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const REPO = resolve(ROOT, '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, l) => a.startsWith('--') ? [a.slice(2), l[i + 1] && !l[i + 1].startsWith('--') ? l[i + 1] : true] : []).filter(Boolean));
const PORT = Number(args.port || 8790);
const THEMES = args.themes === 'all' ? ['daylight', 'lowlight', 'contrast'] : ['daylight'];
const ALL_STATES = args.states === 'all';
const FAMILY = typeof args.family === 'string' ? args.family : null;

const register = JSON.parse(readFileSync(resolve(REPO, 'docs/planning/v1_0/contracts/requirements_register.json'), 'utf8'));
const FR_IDS = new Set(register.requirements.map((r) => r.id));
const REQUIRED = JSON.parse(readFileSync(resolve(here, 'required-states.json'), 'utf8'));

// Runs inside the page. Returns measurements for the current render.
function pageAudit() {
  const device = document.getElementById('device');
  const dRect = device.getBoundingClientRect();
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
    // inside the device canvas and not fully clipped
    return r.right > dRect.left && r.left < dRect.right && r.bottom > dRect.top && r.top < dRect.bottom;
  };
  // Clip an element's rect to every overflow:auto|hidden|scroll ancestor: a cell scrolled out of a
  // horizontal strip is unhittable and must not count as overlapping what sits above the strip.
  const clipRect = (el) => {
    let r = el.getBoundingClientRect();
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    let node = el.parentElement;
    while (node && node !== device) {
      const cs = getComputedStyle(node);
      if (/(auto|hidden|scroll)/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
        const c = node.getBoundingClientRect();
        x1 = Math.max(x1, c.left); y1 = Math.max(y1, c.top); x2 = Math.min(x2, c.right); y2 = Math.min(y2, c.bottom);
      }
      node = node.parentElement;
    }
    return { full: r, x1, y1, x2, y2, clippedW: Math.max(0, x2 - x1), clippedH: Math.max(0, y2 - y1) };
  };
  const targets = [];
  for (const el of device.querySelectorAll('[data-hit]')) {
    if (!visible(el)) continue;
    const hit = parseInt(el.dataset.hit, 10) || 0;
    if (!hit) continue;
    const c = clipRect(el);
    if (c.clippedW < 1 || c.clippedH < 1) continue; // fully scrolled out of view: not hittable
    const r = c.full;
    const comp = el.closest('[data-component]');
    targets.push({ hit, x: c.x1 - dRect.left, y: c.y1 - dRect.top, w: c.clippedW, h: c.clippedH, fullW: r.width, fullH: r.height, tag: el.tagName.toLowerCase(), comp: comp?.dataset.component || null, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60), el });
  }
  // Size is judged on the element's full box (a partially scrolled cell is still a 48 dp cell).
  const small = targets.filter((t) => t.fullW + 0.5 < t.hit || t.fullH + 0.5 < t.hit).map(({ el, ...t }) => t);
  const overlaps = [];
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ix > 2 && iy > 2) overlaps.push({ a: `${a.tag}${a.comp ? `(${a.comp})` : ''} "${a.label}"`, b: `${b.tag}${b.comp ? `(${b.comp})` : ''} "${b.label}"`, ix: Math.round(ix), iy: Math.round(iy) });
  }
  const missingHit = [];
  for (const el of device.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="slider"], [role="tab"], [role="option"], [role="switch"], [role="checkbox"]')) {
    if (!visible(el)) continue;
    if (el.hasAttribute('data-hit') || el.closest('[data-hit]')) continue;
    missingHit.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 50)}"`);
  }
  // Contrast
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = '1'] = m[1].split(',').map((x) => parseFloat(x)); return { r, g, b, a: isNaN(a) ? 1 : a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const backing = (el) => {
    let node = el, acc = null;
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      const bg = parse(cs.backgroundColor);
      const hasImage = cs.backgroundImage && cs.backgroundImage !== 'none';
      if (bg && bg.a > 0) { acc = acc ? blend(acc, bg) : bg; if (bg.a >= 0.99 && !hasImage) return { color: acc, opaque: true }; if (hasImage) return { color: acc, opaque: false, image: true }; }
      else if (hasImage) return { color: acc || { r: 220, g: 230, b: 234, a: 1 }, opaque: false, image: true };
      node = node.parentElement;
    }
    return { color: acc || { r: 220, g: 230, b: 234, a: 1 }, opaque: false };
  };
  const contrast = [];
  const walker = document.createTreeWalker(device, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const text = n.textContent.trim();
    if (!text || text.length < 2) continue;
    const el = n.parentElement;
    if (!el || seen.has(el) || !visible(el)) continue;
    seen.add(el);
    if (el.closest('mdj-fixture-mark, .device__status-guide, .device__gesture-guide')) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); if (!fg) continue;
    const bk = backing(el);
    const fgOn = fg.a < 1 ? blend(fg, bk.color) : fg;
    const l1 = lum(fgOn), l2 = lum(bk.color);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (ratio < need) contrast.push({ text: text.slice(0, 40), ratio: Math.round(ratio * 100) / 100, need, size, opaqueBacking: bk.opaque, comp: el.closest('[data-component]')?.dataset.component || null });
  }
  const frs = new Set();
  for (const el of device.querySelectorAll('[data-fr]')) for (const id of el.dataset.fr.split(/\s+/)) if (id) frs.add(id);
  const fixtureGaps = [];
  for (const el of device.querySelectorAll('canvas, [role="meter"], [role="progressbar"], .meter__fill, .progress__fill')) {
    if (!visible(el)) continue;
    const comp = el.closest('[data-component], .glass, .raised, section, article') || el.parentElement;
    if (!comp.querySelector('mdj-fixture-mark') && !el.closest('mdj-fixture-mark')) fixtureGaps.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} in ${comp.dataset?.component || comp.className || comp.tagName}`);
  }
  const outlet = document.getElementById('outlet');
  const overflowX = outlet.scrollWidth > outlet.clientWidth + 2;
  return { targets: targets.length, small, overlaps, missingHit, contrast, frs: Array.from(frs), fixtureGaps, overflowX };
}

async function main() {
  mkdirSync(resolve(ROOT, 'spec'), { recursive: true });
  const server = await startServer(PORT);
  const browser = await chromium.launch();
  const results = [];
  try {
    const { page, errors } = await openPrototype(browser, PORT);
    const screens = (await listScreens(page)).filter((s) => s.family !== 'foundation' && (!FAMILY || s.family === FAMILY));
    for (const sc of screens) {
      const states = ALL_STATES ? Object.keys(sc.states) : [null];
      for (const theme of THEMES) for (const o of sc.orientations) for (const state of states) {
        const before = errors.length;
        await renderScreen(page, { screen: sc.id, state, o, theme });
        const m = await page.evaluate(pageAudit);
        const unknownFr = [...m.frs, ...sc.fr].filter((id) => !FR_IDS.has(id));
        results.push({ screen: sc.id, family: sc.family, state: state || sc.states[Object.keys(sc.states)[0]] && Object.keys(sc.states)[0], orientation: o, theme, ...m, unknownFr, consoleErrors: errors.slice(before) });
        const issues = m.small.length + m.overlaps.length + m.missingHit.length + m.contrast.length + m.fixtureGaps.length + unknownFr.length + errors.slice(before).length + (m.overflowX ? 1 : 0);
        console.log(`${issues ? 'ISSUES' : 'ok    '} ${sc.id} ${state || '(default)'} ${o} ${theme}: targets ${m.targets}, small ${m.small.length}, overlap ${m.overlaps.length}, nohit ${m.missingHit.length}, contrast ${m.contrast.length}, fixture ${m.fixtureGaps.length}, fr? ${unknownFr.length}, errors ${errors.slice(before).length}${m.overflowX ? ', OVERFLOW-X' : ''}`);
      }
    }
    // Required states per family
    const byFamily = {};
    for (const sc of screens) (byFamily[sc.family] ||= []).push(sc);
    const requiredReport = {};
    for (const [fam, list] of Object.entries(REQUIRED)) {
      if (FAMILY && fam !== FAMILY) continue;
      const ids = (byFamily[fam] || []).flatMap((sc) => Object.keys(sc.states).map((k) => `${k} ${sc.states[k].label}`.toLowerCase()));
      requiredReport[fam] = list.map((req) => ({ name: req.name, satisfied: ids.some((id) => req.match.some((m) => id.includes(m))), screens: (byFamily[fam] || []).length }));
    }
    const summary = {
      generatedBy: 'design/tools/audit.mjs', themes: THEMES, states: ALL_STATES ? 'all' : 'default',
      screens: screens.length, renders: results.length,
      totals: {
        smallTargets: results.reduce((a, r) => a + r.small.length, 0),
        overlaps: results.reduce((a, r) => a + r.overlaps.length, 0),
        missingHit: results.reduce((a, r) => a + r.missingHit.length, 0),
        contrast: results.reduce((a, r) => a + r.contrast.length, 0),
        fixtureGaps: results.reduce((a, r) => a + r.fixtureGaps.length, 0),
        unknownFr: results.reduce((a, r) => a + r.unknownFr.length, 0),
        consoleErrors: results.reduce((a, r) => a + r.consoleErrors.length, 0),
        overflowX: results.filter((r) => r.overflowX).length,
      },
      requiredStates: requiredReport,
      results,
    };
    writeFileSync(resolve(ROOT, 'spec/audit.json'), JSON.stringify(summary, null, 1));
    writeFileSync(resolve(ROOT, 'spec/audit.md'), markdown(summary));
    console.log('\nTotals:', JSON.stringify(summary.totals));
    console.log('wrote design/spec/audit.json and design/spec/audit.md');
  } finally {
    await browser.close();
    server.kill();
  }
}

function markdown(s) {
  const lines = ['# Prototype audit', '', `Generated by \`design/tools/audit.mjs\` · themes: ${s.themes.join(', ')} · states: ${s.states} · ${s.screens} screens, ${s.renders} renders.`, '',
    '| Check | Count |', '| --- | --- |',
    ...Object.entries(s.totals).map(([k, v]) => `| ${k} | ${v} |`), '',
    '## Required states per family (Document 19 §4)', '', '| Family | State | Satisfied |', '| --- | --- | --- |'];
  for (const [fam, list] of Object.entries(s.requiredStates)) for (const r of list) lines.push(`| ${fam} | ${r.name} | ${r.satisfied ? 'yes' : '**no**'} |`);
  lines.push('', '## Renders with issues', '');
  for (const r of s.results) {
    const issues = [];
    for (const t of r.small) issues.push(`small target ${t.tag}${t.comp ? `(${t.comp})` : ''} "${t.label}" ${Math.round(t.w)}×${Math.round(t.h)} < ${t.hit}`);
    for (const o of r.overlaps) issues.push(`overlap ${o.a} × ${o.b} (${o.ix}×${o.iy} px)`);
    for (const m of r.missingHit) issues.push(`no data-hit: ${m}`);
    for (const c of r.contrast) issues.push(`contrast ${c.ratio}:1 < ${c.need} "${c.text}"${c.comp ? ` (${c.comp})` : ''}${c.opaqueBacking ? '' : ' [backing not opaque]'}`);
    for (const f of r.fixtureGaps) issues.push(`fixture mark missing: ${f}`);
    for (const f of r.unknownFr) issues.push(`unknown FR id ${f}`);
    for (const e of r.consoleErrors) issues.push(`console: ${e.slice(0, 120)}`);
    if (r.overflowX) issues.push('horizontal overflow of the device canvas');
    if (!issues.length) continue;
    lines.push(`### ${r.screen} · ${r.state} · ${r.orientation} · ${r.theme}`, '', ...issues.map((i) => `- ${i}`), '');
  }
  return lines.join('\n') + '\n';
}

main().catch((e) => { console.error(e); process.exit(1); });
