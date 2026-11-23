/** The atlas, road plan and live minimap share the world's public layout. */
import {WORLD_DESTINATIONS, CAPITAL_LAYOUT, REGIONAL_LAYOUT, WORLD_LANDMASSES, getRegionalLayout, getWorldPhase, setWorldPhase, projectWorldPoint as projectCanonicalPoint} from './republic-world-layout.js';
import {landscapeSvg} from './republic-map-art.js';
import {STORY_HOMES,STORY_NEIGHBORHOOD,STORY_ROADS,PUBLIC_SITEPLAN_BOUNDS,storyHomeLocation} from './citizen-story-homes.js';
import {HOME_LAYOUT} from './citizen-home-layout.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const ATLAS_SIZE={width:1200,height:700};

const housingProgress=projects=>projects.find(p=>p.city==='jakarta'&&p.plotId==='P01'&&p.status!=='draft');
const housingLabel=projects=>{const p=housingProgress(projects);return p?p.status==='completed'?'P01 SELESAI · 23 FONDASI':`P01 ${p.installed}/${p.required} · ${p.status==='paused'?'DIJEDA':'DIKERJAKAN'}`:'24 PETAK · FONDASI, BELUM ADA RUMAH';};
export function mapLocation(city='jakarta',id='stage',phase=getWorldPhase(),projects=[]){
  const destination=WORLD_DESTINATIONS[city]||WORLD_DESTINATIONS.jakarta;
  if(city!=='jakarta')return {id:'wilderness',name:destination.name,entry:destination.spawn,tag:'WILAYAH BARU · BELUM DIBANGUN',description:'Lahan alami yang belum memiliki bangunan atau permukiman. Jelajahi bentangnya; rencana kota menunggu usulan warga.'};
  if(id==='perintis')return {id,name:STORY_NEIGHBORHOOD.name,entry:STORY_NEIGHBORHOOD.entry,tag:'48 RUMAH WARGA CERITA',description:'Rumah bernama untuk seluruh warga gelombang pertama. Pilih nama rumah pada Tujuan di kota untuk menemukan alamatnya. Rumah belum ditautkan ke akun; klaim kepemilikan memerlukan verifikasi.'};
  const storyHome=storyHomeLocation(id);if(storyHome)return storyHome;
  if(id==='wisma')return {id,name:HOME_LAYOUT.name,entry:{...HOME_LAYOUT.entrance,z:HOME_LAYOUT.entrance.z+2,yaw:Math.PI},tag:'HUNIAN AWAL · KAMAR PRIBADI',description:'Kamar dasar tersedia untuk setiap akun warga. Temui Bu Rani di meja penerimaan, antar paket ke wisma, lalu hias kamar dengan tanaman hadiah. Kamar dan hadiah tersimpan di akun Anda.'};
  if(id==='welcome')return {id,name:'Penerimaan warga baru',entry:{x:HOME_LAYOUT.clerk.x+2,z:HOME_LAYOUT.clerk.z,yaw:-Math.PI/2},tag:'MULAI DI SINI · TUGAS PERTAMA',description:'Bu Rani membantu warga baru mendapatkan kamar di Wisma Warga. Terima paket selamat datang, bawa ke wisma, lalu pasang dekorasi pertama Anda.'};
  const anchors={stage:{name:'Panggung warga',entry:{x:0,z:7,yaw:Math.PI},tag:'SUDAH ADA · PANGGUNG SEMENTARA',description:'Titik kumpul pertama republik. Panggung ini menghadap lapangan terbuka; jalan setapak menghubungkannya dengan fondasi permukiman.'},koplak:{name:'Koplak Desa',entry:{x:CAPITAL_LAYOUT.koplak.entrance.x,z:CAPITAL_LAYOUT.koplak.entrance.z+1,yaw:Math.PI},tag:phase==='after-day2'?'TERBANGUN · PROGRAM DAY 2':'LAHAN RENCANA · PROGRAM DAY 2',description:phase==='after-day2'?'Koplak Desa sudah berdiri setelah pembangunan Day 2. Masuk dari jalan alun-alun untuk melihat tokonya.':'Petak untuk Koplak Desa masih kosong. Bangunannya baru hadir pada tahap sesudah Day 2.'},sppg:{name:'SPPG',entry:{x:CAPITAL_LAYOUT.sppg.entrance.x,z:CAPITAL_LAYOUT.sppg.entrance.z+1,yaw:Math.PI},tag:phase==='after-day2'?'TERBANGUN · PROGRAM DAY 2':'LAHAN RENCANA · PROGRAM DAY 2',description:phase==='after-day2'?'Dapur SPPG sudah berdiri setelah Day 2, di sisi lain alun-alun.':'Petak SPPG masih kosong sebelum Day 2. Pilihan tahap kota hanya mengubah dua bangunan program ini.'}};
  if(anchors[id])return {id,...anchors[id]};
  const zone=CAPITAL_LAYOUT.zones.find(zone=>zone.id===id);if(!zone)return mapLocation(city,'stage',phase);
  if(zone.id==='housing'){
    const p=housingProgress(projects);
    return {id:zone.id,name:'Permukiman warga',entry:p?{x:p.depot.x,z:p.depot.z+2,yaw:Math.PI}:{x:17,z:zone.rect.z,yaw:0},tag:housingLabel(projects),description:p?`${p.name}: ${p.installed} dari ${p.required} komponen terpasang. ${p.status==='completed'?'Rumah contoh sudah selesai; kepemilikan dan perabot belum tersedia.':p.status==='paused'?'Pekerjaan sedang dijeda admin.':'Datangi depot bahan di dekat petak P01 untuk ikut membangun.'} Petak lainnya masih berupa fondasi.`:'Fondasi 24 petak disiapkan untuk permukiman warga. Proyek rumah contoh P01 menunggu aktivasi admin.'};
  }
  return {id:zone.id,name:zone.name,entry:zone.id==='civic'?anchors.stage.entry:{x:['housing','market'].includes(zone.id)?17:-20,z:zone.rect.z,yaw:0},tag:zone.status==='foundation'?'24 PETAK · FONDASI, BELUM ADA RUMAH':zone.id==='civic'?'RUANG BERSAMA · PANGGUNG WARGA':'LAHAN RENCANA · BELUM DIBANGUN',description:zone.id==='housing'?'Fondasi 24 petak disiapkan untuk permukiman warga. Belum ada rumah jadi; pembangunan berikutnya mengikuti perkembangan cerita.':zone.id==='civic'?anchors.stage.description:'Area ini telah disisihkan dalam denah kota. Belum ada gedung jadi atau layanan yang beroperasi; warga menentukan apa yang dibangun selanjutnya.'};
}

