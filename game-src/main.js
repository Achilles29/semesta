import * as THREE from 'three';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const GAME_STATE_KEY = 'semesta-nyasar-play-state-v1';
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
  jakarta: { name: 'Jakarta', country: 'INDONESIA · ASIA TENGGARA', coordinates: '06°12′ S · 106°49′ E', icon: '☀', desc: 'Kota yang selalu punya jalan pintas, kecuali saat sedang buru-buru.', note: 'Warga melapor: ada rapat yang molor sampai besok.', x: 61, y: 69 },
  tokyo: { name: 'Tokyo', country: 'JEPANG · ASIA TIMUR', coordinates: '35°41′ N · 139°41′ E', icon: '🌸', desc: 'Kereta datang tepat waktu. Kucing penjaga stasiun belum tentu.', note: 'Seekor kucing mengaku kepala peron.', x: 73, y: 43 },
  cairo: { name: 'Kairo', country: 'MESIR · AFRIKA UTARA', coordinates: '30°02′ N · 31°14′ E', icon: '☀', desc: 'Kota tua yang kabarnya menyimpan satu sandal yang tidak punya pasangan.', note: 'Jejaknya mengarah ke pasar rempah.', x: 54, y: 48 },
  lisbon: { name: 'Lisbon', country: 'PORTUGAL · EROPA', coordinates: '38°43′ N · 9°08′ W', icon: '🌤', desc: 'Jalannya menanjak. Ceritanya menurun ke arah yang tidak disangka.', note: 'Trem nomor tujuh membawa tiga koper misterius.', x: 41, y: 43 },
};
const locations = {
  dapur: { name: 'Dapur MBG', emoji: '🍱', tag: 'CERITA HARIAN · MBG', desc: 'Dapur sekolah yang ramai. Sendok sayurnya punya agenda sendiri.', title: 'Sendok Sayur Mengundurkan Diri', hook: 'Pagi ini sendok sayur pamit. Katanya capek mengaduk semuanya.', witness: 'BU NINING', type: 'dapur', colors: ['#f4d275', '#e98d67', '#87ad69'] },
  kopdes: { name: 'Balai Kopdes', emoji: '🏪', tag: 'CERITA HARIAN · KOPDES', desc: 'Toko desa, ruang rapat, dan gudang beras. Semua punya kunci, kecuali lemari kuncinya.', title: 'Timbangan Minta Jadi Bendahara', hook: 'Timbangan di Kopdes menolak menimbang. Katanya mau menghitung kas saja.', witness: 'PAK DARTO', type: 'kopdes', colors: ['#88a872', '#d9a95d', '#93b6a1'] },
  pasar: { name: 'Pasar Sore', emoji: '🥬', tag: 'CERITA HARIAN · PASAR', desc: 'Lapak sayur, kios bumbu, dan satu cabai yang merasa dirinya selebritas.', title: 'Cabai Merah Minta Pengawalan', hook: 'Satu cabai hilang dari lapak. Ada yang melihatnya naik becak.', witness: 'MBAK SARI', type: 'pasar', colors: ['#e98d67', '#e7bf65', '#8aad71'] },
  kampung: { name: 'Gang Bambu', emoji: '🏠', tag: 'CERITA HARIAN · KAMPUNG', desc: 'Gang kecil, halaman hijau, jemuran warga. Kaos kaki sering bertukar alamat.', title: 'Jemuran Punya Grup Arisan', hook: 'Baju-baju di jemuran pindah sendiri. Ternyata mereka sedang rapat.', witness: 'BU MINAH', type: 'kampung', colors: ['#89ad72', '#d7a66c', '#83b3a1'] },
  hutan: { name: 'Hutan Kota', emoji: '🌳', tag: 'CERITA HARIAN · ALAM', desc: 'Tempat ngadem, jalan pagi, dan bertanya pada pohon yang tidak menjawab.', title: 'Pohon Beringin Mau Pindah RT', hook: 'Pohon tua mengajukan surat pindah. Alasannya: terlalu sering jadi tempat curhat.', witness: 'JURU KEBUN', type: 'hutan', colors: ['#79a86f', '#8dbf84', '#b8a766'] },
  kebun: { name: 'Kebun Cempluk', emoji: '🌱', tag: 'KEGIATAN HARIAN · BERKEBUN', desc: 'Kebun kecil di belakang rumah. Tomat, cabai, dan tetangga yang suka ikut menyiram.', title: 'Tomat Minta Jadwal Libur', hook: 'Tomatnya merah semua. Katanya capek dipetik sebelum sempat pamer.', witness: 'CEMPLUK', type: 'kebun', colors: ['#83a86e', '#c9895f', '#a6c083'] },
};

const cityPlaceNames = {
  tokyo: ['Kedai Bento', 'Koperasi Stasiun', 'Pasar Malam', 'Gang Kucing', 'Taman Sakura', 'Kebun Atap'],
  cairo: ['Dapur Koshari', 'Koperasi Nil', 'Pasar Rempah', 'Gang Lentera', 'Taman Sungai Nil', 'Kebun Atap Kaktus'],
  lisbon: ['Dapur Pastel de Nata', 'Koperasi Trem', 'Pasar Bunga', 'Gang Azulejo', 'Taman Miradouro', 'Kebun Bukit'],
};
const cityCaseNames = {
  tokyo: ['Bento Hilang Satu Baris', 'Mesin Tiket Minta Libur', 'Takoyaki Kabur dari Tusukannya', 'Kucing Buka Pos Ronda', 'Pohon Sakura Minta Tukar Jadwal', 'Tomat Ingin Pindah Lantai'],
  cairo: ['Panci Koshari Minta Nama', 'Buku Kas Kehilangan Angka Tujuh', 'Lada Menghilang Saat Dihitung', 'Lentera Minta Dinyanyikan', 'Bangku Taman Pindah Menghadap Air', 'Kaktus Minta Sarung Tangan'],
  lisbon: ['Tart Kabur dari Etalase', 'Tiket Trem Salah Tujuan', 'Buket Minta Jalan-Jalan', 'Ubin Biru Pindah Pola', 'Bangku Meminta Bantal', 'Tomat Ingin Naik Trem'],
};
function locationFor(cityId, locationId) {
  const base = locations[locationId];
  const index = Object.keys(locations).indexOf(locationId);
  const cityColors = { tokyo: ['#e8a5d5', '#7559b8', '#8dd9bf'], cairo: ['#e9ad52', '#218a9b', '#96c66c'], lisbon: ['#ed896a', '#e1b842', '#5ca7ba'] };
  if (cityPlaceNames[cityId]) {
    const name = cityPlaceNames[cityId][index]; const title = cityCaseNames[cityId][index];
    return { ...base, name, title, hook: `Warga ${name} melapor: ${title.toLowerCase()}.`, colors: cityColors[cityId] };
  }
  return base;
}

async function start() {
  if (document.body.classList.contains('admin-body')) { await initEditor(); await initIdeasInbox(); initAdminNavigation(); return; }
  const response = await fetch('api', { headers: { Accept: 'application/json' } });
  const story = await response.json();
  initWorld(story);
}

