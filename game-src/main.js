import { createHumanModel, preloadAvatars, loadAvatarProfile, animateAvatar, avatarSpeed, disposeAvatar } from './avatar-runtime.js';
import { attachCitizenAccessories } from './citizen-accessories.js';
import { catalog as AVATAR_V15_CATALOG, presets as FARMER_PRESETS, avatarCharacterOptions as farmerCharacterOptions, normalizeAvatarConfig, mountAvatarEditor } from './avatar-v15-config.js';
import { createAvatarThumbnails } from './avatar-catalog-thumbnails.js';
import { WORLD_DESTINATIONS, WORLD_PHASE_EVENT, WORLD_PHASE_KEY, getWorldPhase } from './republic-world-layout.js';
import { mountRepublicAtlas, mountRepublicRegionalMap, regionalLocation, mountRepublicSitePlan, mountRepublicMinimap, mountPhasePicker, mapLocation } from './republic-map.js';

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
function farmerPresetForAvatar(avatar) {
  const presetByAvatar = {
    warga:'raka', petani:'arka', pelajar:'nino', pedagang:'sari', guru:'pak-hadi',
    'tenaga-kesehatan':'ayu', asn:'revan', tni:'bima', polri:'aji', nelayan:'tara',
    'pekerja-konstruksi':'bima', pengemudi:'danu', koki:'laras', relawan:'ayu',
    'penjaga-hutan':'tara',
  };
  return FARMER_PRESETS.find((item) => item.id === `v15-${presetByAvatar[avatar] || 'raka'}`) || FARMER_PRESETS[0];
}
function citizenCharacterOptions(citizen, fallbackLook) {
  const config = parsedAvatarConfig(citizen?.avatar_config);
  // All people in the live map use the same V15 asset and appearance contract
  // as Avatar Studio. Old saved wardrobe fields are translated by
  // farmerCharacterOptions(), so existing citizens keep their closest look.
  if (config) return farmerCharacterOptions(config, avatarColors);
  const preset = farmerPresetForAvatar(citizen?.avatar);
  if (preset) return farmerCharacterOptions(preset.config, avatarColors);
  // Preserve a sensible V15 appearance if a new occupation has no preset yet.
  return farmerCharacterOptions({ special:'farmer-ps2', shirt:fallbackLook?.shirt, trousers:'#35485a' }, avatarColors);
}
const houseNames = { 'rumah-kayu': 'Rumah Kayu', 'rumah-bata': 'Rumah Bata', 'rumah-panggung': 'Rumah Panggung' };
let activeCitizen = null;
let updateCitizenHeader = () => {};
let authMode = 'login';
let avatarCustomizerMode = 'account';
let pendingAvatarConfig = null;
let avatarThumbnailService = null;
let avatarPreviewRequest = 0;
async function renderAvatarPreview(config) {
  const request = ++avatarPreviewRequest;
  const registrationImage = $('#registrationAvatarPreview');
  const images = registrationImage && !$('#registrationAvatarChoice')?.hidden ? [registrationImage] : [];
  if (!images.length) return;
  try {
    await loadAvatarProfile(normalizeAvatarConfig(config).profileId);
    if (request !== avatarPreviewRequest) return;
    if (!avatarThumbnailService) avatarThumbnailService = createAvatarThumbnails(await import('three'));
    await avatarThumbnailService.fill(images.map((image) => ({ image, config })));
  } catch (error) {
    if (request === avatarPreviewRequest) {
      const status = $('#exploreAvatarStatus');
      if (status) status.textContent = `Pratinjau 3D belum bisa dimuat: ${error.message || error}`;
      console.warn('Pratinjau avatar V15:', error);
    }
  }
}
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
// Keep the soundtrack mapping keyed by the playable region ID. New areas can
// point at their own track ID while sharing the default until a song exists.
const AREA_MUSIC_CATALOG = {
  'jalan-ke-alun-alun': {
    title: 'Jalan ke Alun-Alun',
    path: 'jalan-ke-alun-alun/jalan-ke-alun-alun.wav',
  },
};
const AREA_MUSIC_BY_REGION = {
  kota: 'jalan-ke-alun-alun',
  desa: 'jalan-ke-alun-alun',
  hutan: 'jalan-ke-alun-alun',
};
const DEFAULT_AREA_MUSIC = 'jalan-ke-alun-alun';

