<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f4edda">
    <title>Masuk — Panel Admin Republik WkWkWk</title>
    <?php
    $manifest_path = FCPATH . 'assets/game/.vite/manifest.json';
    $manifest = is_file($manifest_path) ? json_decode(file_get_contents($manifest_path), TRUE) : array();
    $entry = isset($manifest['game-src/main.js']) ? $manifest['game-src/main.js'] : NULL;
    if ($entry && !empty($entry['css'])):
        foreach ($entry['css'] as $css): ?>
            <link rel="stylesheet" href="<?= base_url('assets/game/' . $css); ?>">
        <?php endforeach;
    else: ?>
        <link rel="stylesheet" href="<?= base_url('game-src/style.css'); ?>">
    <?php endif; ?>
</head>
<body class="login-body">
    <main class="login-card">
        <a class="login-brand" href="<?= base_url(); ?>"><span>✳</span><b>REPUBLIK WKWKWK</b></a>
        <p class="login-eyebrow">PANEL ADMIN</p>
        <h1>Masuk sebagai<br>admin.</h1>
        <p class="login-copy">Gunakan username dan kata sandi akun admin yang terdaftar di server.</p>
        <?php if (!empty($error)): ?><div class="login-error" role="alert"><?= html_escape($error); ?></div><?php endif; ?>
        <form method="post" action="<?= base_url('admin/'); ?>" autocomplete="on">
            <label>Nama pengguna<input name="username" autocomplete="username" required autofocus></label>
            <label>Kata sandi<input name="password" type="password" autocomplete="current-password" required></label>
            <button type="submit">MASUK KE PANEL ADMIN <span>↗</span></button>
        </form>
        <div class="login-foot"><span>✳</span> AKSES KHUSUS ADMIN</div>
    </main>
    <div class="login-scribble scribble-one">jangan lupa<br>tutup berkasnya ↗</div>
    <div class="login-scribble scribble-two">mode penyelidikan<br>serius (katanya)</div>
</body>
</html>