function initWorld(story) {
  const savedState = readGameState();
  let destination = 'jakarta';
  let location = locations[savedState.location] ? savedState.location : 'dapur';
  let avatar = savedState.worldAvatar && Number.isFinite(savedState.worldAvatar.x) && Number.isFinite(savedState.worldAvatar.y)
    ? { x: savedState.worldAvatar.x, y: savedState.worldAvatar.y }
    : { x: destinationInfo.jakarta.x, y: destinationInfo.jakarta.y };
  const pins = [...document.querySelectorAll('.destination-pin')];
  const zones = [...document.querySelectorAll('.zone-pin')];
  function selectDestination(id, travel = true) {
    if (id !== 'jakarta' || !destinationInfo[id]) return;
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
  pins.forEach((pin) => pin.addEventListener('click', () => selectDestination(pin.dataset.destination)));
  $('#enterCity').addEventListener('click', () => {
    const data = destinationInfo[destination];
    $('#cityTitle').textContent = 'Kampung Sore, dekat Jakarta';
    $('#cityIntro').textContent = 'Satu kampung kecil dengan pasar, kebun, dapur, dan warga yang selalu punya cerita.';
    $('#cityCountry').textContent = data.country;
    $('#cityCoordinates').textContent = data.coordinates;
    $('#exploreCityName').textContent = 'KAMPUNG SORE';
    $('#worldScreen').classList.remove('active'); $('#cityScreen').classList.add('active');
    $('#cityMapArt').dataset.city = destination;
    zones.forEach((zone) => { const id = zone.dataset.location; const dataForPlace = locationFor(destination, id); zone.querySelector('b').textContent = dataForPlace.name.toUpperCase(); });
    selectLocation('dapur');
    saveGameState({ screen: 'city', destination, location, worldAvatar: { x: avatar.x, y: avatar.y } });
  });
  $('#backToWorld').addEventListener('click', () => { $('#cityScreen').classList.remove('active'); $('#worldScreen').classList.add('active'); saveGameState({ screen: 'world', destination, worldAvatar: { x: avatar.x, y: avatar.y } }); });

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
    $('#enterLocation').disabled = id !== 'dapur';
    $('#enterLocation').classList.toggle('location-locked', id !== 'dapur');
    $('#enterLocation').innerHTML = id === 'dapur' ? 'MASUK & JELAJAHI <span>↗</span>' : 'AREA 3D MENYUSUL <span>🔒</span>';
    const chipHost = $('#locationChips');
    chipHost.replaceChildren();
    Object.entries(locations).forEach(([key, base]) => {
      const zone = locationFor(destination, key);
      const button = document.createElement('button'); button.className = `location-chip${key === id ? ' active' : ''}`;
      button.textContent = `${base.emoji} ${zone.name}`; button.addEventListener('click', () => selectLocation(key)); chipHost.append(button);
    });
  }
  zones.forEach((zone) => zone.addEventListener('click', () => selectLocation(zone.dataset.location)));
  $('#cityMapArt').addEventListener('click', (event) => {
    if (event.target.closest('.zone-pin')) return;
    const nearest = zones.map((zone) => { const r = zone.getBoundingClientRect(); return { id: zone.dataset.location, distance: Math.hypot(event.clientX - r.left - r.width / 2, event.clientY - r.top - r.height / 2) }; }).sort((a, b) => a.distance - b.distance)[0];
    if (nearest) selectLocation(nearest.id);
  });
  $('#enterLocation').addEventListener('click', () => {
    if (location !== 'dapur') return;
    $('#cityScreen').classList.remove('active'); $('#exploreScreen').classList.add('active');
    saveGameState({ screen: 'explore', destination, location, worldAvatar: { x: avatar.x, y: avatar.y } });
    runArea(story, locationFor(destination, location), destinationInfo[destination]);
  });
  function showCityMap() { $('#exploreScreen').classList.remove('active'); $('#cityScreen').classList.add('active'); saveGameState({ screen: 'city', destination, location, worldAvatar: { x: avatar.x, y: avatar.y } }); }
  function showWorldMap() { $('#exploreScreen').classList.remove('active'); $('#cityScreen').classList.remove('active'); $('#worldScreen').classList.add('active'); saveGameState({ screen: 'world', destination, location, worldAvatar: { x: avatar.x, y: avatar.y } }); }
  $('#backToCity').addEventListener('click', showCityMap);
  $('#backToCityQuick').addEventListener('click', showCityMap);
  $('#backToWorldFromExplore').addEventListener('click', showWorldMap);

  window.addEventListener('keydown', (event) => {
    if (!$('#worldScreen').classList.contains('active')) return;
    const move = 1.8;
    if (['ArrowUp', 'KeyW'].includes(event.code)) avatar.y -= move;
    if (['ArrowDown', 'KeyS'].includes(event.code)) avatar.y += move;
    if (['ArrowLeft', 'KeyA'].includes(event.code)) avatar.x -= move;
    if (['ArrowRight', 'KeyD'].includes(event.code)) avatar.x += move;
    avatar.x = THREE.MathUtils.clamp(avatar.x, 8, 92); avatar.y = THREE.MathUtils.clamp(avatar.y, 12, 86);
    $('#mapAvatar').style.left = `${avatar.x}%`; $('#mapAvatar').style.top = `${avatar.y}%`;
    let nearest = null; let distance = Infinity;
    Object.entries(destinationInfo).filter(([id]) => id === 'jakarta').forEach(([id, data]) => { const d = Math.hypot(data.x - avatar.x, data.y - avatar.y); if (d < distance) { nearest = id; distance = d; } });
    if (nearest) selectDestination(nearest, false);
    saveGameState({ screen: 'world', destination, worldAvatar: { x: avatar.x, y: avatar.y } });
  });

  let mapPointer = null;
  const map = $('#worldMap');
  map.addEventListener('pointerdown', (event) => { if (event.target.closest('button')) return; mapPointer = event.pointerId; map.setPointerCapture(event.pointerId); moveWorldAvatar(event); });
  map.addEventListener('pointermove', (event) => { if (mapPointer === event.pointerId) moveWorldAvatar(event); });
  map.addEventListener('pointerup', () => { mapPointer = null; }); map.addEventListener('pointercancel', () => { mapPointer = null; });
  function moveWorldAvatar(event) {
    const rect = map.getBoundingClientRect(); avatar.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 100, 7, 93); avatar.y = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 87);
    $('#mapAvatar').style.left = `${avatar.x}%`; $('#mapAvatar').style.top = `${avatar.y}%`;
    let nearest = null; let distance = Infinity;
    Object.entries(destinationInfo).filter(([id]) => id === 'jakarta').forEach(([id, data]) => { const d = Math.hypot(data.x - avatar.x, data.y - avatar.y); if (d < distance) { nearest = id; distance = d; } });
    if (nearest) selectDestination(nearest, false);
    saveGameState({ screen: 'world', destination, worldAvatar: { x: avatar.x, y: avatar.y } });
  }
  selectLocation(location);
  selectDestination(destination, false);
  if (['city', 'explore'].includes(savedState.screen)) {
    $('#enterCity').click();
    selectLocation(location);
  }
  if (savedState.screen === 'explore' && location === 'dapur') $('#enterLocation').click();
}

