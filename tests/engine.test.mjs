import test from 'node:test';
import assert from 'node:assert/strict';
import {MixEngine,crossfadeGains,loopPosition,phaseAlignedPosition,makeDemo,peaksFromBuffer} from '../web/engine.js';
class Param {constructor(value=0){this.value=value;}setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node {constructor(){for(const k of ['gain','frequency','Q','delayTime','threshold','knee','ratio','attack','release','playbackRate'])this[k]=new Param();this.fftSize=512;this.connections=[];}connect(n){this.connections.push(n);}disconnect(){this.connections=[];}start(t,offset){this.started={t,offset};}stop(){this.stopped=true;}getFloatTimeDomainData(a){a.fill(0);}}
class Buffer {constructor(channels=1,length=441000,sampleRate=44100){this.numberOfChannels=channels;this.length=length;this.sampleRate=sampleRate;this.duration=length/sampleRate;this.channels=Array.from({length:channels},()=>new Float32Array(length));}getChannelData(i){return this.channels[i];}}
class Context {constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination=new Node();this.decode=async()=>new Buffer();}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createAnalyser(){return new Node();}createMediaStreamDestination(){return Object.assign(new Node(),{stream:{}});}createBiquadFilter(){return new Node();}createDelay(){return new Node();}createConvolver(){return new Node();}createBufferSource(){return new Node();}createBuffer(c,n,s){return new Buffer(c,n,s);}decodeAudioData(bytes){return this.decode(bytes);}resume(){this.state='running';}close(){this.state='closed';}}
const make=()=>{const ctx=new Context();return {ctx,e:new MixEngine({contextFactory:()=>ctx})};};
const file=new Blob(['audio']);
test('equal-power blend preserves total power; endpoints isolate decks',()=>{
 for(let n=0;n<=100;n++){const [a,b]=crossfadeGains(n/100);assert.ok(Math.abs(a*a+b*b-1)<1e-12);}
 assert.deepEqual(crossfadeGains(0),[1,0]);assert.ok(crossfadeGains(1)[0]<1e-12);
 assert.deepEqual(crossfadeGains(.49,'cut'),[1,0]);assert.deepEqual(crossfadeGains(.51,'cut'),[0,1]);
});
test('loop wrap handles multiple wraps and exact boundary without drift',()=>{
 assert.equal(loopPosition(8,{start:4,end:8},30),4);
 assert.equal(loopPosition(33.5,{start:4,end:8},40),5.5);
 assert.equal(loopPosition(3,{start:4,end:8},30),3);
 assert.equal(loopPosition(40,null,30),30);
});
test('phase alignment retains incoming beat count and target fractional beat',()=>{
 assert.equal(phaseAlignedPosition(5.1,120,4.25,120),5.25);
 assert.equal(phaseAlignedPosition(5.1,0,4.25,120),5.1);
});
test('play/pause/rate change preserve the audio-clock position',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'a',title:'Track',bpm:120},file);
 await e.play(0);ctx.currentTime=2;assert.equal(e.position(0),2);
 e.setRate(0,1.1);ctx.currentTime=4;assert.equal(e.position(0),4.2);
 e.pause(0);ctx.currentTime=8;assert.equal(e.position(0),4.2);assert.equal(e.decks[0].playing,false);
 await e.play(0);ctx.currentTime=9;assert.ok(Math.abs(e.position(0)-5.3)<1e-12);
 await e.destroy();
});
test('failed replacement preserves currently playing track and clock',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'old',bpm:120},file);await e.play(0);ctx.currentTime=1;
 ctx.decode=async()=>{throw new Error('Unsupported codec');};
 await assert.rejects(e.load(0,{id:'bad'},file),/Unsupported codec/);
 assert.equal(e.decks[0].track.id,'old');assert.equal(e.decks[0].playing,true);assert.equal(e.position(0),1);
 await e.destroy();
});
test('out-of-order decode completion cannot replace a newer load',async()=>{
 const {ctx,e}=make();await e.init();const pending=[];ctx.decode=()=>new Promise(resolve=>pending.push(resolve));
 const a=e.load(0,{id:'first'},file);await new Promise(r=>setImmediate(r));
 const b=e.load(0,{id:'second'},file);await new Promise(r=>setImmediate(r));
 pending[1](new Buffer());assert.equal(await b,true);pending[0](new Buffer());assert.equal(await a,false);
 assert.equal(e.decks[0].track.id,'second');await e.destroy();
});
test('cue and loop transport match source clock and loop disable preserves position',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'track',bpm:120},file);e.seek(0,2);e.setCue(0,0);
 e.setLoopPoints(0,2,4);await e.play(0);ctx.currentTime=5;assert.equal(e.position(0),3);
 e.loop(0,0);assert.equal(e.position(0),3);ctx.currentTime=6;assert.equal(e.position(0),4);
 e.goCue(0,0);assert.equal(e.position(0),2);e.setStartCue(0,1.5);e.cue(0);assert.equal(e.position(0),1.5);assert.equal(e.decks[0].playing,false);
 await e.destroy();
});
test('fade requires an explicitly playing incoming deck and manual movement cancels',async()=>{
 const {e}=make();await e.load(0,{id:'a',bpm:120},file);await e.load(1,{id:'b',bpm:126},file);
 assert.throws(()=>e.fadeTo(1,4),/Start the incoming/);await e.play(0);await e.play(1);
 e.fadeTo(1,4);assert.ok(e.fade);e.setCrossfade(.3);assert.equal(e.fade,null);assert.equal(e.crossfade,.3);
 assert.equal(e.decks[0].playing,true);assert.equal(e.decks[1].playing,true);await e.destroy();
});
test('sync cannot claim matching outside supported rate range',async()=>{
 const {e}=make();await e.load(0,{id:'a',bpm:80},file);await e.load(1,{id:'b',bpm:160},file);
 assert.throws(()=>e.sync(0),/outside/);assert.equal(e.decks[0].rate,1);await e.destroy();
});
test('waveform data comes from samples including negative peaks',()=>{
 const b=new Buffer(2,16,8);b.channels[0][2]=-.75;b.channels[1][10]=.5;
 assert.deepEqual(Array.from(peaksFromBuffer(b,4)),[.75,0,.5,0]);
});
test('original demo WAV contains real non-silent PCM with truthful duration/BPM',async()=>{
 for(const id of ['red','blue']){
  const {track,blob}=await makeDemo(id);const a=await blob.arrayBuffer(),v=new DataView(a);
  assert.equal(new TextDecoder().decode(a.slice(0,4)),'RIFF');assert.equal(v.getUint16(22,true),1);
  const samples=(a.byteLength-44)/2,rate=v.getUint32(24,true);assert.ok(Math.abs(samples/rate-track.duration)<.001);
  let peak=0;for(let i=44;i<a.byteLength;i+=2)peak=Math.max(peak,Math.abs(v.getInt16(i,true)));
  assert.ok(peak>1000&&peak<32767);assert.equal(track.bpm,id==='red'?120:126);
 }
});