function initAreaMusic() {
  const audio = new Audio();
  const toggle = $('#areaMusicToggle');
  const volume = $('#areaMusicVolume');
  const label = $('#areaMusicToggleLabel');
  const trackName = $('#areaMusicTrackName');
  const status = $('#areaMusicStatus');
  const volumeKey = 'semesta-area-music-volume-v1';
  let trackId = '';
  let shouldPlay = false;
  audio.loop = true;
  audio.preload = 'none';

  try {
    const savedVolume = Number(localStorage.getItem(volumeKey));
    if (Number.isFinite(savedVolume) && localStorage.getItem(volumeKey) !== null) audio.volume = clamp(savedVolume, 0, 1);
    else audio.volume = .35;
  } catch (_) { audio.volume = .35; }
  if (volume) volume.value = String(audio.volume);

  const updateControls = () => {
    const playing = !audio.paused && !audio.ended;
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(playing));
      toggle.setAttribute('aria-label', playing ? 'Jeda musik area' : 'Putar musik area');
      if (label) label.textContent = playing ? 'JEDA MUSIK' : 'PUTAR MUSIK';
    }
    if (playing && status) status.textContent = 'Musik area sedang diputar.';
    else if (status && !audio.error && status.textContent !== 'Musik siap diputar saat masuk area.') status.textContent = 'Musik dijeda.';
  };
  const setTrack = (regionId) => {
    const nextId = AREA_MUSIC_BY_REGION[regionId] || DEFAULT_AREA_MUSIC;
    const track = AREA_MUSIC_CATALOG[nextId] || AREA_MUSIC_CATALOG[DEFAULT_AREA_MUSIC];
    if (!track) return;
    if (trackName) trackName.textContent = track.title;
    if (trackId === nextId) return;
    const wasPlaying = !audio.paused;
    trackId = nextId;
    audio.src = new URL(track.path, window.SEMESTA_AREA_MUSIC_BASE || `${document.baseURI}ilustrasi/musik/`).href;
    if (wasPlaying) audio.play().catch(() => {
      updateControls();
      if (status) status.textContent = 'Tekan Putar Musik untuk melanjutkan.';
    });
  };
  const play = (regionId) => {
    if (regionId) setTrack(regionId);
    else if (!trackId) setTrack(DEFAULT_AREA_MUSIC);
    shouldPlay = true;
    audio.play().then(updateControls).catch(() => {
      updateControls();
      if (status) status.textContent = 'Musik belum bisa diputar. Tekan tombol putar untuk mencoba lagi.';
    });
  };
  const pause = () => { shouldPlay = false; audio.pause(); updateControls(); };
  toggle?.addEventListener('click', () => audio.paused ? play() : pause());
  volume?.addEventListener('input', () => {
    audio.volume = clamp(Number(volume.value), 0, 1);
    try { localStorage.setItem(volumeKey, String(audio.volume)); } catch (_) { /* Volume remains active for this visit. */ }
  });
  audio.addEventListener('play', updateControls);
  audio.addEventListener('playing', updateControls);
  audio.addEventListener('pause', updateControls);
  audio.addEventListener('ended', updateControls);
  audio.addEventListener('error', () => {
    if (status) status.textContent = 'Berkas musik area belum dapat dimuat.';
    updateControls();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && shouldPlay && $('#exploreScreen')?.classList.contains('active')) play();
  });
  return { setTrack, play, pause };
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
      const avatarConfig = parsedAvatarConfig(activeCitizen.avatar_config) || farmerPresetForAvatar(activeCitizen.avatar).config;
      const avatarPreset = FARMER_PRESETS.find((item) => item.id === avatarConfig.presetId) || farmerPresetForAvatar(activeCitizen.avatar);
      $('#registrationAvatarName').textContent = avatarPreset.name;
      $('#registrationAvatarHint').textContent = 'Avatar yang sedang dipakai. Tekan tombol untuk memilih avatar lain.';
      renderAvatarPreview(avatarConfig);
    } else $('#citizenSubmit').textContent = authMode === 'register' ? 'BUAT AKUN WARGA ↗' : 'MASUK KE REPUBLIK ↗';
  };
  $('#profileButton').addEventListener('click', showPanel);
  $('#chooseRegistrationAvatar').addEventListener('click', () => window.dispatchEvent(new CustomEvent('semesta:avatar-customizer-open', { detail:{ mode: activeCitizen ? 'account' : 'registration' } })));
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
    if (authMode === 'register') {
      if (pendingAvatarConfig) renderAvatarPreview(pendingAvatarConfig);
    }
  }));
  $('#citizenForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = activeCitizen ? 'update' : authMode;
    const payload = { resource: 'citizen', action, username: form.get('username'), email: form.get('email'), password: form.get('password'), displayName: form.get('displayName'), avatar: form.get('avatar') || activeCitizen?.avatar, house: form.get('house') || activeCitizen?.house };
    if (action === 'register' && !pendingAvatarConfig) {
      $('#citizenError').textContent = 'Pilih tipe karakter dan satu avatar siap pakai sebelum membuat akun.';
      return;
    }
    if (action === 'register') payload.avatarConfig = pendingAvatarConfig;
    for (const field of Object.keys(profileFieldNames)) payload[field] = form.get(field) || '';
    $('#citizenError').textContent = '';
    try {
      const response = await fetch(`${API_URL}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Profil warga belum bisa disimpan.');
      if (result.verificationRequired) {
        pendingAvatarConfig = null;
        document.querySelector('[data-auth-mode=login]').click();
        $('#citizenError').classList.add('success');
        $('#citizenError').textContent = result.message;
        return;
      }
      if (result.citizen) {
        $('#citizenError').classList.remove('success');
        updateHeader(result.citizen);
        saveGameState({ citizen: { displayName: result.citizen.display_name, avatar: result.citizen.avatar, house: result.citizen.house } });
        pendingAvatarConfig = null;
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
    $('#citizenAvatarHint').textContent = selected?.avatarStyle ? 'Pilihan avatar siap pakai tersedia; pekerjaan tidak mengubah avatar yang Anda pilih.' : 'Pilih avatar siap pakai sesuai tipe karakter.';
  });
  try {
    const masterResponse = await fetch(`${API_URL}?resource=citizen_options`, { headers: { Accept: 'application/json' } });
    const masterResult = await masterResponse.json(); if (!masterResponse.ok) throw new Error(masterResult.error || 'Pilihan biodata belum tersedia.');
    const options = masterResult.options || {}; window.citizenMasterOptions = options;
    fillMasterSelect('gender', options.gender); fillMasterSelect('religion', options.religion); fillMasterSelect('birthProvince', options.province); fillMasterSelect('domicileProvince', options.province); fillMasterSelect('occupation', options.occupation); fillMasterSelect('educationLevel', options.education);
    const avatarSelect = $('#citizenAvatarSelect');
    avatarSelect.value = activeCitizen?.avatar || 'warga';
    const registrationPreset = farmerPresetForAvatar(avatarSelect.value);
    $('#registrationAvatarName').textContent = 'Belum memilih avatar';
    if (activeCitizen && !profileFields.hidden) fillProfileForm(activeCitizen);
  } catch (error) { $('#citizenError').textContent = error.message; }
  try {
    const response = await fetch(`${API_URL}?resource=citizen`, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    updateHeader(result.citizen || null);
  } catch (_) { updateHeader(null); }
}

function initExploreAvatarCustomizer() {
  const panel = $('#avatarCustomizer'); const status = $('#exploreAvatarStatus');
  if (!panel || !$('#customAvatarPreview')) return;
  const grid = $('#avatarPresetGrid');
  const useButton = $('#selectAvatarPreset');
  const previewCanvas = $('#customAvatarPreview');
  let previewTHREE=null, previewRenderer=null, previewScene=null, previewCamera=null, previewModel=null;
  let previewYaw=.25, previewPointer=null, previewFrame=0, previewLastTime=0, previewUpdateId=0;
  let selectedGender='', selectedPreset=null;
  const cleanConfig = config => normalizeAvatarConfig(config);
  const customEditor=mountAvatarEditor(grid.parentElement, config=>{selectedGender=config.profileId.split('-')[0];document.querySelectorAll('[data-avatar-gender]').forEach(b=>{const active=b.dataset.avatarGender===selectedGender;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});setSelectedPreset({id:'custom',name:'Karakter saya',config});});
  const presetById = (id) => FARMER_PRESETS.find((item) => item.id === id);
  const setSelectedPreset = (preset) => {
    selectedPreset = preset || null;
    grid?.querySelectorAll('[data-preset-id]').forEach((card) => {
      const selected = card.dataset.presetId === selectedPreset?.id;
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-pressed', String(selected));
    });
    useButton.disabled = !selectedPreset;
    if (selectedPreset) {
      $('#customAvatarName').textContent = selectedPreset.name;
      $('#customAvatarDescription').textContent = `${selectedGender === 'male' ? 'Avatar cowok' : 'Avatar cewek'} · siap pakai`;
      status.textContent = `${selectedPreset.name} dipilih. Pratinjau 3D bisa diputar dengan menggeser karakter.`;
      customEditor.set(selectedPreset.config);
      renderLivePreview(selectedPreset.config);
    } else {
      previewUpdateId += 1;
      removeLivePreviewModel();
      if (previewRenderer && previewScene && previewCamera) previewRenderer.render(previewScene, previewCamera);
      $('#customAvatarName').textContent = 'Pilih avatar';
      $('#customAvatarDescription').textContent = 'Pilih salah satu kartu untuk melihat pratinjau 3D.';
    }
  };
  const resizeLivePreview = () => {
    if (!previewRenderer || !previewCamera) return;
    const rect=previewCanvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    previewRenderer.setSize(rect.width,rect.height,false); previewCamera.aspect=rect.width/rect.height; previewCamera.updateProjectionMatrix();
  };
  const removeLivePreviewModel = () => {
    if (!previewModel) return;
    disposeAvatar(previewModel);
    previewModel=null;
  };
  const renderLivePreview = async (config) => {
    const request=++previewUpdateId;
    try {
      await loadAvatarProfile(normalizeAvatarConfig(config).profileId);
      if (request!==previewUpdateId || panel.hidden) return;
      if (!previewTHREE) {
        previewTHREE=await import('three');
        if (request!==previewUpdateId || panel.hidden) return;
        previewScene=new previewTHREE.Scene();previewScene.background=new previewTHREE.Color('#e8eeea');
        previewCamera=new previewTHREE.PerspectiveCamera(34,1,.1,30);previewCamera.position.set(0,1.55,4.2);previewCamera.lookAt(0,1.02,0);
        previewScene.add(new previewTHREE.HemisphereLight('#fff5df','#64745e',1.75));
        const key=new previewTHREE.DirectionalLight('#fff4dc',2.1);key.position.set(3,5,4);previewScene.add(key);
        const fill=new previewTHREE.DirectionalLight('#bdd9ef',.8);fill.position.set(-4,2,-3);previewScene.add(fill);
        previewRenderer=new previewTHREE.WebGLRenderer({canvas:previewCanvas,antialias:true,alpha:false,powerPreference:'low-power'});
        previewRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));previewRenderer.outputColorSpace=previewTHREE.SRGBColorSpace;previewRenderer.toneMapping=previewTHREE.ACESFilmicToneMapping;
        resizeLivePreview();
      }
      const appearance=farmerCharacterOptions(config,avatarColors);
      if (previewModel?.figure.userData.avatarConfig.profileId===appearance.avatarConfig.profileId) { previewModel.figure.userData.customization.set(appearance.avatarConfig.appearance);previewModel.figure.userData.avatarConfig=appearance.avatarConfig;attachCitizenAccessories(previewTHREE,previewModel,appearance.avatarConfig.presetId); }
      else {
        removeLivePreviewModel();previewModel=createHumanModel(previewTHREE,appearance);previewScene.add(previewModel.figure);
      }
      previewModel.figure.rotation.y=previewYaw;resizeLivePreview();previewRenderer.render(previewScene,previewCamera);
      if (!previewFrame) {
        const draw=(now)=>{
          if(panel.hidden){previewFrame=0;previewLastTime=0;return;}
          const dt=previewLastTime?Math.min((now-previewLastTime)/1000,.05):0;previewLastTime=now;
          previewModel?.mixer?.update(dt);if(previewModel)previewModel.figure.rotation.y=previewYaw;
          previewRenderer.render(previewScene,previewCamera);previewFrame=requestAnimationFrame(draw);
        };
        previewFrame=requestAnimationFrame(draw);
      }
    } catch(error) { if(request===previewUpdateId) status.textContent=`Pratinjau 3D belum bisa dimuat: ${error.message||error}`; }
  };
  previewCanvas.addEventListener('pointerdown',event=>{previewPointer=event.clientX;previewCanvas.setPointerCapture(event.pointerId);});
  previewCanvas.addEventListener('pointermove',event=>{if(previewPointer===null)return;previewYaw+=(event.clientX-previewPointer)*.012;previewPointer=event.clientX;if(previewModel)previewModel.figure.rotation.y=previewYaw;});
  previewCanvas.addEventListener('pointerup',()=>previewPointer=null);previewCanvas.addEventListener('pointercancel',()=>previewPointer=null);
  window.addEventListener('resize',resizeLivePreview);
  const renderCards = () => {
    if (!grid) return;
    grid.replaceChildren();
    const presets = FARMER_PRESETS.filter((preset) => preset.config.profileId.startsWith(selectedGender+'-'));
    $('#avatarPickerInstruction').textContent = selectedGender ? `Pilih satu dari ${presets.length} avatar ${selectedGender === 'male' ? 'cowok' : 'cewek'} siap pakai.` : 'Pilih cowok atau cewek untuk melihat avatar yang tersedia.';
    presets.forEach((preset) => {
      const card = document.createElement('button'); card.type='button'; card.className='avatar-preset-card'; card.dataset.presetId=preset.id; card.setAttribute('aria-pressed','false');
      const image=document.createElement('img');image.alt='';image.loading='lazy';image.src=new URL(`portraits/${preset.id}.png?v=${AVATAR_V15_CATALOG.variationRevision}`,new URL(window.SEMESTA_AVATAR_V15_BASE,location.href)).href;
      const name=document.createElement('b');name.textContent=preset.name;
      const meta=document.createElement('small');meta.textContent=AVATAR_V15_CATALOG.profiles.find(p=>p.id===preset.config.profileId).label;
      card.append(image,name,meta);card.addEventListener('click',()=>setSelectedPreset(preset));grid.append(card);
    });
    setSelectedPreset(null);
  };
  const chooseGender = (gender, preferredPresetId='') => {
    selectedGender=gender;
    document.querySelectorAll('[data-avatar-gender]').forEach((button)=>{const active=button.dataset.avatarGender===gender;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    renderCards();
    const preferred=presetById(preferredPresetId);
    if(preferred && preferred.config.profileId.startsWith(gender+'-')) setSelectedPreset(preferred);
  };
  document.querySelectorAll('[data-avatar-gender]').forEach((button)=>button.addEventListener('click',()=>chooseGender(button.dataset.avatarGender)));
  const fill = (config, mode) => {
    avatarCustomizerMode = mode;
    const source=config || (mode==='account' ? parsedAvatarConfig(activeCitizen?.avatar_config) : null);
    const mappedPreset=presetById(source?.presetId) || farmerPresetForAvatar(mode==='registration' ? $('#citizenAvatarSelect').value : activeCitizen?.avatar);
    const isNewRegistration=mode==='registration' && !source;
    const gender=isNewRegistration ? '' : normalizeAvatarConfig(source || mappedPreset.config).profileId.split('-')[0];
    const exactPreset=presetById(source?.presetId) || (source ? FARMER_PRESETS.find((item)=>JSON.stringify(item.config.appearance)===JSON.stringify(normalizeAvatarConfig(source).appearance)) : mappedPreset);
    $('#avatarCustomizerTitle').textContent = mode === 'registration' ? 'Pilih avatar untuk akunmu' : `Pilih avatar ${activeCitizen?.account_type === 'admin' ? 'admin' : 'warga'}`;
    chooseGender(gender, exactPreset?.id || '');
    if(source)setSelectedPreset({id:'custom',name:'Karakter saya',config:normalizeAvatarConfig(source)});
    status.textContent=mode==='registration'?'Langkah 1: pilih cowok atau cewek. Langkah 2: pilih avatar siap pakai.':'Pilih tipe karakter, lalu pilih avatar siap pakai. Perubahan akan langsung terlihat di pratinjau.';
  };
  $('#openAvatarCustomizer').addEventListener('click', () => {
    if (!activeCitizen) { $('#profileButton').click(); return; }
    panel.hidden=false;fill(parsedAvatarConfig(activeCitizen.avatar_config), 'account');
  });
  window.addEventListener('semesta:avatar-customizer-open', (event) => {
    if (!['registration','account'].includes(event.detail?.mode)) return;
    panel.hidden=false;fill(event.detail.mode==='account' ? parsedAvatarConfig(activeCitizen?.avatar_config) : pendingAvatarConfig, event.detail.mode);
  });
  $('#closeAvatarCustomizer').addEventListener('click', () => { panel.hidden=true; });
  panel.addEventListener('click', (event) => { if (event.target === panel) panel.hidden=true; });
  useButton.addEventListener('click', async () => {
    if (!selectedPreset) return;
    const avatarConfig=cleanConfig(selectedPreset.config);
    if (avatarCustomizerMode === 'registration') {
      pendingAvatarConfig = avatarConfig;
      $('#registrationAvatarName').textContent = selectedPreset.name;
      $('#registrationAvatarHint').textContent='Avatar siap dipakai. Buat akun untuk menyimpan pilihan ini.';
      renderAvatarPreview(avatarConfig); panel.hidden=true; return;
    }
    if (!activeCitizen) { status.textContent='Masuk sebagai warga untuk menyimpan avatar.'; return; }
    useButton.disabled=true; status.textContent='Menyimpan avatar warga…';
    try {
      const response = await fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'citizen',action:'update_avatar',avatarConfig})});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||'Avatar belum tersimpan.');
      updateCitizenHeader(result.citizen); $('#registrationAvatarName').textContent=selectedPreset.name; $('#registrationAvatarHint').textContent='Avatar yang sedang dipakai. Tekan tombol untuk memilih avatar lain.'; renderAvatarPreview(avatarConfig); panel.hidden=true;
    } catch(error) { status.textContent=error.message; useButton.disabled=false; }
  });
  window.addEventListener('semesta:citizen-change', (event) => { if(!event.detail?.citizen && avatarCustomizerMode==='account') panel.hidden=true; });
}

async function start() {
  // Register map controls immediately; a slow citizen/database request must
  // never leave the opening map looking interactive while its buttons are dead.
  initExploreAvatarCustomizer();
  initWorld();
  const citizenReady = initCitizen();
  window.dispatchEvent(new Event('semesta:entry-ready'));
  citizenReady.then(() => {
    const url = new URL(location.href);
    if (url.searchParams.get('email_verified') !== '1') return;
    url.searchParams.delete('email_verified');
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    if (!activeCitizen) document.querySelector('[data-auth-mode="login"]')?.click();
    $('#profileButton').click();
    $('#citizenError').classList.add('success');
    $('#citizenError').textContent = 'Email berhasil diverifikasi. Sekarang masuk dengan username dan kata sandi.';
  }).catch((error) => console.error('Profil warga belum dapat dimuat:', error));
}

// The public world has no production player or admin dependency.
let activeRepublicWorld=null;
let republicMinimap=null;

function initWorld() {
  const areaMusic=initAreaMusic(),savedState=readGameState();
  let destination=WORLD_DESTINATIONS[savedState.destination]?savedState.destination:'jakarta';
  let location=savedState.worldLayoutVersion===2?savedState.location||'stage':'stage';
  let districtId=regionalLocation(savedState.district,destination).id;
  let phase=getWorldPhase(),lastMap=savedState.lastMap==='city'?'city':'region';
  const atlas=mountRepublicAtlas($('#republicAtlas'),{selected:destination,onSelect:selectDestination});
  const regional=mountRepublicRegionalMap($('#regionalMap'),{city:destination,selected:districtId,onSelect:selectDistrict});
  const plan=mountRepublicSitePlan($('#cityMapArt'),{city:'jakarta',selected:location,phase,onSelect:selectLocation});
  const phasePicker=mountPhasePicker($('#worldPhasePicker'),{onChange:applyPhase});
  republicMinimap=mountRepublicMinimap($('#republicMinimap'),{city:destination,phase,onOpen:(mode,city)=>{if(mode==='regional')selectDestination(city);showScreen(mode==='regional'?'region':'city');}});

  function applyPhase(next){phase=next;phasePicker.select(phase);plan.update({phase});selectLocation(location);$('#worldPhaseStatus').textContent=phase==='after-day2'?'SESUDAH DAY 2 · KOPLAK + SPPG BERDIRI':'SEBELUM DAY 2 · PANGGUNG + FONDASI';republicMinimap?.update({city:destination,phase});}
  window.addEventListener(WORLD_PHASE_EVENT,event=>applyPhase(event.detail.phase));
  window.addEventListener('storage',event=>{if(event.key===WORLD_PHASE_KEY)applyPhase(getWorldPhase());});

  function selectDestination(id){
    if(!WORLD_DESTINATIONS[id])return;destination=id;const data=WORLD_DESTINATIONS[id],capital=id==='jakarta';
    atlas.select(id);$('#destinationIcon').textContent=String(Object.keys(WORLD_DESTINATIONS).indexOf(id)+1).padStart(2,'0');
    $('#destinationCountry').textContent=`REPUBLIK WKWKWK · ${capital?'IBU KOTA':'WILAYAH BARU'}`;
    $('#destinationTitle').textContent=data.name;
    $('#destinationDesc').textContent=capital?'Kota pertama di daratan utama. Panggung warga dan fondasi rumah menjadi titik awal republik.':`${data.subtitle}. Bentang wilayah tersedia untuk rencana warga berikutnya.`;
    $('#destinationNote').textContent='Buka peta regional untuk memilih kawasan kota, desa, hutan atau pegunungan.';
    $('#enterCity').innerHTML='BUKA PETA REGIONAL <span>↗</span>';
    districtId=regionalLocation(undefined,id).id;regional.update({city:id,selected:districtId});
    saveGameState({destination,district:districtId});
  }
  function selectDistrict(id){
    const district=regionalLocation(id,destination);districtId=district.id;regional.update({city:destination,selected:districtId});
    if(district.city&&WORLD_DESTINATIONS[district.city])destination=district.city;
    $('#regionTitle').textContent=`Wilayah ${WORLD_DESTINATIONS[destination].name}`;
    $('#regionIntro').textContent=destination==='jakarta'?'Pusat republik dan wilayah sekitarnya: desa, pedesaan, hutan, serta perbukitan.':'Bentang alam di sekitar calon kota. Seluruh kawasan masih belum dibangun.';
    $('#openCapitalPlan').hidden=destination!=='jakarta';
    $('#regionLocationTitle').textContent=district.name;$('#regionLocationDescription').textContent=district.description;
    $('#regionLocationTag').textContent={urban:'KAWASAN KOTA',village:'DESA',countryside:'PEDESAAN',forest:'HUTAN',mountains:'PEGUNUNGAN'}[district.kind]||'WILAYAH';
    $('#enterRegionalLocation').setAttribute('aria-label',`Jelajahi ${district.name}`);
    saveGameState({destination,district:districtId});
  }
  function updateCity(){
    const data=WORLD_DESTINATIONS.jakarta;$('#cityTitle').textContent=`Denah rinci ${data.name}`;$('#cityCountry').textContent='REPUBLIK WKWKWK · IBU KOTA';
    $('#cityIntro').textContent='Jalan alun-alun, fondasi permukiman, dan petak rencana pembangunan.';
    $('#cityCoordinates').textContent='225 × 215 M · DENAH RINCI';
    plan.update({city:'jakarta',phase,selected:location});selectLocation(location);applyPhase(phase);
  }
  function selectLocation(id){
    const site=mapLocation('jakarta',id,phase);location=site.id;plan.update({city:'jakarta',phase,selected:location});
    $('#locationEmoji').textContent='03';$('#locationTitle').textContent=site.name;$('#locationDescription').textContent=site.description;$('#locationTag').textContent=site.tag;
    $('#enterLocation').innerHTML='JELAJAHI TITIK INI <span>↗</span>';$('#enterLocation').setAttribute('aria-label',`Jelajahi ${site.name}${activeCitizen?'':' sebagai tamu'}`);
    saveGameState({location});
  }
  function stopArea(){areaRunToken++;disposeActiveArea();disposeActiveArea=()=>{};activeRepublicWorld=null;areaMusic.pause();$('#dialogue').classList.remove('visible');$('#citizenChat').hidden=true;}
  function showScreen(screen,{restore=false}={}){
    if(screen!=='explore')stopArea();
    for(const id of ['world','region','city','explore'])$(`#${id}Screen`).classList.toggle('active',screen===id);
    document.body.classList.toggle('exploring',screen==='explore');document.body.classList.remove('capture-mode');
    if(screen==='world')atlas.select(destination);
    if(screen==='region'){lastMap='region';selectDistrict(districtId);}
    if(screen==='city'){lastMap='city';destination='jakarta';regional.update({city:destination});updateCity();}
    saveGameState({screen,destination,location,district:districtId,lastMap,region:'kota'});
    if(screen==='explore'){
      const site=lastMap==='city'?mapLocation('jakarta',location,phase):regionalLocation(districtId,destination);
      const restorePosition=restore&&savedState.worldLayoutVersion===2?savedState.playerPosition:null;
      $('#exploreCityName').textContent=WORLD_DESTINATIONS[destination].name.toUpperCase();$('#exploreLocationName').textContent=site.name.toUpperCase();
      areaMusic.play('kota');runArea({id:'kota',name:site.name,entry:restorePosition?{...restorePosition,yaw:savedState.playerYaw||0}:site.entry},WORLD_DESTINATIONS[destination]);
    }
  }
  $('#enterCity').addEventListener('click',()=>showScreen('region'));
  $('#enterRegionalLocation').addEventListener('click',()=>{lastMap='region';showScreen('explore');});
  $('#openCapitalPlan').addEventListener('click',()=>showScreen('city'));
  $('#enterLocation').addEventListener('click',()=>{lastMap='city';showScreen('explore');});
  $('#backToWorld').addEventListener('click',()=>showScreen('world'));
  $('#backToWorldFromRegion').addEventListener('click',()=>showScreen('world'));
  $('#backToRegion').addEventListener('click',()=>showScreen('region'));
  $('#backToCity').addEventListener('click',()=>showScreen(lastMap));
  $('#backToCityQuick').addEventListener('click',()=>showScreen('region'));
  $('#backToWorldFromExplore').addEventListener('click',()=>showScreen('world'));
  $('#captureButton').addEventListener('click',()=>document.body.classList.add('capture-mode'));
  $('#exitCapture').addEventListener('click',()=>document.body.classList.remove('capture-mode'));
  window.addEventListener('keydown',event=>{if(event.code==='Escape')document.body.classList.remove('capture-mode');});
  window.addEventListener('semesta:citizen-change',()=>selectLocation(location));
  const restoredDistrict=districtId;selectDestination(destination);districtId=restoredDistrict;regional.select(districtId);applyPhase(phase);
  const screen=['region','city','explore'].includes(savedState.screen)?savedState.screen:'world';
  showScreen(screen,{restore:true});
}

async function runRepublicArea(place,city){
  const runToken=++areaRunToken;disposeActiveArea();
  const events=new AbortController();let controller=null;
  const loading=document.createElement('div');loading.className='avatar-loading';loading.setAttribute('role','status');loading.textContent='Menyiapkan dunia jelajah…';$('#exploreScreen').append(loading);
  document.body.classList.add('republic-openworld-active');
  disposeActiveArea=()=>{events.abort();controller?.dispose();loading.remove();document.body.classList.remove('republic-openworld-active');if(activeRepublicWorld===controller)activeRepublicWorld=null;};
  $('#worldError').classList.remove('visible');$('#worldFallback')?.remove();$('#world').style.display='';document.body.classList.remove('capture-mode');
  try{
    const {mountRepublicOpenWorld}=await import('./republic-openworld.js');
    if(events.signal.aborted||runToken!==areaRunToken)return;
    controller=await mountRepublicOpenWorld({canvas:$('#world'),city:city.id,entry:place.entry,events,apiUrl:API_URL,activeCitizen,
      onState(state){if(events.signal.aborted||runToken!==areaRunToken)return;republicMinimap?.update(state);saveGameState({worldLayoutVersion:2,playerPosition:state.position,playerYaw:state.yaw,cameraZoom:state.zoom});},
      onError(error){if(!events.signal.aborted)reportWorldIssue(error);},
    });
    if(events.signal.aborted||runToken!==areaRunToken){controller.dispose();return;}activeRepublicWorld=controller;
    republicMinimap?.update({city:city.id,phase:getWorldPhase(),position:place.entry,yaw:place.entry?.yaw||0});
  }catch(error){if(!events.signal.aborted)reportWorldIssue(error);}finally{loading.remove();}
}

let areaRunToken = 0;
let disposeActiveArea = () => {};
async function runArea(place,city){return runRepublicArea(place,city);}

start().catch((error) => { console.error(error); const notice = document.createElement('div'); notice.className = 'build-notice'; notice.textContent = 'Belum berhasil dibuka. Pastikan XAMPP aktif dan halaman dimuat ulang.'; document.body.append(notice); });
