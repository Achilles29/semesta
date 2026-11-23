<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Citizen_home_error extends RuntimeException
{
    public $status, $error_code;
    public function __construct($message, $status = 422, $code = 'invalid_request')
    { parent::__construct($message); $this->status = $status; $this->error_code = $code; }
}

function citizen_home_payload(array $payload)
{
    $actions = array('accept_delivery','deliver','enter_home','leave_home','place_decoration','remove_decoration');
    if (!isset($payload['action']) || !in_array($payload['action'],$actions,TRUE)) throw new Citizen_home_error('Aksi hunian tidak dikenal.');
    $placement = in_array($payload['action'],array('place_decoration','remove_decoration'),TRUE);
    $allowed = array('resource','action','requestId','csrfToken'); if ($placement) $allowed[] = 'slotId';
    foreach ($payload as $key => $value) if (!in_array($key,$allowed,TRUE)) throw new Citizen_home_error('Ada kolom aksi hunian yang tidak didukung.');
    if (isset($payload['resource']) && $payload['resource'] !== 'citizen_home') throw new Citizen_home_error('Sumber aksi hunian belum valid.');
    if (!isset($payload['requestId']) || !is_string($payload['requestId']) || !preg_match('/^[A-Za-z0-9_-]{16,80}$/D',$payload['requestId'])) throw new Citizen_home_error('ID permintaan belum valid.');
    $clean = array('action'=>$payload['action'],'requestId'=>$payload['requestId']);
    if ($placement) {
        if (($payload['slotId'] ?? NULL) !== 'welcome-shelf') throw new Citizen_home_error('Pilih rak sambutan di kamar sendiri.',422,'slot_invalid');
        $clean['slotId'] = 'welcome-shelf';
    }
    return $clean;
}

function citizen_home_iso($value) { return $value ? str_replace(' ','T',$value).'Z' : NULL; }
function citizen_home_now() { return (new DateTimeImmutable('now',new DateTimeZone('UTC')))->format('Y-m-d H:i:s.u'); }
function citizen_home_elapsed($value) { return $value ? microtime(TRUE)-(float)(new DateTimeImmutable($value,new DateTimeZone('UTC')))->format('U.u') : INF; }
