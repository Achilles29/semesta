<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#f1f5ff">
    <meta name="description" content="Jelajahi isu kehidupan warga Indonesia melalui cerita interaktif Republik WkWkWk.">
    <title>Republik WkWkWk — Urusan Negara, Cerita Warga</title>
    <?php
    $manifest_path = FCPATH . 'assets/game/.vite/manifest.json';
    $manifest = is_file($manifest_path) ? json_decode(file_get_contents($manifest_path), TRUE) : array();
    $entry = isset($manifest['game-src/main.js']) ? $manifest['game-src/main.js'] : NULL;
    $character_model_path = is_file($manifest_path) ? 'assets/game/models/characters/warga-chibi-base.glb' : 'public/models/characters/warga-chibi-base.glb';
    $map_asset_root = is_file(FCPATH . 'assets/game/map-assets/kawasan-warga.webp') ? 'assets/game/map-assets/' : 'public/map-assets/';
    $source_css_version = is_file(FCPATH . 'game-src/style.css') ? filemtime(FCPATH . 'game-src/style.css') : time();
    $source_js_version = is_file(FCPATH . 'game-src/main.js') ? filemtime(FCPATH . 'game-src/main.js') : time();
    if ($entry && !empty($entry['css'])):
        foreach ($entry['css'] as $css): ?>
            <link rel="stylesheet" href="<?= base_url('assets/game/' . $css); ?>">
        <?php endforeach;
    else: ?>
        <link rel="stylesheet" href="<?= base_url('game-src/style.css?v=' . $source_css_version); ?>">
    <?php endif; ?>
