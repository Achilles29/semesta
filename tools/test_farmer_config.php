<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
// Pure validation fixture. Does not connect to or mutate the database.
define('BASEPATH', __DIR__);
define('APPPATH', dirname(__DIR__) . '/application/');
require APPPATH . 'helpers/farmer_avatar_helper.php';
$raw = json_decode(stream_get_contents(STDIN), TRUE);
$clean = validate_farmer_appearance($raw);
echo json_encode($clean, JSON_UNESCAPED_SLASHES);
