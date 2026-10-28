/** End-to-end journeys across the live app. Extended task by task. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {serve, launch, createRunner} from './_harness.mjs';

const runner = createRunner('journey');
const site = await serve();
const {page, errors, close} = await launch();
runner.setPage(page);
const shot = name => page.screenshot({path: path.join(runner.output, `${name}.png`)});
const nav = async route => { await page.locator(`nav [data-route="${route}"]`).click(); await page.waitForFunction(r => Mixline.router.current.name === r, route); };
try {
  await page.goto(site.url);
  await page.waitForFunction(() => window.Mixline?.engine && window.Mixline?.loader, null, {timeout: 10000});

  await runner.run('decks: both originals load from the library helper and the deck panels show their identity', async () => {
    await page.evaluate(() => Mixline.loadDemo(0, 'demo-red'));
    await page.evaluate(() => Mixline.loadDemo(1, 'demo-blue'));
    await page.waitForFunction(() => Mixline.engine.decks.every(d => d.track));
    const titles = await page.evaluate(() => [...document.querySelectorAll('[data-deck-title]')].map(e => e.textContent.trim()));
    assert.deepEqual(titles.slice(0, 2), ['Afterhours Circuit', 'Midnight Voltage']);
    assert.equal(await page.locator('[data-platter="0"] .platter-art img, [data-platter="0"] .platter-art svg').count(), 1);
    await shot('decks-412x915');
  });
  await runner.run('dock: play from the dock, navigate every workspace, deck keeps playing', async () => {
    await page.locator('[data-dock-play="0"]').click();
    await page.waitForFunction(() => Mixline.engine.decks[0].playing && Mixline.engine.position(0) > 0.1);
    const before = await page.evaluate(() => Mixline.engine.position(0));
    for (const route of ['mixer', 'pads', 'fx', 'library', 'challenge', 'decks']) {
      await nav(route);
      assert.equal(await page.locator('#dock').isVisible(), route !== 'challenge', `dock on ${route}`);
    }
    assert.ok(await page.evaluate(p => Mixline.engine.decks[0].playing && Mixline.engine.position(0) > p, before));
    assert.equal(await page.evaluate(() => document.querySelector('[data-dock-play="0"]').classList.contains('is-active')), true);
  });
  await runner.run('cue hold from the dock auditions and releases; navigation mid-hold releases safely', async () => {
    await page.evaluate(() => { Mixline.engine.pause(0); Mixline.engine.seek(0, 2); });
    const cue = page.locator('[data-dock-cue="0"]');
    let b = await cue.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.waitForFunction(() => Mixline.engine.decks[0].playing);
    await page.mouse.up();
    await page.waitForFunction(() => !Mixline.engine.decks[0].playing);
    assert.ok(Math.abs(await page.evaluate(() => Mixline.engine.position(0)) - 2) < 0.05);
    b = await cue.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.waitForFunction(() => Mixline.engine.decks[0].playing);
    await page.evaluate(() => Mixline.router.navigate('mixer'));
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => Mixline.engine.decks[0].playing), false);
    await nav('decks');
  });
  await runner.run('decks: platter scratch, sync and tempo controls act on the engine', async () => {
    await page.evaluate(() => Mixline.engine.play(0));
    const platter = page.locator('[data-platter="0"]');
    await platter.scrollIntoViewIfNeeded();
    const b = await platter.boundingBox();
    await page.mouse.move(b.x + b.width * 0.8, b.y + b.height / 2); await page.mouse.down();
    await page.waitForFunction(() => Mixline.engine.decks[0].scratching);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.85, {steps: 6});
    await page.mouse.up();
    await page.waitForFunction(() => !Mixline.engine.decks[0].scratching && Mixline.engine.decks[0].playing);
    await page.locator('[data-sync="1"]').click();
    await page.waitForFunction(() => Math.abs(Mixline.engine.decks[1].rate - 120 / 126) < 1e-6);
    await page.locator('[data-tempo-reset="1"]').click();
    assert.equal(await page.evaluate(() => Mixline.engine.decks[1].rate), 1);
  });
  await runner.run('deck focus view opens with detail waveform, hot cues and the other deck strip; back returns', async () => {
    await page.locator('[data-focus="0"]').click();
    await page.waitForFunction(() => Mixline.router.current.params.focus === 0);
    assert.equal(await page.locator('.deck-focus [data-wave-kind="detail"]').count(), 1);
    assert.equal(await page.locator('.deck-focus [data-hotcue]').count(), 8);
    await page.locator('.deck-focus [data-hotcue="0"]').click();
    assert.notEqual(await page.evaluate(() => Mixline.engine.decks[0].cues[0]), null);
    assert.equal(await page.locator('.deck-focus [data-other-play="1"]').count(), 1);
    await shot('deck-focus-412x915');
    await page.locator('[data-focus-back]').click();
    await page.waitForFunction(() => Mixline.router.current.params.focus === undefined);
  });
  await runner.run('empty deck state offers Library and loading/replace protection asks first', async () => {
    await page.evaluate(() => Mixline.engine.eject(1));
    await page.waitForSelector('[data-deck="1"] [data-load-from-library]');
    await page.evaluate(() => Mixline.loadDemo(1, 'demo-blue'));
    await page.waitForFunction(() => Mixline.engine.decks[1].track);
    await page.evaluate(() => Mixline.engine.play(1));
    const pending = page.evaluate(() => Mixline.loadDemo(1, 'demo-coast'));
    await page.waitForSelector('dialog.modal[open]');
    await page.locator('dialog.modal button[value="cancel"]').click();
    assert.equal(await pending, false);
    assert.equal(await page.evaluate(() => Mixline.engine.decks[1].track.id), 'demo-blue');
    assert.equal(await page.evaluate(() => Mixline.engine.decks[1].playing), true);
  });
  await runner.run('no horizontal overflow and dock reachable in portrait and landscape', async () => {
    for (const [w, h] of [[412, 915], [915, 412]]) {
      await page.setViewportSize({width: w, height: h});
      await page.waitForTimeout(150);
      const box = await page.evaluate(() => { const d = document.querySelector('#dock').getBoundingClientRect(); return {overflow: document.documentElement.scrollWidth > innerWidth + 1, dockBottom: d.bottom, h: innerHeight}; });
      assert.equal(box.overflow, false, `${w}x${h} overflow`);
      assert.ok(box.dockBottom <= box.h + 1, `${w}x${h} dock ${JSON.stringify(box)}`);
      await shot(`decks-${w}x${h}`);
    }
    await page.setViewportSize({width: 412, height: 915});
  });
  await runner.run('no page errors', async () => { assert.deepEqual(errors, []); });
} catch (e) {
  runner.failures.push({title: 'bootstrap', message: e.message}); console.error(e);
} finally { await close(); await site.close(); await runner.finish(); }
