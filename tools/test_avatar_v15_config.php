<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH', __DIR__);
define('FCPATH', dirname(__DIR__) . '/');
#[AllowDynamicProperties]
class CI_Controller {}
require FCPATH . 'application/controllers/Api.php';
$reflection = new ReflectionClass('Api');
$api = $reflection->newInstanceWithoutConstructor();
$api->load = new class {
    function helper($name) { require_once FCPATH . 'application/helpers/' . $name . '_helper.php'; }
};
$method = $reflection->getMethod('sanitize_avatar_config');
$method->setAccessible(TRUE);
$inputs = json_decode(stream_get_contents(STDIN), TRUE);
echo json_encode(array_map(function ($config) use ($method, $api) { return $method->invoke($api, $config); }, $inputs), JSON_UNESCAPED_SLASHES);
