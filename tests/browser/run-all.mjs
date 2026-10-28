/** Runs every browser check script sequentially and fails if any fails. */
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const scripts = readdirSync(dir).filter(f => /\.mjs$/.test(f) && !f.startsWith('_') && f !== 'run-all.mjs').sort();
let failed = 0;
for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync(process.execPath, [path.join(dir, script)], {stdio: 'inherit'});
  if (result.status !== 0) failed++;
}
if (failed) { console.error(`${failed} browser script(s) failed`); process.exit(1); }
