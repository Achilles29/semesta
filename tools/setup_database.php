<?php
/* Local, repeatable XAMPP database setup. It never drops tables or overwrites existing rows. */
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$host = getenv('SEMESTA_DB_HOST') ?: '127.0.0.1';
$user = getenv('SEMESTA_DB_USER') ?: 'root';
$password = getenv('SEMESTA_DB_PASSWORD');
$password = $password === FALSE ? '' : $password;
$port = (int) (getenv('SEMESTA_DB_PORT') ?: 3306);
$dbName = 'semesta_nyasar';
$root = dirname(__DIR__);

try {
    $db = new mysqli($host, $user, $password, '', $port);
    $db->set_charset('utf8mb4');
    $db->query("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $db->select_db($dbName);
    $db->query("CREATE TABLE IF NOT EXISTS episodes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        slug VARCHAR(80) NOT NULL,
        title VARCHAR(160) NOT NULL,
        payload LONGTEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id), UNIQUE KEY uq_episodes_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->query("CREATE TABLE IF NOT EXISTS citizen_ideas (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        public_id VARCHAR(80) NOT NULL,
        name VARCHAR(50) NOT NULL DEFAULT '',
        comment VARCHAR(500) NOT NULL,
        platform VARCHAR(24) NOT NULL DEFAULT '',
        status ENUM('baru','dipilih','dipakai','disimpan') NOT NULL DEFAULT 'baru',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id), UNIQUE KEY uq_citizen_ideas_public_id (public_id),
        KEY idx_citizen_ideas_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $caseFile = $root . '/application/data/cases/kasus-01.json';
    $case = json_decode(file_get_contents($caseFile), TRUE);
    if (is_array($case)) {
        $check = $db->prepare('SELECT id FROM episodes WHERE slug = ? LIMIT 1');
        $slug = 'kasus-01'; $check->bind_param('s', $slug); $check->execute();
        if (!$check->get_result()->fetch_assoc()) {
            $payload = json_encode($case, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $title = substr($case['title'], 0, 160);
            $insert = $db->prepare('INSERT INTO episodes (slug, title, payload, updated_at) VALUES (?, ?, ?, NOW())');
            $insert->bind_param('sss', $slug, $title, $payload); $insert->execute();
        }
    }

    $ideasFile = $root . '/application/data/ideas-warga.json';
    $ideas = is_file($ideasFile) ? json_decode(file_get_contents($ideasFile), TRUE) : array();
    if (is_array($ideas)) {
        $check = $db->prepare('SELECT id FROM citizen_ideas WHERE public_id = ? LIMIT 1');
        $insert = $db->prepare('INSERT INTO citizen_ideas (public_id, name, comment, platform, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
        foreach ($ideas as $idea) {
            $publicId = isset($idea['id']) ? (string) $idea['id'] : uniqid('ide-', TRUE);
            $check->bind_param('s', $publicId); $check->execute();
            if ($check->get_result()->fetch_assoc()) continue;
            $name = substr(isset($idea['name']) ? strip_tags($idea['name']) : '', 0, 50);
            $comment = substr(isset($idea['comment']) ? strip_tags($idea['comment']) : '', 0, 500);
            if ($comment === '') continue;
            $platform = substr(isset($idea['platform']) ? strip_tags($idea['platform']) : '', 0, 24);
            $status = isset($idea['status']) && in_array($idea['status'], array('baru','dipilih','dipakai','disimpan'), TRUE) ? $idea['status'] : 'baru';
            $insert->bind_param('sssss', $publicId, $name, $comment, $platform, $status); $insert->execute();
        }
    }
    echo "Database semesta_nyasar siap. Tabel episodes dan citizen_ideas tersedia; data JSON lama diimpor tanpa menimpa baris yang sudah ada.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Setup database gagal: " . $error->getMessage() . "\n");
    exit(1);
}
