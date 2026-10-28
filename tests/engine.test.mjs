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

test('main cue auditions a paused position, returns on release and cancels a rapid release',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'cue',bpm:120},file);e.seek(0,2);
 await e.cueDown(0);ctx.currentTime=1;assert.equal(e.position(0),3);assert.equal(e.decks[0].playing,true);
 e.cueUp(0);assert.equal(e.position(0),2);assert.equal(e.decks[0].playing,false);
 const pending=e.cueDown(0);e.cueUp(0);await pending;assert.equal(e.decks[0].playing,false);
 await e.play(0);ctx.currentTime=2;await e.cueDown(0);e.cueUp(0);assert.equal(e.position(0),2);assert.equal(e.decks[0].playing,false);
 await e.destroy();
});
test('temporary nudge changes clock speed then returns to selected tempo without jumping',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'nudge',bpm:120},file);e.setRate(0,1.05);await e.play(0);
 ctx.currentTime=2;e.bend(0,.04);assert.equal(e.position(0),2.1);assert.equal(e.decks[0].rate,1.05);
 ctx.currentTime=3;assert.ok(Math.abs(e.position(0)-3.19)<1e-9);e.endBend(0);
 ctx.currentTime=4;assert.ok(Math.abs(e.position(0)-4.24)<1e-9);assert.equal(e.decks[0].source.playbackRate.value,1.05);
 e.bend(0,-.04);e.pauseAll();assert.equal(e.decks[0].bend,0);await e.destroy();
});
test('manual downbeat quantizes independent cue placement and preserves the live playhead',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'grid',bpm:120},file);e.setGrid(0,{downbeat:.1});e.setQuantize(0,true);await e.play(0);ctx.currentTime=1.25;
 e.setCue(0,2,2.32);assert.equal(e.decks[0].cues[2],2.1);assert.equal(e.position(0),1.25);
 e.renameCue(0,2,'Drop','#ff4455');assert.deepEqual(e.decks[0].cueMeta[2],{name:'Drop',color:'#ff4455'});
 const marker=e.addMarker(0,{name:'Vocal',position:4.8});e.updateMarker(0,marker.id,{name:'Chorus',position:5});assert.equal(e.decks[0].markers[0].name,'Chorus');
 e.setLoopPoints(0,2.21,4.24);assert.deepEqual(e.decks[0].loop,{start:2.1,end:4.1,beats:3.999999999999999});
 e.seek(0,7);assert.equal(e.decks[0].loop,null);assert.equal(e.decks[0].playing,true);
 e.removeMarker(0,marker.id);assert.equal(e.decks[0].markers.length,0);await e.destroy();
});
test('XY retains position across bypass; reset clears effect state without changing track',async()=>{
 const {e}=make();await e.load(0,{id:'xy',bpm:120},file);e.setXY(0,.3,.6);e.setEcho(0,{beats:1,feedback:.55});
 assert.equal(e.decks[0].nodes.echo.gain.value,.39);assert.equal(e.decks[0].nodes.delay.delayTime.value,.5);
 e.setFXBypass(0,true);assert.equal(e.decks[0].fx.echo,.6);assert.equal(e.decks[0].filter,.3);assert.equal(e.decks[0].nodes.echo.gain.value,0);
 e.setFXBypass(0,false);assert.equal(e.decks[0].nodes.echo.gain.value,.39);assert.equal(e.decks[0].nodes.filter.type,'highpass');
 e.resetFX(0);assert.equal(e.decks[0].filter,0);assert.equal(e.decks[0].fx.echo,0);assert.equal(e.decks[0].track.id,'xy');await e.destroy();
});
test('EQ kill and master mute preserve their chosen levels for restoration',async()=>{
 const {e}=make();await e.init();e.setEQ(0,'low',-3);e.setEQKill(0,'low',true);assert.equal(e.decks[0].eq.low,-3);assert.equal(e.decks[0].nodes.low.gain.value,-90);
 e.setEQKill(0,'low',false);assert.equal(e.decks[0].nodes.low.gain.value,-3);
 e.setMaster(.7);e.setMasterMute(true);assert.equal(e.master,.7);assert.equal(e.masterNode.gain.value,0);e.setMasterMute(false);assert.equal(e.masterNode.gain.value,.7);await e.destroy();
});
test('new session fields round trip paused; original v1 sessions still migrate',async()=>{
 const {e}=make();await e.load(0,{id:'saved',bpm:120},file);e.setCue(0,0,2);e.renameCue(0,0,'Intro','#ffc000');e.addMarker(0,{name:'Drop',position:4});
 e.setGrid(0,{downbeat:.1});e.setQuantize(0,true);e.setXY(0,-.4,.5);e.setFXBypass(0,true);e.setEQKill(0,'high',true);e.setEcho(0,{beats:1,feedback:.6});e.setMasterMute(true);
 const saved=e.snapshot();e.resetFX(0);e.clearCue(0,0);await e.restore(saved,async id=>({track:{id},blob:file}));
 assert.equal(e.decks[0].playing,false);assert.equal(e.decks[0].cueMeta[0].name,'Intro');assert.equal(e.decks[0].markers[0].name,'Drop');assert.equal(e.decks[0].grid.downbeat,.1);
 assert.equal(e.decks[0].quantize,true);assert.equal(e.decks[0].fxBypass,true);assert.equal(e.decks[0].eqKills.high,true);assert.equal(e.decks[0].echoFeedback,.6);assert.equal(e.masterMuted,true);
 await e.restore({version:1,decks:[{track:{id:'old'},cue:0,cues:[null]},{track:null}]},async id=>({track:{id},blob:file}));
 assert.equal(e.decks[0].fxBypass,false);assert.equal(e.decks[0].quantize,false);assert.equal(e.masterMuted,false);await e.destroy();
});
test('bass exchange follows the audio clock; manual channel changes stop automation at current state',async t=>{
 t.mock.timers.enable({apis:['setInterval']});const {ctx,e}=make();await e.load(0,{id:'a',bpm:120},file);await e.load(1,{id:'b',bpm:120},file);
 await e.play(0);await e.play(1);e.setCrossfade(0);e.transitionTo(1,2,'bass');ctx.currentTime=1;t.mock.timers.tick(20);
 assert.equal(e.decks[0].eq.low,-15);assert.equal(e.decks[1].eq.low,-15);assert.equal(e.crossfade,.5);
 e.setGain(0,.7);assert.equal(e.fade,null);ctx.currentTime=2;t.mock.timers.tick(100);assert.equal(e.decks[0].eq.low,-15);assert.equal(e.crossfade,.5);await e.destroy();
});
test('prepared metadata loads independently using both legacy and new field names',async()=>{
 const {e}=make();const track={id:'prepared',bpm:124,start:1,downbeat:.2,quantize:true,cues:[1,3],cueNames:['Intro','Drop'],cueColors:['#ffaa00','#ff3355'],markers:[{id:'m',name:'Vocal',time:4}],loop:{start:1,end:3}};
 await e.load(0,track,file);assert.equal(e.decks[0].grid.downbeat,.2);assert.equal(e.decks[0].cueMeta[1].name,'Drop');assert.equal(e.decks[0].markers[0].position,4);
 track.cues[0]=9;track.markers[0].time=8;assert.equal(e.decks[0].cues[0],1);assert.equal(e.decks[0].markers[0].position,4);await e.destroy();
});
test('source capability restrictions protect recording and an existing deck',async()=>{
 const {e}=make();await e.load(0,{id:'local'},file);
 await assert.rejects(e.load(0,{id:'restricted',capabilities:{load:false}},file),/does not currently allow/);assert.equal(e.decks[0].track.id,'local');
 await e.load(1,{id:'stream',capabilities:{load:true,record:false}},file);await assert.rejects(e.startRecording(),/cannot be recorded/);
 e.eject(1);e._recorder={state:'recording'};
 await assert.rejects(e.load(1,{id:'stream',capabilities:{load:true,record:false}},file),/Stop recording/);assert.equal(e.decks[1].track,null);
 e._recorder=null;await e.destroy();
});
test('six distinct original demo records remain playable self-contained WAV files',async()=>{
 const {DEMO_TRACKS}=await import('../web/engine.js');assert.equal(DEMO_TRACKS.length,6);const ids=new Set(),sizes=new Set();
 for(const track of DEMO_TRACKS){const generated=await makeDemo(track.id);ids.add(generated.track.id);sizes.add(generated.blob.size);assert.equal(generated.blob.type,'audio/wav');assert.ok(generated.blob.size>100000);}
 assert.equal(ids.size,6);assert.equal(sizes.size,6);
});
test('tempo estimation recognizes steady audio onsets and refuses silence',async()=>{
 const {estimateBpm}=await import('../web/engine.js');const b=new Buffer(1,160000,8000),a=b.getChannelData(0);
 for(let start=0;start<a.length;start+=4000)for(let n=0;n<300;n++)a[start+n]=Math.sin(n*.3)*Math.exp(-n/40);
 const result=estimateBpm(b);assert.ok(Math.abs(result.bpm-120)<1);assert.ok(result.confidence>.5);assert.equal(estimateBpm(new Buffer(1,160000,8000)),null);
});

