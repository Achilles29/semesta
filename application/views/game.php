<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#f1f5ff">
    <meta name="description" content="Jelajahi kota, temukan cerita lokal, dan bantu warga Semesta Nyasar.">
    <title>Semesta Nyasar — Peta Besar, Urusan Kecil</title>
    <?php
    $manifest_path = FCPATH . 'assets/game/.vite/manifest.json';
    $manifest = is_file($manifest_path) ? json_decode(file_get_contents($manifest_path), TRUE) : array();
    $entry = isset($manifest['game-src/main.js']) ? $manifest['game-src/main.js'] : NULL;
    if ($entry && !empty($entry['css'])):
        foreach ($entry['css'] as $css): ?>
            <link rel="stylesheet" href="<?= base_url('assets/game/' . $css); ?>">
        <?php endforeach;
    endif;
    ?>
</head>
<body class="world-body">
    <main id="app" class="app-shell">
        <header class="site-header">
            <a class="brand" href="<?= base_url(); ?>"><span class="brand-icon">✳</span><span><b>SEMESTA</b><small>NYASAR</small></span></a>
            <div class="header-center"><span class="online-dot"></span> SERVER LOKAL <span class="header-divider">/</span> EPISODE 001</div>
            <div class="header-right"><a class="editor-link" href="<?= site_url('admin'); ?>">RUANG EDITOR <span>↗</span></a><span class="avatar-chip">N</span></div>
        </header>

        <section class="map-screen active" id="worldScreen" aria-label="Peta dunia">
            <div class="screen-heading">
                <div><span class="kicker"><i></i> PETA DUNIA · MODE 2D</span><h1>Urusan kecil,<br><em>jarak jauh.</em></h1><p>Cempluk sedang mencari kota dengan cerita yang agak aneh. Pilih tujuan, kita mampir.</p></div>
                <div class="world-stamp"><b>01</b><span>PERJALANAN<br>PERTAMA</span><i>✳</i></div>
            </div>
            <div class="world-layout">
                <div class="world-map-card">
                    <div class="map-topline"><span>ATLAS YANG KATANYA AKURAT</span><span>▦ &nbsp; 1 : 8.000.000</span></div>
                    <div class="world-map" id="worldMap">
                        <svg class="continent-map" viewBox="0 0 1000 460" role="img" aria-label="Peta ilustratif dunia">
                            <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#597168" stroke-opacity=".14" stroke-width="1"/></pattern></defs>
                            <rect width="1000" height="460" fill="url(#grid)"/>
                            <g class="latitude-lines"><path d="M30 115Q500 70 970 115M10 230Q500 190 990 230M30 345Q500 390 970 345"/><ellipse cx="500" cy="230" rx="455" ry="213"/></g>
                            <g class="land-shapes">
                                <path d="M94 119l37-27 56-15 31 13 40-12 47 16 24 30-15 20-39-3-19 18-48 5-21 27-25 1-18 28-33 5-20-20-23-2-13-34-28-18 10-30z"/>
                                <path d="M212 232l26 2 21 21 4 31-18 22-8 48-21 38-16-8 8-49-20-22 4-42-20-22 9-13z"/>
                                <path d="M407 110l30-22 43-1 15 16-16 14-37 6-19 22-21-9zM432 156l41-24 55 7 37 21 14 31-15 32-24 27-18 42-20 19-13 49-18 39-18-20-4-37-23-30-7-37-25-25-1-44-16-25 8-35z"/>
                                <path d="M492 92l43-22 47 1 41 17 49-5 49 16 43-3 44 21 3 24-30 14-31-10-37 9-28 24-34-8-14-20-33-1-23 18-23-8-7-25-27-8-20-18-37 5-25-16z"/>
                                <path d="M656 214l31 4 31 20-7 24-31 2-29-18zM742 275l20 4 16 18-18 9-20-13z"/>
                                <path d="M834 282l36-13 39 13 30 25-14 25-42 3-21 21-33-12-10-31z"/>
                                <path d="M892 115l20-12 12 12-9 16-17 2zM571 351l15-8 12 11-11 10zM615 369l12-8 9 9-8 12z"/>
                            </g>
                            <g class="route-lines"><path d="M600 314Q677 185 721 184"/><path d="M600 314Q480 242 479 196"/><path d="M600 314Q396 170 284 173"/></g>
                        </svg>
                        <div class="map-label label-europe">EROPA</div><div class="map-label label-africa">AFRIKA</div><div class="map-label label-asia">ASIA</div><div class="map-label label-pacific">SAMUDRA PASIFIK</div>
                        <button class="destination-pin pin-jakarta selected" data-destination="jakarta" aria-label="Pilih Jakarta"><i></i><span>JAKARTA</span></button>
                        <button class="destination-pin pin-tokyo locked" data-destination="tokyo" aria-label="Tokyo akan dibuka nanti" disabled><i></i><span>TOKYO · SEGERA</span></button>
                        <button class="destination-pin pin-cairo locked" data-destination="cairo" aria-label="Kairo akan dibuka nanti" disabled><i></i><span>KAIRO · SEGERA</span></button>
                        <button class="destination-pin pin-lisbon locked" data-destination="lisbon" aria-label="Lisbon akan dibuka nanti" disabled><i></i><span>LISBON · SEGERA</span></button>
                        <div class="map-avatar" id="mapAvatar"><b>C</b><span>CEMPLUK</span></div>
                        <div class="map-compass"><span>N</span><b>✳</b></div>
                    </div>
                    <div class="map-bottomline"><span><i></i> CEMPLUK — PETUALANG SERABUTAN</span><span>GERAKKAN DENGAN WASD / TOMBOL PANAH</span></div>
                </div>
                <aside class="destination-card">
                    <div class="postmark">✳ <span>TUJUAN TERPILIH</span></div>
                    <div class="destination-icon" id="destinationIcon">☀</div>
                    <span class="destination-country" id="destinationCountry">INDONESIA · ASIA TENGGARA</span>
                    <h2 id="destinationTitle">Jakarta</h2>
                    <p id="destinationDesc">Kota yang selalu punya jalan pintas, kecuali saat sedang buru-buru.</p>
                    <div class="destination-detail"><span>CATATAN PERJALANAN</span><b id="destinationNote">Warga melapor: ada rapat yang molor sampai besok.</b></div>
                    <button class="primary-button" id="enterCity">TURUN DI KOTA INI <span>↗</span></button>
                    <div class="travel-tip"><span>✦</span> Klik area peta atau pin kota untuk memilih tujuan.</div>
                </aside>
            </div>
            <div class="page-foot"><span>SEMESTA NYASAR <i>·</i> DUNIA 2D</span><span>SEBUAH KISAH LOKAL YANG BISA PERGI JAUH</span></div>
        </section>

        <section class="map-screen city-screen" id="cityScreen" aria-label="Peta kota">
            <div class="city-heading"><div><button class="back-button" id="backToWorld">← PETA DUNIA</button><span class="kicker"><i></i> <span id="cityCountry">INDONESIA · ASIA TENGGARA</span> · KOTA PILIHANMU</span><h1 id="cityTitle">Jakarta, Kota Serba Bisa</h1><p id="cityIntro">Kota ini berjalan cepat. Beberapa urusannya malah jalan sendiri.</p></div><div class="city-id"><span>KOORDINAT IMAGINER</span><b id="cityCoordinates">06°12′ S &nbsp; 106°49′ E</b><small>LOKASI CERITA FIKSI, TERINSPIRASI KEHIDUPAN HARIAN</small></div></div>
            <div class="city-map-layout">
                <div class="city-map-card">
                    <div class="city-map-head"><span>PETA KOTA <b>— PILIH TEMPAT MAMPIR</b></span><span class="sunny-weather">☀ &nbsp; CERAH, ADA KEMUNGKINAN GORENGAN</span></div>
                    <div class="city-map-art" id="cityMapArt">
                        <svg class="village-map" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                            <path class="map-field" d="M0 0h900v420H0z"/><path class="map-hill" d="M0 64Q170 6 320 64t310 0Q785 12 900 48v70H0z"/>
                            <path class="map-river-bank" d="M760-20q-80 86-20 149t-28 137q-40 73 20 174h210V-20z"/><path class="map-river-water" d="M800-20q-80 86-20 149t-28 137q-40 73 20 174h160V-20z"/>
                            <path class="map-main-road-outline" d="M-30 294q166-75 291-24t230-42q116-92 241-25t215 31"/><path class="map-main-road" d="M-30 294q166-75 291-24t230-42q116-92 241-25t215 31"/>
                            <path class="map-lane-outline" d="M135 420q54-87 33-166T218 92M430 0q-8 78 36 122t-7 136q-29 58 2 162M630 0q-51 91-12 147t-7 118"/><path class="map-lane" d="M135 420q54-87 33-166T218 92M430 0q-8 78 36 122t-7 136q-29 58 2 162M630 0q-51 91-12 147t-7 118"/>
                            <g class="map-garden"><path d="M62 91h142v82H62z"/><path d="M70 105h126M70 123h126M70 141h126M70 159h126"/><path d="M62 91v82m142-82v82"/></g>
                            <g class="map-plaza"><path d="M324 139h127v92H324z"/><path d="M337 154h101v62H337z"/><circle cx="387" cy="185" r="16"/><path d="M387 154v62m-50-31h101"/></g>
                            <g class="map-coop" transform="translate(500 136)"><rect x="0" y="17" width="104" height="64" rx="5"/><path d="M-8 21 52-10l60 31z"/><path d="M-4 31h112v15H-4z"/><rect x="44" y="49" width="18" height="32"/><rect x="10" y="48" width="21" height="17"/><path d="M10 48h21"/></g>
                            <g class="map-houses"><g transform="translate(245 65)"><rect x="0" y="20" width="76" height="54" rx="4"/><path d="M-8 24 37-8l48 32z"/><rect x="32" y="42" width="15" height="32"/><rect x="9" y="37" width="14" height="13"/></g><g transform="translate(520 54)"><rect x="0" y="20" width="82" height="59" rx="4"/><path d="M-9 24 39-9l52 33z"/><rect x="35" y="44" width="16" height="35"/><rect x="10" y="38" width="15" height="14"/></g><g transform="translate(636 276)"><rect x="0" y="20" width="74" height="55" rx="4"/><path d="M-8 24 35-8l48 32z"/><rect x="30" y="43" width="15" height="32"/><rect x="52" y="37" width="13" height="13"/></g></g>
                            <g class="map-market"><path d="M475 285h115v67H475z"/><path d="M464 288h137l-14-34H478z"/><path d="M484 255v34m31-34v34m31-34v34m31-34v34"/><path d="M470 355h126"/></g>
                            <g class="map-kitchen"><rect x="76" y="245" width="75" height="53" rx="4"/><path d="M68 249 114 215l53 34z"/><rect x="104" y="269" width="17" height="29"/><path d="M73 303h82"/></g>
                            <g class="map-trees"><g><path d="M40 222v36m0-72c-22 0-30 25-15 36-9 22 6 37 23 27 17 12 34-6 23-25 16-19 2-39-18-38z"/><path d="M221 286v40m0-80c-24-1-35 26-18 40-11 20 4 40 22 29 19 12 35-9 21-28 16-20 0-42-20-41z"/><path d="M729 187v38m0-77c-21 0-31 23-16 36-10 18 5 35 21 26 17 11 31-8 20-25 14-18 0-37-18-37z"/><path d="M329 333v35m0-70c-18 0-26 20-13 31-8 16 4 31 18 23 14 9 26-7 17-22 12-15 0-32-16-32z"/></g></g>
                            <g class="map-fence"><path d="M44 78v114m15-114v114m15-114v114m15-114v114m15-114v114m15-114v114m15-114v114m15-114v114m15-114v114m15-114v114"/><path d="M39 92h139M39 178h139"/></g>
                            <g class="map-flowers"><circle cx="190" cy="238" r="5"/><circle cx="204" cy="251" r="4"/><circle cx="303" cy="274" r="5"/><circle cx="687" cy="124" r="4"/><circle cx="712" cy="113" r="5"/><circle cx="606" cy="361" r="4"/><circle cx="277" cy="366" r="4"/></g>
                        </svg>
                        <button class="zone-pin zone-dapur selected" data-location="dapur"><span>🍱</span><b>DAPUR MBG</b></button>
                        <button class="zone-pin zone-kopdes" data-location="kopdes"><span>🏪</span><b>BALAI KOPDES</b></button>
                        <button class="zone-pin zone-pasar" data-location="pasar"><span>🥬</span><b>PASAR SORE</b></button>
                        <button class="zone-pin zone-kampung" data-location="kampung"><span>🏠</span><b>KAMPUNG BAMBU</b></button>
                        <button class="zone-pin zone-hutan" data-location="hutan"><span>🌳</span><b>HUTAN KOTA</b></button>
                        <button class="zone-pin zone-kebun" data-location="kebun"><span>🌱</span><b>KEBUN CEMPLUK</b></button>
                        <div class="city-map-note">SATU KAMPUNG · BANYAK URUSAN KECIL</div>
                    </div>
                </div>
                <aside class="location-info"><span class="location-label">LOKASI DIPILIH</span><div class="location-emoji" id="locationEmoji">🍱</div><h2 id="locationTitle">Dapur MBG</h2><p id="locationDescription">Dapur sekolah yang sibuk. Entah kenapa sendok sayurnya selalu punya agenda sendiri.</p><div class="local-tag" id="locationTag">CERITA HARIAN · MBG</div><button id="enterLocation" class="primary-button">MASUK & JELAJAHI <span>↗</span></button><span class="walk-note">AREA 3D · BISA JALAN-JALAN</span></aside>
            </div>
            <div class="location-strip"><span>ATAU PILIH LANGSUNG</span><div id="locationChips"></div></div>
            <div class="page-foot"><span>SEMESTA NYASAR <i>·</i> PETA KOTA</span><span>SETIAP LOKASI PUNYA CERITA KECILNYA SENDIRI</span></div>
        </section>

        <section class="explore-screen" id="exploreScreen" aria-label="Jelajahi area 3D">
            <canvas id="world" aria-label="Area 3D Semesta Nyasar"></canvas><div class="explore-wash"></div>
            <header class="explore-top"><button class="back-button" id="backToCity">← KEMBALI KE PETA KOTA</button><div class="explore-location"><span id="exploreCityName">JAKARTA</span><b>·</b><strong id="exploreLocationName">DAPUR MBG</strong><i class="online-dot"></i></div><button id="captureButton" class="capture-button">◉ <span>MODE REKAM</span></button></header>
            <nav class="explore-map-nav" aria-label="Navigasi peta"><button id="backToCityQuick">↗ PETA JALAN</button><button id="backToWorldFromExplore">◎ PETA UTAMA</button></nav><aside id="worldError" class="world-error" role="alert"><b>Dunia 3D belum berhasil dimuat</b><p>Gunakan navigasi peta di atas untuk melanjutkan.</p><code data-error-detail></code></aside><aside class="explore-briefing"><span class="kicker">CERITA PAGI INI · EPISODE 001</span><h2 id="caseTitle">Sendok Sayur Mengundurkan Diri</h2><p id="caseHook">Pagi ini sendok sayur pamit. Katanya capek mengaduk semuanya.</p><div class="brief-rule"></div><span class="brief-label">TUGAS KECIL CEMPLUK</span><p id="caseObjective">Cari tiga petunjuk. Nasi kotaknya sudah menunggu rapat.</p><div class="clue-count"><span id="clueDots"><i></i><i></i><i></i></span><b id="clueCount">0 / 3 PETUNJUK</b></div><div class="case-witness"><span>✳</span><p><b>KATA TETANGGA</b><br><em id="citizenNote">“Tadi ada yang dengar bunyi ting!”</em></p></div></aside>
            <aside class="daily-task" id="dailyTask"><div class="daily-top"><span>HARI 01 · MUSIM TANAM</span><b>☀ CERAH</b></div><h3>Tugas kebun Cempluk</h3><p>Siram bibit sebelum bantu tetangga.</p><div class="daily-progress"><span id="cropProgress">0 / 3 BIBIT</span><div><i id="cropProgressBar"></i></div></div><div class="seed-reward">🌱 <span>BENIH</span><b id="seedCount">3</b></div></aside>
            <div class="interaction-hint" id="interactionHint">DEKATI SESUATU UNTUK MEMERIKSA</div>
            <aside class="dialogue" id="dialogue"><div class="speaker-badge" id="speakerBadge">✳</div><div><p id="speakerName">BU NINING</p><p id="dialogueText">Kamu detektifnya? Hati-hati, sendok itu licin.</p></div><button id="dialogueNext">↗</button></aside>
            <div class="explore-controls" id="touchControls"><div class="joystick" id="joystick"><div class="joystick-ring"><div class="joystick-knob" id="joystickKnob"></div></div></div><button class="inspect-button" id="inspectButton"><span>✳</span><small>PERIKSA</small></button></div>
            <div class="desktop-controls"><kbd>W A S D</kbd> JALAN <kbd>E</kbd> PERIKSA</div>
            <div class="explore-toast" id="toast"></div><div class="capture-exit" id="captureExit"><button id="exitCapture">KELUAR DARI MODE REKAM <span>×</span></button></div>
            <div class="ending" id="ending"><div class="ending-card"><span>BERKAS DITUTUP (SEMENTARA)</span><h2 id="endingTitle">Sendoknya ternyata...</h2><p id="endingText">Dia pindah ke koperasi. Katanya ingin mencoba mengaduk harga.</p><div class="ending-comment"><b>IDE WARGA BERIKUTNYA</b><p id="nextPrompt">Barang apa lagi yang suka bertingkah di kota ini?</p></div><button id="replayButton">ULANGI ADEGAN <i>↺</i></button></div></div>
        </section>
    </main>
    <?php if ($entry): ?><script type="module" src="<?= base_url('assets/game/' . $entry['file']); ?>"></script><?php else: ?><div class="build-notice">Jalankan <code>npm run build</code> di folder proyek untuk menyiapkan game.</div><?php endif; ?>
</body>
</html>
