/** End-to-end local workflow. Start npm run serve; run node tests/app-browser.mjs. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {makeDemo} from '../web/engine.js';
const require=createRequire(import.meta.url);
let playwright;
for(const candidate of [process.env.PLAYWRIGHT_MODULE,'playwright','playwright-core'].filter(Boolean)) {
  try {playwright=require(candidate);break;}catch{}
}
if(!playwright){
  try {const pkg=execFileSync('python3',['-c',"import pathlib,playwright;print(pathlib.Path(playwright.__file__).parent/'driver'/'package')"],{encoding:'utf8'}).trim();playwright=require(pkg);}catch{}
}
if(!playwright)throw new Error('Install Playwright, or set PLAYWRIGHT_MODULE to its installed package path.');
const output=process.env.MIXLINE_TEST_OUTPUT||'/tmp/mixline-ui-verification';await mkdir(output,{recursive:true});
const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:412,height:915},acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(15000);
const failures=[],checks=[],pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
const check=(name,evidence)=>{checks.push({name,evidence});console.log('PASS '+name);};
const wait=fn=>page.waitForFunction(fn);
const nav=async route=>{await page.locator(`nav [data-route="${route}"]`).click();await page.waitForFunction(r=>window.Mixline.state.route===r,route);};
const tools=async route=>{await nav('tools');await page.locator(`#main [data-route="${route}"]`).click();await page.waitForFunction(r=>window.Mixline.state.route===r,route);};
try {
  await page.goto(process.env.MIXLINE_BASE_URL||'http://127.0.0.1:8080');await wait(()=>window.Mixline?.state.tracks.length===0);
  await page.locator('[data-demo]').click();await wait(()=>window.Mixline.engine.decks.every(d=>d.track));
  assert.equal(await page.evaluate(()=>window.Mixline.state.tracks.length),2);
  await page.locator('#dock-play-0').click();await page.locator('#dock-play-1').click();
  await wait(()=>window.Mixline.engine.decks.every(d=>d.playing&&d.position>.2));
  check('Original demo pair loads and both decks play',await page.evaluate(()=>window.Mixline.engine.decks.map(d=>({title:d.track.title,position:d.position}))));
  await nav('library');assert.equal(await page.evaluate(()=>window.Mixline.engine.decks.every(d=>d.playing)),true);
  const fixture=await makeDemo('red');await page.locator('#files').setInputFiles({name:'Browser Fixture.wav',mimeType:'audio/wav',buffer:Buffer.from(await fixture.blob.arrayBuffer())});
  await wait(()=>window.Mixline.state.tracks.length===3);
  const importedId=await page.evaluate(()=>window.Mixline.state.tracks.find(t=>t.title==='Browser Fixture').id);
  await page.locator(`[data-prepare="${importedId}"]`).click();await page.locator('#prepare-title').fill('Prepared fixture');await page.locator('#prepare-artist').fill('Test session');await page.locator('#prepare-bpm').fill('120');await page.locator('#prepare-start').fill('2.5');await page.locator('#prepare-form button.primary').click();
  await wait(()=>!document.querySelector('#dialog').open);
  const prepared=await page.evaluate(async id=>{const row=await window.Mixline.store.getTrack(id);return {track:row.track,blobSize:row.blob.size};},importedId);
  assert.equal(prepared.track.title,'Prepared fixture');assert.equal(prepared.track.start,2.5);assert.equal(prepared.track.bpm,120);assert.equal(prepared.blobSize,fixture.blob.size);
  check('Import and preparation persist real audio with start/BPM metadata',{blobSize:prepared.blobSize,id:importedId});
  await page.locator(`[data-prepare="${importedId}"]`).click();await page.locator('#prepare-queue').click();await wait(()=>window.Mixline.state.queue.length===1&&!document.querySelector('#dialog').open);
  await nav('challenge');await page.locator('[data-next]').click();await page.locator('#confirm-yes').click();
  await wait(()=>window.Mixline.state.prepared&&window.Mixline.state.queue.length===0);
  const incoming=await page.evaluate(()=>window.Mixline.state.prepared.deck);assert.equal(incoming,1);
  assert.ok(Math.abs(await page.evaluate(()=>window.Mixline.engine.position(1))-2.5)<.01);
  assert.equal(await page.evaluate(()=>window.Mixline.engine.decks[0].playing),true);
  await page.locator('[data-next-cut]').click();await wait(()=>!window.Mixline.state.prepared&&window.Mixline.engine.crossfade===1);
  assert.equal(await page.evaluate(()=>window.Mixline.engine.decks[1].playing),true);
  assert.equal(await page.evaluate(()=>window.Mixline.engine.decks[0].playing),false);
  check('Queue preparation preserves outgoing deck, then explicit Cut hands over',{incomingDeck:2,start:2.5,outgoingPaused:true});
  await tools('record');await page.locator('[data-record]').click();await wait(()=>window.Mixline.engine.recording);
  await page.waitForTimeout(1200);await page.locator('[data-record]').click();
  await page.waitForFunction(async()=>!window.Mixline.engine.recording&&(await window.Mixline.store.listRecordings()).length===1);
  const recording=await page.evaluate(async()=>{const [r]=await window.Mixline.store.listRecordings();const b=await window.Mixline.engine.ctx.decodeAudioData(await r.blob.arrayBuffer());let peak=0;for(const v of b.getChannelData(0))peak=Math.max(peak,Math.abs(v));return {id:r.id,size:r.size,mime:r.mime,seconds:b.duration,channels:b.numberOfChannels,peak};});
  assert.ok(recording.size>1000&&recording.peak>.001&&recording.seconds>1);
  assert.equal(await page.locator('[data-export]').count(),1);
  const downloadPromise=page.waitForEvent('download');await page.locator(`[data-export="${recording.id}"]`).click();const download=await downloadPromise;await download.saveAs(path.join(output,download.suggestedFilename()));assert.match(download.suggestedFilename(),/\.webm$|\.m4a$/);
  check('Recording saves exactly once, contains audible PCM, and exports',recording);
  await tools('sessions');await page.locator('#session-name').fill('Browser acceptance set');await page.locator('[data-save-session]').click();
  await page.waitForFunction(async()=>(await window.Mixline.store.listSessions()).some(s=>s.name==='Browser acceptance set'));
  const saved=await page.evaluate(async()=>(await window.Mixline.store.listSessions()).find(s=>s.name==='Browser acceptance set'));
  await page.locator('#crossfader').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator(`[data-restore-session="${saved.id}"]`).click();await page.locator('#confirm-yes').click();
  await wait(()=>window.Mixline.state.route==='challenge'&&window.Mixline.engine.crossfade===1);
  assert.equal(await page.evaluate(()=>window.Mixline.engine.decks.every(d=>!d.playing)),true);
  assert.ok(Math.abs(await page.evaluate(()=>window.Mixline.engine.position(1))-saved.data.audio.decks[1].position)<.02);
  check('Saved session restores positions and mixer without autoplay',{session:saved.name,crossfade:1});
  await nav('library');await page.locator('[data-load="0"][data-id="demo-blue"]').click();await page.waitForFunction(()=>window.Mixline.engine.decks[0].track.id==='demo-blue');
  await page.locator(`[data-prepare="${importedId}"]`).click();await page.locator('#prepare-delete').click();await page.locator('#confirm-yes').click();
  await page.waitForFunction(id=>!window.Mixline.state.tracks.some(t=>t.id===id),importedId);
  await tools('sessions');await page.locator(`[data-restore-session="${saved.id}"]`).click();await page.locator('#confirm-yes').click();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('missing'));
  assert.equal(await page.evaluate(()=>window.Mixline.engine.decks[0].track.id),'demo-blue');
  assert.equal(await page.evaluate(()=>window.Mixline.engine.decks[1].track.title),'Prepared fixture');
  check('Missing saved file fails before replacing either current deck',{currentDeck1:'demo-blue',currentDeck2:'Prepared fixture'});
  await page.locator('header [data-route="settings"]').click();await page.locator('[data-setting="theme"]').selectOption('light');await page.locator('[data-setting="stopOutgoing"]').uncheck();await page.locator('[data-save-settings]').click();
  await wait(()=>document.body.classList.contains('light')&&!window.Mixline.state.settings.stopOutgoing);
  await page.reload();await wait(()=>window.Mixline?.state.settings.theme==='light');
  assert.equal(await page.evaluate(()=>window.Mixline.state.settings.stopOutgoing),false);
  assert.equal(await page.evaluate(()=>window.Mixline.state.tracks.length),2);
  assert.equal(await page.evaluate(async()=>(await window.Mixline.store.listRecordings()).length),1);
  assert.equal(await page.evaluate(async id=>(await window.Mixline.store.getSession(id))?.name,saved.id),'Browser acceptance set');
  check('Preferences, retained library, sessions and recording survive reload',{theme:'light',stopOutgoing:false,retainedTracks:2});
  assert.deepEqual(pageErrors,[]);check('No uncaught browser exceptions',{});
  await page.screenshot({path:path.join(output,'final-phone-state.png'),fullPage:true});
} catch(e){failures.push({message:e.message,stack:e.stack});console.error(e);await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});}
finally {await writeFile(path.join(output,'results.json'),JSON.stringify({checks,failures,pageErrors},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.length,failed:failures.length,output},null,2));if(failures.length)process.exitCode=1;