function runArea(baseStory, place, city) {
  const story = place.type === 'dapur' && city.name === 'Jakarta' ? baseStory : { ...baseStory, title: place.title, hook: place.hook || baseStory.hook, witness: place.witness,
    clues: localClues(place.type, place.witness), endingTitle: `${place.name} ternyata...`,
    endingText: `Urusan kecilnya selesai. ${place.witness} mengajak warga istirahat sebentar sebelum kegiatan berikutnya.`,
    nextPrompt: `Cerita apa yang harus kita temui di ${place.name}? Tulis idemu di komentar.` };
  $('#caseTitle').textContent = story.title; $('#caseHook').textContent = story.hook; $('#caseObjective').textContent = baseStory.objective;
  $('#citizenNote').textContent = `“${baseStory.citizenNote}”`; $('#endingTitle').textContent = story.endingTitle; $('#endingText').textContent = story.endingText; $('#nextPrompt').textContent = story.nextPrompt;
  $('#exploreLocationName').textContent = place.name.toUpperCase();
  const canvas = $('#world'); let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch (error) { reportWorldIssue(error); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(innerWidth, innerHeight, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#b8e2e8'); scene.fog = new THREE.Fog('#b8e2e8', 24, 65);
  const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, .1, 140); const world = new THREE.Group(); scene.add(world);
  function resizeGame() { const aspect = innerWidth / innerHeight; const viewHeight = 19; camera.left = -(viewHeight * aspect) / 2; camera.right = (viewHeight * aspect) / 2; camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); }
  resizeGame();
  scene.add(new THREE.HemisphereLight('#fff8df', '#467a43', 1.55)); const sun = new THREE.DirectionalLight('#fff1d3', 2.35); sun.position.set(-10, 22, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -34; sun.shadow.camera.right = 34; sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34; sun.shadow.bias = -.0002; scene.add(sun);
  const material = (color, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
  function paintedTexture(base, colors, seed, speckCount = 900) {
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 512;
    const ctx = textureCanvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
    let value = seed >>> 0; const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
    colors.forEach((color, index) => { ctx.globalAlpha = index === 0 ? .12 : .08; ctx.fillStyle = color; for (let i = 0; i < speckCount / colors.length; i++) { const size = 1 + random() * 5; ctx.fillRect(random() * 512, random() * 512, size, size * (.35 + random())); } });
    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(textureCanvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4; return texture;
  }
  const grassTexture = paintedTexture('#6fbd43', ['#a0d95c', '#3d963c', '#d0dc69'], 42, 1500);
  const dirtTexture = paintedTexture('#c18a4f', ['#e4bc76', '#8e613d', '#f1d18a'], 81, 1000);
  const palette = { green: material('#64c949'), accent: material(place.colors[1]), leaf: material(place.colors[2]), cream: material('#fff0ce'), brown: material('#8b5b3f'), dark: material('#374650'), blue: material('#55bfe0'), coral: material('#ed705c'), yellow: material('#f6cb4d'), white: material('#fffaf0'), red: material('#e85e50'), soil: material('#9b6845'), path: material('#d8a84c') };
  const sphere = new THREE.SphereGeometry(1, 16, 12), box = new THREE.BoxGeometry(1, 1, 1), cone = new THREE.ConeGeometry(1, 1, 8), cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
  function add(geometry, mat, parent, pos, scale, rot) { const m = new THREE.Mesh(geometry, mat); if (pos) m.position.set(...pos); if (scale) m.scale.set(...scale); if (rot) m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  const colliders = [];
  const addCollider = (x, z, halfX, halfZ) => colliders.push({ x, z, halfX, halfZ });
  function addBranch(parent, from, to, radius, mat) {
    const start = new THREE.Vector3(...from); const end = new THREE.Vector3(...to); const delta = end.clone().sub(start);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(radius * .62, radius, delta.length(), 7), mat);
    branch.position.copy(start.clone().add(end).multiplyScalar(.5)); branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); parent.add(branch); return branch;
  }
  function makeTree(x, z, size = 1, tint = '#438d43') {
    const tree = new THREE.Group(); tree.position.set(x, 0, z); world.add(tree); const bark = material('#79513a'); const leaves = material(tint, .95); const highlight = material('#69ad4c', .95); const leafShape = new THREE.IcosahedronGeometry(1, 1);
    add(cyl, bark, tree, [0, 1.2 * size, 0], [.31 * size, 2.4 * size, .31 * size]);
    const branches = [[[-.05, 1.15, 0], [-.78, 2.35, .05]], [[.05, 1.25, 0], [.74, 2.42, -.1]], [[0, 1.55, 0], [.12, 2.95, .12]], [[0, .9, 0], [-.42, 1.82, -.38]], [[0, 1.05, 0], [.42, 1.95, .38]]];
    branches.forEach(([a, b], i) => addBranch(tree, a.map((v) => v * size), b.map((v) => v * size), .13 * size, bark));
    const clusters = [[-.72, 2.55, .04, .88, .58, .72], [.67, 2.62, -.08, .88, .62, .76], [.08, 3.05, .12, .9, .72, .82], [-.38, 2.03, -.4, .72, .58, .7], [.4, 2.15, .35, .78, .58, .76], [-.12, 2.62, .48, .64, .56, .65]];
    clusters.forEach(([cx, cy, cz, sx, sy, sz], i) => { const crown = add(leafShape, i % 3 === 0 ? highlight : leaves, tree, [cx * size, cy * size, cz * size], [sx * size, sy * size, sz * size]); crown.rotation.set(i * .31, i * .73, i * .18); });
    addCollider(x, z, .42 * size, .42 * size); return tree;
  }
  palette.green.map = grassTexture; grassTexture.repeat.set(8, 8);
  add(new THREE.PlaneGeometry(110, 110), palette.green, world, [0, -.08, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
  // A broad village lane splits into five visible roads to the locations on the town map.
  const pathMat = material('#fff'); pathMat.map = dirtTexture; pathMat.side = THREE.DoubleSide;
  function makeTrail(points, width = 3.4) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, .012, z)));
    const samples = curve.getSpacedPoints(90); const vertices = []; const uvs = []; const indices = [];
    samples.forEach((point, index) => { const along = index / (samples.length - 1); const tangent = curve.getTangentAt(along); const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2); vertices.push(point.x - side.x, point.y, point.z - side.z, point.x + side.x, point.y, point.z + side.z); uvs.push(0, along * 5, 1, along * 5); if (index < samples.length - 1) { const a = index * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); const trail = new THREE.Mesh(geometry, pathMat); trail.receiveShadow = true; world.add(trail);
  }
  dirtTexture.repeat.set(7, 13);
  makeTrail([[0, 25], [0, 17], [-1, 10], [0, 3], [0, -5], [0, -15], [0, -25]], 4.2);
  makeTrail([[0, 4], [-7, 4], [-13, 2], [-20, 2], [-26, 4]], 3.4);
  makeTrail([[0, 5], [8, 6], [15, 8], [21, 6], [27, 4]], 3.4);
  makeTrail([[8, 6], [9, 4], [11, 2.5]], 2.7);
  makeTrail([[7, 7], [9, 10], [13, 13], [17, 16], [22, 18]], 3.0);
  makeTrail([[0, -5], [7, -9], [13, -14], [20, -19], [25, -25]], 3.25);
  makeTrail([[-1, -8], [-4, -12], [-10, -16], [-17, -21], [-25, -25]], 3.25);
  // The playable Dapur MBG sits southwest of the crossroads, matching its town-map pin.
  makeTrail([[0, -2], [-3, -2.5], [-5.5, -4], [-7.2, -5.2], [-8.5, -5.8]], 3.2);
  // A narrow stream and timber footbridges connect the eastern neighborhood roads.
  const streamCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(18.6, .025, -25), new THREE.Vector3(19.1, .025, -15), new THREE.Vector3(18.3, .025, -5), new THREE.Vector3(18.7, .025, 5), new THREE.Vector3(18.1, .025, 15), new THREE.Vector3(18.8, .025, 25)]);
  const streamSamples = streamCurve.getSpacedPoints(100); const streamVertices = []; const streamUvs = []; const streamIndices = [];
  const crossingPoints = [-18, 7, 17];
  streamSamples.forEach((point, index) => { const along = index / (streamSamples.length - 1); const tangent = streamCurve.getTangentAt(along); const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(1.2); streamVertices.push(point.x - side.x, point.y, point.z - side.z, point.x + side.x, point.y, point.z + side.z); streamUvs.push(0, along * 8, 1, along * 8); if (index < streamSamples.length - 1) { const a = index * 2; streamIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); if (!crossingPoints.some((crossing) => Math.abs(point.z - crossing) < 1.8)) addCollider(point.x, point.z, 1.2, .16); } });
  const streamGeometry = new THREE.BufferGeometry(); streamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streamVertices, 3)); streamGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(streamUvs, 2)); streamGeometry.setIndex(streamIndices); streamGeometry.computeVertexNormals(); const waterMaterial = material('#55bde0', .32); waterMaterial.metalness = .04; const streamMesh = new THREE.Mesh(streamGeometry, waterMaterial); streamMesh.receiveShadow = true; world.add(streamMesh);
  function buildBridge(z) { const bridge = new THREE.Group(); bridge.position.set(18.6, .08, z); world.add(bridge); add(box, material('#8a5b3d'), bridge, [0, 0, 0], [4.6, .18, 1.85]); for (let i = 0; i < 11; i++) add(box, material(i % 2 ? '#bd8751' : '#a87348'), bridge, [-2.05 + i * .41, .105, 0], [.035, .015, 1.82]); for (const side of [-1, 1]) { for (const x of [-2, 2]) add(box, material('#815338'), bridge, [x, .62, side * .78], [.14, 1.12, .14]); add(box, material('#815338'), bridge, [0, .92, side * .78], [4.1, .16, .14]); } }
  crossingPoints.forEach(buildBridge);
  // The well marks the village crossroads without blocking the main walking lanes.
  const well = new THREE.Group(); well.position.set(3.5, 0, .8); world.add(well); addCollider(3.5, .8, 1.12, 1.05);
  add(cyl, material('#8a8d83'), well, [0, .28, 0], [1.03, .5, 1.03]); add(cyl, material('#b0aa94'), well, [0, .56, 0], [.9, .13, .9]); add(cyl, material('#42a9c5', .35), well, [0, .59, 0], [.7, .035, .7]);
  for (const x of [-.75, .75]) add(box, material('#755139'), well, [x, 1.25, 0], [.14, 1.35, .14]);
  add(box, material('#85573d'), well, [0, 1.9, 0], [2.05, .16, .25]); addBranch(well, [-.9, 1.9, 0], [0, 2.45, 0], .09, material('#85573d')); addBranch(well, [.9, 1.9, 0], [0, 2.45, 0], .09, material('#85573d')); add(box, material('#d26747'), well, [0, 2.46, 0], [1.45, .12, 1.05]);
  // A timber fence frames the farm and keeps the play area readable.
  const sideGateRanges = [[-26, -23], [-21, -14], [-1, 8], [13, 21]];
  for (const side of [-1, 1]) for (let i = 0; i < 25; i++) { const z = -25 + i * 2.1; if (sideGateRanges.some(([start, end]) => z >= start && z <= end)) continue; const x = side * 26; add(cyl, palette.brown, world, [x, .55, z], [.11, 1.1, .11]); if (i < 24 && !sideGateRanges.some(([start, end]) => z < end && z + 2.1 > start)) { add(box, palette.brown, world, [x, .35, z + 1.05], [.12, .12, 2.1]); add(box, palette.brown, world, [x, .78, z + 1.05], [.12, .12, 2.1]); } }
  for (const z of [-26, 26]) for (let x = -25; x <= 25; x += 2.1) { if (Math.abs(x) < 4.5) continue; add(cyl, palette.brown, world, [x, .55, z], [.11, 1.1, .11]); if (x < 24) { add(box, palette.brown, world, [x + 1.05, .35, z], [2.1, .12, .12]); add(box, palette.brown, world, [x + 1.05, .78, z], [2.1, .12, .12]); } }
  // Layered trees use trunks, visible branches, and angular leaf clusters instead of ball-shaped crowns.
  [[-21, 13, 1.25], [21, 15, 1.2], [-21, 7, .9], [22, -1, 1.1], [-22, -8, 1.1], [22, -11, 1.2], [-16, -22, 1.1], [16, -22, 1.25], [-12, 22, .9], [12, 22, .9], [-21, -17, .9], [10, 22, .95]].forEach(([x, z, size], i) => makeTree(x, z, size, i % 3 === 0 ? '#397f3e' : '#4b9744'));
  for (let i = 0; i < 28; i++) { const x = ((i * 37) % 17) - 8; const z = ((i * 23) % 23) - 11; if (Math.abs(x) < 5 && z > -8 && z < 5) continue; const shrub = add(new THREE.IcosahedronGeometry(1, 0), i % 3 ? palette.leaf : material('#75b84d'), world, [x, .35, z], [.34 + (i % 3) * .08, .44, .3]); shrub.rotation.y = i * .7; }
  // Small flower tufts and stepping stones soften the edges of the village path.
  for (let i = 0; i < 30; i++) { const side = i % 2 ? -1 : 1; const z = 12 - (i * 1.07) % 24; const x = side * (2.1 + (i % 4) * .22); if (Math.abs(z + 6) < 3 && x < 4) continue; for (let p = 0; p < 3; p++) { const fx = x + (p - 1) * .16; const fz = z + Math.sin(i + p) * .16; add(sphere, p % 2 ? palette.yellow : palette.coral, world, [fx, .14 + p * .015, fz], [.075, .065, .075]); } }
  // A cozy cluster of homes and small sheds in the background.
  const homeSites = [[-15.2, -12], [14.8, -9], [-15.8, -8], [14.8, -2], [-15.5, 13], [14.3, 22], [-14.5, 20], [14.3, -22]];
  for (let i = 0; i < homeSites.length; i++) {
    const [x, z] = homeSites[i]; const side = x < 0 ? -1 : 1; const h = 1.55 + (i % 2) * .35;
    const house = new THREE.Group(); house.position.set(x, 0, z); house.rotation.y = side < 0 ? .18 : -.18; world.add(house);
    addCollider(x, z, 1.48, 1.2);
    add(box, i % 2 ? palette.cream : palette.white, house, [0, h / 2, 0], [2.4, h, 1.9]);
    addGableRoof(house, 2.8, 2.25, h, h + .95, palette.accent);
    add(box, palette.brown, house, [0, .52, .97], [.48, 1.04, .08]);
    add(box, palette.blue, house, [-.7, .95, .98], [.46, .38, .07]);
  }
  const building = new THREE.Group(); building.position.set(-8.5, 0, -8); world.add(building);
  addCollider(-8.5, -7.7, 3.12, 2.65);
  add(box, material('#f2dca8'), building, [0, 1.15, 0], [5.7, 2.3, 4.1]);
  add(box, material('#9a6548'), building, [0, .34, 2.06], [5.7, .52, .12]);
  addGableRoof(building, 6.2, 4.7, 2.3, 3.82, material('#c94f3f'));
  add(box, material('#d65d48'), building, [-1.55, 3.12, 0], [3.62, .13, 4.8], [0, 0, .43]);
  add(box, material('#d65d48'), building, [1.55, 3.12, 0], [3.62, .13, 4.8], [0, 0, -.43]);
  for (let i = 0; i < 7; i++) { const x = -2.7 + i * .9; add(box, material(i % 2 ? '#ef8b55' : '#f5c45f'), building, [x, 2.48, 2.42], [.72, .1, .06]); }
  for (const x of [-2.45, 2.45]) add(box, material('#8a5a3d'), building, [x, 1.45, 2.48], [.16, 1.9, .16]);
  add(box, material('#9a5a3e'), building, [-.35, .93, 2.09], [.82, 1.82, .15]);
  add(box, material('#f4c55f'), building, [-.05, .92, 2.18], [.06, .12, .035]);
  add(box, material('#8ed0d9'), building, [-1.75, 1.45, 2.1], [1.0, .72, .1]); add(box, material('#8ed0d9'), building, [1.25, 1.45, 2.1], [1.0, .72, .1]);
  for (const x of [-1.75, 1.25]) { add(box, material('#fff0cf'), building, [x, 1.45, 2.17], [.08, .83, .04]); add(box, material('#fff0cf'), building, [x, 1.45, 2.17], [1.08, .08, .04]); }
  const vent = new THREE.Group(); vent.position.set(1.9, 3.12, -.5); building.add(vent); add(box, material('#9c6547'), vent, [0, .45, 0], [.55, .9, .55]); add(box, material('#7c4939'), vent, [0, .94, 0], [.76, .13, .76]);
  const sign = makeText('DAPUR MBG · KAMPUNG SORE', 'fffaf0', '33795a'); sign.scale.set(4.6, .7, 1); sign.position.set(0, 3.5, 2.5); building.add(sign);
  // A covered serving counter and kitchen utensils make this first playable spot unmistakable.
  const serving = new THREE.Group(); serving.position.set(-8.5, 0, -4.45); world.add(serving); addCollider(-8.5, -4.45, 2.0, .58);
  add(box, material('#855138'), serving, [0, .78, 0], [3.8, .22, 1.05]);
  for (const x of [-1.65, 1.65]) add(box, material('#a86d45'), serving, [x, .4, 0], [.14, .8, .88]);
  add(box, material('#e2b65e'), serving, [0, .95, -.08], [3.55, .09, .92]);
  for (let i = 0; i < 3; i++) { add(cyl, material('#c9c9ba'), serving, [-1.05 + i * 1.05, 1.15, -.08], [.31, .28, .31]); add(cyl, material('#e7e4d4'), serving, [-1.05 + i * 1.05, 1.31, -.08], [.26, .06, .26]); add(cyl, material('#b96b42'), serving, [-1.05 + i * 1.05, 1.39, -.08], [.04, .14, .04]); }
  add(box, material('#fff0cf'), serving, [0, 1.57, -.05], [1.05, .18, .12]);
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
    const figure = new THREE.Group(); parent.add(figure);
    const skin = material(options.skin || '#d99b71', .68); const hair = material(options.hair || '#49352f', .9); const shirt = material(options.shirt || '#2f8791', .76); const trousers = material(options.trousers || '#345172', .82); const shoes = material('#5b392d', .82); const faceAccent = material('#fff0dd', .7);
    const head = add(sphere, skin, figure, [0, 1.55, .015], [.245, .295, .235]);
    add(cyl, skin, figure, [0, 1.3, 0], [.105, .22, .105]);
    add(sphere, hair, figure, [0, 1.77, -.035], [.258, .15, .25]);
    add(sphere, hair, figure, [0, 1.55, -.19], [.25, .27, .12]);
    for (let i = 0; i < 5; i++) { const lock = add(new THREE.IcosahedronGeometry(.1, 0), hair, figure, [((i % 3) - 1) * .12, 1.73 + (i % 2) * .055, .11 - Math.floor(i / 3) * .055], [.92, 1.15, .8]); lock.rotation.z = (i - 2) * .16; }
    const eyeWhite = material('#fff6e8', .5); const eye = material('#322a2b', .5); const eyes = [];
    for (const x of [-.085, .085]) { add(sphere, eyeWhite, figure, [x, 1.575, .217], [.052, .054, .026]); eyes.push(add(sphere, eye, figure, [x + .008, 1.57, .239], [.025, .032, .014])); add(box, hair, figure, [x, 1.65, .232], [.09, .018, .02], [0, 0, x < 0 ? -.1 : .1]); }
    add(new THREE.SphereGeometry(.045, 8, 6), skin, figure, [0, 1.52, .25], [.68, .72, .6]);
    const smileCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.045, 1.455, .218), new THREE.Vector3(0, 1.43, .245), new THREE.Vector3(.045, 1.455, .218));
    const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 8, .009, 5, false), material('#824c47', .7)); figure.add(smile);
    const torso = add(new THREE.CapsuleGeometry(.235, .38, 4, 8), shirt, figure, [0, .98, 0]); torso.rotation.z = Math.PI;
    add(box, material(options.apron || '#edaa46'), figure, [0, .9, .231], [.31, .38, .035]);
    add(box, material('#f2d28d'), figure, [0, 1.11, .25], [.24, .05, .04]);
    add(box, material('#80573b'), figure, [0, .73, .02], [.47, .075, .3]);
    const backpack = add(new THREE.BoxGeometry(.34, .42, .17), material(options.pack || '#c76a45'), figure, [0, 1.01, -.255]); backpack.rotation.x = -.12;
    const arms = []; const legs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * .27, 1.15, 0); figure.add(arm);
      add(new THREE.CapsuleGeometry(.083, .22, 3, 7), shirt, arm, [0, -.2, 0]); add(new THREE.CapsuleGeometry(.067, .22, 3, 7), skin, arm, [0, -.47, .025]); add(sphere, skin, arm, [0, -.65, .04], [.083, .09, .08]); arm.rotation.z = side * -.08; arms.push(arm);
      const leg = new THREE.Group(); leg.position.set(side * .13, .64, 0); figure.add(leg);
      add(new THREE.CapsuleGeometry(.095, .22, 3, 7), trousers, leg, [0, -.2, 0]); add(new THREE.BoxGeometry(.21, .13, .35), shoes, leg, [0, -.43, .065]); legs.push(leg);
    }
    return { figure, arms, legs, head, eyes, backpack };
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
    addCollider(x, z, .42 * scale, .4 * scale); return { group, head, legs, peck: Math.random() * 6 };
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
    addCollider(x, z, .48, .52); return { group, head, legs, tail };
  }
  function makeGoat(x, z) {
    const group = new THREE.Group(); group.position.set(x, 0, z); world.add(group); const coat = material('#f1e9d5', .92); const brown = material('#8a6042', .9); const horn = material('#d8c59c', .8); const eye = material('#423930', .55);
    add(sphere, coat, group, [0, .64, 0], [.35, .34, .56]); add(sphere, coat, group, [0, .97, .4], [.27, .29, .27]);
    add(cone, coat, group, [-.22, 1.05, .42], [.1, .25, .09], [0, 0, -.5]); add(cone, coat, group, [.22, 1.05, .42], [.1, .25, .09], [0, 0, .5]);
    add(cone, horn, group, [-.14, 1.31, .36], [.08, .27, .08], [0, 0, -.22]); add(cone, horn, group, [.14, 1.31, .36], [.08, .27, .08], [0, 0, .22]);
    add(sphere, eye, group, [-.13, 1.01, .62], [.035, .045, .025]); add(sphere, eye, group, [.13, 1.01, .62], [.035, .045, .025]); add(cone, brown, group, [0, .73, .63], [.12, .2, .1]);
    const legs = [];
    for (const px of [-.22, .22]) for (const pz of [-.37, .35]) { const leg = new THREE.Group(); leg.position.set(px, .45, pz); group.add(leg); add(cyl, coat, leg, [0, -.22, 0], [.07, .42, .07]); add(cone, brown, leg, [0, -.45, .01], [.09, .16, .09]); legs.push(leg); }
    addCollider(x, z, .55, .62); return { group, head: group, legs };
  }
  if (place.type === 'hutan') {
    for (let i = 0; i < 12; i++) { const a = i * 2.4; const x = Math.sin(a) * 10; const z = Math.cos(a) * 11 - 1; add(cyl, palette.brown, world, [x, 2, z], [.36, 4, .36]); addCollider(x, z, .52, .52); add(sphere, palette.leaf, world, [x, 4.5, z], [2.1, 2.3, 2.1]); }
    add(box, palette.accent, building, [0, 1.3, 0], [7.3, 2.5, 2.8]);
  } else if (place.type === 'kopdes' || place.type === 'pasar') {
    for (let i = 0; i < 3; i++) { const stall = new THREE.Group(); stall.position.set(-5 + i * 5, 0, -2 + (i % 2) * 2); world.add(stall); addCollider(stall.position.x, stall.position.z, 1.42, 1.02); add(box, palette.brown, stall, [0, .72, 0], [2.5, 1.4, 1.7]); add(cone, i % 2 ? palette.yellow : palette.coral, stall, [0, 1.7, 0], [1.65, .8, 1.3]); for (let j = 0; j < 4; j++) add(sphere, j % 2 ? palette.red : palette.green, stall, [-.7 + j * .45, .9, .92], [.23, .23, .23]); }
  } else if (place.type === 'dapur') {
    // The Dapur MBG has its own serving counter above; keep crossroads clear for walking.
  }
  // A neighbor with a human silhouette, face, hair, apron, and working clothes.
  const neighbor = new THREE.Group(); neighbor.position.set(-4.8, 0, -7.5); neighbor.rotation.y = -.35; world.add(neighbor); addCollider(-4.8, -7.5, .5, .46);
  const neighborModel = makeHuman(neighbor, { shirt: '#df7853', apron: '#f2ca69', trousers: '#49627b', pack: '#8f5d3f', hair: '#302b2b' });
  const witnessLabel = makeText(place.witness, 'fff7df', '397f5c'); witnessLabel.position.set(-4.8, 2.25, -7.5); world.add(witnessLabel);

  // Farm animals give the kitchen yard its own life and a clear village-RPG scale.
  const chickens = [makeChicken(9.4, -2.7, .86), makeChicken(11.7, -1.1, .72, '#b9784f'), makeChicken(8.5, .2, .78)];
  const cat = makeCat(-1.6, 5.3); const goat = makeGoat(13.3, -3.4);
  const penFence = material('#9b6945');
  function horizontalFence(x1, x2, z) { const length = x2 - x1; const middle = (x1 + x2) / 2; addCollider(middle, z, length / 2, .14); for (let x = x1; x <= x2 + .01; x += 1.45) { add(box, penFence, world, [x, .55, z], [.12, 1.1, .12]); } add(box, penFence, world, [middle, .37, z], [length, .12, .12]); add(box, penFence, world, [middle, .77, z], [length, .12, .12]); }
  function verticalFence(x, z1, z2) { const length = z2 - z1; const middle = (z1 + z2) / 2; addCollider(x, middle, .14, length / 2); for (let z = z1; z <= z2 + .01; z += 1.45) add(box, penFence, world, [x, .55, z], [.12, 1.1, .12]); add(box, penFence, world, [x, .37, middle], [.12, .12, length]); add(box, penFence, world, [x, .77, middle], [.12, .12, length]); }
  horizontalFence(7.2, 15.1, -5.5); verticalFence(7.2, -5.5, 2); verticalFence(15.1, -5.5, 2); horizontalFence(7.2, 10.15, 2); horizontalFence(12.1, 15.1, 2);
  const destinationSigns = [];
  for (const [x, z, label, signColor] of [[22.5, 18.5, 'HUTAN KOTA', '377752'], [23, 4, 'BALAI KOPDES', 'a76a42'], [23, -22, 'PASAR SORE', 'c65d4b'], [0, 22, 'KAMPUNG BAMBU', '557950'], [-22.5, 4, 'KEBUN CEMPLUK', '5b8e4c']]) {
    const post = new THREE.Group(); post.position.set(x, 0, z); world.add(post); addCollider(x, z, .24, .24); add(cyl, material('#785039'), post, [0, .9, 0], [.09, 1.8, .09]); const plaque = add(box, material('#785039'), post, [0, 1.63, 0], [2.1, .5, .16]); plaque.rotation.y = x < -5 ? .4 : x > 5 ? -.4 : 0; const labelSprite = makeText(label, 'fff8e6', signColor); labelSprite.position.set(0, 1.67, .1); labelSprite.scale.set(1.8, .34, 1); post.add(labelSprite); destinationSigns.push({ x, z, label });
  }
  const player = new THREE.Group();
  const savedPosition = savedState.location === place.type && savedState.playerPosition ? savedState.playerPosition : null;
  player.position.set(savedPosition && Number.isFinite(savedPosition.x) ? savedPosition.x : 0, 0, savedPosition && Number.isFinite(savedPosition.z) ? savedPosition.z : 18); world.add(player);
  const playerModel = makeHuman(player, { shirt: '#2f8a91', apron: '#e8a54e', trousers: '#345172', pack: '#be604a', hair: '#432c28', skin: '#d99770' });
  const person = playerModel.figure; const legs = playerModel.legs; const arms = playerModel.arms;
  const nameTag = makeText('CEMPLUK', '263746', 'ffd166'); nameTag.scale.set(1.5, .32, 1); nameTag.position.set(0, 2.18, 0); person.add(nameTag);

  const content = localClues(place.type, place.witness);
  const evidence = [];
  const cluePlaces = [[-3.8, 0, 3.3], [3.1, 0, -1.0], [0.5, 0, -5.4]];
  const propColors = [palette.yellow, palette.coral, palette.blue];
  cluePlaces.forEach((position, index) => {
    const item = new THREE.Group(); item.position.set(...position); world.add(item); item.userData.index = index; item.userData.found = false;
    addCollider(position[0], position[2], .48, .42);
    const ring = add(new THREE.TorusGeometry(.42, .045, 7, 32), material('#fff2a0', .5), item, [0, .06, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
    add(sphere, propColors[index], item, [0, .32, 0], [.1, .1, .1]); ring.userData.pulse = true;
    if (place.type === 'dapur') {
      if (index === 0) { add(cyl, palette.cream, item, [0, .32, 0], [.31, .12, .31]); add(cyl, palette.green, item, [0, .42, 0], [.16, .06, .16]); }
      else if (index === 1) { add(box, palette.soil, item, [0, .25, 0], [.58, .18, .45]); for (let j = 0; j < 3; j++) add(sphere, palette.leaf, item, [j * .14 - .14, .42, 0], [.14, .22, .12]); }
      else { add(box, palette.cream, item, [0, .46, 0], [.48, .66, .06], [0, 0, -.06]); add(cyl, palette.brown, item, [0, .13, 0], [.05, .26, .05]); }
    } else if (place.type === 'kopdes') {
      if (index === 0) { add(sphere, palette.cream, item, [0, .37, 0], [.35, .34, .3]); add(cyl, palette.brown, item, [0, .65, 0], [.2, .05, .2]); }
      else if (index === 1) { add(cyl, palette.yellow, item, [0, .3, 0], [.32, .55, .32]); add(box, palette.brown, item, [0, .62, 0], [.47, .07, .08]); }
      else { add(box, palette.cream, item, [0, .4, 0], [.55, .5, .08]); }
    } else if (place.type === 'pasar') {
      add(sphere, index === 1 ? palette.green : palette.red, item, [0, .31, 0], [.29, .29, .29]); add(sphere, palette.green, item, [0, .57, 0], [.08, .09, .08]);
    } else if (place.type === 'hutan') {
      add(sphere, palette.coral, item, [0, .28, 0], [.32, .22, .28]); add(cyl, palette.white, item, [0, .48, 0], [.08, .12, .08]);
    } else {
      add(box, palette.cream, item, [0, .32, 0], [.45, .18, .42]); add(box, palette.coral, item, [0, .45, 0], [.1, .12, .12]);
    }
    const label = makeText(content[index].short, 'fff7df', '688456'); label.position.set(position[0], 1.42, position[2]); world.add(label);
    evidence.push(item);
  });
  const crops = [];
  [[7, 0, 17.5], [9.5, 0, 17.5], [12, 0, 17.5]].forEach((position, index) => {
    const bed = new THREE.Group(); bed.position.set(...position); world.add(bed);
    addCollider(position[0], position[2], .72, .64);
    add(box, palette.soil, bed, [0, .06, 0], [1.55, .13, 1.35]);
    add(box, palette.path, bed, [0, .13, 0], [1.37, .035, 1.16]);
    const plant = new THREE.Group(); plant.position.y = .16; bed.add(plant);
    add(cyl, palette.leaf, plant, [0, .18, 0], [.075, .36, .075]);
    for (let leaf = 0; leaf < 4; leaf++) add(sphere, palette.leaf, plant, [Math.cos(leaf * 1.57) * .18, .2 + (leaf % 2) * .08, Math.sin(leaf * 1.57) * .18], [.2, .075, .1], [0, leaf * 1.57, -.25]);
    const marker = add(new THREE.TorusGeometry(.24, .025, 6, 24), palette.yellow, bed, [0, .18, .55], [1, 1, 1], [-Math.PI / 2, 0, 0]);
    crops.push({ bed, plant, marker, watered: false, index });
  });
  const cropStorageKey = `semesta-tanaman-${new Date().toLocaleDateString('sv-SE')}`;
  let wateredCount = Math.min(3, Math.max(0, Number(localStorage.getItem(cropStorageKey) || 0)));
  crops.forEach((crop, index) => { if (index < wateredCount) { crop.watered = true; crop.plant.scale.set(1.25, 1.6, 1.25); crop.marker.material.color.set('#6bba77'); } });
  $('#cropProgress').textContent = `${wateredCount} / 3 BIBIT`; $('#cropProgressBar').style.width = `${wateredCount * 33.333}%`; $('#seedCount').textContent = wateredCount === 3 ? '+3' : String(3 - wateredCount);
  const storedEvidence = savedState.location === place.type && Array.isArray(savedState.foundClues) ? savedState.foundClues : [];
  const found = new Set(storedEvidence);
  evidence.forEach((item, index) => { if (found.has(index)) { item.userData.found = true; item.children[0].material.color.set('#6bba77'); $('#clueDots').children[index].classList.add('found'); } });
  $('#clueCount').textContent = `${found.size} / 3 PETUNJUK`;
  if (found.size === 3) $('#ending').classList.add('visible');
  let running = true; let emptySceneFrames = 0; let yaw = Number.isFinite(savedState.cameraYaw) ? savedState.cameraYaw : 0; let last = performance.now(); let lastStateSave = 0; let toastTimer; const keys = new Set(); const stick = { x: 0, y: 0, active: false };
  function showDialogue(speaker, line, icon = '✳') { $('#speakerName').textContent = speaker.toUpperCase(); $('#dialogueText').textContent = line; $('#speakerBadge').textContent = icon; $('#dialogue').classList.add('visible'); }
  function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600); }
  function nearest() { let pick = null; let distance = 2.2; for (const clue of evidence) { if (clue.userData.found) continue; const d = player.position.distanceTo(clue.position); if (d < distance) { pick = clue; distance = d; } } return pick; }
  function nearestCrop() { let pick = null; let distance = 1.65; for (const crop of crops) { if (crop.watered) continue; const d = player.position.distanceTo(crop.bed.position); if (d < distance) { pick = crop; distance = d; } } return pick; }
  function nearestSign() { let pick = null; let distance = 1.65; for (const sign of destinationSigns) { const d = Math.hypot(player.position.x - sign.x, player.position.z - sign.z); if (d < distance) { pick = sign; distance = d; } } return pick; }
  function inspect() {
    if (!running) return;
    const crop = nearestCrop();
    if (crop) {
      crop.watered = true; wateredCount++;
      localStorage.setItem(cropStorageKey, String(wateredCount));
      crop.plant.scale.set(1.25, 1.6, 1.25); crop.marker.material.color.set('#6bba77'); crop.marker.material.emissive = new THREE.Color('#6bba77');
      $('#cropProgress').textContent = `${wateredCount} / 3 BIBIT`; $('#cropProgressBar').style.width = `${wateredCount * 33.333}%`; $('#seedCount').textContent = wateredCount === 3 ? '+3' : String(3 - wateredCount);
      saveGameState({ screen: 'explore', location: place.type, playerPosition: { x: player.position.x, z: player.position.z }, foundClues: [...found] });
      showDialogue('KEBUN CEMPLUK', wateredCount === 3 ? 'Semua bibit sudah segar. Besok kita lihat apakah tomatnya sudah siap jadi bintang.' : 'Satu bibit segar lagi. Tanaman ini kelihatan lebih semangat sekarang.', '🌱');
      if (wateredCount === 3) toast('Tugas kebun selesai! Benih baru tersimpan.');
      return;
    }
    const sign = nearestSign();
    if (sign) { showDialogue('PENUNJUK JALAN', `Jalan ini menuju ${sign.label}. Kita akan membuka tempat itu setelah area ini siap.`, '↗'); return; }
    const item = nearest(); if (!item) { toast('Dekati tanaman untuk menyiram atau benda untuk memeriksa.'); return; }
    const i = item.userData.index; item.userData.found = true; found.add(i); item.children[0].material.color.set('#6bba77'); $('#clueDots').children[i].classList.add('found'); $('#clueCount').textContent = `${found.size} / 3 PETUNJUK`; saveGameState({ screen: 'explore', location: place.type, playerPosition: { x: player.position.x, z: player.position.z }, foundClues: [...found] }); showDialogue(content[i].speaker, content[i].line, i === 1 ? '☺' : '✳'); if (found.size === 3) setTimeout(() => $('#ending').classList.add('visible'), 1300);
  }
  $('#inspectButton').onclick = inspect; $('#dialogueNext').onclick = () => $('#dialogue').classList.remove('visible');
  $('#replayButton').onclick = () => { saveGameState({ screen: 'city', location: place.type, playerPosition: { x: player.position.x, z: player.position.z }, foundClues: [...found] }); $('#exploreScreen').classList.remove('active'); $('#cityScreen').classList.add('active'); $('#ending').classList.remove('visible'); renderer.dispose(); };
  $('#captureButton').onclick = () => document.body.classList.add('capture-mode'); $('#exitCapture').onclick = () => document.body.classList.remove('capture-mode');
  window.onkeydown = (event) => { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) { keys.add(event.code); event.preventDefault(); } if (event.code === 'KeyE' || event.code === 'Space') inspect(); if (event.code === 'Escape') document.body.classList.remove('capture-mode'); };
  window.onkeyup = (event) => keys.delete(event.code);
  const joystick = $('#joystick'); const knob = $('#joystickKnob');
  joystick.onpointerdown = (event) => { stick.active = true; joystick.setPointerCapture(event.pointerId); moveStick(event); };
  joystick.onpointermove = (event) => { if (stick.active) moveStick(event); };
  const release = () => { stick.active = false; stick.x = stick.y = 0; knob.style.transform = 'translate(0,0)'; }; joystick.onpointerup = release; joystick.onpointercancel = release;
  function moveStick(event) { const r = joystick.getBoundingClientRect(); let x = event.clientX - r.left - r.width / 2; let y = event.clientY - r.top - r.height / 2; const limit = r.width * .32; const d = Math.hypot(x, y); if (d > limit) { x *= limit / d; y *= limit / d; } stick.x = x / limit; stick.y = y / limit; knob.style.transform = `translate(${x}px,${y}px)`; }
  function collides(x, z) {
    const radius = .38;
    if (x < -24.5 || x > 24.5 || z < -24.5 || z > 24.5) return true;
    return colliders.some((item) => {
      const dx = Math.max(Math.abs(x - item.x) - item.halfX, 0);
      const dz = Math.max(Math.abs(z - item.z) - item.halfZ, 0);
      return dx * dx + dz * dz < radius * radius;
    });
  }
  if (collides(player.position.x, player.position.z)) player.position.set(0, 0, 18);
  function frame(now) { if (!$('#exploreScreen').classList.contains('active')) { renderer.dispose(); return; } requestAnimationFrame(frame); const dt = Math.min((now - last) / 1000, .04); last = now; let x = stick.x; let z = stick.y; if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1; if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1; const length = Math.hypot(x, z); if (length > .1) { x /= Math.max(1, length); z /= Math.max(1, length); const nextX = THREE.MathUtils.clamp(player.position.x + x * 4.1 * dt, -24.5, 24.5); const nextZ = THREE.MathUtils.clamp(player.position.z + z * 4.1 * dt, -24.5, 24.5); if (!collides(nextX, player.position.z)) player.position.x = nextX; if (!collides(player.position.x, nextZ)) player.position.z = nextZ; player.rotation.y = Math.atan2(x, z); const step = Math.sin(now * .012); person.position.y = .025 + Math.abs(step) * .055; legs[0].rotation.x = step * .38; legs[1].rotation.x = -step * .38; arms[0].rotation.x = -step * .26; arms[1].rotation.x = step * .26; } else { person.position.y = THREE.MathUtils.damp(person.position.y, 0, 5, dt); legs.forEach((leg) => { leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, 0, 7, dt); }); arms.forEach((arm) => { arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, 0, 7, dt); }); }
    const cam = new THREE.Vector3(Math.sin(yaw) * 14, 14, Math.cos(yaw) * 14); camera.position.set(player.position.x + cam.x, cam.y, player.position.z + cam.z); camera.lookAt(player.position.x, .8, player.position.z - 1.2);
    chickens.forEach((bird, i) => { bird.head.rotation.x = Math.max(0, Math.sin(now * .0018 + bird.peck)) * .3; bird.group.position.y = .025 + Math.abs(Math.sin(now * .003 + i)) * .025; }); cat.tail.rotation.y = Math.sin(now * .002) * .24; cat.head.rotation.y = Math.sin(now * .0012) * .12; goat.head.rotation.x = Math.sin(now * .0015) * .06;
    if (now - lastStateSave > 450) { saveGameState({ screen: 'explore', destination: 'jakarta', location: place.type, playerPosition: { x: player.position.x, z: player.position.z }, cameraYaw: yaw, foundClues: [...found] }); lastStateSave = now; }
    const crop = nearestCrop(); const target = nearest(); const hint = $('#interactionHint'); const action = $('#inspectButton small'); if (crop) { hint.textContent = 'E / SIRAM · BIBIT'; action.textContent = 'SIRAM'; hint.classList.add('nearby'); } else if (target) { hint.textContent = `E / PERIKSA · ${content[target.userData.index].short}`; action.textContent = 'PERIKSA'; hint.classList.add('nearby'); } else { hint.classList.remove('nearby'); action.textContent = 'AKSI'; } evidence.forEach((item, i) => { if (!item.userData.found) { item.children[0].rotation.z += dt * .45; item.children[0].scale.setScalar(1 + Math.sin(now * .002 + i) * .1); } }); crops.forEach((item) => { if (!item.watered) item.marker.rotation.z += dt * .35; }); renderer.render(scene, camera); emptySceneFrames = renderer.info.render.calls === 0 ? emptySceneFrames + 1 : 0; if (emptySceneFrames === 30) reportWorldIssue("Kamera tidak menemukan objek 3D. Muat ulang halaman atau cek dukungan WebGL browser."); }
  requestAnimationFrame(frame); window.onresize = resizeGame;
  if (!savedPosition) setTimeout(() => showDialogue(place.witness, 'Selamat datang! Mau jalan-jalan dulu atau bantu cari barang yang hilang?', '☺'), 500);
}

