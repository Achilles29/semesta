<?php
// Keep the admin logout route reachable when Apache rewrite rules are unavailable.
$projectRoot = dirname(__DIR__, 2);
$_SERVER['REQUEST_URI'] = '/admin/logout' . (empty($_SERVER['QUERY_STRING']) ? '' : '?' . $_SERVER['QUERY_STRING']);
$_SERVER['SCRIPT_NAME'] = '/index.php';
chdir($projectRoot);
require $projectRoot . '/index.php';
