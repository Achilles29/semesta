<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#101426">
    <?php $map_asset_root = is_file(FCPATH . 'assets/game/map-assets/kawasan-warga.webp') ? 'assets/game/map-assets/' : 'public/map-assets/'; ?>
    <title>Panel Admin — Republik WkWkWk</title>
    <?php
    $manifest_path = FCPATH . 'assets/game/.vite/manifest.json';
    $manifest = is_file($manifest_path) ? json_decode(file_get_contents($manifest_path), TRUE) : array();
    $entry = isset($manifest['game-src/main.js']) ? $manifest['game-src/main.js'] : NULL;
    $character_model_path = is_file($manifest_path) ? 'assets/game/models/characters/warga-chibi-base.glb' : 'public/models/characters/warga-chibi-base.glb';
    if ($entry && !empty($entry['css'])):
        foreach ($entry['css'] as $css): ?>
            <link rel="stylesheet" href="<?= base_url('assets/game/' . $css); ?>">
        <?php endforeach;
    else: ?>
        <link rel="stylesheet" href="<?= base_url('game-src/style.css?v=' . filemtime(FCPATH . 'game-src/style.css')); ?>">
    <?php endif; ?>
</head>
<body class="admin-body">
    <main class="editor-shell">
        <header class="editor-header">
            <a class="brand" href="<?= base_url(); ?>"><span class="brand-mark">✳</span><span><b>REPUBLIK</b><small>WKWKWK</small></span></a>
            <div class="editor-heading"><span class="eyebrow">PANEL ADMIN</span><h1>Panel Admin Semesta</h1></div>
            <label class="admin-command-search"><span>⌕</span><input id="adminMenuSearch" type="search" placeholder="Cari menu admin…" aria-label="Cari menu admin"><kbd>CTRL K</kbd></label>
            <div class="editor-header-actions"><a class="back-link" href="<?= base_url(); ?>">Lihat dunia ↗</a><form method="post" action="<?= site_url('admin/logout/'); ?>"><button class="logout-button" type="submit">Keluar ↗</button></form></div>
        </header>
        <div class="local-banner"><span>●</span> DATA TERSIMPAN DI DATABASE LOKAL · BELUM TERHUBUNG KE MEDIA SOSIAL</div>
        <div class="admin-layout">
            <nav class="admin-nav" aria-label="Menu panel admin">
                <span class="admin-nav-label">PANEL ADMIN</span>
                <button type="button" class="active" data-admin-view="overview"><span>⌂</span> Ringkasan</button>
                <button type="button" data-admin-view="avatars"><span>♙</span> Studio avatar</button>
                <button type="button" data-admin-view="world"><span>▧</span> Tata wilayah</button>
                <button type="button" data-admin-view="objects"><span>◇</span> Galeri object</button>
                <button type="button" data-admin-view="ideas"><span>✳</span> Inbox warga <b id="ideasNavCount">—</b></button>
                <button type="button" data-admin-view="citizens"><span>♙</span> Direktori warga <b id="citizenNavCount">—</b></button>
                <button type="button" data-admin-view="visitors"><span>◉</span> Log pengunjung <b id="visitorNavCount">—</b></button>
                <button type="button" data-admin-view="settings"><span>⚙</span> Data & pengaturan</button>
                <div class="admin-nav-note"><b>STUDIO WILAYAH</b><p>Susun jalan, rumah, fasilitas, sungai, kendaraan, dan suasana tiap wilayah.</p></div>
            </nav>
            <div class="admin-content">
                <section class="admin-view active" id="adminView-overview">
                    <div class="admin-page-intro"><div><span class="eyebrow">SELAMAT DATANG DI STUDIO</span><h2>Bangun ruang bermainnya.</h2><p>Tata wilayah 3D dengan aset yang dapat dipindah, diputar, dan diatur ukurannya.</p></div><button class="save-button" type="button" data-admin-view="world">BUKA STUDIO WILAYAH ↗</button></div>
                    <div class="overview-grid">
                        <article class="overview-card overview-feature"><span class="overview-icon">▧</span><span class="eyebrow">STUDIO TATA WILAYAH</span><h3>Bangun peta bermain</h3><p>Atur jalan, bangunan, kendaraan, hewan, sungai, dan fasilitas publik.</p><button type="button" class="text-action" data-admin-view="world">Buka studio wilayah <b>↗</b></button></article>
                        <article class="overview-card overview-stat"><span class="overview-icon">✳</span><span class="eyebrow">MASUKAN WARGA</span><strong id="overviewIdeaCount">—</strong><p>Gagasan yang tercatat untuk pengembangan dunia.</p><button type="button" class="text-action" data-admin-view="ideas">Lihat masukan <b>↗</b></button></article>
                        <article class="overview-card overview-stat"><span class="overview-icon">⌂</span><span class="eyebrow">KOTA PERDANA</span><strong>Kawasan Warga</strong><p>Satu kota yang sedang kita rapikan sampai siap direkam.</p><a class="text-action" href="<?= base_url(); ?>">Masuk ke kota <b>↗</b></a></article>
                    </div>
                </section>

                <section class="admin-view" id="adminView-avatars">
                    <div class="admin-page-intro"><div><span class="eyebrow">KREATOR KARAKTER 3D</span><h2>Studio avatar</h2><p>Karakter berproporsi utuh dengan gerak napas dan kedipan. Pilih pakaian dan aksesori, lalu putar pratinjaunya.</p></div><div class="avatar-combo-count"><b id="avatarComboCount">100.000+</b><span>RACIKAN TERSEDIA</span></div></div>
                    <div class="avatar-studio">
                        <div class="avatar-preview-card"><div class="builder-subhead"><b>PRATINJAU ASET GLB</b><small>Seret untuk 360° · scroll untuk zoom</small></div><canvas id="avatarPreviewCanvas" aria-label="Pratinjau karakter avatar 3D"></canvas><div class="avatar-preview-caption"><b id="avatarPreviewName">Warga Semesta</b><span id="avatarPreviewParts">WARGA · GAYA BEBAS</span></div><div class="character-preview-toolbar"><label>Animasi<select id="avatarPreviewAnimation" aria-label="Pilih klip animasi"></select></label><label>Pencahayaan<select id="avatarPreviewLighting"><option value="studio">Studio</option><option value="daylight">Siang</option><option value="warm">Hangat</option></select></label><button type="button" id="avatarWireframe" aria-pressed="false">WIRE</button><button type="button" id="avatarSkeleton" aria-pressed="false">TULANG</button><label class="character-scale">Skala<input type="range" id="avatarPreviewScale" min="0.75" max="1.25" step="0.01" value="1"><output id="avatarPreviewScaleValue">1.00×</output></label></div><div class="character-asset-import"><label for="avatarAssetFile">Uji GLB lokal</label><input id="avatarAssetFile" type="file" accept=".glb,model/gltf-binary"><button type="button" id="avatarResetAsset">Kembali ke aset situs</button></div><p class="character-preview-stats" id="avatarAssetStatus" role="status">Memeriksa aset GLB…</p><details class="character-material-details"><summary>Validasi dan material</summary><pre id="avatarMaterialReport">Menunggu GLB dimuat.</pre></details></div>
                        <form class="avatar-options" id="avatarOptionsForm">
                            <div class="builder-subhead"><b>RACIK BAGIAN AVATAR</b><small>Pilih kombinasi bagian sesukamu</small></div>
                            <label>Warna kulit<select name="skin"></select></label><label>Gaya rambut<select name="hair"></select></label><label>Warna rambut<select name="hairColor"></select></label><label>Atasan<select name="top"></select></label><label>Bawahan<select name="bottom"></select></label><label>Penutup kepala<select name="headwear"></select></label><label>Aksesori<select name="accessory"></select></label><label>Rambut wajah<select name="facialHair"></select></label>
                            <label class="avatar-name-field">Nama racikan<input id="avatarPresetName" maxlength="40" value="Warga Semesta" placeholder="contoh: Relawan Pesisir"></label><div class="avatar-option-actions"><button type="button" class="text-action" id="randomAvatar">🎲 Acak racikan</button><button type="button" class="save-button" id="saveAvatarPreset">SIMPAN AVATAR <span>＋</span></button></div>
                            <p class="avatar-save-status" id="avatarSaveStatus" role="status">Pilih bagian untuk melihat perubahan 3D.</p>
                        </form>
                    </div>
                    <section class="avatar-catalog-card"><div class="section-heading"><div><span class="eyebrow">KATALOG RACIKAN</span><h2>Avatar siap pakai</h2></div><span class="draft-tag" id="avatarCatalogCount">20 GAYA AWAL</span></div><p class="avatar-catalog-note">Pilih gaya awal lalu ubah bagian mana pun. Racikan yang disimpan tersedia kembali saat panel admin dibuka.</p><label class="catalog-search">Cari avatar<input id="avatarCatalogSearch" type="search" placeholder="Contoh: petani, guru, relawan"></label><div class="avatar-catalog" id="avatarCatalog" aria-live="polite"></div><div class="admin-list-pages"><button id="avatarCatalogPrev" type="button">← Sebelumnya</button><span id="avatarCatalogPage">Halaman 1</span><button id="avatarCatalogNext" type="button">Berikutnya →</button></div></section>
                </section>

                <section class="admin-view" id="adminView-world">
                    <div class="admin-page-intro"><div><span class="eyebrow">STUDIO 3D · MODE BEBAS</span><h2>Tata wilayah</h2><p>Tarik aset ke peta, pindahkan dengan drag, lalu putar dan atur ukurannya.</p></div><div class="scene-toolbar"><label>Wilayah<select id="sceneRegion"><option value="kota">Kota Warga</option><option value="desa">Desa Tumbuh</option><option value="hutan">Hutan Warga</option></select></label><button class="save-button" id="saveWorldScene" type="button">SIMPAN TATAAN <span>↗</span></button></div></div>
                    <div class="world-builder">
                        <aside class="asset-palette"><div class="builder-subhead"><b>ASET WILAYAH</b><small>Klik untuk menambah · tarik untuk menaruh</small></div><label class="catalog-search">Cari aset<input id="worldAssetSearch" type="search" placeholder="Jalan, rumah, hewan…"></label><div class="asset-palette-list" id="worldAssetPalette"></div><p class="builder-help">Klik aset untuk langsung menambahkannya ke peta. Setelah itu geser objek, atur rotasi dari properti, atau tekan R.</p></aside>
                        <div class="scene-canvas-wrap"><div class="builder-canvas-head"><span>AREA 3D · KOTA WARGA</span><span><span>GESER UNTUK JELAJAH · WHEEL ZOOM</span> <button type="button" id="sceneRotateMode" aria-pressed="false">PUTAR PETA ⟳</button> <button type="button" id="reloadWorldScene">MUAT ULANG ↻</button></span></div><canvas id="worldBuilderCanvas" aria-label="Editor peta wilayah 3D tanpa batas tetap"></canvas><div class="builder-zoom"><button id="sceneZoomIn" type="button" aria-label="Perbesar peta">+</button><button id="sceneZoomOut" type="button" aria-label="Perkecil peta">−</button></div><div class="scene-canvas-foot" id="worldSceneStatus">Memuat aset dan tata wilayah…</div></div>
                        <aside class="object-inspector" id="worldObjectInspector"><div class="builder-subhead"><b>PROPERTI OBJEK</b><small>Geser slider kiri-kanan untuk mengatur nilai</small></div><p id="emptyObjectHint">Pilih objek di peta untuk mengatur posisi, rotasi, dan ukuran.</p><div id="objectProperties" hidden>
                            <strong id="selectedObjectName">Objek</strong><label>Posisi X<input class="property-range" id="objectXRange" type="range" min="-500" max="500" step="1" aria-label="Geser posisi X"><input id="objectX" type="number" min="-1000000" max="1000000" step="0.5"></label><label>Posisi Z<input class="property-range" id="objectZRange" type="range" min="-500" max="500" step="1" aria-label="Geser posisi Z"><input id="objectZ" type="number" min="-1000000" max="1000000" step="0.5"></label><label>Rotasi<input class="property-range" id="objectRotationRange" type="range" min="-360" max="360" step="15" aria-label="Geser rotasi objek"><input id="objectRotation" type="number" min="-360" max="360" step="15"><span class="rotation-actions"><button id="rotateObjectLeft" type="button" aria-label="Putar 15 derajat ke kiri">↶ 15°</button><button id="rotateObjectRight" type="button" aria-label="Putar 15 derajat ke kanan">↻ 15°</button></span></label>
                            <div class="object-dimensions" id="objectDimensions"><label>Panjang<input class="property-range" id="objectLengthRange" type="range" min="1" max="24" step="0.5" aria-label="Geser panjang objek"><input id="objectLength" type="number" min="1" max="24" step="0.5"></label><label>Lebar<input class="property-range" id="objectWidthRange" type="range" min="0.5" max="16" step="0.5" aria-label="Geser lebar objek"><input id="objectWidth" type="number" min="0.5" max="16" step="0.5"></label></div>
                            <label id="objectScaleField">Skala<input class="property-range" id="objectScaleRange" type="range" min="0.25" max="4" step="0.1" aria-label="Geser skala objek"><input id="objectScale" type="number" min="0.25" max="4" step="0.1"></label><button class="delete-object-button" id="deleteWorldObject" type="button">HAPUS OBJEK</button>
                        </div></aside>
                    </div>
                </section>

                <section class="admin-view" id="adminView-objects">
                    <div class="admin-page-intro"><div><span class="eyebrow">KATALOG ASET · 3D & PETA</span><h2>Galeri object</h2><p>Lihat model yang tersedia sebelum menaruhnya ke wilayah. Pilih object untuk memutar pratinjau 3D.</p></div><button type="button" class="save-button" data-admin-view="world">BUKA TATA WILAYAH ↗</button></div>
                    <div class="object-gallery-layout">
                        <article class="object-gallery-preview"><div class="builder-subhead"><b>PRATINJAU OBJECT 3D</b><small id="objectPreviewHint">Pilih object di katalog</small></div><canvas id="objectGalleryCanvas" aria-label="Pratinjau model object 3D"></canvas><div class="avatar-preview-caption"><b id="objectPreviewName">Pilih object</b><span id="objectPreviewType">KATALOG 3D</span></div></article>
                        <div class="object-gallery-main"><div class="object-gallery-tools"><label class="object-gallery-search">Cari object<input id="objectGallerySearch" type="search" placeholder="Contoh: rumah, pohon, kendaraan"></label><label class="object-gallery-category">Kategori<select id="objectGalleryFilter"><option value="all">Semua kategori</option><option>JALAN & AIR</option><option>BANGUNAN</option><option>PERTANIAN</option><option>KENDARAAN</option><option>ALAM & HEWAN</option><option>PROPERTI</option></select></label><span class="draft-tag" id="objectGalleryCount">MEMUAT KATALOG…</span></div><div class="object-gallery-grid" id="objectGalleryGrid" aria-live="polite"></div><div class="admin-list-pages"><button id="objectGalleryPrev" type="button">← Sebelumnya</button><span id="objectGalleryPage">Halaman 1</span><button id="objectGalleryNext" type="button">Berikutnya →</button></div></div>
                    </div>
                    <section class="object-source-card"><div class="section-heading"><div><span class="eyebrow">ASET PETA 2D</span><h2>Ilustrasi yang tersedia</h2></div><span class="draft-tag">PUBLIC / MAP-ASSETS</span></div><p class="object-source-note">Model 3D dibuat dari geometri di <code>game-src/world-assets-3d-v2.js</code>. Sumber ilustrasi peta WebP ada di <code>public/map-assets/</code> dan disalin saat build ke <code>assets/game/map-assets/</code>. Pilih gambar untuk membukanya di tab baru.</p><div class="map-asset-gallery">
                        <?php foreach (array('kawasan-warga.webp' => 'Latar Kawasan Warga', 'rumah-warga-v2.webp' => 'Rumah warga', 'pohon-rindang-v2.webp' => 'Pohon rindang', 'sekolah-rusak.webp' => 'Sekolah rusak', 'dapur-mbg-v2.webp' => 'Dapur MBG', 'dapur-mbg.webp' => 'Dapur MBG (versi awal)', 'kopdes-merah-putih-v2.webp' => 'Kopdes Merah Putih', 'kopdes-merah-putih.webp' => 'Kopdes (versi awal)', 'bgn-logo.webp' => 'Logo resmi BGN', 'istana-negara.webp' => 'Istana Negara', 'hutan-lestari.webp' => 'Hutan lestari', 'hutan-terbakar.webp' => 'Hutan terbakar') as $asset_file => $asset_name): if (!is_file(FCPATH . $map_asset_root . $asset_file)) continue; $asset_url = base_url($map_asset_root . $asset_file); ?>
                            <a class="map-asset-card" href="<?= html_escape($asset_url); ?>" target="_blank" rel="noopener"><img src="<?= html_escape($asset_url . '?v=' . filemtime(FCPATH . $map_asset_root . $asset_file)); ?>" alt="<?= html_escape($asset_name); ?>" loading="lazy"><span><b><?= html_escape($asset_name); ?></b><small><?= html_escape($asset_file); ?> ↗</small></span></a>
                        <?php endforeach; ?>
                    </div></section>
                </section>

                <section class="admin-view" id="adminView-ideas">
                    <div class="admin-page-intro"><div><span class="eyebrow">SUARA WARGA</span><h2>Masukan warga</h2><p>Catat ide untuk pengembangan ruang dan pengalaman bermain.</p></div><span class="inbox-count"><b id="ideasPageCount">—</b> IDE TERCATAT</span></div>
                    <section class="editor-card ideas-card" id="ideasInbox"><div class="section-heading"><div><span class="eyebrow">TANGKAP IDE DARI SOSIAL MEDIA</span><h2>Catat usulan warga</h2></div><span class="draft-tag">INPUT MANUAL</span></div>
                        <form id="ideaForm" class="idea-form"><div class="form-grid"><label>Nama panggilan (opsional)<input name="name" maxlength="50" placeholder="contoh: warga_kebun"></label><label>Sumber komentar<input name="platform" maxlength="24" placeholder="Instagram, TikTok, Threads"></label></div><label>Ide atau komentar<textarea name="comment" rows="3" maxlength="500" required placeholder="Salin komentar atau ringkas ide warga..."></textarea></label><div class="idea-form-footer"><span id="ideaStatus" class="save-status">Tersimpan di database lokal.</span><button class="save-button" type="submit">SIMPAN IDE <span>＋</span></button></div></form>
                        <div class="admin-list-tools"><label>Cari usulan<input id="ideaSearch" type="search" placeholder="Kata kunci, nama, sumber…"></label><label>Status<select id="ideaFilterStatus"><option value="all">Semua status</option><option value="baru">Baru</option><option value="dipilih">Dipilih</option><option value="dipakai">Dipakai</option><option value="disimpan">Tidak dipakai</option></select></label><label>Sumber<select id="ideaFilterSource"><option value="all">Semua sumber</option></select></label></div>
                        <p class="admin-list-status" id="ideaListStatus" role="status">Memuat masukan…</p><div id="ideaList" class="idea-list" aria-live="polite"></div><div class="admin-list-pages"><button id="ideaPrev" type="button">← Sebelumnya</button><span id="ideaPageLabel">Halaman 1</span><button id="ideaNext" type="button">Berikutnya →</button></div>
                    </section>
                </section>

                <section class="admin-view" id="adminView-citizens">
                    <div class="admin-page-intro"><div><span class="eyebrow">AKUN & KEANGGOTAAN</span><h2>Direktori warga</h2><p>Kelola akun dan lihat biodata yang diisi warga. Administrator menggunakan akses panel terpisah dari akun warga.</p></div></div>
                    <div class="account-separation-banner"><span>⚙</span><div><b>AKUN ADMINISTRATOR TERPISAH</b><p>Akses panel admin dikelola terpisah dari pendaftaran warga. Profil karakter admin tidak masuk ke direktori warga.</p></div><strong id="citizenAdminAccountName">ADMIN</strong></div>
                    <div class="citizen-admin-stats"><article><span>SELURUH WARGA</span><b id="citizenStatTotal">—</b></article><article><span>EMAIL TERVERIFIKASI</span><b id="citizenStatVerified">—</b></article><article><span>MENUNGGU VERIFIKASI</span><b id="citizenStatPending">—</b></article><article><span>AKUN NONAKTIF</span><b id="citizenStatInactive">—</b></article><article><span>PROFIL KARAKTER ADMIN</span><b id="citizenStatAdminProfiles">—</b></article></div>
                    <section class="overview-card citizen-admin-card"><div class="citizen-admin-tools"><label>Cari nama, username, atau email<input id="citizenAdminSearch" type="search" maxlength="80" placeholder="contoh: warga_kota"></label><label>Status akun<select id="citizenAdminFilter"><option value="all">Semua warga</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="unverified">Email belum diverifikasi</option></select></label></div><p class="citizen-admin-status" id="citizenAdminStatus" role="status">Memuat direktori warga…</p><div class="citizen-admin-list" id="citizenAdminList" aria-live="polite"></div><div class="citizen-admin-pages"><button id="citizenAdminPrev" type="button" aria-label="Halaman sebelumnya">← Sebelumnya</button><span id="citizenAdminPage">Halaman 1 dari 1</span><button id="citizenAdminNext" type="button" aria-label="Halaman berikutnya">Berikutnya →</button></div></section>
                </section>

                <section class="admin-view" id="adminView-visitors">
                    <div class="admin-page-intro"><div><span class="eyebrow">ANALITIK AKSES · RETENSI 90 HARI</span><h2>Log pengunjung</h2><p>Telusuri halaman, alamat IP, perangkat, browser, dan situs perujuk. Log hanya bisa dibuka dari panel admin.</p></div></div>
                    <div class="visitor-stats"><article><span>PAGE VIEW</span><b id="visitorStatViews">—</b></article><article><span>PENGUNJUNG UNIK</span><b id="visitorStatUnique">—</b></article><article><span>ALAMAT IP UNIK</span><b id="visitorStatIps">—</b></article><article><span>DATANG DARI PERUJUK</span><b id="visitorStatReferred">—</b></article></div>
                    <section class="overview-card visitor-card"><div class="visitor-filters"><label>Cari IP, halaman, perujuk, atau perangkat<input id="visitorSearch" type="search" placeholder="contoh: semesta, google.com, 192.168…"></label><label>Periode<select id="visitorDays"><option value="7">7 hari terakhir</option><option value="30" selected>30 hari terakhir</option><option value="90">90 hari terakhir</option></select></label><label>Perangkat<select id="visitorDevice"><option value="all">Semua perangkat</option><option value="desktop">Desktop</option><option value="mobile">Ponsel</option><option value="tablet">Tablet</option></select></label><label>Jenis trafik<select id="visitorTraffic"><option value="all">Semua</option><option value="human">Pengunjung</option><option value="bot">Bot / crawler</option></select></label><label>Dari<input id="visitorFrom" type="date"></label><label>Sampai<input id="visitorTo" type="date"></label><button class="text-action visitor-reset" id="visitorReset" type="button">Hapus filter</button></div>
                        <div class="visitor-top-sources"><div><span class="eyebrow">SUMBER PERUJUK TERATAS</span><div id="visitorReferrerList" class="visitor-referrer-list"><span class="admin-list-status">Memuat…</span></div></div><p class="visitor-privacy-note">IP publik dicatat untuk analitik internal dan dihapus setelah 90 hari. Log lama yang hanya merekam alamat proxy ditandai sebagai tidak tersedia.</p></div>
                        <p class="admin-list-status" id="visitorStatus" role="status" aria-live="polite">Memuat log…</p><div class="visitor-table-wrap"><table class="visitor-table"><thead><tr><th>WAKTU</th><th>IP</th><th>HALAMAN</th><th>PERUJUK</th><th>PERANGKAT</th><th>AGEN PENGGUNA</th></tr></thead><tbody id="visitorRows"></tbody></table></div><div class="admin-list-pages"><button id="visitorPrev" type="button">← Sebelumnya</button><span id="visitorPageLabel">Halaman 1</span><button id="visitorNext" type="button">Berikutnya →</button></div>
                    </section>
                </section>

                <section class="admin-view" id="adminView-settings">
                    <div class="admin-page-intro"><div><span class="eyebrow">PANEL ADMIN</span><h2>Data & pengaturan</h2><p>Informasi penyimpanan dan batasan panel selama pengembangan.</p></div></div>
                    <div class="settings-grid"><article class="overview-card"><span class="eyebrow">PENYIMPANAN</span><h3>MySQL · semesta_nyasar</h3><p>Susunan aset tiap wilayah dan masukan warga tersimpan di database.</p><span class="status-pill"><i></i> DATABASE AKTIF</span></article><article class="overview-card"><span class="eyebrow">LINGKUP WILAYAH</span><h3>Kota, desa, dan hutan</h3><p>Setiap wilayah punya susunan aset sendiri di Studio Tata Wilayah.</p><button type="button" class="text-action" data-admin-view="world">Buka studio wilayah <b>↗</b></button></article><article class="overview-card"><span class="eyebrow">MASUKAN</span><h3>Media sosial dicatat manual</h3><p>Catat ide warga secara manual. Studio belum membaca atau menerbitkan konten ke akun sosial.</p><button type="button" class="text-action" data-admin-view="ideas">Lihat masukan warga <b>↗</b></button></article><article class="overview-card"><span class="eyebrow">PRATINJAU</span><h3>Jelajahi kota di browser</h3><p>Lihat perubahan tata wilayah langsung di game.</p><a class="text-action" href="<?= base_url(); ?>">Buka Republik WkWkWk <b>↗</b></a></article></div>
                    <form class="overview-card mail-settings-card" id="mailSettingsForm"><span class="eyebrow">AKUN WARGA</span><h3>Verifikasi email & Google SSO</h3><p>Warga baru perlu mengonfirmasi email sebelum masuk. SMTP Gmail dan OAuth Google disimpan di konfigurasi privat server.</p><label class="mail-toggle"><input type="checkbox" name="requireEmailVerification"><span>Wajibkan verifikasi email saat pendaftaran</span></label><div class="mail-status" id="mailSettingsStatus" role="status">Memuat status email…</div><button class="save-button" type="submit">SIMPAN PENGATURAN <span>↗</span></button></form>
                </section>
            </div>
        </div>
    </main>
    <script>
    (function () {
        var validViews = ['overview','avatars','world','objects','ideas','citizens','visitors','settings'];
        var activeView = 'overview';
        var viewFromUrl = function () { var candidate = new URLSearchParams(location.search).get('view'); return validViews.indexOf(candidate) >= 0 ? candidate : 'overview'; };
        var scrollQueued = false;
        var saveScroll = function () { if (scrollQueued) return; scrollQueued = true; requestAnimationFrame(function () { scrollQueued = false; try { sessionStorage.setItem('semesta.admin.scroll.' + activeView, String(window.scrollY || 0)); } catch (_) {} }); };
        window.semestaAdminNavigate = function (name, mode) {
            if (validViews.indexOf(name) < 0) return;
            var previous = activeView;
            if (previous !== name) saveScroll();
            activeView = name;
            document.querySelectorAll('.admin-view').forEach(function (view) { view.classList.toggle('active', view.id === 'adminView-' + name); });
            document.querySelectorAll('.admin-nav [data-admin-view]').forEach(function (button) { button.classList.toggle('active', button.dataset.adminView === name); });
            if (mode === 'push') { var url = new URL(location.href); url.pathname = '/admin/'; url.searchParams.set('view', name); history.pushState({ view: name }, '', url); }
            try { sessionStorage.setItem('semesta.admin.lastView', name); } catch (_) {}
            window.dispatchEvent(new CustomEvent('semesta:admin-view-change', { detail: { view: name } }));
            requestAnimationFrame(function () {
                var saved = 0; try { saved = Number(sessionStorage.getItem('semesta.admin.scroll.' + name) || 0); } catch (_) {}
                window.scrollTo({ top: mode === 'push' && previous === name ? window.scrollY : saved, behavior: 'auto' });
            });
        };
        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('[data-admin-view]');
            if (trigger) window.semestaAdminNavigate(trigger.dataset.adminView, 'push');
        });
        window.addEventListener('popstate', function () { window.semestaAdminNavigate(viewFromUrl(), 'restore'); });
        window.addEventListener('scroll', saveScroll, { passive: true });
        window.addEventListener('pagehide', saveScroll);
        var search = document.getElementById('adminMenuSearch');
        var navItems = Array.prototype.slice.call(document.querySelectorAll('.admin-nav [data-admin-view]'));
        var matches = function () {
            var q = (search.value || '').trim().toLocaleLowerCase('id-ID');
            navItems.forEach(function (button) { button.hidden = !!q && !button.textContent.toLocaleLowerCase('id-ID').includes(q); });
            return navItems.filter(function (button) { return !button.hidden; });
        };
        search.addEventListener('input', matches);
        search.addEventListener('keydown', function (event) { if (event.key === 'Enter') { var first = matches()[0]; if (first) { window.semestaAdminNavigate(first.dataset.adminView, 'push'); search.value = ''; matches(); } } if (event.key === 'Escape') { search.value = ''; matches(); search.blur(); } });
        document.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); } });
        window.semestaAdminNavigate(viewFromUrl(), 'restore');
    })();
    </script>
    <script>window.SEMESTA_MAP_ASSET_ROOT = <?= json_encode(base_url($map_asset_root), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script>window.SEMESTA_CHARACTER_MODEL = <?= json_encode(base_url($character_model_path . '?v=' . filemtime(FCPATH . 'public/models/characters/warga-chibi-base.glb')), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script>window.SEMESTA_AVATAR_GALLERY_ROOT = <?= json_encode(base_url('public/models/characters/gallery/'), JSON_UNESCAPED_SLASHES); ?>;</script>
    <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/"}}</script>
    <?php if ($entry): ?><script type="module" src="<?= base_url('assets/game/' . $entry['file']); ?>"></script><?php else: ?><script type="module" src="<?= base_url('game-src/main.js?v=' . filemtime(FCPATH . 'game-src/main.js')); ?>"></script><?php endif; ?>
</body>
</html>
