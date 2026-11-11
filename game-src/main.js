import { createWorldAsset, getDefaultWorldScene, preloadWorldAssets, WORLD_ASSET_LIBRARY } from './world-assets-3d-v2.js?v=map-asset-3d-hotfix-20261104-4';
import { createHumanModel, hasHumanAsset, hasFarmerAsset, setHumanAsset, setFarmerAsset } from './avatar-character-3d.js?v=avatar-model-20261109-v5';
import { inspectCharacterAsset, formatCharacterAssetSummary } from './character-asset-validator.js?v=character-validation-20261104-1';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FARMER_PRESET, FARMER_SCHEMA, farmerCharacterOptions, mountFarmerEditor } from './avatar-farmer-config.js';
import { isFarmerV8 } from './avatar-farmer-v8.js';
import { FARMER_PRESETS, FARMER_COLLECTIONS } from './avatar-farmer-presets.js';
import { createAvatarThumbnails } from './avatar-catalog-thumbnails.js';
import { createStudioClock, createStudioAnimation } from './avatar-studio-playback.js';

const $ = (selector) => document.querySelector(selector);
const API_URL = window.SEMESTA_API_URL || new URL('api', document.baseURI).href;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isTypingTarget = (target) => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
const GAME_STATE_KEY = 'republik-wkwkwk-state-v2';
const avatarEmojis = { warga:'🙂',petani:'👩🏽‍🌾',pelajar:'🧑🏻‍🎓',pedagang:'🧑🏽‍🍳',guru:'👩🏻‍🏫','tenaga-kesehatan':'🧑🏻‍⚕️',asn:'🧑🏻‍💼',tni:'🪖',polri:'👮','nelayan':'🛶','pekerja-konstruksi':'👷','pengemudi':'🚗',koki:'🧑🏻‍🍳',relawan:'🦺','penjaga-hutan':'🌳' };
const avatarLooks = {
  warga:{shirt:'#eee5cf',pack:'#be604a',topStyle:'kemeja',bottomStyle:'celana',accessory:'ransel',emoji:avatarEmojis.warga},petani:{shirt:'#455f82',headwear:'caping',topStyle:'flanel',bottomStyle:'cargo',accessory:'tas-anyaman',facialHair:'kumis-janggut',emoji:avatarEmojis.petani},pelajar:{shirt:'#d8e2ed',pack:'#7b638e',topStyle:'seragam',bottomStyle:'celana',accessory:'ransel',emoji:avatarEmojis.pelajar},pedagang:{shirt:'#e4c6b9',pack:'#547e6a',apron:'#d89c42',topStyle:'rompi',bottomStyle:'kulot',accessory:'selempang',emoji:avatarEmojis.pedagang},
  guru:{shirt:'#6c7895',pack:'#b1844c',headwear:'peci',topStyle:'koko',bottomStyle:'celana',accessory:'map',emoji:avatarEmojis.guru},'tenaga-kesehatan':{shirt:'#e7eee8',pack:'#55a79b',topStyle:'seragam',bottomStyle:'celana',accessory:'lencana',emoji:avatarEmojis['tenaga-kesehatan']},asn:{shirt:'#a8544b',pack:'#283a51',topStyle:'kemeja',bottomStyle:'celana',accessory:'map',emoji:avatarEmojis.asn},tni:{shirt:'#65714d',pack:'#424b36',headwear:'topi',topStyle:'seragam',bottomStyle:'celana',accessory:'lencana',emoji:avatarEmojis.tni},polri:{shirt:'#283f68',pack:'#d1ac51',headwear:'topi',topStyle:'seragam',bottomStyle:'celana',accessory:'lencana',emoji:avatarEmojis.polri},nelayan:{shirt:'#5b93a8',pack:'#ce6948',headwear:'topi',topStyle:'jaket',bottomStyle:'celana',accessory:'ransel',emoji:avatarEmojis.nelayan},'pekerja-konstruksi':{shirt:'#e2a33c',pack:'#687b48',headwear:'helm',topStyle:'pekerja',bottomStyle:'celana',accessory:'ransel',emoji:avatarEmojis['pekerja-konstruksi']},pengemudi:{shirt:'#426e73',pack:'#303c4a',topStyle:'kemeja',bottomStyle:'celana',accessory:'ransel',emoji:avatarEmojis.pengemudi},koki:{shirt:'#eee6d5',pack:'#bd6952',headwear:'bandana',apron:'#fff6df',topStyle:'kemeja',bottomStyle:'celana',accessory:'syal',emoji:avatarEmojis.koki},relawan:{shirt:'#478269',pack:'#cf9a49',headwear:'bandana',topStyle:'rompi',bottomStyle:'celana',accessory:'lencana',emoji:avatarEmojis.relawan},'penjaga-hutan':{shirt:'#4d6748',pack:'#856d47',headwear:'topi',topStyle:'jaket',bottomStyle:'celana',accessory:'ransel',emoji:avatarEmojis['penjaga-hutan']}
};
const avatarColors = {
  skin:{sawo:'#c9825c',kuning:'#e0a477',gelap:'#75472f',zaitun:'#ad7052',pucat:'#f0c29b',coklat:'#985c3e'},
  hair:{hitam:'#292522',coklat:'#51362d','coklat-tua':'#35251f',pirang:'#bd8c49',uban:'#aaa9a2',merah:'#74382d'},
  top:{kemeja:'#e6e0cd',flanel:'#455f82',batik:'#a34c3e',seragam:'#527aa3',jaket:'#537a64',hoodie:'#617b91',jas:'#44566b',kaos:'#d99445',kebaya:'#b66c78',petani:'#77844d',pekerja:'#dfae40',koko:'#e9e4d7',rompi:'#3a827b'},
  bottom:{celana:'#314256',jeans:'#41658b',cargo:'#586746',sarung:'#9c674f',rok:'#563e54',pendek:'#536a52',kulot:'#705b52'},
};
function parsedAvatarConfig(value) {
  if (value && typeof value === 'object') return value;
  try { return value ? JSON.parse(value) : null; } catch (_) { return null; }
}
function citizenCharacterOptions(citizen, fallbackLook) {
  const config = parsedAvatarConfig(citizen?.avatar_config);
  if (config?.special === 'farmer-ps2') return farmerCharacterOptions(config, avatarColors);
  if (!config) return { shirt:fallbackLook.shirt, trousers:'#35485a', pack:fallbackLook.pack, apron:fallbackLook.apron, topStyle:fallbackLook.topStyle, bottomStyle:fallbackLook.bottomStyle, accessory:fallbackLook.accessory, headwear:fallbackLook.headwear, facialHair:fallbackLook.facialHair, hairStyle:'pendek', hair:'#302824', skin:'#d99770' };
  return {
    skin:avatarColors.skin[config.skin] || '#c9825c', hair:avatarColors.hair[config.hairColor] || '#292522', hairStyle:config.hair || 'pendek',
    shirt:avatarColors.top[config.top] || '#e6e0cd', trousers:avatarColors.bottom[config.bottom] || '#314256',
    topStyle:config.top || 'kemeja', bottomStyle:config.bottom || 'celana', headwear:config.headwear || 'tanpa', accessory:config.accessory || 'tanpa', facialHair:config.facialHair || 'tanpa',
    pack:config.accessory === 'ransel' ? '#9d6948' : null, showBackpack:config.accessory === 'ransel',
    ps2Farmer:config.special === 'farmer-ps2',
  };
}
const houseNames = { 'rumah-kayu': 'Rumah Kayu', 'rumah-bata': 'Rumah Bata', 'rumah-panggung': 'Rumah Panggung' };
function updateAdminQuery(values) {
  if (!document.body.classList.contains('admin-body')) return;
  const url = new URL(location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined || value === 'all' || value === 1 || value === '1') url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  });
  history.replaceState(history.state, '', url);
}
let activeCitizen = null;
let updateCitizenHeader = () => {};
let authMode = 'login';
function reportWorldIssue(error) {
  const panel = $('#worldError');
  if (!panel) return;
  const detail = error instanceof Error ? error.message : String(error || 'Kesalahan tidak diketahui');
  panel.querySelector('[data-error-detail]').textContent = detail;
  panel.classList.add('visible');
}
window.addEventListener('error', (event) => {
  if ($('#exploreScreen')?.classList.contains('active')) reportWorldIssue(event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  if ($('#exploreScreen')?.classList.contains('active')) reportWorldIssue(event.reason);
});
function readGameState() {
  try { return JSON.parse(localStorage.getItem(GAME_STATE_KEY) || '{}'); } catch { return {}; }
}
function saveGameState(patch) {
  try { localStorage.setItem(GAME_STATE_KEY, JSON.stringify({ ...readGameState(), ...patch, savedAt: Date.now() })); } catch { /* Keep the current play session usable if storage is unavailable. */ }
}
const destinationInfo = {
  jakarta: { id: 'jakarta', name: 'Jakarta', country: 'INDONESIA · PULAU JAWA', coordinates: '06°12′ S · 106°49′ E', icon: '🏙️', desc: 'Kota padat dengan banyak cerita tentang layanan publik, biaya hidup, dan ruang bersama.', note: 'Warga mengusulkan: cerita dimulai dari urusan yang paling terasa di rumah.', x: 40, y: 72, intro: 'Kawasan rekaan yang terinspirasi kehidupan warga Jakarta dan sekitarnya.' },
  bandung: { id: 'bandung', name: 'Bandung', country: 'INDONESIA · JAWA BARAT', coordinates: '06°55′ S · 107°36′ E', icon: '⛰️', desc: 'Kota dan wilayah sekitarnya punya cerita soal pendidikan, pekerjaan, dan mobilitas warga.', note: 'Suara warga menentukan isu dan sudut pandang episode berikutnya.', x: 44, y: 75, intro: 'Kawasan rekaan yang terinspirasi keseharian warga Jawa Barat.' },
  semarang: { id: 'semarang', name: 'Semarang', country: 'INDONESIA · JAWA TENGAH', coordinates: '06°59′ S · 110°25′ E', icon: '🌊', desc: 'Cerita warga pesisir dan perkotaan bertemu dalam urusan layanan, lingkungan, dan ekonomi.', note: 'Isu yang diangkat bisa berubah mengikuti masukan warga.', x: 49, y: 71, intro: 'Kawasan rekaan yang terinspirasi keseharian warga Jawa Tengah.' },
  surabaya: { id: 'surabaya', name: 'Surabaya', country: 'INDONESIA · JAWA TIMUR', coordinates: '07°15′ S · 112°45′ E', icon: '🌇', desc: 'Kota besar dengan kehidupan kampung, pasar, sekolah, dan layanan publik.', note: 'Warga memilih cerita lokal yang terasa penting bagi mereka.', x: 55, y: 73, intro: 'Kawasan rekaan yang terinspirasi keseharian warga Jawa Timur.' },
  makassar: { id: 'makassar', name: 'Makassar', country: 'INDONESIA · SULAWESI SELATAN', coordinates: '05°08′ S · 119°25′ E', icon: '⛵', desc: 'Kehidupan kota, pesisir, dan jalur ekonomi memberi banyak sudut pandang warga.', note: 'Cerita berikutnya terbuka untuk usulan dan pengalaman warga.', x: 66, y: 56, intro: 'Kawasan rekaan yang terinspirasi keseharian warga Sulawesi Selatan.' },
};
const locations = {
  sekolah: { name: 'Sekolah Rusak', emoji: '🏫', tag: 'FASILITAS UMUM · PENDIDIKAN', desc: 'Sekolah warga yang butuh perhatian. Atapnya punya lebih banyak lubang daripada jadwal libur.', title: 'Bel Sekolah Minta Diperbaiki', hook: 'Bel sekolah berbunyi sendiri setiap kali hujan mulai turun.', witness: 'PAK GURU', type: 'sekolah', colors: ['#d97a5c', '#d8b46b', '#82a16c'] },
  dapur: { name: 'Dapur MBG', emoji: '🍱', tag: 'CERITA HARIAN · MBG', desc: 'Dapur sekolah yang ramai. Sendok sayurnya punya agenda sendiri.', title: 'Sendok Sayur Mengundurkan Diri', hook: 'Pagi ini sendok sayur pamit. Katanya capek mengaduk semuanya.', witness: 'BU NINING', type: 'dapur', colors: ['#f4d275', '#e98d67', '#87ad69'] },
  kopdes: { name: 'Kopdes Merah Putih', emoji: '🏪', tag: 'CERITA HARIAN · KOPDES', desc: 'Toko desa, ruang rapat, dan gudang beras. Semua punya kunci, kecuali lemari kuncinya.', title: 'Timbangan Minta Jadi Bendahara', hook: 'Timbangan di Kopdes menolak menimbang. Katanya mau menghitung kas saja.', witness: 'PAK DARTO', type: 'kopdes', colors: ['#88a872', '#d9a95d', '#93b6a1'] },
  pasar: { name: 'Pasar Sore', emoji: '🥬', tag: 'CERITA HARIAN · PASAR', desc: 'Lapak sayur, kios bumbu, dan satu cabai yang merasa dirinya selebritas.', title: 'Cabai Merah Minta Pengawalan', hook: 'Satu cabai hilang dari lapak. Ada yang melihatnya naik becak.', witness: 'MBAK SARI', type: 'pasar', colors: ['#e98d67', '#e7bf65', '#8aad71'] },
  kampung: { name: 'Permukiman Warga', emoji: '🏠', tag: 'KEHIDUPAN WARGA · PERMUKIMAN', desc: 'Gang, rumah, halaman bersama, dan kebutuhan dasar yang dirasakan warga setiap hari.', title: 'Jemuran Punya Grup Arisan', hook: 'Baju-baju di jemuran pindah sendiri. Ternyata mereka sedang rapat.', witness: 'BU MINAH', type: 'kampung', colors: ['#89ad72', '#d7a66c', '#83b3a1'] },
  hutan: { name: 'Hutan Kota', emoji: '🌳', tag: 'CERITA HARIAN · ALAM', desc: 'Tempat ngadem, jalan pagi, dan bertanya pada pohon yang tidak menjawab.', title: 'Pohon Beringin Mau Pindah RT', hook: 'Pohon tua mengajukan surat pindah. Alasannya: terlalu sering jadi tempat curhat.', witness: 'JURU KEBUN', type: 'hutan', colors: ['#79a86f', '#8dbf84', '#b8a766'] },
  kebun: { name: 'Kebun Cempluk', emoji: '🌱', tag: 'KEGIATAN HARIAN · BERKEBUN', desc: 'Kebun kecil di belakang rumah. Tomat, cabai, dan tetangga yang suka ikut menyiram.', title: 'Tomat Minta Jadwal Libur', hook: 'Tomatnya merah semua. Katanya capek dipetik sebelum sempat pamer.', witness: 'CEMPLUK', type: 'kebun', colors: ['#83a86e', '#c9895f', '#a6c083'] },
};

function locationFor(cityId, locationId) {
  return locations[locationId];
}

async function initCitizen() {
  const panel = $('#citizenPanel');
  const profileFieldNames = { gender:'gender', religion:'religion', birthProvince:'birth_province', birthCity:'birth_city', birthDate:'birth_date', occupation:'occupation', educationLevel:'education_level', domicileProvince:'domicile_province', domicileCity:'domicile_city' };
  const profileFields = $('#citizenProfileFields');
  const fillMasterSelect = (name, options) => {
    const select = $('#citizenForm').elements[name]; if (!select) return;
    const current = select.value; select.replaceChildren(new Option('Pilih jika ingin mengisi', ''));
    (options || []).forEach((option) => select.add(new Option(option.label, option.value)));
    if (current) select.value = current;
  };
  const fillProfileForm = (citizen) => {
    for (const [field, column] of Object.entries(profileFieldNames)) $('#citizenForm').elements[field].value = citizen?.[column] || '';
    $('#citizenForm').elements.avatar.value = citizen?.avatar || 'warga';
  };
  const updateHeader = updateCitizenHeader = (citizen) => {
    activeCitizen = citizen;
    document.body.classList.toggle('has-citizen', !!citizen);
    $('#headerAvatar').textContent = citizen ? (citizen.display_name?.trim()?.[0]?.toUpperCase() || 'W') : '↗';
    $('#headerCitizenName').textContent = citizen ? citizen.display_name : 'MASUK / DAFTAR WARGA';
    $('#mapAvatar').querySelector('b').textContent = citizen ? (citizen.display_name?.trim()?.[0]?.toUpperCase() || 'W') : '';
    $('#mapAvatar').querySelector('span').textContent = citizen ? citizen.display_name.toUpperCase() : '';
    $('#worldCitizenStatus').textContent = citizen ? `${citizen.display_name.toUpperCase()} · ${citizen.account_type === 'admin' ? 'ADMIN' : 'WARGA'} AKTIF` : 'TAMU · PETA TERBUKA';
    const home = $('#citizenHome');
    if (home) home.textContent = citizen ? `🏠 ${houseNames[citizen.house] || 'Rumah Warga'} · ${citizen.display_name}` : '';
    window.dispatchEvent(new CustomEvent('semesta:citizen-change', { detail: { citizen } }));
  };
  const showPanel = () => {
    panel.hidden = false;
    const loggedIn = !!activeCitizen;
    $('#citizenPanelTitle').textContent = loggedIn ? (activeCitizen.account_type === 'admin' ? 'Profil karakter admin' : 'Profil warga') : (authMode === 'login' ? 'Masuk sebagai warga' : 'Daftar warga');
    $('#citizenForm').elements.username.value = loggedIn ? (activeCitizen.username || '') : '';
    $('#citizenForm').elements.username.closest('label').hidden = loggedIn;
    $('#citizenForm').elements.username.required = !loggedIn;
    $('#citizenForm').elements.email.closest('label').hidden = loggedIn || authMode === 'login';
    $('#citizenForm').elements.email.required = !loggedIn && authMode === 'register';
    $('#citizenForm').elements.verificationEmail.value = '';
    $('#citizenForm').elements.verificationEmail.closest('label').hidden = true;
    $('#citizenForm').elements.password.closest('label').hidden = loggedIn;
    $('#citizenForm').elements.password.required = !loggedIn;
    $('#citizenLogout').hidden = !loggedIn;
    $('#verificationResend').hidden = loggedIn || authMode !== 'login';
    document.querySelectorAll('.citizen-tabs').forEach((el) => el.hidden = loggedIn);
    document.querySelectorAll('.register-only').forEach((el) => el.hidden = loggedIn || authMode === 'login');
    if (profileFields) profileFields.hidden = !loggedIn && authMode === 'login';
    $('#citizenForm').elements.displayName.required = !loggedIn && authMode === 'register';
    if (loggedIn) {
      $('#citizenForm').elements.displayName.value = activeCitizen.display_name;
      $('#citizenForm').elements.house.value = activeCitizen.house;
      fillProfileForm(activeCitizen);
      $('#citizenSubmit').textContent = 'SIMPAN PROFIL WARGA ↗';
    } else $('#citizenSubmit').textContent = authMode === 'register' ? 'BUAT AKUN WARGA ↗' : 'MASUK KE REPUBLIK ↗';
  };
  $('#profileButton').addEventListener('click', showPanel);
  $('#closeCitizenPanel').addEventListener('click', () => { panel.hidden = true; });
  document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => {
    authMode = button.dataset.authMode;
    document.querySelectorAll('[data-auth-mode]').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.register-only').forEach((el) => el.hidden = authMode === 'login');
    if (profileFields) profileFields.hidden = authMode === 'login';
    $('#citizenForm').elements.username.required = true;
    $('#citizenForm').elements.email.required = authMode === 'register';
    $('#citizenForm').elements.displayName.required = authMode === 'register';
    $('#verificationResend').hidden = authMode !== 'login';
    $('#citizenPanelTitle').textContent = authMode === 'login' ? 'Masuk sebagai warga' : 'Gabung jadi warga';
    $('#citizenSubmit').textContent = authMode === 'login' ? 'MASUK KE REPUBLIK ↗' : 'BUAT AKUN WARGA ↗';
    $('#citizenError').textContent = '';
    $('#citizenError').classList.remove('success');
  }));
  $('#citizenForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = activeCitizen ? 'update' : authMode;
    const payload = { resource: 'citizen', action, username: form.get('username'), email: form.get('email'), password: form.get('password'), displayName: form.get('displayName'), avatar: form.get('avatar') || activeCitizen?.avatar, house: form.get('house') || activeCitizen?.house };
    for (const field of Object.keys(profileFieldNames)) payload[field] = form.get(field) || '';
    $('#citizenError').textContent = '';
    try {
      const response = await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Profil warga belum bisa disimpan.');
      if (result.verificationRequired) {
        document.querySelector('[data-auth-mode=login]').click();
        $('#citizenError').classList.add('success');
        $('#citizenError').textContent = result.message;
        return;
      }
      if (result.citizen) {
        $('#citizenError').classList.remove('success');
        updateHeader(result.citizen);
        saveGameState({ citizen: { displayName: result.citizen.display_name, avatar: result.citizen.avatar, house: result.citizen.house } });
      }
      panel.hidden = true;
    } catch (error) { $('#citizenError').classList.remove('success'); $('#citizenError').textContent = error.message; if (authMode === 'login' && error.message.includes('belum diverifikasi')) $('#verificationResend').hidden = false; }
  });
  $('#verificationResend').addEventListener('click', async () => {
    const verificationEmail = $('#citizenForm').elements.verificationEmail;
    const email = verificationEmail.value.trim();
    if (!email) { verificationEmail.closest('label').hidden = false; verificationEmail.focus(); return; }
    try { const response = await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ resource: 'citizen', action: 'resend', email }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Gagal mengirim email.'); $('#citizenError').classList.add('success'); $('#citizenError').textContent = result.message || 'Tautan verifikasi dikirim.'; } catch (error) { $('#citizenError').classList.remove('success'); $('#citizenError').textContent = error.message; }
  });
  $('#citizenLogout').addEventListener('click', async () => {
    await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'citizen', action: 'logout' }) });
    updateHeader(null); panel.hidden = true;
    $('#exploreScreen').classList.remove('active'); document.body.classList.remove('exploring'); $('#cityScreen').classList.remove('active'); $('#worldScreen').classList.add('active');
    saveGameState({ screen: 'world' });
  });
  $('#citizenForm').elements.occupation.addEventListener('change', (event) => {
    const selected = (window.citizenMasterOptions?.occupation || []).find((option) => option.value === event.target.value);
    if (selected?.avatarStyle) $('#citizenAvatarSelect').value = selected.avatarStyle;
    $('#citizenAvatarHint').textContent = selected?.avatarStyle ? 'Avatar disarankan mengikuti pekerjaan. Anda tetap dapat memilih gaya lain.' : 'Pekerjaan belum dipilih; avatar dapat ditentukan sendiri.';
  });
  try {
    const masterResponse = await fetch(`${API_URL}?resource=citizen_options`, { headers: { Accept: 'application/json' } });
    const masterResult = await masterResponse.json(); if (!masterResponse.ok) throw new Error(masterResult.error || 'Pilihan biodata belum tersedia.');
    const options = masterResult.options || {}; window.citizenMasterOptions = options;
    fillMasterSelect('gender', options.gender); fillMasterSelect('religion', options.religion); fillMasterSelect('birthProvince', options.province); fillMasterSelect('domicileProvince', options.province); fillMasterSelect('occupation', options.occupation); fillMasterSelect('educationLevel', options.education);
    const avatarSelect = $('#citizenAvatarSelect'); const savedAvatar = avatarSelect.value;
    avatarSelect.replaceChildren(...(options.avatar || []).map((option) => new Option(option.label, option.value)));
    avatarSelect.value = savedAvatar || activeCitizen?.avatar || 'warga';
    if (activeCitizen && !profileFields.hidden) fillProfileForm(activeCitizen);
  } catch (error) { $('#citizenError').textContent = error.message; }
  try {
    const response = await fetch(`${API_URL}?resource=citizen`, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    updateHeader(result.citizen || null);
  } catch (_) { updateHeader(null); }
}

