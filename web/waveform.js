/** Cached real PCM overview with live transport, cue and loop overlays. */
const cache=new WeakMap();
export function drawWaveform(canvas,deck,index,position,peaks){
 const rect=canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,2);
 const width=Math.max(1,Math.round(rect.width*scale)),height=Math.max(1,Math.round(rect.height*scale));
 let entry=cache.get(canvas);const color=index?'#20d6ed':'#ff5358';
 if(!entry||entry.peaks!==peaks||entry.width!==width||entry.height!==height){
  canvas.width=width;canvas.height=height;
  const base=document.createElement('canvas');base.width=width;base.height=height;const c=base.getContext('2d');
  c.strokeStyle='#aec9d010';c.lineWidth=scale;
  for(let x=width/8;x<width;x+=width/8){c.beginPath();c.moveTo(x,0);c.lineTo(x,height);c.stroke();}
  c.beginPath();c.moveTo(0,height/2);c.lineTo(width,height/2);c.stroke();
  if(peaks.length){
   const amplitude=x=>{const point=x/Math.max(1,width-1)*(peaks.length-1),low=Math.floor(point);return Math.max(.012,(peaks[low]||0)*(1-(point-low))+(peaks[Math.min(peaks.length-1,low+1)]||0)*(point-low));};
   const gradient=c.createLinearGradient(0,0,0,height);gradient.addColorStop(0,color+'50');gradient.addColorStop(.44,color);gradient.addColorStop(.56,color);gradient.addColorStop(1,color+'50');
   c.beginPath();c.moveTo(0,height/2);for(let x=0;x<width;x++)c.lineTo(x,height/2-amplitude(x)*height*.44);for(let x=width-1;x>=0;x--)c.lineTo(x,height/2+amplitude(x)*height*.44);c.closePath();
   c.fillStyle=gradient;c.shadowColor=color+'66';c.shadowBlur=2*scale;c.fill();c.shadowBlur=0;c.strokeStyle=color+'99';c.lineWidth=.5*scale;c.stroke();
  }else{c.fillStyle='#8398a6';c.font=`${9*scale}px monospace`;c.textAlign='center';c.fillText('LOAD AUDIO',width/2,height/2+3*scale);}
  entry={peaks,width,height,base};cache.set(canvas,entry);
 }
 const c=canvas.getContext('2d');c.clearRect(0,0,width,height);c.drawImage(entry.base,0,0);
 if(!deck.duration)return;
 const x=position/deck.duration*width;
 c.fillStyle='#e0ecf204';c.fillRect(0,0,x,height);
 if(deck.loop){const a=deck.loop.start/deck.duration*width,b=deck.loop.end/deck.duration*width;c.fillStyle='#bc94ff24';c.fillRect(a,0,b-a,height);c.strokeStyle='#bc94ff';c.lineWidth=scale;c.setLineDash([3*scale,3*scale]);c.beginPath();c.moveTo(a,0);c.lineTo(a,height);c.moveTo(b,0);c.lineTo(b,height);c.stroke();c.setLineDash([]);}
 deck.cues.forEach((cue,i)=>{if(cue===null)return;const at=cue/deck.duration*width;c.fillStyle='#d6c0ff';c.fillRect(at,0,scale,9*scale);c.fillStyle='#1b1b29e8';c.fillRect(at,0,13*scale,10*scale);c.fillStyle='#e6d5ff';c.font=`${7*scale}px monospace`;c.textAlign='left';c.fillText(String(i+1),at+3*scale,8*scale);});
 c.fillStyle='#f5f7f1';c.fillRect(x,0,scale,height);c.fillStyle=color;c.beginPath();c.moveTo(x-3*scale,0);c.lineTo(x+3*scale,0);c.lineTo(x,4*scale);c.closePath();c.fill();
 const preview=Number(canvas.parentElement.dataset.preview);
 if(canvas.parentElement.dataset.preview!==undefined){const at=preview*width;c.strokeStyle='#f8ecc4';c.lineWidth=scale;c.setLineDash([2*scale,2*scale]);c.beginPath();c.moveTo(at,0);c.lineTo(at,height);c.stroke();c.setLineDash([]);}
 canvas.parentElement.setAttribute('aria-valuenow',String(Math.floor(position)));
}