test('interrupting a cue audition releases it at the cue without restarting',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'cue-interruption'},file);e.seek(0,2);await e.cueDown(0);ctx.currentTime=1;e.pauseAll();e.cueUp(0);
 assert.equal(e.position(0),2);assert.equal(e.decks[0].cueHeld,null);assert.equal(e.decks[0].playing,false);await e.destroy();
});
test('restoring old source metadata cannot relax fresh recording restrictions',async()=>{
 const {e}=make();await e.load(0,{id:'stream',capabilities:{load:true,record:true}},file);const snapshot=e.snapshot();
 await e.restore(snapshot,async id=>({track:{id,capabilities:{load:true,record:false}},blob:file}));
 assert.equal(e.decks[0].track.capabilities.record,false);await assert.rejects(e.startRecording(),/cannot be recorded/);await e.destroy();
});

test('starting a recording while a restricted replacement decodes cannot commit that replacement',async()=>{
 const {ctx,e}=make();await e.load(0,{id:'local'},file);let finish;ctx.decode=()=>new Promise(resolve=>finish=resolve);
 const pending=e.load(0,{id:'stream',capabilities:{load:true,record:false}},file);await new Promise(r=>setImmediate(r));
 e._recorder={state:'recording'};finish(new Buffer());await assert.rejects(pending,/Recording started/);assert.equal(e.decks[0].track.id,'local');
 e._recorder=null;await e.destroy();
});
test('long bar transitions and slow-tempo echo time retain requested duration',async()=>{
 const {e}=make();await e.load(0,{id:'slow',bpm:30},file);await e.load(1,{id:'other',bpm:30},file);await e.play(1);
 e.transitionTo(1,128,'blend');assert.equal(e.fade.duration,128);e.cancelFade();e.setEcho(0,{beats:4});assert.equal(e.decks[0].nodes.delay.delayTime.value,8);await e.destroy();
});

test('restoration preserves custom short loop exactly even when quantize was later enabled',async()=>{
 const {e}=make();await e.load(0,{id:'custom',bpm:120},file);e.setLoopPoints(0,2.1,2.2);e.setQuantize(0,true);const snapshot=e.snapshot();
 await e.restore(snapshot,async id=>({track:{id},blob:file}));assert.equal(e.decks[0].loop.start,2.1);assert.equal(e.decks[0].loop.end,2.2);await e.destroy();
});