</head>
<body class="world-body">
    <main id="app" class="app-shell">
        <div class="game-hud" aria-label="Menu permainan">
            <a class="game-brand" href="<?= base_url(); ?>" aria-label="Republik WkWkWk — beranda"><span class="game-brand-mark">RW</span><span><b>REPUBLIK</b><small>WKWKWK</small></span></a>
            <div class="game-hud-actions"><button class="profile-button" id="profileButton" type="button"><span class="avatar-chip" id="headerAvatar">↗</span><span id="headerCitizenName">MASUK / DAFTAR WARGA</span></button><a class="editor-link" href="<?= base_url('admin/'); ?>">⚙ ADMIN</a></div>
        </div>

        <section class="citizen-panel" id="citizenPanel" aria-labelledby="citizenPanelTitle" hidden>
            <div class="citizen-card"><button class="citizen-close" id="closeCitizenPanel" type="button" aria-label="Tutup">×</button><span class="kicker">AKUN WARGA · REPUBLIK WKWKWK</span><h2 id="citizenPanelTitle">Masuk atau daftar</h2><p class="citizen-intro">Untuk masuk, cukup isi username dan kata sandi. Pendaftaran warga punya formulir tersendiri.</p>
                <div class="citizen-tabs"><button type="button" data-auth-mode="register">DAFTAR WARGA</button><button type="button" class="active" data-auth-mode="login">MASUK</button></div>
                <a class="google-sso-button" href="<?= base_url('api?resource=google_sso'); ?>"><span aria-hidden="true">G</span> LANJUTKAN DENGAN GOOGLE</a>
                <div class="auth-divider"><span>ATAU PAKAI AKUN WARGA</span></div>
                <form id="citizenForm"><label class="citizen-username">Username<input name="username" maxlength="32" autocomplete="username" pattern="[A-Za-z0-9_.-]{1,32}" title="Username memakai huruf, angka, titik, garis bawah, atau tanda hubung" required></label><label class="register-only">Email untuk verifikasi<input name="email" type="email" maxlength="190" autocomplete="email"></label><label class="verification-email" hidden>Email akun untuk kirim ulang tautan<input name="verificationEmail" type="email" maxlength="190" autocomplete="email"></label><label class="register-only">Nama warga<input name="displayName" maxlength="40" required></label><label>Kata sandi<input name="password" type="password" minlength="8" maxlength="128" autocomplete="current-password" required></label>
                    <div class="citizen-profile-fields" id="citizenProfileFields">
                        <div class="citizen-profile-heading"><b>Profil dan biodata</b><small>Opsional · biodata hanya terlihat oleh Anda dan admin; kostum avatar terlihat di peta</small></div>
                        <label>Jenis kelamin<select name="gender"><option value="">Pilih jika ingin mengisi</option></select></label>
                        <label>Agama / kepercayaan<select name="religion"><option value="">Pilih jika ingin mengisi</option></select></label>
                        <label>Provinsi tempat lahir<select name="birthProvince"><option value="">Pilih jika ingin mengisi</option></select></label>
                        <label>Kota/kabupaten tempat lahir<input name="birthCity" maxlength="80" placeholder="Opsional"></label>
                        <label>Tanggal lahir<input name="birthDate" type="date" min="1900-01-01"></label>
                        <label>Pekerjaan<select name="occupation"><option value="">Pilih jika ingin mengisi</option></select></label>
                        <label>Pendidikan terakhir<select name="educationLevel"><option value="">Pilih jika ingin mengisi</option></select></label>
                        <label>Provinsi domisili<select name="domicileProvince"><option value="">Pilih jika ingin mengisi</option></select></label>
                        <label>Kota/kabupaten domisili<input name="domicileCity" maxlength="80" placeholder="Opsional"></label>
                        <label class="citizen-avatar-select">Gaya avatar<select name="avatar" id="citizenAvatarSelect"><option value="warga">Warga umum</option></select><small id="citizenAvatarHint">Pilihan avatar mengikuti pekerjaan dan bisa diganti.</small></label>
                    </div>
                    <div class="register-only"><label>Pilih rumah</label><div class="choice-grid house-choices"><label><input type="radio" name="house" value="rumah-kayu" checked><span>🛖<b>Rumah kayu</b></span></label><label><input type="radio" name="house" value="rumah-bata"><span>🏠<b>Rumah bata</b></span></label><label><input type="radio" name="house" value="rumah-panggung"><span>🏡<b>Rumah panggung</b></span></label></div></div>
                    <p class="citizen-error" id="citizenError" role="alert"></p><button class="primary-button" type="submit" id="citizenSubmit">BUAT AKUN WARGA ↗</button><button type="button" class="citizen-logout" id="verificationResend" hidden>Kirim ulang email verifikasi</button><button type="button" class="citizen-logout" id="citizenLogout" hidden>Keluar dari akun ini</button>
                </form>
            </div>
        </section>
        <section class="avatar-customizer" id="avatarCustomizer" aria-labelledby="avatarCustomizerTitle" hidden>
            <div class="avatar-customizer-card">
                <button class="citizen-close" id="closeAvatarCustomizer" type="button" aria-label="Tutup">×</button>
                <span class="kicker">PENAMPILAN WARGA · BISA DIGANTI KAPAN SAJA</span><h2 id="avatarCustomizerTitle">Racik avatar</h2>
                <div class="avatar-customizer-profile"><img src="<?= base_url('public/images/avatar/potret-warga-gaya-realistis.jpg?v=1'); ?>" alt="Potret ilustratif warga dengan gaya kartun realistis"><div><b id="customAvatarName">Warga</b><small>Potret profil · model karakter 3D tampil di peta</small></div></div>
                <button type="button" class="avatar-style-preset" id="applyHarvestAvatarPreset">🌾 PAKAI GAYA PETANI PANEN PAGI</button>
                <form id="exploreAvatarForm" class="explore-avatar-form">
                    <label>Warna kulit<select name="skin"><option value="sawo">Sawo matang</option><option value="kuning">Kuning langsat</option><option value="gelap">Gelap</option><option value="zaitun">Zaitun</option><option value="pucat">Terang</option><option value="coklat">Cokelat</option></select></label>
                    <label>Rambut<select name="hair"><option value="pendek">Pendek</option><option value="cepak">Cepak</option><option value="ikal">Ikal</option><option value="panjang">Panjang</option><option value="keriting">Keriting</option><option value="kuncir">Kuncir</option><option value="hijab">Hijab</option><option value="botak">Botak</option></select></label>
                    <label>Warna rambut<select name="hairColor"><option value="hitam">Hitam</option><option value="coklat">Cokelat</option><option value="coklat-tua">Cokelat tua</option><option value="pirang">Pirang</option><option value="uban">Uban</option><option value="merah">Merah marun</option></select></label>
                    <label>Atasan<select name="top"><option value="kemeja">Kemeja</option><option value="flanel">Kemeja flanel kotak</option><option value="batik">Batik</option><option value="seragam">Seragam</option><option value="jaket">Jaket</option><option value="hoodie">Hoodie</option><option value="jas">Jas warga</option><option value="kaos">Kaos</option><option value="kebaya">Kebaya</option><option value="petani">Pakaian tani</option><option value="pekerja">Rompi kerja</option><option value="koko">Baju koko</option><option value="rompi">Rompi warga</option></select></label>
                    <label>Bawahan<select name="bottom"><option value="celana">Celana panjang</option><option value="jeans">Jins</option><option value="cargo">Celana kargo</option><option value="sarung">Sarung</option><option value="rok">Rok</option><option value="pendek">Celana pendek</option><option value="kulot">Kulot</option></select></label>
                    <label>Penutup kepala<select name="headwear"><option value="tanpa">Tanpa penutup</option><option value="peci">Peci</option><option value="topi">Topi lapangan</option><option value="helm">Helm</option><option value="bandana">Ikat kepala</option><option value="caping">Caping</option></select></label>
                    <label>Aksesori<select name="accessory"><option value="tanpa">Tanpa aksesori</option><option value="kacamata">Kacamata</option><option value="ransel">Ransel</option><option value="tas-anyaman">Tas anyaman silang</option><option value="lencana">Lencana</option><option value="selempang">Tas selempang</option><option value="syal">Syal</option><option value="map">Map warga</option><option value="jam">Jam tangan</option></select></label>
                    <label>Rambut wajah<select name="facialHair"><option value="tanpa">Tanpa kumis/janggut</option><option value="kumis">Kumis</option><option value="kumis-janggut">Kumis dan janggut</option></select></label>
                    <p class="avatar-save-status" id="exploreAvatarStatus" role="status">Pilih bagian avatar, lalu simpan.</p><button class="primary-button" type="submit">SIMPAN PENAMPILAN <span>✓</span></button>
                </form>
            </div>
        </section>
        <section class="map-screen active" id="worldScreen" aria-label="Peta Indonesia">
            <div class="screen-heading">
                <div><span class="kicker"><i></i> REPUBLIK WKWKWK · PETA NUSANTARA</span><h1>Pilih kota untuk <em>turun.</em></h1><p>Pilih pin kota di peta, lalu masuk ke wilayahnya.</p></div>
            </div>
            <div class="world-layout">
                <div class="world-map-card">
                    <div class="map-topline"><span>PETA NUSANTARA</span><span>GESER UNTUK MENJELAJAHI · PILIH PIN KOTA</span></div>
                    <div class="world-map" id="worldMap">
                        <svg class="continent-map indonesia-map" viewBox="0 0 1000 460" role="img" aria-label="Peta ilustratif kepulauan Indonesia">
                            <rect width="1000" height="460" fill="#c9ddcf" stroke="none"/>
                            <g class="sea-current" fill="none" stroke="#ffffff" stroke-opacity=".58" stroke-width="2" stroke-dasharray="2 11" stroke-linecap="round"><path d="M25 118q70-28 142 0t143 0m255 228q75-25 150 0t150 0m-290-283q65-24 130 0t130 0"/><path d="M60 390q58-22 116 0t116 0m485-180q40-18 80 0t80 0"/></g>
                            <g class="indonesia-land" stroke="#fff7df" stroke-width="3" stroke-linejoin="round">
                                <path class="island-sumatra" fill="#82a96f" d="m165 123 23-9 18 13 12 25 23 18 3 22 26 17-8 25-18 12-7 27-18 12-6 31-16 8-4 28-16 15-16-13 5-27-15-16 7-25-15-19 9-26-17-21 10-21-13-22 13-17-10-25z"/>
                                <path class="island-java" fill="#d4b36e" d="m326 322 38-9 40 3 37-8 40 5 30-7 42 8 29-2 28 12-7 16-38 3-30-6-35 8-43-5-39 8-43-7-40 5-25-9-24 2-19-10z"/>
                                <path class="island-borneo" fill="#92b47c" d="m463 139 27-18 36 4 24-15 28 10 14 24 27 12 7 25-21 21 5 28-19 13-1 31-23 12-15-14-26 11-13-17-27-4-14-24-24-7 8-27-16-19 12-20-10-21z"/>
                                <path class="island-sulawesi" fill="#dda875" d="m632 190 20-18 14 14-5 27 18 17 4 29 21 22-7 16-20-12-15-27-16-7-13 18-5 28-17 12-14-12 11-27 4-25-16-16 8-20 20-9z"/>
                                <path class="island-papua" fill="#83a88a" d="m754 207 34-16 45 4 25-12 36 9 18-8 32 17-5 23 20 16-14 22 8 20-23 8-18 28-30-3-25 15-28-12-27 11-16-18-31-2-15-22 11-20-12-20 18-20-8-20z"/>
                                <path class="island-bali" fill="#d9bd79" d="m576 354 19-5 14 7-8 9-20 2z"/>
                                <path class="island-nusa" fill="none" stroke="#d9bd79" stroke-width="5" stroke-linecap="round" d="m621 358 28-3 13 7-26 5-14-3m55-3 31-4 13 7-29 6-15-3m54-4 18-2 8 6-18 5-10-3"/>
                                <path class="island-maluku" fill="#d9bd79" d="m699 174 9-14 8 11-2 17zm34 11 11-12 7 8-9 14zm-21 38 9-11 8 8-11 13zm23 43 10-8 7 8-10 11z"/>
                            </g>
                            <g class="island-routes" fill="none" stroke="#cd815f" stroke-width="3" stroke-dasharray="5 8" stroke-linecap="round" opacity=".82"><path d="M399 337q21-10 48 2m-40-2q56-31 112-8m-110 11q80 14 148-4m-130 5q113 52 208-62"/></g>
                            <g class="island-names" fill="#586c59" font-family="Trebuchet MS, sans-serif" font-size="12" font-weight="700" letter-spacing="2" text-anchor="middle" opacity=".72"><text x="203" y="272">SUMATRA</text><text x="432" y="309">JAWA</text><text x="516" y="187">KALIMANTAN</text><text x="631" y="266">SULAWESI</text><text x="835" y="251">PAPUA</text><text x="628" y="402">NUSA TENGGARA</text></g>
                        </svg>
                        <div class="map-label label-pacific">SAMUDRA HINDIA</div><div class="map-label label-asia">LAUT JAWA</div>
                        <button class="destination-pin pin-jakarta selected" data-destination="jakarta" aria-label="Pilih Jakarta"><i></i><span>JAKARTA</span></button>
                        <button class="destination-pin pin-bandung" data-destination="bandung" aria-label="Pilih Bandung"><i></i><span>BANDUNG</span></button>
                        <button class="destination-pin pin-semarang" data-destination="semarang" aria-label="Pilih Semarang"><i></i><span>SEMARANG</span></button>
                        <button class="destination-pin pin-surabaya" data-destination="surabaya" aria-label="Pilih Surabaya"><i></i><span>SURABAYA</span></button>
                        <button class="destination-pin pin-makassar" data-destination="makassar" aria-label="Pilih Makassar"><i></i><span>MAKASSAR</span></button>
                        <div class="map-avatar" id="mapAvatar" aria-hidden="true"><b>✳</b><span>WARGA</span></div><div class="citizen-home-pin" id="citizenHome">🏠 RUMAH WARGA</div>
                        <div class="map-compass"><span>N</span><b>✳</b></div>
                        <aside class="map-destination-card" aria-live="polite">
                            <div class="map-destination-copy"><div class="map-destination-meta"><span id="destinationIcon">🏙️</span><span id="destinationCountry">INDONESIA · PULAU JAWA</span></div><h2 id="destinationTitle">Jakarta</h2><p id="destinationDesc">Kota padat dengan banyak cerita tentang layanan publik, biaya hidup, dan ruang bersama.</p><small id="destinationNote">Warga mengusulkan: cerita dimulai dari urusan yang paling terasa di rumah.</small></div>
                            <button class="primary-button" id="enterCity" type="button">TURUN DI KOTA INI <span>↗</span></button>
                        </aside>
                    </div>
                    <div class="map-bottomline"><span><i></i> <span id="worldCitizenStatus">TAMU · PETA TERBUKA</span></span><span>PILIH KOTA UNTUK MEMBUKA PETA LINGKUNGAN</span></div>
                </div>
            </div>
            <div class="page-foot"><span>REPUBLIK WKWKWK <i>·</i> PETA INDONESIA</span><span>SEBUAH KISAH LOKAL YANG BISA PERGI JAUH</span></div>
        </section>

        <section class="map-screen city-screen" id="cityScreen" aria-label="Peta kota">
            <div class="city-heading"><div><button class="back-button" id="backToWorld">← PETA INDONESIA</button><span class="kicker"><i></i> <span id="cityCountry">INDONESIA · ASIA TENGGARA</span> · KOTA PILIHAN WARGA</span><h1 id="cityTitle">Kawasan Warga, Jakarta</h1><p id="cityIntro">Peta lingkungan ilustratif; cerita terinspirasi pengalaman warga sehari-hari.</p></div><div class="city-id"><span>KOORDINAT IMAGINER</span><b id="cityCoordinates">06°12′ S &nbsp; 106°49′ E</b><small>LOKASI CERITA FIKSI, TERINSPIRASI KEHIDUPAN HARIAN</small></div></div>
            <div class="region-strip" aria-label="Pilih wilayah untuk dijelajahi"><span>WILAYAH CERITA</span><div><button type="button" class="region-tab active" data-region="kota">🏙️ KOTA WARGA <small>TERBUKA</small></button><button type="button" class="region-tab" data-region="desa">🌾 DESA TUMBUH <small>TERBUKA</small></button><button type="button" class="region-tab" data-region="hutan">🌳 HUTAN WARGA <small>TERBUKA</small></button></div></div>
            <div class="city-map-layout">
                <div class="city-map-card">
                    <div class="city-map-head"><span>PETA JALAN <b>— SATU PINTU PERMUKIMAN</b></span><span class="sunny-weather">☀ &nbsp; KAWASAN WARGA</span></div>
                    <div class="city-map-art" id="cityMapArt">
                        <img class="map-background" src="<?= base_url($map_asset_root . 'kawasan-warga.webp?v=' . filemtime(FCPATH . $map_asset_root . 'kawasan-warga.webp')); ?>" alt="Ilustrasi kawasan warga Indonesia dengan permukiman, pasar, sungai, dan lahan fasilitas umum" draggable="false">
                        <img class="village-home village-home-back" src="<?= base_url($map_asset_root . 'rumah-warga-v2.webp?v=' . filemtime(FCPATH . $map_asset_root . 'rumah-warga-v2.webp')); ?>" alt="" draggable="false">
                        <img class="village-home village-home-left" src="<?= base_url($map_asset_root . 'rumah-warga-v2.webp?v=' . filemtime(FCPATH . $map_asset_root . 'rumah-warga-v2.webp')); ?>" alt="" draggable="false">
                        <img class="village-home village-home-right" src="<?= base_url($map_asset_root . 'rumah-warga-v2.webp?v=' . filemtime(FCPATH . $map_asset_root . 'rumah-warga-v2.webp')); ?>" alt="" draggable="false">
                        <img class="map-building map-building-school" src="<?= base_url($map_asset_root . 'sekolah-rusak.webp?v=' . filemtime(FCPATH . $map_asset_root . 'sekolah-rusak.webp')); ?>" alt="Sekolah warga dengan atap bocor dan rusak" draggable="false">
                        <img class="map-building map-building-dapur" src="<?= base_url($map_asset_root . 'dapur-mbg-v2.webp?v=' . filemtime(FCPATH . $map_asset_root . 'dapur-mbg-v2.webp')); ?>" alt="Dapur SPPG MBG dengan area penerimaan bahan dan ruang produksi" draggable="false">
                        <img class="map-building map-building-kopdes" src="<?= base_url($map_asset_root . 'kopdes-merah-putih-v2.webp?v=' . filemtime(FCPATH . $map_asset_root . 'kopdes-merah-putih-v2.webp')); ?>" alt="Koperasi desa dengan kantor, deretan gerai, dan gudang" draggable="false">
                        <div class="facility-brand facility-brand-mbg" aria-label="SPPG Badan Gizi Nasional"><span class="facility-logo facility-logo-bgn" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#071e49" stroke="#d1b06c" stroke-width="3"/><path d="M14 27 26 22 32 25 38 22 50 27 43 30 38 28 32 32 26 28 21 30z" fill="#d1b06c"/><circle cx="32" cy="30" r="3" fill="#fff4d2"/><circle cx="24" cy="35" r="3" fill="#d1b06c"/><circle cx="40" cy="35" r="3" fill="#d1b06c"/><path d="M17 43q7-8 14 0M47 43q-7-8-14 0M21 48q11-8 22 0" fill="none" stroke="#92d05d" stroke-width="3" stroke-linecap="round"/></svg></span><span><b>SPPG</b><small>BGN · GIZI</small></span></div>
                        <div class="facility-brand facility-brand-kopdes" aria-label="Koperasi Desa Merah Putih"><span class="facility-logo facility-logo-kopdes" aria-hidden="true"><svg viewBox="0 0 64 52"><path d="M5 23 32 4l27 19H49v24H15V23z" fill="#fff" stroke="#b51f2a" stroke-width="4" stroke-linejoin="round"/><path d="M20 27h24v8H20z" fill="#d62332"/><path d="M20 35h24v8H20z" fill="#fff"/><path d="M26 23h12v18H26z" fill="#d62332"/></svg></span><span><b>KOPDES</b><small>MERAH PUTIH</small></span></div>
                        <button class="zone-pin zone-kampung selected" data-location="kampung"><span>🏠</span><b>PERMUKIMAN WARGA</b></button>
                        <div class="city-map-note">SATU PINTU MASUK · DUNIA WARGA</div>
                    </div>
                </div>
                <div class="asset-library" aria-hidden="true"><img class="asset-house" src="<?= base_url($map_asset_root . 'rumah-warga-v2.webp?v=' . filemtime(FCPATH . $map_asset_root . 'rumah-warga-v2.webp')); ?>" alt=""><img class="asset-tree" src="<?= base_url($map_asset_root . 'pohon-rindang-v2.webp?v=' . filemtime(FCPATH . $map_asset_root . 'pohon-rindang-v2.webp')); ?>" alt=""></div>
                <aside class="location-info"><span class="location-label">WILAYAH AKTIF · TITIK DI PETA</span><div class="location-emoji" id="locationEmoji">🏙️</div><h2 id="locationTitle">Kota Warga</h2><p id="locationDescription">Kawasan kota dengan rumah, sekolah, pasar, layanan publik, dan ruang bersama.</p><div class="local-tag" id="locationTag">WILAYAH · KOTA</div><button id="enterLocation" class="primary-button">MASUK KE WILAYAH <span>↗</span></button><span class="walk-note">FASILITAS DI PETA ADALAH TITIK DI DALAM WILAYAH</span></aside>
            </div>
            <div class="location-strip" hidden><span>WILAYAH</span><div id="locationChips"></div></div>
            <div class="page-foot"><span>REPUBLIK WKWKWK <i>·</i> PETA KOTA</span><span>SETIAP LOKASI PUNYA CERITA KECILNYA SENDIRI</span></div>
        </section>

        <section class="explore-screen" id="exploreScreen" aria-label="Dunia Warga 3D — Alun-Alun Republik">
            <canvas id="world" aria-label="Area 3D Republik WkWkWk"></canvas><div class="explore-wash"></div>
            <header class="explore-top"><button class="back-button" id="backToCity">← PETA KAWASAN</button><div class="explore-location"><span id="exploreCityName">JAKARTA</span><b>·</b><strong id="exploreLocationName">KOTA WARGA</strong><i class="online-dot"></i></div><div class="explore-top-actions"><button id="openAvatarCustomizer" class="capture-button" type="button">♙ <span>AVATAR</span></button><button id="captureButton" class="capture-button">◉ <span>MODE REKAM</span></button></div></header>
            <nav class="explore-map-nav" aria-label="Navigasi peta"><button id="backToCityQuick">↗ PETA JALAN</button><button id="backToWorldFromExplore">◎ PETA UTAMA</button></nav><aside id="worldError" class="world-error" role="alert"><b>Area eksplorasi belum berhasil dimuat</b><p>Gunakan navigasi peta di atas untuk melanjutkan.</p><code data-error-detail></code></aside>
            <div class="interaction-hint" id="interactionHint">JELAJAHI BEBAS · DEKATI WARGA UNTUK MENGOBROL</div>
            <aside class="dialogue" id="dialogue"><div class="speaker-badge" id="speakerBadge">✳</div><div><p id="speakerName">WARGA</p><p id="dialogueText">Halo! Silakan lihat-lihat lingkungan kami.</p></div><button id="dialogueNext" aria-label="Tutup percakapan">×</button></aside>
            <section class="citizen-chat" id="citizenChat" aria-label="Obrolan pribadi antarwarga" hidden><header class="citizen-chat-head"><div><span>OBROLAN LANGSUNG · WILAYAH INI</span><b id="citizenChatName">Warga</b></div><button type="button" id="citizenChatClose" aria-label="Tutup obrolan">×</button></header><div class="citizen-chat-log" id="citizenChatLog" aria-live="polite"><p class="citizen-chat-empty">Sapa warga yang kamu temui di sini.</p></div><p class="citizen-chat-status" id="citizenChatStatus">Ketik pesan untuk memulai obrolan.</p><form class="citizen-chat-form" id="citizenChatForm"><input name="message" maxlength="280" autocomplete="off" placeholder="Tulis pesan…" aria-label="Tulis pesan kepada warga" required><button type="submit" aria-label="Kirim pesan">KIRIM ↗</button></form></section>
            <div class="explore-controls" id="touchControls"><div class="joystick" id="joystick" role="application" aria-label="Joystick untuk berjalan ke segala arah"><div class="joystick-ring"><span class="joystick-north">▲</span><div class="joystick-knob" id="joystickKnob"></div></div></div></div><button class="inspect-button" id="talkButton" type="button"><span aria-hidden="true">💬</span><small>BICARA</small></button>
            <div class="zoom-controls" aria-label="Kontrol zoom"><button id="zoomIn" type="button" aria-label="Perbesar tampilan">+</button><button id="zoomOut" type="button" aria-label="Perkecil tampilan">−</button></div>
            <div class="desktop-controls"><kbd>W A S D</kbd> JALAN <kbd>E</kbd> BICARA · SCROLL ZOOM</div>
            <div class="explore-toast" id="toast"></div><div class="capture-exit" id="captureExit"><button id="exitCapture">KELUAR DARI MODE REKAM <span>×</span></button></div>
        </section>
    </main>
    <script>window.SEMESTA_MAP_ASSET_ROOT = <?= json_encode(base_url($map_asset_root), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script>window.SEMESTA_CHARACTER_MODEL = <?= json_encode(base_url($character_model_path . '?v=' . filemtime(FCPATH . 'public/models/characters/warga-chibi-base.glb')), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/"}}</script>
    <?php if ($entry): ?><script type="module" src="<?= base_url('assets/game/' . $entry['file']); ?>"></script><?php else: ?><script type="module" src="<?= base_url('game-src/main.js?v=' . $source_js_version); ?>"></script><?php endif; ?>
</body>
</html>