// Coastlines use the exact global-coordinate polygons used by terrainHeight.
export function landMassSvg(width=1200,height=700,bounds=REGIONAL_LAYOUT.bounds){
  return landscapeSvg(width,height,bounds,bounds===REGIONAL_LAYOUT.bounds?'atlas':`region-${bounds.minX}-${bounds.minZ}`);
}

export function atlasSvg(){
  const p=point=>{const v=projectWorldPoint(point[0],point[1],REGIONAL_LAYOUT.bounds);return `${v.x*12},${v.y*7}`;};
  const roads=REGIONAL_LAYOUT.routes.map(route=>`<polyline points="${route.points.map(p).join(' ')}"/>`).join('');
  return `<svg class="rm-atlas" viewBox="0 0 1200 700" preserveAspectRatio="none" role="img" aria-label="Daratan utama dengan tiga kota dan dua pulau Republik Wkwkwk">
    <defs><linearGradient id="rm-sea" x2=".8" y2="1"><stop stop-color="#163f59"/><stop offset=".55" stop-color="#266a7b"/><stop offset="1" stop-color="#4b969a"/></linearGradient><pattern id="rm-water" width="95" height="70" patternUnits="userSpaceOnUse"><path d="M12 22q9-5 18 0t18 0M63 53q7-4 14 0" fill="none" stroke="#c0e5e7" stroke-opacity=".11" stroke-width="1"/></pattern></defs>
    <rect width="1200" height="700" fill="url(#rm-sea)"/><rect class="rm-currents" width="1200" height="700" fill="url(#rm-water)"/>
    ${landMassSvg()}<g fill="none" stroke="#5b785a" stroke-width="4" opacity=".45">${roads}</g><g class="rm-routes" fill="none" stroke="#fff0bd" stroke-width="2" stroke-dasharray="3 6" opacity=".85">${roads}</g>
    <g fill="#c7e7df" opacity=".6" font-family="Arial,sans-serif" text-anchor="middle" font-size="12" letter-spacing="5"><text x="610" y="165">LAUT SELA</text><text x="820" y="585">SAMUDRA SERIBU CERITA</text></g><g fill="#42644f" opacity=".6" font-family="Arial,sans-serif" font-size="12" text-anchor="middle" letter-spacing="6"><text x="655" y="420">DARATAN UTAMA</text></g><g class="rm-clouds" fill="#eff8f4" opacity=".18"><path d="M140 200q13-28 36-9 11-39 43-20 30-10 42 17 34-4 37 20H140Z"/><path d="M620 70q14-28 41-14 22-38 51-10 30-9 42 17 29 0 33 17H620Z"/></g></svg>`;
}