function localClues(type, witness) {
  if (type === 'dapur') return [
    { name: 'Nasi Kotak', short: 'NASI KOTAK', speaker: witness, line: 'Sendok sayur biasanya paling semangat kalau dengar kata tambah. Hari ini malah menghilang.' },
    { name: 'Kebun Daun Bawang', short: 'KUNCI KOPERASI', speaker: 'PAK RT', line: 'Ada yang lewat sambil bilang mau ganti suasana. Kukira anggota koperasi.' },
    { name: 'Papan Menu', short: 'CATATAN CUTI', speaker: witness, line: 'Tulisannya sopan sekali. Bahkan minta maaf karena selama ini sering nyipratin kuah.' },
  ];
  const lines = {
    kopdes: [['Karung Beras', 'KARUNG BERAS', 'Karung ini diberi nama. Namanya “jangan ditumpuk di atas saya”.'], ['Timbangan', 'TIMBANGAN', 'Jarumnya menunjuk ke arah ruang rapat. Sepertinya dia ingin bicara.'], ['Buku Kas', 'BUKU KAS', 'Ada catatan kecil: “hari ini aku menghitung cita-cita dulu.”']],
    pasar: [['Lapak Cabai', 'CABAI MERAH', 'Cabainya tak pedas, tapi cukup terkenal sampai minta pengawalan.'], ['Becak Sayur', 'BECAK SAYUR', 'Roda becak penuh daun. Sopirnya bersikeras tadi cuma mengantar kangkung.'], ['Kuitansi', 'KUITANSI', 'Di baliknya ada tanda tangan cabai berbentuk garis meliuk.']],
    kampung: [['Jemuran', 'KAOS KAKI', 'Pasangannya sedang ikut arisan. Belum jelas arisan apa.'], ['Pot Melati', 'POT BUNGA', 'Tanahnya baru disiram. Ada jejak kaki menuju balai warga.'], ['Buku Arisan', 'BUKU ARISAN', 'Satu nama ditulis dengan tinta yang bisa dicuci. Sangat mencurigakan.']],
    hutan: [['Jamur Pagi', 'JAMUR MERAH', 'Jamur ini mengaku penunjuk jalan, tetapi menunjuk ke semua arah.'], ['Layangan Nyangkut', 'LAYANGAN', 'Suratnya berbunyi: “aku mau lihat dunia dari atas sebentar.”'], ['Papan Jalur', 'PAPAN JALUR', 'Seseorang menambahkan tujuan baru: tempat duduk teduh.']],
    kebun: [['Pot Tomat', 'TOMAT MERAH', 'Tomat ini sudah matang, tetapi minta satu hari lagi untuk berpose.'], ['Gembor Kecil', 'GEMBOR', 'Airnya habis. Ada catatan: “dipinjam sebentar sama tetangga”.'], ['Papan Tanam', 'JADWAL PANEN', 'Jadwalnya penuh coretan. Seseorang menambahkan waktu istirahat untuk tomat.']],
  };
  return (lines[type] || lines.kopdes).map(([name, short, line], index) => ({ name, short, speaker: index === 1 ? 'WARGA' : witness, line }));
}

