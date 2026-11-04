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

    $db->query("CREATE TABLE IF NOT EXISTS citizens (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        account_type VARCHAR(16) NOT NULL DEFAULT 'citizen',
        username VARCHAR(32) NOT NULL,
        email VARCHAR(190) NOT NULL,
        display_name VARCHAR(40) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        verification_token_hash CHAR(64) DEFAULT NULL,
        verification_expires_at DATETIME DEFAULT NULL,
        avatar VARCHAR(32) NOT NULL DEFAULT 'warga',
        avatar_config TEXT DEFAULT NULL,
        house VARCHAR(24) NOT NULL DEFAULT 'rumah-kayu',
        gender VARCHAR(32) DEFAULT NULL,
        religion VARCHAR(48) DEFAULT NULL,
        birth_province VARCHAR(64) DEFAULT NULL,
        birth_city VARCHAR(80) DEFAULT NULL,
        birth_date DATE DEFAULT NULL,
        occupation VARCHAR(48) DEFAULT NULL,
        education_level VARCHAR(48) DEFAULT NULL,
        domicile_province VARCHAR(64) DEFAULT NULL,
        domicile_city VARCHAR(80) DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id), UNIQUE KEY uq_citizens_username (username), UNIQUE KEY uq_citizens_email (email), KEY idx_citizens_account_type (account_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Upgrade a previously created username-based citizens table without deleting accounts.
    $columns = array();
    foreach ($db->query('SHOW COLUMNS FROM citizens')->fetch_all(MYSQLI_ASSOC) as $column) $columns[$column['Field']] = TRUE;
    if (!isset($columns['email'])) $db->query('ALTER TABLE citizens ADD COLUMN email VARCHAR(190) NULL AFTER id');
    if (!isset($columns['username'])) $db->query('ALTER TABLE citizens ADD COLUMN username VARCHAR(32) NULL AFTER id');
    if (!isset($columns['email_verified'])) $db->query('ALTER TABLE citizens ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash');
    if (!isset($columns['is_active'])) $db->query('ALTER TABLE citizens ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER email_verified');
    if (!isset($columns['account_type'])) $db->query("ALTER TABLE citizens ADD COLUMN account_type VARCHAR(16) NOT NULL DEFAULT 'citizen' AFTER id");
    if (!isset($columns['verification_token_hash'])) $db->query('ALTER TABLE citizens ADD COLUMN verification_token_hash CHAR(64) DEFAULT NULL AFTER email_verified');
    if (!isset($columns['verification_expires_at'])) $db->query('ALTER TABLE citizens ADD COLUMN verification_expires_at DATETIME DEFAULT NULL AFTER verification_token_hash');
    foreach (array(
        'avatar_config' => 'TEXT DEFAULT NULL',
        'gender' => 'VARCHAR(32) DEFAULT NULL', 'religion' => 'VARCHAR(48) DEFAULT NULL',
        'birth_province' => 'VARCHAR(64) DEFAULT NULL', 'birth_city' => 'VARCHAR(80) DEFAULT NULL',
        'birth_date' => 'DATE DEFAULT NULL', 'occupation' => 'VARCHAR(48) DEFAULT NULL',
        'education_level' => 'VARCHAR(48) DEFAULT NULL', 'domicile_province' => 'VARCHAR(64) DEFAULT NULL',
        'domicile_city' => 'VARCHAR(80) DEFAULT NULL'
    ) as $column => $definition) if (!isset($columns[$column])) $db->query('ALTER TABLE citizens ADD COLUMN `' . $column . '` ' . $definition);
    $db->query('ALTER TABLE citizens MODIFY avatar VARCHAR(32) NOT NULL DEFAULT \'warga\'');
    $indexes = array();
    foreach ($db->query('SHOW INDEX FROM citizens')->fetch_all(MYSQLI_ASSOC) as $index) $indexes[$index['Key_name']] = TRUE;
    if (!isset($indexes['idx_citizens_account_type'])) $db->query('ALTER TABLE citizens ADD KEY idx_citizens_account_type (account_type)');

    $db->query("CREATE TABLE IF NOT EXISTS citizen_master_data (
        master_type VARCHAR(32) NOT NULL,
        master_value VARCHAR(64) NOT NULL,
        label VARCHAR(100) NOT NULL,
        avatar_style VARCHAR(32) DEFAULT NULL,
        sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (master_type, master_value),
        KEY idx_citizen_master_active (master_type, is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $masters = array(
        'gender' => array('laki-laki'=>'Laki-laki','perempuan'=>'Perempuan','lainnya'=>'Lainnya','tidak-menyebutkan'=>'Memilih tidak menyebutkan'),
        'religion' => array('islam'=>'Islam','kristen'=>'Kristen Protestan','katolik'=>'Katolik','hindu'=>'Hindu','buddha'=>'Buddha','konghucu'=>'Konghucu','kepercayaan'=>'Kepercayaan terhadap Tuhan YME','lainnya'=>'Lainnya','tidak-menyebutkan'=>'Memilih tidak menyebutkan'),
        'education' => array('belum-sekolah'=>'Belum sekolah','sd'=>'SD/sederajat','smp'=>'SMP/sederajat','sma'=>'SMA/SMK/sederajat','diploma'=>'Diploma','sarjana'=>'Sarjana','magister'=>'Magister','doktor'=>'Doktor','lainnya'=>'Lainnya','tidak-menyebutkan'=>'Memilih tidak menyebutkan'),
        'avatar' => array('warga'=>'Warga umum','petani'=>'Petani','pelajar'=>'Pelajar','pedagang'=>'Pedagang/UMKM','guru'=>'Guru','tenaga-kesehatan'=>'Tenaga kesehatan','asn'=>'Aparatur sipil','tni'=>'TNI','polri'=>'Polri','nelayan'=>'Nelayan','pekerja-konstruksi'=>'Pekerja konstruksi','pengemudi'=>'Pengemudi','koki'=>'Koki dapur','relawan'=>'Relawan','penjaga-hutan'=>'Penjaga hutan'),
        'province' => array('aceh'=>'Aceh','sumatera-utara'=>'Sumatera Utara','sumatera-barat'=>'Sumatera Barat','riau'=>'Riau','jambi'=>'Jambi','sumatera-selatan'=>'Sumatera Selatan','bengkulu'=>'Bengkulu','lampung'=>'Lampung','kepulauan-bangka-belitung'=>'Kepulauan Bangka Belitung','kepulauan-riau'=>'Kepulauan Riau','dki-jakarta'=>'DKI Jakarta','jawa-barat'=>'Jawa Barat','jawa-tengah'=>'Jawa Tengah','di-yogyakarta'=>'DI Yogyakarta','jawa-timur'=>'Jawa Timur','banten'=>'Banten','bali'=>'Bali','nusa-tenggara-barat'=>'Nusa Tenggara Barat','nusa-tenggara-timur'=>'Nusa Tenggara Timur','kalimantan-barat'=>'Kalimantan Barat','kalimantan-tengah'=>'Kalimantan Tengah','kalimantan-selatan'=>'Kalimantan Selatan','kalimantan-timur'=>'Kalimantan Timur','kalimantan-utara'=>'Kalimantan Utara','sulawesi-utara'=>'Sulawesi Utara','sulawesi-tengah'=>'Sulawesi Tengah','sulawesi-selatan'=>'Sulawesi Selatan','sulawesi-tenggara'=>'Sulawesi Tenggara','gorontalo'=>'Gorontalo','sulawesi-barat'=>'Sulawesi Barat','maluku'=>'Maluku','maluku-utara'=>'Maluku Utara','papua-barat'=>'Papua Barat','papua-barat-daya'=>'Papua Barat Daya','papua'=>'Papua','papua-selatan'=>'Papua Selatan','papua-tengah'=>'Papua Tengah','papua-pegunungan'=>'Papua Pegunungan','luar-negeri'=>'Luar negeri'),
        'occupation' => array(
            'pelajar'=>'Pelajar|pelajar','mahasiswa'=>'Mahasiswa|pelajar','guru'=>'Guru/tenaga pendidikan|guru','asn'=>'ASN/pegawai pemerintah|asn','tni'=>'TNI|tni','polri'=>'Polri|polri','tenaga-kesehatan'=>'Tenaga kesehatan|tenaga-kesehatan','petani'=>'Petani/pekebun|petani','nelayan'=>'Nelayan|nelayan','peternak'=>'Peternak|petani','pedagang'=>'Pedagang/UMKM|pedagang','pekerja-swasta'=>'Pegawai swasta|asn','buruh'=>'Buruh/pekerja lapangan|pekerja-konstruksi','konstruksi'=>'Pekerja konstruksi|pekerja-konstruksi','pengemudi'=>'Pengemudi/ojek|pengemudi','koki'=>'Koki/pekerja dapur|koki','pekerja-kreatif'=>'Pekerja kreatif|relawan','pekerja-rumah-tangga'=>'Pekerja rumah tangga|warga','ibu-rumah-tangga'=>'Ibu/bapak rumah tangga|warga','pencari-kerja'=>'Sedang mencari kerja|warga','pensiunan'=>'Pensiunan|warga','lainnya'=>'Pekerjaan lainnya|warga','tidak-menyebutkan'=>'Memilih tidak menyebutkan|warga'
        )
    );
    $masterInsert = $db->prepare('INSERT INTO citizen_master_data (master_type,master_value,label,avatar_style,sort_order,is_active) VALUES (?,?,?,?,?,1) ON DUPLICATE KEY UPDATE label=VALUES(label),avatar_style=VALUES(avatar_style),sort_order=VALUES(sort_order),is_active=1');
    foreach ($masters as $type => $items) {
        $order = 0;
        foreach ($items as $value => $description) {
            $avatarStyle = NULL;
            if ($type === 'occupation' && strpos($description, '|') !== FALSE) list($description, $avatarStyle) = explode('|', $description, 2);
            $masterInsert->bind_param('ssssi', $type, $value, $description, $avatarStyle, $order);
            $masterInsert->execute(); $order++;
        }
    }

    $adminConfig = array();
    $adminConfigFile = $root . '/application/config/admin_credentials.php';
    if (is_file($adminConfigFile)) { $config = array(); include $adminConfigFile; $adminConfig = $config; }
    $adminUsername = isset($adminConfig['username']) ? strtolower((string) $adminConfig['username']) : (getenv('SEMESTA_ADMIN_USERNAME') ?: '');
    if ($adminUsername !== '') { $promote = $db->prepare("UPDATE citizens SET account_type='admin' WHERE username=?"); $promote->bind_param('s', $adminUsername); $promote->execute(); }
    if (isset($columns['username'])) {
        $db->query("UPDATE citizens SET email = CONCAT('legacy-', id, '@legacy.invalid') WHERE email IS NULL OR email = ''");
        $db->query('ALTER TABLE citizens MODIFY username VARCHAR(32) NULL');
    }
    $db->query("UPDATE citizens SET username = CONCAT('warga', id) WHERE username IS NULL OR username = ''");
    $db->query('ALTER TABLE citizens MODIFY username VARCHAR(32) NOT NULL');
    $db->query("UPDATE citizens SET email = CONCAT('legacy-', id, '@legacy.invalid') WHERE email IS NULL OR email = ''");
    $db->query("UPDATE citizens SET email_verified = 1 WHERE email LIKE '%@legacy.invalid'");
    $db->query('ALTER TABLE citizens MODIFY email VARCHAR(190) NOT NULL');
    $indexes = array();
    foreach ($db->query('SHOW INDEX FROM citizens')->fetch_all(MYSQLI_ASSOC) as $index) $indexes[$index['Key_name']] = TRUE;
    if (!isset($indexes['uq_citizens_email'])) $db->query('ALTER TABLE citizens ADD UNIQUE KEY uq_citizens_email (email)');
    if (!isset($indexes['uq_citizens_username'])) $db->query('ALTER TABLE citizens ADD UNIQUE KEY uq_citizens_username (username)');
    $db->query("CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(80) NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->query("CREATE TABLE IF NOT EXISTS world_scenes (
        region VARCHAR(24) NOT NULL,
        scene_json LONGTEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (region)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->query("CREATE TABLE IF NOT EXISTS citizen_presence (
        citizen_id BIGINT UNSIGNED NOT NULL,
        destination VARCHAR(24) NOT NULL,
        region VARCHAR(24) NOT NULL,
        x DOUBLE NOT NULL DEFAULT 0,
        z DOUBLE NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (citizen_id),
        KEY idx_citizen_presence_scope (destination, region, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->query("CREATE TABLE IF NOT EXISTS citizen_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        sender_id BIGINT UNSIGNED NOT NULL,
        recipient_id BIGINT UNSIGNED NOT NULL,
        destination VARCHAR(24) NOT NULL,
        region VARCHAR(24) NOT NULL,
        message VARCHAR(280) NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_citizen_messages_pair (sender_id, recipient_id, id),
        KEY idx_citizen_messages_recipient (recipient_id, sender_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->query("CREATE TABLE IF NOT EXISTS visitor_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        visited_at DATETIME NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        ip_hash CHAR(64) NOT NULL,
        visitor_hash CHAR(64) NOT NULL,
        session_hash CHAR(64) DEFAULT NULL,
        request_path VARCHAR(255) NOT NULL,
        referrer_host VARCHAR(190) DEFAULT NULL,
        referrer_path VARCHAR(255) DEFAULT NULL,
        user_agent VARCHAR(512) DEFAULT NULL,
        browser VARCHAR(32) NOT NULL DEFAULT 'Lainnya',
        device_type VARCHAR(16) NOT NULL DEFAULT 'desktop',
        is_bot TINYINT(1) NOT NULL DEFAULT 0,
        language VARCHAR(64) DEFAULT NULL,
        PRIMARY KEY (id), KEY idx_visitor_logs_time (visited_at),
        KEY idx_visitor_logs_ip (ip_address, visited_at),
        KEY idx_visitor_logs_visitor (visitor_hash, visited_at),
        KEY idx_visitor_logs_referrer (referrer_host, visited_at),
        KEY idx_visitor_logs_device (device_type, visited_at)
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
    echo "Database semesta_nyasar siap. Tabel aplikasi, citizen_master_data, dan visitor_logs tersedia; data JSON lama diimpor tanpa menimpa baris yang sudah ada.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Setup database gagal: " . $error->getMessage() . "\n");
    exit(1);
}
