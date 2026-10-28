/** Local-audio engine. Player-provider audio never enters this graph. */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
export function crossfadeGains(value, curve = 'blend') {
  const x = clamp(value, 0, 1);
  if (curve === 'cut') return [x < .5 ? 1 : x === .5 ? 1 : 0, x > .5 ? 1 : x === .5 ? 1 : 0];
  return [Math.cos(x * Math.PI / 2), Math.sin(x * Math.PI / 2)];
}
export function loopPosition(position, loop, duration) {
  if (loop && loop.end > loop.start && position >= loop.end) {
    return loop.start + ((position - loop.start) % (loop.end - loop.start));
  }
  return clamp(position, 0, duration);
}
export function phaseAlignedPosition(position, currentBpm, targetPosition, targetBpm) {
  if (!(currentBpm > 0 && targetBpm > 0)) return position;
  const beat = 60 / currentBpm;
  const targetPhase = (targetPosition / (60 / targetBpm)) % 1;
  return Math.floor(position / beat) * beat + targetPhase * beat;
}
export function peaksFromBuffer(buffer, count = 512) {
  const output = new Float32Array(count), step = Math.max(1, Math.floor(buffer.length / count));
  const channels = Array.from({length: buffer.numberOfChannels}, (_, i) => buffer.getChannelData(i));
  for (let b = 0; b < count; b++) {
    const end = Math.min(buffer.length, (b + 1) * step);
    for (let s = b * step; s < end; s += Math.max(1, Math.floor(step / 96))) {
      for (const ch of channels) output[b] = Math.max(output[b], Math.abs(ch[s] || 0));
    }
  }
  return output;
}
/** Low-cost onset autocorrelation; an estimate, never a claimed perfect beat grid. */
export function estimateBpm(buffer) {
  if(!buffer?.length || buffer.duration<4)return null;
  const hz=100,hop=Math.max(1,Math.floor(buffer.sampleRate/hz));
  const count=Math.min(Math.floor(buffer.length/hop),180*hz), data=buffer.getChannelData(0);
  const onset=new Float32Array(count);let previous=0,energy=0;
  for(let n=0;n<count;n++){
    let sum=0;for(let j=0;j<hop;j+=4){const v=data[n*hop+j]||0;sum+=v*v;}
    const rms=Math.sqrt(sum/Math.ceil(hop/4));onset[n]=Math.max(0,rms-previous);previous=rms;energy+=onset[n]*onset[n];
  }
  if(energy<1e-7)return null;
  let best={score:0,lag:0};
  for(let lag=Math.ceil(hz*60/180);lag<=Math.floor(hz*60/65);lag++){
    let correlation=0,denomA=0,denomB=0;
    for(let n=lag;n<count;n++){correlation+=onset[n]*onset[n-lag];denomA+=onset[n]*onset[n];denomB+=onset[n-lag]*onset[n-lag];}
    const score=correlation/Math.max(1e-12,Math.sqrt(denomA*denomB));
    // Prefer a central tempo when identical periodic multiples are equally plausible.
    const weighted=score*(1-Math.abs(hz*60/lag-120)*.0004);
    if(weighted>best.score)best={score:weighted,lag,confidence:score};
  }
  if(best.confidence<.12)return null;
  return {bpm:Math.round(hz*60/best.lag*10)/10,confidence:Math.round(best.confidence*100)/100,method:'estimated'};
}
const canMix=track=>track?.capabilities?.mix!==false&&track?.capabilities?.load!==false;
const canRecord=track=>track?.capabilities?.record!==false&&track?.capabilities?.recording!==false;
const blankCueMeta=()=>Array.from({length:8},()=>({name:'',color:''}));
const safeColor=value=>/^#[0-9a-f]{3,8}$/i.test(String(value||''))?String(value):'';
function initialDeck() {
  return {track:null, buffer:null, playing:false, duration:0, offset:0, anchorTime:0, bpm:0,
    rate:1, bend:0, gain:1, trim:1, cue:0, cues:Array(8).fill(null), cueMeta:blankCueMeta(), markers:[], grid:{downbeat:0}, quantize:false, bpmSource:'unknown', cueHeld:null, cueHoldToken:0, loop:null, loadToken:0,
    source:null, nodes:null, peaks:new Float32Array(0), eq:{low:0,mid:0,high:0},
    filter:0, fx:{echo:0,reverb:0}, fxBypass:false, echoBeats:.5, echoFeedback:.32, eqKills:{low:false,mid:false,high:false}, tapTimes:[], loadError:null, slip:false, scratching:false, scratchState:null, scratchSources:new Set()};
}
export class MixEngine extends EventTarget {
  constructor({contextFactory} = {}) {
    super(); this.contextFactory = contextFactory; this.ctx = null;
    this.decks = [initialDeck(), initialDeck()]; this.crossfade = .5; this.curve = 'blend';
    this.master = .8; this.masterMuted=false; this.fade = null; this._fadeTimer = null; this._recorder = null;
    this._recordStarted = 0; this._recordChunks = []; this._recordBytes = 0;
    this._recordPromise = null; this._recordResolve = null;
    this.decks.forEach((d,i) => Object.defineProperty(d, 'position', {enumerable:true, get:()=>this.position(i)}));
  }
  emit(type = 'change', detail = {}) { this.dispatchEvent(new CustomEvent(type,{detail})); }
  async init() {
    if (!this.ctx) {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!this.contextFactory && !Ctx) throw new Error('This device does not provide Web Audio playback.');
      this.ctx = this.contextFactory ? this.contextFactory() : new Ctx({latencyHint:'interactive'});
      this.masterNode = this.ctx.createGain(); this.masterNode.gain.value = this.masterMuted?0:this.master;
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1; this.limiter.knee.value = 0; this.limiter.ratio.value = 20;
      this.limiter.attack.value = .003; this.limiter.release.value = .15;
      this.masterMeter = this.ctx.createAnalyser(); this.masterMeter.fftSize = 512;
      this.masterNode.connect(this.limiter); this.limiter.connect(this.masterMeter);
      this.masterMeter.connect(this.ctx.destination);
      this.recordDestination = this.ctx.createMediaStreamDestination(); this.limiter.connect(this.recordDestination);
      this.decks.forEach((d,i)=>this.createChannel(i));
      this.applyCrossfade();
      this.ctx.addEventListener?.('statechange',()=>this.emit('change',{audioState:this.ctx.state}));
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this;
  }
  createChannel(i) {
    const d=this.decks[i], c=this.ctx;
    const input=c.createGain(), low=c.createBiquadFilter(), mid=c.createBiquadFilter(), high=c.createBiquadFilter();
    low.type='lowshelf';low.frequency.value=250;
    mid.type='peaking';mid.frequency.value=1000;mid.Q.value=.8;
    high.type='highshelf';high.frequency.value=4000;
    const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=24000;filter.Q.value=.7;
    const channel=c.createGain(), mix=c.createGain(), analyser=c.createAnalyser(); analyser.fftSize=512;
    input.connect(low);low.connect(mid);mid.connect(high);high.connect(filter);filter.connect(channel);
    const outputAnalyser=c.createAnalyser();outputAnalyser.fftSize=512;
    channel.connect(analyser);analyser.connect(mix);mix.connect(outputAnalyser);outputAnalyser.connect(this.masterNode);
    const delay=c.createDelay(8), feedback=c.createGain(), echo=c.createGain();
    delay.delayTime.value=.375;feedback.gain.value=.32;echo.gain.value=0;
    filter.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(echo);echo.connect(channel);
    const reverb=c.createConvolver(), wet=c.createGain();wet.gain.value=0;
    const ir=c.createBuffer(2,Math.floor(c.sampleRate*1.3),c.sampleRate);
    let seed=1977;
    for(let k=0;k<2;k++){const a=ir.getChannelData(k);for(let j=0;j<a.length;j++){seed=(seed*16807)%2147483647;a[j]=(seed/1073741824-1)*Math.pow(1-j/a.length,2.8)*.28;}}
    reverb.buffer=ir;filter.connect(reverb);reverb.connect(wet);wet.connect(channel);
    d.nodes={input,low,mid,high,filter,channel,mix,analyser,outputAnalyser,delay,feedback,echo,reverb,wet};
    input.gain.value=d.trim;channel.gain.value=d.gain;for(const band of ['low','mid','high'])d.nodes[band].gain.value=d.eqKills[band]?-90:d.eq[band];this.applyFX(i);
  }
  deck(i) { if(i!==0&&i!==1) throw new Error('Choose Deck 1 or Deck 2.');return this.decks[i]; }
  async load(i, track, blob) {
    const d=this.deck(i), token=++d.loadToken; d.loadError=null;
    try {
      if(!canMix(track))throw new Error('This source does not currently allow loading into the DJ mixer.');
      if(this.recording&&!canRecord(track))throw new Error('Stop recording before loading this source; recording is unavailable for this track.');
      await this.init();
      if (track?.demo && !blob) ({blob}=await makeDemo(track.demo));
      if (!(blob instanceof Blob)) throw new Error('The audio file is missing. Import it again from Library.');
      if (blob.size > 150*1024*1024) throw new Error('Choose an audio file smaller than 150 MB for this test build.');
      const bytes=await blob.arrayBuffer();
      const buffer=await this.ctx.decodeAudioData(bytes);
      if (token!==d.loadToken) return false;
      if (!buffer.length || buffer.duration<.05) throw new Error('This audio file has no playable audio.');
      if(this.recording&&!canRecord(track))throw new Error('Recording started while this track was loading. Stop recording before loading this source.');
      // Commit only after decoding succeeds. Failed replacements leave the old deck intact.
      this.commitDecoded(i,track,buffer);
      this.emit('change',{loaded:i});return true;
    } catch(e) {
      if(token!==d.loadToken)return false;
      d.loadError=e.message;this.emit('error',{deck:i,message:e.message});
      throw e;
    }
  }
  commitDecoded(i,track,buffer) {
    const d=this.deck(i);this.cancelFade();if(d.scratching)this.endScratch(i,{resume:false});this.stopSource(d);
    d.buffer=buffer;d.track={...track,duration:buffer.duration};d.duration=buffer.duration;
    d.offset=clamp(track.start || track.cue || 0,0,Math.max(0,d.duration-.01));
    d.bpm=Number(track.bpm)||0;d.bpmSource=track.bpmSource||(d.bpm?'provided':'unknown');d.cue=d.offset;d.rate=1;d.bend=0;d.cueHeld=null;d.cueHoldToken++;d.playing=false;d.loop=null;
    d.cueMeta=Array.from({length:8},(_,j)=>({name:String(track.cueMeta?.[j]?.name||track.cueNames?.[j]||'').slice(0,40),color:safeColor(track.cueMeta?.[j]?.color||track.cueColors?.[j])}));
    d.grid={downbeat:clamp(track.grid?.downbeat??track.downbeat??0,0,d.duration)};d.quantize=!!track.quantize;
    d.markers=(Array.isArray(track.markers)?track.markers:[]).slice(0,128).map((m,j)=>({id:String(m.id||`marker-${j}`),name:String(m.name||'Marker').slice(0,40),position:clamp(m.position??m.time,0,d.duration),color:safeColor(m.color)}));
    if(track.loop?.end>track.loop?.start&&track.loop.end<=d.duration)d.loop={start:track.loop.start,end:track.loop.end,beats:null};
    d.cues=Array.from({length:8},(_,j)=>Number.isFinite(track.cues?.[j]) ? clamp(track.cues[j],0,d.duration) : null);
    d.peaks=peaksFromBuffer(buffer);d.tapTimes=[];d.loadError=null;
  }
  /** Restore both decks transactionally, paused; resolver(id) returns {track,blob}. */
  async restore(snapshot,resolver) {
    if(!snapshot||!Array.isArray(snapshot.decks)||snapshot.decks.length!==2)throw new Error('This is not a supported Mixline session.');
    await this.init();const tokens=this.decks.map(d=>++d.loadToken);
    try {
      const prepared=await Promise.all(snapshot.decks.map(async(saved)=>{
        if(!saved.track)return null;
        if(!canMix(saved.track))throw new Error('A saved source is unavailable for DJ mixing. Replace it before restoring.');
        if(this.recording&&!canRecord(saved.track))throw new Error('Stop recording before restoring this source.');
        let item=saved.track.demo?await makeDemo(saved.track.demo):await resolver(saved.track.id);
        if(!canMix(item?.track))throw new Error('A saved source no longer permits loading into the mixer.');
        if(this.recording&&!canRecord(item?.track))throw new Error('Stop recording before restoring this source.');
        if(!item?.blob)throw new Error(`The saved file for ${saved.track.title||'a track'} is missing. Re-import it before restoring.`);
        if(item.blob.size>150*1024*1024)throw new Error('A saved track exceeds the 150 MB test-build limit.');
        const buffer=await this.ctx.decodeAudioData(await item.blob.arrayBuffer());
        if(!buffer.length)throw new Error('A saved audio file could not be decoded.');
        const capabilities={...item.track?.capabilities,...saved.track.capabilities};
        for(const [key,value] of Object.entries(item.track?.capabilities||{}))if(value===false)capabilities[key]=false;
        return {track:{...item.track,...saved.track,capabilities},buffer};
      }));
      if(this.decks.some((d,i)=>d.loadToken!==tokens[i]))return false;
      if(this.recording&&prepared.some(item=>item&&!canRecord(item.track)))throw new Error('Recording started during restoration. Stop recording before restoring this source.');
      this.pauseAll();
      prepared.forEach((item,i)=>{
        if(!item){this.eject(i);return;}
        const saved=snapshot.decks[i];this.commitDecoded(i,item.track,item.buffer);
        const d=this.deck(i);d.bpm=Number(saved.bpm)||d.bpm;d.cue=clamp(saved.cue||0,0,d.duration);
        d.cues=Array.from({length:8},(_,j)=>Number.isFinite(saved.cues?.[j])?clamp(saved.cues[j],0,d.duration):null);
        d.cueMeta=Array.from({length:8},(_,j)=>({name:String(saved.cueMeta?.[j]?.name||d.cueMeta[j].name||'').slice(0,40),color:safeColor(saved.cueMeta?.[j]?.color||d.cueMeta[j].color)}));
        if(Array.isArray(saved.markers))d.markers=saved.markers.slice(0,128).map((m,j)=>({id:String(m.id||`marker-${j}`),name:String(m.name||'Marker').slice(0,40),position:clamp(m.position??m.time,0,d.duration),color:safeColor(m.color)}));
        this.setGrid(i,saved.grid||d.grid);this.setQuantize(i,saved.quantize??d.quantize);d.bpmSource=saved.bpmSource||d.bpmSource;
        this.seek(i,saved.position||0);this.setRate(i,saved.rate??1);this.setGain(i,saved.gain??1);this.setTrim(i,saved.trim??1);
        for(const band of ['low','mid','high']){this.setEQ(i,band,saved.eq?.[band]??0);this.setEQKill(i,band,!!saved.eqKills?.[band]);}
        this.setFilter(i,saved.filter??0);this.setFX(i,'echo',saved.fx?.echo??0);this.setFX(i,'reverb',saved.fx?.reverb??0);this.setEcho(i,{beats:saved.echoBeats??.5,feedback:saved.echoFeedback??.32});this.setFXBypass(i,!!saved.fxBypass);this.setSlip(i,saved.slip??false);
        if(saved.loop&&saved.loop.end>saved.loop.start&&saved.loop.end<=d.duration)this.setLoopPoints(i,saved.loop.start,saved.loop.end,{quantize:false});
      });
      this.setCrossfadeCurve(snapshot.curve);this.setCrossfade(snapshot.crossfade??.5);this.setMaster(snapshot.master??.8);this.setMasterMute(!!snapshot.masterMuted);
      this.emit('change',{restored:true});return true;
    }catch(e){
      if(this.decks.some((d,i)=>d.loadToken!==tokens[i]))return false;
      this.emit('error',{message:e.message});throw e;
    }
  }
  cancelLoad(i) { this.deck(i).loadToken++; }
  eject(i) {
    const d=this.deck(i);this.cancelFade();if(d.scratching)this.endScratch(i,{resume:false});this.stopSource(d);d.loadToken++;d.buffer=null;d.track=null;
    d.playing=false;d.offset=0;d.duration=0;d.loop=null;d.bend=0;d.cueHeld=null;d.cueHoldToken++;d.cues=Array(8).fill(null);d.cueMeta=blankCueMeta();d.markers=[];d.grid={downbeat:0};d.quantize=false;d.peaks=new Float32Array(0);this.emit();
  }
  stopSource(d) { if(d.source){d.source.onended=null;try{d.source.stop();}catch{}d.source.disconnect();d.source=null;} }
  startSource(i) {
    const d=this.deck(i);if(!d.buffer)return false;
    this.stopSource(d);
    if(d.offset>=d.duration-.001)d.offset=d.loop?.start||0;
    const s=this.ctx.createBufferSource();s.buffer=d.buffer;s.playbackRate.value=d.rate+d.bend;
    if(d.loop){s.loop=true;s.loopStart=d.loop.start;s.loopEnd=d.loop.end;}
    s.connect(d.nodes.input);d.source=s;d.anchorTime=this.ctx.currentTime;d.playing=true;
    s.onended=()=>{if(d.source===s){d.offset=d.duration;d.playing=false;d.source=null;s.disconnect();this.emit('change',{ended:i});}};
    s.start(0,d.offset);return true;
  }
  async play(i) {await this.init();const d=this.deck(i);if(this.recording&&!canRecord(d.track))throw new Error('Stop recording before playing this source.');d.cueHeld=null;d.cueHoldToken++;if(d.scratching)this.endScratch(i,{resume:false});if(!d.buffer)throw new Error('Load a track first.');if(!d.playing)this.startSource(i);this.emit();}
  pause(i) {this.cancelFade();const d=this.deck(i),audition=d.cueHeld==='audition';d.cueHeld=null;d.cueHoldToken++;if(d.scratching)this.endScratch(i,{resume:false});d.offset=audition?d.cue:this.position(i);this.stopSource(d);d.playing=false;d.bend=0;this.emit();}
  pauseAll() {this.cancelFade();this.pause(0);this.pause(1);}
  async toggle(i) {return this.deck(i).playing?this.pause(i):this.play(i);}
  position(i) {
    const d=this.decks[i];if(!d)return 0;
    const pos=d.offset+(d.playing&&this.ctx?(this.ctx.currentTime-d.anchorTime)*(d.rate+d.bend):0);
    return loopPosition(pos,d.loop,d.duration);
  }
  seek(i,position) {
    const d=this.deck(i);d.offset=clamp(position,0,Math.max(0,d.duration-.001));
    if(d.loop&&(d.offset<d.loop.start||d.offset>=d.loop.end))d.loop=null;
    if(d.playing)this.startSource(i);this.emit();
  }
  cue(i) {const d=this.deck(i);this.pause(i);this.seek(i,d.cue||0);}
  async cueDown(i) {
    const d=this.deck(i);if(!d.buffer)return;if(this.recording&&!canRecord(d.track))throw new Error('Stop recording before auditioning this source.');
    if(d.playing){this.cue(i);d.cueHeld='return';return;}
    const token=++d.cueHoldToken;d.cue=this.quantizedPosition(i,this.position(i));d.offset=d.cue;d.cueHeld='audition';
    await this.init();if(d.cueHoldToken!==token||d.cueHeld!=='audition')return;
    this.startSource(i);this.emit();
  }
  cueUp(i) {
    const d=this.deck(i),held=d.cueHeld;d.cueHeld=null;d.cueHoldToken++;
    if(held==='audition'){this.pause(i);this.seek(i,d.cue);}
  }
  returnToStart(i) {this.seek(i,0);}
  quantizedPosition(i,value) {const d=this.deck(i);if(!d.quantize||!d.bpm)return clamp(value,0,d.duration);const beat=60/d.bpm,base=d.grid.downbeat;return clamp(base+Math.round((value-base)/beat)*beat,0,d.duration);}
  setStartCue(i,value=this.position(i)) {const d=this.deck(i);d.cue=this.quantizedPosition(i,value);this.emit();}
  setCue(i,slot,position=this.position(i)) {const d=this.deck(i);if(!d.buffer)return;d.cues[Math.round(clamp(slot,0,7))]=this.quantizedPosition(i,position);this.emit();}
  clearCue(i,slot) {const d=this.deck(i);slot=Math.round(clamp(slot,0,7));d.cues[slot]=null;d.cueMeta[slot]={name:'',color:''};this.emit();}
  renameCue(i,slot,name,color) {const d=this.deck(i);slot=Math.round(clamp(slot,0,7));d.cueMeta[slot]={name:String(name||'').slice(0,40),color:safeColor(color??d.cueMeta[slot].color)};this.emit();}
  addMarker(i,{name='Marker',position=this.position(i),color='',id}={}) {const d=this.deck(i);if(d.markers.length>=128)throw new Error('This track already has 128 markers.');const marker={id:id||globalThis.crypto.randomUUID(),name:String(name).slice(0,40),position:clamp(position,0,d.duration),color:safeColor(color)};d.markers.push(marker);d.markers.sort((a,b)=>a.position-b.position);this.emit();return marker;}
  updateMarker(i,id,updates={}) {const d=this.deck(i),m=d.markers.find(m=>m.id===id);if(!m)return;Object.assign(m,{name:String(updates.name??m.name).slice(0,40),position:clamp(updates.position??m.position,0,d.duration),color:safeColor(updates.color??m.color)});d.markers.sort((a,b)=>a.position-b.position);this.emit();}
  removeMarker(i,id) {const d=this.deck(i);d.markers=d.markers.filter(m=>m.id!==id);this.emit();}
  setGrid(i,{downbeat,bpm}={}) {const d=this.deck(i);if(bpm!==undefined)this.setBpm(i,bpm);d.grid={downbeat:clamp(downbeat??d.grid.downbeat,0,d.duration)};this.emit();}
  setQuantize(i,enabled) {this.deck(i).quantize=!!enabled;this.emit();}
  analyzeBpm(i) {const d=this.deck(i),estimate=estimateBpm(d.buffer);if(!estimate)throw new Error('No reliable tempo estimate. Use Tap or enter BPM manually.');this.setBpm(i,estimate.bpm);d.bpmSource='estimated';this.emit();return estimate;}
  bend(i,amount=.04) {const d=this.deck(i);d.offset=this.position(i);d.anchorTime=this.ctx?.currentTime||0;d.bend=clamp(amount,-.08,.08);if(d.source)d.source.playbackRate.setValueAtTime(d.rate+d.bend,this.ctx.currentTime);this.emit();}
  endBend(i) {this.bend(i,0);}
  goCue(i,slot) {const p=this.deck(i).cues[clamp(slot,0,7)];if(p!==null)this.seek(i,p);}
  setRate(i,rate) {
    const d=this.deck(i);d.offset=this.position(i);d.anchorTime=this.ctx?.currentTime||0;
    d.rate=clamp(rate,.84,1.16);if(d.source)d.source.playbackRate.setValueAtTime(d.rate+d.bend,this.ctx.currentTime);this.emit();
  }
  nudge(i,beats) {const d=this.deck(i);if(!d.bpm)throw new Error('Set or tap BPM before beat jumps.');this.seek(i,this.position(i)+(60/d.bpm)*beats);}
  setBpm(i,bpm) {const d=this.deck(i);d.bpm=clamp(bpm,30,300);d.bpmSource='manual';if(d.track)d.track.bpm=d.bpm;this.applyFX(i);this.emit();}
  tap(i,time=performance.now()) {
    const d=this.deck(i);if(d.tapTimes.length&&time-d.tapTimes.at(-1)>2500)d.tapTimes=[];
    d.tapTimes.push(time);d.tapTimes=d.tapTimes.slice(-8);
    if(d.tapTimes.length>1)this.setBpm(i,60000*(d.tapTimes.length-1)/(time-d.tapTimes[0]));return d.bpm;
  }
  sync(i) {
    const d=this.deck(i),other=this.deck(1-i);
    if(!d.bpm||!other.bpm)throw new Error('Set BPM on both decks before tempo sync.');
    const desired=(other.bpm*other.rate)/d.bpm;
    if(desired<.84||desired>1.16)throw new Error('These tempos are outside the ±16% pitch range. Correct BPM or choose a closer track.');
    this.setRate(i,desired);
    this.seek(i,d.grid.downbeat+phaseAlignedPosition(this.position(i)-d.grid.downbeat,d.bpm,this.position(1-i)-other.grid.downbeat,other.bpm));
  }
  setLoopPoints(i,start,end,{quantize=true}={}) {
    const d=this.deck(i);if(!d.buffer)return;
    start=quantize?this.quantizedPosition(i,start):clamp(start,0,d.duration);end=quantize?this.quantizedPosition(i,end):clamp(end,0,d.duration);end=clamp(end,start,d.duration);
    if(end-start<.02)throw new Error('Loop out must be after loop in.');
    d.loop={start,end,beats:d.bpm?(end-start)*d.bpm/60:null};
    const pos=this.position(i);if(pos<start||pos>=end)d.offset=start;else d.offset=pos;
    if(d.playing)this.startSource(i);this.emit();
  }
  loop(i,beats) {
    const d=this.deck(i);if(!beats){d.offset=this.position(i);d.loop=null;if(d.playing)this.startSource(i);this.emit();return;}
    if(!d.bpm)throw new Error('Set or tap BPM before using beat loops.');
    const length=clamp(beats,.25,32)*60/d.bpm;
    const start=Math.min(this.position(i),Math.max(0,d.duration-length));
    this.setLoopPoints(i,start,Math.min(d.duration,start+length));
  }
  param(p,value,ramp=.015){if(!this.ctx)return;p.cancelScheduledValues(this.ctx.currentTime);p.setTargetAtTime(value,this.ctx.currentTime,ramp);}
  setEQ(i,band,db,{fromFade=false}={}) {const d=this.deck(i);if(!['low','mid','high'].includes(band))return;if(!fromFade)this.cancelFade();d.eq[band]=clamp(db,-30,12);if(d.nodes)this.param(d.nodes[band].gain,d.eqKills[band]?-90:d.eq[band]);this.emit();}
  setEQKill(i,band,enabled) {const d=this.deck(i);if(!['low','mid','high'].includes(band))return;this.cancelFade();d.eqKills[band]=!!enabled;if(d.nodes)this.param(d.nodes[band].gain,d.eqKills[band]?-90:d.eq[band]);this.emit();}
  applyFX(i) {
    const d=this.deck(i);if(!d.nodes)return;const value=d.fxBypass?0:d.filter,f=d.nodes.filter;
    f.type=value>0?'highpass':'lowpass';this.param(f.frequency,value>0?20*Math.pow(1000,value):Math.min(this.ctx.sampleRate/2,20000)*Math.pow(.002,-value));
    this.param(d.nodes.echo.gain,d.fxBypass?0:d.fx.echo*.65);this.param(d.nodes.wet.gain,d.fxBypass?0:d.fx.reverb*.65);
    this.param(d.nodes.delay.delayTime,Math.min(8,d.bpm?60/d.bpm*d.echoBeats:.375));this.param(d.nodes.feedback.gain,d.echoFeedback);
  }
  setFilter(i,value) {this.cancelFade();const d=this.deck(i);d.filter=clamp(value,-1,1);this.applyFX(i);this.emit();}
  setFX(i,type,amount,{fromFade=false}={}) {const d=this.deck(i);if(!['echo','reverb'].includes(type))return;if(!fromFade)this.cancelFade();d.fx[type]=clamp(amount,0,1);this.applyFX(i);this.emit();}
  setXY(i,x,y) {this.cancelFade();const d=this.deck(i);d.filter=clamp(x,-1,1);d.fx.echo=clamp(y,0,1);this.applyFX(i);this.emit();}
  setFXBypass(i,enabled) {this.cancelFade();this.deck(i).fxBypass=!!enabled;this.applyFX(i);this.emit();}
  resetFX(i) {this.cancelFade();const d=this.deck(i);d.filter=0;d.fx={echo:0,reverb:0};d.fxBypass=false;this.applyFX(i);this.emit();}
  setEcho(i,{beats,feedback}={}) {this.cancelFade();const d=this.deck(i);if(beats!==undefined)d.echoBeats=clamp(beats,.125,4);if(feedback!==undefined)d.echoFeedback=clamp(feedback,0,.85);this.applyFX(i);this.emit();}
  setGain(i,value) {this.cancelFade();const d=this.deck(i);d.gain=clamp(value,0,1.5);if(d.nodes)this.param(d.nodes.channel.gain,d.gain);this.emit();}
  setTrim(i,value) {this.cancelFade();const d=this.deck(i);d.trim=clamp(value,0,2);if(d.nodes)this.param(d.nodes.input.gain,d.trim);this.emit();}
  setMaster(value) {this.master=clamp(value,0,1);if(this.masterNode)this.param(this.masterNode.gain,this.masterMuted?0:this.master);this.emit();}
  setMasterMute(enabled) {this.masterMuted=!!enabled;if(this.masterNode)this.param(this.masterNode.gain,this.masterMuted?0:this.master);this.emit();}
  applyCrossfade() {const gains=crossfadeGains(this.crossfade,this.curve);this.decks.forEach((d,i)=>{if(d.nodes)this.param(d.nodes.mix.gain,gains[i]);});}
  setCrossfade(value,{fromFade=false}={}) {if(!fromFade)this.cancelFade();this.crossfade=clamp(value,0,1);this.applyCrossfade();this.emit();}
  setCrossfadeCurve(curve) {this.curve=curve==='cut'?'cut':'blend';this.applyCrossfade();this.emit();}
  fadeTo(i,seconds=4) {return this.transitionTo(i,seconds,'blend');}
  transitionTo(i,seconds=4,style='blend') {
    const d=this.deck(i);if(!d.playing)throw new Error('Start the incoming deck before fading.');
    this.cancelFade();const start=this.crossfade,target=i===0?0:1,duration=clamp(seconds,.1,600);
    style=['blend','bass','echo'].includes(style)?style:'blend';
    const outgoing=1-i,originalLow=this.decks.map(d=>d.eq.low),originalEcho=this.deck(outgoing).fx.echo;
    const transition={start,target,started:this.ctx.currentTime,duration,incoming:i,style,progress:0};this.fade=transition;
    if(style==='bass')this.setEQ(i,'low',-30,{fromFade:true});
    this._fadeTimer=setInterval(()=>{
      if(this.fade!==transition)return;const progress=clamp((this.ctx.currentTime-transition.started)/duration,0,1);
      transition.progress=progress;
      if(style==='bass'){
        this.setEQ(outgoing,'low',originalLow[outgoing]+(-30-originalLow[outgoing])*progress,{fromFade:true});
        if(this.fade!==transition)return;
        this.setEQ(i,'low',-30+(originalLow[i]+30)*progress,{fromFade:true});
      }
      if(style==='echo')this.setFX(outgoing,'echo',originalEcho+(.75-originalEcho)*progress,{fromFade:true});
      if(this.fade!==transition)return;
      this.setCrossfade(start+(target-start)*progress,{fromFade:true});
      // A change listener may cancel or replace this fade during the fader update.
      if(progress>=1&&this.fade===transition){this.cancelFade();this.emit('transitionend',{incoming:i});this.emit();}
    },20);this.emit();
  }
  cancelFade() {if(this._fadeTimer)clearInterval(this._fadeTimer);this._fadeTimer=null;this.fade=null;}
  waveform(i) {return this.deck(i).peaks;}
  meter(i) {
    const a=i===undefined?this.masterMeter:this.deck(i).nodes?.analyser;if(!a)return 0;
    const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);let power=0;for(const v of data)power+=v*v;
    return Math.sqrt(power/data.length);
  }
  outputMeter(i) {
    const a=this.deck(i).nodes?.outputAnalyser;if(!a||this.masterMuted)return 0;
    const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);let power=0;for(const v of data)power+=v*v;
    return Math.sqrt(power/data.length)*this.master;
  }
  get recording() {return this._recorder?.state==='recording';}
  get recordingElapsed() {return this.recording?(performance.now()-this._recordStarted)/1000:0;}
  async startRecording() {
    await this.init();if(this.recording)return;
    if(this.decks.some(d=>d.track&&!canRecord(d.track)))throw new Error('Remove the source that cannot be recorded from the decks before recording.');
    if(this._recordPending)throw new Error('The previous recording is still finishing. Save it before starting another.');
    if(typeof MediaRecorder==='undefined')throw new Error('Recording is unavailable in this WebView. Update Android System WebView.');
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime)throw new Error('No supported recording format is available.');
    this._recordChunks=[];this._recordBytes=0;this._recordAutoStop=false;
    this._recorder=new MediaRecorder(this.recordDestination.stream,{mimeType:mime,audioBitsPerSecond:192000});
    this._recordPending=true;this._recordPromise=new Promise(resolve=>{this._recordResolve=resolve;});
    this._recorder.ondataavailable=e=>{if(e.data.size){this._recordChunks.push(e.data);this._recordBytes+=e.data.size;}
      if(this._recordBytes>48*1024*1024&&this.recording){this._recordAutoStop=true;this._recorder.stop();this.emit('error',{message:'Recording reached the 48 MB safety limit and was stopped. Save it before continuing.'});}};
    this._recorder.onerror=e=>{this.emit('error',{message:e.error?.message||'Recording failed.'});};
    this._recorder.onstop=()=>{this._recordPending=false;const blob=new Blob(this._recordChunks,{type:mime});this._recordChunks=[];this._recordResolve?.(blob);this.emit('recording',{active:false,blob,mime,autoStop:this._recordAutoStop});this.emit();};
    this._recorder.start(1000);this._recordStarted=performance.now();this.emit('recording',{active:true,mime});this.emit();
  }
  async stopRecording() {if(!this._recorder)throw new Error('No recording has been started.');if(this.recording)this._recorder.stop();return this._recordPromise;}
  setSlip(i,enabled) {this.deck(i).slip=!!enabled;this.emit();}
  startScratch(i) {
    const d=this.deck(i);if(!d.buffer||d.scratching)return;
    const pos=this.position(i);d.scratchState={position:pos,started:this.ctx.currentTime,wasPlaying:d.playing,lastTime:this.ctx.currentTime,lastPosition:pos};
    d.offset=pos;this.stopSource(d);d.playing=false;d.scratching=true;this.emit();
  }
  scratchTo(i,position) {
    const d=this.deck(i);if(!d.scratching)this.startScratch(i);if(!d.scratching)return;
    const now=this.ctx.currentTime,state=d.scratchState,target=clamp(position,0,Math.max(0,d.duration-.001));
    const dt=Math.max(.016,now-state.lastTime),delta=target-state.lastPosition;d.offset=target;
    if(now-state.lastTime<.012||Math.abs(delta)<.0005)return;
    const speed=clamp(Math.abs(delta)/dt,.08,4),reverse=delta<0,length=.07;
    const source=this.ctx.createBufferSource(),amp=this.ctx.createGain();
    if(reverse){
      const count=Math.max(2,Math.min(Math.floor(target*d.buffer.sampleRate),Math.ceil(length*speed*d.buffer.sampleRate)));
      const grain=this.ctx.createBuffer(d.buffer.numberOfChannels,count,d.buffer.sampleRate);
      const at=Math.floor(target*d.buffer.sampleRate);
      for(let ch=0;ch<grain.numberOfChannels;ch++){const from=d.buffer.getChannelData(ch),to=grain.getChannelData(ch);for(let n=0;n<count;n++)to[n]=from[Math.max(0,at-n)]||0;}
      source.buffer=grain;
    }else source.buffer=d.buffer;
    source.playbackRate.value=speed;source.connect(amp);amp.connect(d.nodes.input);
    amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(.7,now+.008);amp.gain.setValueAtTime(.7,now+length-.012);amp.gain.linearRampToValueAtTime(0,now+length);
    const entry={source,amp};d.scratchSources.add(entry);source.onended=()=>{source.disconnect();amp.disconnect();d.scratchSources.delete(entry);};
    if(reverse)source.start(now);else source.start(now,target,Math.min(length*speed,d.duration-target));
    source.stop(now+length);state.lastPosition=target;state.lastTime=now;this.emit();
  }
  endScratch(i,{resume=true}={}) {
    const d=this.deck(i);if(!d.scratching)return;const state=d.scratchState;
    for(const {source,amp} of d.scratchSources){try{source.stop();}catch{}source.disconnect();amp.disconnect();}d.scratchSources.clear();
    if(d.slip&&state.wasPlaying)d.offset=loopPosition(state.position+(this.ctx.currentTime-state.started)*(d.rate+d.bend),d.loop,d.duration);
    if(d.loop&&(d.offset<d.loop.start||d.offset>=d.loop.end))d.loop=null;
    d.scratching=false;d.scratchState=null;if(resume&&state.wasPlaying)this.startSource(i);this.emit();
  }
  async sampler(index,volume=.7) {
    await this.init();const id=Math.floor(clamp(index,0,7)),c=this.ctx,length=id===7?.8:.45;
    const b=c.createBuffer(1,Math.ceil(c.sampleRate*length),c.sampleRate),a=b.getChannelData(0);let seed=7919+id;
    for(let n=0;n<a.length;n++){const t=n/c.sampleRate;seed=(seed*16807)%2147483647;const noise=seed/1073741824-1;let v=0;
      if(id===0)v=Math.sin(2*Math.PI*(48*t+3*(1-Math.exp(-t*32))))*Math.exp(-t*18);
      if(id===1)v=(noise*.7+Math.sin(2*Math.PI*180*t)*.3)*Math.exp(-t*23);
      if(id===2)v=noise*Math.exp(-t*85)*.45;
      if(id===3)v=noise*(Math.exp(-t*22)+Math.exp(-Math.max(0,t-.018)*30)*(t>.018?1:0))*.5;
      if(id===4)v=Math.sin(2*Math.PI*(115*t+2*(1-Math.exp(-t*20))))*Math.exp(-t*12);
      if(id===5)v=(Math.sin(2*Math.PI*480*t)+Math.sin(2*Math.PI*1770*t))*.4*Math.exp(-t*70);
      if(id===6)v=Math.sin(2*Math.PI*55*t)*Math.min(1,t*120)*Math.exp(-t*7);
      if(id===7)v=Math.sin(2*Math.PI*(900*t-500*t*t))*Math.exp(-t*6)*.5;
      a[n]=v*clamp(volume,0,1)*.6;
    }
    const s=c.createBufferSource();s.buffer=b;s.connect(this.masterNode);s.onended=()=>s.disconnect();s.start();
  }
  snapshot() {return {version:2,crossfade:this.crossfade,curve:this.curve,master:this.master,masterMuted:this.masterMuted,decks:this.decks.map((d,i)=>({track:d.track,playing:d.playing,position:this.position(i),duration:d.duration,bpm:d.bpm,rate:d.rate,gain:d.gain,trim:d.trim,cue:d.cue,cues:[...d.cues],cueMeta:d.cueMeta.map(x=>({...x})),markers:d.markers.map(x=>({...x})),grid:{...d.grid},quantize:d.quantize,bpmSource:d.bpmSource,eqKills:{...d.eqKills},fxBypass:d.fxBypass,echoBeats:d.echoBeats,echoFeedback:d.echoFeedback,loop:d.loop?{...d.loop}:null,eq:{...d.eq},filter:d.filter,fx:{...d.fx},slip:d.slip}))};}
  async destroy() {this.pauseAll();if(this.recording)await this.stopRecording();await this.ctx?.close();this.ctx=null;}
}

