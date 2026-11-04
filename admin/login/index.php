<?php
// Physical-directory fallback for servers that skip the root rewrite rules.
$projectRoot = dirname(dirname(__DIR__));
$_SERVER['REQUEST_URI'] = '/admin/login' . (empty($_SERVER['QUERY_STRING']) ? '' : '?' . $_SERVER['QUERY_STRING']);
$_SERVER['SCRIPT_NAME'] = '/index.php';
chdir($projectRoot);
require $projectRoot . '/index.php';