function initExploreAvatarCustomizer() {
  const panel = $('#avatarCustomizer'); const form = $('#exploreAvatarForm'); const status = $('#exploreAvatarStatus');
  if (!panel || !form) return;
  let selectedSpecial = '';
  const legacyKeys = ['skin','hair','hairColor','top','bottom','headwear','accessory','facialHair'];
  const farmerEditor = mountFarmerEditor(form, () => { status.textContent='Racikan V11 diubah. Simpan untuk menerapkannya di peta.'; });
  const modelLabel = document.createElement('label'); modelLabel.textContent='Model avatar';
  const modelSelect = document.createElement('select'); modelSelect.add(new Option('Avatar modular lama','')); modelSelect.add(new Option('Avatar V11','farmer-ps2'));
  modelLabel.append(modelSelect); form.prepend(modelLabel);
  const readyLabel=document.createElement('label');readyLabel.className='ready-avatar-field';readyLabel.textContent='Avatar siap pakai · V11';
  const readySelect=document.createElement('select');readySelect.add(new Option('Pilih gaya awal…',''));
  FARMER_PRESETS.forEach(preset=>readySelect.add(new Option(preset.name,preset.id)));readyLabel.append(readySelect);modelLabel.after(readyLabel);
  readySelect.addEventListener('change',()=>{
    const preset=FARMER_PRESETS.find(item=>item.id===readySelect.value);if(!preset)return;
    legacyKeys.forEach(key=>{form.elements[key].value=preset.config[key];});
    selectedSpecial='farmer-ps2';farmerEditor.set(preset.config);showModel();
    status.textContent=`${preset.name} dipilih. Kamu masih bisa mengubah setiap bagian sebelum menyimpan.`;
  });
  const showModel = () => {
    modelSelect.value=selectedSpecial; farmerEditor.show(selectedSpecial==='farmer-ps2');
    legacyKeys.forEach(key => { form.elements[key].closest('label').hidden=!!selectedSpecial; form.elements[key].disabled=!!selectedSpecial; });
  };
  modelSelect.addEventListener('change', () => { selectedSpecial=modelSelect.value; showModel(); });
  const fill = () => {
    readySelect.value='';
    const saved = parsedAvatarConfig(activeCitizen?.avatar_config) || {};
    selectedSpecial = saved.special === 'farmer-ps2' ? 'farmer-ps2' : '';
    const look = avatarLooks[activeCitizen?.avatar] || avatarLooks.warga;
    const defaults = { skin:'sawo', hair:'pendek', hairColor:'hitam', top:look.topStyle || 'kemeja', bottom:look.bottomStyle || 'celana', headwear:look.headwear || 'tanpa', accessory:look.accessory || 'tanpa', facialHair:look.facialHair || 'tanpa' };
    Object.keys(defaults).forEach((key) => { form.elements[key].value = saved[key] || defaults[key]; });
    farmerEditor.set(saved.special ? saved : FARMER_PRESET, avatarColors); showModel();
    $('#customAvatarName').textContent = activeCitizen?.display_name || 'Warga';
  };
  $('#openAvatarCustomizer').addEventListener('click', () => {
    if (!activeCitizen) { $('#profileButton').click(); return; }
    fill(); status.textContent=selectedSpecial ? 'Avatar V11 aktif. Postur, wajah, dan pakaian bisa diganti tanpa berganti model.' : 'Pilih Avatar V11 untuk memakai tubuh dan pakaian terbaru.'; panel.hidden=false;
  });
  $('#applyHarvestAvatarPreset').addEventListener('click', () => {
    const preset={skin:'sawo',hair:'pendek',hairColor:'coklat',top:'petani',bottom:'jeans',headwear:'topi',accessory:'tas-anyaman',facialHair:'tanpa'};
    Object.entries(preset).forEach(([key,value])=>{form.elements[key].value=value;});
    selectedSpecial='farmer-ps2';
    farmerEditor.set(FARMER_PRESET, avatarColors); showModel();
    status.textContent='Avatar V11 dipilih. Atur tubuh, wajah, dan pakaian, lalu simpan untuk memakainya di peta.';
  });
  $('#closeAvatarCustomizer').addEventListener('click', () => { panel.hidden=true; });
  panel.addEventListener('click', (event) => { if (event.target === panel) panel.hidden=true; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeCitizen) { status.textContent='Masuk sebagai warga untuk menyimpan avatar.'; return; }
    const avatarConfig = Object.fromEntries(['skin','hair','hairColor','top','bottom','headwear','accessory','facialHair'].map((key) => [key, form.elements[key].value]));
    if (selectedSpecial) avatarConfig.special = selectedSpecial;
    if (selectedSpecial === 'farmer-ps2') avatarConfig.farmer = farmerEditor.get();
    const button = form.querySelector('button[type="submit"]'); button.disabled=true; status.textContent='Menyimpan avatar warga…';
    try {
      const response = await fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'citizen',action:'update_avatar',avatarConfig})});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||'Avatar belum tersimpan.');
      updateCitizenHeader(result.citizen); status.textContent='Avatar tersimpan. Penampilanmu sudah diperbarui di peta.'; panel.hidden=true;
    } catch(error) { status.textContent=error.message; }
    finally { button.disabled=false; }
  });
  window.addEventListener('semesta:citizen-change', (event) => { if(event.detail?.citizen) $('#customAvatarName').textContent=event.detail.citizen.display_name; else panel.hidden=true; });
}

async function start() {
  if (document.body.classList.contains('admin-body')) {
    initAdminNavigation();
    initAvatarStudio();
    initWorldEditor();
    initObjectGallery();
    initIdeasInbox();
    initCitizenDirectory();
    initVisitorLogs();
    initMailSettings();
    return;
  }
  // Register map controls immediately; a slow citizen/database request must
  // never leave the opening map looking interactive while its buttons are dead.
  initExploreAvatarCustomizer();
  initWorld();
  initCitizen().catch((error) => console.error('Profil warga belum dapat dimuat:', error));
}

// Keep exploration usable on devices where WebGL is disabled or unavailable.
function startCanvasFallback(sourceCanvas, place, city, entries, reason) {
  const screen = $('#exploreScreen');
  const old = $('#worldFallback');
  old?.remove();
  sourceCanvas.style.display = 'none';
  const canvas = document.createElement('canvas');
  canvas.id = 'worldFallback';
  canvas.setAttribute('aria-label', `Peta interaktif ${place.name}`);
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none';
  sourceCanvas.after(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { reportWorldIssue(reason); return; }
  $('#worldError').classList.remove('visible');
  const status = $('#interactionHint');
  if (status) status.textContent = 'PETA INTERAKTIF · JOYSTICK / WASD UNTUK BERJALAN';
  const savedState = readGameState();
  let px = Number.isFinite(savedState.playerPosition?.x) ? savedState.playerPosition.x : 0; let pz = Number.isFinite(savedState.playerPosition?.z) ? savedState.playerPosition.z : 18; let zoom = clamp(Number(savedState.fallbackZoom) || 1, .65, 1.6); let lastSave = 0; let stickX = 0; let stickY = 0; const moveKeys = new Set();
  const fallbackColliderSizes = { house:[2.4,1.8],house_village:[2.5,1.9],house_mid:[2.7,2],house_luxury:[2.8,2.1],school:[3.4,2.4],school_ruined:[3.4,2.4],school_good:[3.8,2.7],mbg:[3.2,2.1],sppg:[3.6,2.4],kopdes:[3.2,2.3],market:[2.8,2.2],hall:[2.7,2.3],office:[2.8,2.3],dpr_mpr:[4.2,3.2],istana_negara:[4.1,3.2],car:[1.25,.75],car_economy:[1.25,.75],car_family:[1.35,.8],car_luxury:[1.45,.8],pickup:[1.35,.8],truck:[2.2,.9],bus:[2.5,.95],motorcycle:[.8,.6],tractor:[1.7,1],hand_tractor:[1.3,.8],combine_harvester:[2,1.2],tree:[.6,.6],tree_canopy:[.7,.7],forest:[.8,.8],forest_lush:[1.2,1.2],forest_burned:[1.1,1.1],lamp:[.25,.25],chicken:[.35,.35],duck:[.38,.38],goat:[.48,.48],cow:[.6,.6],buffalo:[.65,.65],cat:[.35,.35],dog:[.4,.4] };
  const fallbackBlockers = (Array.isArray(entries) ? entries : []).filter((entry) => fallbackColliderSizes[entry.type] || ['river','bridge'].includes(entry.type)).map((entry) => ({...entry, half:(fallbackColliderSizes[entry.type] || [0,0]).map((size)=>size*(entry.scale||1))}));
  const fallbackBlocked = (x,z,ignoreId=null) => {
    const inside=(entry,half)=>{const angle=-(entry.rotation||0)*Math.PI/180;const dx=x-entry.x,dz=z-entry.z;return Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle))<=half[0]+.38&&Math.abs(dx*Math.sin(angle)+dz*Math.cos(angle))<=half[1]+.38;};
    const onBridge=fallbackBlockers.some((entry)=>entry.type==='bridge'&&inside(entry,[(entry.length||8)*(entry.scale||1)/2,(entry.width||3.8)*(entry.scale||1)/2]));
    if(!onBridge&&fallbackBlockers.some((entry)=>entry.type==='river'&&inside(entry,[(entry.length||9)*(entry.scale||1)/2,(entry.width||3)*(entry.scale||1)/2])))return true;
    return fallbackBlockers.some((entry)=>entry.id!==ignoreId&&entry.type!=='river'&&entry.type!=='bridge'&&inside(entry,entry.half));
  };
  const fallbackAnimalPositions=new Map(fallbackBlockers.filter((entry)=>['chicken','duck','goat','cow','buffalo','cat','dog'].includes(entry.type)).map((entry)=>[entry.id,{x:entry.x,z:entry.z}]));
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let fallbackPeers = []; let fallbackChatTarget = null; let fallbackCanChat = false; let fallbackAfterId = 0; let fallbackSyncAt = 0; let fallbackSyncBusy = false;
  const chatPanel = $('#citizenChat'); const chatLog = $('#citizenChatLog'); const chatInput = $('#citizenChatForm').elements.message;
  function addFallbackChatMessage(message) { if(chatLog.querySelector(`[data-message-id="${Number(message.id)||0}"]`))return;chatLog.querySelector('.citizen-chat-empty')?.remove(); const bubble=document.createElement('article');bubble.dataset.messageId=String(Number(message.id)||0);bubble.className=`citizen-chat-message${Number(message.sender_id)===Number(activeCitizen?.id)?' mine':''}`;const by=document.createElement('b');by.textContent=Number(message.sender_id)===Number(activeCitizen?.id)?'KAMU':(message.sender_name||fallbackChatTarget?.displayName||'WARGA');const text=document.createElement('span');text.textContent=message.message;bubble.append(by,text);chatLog.append(bubble);chatLog.scrollTop=chatLog.scrollHeight; }
  async function syncFallbackChat(now) { if(!activeCitizen||fallbackSyncBusy||now-fallbackSyncAt<1700)return;fallbackSyncBusy=true;fallbackSyncAt=now;try{const response=await fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'citizen_chat',action:'sync',destination:city.id,region:place.id,x:px,z:pz,targetId:fallbackChatTarget?.id||0,after:fallbackAfterId})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Obrolan warga belum tersambung.');fallbackPeers=Array.isArray(data.players)?data.players:[];fallbackCanChat=!!data.canChat;(data.messages||[]).forEach((message)=>{addFallbackChatMessage(message);fallbackAfterId=Math.max(fallbackAfterId,Number(message.id)||0);});if(fallbackChatTarget&&!chatPanel.hidden){$('#citizenChatStatus').textContent=fallbackCanChat?'Kalian berdekatan · pesan masuk langsung.':'Dekati lagi warga ini untuk melanjutkan obrolan.';$('#citizenChatStatus').classList.toggle('error',!fallbackCanChat);$('#citizenChatForm').querySelector('button').disabled=!fallbackCanChat;}}catch(error){if(fallbackChatTarget&&!chatPanel.hidden){$('#citizenChatStatus').textContent=error.message;$('#citizenChatStatus').classList.add('error');}}finally{fallbackSyncBusy=false;} }
  function nearestFallbackPeer() { let peer=null,distance=5;fallbackPeers.forEach((item)=>{const d=Math.hypot(px-item.x,pz-item.z);if(d<distance){peer=item;distance=d;}});return peer; }
  function openFallbackChat(peer) { if(!activeCitizen){$('#profileButton').click();return;}fallbackChatTarget=peer;fallbackAfterId=0;fallbackCanChat=false;chatLog.replaceChildren();$('#citizenChatName').textContent=peer.displayName;$('#citizenChatStatus').textContent='Mendekat untuk mulai bertukar pesan.';$('#citizenChatStatus').classList.remove('error');$('#citizenChatForm').querySelector('button').disabled=true;$('#dialogue').classList.remove('visible');chatPanel.hidden=false;fallbackSyncAt=0;chatInput.focus({preventScroll:true}); }
  $('#citizenChatClose').onclick=()=>{chatPanel.hidden=true;fallbackChatTarget=null;fallbackCanChat=false;fallbackAfterId=0;};
  $('#citizenChatForm').onsubmit=async(event)=>{event.preventDefault();if(!fallbackChatTarget||!fallbackCanChat||!chatInput.value.trim())return;const message=chatInput.value.trim();const send=$('#citizenChatForm').querySelector('button');send.disabled=true;try{const response=await fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'citizen_chat',action:'send',destination:city.id,region:place.id,targetId:fallbackChatTarget.id,message})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Pesan belum terkirim.');addFallbackChatMessage(data.message);fallbackAfterId=Math.max(fallbackAfterId,Number(data.message.id)||0);chatInput.value='';$('#citizenChatStatus').textContent='Pesan terkirim.';}catch(error){$('#citizenChatStatus').textContent=error.message;$('#citizenChatStatus').classList.add('error');}finally{send.disabled=!fallbackCanChat;chatInput.focus({preventScroll:true});}};
  window.addEventListener('semesta:citizen-change',(event)=>{if(!event.detail?.citizen){fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resource:'citizen_chat',action:'leave'})}).catch(()=>{});fallbackPeers=[];chatPanel.hidden=true;fallbackChatTarget=null;}});
  const view = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, screen.clientWidth); const h = Math.max(1, screen.clientHeight);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = Math.min(w, h) / 54 * zoom;
    const centerX = w / 2; const centerY = h * .57;
    const point = (x, z) => [centerX + ((x - px) - (z - pz)) * unit * .54, centerY + ((x - px) + (z - pz)) * unit * .25];
    const tree = (x,z,scale=1) => { const [sx,sy]=point(x,z);ctx.fillStyle='#674c37';ctx.fillRect(sx-unit*.08,sy-unit*.25,unit*.16,unit*.45);ctx.fillStyle=['#477e52','#5f9457','#779f55'][Math.abs(Math.round(x+z))%3];ctx.beginPath();ctx.arc(sx,sy-unit*.43,unit*.35*scale,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sx-unit*.19,sy-unit*.36,unit*.2*scale,0,Math.PI*2);ctx.fill(); };
    const polygon = (points, fill, stroke = null, lineWidth = 1) => { ctx.beginPath(); points.forEach(([x,z], i) => { const [sx,sy] = point(x,z); i ? ctx.lineTo(sx,sy) : ctx.moveTo(sx,sy); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); } };
    ctx.clearRect(0,0,w,h);
    const sky = ctx.createLinearGradient(0,0,0,h); sky.addColorStop(0, place.id === 'hutan' ? '#b9d2c2' : '#cfe2e5'); sky.addColorStop(.48, place.id === 'desa' ? '#d6e2bd' : '#d6e7d1'); sky.addColorStop(1, '#e4dfc8'); ctx.fillStyle = sky; ctx.fillRect(0,0,w,h);
    const ground = ctx.createLinearGradient(0,h*.26,0,h); ground.addColorStop(0,place.id==='hutan'?'#719d61':'#91b96e'); ground.addColorStop(1,place.id==='hutan'?'#527b50':'#719b57'); ctx.fillStyle=ground;ctx.fillRect(0,h*.26,w,h*.74);
    // Streamed ground details are tied to world coordinates, so they continue
    // appearing around the player as the canvas fallback moves without bounds.
    const cellSize=18,centerCellX=Math.floor(px/cellSize),centerCellZ=Math.floor(pz/cellSize);
    for(let cz=centerCellZ-4;cz<=centerCellZ+4;cz++)for(let cx=centerCellX-4;cx<=centerCellX+4;cx++){
      const seed=Math.abs(Math.sin(cx*127.1+cz*311.7)*43758.5453);const x=cx*cellSize+(seed-.5)*cellSize*.7;const z=cz*cellSize+(Math.abs(Math.sin(cx*269.5+cz*183.3)*24634.6345)-.5)*cellSize*.7;
      if(Math.abs(x)<34&&Math.abs(z)<34)continue;const [sx,sy]=point(x,z);ctx.fillStyle=seed>.5?'#c8d99a88':'#e4d79a66';ctx.beginPath();ctx.ellipse(sx,sy,unit*.5,unit*.23,0,0,Math.PI*2);ctx.fill();if(seed>.56)tree(x,z,.85+seed*.5);
    }
    const road = (points, color, width) => { ctx.beginPath(); points.forEach(([x,z],i)=>{ const [sx,sy]=point(x,z); i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); }); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke(); };
    road([[-25,0],[-12,0],[0,0],[13,0],[25,0]],'#d1b47f',unit*2.1); road([[-10,-24],[-7,-12],[-5,0],[-3,12],[0,24]],'#d1b47f',unit*1.45);
    road([[-25,0],[-12,0],[0,0],[13,0],[25,0]],'#eee1bd',unit*1.72); road([[-10,-24],[-7,-12],[-5,0],[-3,12],[0,24]],'#eee1bd',unit*1.13);
    road([[19,-25],[18,-12],[19,0],[18,12],[19,25]],'#69b9c5',unit*2.25); road([[19,-25],[18,-12],[19,0],[18,12],[19,25]],'#a9dfe1',unit*1.6);
    const drawBuilding = (x,z,label,color,scale=1) => { const [sx,sy]=point(x,z); const bw=unit*1.6*scale, bh=unit*.9*scale, depth=unit*.4*scale; ctx.fillStyle='#52644a55'; ctx.beginPath();ctx.ellipse(sx,sy+depth,bw*.72,depth*.65,0,0,Math.PI*2);ctx.fill(); polygon([[x-bw/unit*.48,z],[x,z-bw/unit*.35],[x+bw/unit*.48,z],[x,z+bw/unit*.35]],color); ctx.fillStyle='#f7edda';ctx.fillRect(sx-bw*.38,sy-bh*.58,bw*.76,bh*.58); ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(sx-bw*.48,sy-bh*.58);ctx.lineTo(sx,sy-bh);ctx.lineTo(sx+bw*.48,sy-bh*.58);ctx.closePath();ctx.fill(); ctx.fillStyle='#344538';ctx.font=`700 ${Math.max(8,unit*.28)}px sans-serif`;ctx.textAlign='center';ctx.fillText(label,sx,sy-bh*1.12); };
    const items = Array.isArray(entries) && entries.length ? entries : getDefaultWorldScene(place.id);
    items.filter(o=>['tree','tree_canopy','forest','forest_lush'].includes(o.type)).forEach(o=>tree(o.x,o.z,o.type==='forest'||o.type==='forest_lush'?1.5:1));
    items.filter(o=>!['tree','tree_canopy','forest','forest_lush','road','river','bridge','chicken','duck','goat','cow','buffalo','cat','dog'].includes(o.type)).forEach(o=>{
      const labels={house:'RUMAH SEDERHANA',house_village:'RUMAH WARGA',house_mid:'RUMAH MENENGAH',house_luxury:'RUMAH MEWAH',school:'SEKOLAH RUSAK',school_ruined:'SEKOLAH RUSAK',school_good:'SEKOLAH',forest_burned:'HUTAN TERBAKAR',mbg:'SPPG · MBG',sppg:'GEDUNG SPPG · BGN',kopdes:'KOPDES MERAH PUTIH',market:'PASAR',hall:'BALAI WARGA',office:'KANTOR PEMERINTAHAN',dpr_mpr:'GEDUNG DPR · MPR',istana_negara:'ISTANA NEGARA',rice_field:'SAWAH',crop_field:'LADANG'};
      const colors={house:'#bd855e',house_village:'#d8a36e',house_mid:'#d7b47d',house_luxury:'#eee7d8',school:'#986c5e',school_ruined:'#86685a',school_good:'#d8c78e',forest_burned:'#59433c',mbg:'#4e846a',sppg:'#3679a3',kopdes:'#b86a58',market:'#d4aa58',hall:'#8e8a72',office:'#858c9d',dpr_mpr:'#69835a',istana_negara:'#eee8db',rice_field:'#6e9c52',crop_field:'#aa9853'};
      drawBuilding(o.x,o.z,labels[o.type]||'FASILITAS',colors[o.type]||'#b18b62',Math.max(.7,o.scale||1));
    });
    const t=reduce?0:Date.now()/1000;
    items.filter(o=>['chicken','duck','goat','cow','buffalo','cat','dog'].includes(o.type)).forEach((o,i)=>{ const position=fallbackAnimalPositions.get(o.id)||{x:o.x,z:o.z};const nextX=o.x+Math.sin(t*.7+i)*.8,nextZ=o.z+Math.cos(t*.6+i)*.6;if(!fallbackBlocked(nextX,nextZ,o.id)){position.x=nextX;position.z=nextZ;fallbackAnimalPositions.set(o.id,position);}const [sx,sy]=point(position.x,position.z);ctx.font=`${Math.max(13,unit*.46)}px sans-serif`;ctx.textAlign='center';ctx.fillText(({chicken:'🐓',duck:'🦆',goat:'🐐',cow:'🐄',buffalo:'🐃',cat:'🐈',dog:'🐕'})[o.type],sx,sy); });
    const [npcX,npcY]=point(0,0);ctx.font=`${Math.max(22,unit*.72)}px sans-serif`;ctx.textAlign='center';ctx.fillText('🧑',npcX,npcY);ctx.font=`700 ${Math.max(8,unit*.2)}px sans-serif`;ctx.fillStyle='#fffdf1';ctx.fillText(place.witness,npcX,npcY-unit*.62);
    fallbackPeers.forEach((peer)=>{const [sx,sy]=point(peer.x,peer.z);ctx.fillStyle='#344d3c55';ctx.beginPath();ctx.ellipse(sx,sy+unit*.1,unit*.3,unit*.15,0,0,Math.PI*2);ctx.fill();ctx.font=`${Math.max(22,unit*.78)}px sans-serif`;ctx.textAlign='center';ctx.fillText(avatarEmojis[peer.avatar]||'🙂',sx,sy);const label=peer.displayName.toUpperCase();ctx.font=`700 ${Math.max(8,unit*.22)}px sans-serif`;const width=ctx.measureText(label).width+12;ctx.fillStyle='#347b68';ctx.beginPath();ctx.roundRect(sx-width/2,sy-unit*.82,width,Math.max(15,unit*.3),7);ctx.fill();ctx.fillStyle='#fffdf1';ctx.fillText(label,sx,sy-unit*.59);});
    const [ax,ay]=point(px,pz);ctx.fillStyle='#354d3c55';ctx.beginPath();ctx.ellipse(ax,ay+unit*.15,unit*.34,unit*.16,0,0,Math.PI*2);ctx.fill();ctx.font=`${Math.max(24,unit*.92)}px sans-serif`;ctx.textAlign='center';ctx.fillText(activeCitizen?.avatar?(avatarEmojis[activeCitizen.avatar]||'🙂'):'🙂',ax,ay);
    ctx.fillStyle='#fff9e8';ctx.strokeStyle='#526d49';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(ax-unit*.72,ay-unit*.82,unit*1.44,unit*.32,unit*.13);ctx.fill();ctx.stroke();ctx.fillStyle='#40553d';ctx.font=`700 ${Math.max(8,unit*.24)}px sans-serif`;ctx.fillText('ANDA',ax,ay-unit*.59);
    if (!reduce) { let mx=stickX,my=stickY;if(moveKeys.has('up')||moveKeys.has('KeyW'))my-=1;if(moveKeys.has('down')||moveKeys.has('KeyS'))my+=1;if(moveKeys.has('left')||moveKeys.has('KeyA'))mx-=1;if(moveKeys.has('right')||moveKeys.has('KeyD'))mx+=1;const magnitude=Math.hypot(mx,my);if(magnitude>1){mx/=magnitude;my/=magnitude;}const nextX=px+mx*.11,nextZ=pz+my*.11;if(!fallbackBlocked(nextX,nextZ)){px=nextX;pz=nextZ;}else{if(!fallbackBlocked(nextX,pz))px=nextX;if(!fallbackBlocked(px,nextZ))pz=nextZ;} }
    const now=performance.now();syncFallbackChat(now);const closePeer=nearestFallbackPeer();const npcNearby=Math.hypot(px,pz)<4.2;if(status)status.textContent=closePeer?`TEKAN E / BICARA DENGAN ${closePeer.displayName.toUpperCase()}`:npcNearby?`TEKAN E / BICARA DENGAN ${place.witness}`:'JELAJAHI BEBAS · DEKATI WARGA UNTUK MENGOBROL';if(status)status.classList.toggle('nearby',!!closePeer||npcNearby);if(now-lastSave>500){saveGameState({screen:'explore',destination:city.id,location:place.id,region:place.id,playerPosition:{x:px,z:pz},fallbackZoom:zoom});lastSave=now;}
  };
  const animate=()=>{ if (!document.body.classList.contains('exploring')) return; view(); requestAnimationFrame(animate); };
  canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();const dx=(e.clientX-r.left-r.width/2)/(Math.min(r.width,r.height)/54*zoom);const dy=(e.clientY-r.top-r.height*.57)/(Math.min(r.width,r.height)/54*zoom);const nextX=px+dx*.55+dy*1.1,nextZ=pz-dx*.55+dy*1.1;if(!fallbackBlocked(nextX,nextZ)){px=nextX;pz=nextZ;}});
  const keyDirections={'ArrowUp':'up','ArrowDown':'down','ArrowLeft':'left','ArrowRight':'right','KeyW':'KeyW','KeyA':'KeyA','KeyS':'KeyS','KeyD':'KeyD'};
  window.addEventListener('keydown',e=>{if(isTypingTarget(e.target))return;if(keyDirections[e.code]){moveKeys.add(keyDirections[e.code]);e.preventDefault();}if(e.code==='KeyE')$('#talkButton')?.click();});window.addEventListener('keyup',e=>moveKeys.delete(keyDirections[e.code]));
  const joystick=$('#joystick'),joystickKnob=$('#joystickKnob');
  if(joystick){let activePointer=null;const move=(event)=>{const r=joystick.getBoundingClientRect();let x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2;const limit=r.width*.34,d=Math.hypot(x,y);if(d>limit){x*=limit/d;y*=limit/d;}stickX=x/limit;stickY=y/limit;joystickKnob.style.transform=`translate(${x}px,${y}px)`;};const release=()=>{activePointer=null;stickX=stickY=0;joystickKnob.style.transform='translate(0,0)';};joystick.addEventListener('pointerdown',event=>{event.preventDefault();activePointer=event.pointerId;joystick.setPointerCapture(event.pointerId);move(event);});joystick.addEventListener('pointermove',event=>{if(activePointer===event.pointerId)move(event);});joystick.addEventListener('pointerup',release);joystick.addEventListener('pointercancel',release);joystick.addEventListener('lostpointercapture',release);}
  window.addEventListener('blur',()=>{moveKeys.clear();stickX=stickY=0;joystickKnob?.style.setProperty('transform','translate(0,0)');});
  $('#zoomIn').onclick=()=>{zoom=Math.min(1.6,zoom+.12);saveGameState({fallbackZoom:zoom});view();};$('#zoomOut').onclick=()=>{zoom=Math.max(.65,zoom-.12);saveGameState({fallbackZoom:zoom});view();};$('#talkButton').onclick=()=>{const peer=nearestFallbackPeer();if(peer){openFallbackChat(peer);return;}const nearbyNpc=Math.hypot(px,pz)<4.2;if(nearbyNpc){$('#speakerName').textContent=place.witness.toUpperCase();$('#speakerBadge').textContent='☺';$('#dialogueText').textContent=`Halo, saya tinggal di ${place.name.toLowerCase()}. Ada kabar atau kebutuhan warga yang ingin kamu ceritakan?`;$('#dialogue').classList.add('visible');return;}const toast=$('#toast');if(toast){toast.textContent='Dekati warga sekitar untuk mengobrol.';toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),1800);}};
  window.addEventListener('resize',view); animate();
}

