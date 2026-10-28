/** Wave desk gestures and actual engine isolation. Start npm run serve first. */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts/v5-wave',{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:412,height:915}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.MIXLINE_BASE_URL||'http://127.0.0.1:8080');await page.waitForFunction(()=>window.Mixline?.engine);await page.evaluate(()=>Mixline.demo());await page.evaluate(()=>Mixline.navigate('waves'));await page.waitForSelector('.wave5');
 await page.evaluate(()=>Mixline.engine.pauseAll());
 const original=await page.evaluate(()=>Mixline.engine.position(0));
 await page.locator('[data-wave5-mode=pan]').click();
 const area=page.locator('[data-wave5-surface=detail]');await area.scrollIntoViewIfNeeded();let b=await area.boundingBox();
 await page.mouse.move(b.x+b.width*.8,b.y+b.height*.6);await page.mouse.down();await page.mouse.move(b.x+b.width*.3,b.y+b.height*.6,{steps:10});await page.mouse.up();
 assert.equal(await page.evaluate(()=>Mixline.engine.position(0)),original);
 await page.locator('[data-wave5-mode=seek]').click();await area.scrollIntoViewIfNeeded();b=await area.boundingBox();
 await page.mouse.click(b.x+b.width*.7,b.y+b.height*.6);assert.ok(await page.evaluate(()=>Mixline.engine.position(0))>original+1);
 await page.locator('[data-wave5-form=cue] [name=name]').fill('Intro test');await page.locator('[data-wave5-form=cue] [name=position]').fill('3.25');await page.locator('[data-wave5-form=cue] button').first().click();
 assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].cueMeta[0].name),'Intro test');assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].cues[0]),3.25);
 await page.locator('[data-wave5-form=loop] [name=start]').fill('2');await page.locator('[data-wave5-form=loop] [name=end]').fill('6');await page.locator('[data-wave5-form=loop] button').first().click();assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].loop.end),6);
 await page.evaluate(()=>Mixline.engine.play(0));await page.locator('[data-wave5-mode=scratch]').click();await area.scrollIntoViewIfNeeded();b=await area.boundingBox();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.55);await page.mouse.down();await page.mouse.move(b.x+b.width*.6,b.y+b.height*.55,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].playing),true);
 await page.evaluate(()=>Mixline.engine.pauseAll());

 await page.locator('[data-wave5-mode=seek]').click();await area.scrollIntoViewIfNeeded();b=await area.boundingBox();
 const beforeCancel=await page.evaluate(()=>Mixline.engine.position(0));
 await page.mouse.move(b.x+b.width*.3,b.y+b.height*.4);await page.mouse.down();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.4,{steps:4});
 await area.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();assert.equal(await page.evaluate(()=>Mixline.engine.position(0)),beforeCancel);
 await page.mouse.move(b.x+b.width*.3,b.y+b.height*.2);await page.mouse.down();await page.mouse.move(b.x+b.width*.45,b.y+b.height*.8,{steps:6});
 assert.equal(await page.locator('[data-wave5-precision]').isVisible(),true);await page.mouse.up();
 const markers=page.locator('details').filter({has:page.locator('[data-wave5-form=marker]')});await markers.locator('summary').click();
 await page.locator('[data-wave5-form=marker] [name=name]').fill('Verse');await page.locator('[data-wave5-form=marker] [name=position]').fill('4');await page.locator('[data-wave5-form=marker] button').first().click();
 const marker=await page.evaluate(()=>Mixline.engine.decks[0].markers[0]);assert.equal(marker.name,'Verse');
 await markers.locator('summary').click();await page.locator('[data-wave5-edit-marker]').first().click();await page.locator('[data-wave5-form=marker] [name=name]').fill('Verse edited');await page.locator('[data-wave5-form=marker] button').first().click();
 assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].markers[0].name),'Verse edited');

 await page.locator('[data-wave5-action=fit]').click();await area.scrollIntoViewIfNeeded();b=await area.boundingBox();
 const beforePinch=await page.evaluate(()=>Mixline.engine.position(0));
 const initialSpan=Number.parseFloat(await page.locator('[data-wave5-window]').textContent());
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const y=b.y+b.height*.4, mid=b.x+b.width*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mid-30,y,id:1},{x:mid+30,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mid-90,y,id:1},{x:mid+90,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok(Number.parseFloat(await page.locator('[data-wave5-window]').textContent())<initialSpan);assert.equal(await page.evaluate(()=>Mixline.engine.position(0)),beforePinch);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 await page.screenshot({path:'artifacts/v5-wave/portrait.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:915,height:412});await page.screenshot({path:'artifacts/v5-wave/landscape.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS wave browser: pan isolation, seek/cancel, pinch zoom, fine preview, marker edit, cue editing, loop, scratch release, 2 viewports, no exceptions');
}finally{await browser.close();}
