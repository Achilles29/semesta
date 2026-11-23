<?php
defined('BASEPATH') OR exit('No direct script access allowed');

// One world lock is intentional for the first project. All rewards, inventory,
// progress, audit and idempotency records commit together, in a fixed lock order.
class Republic_world_model extends CI_Model
{
    private function query($sql, array $params = array())
    {
        $result = $this->db->query($sql, $params);
        if ($result === FALSE) throw new RuntimeException('World database operation failed.');
        return $result;
    }

    private function atomic(callable $operation, $write = FALSE)
    {
        $debug = $this->db->db_debug; $this->db->db_debug = FALSE;
        try {
            if (!$this->db->trans_begin()) throw new RuntimeException('World transaction unavailable.');
            $world = $this->query("SELECT * FROM world_state WHERE id='republic'" . ($write ? ' FOR UPDATE' : ''))->row_array();
            if (!$world) throw new Republic_world_error('Dunia belum dimigrasikan.', 503, 'world_unavailable');
            $result = $operation($world);
            if (!$this->db->trans_status() || !$this->db->trans_commit()) throw new RuntimeException('World transaction could not commit.');
            return $result;
        } catch (Throwable $error) {
            $this->db->trans_rollback(); throw $error;
        } finally { $this->db->db_debug = $debug; }
    }

    private function snapshot($citizenId = NULL, $withHistory = FALSE)
    {
        $row = $this->query("SELECT * FROM world_state WHERE id='republic'")->row_array();
        $result = array('world'=>array('id'=>$row['id'], 'version'=>(int)$row['version'], 'phase'=>$row['phase'], 'publishedAt'=>republic_world_iso($row['published_at'])), 'projects'=>array());
        foreach ($this->query('SELECT * FROM world_projects ORDER BY id')->result_array() as $project) {
            $result['projects'][] = array('id'=>$project['id'], 'name'=>$project['name'], 'plotId'=>$project['plot_id'], 'city'=>$project['city'],
                'position'=>array('x'=>(float)$project['position_x'], 'z'=>(float)$project['position_z']),
                'workPoint'=>array('x'=>(float)$project['work_x'], 'z'=>(float)$project['work_z']),
                'depot'=>array('x'=>(float)$project['depot_x'], 'z'=>(float)$project['depot_z']),
                'radius'=>(float)$project['interaction_radius'], 'required'=>(int)$project['required_units'],
                'status'=>$project['status'], 'delivered'=>(int)$project['delivered_units'], 'installed'=>(int)$project['installed_units'], 'version'=>(int)$project['version']);
        }
        if ($citizenId !== NULL) {
            $player = $this->query('SELECT * FROM citizen_work_state WHERE citizen_id=?', array($citizenId))->row_array();
            $result['player'] = array('id'=>(int)$citizenId, 'inventory'=>array('constructionKit'=>(int)($player['construction_kit'] ?? 0)),
                'carryingProjectId'=>$player['carrying_project_id'] ?? NULL, 'constructionXp'=>(int)($player['construction_xp'] ?? 0),
                'installation'=>empty($player['install_project_id']) ? NULL : array('projectId'=>$player['install_project_id'], 'readyAt'=>republic_world_iso($player['install_ready_at'])));
            $result['serverTime'] = republic_world_iso(republic_world_now());
        }
        if ($withHistory) {
            $result['history'] = array();
            foreach ($this->query('SELECT id,world_version,action,actor_name,reason,phase,project_id,created_at FROM world_publications ORDER BY id DESC LIMIT 50')->result_array() as $event) {
                $result['history'][] = array('id'=>(int)$event['id'], 'worldVersion'=>(int)$event['world_version'], 'action'=>$event['action'], 'actorName'=>$event['actor_name'], 'reason'=>$event['reason'], 'phase'=>$event['phase'], 'projectId'=>$event['project_id'], 'createdAt'=>republic_world_iso($event['created_at']));
            }
        }
        return $result;
    }

    public function state() { return $this->atomic(function () { return $this->snapshot(); }); }
    public function administration() { return $this->atomic(function () { return $this->snapshot(NULL, TRUE); }); }
    public function work($citizenId)
    {
        return $this->atomic(function () use ($citizenId) { $this->active_citizen($citizenId); return $this->snapshot($citizenId); });
    }

    private function active_citizen($id, $requireComplete = FALSE)
    {
        $row = $this->query('SELECT id,is_active,gender,occupation,avatar_config FROM citizens WHERE id=?', array($id))->row_array();
        if (!$row || !(int)$row['is_active']) throw new Republic_world_error('Akun warga tidak aktif.', 403, 'citizen_inactive');
        if ($requireComplete) {
            require_once APPPATH . 'helpers/citizen_identity_helper.php';
            if (!citizen_profile_complete($row)) throw new Republic_world_error('Lengkapi profesi, gender, dan avatar sebelum bekerja.',403,'profile_incomplete');
        }
    }

