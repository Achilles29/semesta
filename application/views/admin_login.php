<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f4edda">
    <title>Masuk — Ruang Editor Semesta Nyasar</title>
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
<body class="login-body">
    <main class="login-card">
        <a class="login-brand" href="<?= base_url(); ?>"><span>✳</span><b>SEMESTA NYASAR</b></a>
        <p class="login-eyebrow">RUANG EDITOR · LOKAL</p>
        <h1>Yang boleh masuk<br>cuma tim pencari.</h1>
        <p class="login-copy">Masuk untuk mengubah kasus, petunjuk, dan dialog dunia.</p>
        <?php if (!empty($error)): ?><div class="login-error" role="alert"><?= html_escape($error); ?></div><?php endif; ?>
        <form method="post" action="<?= site_url('admin'); ?>" autocomplete="on">
            <label>Nama pengguna<input name="username" autocomplete="username" required autofocus></label>
            <label>Kata sandi<input name="password" type="password" autocomplete="current-password" required></label>
            <button type="submit">MASUK KE RUANG EDITOR <span>↗</span></button>
        </form>
        <div class="login-foot"><span>✳</span> HALAMAN INI HANYA TERSEDIA DI KOMPUTER LOKAL</div>
    </main>
    <div class="login-scribble scribble-one">jangan lupa<br>tutup berkasnya ↗</div>
    <div class="login-scribble scribble-two">mode penyelidikan<br>serius (katanya)</div>
</body>
</html>
