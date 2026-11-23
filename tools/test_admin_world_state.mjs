import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {mountAdminWorldState} from '../game-src/admin-world-state.js';

const win=new Window({url:'http://localhost/project/admin/?view=shared-world',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
const doc=win.document;doc.body.innerHTML='<div id="world"></div>';
win.localStorage.setItem('republic-world-phase-v1',JSON.stringify({phase:'before-day2'}));
const initial={world:{id:'republic',version:4,phase:'after-day2',publishedAt:'2026-11-23T09:00:00Z'},projects:[{id:'jakartawa-home-01',name:'Rumah contoh P01',plotId:'P01',city:'jakarta',status:'draft',required:12,delivered:0,installed:0,version:1}],history:[{id:1,action:'publish',actorName:'Admin <img src=x onerror=alert(1)>',reason:'Menetapkan kanon setelah Day 2.',createdAt:'2026-11-23T09:00:00Z',phase:'after-day2',worldVersion:4}],csrfToken:'test-csrf-world-token'};
let server=structuredClone(initial),nextPost=null,releaseRead=null;
const requests=[];
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
const fetchImpl=async(url,options)=>{
  const request={url,options,body:options.body?JSON.parse(options.body):null};requests.push(request);
  assert.equal(options.credentials,'same-origin');
  if(options.method!=='POST'){
    assert.equal(new URL(url).searchParams.get('resource'),'world_admin');assert.equal(options.cache,'no-store');
    if(releaseRead)return new Promise(resolve=>{releaseRead=()=>resolve(response(server));});
    return response(server);
  }
  if(nextPost){const handler=nextPost;nextPost=null;return handler(request.body);}
  const payload=request.body;assert.equal(payload.resource,'world_admin');assert.equal(payload.csrfToken,server.csrfToken);
  assert.equal(payload.expectedVersion,server.world.version);assert.match(payload.requestId,/^[A-Za-z0-9_-]{16,80}$/);
  server.world.version++;
  if(payload.action==='publish')server.world.phase=payload.phase;
  else {const project=server.projects.find(p=>p.id===payload.projectId);project.status=payload.action==='activate_project'?'active':payload.status;project.version++;}
  server.history.unshift({id:server.history.length+1,action:payload.action,actorName:'Administrator',createdAt:'2026-11-23T10:00:00Z',reason:payload.reason,phase:payload.phase,projectId:payload.projectId,worldVersion:server.world.version});
  return response({...server,ok:true});
};
const host=doc.querySelector('#world'),panel=mountAdminWorldState(host,{apiUrl:'http://localhost/project/api',fetchImpl});
const $=selector=>host.querySelector(selector),submit=form=>form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const posts=()=>requests.filter(request=>request.body);
const choosePhase=phase=>{const form=$('[data-world-publish]');form.elements.phase.value=phase;form.elements.phase.dispatchEvent(new win.Event('change'));return form;};
await panel.ready;
assert.equal(posts().length,0,'Opening the admin panel never publishes a world or activates a project');
assert.equal($('[data-world-phase]').textContent,'Sesudah Day 2','Server snapshot wins over local preview storage');
assert.equal($('[data-world-version]').textContent,'v4');
assert.match($('[data-world-history]').textContent,/<img/);assert.equal(host.querySelector('img'),null,'Actor and reason text cannot inject markup');
assert.equal($('[data-world-publish] button').disabled,true,'Unchanged phase is not republished');
assert.ok($('[data-activate-project="jakartawa-home-01"]'));
const form=choosePhase('before-day2');form.elements.reason.value='Perubahan kanon yang ditinjau.';
submit(form);await settle();assert.equal(posts().length,0,'Publishing requires explicit review');
form.elements.reviewed.checked=true;form.elements.reason.value='pendek';submit(form);await settle();assert.equal(posts().length,0,'Reason is validated before a request');
form.elements.reason.value='Perubahan kanon yang ditinjau.';submit(form);await settle();
assert.equal(posts().length,1);assert.equal(posts()[0].body.expectedVersion,4);assert.equal(posts()[0].body.phase,'before-day2');
assert.equal($('[data-world-version]').textContent,'v5');assert.equal(form.elements.reason.value,'');assert.equal(form.elements.reviewed.checked,false);
assert.equal(win.localStorage.getItem('republic-world-phase-v1'),JSON.stringify({phase:'before-day2'}),'Admin mutations do not write browser preview storage');

// A conflicting publication must preserve the drafted reason, fetch the new
// version, and wait for another explicit submission with a fresh request ID.
choosePhase('after-day2');form.elements.reason.value='Alasan tetap tersimpan saat konflik.';form.elements.reviewed.checked=true;
nextPost=()=>{server.world.version=7;return response({error:'Versi berubah',code:'version_conflict',worldVersion:7},409);};
submit(form);await settle();const conflictId=posts().at(-1).body.requestId;
assert.equal(form.querySelector('fieldset').disabled,true);assert.match($('[data-world-status]').textContent,/Perbarui data/);
assert.equal(form.elements.reason.value,'Alasan tetap tersimpan saat konflik.');
await panel.load();assert.equal($('[data-world-version]').textContent,'v7');assert.equal(form.elements.reason.value,'Alasan tetap tersimpan saat konflik.');assert.equal(form.elements.phase.value,'after-day2');
assert.equal(form.elements.reviewed.checked,false,'Review must be repeated against the refreshed world version');
form.elements.reviewed.checked=true;submit(form);await settle();assert.equal(posts().at(-1).body.expectedVersion,7);assert.notEqual(posts().at(-1).body.requestId,conflictId);

// A dropped response is ambiguous: retry the exact request instead of creating
// a second mutation, and block parallel submissions while it is in flight.
let activate=$('[data-activate-project="jakartawa-home-01"]');activate.elements.reason.value='Membuka kegiatan konstruksi percontohan.';
let finishPost;nextPost=()=>new Promise((resolve,reject)=>{finishPost=()=>reject(new TypeError('Network error'));});
submit(activate);submit(activate);assert.equal(posts().at(-1).body.action,'activate_project');const original=posts().at(-1).body,count=posts().length;
assert.equal(activate.querySelector('fieldset').disabled,true);finishPost();await settle();assert.equal(posts().length,count);
assert.equal($('[data-world-retry]').hidden,false);assert.equal(form.querySelector('fieldset').disabled,true);
$('[data-world-retry]').click();await settle();assert.deepEqual(posts().at(-1).body,original,'Ambiguous retry keeps the same version, reason, token and request ID');
assert.equal(server.projects[0].status,'active');assert.equal($('[data-world-retry]').hidden,true);

activate=$('[data-activate-project="jakartawa-home-01"]');activate.elements.reason.value='Jeda untuk meninjau lokasi kerja.';submit(activate);await settle();
assert.equal(posts().at(-1).body.action,'set_project_status');assert.equal(posts().at(-1).body.status,'paused');assert.match($('[data-world-projects]').textContent,/Lanjutkan proyek/);
activate=$('[data-activate-project="jakartawa-home-01"]');activate.elements.reason.value='Lokasi siap dilanjutkan oleh warga.';submit(activate);await settle();assert.equal(server.projects[0].status,'active');
server.projects[0].status='completed';server.projects[0].installed=12;await panel.load();assert.equal($('[data-activate-project]'),null);assert.match($('[data-world-projects]').textContent,/Konstruksi selesai/);

releaseRead=true;const loading=panel.load();await settle();panel.dispose();const previous=host.textContent;server.world.version=99;releaseRead();await loading;assert.equal(host.textContent,previous,'Disposed panels ignore late reads');
const other=doc.createElement('div');doc.body.append(other);
const denied=mountAdminWorldState(other,{apiUrl:'/project/api',fetchImpl:async()=>response({error:'Masuk sebagai administrator.'},403)});await denied.ready;
assert.match(other.textContent,/Masuk sebagai administrator/);assert.equal(other.querySelector('fieldset').disabled,true);denied.dispose();
const [moduleSource,template,entry]=await Promise.all(['game-src/admin-world-state.js','application/views/admin.php','game-src/admin-main.js'].map(file=>readFile(file,'utf8')));
assert.doesNotMatch(moduleSource,/localStorage|setWorldPhase|production-/,'No local preview or episode side effects');
assert.match(template,/data-admin-view="shared-world"/);assert.match(template,/id="adminSharedWorld"/);assert.match(entry,/import\('\.\/admin-world-state\.js'\)/);
await win.happyDOM.close();
console.log('PASS admin shared world: explicit versioned publication, activation/pause/resume, safe history, conflict review with preserved drafts, exact idempotent retry, auth errors, late-response disposal and no local preview writes.');