/** Drag/pinch/wheel panning is contained in the map, never moves the avatar. */
export function attachMapPanZoom(viewport,plane,{max=3,min=1}={}){
  let scale=1,x=0,y=0,moved=false,start=null,pinch=null;
  const pointers=new Map(),abort=new AbortController(),events={signal:abort.signal};
  const draw=()=>{const r=viewport.getBoundingClientRect(),overflowX=Math.max(0,((plane.offsetWidth||r.width)*scale-r.width)/2),overflowY=Math.max(0,((plane.offsetHeight||r.height)*scale-r.height)/2);x=clamp(x,-overflowX,overflowX);y=clamp(y,-overflowY,overflowY);plane.style.transform=`translate(${x}px,${y}px) scale(${scale})`;viewport.dataset.zoom=scale.toFixed(2);};
  const zoom=delta=>{scale=clamp(scale+delta,min,max);draw();};
  viewport.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY>0?-.12:.12);},{...events,passive:false});
  viewport.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});viewport.setPointerCapture?.(event.pointerId);start={px:event.clientX,py:event.clientY,x,y};moved=false;if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),scale};}},events);
  viewport.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()];scale=clamp(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),min,max);moved=true;}else if(start){x=start.x+event.clientX-start.px;y=start.y+event.clientY-start.py;moved ||= Math.hypot(event.clientX-start.px,event.clientY-start.py)>5;}draw();},events);
  const release=event=>{pointers.delete(event.pointerId);start=null;pinch=null;};viewport.addEventListener('pointerup',release,events);viewport.addEventListener('pointercancel',release,events);
  viewport.addEventListener('keydown',event=>{if(event.target.closest('button'))return;const step=35;if(event.key==='ArrowLeft')x+=step;else if(event.key==='ArrowRight')x-=step;else if(event.key==='ArrowUp')y+=step;else if(event.key==='ArrowDown')y-=step;else if(['+','='].includes(event.key))zoom(.2);else if(event.key==='-')zoom(-.2);else if(event.key==='Home'){scale=1;x=y=0;}else return;event.preventDefault();draw();},events);
  return {zoom,reset(){scale=1;x=y=0;draw();},getState:()=>({scale,x,y,moved}),dispose(){abort.abort();}};
}

export function mountRepublicAtlas(host,{selected='jakarta',onSelect=()=>{}}={}){
  const nodes=Object.values(WORLD_DESTINATIONS);
  host.innerHTML=`<div class="rm-viewport" tabindex="0" aria-label="Geser peta, gulir untuk memperbesar, pilih kota"><div class="rm-world-plane">${atlasSvg()}${nodes.map(city=>`<button type="button" class="rm-city-pin" data-destination="${escape(city.id)}" style="left:${city.map.x}%;top:${city.map.y}%" aria-label="Pilih ${escape(city.name)}"><i></i><span><b>${escape(city.name)}</b><small>${city.id==='jakarta'?'IBU KOTA · CERITA DIMULAI':'WILAYAH BARU · BELUM DIBANGUN'}</small></span></button>`).join('')}</div></div>${mapControlsMarkup()}<div class="rm-compass" aria-hidden="true"><b>U</b><span>↟</span></div>`;
  const viewport=host.querySelector('.rm-viewport'),plane=host.querySelector('.rm-world-plane'),pan=attachMapPanZoom(viewport,plane),abort=new AbortController();
  const select=id=>host.querySelectorAll('[data-destination]').forEach(pin=>{const active=pin.dataset.destination===id;pin.classList.toggle('selected',active);pin.setAttribute('aria-pressed',String(active));});
  host.addEventListener('click',event=>{const control=event.target.closest('[data-map-zoom]');if(control){if(control.dataset.mapZoom==='reset')pan.reset();else pan.zoom(control.dataset.mapZoom==='in'?.2:-.2);return;}const pin=event.target.closest('[data-destination]');if(pin){select(pin.dataset.destination);onSelect(pin.dataset.destination);}},{signal:abort.signal});
  select(selected);return {select,dispose(){pan.dispose();abort.abort();}};
}

