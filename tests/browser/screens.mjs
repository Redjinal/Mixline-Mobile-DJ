/** Rendered-view evidence: every workspace at phone portrait, phone landscape and desktop, with demo tracks loaded. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {serve, launch, createRunner} from './_harness.mjs';

const VIEWPORTS = [[412, 915], [915, 412], [1280, 800], [360, 740]];
const ROUTES = ['decks', 'mixer', 'pads', 'fx', 'library', 'challenge', 'settings'];
const runner = createRunner('screens');
const site = await serve();
const {page, errors, close} = await launch();
runner.setPage(page);
try {
  await page.goto(site.url);
  await page.waitForFunction(() => window.Mixline?.loader);
  await page.evaluate(async () => { await Mixline.loadDemo(0, 'demo-red'); await Mixline.loadDemo(1, 'demo-blue'); });
  await page.waitForFunction(() => Mixline.engine.decks.every(d => d.track));
  await page.evaluate(async () => { await Mixline.engine.play(0); Mixline.engine.setCue(0, 0, 4); Mixline.engine.setCue(0, 1, 9.5); Mixline.engine.renameCue(0, 0, 'Drop', '#ffb020'); Mixline.engine.loop(1, 4); Mixline.engine.setXY(0, 0.35, 0.4); Mixline.engine.setCrossfade(0.42); await Mixline.queue.add({url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Opening beat', start: 72}); await Mixline.queue.add({url: 'https://youtu.be/9bZkp7q19f0', title: 'Second round', start: 30}); });
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({width: w, height: h});
    for (const route of ROUTES) {
      await runner.run(`${route} fits ${w}×${h}`, async () => {
        await page.evaluate(r => Mixline.router.navigate(r, {}), route);
        await page.waitForFunction(r => Mixline.router.current.name === r, route);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('.toasts .toast').forEach(t => t.remove()));
        const box = await page.evaluate(() => {
          const dock = document.querySelector('#dock'), nav = document.querySelector('nav.tabbar');
          const d = dock.getBoundingClientRect(), n = nav.getBoundingClientRect();
          return {overflow: document.documentElement.scrollWidth > innerWidth + 1, mainOverflow: document.querySelector('#main').scrollWidth > document.querySelector('#main').clientWidth + 1, dockHidden: dock.hidden, dockBottom: d.bottom, navRight: n.right, navBottom: n.bottom, h: innerHeight, w: innerWidth};
        });
        assert.equal(box.overflow, false, 'document overflow');
        assert.equal(box.mainOverflow, false, 'workspace overflow');
        assert.ok(box.navBottom <= box.h + 1 && box.navRight <= box.w + 1, 'nav in viewport');
        if (!box.dockHidden) assert.ok(box.dockBottom <= box.h + 1, 'dock in viewport');
        await page.screenshot({path: path.join(runner.output, `${route}-${w}x${h}.png`)});
        return box;
      });
    }
    if (w === 412) {
      await runner.run('deck focus fits 412×915', async () => {
        await page.evaluate(() => Mixline.router.navigate('decks', {focus: 0}));
        await page.waitForTimeout(250);
        await page.screenshot({path: path.join(runner.output, `deck-focus-${w}x${h}.png`)});
      });
    }
  }
  await runner.run('reduced motion keeps controls usable', async () => {
    await page.setViewportSize({width: 412, height: 915});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.evaluate(() => Mixline.router.navigate('decks', {}));
    await page.waitForTimeout(200);
    const t = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t-med').trim());
    assert.equal(t, '0ms');
    await page.locator('[data-dock-play="1"]').click();
    await page.waitForFunction(() => Mixline.engine.decks[1].playing);
    await page.emulateMedia({reducedMotion: 'no-preference'});
  });
  await runner.run('light theme renders without errors', async () => {
    await page.evaluate(() => { Mixline.settings.set('theme', 'light'); Mixline.router.navigate('mixer'); });
    await page.waitForTimeout(200);
    await page.screenshot({path: path.join(runner.output, 'mixer-light-412x915.png')});
    await page.evaluate(() => Mixline.settings.discard());
  });
  await runner.run('no page errors', async () => { assert.deepEqual(errors, []); });
} catch (e) { runner.failures.push({title: 'bootstrap', message: e.message}); console.error(e); }
finally { await close(); await site.close(); await runner.finish(); }
