/** Public map player uses the same scene/audio/export engine without admin login.
 * It never reads or writes the admin's saved draft.
 */
export function createProductionMapPlayer(parent,{load=()=>Promise.all([import('./production-studio.js'),import('./production-day1.js')])}={}){
  let dialog=null,studio=null,generation=0,returnFocus=null;
  const close=()=>{generation++;studio?.dispose();studio=null;dialog?.remove();dialog=null;document.body.classList.remove('production-viewer-open');returnFocus?.focus();};
  async function open(){
    if(dialog)return;
    const current=++generation;returnFocus=document.activeElement;
    dialog=document.createElement('dialog');dialog.className='production-map-player';
    dialog.setAttribute('aria-label','Day 1 Republik Wkwkwk');
    dialog.innerHTML='<div class="production-player-bar"><strong>Day 1 · Republik Wkwkwk</strong><button type="button" data-close-production>Kembali ke peta</button></div><div class="production-player-host">Memuat Day 1…</div>';
    parent.append(dialog);document.body.classList.add('production-viewer-open');
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.querySelector('[data-close-production]').onclick=close;
    dialog.addEventListener('keydown',event=>event.stopPropagation());dialog.showModal();
    window.dispatchEvent(new CustomEvent('semesta:production-start'));
    try{
      const [{mountProductionStudio},{day1Scenario}]=await load();if(current!==generation)return;
      const host=dialog.querySelector('.production-player-host');
      studio=mountProductionStudio(host,{initialScenario:day1Scenario(),persist:false,isActive:()=>!!dialog?.open});
      await studio.ready;
    }catch(error){if(current===generation)dialog.querySelector('.production-player-host').textContent=`Day 1 belum dapat dibuka: ${error.message}`;}
  }
  return {open,close,get isOpen(){return !!dialog;},dispose:close};
}
