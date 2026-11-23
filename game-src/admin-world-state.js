const PHASE_LABELS=Object.freeze({'before-day2':'Sebelum Day 2','after-day2':'Sesudah Day 2'});
const PROJECT_LABELS=Object.freeze({draft:'Draf',active:'Aktif',paused:'Dijeda',completed:'Selesai'});
const reasonValid=value=>value.trim().length>=8&&value.trim().length<=500;
const requestId=()=>globalThis.crypto?.randomUUID?.()||`world-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
const timestamp=value=>{
  if(!value)return 'Belum diterbitkan';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(date);
};

/** A separate admin action publishes the shared world. No preview or local
 * phase event is read here, and loading this panel never changes the world. */
export function mountAdminWorldState(host,{apiUrl=globalThis.window?.SEMESTA_API_URL||'/api',fetchImpl=globalThis.fetch}={}){
  if(!host)throw new Error('Panel dunia bersama tidak tersedia.');
  const doc=host.ownerDocument,listeners=[];
  let snapshot=null,busy=false,available=false,disposed=false,requestSequence=0,pendingMutation=null;
  const listen=(node,type,handler)=>{node.addEventListener(type,handler);listeners.push(()=>node.removeEventListener(type,handler));};
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;};
  host.classList.add('shared-world-admin');
  host.innerHTML=`
    <div class="aw-toolbar"><p>Keadaan resmi yang dibaca semua pemain.</p><button type="button" class="aw-secondary" data-world-refresh>Perbarui data</button></div>
    <p class="aw-status" role="status" aria-live="polite" data-world-status>Memuat dunia bersama…</p>
    <button type="button" class="aw-secondary aw-retry" data-world-retry hidden>Kirim ulang permintaan yang sama</button>
    <div class="aw-summary" aria-label="Keadaan dunia saat ini">
      <article><span>FASE DUNIA</span><strong data-world-phase>Belum tersedia</strong></article>
      <article><span>VERSI RESMI</span><strong data-world-version>—</strong></article>
      <article><span>PUBLIKASI TERAKHIR</span><strong data-world-published>—</strong></article>
    </div>
    <div class="aw-columns">
      <section class="aw-card"><span class="eyebrow">PUBLIKASI DUNIA</span><h3>Terbitkan fase</h3><p>Fase yang diterbitkan berlaku untuk semua pemain. Sesudah Day 2 menampilkan Koplak Desa dan SPPG.</p>
        <form data-world-publish>
          <fieldset disabled>
            <label>Fase tujuan<select name="phase" required><option value="before-day2">Sebelum Day 2</option><option value="after-day2">Sesudah Day 2</option></select></label>
            <p class="aw-version-note" data-world-publish-version>Versi sumber belum tersedia.</p>
            <label>Alasan publikasi<textarea name="reason" required minlength="8" maxlength="500" rows="3" placeholder="Catat keputusan yang mendasari perubahan ini."></textarea></label>
            <label class="aw-confirm"><input name="reviewed" type="checkbox" required><span>Saya sudah meninjau fase tujuan dan dampaknya untuk pemain.</span></label>
            <button class="save-button" type="submit">Terbitkan fase untuk semua pemain</button>
          </fieldset>
        </form>
      </section>
      <section class="aw-card"><span class="eyebrow">PROYEK BERSAMA</span><h3>Proyek konstruksi</h3><p>Aktifkan draf untuk membuka kegiatan konstruksi bagi warga. Rumah contoh berada di petak P01 Jakartawa.</p><div data-world-projects><p class="aw-empty">Memuat proyek…</p></div></section>
    </div>
    <section class="aw-card aw-history"><div><span class="eyebrow">RIWAYAT DUNIA</span><h3>Publikasi dan perubahan proyek</h3></div><p>Pelaksana, waktu, versi, dan alasan dicatat oleh server.</p><ol data-world-history><li class="aw-empty">Memuat riwayat…</li></ol></section>`;
  const find=selector=>host.querySelector(selector),status=find('[data-world-status]'),refresh=find('[data-world-refresh]'),retry=find('[data-world-retry]'),publish=find('[data-world-publish]'),projects=find('[data-world-projects]'),history=find('[data-world-history]');
  function setStatus(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
  function updateControls(){
    host.setAttribute('aria-busy',String(busy));refresh.disabled=busy;
    for(const fieldset of host.querySelectorAll('fieldset'))fieldset.disabled=busy||!available;
    retry.hidden=!pendingMutation||busy;retry.disabled=busy;
    const phase=publish.elements.phase.value;
    publish.querySelector('button[type="submit"]').disabled=busy||!available||phase===snapshot?.world.phase;
  }
  function validSnapshot(data){return data&&Number.isInteger(data.world?.version)&&data.world.version>=1&&Object.hasOwn(PHASE_LABELS,data.world.phase)&&Array.isArray(data.projects)&&Array.isArray(data.history)&&typeof data.csrfToken==='string'&&data.csrfToken.length>0;}
  function render(data,{preserveDraft=false}={}){
    const phaseDraft=preserveDraft&&snapshot?{phase:publish.elements.phase.value,reason:publish.elements.reason.value}:null;
    const projectDrafts=new Map(preserveDraft?[...projects.querySelectorAll('form')].map(form=>[form.dataset.activateProject,{action:form.dataset.projectAction,status:form.dataset.projectStatus,reason:form.elements.reason.value}]):[]);
    snapshot=data;available=true;
    find('[data-world-phase]').textContent=PHASE_LABELS[data.world.phase];
    find('[data-world-version]').textContent=`v${data.world.version}`;
    find('[data-world-published]').textContent=timestamp(data.world.publishedAt);
    publish.elements.phase.value=phaseDraft?.phase||data.world.phase;
    publish.elements.reason.value=phaseDraft?.reason||'';publish.elements.reviewed.checked=false;
    find('[data-world-publish-version]').textContent=`Menerbitkan dari versi v${data.world.version}.`;
    projects.replaceChildren();
    for(const project of data.projects){
      const card=make('article','aw-project');card.dataset.projectId=project.id;
      const title=make('div','aw-project-heading');title.append(make('h4','',project.name||project.title||project.id),make('span',`aw-project-status aw-project-${Object.hasOwn(PROJECT_LABELS,project.status)?project.status:'unknown'}`,PROJECT_LABELS[project.status]||'Status belum dikenal'));card.append(title);
      if(project.description)card.append(make('p','',project.description));
      if(Number.isFinite(Number(project.required)))card.append(make('p','aw-project-progress',`${Number(project.installed)||0} dari ${Number(project.required)} bagian terpasang · ${Number(project.delivered)||0} bahan terkirim`));
      if(['draft','active','paused'].includes(project.status)){
        const form=make('form','aw-activate');form.dataset.activateProject=project.id;
        const action=project.status==='draft'?'activate_project':'set_project_status',nextStatus=project.status==='active'?'paused':'active';
        form.dataset.projectAction=action;form.dataset.projectStatus=nextStatus;
        const fieldset=make('fieldset'),label=make('label','',project.status==='draft'?'Alasan aktivasi':project.status==='active'?'Alasan menjeda proyek':'Alasan melanjutkan proyek');
        const reason=make('textarea');reason.name='reason';reason.required=true;reason.minLength=8;reason.maxLength=500;reason.rows=2;reason.placeholder='Catat tujuan proyek percontohan ini.';label.append(reason);
        const draft=projectDrafts.get(project.id);if(draft?.action===action&&draft?.status===nextStatus)reason.value=draft.reason;
        const note=make('p','aw-version-note',`Perubahan dari versi dunia v${data.world.version}.`);
        const button=make('button','save-button',project.status==='draft'?'Aktifkan proyek untuk warga':project.status==='active'?'Jeda proyek':'Lanjutkan proyek');button.type='submit';
        fieldset.append(label,note,button);form.append(fieldset);card.append(form);
      }else card.append(make('p','aw-project-note',project.status==='completed'?'Konstruksi selesai.':'Proyek ini belum menerima kegiatan konstruksi.'));
      projects.append(card);
    }
    if(!data.projects.length)projects.append(make('p','aw-empty','Belum ada proyek yang tersedia.'));
    history.replaceChildren();
    for(const item of data.history){
      const row=make('li','aw-history-item'),heading=make('div','aw-history-heading');
      const action=item.action==='activate_project'?'Aktivasi proyek':item.action==='publish'?'Publikasi fase':item.action==='set_project_status'?'Perubahan status proyek':item.action==='complete_project'?'Proyek selesai':'Perubahan dunia';
      heading.append(make('b','',action));if(item.version||item.worldVersion)heading.append(make('span','',`v${item.version??item.worldVersion}`));
      const actor=item.actorName||item.actor||'Sistem',time=timestamp(item.createdAt||item.publishedAt);
      row.append(heading,make('p','aw-history-meta',`${actor} · ${time}`));
      if(item.phase&&PHASE_LABELS[item.phase])row.append(make('p','aw-history-detail',PHASE_LABELS[item.phase]));
      if(item.projectId)row.append(make('p','aw-history-detail',item.projectId));
      row.append(make('p','aw-history-reason',item.reason||'Alasan tidak tersedia.'));history.append(row);
    }
    if(!data.history.length)history.append(make('li','aw-empty','Belum ada perubahan yang diterbitkan.'));
    updateControls();
  }
  async function readResponse(response){
    const data=await response.json();
    if(!response.ok){const error=new Error(data.error||`Layanan dunia belum tersedia (${response.status}).`);error.status=response.status;error.data=data;throw error;}
    return data;
  }
  async function load(){
    if(disposed||busy)return;busy=true;available=false;const sequence=++requestSequence;
    setStatus('Memuat keadaan dunia terbaru…');updateControls();
    try{
      const url=new URL(apiUrl,doc.baseURI);url.searchParams.set('resource','world_admin');
      const data=await readResponse(await fetchImpl(url.href,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'}));
      if(disposed||sequence!==requestSequence)return;
      if(!validSnapshot(data))throw new Error('Data dunia belum lengkap. Perbarui data sebelum menerbitkan.');
      pendingMutation=null;render(data,{preserveDraft:true});setStatus(`Dunia versi v${data.world.version} siap ditinjau.`);
    }catch(error){if(!disposed&&sequence===requestSequence)setStatus(error.message||'Dunia belum dapat dimuat.',true);}
    finally{if(!disposed&&sequence===requestSequence){busy=false;updateControls();}}
  }
  async function sendMutation(payload){
    if(disposed||busy)return;busy=true;pendingMutation=payload;updateControls();setStatus('Menyimpan perubahan dunia…');
    try{
      const data=await readResponse(await fetchImpl(apiUrl,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)}));
      if(disposed)return;
      pendingMutation=null;
      if(!validSnapshot(data)){
        available=false;setStatus('Perubahan diterima server. Perbarui data untuk melihat keadaan terbaru.');
      }else{render(data);setStatus(payload.action==='publish'?`Fase diterbitkan pada versi v${data.world.version}.`:payload.action==='activate_project'?`Proyek diaktifkan pada versi v${data.world.version}.`:`Status proyek diperbarui pada versi v${data.world.version}.`);}
    }catch(error){
      if(disposed)return;
      if(error.status&&error.status<500){
        pendingMutation=null;
        if(error.status===409){available=false;setStatus('Versi dunia telah berubah. Perbarui data, tinjau perubahan terbaru, lalu ajukan kembali.',true);}
        else{if(error.status===401||error.status===403)available=false;setStatus(error.message,true);}
      }else{available=false;setStatus('Hasil penyimpanan belum dapat dipastikan. Kirim ulang permintaan yang sama, atau perbarui data untuk memeriksa hasilnya.',true);}
    }finally{if(!disposed){busy=false;updateControls();}}
  }
  function submit(action,fields,reason){
    if(!available||busy||disposed)return;
    if(!reasonValid(reason)){setStatus('Tuliskan alasan sepanjang 8–500 karakter.',true);return;}
    void sendMutation({resource:'world_admin',action,...fields,expectedVersion:snapshot.world.version,reason:reason.trim(),requestId:requestId(),csrfToken:snapshot.csrfToken});
  }
  listen(refresh,'click',()=>void load());listen(retry,'click',()=>{if(pendingMutation)void sendMutation(pendingMutation);});
  listen(publish.elements.phase,'change',updateControls);
  listen(publish,'submit',event=>{
    event.preventDefault();if(!publish.elements.reviewed.checked){setStatus('Tinjau fase tujuan sebelum menerbitkan.',true);return;}
    const phase=publish.elements.phase.value;if(phase===snapshot?.world.phase)return;
    if(!Object.hasOwn(PHASE_LABELS,phase))return;
    submit('publish',{phase},publish.elements.reason.value);
  });
  listen(projects,'submit',event=>{
    const form=event.target.closest('form[data-activate-project]');if(!form||!projects.contains(form))return;event.preventDefault();
    const projectId=form.dataset.activateProject;
    const project=snapshot?.projects.find(project=>project.id===projectId);if(!project)return;
    if(project.status==='draft')submit('activate_project',{projectId},form.elements.reason.value);
    else if(['active','paused'].includes(project.status))submit('set_project_status',{projectId,status:project.status==='active'?'paused':'active'},form.elements.reason.value);
  });
  const ready=load();
  return {ready,load,dispose(){if(disposed)return;disposed=true;requestSequence++;listeners.forEach(remove=>remove());host.removeAttribute('aria-busy');}};
}
