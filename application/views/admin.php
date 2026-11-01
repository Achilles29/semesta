<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#101426">
    <title>Ruang Produksi — Semesta Nyasar</title>
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
<body class="admin-body">
    <main class="editor-shell">
        <header class="editor-header">
            <a class="brand" href="<?= base_url(); ?>"><span class="brand-mark">✳</span><span><b>SEMESTA</b><small>NYASAR</small></span></a>
            <div class="editor-heading"><span class="eyebrow">RUANG PRODUKSI LOKAL</span><h1>Studio Semesta</h1></div>
            <div class="editor-header-actions"><a class="back-link" href="<?= base_url(); ?>">Lihat dunia ↗</a><form method="post" action="<?= site_url('admin/logout'); ?>"><button class="logout-button" type="submit">Keluar ↗</button></form></div>
        </header>
        <div class="local-banner"><span>●</span> DATA TERSIMPAN DI DATABASE LOKAL · BELUM TERHUBUNG KE MEDIA SOSIAL</div>
        <div class="admin-layout">
            <nav class="admin-nav" aria-label="Menu studio">
                <span class="admin-nav-label">STUDIO</span>
                <button type="button" class="active" data-admin-view="overview"><span>⌂</span> Ringkasan</button>
                <button type="button" data-admin-view="episode"><span>✎</span> Editor episode</button>
                <button type="button" data-admin-view="ideas"><span>✳</span> Inbox warga <b id="ideasNavCount">0</b></button>
                <button type="button" data-admin-view="settings"><span>⚙</span> Data & pengaturan</button>
                <div class="admin-nav-note"><b>ALUR KERJA</b><p>Ambil ide warga, olah jadi cerita, lalu lihat hasilnya di kota.</p></div>
            </nav>
            <div class="admin-content">
                <section class="admin-view active" id="adminView-overview">
                    <div class="admin-page-intro"><div><span class="eyebrow">SELAMAT DATANG DI STUDIO</span><h2>Semua cerita bermula dari sini.</h2><p>Atur episode, kumpulkan usulan warga, dan siapkan kota untuk direkam.</p></div><button class="save-button" type="button" data-admin-view="episode">BUAT CERITA ↗</button></div>
                    <div class="overview-grid">
                        <article class="overview-card overview-feature"><span class="overview-icon">✎</span><span class="eyebrow">EPISODE AKTIF</span><h3 id="overviewEpisodeTitle">Memuat episode…</h3><p>Periksa cerita dan petunjuk yang akan muncul saat Cempluk menjelajah.</p><button type="button" class="text-action" data-admin-view="episode">Buka editor episode <b>↗</b></button></article>
                        <article class="overview-card overview-stat"><span class="overview-icon">✳</span><span class="eyebrow">IDE WARGA</span><strong id="overviewIdeaCount">0</strong><p>Usulan yang sudah masuk ke inbox.</p><button type="button" class="text-action" data-admin-view="ideas">Lihat inbox <b>↗</b></button></article>
                        <article class="overview-card overview-stat"><span class="overview-icon">⌂</span><span class="eyebrow">KOTA PERDANA</span><strong>Kampung Sore</strong><p>Satu kota yang sedang kita rapikan sampai siap direkam.</p><a class="text-action" href="<?= base_url(); ?>">Masuk ke kota <b>↗</b></a></article>
                    </div>
                    <article class="overview-card overview-next"><span class="eyebrow">LANGKAH BERIKUTNYA</span><h3>Dari komentar jadi cerita</h3><ol><li>Catat komentar pilihan di Inbox Warga.</li><li>Masukkan ide terpilih sebagai catatan episode.</li><li>Simpan perubahan, lalu cek hasilnya di game.</li></ol></article>
                </section>

                <section class="admin-view" id="adminView-episode">
                    <div class="admin-page-intro"><div><span class="eyebrow">MEJA PENULISAN · EPISODE 001</span><h2>Editor episode</h2><p>Susun kasus kecil yang akan ditemui Cempluk di Kampung Sore.</p></div><a class="text-action" href="<?= base_url(); ?>">Lihat pratinjau ↗</a></div>
                    <form class="case-form" id="caseForm">
                        <section class="editor-card"><div class="section-heading"><div><span class="eyebrow">01 / BERKAS</span><h2>Inti ceritanya</h2></div><span class="draft-tag">DRAF LOKAL</span></div>
                            <label>Judul kasus<input name="title" maxlength="60" required></label><label>Kalimat pemancing<input name="hook" maxlength="160" required></label><label>Tugas detektif<textarea name="objective" rows="2" maxlength="160" required></textarea></label><label>Catatan warga<textarea name="citizenNote" rows="2" maxlength="120"></textarea></label>
                            <div class="form-grid"><label>Nama saksi<input name="witness" maxlength="40"></label><label>Nama kasus<input name="caseNumber" maxlength="24"></label></div>
                        </section>
                        <section class="editor-card clue-editor"><div class="section-heading"><div><span class="eyebrow">02 / BARANG BUKTI</span><h2>Tiga petunjuk</h2></div><span class="mini-note">Klik objek di game untuk mengujinya</span></div><div class="clue-fields" id="clueFields"></div></section>
                        <section class="editor-card ending-editor"><div class="section-heading"><div><span class="eyebrow">03 / AKHIR SEMENTARA</span><h2>Jawaban & ajakan</h2></div></div><label>Judul pengungkapan<input name="endingTitle" maxlength="70"></label><label>Isi pengungkapan<textarea name="endingText" rows="3" maxlength="240"></textarea></label><label>Pertanyaan untuk warga<input name="nextPrompt" maxlength="120"></label></section>
                        <footer class="editor-footer"><div class="save-status" id="saveStatus">Mengambil berkas kasus lokal…</div><button class="save-button" type="submit">SIMPAN EPISODE <span>↗</span></button></footer>
                    </form>
                </section>

                <section class="admin-view" id="adminView-ideas">
                    <div class="admin-page-intro"><div><span class="eyebrow">MEJA KOMUNITAS</span><h2>Inbox warga</h2><p>Simpan komentar yang menarik, lalu pilih yang ingin dibawa ke episode berikutnya.</p></div><span class="inbox-count"><b id="ideasPageCount">0</b> IDE TERCATAT</span></div>
                    <section class="editor-card ideas-card" id="ideasInbox"><div class="section-heading"><div><span class="eyebrow">TANGKAP IDE DARI SOSIAL MEDIA</span><h2>Catat usulan warga</h2></div><span class="draft-tag">INPUT MANUAL</span></div>
                        <form id="ideaForm" class="idea-form"><div class="form-grid"><label>Nama panggilan (opsional)<input name="name" maxlength="50" placeholder="contoh: warga_kebun"></label><label>Sumber komentar<input name="platform" maxlength="24" placeholder="Instagram, TikTok, Threads"></label></div><label>Ide atau komentar<textarea name="comment" rows="3" maxlength="500" required placeholder="Salin komentar atau ringkas ide warga..."></textarea></label><div class="idea-form-footer"><span id="ideaStatus" class="save-status">Tersimpan di database lokal.</span><button class="save-button" type="submit">SIMPAN IDE <span>＋</span></button></div></form>
                        <div id="ideaList" class="idea-list" aria-live="polite"></div>
                    </section>
                </section>

                <section class="admin-view" id="adminView-settings">
                    <div class="admin-page-intro"><div><span class="eyebrow">PANEL LOKAL</span><h2>Data & pengaturan</h2><p>Informasi penyimpanan dan batasan studio selama pengembangan.</p></div></div>
                    <div class="settings-grid"><article class="overview-card"><span class="eyebrow">PENYIMPANAN</span><h3>MySQL · semesta_nyasar</h3><p>Episode dan inbox ide tersimpan di database lokal XAMPP.</p><span class="status-pill"><i></i> DATABASE AKTIF</span></article><article class="overview-card"><span class="eyebrow">LINGKUP KOTA</span><h3>Kampung Sore</h3><p>Kota pertama sedang disiapkan. Kota lain akan menyusul setelah area ini matang.</p><span class="status-pill status-warm"><i></i> PENGEMBANGAN LOKAL</span></article><article class="overview-card"><span class="eyebrow">SUMBER DATA</span><h3>Media sosial dicatat manual</h3><p>Salin komentar pilihan ke Inbox Warga. Studio belum membaca atau menerbitkan konten ke akun sosial.</p><button type="button" class="text-action" data-admin-view="ideas">Buka inbox warga <b>↗</b></button></article><article class="overview-card"><span class="eyebrow">PRATINJAU</span><h3>Jelajahi kota di browser</h3><p>Lihat perubahan episode dan area main langsung dari halaman game lokal.</p><a class="text-action" href="<?= base_url(); ?>">Buka Semesta Nyasar <b>↗</b></a></article></div>
                </section>
            </div>
        </div>
    </main>
    <?php if ($entry): ?><script type="module" src="<?= base_url('assets/game/' . $entry['file']); ?>"></script><?php else: ?><div class="build-notice">Jalankan <code>npm run build</code> untuk menyiapkan tampilan editor.</div><?php endif; ?>
</body>
</html>
