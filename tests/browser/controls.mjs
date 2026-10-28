/** Task 5: instrument control gestures on the controls bench. */
import assert from 'node:assert/strict';
import {serve, launch, createRunner} from './_harness.mjs';

const runner = createRunner('controls');
const site = await serve();
const {page, errors, close} = await launch({viewport: {width: 800, height: 900}});
runner.setPage(page);
const box = async selector => page.locator(selector).first().boundingBox();
const drag = async (from, to, steps = 10) => { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, {steps}); };
try {
  await page.goto(site.url + 'dev/controls.html');
  await page.waitForFunction(() => window.Dev?.engine, null, {timeout: 10000});
  await runner.run('knob: vertical drag of 25 px changes the value by 25% of range and commits on release', async () => {
    const b = await box('#knob .knob-dial');
    const start = {x: b.x + b.width / 2, y: b.y + b.height / 2};
    await drag(start, {x: start.x, y: start.y - 25});
    const during = await page.evaluate(() => Dev.values.knob);
    assert.ok(Math.abs(during - 75) <= 1.5, `during ${during}`);
    await page.mouse.up();
    const after = await page.evaluate(() => ({v: Dev.values.knob, changes: Dev.values.knobChanges}));
    assert.ok(Math.abs(after.v - 75) <= 1.5); assert.equal(after.changes, 1);
    return after;
  });
  await runner.run('knob: double tap resets to default; arrow keys step', async () => {
    const b = await box('#knob .knob-dial');
    await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
    assert.equal(await page.evaluate(() => Math.round(Dev.values.knob)), 50);
    await page.locator('#knob .knob-dial').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => Math.round(Dev.values.knob)), 51);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => Math.round(Dev.values.knob)), 49);
  });
  await runner.run('fader: touching away from the handle never jumps; dragging moves relatively', async () => {
    const b = await box('#fader');
    await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.15); await page.mouse.down();
    assert.equal(await page.evaluate(() => Dev.values.fader), 0.5);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.15 - 36, {steps: 6});
    const v = await page.evaluate(() => Dev.values.fader);
    assert.ok(v > 0.6 && v < 0.75, `fader ${v}`);
    await page.mouse.up();
    const h = await box('#hfader');
    await page.mouse.move(h.x + h.width * 0.5, h.y + h.height / 2); await page.mouse.down();
    await page.mouse.move(h.x + h.width * 0.9, h.y + h.height / 2, {steps: 6}); await page.mouse.up();
    const hv = await page.evaluate(() => Dev.values.hfader);
    assert.ok(hv > 0.85, `hfader ${hv}`);
    await page.locator('#hfader').focus(); await page.keyboard.press('Home');
    assert.equal(await page.evaluate(() => Dev.values.hfader), 0);
  });
  await runner.run('xy pad: release leaves the puck latched where the finger left it', async () => {
    const b = await box('#xy');
    await drag({x: b.x + b.width * 0.25, y: b.y + b.height * 0.25}, {x: b.x + b.width * 0.75, y: b.y + b.height * 0.4});
    await page.mouse.up();
    const v = await page.evaluate(() => Dev.values.xy);
    assert.ok(Math.abs(v.x - 0.5) < 0.03 && Math.abs(v.y - 0.6) < 0.03, JSON.stringify(v));
    const puck = await box('#xy .xy-puck');
    assert.ok(Math.abs((puck.x + puck.width / 2) - (b.x + b.width * 0.75)) < 3);
  });
  await runner.run('platter: touching scratches the real deck and release resumes playback', async () => {
    const duration = await page.evaluate(() => Dev.loadDemo());
    assert.ok(duration > 20);
    await page.waitForFunction(() => Dev.engine.decks[0].playing && Dev.engine.position(0) > 0.2);
    const b = await box('#platter');
    const c = {x: b.x + b.width / 2, y: b.y + b.height / 2};
    await page.mouse.move(c.x + 60, c.y); await page.mouse.down();
    await page.waitForFunction(() => Dev.engine.decks[0].scratching);
    await page.mouse.move(c.x, c.y + 60, {steps: 8});
    await page.mouse.move(c.x - 60, c.y, {steps: 8});
    assert.equal(await page.evaluate(() => Dev.engine.decks[0].scratching), true);
    await page.mouse.up();
    await page.waitForFunction(() => !Dev.engine.decks[0].scratching && Dev.engine.decks[0].playing);
    const rotating = await page.evaluate(() => { const el = document.querySelector('#platter .platter-vinyl'); return getComputedStyle(el).transform !== 'none'; });
    assert.equal(rotating, true);
  });
  await runner.run('waveform: seek on release moves the playhead; drawn with content', async () => {
    const b = await box('#wave canvas');
    await page.evaluate(() => Dev.engine.seek(0, 1));
    await drag({x: b.x + b.width * 0.2, y: b.y + b.height / 2}, {x: b.x + b.width * 0.8, y: b.y + b.height / 2});
    const staged = await page.evaluate(() => Dev.engine.position(0));
    assert.ok(staged < 3, `seek must not apply before release: ${staged}`);
    await page.mouse.up();
    const after = await page.evaluate(() => Dev.engine.position(0));
    assert.ok(after > staged + 1, `after ${after}`);
    const painted = await page.evaluate(() => { const c = document.querySelector('#wave canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    assert.ok(painted > 500, `painted ${painted}`);
  });
  await runner.run('meter draws a level while audio plays', async () => {
    await page.waitForTimeout(200);
    const painted = await page.evaluate(() => { const c = document.querySelector('#meter canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    assert.ok(painted > 50, `painted ${painted}`);
  });
  await runner.run('no page errors', async () => { assert.deepEqual(errors, []); });
} catch (e) {
  runner.failures.push({title: 'bootstrap', message: e.message}); console.error(e);
} finally { await close(); await site.close(); await runner.finish(); }
