<?php
// Keep legacy .php bookmarks working, but use one extensionless admin URL.
if (strtoupper(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET') === 'GET') {
    header('Location: /admin/', TRUE, 301);
    exit;
}

$projectRoot = dirname(__DIR__);
$_SERVER['REQUEST_URI'] = '/admin' . (empty($_SERVER['QUERY_STRING']) ? '' : '?' . $_SERVER['QUERY_STRING']);
$_SERVER['SCRIPT_NAME'] = '/index.php';
chdir($projectRoot);
require $projectRoot . '/index.php';