// World X maps left/right; world Z maps top/bottom. Both maps use this function.
export function projectWorldPoint(x,z,bounds=PUBLIC_SITEPLAN_BOUNDS){
  if(bounds===CAPITAL_LAYOUT.bounds)return projectCanonicalPoint(x,z);
  return {x:(x-bounds.minX)/(bounds.maxX-bounds.minX)*100,y:(z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*100};
}
export function unprojectWorldPoint(x,y,bounds=PUBLIC_SITEPLAN_BOUNDS){
  return {x:bounds.minX+x/100*(bounds.maxX-bounds.minX),z:bounds.minZ+y/100*(bounds.maxZ-bounds.minZ)};
}
const point=([x,z],bounds)=>{const p=projectWorldPoint(x,z,bounds);return `${p.x*10},${p.y*10}`;};

export function sitePlanSvg({phase=getWorldPhase(),city='jakarta',mini=false,projects=[]}={}){
  const bounds=PUBLIC_SITEPLAN_BOUNDS;
  if(city!=='jakarta')return `<svg viewBox="0 0 1000 1000" role="img" aria-label="Lahan alami ${escape(WORLD_DESTINATIONS[city]?.name)}; belum dibangun"><rect width="1000" height="1000" fill="#b9c5a0"/><path d="M-80 750Q400 430 1100 710" fill="none" stroke="#8daea6" stroke-width="75"/><path d="M-20 120Q210 0 390 200T1020 120M-60 950Q240 820 450 950" fill="none" stroke="#a0b28e" stroke-width="120"/><g fill="#71896f" opacity=".45"><circle cx="210" cy="305" r="100"/><circle cx="730" cy="270" r="170"/><circle cx="430" cy="680" r="95"/></g>${mini?'':'<text x="500" y="495" text-anchor="middle" fill="#334e42" font-size="32" font-family="Arial">WILAYAH BELUM DIBANGUN</text><text x="500" y="540" text-anchor="middle" fill="#4b6455" font-size="20" font-family="Arial">Rencana kota ditentukan warga.</text>'}</svg>`;
  const roads=[...CAPITAL_LAYOUT.roads,...STORY_ROADS].map(road=>`<polyline points="${[road.from,road.to].map(p=>point(p,bounds)).join(' ')}" fill="none" stroke="#ddd3b6" stroke-width="${(road.width||4)/(bounds.maxX-bounds.minX)*1000}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const zones=(CAPITAL_LAYOUT.zones||[]).map(zone=>{
    const r=zone.rect,p=projectWorldPoint(r.x,r.z,bounds),w=r.width/(bounds.maxX-bounds.minX)*1000,h=r.depth/(bounds.maxZ-bounds.minZ)*1000;
    const built=false,housing=zone.id==='housing';
    return `<g data-zone="${escape(zone.id)}"><rect x="${p.x*10-w/2}" y="${p.y*10-h/2}" width="${w}" height="${h}" rx="2" fill="${built?'#d9c39b':housing?'#c1bb9d':'#b0bea0'}" stroke="${built?'#6d775d':'#8d9a7c'}" stroke-width="${mini?5:2}" ${built?'':'stroke-dasharray="7 6"'}/>${built?`<path d="M${p.x*10-w/2} ${p.y*10-h/2+6}h${w}" stroke="#f4e6c5" stroke-width="5"/>`:''}</g>`;
  }).join('');
  const plots=CAPITAL_LAYOUT.housingPlots.map(r=>{const p=projectWorldPoint(r.x,r.z),work=projects.find(item=>item.plotId===r.id&&item.city==='jakarta'&&item.status!=='draft'),color=work?.status==='completed'?'#517e79':work?.installed?'#c79a56':'#c4c1a5';return `<rect data-plot="${escape(r.id)}" data-project-status="${escape(work?.status||'foundation')}" data-installed="${work?.installed||0}" x="${p.x*10-r.width/(bounds.maxX-bounds.minX)*500}" y="${p.y*10-r.depth/(bounds.maxZ-bounds.minZ)*500}" width="${r.width/(bounds.maxX-bounds.minX)*1000}" height="${r.depth/(bounds.maxZ-bounds.minZ)*1000}" fill="${color}" stroke="${work?'#365b60':'#9c947b'}" stroke-width="3"><title>${escape(work?`${work.name}: ${work.installed}/${work.required}`:r.id+' · fondasi')}</title></rect>`;}).join('');
  const core=['stage','koplak','sppg'].map(id=>{const r=CAPITAL_LAYOUT[id],p=projectWorldPoint(r.x,r.z),built=id==='stage'||phase==='after-day2';return `<rect data-structure="${id}" data-built="${built}" x="${p.x*10-r.width/(bounds.maxX-bounds.minX)*500}" y="${p.y*10-r.depth/(bounds.maxZ-bounds.minZ)*500}" width="${r.width/(bounds.maxX-bounds.minX)*1000}" height="${r.depth/(bounds.maxZ-bounds.minZ)*1000}" fill="${built?'#bd9467':'none'}" stroke="#667b5b" stroke-width="3" ${built?'':'stroke-dasharray="5 5"'}/>`;}).join('');
  const home=projectWorldPoint(HOME_LAYOUT.x,HOME_LAYOUT.z),homeW=HOME_LAYOUT.width/(bounds.maxX-bounds.minX)*1000,homeH=HOME_LAYOUT.depth/(bounds.maxZ-bounds.minZ)*1000;
  const storyPlots=STORY_HOMES.map(h=>{const p=projectWorldPoint(h.x,h.z);return `<rect data-story-home="${escape(h.id)}" x="${p.x*10-h.width/(bounds.maxX-bounds.minX)*500}" y="${p.y*10-h.depth/(bounds.maxZ-bounds.minZ)*500}" width="${h.width/(bounds.maxX-bounds.minX)*1000}" height="${h.depth/(bounds.maxZ-bounds.minZ)*1000}" fill="#a87955" stroke="#5d6b54" stroke-width="2"><title>Rumah ${escape(h.name)} - ${escape(h.address)}</title></rect>`;}).join('');
  const facility=`<rect data-game-facility="wisma-warga" x="${home.x*10-homeW/2}" y="${home.y*10-homeH/2}" width="${homeW}" height="${homeH}" fill="#538d92" stroke="#244f59" stroke-width="3"><title>Wisma Warga · kamar pribadi</title></rect>`;
  return `<svg viewBox="0 0 1000 1000" role="img" aria-label="Denah ${phase==='after-day2'?'sesudah':'sebelum'} pembangunan Day 2 dengan Wisma Warga"><defs><pattern id="${mini?'mini':'site'}-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#698363" stroke-opacity=".1"/></pattern></defs><rect width="1000" height="1000" fill="#becba6"/><rect width="1000" height="1000" fill="url(#${mini?'mini':'site'}-grid)"/>${zones}${roads}${plots}${core}${facility}${storyPlots}</svg>`;
}

export function mountRepublicSitePlan(host,{city='jakarta',selected='stage',phase=getWorldPhase(),projects=[],onSelect=()=>{}}={}){
  const abort=new AbortController();let currentCity=city,currentPhase=phase,currentSelected=selected,currentProjects=projects;
  host.innerHTML=`<div class="rm-viewport rm-plan-viewport" tabindex="0" aria-label="Denah rinci: geser, gulir atau gunakan tombol zoom"><div class="rm-plan-plane"></div></div>${mapControlsMarkup()}<div class="rm-civic-detail"></div><div class="rm-plan-legend"><span><i class="built"></i>Sudah ada</span><span><i class="foundation"></i>Fondasi</span><span><i class="planned"></i>Rencana</span></div><div class="rm-plan-north" aria-hidden="true">U ↑</div>`;
  const plane=host.querySelector('.rm-plan-plane'),pan=attachMapPanZoom(host.querySelector('.rm-viewport'),plane,{max:6});
  function render(){
    host.dataset.city=currentCity;
    plane.innerHTML=`${sitePlanSvg({city:currentCity,phase:currentPhase,projects:currentProjects})}${currentCity==='jakarta'?CAPITAL_LAYOUT.zones.map(zone=>{const p=projectWorldPoint(zone.rect.x,zone.rect.z),active=zone.id==='civic';return `<button type="button" class="rm-zone-pin ${currentSelected===zone.id?'selected':''}" data-location="${escape(zone.id)}" style="left:${p.x}%;top:${p.y}%" aria-pressed="${currentSelected===zone.id}"><i class="${active?'built':zone.id==='housing'?'foundation':'planned'}"></i><span>${escape(zone.id==='housing'?'Permukiman warga':zone.name)}<small>${active?'PANGGUNG + LAHAN PROGRAM':zone.id==='housing'?housingLabel(currentProjects):'LAHAN RENCANA'}</small></span></button>`;}).join(''):''}`;
    const detail=host.querySelector('.rm-civic-detail');detail.hidden=currentCity!=='jakarta';
    detail.innerHTML=`<details><summary>Tujuan di kota</summary><div>${['welcome','wisma','perintis','stage','koplak','sppg'].map(id=>{const built=['stage','welcome','wisma','perintis'].includes(id)||currentPhase==='after-day2';return `<button type="button" data-location="${id}" class="${currentSelected===id?'selected':''}"><i class="${built?'built':'planned'}"></i><span>${{welcome:'Bu Rani · mulai di sini',wisma:HOME_LAYOUT.name,perintis:'Kampung Perintis - 48 rumah',stage:'Panggung warga',koplak:'Koplak Desa',sppg:'SPPG'}[id]}</span><small>${id==='welcome'?'Tugas':id==='wisma'?'Kamar':built?'Ada':'Lahan'}</small></button>`;}).join('')}<label class="rm-home-search">Cari rumah warga<select aria-label="Pilih rumah warga cerita"><option value="">Pilih nama warga...</option>${STORY_HOMES.map(h=>`<option value="${escape(h.id)}" ${currentSelected===h.id?'selected':''}>${escape(h.name)} - ${escape(h.address)}</option>`).join('')}</select></label></div></details>`;
  }
  host.addEventListener('click',event=>{if(handleMapZoom(event,pan))return;const pin=event.target.closest('[data-location]');if(!pin)return;currentSelected=pin.dataset.location;render();onSelect(currentSelected);},{signal:abort.signal});
  host.addEventListener('change',event=>{if(!event.target.matches('.rm-home-search select')||!storyHomeLocation(event.target.value))return;currentSelected=event.target.value;render();onSelect(currentSelected);},{signal:abort.signal});
  render();return {update({city=currentCity,phase=currentPhase,selected=currentSelected,projects=currentProjects}={}){if(city!==currentCity)pan.reset();currentCity=city;currentPhase=phase;currentSelected=selected;currentProjects=projects;render();},getView:pan.getState,dispose(){pan.dispose();abort.abort();}};
}

const mapControlsMarkup=()=>`<div class="rm-map-controls" aria-label="Kontrol peta"><button type="button" data-map-zoom="in" title="Perbesar peta" aria-label="Perbesar peta">+</button><button type="button" data-map-zoom="out" title="Perkecil peta" aria-label="Perkecil peta">−</button><button type="button" data-map-zoom="reset" class="rm-map-reset" title="Kembalikan posisi dan zoom peta ke tampilan awal" aria-label="Lihat semua: kembalikan posisi dan zoom peta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>Lihat semua</span></button></div>`;
const handleMapZoom=(event,pan)=>{const control=event.target.closest('[data-map-zoom]');if(!control)return false;if(control.dataset.mapZoom==='reset')pan.reset();else pan.zoom(control.dataset.mapZoom==='in'?.25:-.25);return true;};

export function regionalLocation(id,city='jakarta'){
  const data=getRegionalLayout(city),district=data.districts.find(item=>item.id===id)||data.districts.find(item=>item.kind==='urban')||data.districts[0];
  return {...district,description:district.description||({urban:'Kawasan kota dan lahan untuk pusat kegiatan warga.',village:'Wilayah desa yang masih terbuka. Belum ada rumah atau fasilitas jadi.',countryside:'Bentang pedesaan dan lahan alami untuk pengembangan berikutnya.',forest:'Hutan dan jalur alam yang bisa dijelajahi.',mountains:'Dataran tinggi dengan jalur menuju perbukitan.'}[district.kind]||'Wilayah terbuka untuk dijelajahi.'),entry:Array.isArray(district.entry)?{x:district.entry[0],z:district.entry[1]}:district.entry};
}

export function regionalPlanSvg(city='jakarta'){
  const data=getRegionalLayout(city),bounds=data.bounds,project=p=>{const v=projectWorldPoint(p[0],p[1],bounds);return `${v.x*10},${v.y*10}`;};
  const routes=data.routes.map(route=>`<polyline data-road="${escape(route.id)}" points="${(route.points||[route.from,route.to]).map(project).join(' ')}" fill="none" stroke="#f3d9a2" stroke-width="${Math.max(3,(route.width||5)/(bounds.maxX-bounds.minX)*1000)}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const colors={urban:'#dbbd8a',village:'#d6ce99',countryside:'#b7c995',forest:'#5a8b76',mountains:'#8a9990'};
  const zones=data.districts.map(district=>{const r=district.rect,p=projectWorldPoint(r.x,r.z,bounds),w=r.width/(bounds.maxX-bounds.minX)*1000,h=r.depth/(bounds.maxZ-bounds.minZ)*1000;return `<rect data-district-area="${escape(district.id)}" x="${p.x*10-w/2}" y="${p.y*10-h/2}" width="${w}" height="${h}" rx="${Math.min(w,h)*.42}" fill="${colors[district.kind]||'#aec49c'}" fill-opacity=".15" stroke="#f1e7c0" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="4 5"/>`;}).join('');
  return `<svg class="rm-regional-art" viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label="Wilayah ${escape(WORLD_DESTINATIONS[city]?.name||WORLD_DESTINATIONS.jakarta.name)}: kota, desa, pedesaan, hutan dan pegunungan"><rect width="1000" height="1000" fill="#286576"/>${landMassSvg(1000,1000,bounds)}${zones}${routes}</svg>`;
}

// Keep the actual map points fixed; move their labels with small leader lines.
// This also keeps neighbouring forest / mountain names readable on a phone.
export function regionalLabelLayout(width,height,city='jakarta'){
  const placed=[],data=getRegionalLayout(city);
  for(const district of data.districts){
    const p=projectWorldPoint(district.rect.x,district.rect.z,data.bounds),x=p.x*width/100,y=p.y*height/100;
    const w=Math.min(width-24,Math.max(110,district.name.length*6.25+22)),h=42;
    let best=null;
    for(const dy of [0,-48,48,-96,96,-144,144])for(const dx of [0,-48,48,-96,96,-144,144,-192,192]){
      const cx=clamp(x+dx,w/2+9,width-w/2-9),cy=clamp(y+dy,h/2+9,height-h/2-46);
      const box={left:cx-w/2,top:cy-h/2,right:cx+w/2,bottom:cy+h/2};
      const overlap=placed.reduce((sum,item)=>sum+Math.max(0,Math.min(box.right+5,item.right)-Math.max(box.left-5,item.left))*Math.max(0,Math.min(box.bottom+5,item.bottom)-Math.max(box.top-5,item.top)),0);
      const score=overlap*100+Math.hypot(cx-x,cy-y);
      if(!best||score<best.score)best={id:district.id,x,y,cx,cy,w,h,...box,score};
    }
    placed.push(best);
  }
  return placed;
}

export function mountRepublicRegionalMap(host,{selected,city='jakarta',onSelect=()=>{}}={}){
  const abort=new AbortController();let currentCity=city,current=regionalLocation(selected,city).id;
  host.innerHTML=`<div class="rm-viewport" tabindex="0" aria-label="Wilayah kota: geser dan perbesar untuk memilih kawasan"><div class="rm-regional-plane"></div></div>${mapControlsMarkup()}<div class="rm-region-key">Pilih kawasan untuk mulai menjelajah</div>`;
  const plane=host.querySelector('.rm-regional-plane'),pan=attachMapPanZoom(host.querySelector('.rm-viewport'),plane,{max:7});
  const layout=()=>{for(const item of regionalLabelLayout(plane.clientWidth||host.clientWidth||900,plane.clientHeight||host.clientHeight||500,currentCity)){
    const pin=host.querySelector(`[data-district="${item.id}"]`),dx=item.cx-item.x,dy=item.cy-item.y;
    pin.style.setProperty('--label-x',`${dx}px`);pin.style.setProperty('--label-y',`${dy}px`);pin.style.setProperty('--label-width',`${item.w}px`);
    const line=pin.querySelector('.rm-label-leader');line.style.width=`${Math.hypot(dx,dy)}px`;line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
  }};
  const select=id=>{current=regionalLocation(id,currentCity).id;host.querySelectorAll('[data-district]').forEach(pin=>{const active=pin.dataset.district===current;pin.classList.toggle('selected',active);pin.setAttribute('aria-pressed',String(active));});};
  const render=()=>{
    const data=getRegionalLayout(currentCity);host.dataset.city=currentCity;
    plane.innerHTML=`${regionalPlanSvg(currentCity)}${data.districts.map(district=>{const p=projectWorldPoint(district.rect.x,district.rect.z,data.bounds);return `<button type="button" class="rm-district-pin" data-district="${escape(district.id)}" style="left:${p.x}%;top:${p.y}%"><em class="rm-label-leader" aria-hidden="true"></em><i class="${district.kind}"></i><span>${escape(district.name)}<small>${{urban:'KAWASAN KOTA',village:'DESA',countryside:'PEDESAAN',forest:'HUTAN',mountains:'PEGUNUNGAN'}[district.kind]||'WILAYAH'}</small></span></button>`;}).join('')}`;
    select(current);layout();
  };
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(layout):null;observer?.observe(host);window.addEventListener('resize',layout,{signal:abort.signal});render();
  host.addEventListener('click',event=>{if(handleMapZoom(event,pan))return;const pin=event.target.closest('[data-district]');if(pin){select(pin.dataset.district);onSelect(current);}},{signal:abort.signal});
  return {select,update({city=currentCity,selected=current}={}){const changed=city!==currentCity;currentCity=city;current=regionalLocation(selected,city).id;if(changed)pan.reset();render();},getView:pan.getState,dispose(){observer?.disconnect();abort.abort();pan.dispose();}};
}

export function mountRepublicMinimap(host,{city='jakarta',phase=getWorldPhase(),projects=[],onOpen=()=>{}}={}){
  let currentCity=city,lastReportedCity=city,currentPhase=phase,currentProjects=projects,lastPosition=null,lastYaw=0,mode=city==='jakarta'?'city':'regional';const abort=new AbortController();
  const render=()=>{host.dataset.city=currentCity;host.innerHTML=`<button class="rm-minimap-open" type="button" aria-label="Buka ${mode==='city'?'denah rinci':'wilayah '+escape(WORLD_DESTINATIONS[currentCity].name)}">${mode==='city'?sitePlanSvg({city:'jakarta',phase:currentPhase,projects:currentProjects,mini:true}):regionalPlanSvg(currentCity)}<i class="rm-player-dot"></i><b>U</b><span>${mode==='city'?'DENAH RINCI':escape(WORLD_DESTINATIONS[currentCity].name)} ↗</span></button>`;};
  const inside=(position,bounds)=>position.x>=bounds.minX&&position.x<=bounds.maxX&&position.z>=bounds.minZ&&position.z<=bounds.maxZ;
  render();host.addEventListener('click',()=>onOpen(mode,currentCity),{signal:abort.signal});
  return {update(state){
    let nextCity=currentCity;if(state.city&&state.city!==lastReportedCity){lastReportedCity=state.city;nextCity=state.city;}
    if(state.position&&!inside(state.position,getRegionalLayout(nextCity).bounds))nextCity=Object.values(WORLD_DESTINATIONS).sort((a,b)=>Math.hypot(a.center.x-state.position.x,a.center.z-state.position.z)-Math.hypot(b.center.x-state.position.x,b.center.z-state.position.z))[0].id;
    const nextMode=state.position?(inside(state.position,PUBLIC_SITEPLAN_BOUNDS)?'city':'regional'):nextCity!=='jakarta'?'regional':mode;
    if(nextCity!==currentCity||state.phase&&state.phase!==currentPhase||nextMode!==mode||state.projects&&state.projects!==currentProjects){currentCity=nextCity;currentPhase=state.phase||currentPhase;currentProjects=state.projects||currentProjects;mode=nextMode;render();}
    if(state.position){lastPosition=state.position;lastYaw=state.yaw||0;}
    if(lastPosition){const p=projectWorldPoint(lastPosition.x,lastPosition.z,mode==='city'?PUBLIC_SITEPLAN_BOUNDS:getRegionalLayout(currentCity).bounds),marker=host.querySelector('.rm-player-dot');marker.style.left=`${clamp(p.x,2,98)}%`;marker.style.top=`${clamp(p.y,2,98)}%`;marker.style.transform=`translate(-50%,-50%) rotate(${lastYaw}rad)`;}
  },dispose(){abort.abort();host.replaceChildren();}};
}

export function mountPhasePicker(host,{onChange=()=>{}}={}){
  host.innerHTML='<span>PERKEMBANGAN KOTA</span><div role="group" aria-label="Tahap pembangunan"><button type="button" data-world-phase="before-day2">Sebelum Day 2</button><button type="button" data-world-phase="after-day2">Sesudah Day 2</button></div>';
  const abort=new AbortController(),select=phase=>host.querySelectorAll('[data-world-phase]').forEach(button=>{button.classList.toggle('active',button.dataset.worldPhase===phase);button.setAttribute('aria-pressed',String(button.dataset.worldPhase===phase));});
  host.addEventListener('click',event=>{const button=event.target.closest('[data-world-phase]');if(!button)return;setWorldPhase(button.dataset.worldPhase);select(button.dataset.worldPhase);onChange(button.dataset.worldPhase);},{signal:abort.signal});
  select(getWorldPhase());return {select,dispose(){abort.abort();}};
}