function initWorld() {
  const savedState = readGameState();
  let destination = destinationInfo[savedState.destination] ? savedState.destination : 'jakarta';
  let location = 'kampung';
  const regions = { kota: { id: 'kota', name: 'Kota Warga', type: 'kota', emoji: '🏙️', title: 'Ronda Kota: siapa menjaga ruang bersama?', hook: 'Pagi ini papan pengumuman kota penuh usulan yang saling menyapa.', witness: 'BU RT', colors: ['#89ad72','#d7a66c','#83b3a1'] }, desa: { id: 'desa', name: 'Desa Tumbuh', type: 'desa', emoji: '🌾', title: 'Musyawarah Desa yang belum selesai', hook: 'Warga berkumpul membahas jalan, sekolah, dan mata pencaharian.', witness: 'PAK KADUS', colors: ['#83a86e','#c9895f','#a6c083'] }, hutan: { id: 'hutan', name: 'Hutan Warga', type: 'hutan', emoji: '🌳', title: 'Suara dari batas hutan', hook: 'Jejak baru muncul di jalur yang biasa dipakai warga mencari air.', witness: 'JURU RAWAT HUTAN', colors: ['#79a86f','#8dbf84','#b8a766'] } };
  const syncExploreAccess = () => {
    const button = $('#enterLocation');
    if (!button) return;
    button.innerHTML = `JELAJAHI ${regions[region].name.toUpperCase()} <span>↗</span>`;
    button.setAttribute('aria-label', `Jelajahi ${regions[region].name}${activeCitizen ? '' : ' sebagai tamu'}`);
  };
  window.addEventListener('semesta:citizen-change', syncExploreAccess);
  let region = regions[savedState.region] ? savedState.region : 'kota';
  let avatar = savedState.worldAvatar && Number.isFinite(savedState.worldAvatar.x) && Number.isFinite(savedState.worldAvatar.y)
    ? { x: savedState.worldAvatar.x, y: savedState.worldAvatar.y }
    : { x: destinationInfo[destination].x, y: destinationInfo[destination].y };
  const pins = [...document.querySelectorAll('.destination-pin')];
  const zones = [...document.querySelectorAll('.zone-pin')];
  const map = $('#worldMap');
  function selectDestination(id, travel = true) {
    if (!destinationInfo[id]) return;
    destination = id;
    const data = destinationInfo[id];
    pins.forEach((pin) => pin.classList.toggle('selected', pin.dataset.destination === id));
    $('#destinationIcon').textContent = data.icon;
    $('#destinationCountry').textContent = data.country;
    $('#destinationTitle').textContent = data.name;
    $('#destinationDesc').textContent = data.desc;
    $('#destinationNote').textContent = data.note;
    if (travel) { avatar.x = data.x; avatar.y = data.y; }
    $('#mapAvatar').style.left = `${avatar.x}%`;
    $('#mapAvatar').style.top = `${avatar.y}%`;
    $('#mapAvatar').classList.add('traveling');
    setTimeout(() => $('#mapAvatar').classList.remove('traveling'), 500);
    saveGameState({ destination, worldAvatar: { x: avatar.x, y: avatar.y } });
  }
  map.addEventListener('click', (event) => {
    const pin = event.target.closest('.destination-pin');
    if (!pin) return;
    event.stopPropagation();
    selectDestination(pin.dataset.destination);
  });
  $('#enterCity').addEventListener('click', () => {
    const data = destinationInfo[destination];
    $('#cityTitle').textContent = `Kawasan Warga, ${data.name}`;
    $('#cityIntro').textContent = `${data.intro} Cerita dan isu bisa berkembang mengikuti suara warga.`;
    $('#cityCountry').textContent = data.country;
    $('#cityCoordinates').textContent = data.coordinates;
    $('#exploreCityName').textContent = data.name.toUpperCase();
    $('#worldScreen').classList.remove('active'); $('#cityScreen').classList.add('active');
    $('#cityMapArt').dataset.city = destination;
    zones.forEach((zone) => { const id = zone.dataset.location; const dataForPlace = locationFor(destination, id); zone.querySelector('b').textContent = dataForPlace.name.toUpperCase(); });
    selectLocation('kampung');
    selectRegion(region);
    saveGameState({ screen: 'city', destination, location, region, worldAvatar: { x: avatar.x, y: avatar.y } });
  });
  $('#backToWorld').addEventListener('click', () => { $('#cityScreen').classList.remove('active'); $('#worldScreen').classList.add('active'); saveGameState({ screen: 'world', destination, worldAvatar: { x: avatar.x, y: avatar.y } }); });

  function selectRegion(id) {
    if (!regions[id]) return;
    region = id; const area = regions[id];
    document.querySelectorAll('.region-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.region === id));
    zones.forEach((zone) => zone.classList.remove('selected'));
    $('#locationEmoji').textContent = area.emoji;
    $('#locationTitle').textContent = area.name;
    $('#locationDescription').textContent = id === 'kota' ? 'Kawasan kota dengan rumah, sekolah, pasar, layanan publik, dan ruang bersama.' : id === 'desa' ? 'Wilayah desa dengan permukiman, layanan dasar, lahan usaha, dan musyawarah warga.' : 'Kawasan hutan dan tepian kampung; warga menjaga sumber air, jalur, dan ruang hidup.';
    $('#locationTag').textContent = `WILAYAH · ${area.name.toUpperCase()}`;
    syncExploreAccess();
    $('#exploreLocationName').textContent = area.name.toUpperCase();
    saveGameState({ region, destination });
  }
  document.querySelectorAll('.region-tab').forEach((tab) => tab.addEventListener('click', () => selectRegion(tab.dataset.region)));

  function selectLocation(id) {
    if (!locations[id]) return;
    location = id; const data = locationFor(destination, id);
    saveGameState({ location, destination });
    zones.forEach((zone) => zone.classList.toggle('selected', zone.dataset.location === id));
    $('#locationEmoji').textContent = data.emoji;
    $('#locationTitle').textContent = data.name;
    $('#locationDescription').textContent = data.desc;
    $('#locationTag').textContent = data.tag;
    $('#exploreLocationName').textContent = data.name.toUpperCase();
    $('#enterLocation').disabled = false;
    $('#enterLocation').classList.remove('location-locked');
    syncExploreAccess();
    const chipHost = $('#locationChips');
    chipHost.replaceChildren();
    const button = document.createElement('button'); button.className = 'location-chip active';
    button.textContent = '🏠 Permukiman Warga'; button.addEventListener('click', () => selectLocation('kampung')); chipHost.append(button);
  }
  zones.forEach((zone) => zone.addEventListener('click', () => { selectLocation(zone.dataset.location); $('#enterLocation').click(); }));
  $('#cityMapArt').addEventListener('click', (event) => {
    if (event.target.closest('.zone-pin')) return;
    const nearest = zones.map((zone) => { const r = zone.getBoundingClientRect(); return { id: zone.dataset.location, distance: Math.hypot(event.clientX - r.left - r.width / 2, event.clientY - r.top - r.height / 2) }; }).sort((a, b) => a.distance - b.distance)[0];
    if (nearest) selectLocation(nearest.id);
  });
  $('#enterLocation').addEventListener('click', () => {
    $('#cityScreen').classList.remove('active'); $('#exploreScreen').classList.add('active');
    document.body.classList.add('exploring');
    saveGameState({ screen: 'explore', destination, location: region, region, worldAvatar: { x: avatar.x, y: avatar.y }, playerPosition: null, foundClues: [], cameraYaw: 0 });
    runArea(regions[region], destinationInfo[destination]);
  });
  function showCityMap() { $('#exploreScreen').classList.remove('active'); document.body.classList.remove('exploring'); $('#cityScreen').classList.add('active'); saveGameState({ screen: 'city', destination, location, region, worldAvatar: { x: avatar.x, y: avatar.y } }); }
  function showWorldMap() { $('#exploreScreen').classList.remove('active'); document.body.classList.remove('exploring'); $('#cityScreen').classList.remove('active'); $('#worldScreen').classList.add('active'); saveGameState({ screen: 'world', destination, location, region, worldAvatar: { x: avatar.x, y: avatar.y } }); }
  $('#backToCity').addEventListener('click', showCityMap);
  $('#backToCityQuick').addEventListener('click', showCityMap);
  $('#backToWorldFromExplore').addEventListener('click', showWorldMap);

  window.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target) || !$('#worldScreen').classList.contains('active')) return;
    const move = 1.8;
    if (['ArrowUp', 'KeyW'].includes(event.code)) avatar.y -= move;
    if (['ArrowDown', 'KeyS'].includes(event.code)) avatar.y += move;
    if (['ArrowLeft', 'KeyA'].includes(event.code)) avatar.x -= move;
    if (['ArrowRight', 'KeyD'].includes(event.code)) avatar.x += move;
    avatar.x = clamp(avatar.x, 8, 92); avatar.y = clamp(avatar.y, 12, 86);
    $('#mapAvatar').style.left = `${avatar.x}%`; $('#mapAvatar').style.top = `${avatar.y}%`;
    let nearest = null; let distance = Infinity;
    Object.entries(destinationInfo).forEach(([id, data]) => { const d = Math.hypot(data.x - avatar.x, data.y - avatar.y); if (d < distance) { nearest = id; distance = d; } });
    if (nearest) selectDestination(nearest, false);
    saveGameState({ screen: 'world', destination, worldAvatar: { x: avatar.x, y: avatar.y } });
  });

  let mapPointer = null;
  map.addEventListener('pointerdown', (event) => { if (event.target.closest('button, a')) return; mapPointer = event.pointerId; map.setPointerCapture(event.pointerId); moveWorldAvatar(event); });
  map.addEventListener('pointermove', (event) => { if (mapPointer === event.pointerId) moveWorldAvatar(event); });
  map.addEventListener('pointerup', () => { mapPointer = null; }); map.addEventListener('pointercancel', () => { mapPointer = null; });
  function moveWorldAvatar(event) {
    const rect = map.getBoundingClientRect(); avatar.x = clamp(((event.clientX - rect.left) / rect.width) * 100, 7, 93); avatar.y = clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 87);
    $('#mapAvatar').style.left = `${avatar.x}%`; $('#mapAvatar').style.top = `${avatar.y}%`;
    let nearest = null; let distance = Infinity;
    Object.entries(destinationInfo).forEach(([id, data]) => { const d = Math.hypot(data.x - avatar.x, data.y - avatar.y); if (d < distance) { nearest = id; distance = d; } });
    if (nearest) selectDestination(nearest, false);
    saveGameState({ screen: 'world', destination, worldAvatar: { x: avatar.x, y: avatar.y } });
  }
  selectLocation(location);
  selectRegion(region);
  selectDestination(destination, false);
  const restoredScreen = ['city', 'explore'].includes(savedState.screen) ? savedState.screen : 'world';
  $('#worldScreen').classList.toggle('active', restoredScreen === 'world');
  $('#cityScreen').classList.toggle('active', restoredScreen === 'city');
  $('#exploreScreen').classList.toggle('active', restoredScreen === 'explore');
  document.body.classList.toggle('exploring', restoredScreen === 'explore');
  $('#cityMapArt').dataset.city = destination;
  saveGameState({ screen: restoredScreen, destination, location: restoredScreen === 'explore' ? region : location, region, worldAvatar: { x: avatar.x, y: avatar.y } });
  if (restoredScreen === 'city') {
    const data = destinationInfo[destination];
    $('#cityTitle').textContent = `Kawasan Warga, ${data.name}`; $('#cityIntro').textContent = `${data.intro} Cerita dan isu bisa berkembang mengikuti suara warga.`;
    $('#cityCountry').textContent = data.country; $('#cityCoordinates').textContent = data.coordinates; $('#exploreCityName').textContent = data.name.toUpperCase();
  }
  if (restoredScreen === 'explore') runArea(regions[region], destinationInfo[destination]);
}

