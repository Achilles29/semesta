<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#eef3e8">
    <title><?= html_escape($title); ?> · Republik WkWkWk</title>
    <style>
        *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 18% 12%,#d8e8d4 0,transparent 40%),linear-gradient(145deg,#f5f1e4,#e9f0e6);color:#344b3a;font-family:Inter,"Segoe UI",sans-serif}.card{width:min(520px,100%);padding:clamp(24px,6vw,48px);border:1px solid #d7e0d0;border-radius:24px;background:#fffdf7;box-shadow:0 24px 70px #324c3820;text-align:center}.brand{display:inline-flex;align-items:center;gap:10px;margin-bottom:28px;text-align:left}.mark{display:grid;width:42px;height:42px;place-items:center;border:2px solid #f4e7bb;border-radius:14px;background:#47795e;color:#fff;font-weight:900}.brand b,.brand small{display:block}.brand b{font-size:12px;letter-spacing:.13em}.brand small{margin-top:3px;color:#788671;font-size:10px;letter-spacing:.2em}.status{display:grid;width:62px;height:62px;place-items:center;margin:0 auto 18px;border-radius:50%;background:<?= !empty($success) ? '#e4f1df' : '#fff0db'; ?>;color:<?= !empty($success) ? '#4c8754' : '#a56732'; ?>;font-size:30px}.eyebrow{color:#87917d;font-size:10px;font-weight:800;letter-spacing:.17em}h1{margin:10px 0 12px;font-size:clamp(25px,7vw,34px);letter-spacing:-.045em}p{margin:0 auto 10px;color:#657260;font-size:14px;line-height:1.65}.next{margin-bottom:25px;font-size:12px}.button{display:inline-flex;min-height:46px;align-items:center;justify-content:center;padding:0 20px;border-radius:11px;background:#47795e;color:#fff;font-size:12px;font-weight:800;text-decoration:none;box-shadow:0 4px 0 #315944}.button:hover{background:#396c50}.foot{margin-top:24px;color:#9aa090;font-size:10px}
    </style>
</head>
<body>
    <main class="card">
        <div class="brand"><span class="mark">RW</span><span><b>REPUBLIK</b><small>WKWKWK</small></span></div>
        <div class="status" aria-hidden="true"><?= !empty($success) ? '✓' : '!'; ?></div>
        <span class="eyebrow">VERIFIKASI AKUN WARGA</span>
        <h1><?= html_escape($title); ?></h1>
        <p><?= html_escape($message); ?></p>
        <p class="next"><?= html_escape($next_step); ?></p>
        <a class="button" href="<?= html_escape($back_url); ?>">KEMBALI KE PERMAINAN ↗</a>
        <div class="foot">REPUBLIK WKWKWK · DUNIA CERITA WARGA</div>
    </main>
</body>
</html>