    private function replay($actor, array $payload)
    {
        $previous = $this->query('SELECT payload_hash,result_json FROM world_action_requests WHERE actor_key=? AND request_id=?', array($actor,$payload['requestId']))->row_array();
        if (!$previous) return NULL;
        if (!hash_equals($previous['payload_hash'], hash('sha256', json_encode($payload)))) throw new Republic_world_error('ID permintaan sudah dipakai untuk aksi berbeda.', 409, 'request_conflict');
        $result = json_decode($previous['result_json'], TRUE);
        if (!is_array($result)) throw new RuntimeException('Stored world action is invalid.');
        $result['replayed'] = TRUE; return $result;
    }

    private function remember($actor, array $payload, array $result)
    {
        $result['ok'] = TRUE; $result['replayed'] = FALSE;
        $this->query('INSERT INTO world_action_requests (actor_key,request_id,payload_hash,result_json,created_at) VALUES (?,?,?,?,?)', array($actor,$payload['requestId'],hash('sha256',json_encode($payload)),json_encode($result),republic_world_now()));
        return $result;
    }

    private function fresh_replay(array $previous, $citizenId = NULL, $history = FALSE)
    {
        // Replaying the mutation never replays an obsolete inventory or world view.
        $result = $this->snapshot($citizenId,$history); $result['ok'] = TRUE; $result['replayed'] = TRUE;
        if (isset($previous['message'])) $result['message'] = $previous['message'];
        return $result;
    }

    private function project($id)
    {
        $project = $this->query('SELECT * FROM world_projects WHERE id=? FOR UPDATE', array($id))->row_array();
        if (!$project) throw new Republic_world_error('Proyek tidak ditemukan.', 404, 'project_missing');
        return $project;
    }

    public function publish(array $payload)
    {
        $payload = republic_world_payload($payload, TRUE);
        return $this->atomic(function ($world) use ($payload) {
            if ($replay = $this->replay('admin', $payload)) return $this->fresh_replay($replay,NULL,TRUE);
            if ((int)$world['version'] !== $payload['expectedVersion']) throw new Republic_world_error('Dunia telah berubah. Muat ulang dan tinjau sebelum menerbitkan.', 409, 'version_conflict', array('worldVersion'=>(int)$world['version']));
            $before = $this->snapshot(); $now = republic_world_now();
            if ($payload['action'] === 'publish') {
                if ($payload['phase'] === $world['phase']) throw new Republic_world_error('Fase dunia sudah sama.',409,'no_change');
                $this->query("UPDATE world_state SET phase=?,version=version+1,published_at=? WHERE id='republic'", array($payload['phase'],$now));
            } else {
                $project = $this->project($payload['projectId']);
                if ($project['status'] === 'completed') throw new Republic_world_error('Proyek selesai tidak dapat diulang.', 409, 'project_completed');
                if ($project['status'] === $payload['status']) throw new Republic_world_error('Status proyek sudah sama.', 409, 'no_change');
                if ($project['status'] === 'draft' && $payload['status'] === 'paused') throw new Republic_world_error('Aktifkan rancangan terlebih dahulu.', 409, 'project_draft');
                $this->query('UPDATE world_projects SET status=?,version=version+1,updated_at=? WHERE id=?', array($payload['status'],$now,$project['id']));
                $this->query("UPDATE world_state SET version=version+1,published_at=? WHERE id='republic'", array($now));
            }
            $after = $this->snapshot();
            $this->query('INSERT INTO world_publications (world_version,action,actor_name,reason,phase,project_id,request_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', array($after['world']['version'],$payload['action'],'Admin',$payload['reason'],$after['world']['phase'],$payload['projectId'] ?? NULL,$payload['requestId'],json_encode($before),json_encode($after),$now));
            return $this->remember('admin',$payload,$this->snapshot(NULL,TRUE));
        }, TRUE);
    }

    private function nearby($citizenId, array $project, $depot)
    {
        // Presence is client-reported in the existing transport. This constrains
        // stale/out-of-scope work; it is not a server-authoritative movement system.
        $presence = $this->query("SELECT x,z FROM citizen_presence WHERE citizen_id=? AND destination='republic' AND region='world' AND updated_at>DATE_SUB(NOW(),INTERVAL 8 SECOND) AND updated_at<=NOW()", array($citizenId))->row_array();
        if (!$presence) throw new Republic_world_error('Posisi warga kedaluwarsa. Masuk kembali ke jelajah.', 409, 'presence_expired');
        $x = $depot ? $project['depot_x'] : $project['work_x']; $z = $depot ? $project['depot_z'] : $project['work_z'];
        $distance = hypot((float)$presence['x']-(float)$x,(float)$presence['z']-(float)$z);
        if (!is_finite($distance) || $distance > (float)$project['interaction_radius']) throw new Republic_world_error($depot ? 'Dekati depot material.' : 'Dekati lokasi kerja proyek.', 409, 'too_far');
    }

