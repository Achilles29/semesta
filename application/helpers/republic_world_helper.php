<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Republic_world_error extends RuntimeException
{
    public $status, $error_code, $details;
    public function __construct($message, $status = 422, $code = 'invalid_request', array $details = array())
    { parent::__construct($message); $this->status = $status; $this->error_code = $code; $this->details = $details; }
}

function republic_world_payload(array $payload, $admin = FALSE)
{
    $allowed = $admin ? array('resource','action','expectedVersion','phase','projectId','status','reason','requestId','csrfToken') : array('resource','action','projectId','requestId','csrfToken');
    foreach ($payload as $key => $value) if (!in_array($key, $allowed, TRUE)) throw new Republic_world_error('Ada kolom aksi yang tidak didukung.');
    $actions = $admin ? array('publish','activate_project','set_project_status') : array('pickup','deliver','start_install','install');
    if (!isset($payload['action']) || !in_array($payload['action'], $actions, TRUE)) throw new Republic_world_error('Aksi dunia tidak dikenal.');
    if (!isset($payload['requestId']) || !is_string($payload['requestId']) || !preg_match('/^[A-Za-z0-9_-]{16,80}$/D', $payload['requestId'])) throw new Republic_world_error('ID permintaan belum valid.');
    $clean = array('action'=>$payload['action'], 'requestId'=>$payload['requestId']);
    if (!$admin || $payload['action'] !== 'publish') {
        if (!isset($payload['projectId']) || !is_string($payload['projectId']) || !preg_match('/^[a-z0-9_-]{1,64}$/D', $payload['projectId'])) throw new Republic_world_error('ID proyek belum valid.');
        $clean['projectId'] = $payload['projectId'];
    }
    if ($admin) {
        if (!isset($payload['expectedVersion']) || !is_int($payload['expectedVersion']) || $payload['expectedVersion'] < 1) throw new Republic_world_error('Versi dunia wajib dibaca sebelum publikasi.');
        $reason = isset($payload['reason']) && is_string($payload['reason']) ? trim($payload['reason']) : '';
        if (mb_strlen($reason, 'UTF-8') < 8 || mb_strlen($reason, 'UTF-8') > 500 || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $reason)) throw new Republic_world_error('Tulis alasan publikasi sepanjang 8–500 karakter.');
        $clean['expectedVersion'] = $payload['expectedVersion']; $clean['reason'] = $reason;
        if ($payload['action'] === 'publish') {
            if (!isset($payload['phase']) || !in_array($payload['phase'], array('before-day2','after-day2'), TRUE)) throw new Republic_world_error('Fase dunia belum valid.');
            $clean['phase'] = $payload['phase'];
        } else {
            $status = $payload['action'] === 'activate_project' ? 'active' : ($payload['status'] ?? '');
            if (!in_array($status, array('active','paused'), TRUE)) throw new Republic_world_error('Status proyek harus aktif atau dijeda.');
            $clean['status'] = $status;
        }
    }
    return $clean;
}

function republic_world_iso($value) { return $value ? str_replace(' ', 'T', $value) . 'Z' : NULL; }
function republic_world_now($offset = 0) { return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify(($offset >= 0 ? '+' : '') . $offset . ' seconds')->format('Y-m-d H:i:s.u'); }
function republic_world_elapsed($value) { return $value ? microtime(TRUE) - (float) (new DateTimeImmutable($value, new DateTimeZone('UTC')))->format('U.u') : INF; }
