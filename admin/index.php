<?php
// Fallback entry point for hosts that do not pass extensionless URLs through mod_rewrite.
$projectRoot = dirname(__DIR__);
$_SERVER['REQUEST_URI'] = '/admin' . (empty($_SERVER['QUERY_STRING']) ? '' : '?' . $_SERVER['QUERY_STRING']);
$_SERVER['SCRIPT_NAME'] = '/index.php';
chdir($projectRoot);
require $projectRoot . '/index.php';
