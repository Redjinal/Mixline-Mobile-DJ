/** Real Chromium 5.0 workflow checks. Run npm run serve, then npm run test:v5. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
let playwright;
for(const candidate of [process.env.PLAYWRIGHT_MODULE,'playwright','playwright-core'].filter(Boolean))try{playwright=require(candidate);break;}catch{}
if(!playwright){const pkg=execFileSync('python3',['-c',"import pathlib,playwright;print(pathlib.Path(playwright.__file__).parent/'driver'/'package')"],{encoding:'utf8'}).trim();playwright=require(pkg);}
const output=process.env.MIXLINE_TEST_OUTPUT||'artifacts/v5-verification';await mkdir(output,{recursive:true});
const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:412,height:915},acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(15000);
const checks=[],failures=[],exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
const check=async(name,fn)=>{try{const evidence=await fn();checks.push({name,evidence:evidence||{}});console.log('PASS '+name);}catch(e){failures.push({name,message:e.message,stack:e.stack});console.error('FAIL '+name+': '+e.message);await page.screenshot({path:path.join(output,`failure-${failures.length}.png`),fullPage:true}).catch(()=>{});}};
const nav=async(route)=>{const direct=page.locator(`nav [data-route="${route}"]`);if(await direct.count())await direct.click();else await page.evaluate(r=>Mixline.navigate(r),route);await page.waitForFunction(r=>Mixline.state.route===r,route);};
try{
 await page.goto(process.env.MIXLINE_BASE_URL||'http://127.0.0.1:8080');await page.waitForFunction(()=>window.Mixline?.store);
 await page.locator('[data-demo]').first().click();await page.waitForFunction(()=>Mixline.engine.decks.every(d=>d.track));
 await check('Six original demos are durable and both decks load',async()=>{assert.equal(await page.evaluate(()=>Mixline.state.tracks.filter(t=>t.demo).length),6);return await page.evaluate(()=>Mixline.engine.decks.map(d=>({title:d.track.title,duration:d.duration})));});
 await check('Direct six-workspace navigation preserves live playback',async()=>{
  const routes=['perform','waves','mixer','pads','fx','library'];
  for(const route of routes)assert.equal(await page.locator(`nav [data-route="${route}"]`).count(),1,route);
  await page.locator('#dock-play-0').click();await page.waitForFunction(()=>Mixline.engine.decks[0].playing&&Mixline.engine.position(0)>.1);
  const before=await page.evaluate(()=>Mixline.engine.position(0));for(const route of routes)await nav(route);
  assert.ok(await page.evaluate(p=>Mixline.engine.decks[0].playing&&Mixline.engine.position(0)>p,before));return {routes};
 });
 await check('Real audio Cue hold and temporary bend return safely',async()=>{
  return await page.evaluate(async()=>{const e=Mixline.engine;e.pause(0);e.setStartCue(0,1);e.seek(0,3);await e.cueDown(0);if(!e.decks[0].playing)throw new Error('Cue hold did not audition');e.cueUp(0);if(e.decks[0].playing||Math.abs(e.position(0)-3)>.02)throw new Error('Cue release did not return paused');e.setRate(0,1.02);e.bend(0,.04);e.endBend(0);if(e.decks[0].rate!==1.02)throw new Error('Nudge changed chosen tempo');await e.play(0);return {cue:e.decks[0].cue,rate:e.decks[0].rate};});
 });
 await check('Held Cue and platter release safely across navigation',async()=>{
  await nav('perform');await page.evaluate(()=>{Mixline.engine.pause(0);Mixline.engine.seek(0,2);});const cue=page.locator('#dock [data-main-cue="0"]');let b=await cue.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForFunction(()=>Mixline.engine.decks[0].playing);await page.evaluate(()=>Mixline.navigate('mixer'));await page.mouse.up();assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].playing),false);
  await cue.evaluate(el=>{el.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));el.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true}));});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].playing),false);
  await nav('perform');await page.evaluate(()=>Mixline.engine.play(0));const platter=page.locator('[data-platter="0"]');await platter.scrollIntoViewIfNeeded();b=await platter.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForFunction(()=>Mixline.engine.decks[0].scratching);await page.evaluate(()=>Mixline.navigate('fx'));await page.mouse.up();assert.ok(await page.evaluate(()=>!Mixline.engine.decks[0].scratching&&Mixline.engine.decks[0].playing));return {heldCueReleased:true,rapidCueNoLatePlay:true,scratchReleased:true};
 });
 await check('XY gesture stays latched through navigation',async()=>{
  await nav('fx');const pad=page.locator('#xy-pad');await pad.scrollIntoViewIfNeeded();const b=await pad.boundingBox();assert.ok(b&&b.width>100&&b.height>100);
  await page.mouse.move(b.x+b.width*.55,b.y+b.height*.7);await page.mouse.down();await page.mouse.move(b.x+b.width*.78,b.y+b.height*.42,{steps:8});await page.mouse.up();
  const state=await page.evaluate(()=>({filter:Mixline.engine.decks[0].filter,echo:Mixline.engine.decks[0].fx.echo}));assert.ok(state.filter>.1&&state.echo>.1);
  await nav('mixer');await nav('fx');assert.deepEqual(await page.evaluate(()=>({filter:Mixline.engine.decks[0].filter,echo:Mixline.engine.decks[0].fx.echo})),state);return state;
 });
 await check('FX bypass remembers position and reset neutralizes real parameters',async()=>{
  const before=await page.evaluate(()=>({filter:Mixline.engine.decks[0].filter,echo:Mixline.engine.decks[0].fx.echo}));await page.locator('[data-v5-bypass]').click();assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].fxBypass),true);assert.deepEqual(await page.evaluate(()=>({filter:Mixline.engine.decks[0].filter,echo:Mixline.engine.decks[0].fx.echo})),before);await page.locator('[data-v5-bypass]').click();await page.locator('[data-v5-reset]').click();assert.deepEqual(await page.evaluate(()=>({filter:Mixline.engine.decks[0].filter,echo:Mixline.engine.decks[0].fx.echo})),{filter:0,echo:0});return before;
 });
 await check('Wave pan and cancelled seek preserve playhead; exact seek and cue edit apply',async()=>{
  await page.evaluate(()=>{Mixline.engine.pause(0);Mixline.engine.seek(0,4);});await nav('waves');await page.locator('[data-wave5-deck="0"]').click();
  await page.locator('[data-wave5-mode="pan"]').click();const surface=page.locator('[data-wave5-surface="detail"]');await surface.scrollIntoViewIfNeeded();let b=await surface.boundingBox();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.45);await page.mouse.down();await page.mouse.move(b.x+b.width*.25,b.y+b.height*.45,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>Mixline.engine.position(0)),4);
  await page.locator('[data-wave5-mode="seek"]').click();await surface.scrollIntoViewIfNeeded();b=await surface.boundingBox();await page.mouse.move(b.x+b.width*.3,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(b.x+b.width*.8,b.y+b.height*.5,{steps:5});await surface.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();assert.equal(await page.evaluate(()=>Mixline.engine.position(0)),4);
  await page.locator('[data-wave5-form="seek"] [name="position"]').fill('2.125');await page.locator('[data-wave5-form="seek"] button').click();assert.equal(await page.evaluate(()=>Mixline.engine.position(0)),2.125);
  await page.locator('[data-wave5-form="cue"] [name="name"]').fill('Browser cue');await page.locator('[data-wave5-form="cue"] [name="position"]').fill('3');await page.locator('[data-wave5-form="cue"] button[type="submit"], [data-wave5-form="cue"] button:not([type])').first().click();assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].cueMeta[0].name),'Browser cue');return {panPreserved:4,exactSeek:2.125,cue:'Browser cue'};
 });
 await check('Master mute leaves deck clocks running',async()=>{
  return await page.evaluate(async()=>{const e=Mixline.engine;await e.play(0);const before=e.position(0);e.setMasterMute(true);await new Promise(r=>setTimeout(r,80));const after=e.position(0);if(!e.decks[0].playing||after<=before||!e.masterMuted)throw new Error('Mute stopped deck');e.setMasterMute(false);return {before,after};});
 });
 await check('Library preparation, preview and collections preserve live deck state',async()=>{
  await page.evaluate(()=>{Mixline.engine.pauseAll();Mixline.engine.seek(0,5);Mixline.engine.seek(1,7);});await nav('library');await page.locator('[data-lib="source"][data-source="local"]').first().click();
  await page.locator('[data-lib="favorite"][data-id="demo-red"]').click();await page.locator('[data-lib="select"][data-id="demo-red"]').click();
  await page.locator('[data-lib="add-crate"]').click();await page.locator('#lib-name-form [name="name"]').fill('Browser practice set');await page.locator('#lib-name-form button').click();await page.waitForFunction(()=>!document.querySelector('#dialog').open);
  await page.locator('[data-lib="prepare-view"]').click();await page.locator('[data-lib="analyze"]').click();await page.waitForSelector('[data-lib-wave]');
  await page.locator('[data-lib-form="prepare"] [name="start"]').fill('00:02.500');await page.locator('[data-lib-form="prepare"] [name="cue0"]').fill('00:03');await page.locator('[data-lib-form="prepare"] [name="cueName0"]').fill('Intro QA');await page.locator('[data-lib-form="prepare"] [name="markers"]').fill('00:04 Vocal');await page.locator('[data-lib-form="prepare"] button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Preparation saved'));const stored=await page.evaluate(async()=>({track:(await Mixline.store.getTrack('demo-red')).track,collections:await Mixline.store.getSetting('library5')}));assert.ok(stored.track.cueMeta,JSON.stringify({keys:Object.keys(stored.track),track:stored.track}));assert.equal(stored.track.cueMeta[0].name,'Intro QA');assert.ok(stored.collections.favorites.includes('demo-red'));assert.ok(stored.collections.crates.some(c=>c.name==='Browser practice set'&&c.ids.includes('demo-red')));
  await page.locator('[data-lib="preview"]').click();await page.waitForFunction(()=>Mixline.library.state.previewPlaying);await page.locator('[data-lib-seek]').fill('6');assert.deepEqual(await page.evaluate(()=>Mixline.engine.decks.map((d,i)=>({playing:d.playing,position:Mixline.engine.position(i)}))),[{playing:false,position:5},{playing:false,position:7}]);await nav('perform');assert.equal(await page.evaluate(()=>Mixline.library.state.previewPlaying),false);return {preparedStart:stored.track.start,crate:'Browser practice set',independentPreview:true};
 });
 await check('Source setup persists public configuration without claiming connection',async()=>{
  await nav('library');await page.locator('[data-lib="sources"]').click();await page.locator('[data-lib="source-details"][data-source="jamendo"]').click();await page.locator('#lib-source-form [name="clientId"]').fill('test-public-client-id');await page.locator('#lib-source-form button').click();await page.waitForFunction(()=>!document.querySelector('#dialog').open);assert.equal(await page.evaluate(()=>Mixline.library.sources.getConfig().jamendo.clientId),'test-public-client-id');assert.match(await page.locator('.lib5').textContent(),/live|unverified|verify|configured|Client ID/i);return {publicSetupSaved:true,liveServiceVerified:false};
 });
 await check('Bass transition is interrupted by manual crossfader',async()=>{
  return await page.evaluate(async()=>{const e=Mixline.engine;await e.play(1);e.transitionTo(1,3,'bass');if(!e.fade)throw new Error('Transition did not start');e.setCrossfade(.37);if(e.fade||Math.abs(e.crossfade-.37)>.001)throw new Error('Manual takeover failed');return {crossfade:e.crossfade};});
 });
 await check('Named cues, markers, grid and latched FX survive a paused engine restore',async()=>{
  return await page.evaluate(async()=>{const e=Mixline.engine;e.setGrid(0,{downbeat:.25,bpm:120});e.setQuantize(0,true);e.setCue(0,0);e.renameCue(0,0,'Drop','#ff4358');e.addMarker(0,{name:'Vocal',position:3});e.setXY(0,.3,.25);const saved=e.snapshot();await e.restore(saved,id=>Mixline.store.getTrack(id));if(e.decks.some(d=>d.playing))throw new Error('Restore autoplayed');if(e.decks[0].cueMeta[0].name!=='Drop'||!e.decks[0].markers.some(m=>m.name==='Vocal')||!e.decks[0].quantize||e.decks[0].filter!==.3)throw new Error('Preparation or FX lost');return {cue:e.decks[0].cueMeta[0],markers:e.decks[0].markers.length};});
 });
 await check('Local master recording produces decodable non-silent audio',async()=>{
  await page.evaluate(async()=>{const e=Mixline.engine;e.setMasterMute(false);e.setCrossfade(0);await e.play(0);await e.startRecording();});await page.waitForTimeout(1100);
  await page.evaluate(()=>Mixline.engine.stopRecording());await page.waitForFunction(async()=>(await Mixline.store.listRecordings()).length>0);
  const data=await page.evaluate(async()=>{const [r]=await Mixline.store.listRecordings();const b=await Mixline.engine.ctx.decodeAudioData(await r.blob.arrayBuffer());let peak=0;for(const s of b.getChannelData(0))peak=Math.max(peak,Math.abs(s));return {bytes:r.size,seconds:b.duration,channels:b.numberOfChannels,peak};});assert.ok(data.bytes>1000&&data.seconds>1&&data.peak>.001);return data;
 });
 await check('All workspaces fit phone and landscape with reachable dock',async()=>{
  const inspected=[];for(const [width,height] of [[412,915],[915,412]]){await page.setViewportSize({width,height});for(const route of ['perform','waves','mixer','pads','fx','library','challenge','record','sessions','settings']){await nav(route);await page.waitForTimeout(250);const box=await page.evaluate(()=>{const d=document.querySelector('#dock').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,dockTop:d.top,dockBottom:d.bottom,height:innerHeight};});await page.screenshot({path:path.join(output,`${route}-${width}x${height}.png`),fullPage:false});assert.equal(box.overflow,false,`${route} ${width} overflow`);assert.ok(box.dockTop>=0&&box.dockBottom<=height+1,`${route} ${width} dock: ${JSON.stringify(box)}`);inspected.push(`${route}/${width}`);}}return {inspected};
 });
 await check('Reduced-motion preference persists and keeps controls active',async()=>{
  await page.setViewportSize({width:412,height:915});await nav('settings');await page.locator('[data-setting="motion"]').selectOption('reduced');await page.locator('[data-save-settings]').click();await nav('perform');assert.equal(await page.evaluate(()=>document.documentElement.dataset.motion),'reduced');await page.reload();await page.waitForFunction(()=>window.Mixline&&document.documentElement.dataset.motion==='reduced');return {persisted:true};
 });
 await check('No uncaught browser errors',async()=>{assert.deepEqual(exceptions,[]);return {exceptions};});
}catch(e){failures.push({name:'bootstrap',message:e.message,stack:e.stack});console.error(e);}
finally{await writeFile(path.join(output,'results.json'),JSON.stringify({scope:'Real desktop Chromium audio and UI; not physical S26 validation or live provider validation',checks,failures,exceptions},null,2));await browser.close();}
console.log(JSON.stringify({passed:checks.length,failed:failures.length,output}));if(failures.length)process.exitCode=1;