async function runArea(place, city) {
  $('#worldFallback')?.remove();
  $('#world').style.display = '';
  const savedState = readGameState();
  $('#exploreLocationName').textContent = place.name.toUpperCase();
  let placedObjects = getDefaultWorldScene(place.id);
  let sceneCustomized = true;
  try {
    const sceneResponse = await fetch(`${API_URL}?resource=world_scene&region=${encodeURIComponent(place.id)}`, { headers: { Accept: 'application/json' } });
    const sceneData = await sceneResponse.json();
    if (sceneResponse.ok && Array.isArray(sceneData.objects)) {
      sceneCustomized = true;
      // Empty rows were previously treated as a deliberately blank map, which
      // hid the starter town after an editor save. A playable region always
      // starts from its arranged layout until an admin places at least one object.
      placedObjects = sceneData.customized && sceneData.objects.length ? sceneData.objects : getDefaultWorldScene(place.id);
    }
  } catch (error) { console.info('Memakai tata wilayah bawaan.', error); }
  let THREE;
  try { THREE = await import('three'); }
  catch (error) { startCanvasFallback($('#world'), place, city, placedObjects, error); return; }
  await Promise.all([
    new GLTFLoader().loadAsync(window.SEMESTA_CHARACTER_MODEL)
      .then(setHumanAsset)
      .catch((error) => console.warn('Aset karakter GLB tidak dapat dimuat; memakai cadangan.', error)),
    new GLTFLoader().loadAsync(window.SEMESTA_FARMER_MODEL)
      .then(setFarmerAsset)
      .catch((error) => console.warn('Aset petani 3D PS2 tidak dapat dimuat; memakai avatar standar.', error)),
  ]);
  const canvas = $('#world'); let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch (error) { startCanvasFallback(canvas, place, city, placedObjects, error); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(innerWidth, innerHeight, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const regionLook = { kota: { sky: '#d0e4df', fog: '#d0e4df', grass: '#8bb666' }, desa: { sky: '#d8e3c2', fog: '#d8e3c2', grass: '#83ae58' }, hutan: { sky: '#b8d0bc', fog: '#b8d0bc', grass: '#5f8a56' } }[place.id] || { sky: '#d0e4df', fog: '#d0e4df', grass: '#8bb666' };
  scene.background = new THREE.Color(regionLook.sky); scene.fog = null;
  const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .1, 180); const world = new THREE.Group(); scene.add(world);
  let cameraDistance = clamp(Number(savedState.cameraZoom) || 20, 13, 34);
  function resizeGame() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); }
  resizeGame();
  scene.add(new THREE.HemisphereLight('#fff7e3', '#6e8557', 1.35)); const sun = new THREE.DirectionalLight('#fff1d3', 1.9); sun.position.set(-10, 22, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -34; sun.shadow.camera.right = 34; sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34; sun.shadow.bias = -.0002; scene.add(sun, sun.target);
  const material = (color, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
  function paintedTexture(base, colors, seed, speckCount = 900) {
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 512;
    const ctx = textureCanvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
    let value = seed >>> 0; const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
    colors.forEach((color, index) => { ctx.globalAlpha = index === 0 ? .12 : .08; ctx.fillStyle = color; for (let i = 0; i < speckCount / colors.length; i++) { const size = 1 + random() * 5; ctx.fillRect(random() * 512, random() * 512, size, size * (.35 + random())); } });
    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(textureCanvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4; return texture;
  }
  const grassTexture = paintedTexture(regionLook.grass, ['#b6cf83', '#6f9d56', '#d9d28f'], 42 + place.id.length, 1500);
  const dirtTexture = paintedTexture('#c4a071', ['#e2c18d', '#9a7654', '#f0d8a8'], 81, 1000);
  const palette = { green: material(regionLook.grass), accent: material(place.colors[1]), leaf: material(place.colors[2]), cream: material('#fff0ce'), brown: material('#8b5b3f'), dark: material('#374650'), blue: material('#55bfe0'), coral: material('#ed705c'), yellow: material('#f6cb4d'), white: material('#fffaf0'), red: material('#e85e50'), soil: material('#9b6845'), path: material('#d8a84c') };
  const sphere = new THREE.SphereGeometry(1, 16, 12), box = new THREE.BoxGeometry(1, 1, 1), cone = new THREE.ConeGeometry(1, 1, 8), cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
  function add(geometry, mat, parent, pos, scale, rot) { const m = new THREE.Mesh(geometry, mat); if (pos) m.position.set(...pos); if (scale) m.scale.set(...scale); if (rot) m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  const colliders = [];
  const addCollider = (x, z, halfX, halfZ, kind = 'object') => { const collider={x,z,halfX,halfZ,kind}; colliders.push(collider); return collider; };
  function addBranch(parent, from, to, radius, mat) {
    const start = new THREE.Vector3(...from); const end = new THREE.Vector3(...to); const delta = end.clone().sub(start);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(radius * .62, radius, delta.length(), 7), mat);
    branch.position.copy(start.clone().add(end).multiplyScalar(.5)); branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); parent.add(branch); return branch;
  }
  function makeTree(x, z, size = 1) {
    const tree = createWorldAsset(THREE, place.id === 'hutan' ? 'forest' : 'tree'); tree.position.set(x, 0, z); tree.scale.setScalar(size); world.add(tree);
    addCollider(x, z, .55 * size, .55 * size); return tree;
  }
  palette.green.map = grassTexture; grassTexture.repeat.set(160, 160);
  const endlessGround = add(new THREE.PlaneGeometry(1600, 1600), palette.green, world, [0, -.08, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
  endlessGround.frustumCulled = false;
  const wildernessSpacing = 52; const wildernessRadius = 5; const wildernessCapacity = (wildernessRadius * 2 + 1) ** 2;
  const wildernessTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .29, 2.8, 7), material('#75533b'), wildernessCapacity);
  const wildernessCanopy = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), material(place.id === 'hutan' ? '#416e45' : '#608e4d'), wildernessCapacity);
  const wildernessCanopyLight = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), material(place.id === 'hutan' ? '#527b4d' : '#7a9f58'), wildernessCapacity);
  [wildernessTrunk, wildernessCanopy, wildernessCanopyLight].forEach((mesh) => { mesh.count = 0; mesh.castShadow = true; mesh.receiveShadow = true; world.add(mesh); });
  const treeTransform = new THREE.Object3D(); let wildernessCenter = '';
  const worldHash = (x, z, seed = 0) => { let value = Math.imul(x ^ seed, 0x45d9f3b) ^ Math.imul(z + seed, 0x119de1f3); value = Math.imul(value ^ (value >>> 16), 0x45d9f3b); return ((value ^ (value >>> 16)) >>> 0) / 4294967296; };
  function updateWilderness(x, z) {
    const centerX = Math.floor(x / wildernessSpacing); const centerZ = Math.floor(z / wildernessSpacing); const key = `${centerX}:${centerZ}`;
    if (key === wildernessCenter) return; wildernessCenter = key;
    let index = 0;
    for (let cellZ = centerZ - wildernessRadius; cellZ <= centerZ + wildernessRadius; cellZ++) for (let cellX = centerX - wildernessRadius; cellX <= centerX + wildernessRadius; cellX++) {
      const seed = worldHash(cellX, cellZ, place.id.length * 173); if (seed < .48) continue;
      const treeX = (cellX + (worldHash(cellX, cellZ, 11) - .5) * .48) * wildernessSpacing;
      const treeZ = (cellZ + (worldHash(cellX, cellZ, 29) - .5) * .48) * wildernessSpacing;
      if (Math.abs(treeX) < 42 && Math.abs(treeZ) < 42) continue;
      const size = .82 + worldHash(cellX, cellZ, 47) * .72;
      const rotation = worldHash(cellX, cellZ, 71) * Math.PI * 2;
      treeTransform.position.set(treeX, 1.4 * size, treeZ); treeTransform.rotation.set(0, rotation, 0); treeTransform.scale.setScalar(size); treeTransform.updateMatrix(); wildernessTrunk.setMatrixAt(index, treeTransform.matrix);
      treeTransform.position.set(treeX, 3 * size, treeZ); treeTransform.scale.set(1.55 * size, 1.75 * size, 1.5 * size); treeTransform.updateMatrix(); wildernessCanopy.setMatrixAt(index, treeTransform.matrix);
      treeTransform.position.set(treeX + .48 * size, 2.85 * size, treeZ + .12 * size); treeTransform.scale.set(1.03 * size, 1.18 * size, 1.05 * size); treeTransform.updateMatrix(); wildernessCanopyLight.setMatrixAt(index, treeTransform.matrix); index++;
    }
    [wildernessTrunk, wildernessCanopy, wildernessCanopyLight].forEach((mesh) => { mesh.count = index; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); });
  }
  // A broad village lane splits into five visible roads to the locations on the town map.
  const pathMat = material('#fff'); pathMat.map = dirtTexture; pathMat.side = THREE.DoubleSide;
  function makeTrail(points, width = 3.4) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, .012, z)));
    const samples = curve.getSpacedPoints(90); const vertices = []; const uvs = []; const indices = [];
    samples.forEach((point, index) => { const along = index / (samples.length - 1); const tangent = curve.getTangentAt(along); const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2); vertices.push(point.x - side.x, point.y, point.z - side.z, point.x + side.x, point.y, point.z + side.z); uvs.push(0, along * 5, 1, along * 5); if (index < samples.length - 1) { const a = index * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); const trail = new THREE.Mesh(geometry, pathMat); trail.receiveShadow = true; world.add(trail);
  }
  dirtTexture.repeat.set(7, 13);
  if (!sceneCustomized) {
  makeTrail([[0, 25], [0, 17], [-1, 10], [0, 3], [0, -5], [0, -15], [0, -25]], 4.2);
  makeTrail([[0, 4], [-7, 4], [-13, 2], [-20, 2], [-26, 4]], 3.4);
  makeTrail([[0, 5], [8, 6], [15, 8], [21, 6], [27, 4]], 3.4);
  makeTrail([[8, 6], [9, 4], [11, 2.5]], 2.7);
  makeTrail([[7, 7], [9, 10], [13, 13], [17, 16], [22, 18]], 3.0);
  makeTrail([[0, -5], [7, -9], [13, -14], [20, -19], [25, -25]], 3.25);
  makeTrail([[-1, -8], [-4, -12], [-10, -16], [-17, -21], [-25, -25]], 3.25);
  // The playable Dapur MBG sits southwest of the crossroads, matching its town-map pin.
  makeTrail([[0, -2], [-3, -2.5], [-5.5, -4], [-7.2, -5.2], [-8.5, -5.8]], 3.2);
  }
  // A narrow stream and timber footbridges connect the eastern neighborhood roads.
  if (!sceneCustomized) {
  const streamCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(18.6, .025, -25), new THREE.Vector3(19.1, .025, -15), new THREE.Vector3(18.3, .025, -5), new THREE.Vector3(18.7, .025, 5), new THREE.Vector3(18.1, .025, 15), new THREE.Vector3(18.8, .025, 25)]);
  const streamSamples = streamCurve.getSpacedPoints(100); const streamVertices = []; const streamUvs = []; const streamIndices = [];
  const crossingPoints = [-18, 7, 17];
  streamSamples.forEach((point, index) => { const along = index / (streamSamples.length - 1); const tangent = streamCurve.getTangentAt(along); const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(1.2); streamVertices.push(point.x - side.x, point.y, point.z - side.z, point.x + side.x, point.y, point.z + side.z); streamUvs.push(0, along * 8, 1, along * 8); if (index < streamSamples.length - 1) { const a = index * 2; streamIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); if (!crossingPoints.some((crossing) => Math.abs(point.z - crossing) < 1.8)) addCollider(point.x, point.z, 1.2, .16); } });
  const streamGeometry = new THREE.BufferGeometry(); streamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streamVertices, 3)); streamGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(streamUvs, 2)); streamGeometry.setIndex(streamIndices); streamGeometry.computeVertexNormals(); const waterMaterial = material('#55bde0', .32); waterMaterial.metalness = .04; const streamMesh = new THREE.Mesh(streamGeometry, waterMaterial); streamMesh.receiveShadow = true; world.add(streamMesh);
  function buildBridge(z) { const bridge = new THREE.Group(); bridge.position.set(18.6, .08, z); world.add(bridge); add(box, material('#8a5b3d'), bridge, [0, 0, 0], [4.6, .18, 1.85]); for (let i = 0; i < 11; i++) add(box, material(i % 2 ? '#bd8751' : '#a87348'), bridge, [-2.05 + i * .41, .105, 0], [.035, .015, 1.82]); for (const side of [-1, 1]) { for (const x of [-2, 2]) add(box, material('#815338'), bridge, [x, .62, side * .78], [.14, 1.12, .14]); add(box, material('#815338'), bridge, [0, .92, side * .78], [4.1, .16, .14]); } }
  crossingPoints.forEach(buildBridge);
  }
  // The well marks the village crossroads without blocking the main walking lanes.
  if (!sceneCustomized) {
  const well = new THREE.Group(); well.position.set(3.5, 0, .8); world.add(well); addCollider(3.5, .8, 1.12, 1.05);
  add(cyl, material('#8a8d83'), well, [0, .28, 0], [1.03, .5, 1.03]); add(cyl, material('#b0aa94'), well, [0, .56, 0], [.9, .13, .9]); add(cyl, material('#42a9c5', .35), well, [0, .59, 0], [.7, .035, .7]);
  for (const x of [-.75, .75]) add(box, material('#755139'), well, [x, 1.25, 0], [.14, 1.35, .14]);
  add(box, material('#85573d'), well, [0, 1.9, 0], [2.05, .16, .25]); addBranch(well, [-.9, 1.9, 0], [0, 2.45, 0], .09, material('#85573d')); addBranch(well, [.9, 1.9, 0], [0, 2.45, 0], .09, material('#85573d')); add(box, material('#d26747'), well, [0, 2.46, 0], [1.45, .12, 1.05]);
  }
  // A timber fence frames the farm and keeps the play area readable.
  const sideGateRanges = [[-26, -23], [-21, -14], [-1, 8], [13, 21]];
  if (!sceneCustomized && place.id !== 'hutan') {
  for (const side of [-1, 1]) for (let i = 0; i < 25; i++) { const z = -25 + i * 2.1; if (sideGateRanges.some(([start, end]) => z >= start && z <= end)) continue; const x = side * 26; add(cyl, palette.brown, world, [x, .55, z], [.11, 1.1, .11]); if (i < 24 && !sideGateRanges.some(([start, end]) => z < end && z + 2.1 > start)) { add(box, palette.brown, world, [x, .35, z + 1.05], [.12, .12, 2.1]); add(box, palette.brown, world, [x, .78, z + 1.05], [.12, .12, 2.1]); } }
  for (const z of [-26, 26]) for (let x = -25; x <= 25; x += 2.1) { if (Math.abs(x) < 4.5) continue; add(cyl, palette.brown, world, [x, .55, z], [.11, 1.1, .11]); if (x < 24) { add(box, palette.brown, world, [x + 1.05, .35, z], [2.1, .12, .12]); add(box, palette.brown, world, [x + 1.05, .78, z], [2.1, .12, .12]); } }
  }
  // Volumetric tree meshes replace the old flat picture props.
  const homeModels = [];
  if (!sceneCustomized) {
  [[-21, 13, 1.25], [21, 15, 1.2], [-21, 7, .9], [22, -1, 1.1], [-22, -8, 1.1], [22, -11, 1.2], [-16, -22, 1.1], [16, -22, 1.25], [-12, 22, .9], [12, 22, .9], [-21, -17, .9], [10, 22, .95]].forEach(([x, z, size]) => makeTree(x, z, size));
  for (let i = 0; i < 28; i++) { const x = ((i * 37) % 17) - 8; const z = ((i * 23) % 23) - 11; if (Math.abs(x) < 5 && z > -8 && z < 5) continue; const shrub = add(new THREE.IcosahedronGeometry(1, 0), i % 3 ? palette.leaf : material('#75b84d'), world, [x, .35, z], [.34 + (i % 3) * .08, .44, .3]); shrub.rotation.y = i * .7; }
  // Small flower tufts and stepping stones soften the edges of the village path.
  for (let i = 0; i < 30; i++) { const side = i % 2 ? -1 : 1; const z = 12 - (i * 1.07) % 24; const x = side * (2.1 + (i % 4) * .22); if (Math.abs(z + 6) < 3 && x < 4) continue; for (let p = 0; p < 3; p++) { const fx = x + (p - 1) * .16; const fz = z + Math.sin(i + p) * .16; add(sphere, p % 2 ? palette.yellow : palette.coral, world, [fx, .14 + p * .015, fz], [.075, .065, .075]); } }
  // Solid Indonesian home meshes keep village buildings rotatable from every side.
  }
  if (!sceneCustomized) {
  const homeSites = place.id === 'desa' ? [[14.8,-12],[14.8,-8],[14.8,-2],[14.3,20]] : [[-15.2,-12],[14.8,-9],[-15.8,-8],[14.8,-2],[-15.5,13],[14.3,22],[-14.5,20],[14.3,-22]];
  for (let i = 0; i < homeSites.length; i++) {
    const [x, z] = homeSites[i];
    const house = createWorldAsset(THREE, 'house'); house.position.set(x, 0, z); house.scale.setScalar(1.45 + (i % 3) * .08); world.add(house); homeModels.push(house);
    if (place.id !== 'hutan') addCollider(x, z, 2, 1.7);
  }
  }
  function makeText(text, color = 'fff7df', background = '59784f') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 100; const ctx = canvas.getContext('2d'); ctx.fillStyle = `#${background}`; ctx.beginPath(); if (typeof ctx.roundRect === 'function') ctx.roundRect(2, 2, 508, 96, 22); else ctx.rect(2, 2, 508, 96); ctx.fill(); ctx.fillStyle = `#${color}`; ctx.font = '700 31px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 51);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })); sprite.scale.set(3.2, .62, 1); return sprite;
  }
  function addGableRoof(parent, width, depth, eaveY, ridgeY, color) {
    const half = width / 2; const depthHalf = depth / 2;
    const vertices = [
      -half,eaveY,-depthHalf, 0,ridgeY,-depthHalf, 0,ridgeY,depthHalf,
      -half,eaveY,-depthHalf, 0,ridgeY,depthHalf, -half,eaveY,depthHalf,
      0,ridgeY,-depthHalf, half,eaveY,-depthHalf, half,eaveY,depthHalf,
      0,ridgeY,-depthHalf, half,eaveY,depthHalf, 0,ridgeY,depthHalf,
    ];
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
    const roofMaterial = material(color.color.getHexString()); roofMaterial.side = THREE.DoubleSide; const roof = new THREE.Mesh(geometry, roofMaterial); roof.castShadow = true; roof.receiveShadow = true; parent.add(roof);
    const gableShape = new THREE.Shape(); gableShape.moveTo(-half, eaveY); gableShape.lineTo(half, eaveY); gableShape.lineTo(0, ridgeY); gableShape.closePath();
    const gableMaterial = material('#f5d49a'); gableMaterial.side = THREE.DoubleSide;
    const front = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), gableMaterial); front.position.z = depthHalf * .87; front.castShadow = true; parent.add(front);
    const back = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), gableMaterial); back.position.z = -depthHalf * .87; back.rotation.y = Math.PI; back.castShadow = true; parent.add(back);
  }
  function makeHuman(parent, options = {}) {
    const model = createHumanModel(THREE, options);
    parent.add(model.figure);
    return model;
  }
  function makeChicken(x, z, scale = 1, color = '#f5ebd5') {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); world.add(group);
    const feather = material(color, .9); const wing = material(color === '#f5ebd5' ? '#e7dac0' : '#be7952', .9); const comb = material('#d94f46'); const beak = material('#edaa45'); const eye = material('#332d28');
    add(sphere, feather, group, [0, .43, 0], [.31, .3, .42]);
    add(sphere, wing, group, [-.22, .46, .02], [.13, .17, .27], [0, 0, -.12]); add(sphere, wing, group, [.22, .46, .02], [.13, .17, .27], [0, 0, .12]);
    const head = new THREE.Group(); head.position.set(0, .72, .26); group.add(head);
    add(new THREE.CapsuleGeometry(.105, .12, 3, 7), feather, head, [0, .12, 0]); add(sphere, feather, head, [0, .27, .02], [.2, .19, .2]);
    add(cone, comb, head, [0, .46, .025], [.105, .18, .105]); add(cone, beak, head, [0, .24, .2], [.09, .12, .09], [Math.PI / 2, 0, 0]);
    add(sphere, eye, head, [-.13, .29, .13], [.035, .04, .03]); add(sphere, eye, head, [.13, .29, .13], [.035, .04, .03]);
    const legs = [];
    for (const side of [-1, 1]) { const leg = new THREE.Group(); leg.position.set(side * .13, .2, .02); group.add(leg); add(cyl, beak, leg, [0, -.07, 0], [.035, .2, .035]); add(box, beak, leg, [0, -.16, .1], [.18, .035, .2]); legs.push(leg); }
    for (let i = 0; i < 3; i++) add(cone, feather, group, [(i - 1) * .13, .58, -.39], [.09, .22, .09], [-.75, 0, (i - 1) * .3]);
    return { group, head, legs, peck: Math.random() * 6 };
  }
  function makeCat(x, z) {
    const group = new THREE.Group(); group.position.set(x, 0, z); world.add(group); const fur = material('#d48b52', .9); const pale = material('#f3d7a9', .9); const eye = material('#315d4c', .5);
    add(sphere, fur, group, [0, .38, -.03], [.24, .23, .52]);
    const head = new THREE.Group(); head.position.set(0, .57, .38); group.add(head); add(sphere, fur, head, [0, .08, 0], [.24, .23, .22]);
    add(cone, fur, head, [-.15, .29, .02], [.1, .27, .1], [0, 0, -.18]); add(cone, fur, head, [.15, .29, .02], [.1, .27, .1], [0, 0, .18]);
    add(sphere, pale, head, [-.08, .1, .19], [.035, .035, .025]); add(sphere, pale, head, [.08, .1, .19], [.035, .035, .025]);
    add(sphere, eye, head, [-.08, .13, .212], [.022, .03, .013]); add(sphere, eye, head, [.08, .13, .212], [.022, .03, .013]); add(cone, material('#df8f86'), head, [0, .025, .205], [.045, .05, .045], [Math.PI / 2, 0, 0]);
    const legs = [];
    for (const px of [-.15, .15]) for (const pz of [-.32, .3]) { const leg = new THREE.Group(); leg.position.set(px, .3, pz); group.add(leg); add(new THREE.CapsuleGeometry(.055, .2, 3, 6), fur, leg, [0, -.14, 0]); legs.push(leg); }
    const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .45, -.43), new THREE.Vector3(0, .7, -.62), new THREE.Vector3(0, .92, -.72), new THREE.Vector3(.02, 1.04, -.6)]); const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, .06, 7, false), fur); group.add(tail);
    return { group, head, legs, tail };
  }
  function makeGoat(x, z) {
    const group = new THREE.Group(); group.position.set(x, 0, z); world.add(group); const coat = material('#f1e9d5', .92); const brown = material('#8a6042', .9); const horn = material('#d8c59c', .8); const eye = material('#423930', .55);
    add(sphere, coat, group, [0, .64, 0], [.35, .34, .56]); add(sphere, coat, group, [0, .97, .4], [.27, .29, .27]);
    add(cone, coat, group, [-.22, 1.05, .42], [.1, .25, .09], [0, 0, -.5]); add(cone, coat, group, [.22, 1.05, .42], [.1, .25, .09], [0, 0, .5]);
    add(cone, horn, group, [-.14, 1.31, .36], [.08, .27, .08], [0, 0, -.22]); add(cone, horn, group, [.14, 1.31, .36], [.08, .27, .08], [0, 0, .22]);
    add(sphere, eye, group, [-.13, 1.01, .62], [.035, .045, .025]); add(sphere, eye, group, [.13, 1.01, .62], [.035, .045, .025]); add(cone, brown, group, [0, .73, .63], [.12, .2, .1]);
    const legs = [];
    for (const px of [-.22, .22]) for (const pz of [-.37, .35]) { const leg = new THREE.Group(); leg.position.set(px, .45, pz); group.add(leg); add(cyl, coat, leg, [0, -.22, 0], [.07, .42, .07]); add(cone, brown, leg, [0, -.45, .01], [.09, .16, .09]); legs.push(leg); }
    return { group, head: group, legs };
  }
  if (!sceneCustomized && place.id === 'hutan') {
    homeModels.forEach((house) => { house.visible = false; });
    for (let i = 0; i < 12; i++) { const a = i * 2.4; const x = Math.sin(a) * 10; const z = Math.cos(a) * 11 - 1; makeTree(x, z, 1.25 + (i % 3) * .12); }
    // The forest scene keeps the clearing and tree props open for wildlife.
  } else if (!sceneCustomized && place.id === 'desa') {
    // The village region gets irrigated rice plots and narrow earthen paths.
    for (let row = 0; row < 4; row++) {
      const z = -15 + row * 4.4;
      add(box, material(row % 2 ? '#56b9bd' : '#65c3c4', .45), world, [-16.5, .015, z], [10.5, .025, 3.25]);
      add(box, material('#baaa6d'), world, [-16.5, .045, z + 1.78], [11.2, .09, .32]);
      for (let col = 0; col < 13; col++) {
        const x = -21.2 + col * .78;
        add(cyl, material(col % 3 ? '#6d9c45' : '#86ad50'), world, [x, .27, z + ((col % 2) * .16)], [.045, .46 + (col % 3) * .06, .045]);
      }
    }
  } else if (!sceneCustomized && place.id === 'kota') {
    // A small public square marks the civic center of the first playable town.
    add(box, material('#c7b48a'), world, [0, .015, 10.8], [10, .05, 5.8]);
    for (const x of [-3.8, 3.8]) { add(cyl, material('#596a54'), world, [x, 1.45, 10.8], [.1, 2.9, .1]); add(sphere, material('#f4d783', .5), world, [x, 2.95, 10.8], [.24, .24, .24]); }
  } else if (!sceneCustomized && (place.type === 'kopdes' || place.type === 'pasar')) {
    for (let i = 0; i < 3; i++) { const stall = new THREE.Group(); stall.position.set(-5 + i * 5, 0, -2 + (i % 2) * 2); world.add(stall); addCollider(stall.position.x, stall.position.z, 1.42, 1.02); add(box, palette.brown, stall, [0, .72, 0], [2.5, 1.4, 1.7]); add(cone, i % 2 ? palette.yellow : palette.coral, stall, [0, 1.7, 0], [1.65, .8, 1.3]); for (let j = 0; j < 4; j++) add(sphere, j % 2 ? palette.red : palette.green, stall, [-.7 + j * .45, .9, .92], [.23, .23, .23]); }
  } else if (!sceneCustomized && place.type === 'dapur') {
    // The production kitchen is represented by the shared illustrated facility sprite.
  }
  // A neighbor with a human silhouette, face, hair, apron, and working clothes.
  const witnessPosition = place.id === 'desa' ? [-12.5, 0, 10] : place.id === 'hutan' ? [2.5, 0, -12] : [-9, 0, -3];
  const neighbor = new THREE.Group(); neighbor.position.set(witnessPosition[0], 0, witnessPosition[2]); neighbor.rotation.y = -.35; world.add(neighbor); addCollider(witnessPosition[0], witnessPosition[2], .5, .46);
  const neighborModel = makeHuman(neighbor, { shirt: '#df7853', apron: '#f2ca69', trousers: '#49627b', pack: '#8f5d3f', hair: '#302b2b' });
  const witnessLabel = makeText(place.witness, 'fff7df', '397f5c'); witnessLabel.position.set(witnessPosition[0], 2.25, witnessPosition[2]); world.add(witnessLabel);
  const npcCharacters = [{name:place.witness,root:neighbor,model:neighborModel,collider:colliders[colliders.length-1],icon:'☺',lines:[`Halo! Di ${place.name.toLowerCase()} ini, hal kecil sehari-hari sering jadi obrolan besar.`,`Saya tinggal di sini. Ada yang berubah minggu ini? Warga sedang ramai membicarakannya.`,`Jalan-jalan saja. Tidak ada misi yang harus diselesaikan.`],lineIndex:0}];
  const addNpc = (name, position, appearance, lines, route = null) => {
    const root=new THREE.Group();root.position.set(position[0],0,position[1]);world.add(root);
    const collider=addCollider(position[0],position[1],.42,.42,'npc');
    const model=makeHuman(root,{skin:appearance.skin||'#c9825c',hair:appearance.hair||'#292522',hairStyle:appearance.hairStyle||'pendek',shirt:appearance.shirt,trousers:appearance.trousers||'#40546b',topStyle:appearance.topStyle||'kemeja',bottomStyle:appearance.bottomStyle||'celana',headwear:appearance.headwear||'tanpa',accessory:appearance.accessory||'tanpa',pack:appearance.accessory==='ransel'?'#9d6948':null});
    const tag=makeText(name.toUpperCase(),'fffdf1','527b60');tag.position.set(0,2.22,0);root.add(tag);
    const npc={name,root,model,collider,icon:'♙',lines,lineIndex:0,path:route?.points?new THREE.CatmullRomCurve3(route.points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'catmullrom',.35):null,speed:route?.speed||0,phase:route?.phase||0};npcCharacters.push(npc);return npc;
  };
  addNpc('Bu Rani',[10,4],{skin:'#b87959',shirt:'#748c68',topStyle:'kebaya',bottomStyle:'rok',hairStyle:'kuncir',accessory:'selempang'},['Kalau harga kebutuhan naik, yang paling dulu terasa itu belanja dapur.','Kami biasa saling titip kabar di warung dekat jalan utama.','Fasilitas umum yang baik itu yang benar-benar dipakai warga.']);
  addNpc('Pak Jaya',[12,12],{skin:'#9c6447',shirt:'#d0a04c',topStyle:'batik',bottomStyle:'jeans',headwear:'peci',accessory:'map'},['Saya sedang menunggu angkutan. Jadwalnya kadang lebih misterius dari cuaca.','Pohon rindang dan trotoar nyaman bikin jalan kaki terasa lebih masuk akal.','Kalau ada usulan untuk lingkungan, sampaikan saat warga berkumpul.']);
  addNpc('Mbak Sari',[1,7],{skin:'#d39a72',shirt:'#be7180',topStyle:'kebaya',bottomStyle:'kulot',hairStyle:'kuncir',accessory:'jam'},['Saya suka lewat sini sore-sore. Suasananya bikin betah.','Warga punya pengalaman berbeda-beda; semuanya layak didengar.','Kabar dari grup warga cepat sekali, kadang lebih cepat dari motor.'],{speed:.026,phase:.13,points:[[1,7],[4,8],[4,11],[1,12],[-1,9]]});
  addNpc('Mas Arif',[-2,-2],{skin:'#ad7355',shirt:'#5f8094',topStyle:'jaket',bottomStyle:'cargo',hairStyle:'cepak',accessory:'ransel'},['Saya berangkat kerja lewat jalur ini hampir tiap hari.','Transportasi yang mudah dijangkau menghemat banyak waktu warga.','Sungai dan taman enak dilihat kalau sama-sama dijaga.'],{speed:.021,phase:.46,points:[[-2,-2],[1,-4],[4,-3],[3,0],[0,1]]});

  // Farm animals give the kitchen yard its own life and a clear village-RPG scale.
  const chickens = [makeChicken(9.4, -2.7, .86), makeChicken(11.7, -1.1, .72, '#b9784f'), makeChicken(8.5, .2, .78)];
  const cat = makeCat(-1.6, 5.3); const goat = makeGoat(13.3, -3.4);
  const roamingAnimals = [
    { animal: chickens[0], points: [[8.2,-4.4],[10.2,-3.8],[12.4,-4.1],[13.2,-2.0],[11.0,-.7],[8.5,-1.4]], speed: .045, phase: 0 },
    { animal: chickens[1], points: [[12.8,-4.3],[11.4,-2.8],[9.0,-3.0],[8.1,-1.1],[10.4,.6],[13.4,.1]], speed: .038, phase: .32 },
    { animal: chickens[2], points: [[8.4,.2],[9.2,-1.9],[11.3,-2.0],[13.5,-.5],[12.3,1.2],[9.6,1.1]], speed: .05, phase: .67 },
    { animal: cat, points: [[-2.5,5.3],[0.2,7.5],[3.0,6.2],[3.8,3.6],[1.3,2.8],[-1.8,3.8]], speed: .022, phase: .1 },
    { animal: goat, points: [[13.4,-4.6],[11.6,-4.0],[9.3,-3.8],[8.5,-1.5],[10.4,.4],[13.7,.2]], speed: .017, phase: .5 },
  ].map((entry) => ({ ...entry, collider:addCollider(entry.animal.group.position.x,entry.animal.group.position.z,.48,.55,'animal'), path: new THREE.CatmullRomCurve3(entry.points.map(([x,z]) => new THREE.Vector3(x,0,z)), true, 'catmullrom', .35) }));
  const penFence = material('#9b6945');
  function horizontalFence(x1, x2, z) { const length = x2 - x1; const middle = (x1 + x2) / 2; addCollider(middle, z, length / 2, .14); for (let x = x1; x <= x2 + .01; x += 1.45) { add(box, penFence, world, [x, .55, z], [.12, 1.1, .12]); } add(box, penFence, world, [middle, .37, z], [length, .12, .12]); add(box, penFence, world, [middle, .77, z], [length, .12, .12]); }
  function verticalFence(x, z1, z2) { const length = z2 - z1; const middle = (z1 + z2) / 2; addCollider(x, middle, .14, length / 2); for (let z = z1; z <= z2 + .01; z += 1.45) add(box, penFence, world, [x, .55, z], [.12, 1.1, .12]); add(box, penFence, world, [x, .37, middle], [.12, .12, length]); add(box, penFence, world, [x, .77, middle], [.12, .12, length]); }
  if (!sceneCustomized && place.id !== 'hutan') { horizontalFence(7.2, 15.1, -5.5); verticalFence(7.2, -5.5, 2); verticalFence(15.1, -5.5, 2); horizontalFence(7.2, 10.15, 2); horizontalFence(12.1, 15.1, 2); }
  const destinationSigns = [];
  const signsForRegion = { kota: [[22.5,18.5,'TAMAN KOTA','377752'],[23,4,'KOPDES WARGA','a76a42'],[23,-22,'PASAR SORE','c65d4b'],[0,22,'ALUN-ALUN REPUBLIK','557950'],[-22.5,4,'DAPUR MBG','5b8e4c']], desa: [[22.5,18.5,'KEBUN WARGA','377752'],[23,4,'KOPERASI DESA','a76a42'],[23,-22,'LUMBUNG PANGAN','c65d4b'],[0,22,'BALAI DESA','557950'],[-22.5,4,'SAWAH','5b8e4c']], hutan: [[22.5,18.5,'JALUR HUTAN','377752'],[23,4,'SUMBER AIR','a76a42'],[23,-22,'POS JAGA','c65d4b'],[0,22,'BATAS WILAYAH','557950'],[-22.5,4,'AREA RAWAN','5b8e4c']] };
  for (const [x, z, label, signColor] of (sceneCustomized ? [] : (signsForRegion[place.id] || signsForRegion.kota))) {
    const post = new THREE.Group(); post.position.set(x, 0, z); world.add(post); addCollider(x, z, .24, .24); add(cyl, material('#785039'), post, [0, .9, 0], [.09, 1.8, .09]); const plaque = add(box, material('#785039'), post, [0, 1.63, 0], [2.1, .5, .16]); plaque.rotation.y = x < -5 ? .4 : x > 5 ? -.4 : 0; const labelSprite = makeText(label, 'fff8e6', signColor); labelSprite.position.set(0, 1.67, .1); labelSprite.scale.set(1.8, .34, 1); post.add(labelSprite); destinationSigns.push({ x, z, label });
  }
  const placedAnimals = [];
  for (const entity of placedObjects) {
    let object;
    try { object = createWorldAsset(THREE, entity.type, entity); }
    catch (error) { console.error(`Object dunia gagal dirender (${entity.type}, ${entity.id}):`, error); continue; }
    if (!object) continue;
    object.position.set(entity.x, 0, entity.z); object.rotation.y = (entity.rotation || 0) * Math.PI / 180; object.scale.setScalar(entity.scale || 1); object.userData.sceneObjectId = entity.id; world.add(object);
    if (['chicken','duck','goat','cow','buffalo','cat','dog'].includes(entity.type)) {
      const animalSize={chicken:.46,duck:.48,goat:.68,cow:.82,buffalo:.92,cat:.5,dog:.62}[entity.type]*(entity.scale||1);
      placedAnimals.push({ object, x: entity.x, z: entity.z, phase: placedAnimals.length * 1.7, collider:addCollider(entity.x,entity.z,animalSize,animalSize,'animal') });
    }
    if (entity.type === 'river' || entity.type === 'bridge') {
      const length=(entity.length||9)/2*(entity.scale||1); const width=(entity.width||3)/2*(entity.scale||1); const angle=(entity.rotation||0)*Math.PI/180;
      addCollider(entity.x,entity.z,Math.abs(Math.cos(angle))*length+Math.abs(Math.sin(angle))*width,Math.abs(Math.sin(angle))*length+Math.abs(Math.cos(angle))*width,entity.type);
    }
    if (['house','house_village','house_mid','house_luxury','school','school_ruined','school_good','mbg','sppg','kopdes','market','hall','office','dpr_mpr','istana_negara','rice_field','crop_field','car','car_economy','car_family','car_luxury','pickup','truck','bus','motorcycle','tractor','hand_tractor','combine_harvester','tree','tree_canopy','forest','forest_lush','forest_burned','lamp'].includes(entity.type)) {
      const dimensions = { house: [3.4, 2.8], house_village: [4.1, 4.6], house_mid: [4.7, 4.1], house_luxury: [4.8, 4.8], school: [3.6, 2.5], school_ruined: [7.0, 6.0], school_good: [9.6, 5.0], mbg: [4.2, 3], sppg: [10.4, 6.1], kopdes: [8.8, 4.8], market: [5.1, 4.2], hall: [5.2, 4.6], office: [5.9, 5.4], dpr_mpr: [12.7, 10.6], istana_negara: [12.2, 9.2], rice_field: [5.4, 4.9], crop_field: [5.4, 4.9], car: [2.15, 1.1], car_economy: [1.95, 1.1], car_family: [2.45, 1.2], car_luxury: [2.65, 1.2], pickup: [2.2, 1.1], truck: [3.85, 1.3], bus: [4.4, 1.4], motorcycle: [1.15, .7], tractor: [2.3, 1.2], hand_tractor: [1.8, .9], combine_harvester: [3.1, 1.7], tree: [.55, .55], tree_canopy: [.7, .7], forest: [.7, .7], forest_lush: [2.6, 2.4], forest_burned: [2.6, 2.4], lamp: [.25, .25] }[entity.type];
      const scale = entity.scale || 1; const angle = (entity.rotation || 0) * Math.PI / 180;
      addCollider(entity.x, entity.z, Math.abs(Math.cos(angle)) * dimensions[0] * scale + Math.abs(Math.sin(angle)) * dimensions[1] * scale, Math.abs(Math.sin(angle)) * dimensions[0] * scale + Math.abs(Math.cos(angle)) * dimensions[1] * scale);
    }
  }
  const player = new THREE.Group();
  const savedPosition = savedState.location === place.type && savedState.playerPosition ? savedState.playerPosition : null;
  player.position.set(savedPosition && Number.isFinite(savedPosition.x) ? savedPosition.x : 0, 0, savedPosition && Number.isFinite(savedPosition.z) ? savedPosition.z : 18); world.add(player);
  let playerModel = null; let person = null; let legs = []; let arms = []; let playerNameTag = null;
  const refreshPlayerModel = (citizen) => {
    if (playerModel) { const previousFigure = playerModel.figure; player.remove(previousFigure); previousFigure.traverse((node) => { if (!node.userData.sharedCharacterGeometry) node.geometry?.dispose(); if (Array.isArray(node.material)) node.material.forEach((item) => { if (!item.userData.sharedCharacterTexture) item.map?.dispose(); item.dispose(); }); else if (node.material) { if (!node.material.userData.sharedCharacterTexture) node.material.map?.dispose(); node.material.dispose(); } }); }
    const look = avatarLooks[citizen?.avatar] || avatarLooks.warga;
    const savedLook = parsedAvatarConfig(citizen?.avatar_config);
    playerModel = makeHuman(player, { ...citizenCharacterOptions(citizen, look), role: citizen?.account_type === 'admin' && !savedLook ? 'pemimpin' : undefined });
    person = playerModel.figure; legs = playerModel.legs; arms = playerModel.arms;
    if (citizen) { playerNameTag = makeText(`${citizen.account_type === 'admin' ? 'ADMIN' : 'WARGA'} · ${citizen.display_name.toUpperCase()}`, '263746', citizen.account_type === 'admin' ? 'ffd166' : 'b9e5c9'); playerNameTag.scale.set(2.15, .38, 1); playerNameTag.position.set(0, 2.28, 0); person.add(playerNameTag); }
  };
  const animateCharacter = (model, moving, dt) => {
    if (!model?.mixer || !model.actions) return false;
    const nextName = moving && model.actions.Walk ? 'Walk' : model.actions.Idle ? 'Idle' : null;
    if (nextName && model.activeAction !== nextName) {
      model.actions[model.activeAction]?.fadeOut(.14);
      model.actions[nextName].reset().fadeIn(.14).play();
      model.activeAction = nextName;
    }
    model.mixer.update(dt);
    return !!nextName;
  };
  refreshPlayerModel(activeCitizen);
  updateWilderness(player.position.x, player.position.z);
  player.visible = !!activeCitizen;
  window.addEventListener('semesta:citizen-change', (event) => {
    const citizen = event.detail?.citizen || null;
    player.visible = !!citizen;
    refreshPlayerModel(citizen);
  });

  const onlineCitizens = new Map(); let nearbyCitizens = []; let chatTarget = null; let chatCanSend = false; let chatAfterId = 0; let lastChatSync = 0; let chatSyncInFlight = false; let firstCitizenSync = true;
  const chatPanel = $('#citizenChat'); const chatLog = $('#citizenChatLog'); const chatInput = $('#citizenChatForm').elements.message;
  const paletteForCitizen = (avatar) => avatarLooks[avatar] || avatarLooks.warga;
  function removeOnlineCitizen(id) {
    const item = onlineCitizens.get(id); if (!item) return;
    world.remove(item.root); item.root.traverse((node) => { if (!node.userData.sharedCharacterGeometry) node.geometry?.dispose(); if (Array.isArray(node.material)) node.material.forEach((mat) => { if (!mat.userData.sharedCharacterTexture) mat.map?.dispose(); mat.dispose(); }); else if (node.material) { if (!node.material.userData.sharedCharacterTexture) node.material.map?.dispose(); node.material.dispose(); } }); onlineCitizens.delete(id);
  }
  function updateOnlineCitizens(players) {
    nearbyCitizens = players;
    const present = new Set(players.map((peer) => peer.id));
    [...onlineCitizens.keys()].forEach((id) => { if (!present.has(id)) removeOnlineCitizen(id); });
    let newArrival = null;
    players.forEach((peer) => {
      let item = onlineCitizens.get(peer.id);
      const appearanceKey = JSON.stringify([peer.avatar, peer.avatar_config, peer.displayName]);
      if (item && item.appearanceKey !== appearanceKey) { removeOnlineCitizen(peer.id); item=null; }
      if (!item) {
        const root = new THREE.Group(); root.position.set(peer.x, 0, peer.z); world.add(root);
        const look = paletteForCitizen(peer.avatar); const model = makeHuman(root, citizenCharacterOptions(peer, look));
        const tag = makeText(peer.displayName.toUpperCase(), 'fffdf1', '347b68'); tag.position.set(0, 2.32, 0); root.add(tag);
        item = { root, model, displayName:peer.displayName, avatar:peer.avatar, appearanceKey }; onlineCitizens.set(peer.id, item); if (!firstCitizenSync) newArrival = peer.displayName;
      }
      item.root.userData.targetX = peer.x; item.root.userData.targetZ = peer.z; item.root.userData.peerId = peer.id;
    });
    if (newArrival) toast(`${newArrival} baru bergabung di wilayah ini · dekati dan tekan BICARA.`);
    firstCitizenSync = false;
  }
  function appendChatMessage(message) {
    if (chatLog.querySelector(`[data-message-id="${Number(message.id)||0}"]`)) return;
    const empty = chatLog.querySelector('.citizen-chat-empty'); empty?.remove();
    const bubble = document.createElement('article'); bubble.dataset.messageId = String(Number(message.id)||0); bubble.className = `citizen-chat-message${Number(message.sender_id) === Number(activeCitizen?.id) ? ' mine' : ''}`;
    const sender = document.createElement('b'); sender.textContent = Number(message.sender_id) === Number(activeCitizen?.id) ? 'KAMU' : (message.sender_name || chatTarget?.displayName || 'WARGA');
    const text = document.createElement('span'); text.textContent = message.message;
    bubble.append(sender, text); chatLog.append(bubble); chatLog.scrollTop = chatLog.scrollHeight;
  }
  async function syncCitizenChat(now = performance.now()) {
    if (!activeCitizen || chatSyncInFlight || now - lastChatSync < 1700) return;
    chatSyncInFlight = true; lastChatSync = now;
    try {
      const response = await fetch(`${API_URL}`, { method:'POST', headers:{'Content-Type':'application/json',Accept:'application/json'}, body:JSON.stringify({resource:'citizen_chat',action:'sync',destination:city.id,region:place.id,x:player.position.x,z:player.position.z,targetId:chatTarget?.id || 0,after:chatAfterId}) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Obrolan warga belum tersambung.');
      updateOnlineCitizens(Array.isArray(result.players) ? result.players : []); chatCanSend = !!result.canChat;
      (result.messages || []).forEach((message) => { appendChatMessage(message); chatAfterId = Math.max(chatAfterId, Number(message.id) || 0); });
      if (chatTarget && chatPanel && !chatPanel.hidden) {
        $('#citizenChatStatus').textContent = chatCanSend ? 'Kalian berdekatan · pesan masuk langsung.' : 'Dekati lagi warga ini untuk melanjutkan obrolan.';
        $('#citizenChatStatus').classList.toggle('error', !chatCanSend);
        $('#citizenChatForm').querySelector('button').disabled = !chatCanSend;
      }
    } catch (error) {
      if (error.name !== 'AbortError' && chatPanel && !chatPanel.hidden) { $('#citizenChatStatus').textContent = error.message; $('#citizenChatStatus').classList.add('error'); }
    } finally { chatSyncInFlight = false; }
  }
  function nearestOnlineCitizen() {
    let nearest = null; let distance = 5;
    for (const peer of nearbyCitizens) { const next = Math.hypot(player.position.x - peer.x, player.position.z - peer.z); if (next < distance) { nearest = peer; distance = next; } }
    return nearest;
  }
  function openCitizenChat(peer) {
    if (!activeCitizen) { $('#profileButton').click(); return; }
    chatTarget = peer; chatAfterId = 0; chatCanSend = false; chatLog.replaceChildren();
    $('#citizenChatName').textContent = peer.displayName; $('#citizenChatStatus').textContent = 'Mendekat untuk mulai bertukar pesan.'; $('#citizenChatStatus').classList.remove('error'); $('#citizenChatForm').querySelector('button').disabled = true;
    $('#dialogue').classList.remove('visible'); chatPanel.hidden = false; lastChatSync = 0; syncCitizenChat(performance.now()); chatInput.focus({ preventScroll:true });
  }
  $('#citizenChatClose').addEventListener('click', () => { chatPanel.hidden = true; chatTarget = null; chatCanSend = false; chatAfterId = 0; });
  $('#citizenChatForm').addEventListener('submit', async (event) => {
    event.preventDefault(); if (!chatTarget || !chatCanSend || !chatInput.value.trim()) return;
    const message = chatInput.value.trim(); const sendButton = $('#citizenChatForm').querySelector('button'); sendButton.disabled = true;
    try {
      const response = await fetch(`${API_URL}`, { method:'POST', headers:{'Content-Type':'application/json',Accept:'application/json'}, body:JSON.stringify({resource:'citizen_chat',action:'send',destination:city.id,region:place.id,targetId:chatTarget.id,message}) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Pesan belum terkirim.');
      appendChatMessage(result.message); chatAfterId = Math.max(chatAfterId, Number(result.message.id) || 0); chatInput.value = ''; $('#citizenChatStatus').textContent = 'Pesan terkirim.'; $('#citizenChatStatus').classList.remove('error');
    } catch (error) { $('#citizenChatStatus').textContent = error.message; $('#citizenChatStatus').classList.add('error'); }
    finally { sendButton.disabled = !chatCanSend; chatInput.focus({ preventScroll:true }); }
  });
  window.addEventListener('semesta:citizen-change', (event) => {
    if (!event.detail?.citizen) { fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resource:'citizen_chat',action:'leave'})}).catch(()=>{}); chatPanel.hidden=true;chatTarget=null;nearbyCitizens=[];[...onlineCitizens.keys()].forEach(removeOnlineCitizen); }
  });

  if (!sceneCustomized && place.id !== 'hutan') for (let row = 0; row < 2; row++) for (let column = 0; column < 4; column++) {
    const x = 7 + column * 1.65; const z = 16 + row * 1.3; const crop = new THREE.Group(); crop.position.set(x, 0, z); world.add(crop);
    add(box, palette.soil, crop, [0, .06, 0], [1.2, .13, .95]); add(box, palette.path, crop, [0, .13, 0], [1.08, .035, .78]);
    add(cyl, palette.leaf, crop, [0, .36, 0], [.07, .42, .07]);
    for (let leaf = 0; leaf < 4; leaf++) add(sphere, palette.leaf, crop, [Math.cos(leaf * 1.57) * .18, .39 + (leaf % 2) * .08, Math.sin(leaf * 1.57) * .18], [.19, .07, .1], [0, leaf * 1.57, -.25]);
  }
  let emptySceneFrames = 0; let yaw = Number.isFinite(savedState.cameraYaw) ? savedState.cameraYaw : 0; let pitch = Number.isFinite(savedState.cameraPitch) ? clamp(savedState.cameraPitch, .3, 1.3) : .78; let last = performance.now(); let lastStateSave = 0; let toastTimer; const keys = new Set(); const stick = { x: 0, y: 0, active: false };
  function showDialogue(speaker, line, icon = '✳') { $('#speakerName').textContent = speaker.toUpperCase(); $('#dialogueText').textContent = line; $('#speakerBadge').textContent = icon; $('#dialogue').classList.add('visible'); }
  function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600); }
  function nearestSign() { let pick = null; let distance = 1.65; for (const sign of destinationSigns) { const d = Math.hypot(player.position.x - sign.x, player.position.z - sign.z); if (d < distance) { pick = sign; distance = d; } } return pick; }
  function nearestNpc() { let nearest=null;let distance=3.8;for(const npc of npcCharacters){const next=Math.hypot(player.position.x-npc.root.position.x,player.position.z-npc.root.position.z);if(next<distance){nearest=npc;distance=next;}}return nearest; }
  function talk() {
    const citizen = nearestOnlineCitizen();
    if (citizen) { openCitizenChat(citizen); return; }
    const npc=nearestNpc();
    if (npc) { const line=npc.lines[npc.lineIndex%npc.lines.length];npc.lineIndex++;showDialogue(npc.name,line,npc.icon);return; }
    const sign = nearestSign();
    if (sign) { showDialogue('PENUNJUK JALAN', `Dari sini kamu bisa menuju ${sign.label}. Jelajahi sesukamu.`, '↗'); return; }
    toast('Jelajahi bebas. Dekati warga untuk mengobrol.');
  }
  $('#talkButton').onclick = talk; $('#dialogueNext').onclick = () => $('#dialogue').classList.remove('visible');
  $('#captureButton').onclick = () => document.body.classList.add('capture-mode'); $('#exitCapture').onclick = () => document.body.classList.remove('capture-mode');
  const changeZoom = (amount) => { cameraDistance = clamp(cameraDistance + amount, 13, 34); saveGameState({ cameraZoom: cameraDistance }); };
  $('#zoomIn').onclick = () => changeZoom(-2);
  $('#zoomOut').onclick = () => changeZoom(2);
  $('#exploreScreen').addEventListener('wheel', (event) => { event.preventDefault(); changeZoom(event.deltaY > 0 ? 2 : -2); }, { passive: false });
  // Drag the 3D world to orbit the camera; pinch and wheel adjust zoom.
  const orbitPointers = new Map(); let pinchDistance = 0;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (event) => {
    orbitPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (orbitPointers.size === 2) { const points = [...orbitPointers.values()]; pinchDistance = Math.hypot(points[0].x-points[1].x, points[0].y-points[1].y); }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!orbitPointers.has(event.pointerId)) return;
    const previous = orbitPointers.get(event.pointerId); orbitPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (orbitPointers.size > 1) {
      const points = [...orbitPointers.values()]; const distance = Math.hypot(points[0].x-points[1].x, points[0].y-points[1].y);
      if (pinchDistance) { cameraDistance = clamp(cameraDistance - (distance-pinchDistance)*.045, 13, 34); }
      pinchDistance = distance;
    } else { yaw -= (event.clientX-previous.x)*.008; pitch = clamp(pitch+(event.clientY-previous.y)*.006, .3, 1.3); }
  });
  const stopOrbit = (event) => { orbitPointers.delete(event.pointerId); if (orbitPointers.size < 2) pinchDistance = 0; };
  canvas.addEventListener('pointerup', stopOrbit); canvas.addEventListener('pointercancel', stopOrbit); canvas.addEventListener('lostpointercapture', stopOrbit);
  window.onkeydown = (event) => { if (isTypingTarget(event.target)) return; if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) { keys.add(event.code); event.preventDefault(); } if (event.code === 'KeyE' || event.code === 'Space') talk(); if (event.code === 'Escape') document.body.classList.remove('capture-mode'); };
  window.onkeyup = (event) => keys.delete(event.code);
  const joystick = $('#joystick'); const knob = $('#joystickKnob');
  if (joystick) {
    let activePointer = null;
    const moveStick = (event) => { const rect = joystick.getBoundingClientRect(); let x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2; const limit=rect.width*.34,distance=Math.hypot(x,y); if(distance>limit){x*=limit/distance;y*=limit/distance;}stick.x=x/limit;stick.y=y/limit;knob.style.transform=`translate(${x}px,${y}px)`; };
    const releaseStick = () => { activePointer=null;stick.x=stick.y=0;knob.style.transform='translate(0,0)'; };
    joystick.addEventListener('pointerdown',(event)=>{event.preventDefault();activePointer=event.pointerId;joystick.setPointerCapture(event.pointerId);moveStick(event);});
    joystick.addEventListener('pointermove',(event)=>{if(activePointer===event.pointerId)moveStick(event);});
    joystick.addEventListener('pointerup',releaseStick);joystick.addEventListener('pointercancel',releaseStick);joystick.addEventListener('lostpointercapture',releaseStick);
  }
  window.addEventListener('blur',()=>{keys.clear();if(knob)knob.style.transform='translate(0,0)';stick.x=stick.y=0;});
  function collides(x, z, ignore = null) {
    const radius = ignore?.kind === 'animal' ? .16 : .38;
    const overlaps = (item) => Math.abs(x-item.x) <= item.halfX + radius && Math.abs(z-item.z) <= item.halfZ + radius;
    const inRiver = colliders.some((item) => item.kind === 'river' && overlaps(item));
    const onBridge = colliders.some((item) => item.kind === 'bridge' && overlaps(item));
    if (inRiver && !onBridge) return true;
    return colliders.some((item) => {
      if (item === ignore || item.kind === 'river' || item.kind === 'bridge') return false;
      const dx = Math.max(Math.abs(x - item.x) - item.halfX, 0);
      const dz = Math.max(Math.abs(z - item.z) - item.halfZ, 0);
      return dx * dx + dz * dz < radius * radius;
    });
  }
  if (collides(player.position.x, player.position.z)) player.position.set(0, 0, 18);
  function frame(now) { if (!$('#exploreScreen').classList.contains('active')) { renderer.dispose(); return; } requestAnimationFrame(frame); const dt = Math.min((now - last) / 1000, .04); last = now; let x = stick.x; let z = stick.y; if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1; if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1; const length = Math.hypot(x, z); if (length > .1) { x /= Math.max(1, length); z /= Math.max(1, length); const moveX = x * Math.cos(yaw) + z * Math.sin(yaw); const moveZ = -x * Math.sin(yaw) + z * Math.cos(yaw); const nextX = player.position.x + moveX * 4.1 * dt; const nextZ = player.position.z + moveZ * 4.1 * dt; if (!collides(nextX, nextZ)) { player.position.x = nextX; player.position.z = nextZ; } else { if (!collides(nextX, player.position.z)) player.position.x = nextX; if (!collides(player.position.x, nextZ)) player.position.z = nextZ; } player.rotation.y = Math.atan2(moveX, moveZ); const step = Math.sin(now * .012); person.position.y = .025 + Math.abs(step) * .055; if (!animateCharacter(playerModel, true, dt)) { legs[0].rotation.x = step * .38; legs[1].rotation.x = -step * .38; arms[0].rotation.x = -step * .26; arms[1].rotation.x = step * .26; } } else { person.position.y = THREE.MathUtils.damp(person.position.y, 0, 5, dt); if (!animateCharacter(playerModel, false, dt)) { legs.forEach((leg) => { leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, 0, 7, dt); }); arms.forEach((arm) => { arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, 0, 7, dt); }); } }
    if (activeCitizen && now - lastChatSync > 1700) syncCitizenChat(now);
    onlineCitizens.forEach((item) => { const dx = item.root.userData.targetX - item.root.position.x; const dz = item.root.userData.targetZ - item.root.position.z; item.root.position.x += dx * Math.min(1, dt * 10); item.root.position.z += dz * Math.min(1, dt * 10); if (Math.hypot(dx, dz) > .02) item.root.rotation.y = Math.atan2(dx, dz); animateCharacter(item.model, Math.hypot(dx, dz) > .02, dt); });
    const groundX = Math.round(player.position.x / 400) * 400; const groundZ = Math.round(player.position.z / 400) * 400; endlessGround.position.set(groundX, -.08, groundZ); updateWilderness(player.position.x, player.position.z); sun.position.set(player.position.x - 10, 22, player.position.z + 14); sun.target.position.set(player.position.x, 0, player.position.z);
    const orbitRadius = cameraDistance; const horizontal = Math.cos(pitch) * orbitRadius;
    const cam = new THREE.Vector3(Math.sin(yaw) * horizontal, Math.sin(pitch) * orbitRadius, Math.cos(yaw) * horizontal); camera.position.set(player.position.x + cam.x, cam.y, player.position.z + cam.z); camera.lookAt(player.position.x - Math.sin(yaw) * 1.2, .8, player.position.z - Math.cos(yaw) * 1.2);
    roamingAnimals.forEach(({ animal, path, speed, phase, collider }) => { const t = (now * speed * .001 + phase) % 1; const point = path.getPointAt(t); const tangent = path.getTangentAt(t); if(!collides(point.x,point.z,collider)){animal.group.position.set(point.x, .025 + Math.abs(Math.sin(now * .006 + phase * 9)) * .025, point.z);collider.x=point.x;collider.z=point.z;} if (Math.hypot(tangent.x, tangent.z) > .01) animal.group.rotation.y = Math.atan2(tangent.x, tangent.z); animal.legs?.forEach((leg, i) => { leg.rotation.x = Math.sin(now * .012 * (speed / .04) + phase * 8 + i * Math.PI) * .18; }); animal.head.rotation.x = animal.peck !== undefined ? Math.max(0, Math.sin(now * .0018 + animal.peck)) * .3 : 0; }); cat.tail.rotation.y = Math.sin(now * .002) * .24; cat.head.rotation.y = Math.sin(now * .0012) * .12; goat.head.rotation.x = Math.sin(now * .0015) * .06;
    placedAnimals.forEach(({ object, x, z, phase, collider }) => { const pace = now * .0005 + phase; const nextX=x+Math.cos(pace)*1.4;const nextZ=z+Math.sin(pace*.8)*1.1;if(!collides(nextX,nextZ,collider)){object.position.x=nextX;object.position.z=nextZ;collider.x=nextX;collider.z=nextZ;object.rotation.y=-Math.atan2(Math.sin(pace*.8)*.9,Math.sin(pace));} });
    npcCharacters.forEach((npc)=>{let moving=false;if(npc.path){const t=(now*npc.speed*.001+npc.phase)%1;const point=npc.path.getPointAt(t);const tangent=npc.path.getTangentAt(t);if(!collides(point.x,point.z,npc.collider)){npc.root.position.x=point.x;npc.root.position.z=point.z;npc.collider.x=point.x;npc.collider.z=point.z;moving=Math.hypot(tangent.x,tangent.z)>.01;if(moving)npc.root.rotation.y=Math.atan2(tangent.x,tangent.z);}}animateCharacter(npc.model,moving,dt);});
    if (now - lastStateSave > 450) { saveGameState({ screen: 'explore', destination: city.id, location: place.type, playerPosition: { x: player.position.x, z: player.position.z }, cameraYaw: yaw, cameraPitch: pitch, cameraZoom: cameraDistance }); lastStateSave = now; }
    const nearbyNpc=nearestNpc();const nearbyCitizen = nearestOnlineCitizen(); const nearSign = !!nearestSign(); $('#interactionHint').textContent = nearbyCitizen ? `TEKAN E / BICARA DENGAN ${nearbyCitizen.displayName.toUpperCase()}` : nearbyNpc ? `TEKAN E / BICARA DENGAN ${nearbyNpc.name.toUpperCase()}` : nearSign ? 'TEKAN E / LIHAT PENUNJUK JALAN' : 'JELAJAHI BEBAS · TEMUI WARGA'; $('#interactionHint').classList.toggle('nearby', !!nearbyCitizen || !!nearbyNpc || nearSign); renderer.render(scene, camera); emptySceneFrames = renderer.info.render.calls === 0 ? emptySceneFrames + 1 : 0; if (emptySceneFrames === 30) reportWorldIssue("Kamera tidak menemukan objek 3D. Muat ulang halaman atau cek dukungan WebGL browser."); }
  requestAnimationFrame(frame); window.onresize = resizeGame;
  if (!savedPosition) setTimeout(() => toast('Jelajah bebas tanpa batas. Terus berjalan, wilayah akan berlanjut.'), 500);
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

