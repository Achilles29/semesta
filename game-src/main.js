import {openCitizenProposals} from './citizen-proposals.js';
import { professionRecommendation } from './citizen-professions.js';
import { renderIdentityCard, renderAuthAvailability } from './citizen-identity.js';
import { mountCitizenStarter } from './citizen-starter.js';
import { createHumanModel, preloadAvatars, loadAvatarProfile, animateAvatar, avatarSpeed, disposeAvatar } from './avatar-runtime.js';
import { attachCitizenAccessories } from './citizen-accessories.js';
import { catalog as AVATAR_V15_CATALOG, presets as FARMER_PRESETS, avatarCharacterOptions as farmerCharacterOptions, normalizeAvatarConfig, mountAvatarEditor } from './avatar-v15-config.js';
import { createAvatarThumbnails } from './avatar-catalog-thumbnails.js';
import { WORLD_DESTINATIONS, getWorldPhase, usePublishedWorldPhase } from './republic-world-layout.js';
import { WORLD_STATE_EVENT, WORLD_SYNC_EVENT, getSharedWorldSnapshot, startSharedWorldSync } from './republic-world-state.js';
import { mountRepublicAtlas, mountRepublicRegionalMap, regionalLocation, mountRepublicSitePlan, mountRepublicMinimap, mapLocation } from './republic-map.js';

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
let pendingAvatarManuallyChosen = false;
let avatarThumbnailService = null;
let avatarPreviewRequest = 0;
async function renderAvatarPreview(config, { identity = false } = {}) {
  const request = ++avatarPreviewRequest;
  const registrationImage = $('#registrationAvatarPreview');
  const images = [];
  if (registrationImage && !$('#citizenProfileFields')?.hidden) images.push(registrationImage);
  const identityImage = $('#identityAvatarPreview');
  if (identity && identityImage && !$('#citizenIdentityCard')?.hidden) images.push(identityImage);
  if (!images.length) return;
  try {
    await loadAvatarProfile(normalizeAvatarConfig(config).profileId);
    if (request !== avatarPreviewRequest) return;
    if (!avatarThumbnailService) {
      const three = await import('three');
      if (request !== avatarPreviewRequest) return;
      avatarThumbnailService ||= createAvatarThumbnails(three);
    }
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
  $('#worldProposalButton')?.addEventListener('click',()=>openCitizenProposals({apiUrl:API_URL}));
  $('#citizenProposalButton')?.addEventListener('click',()=>openCitizenProposals({apiUrl:API_URL}));
  const panel = $('#citizenPanel'), form = $('#citizenForm'), error = $('#citizenError');
  const profileFields = $('#citizenProfileFields'), submit = $('#citizenSubmit');
  const google = $('#googleSsoButton');
  const profileFieldNames = { gender:'gender', religion:'religion', birthProvince:'birth_province', birthCity:'birth_city', birthDate:'birth_date', occupation:'occupation', educationLevel:'education_level', domicileProvince:'domicile_province', domicileCity:'domicile_city' };
  let authOptions = null, busy = false;
  const message = (text, success = false) => { error.textContent = text; error.classList.toggle('success', success); };
  const fillProfileForm = citizen => {
    for (const [field, column] of Object.entries(profileFieldNames)) form.elements[field].value = citizen?.[column] || '';
    form.elements.avatar.value = citizen?.avatar || 'warga';
    form.elements.displayName.value = citizen?.display_name || '';
    form.elements.house.value = citizen?.house || 'rumah-kayu';
  };
  const availability = () => renderAuthAvailability(authOptions, { google, status:$('#authServiceStatus'), submit, registering:!activeCitizen && authMode === 'register', loggedIn:!!activeCitizen });
  const updateHeader = updateCitizenHeader = citizen => {
    if ((citizen?.id || null) !== (activeCitizen?.id || null)) { pendingAvatarConfig = null; pendingAvatarManuallyChosen = false; }
    activeCitizen = citizen;
    document.body.classList.toggle('has-citizen', !!citizen);
    $('#headerAvatar').textContent = citizen ? (citizen.display_name?.trim()?.[0]?.toUpperCase() || 'W') : '↗';
    $('#headerCitizenName').textContent = citizen ? citizen.display_name : 'MASUK / DAFTAR WARGA';
    $('#mapAvatar').querySelector('b').textContent = citizen ? (citizen.display_name?.trim()?.[0]?.toUpperCase() || 'W') : '';
    $('#mapAvatar').querySelector('span').textContent = citizen ? citizen.display_name.toUpperCase() : '';
    $('#worldCitizenStatus').textContent = citizen ? `${citizen.display_name.toUpperCase()} · ${citizen.account_type === 'admin' ? 'ADMIN' : 'WARGA'} AKTIF` : 'TAMU · PETA TERBUKA';
    const home = $('#citizenHome');
    if (home) home.textContent = citizen ? `Preferensi gaya: ${houseNames[citizen.house] || 'Rumah Warga'} · ${citizen.display_name}` : '';
    renderIdentityCard($('#citizenIdentityCard'), citizen);
    const config = parsedAvatarConfig(citizen?.avatar_config);
    if (config) renderAvatarPreview(config, { identity:true });
    window.dispatchEvent(new CustomEvent('semesta:citizen-change', { detail:{ citizen } }));
  };
  const recommend = (explicit = false) => {
    if (!explicit && (pendingAvatarManuallyChosen || parsedAvatarConfig(activeCitizen?.avatar_config))) return;
    const suggestion = professionRecommendation(form.elements.occupation.value, form.elements.gender.value);
    if (!suggestion) {
      $('#registrationAvatarHint').textContent = 'Pilih jenis kelamin karakter dan profesi, atau pilih penampilan sendiri lewat Racik avatar.';
      if (explicit) message('Pilih karakter cowok atau cewek dan profesi untuk memakai saran, atau racik penampilan sendiri.');
      return;
    }
    pendingAvatarConfig = suggestion.config;
    pendingAvatarManuallyChosen = false;
    form.elements.avatar.value = suggestion.avatar;
    $('#registrationAvatarName').textContent = suggestion.name;
    $('#registrationAvatarHint').textContent = suggestion.note + (activeCitizen ? ' Tekan Simpan karakter untuk menerapkan.' : ' Anda tetap bebas mengganti penampilan.');
    renderAvatarPreview(pendingAvatarConfig);
    if (explicit) message(activeCitizen ? 'Saran profesi siap ditinjau. Perubahan akan diterapkan setelah Simpan karakter.' : 'Saran profesi dipilih. Anda bisa meraciknya sebelum mendaftar.', true);
  };
  const applyMode = () => {
    const loggedIn = !!activeCitizen, registering = !loggedIn && authMode === 'register';
    $('#citizenPanelTitle').textContent = loggedIn ? (activeCitizen.profile_complete === false ? 'Lengkapi karakter Anda' : 'Kartu & profil warga') : (registering ? 'Jadi bagian dari republik' : 'Selamat datang kembali');
    panel.querySelector('.citizen-intro').textContent = loggedIn ? 'Lihat kartu warga dan atur karakter Anda. Simpan untuk menerapkan perubahan.' : registering ? 'Buat akun, pilih profesi, lalu racik karakter untuk menjelajahi republik.' : 'Masuk dengan username atau email dan kata sandi, atau lanjutkan dengan Google jika tersedia.';
    document.querySelectorAll('.citizen-tabs').forEach(el => el.hidden = loggedIn);
    document.querySelectorAll('[data-auth-mode]').forEach(el => { el.classList.toggle('active', el.dataset.authMode === authMode); el.setAttribute('aria-pressed', String(el.dataset.authMode === authMode)); });
    document.querySelectorAll('.register-only').forEach(el => el.hidden = !registering);
    $('#citizenDisplayNameLabel').hidden = !loggedIn && !registering;
    form.elements.username.closest('label').hidden = loggedIn;
    form.elements.username.required = !loggedIn;
    form.elements.username.maxLength = registering ? 32 : 190;
    if (registering) form.elements.username.pattern = '[A-Za-z0-9_.-]{3,32}'; else form.elements.username.removeAttribute('pattern');
    $('#citizenUsernameLabel').textContent = registering ? 'Username · 3–32 karakter' : 'Username atau email';
    form.elements.email.required = registering;
    form.elements.password.closest('label').hidden = loggedIn;
    form.elements.password.required = !loggedIn;
    form.elements.password.autocomplete = registering ? 'new-password' : 'current-password';
    form.elements.displayName.required = loggedIn || registering;
    profileFields.hidden = !loggedIn && !registering;
    form.elements.gender.required = form.elements.occupation.required = loggedIn || registering;
    $('#citizenLogout').hidden = !loggedIn;
    $('#verificationResend').hidden = registering || (loggedIn && (Number(activeCitizen.email_verified) === 1 || !authOptions?.emailDeliveryAvailable));
    submit.textContent = loggedIn ? 'SIMPAN KARAKTER ↗' : registering ? 'BUAT AKUN & KARTU WARGA ↗' : 'MASUK KE REPUBLIK ↗';
    availability();
  };
  const showPanel = () => {
    panel.hidden = false;
    message('');
    if (activeCitizen && !pendingAvatarConfig) {
      fillProfileForm(activeCitizen);
      const config = parsedAvatarConfig(activeCitizen.avatar_config);
      $('#registrationAvatarName').textContent = config ? 'Karakter pilihan Anda' : 'Pilih karakter dan profesi';
      $('#registrationAvatarHint').textContent = config ? 'Ganti profesi atau jenis kelamin untuk melihat saran baru. Penampilan tersimpan berubah setelah Simpan karakter.' : 'Lengkapi karakter sebelum mulai bermain bersama warga.';
    }
    form.elements.verificationEmail.closest('label').hidden = true;
    applyMode();
    if (pendingAvatarConfig) {
      renderAvatarPreview(pendingAvatarConfig);
      if (activeCitizen) message('Rancangan avatar belum diterapkan. Tekan Simpan karakter untuk menyimpannya.');
    } else if (activeCitizen?.avatar_config) renderAvatarPreview(parsedAvatarConfig(activeCitizen.avatar_config), { identity:true });
    else recommend();
    if (activeCitizen?.profile_complete === false && !pendingAvatarConfig) message('Pilih jenis kelamin karakter, profesi, dan penampilan untuk melengkapi kartu warga.');
  };
  $('#profileButton').addEventListener('click', showPanel);
  $('#chooseRegistrationAvatar').addEventListener('click', () => {
    if (!form.elements.gender.value || !form.elements.occupation.value) { message('Pilih jenis kelamin karakter dan profesi terlebih dahulu.'); form.elements.gender.reportValidity(); form.elements.occupation.reportValidity(); return; }
    window.dispatchEvent(new CustomEvent('semesta:avatar-customizer-open', { detail:{ mode:activeCitizen ? 'profile' : 'registration' } }));
  });
  $('#useProfessionSuggestion').addEventListener('click', () => { if (!busy) recommend(true); });
  $('#closeCitizenPanel').addEventListener('click', () => { panel.hidden = true; $('#profileButton').focus(); });
  panel.addEventListener('click', event => { if (event.target === panel) panel.hidden = true; });
  document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    authMode = button.dataset.authMode;
    form.elements.verificationEmail.closest('label').hidden = true;
    message(''); applyMode(); if (authMode === 'register') recommend();
  }));
  google.addEventListener('click', event => { if (!authOptions?.googleAvailable) { event.preventDefault(); message('Google belum tersedia. Gunakan email dan kata sandi.'); } });
  const post = async payload => {
    const response = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify({ resource:'citizen', ...payload }) });
    let result;
    try { result = await response.json(); } catch { throw new Error('Layanan akun belum merespons. Coba kembali nanti.'); }
    if (!response.ok) throw new Error(result.error || 'Profil warga belum bisa disimpan.');
    return result;
  };
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const data = new FormData(form), action = activeCitizen ? 'update' : authMode;
    if (action !== 'login' && !pendingAvatarConfig && !activeCitizen?.avatar_config) { message('Pilih avatar terlebih dahulu.'); return; }
    const payload = { action, username:data.get('username'), email:data.get('email'), password:data.get('password'), displayName:data.get('displayName'), avatar:data.get('avatar') || activeCitizen?.avatar, house:data.get('house') || activeCitizen?.house };
    if (action !== 'login') {
      for (const field of Object.keys(profileFieldNames)) payload[field] = data.get(field) || '';
      if (pendingAvatarConfig) payload.avatarConfig = pendingAvatarConfig;
    }
    busy = true; submit.disabled = true; submit.setAttribute('aria-busy', 'true'); message('Menyimpan akun warga…');
    try {
      const result = await post(payload);
      form.elements.password.value = '';
      if (result.verificationRequired) {
        authMode = 'login'; applyMode();
        form.elements.verificationEmail.value = data.get('email');
        message(result.message, true);
        return;
      }
      if (result.citizen) {
        updateHeader(result.citizen);
        saveGameState({ citizen:{ displayName:result.citizen.display_name, avatar:result.citizen.avatar, house:result.citizen.house } });
        pendingAvatarConfig = null; pendingAvatarManuallyChosen = false;
        showPanel();
        message(result.citizen.profile_complete === false ? 'Satu langkah lagi: lengkapi karakter untuk mulai bermain.' : action === 'register' ? 'Selamat datang! Kartu warga Anda sudah terbit. Tutup panel untuk menjelajahi republik.' : 'Profil warga tersimpan. Selamat menjelajah!', true);
      }
    } catch (failure) { message(failure.message); }
    finally { busy = false; submit.removeAttribute('aria-busy'); availability(); }
  });
  $('#verificationResend').addEventListener('click', async () => {
    if (busy) return;
    const field = form.elements.verificationEmail, email = activeCitizen?.email || field.value.trim();
    if (!email) { field.closest('label').hidden = false; field.focus(); return; }
    if (!activeCitizen && !field.checkValidity()) { field.reportValidity(); return; }
    busy = true; $('#verificationResend').disabled = true; message('Mengirim tautan verifikasi…');
    try { const result = await post({ action:'resend', email }); message(result.message, true); }
    catch (failure) { message(failure.message); }
    finally { busy = false; $('#verificationResend').disabled = false; }
  });
  $('#citizenLogout').addEventListener('click', async () => {
    if (busy) return;
    busy = true; $('#citizenLogout').disabled = true;
    try {
      await post({ action:'logout' }); updateHeader(null); pendingAvatarConfig = null; pendingAvatarManuallyChosen = false; form.reset(); panel.hidden = true;
      $('#exploreScreen').classList.remove('active'); document.body.classList.remove('exploring'); $('#cityScreen').classList.remove('active'); $('#worldScreen').classList.add('active'); saveGameState({ screen:'world' });
    } catch (failure) { message(failure.message); }
    finally { busy = false; $('#citizenLogout').disabled = false; }
  });
  form.elements.occupation.addEventListener('change', () => { if (!busy) recommend(true); });
  form.elements.gender.addEventListener('change', () => { if (!busy) recommend(true); });
  const results = await Promise.allSettled(['citizen_options','citizen','auth_options'].map(async resource => {
    const response = await fetch(`${API_URL}?resource=${resource}`, { headers:{ Accept:'application/json' } });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Layanan akun belum tersedia.'); return result;
  }));
  if (results[0].status === 'fulfilled') {
    const options = results[0].value.options || {}; window.citizenMasterOptions = options;
    for (const name of ['gender','occupation']) {
      const select = form.elements[name], current = select.value;
      select.replaceChildren(new Option(name === 'gender' ? 'Pilih karakter' : 'Pilih profesi', ''));
      (options[name] || []).forEach(option => select.add(new Option(option.label, option.value)));
      select.value = current;
    }
  } else message('Pilihan karakter belum tersedia. Muat ulang untuk mencoba lagi.');
  if (results[2].status === 'fulfilled') authOptions = results[2].value;
  updateHeader(results[1].status === 'fulfilled' ? results[1].value.citizen || null : null);
  applyMode();
  if (activeCitizen && (activeCitizen.profile_complete === false || !panel.hidden)) showPanel();
  const url = new URL(location.href);
  if (url.searchParams.has('signed_in')) { url.searchParams.delete('signed_in'); history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`); if (activeCitizen) showPanel(); }
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
  const customEditor=mountAvatarEditor(grid.parentElement, config=>{
    selectedGender=config.profileId.split('-')[0];
    const sourceId=selectedPreset?.config?.presetId;
    if(sourceId?.startsWith('profession-')) config.presetId=sourceId.replace(/-(male|female)$/,`-${selectedGender}`);
    document.querySelectorAll('[data-avatar-gender]').forEach(b=>{const active=b.dataset.avatarGender===selectedGender;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    setSelectedPreset({id:'custom',name:'Karakter saya',config});
  });
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
    const source=config || (mode!=='registration' ? parsedAvatarConfig(activeCitizen?.avatar_config) : null);
    const mappedPreset=presetById(source?.presetId) || farmerPresetForAvatar(mode==='registration' ? $('#citizenAvatarSelect').value : activeCitizen?.avatar);
    const isNewRegistration=mode==='registration' && !source;
    const gender=isNewRegistration ? '' : normalizeAvatarConfig(source || mappedPreset.config).profileId.split('-')[0];
    const exactPreset=presetById(source?.presetId) || (source ? FARMER_PRESETS.find((item)=>JSON.stringify(item.config.appearance)===JSON.stringify(normalizeAvatarConfig(source).appearance)) : mappedPreset);
    $('#avatarCustomizerTitle').textContent = mode === 'registration' ? 'Pilih avatar untuk akunmu' : mode === 'profile' ? 'Racik rancangan karakter' : `Pilih avatar ${activeCitizen?.account_type === 'admin' ? 'admin' : 'warga'}`;
    chooseGender(gender, exactPreset?.id || '');
    if(source)setSelectedPreset({id:'custom',name:'Karakter saya',config:normalizeAvatarConfig(source)});
    status.textContent=mode==='profile'?'Racik penampilan, gunakan pilihan ini, lalu Simpan karakter pada profil.':mode==='registration'?'Pilih avatar siap pakai atau ubah bagian penampilan di editor.':'Pilih tipe karakter, lalu pilih avatar siap pakai. Perubahan akan langsung terlihat di pratinjau.';
  };
  $('#openAvatarCustomizer').addEventListener('click', () => {
    if (!activeCitizen) { $('#profileButton').click(); return; }
    panel.hidden=false;fill(parsedAvatarConfig(activeCitizen.avatar_config), 'account');
  });
  window.addEventListener('semesta:avatar-customizer-open', (event) => {
    if (!['registration','profile','account'].includes(event.detail?.mode)) return;
    const source=event.detail.mode==='account' ? parsedAvatarConfig(activeCitizen?.avatar_config) : pendingAvatarConfig || (event.detail.mode==='profile' ? parsedAvatarConfig(activeCitizen?.avatar_config) : null);
    panel.hidden=false;fill(source, event.detail.mode);
  });
  $('#closeAvatarCustomizer').addEventListener('click', () => { panel.hidden=true; });
  panel.addEventListener('click', (event) => { if (event.target === panel) panel.hidden=true; });
  useButton.addEventListener('click', async () => {
    if (!selectedPreset) return;
    const avatarConfig=cleanConfig(selectedPreset.config);
    if (avatarCustomizerMode === 'registration' || avatarCustomizerMode === 'profile') {
      pendingAvatarConfig = avatarConfig;
      pendingAvatarManuallyChosen = true;
      $('#registrationAvatarName').textContent = selectedPreset.name;
      $('#registrationAvatarHint').textContent=avatarCustomizerMode==='profile'?'Rancangan avatar siap. Tekan Simpan karakter untuk menerapkan.':'Avatar siap dipakai. Buat akun untuk menyimpan pilihan ini.';
      renderAvatarPreview(avatarConfig); panel.hidden=true; return;
    }
    if (!activeCitizen) { status.textContent='Masuk sebagai warga untuk menyimpan avatar.'; return; }
    useButton.disabled=true; status.textContent='Menyimpan avatar warga…';
    try {
      const response = await fetch(`${API_URL}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'citizen',action:'update_avatar',avatarConfig})});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||'Avatar belum tersimpan.');
      pendingAvatarConfig=null;pendingAvatarManuallyChosen=false;
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
  const starter=mountCitizenStarter($('#citizenStarter'),{apiUrl:API_URL});
  window.addEventListener('pagehide',()=>starter.dispose(),{once:true});
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
  usePublishedWorldPhase();
  const areaMusic=initAreaMusic(),savedState=readGameState();
  let destination=WORLD_DESTINATIONS[savedState.destination]?savedState.destination:'jakarta';
  let location=savedState.worldLayoutVersion===2?savedState.location||'stage':'stage';
  let districtId=regionalLocation(savedState.district,destination).id;
  let phase=getWorldPhase(),projects=[],lastMap=savedState.lastMap==='city'?'city':'region';
  const atlas=mountRepublicAtlas($('#republicAtlas'),{selected:destination,onSelect:id=>{selectDestination(id);showScreen('region');}});
  const regional=mountRepublicRegionalMap($('#regionalMap'),{city:destination,selected:districtId,onSelect:selectDistrict});
  const plan=mountRepublicSitePlan($('#cityMapArt'),{city:'jakarta',selected:location,phase,onSelect:selectLocation});
  const phaseStatus=$('#worldPhasePicker');
  phaseStatus.innerHTML='<span role="status" data-world-sync>Memuat keadaan dunia dari server…</span><button type="button" data-world-retry hidden>Coba lagi</button>';
  republicMinimap=mountRepublicMinimap($('#republicMinimap'),{city:destination,phase,onOpen:(mode,city)=>{if(mode==='regional')selectDestination(city);showScreen(mode==='regional'?'region':'city');}});

  function applyPhase(next){phase=next;plan.update({phase,projects});selectLocation(location);$('#worldPhaseStatus').textContent=!getSharedWorldSnapshot()?'MENUNGGU DUNIA SERVER':phase==='after-day2'?'SESUDAH DAY 2 · KOPLAK + SPPG BERDIRI':'SEBELUM DAY 2 · PANGGUNG + FONDASI';republicMinimap?.update({city:destination,phase,projects});}
  window.addEventListener(WORLD_STATE_EVENT,event=>{projects=event.detail.projects;applyPhase(event.detail.world.phase);});
  const setSyncStatus=({state,message,hasSnapshot})=>{
    const ready=!!getSharedWorldSnapshot();
    phaseStatus.querySelector('[data-world-sync]').textContent=state==='online'?`Dunia bersama · versi ${getSharedWorldSnapshot().world.version}`:state==='offline'?`${message} ${hasSnapshot?'Menampilkan keadaan terakhir dari server.':''}`:ready?'Memperbarui dunia bersama…':'Memuat keadaan dunia dari server…';
    phaseStatus.querySelector('[data-world-retry]').hidden=state!=='offline';
    const globalNotice=$('#sharedWorldNotice');globalNotice.hidden=state==='online'||state==='loading'&&ready;
    globalNotice.querySelector('span').textContent=state==='offline'?`${message} ${hasSnapshot?'Keadaan terakhir tetap ditampilkan.':'Jelajah menunggu data dunia; peta tetap dapat dibuka.'}`:'Memuat dunia bersama…';
    $('#retrySharedWorld').hidden=state!=='offline';
    for(const id of ['enterRegionalLocation','enterLocation']){const button=$('#'+id);button.disabled=!ready;button.title=ready?'':'Menunggu keadaan dunia dari server';}
  };
  window.addEventListener(WORLD_SYNC_EVENT,event=>setSyncStatus(event.detail));
  const worldSync=startSharedWorldSync({apiUrl:API_URL});
  phaseStatus.querySelector('[data-world-retry]').addEventListener('click',()=>worldSync.refresh());
  $('#retrySharedWorld').addEventListener('click',()=>worldSync.refresh());
  window.addEventListener('pagehide',event=>{if(!event.persisted)worldSync.dispose();});

  function selectDestination(id){
    if(!WORLD_DESTINATIONS[id])return;destination=id;const data=WORLD_DESTINATIONS[id],capital=id==='jakarta';
    atlas.select(id);$('#enterCity').textContent=`Buka ${data.name} ↗`;
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
    plan.update({city:'jakarta',phase,projects,selected:location});selectLocation(location);applyPhase(phase);
  }
  function selectLocation(id){
    const site=mapLocation('jakarta',id,phase,projects);location=site.id;plan.update({city:'jakarta',phase,projects,selected:location});
    $('#locationEmoji').textContent='03';$('#locationTitle').textContent=site.name;$('#locationDescription').textContent=site.description;$('#locationTag').textContent=site.tag;
    $('#enterLocation').innerHTML='JELAJAHI TITIK INI <span>↗</span>';$('#enterLocation').setAttribute('aria-label',`Jelajahi ${site.name}${activeCitizen?'':' sebagai tamu'}`);
    saveGameState({location});
  }
  function stopArea(){areaRunToken++;disposeActiveArea();disposeActiveArea=()=>{};activeRepublicWorld=null;areaMusic.pause();$('#dialogue').classList.remove('visible');$('#citizenChat').hidden=true;}
  function showScreen(screen,{restore=false}={}){
    if(screen==='explore'&&!getSharedWorldSnapshot()){screen=lastMap;}
    if(screen==='explore'&&activeCitizen?.profile_complete===false){$('#profileButton').click();$('#citizenError').textContent='Lengkapi profesi, jenis kelamin, dan avatar untuk mulai menjadi warga.';return;}
    if(screen!=='explore')stopArea();
    for(const id of ['world','region','city','explore'])$(`#${id}Screen`).classList.toggle('active',screen===id);
    document.body.classList.toggle('exploring',screen==='explore');document.body.classList.remove('capture-mode');
    if(screen==='world')atlas.select(destination);
    if(screen==='region'){lastMap='region';selectDistrict(districtId);}
    if(screen==='city'){lastMap='city';destination='jakarta';regional.update({city:destination});updateCity();}
    saveGameState({screen,destination,location,district:districtId,lastMap,region:'kota'});
    if(screen==='explore'){
      const site=lastMap==='city'?mapLocation('jakarta',location,phase,projects):regionalLocation(districtId,destination);
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
  window.addEventListener('semesta:citizen-change',event=>{
    selectLocation(location);
    // A restored world can start before the account request finishes. Revoke
    // exploration as soon as that request reveals an incomplete profile.
    if(event.detail?.citizen?.profile_complete===false&&$('#exploreScreen').classList.contains('active')){
      showScreen('region');
      $('#profileButton').click();
    }
  });
  const restoredDistrict=districtId;selectDestination(destination);districtId=restoredDistrict;regional.select(districtId);applyPhase(phase);
  const screen=['region','city','explore'].includes(savedState.screen)?savedState.screen:'world';
  showScreen(screen,{restore:true});
  let restoreUntouched=true;
  const cancelRestore=()=>{restoreUntouched=false;};
  window.addEventListener('click',cancelRestore,{once:true});window.addEventListener('keydown',cancelRestore,{once:true});
  worldSync.ready.then(snapshot=>{
    window.removeEventListener('click',cancelRestore);window.removeEventListener('keydown',cancelRestore);
    if(snapshot&&screen==='explore'&&restoreUntouched)showScreen('explore',{restore:true});
  });
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
