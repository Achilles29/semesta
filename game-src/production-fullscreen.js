/** Native fullscreen with an in-page fallback for browsers that restrict it. */
export function createProductionFullscreen(monitor,button,{onChange=()=>{}}={}){
  const doc=monitor.ownerDocument,dialog=monitor.closest('dialog');
  let expanded=false,disposed=false;
  const native=()=>doc.fullscreenElement===monitor||doc.webkitFullscreenElement===monitor;
  const sync=()=>{if(disposed)return;button.textContent=native()||expanded?'Keluar layar penuh':'Layar penuh';button.setAttribute('aria-pressed',String(native()||expanded));onChange();};
  function fallback(value){expanded=value;monitor.classList.toggle('ps-expanded',value);dialog?.classList.toggle('production-map-player--expanded',value);doc.body.classList.toggle('production-fullscreen-open',value);sync();}
  async function exit(){fallback(false);if(native())try{await (doc.exitFullscreen?.()??doc.webkitExitFullscreen?.());}catch{}sync();}
  async function toggle(){
    if(native()||expanded){await exit();button.focus();return;}
    const request=monitor.requestFullscreen||monitor.webkitRequestFullscreen;
    if(request)try{await request.call(monitor);if(disposed){await exit();return;}if(native()){sync();return;}}catch{}
    if(!disposed)fallback(true);
  }
  const key=event=>{if(event.key==='Escape'&&expanded){event.preventDefault();event.stopImmediatePropagation();void exit();button.focus();}};
  doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);doc.addEventListener('keydown',key,true);
  sync();
  return {get active(){return native()||expanded;},toggle,dispose(){disposed=true;void exit();doc.removeEventListener('fullscreenchange',sync);doc.removeEventListener('webkitfullscreenchange',sync);doc.removeEventListener('keydown',key,true);}};
}