test('slip scratch returns to the underlying timeline and respects pause interruption',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'a',bpm:120},file);await e.play(0);ctx.currentTime=2;
 e.setSlip(0,true);e.startScratch(0);ctx.currentTime=2.1;e.scratchTo(0,1.5);assert.equal(e.position(0),1.5);
 ctx.currentTime=3;e.endScratch(0);assert.equal(e.position(0),3);assert.equal(e.decks[0].playing,true);
 e.startScratch(0);ctx.currentTime=4;e.pauseAll();assert.equal(e.decks[0].scratching,false);assert.equal(e.decks[0].playing,false);
 await e.destroy();
});

test('session restore validates both files before replacing any live deck',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'old-a',bpm:120},file);await e.load(1,{id:'old-b',bpm:126},file);await e.play(0);ctx.currentTime=2;
 const snapshot=e.snapshot();snapshot.decks[0].track={id:'new-a',title:'New A'};snapshot.decks[1].track={id:'missing',title:'Missing'};
 await assert.rejects(e.restore(snapshot,async id=>id==='missing'?null:{track:{id},blob:file}),/missing/);
 assert.equal(e.decks[0].track.id,'old-a');assert.equal(e.decks[1].track.id,'old-b');assert.equal(e.decks[0].playing,true);
 assert.equal(e.position(0),2);await e.destroy();
});
test('successful restore preserves cues, loop, mixer and positions but never auto-plays',async()=>{
 const {e}=make();await e.load(0,{id:'a',bpm:120},file);await e.load(1,{id:'b',bpm:126},file);
 e.seek(0,2);e.setCue(0,3);e.setLoopPoints(0,2,4);e.setRate(0,1.05);e.setEQ(0,'low',-6);e.setCrossfade(.25);await e.play(0);
 const snapshot=e.snapshot();e.seek(0,6);e.clearCue(0,3);e.setCrossfade(1);
 await e.restore(snapshot,async id=>({track:{id},blob:file}));
 assert.equal(e.decks[0].playing,false);assert.equal(e.position(0),2);assert.equal(e.decks[0].cues[3],2);assert.equal(e.decks[0].loop.end,4);
 assert.equal(e.decks[0].rate,1.05);assert.equal(e.decks[0].eq.low,-6);assert.equal(e.crossfade,.25);await e.destroy();
});
test('a recording is not overwritten while its final chunk is pending',async()=>{
 const previous=globalThis.MediaRecorder;
 class FakeRecorder {
  static isTypeSupported(){return true;}
  constructor(){this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';}
  complete(){this.ondataavailable({data:new Blob(['recorded sound'])});this.onstop();}
 }
 globalThis.MediaRecorder=FakeRecorder;
 const {e}=make();
 try{
  await e.startRecording();const recorder=e._recorder;const stopped=e.stopRecording();
  await assert.rejects(e.startRecording(),/still finishing/);
  recorder.complete();const blob=await stopped;assert.equal(await blob.text(),'recorded sound');
  await e.startRecording();const second=e._recorder;const result=e.stopRecording();second.complete();assert.equal((await result).size,14);
 }finally{globalThis.MediaRecorder=previous;await e.destroy();}
});

test('timed fade completes once; pausing and manual takeover never emit completion',async t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const {ctx,e}=make();await e.load(0,{id:'a',bpm:120},file);await e.load(1,{id:'b',bpm:126},file);
 await e.play(0);await e.play(1);const completions=[];e.addEventListener('transitionend',event=>completions.push(event.detail));
 e.fadeTo(1,1);ctx.currentTime=.5;t.mock.timers.tick(20);assert.ok(e.crossfade>.5&&e.crossfade<1);
 e.pause(1);assert.equal(e.fade,null);ctx.currentTime=2;t.mock.timers.tick(200);assert.equal(completions.length,0);
 await e.play(1);e.fadeTo(1,1);e.setCrossfade(.2);ctx.currentTime=4;t.mock.timers.tick(200);assert.equal(completions.length,0);assert.equal(e.crossfade,.2);
 e.fadeTo(1,1);ctx.currentTime=5;t.mock.timers.tick(20);assert.deepEqual(completions,[{incoming:1}]);assert.equal(e.crossfade,1);assert.equal(e.fade,null);
 t.mock.timers.tick(1000);assert.equal(completions.length,1);await e.destroy();
});
test('cancelling from the final fader update does not emit a stale transitionend',async t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const {ctx,e}=make();await e.load(1,{id:'b',bpm:126},file);await e.play(1);let completed=0;
 e.addEventListener('transitionend',()=>completed++);
 e.addEventListener('change',()=>{if(e.crossfade===1)e.cancelFade();});
 e.fadeTo(1,1);ctx.currentTime=1;t.mock.timers.tick(20);assert.equal(completed,0);assert.equal(e.fade,null);await e.destroy();
});