    public function act($citizenId, array $payload)
    {
        $payload = republic_world_payload($payload);
        return $this->atomic(function () use ($citizenId,$payload) {
            $this->active_citizen($citizenId,TRUE); $actor = 'citizen:' . $citizenId;
            if ($replay = $this->replay($actor,$payload)) return $this->fresh_replay($replay,$citizenId);
            $project = $this->project($payload['projectId']); $action = $payload['action']; $now = republic_world_now();
            $this->query('INSERT IGNORE INTO citizen_work_state (citizen_id,updated_at) VALUES (?,?)', array($citizenId,$now));
            $player = $this->query('SELECT * FROM citizen_work_state WHERE citizen_id=? FOR UPDATE', array($citizenId))->row_array();
            $returnSurplus = $action === 'deliver' && (int)$player['construction_kit'] === 1 && $player['carrying_project_id'] === $project['id'] && ($project['status'] === 'paused' || (int)$project['delivered_units'] >= (int)$project['required_units']);
            if ($project['status'] !== 'active' && !$returnSurplus) throw new Republic_world_error('Proyek belum aktif, dijeda, atau sudah selesai.',409,'project_inactive');
            $this->nearby($citizenId,$project,$action === 'pickup');
            $xp = 0; $kit = 0; $message = NULL;
            if ($action === 'pickup') {
                if ((int)$player['construction_kit']) throw new Republic_world_error('Kirim material yang sedang dibawa terlebih dahulu.',409,'inventory_full');
                if ((int)$project['delivered_units'] >= (int)$project['required_units']) throw new Republic_world_error('Kebutuhan material proyek sudah terpenuhi.',409,'stock_full');
                $kit = 1;
                $this->query('UPDATE citizen_work_state SET construction_kit=1,carrying_project_id=?,picked_up_at=?,updated_at=? WHERE citizen_id=?', array($project['id'],$now,$now,$citizenId));
            } elseif ($action === 'deliver') {
                if (!(int)$player['construction_kit'] || $player['carrying_project_id'] !== $project['id']) throw new Republic_world_error('Ambil material proyek di depot terlebih dahulu.',409,'kit_missing');
                if (republic_world_elapsed($player['picked_up_at']) < 2) throw new Republic_world_error('Perjalanan material belum selesai.',409,'travel_too_fast');
                $kit = -1; $xp = $returnSurplus ? 0 : 2;
                $this->query('UPDATE citizen_work_state SET construction_kit=0,carrying_project_id=NULL,picked_up_at=NULL,construction_xp=construction_xp+?,updated_at=? WHERE citizen_id=?', array($xp,$now,$citizenId));
                if (!$returnSurplus) {
                    $this->query('UPDATE world_projects SET delivered_units=delivered_units+1,version=version+1,updated_at=? WHERE id=?',array($now,$project['id']));
                    $project['version']++;
                } else $message = 'Material dikembalikan karena proyek dijeda atau kebutuhan sudah terpenuhi. Tidak ada XP tambahan.';
            } elseif ($action === 'start_install') {
                if ((int)$project['installed_units'] >= (int)$project['delivered_units']) throw new Republic_world_error('Belum ada material siap dipasang.',409,'stock_empty');
                if ($player['install_project_id'] !== $project['id'] || !$player['install_ready_at']) {
                    $this->query('UPDATE citizen_work_state SET install_project_id=?,install_ready_at=?,updated_at=? WHERE citizen_id=?',array($project['id'],republic_world_now(2),$now,$citizenId));
                }
            } else {
                if ($player['install_project_id'] !== $project['id'] || !$player['install_ready_at']) throw new Republic_world_error('Mulai pemasangan terlebih dahulu.',409,'installation_missing');
                if (republic_world_elapsed($player['install_ready_at']) < 0) throw new Republic_world_error('Pemasangan masih berlangsung.',409,'installation_pending',array('readyAt'=>republic_world_iso($player['install_ready_at'])));
                if ((int)$project['installed_units'] >= (int)$project['delivered_units']) throw new Republic_world_error('Material telah dipasang warga lain. Muat ulang kemajuan.',409,'stock_empty');
                $xp = 5; $complete = (int)$project['installed_units'] + 1 >= (int)$project['required_units'];
                $this->query('UPDATE world_projects SET installed_units=installed_units+1,version=version+1,status=?,completed_at=?,updated_at=? WHERE id=?',array($complete ? 'completed' : 'active',$complete ? $now : NULL,$now,$project['id']));
                $project['version']++;
                $this->query('UPDATE citizen_work_state SET construction_xp=construction_xp+?,install_project_id=NULL,install_ready_at=NULL,updated_at=? WHERE citizen_id=?',array($xp,$now,$citizenId));
                if ($complete) $this->query('UPDATE citizen_work_state SET install_project_id=NULL,install_ready_at=NULL,updated_at=? WHERE install_project_id=?',array($now,$project['id']));
            }
            $this->query('INSERT INTO citizen_work_ledger (citizen_id,project_id,request_id,action,kit_delta,xp_delta,project_version,created_at) VALUES (?,?,?,?,?,?,?,?)',array($citizenId,$project['id'],$payload['requestId'],$action,$kit,$xp,(int)$project['version'],$now));
            $result = $this->snapshot($citizenId); if ($message) $result['message'] = $message;
            return $this->remember($actor,$payload,$result);
        }, TRUE);
    }
}
