// Prototype entry point. Order matters: state -> fixtures -> components -> screens -> router -> switcher.
import * as State from './state.js';
import { initFixtures } from './fixtures.js';
import { SCREEN_MODULES } from './registry.js';
import * as Router from './router.js';
import * as Switcher from './switcher.js';
import './shell.js';
import '../components/index.js';

State.init();

async function boot() {
  await initFixtures();
  // Screen families register themselves on import. A missing family file is reported, not fatal.
  for (const path of SCREEN_MODULES) {
    try { await import(path); } catch (err) { console.error(`screen module failed: ${path}`, err); }
  }
  Router.init(document.getElementById('outlet'));
  Switcher.init(document.getElementById('switcher'));

  const toggle = document.getElementById('switcher-toggle');
  const aside = document.getElementById('switcher');
  toggle.addEventListener('click', () => {
    const open = aside.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.documentElement.dataset.ready = 'true';
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('outlet').textContent = `Prototype failed to start: ${err.message}`;
});
