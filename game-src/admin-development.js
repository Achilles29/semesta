import {STORY_HOMES} from './citizen-story-homes.js';
import {citizens} from './citizen-roster.js';
import {CIVIC_FACILITIES} from './civic-development-layout.js';

/** Read-only planning register. Never assigns an account by matching its name. */
export function mountAdminDevelopment(host,{apiUrl,fetchImpl=globalThis.fetch}={}){
  const doc=host.ownerDocument,events=new AbortController();let sequence=0,disposed=false;
  const make=(tag,text='',className='')=>{const n=doc.createElement(tag);n.textContent=text;if(className)n.className=className;return n;};
  host.innerHTML='<div class="development-summary" data-summary></div><p role="status" data-status>Memuat status layanan…</p><button type="button" data-refresh>Perbarui status server</button><section><h3>48 rumah warga cerita</h3><p>Nama di papan adalah reservasi cerita, bukan bukti kepemilikan akun. Username yang sama tidak otomatis menerima rumah. Klaim membutuhkan verifikasi akun medsos asal komentar.</p><label>Cari nama, pekerjaan, atau alamat<input type="search" data-search maxlength="80"></label><p data-count></p><div class="development-table-wrap"><table><thead><tr><th>Nama / pekerjaan</th><th>Alamat / ID</th><th>Status</th></tr></thead><tbody data-homes></tbody></table></div></section><section><h3>Rencana fasilitas publik dan ekonomi</h3><p>Gedung Day 3 tersedia untuk staging produksi. Layanan transaksi serta publikasi gedung ke dunia game belum aktif. Memutar episode tidak menerbitkan kota.</p><div class="development-facilities" data-facilities></div></section>';
  const q=s=>host.querySelector(s),summary=q('[data-summary]'),status=q('[data-status]');
  for(const [title,body] of [
    ['Alamat game','republikwkwkwk.com'],
    ['Paket awal warga','Rumah subsidi standar + 1.000 Koin Republik + alat dasar sesuai pekerjaan. Diberikan sekali saat akun lengkap membuka profil/jelajah, jika migrasi starter tersedia. Belanja dan penggunaan alat usaha menyusul.'],
    ['Hunian yang sudah tersedia','Rumah subsidi privat diakses lewat Wisma; tugas Bu Rani memberi tanaman tambahan. Progres kamar lama dipertahankan. Rumah perintis: eksterior bernama; klaim akun dan akses tapak belum tersedia.'],
  ]){const card=make('article','','overview-card');card.append(make('h3',title),make('p',body));summary.append(card);}
  function renderHomes(){
    const query=q('[data-search]').value.trim().toLocaleLowerCase('id-ID');
    const rows=STORY_HOMES.filter(h=>{const c=citizens.find(c=>c.id===h.storyCitizenId);return `${h.name} ${h.address} ${c?.role||''}`.toLocaleLowerCase('id-ID').includes(query);});
    q('[data-count]').textContent=`${rows.length} dari ${STORY_HOMES.length} rumah reservasi. Akun terdaftar dihitung terpisah di Direktori warga.`;
    q('[data-homes]').replaceChildren(...rows.map(h=>{const c=citizens.find(c=>c.id===h.storyCitizenId),row=make('tr');row.append(make('td',`${h.name} — ${c?.role||'Warga cerita'}`),make('td',`${h.address} · ${h.id}`),make('td','Reservasi cerita · belum ditautkan ke akun'));return row;}));
  }
  for(const f of CIVIC_FACILITIES){const card=make('article','','overview-card');card.append(make('h4',f.name),make('p',f.service),make('small',`Rencana · tapak ${f.width} × ${f.depth} · koordinat ${f.x}, ${f.z}`));q('[data-facilities]').append(card);}
  async function load(){
    const request=++sequence;q('[data-refresh]').disabled=true;status.textContent='Memeriksa layanan pada server ini…';
    try{
      const url=new URL(apiUrl,doc.baseURI);url.searchParams.set('resource','admin_operations');
      const response=await fetchImpl(url.href,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}),data=await response.json();
      if(disposed||request!==sequence)return;
      if(!response.ok)throw Error(data.error||'Status layanan belum tersedia.');
      if(data.database!==true||!data.modules)throw Error('Status layanan tidak lengkap.');
      const labels={world:'dunia bersama',homes:'hunian/Wisma',starter:'starter pack',work:'konstruksi P01'};
      status.textContent=`Database terhubung. Skema tersedia: ${Object.entries(labels).filter(([key])=>data.modules[key]).map(([,label])=>label).join(', ')||'belum ada modul dunia/hunian'}. Pemeriksaan ini bukan bukti layanan sudah lulus uji perangkat.`;
      const db=doc.querySelector('[data-database-status]');if(db)db.textContent='DATABASE TERHUBUNG';
    }catch(error){if(!disposed&&request===sequence){status.textContent=error.message;const db=doc.querySelector('[data-database-status]');if(db)db.textContent='STATUS BELUM TERKONFIRMASI';}}
    finally{if(!disposed&&request===sequence)q('[data-refresh]').disabled=false;}
  }
  q('[data-search]').addEventListener('input',renderHomes,{signal:events.signal});q('[data-refresh]').addEventListener('click',load,{signal:events.signal});renderHomes();
  return {load,ready:load(),dispose(){disposed=true;sequence++;events.abort();host.replaceChildren();}};
}
