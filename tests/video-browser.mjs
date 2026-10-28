import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const baseURL=process.env.MIXLINE_BASE_URL||'http://127.0.0.1:8080';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:412,height:915}});
await context.addInitScript(()=>{
 window.__mockPlayers=[];
 window.YT={Player:function(host,options){
  const frame=document.createElement('iframe');frame.id=host.id;frame.src='about:blank';frame.setAttribute('data-mocked','true');host.replaceWith(frame);
  const p={options,frame,position:0,volume:100,playing:false,videoId:null,
   getIframe(){return frame;},setVolume(v){this.volume=v;},getCurrentTime(){return this.position;},getDuration(){return 180;},
   cueVideoById(t){this.videoId=t.videoId;this.position=t.startSeconds;queueMicrotask(()=>options.events.onStateChange({data:5}));},
   playVideo(){this.playing=true;options.events.onStateChange({data:1});},
   pauseVideo(){this.playing=false;options.events.onStateChange({data:2});},
   seekTo(t){this.position=t;},destroy(){frame.remove();},
   simulate(code){this.playing=code===1;options.events.onStateChange({data:code});},
   fail(code){this.playing=false;options.events.onError({data:code});}
  };window.__mockPlayers.push(p);setTimeout(()=>options.events.onReady({target:p}),0);return p;
 }};
});
const page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',message:e.message});}finally{await page.evaluate(()=>{const d=document.querySelector('dialog[open]');d?.close();});}}
await page.goto(baseURL);await page.waitForFunction(()=>window.Mixline?.store);
await check('video queue can be authored without remote media',async()=>{
 await page.click('#video-mode');await page.waitForFunction(()=>window.Mixline.video.decks.every(d=>d.ready));
 await page.locator('[data-add-video]').first().click();await page.fill('#video-url','https://youtu.be/dQw4w9WgXcQ');await page.fill('#video-label','Mock beat one');await page.fill('#video-start','15');await page.locator('#video-form button').click();
 assert.equal(await page.evaluate(()=>Mixline.state.queue.length),1);
 assert.equal(await page.evaluate(()=>Mixline.state.queue[0].start),15);
});
await check('queue persistence survives page reload',async()=>{
 await page.reload();await page.waitForFunction(()=>window.Mixline?.state.queue.length===1);
 assert.equal(await page.evaluate(()=>Mixline.state.queue[0].title),'Mock beat one');
 await page.click('#video-mode');await page.waitForFunction(()=>window.Mixline.video.decks.every(d=>d.ready));
});
await check('load next cues deck without starting it; nodes persist across routes',async()=>{
 await page.locator('[data-next]').click();await page.waitForFunction(()=>Mixline.state.prepared);
 assert.equal(await page.evaluate(()=>Mixline.video.decks[1].track.start),15);
 assert.equal(await page.evaluate(()=>Mixline.video.decks[1].playing),false);
 const before=await page.evaluate(()=>{window.__firstFrames=[...document.querySelectorAll('#video-stage iframe')];return __firstFrames.length;});
 assert.equal(before,2);await page.evaluate(()=>Mixline.navigate('tools'));
 assert.equal(await page.evaluate(()=>__firstFrames.every(f=>f.isConnected)),true);
 await page.evaluate(()=>Mixline.navigate('challenge'));
});
await check('both mocked player boxes meet 200 px minimum',async()=>{
 const boxes=await page.locator('#video-stage iframe').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
 assert.equal(boxes.length,2);for(const b of boxes)assert.ok(b.width>=200&&b.height>=200,JSON.stringify(b));
});
await check('cut succeeds only on player event, then queue preparation is cleared',async()=>{
 await page.locator('[data-next-cut]').click();
 await page.waitForFunction(()=>Mixline.video.crossfade===1);
 assert.equal(await page.evaluate(()=>Mixline.video.decks[1].playing),true);
 assert.equal(await page.evaluate(()=>Mixline.state.prepared),null);
});
await check('opening a dialog pauses video before obscuring its player',async()=>{
 await page.locator('[data-add-video]').first().click();
 assert.equal(await page.evaluate(()=>Mixline.video.decks.some(d=>d.playing)),false);
 await page.getByRole('button',{name:'Close',exact:true}).click();
});
await check('switching playback source pauses video and hides its stage',async()=>{
 await page.evaluate(()=>Mixline.video.play(1));await page.click('#audio-mode');
 assert.equal(await page.evaluate(()=>Mixline.video.decks.some(d=>d.playing)),false);
 assert.equal(await page.locator('#video-stage').isVisible(),false);
});
await check('failed Cut now retains prepared next track for recovery',async()=>{
 await page.click('#video-mode');await page.waitForFunction(()=>window.Mixline.video.decks.every(d=>d.ready));
 await page.locator('[data-add-video]').first().click();await page.fill('#video-url','https://youtu.be/aqz-KE-bpKQ');await page.fill('#video-label','Mock unavailable beat');await page.locator('#video-form button').click();
 await page.locator('[data-next]').click();await page.waitForFunction(()=>Mixline.state.prepared);
 await page.evaluate(()=>{const i=Mixline.state.prepared.deck;__mockPlayers[i].playVideo=function(){this.fail(100);};});
 await page.locator('[data-next-cut]').click();
 await page.waitForTimeout(100);
 assert.notEqual(await page.evaluate(()=>Mixline.state.prepared),null);
});
await check('offscreen players pause before queue browsing hides active video',async()=>{
 await page.evaluate(()=>{window.scrollTo(0,0);Mixline.video.play(1);});
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(400);
 const result=await page.evaluate(()=>{const d=Mixline.video.decks[1],r=document.querySelector('#video-player-1').getBoundingClientRect();return {playing:d.playing,visible:r.top>=0&&r.bottom<=document.querySelector('#dock').getBoundingClientRect().top};});
 assert.ok(!result.playing||result.visible,JSON.stringify(result));
});
await check('mocked integration produces no uncaught browser exceptions',async()=>assert.deepEqual(errors,[]));
for(const size of [{width:412,height:915},{width:915,height:412}]) {
 await check(`players and scrolling queue fit dock-safe viewport ${size.width}x${size.height}`,async()=>{
  await page.setViewportSize(size);await page.waitForTimeout(100);
  const geometry=await page.evaluate(()=>{const bounds=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return {players:[...document.querySelectorAll('#video-stage iframe')].map(bounds),main:bounds(document.querySelector('#main')),dock:bounds(document.querySelector('#dock'))};});
  for(const p of geometry.players)assert.ok(p.width>=200&&p.height>=200&&p.top>=0&&p.bottom<=geometry.dock.top+1,JSON.stringify(geometry));
  assert.ok(geometry.main.bottom<=geometry.dock.top+1,JSON.stringify(geometry));
 });
}
const offlineContext=await browser.newContext({viewport:{width:412,height:915}});
await offlineContext.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
const offlinePage=await offlineContext.newPage();offlinePage.setDefaultTimeout(7000);
try {
 await offlinePage.goto(baseURL);await offlinePage.waitForFunction(()=>window.Mixline?.store);
 await offlinePage.click('#video-mode');await offlinePage.locator('[data-add-video]').first().click();
 await offlinePage.fill('#video-url','https://youtu.be/dQw4w9WgXcQ');await offlinePage.fill('#video-label','Offline preparation');await offlinePage.locator('#video-form button').click();
 assert.equal(await offlinePage.evaluate(()=>Mixline.state.queue[0].title),'Offline preparation');
 assert.equal(await offlinePage.evaluate(()=>Mixline.video.decks.some(d=>d.ready)),false);
 results.push({name:'queue-only preparation remains usable when iframe API is blocked',status:'PASS'});
} catch(e) {results.push({name:'queue-only preparation remains usable when iframe API is blocked',status:'FAIL',message:e.message});}
await offlineContext.close();
await mkdir('artifacts/v5-verification',{recursive:true});
await writeFile('artifacts/v5-verification/video-results.json',JSON.stringify({scope:'Mocked official player events; not live YouTube',results},null,2));
console.log(JSON.stringify({scope:'Mocked official player events and blocked-network queue preparation; NOT live YouTube playback',results},null,2));
await browser.close();
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
