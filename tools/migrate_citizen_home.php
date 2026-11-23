<?php
// Additive and repeatable: no account, publication, project, or existing room reset.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH',__DIR__); define('APPPATH',dirname(__DIR__).'/application/'); define('ENVIRONMENT','production');
require APPPATH.'config/database.php';
$cfg=$db['default']; mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $connection=new mysqli($cfg['hostname'],$cfg['username'],$cfg['password'],$cfg['database'],$cfg['port']??3306);
    $connection->set_charset('utf8mb4');
    $connection->multi_query(file_get_contents(dirname(__DIR__).'/database/migrations/20261123_citizen_home.sql'));
    do { if($result=$connection->store_result())$result->free(); } while($connection->more_results() && $connection->next_result());
    $connection->close();
    echo "Private home schema ready. Rooms are allocated only for completed accounts on their first authenticated request; existing state is preserved.\n";
} catch(Throwable $error) {
    fwrite(STDERR,"Private home migration failed. Check private database settings and CREATE privileges. No existing room or world progress is intentionally reset.\n"); exit(1);
}
