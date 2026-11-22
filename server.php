<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Match Apache's gate when the optional PHP development router is used.
if (preg_match('~^(?:assets/game/(?:assets/|\.vite/)|(?:public|assets/game)/audio/produksi/|game-src/(?:production-|admin-)|docs/(?:record|script)/)~i', ltrim(rawurldecode($path), '/'))) {
    $_SERVER['PATH_INFO'] = '/admin/production_asset/' . ltrim($path, '/');
    $_SERVER['REQUEST_URI'] = $_SERVER['PATH_INFO'];
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    require __DIR__ . '/index.php';
    return;
}
$file = __DIR__ . str_replace('/', DIRECTORY_SEPARATOR, $path);
if ($path !== '/' && is_file($file)) {
    return FALSE;
}
$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
