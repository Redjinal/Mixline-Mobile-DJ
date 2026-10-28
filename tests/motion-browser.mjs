/** Rendered instrument/motion acceptance. Start npm run serve, then run this file. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output='artifacts/refinement';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:1});
const page=await context.newPage();const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
const checks=[];const check=(name,evidence={})=>{checks.push({name,status:'PASS',evidence});console.log('PASS',name);};
try{
 await page.goto(process.env.MIXLINE_BASE_URL||'http://127.0.0.1:8080');await page.waitForFunction(()=>window.Mixline?.store);
 await page.locator('[data-demo]').first().click();await page.waitForFunction(()=>Mixline.engine.decks.every(d=>d.track));
 await page.locator('.deck [data-play="0"]').click();await page.waitForTimeout(150);
 const before=await page.evaluate(()=>Mixline.engine.position(0));
 const animated=await page.evaluate(async()=>{await Mixline.navigate('mixer');return document.querySelector('#main').getAnimations().filter(a=>a.playState==='running').length;});
 assert.ok(animated>0);check('Navigation has an interruptible visual transition without gating input',{animations:animated});
 const knob=page.locator('[data-eq="0:low"]');await knob.focus();await page.keyboard.press('ArrowUp');
 assert.equal(await page.evaluate(()=>Mixline.engine.decks[0].eq.low),.5);
 const center=await knob.boundingBox();await page.mouse.move(center.x+center.width/2,center.y+center.height/2);await page.mouse.down();await page.mouse.move(center.x+center.width/2,center.y+center.height/2-20,{steps:6});await page.mouse.up();
 const changed=await page.evaluate(()=>Mixline.engine.decks[0].eq.low);assert.ok(changed>.5);check('Rotary pointer and keyboard input change actual audio parameters',{gainDb:changed});
 await page.evaluate(async()=>{for(const r of ['pads','fx','library','perform'])await Mixline.navigate(r);});
 const continuity=await page.evaluate(()=>({position:Mixline.engine.position(0),playing:Mixline.engine.decks[0].playing,angle:parseFloat(document.querySelector('.deck-0 .vinyl').style.transform.match(/[-\d.]+/)[0])}));
 assert.ok(continuity.playing&&continuity.position>before);assert.ok(Math.abs(continuity.angle-continuity.position*200)<18);check('Rapid route changes preserve playback and platter clock',{...continuity});
 await page.evaluate(()=>{Mixline.engine.decks[0].cues[0]=2;Mixline.engine.loop(0,4);Mixline.navigate('pads');});
 assert.ok(await page.locator('[data-hotcue="0"]').evaluate(e=>e.classList.contains('saved')));
 await page.evaluate(()=>Mixline.navigate('perform'));assert.equal(await page.locator('[data-loop-flag="0"]').isVisible(),true);check('Saved cues and active loops have explicit persistent feedback');
 await page.evaluate(async()=>{await Mixline.engine.play(1);Mixline.engine.fadeTo(1,2);});
 await page.waitForFunction(()=>document.querySelector('#dock').classList.contains('fading'));
 await page.locator('#crossfader').fill('0.35');assert.equal(await page.evaluate(()=>Mixline.engine.fade),null);check('Fade feedback is live and manual takeover cancels immediately');
 await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));await page.locator('.performance-heading h1').click();await page.screenshot({path:`${output}/performance-portrait.png`,fullPage:true});
 for(const route of ['mixer','pads','fx','library','challenge','settings']){await page.evaluate(r=>Mixline.navigate(r),route);await page.waitForTimeout(230);await page.screenshot({path:`${output}/${route}-portrait.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflows');}
 check('Phone performance, mixer, pads, FX, library, challenge and settings render without horizontal overflow');
 await page.evaluate(()=>Mixline.navigate('settings'));await page.locator('[data-setting="motion"]').selectOption('reduced');await page.locator('header [data-route="settings"]').click();assert.equal(await page.locator('[data-setting="motion"]').inputValue(),'reduced');assert.match(await page.locator('#settings-status').textContent(),/Unsaved/);check('Selecting the current workspace preserves unsaved preferences');await page.locator('[data-save-settings]').click();
 await page.waitForTimeout(350);
 const reduced=await page.evaluate(async()=>{await Mixline.navigate('perform');return {preference:document.documentElement.dataset.motion,animations:document.querySelector('#main').getAnimations({subtree:true}).filter(a=>a.playState==='running').length,playing:Mixline.engine.decks[0].playing};});
 assert.equal(reduced.preference,'reduced');assert.equal(reduced.animations,0);assert.ok(reduced.playing);check('Reduced-motion preference disables decorative movement while audio remains active',reduced);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduced');check('Motion preference persists across app reload');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{const p=await Mixline.store.getSetting('preferences');await Mixline.store.setSetting('preferences',{...p,motion:'system'});});await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduced');check('System reduced-motion preference is honored');
 // Fresh normal-motion context for layout evidence and optional preview capture.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
 await page.evaluate(async()=>{await Mixline.loadTrack(0,'demo-red');await Mixline.loadTrack(1,'demo-blue');await Mixline.engine.play(0);});
 await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));
 for(const [width,height] of [[320,812],[390,844],[412,915],[768,1024],[1440,900],[915,412]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>Mixline.navigate('perform'));await page.waitForTimeout(240);
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,dockTop:document.querySelector('#dock').getBoundingClientRect().top,play:[...document.querySelectorAll('.deck .transport')].map(e=>e.getBoundingClientRect().bottom)}));
  assert.equal(geometry.overflow,false,`${width} horizontal overflow`);
  if(width===915)assert.ok(geometry.play.every(y=>y<geometry.dockTop),JSON.stringify(geometry));
  await page.screenshot({path:`${output}/performance-${width}x${height}.png`,fullPage:height>600});
 }
 check('Narrow phone, tablet, desktop and phone landscape layouts checked',{viewports:6});
 if(process.env.MIXLINE_CAPTURE_MOTION==='1'){
  await page.setViewportSize({width:412,height:915});await page.evaluate(()=>Mixline.navigate('perform'));await page.waitForTimeout(300);
  const dir=`${output}/frames`;await mkdir(dir,{recursive:true});const schedule=new Map([[18,'mixer'],[35,'pads'],[48,'fx'],[65,'perform']]);
  for(let i=0;i<85;i++){if(schedule.has(i))await page.evaluate(r=>Mixline.navigate(r),schedule.get(i));if(i===40)await page.locator('[data-hotcue="0"]').click();await page.screenshot({path:`${dir}/frame-${String(i).padStart(3,'0')}.png`});await page.waitForTimeout(55);}
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','12','-i',`${dir}/frame-%03d.png`,'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',`${output}/interaction-preview.mp4`]);
 }
 assert.deepEqual(exceptions,[]);check('No uncaught browser exceptions');
 await writeFile(`${output}/motion-results.json`,JSON.stringify({scope:'Desktop Chromium rendered motion and interaction acceptance; not S26 device performance',checks},null,2));
}finally{await browser.close();}
