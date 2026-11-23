<?php
// Narrow, repeatable migration. No seeds, account updates, or secret output.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH', __DIR__);define('APPPATH',dirname(__DIR__).'/application/');define('ENVIRONMENT','production');
require APPPATH.'config/database.php';
$cfg=$db['default'];mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $connection=new mysqli($cfg['hostname'],$cfg['username'],$cfg['password'],$cfg['database'],$cfg['port']??3306);
    $column=$connection->query("SHOW COLUMNS FROM citizens LIKE 'google_sub'")->fetch_assoc();
    if(!$column)$connection->query('ALTER TABLE citizens ADD COLUMN google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL AFTER email_verified');
    $index=$connection->query("SHOW INDEX FROM citizens WHERE Key_name='uq_citizens_google_sub'")->fetch_assoc();
    if(!$index)$connection->query('ALTER TABLE citizens ADD UNIQUE KEY uq_citizens_google_sub (google_sub)');
    echo "Google subject column and unique index ready. Existing citizen profiles were not changed.\n";
    $connection->close();
} catch (Throwable $error) {
    // Database exceptions may carry connection details; never emit them here.
    fwrite(STDERR,"Google subject migration failed. Check the private database configuration and ALTER privileges; ensure existing subjects are unique.\n");exit(1);
}