async function initAvatarStudio() {
  const canvas = $('#avatarPreviewCanvas'); if (!canvas) return;
  const form = $('#avatarOptionsForm'); const catalog = $('#avatarCatalog'); const status = $('#avatarSaveStatus');
  const studio=canvas.closest('.avatar-studio'),preview=canvas.closest('.avatar-preview-card'),catalogPanel=catalog.closest('.avatar-catalog-card');
  const workbench=document.createElement('div');workbench.className='avatar-workbench';
  const tabs=document.createElement('div');tabs.className='avatar-workbench-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Panel Studio Avatar');
  const panels=document.createElement('div');panels.className='avatar-workbench-panels';
  catalogPanel.id='avatarCatalogPanel';panels.append(catalogPanel,form);workbench.append(tabs,panels);studio.append(workbench);
  const studioTabs=[['Koleksi avatar',catalogPanel],['Racik & simpan',form]].map(([label,panel],index)=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;button.id=`avatarStudioTab${index}`;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);
    panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);tabs.append(button);
    button.addEventListener('click',()=>selectStudioTab(index));
    button.addEventListener('keydown',event=>{const next=event.key==='ArrowRight'?(index+1)%2:event.key==='ArrowLeft'?(index+1)%2:event.key==='Home'?0:event.key==='End'?1:null;if(next!==null){event.preventDefault();selectStudioTab(next);studioTabs[next].button.focus();}});
    return {button,panel};
  });
  function selectStudioTab(index){studioTabs.forEach(({button,panel},i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;panel.hidden=i!==index;});panels.scrollTop=0;}
  selectStudioTab(0);
  const options = {
    skin: [['sawo','Sawo matang'],['kuning','Kuning langsat'],['gelap','Gelap'],['zaitun','Zaitun'],['pucat','Terang'],['coklat','Cokelat']],
    hair: [['pendek','Pendek'],['cepak','Cepak'],['ikal','Ikal'],['panjang','Panjang'],['keriting','Keriting'],['kuncir','Kuncir'],['hijab','Hijab'],['botak','Botak']],
    hairColor: [['hitam','Hitam'],['coklat','Cokelat'],['coklat-tua','Cokelat tua'],['pirang','Pirang'],['uban','Uban'],['merah','Merah marun']],
    top: [['kemeja','Kemeja'],['flanel','Kemeja flanel kotak'],['batik','Batik'],['seragam','Seragam'],['jaket','Jaket'],['hoodie','Hoodie'],['jas','Jas warga'],['kaos','Kaos'],['kebaya','Kebaya'],['petani','Pakaian tani'],['pekerja','Rompi kerja'],['koko','Baju koko'],['rompi','Rompi warga']],
    bottom: [['celana','Celana panjang'],['jeans','Jins'],['cargo','Celana kargo'],['sarung','Sarung'],['rok','Rok'],['pendek','Celana pendek'],['kulot','Kulot']],
    headwear: [['tanpa','Tanpa penutup'],['peci','Peci'],['topi','Topi lapangan'],['helm','Helm'],['bandana','Ikat kepala'],['caping','Caping']],
    accessory: [['tanpa','Tanpa aksesori'],['kacamata','Kacamata'],['ransel','Ransel'],['tas-anyaman','Tas anyaman silang'],['lencana','Lencana'],['selempang','Tas selempang'],['syal','Syal'],['map','Map warga'],['jam','Jam tangan']],
    facialHair: [['tanpa','Tanpa kumis/janggut'],['kumis','Kumis'],['kumis-janggut','Kumis dan janggut']],
  };
  const colors = { skin:{sawo:'#c9825c',kuning:'#e0a477',gelap:'#75472f',zaitun:'#ad7052',pucat:'#f0c29b',coklat:'#985c3e'}, hairColor:{hitam:'#292522',coklat:'#51362d','coklat-tua':'#35251f',pirang:'#bd8c49',uban:'#aaa9a2',merah:'#74382d'}, top:{kemeja:'#e6e0cd',flanel:'#455f82',batik:'#a34c3e',seragam:'#527aa3',jaket:'#537a64',hoodie:'#617b91',jas:'#44566b',kaos:'#d99445',kebaya:'#b66c78',petani:'#77844d',pekerja:'#dfae40',koko:'#e9e4d7',rompi:'#3a827b'}, bottom:{celana:'#314256',jeans:'#41658b',cargo:'#586746',sarung:'#9c674f',rok:'#563e54',pendek:'#536a52',kulot:'#705b52'} };
  // Open with the new harvest-life-sim farmer so the reference is visible immediately.
  const defaults = {...FARMER_PRESETS[0].config};
  for (const [key, values] of Object.entries(options)) { const select = form.elements[key]; select.innerHTML = values.map(([value,label]) => `<option value="${value}">${label}</option>`).join(''); select.value = defaults[key]; }
  const comboCount = Object.values(options).reduce((sum, list) => sum * list.length, 1);
  $('#avatarComboCount').textContent = `${comboCount.toLocaleString('id-ID')}+`;
  $('#avatarPresetName').value=FARMER_PRESETS[0].name; $('#avatarPreviewName').textContent=FARMER_PRESETS[0].name;
  let THREE, renderer, scene, camera, model, presets = [], activeSpecial = '', yaw = .35, pitch = .08, distance = 4.7, pointer = null;
  const farmerEditor = mountFarmerEditor(form, () => showConfig(chosen()));
  let thumbnailService=null;
  const studioModel = $('#avatarStudioModel');
  const modelLabel = studioModel.closest('label'); form.prepend(modelLabel);
  const quickLabel=document.createElement('label');quickLabel.className='avatar-name-field';quickLabel.textContent='Mulai dari avatar siap pakai';
  const quickPreset=document.createElement('select');quickPreset.id='avatarQuickPreset';quickPreset.add(new Option('Pilih racikan V11…',''));
  FARMER_PRESETS.forEach(preset=>quickPreset.add(new Option(preset.name,preset.id)));quickLabel.append(quickPreset);
  const switcher=document.createElement('div');switcher.className='avatar-quick-switcher';
  const previousPreset=document.createElement('button'),nextPreset=document.createElement('button');
  previousPreset.type=nextPreset.type='button';previousPreset.textContent='←';nextPreset.textContent='→';previousPreset.setAttribute('aria-label','Racikan V11 sebelumnya');nextPreset.setAttribute('aria-label','Racikan V11 berikutnya');
  switcher.append(previousPreset,quickLabel,nextPreset);preview.querySelector('.builder-subhead').after(switcher);
  const stepPreset=step=>{const current=FARMER_PRESETS.findIndex(p=>p.id===quickPreset.value);const index=current<0?(step>0?0:FARMER_PRESETS.length-1):(current+step+FARMER_PRESETS.length)%FARMER_PRESETS.length;quickPreset.value=FARMER_PRESETS[index].id;quickPreset.dispatchEvent(new Event('change'));};
  previousPreset.addEventListener('click',()=>stepPreset(-1));nextPreset.addEventListener('click',()=>stepPreset(1));
  quickPreset.value=FARMER_PRESETS[0].id;
  quickPreset.addEventListener('change',()=>{
    const preset=FARMER_PRESETS.find(item=>item.id===quickPreset.value);if(!preset)return;
    $('#avatarPresetName').value=preset.name;$('#avatarPreviewName').textContent=preset.name;showConfig(preset.config);quickPreset.value=preset.id;markSelectedPreset(preset.id);
    status.textContent='Racikan V11 dimuat. Sesuaikan bagian yang kamu inginkan sebelum menyimpan.';
  });
  studioModel.addEventListener('change', () => {
    const config=chosen(); config.special=studioModel.value;
    showConfig(config); status.textContent=config.special==='farmer-ps2'?'Model V11 aktif · sama dengan avatar game.':'Model modular lama aktif.';
  });
  form.addEventListener('submit', event => event.preventDefault());
  let currentAssetReport=null,humanAssetReport=null,farmerAssetReport=null,previewAnimation='Idle',previewScale=1,wireframeEnabled=false,skeletonVisible=false,skeletonHelper=null,lastStatsAt=0;
  const assetStatus=$('#avatarAssetStatus');const materialReport=$('#avatarMaterialReport');const animationSelect=$('#avatarPreviewAnimation');const statsReadout=$('#avatarAssetStatus');
  const assetFile=$('#avatarAssetFile');const lightingSelect=$('#avatarPreviewLighting');const scaleInput=$('#avatarPreviewScale');const scaleValue=$('#avatarPreviewScaleValue');
  const playbackClock=createStudioClock();let playbackPaused=false,playbackSpeed=1;
  const playbackBar=document.createElement('div');playbackBar.className='avatar-playback-bar';
  playbackBar.innerHTML='<button type="button" id="avatarPlaybackPause" aria-pressed="false">Jeda</button><button type="button" id="avatarPlaybackRestart">Ulangi</button><label>Kecepatan<select id="avatarPlaybackSpeed"><option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="0.75">0,75×</option><option value="1" selected>1× · normal</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label>';
  preview.querySelector('.character-preview-toolbar').before(playbackBar);
  $('#avatarPlaybackPause').addEventListener('click',event=>{playbackPaused=!playbackPaused;event.currentTarget.setAttribute('aria-pressed',String(playbackPaused));event.currentTarget.textContent=playbackPaused?'Lanjutkan':'Jeda';playbackClock.reset();});
  $('#avatarPlaybackRestart').addEventListener('click',()=>{model?.userData.setAnimation?.(previewAnimation,true);playbackClock.reset();});
  $('#avatarPlaybackSpeed').addEventListener('change',event=>{playbackSpeed=Number(event.target.value);playbackClock.reset();});
  const viewBar=document.createElement('div');viewBar.className='avatar-view-buttons';
  for(const [label,angle] of [['Depan',0],['Kiri',-Math.PI/2],['Belakang',Math.PI],['3/4',.35]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>{yaw=angle;pitch=.08;distance=4.7;positionPreviewCamera();});viewBar.append(button);}
  canvas.after(viewBar);
  const advanced=document.createElement('details');advanced.className='avatar-preview-advanced';const advancedTitle=document.createElement('summary');advancedTitle.textContent='Alat teknis & impor GLB';advanced.append(advancedTitle,preview.querySelector('.character-asset-import'),preview.querySelector('.character-material-details'));preview.append(advanced);
  const debugControls=document.createElement('div');debugControls.className='avatar-debug-controls';debugControls.append($('#avatarWireframe'),$('#avatarSkeleton'),preview.querySelector('.character-scale'));advancedTitle.after(debugControls);
  function positionPreviewCamera(){if(!camera)return;camera.position.set(Math.sin(yaw)*distance,1.7+pitch,Math.cos(yaw)*distance);camera.lookAt(0,1.02,0);}
  let selectedPresetId=FARMER_PRESETS[0].id;
  function markSelectedPreset(id){selectedPresetId=id;catalog.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===id)));}
  const builtIns = [
    ...FARMER_PRESETS,
    ['Pak Lurah','sawo','pendek','hitam','batik','celana','peci','lencana'],['Bu Guru','kuning','hijab','coklat','seragam','rok','tanpa','kacamata'],['Petani Pagi','gelap','ikal','hitam','petani','sarung','caping','ransel'],['Pelajar Ceria','pucat','panjang','coklat','seragam','rok','bandana','ransel'],['Pedagang Pasar','coklat','keriting','coklat-tua','kaos','kulot','tanpa','selempang'],['Relawan Desa','zaitun','pendek','hitam','rompi','jeans','topi','lencana'],['Koki Dapur','kuning','pendek','coklat','kemeja','celana','bandana','map'],['Bunda Warga','sawo','hijab','hitam','kebaya','rok','tanpa','selempang'],['Pekerja Jalan','gelap','pendek','hitam','pekerja','celana','helm','ransel'],['Penjaga Hutan','coklat','ikal','coklat','jaket','kulot','topi','map'],['Pemuda Pesisir','zaitun','keriting','merah','kaos','pendek','bandana','tanpa'],['Kakak Koperasi','pucat','panjang','uban','koko','celana','peci','kacamata'],['Ibu Petani','gelap','hijab','coklat-tua','petani','sarung','caping','ransel'],['Seniman Kampung','kuning','panjang','merah','kaos','kulot','tanpa','syal'],['Ketua RT','sawo','pendek','uban','kemeja','celana','peci','map'],['Mekanik Warga','coklat','ikal','hitam','jaket','jeans','topi','lencana'],['Penjaga Sekolah','zaitun','pendek','coklat','seragam','celana','topi','kacamata'],['Sahabat Sungai','gelap','keriting','coklat','rompi','pendek','bandana','ransel'],
    { name:'Garuda Merah Putih', icon:'🦅', config:{skin:'pucat',hair:'botak',hairColor:'uban',top:'seragam',bottom:'celana',headwear:'bandana',accessory:'lencana',special:'garuda'} },
    { name:'Pemimpin Berseragam', icon:'🪖', config:{skin:'sawo',hair:'pendek',hairColor:'hitam',top:'kemeja',bottom:'celana',headwear:'peci',accessory:'lencana',special:'pemimpin'} },
    { name:'Raka · Warga 01', icon:'♙', thumbnail:`${window.SEMESTA_AVATAR_GALLERY_ROOT}raka-warga-01-thumb.png`, modelFile:`${window.SEMESTA_AVATAR_GALLERY_ROOT}raka-warga-01.glb`, config:{skin:'sawo',hair:'pendek',hairColor:'hitam',top:'kemeja',bottom:'jeans',headwear:'peci',accessory:'lencana'} },
    { name:'Pekerja Kargo Santai', icon:'🧥', config:{skin:'zaitun',hair:'cepak',hairColor:'hitam',top:'hoodie',bottom:'cargo',headwear:'tanpa',accessory:'jam'} },
    { name:'Nadia Warga', icon:'🌼', config:{skin:'kuning',hair:'kuncir',hairColor:'coklat-tua',top:'kebaya',bottom:'rok',headwear:'tanpa',accessory:'selempang'} },
    { name:'Petani Panen Pagi', icon:'🌾', thumbnail:`${window.SEMESTA_AVATAR_GALLERY_ROOT}karakter-harvestmoon-warga-3d.png`, config:{skin:'sawo',hair:'pendek',hairColor:'hitam',top:'flanel',bottom:'cargo',headwear:'caping',accessory:'tas-anyaman',facialHair:'kumis-janggut'} },
  ];
  builtIns.sort((a,b)=>Number(b.config?.special==='farmer-ps2')-Number(a.config?.special==='farmer-ps2')||Number(!!b.modelFile)-Number(!!a.modelFile)||Number(!!b.config?.special)-Number(!!a.config?.special));
  const configFrom = (preset) => preset.config || { skin:preset[1],hair:preset[2],hairColor:preset[3],top:preset[4],bottom:preset[5],headwear:preset[6],accessory:preset[7] };
  const labelFor = (key,value) => (options[key].find(([id]) => id === value) || [value,value])[1];
  const chosen = () => ({...Object.fromEntries(Object.keys(options).map((key) => [key, form.elements[key].value])), ...(activeSpecial?{special:activeSpecial}:{}), ...(activeSpecial==='farmer-ps2'?{farmer:farmerEditor.get()}:{})});
  function material(hex, roughness=.82) { return new THREE.MeshStandardMaterial({ color:hex, roughness }); }
  function add(parent, geometry, mat, position, scale, rotation=0) { const mesh = new THREE.Mesh(geometry,mat); mesh.position.set(...position); if (scale) mesh.scale.set(...scale); mesh.rotation.z=rotation; mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh; }
  function makeModularAvatar(config) {
    if(config.special==='farmer-ps2' && !hasFarmerAsset()) { status.textContent='Aset V11 gagal dimuat. Muat ulang halaman; model lama tidak dipakai sebagai pengganti.'; const unavailable=new THREE.Group();unavailable.userData.assetUnavailable=true;return unavailable; }
    if(!hasHumanAsset() && !(config.special==='farmer-ps2' && hasFarmerAsset())){const unavailable=new THREE.Group();unavailable.userData.assetUnavailable=true;return unavailable;}
    const parts=createHumanModel(THREE,{
      skin:colors.skin[config.skin], hair:colors.hairColor[config.hairColor], hairStyle:config.hair,
      shirt:colors.top[config.top], trousers:colors.bottom[config.bottom], topStyle:config.top, bottomStyle:config.bottom,
      role:config.special==='pemimpin'?'pemimpin':undefined, headwear:config.headwear,
      ps2Farmer:config.special==='farmer-ps2',
      accessory:config.accessory, facialHair:config.facialHair, pack:config.accessory==='ransel'?'#9d6948':null,
      showBackpack:config.accessory==='ransel',
      apron:config.top==='petani'?'#8b7449':undefined,
      ...(config.special==='farmer-ps2' ? farmerCharacterOptions(config, avatarColors) : {}),
    });
    const root=parts.figure;
    const animation=createStudioAnimation(parts);
    root.userData.availableAnimations=Object.keys(parts.actions||{});
    root.userData.setAnimation=animation.select;
    root.userData.disposeAnimation=animation.dispose;
    root.userData.animate=(time,delta)=>{
      const phase=time*.0017;
      animation.update(delta);
      if (parts.mixer) return; // Authored clips own both V11 and legacy skeletons.
      parts.head.rotation.z=Math.sin(phase*.55)*.016;
      if(config.special==='pemimpin')parts.arms[1].rotation.z=2.35+Math.sin(phase*.7)*.025;
      else parts.arms.forEach((arm,index)=>{arm.rotation.z=(index?1:-1)*(.045+Math.sin(phase+index*Math.PI)*.018);});
    };
    return root;
  }
  function makeSpecialAvatar(config) {
    const root=new THREE.Group();
    const materialCache=new Map();
    const mat=(color,roughness=.78)=>{const key=`${color}:${roughness}`;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness}));return materialCache.get(key);};
    const part=(geometry,color,position,scale,rotation=0)=>{const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(...position);if(scale)mesh.scale.set(...scale);mesh.rotation.z=rotation;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
    if(config.special==='garuda') {
      const feather='#f3ead5', shadow='#cbbda4', red='#d93632', gold='#e5b748', dark='#43382e';
      part(new THREE.SphereGeometry(.42,32,24),feather,[0,1.02,0],[.88,1.16,.65]);
      part(new THREE.SphereGeometry(.29,32,24),feather,[0,1.68,.02],[1,.92,.86]);
      // Layered feather crest and cheek feathers make this silhouette distinct from a human avatar.
      for(let i=0;i<5;i++)part(new THREE.ConeGeometry(.095,.35,8),i%2?shadow:feather,[(i-2)*.11,1.95+Math.abs(i-2)*.035,-.02],[1,1,1],-.15+(i-2)*.12);
      for(const side of [-1,1]) {
        part(new THREE.ConeGeometry(.12,.31,8),feather,[side*.22,1.53,.01],[1,1,1],-side*.24);
        part(new THREE.SphereGeometry(.3,28,20),feather,[side*.48,1.13,-.015],[.48,1.02,.46],-side*.25);
        for(let row=0;row<3;row++)for(let i=0;i<5;i++)part(new THREE.SphereGeometry(.115,14,10),((i+row)%3===0)?shadow:feather,[side*(.31+i*.075),.78+row*.16,.11-row*.015],[.42,1.42,.42],side*.32);
        for(let i=0;i<4;i++)part(new THREE.SphereGeometry(.038,12,8),gold,[side*.1,1.72,.271]);
        part(new THREE.SphereGeometry(.019,12,8),dark,[side*.1,1.72,.305]);
      }
      part(new THREE.ConeGeometry(.19,.25,12),gold,[0,1.63,.31],[1,1,1],Math.PI);
      part(new THREE.TorusGeometry(.286,.032,10,32),red,[0,1.59,.02]);
      // Simple red-white chest marking and miniature handheld flag.
      part(new THREE.BoxGeometry(.34,.22,.035),'#d52d32',[0,1.08,.272]);
      part(new THREE.BoxGeometry(.34,.11,.04),'#fff8e8',[0,.915,.272]);
      part(new THREE.CylinderGeometry(.018,.018,.92,8),dark,[.53,1.2,.2],[1,1,1],-.12);
      part(new THREE.BoxGeometry(.34,.19,.025),'#df3035',[.68,1.53,.2],[1,1,1],-.12);
      part(new THREE.BoxGeometry(.34,.19,.025),'#fff8e8',[.66,1.34,.2],[1,1,1],-.12);
      part(new THREE.SphereGeometry(.09,12,10),feather,[.42,.75,.16]);
      root.userData.animate=(time)=>{root.position.y=Math.sin(time*.0015)*.012;root.rotation.z=Math.sin(time*.0008)*.012;};
      return root;
    }
    // A fictional civic leader inspired by the supplied uniform portrait, with a raised greeting fist.
    const skin='#bd805e', uniform='#d7cfb7', trim='#a69b7b', black='#242426', gold='#c6a14d', shoe='#403b36';
    for(const x of [-.14,.14]) {
      part(new THREE.CapsuleGeometry(.09,.3,4,8),black,[x,.38,0]);
      part(new THREE.BoxGeometry(.22,.12,.32),shoe,[x,.12,.045]);
    }
    part(new THREE.CylinderGeometry(.115,.13,.16,24),skin,[0,1.25,0]);
    part(new THREE.CapsuleGeometry(.25,.42,8,20),uniform,[0,.91,0],[1,.94,.8]);
    part(new THREE.BoxGeometry(.025,.43,.018),trim,[0,.9,.211]);
    // Tailored collar, breast pockets, stitching and buttons add uniform detail at close range.
    for(const side of [-1,1]) {
      part(new THREE.BoxGeometry(.115,.13,.035),uniform,[side*.075,1.14,.202],[1,1,1],side*.3);
      part(new THREE.BoxGeometry(.145,.115,.025),trim,[side*.145,.91,.207]);
      part(new THREE.BoxGeometry(.15,.022,.035),uniform,[side*.145,.977,.223]);
      part(new THREE.BoxGeometry(.012,.085,.012),trim,[side*.145,.91,.226]);
    }
    for(let i=0;i<4;i++)part(new THREE.SphereGeometry(.018,10,8),gold,[.018,.76+i*.09,.225]);
    for(const x of [-.16,.16]) {
      part(new THREE.BoxGeometry(.13,.07,.22),trim,[x,1.13,0]);
      part(new THREE.BoxGeometry(.09,.13,.025),uniform,[x,.99,.21]);
      part(new THREE.SphereGeometry(.025,8,6),gold,[x,.94,.23]);
    }
    part(new THREE.BoxGeometry(.38,.1,.045),black,[0,.63,.02]);
    part(new THREE.BoxGeometry(.1,.2,.035),gold,[0,.91,.225]);
    part(new THREE.CylinderGeometry(.07,.07,.025,12),gold,[.1,.94,.24],[1,1,1],Math.PI/2);
    part(new THREE.CylinderGeometry(.245,.245,.04,32),black,[0,1.82,0]);
    part(new THREE.CylinderGeometry(.19,.2,.22,32),black,[0,1.94,-.005]);
    part(new THREE.SphereGeometry(.235,32,24),skin,[0,1.51,.015],[1,.98,.9]);
    part(new THREE.SphereGeometry(.245,28,20),black,[0,1.68,-.035],[1,.48,.9]);
    for(const side of [-1,1]) {
      part(new THREE.SphereGeometry(.065,18,14),skin,[side*.228,1.49,.005],[.46,.72,.58]);
      part(new THREE.SphereGeometry(.044,12,10),skin,[side*.077,1.48,.227],[.75,.55,.42]);
      part(new THREE.CapsuleGeometry(.018,.07,4,10),black,[side*.08,1.575,.217],[1,1,1],side*.16);
    }
    part(new THREE.CapsuleGeometry(.026,.11,5,10),skin,[0,1.49,.246],[1,1,1],Math.PI);
    part(new THREE.SphereGeometry(.035,14,10),skin,[0,1.445,.28],[1,.75,.8]);
    part(new THREE.CapsuleGeometry(.012,.065,3,8),trim,[0,1.365,.222],[1,.7,1]);
    for(const x of [-.08,.08]) {
      part(new THREE.SphereGeometry(.036,16,12),'#e7d6c6',[x,1.535,.218],[1,.68,.62]);
      part(new THREE.SphereGeometry(.022,16,12),'#f7eee1',[x,1.535,.237],[1,.84,.55]);
      part(new THREE.SphereGeometry(.013,12,10),'#4b392f',[x,1.535,.252]);
      part(new THREE.SphereGeometry(.006,8,6),'#fff8e9',[x-.004,1.543,.258]);
    }
    part(new THREE.CapsuleGeometry(.014,.058,3,8),black,[-.08,1.59,.22],[1,1,1],-.04);
    part(new THREE.CapsuleGeometry(.014,.058,3,8),black,[.08,1.59,.22],[1,1,1],.04);
    // Temple hair and a defined jaw replace the featureless sphere face.
    for(const side of [-1,1])part(new THREE.SphereGeometry(.07,16,12),black,[side*.19,1.64,-.005],[.55,.78,.95]);
    part(new THREE.SphereGeometry(.12,18,14),skin,[0,1.36,.025],[.9,.55,.75]);
    part(new THREE.CapsuleGeometry(.065,.19,4,8),uniform,[-.3,.84,0],[1,1,1],-.12);
    part(new THREE.CapsuleGeometry(.052,.2,4,8),skin,[-.34,.62,.02],[1,1,1],-.12);
    // Raised bent arm and closed fist; all pieces stay within the rotating avatar group.
    part(new THREE.CapsuleGeometry(.07,.22,4,8),uniform,[.3,1.14,0],[1,1,1],-.45);
    part(new THREE.CapsuleGeometry(.055,.2,4,8),skin,[.43,1.31,.015],[1,1,1],-.1);
    part(new THREE.SphereGeometry(.105,20,16),skin,[.46,1.49,.02],[.92,1.08,.8]);
    for(let i=0;i<4;i++)part(new THREE.SphereGeometry(.028,12,10),skin,[.39+i*.045,1.56,.07]);
    return root;
  }
  function refreshAnimationOptions(){
    const clips=activeSpecial==='garuda'?[]:(currentAssetReport?.clips||[]);
    animationSelect.replaceChildren(...(clips.length?clips.map((clip)=>new Option(`${clip.name} · ${clip.duration}s`,clip.name)): [new Option('Tidak ada klip GLB','')]));
    const available=new Set(clips.map((clip)=>clip.name.toLowerCase()));
    const missing=(currentAssetReport?.missingClips||[]).filter((name)=>!available.has(name.toLowerCase()));
    if(missing.length){const group=document.createElement('optgroup');group.label='Belum ada di aset';missing.forEach((name)=>{const option=new Option(`${name} · belum tersedia`,name);option.disabled=true;group.append(option);});animationSelect.append(group);}
    animationSelect.disabled=clips.length===0;
    if(clips.length){previewAnimation=clips.some((clip)=>clip.name===previewAnimation)?previewAnimation:clips[0].name;animationSelect.value=previewAnimation;}
  }
  function updateMaterialReport(){
    if(!currentAssetReport||!currentAssetReport.valid){materialReport.textContent=currentAssetReport?.error||'GLB belum berhasil dimuat. Preview tidak menggantikan aset karakter produksi.';return;}
    materialReport.textContent=[
      `Status: ${currentAssetReport.valid?'GLB valid, kualitas produksi belum disetujui':'GLB tidak valid'}`,
      `BBox (x, y, z): ${currentAssetReport.bounds?.join(' × ')||'—'}`,
      `Animasi tersedia: ${currentAssetReport.clips.map((clip)=>clip.name).join(', ')||'tidak ada'}`,
      `Animasi yang belum tersedia: ${currentAssetReport.missingClips.join(', ')||'tidak ada'}`,
      'Material:',...currentAssetReport.materialDetails.map((item)=>`• ${item.name} · ${item.model} · rough ${item.roughness??'—'} · metal ${item.metalness??'—'} · map ${item.maps.join(', ')||'warna saja'}`),
      ...currentAssetReport.warnings.map((warning)=>`PERINGATAN: ${warning}`),
    ].join('\n');
  }
  function applyWireframe(){
    if(!model)return;
    model.traverse((node)=>{if(!node.isMesh||!node.material)return;for(const material of (Array.isArray(node.material)?node.material:[node.material]))material.wireframe=wireframeEnabled;});
  }
  function updateSkeletonHelper(){
    if(skeletonHelper&&scene){scene.remove(skeletonHelper);skeletonHelper.geometry?.dispose();if(Array.isArray(skeletonHelper.material))skeletonHelper.material.forEach((material)=>material.dispose());else skeletonHelper.material?.dispose();skeletonHelper=null;}
    if(!skeletonVisible||!model||!scene)return;
    let hasBones=false;model.traverse((node)=>{if(node.isBone)hasBones=true;});
    if(!hasBones){status.textContent='Skeleton tidak tersedia pada mode pratinjau ini.';return;}
    skeletonHelper=new THREE.SkeletonHelper(model);skeletonHelper.material.color.set('#e44852');scene.add(skeletonHelper);
  }
  function selectPreviewAnimation(name){
    previewAnimation=name;
    if(model?.userData.setAnimation&&!model.userData.setAnimation(name))status.textContent=`Klip “${name}” tidak tersedia di GLB ini.`;
    else if(!model?.userData.setAnimation)status.textContent='Avatar ini tidak memiliki klip animasi GLB.';
  }
  function installPreviewAsset(gltf,sourceLabel){
    const report=inspectCharacterAsset(gltf);
    if(!report.valid) throw new Error('GLB tidak memiliki mesh karakter yang valid.');
    const farmer=isFarmerV8(gltf.scene);
    if(farmer){farmerAssetReport=report;setFarmerAsset(gltf);thumbnailService?.dispose();thumbnailService=null;renderCatalog();}
    else{humanAssetReport=report;setHumanAsset(gltf);}
    showConfig({...chosen(),special:farmer?'farmer-ps2':''},{rebuild:true});
    status.textContent=`${sourceLabel} · ${farmer?'model keluarga V11':'model modular'} aktif. Impor lokal hanya untuk pratinjau, bukan penggantian aset game.`;
  }
  function showConfig(config,{rebuild=false}={}) {
    quickPreset.value='';
    markSelectedPreset('');
    const sameFarmer=!rebuild&&activeSpecial==='farmer-ps2'&&config.special==='farmer-ps2'&&model?.userData.setAppearance;
    activeSpecial=config.special||'';
    studioModel.value=activeSpecial;
    $('#avatarResetAsset').textContent=activeSpecial==='farmer-ps2'?'Muat ulang V11 game':'Muat ulang model lama';
    const combinations=activeSpecial==='farmer-ps2'?Object.values(FARMER_SCHEMA.fields).reduce((total,field)=>total*Object.keys(field.options).length,1):comboCount;
    $('#avatarComboCount').textContent=combinations.toLocaleString('id-ID');
    $('#avatarComboCount').title='Kombinasi pilihan bentuk, tidak termasuk warna; bukan jumlah model yang diuji visual satu per satu.';
    if (!humanAssetReport && currentAssetReport && !farmerAssetReport) humanAssetReport=currentAssetReport;
    currentAssetReport=activeSpecial==='farmer-ps2'?farmerAssetReport:humanAssetReport;
    refreshAnimationOptions(); updateMaterialReport();
    farmerEditor.set(config, avatarColors); farmerEditor.show(activeSpecial==='farmer-ps2');
    for (const key of Object.keys(options)) form.elements[key].value = config[key] || defaults[key];
    for (const key of Object.keys(options)) { form.elements[key].disabled=['garuda','farmer-ps2'].includes(activeSpecial); form.elements[key].closest('label').hidden=activeSpecial==='farmer-ps2'; }
    const clean=chosen();
    $('#avatarPreviewParts').textContent=[clean.hair,clean.top,clean.bottom,clean.headwear,clean.accessory,clean.facialHair].map((part,i)=>labelFor(['hair','top','bottom','headwear','accessory','facialHair'][i],part).toUpperCase()).join(' · ');
    if (activeSpecial==='farmer-ps2') $('#avatarPreviewParts').textContent=['bodyFrame','bodyType','outfit','bottomStyle'].map(key=>FARMER_SCHEMA.fields[key].options[clean.farmer[key]]).join(' · ');
    if(!THREE || !scene)return;
    if(sameFarmer){model.userData.setAppearance(farmerCharacterOptions(clean,avatarColors));return;}
    if(model){model.userData.disposeAnimation?.();scene.remove(model);const skeletons=new Set();model.traverse((node)=>{if(node.skeleton)skeletons.add(node.skeleton);if(!node.userData.sharedCharacterGeometry)node.geometry?.dispose(); if(node.material){const list=Array.isArray(node.material)?node.material:[node.material];list.forEach((mat)=>{if(!mat.userData.sharedCharacterTexture)mat.map?.dispose();mat.dispose();});}});skeletons.forEach(skeleton=>skeleton.dispose());}
    model=clean.special==='garuda'?makeSpecialAvatar(clean):makeModularAvatar(clean);scene.add(model);model.scale.setScalar(previewScale);model.userData.setAnimation?.(previewAnimation);applyWireframe();updateSkeletonHelper();
    playbackClock.reset();
  }
  const catalogSearch = $('#avatarCatalogSearch'); const catalogParams = new URLSearchParams(location.search); let catalogPage = Math.max(1, Number(catalogParams.get('avatarPage')) || 1); const catalogPageSize = 12;
  const catalogFilter=$('#avatarCatalogFilter');
  const initialFilter=catalogParams.get('avatarCollection')||'v11';
  if([...catalogFilter.options].some(option=>option.value===initialFilter))catalogFilter.value=initialFilter;
  const catalogDescription = config => {
    if(config.special==='farmer-ps2') { const appearance=farmerCharacterOptions(config,avatarColors); return 'V11 · '+['bodyFrame','bodyType','outfit','bottomStyle'].map(key=>FARMER_SCHEMA.fields[key].options[appearance[key]]).join(' · '); }
    if(config.special==='garuda') return 'Maskot Garuda 3D';
    if(config.special==='pemimpin') return 'Pemimpin · model lama';
    return `Model lama · ${labelFor('top',config.top)} · ${labelFor('hair',config.hair)}`;
  };
  catalogSearch.value = catalogParams.get('avatarQ') || '';
  function renderCatalog() {
    const items=[...builtIns.map((preset,index)=>({id:preset.id||`builtin-${index}`,name:Array.isArray(preset)?preset[0]:preset.name,collection:preset.collection,icon:preset.icon,thumbnail:preset.thumbnail,modelFile:preset.modelFile,config:configFrom(preset),builtIn:true})),...presets];
    const query=catalogSearch.value.trim().toLocaleLowerCase('id-ID'); const filtered=items.filter((item)=>{
      const group=catalogFilter.value;
      const matches=group==='all'||(group==='saved'&&!item.builtIn)||(group==='v11'&&item.config.special==='farmer-ps2')||(group==='legacy'&&item.config.special!=='farmer-ps2')||item.collection===group;
      return matches&&`${item.name} ${catalogDescription(item.config)} ${item.config.special||''}`.toLocaleLowerCase('id-ID').includes(query);
    });
    const pages=Math.max(1,Math.ceil(filtered.length/catalogPageSize));catalogPage=Math.min(catalogPage,pages);const visible=filtered.slice((catalogPage-1)*catalogPageSize,catalogPage*catalogPageSize);
    $('#avatarCatalogCount').textContent=`${filtered.length} DARI ${items.length} GAYA`;$('#avatarCatalogPage').textContent=`Halaman ${catalogPage} dari ${pages}`;$('#avatarCatalogPrev').disabled=catalogPage<=1;$('#avatarCatalogNext').disabled=catalogPage>=pages;
    catalog.replaceChildren();const thumbnailJobs=[];
    visible.forEach(item=>{
      const card=document.createElement('article');card.className='avatar-catalog-item';
      const button=document.createElement('button');button.type='button';button.className='avatar-preset';button.dataset.preset=item.id;
      button.setAttribute('aria-pressed',String(item.id===selectedPresetId));
      const portrait=document.createElement('i');portrait.className='avatar-card-portrait';
      const placeholder=document.createElement('span');placeholder.className='avatar-card-placeholder';placeholder.textContent=item.config.special==='farmer-ps2'?'V11':(item.icon||'♙');portrait.append(placeholder);
      const image=document.createElement('img');image.alt='';image.hidden=true;portrait.append(image);
      if(item.config.special==='farmer-ps2')thumbnailJobs.push({image,config:item.config});
      else if(item.thumbnail){image.src=item.thumbnail;image.hidden=false;image.loading='lazy';portrait.classList.add('has-preview');}
      const info=document.createElement('span');info.className='avatar-preset-info';
      const tag=document.createElement('em');tag.className='avatar-card-kicker';tag.textContent=FARMER_COLLECTIONS[item.collection]||(item.builtIn?'Koleksi lama':'Racikan tersimpan');
      const title=document.createElement('b');title.textContent=item.name;
      const description=document.createElement('small');description.textContent=catalogDescription(item.config);
      const action=document.createElement('span');action.className='avatar-card-action';action.textContent='Gunakan racikan ↗';
      info.append(tag,title,description,action);button.append(portrait,info);card.append(button);
      if(item.modelFile){const link=document.createElement('a');link.className='avatar-file-download';link.href=item.modelFile;link.download='';link.textContent='Unduh model GLB ↧';card.append(link);}
      if(!item.builtIn){const remove=document.createElement('button');remove.type='button';remove.className='avatar-delete';remove.dataset.deleteAvatar=item.id;remove.setAttribute('aria-label',`Hapus ${item.name}`);remove.textContent='×';card.append(remove);}
      catalog.append(card);
    });
    if(!visible.length){const empty=document.createElement('p');empty.className='avatar-catalog-empty';empty.textContent=catalogFilter.value==='saved'?'Belum ada racikan tersimpan. Pilih avatar, sesuaikan, lalu simpan dari studio.':'Tidak ada avatar yang cocok. Coba kata kunci atau koleksi lain.';catalog.append(empty);}
    if(THREE&&scene&&hasFarmerAsset()&&thumbnailJobs.length){try{thumbnailService ||= createAvatarThumbnails(THREE);thumbnailService.fill(thumbnailJobs).catch(error=>console.warn('Pratinjau katalog tidak tersedia:',error));}catch(error){console.warn('Renderer katalog tidak tersedia:',error);}}
    catalog.querySelectorAll('[data-preset]').forEach((button)=>button.addEventListener('click',()=>{const item=items.find((entry)=>entry.id===button.dataset.preset);if(!item)return;$('#avatarPresetName').value=item.name;$('#avatarPreviewName').textContent=item.name;showConfig(item.config);quickPreset.value=item.id;markSelectedPreset(item.id);status.textContent=item.config.special==='garuda'?'Model maskot Garuda dipilih. Bentuk khas maskot dijaga tetap utuh.':item.config.special==='farmer-ps2'?'Avatar V11 dipilih. Mengganti postur, wajah, atau pakaian tetap memakai model V11.':item.config.special==='pemimpin'?'Model karakter hidup dipilih. Warna dan pakaian masih bisa diracik.':`Racikan “${item.name}” dimuat. Kamu masih bisa mengganti setiap bagiannya.`;}));
    catalog.querySelectorAll('[data-delete-avatar]').forEach((button)=>button.addEventListener('click',()=>saveLibrary(presets.filter((item)=>item.id!==button.dataset.deleteAvatar))));
  }
  const syncCatalogUrl=()=>updateAdminQuery({avatarQ:catalogSearch.value.trim(),avatarPage:catalogPage,avatarCollection:catalogFilter.value});
  catalogFilter.addEventListener('change',()=>{catalogPage=1;renderCatalog();syncCatalogUrl();});
  catalogSearch.addEventListener('input',()=>{catalogPage=1;renderCatalog();syncCatalogUrl();});
  $('#avatarCatalogPrev').addEventListener('click',()=>{if(catalogPage>1){catalogPage--;renderCatalog();syncCatalogUrl();}});$('#avatarCatalogNext').addEventListener('click',()=>{catalogPage++;renderCatalog();syncCatalogUrl();});
  async function saveLibrary(next) {
    status.textContent='Menyimpan katalog avatar…';
    try { const response=await fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'avatar_library',presets:next})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Katalog belum tersimpan.');presets=result.presets;renderCatalog();status.textContent=`Katalog tersimpan · ${presets.length} avatar khusus.`; }
    catch(error){status.textContent=error.message;}
  }
  for(const key of Object.keys(options)) form.elements[key].addEventListener('change',()=>{if(activeSpecial==='pemimpin')activeSpecial='';showConfig(chosen());$('#avatarPreviewName').textContent=$('#avatarPresetName').value||'Racikan avatar';});
  $('#avatarPresetName').addEventListener('input',(event)=>$('#avatarPreviewName').textContent=event.target.value||'Racikan avatar');
  $('#randomAvatar').addEventListener('click',()=>{
    const config=activeSpecial==='farmer-ps2'?chosen():{};
    if(activeSpecial==='farmer-ps2') for(const [key,field] of Object.entries(FARMER_SCHEMA.fields)){const values=Object.keys(field.options);config.farmer[key]=values[Math.floor(Math.random()*values.length)];}
    else for(const [key,values] of Object.entries(options))config[key]=values[Math.floor(Math.random()*values.length)][0];
    showConfig(config);$('#avatarPresetName').value='Racikan baru';$('#avatarPreviewName').textContent='Racikan baru';status.textContent='Kombinasi acak dibuat. Ubah bagian yang kamu mau, lalu simpan.';
  });
  $('#saveAvatarPreset').addEventListener('click',()=>{if(presets.length>=100){status.textContent='Katalog mencapai batas 100 avatar tersimpan.';return;}const name=$('#avatarPresetName').value.trim();if(!name){status.textContent='Isi nama avatar sebelum menyimpan.';return;}const id=`avatar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;saveLibrary([...presets,{id,name,config:chosen()}]);});
  showConfig(defaults);quickPreset.value=FARMER_PRESETS[0].id;markSelectedPreset(FARMER_PRESETS[0].id);renderCatalog();
  try {
    const libraryResponse=await fetch(`${API_URL}?resource=avatar_library`,{headers:{Accept:'application/json'}});
    if(libraryResponse.ok){const data=await libraryResponse.json();presets=Array.isArray(data.presets)?data.presets:[];renderCatalog();}
  } catch(error) { status.textContent='Katalog belum dapat dimuat dari server.'; }
  try {
    THREE=await import('three');
    try { const gltf=await new GLTFLoader().loadAsync(window.SEMESTA_CHARACTER_MODEL);currentAssetReport=inspectCharacterAsset(gltf);setHumanAsset(currentAssetReport.valid?gltf:null);refreshAnimationOptions();updateMaterialReport();assetStatus.textContent=`${formatCharacterAssetSummary(currentAssetReport)} · ASET SITUS · ${currentAssetReport.missingClips.length?'animasi belum lengkap':'lulus pemeriksaan teknis awal; kualitas visual tetap perlu ditinjau'}.`; }
    catch (error) { setHumanAsset(null);currentAssetReport=null;refreshAnimationOptions();updateMaterialReport();assetStatus.textContent=`Aset GLB situs gagal dimuat. Preview cadangan bukan karakter produksi. ${error.message||''}`;console.warn('Pratinjau aset karakter GLB gagal dimuat.', error); }
    humanAssetReport=currentAssetReport;
    try { const gltf=await new GLTFLoader().loadAsync(window.SEMESTA_FARMER_MODEL);const report=inspectCharacterAsset(gltf);farmerAssetReport=report;setFarmerAsset(report.valid?gltf:null); }
    catch (error) { setFarmerAsset(null);console.warn('Aset petani 3D PS2 gagal dimuat.',error); }
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;const pmrem=new THREE.PMREMGenerator(renderer);const roomEnvironment=new RoomEnvironment();const environment=pmrem.fromScene(roomEnvironment,.04).texture;roomEnvironment.dispose();pmrem.dispose();
    scene=new THREE.Scene();scene.environment=environment;scene.background=new THREE.Color('#cfddce');camera=new THREE.PerspectiveCamera(34,1,.1,50);const ambient=new THREE.HemisphereLight('#fff5df','#62735c',1.5);scene.add(ambient);const keyLight=new THREE.DirectionalLight('#fff4dc',2.4);keyLight.position.set(3,5,4);keyLight.castShadow=true;scene.add(keyLight);const fill=new THREE.DirectionalLight('#bdd9ef',.9);fill.position.set(-4,2,-3);scene.add(fill);
    const lightingPresets={studio:{background:'#cfddce',ambient:1.5,key:2.4,fill:.9,keyColor:'#fff4dc',fillColor:'#bdd9ef'},daylight:{background:'#bcd4e0',ambient:1.8,key:2.9,fill:.65,keyColor:'#fff8e9',fillColor:'#d7e9ff'},warm:{background:'#dfc7a9',ambient:1.35,key:2.4,fill:.7,keyColor:'#ffdda8',fillColor:'#f3b58d'}};
    const updateLighting=()=>{const preset=lightingPresets[lightingSelect.value]||lightingPresets.studio;scene.background.set(preset.background);ambient.intensity=preset.ambient;keyLight.intensity=preset.key;keyLight.color.set(preset.keyColor);fill.intensity=preset.fill;fill.color.set(preset.fillColor);};
    lightingSelect.addEventListener('change',updateLighting);
    animationSelect.addEventListener('change',()=>selectPreviewAnimation(animationSelect.value));
    $('#avatarWireframe').addEventListener('click',(event)=>{wireframeEnabled=!wireframeEnabled;event.currentTarget.setAttribute('aria-pressed',String(wireframeEnabled));applyWireframe();});
    $('#avatarSkeleton').addEventListener('click',(event)=>{skeletonVisible=!skeletonVisible;event.currentTarget.setAttribute('aria-pressed',String(skeletonVisible));updateSkeletonHelper();});
    scaleInput.addEventListener('input',()=>{previewScale=Number(scaleInput.value)||1;scaleValue.value=`${previewScale.toFixed(2)}×`;scaleValue.textContent=scaleValue.value;if(model)model.scale.setScalar(previewScale);});
    assetFile.addEventListener('change',async()=>{const file=assetFile.files?.[0];if(!file)return;assetStatus.textContent=`Membaca ${file.name}…`;try{const data=await file.arrayBuffer();const gltf=await new GLTFLoader().parseAsync(data,'');installPreviewAsset(gltf,`FILE LOKAL · ${file.name} (tidak diunggah)`);}catch(error){assetStatus.textContent=`GLB gagal dibaca: ${error.message||'file tidak valid atau memakai tekstur eksternal'}. Gunakan GLB dengan tekstur tertanam.`;console.error('Impor pratinjau GLB:',error);}});
    $('#avatarResetAsset').addEventListener('click',async()=>{assetStatus.textContent='Memuat ulang aset karakter situs…';const source=activeSpecial==='farmer-ps2'?window.SEMESTA_FARMER_MODEL:window.SEMESTA_CHARACTER_MODEL;try{installPreviewAsset(await new GLTFLoader().loadAsync(source),'ASET GAME');assetFile.value='';status.textContent='Aset studio sudah dimuat ulang dari model game yang dipilih.';}catch(error){assetStatus.textContent=`Aset GLB situs gagal dimuat: ${error.message||error}`;}});
    const ground=new THREE.Mesh(new THREE.CircleGeometry(2.2,48),new THREE.MeshStandardMaterial({color:'#b9c99f',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;scene.add(ground);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.018,6,48),new THREE.MeshStandardMaterial({color:'#e4c170'}));ring.rotation.x=Math.PI/2;ring.position.y=.01;scene.add(ring);
    const resize=()=>{const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(canvas.parentElement);window.addEventListener('resize',resize);resize();
    positionPreviewCamera();canvas.addEventListener('pointerdown',(event)=>{pointer={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});canvas.addEventListener('pointermove',(event)=>{if(!pointer)return;yaw+=(event.clientX-pointer.x)*.008;pitch=clamp(pitch+(event.clientY-pointer.y)*.004,-.35,.55);pointer={x:event.clientX,y:event.clientY};positionPreviewCamera();});canvas.addEventListener('pointerup',()=>pointer=null);canvas.addEventListener('pointercancel',()=>pointer=null);canvas.addEventListener('wheel',(event)=>{event.preventDefault();distance=clamp(distance+event.deltaY*.008,3.3,7);positionPreviewCamera();},{passive:false});
    const pendingPreset=selectedPresetId,pendingQuick=quickPreset.value;
    showConfig(chosen());quickPreset.value=pendingQuick;markSelectedPreset(pendingPreset);renderCatalog();
    let lastFpsAt=performance.now(),framesSinceStats=0;
    const studioActive=()=>!document.hidden&&$('#adminView-avatars')?.classList.contains('active');
    const resetTiming=()=>{playbackClock.reset();lastFpsAt=performance.now();framesSinceStats=0;};
    document.addEventListener('visibilitychange',resetTiming);window.addEventListener('semesta:admin-view-change',resetTiming);
    const draw=now=>{
      requestAnimationFrame(draw);
      const active=studioActive(),tick=playbackClock.tick(now,{active,paused:playbackPaused,speed:playbackSpeed});
      if(!active)return;
      model?.userData.animate?.(tick.time*1000,tick.delta);
      if(skeletonHelper)skeletonHelper.update();renderer.render(scene,camera);framesSinceStats++;
      if(now-lastStatsAt>600){const info=renderer.info;const fps=Math.round(framesSinceStats*1000/Math.max(1,now-lastFpsAt));lastStatsAt=lastFpsAt=now;framesSinceStats=0;statsReadout.textContent=`${playbackPaused?'Dijeda':`${playbackSpeed}× waktu nyata`} · ${activeSpecial==='farmer-ps2'?'V11':'Model lama'} · ${fps} FPS render · ${info.render.calls} draw calls`;}
    };
    requestAnimationFrame(draw);
  } catch(error) { renderCatalog();status.textContent='Pratinjau 3D belum dapat dibuka di perangkat ini.'; console.error('Studio avatar:',error); }
}

start().catch((error) => { console.error(error); const notice = document.createElement('div'); notice.className = 'build-notice'; notice.textContent = 'Belum berhasil dibuka. Pastikan XAMPP aktif dan halaman dimuat ulang.'; document.body.append(notice); });