async function initEditor() {
  const form = $('#caseForm'); const status = $('#saveStatus'); const host = $('#clueFields'); let data;
  try { const response = await fetch('api'); data = await response.json(); } catch { status.textContent = 'Gagal membaca berkas kasus lokal.'; status.classList.add('error'); return; }
  ['title', 'hook', 'objective', 'citizenNote', 'witness', 'caseNumber', 'endingTitle', 'endingText', 'nextPrompt'].forEach((key) => { const input = form.elements.namedItem(key); if (input) input.value = data[key] || ''; });
  host.replaceChildren(); data.clues.forEach((clue, index) => { const fieldset = document.createElement('fieldset'); fieldset.className = 'clue-field'; const legend = document.createElement('legend'); legend.textContent = `PETUNJUK 0${index + 1}`; fieldset.append(legend); [['name', 'Nama objek'], ['short', 'Label pendek'], ['detail', 'Catatan bukti'], ['speaker', 'Nama warga'], ['line', 'Dialog saat diperiksa']].forEach(([key, title]) => { const label = document.createElement('label'); label.textContent = title; const input = ['detail', 'line'].includes(key) ? document.createElement('textarea') : document.createElement('input'); input.value = clue[key] || ''; input.dataset.index = index; input.dataset.key = key; label.append(input); fieldset.append(label); }); host.append(fieldset); });
  $('#overviewEpisodeTitle').textContent = data.title || 'Episode belum diberi judul';
  status.textContent = 'Episode 001 dimuat dari database lokal.';
  form.addEventListener('submit', async (event) => { event.preventDefault(); const next = Object.fromEntries(new FormData(form).entries()); next.clues = data.clues.map((clue) => ({ ...clue })); host.querySelectorAll('[data-index]').forEach((input) => { next.clues[Number(input.dataset.index)][input.dataset.key] = input.value.trim(); }); status.textContent = 'Menyimpan…'; try { const response = await fetch('api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Gagal menyimpan.'); data = next; $('#overviewEpisodeTitle').textContent = data.title; status.textContent = 'Tersimpan di database lokal. Muat ulang game untuk melihat perubahan.'; status.classList.add('saved'); } catch (error) { status.textContent = error.message; status.classList.add('error'); } });
}

