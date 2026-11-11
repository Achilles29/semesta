<?php
// CLI-only view fixture. No controller/auth/session/database is run or exposed.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('FCPATH', dirname(__DIR__) . '/');
$fixture_base = $argv[1] ?? 'http://localhost/project/';
function base_url($path = '') { global $fixture_base; return $fixture_base . $path; }
function site_url($path = '') { return base_url($path); }
function html_escape($text) { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
require FCPATH . 'application/views/admin.php';
