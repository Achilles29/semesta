<?php
// Additive and repeatable. Never derives canon from browser storage or changes profiles.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH', __DIR__); define('APPPATH', dirname(__DIR__) . '/application/'); define('ENVIRONMENT', 'production');
require APPPATH . 'config/database.php';
$cfg = $db['default'];
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $connection = new mysqli($cfg['hostname'], $cfg['username'], $cfg['password'], $cfg['database'], $cfg['port'] ?? 3306);
    $connection->set_charset('utf8mb4');
    $sql = file_get_contents(dirname(__DIR__) . '/database/migrations/20261123_republic_world.sql');
    $connection->multi_query($sql);
    do { if ($result = $connection->store_result()) $result->free(); } while ($connection->more_results() && $connection->next_result());
    $connection->close();
    echo "Shared world schema ready. Initial canon: after-day2; example home remains draft until admin activates it. Existing publication/progress and accounts were preserved.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "World migration failed. Check private database settings, table definitions and CREATE/INSERT privileges. No existing world progress is intentionally reset.\n"); exit(1);
}
