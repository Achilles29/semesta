/** Public map player uses the same scene/audio/export engine without admin login.
 * It never reads or writes the admin's saved draft.
 */
export function createProductionMapPlayer(parent,{load=()=>Promise.all([import('./production-studio.js'),import('./production-episodes.js')])}={}){
  let dialog=null,studio=null,generation=0,returnFocus=null;
  const close=()=>{generation++;studio?.dispose();studio=null;dialog?.remove();dialog=null;document.body.classList.remove('production-viewer-open');returnFocus?.focus();};
  async function open(episode='day2'){
    if(dialog)return;
    const current=++generation;returnFocus=document.activeElement;
    dialog=document.createElement('dialog');dialog.className='production-map-player';
    dialog.setAttribute('aria-label','Episode Republik Wkwkwk');
    dialog.innerHTML='<div class="production-player-bar"><label>Episode <select data-player-episode aria-label="Pilih episode"><option value="day2">Day 2 · Sudah Dibangun, Baru Ditanya</option><option value="day1">Day 1 · Baru Buka, Sudah Ada Orang Dalam</option></select></label><button type="button" data-close-production>Kembali ke peta</button></div><div class="production-player-host">Memuat episode…</div>';
    parent.append(dialog);document.body.classList.add('production-viewer-open');
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.querySelector('[data-close-production]').onclick=close;
    dialog.addEventListener('keydown',event=>event.stopPropagation());dialog.showModal();
    window.dispatchEvent(new CustomEvent('semesta:production-start'));
    try{
      const [{mountProductionStudio},episodes]=await load();if(current!==generation)return;
      const picker=dialog.querySelector('[data-player-episode]');
      const show=async id=>{
        const version=++generation;studio?.dispose();studio=null;
        picker.value=id;picker.disabled=true;
        const host=dialog.querySelector('.production-player-host');host.textContent='Memuat episode…';
        try{
          const scenario=episodes.scenarioForEpisode?episodes.scenarioForEpisode(id):episodes.day1Scenario();
          studio=mountProductionStudio(host,{initialScenario:scenario,persist:false,isActive:()=>!!dialog?.open});
          await studio.ready;
        }catch(error){if(version===generation)host.textContent=`Episode belum dapat dibuka: ${error.message}`;}
        finally{if(version===generation)picker.disabled=false;}
      };
      picker.addEventListener('change',()=>void show(picker.value));
      await show(episode);
    }catch(error){if(current===generation)dialog.querySelector('.production-player-host').textContent=`Episode belum dapat dibuka: ${error.message}`;}
  }
  return {open,close,get isOpen(){return !!dialog;},dispose:close};
}
