<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Citizen_home_model extends CI_Model
{
    private function query($sql, array $params = array())
    {
        $result = $this->db->query($sql,$params);
        if ($result === FALSE) throw new RuntimeException('Home database operation failed.');
        return $result;
    }

    private function atomic($citizenId, $sessionHash, callable $operation)
    {
        if (!is_string($sessionHash) || !preg_match('/^[a-f0-9]{64}$/D',$sessionHash)) throw new Citizen_home_error('Sesi hunian belum valid.',403,'home_session_required');
        $debug = $this->db->db_debug; $this->db->db_debug = FALSE;
        try {
            if (!$this->db->trans_begin()) throw new RuntimeException('Home transaction unavailable.');
            // Always lock the owner before their room. Independent citizens do
            // not contend on a shared world row or expose each other's state.
            $citizen = $this->query('SELECT id,is_active,gender,occupation,avatar_config FROM citizens WHERE id=? FOR UPDATE',array($citizenId))->row_array();
            if (!$citizen || !(int)$citizen['is_active']) throw new Citizen_home_error('Akun warga tidak aktif.',403,'citizen_inactive');
            require_once APPPATH.'helpers/citizen_identity_helper.php';
            if (!citizen_profile_complete($citizen)) throw new Citizen_home_error('Lengkapi profil dan avatar untuk menerima kamar warga.',403,'profile_required');
            $now = citizen_home_now();
            $this->query('INSERT IGNORE INTO citizen_homes (citizen_id,created_at,updated_at) VALUES (?,?,?)',array($citizenId,$now,$now));
            $home = $this->query('SELECT * FROM citizen_homes WHERE citizen_id=? FOR UPDATE',array($citizenId))->row_array();
            $result = $operation($home);
            if (!$this->db->trans_status() || !$this->db->trans_commit()) throw new RuntimeException('Home transaction could not commit.');
            return $result;
        } catch(Throwable $error) { $this->db->trans_rollback(); throw $error; }
        finally { $this->db->db_debug = $debug; }
    }

    private function snapshot($citizenId, $sessionHash)
    {
        $row = $this->query('SELECT * FROM citizen_homes WHERE citizen_id=?',array($citizenId))->row_array();
        return array('playerId'=>(int)$citizenId,'version'=>(int)$row['version'],
            'mission'=>array('status'=>$row['mission_status'],'acceptedAt'=>citizen_home_iso($row['mission_accepted_at']),'completedAt'=>citizen_home_iso($row['mission_completed_at']),
                'clerk'=>array('x'=>9,'z'=>6),'deliveryPoint'=>array('x'=>38,'z'=>3),'radius'=>3),
            'home'=>array('id'=>'home-'.$citizenId,'address'=>'Wisma Warga · Kamar '.str_pad((string)$citizenId,8,'0',STR_PAD_LEFT),
                'unlocked'=>$row['mission_status']==='completed','inside'=>$this->inside($row,$sessionHash),'decorationPlaced'=>(bool)$row['decoration_placed'],'slotId'=>'welcome-shelf'),
            'inventory'=>array('welcomePlant'=>(int)$row['welcome_plant']),'serverTime'=>citizen_home_iso(citizen_home_now()));
    }

    private function inside(array $home, $sessionHash)
    { return is_string($home['interior_session_hash']) && hash_equals($home['interior_session_hash'],$sessionHash); }

    public function state($citizenId, $sessionHash)
    { return $this->atomic($citizenId,$sessionHash,function () use ($citizenId,$sessionHash) { return $this->snapshot($citizenId,$sessionHash); }); }

    public function sync_public_presence($citizenId, $sessionHash, $destination, $region, $x, $z)
    {
        // Use the same owner lock as entry so a delayed heartbeat cannot commit
        // a public position after this session has entered its private room.
        $debug = $this->db->db_debug; $this->db->db_debug = FALSE;
        try {
            if (!$this->db->trans_begin()) throw new RuntimeException('Home presence transaction unavailable.');
            $owner = $this->query('SELECT id,is_active FROM citizens WHERE id=? FOR UPDATE',array($citizenId))->row_array();
            $home = $this->query('SELECT interior_session_hash FROM citizen_homes WHERE citizen_id=? FOR UPDATE',array($citizenId))->row_array();
            $allowed = $owner && (int)$owner['is_active'] && (!$home || !$this->inside($home,$sessionHash));
            if ($allowed) $this->query('INSERT INTO citizen_presence (citizen_id,destination,region,x,z,updated_at) VALUES (?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE destination=VALUES(destination),region=VALUES(region),x=VALUES(x),z=VALUES(z),updated_at=NOW()',array($citizenId,$destination,$region,$x,$z));
            if (!$this->db->trans_status() || !$this->db->trans_commit()) throw new RuntimeException('Home presence transaction could not commit.');
            return (bool)$allowed;
        } catch(Throwable $error) { $this->db->trans_rollback(); throw $error; }
        finally { $this->db->db_debug = $debug; }
    }

    private function nearby($citizenId, $clerk = FALSE)
    {
        // Existing presence is client-reported: freshness, scope and distance
        // are checked here, but this is not authoritative movement anti-cheat.
        $position = $this->query("SELECT x,z FROM citizen_presence WHERE citizen_id=? AND destination='republic' AND region='world' AND updated_at>DATE_SUB(NOW(),INTERVAL 8 SECOND) AND updated_at<=NOW()",array($citizenId))->row_array();
        if (!$position) throw new Citizen_home_error('Posisi warga kedaluwarsa. Kembali ke jelajah.',409,'presence_expired');
        $distance = hypot((float)$position['x']-($clerk?9:38),(float)$position['z']-($clerk?6:3));
        if (!is_finite($distance) || $distance > 3) throw new Citizen_home_error($clerk?'Dekati petugas di alun-alun.':'Dekati pintu Wisma Warga.',409,'too_far');
    }

    public function act($citizenId, $sessionHash, array $payload)
    {
        $payload = citizen_home_payload($payload);
        return $this->atomic($citizenId,$sessionHash,function ($home) use ($citizenId,$sessionHash,$payload) {
            $hash = hash('sha256',json_encode($payload));
            $previous = $this->query('SELECT payload_hash FROM citizen_home_requests WHERE citizen_id=? AND request_id=?',array($citizenId,$payload['requestId']))->row_array();
            if ($previous) {
                if (!hash_equals($previous['payload_hash'],$hash)) throw new Citizen_home_error('ID permintaan sudah dipakai untuk aksi berbeda.',409,'request_conflict');
                return array_merge($this->snapshot($citizenId,$sessionHash),array('ok'=>TRUE,'replayed'=>TRUE));
            }
            $action = $payload['action']; $now = citizen_home_now(); $plantDelta = 0;
            if ($action === 'accept_delivery') {
                if ($home['mission_status'] !== 'not_started') throw new Citizen_home_error('Tugas sambutan sudah diterima atau selesai.',409,'mission_started');
                $this->nearby($citizenId,TRUE);
                $this->query("UPDATE citizen_homes SET mission_status='carrying',mission_accepted_at=?,version=version+1,updated_at=? WHERE citizen_id=?",array($now,$now,$citizenId));
            } elseif ($action === 'deliver') {
                if ($home['mission_status'] !== 'carrying') throw new Citizen_home_error('Tidak ada paket sambutan yang perlu diserahkan.',409,$home['mission_status']==='completed'?'mission_completed':'parcel_missing');
                $this->nearby($citizenId);
                if (citizen_home_elapsed($home['mission_accepted_at']) < 2) throw new Citizen_home_error('Perjalanan paket belum selesai.',409,'travel_too_fast');
                $plantDelta = 1;
                $this->query("UPDATE citizen_homes SET mission_status='completed',mission_completed_at=?,welcome_plant=1,version=version+1,updated_at=? WHERE citizen_id=?",array($now,$now,$citizenId));
            } elseif ($action === 'enter_home') {
                if ($home['mission_status'] !== 'completed') throw new Citizen_home_error('Serahkan paket sambutan untuk mengambil kunci kamar.',409,'home_locked');
                if (!$this->inside($home,$sessionHash)) {
                    $this->nearby($citizenId);
                    $this->query('UPDATE citizen_homes SET interior_session_hash=?,version=version+1,updated_at=? WHERE citizen_id=?',array($sessionHash,$now,$citizenId));
                    $this->query('DELETE FROM citizen_presence WHERE citizen_id=?',array($citizenId));
                }
            } elseif ($action === 'leave_home') {
                // Leaving is always safe without a public presence heartbeat.
                // Another device cannot clear the current room's session.
                if ($this->inside($home,$sessionHash)) $this->query('UPDATE citizen_homes SET interior_session_hash=NULL,version=version+1,updated_at=? WHERE citizen_id=?',array($now,$citizenId));
            } else {
                if ($home['mission_status'] !== 'completed' || !$this->inside($home,$sessionHash)) throw new Citizen_home_error('Masuk ke kamar sendiri sebelum mengatur dekorasi.',409,'home_session_required');
                if ($action === 'place_decoration') {
                    if (!(int)$home['welcome_plant'] || (int)$home['decoration_placed']) throw new Citizen_home_error('Tanaman sambutan tidak tersedia di tas.',409,'item_missing');
                    $plantDelta = -1;
                    $this->query('UPDATE citizen_homes SET welcome_plant=0,decoration_placed=1,version=version+1,updated_at=? WHERE citizen_id=?',array($now,$citizenId));
                } else {
                    if (!(int)$home['decoration_placed']) throw new Citizen_home_error('Rak sambutan masih kosong.',409,'slot_empty');
                    $plantDelta = 1;
                    $this->query('UPDATE citizen_homes SET welcome_plant=1,decoration_placed=0,version=version+1,updated_at=? WHERE citizen_id=?',array($now,$citizenId));
                }
            }
            $result = $this->snapshot($citizenId,$sessionHash);
            $this->query('INSERT INTO citizen_home_ledger (citizen_id,request_id,action,plant_delta,placed_before,placed_after,mission_status,home_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)',array($citizenId,$payload['requestId'],$action,$plantDelta,(int)$home['decoration_placed'],(int)$result['home']['decorationPlaced'],$result['mission']['status'],$result['version'],$now));
            $this->query('INSERT INTO citizen_home_requests (citizen_id,request_id,payload_hash,action,created_at) VALUES (?,?,?,?,?)',array($citizenId,$payload['requestId'],$hash,$action,$now));
            return array_merge($result,array('ok'=>TRUE,'replayed'=>FALSE));
        });
    }
}
