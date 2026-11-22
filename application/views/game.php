<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#f1f5ff">
    <meta name="description" content="Jelajahi kepulauan Republik Wkwkwk. Bangun cerita dan masa depan kota bersama warga.">
    <title>Republik WkWkWk — Urusan Negara, Cerita Warga</title>
    <script>
    // Keep entry taps made while the game bundle is downloading.
    (() => {
        let ready = false;
        let pendingProfile = false;
        let pendingCity = false;
        let pendingMode = null;
        let initialCityLabel = null;

        const showPendingProfile = () => {
            const panel = document.getElementById('citizenPanel');
            const title = document.getElementById('citizenPanelTitle');
            const error = document.getElementById('citizenError');
            if (!panel || !title || !error || !pendingProfile) return false;
            panel.hidden = false;
            title.textContent = 'Menyiapkan akun warga…';
            error.textContent = 'Menyiapkan formulir…';
            const submit = document.getElementById('citizenSubmit');
            if (submit) {
                submit.disabled = true;
                submit.textContent = 'MENYIAPKAN FORMULIR…';
            }
            return true;
        };
        document.addEventListener('click', (event) => {
            if (ready) return;
            const button = event.target.closest?.('button');
            if (!button) return;
            if (button.id === 'profileButton') {
                pendingProfile = true;
                const name = document.getElementById('headerCitizenName');
                if (name) name.textContent = 'MEMBUKA AKUN…';
                if (!showPendingProfile()) {
                    const observer = new MutationObserver(() => {
                        if (!pendingProfile || showPendingProfile()) observer.disconnect();
                    });
                    observer.observe(document.documentElement, { childList: true, subtree: true });
                }
            } else if (button.id === 'closeCitizenPanel') {
                pendingProfile = false;
                pendingMode = null;
                document.getElementById('citizenPanel').hidden = true;
            } else if (button.dataset.authMode) {
                pendingMode = button.dataset.authMode;
                document.querySelectorAll('[data-auth-mode]').forEach((tab) => tab.classList.toggle('active', tab === button));
                document.querySelectorAll('.register-only').forEach((field) => { field.hidden = pendingMode === 'login'; });
                document.getElementById('citizenProfileFields').hidden = pendingMode === 'login';
                document.getElementById('citizenPanelTitle').textContent = pendingMode === 'login' ? 'Menyiapkan formulir masuk…' : 'Menyiapkan formulir pendaftaran…';
            } else if (button.id === 'enterCity') {
                pendingCity = true;
                initialCityLabel ??= button.innerHTML;
                button.textContent = 'MEMUAT PETA KOTA…';
                button.setAttribute('aria-busy', 'true');
            }
        }, true);
        window.addEventListener('semesta:entry-ready', () => {
            ready = true;
            const city = document.getElementById('enterCity');
            if (initialCityLabel !== null) city.innerHTML = initialCityLabel;
            city.removeAttribute('aria-busy');
            document.getElementById('citizenSubmit').disabled = false;
            if (pendingCity) city.click();
            if (pendingProfile) {
                const name = document.getElementById('headerCitizenName');
                if (name?.textContent === 'MEMBUKA AKUN…') name.textContent = 'MASUK / DAFTAR WARGA';
                document.getElementById('profileButton').click();
                document.getElementById('citizenError').textContent = '';
                if (pendingMode) document.querySelector(`[data-auth-mode="${pendingMode}"]`)?.click();
            }
        }, { once: true });
    })();
    </script>
    <?php
    $manifest_path = FCPATH . 'assets/game/.vite/manifest.json';
    $manifest = is_file($manifest_path) ? json_decode(file_get_contents($manifest_path), TRUE) : array();
    $entry = isset($manifest['game-src/main.js']) ? $manifest['game-src/main.js'] : NULL;
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
    <link rel="stylesheet" href="<?= base_url('game-src/republic-map.css?v=' . filemtime(FCPATH . 'game-src/republic-map.css')); ?>">
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
                        <input type="hidden" name="avatar" id="citizenAvatarSelect" value="warga">
                        <div class="registration-avatar-choice" id="registrationAvatarChoice"><img id="registrationAvatarPreview" src="<?= base_url('public/models/characters/v15/portrait.png?v=' . filemtime(FCPATH . 'public/models/characters/v15/portrait.png')); ?>" alt="Pratinjau karakter 3D yang dipilih"><div><span>AVATAR KARAKTER DI PETA</span><b id="registrationAvatarName">Belum memilih avatar</b><small id="registrationAvatarHint">Pilih cowok atau cewek, lalu pilih salah satu avatar yang tersedia.</small><button type="button" id="chooseRegistrationAvatar">PILIH AVATAR ↗</button></div></div>
                    </div>
                    <div class="register-only"><label>Pilih rumah</label><div class="choice-grid house-choices"><label><input type="radio" name="house" value="rumah-kayu" checked><span>🛖<b>Rumah kayu</b></span></label><label><input type="radio" name="house" value="rumah-bata"><span>🏠<b>Rumah bata</b></span></label><label><input type="radio" name="house" value="rumah-panggung"><span>🏡<b>Rumah panggung</b></span></label></div></div>
                    <p class="citizen-error" id="citizenError" role="alert"></p><button class="primary-button" type="submit" id="citizenSubmit">BUAT AKUN WARGA ↗</button><button type="button" class="citizen-logout" id="verificationResend" hidden>Kirim ulang email verifikasi</button><button type="button" class="citizen-logout" id="citizenLogout" hidden>Keluar dari akun ini</button>
                </form>
            </div>
        </section>
        <section class="avatar-customizer" id="avatarCustomizer" aria-labelledby="avatarCustomizerTitle" hidden>
            <div class="avatar-customizer-card">
                <button class="citizen-close" id="closeAvatarCustomizer" type="button" aria-label="Tutup">×</button>
                <span class="kicker">PILIH KARAKTER · PRATINJAU SEBELUM DIPAKAI</span><h2 id="avatarCustomizerTitle">Pilih avatar</h2>
                <div class="avatar-picker-gender" role="group" aria-label="Pilih tipe karakter"><button type="button" data-avatar-gender="male" aria-pressed="false">COWOK</button><button type="button" data-avatar-gender="female" aria-pressed="false">CEWEK</button></div>
                <div class="avatar-picker-layout"><div class="avatar-picker-list"><p class="avatar-picker-instruction" id="avatarPickerInstruction">Pilih cowok atau cewek untuk melihat avatar yang tersedia.</p><div class="avatar-preset-grid" id="avatarPresetGrid" aria-live="polite"></div></div><div class="avatar-picker-preview"><canvas id="customAvatarPreview" aria-label="Pratinjau 3D avatar terpilih yang bisa diputar dengan menggeser"></canvas><b id="customAvatarName">Pilih avatar</b><small id="customAvatarDescription">Pratinjau karakter akan muncul di sini.</small></div></div>
                <p class="avatar-save-status" id="exploreAvatarStatus" role="status">Pilih tipe karakter lalu pilih satu avatar.</p><button class="primary-button" id="selectAvatarPreset" type="button" disabled>GUNAKAN AVATAR INI <span>✓</span></button>
            </div>
        </section>
        <section class="map-screen active" id="worldScreen" aria-label="Peta kepulauan Republik Wkwkwk">
            <div class="screen-heading"><div><span class="kicker"><i></i> ATLAS REPUBLIK WKWKWK</span><h1>Dunia luas. <em>Cerita kita.</em></h1><p>Lima wilayah, satu republik yang tumbuh dari pilihan warga.</p></div><div class="rm-heading-actions"></div></div>
            <div class="world-layout"><div class="world-map-card">
                <div class="map-topline"><span>KEPULAUAN SERIBU CERITA</span><span>GESER PETA · GULIR UNTUK ZOOM · PILIH KOTA</span></div>
                <div class="world-map" id="worldMap">
                    <div class="rm-atlas-mount" id="republicAtlas"><p class="rm-loading">Memuat kepulauan…</p></div>
                    <div class="map-avatar" id="mapAvatar" hidden aria-hidden="true"><b></b><span></span></div><div id="citizenHome" hidden aria-hidden="true"></div>
                    <aside class="map-destination-card" aria-live="polite"><div class="map-destination-copy"><div class="map-destination-meta"><span id="destinationIcon">01</span><span id="destinationCountry">REPUBLIK WKWKWK · IBU KOTA</span></div><h2 id="destinationTitle">Jakartawa</h2><p id="destinationDesc">Dari panggung kecil dan fondasi rumah, kota pertama republik mulai tumbuh.</p><small id="destinationNote">Lihat denah, lalu jelajahi dunia bersama warga.</small></div><button class="primary-button" id="enterCity" type="button">BUKA PETA REGIONAL <span>↗</span></button></aside>
                </div><div class="map-bottomline"><span><i></i> <span id="worldCitizenStatus">TAMU · PETA TERBUKA</span></span><span>ARAH PEMBANGUNAN DITENTUKAN WARGA</span></div>
            </div></div><div class="page-foot"><span>REPUBLIK WKWKWK <i>·</i> ATLAS DUNIA</span><span>BELUM ADA KOTA BESAR. KITA MEMULAINYA BERSAMA.</span></div>
        </section>

        <section class="map-screen regional-screen" id="regionScreen" aria-label="Peta regional dan jalur darat">
            <div class="city-heading"><div><nav class="rm-map-breadcrumb" aria-label="Navigasi tingkatan peta"><button class="back-button" id="backToWorldFromRegion" type="button">← PETA UTAMA</button><span>WILAYAH KOTA</span></nav><span class="kicker"><i></i> REPUBLIK WKWKWK · BENTANG WILAYAH</span><h1 id="regionTitle">Wilayah kota</h1><p id="regionIntro">Pusat kota dan desa, pedesaan, hutan serta perbukitan di sekitarnya.</p></div><div class="city-id"><span>WILAYAH KOTA → KAWASAN → JELAJAH</span><b>GESER &amp; PERBESAR PETA</b><small>Pilih kawasan untuk masuk pada titik yang sama di dunia 3D.</small></div></div>
            <div class="city-map-layout rm-region-layout"><div class="city-map-card"><div class="city-map-head"><span>PETA REGIONAL <b>— BENTANG LUAS</b></span><span>GULIR / CUBIT UNTUK ZOOM</span></div><div class="rm-regional-map" id="regionalMap"></div></div>
                <aside class="location-info"><span class="location-label">WILAYAH PILIHAN</span><div class="location-emoji">02</div><h2 id="regionLocationTitle">Pusat kota</h2><p id="regionLocationDescription">Pilih kawasan pada peta regional untuk mulai menjelajah.</p><div class="local-tag" id="regionLocationTag">KAWASAN</div><button id="enterRegionalLocation" class="primary-button" type="button">JELAJAHI WILAYAH <span>↗</span></button><button id="openCapitalPlan" class="rm-detail-button" type="button">DENAH RINCI IBU KOTA ↗</button><span class="walk-note">DENAH RINCI MENAMPILKAN JALAN, PETAK DAN BANGUNAN IBU KOTA.</span></aside>
            </div><div class="page-foot"><span>REPUBLIK WKWKWK <i>·</i> WILAYAH KOTA</span><span>LOKASI SETEMPAT · KOORDINAT SESUAI DUNIA JELAJAH</span></div>
        </section>

        <section class="map-screen city-screen" id="cityScreen" aria-label="Denah jalan dan rencana kota">
            <div class="city-heading"><div><nav class="rm-map-breadcrumb" aria-label="Navigasi tingkatan peta"><button class="back-button" id="backToWorld">← PETA UTAMA</button><button class="back-button" id="backToRegion" type="button">PETA REGIONAL</button><span>DENAH RINCI</span></nav><span class="kicker"><i></i> <span id="cityCountry">REPUBLIK WKWKWK · IBU KOTA</span></span><h1 id="cityTitle">Jakartawa</h1><p id="cityIntro">Panggung warga, fondasi permukiman, dan ruang untuk rencana berikutnya.</p></div><div class="rm-heading-actions"></div><div class="city-id"><span>DENAH DUNIA YANG SAMA</span><b id="cityCoordinates">KOTA PERTAMA REPUBLIK</b><small>JALAN DAN PETAK SESUAI AREA JELAJAH</small></div></div>
            <div class="rm-phase-picker" id="worldPhasePicker"></div>
            <div class="city-map-layout"><div class="city-map-card"><div class="city-map-head"><span>DENAH JALAN <b>— PILIH TITIK MASUK</b></span><span class="rm-phase-status" id="worldPhaseStatus">SEBELUM DAY 2</span></div><div class="city-map-art" id="cityMapArt"></div></div>
                <aside class="location-info"><span class="location-label">TITIK MASUK</span><div class="location-emoji" id="locationEmoji">01</div><h2 id="locationTitle">Panggung warga</h2><p id="locationDescription">Tempat warga berkumpul. Dari sini, jalan membentang menuju fondasi permukiman dan lahan rencana kota.</p><div class="local-tag" id="locationTag">SUDAH ADA · PANGGUNG SEMENTARA</div><button id="enterLocation" class="primary-button">JELAJAHI DUNIA <span>↗</span></button><span class="walk-note">BERJALAN BEBAS, JUMPAI WARGA, LIHAT KOTA TUMBUH.</span></aside>
            </div><div class="location-strip" hidden><div id="locationChips"></div></div><div class="page-foot"><span>REPUBLIK WKWKWK <i>·</i> DENAH KOTA</span><span>GARIS PUTUS-PUTUS = RENCANA, BUKAN GEDUNG JADI</span></div>
        </section>

        <section class="explore-screen" id="exploreScreen" aria-label="Dunia Warga 3D — Alun-Alun Republik">
            <canvas id="world" aria-label="Area 3D Republik WkWkWk"></canvas><div class="explore-wash"></div>
            <header class="explore-top"><button class="back-button" id="backToCity">← PETA KAWASAN</button><div class="explore-location"><span id="exploreCityName">JAKARTAWA</span><b>·</b><strong id="exploreLocationName">ALUN-ALUN WARGA</strong><i class="online-dot"></i></div><div class="explore-top-actions"><button id="openAvatarCustomizer" class="capture-button" type="button">♙ <span>AVATAR</span></button><button id="areaMusicToggle" class="capture-button area-music-toggle" type="button" aria-pressed="false" aria-label="Putar musik area"><span aria-hidden="true">♫</span><span id="areaMusicToggleLabel">PUTAR MUSIK</span></button><details class="area-music-volume"><summary aria-label="Atur volume musik" title="Atur volume musik">🔊</summary><div class="area-music-popover"><b>MUSIK WILAYAH</b><small id="areaMusicTrackName">Jalan ke Alun-Alun</small><label for="areaMusicVolume">VOLUME<input id="areaMusicVolume" type="range" min="0" max="1" step="0.01" value="0.35"></label><p id="areaMusicStatus" role="status">Musik siap diputar saat masuk area.</p></div></details><button id="captureButton" class="capture-button">◉ <span>MODE REKAM</span></button></div></header>
            <nav class="explore-map-nav" aria-label="Navigasi peta"><button id="backToCityQuick">↗ PETA JALAN</button><button id="backToWorldFromExplore">◎ PETA UTAMA</button></nav><aside id="worldError" class="world-error" role="alert"><b>Area eksplorasi belum berhasil dimuat</b><p>Gunakan navigasi peta di atas untuk melanjutkan.</p><code data-error-detail></code></aside>
            <aside class="rm-live-minimap" id="republicMinimap" aria-label="Denah posisi pemain"></aside><div class="interaction-hint" id="interactionHint">JELAJAHI BEBAS · DEKATI WARGA UNTUK MENGOBROL</div>
            <aside class="dialogue" id="dialogue"><div class="speaker-badge" id="speakerBadge">✳</div><div><p id="speakerName">WARGA</p><p id="dialogueText">Halo! Silakan lihat-lihat lingkungan kami.</p></div><button id="dialogueNext" aria-label="Tutup percakapan">×</button></aside>
            <section class="citizen-chat" id="citizenChat" aria-label="Obrolan pribadi antarwarga" hidden><header class="citizen-chat-head"><div><span>OBROLAN LANGSUNG · WILAYAH INI</span><b id="citizenChatName">Warga</b></div><button type="button" id="citizenChatClose" aria-label="Tutup obrolan">×</button></header><div class="citizen-chat-log" id="citizenChatLog" aria-live="polite"><p class="citizen-chat-empty">Sapa warga yang kamu temui di sini.</p></div><p class="citizen-chat-status" id="citizenChatStatus">Ketik pesan untuk memulai obrolan.</p><form class="citizen-chat-form" id="citizenChatForm"><input name="message" maxlength="280" autocomplete="off" placeholder="Tulis pesan…" aria-label="Tulis pesan kepada warga" required><button type="submit" aria-label="Kirim pesan">KIRIM ↗</button></form></section>
            <div class="explore-controls" id="touchControls"><div class="joystick" id="joystick" role="application" aria-label="Joystick untuk berjalan ke segala arah"><div class="joystick-ring"><span class="joystick-north">▲</span><div class="joystick-knob" id="joystickKnob"></div></div></div></div><button class="inspect-button" id="talkButton" type="button"><span aria-hidden="true">💬</span><small>BICARA</small></button>
            <div class="zoom-controls" aria-label="Kontrol zoom"><button id="zoomIn" type="button" aria-label="Perbesar tampilan">+</button><button id="zoomOut" type="button" aria-label="Perkecil tampilan">−</button></div>
            <div class="desktop-controls"><kbd>W A S D</kbd> JALAN <kbd>SHIFT</kbd> LARI <kbd>E</kbd> BICARA · SCROLL ZOOM</div>
            <div class="explore-toast" id="toast"></div><div class="capture-exit" id="captureExit"><button id="exitCapture">KELUAR DARI MODE REKAM <span>×</span></button></div>
        </section>
    </main>
    <script>window.SEMESTA_AVATAR_V15_BASE = <?= json_encode(base_url('public/models/characters/v15/'), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script>window.SEMESTA_API_URL = <?= json_encode(base_url('api'), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script>window.SEMESTA_MAP_ASSET_ROOT = <?= json_encode(base_url($map_asset_root), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script>window.SEMESTA_AREA_MUSIC_BASE = <?= json_encode(base_url('ilustrasi/musik/'), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/"}}</script>
    <?php if ($entry): ?><script type="module" src="<?= base_url('assets/game/' . $entry['file']); ?>"></script><?php else: ?><script type="module" src="<?= base_url('game-src/main.js?v=' . $source_js_version); ?>"></script><?php endif; ?>
</body>
</html>