async function initIdeasInbox() {
  const form = $('#ideaForm'); const status = $('#ideaStatus'); const list = $('#ideaList'); const caseForm = $('#caseForm'); const saveStatus = $('#saveStatus');
  let ideas = [];
  const updateIdea = async (idea) => {
    try {
      const response = await fetch('api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'ideas', ...idea }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Gagal memperbarui ide.');
      ideas = result.ideas; render(); status.textContent = 'Status ide diperbarui.'; status.className = 'save-status saved';
    } catch (error) { status.textContent = error.message; status.className = 'save-status error'; }
  };
  const render = () => {
    list.replaceChildren();
    $('#ideasNavCount').textContent = String(ideas.length); $('#ideasPageCount').textContent = String(ideas.length); $('#overviewIdeaCount').textContent = String(ideas.length);
    if (!ideas.length) { const empty = document.createElement('p'); empty.className = 'ideas-empty'; empty.textContent = 'Belum ada ide. Salin komentar yang sudah ditinjau dari media sosial untuk memulai.'; list.append(empty); return; }
    [...ideas].reverse().forEach((idea) => {
      const card = document.createElement('article'); card.className = 'idea-item';
      const meta = document.createElement('div'); meta.className = 'idea-meta'; const byline = document.createElement('span'); byline.textContent = `${idea.name || 'Tanpa nama'}${idea.platform ? ` · ${idea.platform}` : ''}`;
      const select = document.createElement('select'); select.setAttribute('aria-label', 'Status ide');
      [['baru', 'Baru'], ['dipilih', 'Dipilih'], ['dipakai', 'Dipakai'], ['disimpan', 'Tidak dipakai']].forEach(([value, label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = (idea.status || 'baru') === value; select.append(option); });
      select.addEventListener('change', () => updateIdea({ ...idea, status: select.value })); meta.append(byline, select);
      const comment = document.createElement('p'); comment.className = 'idea-comment'; comment.textContent = idea.comment;
      const action = document.createElement('button'); action.type = 'button'; action.className = 'idea-use'; action.textContent = 'PAKAI DI EPISODE';
      action.addEventListener('click', () => { caseForm.elements.namedItem('citizenNote').value = idea.comment; saveStatus.textContent = 'Ide masuk ke catatan warga. Simpan episode untuk menerapkannya.'; saveStatus.classList.add('saved'); document.querySelector('[data-admin-view="episode"]').click(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      const actions = document.createElement('div'); actions.className = 'idea-actions'; actions.append(action); card.append(meta, comment, actions); list.append(card);
    });
  };
  try { const response = await fetch('api?resource=ideas'); ideas = await response.json(); render(); }
  catch { status.textContent = 'Gagal membaca inbox ide.'; status.className = 'save-status error'; }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const idea = Object.fromEntries(new FormData(form).entries()); idea.resource = 'ideas'; idea.status = 'baru';
    status.textContent = 'Menyimpan…';
    try { const response = await fetch('api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(idea) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Gagal menyimpan ide.'); ideas = result.ideas; form.reset(); render(); status.textContent = 'Ide tersimpan lokal.'; status.className = 'save-status saved'; }
    catch (error) { status.textContent = error.message; status.className = 'save-status error'; }
  });
}

function initAdminNavigation() {
  const buttons = [...document.querySelectorAll('[data-admin-view]')];
  const views = [...document.querySelectorAll('.admin-view')];
  const activate = (name) => {
    buttons.forEach((button) => button.classList.toggle('active', button.dataset.adminView === name && button.closest('.admin-nav')));
    views.forEach((view) => view.classList.toggle('active', view.id === `adminView-${name}`));
  };
  buttons.forEach((button) => button.addEventListener('click', () => activate(button.dataset.adminView)));
}

start().catch((error) => { console.error(error); const notice = document.createElement('div'); notice.className = 'build-notice'; notice.textContent = 'Belum berhasil dibuka. Pastikan XAMPP aktif dan halaman dimuat ulang.'; document.body.append(notice); });
