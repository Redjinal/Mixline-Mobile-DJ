/** Mixline 5 Wave desk: one audio engine, overview/detail and deliberate touch modes. */
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
export function fitWaveWindow(duration, start, span) {
  const length = Math.max(0, Number(duration) || 0);
  const width = clamp(span, Math.min(.25, length), length);
  return {start:clamp(start, 0, Math.max(0, length-width)), span:width};
}
export function zoomWaveWindow(duration, view, factor, anchor=.5) {
  const fraction=clamp(anchor,0,1), at=view.start+view.span*fraction;
  return fitWaveWindow(duration,at-view.span*factor*fraction,view.span*factor);
}
export function timeAtWavePoint(view, fraction, duration) {
  return clamp(view.start+clamp(fraction,0,1)*view.span,0,duration);
}
const decimal = value => Number(value||0).toFixed(3);

export function createWaveDesk(ctx) {
  const {engine,esc,time}=ctx;
  const views=[0,1].map(()=>({mode:'seek',start:0,span:16,follow:true,track:null,selectedCue:0,preview:null,previewLoop:null,context:null}));
  let root=null, binding=null, activeGesture=null, longTimer=null;
  const touches=new Map();
  const index=()=>ctx.getDeck?.()===1?1:0;
  const deck=()=>engine.decks[index()];
  const view=()=>views[index()];
  const locked=()=>typeof ctx.locked==='function'?ctx.locked():!!ctx.locked;
  const feedback=message=>ctx.toast?.(message);
  const action=fn=>ctx.run?ctx.run(fn):Promise.resolve().then(fn).catch(e=>feedback(e.message));
  const refresh=()=>ctx.refresh?.();
  const hasTrack=()=>!!deck()?.buffer;
  function check() {if(locked()){feedback('Unlock performance controls to edit or seek.');return false;}if(!hasTrack()){feedback('Load a local audio track to use the Wave desk.');return false;}return true;}
  function syncView() {
    const d=deck(),v=view();
    if(v.track!==d.buffer){v.track=d.buffer;v.start=0;v.span=Math.min(16,d.duration||16);v.follow=true;v.preview=null;v.previewLoop=null;v.context=null;}
    if(d.duration)Object.assign(v,fitWaveWindow(d.duration,v.start,v.span));
    return v;
  }
  function render() {
    const i=index(),d=deck(),other=engine.decks[1-i],v=syncView(),disabled=d.buffer?'':'disabled';
    const cues=d.cues||Array(8).fill(null),meta=d.cueMeta||[],markers=d.markers||[];
    return `<section class="wave5 deck-${i}" aria-label="Wave inspector">
      <div class="wave5-heading"><div><span class="eyebrow">WAVE INSPECTOR · DECK ${i+1}</span><h1>${esc(d.track?.title||'Your waveform workspace')}</h1><p>${d.buffer?`${d.buffer.numberOfChannels===1?'MONO':'STEREO'} · ${d.bpm?`${d.bpm.toFixed(1)} BPM`:'BPM unknown'} · ${d.bpmSource==='estimated'?'Estimated tempo':'Manual / supplied timing'}`:'Load a track from Library to begin.'}</p></div><button data-wave5-action="follow" ${disabled} aria-label="Follow current playback position">Follow</button></div>
      <div class="wave5-targets"><div class="tabbar" role="group" aria-label="Wave desk target">${[0,1].map(n=>`<button data-wave5-deck="${n}" aria-pressed="${i===n}" class="${i===n?'selected':''}">Deck ${n+1}</button>`).join('')}</div><div class="wave5-companion"><span>DECK ${2-i}</span><strong>${esc(other.track?.title||'No track loaded')}</strong><small data-wave5-companion-state>${other.playing?'Playing':'Paused'}</small></div></div>
      <div class="wave5-workspace">
      <section class="wave5-visuals">
        <div class="wave5-caption"><span>WHOLE TRACK</span><span data-wave5-window>Visible window</span></div>
        <div class="wave5-surface wave5-overview" data-wave5-surface="overview" tabindex="0" role="slider" aria-label="Whole track position; arrows seek, plus and minus zoom" aria-valuemin="0" aria-valuemax="${d.duration||0}" aria-valuenow="${engine.position(i)||0}"><canvas data-wave5-canvas="overview" aria-hidden="true"></canvas></div>
        <div class="wave5-times"><span>00:00</span><span>${time(d.duration)}</span></div>
        <div class="wave5-caption"><span>DETAILED VIEW</span><span data-wave5-signal>${d.buffer?'PCM AUDIO':'NO AUDIO'}</span></div>
        <div class="wave5-detail-wrap"><div class="wave5-surface wave5-detail" data-wave5-surface="detail" tabindex="0" role="slider" aria-label="Detailed waveform; selected touch mode ${v.mode}" aria-valuemin="0" aria-valuemax="${d.duration||0}" aria-valuenow="${engine.position(i)||0}"><canvas data-wave5-canvas="detail" aria-hidden="true"></canvas></div><button class="wave5-loop-handle" data-wave5-handle="start" aria-label="Drag loop start" hidden>IN</button><button class="wave5-loop-handle" data-wave5-handle="end" aria-label="Drag loop end" hidden>OUT</button><div class="wave5-precision" data-wave5-precision hidden><canvas data-wave5-canvas="precision" aria-hidden="true"></canvas><span>FINE · 1 SECOND</span></div><output class="wave5-preview" data-wave5-readout hidden></output></div>
        <div class="wave5-times"><span data-wave5-start>00:00</span><strong data-wave5-position>${time(engine.position(i))}</strong><span data-wave5-end>${time(Math.min(d.duration,16))}</span></div>
        <div class="wave5-toolbar"><div class="wave5-modes" role="group" aria-label="Waveform touch mode">${['seek','pan','scratch'].map(m=>`<button data-wave5-mode="${m}" aria-pressed="${v.mode===m}" class="${v.mode===m?'selected':''}" ${disabled}>${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div><div class="wave5-zoom"><button data-wave5-action="zoom-out" aria-label="Zoom waveform out" ${disabled}>−</button><button data-wave5-action="zoom-in" aria-label="Zoom waveform in" ${disabled}>+</button><button data-wave5-action="fit" ${disabled}>Fit</button></div></div>
        <p class="wave5-help" data-wave5-help>${modeHelp(v.mode)}</p>
        <div class="wave5-context" data-wave5-context ${v.context===null?'hidden':''}><strong data-wave5-context-at>At ${time(v.context||0)}</strong><button data-wave5-action="context-seek">Seek here</button><button data-wave5-action="context-cue">Add cue</button><button data-wave5-action="context-marker">Add marker</button><button data-wave5-action="context-cancel">Cancel</button></div>
        <form class="wave5-exact" data-wave5-form="seek"><label>Exact position (seconds)<input name="position" type="number" min="0" max="${d.duration||0}" step="0.001" value="${decimal(engine.position(i))}" ${disabled}></label><button ${disabled}>Seek</button></form>
      </section>
      <section class="wave5-editors">
        <div class="wave5-caption"><span>HOT CUES · SHARED WITH PADS</span><span>8 SLOTS</span></div>
        <div class="wave5-cues">${cues.map((p,n)=>`<button data-wave5-cue="${n}" class="${p===null?'':'saved'} ${v.selectedCue===n?'selected':''}" aria-pressed="${v.selectedCue===n}" ${disabled}><strong>${n+1}</strong><span>${p===null?'Empty':esc(meta[n]?.name||time(p))}</span></button>`).join('')}</div>
        <form data-wave5-form="cue" class="wave5-editor"><div class="wave5-fields"><label>Cue ${v.selectedCue+1} name<input name="name" maxlength="32" value="${esc(meta[v.selectedCue]?.name||'')}" placeholder="Intro / Vocal / Drop" ${disabled}></label><label>Position (sec)<input name="position" type="number" min="0" max="${d.duration||0}" step="0.001" value="${decimal(cues[v.selectedCue]??engine.position(i))}" ${disabled}></label><label>Color<select name="color" ${disabled}>${[['#ff505b','Red'],['#26dcf5','Cyan'],['#f3c36a','Amber'],['#bd9cff','Violet'],['#72e6b1','Green']].map(([c,n])=>`<option value="${c}" ${meta[v.selectedCue]?.color===c?'selected':''}>${n}</option>`).join('')}</select></label></div><div class="wave5-actions"><button ${disabled}>Save cue</button><button type="button" data-wave5-action="cue-go" ${disabled}>Go to cue</button><button type="button" data-wave5-action="cue-clear" ${disabled}>Clear selected</button></div></form>
        <details class="wave5-editor" open><summary>Custom loop</summary><form data-wave5-form="loop"><div class="wave5-fields"><label>In (seconds)<input name="start" type="number" min="0" max="${d.duration||0}" step="0.001" value="${decimal(d.loop?.start??engine.position(i))}" ${disabled}></label><label>Out (seconds)<input name="end" type="number" min="0" max="${d.duration||0}" step="0.001" value="${decimal(d.loop?.end??Math.min(d.duration,engine.position(i)+4))}" ${disabled}></label></div><div class="wave5-actions"><button ${disabled}>Apply loop</button><button type="button" data-wave5-action="loop-in" ${disabled}>In here</button><button type="button" data-wave5-action="loop-out" ${disabled}>Out here</button><button type="button" data-wave5-action="loop-exit" ${disabled}>Exit loop</button></div></form><p class="wave5-help" data-wave5-loop-status>${d.loop?'Custom loop active':'No loop active'}</p></details>
        <details class="wave5-editor"><summary>BPM & beat grid</summary><form data-wave5-form="grid"><div class="wave5-fields"><label>BPM<input name="bpm" type="number" min="30" max="300" step="0.01" value="${d.bpm||''}" required ${disabled}></label><label>Downbeat (seconds)<input name="downbeat" type="number" min="0" max="${d.duration||0}" step="0.001" value="${decimal(d.grid?.downbeat)}" ${disabled}></label></div><div class="wave5-actions"><button ${disabled}>Save grid</button><button type="button" data-wave5-action="downbeat" ${disabled}>Downbeat here</button><button type="button" data-wave5-action="tap" ${disabled}>Tap BPM</button><button type="button" data-wave5-action="analyze" ${disabled}>Estimate BPM</button><button type="button" data-wave5-action="half" ${disabled}>Half</button><button type="button" data-wave5-action="double" ${disabled}>Double</button><button type="button" data-wave5-action="quantize" aria-pressed="${!!d.quantize}" ${disabled}>Quantize ${d.quantize?'ON':'OFF'}</button></div></form><p class="wave5-help">Manual grid. Estimates can need correction. Tempo matching is a one-time alignment.</p></details>
        <details class="wave5-editor"><summary>Section markers (${markers.length})</summary><p class="wave5-help">Annotations you place, not automatically detected sections.</p><div class="wave5-markers">${markers.map(m=>`<div><button data-wave5-marker="${esc(m.id)}">${esc(m.name)} <small>${time(m.position)}</small></button><button data-wave5-edit-marker="${esc(m.id)}" aria-label="Edit ${esc(m.name)} marker">Edit</button><button data-wave5-remove-marker="${esc(m.id)}" aria-label="Remove ${esc(m.name)} marker">×</button></div>`).join('')||'<p>No markers yet.</p>'}</div><form data-wave5-form="marker"><input type="hidden" name="id"><div class="wave5-fields"><label>Name<input name="name" maxlength="32" placeholder="Intro / Vocal / Drop / Outro" required ${disabled}></label><label>Position (sec)<input name="position" type="number" min="0" max="${d.duration||0}" step="0.001" value="${decimal(engine.position(i))}" ${disabled}></label></div><button ${disabled}>Save marker</button><button type="button" data-wave5-action="marker-new" ${disabled}>New marker</button></form><div class="wave5-actions"><button data-wave5-action="previous" ${disabled}>Previous cue / marker</button><button data-wave5-action="next" ${disabled}>Next cue / marker</button></div></details>
      </section></div>
    </section>`;
  }
  function modeHelp(mode){return mode==='seek'?'Drag to preview; release to seek. Pull down for fine adjustment. Long press for cue/marker actions.':mode==='pan'?'Drag to move the visible window without moving playback. Pinch to zoom; Follow returns to the playhead.':'Drag to scratch the audio; release restores playback. Pinch zooms. The live crossfader stays available.';}
  function clearTimer(){if(longTimer){clearTimeout(longTimer);longTimer=null;}}
  function endGesture(cancel=false){
    clearTimer();const g=activeGesture;
    if(g?.kind==='scratch')engine.endScratch(g.deck);
    if(g&&!cancel&&g.kind==='seek'&&views[g.deck].preview!==null)engine.seek(g.deck,views[g.deck].preview);
    if(g&&!cancel&&g.kind==='loop'&&views[g.deck].previewLoop){const l=views[g.deck].previewLoop;engine.setLoopPoints(g.deck,l.start,l.end);}
    if(g){views[g.deck].preview=null;views[g.deck].previewLoop=null;}
    activeGesture=null;touches.clear();update();
  }
  function destroy(){clearTimer();if(activeGesture)endGesture(true);binding?.abort();binding=null;root=null;}
  function bind(nextRoot){
    destroy();root=nextRoot;binding=new AbortController();const options={signal:binding.signal};
    root.addEventListener('click',onClick,options);root.addEventListener('submit',onSubmit,options);
    root.addEventListener('pointerdown',onPointerDown,options);root.addEventListener('pointermove',onPointerMove,options);
    root.addEventListener('pointerup',onPointerUp,options);root.addEventListener('pointercancel',onPointerCancel,options);
    root.addEventListener('keydown',onKey,options);
    window.addEventListener('blur',()=>endGesture(true),options);
    window.addEventListener('resize',()=>endGesture(true),options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)endGesture(true);},options);
    update();
  }
  function onClick(e){
    const el=e.target.closest('[data-wave5-deck],[data-wave5-mode],[data-wave5-action],[data-wave5-cue],[data-wave5-marker],[data-wave5-edit-marker],[data-wave5-remove-marker]');if(!el||!root?.contains(el))return;
    if(el.dataset.wave5Deck!==undefined){endGesture(true);ctx.setDeck?.(+el.dataset.wave5Deck);refresh();return;}
    if(!check())return;const i=index(),d=deck(),v=view();
    action(async()=>{
      if(el.dataset.wave5Mode){endGesture(true);v.mode=el.dataset.wave5Mode;refresh();return;}
      if(el.dataset.wave5Cue!==undefined){v.selectedCue=+el.dataset.wave5Cue;if(d.cues[v.selectedCue]===null)engine.setCue(i,v.selectedCue,v.context??engine.position(i));refresh();return;}
      if(el.dataset.wave5Marker){const marker=d.markers?.find(m=>m.id===el.dataset.wave5Marker);if(marker)engine.seek(i,marker.position);v.follow=true;update();return;}
      if(el.dataset.wave5EditMarker){const marker=d.markers?.find(m=>m.id===el.dataset.wave5EditMarker);if(marker){const form=root.querySelector('[data-wave5-form=marker]');form.elements.id.value=marker.id;form.elements.name.value=marker.name;form.elements.position.value=decimal(marker.position);form.elements.name.focus();}return;}
      if(el.dataset.wave5RemoveMarker){engine.removeMarker(i,el.dataset.wave5RemoveMarker);refresh();return;}
      switch(el.dataset.wave5Action){
        case 'zoom-in':Object.assign(v,zoomWaveWindow(d.duration,v,.5));v.follow=false;break;
        case 'zoom-out':Object.assign(v,zoomWaveWindow(d.duration,v,2));v.follow=false;break;
        case 'fit':Object.assign(v,fitWaveWindow(d.duration,0,d.duration));v.follow=false;break;
        case 'follow':v.follow=true;break;
        case 'cue-go':engine.goCue(i,v.selectedCue);v.follow=true;break;
        case 'cue-clear':engine.clearCue(i,v.selectedCue);refresh();return;
        case 'loop-in':root.querySelector('[data-wave5-form="loop"] [name="start"]').value=decimal(engine.position(i));break;
        case 'loop-out':root.querySelector('[data-wave5-form="loop"] [name="end"]').value=decimal(engine.position(i));break;
        case 'loop-exit':engine.loop(i,0);break;
        case 'downbeat':engine.setGrid(i,{downbeat:engine.position(i)});refresh();return;
        case 'tap':engine.tap(i);root.querySelector('[data-wave5-form="grid"] [name="bpm"]').value=d.bpm.toFixed(2);break;
        case 'analyze':{const estimate=await engine.analyzeBpm(i);feedback(`Estimated ${estimate.bpm.toFixed(1)} BPM. Check the grid before quantizing.`);refresh();return;}
        case 'half':engine.setBpm(i,d.bpm/2);refresh();return;
        case 'double':engine.setBpm(i,d.bpm*2);refresh();return;
        case 'quantize':engine.setQuantize(i,!d.quantize);refresh();return;
        case 'context-seek':if(v.context===null)return;engine.seek(i,v.context);v.context=null;refresh();return;
        case 'context-cue':{if(v.context===null)return;const slot=d.cues.findIndex(p=>p===null);if(slot<0){feedback('All eight cues are occupied. Select a cue to edit it.');return;}engine.setCue(i,slot,v.context);v.selectedCue=slot;v.context=null;refresh();return;}
        case 'context-marker':if(v.context===null)return;engine.addMarker(i,{name:'Marker',position:v.context});v.context=null;refresh();return;
        case 'context-cancel':v.context=null;refresh();return;
        case 'marker-new':{const form=root.querySelector('[data-wave5-form=marker]');form.reset();form.elements.id.value='';form.elements.position.value=decimal(engine.position(i));form.elements.name.focus();return;}
        case 'previous':case 'next':{const positions=[...(d.cues||[]).filter(p=>p!==null),...(d.markers||[]).map(m=>m.position)].sort((a,b)=>a-b),current=engine.position(i),target=el.dataset.wave5Action==='previous'?positions.filter(p=>p<current-.05).at(-1):positions.find(p=>p>current+.05);if(target!==undefined)engine.seek(i,target);else feedback('No further cue or marker.');v.follow=true;break;}
      }
      update();
    });
  }
  function onSubmit(e){
    const form=e.target.closest('[data-wave5-form]');if(!form)return;e.preventDefault();if(!check())return;
    const data=new FormData(form),i=index(),d=deck(),v=view();
    action(()=>{
      switch(form.dataset.wave5Form){
        case 'seek':engine.seek(i,Number(data.get('position')));v.follow=true;break;
        case 'cue':engine.setCue(i,v.selectedCue,Number(data.get('position')));engine.renameCue(i,v.selectedCue,String(data.get('name')),String(data.get('color')));feedback(`Cue ${v.selectedCue+1} saved.`);refresh();return;
        case 'loop':{const start=Number(data.get('start')),end=Number(data.get('end'));if(end<=start||start<0||end>d.duration)throw new Error('Loop out must follow loop in and stay within the track.');engine.setLoopPoints(i,start,end);feedback('Custom loop active.');break;}
        case 'grid':engine.setGrid(i,{bpm:Number(data.get('bpm')),downbeat:Number(data.get('downbeat'))});feedback('Manual beat grid saved.');refresh();return;
        case 'marker':{const marker={name:String(data.get('name')),position:Number(data.get('position'))};if(data.get('id'))engine.updateMarker(i,String(data.get('id')),marker);else engine.addMarker(i,marker);}feedback('Section marker saved.');refresh();return;
      }update();
    });
  }
  function positionFor(e,surface){const r=surface.getBoundingClientRect(),d=deck(),v=view(),range=surface.dataset.wave5Surface==='overview'?{start:0,span:d.duration}:v;return timeAtWavePoint(range,(e.clientX-r.left)/r.width,d.duration);}
  function onPointerDown(e){
    const handle=e.target.closest('[data-wave5-handle]'),surface=e.target.closest('[data-wave5-surface]');if(!handle&&!surface)return;if(e.button!==undefined&&e.button!==0)return;if(!check())return;
    e.preventDefault();const target=handle||surface;target.setPointerCapture?.(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const i=index(),v=view(),d=deck();clearTimer();
    if(touches.size===2&&!handle){
      if(activeGesture?.kind==='scratch')engine.endScratch(i);v.preview=null;v.previewLoop=null;
      const points=[...touches.values()],rect=surface.getBoundingClientRect();activeGesture={kind:'pinch',deck:i,surface,distance:Math.max(1,Math.abs(points[1].x-points[0].x)),initial:{start:v.start,span:v.span},anchor:clamp(((points[0].x+points[1].x)/2-rect.left)/rect.width,0,1)};v.follow=false;return;
    }
    if(touches.size>1)return;
    if(handle){if(!d.loop)return;activeGesture={kind:'loop',deck:i,handle:handle.dataset.wave5Handle,surface:root.querySelector('[data-wave5-surface="detail"]'),loop:{...d.loop}};v.previewLoop={...d.loop};v.follow=false;return;}
    const isOverview=surface.dataset.wave5Surface==='overview',kind=v.mode==='scratch'&&!isOverview?'scratch':v.mode==='pan'?'pan':'seek';
    activeGesture={kind,deck:i,surface,startX:e.clientX,startY:e.clientY,start:v.start,span:v.span,at:positionFor(e,surface),overview:isOverview};
    v.context=null;showContext();v.follow=false;
    if(kind==='scratch')engine.startScratch(i);
    if(kind==='seek'){v.preview=activeGesture.at;longTimer=setTimeout(()=>{if(activeGesture?.kind!=='seek')return;activeGesture.kind='context';v.context=v.preview;v.preview=null;showContext();update();},550);}
    update();
  }
  function onPointerMove(e){
    if(!touches.has(e.pointerId)||!activeGesture)return;e.preventDefault();touches.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=activeGesture,v=views[g.deck],d=engine.decks[g.deck],rect=g.surface.getBoundingClientRect();
    if(g.kind==='pinch'){const pts=[...touches.values()];if(pts.length>=2){const distance=Math.max(1,Math.abs(pts[1].x-pts[0].x));Object.assign(v,zoomWaveWindow(d.duration,g.initial,g.distance/distance,g.anchor));}update();return;}
    if(Math.abs(e.clientX-g.startX)>6||Math.abs(e.clientY-g.startY)>8)clearTimer();
    if(g.kind==='loop'){const target=timeAtWavePoint(v,(e.clientX-rect.left)/rect.width,d.duration);v.previewLoop=g.handle==='start'?{...g.loop,start:clamp(target,0,g.loop.end-.02)}:{...g.loop,end:clamp(target,g.loop.start+.02,d.duration)};}
    else if(g.kind==='pan'){const span=g.overview?d.duration:g.span;Object.assign(v,fitWaveWindow(d.duration,g.start-(e.clientX-g.startX)/rect.width*span,g.span));}
    else if(g.kind==='seek'){const fine=1/(1+Math.max(0,e.clientY-g.startY)/55),span=g.overview?d.duration:g.span;v.preview=clamp(g.at+(e.clientX-g.startX)/rect.width*span*fine,0,d.duration);g.fine=fine;}
    else if(g.kind==='scratch'){engine.scratchTo(g.deck,clamp(g.at+(e.clientX-g.startX)/rect.width*g.span,0,d.duration));}
    update();
  }
  function onPointerUp(e){if(!touches.has(e.pointerId))return;touches.delete(e.pointerId);if(activeGesture?.kind==='pinch'&&touches.size)return;action(()=>endGesture(false));}
  function onPointerCancel(e){if(touches.has(e.pointerId))endGesture(true);}
  function onKey(e){
    const surface=e.target.closest('[data-wave5-surface]');if(!surface||!['ArrowLeft','ArrowRight','+','=','-','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){endGesture(true);return;}if(!check())return;const v=view(),d=deck();
    if(e.key==='+'||e.key==='=')Object.assign(v,zoomWaveWindow(d.duration,v,.5));else if(e.key==='-')Object.assign(v,zoomWaveWindow(d.duration,v,2));else if(v.mode==='pan')Object.assign(v,fitWaveWindow(d.duration,v.start+(e.key==='ArrowRight'?1:-1)*v.span*.1,v.span));else engine.seek(index(),engine.position(index())+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?0.05:1));v.follow=false;update();
  }
  function showContext(){const panel=root?.querySelector('[data-wave5-context]');if(!panel)return;panel.hidden=view().context===null;panel.querySelector('[data-wave5-context-at]').textContent=`At ${decimal(view().context)} s`;}
  function update(){
    if(!root?.querySelector('.wave5'))return;if(locked()&&activeGesture){endGesture(true);return;}const i=index(),d=deck(),v=syncView(),pos=engine.position(i);
    if(v.follow&&!activeGesture&&d.duration>v.span){Object.assign(v,fitWaveWindow(d.duration,pos-v.span*.38,v.span));}
    const overview=root.querySelector('[data-wave5-canvas="overview"]'),detail=root.querySelector('[data-wave5-canvas="detail"]');
    if(overview)draw(overview,d,i,0,d.duration||1,pos,v,true);if(detail)draw(detail,d,i,v.start,v.span||1,pos,v,false);
    const text=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
    text('[data-wave5-position]',time(pos));text('[data-wave5-start]',time(v.start));text('[data-wave5-end]',time(v.start+v.span));text('[data-wave5-window]',`${v.span.toFixed(v.span<10?2:1)} seconds visible`);
    text('[data-wave5-companion-state]',engine.decks[1-i].playing?'Playing':'Paused');
    text('[data-wave5-loop-status]',d.loop?`Custom loop · ${decimal(d.loop.start)}–${decimal(d.loop.end)} seconds`:'No loop active');
    root.querySelectorAll('[data-wave5-surface]').forEach(el=>el.setAttribute('aria-valuenow',pos.toFixed(3)));
    const readout=root.querySelector('[data-wave5-readout]');if(readout){readout.hidden=v.preview===null;readout.textContent=v.preview===null?'':`${decimal(v.preview)} s${activeGesture?.fine<.65?' · FINE SEEK':''}`;}
    const precision=root.querySelector('[data-wave5-precision]');if(precision){const show=v.preview!==null&&activeGesture?.fine<.65;precision.hidden=!show;if(show){const range=fitWaveWindow(d.duration,v.preview-.5,1);draw(precision.querySelector('canvas'),d,i,range.start,range.span,pos,v,false);}}
    const loop=v.previewLoop||d.loop;root.querySelectorAll('[data-wave5-handle]').forEach(h=>{const at=loop?.[h.dataset.wave5Handle],fraction=(at-v.start)/v.span;h.hidden=!loop||fraction<0||fraction>1;h.style.left=`${clamp(fraction,0,1)*100}%`;});
    const follow=root.querySelector('[data-wave5-action="follow"]');follow?.setAttribute('aria-pressed',String(v.follow));
  }
  return {render,bind,update,destroy};
}

/** Draw measured sample contours, not synthetic beat/spectrum decoration. */
function draw(canvas,d,index,start,span,position,v,overview){
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const ratio=Math.min(globalThis.devicePixelRatio||1,2),width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const c=canvas.getContext('2d');c.clearRect(0,0,width,height);c.fillStyle='#090d12';c.fillRect(0,0,width,height);const color=index?'#26dcf5':'#ff505b';
  if(!d.buffer){c.fillStyle='#a9b4c0';c.font=`${12*ratio}px sans-serif`;c.textAlign='center';c.fillText('LOAD LOCAL AUDIO',width/2,height/2);return;}
  const at=time=>(time-start)/span*width;
  if(!overview&&d.bpm){const beat=60/d.bpm,origin=d.grid?.downbeat||0,first=Math.ceil((start-origin)/beat),last=Math.floor((start+span-origin)/beat),step=Math.max(1,Math.ceil((last-first)/100));c.lineWidth=ratio;for(let n=first;n<=last;n+=step){const x=at(origin+n*beat);c.strokeStyle=n%4===0?'#c5d1de32':'#c5d1de10';c.beginPath();c.moveTo(x,0);c.lineTo(x,height);c.stroke();}}
  const channels=overview?1:Math.min(2,d.buffer.numberOfChannels),bins=Math.max(1,Math.floor(rect.width)),channelHeight=height/channels;
  for(let ch=0;ch<channels;ch++){
    const samples=d.buffer.getChannelData(ch),middle=channelHeight*(ch+.5),amp=channelHeight*.38,upper=[],lower=[],energy=[];
    for(let x=0;x<bins;x++){
      const left=Math.max(0,Math.floor((start+x/bins*span)*d.buffer.sampleRate)),right=Math.min(samples.length,Math.max(left+1,Math.ceil((start+(x+1)/bins*span)*d.buffer.sampleRate)));
      let min=0,max=0,square=0,count=0;const stride=Math.max(1,Math.floor((right-left)/24));
      if(overview&&d.peaks?.length){const peak=d.peaks[Math.min(d.peaks.length-1,Math.floor(x/bins*d.peaks.length))]||0;min=-peak;max=peak;square=peak*peak*.45;count=1;}
      else for(let p=left;p<right;p+=stride){const a=samples[p]||0;min=Math.min(min,a);max=Math.max(max,a);square+=a*a;count++;}
      upper.push(middle-max*amp);lower.push(middle-min*amp);energy.push(Math.sqrt(square/Math.max(1,count))*amp);
    }
    c.beginPath();c.moveTo(0,middle);upper.forEach((y,x)=>c.lineTo(x/bins*width,y));for(let x=bins-1;x>=0;x--)c.lineTo(x/bins*width,lower[x]);c.closePath();c.fillStyle=color+'bb';c.fill();
    if(!overview){c.beginPath();c.moveTo(0,middle);energy.forEach((a,x)=>c.lineTo(x/bins*width,middle-a));for(let x=bins-1;x>=0;x--)c.lineTo(x/bins*width,middle+energy[x]);c.closePath();c.fillStyle=color+'80';c.fill();}
    c.strokeStyle='#bac9d022';c.beginPath();c.moveTo(0,middle);c.lineTo(width,middle);c.stroke();
  }
  if(overview){const x=at(v.start),w=v.span/span*width;c.fillStyle='#d6e4f012';c.fillRect(x,0,w,height);c.strokeStyle='#d6e4f0a0';c.lineWidth=ratio;c.strokeRect(x,ratio,w,height-ratio*2);}
  const loop=v.previewLoop||d.loop;if(loop){c.fillStyle='#72e6b12b';c.fillRect(at(loop.start),0,at(loop.end)-at(loop.start),height);c.strokeStyle='#72e6b1';c.lineWidth=ratio*1.5;for(const p of [loop.start,loop.end]){c.beginPath();c.moveTo(at(p),0);c.lineTo(at(p),height);c.stroke();}}
  for(const [slot,point] of (d.cues||[]).entries()){if(point===null||point<start||point>start+span)continue;const x=at(point),meta=d.cueMeta?.[slot];c.fillStyle=meta?.color||color;c.fillRect(x,0,ratio*2,height*.2);if(!overview){const label=`${slot+1} ${meta?.name||''}`.trim();c.font=`${10*ratio}px sans-serif`;const w=Math.min(width-x,c.measureText(label).width+10*ratio);c.fillRect(x,0,w,18*ratio);c.fillStyle='#080b10';c.textAlign='left';c.fillText(label,x+4*ratio,13*ratio);}}
  if(!overview)for(const marker of d.markers||[]){if(marker.position<start||marker.position>start+span)continue;const x=at(marker.position);c.strokeStyle='#f3c36a';c.setLineDash([3*ratio,3*ratio]);c.beginPath();c.moveTo(x,20*ratio);c.lineTo(x,height);c.stroke();c.setLineDash([]);c.fillStyle='#f3c36a';c.font=`${9*ratio}px sans-serif`;c.fillText(marker.name,x+3*ratio,height-5*ratio);}
  const playhead=at(position);c.strokeStyle='#f4f3ed';c.lineWidth=1.5*ratio;c.beginPath();c.moveTo(playhead,0);c.lineTo(playhead,height);c.stroke();
  if(v.preview!==null){const x=at(v.preview);c.strokeStyle='#f3c36a';c.lineWidth=2*ratio;c.setLineDash([5*ratio,4*ratio]);c.beginPath();c.moveTo(x,0);c.lineTo(x,height);c.stroke();c.setLineDash([]);}
}
