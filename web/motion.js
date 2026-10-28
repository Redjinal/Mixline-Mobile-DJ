/** Instrument feedback. Audio commands never wait for an animation. */
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
let preference = 'system';
export const reducedMotion = () => preference === 'reduced' || (preference === 'system' && systemMotion.matches);
export function setMotion(value = 'system') {
  preference = value;
  document.documentElement.dataset.motion = reducedMotion() ? 'reduced' : 'full';
}
systemMotion.addEventListener('change', () => setMotion(preference));
setMotion();
const running = new WeakMap();
export function reveal(element, kind = 'page') {
  if (!element) return;
  running.get(element)?.cancel();
  if (reducedMotion()) return;
  const modal = kind === 'dialog';
  const animation = element.animate([
    {opacity: .35, transform: modal ? 'translateY(14px) scale(.985)' : 'translateY(8px)'},
    {opacity: 1, transform: 'translateY(0) scale(1)'}
  ], {duration: modal ? 220 : 180, easing: 'cubic-bezier(.2,.75,.25,1)'});
  running.set(element, animation);
  animation.finished.catch(() => {});
}
export function flash(element) {
  if (!element) return;
  if (reducedMotion()) {element.classList.add('feedback-active'); setTimeout(() => element.classList.remove('feedback-active'), 120); return;}
  element.animate([{filter:'brightness(1.7)'},{filter:'brightness(1)'}], {duration:230,easing:'ease-out'});
}
export function syncRange(input) {
  const min=Number(input.min)||0, max=Number(input.max)||1, value=Number(input.value);
  const progress=(value-min)/(max-min);
  input.style.setProperty('--fill',`${progress*100}%`);
  const knob=input.closest('.rotary');
  if(knob){
    knob.style.setProperty('--angle',`${min<0&&max>0?(value<0?value/(-min)*135:value/max*135):-135+progress*270}deg`);
    const output=knob.querySelector('output');
    if(output)output.textContent=`${Math.abs(value)<.001?'0.0':value.toFixed(Math.abs(max-min)>5?1:2)}${input.dataset.unit||''}`;
    knob.classList.toggle('at-default',Math.abs(value-Number(input.dataset.default))<.001);
  }
}
export function initializeControls(root=document) {
  root.querySelectorAll('input[type=range]').forEach(syncRange);
  root.querySelectorAll('.rotary input').forEach(input=>{
    let drag;
    input.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      e.preventDefault();input.focus({preventScroll:true});input.setPointerCapture(e.pointerId);
      drag={y:e.clientY,x:e.clientX,value:Number(input.value)};
      input.closest('.rotary').classList.add('adjusting');
    });
    input.addEventListener('pointermove',e=>{
      if(!drag)return;e.preventDefault();
      const min=Number(input.min),max=Number(input.max),step=Number(input.step)||.01;
      const delta=(drag.y-e.clientY+(e.clientX-drag.x)*.3)/(e.shiftKey?900:180);
      input.value=String(Math.max(min,Math.min(max,Math.round((drag.value+delta*(max-min))/step)*step)));
      input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const end=()=>{drag=null;input.closest('.rotary').classList.remove('adjusting');};
    input.addEventListener('pointerup',end);input.addEventListener('pointercancel',end);
    input.addEventListener('dblclick',()=>{input.value=input.dataset.default;input.dispatchEvent(new Event('input',{bubbles:true}));});
  });
}
document.addEventListener('input',event=>{if(event.target.matches('input[type=range]'))syncRange(event.target);});
document.addEventListener('pointerdown',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  const box=button.getBoundingClientRect(),ring=document.createElement('i');ring.className='press-ring';ring.setAttribute('aria-hidden','true');
  ring.style.left=`${event.clientX-box.left}px`;ring.style.top=`${event.clientY-box.top}px`;
  button.append(ring);
  const animation=ring.animate(reducedMotion()?[{opacity:.2},{opacity:0}]:[{transform:'translate(-50%,-50%) scale(.15)',opacity:.35},{transform:'translate(-50%,-50%) scale(2.5)',opacity:0}],{duration:reducedMotion()?90:300,easing:'ease-out'});
  animation.finished.then(()=>ring.remove(),()=>ring.remove());
});
