/** Account-only grant display. Values are read from the server, never awarded here. */
export function mountCitizenStarter(host,{apiUrl,fetchImpl=globalThis.fetch,eventTarget=window}={}) {
  if(!host)return {dispose(){}};
  let sequence=0,citizen=null,disposed=false;
  const events=new AbortController();
  const make=(tag,text)=>{const n=host.ownerDocument.createElement(tag);n.textContent=text;return n;};
  async function refresh(){
    const order=++sequence;host.hidden=!citizen||citizen.profile_complete===false;
    if(host.hidden){host.replaceChildren();return;}
    host.replaceChildren(make('p','Menyiapkan paket warga…'));
    try{
      const url=new URL(apiUrl,host.ownerDocument.baseURI);url.searchParams.set('resource','citizen_home');
      const response=await fetchImpl(url.href,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:events.signal});
      const data=await response.json();if(disposed||order!==sequence)return;
      if(!response.ok)throw Error(data.error||'Paket warga belum dapat dimuat.');
      if(Number(data.playerId)!==Number(citizen.id))throw Error('Akun berubah. Muat ulang paket warga.');
      if(!data.starter){host.replaceChildren(make('p','Paket subsidi belum tersedia pada server ini. Kamar Wisma dan progres lama tetap tersimpan.'));return;}
      const pack=data.starter;
      if(!Number.isSafeInteger(pack.balance)||pack.balance<0||!Array.isArray(pack.tools)||!data.home?.address)throw Error('Data paket warga belum lengkap.');
      host.replaceChildren(make('h3','Paket awal warga'),make('strong',`${pack.balance.toLocaleString('id-ID')} Koin Republik`),make('p',`Rumah ${citizen.display_name} · ${data.home.address}`),
        make('p',pack.tools.map(t=>`${t.quantity} × ${t.label}`).join(' · ')),
        make('p','Rumah subsidi dapat dimasuki lewat pintu Wisma Warga di Jakartawa. Tugas Bu Rani memberi tanaman tambahan. Paket diberikan sekali per akun; ganti pekerjaan tidak mengulang hadiah.'),
        make('small','Koin dan alat sudah tersimpan. Belanja, penggunaan alat usaha dan peningkatan rumah menyusul. Rumah bernama warga cerita tetap memerlukan verifikasi klaim.'));
    }catch(error){if(!disposed&&order===sequence&&error.name!=='AbortError'){const button=make('button','Coba lagi');button.type='button';button.addEventListener('click',refresh,{once:true});host.replaceChildren(make('p',error.message),button);}}
  }
  eventTarget.addEventListener('semesta:citizen-change',event=>{citizen=event.detail?.citizen||null;void refresh();},{signal:events.signal});
  return {refresh,dispose(){disposed=true;sequence++;events.abort();host.replaceChildren();}};
}