const DEMO_INFO={
  red:{id:'demo-red',demo:'red',title:'Afterhours Circuit',artist:'Mixline Originals',bpm:120,source:'Original demo',color:'#ff4358'},
  blue:{id:'demo-blue',demo:'blue',title:'Midnight Voltage',artist:'Mixline Originals',bpm:126,source:'Original demo',color:'#35d8ff'},
  harbour:{id:'demo-harbour',demo:'harbour',title:'Harbour Lights',artist:'Mixline Originals',bpm:124,source:'Original demo',color:'#32d9dc'},
  warm:{id:'demo-warm',demo:'warm',title:'Warm Front',artist:'Mixline Originals',bpm:96,source:'Original demo',color:'#ffbb63'},
  coast:{id:'demo-coast',demo:'coast',title:'Coastline Edit',artist:'Mixline Originals',bpm:128,source:'Original demo',color:'#9b88ff'},
  redline:{id:'demo-redline',demo:'redline',title:'Redline Intro',artist:'Mixline Originals',bpm:110,source:'Original demo',color:'#ff577f'}
};
export const SAMPLER_SOUNDS=['Kick','Snare','Closed hat','Clap','Tom','Rim','Sub','Zap'];
export const DEMO_TRACKS=Object.values(DEMO_INFO);
/** Original synthesised loops: no external samples, accounts or network needed. */
export async function makeDemo(id='red') {
  const key=String(id).replace(/^demo-/,''),info=DEMO_INFO[key]||DEMO_INFO.red,variant=Object.keys(DEMO_INFO).indexOf(info.demo);
  const sampleRate=22050,beats=64,seconds=beats*60/info.bpm,frames=Math.floor(seconds*sampleRate);
  const data=new Float32Array(frames);let seed=12345+variant*8193;
  const random=()=>{seed=(seed*16807)%2147483647;return seed/1073741824-1;};
  const beatSeconds=60/info.bpm;
  for(let beat=0;beat<beats;beat++){
    const base=Math.floor(beat*beatSeconds*sampleRate);
    // Kick, pitched down over its attack.
    for(let n=0;n<sampleRate*.22&&base+n<frames;n++){const t=n/sampleRate;data[base+n]+=Math.sin(2*Math.PI*(48*t+3.2*(1-Math.exp(-t*30))))*Math.exp(-t*22)*.48;}
    // Closed hats on eighths; snare on the backbeat.
    for(let eighth=0;eighth<2;eighth++){const at=base+Math.floor(eighth*beatSeconds*.5*sampleRate);for(let n=0;n<sampleRate*.045&&at+n<frames;n++)data[at+n]+=random()*Math.exp(-n/sampleRate*105)*.11;}
    if(beat%2===1){for(let n=0;n<sampleRate*.14&&base+n<frames;n++){const t=n/sampleRate;data[base+n]+=(random()*.7+Math.sin(2*Math.PI*180*t)*.3)*Math.exp(-t*30)*.24;}}
    const root=[55,65.406,61.735,49,73.416,58.27][variant];const note=root*Math.pow(2,[0,0,7,3][Math.floor(beat/4)%4]/12);
    const offset=base+Math.floor(beatSeconds*.5*sampleRate);
    for(let n=0;n<sampleRate*beatSeconds*.35&&offset+n<frames;n++){const t=n/sampleRate;data[offset+n]+=Math.sin(2*Math.PI*note*t)*Math.min(1,t*70)*Math.exp(-t*7)*.21;}
    if(beat%2===0){const note2=note*4;for(let n=0;n<sampleRate*beatSeconds*.7&&base+n<frames;n++){const t=n/sampleRate;data[base+n]+=(Math.sin(2*Math.PI*note2*t)+.3*Math.sin(2*Math.PI*note2*1.5*t))*Math.exp(-t*9)*.065;}}
  }
  const bytes=new ArrayBuffer(44+frames*2),v=new DataView(bytes);const str=(at,s)=>{for(let j=0;j<s.length;j++)v.setUint8(at+j,s.charCodeAt(j));};
  str(0,'RIFF');v.setUint32(4,36+frames*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*2,true);
  for(let n=0;n<frames;n++)v.setInt16(44+n*2,Math.round(clamp(data[n],-1,1)*32767),true);
  return {track:{...info,duration:seconds},blob:new Blob([bytes],{type:'audio/wav'})};
}
