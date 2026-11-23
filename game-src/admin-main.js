import {createWorldAsset,getDefaultWorldScene,preloadWorldAssets,WORLD_ASSET_LIBRARY} from './world-assets-3d-v2.js';
import {mountAvatarStudio} from './avatar-v15-studio.js';
const $=selector=>document.querySelector(selector);
const API_URL=window.SEMESTA_API_URL||new URL('api',document.baseURI).href;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
function updateAdminQuery(values) {
  if (!document.body.classList.contains('admin-body')) return;
  const url = new URL(location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined || value === 'all' || value === 1 || value === '1') url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  });
  history.replaceState(history.state, '', url);
}
async function initIdeasInbox() {
  const form = $('#ideaForm'); const status = $('#ideaStatus'); const list = $('#ideaList');
  let ideas = []; let sourceInitialized = false; const search = $('#ideaSearch'); const statusFilter = $('#ideaFilterStatus'); const sourceFilter = $('#ideaFilterSource');
  const params = new URLSearchParams(location.search); let page = Math.max(1, Number(params.get('ideaPage')) || 1); const perPage = 12; let pendingSearch = 0;
  search.value = params.get('ideaQ') || ''; statusFilter.value = params.get('ideaStatus') || 'all';
  const updateIdea = async (idea) => {
    try {
      const response = await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'ideas', ...idea }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Gagal memperbarui ide.');
      ideas = result.ideas; render(); status.textContent = 'Status ide diperbarui.'; status.className = 'save-status saved';
    } catch (error) { status.textContent = error.message; status.className = 'save-status error'; }
  };
  const render = () => {
    list.replaceChildren();
    $('#ideasNavCount').textContent = String(ideas.length); $('#ideasPageCount').textContent = String(ideas.length); $('#overviewIdeaCount').textContent = String(ideas.length);
    const sources = [...new Set(ideas.map((idea) => String(idea.platform || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'id'));
    const chosenSource = sourceInitialized ? (sourceFilter.value || 'all') : (params.get('ideaSource') || 'all');
    sourceFilter.replaceChildren(new Option('Semua sumber', 'all'), ...sources.map((source) => new Option(source, source)));
    sourceFilter.value = sources.includes(chosenSource) ? chosenSource : 'all';
    sourceInitialized = true;
    const query = search.value.trim().toLocaleLowerCase('id-ID');
    const filtered = ideas.filter((idea) => {
      const searchable = `${idea.name || ''} ${idea.platform || ''} ${idea.comment || ''}`.toLocaleLowerCase('id-ID');
      return (!query || searchable.includes(query)) && (statusFilter.value === 'all' || (idea.status || 'baru') === statusFilter.value) && (sourceFilter.value === 'all' || idea.platform === sourceFilter.value);
    });
    const pages = Math.max(1, Math.ceil(filtered.length / perPage)); page = Math.min(page, pages);
    const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
    $('#ideaListStatus').textContent = filtered.length ? `Menampilkan ${((page - 1) * perPage) + 1}–${Math.min(page * perPage, filtered.length)} dari ${filtered.length} usulan yang cocok.` : (ideas.length ? 'Tidak ada usulan yang cocok dengan filter.' : 'Belum ada ide. Salin komentar yang sudah ditinjau dari media sosial untuk memulai.');
    $('#ideaPageLabel').textContent = `Halaman ${page} dari ${pages}`; $('#ideaPrev').disabled = page <= 1; $('#ideaNext').disabled = page >= pages;
    if (!pageItems.length) { const empty = document.createElement('p'); empty.className = 'ideas-empty'; empty.textContent = ideas.length ? 'Coba ubah kata kunci atau filter.' : 'Belum ada ide. Salin komentar yang sudah ditinjau dari media sosial untuk memulai.'; list.append(empty); return; }
    pageItems.forEach((idea) => {
      const card = document.createElement('article'); card.className = 'idea-item';
      const meta = document.createElement('div'); meta.className = 'idea-meta'; const byline = document.createElement('span'); byline.textContent = `${idea.name || 'Tanpa nama'}${idea.platform ? ` · ${idea.platform}` : ''}`;
      const select = document.createElement('select'); select.setAttribute('aria-label', 'Status ide');
      [['baru', 'Baru'], ['dipilih', 'Dipilih'], ['dipakai', 'Dipakai'], ['disimpan', 'Tidak dipakai']].forEach(([value, label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = (idea.status || 'baru') === value; select.append(option); });
      select.addEventListener('change', () => updateIdea({ ...idea, status: select.value })); meta.append(byline, select);
      const comment = document.createElement('p'); comment.className = 'idea-comment'; comment.textContent = idea.comment;
      card.append(meta, comment); list.append(card);
    });
  };
  try {
    const response = await fetch(`${API_URL}?resource=ideas`);
    const result = await response.json();
    if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'Inbox warga belum tersedia.');
    ideas = result; render();
  }
  catch { status.textContent = 'Gagal membaca inbox ide.'; status.className = 'save-status error'; }
  const syncIdeaUrl = () => updateAdminQuery({ ideaQ: search.value.trim(), ideaStatus: statusFilter.value, ideaSource: sourceFilter.value, ideaPage: page });
  search.addEventListener('input', () => { clearTimeout(pendingSearch); pendingSearch = setTimeout(() => { page = 1; render(); syncIdeaUrl(); }, 220); });
  [statusFilter, sourceFilter].forEach((control) => control.addEventListener('change', () => { page = 1; render(); syncIdeaUrl(); }));
  $('#ideaPrev').addEventListener('click', () => { if (page > 1) { page--; render(); syncIdeaUrl(); } });
  $('#ideaNext').addEventListener('click', () => { page++; render(); syncIdeaUrl(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const idea = Object.fromEntries(new FormData(form).entries()); idea.resource = 'ideas'; idea.status = 'baru';
    status.textContent = 'Menyimpan…';
    try { const response = await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(idea) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Gagal menyimpan ide.'); ideas = result.ideas; form.reset(); render(); status.textContent = 'Ide tersimpan lokal.'; status.className = 'save-status saved'; }
    catch (error) { status.textContent = error.message; status.className = 'save-status error'; }
  });
}

async function initVisitorLogs() {
  const rows = $('#visitorRows'); if (!rows) return;
  const controls = { q: $('#visitorSearch'), days: $('#visitorDays'), device: $('#visitorDevice'), traffic: $('#visitorTraffic'), from: $('#visitorFrom'), to: $('#visitorTo') };
  const keys = { q: 'visitorQ', days: 'visitorDays', device: 'visitorDevice', traffic: 'visitorTraffic', from: 'visitorFrom', to: 'visitorTo' };
  const params = new URLSearchParams(location.search);
  Object.entries(controls).forEach(([key, control]) => { const saved = params.get(keys[key]); if (saved) control.value = saved; });
  const status = $('#visitorStatus'); let page = Math.max(1, Number(params.get('visitorPage')) || 1); let pages = 1; let debounce = 0; let requestId = 0;
  const setText = (selector, value) => { $(selector).textContent = value; };
  const addCell = (row, value, className = '') => { const cell = document.createElement('td'); if (className) cell.className = className; cell.textContent = value || '—'; row.append(cell); return cell; };
  const syncUrl = () => updateAdminQuery({ visitorQ: controls.q.value.trim(), visitorDays: controls.days.value, visitorDevice: controls.device.value, visitorTraffic: controls.traffic.value, visitorFrom: controls.from.value, visitorTo: controls.to.value, visitorPage: page });
  const load = async () => {
    const thisRequest = ++requestId; status.textContent = 'Memuat log pengunjung…'; status.className = 'admin-list-status'; rows.replaceChildren();
    const query = new URLSearchParams({ resource: 'visitor_logs', days: controls.days.value, device: controls.device.value, traffic: controls.traffic.value, page: String(page) });
    if (controls.q.value.trim()) query.set('q', controls.q.value.trim()); if (controls.from.value) query.set('from', controls.from.value); if (controls.to.value) query.set('to', controls.to.value);
    try {
      const response = await fetch(`${API_URL}?${query}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Log pengunjung belum dapat dimuat.'); if (thisRequest !== requestId) return;
      page = Number(result.page) || 1; pages = Number(result.pages) || 1;
      setText('#visitorStatViews', Number(result.stats?.views || 0).toLocaleString('id-ID')); setText('#visitorStatUnique', Number(result.stats?.visitors || 0).toLocaleString('id-ID')); setText('#visitorStatIps', Number(result.stats?.addresses || 0).toLocaleString('id-ID')); setText('#visitorStatReferred', Number(result.stats?.referred || 0).toLocaleString('id-ID'));
      setText('#visitorNavCount', Number(result.stats?.views || 0).toLocaleString('id-ID'));
      rows.replaceChildren();
      (result.items || []).forEach((item) => {
        const row = document.createElement('tr'); addCell(row, String(item.visited_at || '').replace('T', ' ').slice(0, 16)); addCell(row, item.ip_address || 'IP tidak tersedia (log lama)');
        const path = addCell(row, item.request_path); path.classList.add('visitor-path'); path.title = item.request_path || '';
        const ref = item.referrer_host ? `${item.referrer_host}${item.referrer_path && item.referrer_path !== '/' ? item.referrer_path : ''}` : 'Akses langsung';
        const refCell = addCell(row, ref); refCell.classList.add('visitor-ref'); refCell.title = ref;
        const deviceCell = addCell(row, `${item.device_type || 'unknown'} · ${item.browser || 'Browser lain'}${Number(item.is_bot) ? ' · BOT' : ''}`); if (Number(item.is_bot)) deviceCell.classList.add('visitor-bot');
        const agent = addCell(row, item.user_agent || '—'); agent.classList.add('visitor-agent'); agent.title = item.user_agent || ''; rows.append(row);
      });
      if (!result.items?.length) { const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 6; cell.className = 'visitor-empty'; cell.textContent = 'Belum ada kunjungan yang cocok. Log mulai tercatat setelah modul ini dipasang.'; row.append(cell); rows.append(row); }
      const sourceList = $('#visitorReferrerList'); sourceList.replaceChildren();
      (result.topReferrers || []).forEach((source) => { const item = document.createElement('div'); item.className = 'visitor-source'; const name = document.createElement('span'); name.textContent = source.source; const count = document.createElement('b'); count.textContent = Number(source.views || 0).toLocaleString('id-ID'); item.append(name, count); sourceList.append(item); });
      if (!sourceList.childElementCount) sourceList.textContent = 'Belum ada data perujuk.';
      $('#visitorPageLabel').textContent = `Halaman ${page} dari ${pages} · ${Number(result.total || 0).toLocaleString('id-ID')} kunjungan`; $('#visitorPrev').disabled = page <= 1; $('#visitorNext').disabled = page >= pages;
      status.textContent = 'Data diperbarui saat halaman dibuka; alamat IP berasal dari koneksi langsung ke server.'; syncUrl();
    } catch (error) { if (thisRequest === requestId) { status.textContent = error.message; status.className = 'admin-list-status error'; } }
  };
  controls.q.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { page = 1; load(); }, 250); });
  [controls.days, controls.device, controls.traffic, controls.from, controls.to].forEach((control) => control.addEventListener('change', () => { page = 1; load(); }));
  $('#visitorReset').addEventListener('click', () => { controls.q.value = ''; controls.days.value = '30'; controls.device.value = 'all'; controls.traffic.value = 'all'; controls.from.value = ''; controls.to.value = ''; page = 1; load(); });
  $('#visitorPrev').addEventListener('click', () => { if (page > 1) { page--; load(); } }); $('#visitorNext').addEventListener('click', () => { if (page < pages) { page++; load(); } });
  await load();
}


async function initCitizenDirectory() {
  const list = $('#citizenAdminList'); const status = $('#citizenAdminStatus');
  if (!list || !status) return;
  const search = $('#citizenAdminSearch'); const filter = $('#citizenAdminFilter');
  const params = new URLSearchParams(location.search); let page = Math.max(1, Number(params.get('citizenPage')) || 1); let pages = 1; let pendingSearch = 0;
  search.value = params.get('citizenQ') || ''; filter.value = params.get('citizenStatus') || 'all';
  const houseLabels = { 'rumah-kayu':'Rumah kayu', 'rumah-bata':'Rumah bata', 'rumah-panggung':'Rumah panggung' };
  const make = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
  const load = async () => {
    status.textContent = 'Memuat daftar warga…'; status.className = 'citizen-admin-status';
    try {
      const query = new URLSearchParams({ resource:'citizen_admin', q:search.value.trim(), status:filter.value, page:String(page) });
      const response = await fetch(`${API_URL}?${query}`, { headers:{ Accept:'application/json' } });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Direktori warga belum dapat dimuat.');
      page = result.page; pages = result.pages;
      $('#citizenStatTotal').textContent = Number(result.stats.total || 0).toLocaleString('id-ID');
      $('#citizenStatVerified').textContent = Number(result.stats.verified || 0).toLocaleString('id-ID');
      $('#citizenStatPending').textContent = Number(result.stats.pending || 0).toLocaleString('id-ID');
      $('#citizenStatInactive').textContent = Number(result.stats.inactive || 0).toLocaleString('id-ID');
      $('#citizenStatAdminProfiles').textContent = Number(result.stats.admin_profiles || 0).toLocaleString('id-ID');
      $('#citizenAdminAccountName').textContent = result.configuredAdmin ? `@${result.configuredAdmin}` : 'BELUM DIATUR';
      $('#citizenNavCount').textContent = Number(result.stats.total || 0).toLocaleString('id-ID');
      $('#citizenAdminPage').textContent = `Halaman ${page} dari ${pages} · ${Number(result.total || 0).toLocaleString('id-ID')} warga`;
      $('#citizenAdminPrev').disabled = page <= 1; $('#citizenAdminNext').disabled = page >= pages;
      list.replaceChildren();
      if (!result.citizens?.length) { list.append(make('p','citizen-admin-empty','Belum ada akun yang cocok dengan pencarian ini.')); status.textContent = 'Direktori warga siap.'; return; }
      result.citizens.forEach((citizen) => {
        const card = make('article','citizen-admin-row');
        const identity = make('div','citizen-admin-identity'); const name = make('b','',citizen.display_name || 'Warga');
        const handle = make('span','',`@${citizen.username}`); const email = make('span','citizen-admin-email',citizen.email); identity.append(name,handle,email);
        const badges = make('div','citizen-admin-badges'); badges.append(make('span',`citizen-account-badge ${Number(citizen.is_active)?'active':'inactive'}`,Number(citizen.is_active)?'AKTIF':'NONAKTIF')); badges.append(make('span',`citizen-email-badge ${Number(citizen.email_verified)?'verified':'pending'}`,Number(citizen.email_verified)?'EMAIL TERVERIFIKASI':'EMAIL MENUNGGU'));
        const details = make('div','citizen-admin-details'); const joined=String(citizen.created_at||'').slice(0,10); details.append(make('span','',`${citizen.occupation_label || 'Pekerjaan belum diisi'} · ${citizen.avatar_label || 'Warga umum'}`),make('span','',`Bergabung ${joined || '—'}`),make('span',`citizen-online ${Number(citizen.is_online)?'online':''}`,Number(citizen.is_online)?'● Sedang menjelajah':'○ Tidak sedang menjelajah'));
        const personal = make('details','citizen-admin-personal'); const summary = make('summary','','Lihat biodata privat'); const personalContent = make('div','citizen-admin-personal-content'); personal.append(summary,personalContent);
        personal.addEventListener('toggle',async()=>{if(!personal.open||personal.dataset.loaded)return;personal.dataset.loaded='loading';personalContent.textContent='Memuat biodata…';try{const response=await fetch(`${API_URL}?resource=citizen_admin_detail&id=${Number(citizen.id)}`,{headers:{Accept:'application/json'}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Biodata tidak dapat dimuat.');const profile=data.citizen;const values=[['Jenis kelamin',profile.gender_label],['Agama/kepercayaan',profile.religion_label],['Tempat lahir',[profile.birth_city,profile.birth_province_label].filter(Boolean).join(', ')],['Tanggal lahir',profile.birth_date],['Pekerjaan',profile.occupation_label],['Pendidikan',profile.education_label],['Domisili',[profile.domicile_city,profile.domicile_province_label].filter(Boolean).join(', ')],['Gaya avatar',profile.avatar_label]];const dl=make('dl','');values.forEach(([label,value])=>{const group=make('div','');group.append(make('dt','',label),make('dd','',value||'Belum diisi'));dl.append(group);});personalContent.replaceChildren(dl);personal.dataset.loaded='true';}catch(error){personalContent.textContent=error.message;personal.dataset.loaded='';}});
        const action = make('button',`citizen-admin-toggle ${Number(citizen.is_active)?'deactivate':'activate'}`,Number(citizen.is_active)?'NONAKTIFKAN':'AKTIFKAN KEMBALI'); action.type='button'; action.addEventListener('click',async()=>{
          const activating=!Number(citizen.is_active); const verb=activating?'mengaktifkan kembali':'menonaktifkan';
          if (!window.confirm(`Yakin ingin ${verb} akun ${citizen.display_name} (@${citizen.username})?`)) return;
          action.disabled=true;
          try { const update=await fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'citizen_admin',action:'set_active',citizenId:Number(citizen.id),active:activating})});const data=await update.json();if(!update.ok)throw new Error(data.error||'Status akun belum berubah.');await load(); }
          catch(error){status.textContent=error.message;status.className='citizen-admin-status error';action.disabled=false;}
        });
        card.append(identity,badges,details,action,personal);list.append(card);
      });
      status.textContent = 'Direktori warga siap.';
    } catch(error) { list.replaceChildren(); status.textContent=error.message;status.className='citizen-admin-status error'; }
  };
  const syncUrl = () => updateAdminQuery({ citizenQ: search.value.trim(), citizenStatus: filter.value, citizenPage: page });
  search.addEventListener('input',()=>{clearTimeout(pendingSearch);pendingSearch=setTimeout(()=>{page=1;load().then(syncUrl);},260);});
  filter.addEventListener('change',()=>{page=1;load().then(syncUrl);});
  $('#citizenAdminPrev').addEventListener('click',()=>{if(page>1){page--;load().then(syncUrl);}});
  $('#citizenAdminNext').addEventListener('click',()=>{if(page<pages){page++;load().then(syncUrl);}});
  await load();
}

async function initMailSettings() {
  const form = $('#mailSettingsForm');
  const status = $('#mailSettingsStatus');
  if (!form || !status) return;
  const verification = form.elements.requireEmailVerification;
  const show = (settings) => {
    verification.checked = !!settings.requireEmailVerification;
    status.textContent = `${settings.smtpConfigured ? `SMTP Gmail siap · ${settings.sender || 'pengirim tersetel'}` : 'SMTP Gmail belum disetel.'} · Google SSO ${settings.googleSsoConfigured ? 'siap' : 'menunggu OAuth Client ID dan Secret'}`;
    status.classList.toggle('ready', !!settings.smtpConfigured);
  };
  try {
    const response = await fetch(`${API_URL}?resource=settings`, { headers: { Accept: 'application/json' } });
    const settings = await response.json();
    if (!response.ok) throw new Error(settings.error || 'Gagal memuat pengaturan email.');
    show(settings);
  } catch (error) { status.textContent = error.message; status.classList.add('error'); }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.classList.remove('error');
    status.textContent = 'Menyimpan pengaturan…';
    try {
      const response = await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ resource: 'settings', requireEmailVerification: verification.checked }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pengaturan tidak berhasil disimpan.');
      show(result); status.textContent = result.requireEmailVerification ? 'Verifikasi email diwajibkan untuk pendaftaran baru.' : 'Pendaftaran email tidak mewajibkan verifikasi.';
    } catch (error) { status.textContent = error.message; status.classList.add('error'); }
  });
}

async function initWorldEditor() {
  const canvas = $('#worldBuilderCanvas');
  const palette = $('#worldAssetPalette');
  const status = $('#worldSceneStatus');
  if (!canvas || canvas.dataset.ready) return;
  canvas.dataset.ready = '1';
  const labels = Object.fromEntries(WORLD_ASSET_LIBRARY.map(([type, name]) => [type, name]));
  let editorReady = false; let editorFailed = false; let lastPaletteDragAt = 0;
  const icons = { road: '🛣️', house: '🏚️', house_village: '🏠', house_mid: '🏠', house_luxury: '🏡', school: '🏫', school_ruined: '🏚️', school_good: '🏫', mbg: '🍱', sppg: '🏥', kopdes: '🏪', market: '🥬', hall: '🏛️', office: '🏢', dpr_mpr: '🏛️', istana_negara: '🏰', river: '🌊', bridge: '🌉', rice_field: '🌾', crop_field: '🌱', car: '🚙', car_economy: '🚗', car_family: '🚙', car_luxury: '🚘', pickup: '🛻', truck: '🚚', bus: '🚌', motorcycle: '🏍️', tractor: '🚜', hand_tractor: '⚙️', combine_harvester: '🚜', tree: '🌳', tree_canopy: '🌳', forest: '🌲', forest_lush: '🌳', forest_burned: '🔥', chicken: '🐓', duck: '🦆', goat: '🐐', cow: '🐄', buffalo: '🐃', cat: '🐈', dog: '🐕', lamp: '💡' };
  const paletteGroups = [
    ['JALAN & AIR', ['road','river','bridge']],
    ['RUMAH & PERMUKIMAN', ['house','house_village','house_mid','house_luxury']],
    ['FASILITAS PUBLIK', ['school','school_ruined','school_good','mbg','sppg','kopdes','market','hall','office','dpr_mpr','istana_negara']],
    ['PERTANIAN & LAHAN', ['rice_field','crop_field','tractor','hand_tractor','combine_harvester']],
    ['KENDARAAN', ['car','car_economy','car_family','car_luxury','pickup','truck','bus','motorcycle']],
    ['ALAM & HEWAN', ['tree','tree_canopy','forest','forest_lush','forest_burned','chicken','duck','goat','cow','buffalo','cat','dog','lamp']],
  ];
  const paletteSections = new Map();
  paletteGroups.forEach(([title, types], groupIndex) => {
    const section = document.createElement('details'); section.className='world-asset-group'; section.open=groupIndex<2; section.dataset.assetGroup=title.toLocaleLowerCase('id-ID');
    const summary=document.createElement('summary'); summary.innerHTML=`<span>${title}</span><small>${types.length} aset</small>`;
    const list=document.createElement('div'); list.className='world-asset-group-items'; section.append(summary,list); palette.append(section); paletteSections.set(title,{section,list,types});
  });
  const typeToGroup=new Map(paletteGroups.flatMap(([title,types])=>types.map((type)=>[type,title])));
  WORLD_ASSET_LIBRARY.forEach(([type, name]) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'world-asset-item'; button.draggable = true; button.dataset.asset = type;
    const icon=document.createElement('span');icon.textContent=icons[type]||'◇';const label=document.createElement('b');label.textContent=name;button.append(icon,label);
    button.addEventListener('dragstart', (event) => { lastPaletteDragAt=Date.now();event.dataTransfer.setData('text/plain', type); event.dataTransfer.effectAllowed = 'copy'; });
    button.addEventListener('click', () => { if(Date.now()-lastPaletteDragAt<700)return;if(editorFailed){status.textContent='Editor aset perlu WebGL aktif. Buka panel ini di browser dengan akselerasi grafis.';return;}if(!editorReady){status.textContent='Peta 3D masih disiapkan, coba klik aset lagi sebentar.';return;}pendingType=null;const [x,z]=findPlacement(type);addObject(type,x,z); });
    (paletteSections.get(typeToGroup.get(type))?.list||palette).append(button);
  });
  $('#worldAssetSearch')?.addEventListener('input', (event) => {
    const query = event.target.value.trim().toLocaleLowerCase('id-ID');
    let matches=0;
    palette.querySelectorAll('[data-asset]').forEach((button) => { button.hidden = !!query && !button.textContent.toLocaleLowerCase('id-ID').includes(query); if(!button.hidden)matches++; });
    paletteSections.forEach(({section,list})=>{const visible=[...list.querySelectorAll('[data-asset]')].some(button=>!button.hidden);section.hidden=!visible;if(query&&visible)section.open=true;});
    if(query&&matches===0){status.textContent='Aset tidak ditemukan. Coba kata “rumah”, “air”, “kendaraan”, atau “hewan”.';status.classList.remove('is-dirty');}
    else if(!query&&sceneLoaded)setStatus(`${objects.size} aset siap dipilih. Klik atau tarik aset ke peta.`);
  });
  let THREE;
  try { THREE = await import('three'); }
  catch (error) { status.textContent = `Aset 3D tidak dapat dimuat: ${error.message}`; return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); }
  catch (error) { editorFailed=true;status.textContent=`Editor 3D tidak dapat dimulai: ${error.message}`;return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#d6e4df');
  const camera = new THREE.OrthographicCamera(-27, 27, 27, -27, .1, 150);
  scene.add(new THREE.HemisphereLight('#fff7e9', '#66805f', 1.8)); const sunlight = new THREE.DirectionalLight('#fff2d7', 2); sunlight.position.set(-20, 35, 18); sunlight.castShadow = true; scene.add(sunlight);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10000000, 10000000), new THREE.MeshStandardMaterial({ color: '#a9c487', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.04; ground.receiveShadow = true; ground.frustumCulled = false; scene.add(ground);
  const grid = new THREE.GridHelper(5000, 1000, '#708d71', '#dce7cc'); grid.position.y = -.015; grid.frustumCulled = false; scene.add(grid);
  const objects = new Map(); const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const highlight = new THREE.BoxHelper(new THREE.Group(), '#ef9e52'); highlight.visible = false; scene.add(highlight);
  const validRegions = ['kota', 'desa', 'hutan'];
  const requestedRegion = new URLSearchParams(location.search).get('region');
  if (validRegions.includes(requestedRegion)) $('#sceneRegion').value = requestedRegion;
  let currentRegion = $('#sceneRegion').value; let entries = []; let selectedId = null; let pendingType = null; let movingId = null; let panPointer = null; let orbitPointer = null; let lastPan = null; let viewCenterX = 0; let viewCenterZ = 0; let viewYaw = Math.atan2(31, 34); let viewElevation = Math.asin(39 / Math.hypot(31, 39, 34)); let orbitMode = false; let dirty = false; let sceneLoaded = false; let regionLoadSequence = 0;
  const coordinateLimit = 1000000;
  function updateEditorView() {
    const radius = 60.4; const horizontal = Math.cos(viewElevation) * radius;
    camera.position.set(viewCenterX + Math.sin(viewYaw) * horizontal, Math.sin(viewElevation) * radius, viewCenterZ + Math.cos(viewYaw) * horizontal); camera.lookAt(viewCenterX, 0, viewCenterZ); camera.updateMatrixWorld();
    ground.position.set(viewCenterX, -.04, viewCenterZ);
    grid.position.set(Math.round(viewCenterX / 2500) * 2500, -.015, Math.round(viewCenterZ / 2500) * 2500);
  }
  updateEditorView();
  const inspector = $('#objectProperties'); const emptyHint = $('#emptyObjectHint');
  const setStatus = (message, hasChanges = dirty) => { status.textContent = message; status.classList.toggle('is-dirty', hasChanges); };
  function disposeObject(object) { object.traverse((node) => { node.geometry?.dispose(); if (Array.isArray(node.material)) node.material.forEach((material) => { if (!material.map?.userData?.sharedIllustration) material.map?.dispose(); material.dispose(); }); else if (node.material) { if (!node.material.map?.userData?.sharedIllustration) node.material.map?.dispose(); node.material.dispose(); } }); }
  function drawObjects() {
    objects.forEach((object) => { scene.remove(object); disposeObject(object); }); objects.clear();
    const renderErrors = [];
    entries.forEach((entry) => {
      try {
        const object = createWorldAsset(THREE, entry.type, entry); if (!object) return;
        object.position.set(entry.x, 0, entry.z); object.rotation.y = entry.rotation * Math.PI / 180; object.scale.setScalar(entry.scale); object.userData.sceneObjectId = entry.id; scene.add(object); objects.set(entry.id, object);
      } catch (error) { renderErrors.push(entry.type); console.error(`Object wilayah gagal dirender (${entry.type}, ${entry.id}):`, error); }
    });
    if (selectedId && objects.has(selectedId)) { highlight.setFromObject(objects.get(selectedId)); highlight.visible = true; } else highlight.visible = false;
    updateInspector();
    return { rendered: objects.size, failed: renderErrors };
  }
  function selectObject(id) {
    const changed = selectedId !== id; selectedId = id; const object = objects.get(id);
    if (object) { highlight.setFromObject(object); highlight.visible = true; } else highlight.visible = false;
    if (changed) { const entry = entries.find((item) => item.id === id); if (entry) ['objectXRange','objectZRange'].forEach((field, index) => { const value = index ? entry.z : entry.x; const range = $(`#${field}`); range.min = Math.floor(value - 500); range.max = Math.ceil(value + 500); }); }
    updateInspector();
  }
  function updateInspector() {
    const entry = entries.find((item) => item.id === selectedId); inspector.hidden = !entry; emptyHint.hidden = !!entry;
    if (!entry) return;
    $('#selectedObjectName').textContent = labels[entry.type] || entry.type;
    $('#objectX').value = entry.x; $('#objectZ').value = entry.z; $('#objectRotation').value = entry.rotation;
    $('#objectLength').value = entry.length; $('#objectWidth').value = entry.width; $('#objectScale').value = entry.scale;
    $('#objectXRange').value = clamp(entry.x, Number($('#objectXRange').min), Number($('#objectXRange').max)); $('#objectZRange').value = clamp(entry.z, Number($('#objectZRange').min), Number($('#objectZRange').max)); $('#objectRotationRange').value = entry.rotation;
    $('#objectLengthRange').value = entry.length; $('#objectWidthRange').value = entry.width; $('#objectScaleRange').value = entry.scale;
    const adjustable = ['road', 'river', 'bridge'].includes(entry.type);
    $('#objectDimensions').hidden = !adjustable; $('#objectScaleField').hidden = adjustable;
  }
  function rebuildSelected() {
    const entry = entries.find((item) => item.id === selectedId); if (!entry) return;
    const old = objects.get(entry.id); if (old) { scene.remove(old); disposeObject(old); }
    const next = createWorldAsset(THREE, entry.type, entry); next.position.set(entry.x, 0, entry.z); next.rotation.y = entry.rotation * Math.PI / 180; next.scale.setScalar(entry.scale); next.userData.sceneObjectId = entry.id; scene.add(next); objects.set(entry.id, next); highlight.setFromObject(next); updateInspector(); dirty = true; setStatus('Ada perubahan yang belum disimpan.');
  }
  function addObject(type, x, z) {
    const id = `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const field = ['rice_field', 'crop_field'].includes(type);
    const length = field ? 10 : type === 'river' ? 12 : 9;
    const width = field ? 8 : type === 'river' ? 4 : 3;
    entries.push({ id, type, x: clamp(x, -coordinateLimit, coordinateLimit), z: clamp(z, -coordinateLimit, coordinateLimit), rotation: 0, length, width, scale: 1 });
    dirty = true; drawObjects(); selectObject(id); setStatus(`Ditempatkan: ${labels[type]}. Atur posisinya, lalu simpan.`);
  }
  function footprint(item) {
    const scale=item.scale||1;
    if(['road','river','bridge'].includes(item.type)){
      const long=(item.length||9)/2,wide=(item.width||3)/2,angle=(item.rotation||0)*Math.PI/180;
      return [Math.abs(Math.cos(angle))*long+Math.abs(Math.sin(angle))*wide,Math.abs(Math.sin(angle))*long+Math.abs(Math.cos(angle))*wide];
    }
    return ({house:[3.4,2.8],house_village:[4.1,4.6],house_mid:[4.7,4.1],house_luxury:[4.8,4.8],school:[3.6,2.5],school_ruined:[7.0,6.0],school_good:[9.6,5.0],mbg:[4.2,3],sppg:[10.4,6.1],kopdes:[8.8,4.8],office:[5.9,5.4],dpr_mpr:[12.7,10.6],istana_negara:[12.2,9.2],rice_field:[5.4,4.9],crop_field:[5.4,4.9],forest:[1.8,1.8],forest_lush:[5.8,5.5],forest_burned:[5.8,5.5],tree:[1.8,1.8],tree_canopy:[3.9,3.1],market:[5.1,4.2],hall:[5.2,4.6],car:[2.15,1.1],car_economy:[1.95,1.1],car_family:[2.45,1.2],car_luxury:[2.65,1.2],pickup:[2.2,1.1],truck:[3.85,1.3],bus:[4.4,1.4],motorcycle:[1.15,.7],tractor:[2.3,1.2],hand_tractor:[1.8,.9],combine_harvester:[3.1,1.7],lamp:[.25,.25] }[item.type]||[1,1]).map(value=>value*scale);
  }
  function findPlacement(type) {
    const field = ['rice_field', 'crop_field'].includes(type);
    const probe = { type, x: 0, z: 0, rotation: 0, length: field ? 10 : type === 'river' ? 12 : 9, width: field ? 8 : type === 'river' ? 4 : 3, scale: 1 };
    const [hx, hz] = footprint(probe);
    const candidates=[];
    for(let z=-40;z<=40;z+=2)for(let x=-40;x<=40;x+=2)candidates.push([viewCenterX+x,viewCenterZ+z]);
    // Prefer open ground near the middle so a newly clicked asset is immediately
    // visible in the editor camera, then scan the rest of the map if needed.
    candidates.sort((a,b)=>Math.hypot(a[0]-viewCenterX,a[1]-viewCenterZ)-Math.hypot(b[0]-viewCenterX,b[1]-viewCenterZ));
    const free=candidates.find(([x,z])=>entries.every(item=>{const [ox,oz]=footprint(item);return Math.abs(x-item.x)>=hx+ox+.45||Math.abs(z-item.z)>=hz+oz+.45;}));
    return free||[clamp(viewCenterX+hx+2,-coordinateLimit,coordinateLimit),clamp(viewCenterZ+hz+2,-coordinateLimit,coordinateLimit)];
  }
  function groundPosition(event) {
    const rect = canvas.getBoundingClientRect(); pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera);
    const point = new THREE.Vector3(); return raycaster.ray.intersectPlane(groundPlane, point) ? point : null;
  }
  function loadRegion(region, force = false) {
    if (dirty && (region !== currentRegion || force) && !window.confirm('Ada perubahan yang belum disimpan. Muat ulang tanpa menyimpan?')) { $('#sceneRegion').value = currentRegion; return; }
    // Loading the hidden world editor must not replace the active sidebar view.
    updateAdminQuery({region});
    if (region !== currentRegion) { viewCenterX = 0; viewCenterZ = 0; updateEditorView(); }
    currentRegion = region; selectedId = null; pendingType = null; dirty = false; sceneLoaded = false; setStatus('Memuat tata wilayah dari server…', false);
    const sequence = ++regionLoadSequence;
    fetch(`${API_URL}?resource=world_scene&region=${encodeURIComponent(region)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Tata wilayah belum dapat dimuat.'); if (sequence !== regionLoadSequence) return; if (!Array.isArray(data.objects)) throw new Error('Format tata wilayah dari server tidak valid.'); const hasSavedScene=Boolean(data.customized);entries=hasSavedScene?data.objects:getDefaultWorldScene(region);sceneLoaded=true;editorReady=true;const rendered=drawObjects();requestAnimationFrame(()=>{resize();renderer.render(scene,camera);});const detail=rendered.failed.length?` · ${rendered.failed.length} aset gagal dirender`:'';setStatus(`${rendered.rendered} dari ${entries.length} objek tampil${hasSavedScene?' · tersimpan':' · tata awal'}.${detail} Klik aset untuk menambah.`, rendered.failed.length>0); }).catch((error) => { if (sequence !== regionLoadSequence) return; sceneLoaded=false;editorReady=false;const rendered=drawObjects();renderer.render(scene,camera);setStatus(`${error.message} · data lama tidak diubah. Periksa koneksi lalu tekan Muat Ulang.`, true);console.error('Tata wilayah gagal dimuat:',error); });
  }
  async function saveRegion() {
    if (!sceneLoaded) { setStatus('Tata wilayah belum dimuat dari server. Muat ulang dulu sebelum menyimpan agar data lama tetap aman.', true); return; }
    const button = $('#saveWorldScene'); button.disabled = true; setStatus('Menyimpan tata wilayah…');
    try {
      const response = await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ resource: 'world_scene', region: currentRegion, objects: entries }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Tata wilayah belum tersimpan.');
      if (result.region !== currentRegion || !Array.isArray(result.objects)) throw new Error('Server mengembalikan wilayah yang berbeda. Perubahan belum dikonfirmasi.');
      entries = result.objects; dirty = false; drawObjects(); setStatus(`${entries.length} objek tersimpan dan sudah dikonfirmasi server.`, false);
    } catch (error) { setStatus(error.message); }
    finally { button.disabled = false; }
  }
  canvas.addEventListener('dragover', (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  canvas.addEventListener('drop', (event) => { event.preventDefault(); const type = event.dataTransfer.getData('text/plain'); if (!labels[type]) return; const point = groundPosition(event); if (point) addObject(type, point.x, point.z); });
  canvas.addEventListener('pointerdown', (event) => {
    if (orbitMode || event.button === 2 || event.shiftKey) { event.preventDefault(); orbitPointer = event.pointerId; lastPan = { x:event.clientX, y:event.clientY }; canvas.setPointerCapture(event.pointerId); return; }
    const point = groundPosition(event); if (!point) return;
    if (pendingType) { addObject(pendingType, point.x, point.z); pendingType = null; return; }
    const rect = canvas.getBoundingClientRect(); pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...objects.values()], true); let id = null; for (const hit of hits) { let node = hit.object; while (node && !node.userData.sceneObjectId) node = node.parent; if (node) { id = node.userData.sceneObjectId; break; } }
    selectObject(id); canvas.setPointerCapture(event.pointerId);
    if (id) movingId = id; else { panPointer = event.pointerId; lastPan = { x:event.clientX, y:event.clientY }; }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (orbitPointer === event.pointerId && lastPan) { const dx=event.clientX-lastPan.x; const dy=event.clientY-lastPan.y; viewYaw-=dx*.008; viewElevation=clamp(viewElevation-dy*.006,.3,1.28); lastPan={x:event.clientX,y:event.clientY}; updateEditorView(); return; }
    if (movingId) { const point = groundPosition(event); const entry = entries.find((item) => item.id === movingId); if (!point || !entry) return; entry.x = Math.round(clamp(point.x, -coordinateLimit, coordinateLimit) * 2) / 2; entry.z = Math.round(clamp(point.z, -coordinateLimit, coordinateLimit) * 2) / 2; rebuildSelected(); return; }
    if (panPointer === event.pointerId && lastPan) { const rect=canvas.getBoundingClientRect(); const scale=editorViewSize*2/Math.max(rect.height,1); const dx=(event.clientX-lastPan.x)*scale; const dy=(event.clientY-lastPan.y)*scale; viewCenterX+=-dx*Math.cos(viewYaw)+dy*Math.sin(viewElevation)*Math.sin(viewYaw); viewCenterZ+=dx*Math.sin(viewYaw)+dy*Math.sin(viewElevation)*Math.cos(viewYaw); lastPan={x:event.clientX,y:event.clientY}; updateEditorView(); }
  });
  const stopPointer = () => { movingId = null; panPointer = null; orbitPointer = null; lastPan = null; }; canvas.addEventListener('pointerup', stopPointer); canvas.addEventListener('pointercancel', stopPointer); canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  $('#sceneRegion').addEventListener('change', (event) => loadRegion(event.target.value)); $('#saveWorldScene').addEventListener('click', saveRegion);
  $('#reloadWorldScene')?.addEventListener('click', () => loadRegion(currentRegion, true));
  $('#sceneRotateMode')?.addEventListener('click', (event) => { orbitMode=!orbitMode; canvas.parentElement.classList.toggle('orbit-mode',orbitMode); event.currentTarget.setAttribute('aria-pressed',String(orbitMode));event.currentTarget.classList.toggle('active',orbitMode);event.currentTarget.textContent=orbitMode?'SELESAI PUTAR ✓':'PUTAR PETA ⟳';setStatus(orbitMode?'Mode putar aktif · geser peta untuk memutar sudut pandang. Klik selesai untuk kembali memilih dan memindah objek.':`${objects.size} objek tampil. Geser peta untuk jelajah, tahan klik kanan untuk putar.` ,dirty); });
  $('#deleteWorldObject').addEventListener('click', () => { if (!selectedId) return; entries = entries.filter((item) => item.id !== selectedId); selectedId = null; dirty = true; drawObjects(); setStatus('Objek dihapus. Simpan untuk menerapkan perubahan.'); });
  const rotateSelected=(delta)=>{const entry=entries.find(item=>item.id===selectedId);if(!entry)return;entry.rotation=((entry.rotation+delta)%360+360)%360;$('#objectRotation').value=entry.rotation;rebuildSelected();};
  $('#rotateObjectLeft').addEventListener('click',()=>rotateSelected(-15));$('#rotateObjectRight').addEventListener('click',()=>rotateSelected(15));
  const numericFields = { objectX: 'x', objectZ: 'z', objectRotation: 'rotation', objectLength: 'length', objectWidth: 'width', objectScale: 'scale' };
  Object.entries(numericFields).forEach(([id, key]) => $(`#${id}`).addEventListener('input', (event) => {
    const entry = entries.find((item) => item.id === selectedId); const value = Number(event.target.value); if (!entry || !Number.isFinite(value)) return;
    if (key === 'x' || key === 'z') { entry[key] = clamp(value, -coordinateLimit, coordinateLimit); const range = $(`#${id}Range`); if (entry[key] < Number(range.min) || entry[key] > Number(range.max)) { range.min = Math.floor(entry[key] - 500); range.max = Math.ceil(entry[key] + 500); } }
    else if (key === 'length') entry[key] = clamp(value, 1, 1000);
    else if (key === 'width') entry[key] = clamp(value, .5, 16);
    else if (key === 'scale') entry[key] = clamp(value, .25, 4);
    else if (key === 'rotation') entry[key] = clamp(value, -360, 360);
    const range = $(`#${id}Range`); if (range) range.value = entry[key];
    rebuildSelected();
  }));
  Object.keys(numericFields).forEach((id) => $(`#${id}Range`).addEventListener('input', (event) => {
    const numeric = $(`#${id}`); numeric.value = event.target.value; numeric.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  ['objectXRange','objectZRange'].forEach((id) => $(`#${id}`).addEventListener('change', () => { const entry=entries.find((item)=>item.id===selectedId);if(!entry)return;const key=id==='objectXRange'?'x':'z';const range=$(`#${id}`);range.min=Math.floor(entry[key]-500);range.max=Math.ceil(entry[key]+500);range.value=entry[key]; }));
  $('#worldObjectInspector').addEventListener('keydown', (event) => event.stopPropagation());
  window.addEventListener('keydown', (event) => {
    if (!$('#adminView-world').classList.contains('active') || event.target.closest('input,select,textarea,button')) return;
    if (event.key.toLowerCase() === 'r' && selectedId) { const entry = entries.find((item) => item.id === selectedId); entry.rotation = (entry.rotation + 15) % 360; rebuildSelected(); }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) $('#deleteWorldObject').click();
  });
  let editorViewSize = 25;
  const resize = () => { const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return; const aspect = rect.width / rect.height; camera.left = -editorViewSize * aspect; camera.right = editorViewSize * aspect; camera.top = editorViewSize; camera.bottom = -editorViewSize; camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false); };
  const zoomEditor = (factor) => { editorViewSize = clamp(editorViewSize * factor, 6, 500); resize(); updateEditorView(); };
  canvas.addEventListener('wheel', (event) => { event.preventDefault(); zoomEditor(event.deltaY > 0 ? 1.15 : .87); }, { passive: false });
  $('#sceneZoomIn').addEventListener('click', () => zoomEditor(.82)); $('#sceneZoomOut').addEventListener('click', () => zoomEditor(1.22));
  new ResizeObserver(resize).observe(canvas.parentElement); window.addEventListener('resize', resize); resize(); loadRegion(currentRegion);
  window.addEventListener('semesta:admin-view-change', (event) => { if (event.detail?.view === 'world') requestAnimationFrame(() => { resize(); renderer.render(scene, camera); }); });
  const render = () => { requestAnimationFrame(render); if ($('#adminView-world').classList.contains('active')) { if (selectedId && objects.has(selectedId)) highlight.setFromObject(objects.get(selectedId)); renderer.render(scene, camera); } };
  render();
}

function initAdminNavigation() {
  const view = new URLSearchParams(location.search).get('view') || 'overview';
  window.semestaAdminNavigate?.(view, 'restore');
}

async function initObjectGallery() {
  const canvas = $('#objectGalleryCanvas');
  const grid = $('#objectGalleryGrid');
  if (!canvas || !grid) return;
  const search = $('#objectGallerySearch');
  const groupFilter = $('#objectGalleryFilter');
  const count = $('#objectGalleryCount');
  const galleryParams = new URLSearchParams(location.search); let galleryPage = Math.max(1, Number(galleryParams.get('objectPage')) || 1); const galleryPageSize = 12;
  search.value = galleryParams.get('objectQ') || ''; groupFilter.value = galleryParams.get('objectGroup') || 'all';
  const names = Object.fromEntries(WORLD_ASSET_LIBRARY);
  const groups = {
    road: 'JALAN & AIR', river: 'JALAN & AIR', bridge: 'JALAN & AIR',
    house: 'BANGUNAN', house_village: 'BANGUNAN', house_mid: 'BANGUNAN', house_luxury: 'BANGUNAN', school: 'BANGUNAN', school_ruined: 'BANGUNAN', school_good: 'BANGUNAN', mbg: 'BANGUNAN', sppg: 'BANGUNAN', kopdes: 'BANGUNAN', market: 'BANGUNAN', hall: 'BANGUNAN', office: 'BANGUNAN', dpr_mpr: 'BANGUNAN', istana_negara: 'BANGUNAN',
    rice_field: 'PERTANIAN', crop_field: 'PERTANIAN', tractor: 'KENDARAAN', hand_tractor: 'KENDARAAN', combine_harvester: 'KENDARAAN',
    car: 'KENDARAAN', car_economy: 'KENDARAAN', car_family: 'KENDARAAN', car_luxury: 'KENDARAAN', pickup: 'KENDARAAN', truck: 'KENDARAAN', bus: 'KENDARAAN', motorcycle: 'KENDARAAN',
    tree: 'ALAM & HEWAN', tree_canopy: 'ALAM & HEWAN', forest: 'ALAM & HEWAN', forest_lush: 'ALAM & HEWAN', forest_burned: 'ALAM & HEWAN', chicken: 'ALAM & HEWAN', duck: 'ALAM & HEWAN', goat: 'ALAM & HEWAN', cow: 'ALAM & HEWAN', buffalo: 'ALAM & HEWAN', cat: 'ALAM & HEWAN', dog: 'ALAM & HEWAN', lamp: 'PROPERTI',
  };
  let THREE;
  try {
    await preloadWorldAssets();
    THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(240, 150, false);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dce7d3');
    scene.add(new THREE.HemisphereLight('#fff8e8', '#66775e', 2.2));
    const key = new THREE.DirectionalLight('#fff2d3', 2.8); key.position.set(4, 8, 5); scene.add(key);
    const fill = new THREE.DirectionalLight('#c6e0f2', 1.1); fill.position.set(-5, 3, -4); scene.add(fill);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshStandardMaterial({ color: '#b4c89c', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.04; scene.add(ground);
    const camera = new THREE.PerspectiveCamera(34, 240 / 150, .1, 100);
    let activeModel = null; let activeType = null;
    const fitModel = (model) => {
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3()); const center = bounds.getCenter(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z, .1);
      model.scale.setScalar(2.65 / maxSize);
      model.position.set(-center.x * model.scale.x, -bounds.min.y * model.scale.y, -center.z * model.scale.z);
      model.updateMatrixWorld(true);
      camera.position.set(4.2, 3.1, 5.2); camera.lookAt(0, .85, 0); camera.updateProjectionMatrix();
    };
    const disposeModel = (model) => model.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => { material?.map?.dispose(); material?.dispose(); });
    });
    const drawModel = (type) => {
      if (activeModel) { scene.remove(activeModel); disposeModel(activeModel); }
      activeType = type;
      activeModel = createWorldAsset(THREE, type);
      fitModel(activeModel); scene.add(activeModel); renderer.render(scene, camera);
    };
    const catalogue = WORLD_ASSET_LIBRARY.map(([type, name]) => ({ type, name, group: groups[type] || 'PROPERTI' }));
    const thumbnails = new Map();
    for (const item of catalogue) {
      drawModel(item.type);
      thumbnails.set(item.type, canvas.toDataURL('image/jpeg', .78));
    }
    function renderCards(filter = '') {
      const query = filter.trim().toLocaleLowerCase('id-ID');
      const filtered = catalogue.filter((item) => `${item.name} ${item.type} ${item.group}`.toLocaleLowerCase('id-ID').includes(query) && (groupFilter.value === 'all' || item.group === groupFilter.value));
      const pages = Math.max(1, Math.ceil(filtered.length / galleryPageSize)); galleryPage = Math.min(galleryPage, pages); const visible = filtered.slice((galleryPage - 1) * galleryPageSize, galleryPage * galleryPageSize);
      count.textContent = `${filtered.length} OBJECT${filtered.length === 1 ? '' : 'S'}`; $('#objectGalleryPage').textContent = `Halaman ${galleryPage} dari ${pages}`; $('#objectGalleryPrev').disabled = galleryPage <= 1; $('#objectGalleryNext').disabled = galleryPage >= pages;
      grid.innerHTML = visible.length ? visible.map((item) => `<button class="object-gallery-item${item.type === activeType ? ' selected' : ''}" type="button" data-object-type="${item.type}" aria-pressed="${item.type === activeType}"><img src="${thumbnails.get(item.type)}" alt=""><span class="object-gallery-item-copy"><small>${item.group}</small><b>${item.name}</b><code>${item.type}</code></span></button>`).join('') : '<p class="object-gallery-empty">Tidak ada object yang cocok.</p>';
      grid.querySelectorAll('[data-object-type]').forEach((button) => button.addEventListener('click', () => {
        drawModel(button.dataset.objectType);
        $('#objectPreviewName').textContent = names[activeType] || activeType;
        $('#objectPreviewType').textContent = `${groups[activeType] || 'PROPERTI'} · ${activeType.toUpperCase()}`;
        $('#objectPreviewHint').textContent = 'Seret untuk memutar · scroll untuk zoom';
        renderCards(search.value);
      }));
    }
    const first = catalogue[0];
    drawModel(first.type);
    renderCards(search.value);
    $('#objectPreviewName').textContent = first.name;
    $('#objectPreviewType').textContent = `${first.group} · ${first.type.toUpperCase()}`;
    $('#objectPreviewHint').textContent = 'Seret untuk memutar · scroll untuk zoom';
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
      if (activeModel) renderer.render(scene, camera);
    };
    new ResizeObserver(resize).observe(canvas.parentElement);
    window.addEventListener('resize', resize);
    let pointer = null; let yaw = 0; let distance = 7;
    const moveCamera = () => { camera.position.set(Math.sin(yaw) * distance, 3.1, Math.cos(yaw) * distance); camera.lookAt(0, .85, 0); renderer.render(scene, camera); };
    canvas.addEventListener('pointerdown', (event) => { pointer = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', (event) => { if (!pointer) return; yaw += (event.clientX - pointer.x) * .009; pointer = { x: event.clientX, y: event.clientY }; moveCamera(); });
    canvas.addEventListener('pointerup', () => { pointer = null; }); canvas.addEventListener('pointercancel', () => { pointer = null; });
    canvas.addEventListener('wheel', (event) => { event.preventDefault(); distance = clamp(distance + event.deltaY * .009, 4.2, 13); moveCamera(); }, { passive: false });
    const syncGalleryUrl=()=>updateAdminQuery({objectQ:search.value.trim(),objectGroup:groupFilter.value,objectPage:galleryPage});
    search.addEventListener('input', () => { galleryPage=1; renderCards(search.value); syncGalleryUrl(); });
    groupFilter.addEventListener('change',()=>{galleryPage=1;renderCards(search.value);syncGalleryUrl();});
    $('#objectGalleryPrev').addEventListener('click',()=>{if(galleryPage>1){galleryPage--;renderCards(search.value);syncGalleryUrl();}});$('#objectGalleryNext').addEventListener('click',()=>{galleryPage++;renderCards(search.value);syncGalleryUrl();});
    resize();
    const animate = () => { requestAnimationFrame(animate); if ($('#adminView-objects').classList.contains('active') && activeModel && !pointer) { activeModel.rotation.y += .002; renderer.render(scene, camera); } };
    animate();
  } catch (error) {
    const fallbackCatalog = WORLD_ASSET_LIBRARY.map(([type, name]) => ({ type, name, group: groups[type] || 'PROPERTI' }));
    const renderFallback = () => {
      const query = search.value.trim().toLocaleLowerCase('id-ID'); const filtered = fallbackCatalog.filter((item) => `${item.name} ${item.type} ${item.group}`.toLocaleLowerCase('id-ID').includes(query) && (groupFilter.value === 'all' || item.group === groupFilter.value));
      const pageCount = Math.max(1, Math.ceil(filtered.length / galleryPageSize)); galleryPage = Math.min(galleryPage, pageCount); const visible = filtered.slice((galleryPage - 1) * galleryPageSize, galleryPage * galleryPageSize);
      count.textContent = `PRATINJAU 3D TIDAK TERSEDIA · ${filtered.length} OBJECT`; $('#objectGalleryPage').textContent = `Halaman ${galleryPage} dari ${pageCount}`; $('#objectGalleryPrev').disabled = galleryPage <= 1; $('#objectGalleryNext').disabled = galleryPage >= pageCount;
      grid.replaceChildren(...visible.map((item) => { const button = document.createElement('button'); button.className = 'object-gallery-item'; button.type = 'button'; const icon = document.createElement('span'); icon.className = 'object-gallery-fallback'; icon.textContent = '◇'; const copy = document.createElement('span'); copy.className = 'object-gallery-item-copy'; const type = document.createElement('small'); type.textContent = item.group; const name = document.createElement('b'); name.textContent = item.name; copy.append(type, name); button.append(icon, copy); button.addEventListener('click', () => { $('#objectPreviewName').textContent = item.name; $('#objectPreviewType').textContent = `${item.group} · ${item.type.toUpperCase()}`; }); return button; }));
      if (!visible.length) { const empty = document.createElement('p'); empty.className = 'object-gallery-empty'; empty.textContent = 'Tidak ada object yang cocok.'; grid.append(empty); }
    };
    const syncFallbackUrl = () => updateAdminQuery({ objectQ: search.value.trim(), objectGroup: groupFilter.value, objectPage: galleryPage });
    search.addEventListener('input', () => { galleryPage=1;renderFallback();syncFallbackUrl(); }); groupFilter.addEventListener('change', () => { galleryPage=1;renderFallback();syncFallbackUrl(); });
    $('#objectGalleryPrev').addEventListener('click', () => { if(galleryPage>1){galleryPage--;renderFallback();syncFallbackUrl();} }); $('#objectGalleryNext').addEventListener('click', () => { galleryPage++;renderFallback();syncFallbackUrl(); }); renderFallback();
    console.error('Galeri object:', error);
  }
}

function initSharedWorldAdmin() {
  const host=document.querySelector('#adminSharedWorld');if(!host)return;
  let mounting=false,instance=null,disposed=false;
  const open=async()=>{
    if(disposed||mounting||!document.querySelector('#adminView-shared-world')?.classList.contains('active'))return;
    if(instance){void instance.load();return;}
    mounting=true;
    try{const {mountAdminWorldState}=await import('./admin-world-state.js');if(!disposed)instance=mountAdminWorldState(host,{apiUrl:API_URL});}
    catch(error){if(!disposed)host.textContent=`Dunia bersama belum dapat dibuka: ${error.message}. Buka kembali menu untuk mencoba lagi.`;}
    finally{mounting=false;}
  };
  window.addEventListener('semesta:admin-view-change',open);void open();
  window.addEventListener('pagehide',event=>{if(!event.persisted){disposed=true;instance?.dispose();window.removeEventListener('semesta:admin-view-change',open);}});
}

function initProductionStudio() {
  const host=document.querySelector('#adminProductionStudio');if(!host)return;
  let mounting=false,instance=null;
  const open=async()=>{
    if(mounting||instance||!document.querySelector('#adminView-production')?.classList.contains('active'))return;
    mounting=true;host.textContent='Membuka studio produksi…';
    try{const {mountProductionStudio}=await import('./production-studio.js');instance=mountProductionStudio(host);}
    catch(error){host.textContent=`Studio belum dapat dibuka: ${error.message}. Muat ulang untuk mencoba lagi.`;}
    finally{mounting=false;}
  };
  window.addEventListener('semesta:admin-view-change',open);void open();
  window.addEventListener('pagehide',event=>{if(!event.persisted){instance?.dispose();window.removeEventListener('semesta:admin-view-change',open);}});
}

async function initAvatarStudio() {
  return mountAvatarStudio(document.querySelector('#adminView-avatars'), API_URL);
}


// Only the authenticated admin template loads this entry.
if(document.body.classList.contains('admin-body')){
  initAdminNavigation();initSharedWorldAdmin();initProductionStudio();initAvatarStudio();initWorldEditor();initObjectGallery();initIdeasInbox();initCitizenDirectory();initVisitorLogs();initMailSettings();
}
