/** Task 1 smoke: shell loads, six destinations, router works, dock reachable. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {serve, launch, createRunner} from './_harness.mjs';

const runner = createRunner('smoke');
const site = await serve();
const {page, errors, close} = await launch();
runner.setPage(page);
try {
  await page.goto(site.url);
  await page.waitForFunction(() => window.Mixline?.router, null, {timeout: 10000});
  await runner.run('six destinations in the navigation', async () => {
    assert.equal(await page.locator('nav [data-route]').count(), 6);
  });
  await runner.run('tapping Mixer navigates', async () => {
    await page.locator('nav [data-route="mixer"]').click();
    await page.waitForFunction(() => Mixline.router.current.name === 'mixer');
    assert.equal(await page.evaluate(() => document.querySelector('nav [data-route="mixer"]').getAttribute('aria-current')), 'page');
  });
  await runner.run('dock and navigation sit inside the phone viewport without horizontal overflow', async () => {
    const box = await page.evaluate(() => {
      const dock = document.querySelector('#dock').getBoundingClientRect();
      const nav = document.querySelector('nav.tabbar').getBoundingClientRect();
      return {overflow: document.documentElement.scrollWidth > innerWidth + 1, dockBottom: dock.bottom, navBottom: nav.bottom, height: innerHeight, dockTop: dock.top};
    });
    assert.equal(box.overflow, false);
    assert.ok(box.dockTop > 0 && box.dockBottom <= box.navBottom + 1 && box.navBottom <= box.height + 1, JSON.stringify(box));
    await page.screenshot({path: path.join(runner.output, 'smoke-412x915.png')});
  });
  await runner.run('no page errors', async () => { assert.deepEqual(errors, []); });
} catch (e) {
  runner.failures.push({title: 'bootstrap', message: e.message});
  console.error(e);
} finally {
  await close(); await site.close(); await runner.finish();
}
