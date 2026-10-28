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
let fineControl = false;
export function setFineControl(enabled) {
  fineControl = !!enabled;
  document.body.dataset.fine = String(fineControl);
  document.querySelectorAll('[data-fine-control]').forEach(button => button.setAttribute('aria-pressed', String(fineControl)));
}
function editExactValue(input) {
  const knob=input.closest('.rotary'), title=knob.querySelector('.rotary-title')?.textContent||input.getAttribute('aria-label')||'Value';
  const dialog=document.createElement('dialog');dialog.className='exact-value-dialog';
  const heading=document.createElement('h2');heading.textContent=`Set ${title.toLowerCase()}`;
  const form=document.createElement('form');form.method='dialog';
  const label=document.createElement('label');label.textContent=`${title}${input.dataset.unit?` (${input.dataset.unit.trim()})`:''}`;
  const field=document.createElement('input');field.type='number';field.min=input.min;field.max=input.max;field.step=input.step||'any';field.value=input.value;field.required=true;field.setAttribute('aria-label',title);label.append(field);
  const help=document.createElement('p');help.className='exact-help';help.textContent=`Range ${input.min} to ${input.max}. Fine drag reduces knob sensitivity.`;
  const fineLabel=document.createElement('label');const fine=document.createElement('input');fine.type='checkbox';fine.checked=fineControl;fineLabel.append(fine,document.createTextNode(' Fine drag'));
  const actions=document.createElement('div');actions.className='exact-actions';
  for(const text of ['Cancel','Reset','Apply']){const button=document.createElement('button');button.textContent=text;button.type=text==='Apply'?'submit':'button';if(text==='Apply')button.className='primary';if(text==='Cancel')button.onclick=()=>dialog.close();if(text==='Reset')button.onclick=()=>{field.value=input.dataset.default??'0';field.focus();};actions.append(button);}
  form.append(label,help,fineLabel,actions);dialog.append(heading,form);document.body.append(dialog);
  const close=()=>{dialog.remove();if(input.isConnected)input.focus({preventScroll:true});};dialog.addEventListener('close',close,{once:true});
  form.addEventListener('submit',e=>{e.preventDefault();if(!field.reportValidity())return;input.value=field.value;setFineControl(fine.checked);input.dispatchEvent(new Event('input',{bubbles:true}));dialog.close();});
  dialog.showModal();field.focus();field.select();
}
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
    if(input.dataset.motionBound==='true')return;
    input.dataset.motionBound='true';
    let drag;
    input.addEventListener('pointerdown',e=>{
      if(e.button!==0||drag)return;
      e.preventDefault();input.focus({preventScroll:true});input.setPointerCapture(e.pointerId);
      drag={id:e.pointerId,y:e.clientY,x:e.clientX,value:Number(input.value)};
      input.closest('.rotary').classList.add('adjusting');
    });
    input.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;e.preventDefault();
      const min=Number(input.min),max=Number(input.max),step=Number(input.step)||.01;
      const delta=(drag.y-e.clientY+(e.clientX-drag.x)*.3)/(e.shiftKey||fineControl?900:180);
      input.value=String(Math.max(min,Math.min(max,Math.round((drag.value+delta*(max-min))/step)*step)));
      input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const end=e=>{if(e?.pointerId!==undefined&&drag?.id!==e.pointerId)return;drag=null;input.closest('.rotary').classList.remove('adjusting');};
    input.addEventListener('pointerup',end);input.addEventListener('pointercancel',end);input.addEventListener('lostpointercapture',end);input.addEventListener('blur',()=>end());
    input.addEventListener('dblclick',()=>{input.value=input.dataset.default;input.dispatchEvent(new Event('input',{bubbles:true}));});
    const output=input.closest('.rotary').querySelector('output');
    if(output){output.tabIndex=0;output.setAttribute('role','button');output.setAttribute('aria-label',`Enter exact ${input.getAttribute('aria-label')||'value'}`);output.title='Tap to enter an exact value or enable Fine drag';output.addEventListener('click',e=>{e.preventDefault();editExactValue(input);});output.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editExactValue(input);}});}
  });
}
document.addEventListener('click',event=>{if(event.target.closest('[data-fine-control]'))setFineControl(!fineControl);});
document.addEventListener('input',event=>{if(event.target.matches('input[type=range]'))syncRange(event.target);});
document.addEventListener('pointerdown',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  const box=button.getBoundingClientRect(),ring=document.createElement('i');ring.className='press-ring';ring.setAttribute('aria-hidden','true');
  ring.style.left=`${event.clientX-box.left}px`;ring.style.top=`${event.clientY-box.top}px`;
  button.append(ring);
  const animation=ring.animate(reducedMotion()?[{opacity:.2},{opacity:0}]:[{transform:'translate(-50%,-50%) scale(.15)',opacity:.35},{transform:'translate(-50%,-50%) scale(2.5)',opacity:0}],{duration:reducedMotion()?90:300,easing:'ease-out'});
  animation.finished.then(()=>ring.remove(),()=>ring.remove());
});
