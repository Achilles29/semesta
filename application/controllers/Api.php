<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Api extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->library('session');
        $this->load->database();
        $this->load->model('Semesta_model', 'semesta');
        $this->output->set_content_type('application/json', 'utf-8');
    }

    public function index()
    {
        $method = $this->input->method(TRUE);
        $resource = $this->input->get('resource');
        $payload = $method === 'POST' ? json_decode($this->input->raw_input_stream, TRUE) : NULL;
        if ($method === 'POST' && is_array($payload) && ($payload['resource'] ?? NULL) === 'citizen_home') return $this->citizen_home($method,$payload);
        if ($resource === 'citizen_home') return $this->citizen_home($method,$payload);
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && in_array($payload['resource'], array('world_admin','world_work'), TRUE)) return $this->republic_world($payload['resource'], $method, $payload);
        if (in_array($resource, array('world_state','world_admin','world_work'), TRUE)) return $this->republic_world($resource, $method, $payload);
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'ideas') {
            return $this->save_idea($payload);
        }
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'citizen') return $this->citizen_action($payload);
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'citizen_chat') return $this->citizen_chat($payload);
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'citizen_admin') return $this->citizen_admin('POST', $payload);
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'world_scene') return $this->save_world_scene($payload);
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'settings') return $this->mail_settings('POST', $payload);
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'avatar_library') return $this->save_avatar_library($payload);
        if ($resource === 'google_sso') return $this->google_sso($method);
        if ($resource === 'auth_options') return $this->auth_options($method);
        if ($resource === 'citizen_admin') return $this->citizen_admin($method);
        if ($resource === 'citizen_admin_detail') return $this->citizen_admin_detail($method);
        if ($resource === 'citizen_options') return $this->citizen_options($method);
        if ($resource === 'visitor_logs') return $this->visitor_logs($method);
        if ($resource === 'citizen') return $this->citizen_profile($method);
        if ($resource === 'settings') return $this->mail_settings($method);
        if ($resource === 'avatar_library') return $this->avatar_library($method);
        if ($resource === 'email_verify') return $this->verify_email($method);
        if ($resource === 'world_scene') return $this->world_scene($method);
        if ($resource === 'ideas') return $this->ideas($method);
        if ($method === 'POST') return $this->save_case($payload);
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');

        if (!$this->database_ready()) return $this->database_error();
        $case = $this->semesta->get_case();
        if ($case === NULL) return $this->output->set_status_header(404)->set_output('{"error":"Episode belum tersedia di database."}');
        return $this->output->set_output($case);
    }

    private function citizen_home($method, $payload = NULL)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if (!in_array($method,array('GET','POST'),TRUE)) return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        $citizenId = (int)$this->session->userdata('citizen_id');
        if (!$citizenId) return $this->output->set_status_header(401)->set_output('{"error":"Masuk sebagai warga untuk membuka hunian.","code":"login_required"}');
        if (!$this->database_ready()) return $this->database_error();
        foreach (array('citizen_homes','citizen_home_requests','citizen_home_ledger','citizens','citizen_presence') as $table) {
            if (!$this->db->table_exists($table)) return $this->output->set_status_header(503)->set_output('{"error":"Hunian belum siap. Jalankan migrasi hunian di server.","code":"home_unavailable"}');
        }
        $this->load->helper('citizen_home'); $this->load->model('Citizen_home_model','citizenHome');
        try {
            $binding = $this->session->userdata('citizen_home_binding');
            $csrf = $this->session->userdata('citizen_home_csrf');
            if (!is_array($binding) || ($binding['citizenId'] ?? NULL) !== $citizenId || !is_string($binding['nonce'] ?? NULL)) {
                $binding = array('citizenId'=>$citizenId,'nonce'=>bin2hex(random_bytes(32)));
                $csrf = bin2hex(random_bytes(32));
                $this->session->set_userdata('citizen_home_binding',$binding); $this->session->set_userdata('citizen_home_csrf',$csrf);
            }
            $sessionHash = hash('sha256',$binding['nonce']);
            if ($method === 'POST') {
                if (strlen($this->input->raw_input_stream) > 12000) throw new Citizen_home_error('Permintaan terlalu besar.',413,'request_too_large');
                if (!is_array($payload)) throw new Citizen_home_error('Permintaan JSON belum valid.');
                if (!is_string($csrf) || !isset($payload['csrfToken']) || !is_string($payload['csrfToken']) || !hash_equals($csrf,$payload['csrfToken'])) throw new Citizen_home_error('Sesi hunian berubah. Muat ulang sebelum melanjutkan.',403,'csrf_invalid');
                $result = $this->citizenHome->act($citizenId,$sessionHash,$payload);
            } else {
                $result = $this->citizenHome->state($citizenId,$sessionHash);
                if (!is_string($csrf)) { $csrf=bin2hex(random_bytes(32)); $this->session->set_userdata('citizen_home_csrf',$csrf); }
            }
            $result['csrfToken'] = $csrf; $result['serverTime'] = citizen_home_iso(citizen_home_now());
            return $this->output->set_output(json_encode($result,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        } catch(Citizen_home_error $error) {
            return $this->output->set_status_header($error->status)->set_output(json_encode(array('error'=>$error->getMessage(),'code'=>$error->error_code),JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        } catch(Throwable $error) {
            log_message('error','Private home operation failed: '.get_class($error));
            return $this->output->set_status_header(503)->set_output('{"error":"Hunian sementara tidak dapat disimpan. Coba ulang dengan ID permintaan yang sama.","code":"home_unavailable"}');
        }
    }

    private function republic_world($resource, $method, $payload = NULL)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if (!in_array($method, array('GET','POST'), TRUE) || ($resource === 'world_state' && $method !== 'GET')) return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if ($resource === 'world_admin' && !$this->require_admin()) return;
        $citizenId = (int)$this->session->userdata('citizen_id');
        if ($resource === 'world_work' && !$citizenId) return $this->output->set_status_header(401)->set_output('{"error":"Masuk sebagai warga untuk bekerja.","code":"login_required"}');
        if (!$this->database_ready()) return $this->database_error();
        foreach (array('world_state','world_projects','world_publications','citizen_work_state','world_action_requests','citizen_work_ledger','citizens','citizen_presence') as $table) {
            if (!$this->db->table_exists($table)) return $this->output->set_status_header(503)->set_output('{"error":"Dunia belum siap. Jalankan migrasi dunia di server.","code":"world_unavailable"}');
        }
        $this->load->helper('republic_world');
        $this->load->model('Republic_world_model', 'republic');
        try {
            $csrf = $this->session->userdata('republic_world_csrf');
            if ($method === 'POST') {
                if (strlen($this->input->raw_input_stream) > 12000) throw new Republic_world_error('Permintaan terlalu besar.',413,'request_too_large');
                if (!is_array($payload)) throw new Republic_world_error('Permintaan JSON belum valid.');
                if (!is_string($csrf) || !isset($payload['csrfToken']) || !is_string($payload['csrfToken']) || !hash_equals($csrf,$payload['csrfToken'])) throw new Republic_world_error('Sesi formulir berubah. Muat ulang sebelum melanjutkan.',403,'csrf_invalid');
                $result = $resource === 'world_admin' ? $this->republic->publish($payload) : $this->republic->act($citizenId,$payload);
            } else {
                $result = $resource === 'world_admin' ? $this->republic->administration() : ($resource === 'world_work' ? $this->republic->work($citizenId) : $this->republic->state());
                if ($resource !== 'world_state' && !is_string($csrf)) { $csrf = bin2hex(random_bytes(32)); $this->session->set_userdata('republic_world_csrf',$csrf); }
            }
            if ($resource !== 'world_state') $result['csrfToken'] = $csrf;
            // Refresh transport time even when the mutation itself is replayed.
            if ($resource === 'world_work') $result['serverTime'] = republic_world_iso(republic_world_now());
            return $this->output->set_output(json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        } catch (Republic_world_error $error) {
            return $this->output->set_status_header($error->status)->set_output(json_encode(array_merge(array('error'=>$error->getMessage(),'code'=>$error->error_code),$error->details), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        } catch (Throwable $error) {
            log_message('error', 'Shared world operation failed: ' . get_class($error));
            return $this->output->set_status_header(503)->set_output('{"error":"Dunia sementara tidak dapat disimpan. Coba ulang dengan ID permintaan yang sama.","code":"world_unavailable"}');
        }
    }

    private function world_scene($method)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('world_scenes')) return $this->database_error();
        $region = (string) $this->input->get('region', TRUE);
        if (!in_array($region, array('kota', 'desa', 'hutan'), TRUE)) return $this->output->set_status_header(422)->set_output('{"error":"Wilayah tidak dikenal."}');
        return $this->output->set_output(json_encode(array('region' => $region, 'customized' => $this->semesta->has_world_scene($region), 'objects' => $this->semesta->get_world_scene($region)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function save_world_scene($payload)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if (!$this->require_admin()) return;
        if (!$this->database_ready() || !$this->db->table_exists('world_scenes')) return $this->database_error();
        if (strlen($this->input->raw_input_stream) > 200000) return $this->output->set_status_header(413)->set_output('{"error":"Ukuran tata wilayah terlalu besar."}');
        $region = isset($payload['region']) ? (string) $payload['region'] : '';
        $objects = isset($payload['objects']) ? $payload['objects'] : NULL;
        $types = array('road','house','house_village','house_mid','house_luxury','school','school_ruined','school_good','mbg','sppg','kopdes','market','hall','office','dpr_mpr','istana_negara','river','bridge','rice_field','crop_field','car','car_economy','car_family','car_luxury','pickup','truck','bus','motorcycle','tractor','hand_tractor','combine_harvester','tree','tree_canopy','forest','forest_lush','forest_burned','chicken','duck','goat','cow','buffalo','cat','dog','lamp');
        if (!in_array($region, array('kota', 'desa', 'hutan'), TRUE) || !is_array($objects) || count($objects) > 400) return $this->output->set_status_header(422)->set_output('{"error":"Wilayah atau daftar objek belum valid."}');
        $clean = array(); $ids = array();
        foreach ($objects as $object) {
            if (!is_array($object) || !isset($object['id'], $object['type']) || !in_array($object['type'], $types, TRUE)) return $this->output->set_status_header(422)->set_output('{"error":"Ada objek yang belum valid."}');
            $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $object['id']);
            $x = isset($object['x']) && is_numeric($object['x']) ? (float) $object['x'] : 0;
            $z = isset($object['z']) && is_numeric($object['z']) ? (float) $object['z'] : 0;
            $rotation = isset($object['rotation']) && is_numeric($object['rotation']) ? (float) $object['rotation'] : 0;
            $length = isset($object['length']) && is_numeric($object['length']) ? (float) $object['length'] : 9;
            $width = isset($object['width']) && is_numeric($object['width']) ? (float) $object['width'] : 3;
            $scale = isset($object['scale']) && is_numeric($object['scale']) ? (float) $object['scale'] : 1;
            if ($id === '' || isset($ids[$id]) || abs($x) > 1000000 || abs($z) > 1000000 || abs($rotation) > 1000 || $scale < .25 || $scale > 4) return $this->output->set_status_header(422)->set_output('{"error":"Posisi, skala, rotasi, atau ID objek di luar batas."}');
            // The default city, village, and forest scenes contain roads and
            // rivers longer than 24 units. Validate against the editor's
            // actual supported range so moving an unrelated building can save.
            if ($length < 1 || $length > 1000 || $width < .5 || $width > 16) return $this->output->set_status_header(422)->set_output('{"error":"Panjang atau lebar objek di luar batas."}');
            $ids[$id] = TRUE;
            $clean[] = array('id' => $id, 'type' => $object['type'], 'x' => $x, 'z' => $z, 'rotation' => $rotation, 'length' => $length, 'width' => $width, 'scale' => $scale);
        }
        if (!$this->semesta->save_world_scene($region, $clean)) return $this->database_error();
        return $this->output->set_output(json_encode(array('ok' => true, 'region' => $region, 'objects' => $clean), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function citizen_profile($method)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('citizens')) return $this->database_error();
        $id = (int) $this->session->userdata('citizen_id');
        $citizen = $id ? $this->semesta->get_citizen_profile($id) : NULL;
        if ($citizen) {
            $status = $this->db->select('is_active')->where('id', $id)->get('citizens')->row_array();
            if (!$status || !(int) $status['is_active']) { $this->session->unset_userdata('citizen_id'); $citizen = NULL; }
        }
        return $this->output->set_output(json_encode(array('citizen' => $citizen), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function citizen_options($method)
    {
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('citizen_master_data')) return $this->database_error();
        $rows = $this->db->where('is_active', 1)->order_by('master_type', 'ASC')->order_by('sort_order', 'ASC')->get('citizen_master_data')->result_array();
        $options = array();
        foreach ($rows as $row) $options[$row['master_type']][] = array('value' => $row['master_value'], 'label' => $row['label'], 'avatarStyle' => $row['avatar_style']);
        return $this->output->set_output(json_encode(array('options' => $options), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function visitor_logs($method)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if (!$this->require_admin()) return;
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('visitor_logs')) return $this->database_error();
        // Run a bounded retention cleanup whenever analytics is opened; the
        // request hook also samples cleanup during normal public traffic.
        $this->db->query('DELETE FROM visitor_logs WHERE visited_at < DATE_SUB(NOW(), INTERVAL 90 DAY)');

        $days = (int) $this->input->get('days'); if (!in_array($days, array(7, 30, 90), TRUE)) $days = 30;
        $page = max(1, min(100000, (int) $this->input->get('page'))); $perPage = 25;
        $query = trim((string) $this->input->get('q', TRUE)); $query = function_exists('mb_substr') ? mb_substr($query, 0, 100, 'UTF-8') : substr($query, 0, 100);
        $device = (string) $this->input->get('device', TRUE); if (!in_array($device, array('all','desktop','mobile','tablet'), TRUE)) $device = 'all';
        $traffic = (string) $this->input->get('traffic', TRUE); if (!in_array($traffic, array('all','human','bot'), TRUE)) $traffic = 'all';
        $start = $this->valid_visitor_date((string) $this->input->get('from', TRUE));
        $end = $this->valid_visitor_date((string) $this->input->get('to', TRUE));
        $where = array('visited_at >= DATE_SUB(NOW(), INTERVAL ' . $days . ' DAY)'); $params = array();
        if ($query !== '') { $where[] = '(ip_address LIKE ? OR request_path LIKE ? OR referrer_host LIKE ? OR referrer_path LIKE ? OR user_agent LIKE ? OR browser LIKE ?)'; $needle = '%' . $query . '%'; array_push($params, $needle, $needle, $needle, $needle, $needle, $needle); }
        if ($device !== 'all') $where[] = 'device_type=' . $this->db->escape($device);
        if ($traffic === 'human') $where[] = 'is_bot=0'; elseif ($traffic === 'bot') $where[] = 'is_bot=1';
        if ($start) { $where[] = 'visited_at >= ?'; $params[] = $start . ' 00:00:00'; }
        if ($end) { $where[] = 'visited_at < ?'; $params[] = date('Y-m-d', strtotime($end . ' +1 day')) . ' 00:00:00'; }
        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $count = $this->db->query('SELECT COUNT(*) AS total FROM visitor_logs ' . $whereSql, $params)->row_array();
        $total = (int) ($count['total'] ?? 0); $pages = max(1, (int) ceil($total / $perPage)); $page = min($page, $pages);
        $rows = $this->db->query("SELECT id,visited_at,CASE WHEN ip_address IN ('127.0.0.1','::1','::ffff:127.0.0.1') THEN NULL ELSE ip_address END AS ip_address,request_path,referrer_host,referrer_path,user_agent,browser,device_type,is_bot,language FROM visitor_logs " . $whereSql . ' ORDER BY visited_at DESC,id DESC LIMIT ' . $perPage . ' OFFSET ' . (($page - 1) * $perPage), $params)->result_array();
        $stats = $this->db->query('SELECT COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors,COUNT(DISTINCT ip_hash) AS addresses,COALESCE(SUM(referrer_host IS NOT NULL),0) AS referred FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL ' . $days . ' DAY)')->row_array();
        $sources = $this->db->query("SELECT COALESCE(NULLIF(referrer_host,''),'Akses langsung') AS source,COUNT(*) AS views FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL " . $days . " DAY) GROUP BY source ORDER BY views DESC LIMIT 6")->result_array();
        return $this->output->set_output(json_encode(array('items' => $rows, 'page' => $page, 'pages' => $pages, 'total' => $total, 'perPage' => $perPage, 'days' => $days, 'stats' => array_map('intval', $stats), 'topReferrers' => $sources), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function valid_visitor_date($value)
    {
        if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $value)) return NULL;
        $parts = explode('-', $value);
        return checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0]) ? $value : NULL;
    }

    private function citizen_admin_detail($method)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if (!$this->require_admin()) return;
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('citizens')) return $this->database_error();
        $id = max(0, (int) $this->input->get('id'));
        $citizen = $this->db->query("SELECT c.id,c.username,c.email,c.display_name,c.gender,c.religion,c.birth_province,c.birth_city,c.birth_date,c.occupation,c.education_level,c.domicile_province,c.domicile_city,c.avatar,c.house,c.created_at,COALESCE(g.label,c.gender) AS gender_label,COALESCE(r.label,c.religion) AS religion_label,COALESCE(bp.label,c.birth_province) AS birth_province_label,COALESCE(o.label,c.occupation) AS occupation_label,COALESCE(e.label,c.education_level) AS education_label,COALESCE(dp.label,c.domicile_province) AS domicile_province_label,COALESCE(a.label,c.avatar) AS avatar_label FROM citizens c LEFT JOIN citizen_master_data g ON g.master_type='gender' AND g.master_value=c.gender LEFT JOIN citizen_master_data r ON r.master_type='religion' AND r.master_value=c.religion LEFT JOIN citizen_master_data bp ON bp.master_type='province' AND bp.master_value=c.birth_province LEFT JOIN citizen_master_data o ON o.master_type='occupation' AND o.master_value=c.occupation LEFT JOIN citizen_master_data e ON e.master_type='education' AND e.master_value=c.education_level LEFT JOIN citizen_master_data dp ON dp.master_type='province' AND dp.master_value=c.domicile_province LEFT JOIN citizen_master_data a ON a.master_type='avatar' AND a.master_value=c.avatar WHERE c.id=? AND c.account_type='citizen'", array($id))->row_array();
        if (!$citizen) return $this->output->set_status_header(404)->set_output('{"error":"Data warga tidak ditemukan."}');
        return $this->output->set_output(json_encode(array('citizen' => $citizen), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function citizen_admin($method, $payload = NULL)
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        if (!$this->require_admin()) return;
        if (!$this->database_ready() || !$this->db->table_exists('citizens')) return $this->database_error();
        if ($method === 'POST') {
            $id = isset($payload['citizenId']) ? (int) $payload['citizenId'] : 0;
            $requested = $payload['active'] ?? NULL;
            if (($payload['action'] ?? '') !== 'set_active' || $id < 1 || !in_array($requested, array(TRUE, FALSE, 0, 1, '0', '1'), TRUE)) return $this->output->set_status_header(422)->set_output('{"error":"Aksi atau akun warga tidak valid."}');
            $active = in_array($requested, array(TRUE, 1, '1'), TRUE) ? 1 : 0;
            if (!$this->db->where('id', $id)->where('account_type', 'citizen')->count_all_results('citizens')) return $this->output->set_status_header(404)->set_output('{"error":"Akun warga tidak ditemukan."}');
            if (!$this->db->where('id', $id)->where('account_type', 'citizen')->update('citizens', array('is_active' => $active, 'updated_at' => date('Y-m-d H:i:s')))) return $this->database_error();
            if (!$active && $this->db->table_exists('citizen_presence')) $this->db->delete('citizen_presence', array('citizen_id' => $id));
            return $this->output->set_output(json_encode(array('ok' => TRUE, 'citizenId' => $id, 'active' => (bool) $active), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        $query = trim((string) $this->input->get('q', TRUE)); $query = function_exists('mb_substr') ? mb_substr($query, 0, 80, 'UTF-8') : substr($query, 0, 80);
        $filter = (string) $this->input->get('status', TRUE); if (!in_array($filter, array('all','active','inactive','unverified'), TRUE)) $filter = 'all';
        $page = max(1, min(100000, (int) $this->input->get('page'))); $perPage = 15;
        $where = array('c.account_type=\'citizen\''); $params = array();
        if ($query !== '') { $where[] = '(c.username LIKE ? OR c.email LIKE ? OR c.display_name LIKE ?)'; $needle = '%' . $query . '%'; array_push($params, $needle, $needle, $needle); }
        if ($filter === 'active') $where[] = 'c.is_active=1';
        elseif ($filter === 'inactive') $where[] = 'c.is_active=0';
        elseif ($filter === 'unverified') $where[] = 'c.email_verified=0';
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $count = $this->db->query('SELECT COUNT(*) AS total FROM citizens c ' . $whereSql, $params)->row_array();
        $total = (int) ($count['total'] ?? 0); $pages = max(1, (int) ceil($total / $perPage)); $page = min($page, $pages);
        $presenceJoin = $this->db->table_exists('citizen_presence') ? 'LEFT JOIN citizen_presence p ON p.citizen_id=c.id AND p.updated_at>DATE_SUB(NOW(), INTERVAL 20 SECOND)' : '';
        $onlineSelect = $presenceJoin ? 'IF(p.citizen_id IS NULL,0,1)' : '0';
        $rows = $this->db->query('SELECT c.id,c.username,c.email,c.display_name,c.email_verified,c.is_active,c.avatar,c.house,c.occupation,c.created_at,COALESCE(o.label,c.occupation) AS occupation_label,COALESCE(a.label,c.avatar) AS avatar_label,' . $onlineSelect . ' AS is_online FROM citizens c LEFT JOIN citizen_master_data o ON o.master_type=\'occupation\' AND o.master_value=c.occupation LEFT JOIN citizen_master_data a ON a.master_type=\'avatar\' AND a.master_value=c.avatar ' . $presenceJoin . ' ' . $whereSql . ' ORDER BY c.created_at DESC LIMIT ' . $perPage . ' OFFSET ' . (($page - 1) * $perPage), $params)->result_array();
        $stats = $this->db->query("SELECT COALESCE(SUM(account_type='citizen'),0) AS total,COALESCE(SUM(account_type='citizen' AND email_verified=1),0) AS verified,COALESCE(SUM(account_type='citizen' AND email_verified=0),0) AS pending,COALESCE(SUM(account_type='citizen' AND is_active=0),0) AS inactive,COALESCE(SUM(account_type='admin'),0) AS admin_profiles FROM citizens")->row_array();
        $this->config->load('admin_credentials', TRUE, TRUE);
        $configuredAdmin = (string) ($this->config->item('username', 'admin_credentials') ?: getenv('SEMESTA_ADMIN_USERNAME'));
        return $this->output->set_output(json_encode(array('citizens' => $rows, 'page' => $page, 'pages' => $pages, 'total' => $total, 'stats' => array_map('intval', $stats), 'configuredAdmin' => $configuredAdmin), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function citizen_chat($payload)
    {
        $citizenId = (int) $this->session->userdata('citizen_id');
        if (!$citizenId) return $this->output->set_status_header(401)->set_output('{"error":"Masuk sebagai warga untuk mengobrol."}');
        if (!$this->database_ready() || !$this->db->table_exists('citizen_presence') || !$this->db->table_exists('citizen_messages')) return $this->database_error();
        $account = $this->db->select('is_active')->where('id', $citizenId)->get('citizens')->row_array();
        if (!$account || !(int) $account['is_active']) { $this->session->unset_userdata('citizen_id'); $this->db->delete('citizen_presence', array('citizen_id' => $citizenId)); return $this->output->set_status_header(401)->set_output('{"error":"Akun warga ini sedang dinonaktifkan."}'); }
        $action = isset($payload['action']) ? (string) $payload['action'] : '';
        if ($action === 'leave') {
            $this->db->delete('citizen_presence', array('citizen_id' => $citizenId));
            return $this->output->set_output('{"ok":true}');
        }
        $homeBinding = $this->session->userdata('citizen_home_binding');
        $homeSessionHash = is_array($homeBinding) && ($homeBinding['citizenId'] ?? NULL) === $citizenId && is_string($homeBinding['nonce'] ?? NULL) ? hash('sha256',$homeBinding['nonce']) : NULL;
        $hasHomeMode = $homeSessionHash !== NULL && $this->db->table_exists('citizen_homes');
        if ($hasHomeMode && in_array($action,array('sync','send'),TRUE)) {
            $private = $this->db->query('SELECT citizen_id FROM citizen_homes WHERE citizen_id=? AND interior_session_hash=?',array($citizenId,$homeSessionHash))->row_array();
            if ($private) {
                if ($action === 'sync') return $this->output->set_output('{"players":[],"messages":[],"canChat":false,"privateMode":true}');
                return $this->output->set_status_header(409)->set_output('{"error":"Keluar dari kamar untuk mengobrol di dunia publik.","code":"private_mode"}');
            }
        }
        $destination = isset($payload['destination']) ? (string) $payload['destination'] : '';
        $region = isset($payload['region']) ? (string) $payload['region'] : '';
        $locations = array('jakarta','bandung','semarang','surabaya','makassar');
        $regions = array('kota','desa','hutan');
        $sharedWorld = $destination === 'republic' && $region === 'world';
        if (!$sharedWorld && (!in_array($destination, $locations, TRUE) || !in_array($region, $regions, TRUE))) return $this->output->set_status_header(422)->set_output('{"error":"Wilayah obrolan tidak dikenal."}');

        if ($action === 'sync') {
            $x = isset($payload['x']) && is_numeric($payload['x']) ? (float) $payload['x'] : NULL;
            $z = isset($payload['z']) && is_numeric($payload['z']) ? (float) $payload['z'] : NULL;
            if ($x === NULL || $z === NULL || !is_finite($x) || !is_finite($z) || abs($x) > 1000000 || abs($z) > 1000000) return $this->output->set_status_header(422)->set_output('{"error":"Posisi warga tidak valid."}');
            if ($hasHomeMode) {
                $this->load->helper('citizen_home'); $this->load->model('Citizen_home_model','citizenHome');
                try {
                    if (!$this->citizenHome->sync_public_presence($citizenId,$homeSessionHash,$destination,$region,$x,$z)) return $this->output->set_output('{"players":[],"messages":[],"canChat":false,"privateMode":true}');
                } catch(Throwable $error) {
                    log_message('error','Private home presence operation failed: '.get_class($error));
                    return $this->output->set_status_header(503)->set_output('{"error":"Posisi warga sementara tidak dapat disimpan.","code":"presence_unavailable"}');
                }
            } else $this->db->query('INSERT INTO citizen_presence (citizen_id, destination, region, x, z, updated_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE destination=VALUES(destination), region=VALUES(region), x=VALUES(x), z=VALUES(z), updated_at=NOW()', array($citizenId, $destination, $region, $x, $z));
            $lastCleanup = (float) $this->session->userdata('chat_presence_cleanup_at');
            if (microtime(TRUE) - $lastCleanup > 60) { $this->db->query('DELETE FROM citizen_presence WHERE updated_at < DATE_SUB(NOW(), INTERVAL 60 SECOND)'); $this->session->set_userdata('chat_presence_cleanup_at', microtime(TRUE)); }
            $players = $this->db->query('SELECT c.id, c.display_name, c.avatar, c.avatar_config, c.house, p.x, p.z FROM citizen_presence p JOIN citizens c ON c.id=p.citizen_id WHERE p.citizen_id<>? AND p.destination=? AND p.region=? AND p.updated_at>DATE_SUB(NOW(), INTERVAL 20 SECOND) AND p.x BETWEEN ? AND ? AND p.z BETWEEN ? AND ? ORDER BY p.updated_at DESC LIMIT 100', array($citizenId, $destination, $region, $x - 55, $x + 55, $z - 55, $z + 55))->result_array();
            $nearby = array(); $target = isset($payload['targetId']) ? (int) $payload['targetId'] : 0; $targetDistance = INF;
            foreach ($players as $player) {
                $distance = hypot($x - (float) $player['x'], $z - (float) $player['z']);
                if ($distance > 55) continue;
                $nearby[] = array('id' => (int) $player['id'], 'displayName' => $player['display_name'], 'avatar' => $player['avatar'], 'avatar_config' => $player['avatar_config'], 'house' => $player['house'], 'x' => (float) $player['x'], 'z' => (float) $player['z'], 'distance' => round($distance, 2));
                if ((int) $player['id'] === $target) $targetDistance = $distance;
            }
            $messages = array();
            if ($target && $targetDistance <= 5) {
                $after = isset($payload['after']) && is_numeric($payload['after']) ? max(0, (int) $payload['after']) : 0;
                if ($after > 0) {
                    $messages = $this->db->query('SELECT m.id, m.sender_id, c.display_name AS sender_name, m.message, m.created_at FROM citizen_messages m JOIN citizens c ON c.id=m.sender_id WHERE m.id>? AND m.destination=? AND m.region=? AND ((m.sender_id=? AND m.recipient_id=?) OR (m.sender_id=? AND m.recipient_id=?)) ORDER BY m.id ASC LIMIT 30', array($after, $destination, $region, $citizenId, $target, $target, $citizenId))->result_array();
                } else {
                    $messages = $this->db->query('SELECT m.id, m.sender_id, c.display_name AS sender_name, m.message, m.created_at FROM citizen_messages m JOIN citizens c ON c.id=m.sender_id WHERE m.destination=? AND m.region=? AND ((m.sender_id=? AND m.recipient_id=?) OR (m.sender_id=? AND m.recipient_id=?)) ORDER BY m.id DESC LIMIT 30', array($destination, $region, $citizenId, $target, $target, $citizenId))->result_array();
                    $messages = array_reverse($messages);
                }
            }
            return $this->output->set_output(json_encode(array('players' => $nearby, 'messages' => $messages, 'canChat' => $target > 0 && $targetDistance <= 5), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        if ($action === 'send') {
            $target = isset($payload['targetId']) ? (int) $payload['targetId'] : 0;
            $message = trim(strip_tags(isset($payload['message']) ? (string) $payload['message'] : ''));
            $message = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $message);
            $messageLength = function_exists('mb_strlen') ? mb_strlen($message, 'UTF-8') : strlen($message);
            if (!$target || $target === $citizenId || !$message || $messageLength > 280) return $this->output->set_status_header(422)->set_output('{"error":"Pesan kosong, terlalu panjang, atau penerimanya tidak valid."}');
            $myPosition = $this->db->query('SELECT x,z FROM citizen_presence WHERE citizen_id=? AND destination=? AND region=? AND updated_at>DATE_SUB(NOW(), INTERVAL 8 SECOND)', array($citizenId, $destination, $region))->row_array();
            $theirPosition = $this->db->query('SELECT x,z FROM citizen_presence WHERE citizen_id=? AND destination=? AND region=? AND updated_at>DATE_SUB(NOW(), INTERVAL 20 SECOND)', array($target, $destination, $region))->row_array();
            if (!$myPosition || !$theirPosition || hypot((float) $myPosition['x'] - (float) $theirPosition['x'], (float) $myPosition['z'] - (float) $theirPosition['z']) > 5) return $this->output->set_status_header(409)->set_output('{"error":"Dekati warga itu untuk melanjutkan obrolan."}');
            $lastSent = (float) $this->session->userdata('chat_last_sent_at');
            if (microtime(TRUE) - $lastSent < .75) return $this->output->set_status_header(429)->set_output('{"error":"Tunggu sebentar sebelum mengirim pesan lagi."}');
            if (!$this->db->insert('citizen_messages', array('sender_id' => $citizenId, 'recipient_id' => $target, 'destination' => $destination, 'region' => $region, 'message' => $message, 'created_at' => date('Y-m-d H:i:s')))) return $this->database_error();
            $id = (int) $this->db->insert_id();
            $this->session->set_userdata('chat_last_sent_at', microtime(TRUE));
            $sender = $this->semesta->get_citizen($citizenId);
            return $this->output->set_output(json_encode(array('ok' => TRUE, 'message' => array('id' => $id, 'sender_id' => $citizenId, 'sender_name' => $sender['display_name'], 'message' => $message, 'created_at' => date('Y-m-d H:i:s'))), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        return $this->output->set_status_header(422)->set_output('{"error":"Aksi obrolan warga tidak dikenal."}');
    }

    private function citizen_master_has_value($type, $value)
    {
        if ($value === NULL || $value === '') return TRUE;
        return $this->db->where('master_type', $type)->where('master_value', $value)->where('is_active', 1)->count_all_results('citizen_master_data') > 0;
    }

    private function collect_citizen_profile_fields($payload)
    {
        $fields = array();
        foreach (array('gender'=>'gender','religion'=>'religion','birthProvince'=>'province','occupation'=>'occupation','educationLevel'=>'education') as $field => $master) {
            $raw = $payload[$field] ?? ''; if (!is_scalar($raw)) return FALSE;
            $value = trim((string) $raw);
            if (!$this->citizen_master_has_value($master, $value)) return FALSE;
            $fields[array('birthProvince'=>'birth_province','educationLevel'=>'education_level')[$field] ?? $field] = $value === '' ? NULL : $value;
        }
        foreach (array('birthCity'=>'birth_city','domicileCity'=>'domicile_city','domicileProvince'=>'domicile_province') as $field => $column) {
            $raw = $payload[$field] ?? ''; if (!is_scalar($raw)) return FALSE;
            $value = trim(strip_tags((string) $raw));
            if (strlen($value) > ($field === 'birthCity' || $field === 'domicileCity' ? 80 : 64)) return FALSE;
            if ($field === 'domicileProvince' && !$this->citizen_master_has_value('province', $value)) return FALSE;
            $fields[$column] = $value === '' ? NULL : $value;
        }
        $rawBirthDate = $payload['birthDate'] ?? ''; if (!is_scalar($rawBirthDate)) return FALSE;
        $birthDate = trim((string) $rawBirthDate);
        if ($birthDate !== '') {
            $date = DateTime::createFromFormat('!Y-m-d', $birthDate);
            $dateErrors = DateTime::getLastErrors();
            if (!$date || ($dateErrors && ($dateErrors['warning_count'] || $dateErrors['error_count'])) || $date->format('Y-m-d') !== $birthDate || $birthDate > date('Y-m-d') || $birthDate < '1900-01-01') return FALSE;
        }
        $fields['birth_date'] = $birthDate === '' ? NULL : $birthDate;
        return $fields;
    }

    private function sanitize_avatar_config($config)
    {
        $this->load->helper('avatar_v15');
        return validate_avatar_v15($config);
    }

    private function citizen_action($payload)
    {
        $this->output->set_header('Cache-Control: no-store');
        foreach (array('action','username','email','password','displayName','avatar','house') as $field) {
            if (isset($payload[$field]) && !is_string($payload[$field])) return $this->output->set_status_header(422)->set_output('{"error":"Formulir akun belum valid."}');
        }
        if (!$this->database_ready() || !$this->db->table_exists('citizens') || !$this->db->table_exists('app_settings')) return $this->database_error();
        $action = isset($payload['action']) ? $payload['action'] : '';
        if ($action === 'logout') {
            $citizenId = (int) $this->session->userdata('citizen_id');
            if ($citizenId && $this->database_ready() && $this->db->table_exists('citizen_presence')) $this->db->delete('citizen_presence', array('citizen_id' => $citizenId));
            $this->session->unset_userdata('citizen_id');
            return $this->output->set_output('{"ok":true}');
        }
        if ($action === 'update_avatar') {
            $id = (int) $this->session->userdata('citizen_id');
            if (!$id) return $this->output->set_status_header(401)->set_output('{"error":"Masuk sebagai warga untuk mengganti avatar."}');
            $status = $this->db->select('is_active')->where('id', $id)->get('citizens')->row_array();
            if (!$status || !(int) $status['is_active']) return $this->output->set_status_header(403)->set_output('{"error":"Akun warga ini sedang dinonaktifkan."}');
            $config = isset($payload['avatarConfig']) ? $payload['avatarConfig'] : array();
            $saved = $this->sanitize_avatar_config($config);
            if ($saved === FALSE) return $this->output->set_status_header(422)->set_output('{"error":"Pilihan avatar belum valid. Periksa bagian tubuh, wajah, pakaian, dan warna."}');
            if (!$this->semesta->update_citizen($id, array('avatar_config' => json_encode($saved, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)))) return $this->database_error();
            return $this->output->set_output(json_encode(array('ok' => TRUE, 'citizen' => $this->semesta->get_citizen_profile($id)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        if ($action === 'update') {
            $id = (int) $this->session->userdata('citizen_id');
            if (!$id) return $this->output->set_status_header(401)->set_output('{"error":"Masuk sebagai warga terlebih dahulu."}');
            $status = $this->db->select('is_active')->where('id', $id)->get('citizens')->row_array();
            if (!$status || !(int) $status['is_active']) { $this->session->unset_userdata('citizen_id'); return $this->output->set_status_header(403)->set_output('{"error":"Akun warga ini sedang dinonaktifkan."}'); }
            $display = trim(strip_tags(isset($payload['displayName']) ? $payload['displayName'] : ''));
            $avatar = isset($payload['avatar']) ? $payload['avatar'] : 'warga';
            $house = isset($payload['house']) ? $payload['house'] : 'rumah-kayu';
            $profileFields = $this->collect_citizen_profile_fields($payload);
            if (strlen($display) < 2 || strlen($display) > 40 || !$this->citizen_master_has_value('avatar', $avatar) || !in_array($house, array('rumah-kayu','rumah-bata','rumah-panggung'), TRUE) || $profileFields === FALSE) return $this->output->set_status_header(422)->set_output('{"error":"Profil warga belum valid. Periksa biodata dan pilihan avatar."}');
            $profileFields['display_name'] = $display; $profileFields['avatar'] = $avatar; $profileFields['house'] = $house;
            if (empty($profileFields['gender']) || empty($profileFields['occupation'])) return $this->output->set_status_header(422)->set_output('{"error":"Pilih jenis kelamin karakter dan profesi terlebih dahulu."}');
            if (isset($payload['avatarConfig'])) {
                $cleanAvatar = $this->sanitize_avatar_config($payload['avatarConfig']);
                if ($cleanAvatar === FALSE) return $this->output->set_status_header(422)->set_output('{"error":"Pilihan avatar belum valid."}');
                $profileFields['avatar_config'] = json_encode($cleanAvatar, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $existingProfile = $this->semesta->get_citizen_profile($id);
            if (empty($profileFields['avatar_config']) && empty($existingProfile['avatar_config'])) return $this->output->set_status_header(422)->set_output('{"error":"Pilih avatar untuk melengkapi profil warga."}');
            if (!$this->semesta->update_citizen($id, $profileFields)) return $this->database_error();
            return $this->output->set_output(json_encode(array('ok' => true, 'citizen' => $this->semesta->get_citizen_profile($id)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }

        if ($action === 'resend') {
            $email = strtolower(trim(isset($payload['email']) ? $payload['email'] : ''));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) return $this->output->set_status_header(422)->set_output('{"error":"Masukkan alamat email yang valid."}');
            $row = $this->semesta->find_citizen_by_email($email);
            if (time() - (int) $this->session->userdata('verification_last_sent') < 60) return $this->output->set_status_header(429)->set_output('{"error":"Tunggu satu menit sebelum meminta tautan lagi."}');
            $this->session->set_userdata('verification_last_sent', time());
            $generic = '{"ok":true,"message":"Jika akun membutuhkan verifikasi, tautan akan dikirim ke email tersebut. Periksa kotak masuk dan spam."}';
            if (!$row || (int) $row['email_verified'] === 1 || empty($row['is_active'])) return $this->output->set_output($generic);
            if (!$this->smtp_configured()) return $this->output->set_status_header(503)->set_output('{"error":"Pengiriman email belum tersedia. Hubungi pengelola republik."}');
            $token = bin2hex(random_bytes(32));
            if (!$this->semesta->update_citizen($row['id'], array('verification_token_hash' => hash('sha256', $token), 'verification_expires_at' => date('Y-m-d H:i:s', time() + 172800)))) return $this->database_error();
            if (!$this->send_verification_email($email, $token, $row['display_name'])) {
                $this->semesta->update_citizen($row['id'], array('verification_token_hash' => $row['verification_token_hash'], 'verification_expires_at' => $row['verification_expires_at']));
                return $this->output->set_status_header(503)->set_output('{"error":"Email belum terkirim. Coba kembali nanti; tautan sebelumnya masih berlaku."}');
            }
            return $this->output->set_output($generic);
        }

        $password = isset($payload['password']) ? (string) $payload['password'] : '';
        if (strlen($password) < 8 || strlen($password) > 128) return $this->output->set_status_header(422)->set_output('{"error":"Kata sandi minimal 8 karakter."}');
        if ($action === 'register') {
            $username = strtolower(trim(isset($payload['username']) ? $payload['username'] : ''));
            $email = strtolower(trim(isset($payload['email']) ? $payload['email'] : ''));
            if (!preg_match('/^[a-z0-9_.-]{3,32}$/', $username)) return $this->output->set_status_header(422)->set_output('{"error":"Username harus 3–32 karakter dan hanya memakai huruf, angka, titik, garis bawah, atau tanda hubung."}');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) return $this->output->set_status_header(422)->set_output('{"error":"Masukkan alamat email yang valid."}');
            $display = trim(strip_tags(isset($payload['displayName']) ? $payload['displayName'] : ''));
            $avatar = isset($payload['avatar']) ? $payload['avatar'] : 'warga';
            $house = isset($payload['house']) ? $payload['house'] : 'rumah-kayu';
            $profileFields = $this->collect_citizen_profile_fields($payload);
            $avatarConfig = NULL;
            if (array_key_exists('avatarConfig', $payload)) {
                $cleanAvatar = $this->sanitize_avatar_config($payload['avatarConfig']);
                if ($cleanAvatar === FALSE) return $this->output->set_status_header(422)->set_output('{"error":"Pilihan avatar belum valid. Periksa bagian tubuh, wajah, pakaian, dan warna."}');
                $avatarConfig = json_encode($cleanAvatar, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            if (strlen($display) < 2 || strlen($display) > 40 || !$this->citizen_master_has_value('avatar', $avatar) || !in_array($house, array('rumah-kayu','rumah-bata','rumah-panggung'), TRUE) || $profileFields === FALSE) return $this->output->set_status_header(422)->set_output('{"error":"Nama, biodata, avatar, atau pilihan rumah belum valid."}');
            if (empty($profileFields['gender']) || empty($profileFields['occupation']) || !$avatarConfig) return $this->output->set_status_header(422)->set_output('{"error":"Pilih jenis kelamin karakter, profesi, dan avatar sebelum mendaftar."}');
            if ($this->semesta->find_citizen_by_email($email)) return $this->output->set_status_header(409)->set_output('{"error":"Email sudah terdaftar. Coba masuk atau kirim ulang verifikasi."}');
            if ($this->semesta->find_citizen_by_username($username)) return $this->output->set_status_header(409)->set_output('{"error":"Username sudah dipakai. Pilih username lain."}');
            $verificationRequired = $this->semesta->get_app_setting('require_email_verification', '0') === '1';
            if ($verificationRequired && !$this->smtp_configured()) return $this->output->set_status_header(503)->set_output('{"error":"Pendaftaran email sedang menunggu layanan verifikasi. Coba lagi nanti atau gunakan Google jika tersedia."}');
            $token = $verificationRequired ? bin2hex(random_bytes(32)) : NULL;
            $id = $this->semesta->create_citizen(array(
                'username' => $username, 'email' => $email, 'display_name' => $display, 'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'email_verified' => 0, 'verification_token_hash' => $token ? hash('sha256', $token) : NULL,
                'verification_expires_at' => $token ? date('Y-m-d H:i:s', time() + 172800) : NULL, 'avatar' => $avatar, 'avatar_config' => $avatarConfig, 'house' => $house,
                'account_type' => 'citizen',
            ) + $profileFields);
            if (!$id) return $this->database_error();
            if ($verificationRequired) {
                if (!$this->send_verification_email($email, $token, $display)) return $this->output->set_status_header(202)->set_output('{"ok":true,"verificationRequired":true,"message":"Akun dibuat, tetapi email belum terkirim. Periksa SMTP lalu kirim ulang tautan verifikasi."}');
                return $this->output->set_status_header(201)->set_output('{"ok":true,"verificationRequired":true,"message":"Akun dibuat. Buka email untuk verifikasi sebelum masuk."}');
            }
            $this->session->sess_regenerate(TRUE);
            $this->session->set_userdata('citizen_id', $id);
            return $this->output->set_status_header(201)->set_output(json_encode(array('ok' => true, 'citizen' => $this->semesta->get_citizen_profile($id)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        if ($action === 'login') {
            $username = strtolower(trim(isset($payload['username']) ? $payload['username'] : ''));
            $emailLogin = filter_var($username, FILTER_VALIDATE_EMAIL) && strlen($username) <= 190;
            if (!$emailLogin && !preg_match('/^[a-z0-9_.-]{1,32}$/', $username)) return $this->output->set_status_header(422)->set_output('{"error":"Masukkan username atau email yang valid."}');
            $row = $emailLogin ? $this->semesta->find_citizen_by_email($username) : $this->semesta->find_citizen_by_username($username);

            // The deployment admin can also enter the free-play world as a citizen.
            // Keep the admin credential source authoritative while storing a normal
            // profile row so the game can render the chosen avatar and house.
            $this->config->load('admin_credentials', TRUE, TRUE);
            $adminUsername = strtolower((string) ($this->config->item('username', 'admin_credentials') ?: getenv('SEMESTA_ADMIN_USERNAME')));
            $adminPasswordHash = (string) ($this->config->item('password_hash', 'admin_credentials') ?: getenv('SEMESTA_ADMIN_PASSWORD_HASH'));
            $isAdminLogin = $adminUsername !== '' && $adminPasswordHash !== '' && $username === $adminUsername && password_verify($password, $adminPasswordHash);
            if ($isAdminLogin) {
                if (!$row) {
                    $displayName = $username === 'fuadmuhammad' ? 'Fuad Muhammad' : ucfirst($username);
                    $this->semesta->create_citizen(array(
                        'username' => $username,
                        'email' => 'admin-' . $username . '@local.invalid',
                        'display_name' => $displayName,
                        'password_hash' => $adminPasswordHash,
                        'email_verified' => 1,
                        'verification_token_hash' => NULL,
                        'verification_expires_at' => NULL,
                        'avatar' => 'warga',
                        'house' => 'rumah-kayu',
                    ));
                    $row = $this->semesta->find_citizen_by_username($username);
                } elseif ((int) $row['email_verified'] !== 1 || empty($row['is_active']) || !password_verify($password, $row['password_hash'])) {
                    $this->semesta->update_citizen($row['id'], array(
                        'password_hash' => $adminPasswordHash,
                        'email_verified' => 1,
                        'is_active' => 1,
                        'verification_token_hash' => NULL,
                        'verification_expires_at' => NULL,
                    ));
                    $row = $this->semesta->find_citizen_by_username($username);
                }
            }
            if (!$row || !password_verify($password, $row['password_hash'])) return $this->output->set_status_header(401)->set_output('{"error":"Username atau kata sandi tidak cocok."}');
            if (empty($row['is_active'])) return $this->output->set_status_header(403)->set_output('{"error":"Akun warga ini sedang dinonaktifkan. Hubungi admin."}');
            if ((int) $row['email_verified'] !== 1 && $this->semesta->get_app_setting('require_email_verification', '0') === '1') return $this->output->set_status_header(403)->set_output('{"error":"Email belum diverifikasi. Gunakan tombol kirim ulang tautan verifikasi."}');
            $this->session->sess_regenerate(TRUE);
            if ($isAdminLogin && $row['account_type'] !== 'admin') $this->semesta->update_citizen($row['id'], array('account_type' => 'admin'));
            $this->session->set_userdata('citizen_id', (int) $row['id']);
            return $this->output->set_output(json_encode(array('ok' => true, 'citizen' => $this->semesta->get_citizen_profile($row['id'])), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        return $this->output->set_status_header(422)->set_output('{"error":"Aksi warga tidak dikenal."}');
    }

    private function mail_settings($method, $payload = NULL)
    {
        if (!$this->require_admin()) return;
        if (!$this->database_ready() || !$this->db->table_exists('app_settings')) return $this->database_error();
        if ($method === 'GET') {
            $required = $this->semesta->get_app_setting('require_email_verification', '0') === '1';
            $config = $this->auth_config();
            return $this->output->set_output(json_encode(array('requireEmailVerification' => $required, 'smtpConfigured' => $this->smtp_configured(), 'googleSsoConfigured' => (bool) ($config['google']['client_id'] && $config['google']['client_secret']), 'sender' => $config['smtp']['from']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        if ($method !== 'POST') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        $enabled = !empty($payload['requireEmailVerification']);
        if ($enabled && !$this->smtp_configured()) return $this->output->set_status_header(422)->set_output('{"error":"Isi variabel SMTP server terlebih dahulu sebelum verifikasi email diwajibkan."}');
        if (!$this->semesta->set_app_setting('require_email_verification', $enabled ? '1' : '0')) return $this->database_error();
        return $this->output->set_output(json_encode(array('ok' => true, 'requireEmailVerification' => $enabled, 'smtpConfigured' => $this->smtp_configured()), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function avatar_library($method)
    {
        if (!$this->require_admin()) return;
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('app_settings')) return $this->database_error();
        $saved = json_decode((string) $this->semesta->get_app_setting('avatar_library', '[]'), TRUE);
        return $this->output->set_output(json_encode(array('presets' => is_array($saved) ? $saved : array()), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function save_avatar_library($payload)
    {
        if (!$this->require_admin()) return;
        if (!$this->database_ready() || !$this->db->table_exists('app_settings')) return $this->database_error();
        if (strlen($this->input->raw_input_stream) > 200000) return $this->output->set_status_header(413)->set_output('{"error":"Katalog avatar terlalu besar."}');
        $presets = isset($payload['presets']) && is_array($payload['presets']) ? $payload['presets'] : NULL;
        if ($presets === NULL || count($presets) > 100) return $this->output->set_status_header(422)->set_output('{"error":"Daftar avatar belum valid atau terlalu banyak."}');
        $clean = array(); $ids = array();
        foreach ($presets as $preset) {
            if (!is_array($preset) || !isset($preset['name'], $preset['config']) || !is_array($preset['config'])) return $this->output->set_status_header(422)->set_output('{"error":"Ada avatar yang belum valid."}');
            $name = trim(strip_tags((string) $preset['name']));
            $id = isset($preset['id']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $preset['id']) : '';
            if ($name === '' || strlen($name) > 40 || $id === '' || isset($ids[$id])) return $this->output->set_status_header(422)->set_output('{"error":"Nama atau ID avatar belum valid."}');
            $config = $this->sanitize_avatar_config($preset['config']);
            if ($config === FALSE) return $this->output->set_status_header(422)->set_output('{"error":"Pilihan avatar V15 belum valid."}');
            $ids[$id] = TRUE;
            $clean[] = array('id' => $id, 'name' => $name, 'config' => $config);
        }
        $encoded = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === FALSE || !$this->semesta->set_app_setting('avatar_library', $encoded)) return $this->database_error();
        return $this->output->set_output(json_encode(array('ok' => TRUE, 'presets' => $clean), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function smtp_configured()
    {
        $mail = $this->auth_config()['smtp'];
        return (bool) ($mail['host'] && $mail['username'] && $mail['password'] && $mail['from']);
    }

    private function auth_options($method)
    {
        $this->output->set_header('Cache-Control: no-store');
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('app_settings')) return $this->database_error();
        $required = $this->semesta->get_app_setting('require_email_verification', '0') === '1';
        $mail = $this->smtp_configured();
        $google = $this->auth_config()['google'];
        return $this->output->set_output(json_encode(array(
            'emailRegistrationAvailable' => !$required || $mail,
            'emailVerificationRequired' => $required,
            'emailDeliveryAvailable' => $mail,
            'googleAvailable' => (bool) ($google['client_id'] && $google['client_secret'] && $this->db->field_exists('google_sub', 'citizens')),
        )));
    }

    private function auth_error($message, $status = 400)
    {
        $this->output->set_status_header($status)->set_content_type('text/html', 'utf-8');
        return $this->load->view('email_verification', array('title' => 'Masuk belum berhasil', 'message' => $message,
            'next_step' => 'Kembali ke permainan untuk mencoba lagi atau masuk dengan email dan kata sandi.',
            'back_url' => base_url(), 'success' => FALSE));
    }

    private function auth_config()
    {
        $config = array('smtp' => array(), 'google' => array());
        $privateFile = getenv('SEMESTA_AUTH_CONFIG_FILE') ?: '/www/server/php/81/etc/semesta-auth.php';
        if (is_readable($privateFile)) {
            $private = require $privateFile;
            if (is_array($private)) $config = array_replace_recursive($config, $private);
        }
        $env = array(
            'smtp.host' => 'SEMESTA_SMTP_HOST', 'smtp.port' => 'SEMESTA_SMTP_PORT', 'smtp.username' => 'SEMESTA_SMTP_USER',
            'smtp.password' => 'SEMESTA_SMTP_PASSWORD', 'smtp.crypto' => 'SEMESTA_SMTP_CRYPTO', 'smtp.from' => 'SEMESTA_MAIL_FROM',
            'smtp.from_name' => 'SEMESTA_MAIL_FROM_NAME', 'google.client_id' => 'SEMESTA_GOOGLE_CLIENT_ID', 'google.client_secret' => 'SEMESTA_GOOGLE_CLIENT_SECRET',
        );
        foreach ($env as $path => $name) {
            $value = getenv($name);
            if ($value === FALSE || $value === '') continue;
            list($section, $key) = explode('.', $path, 2);
            $config[$section][$key] = $value;
        }
        $config['smtp']['host'] = isset($config['smtp']['host']) ? $config['smtp']['host'] : '';
        $config['smtp']['port'] = isset($config['smtp']['port']) ? (int) $config['smtp']['port'] : 587;
        $config['smtp']['username'] = isset($config['smtp']['username']) ? $config['smtp']['username'] : '';
        $config['smtp']['password'] = isset($config['smtp']['password']) ? $config['smtp']['password'] : '';
        $config['smtp']['crypto'] = isset($config['smtp']['crypto']) ? $config['smtp']['crypto'] : 'tls';
        $config['smtp']['from'] = isset($config['smtp']['from']) ? $config['smtp']['from'] : '';
        $config['smtp']['from_name'] = isset($config['smtp']['from_name']) ? $config['smtp']['from_name'] : 'Republik WkWkWk';
        $config['google']['client_id'] = isset($config['google']['client_id']) ? $config['google']['client_id'] : '';
        $config['google']['client_secret'] = isset($config['google']['client_secret']) ? $config['google']['client_secret'] : '';
        return $config;
    }

    private function send_verification_email($email, $token, $display)
    {
        if (!$this->smtp_configured()) return FALSE;
        $config = $this->auth_config()['smtp'];
        $this->load->library('email');
        $this->email->initialize(array(
            'protocol' => 'smtp', 'smtp_host' => $config['host'], 'smtp_port' => $config['port'],
            'smtp_user' => $config['username'], 'smtp_pass' => $config['password'], 'smtp_crypto' => $config['crypto'],
            'mailtype' => 'html', 'charset' => 'utf-8', 'newline' => "\r\n", 'crlf' => "\r\n", 'validate' => TRUE,
        ));
        $sender = $config['from']; $senderName = $config['from_name'];
        $link = site_url('api?resource=email_verify&token=' . rawurlencode($token));
        $name = htmlspecialchars($display, ENT_QUOTES, 'UTF-8');
        $this->email->from($sender, $senderName);
        $this->email->to($email);
        $this->email->subject('Verifikasi email Republik WkWkWk');
        $this->email->message('<p>Halo ' . $name . ',</p><p>Klik tautan ini untuk mengaktifkan akun warga:</p><p><a href="' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '">Verifikasi email</a></p><p>Tautan berlaku selama 48 jam.</p>');
        return $this->email->send(FALSE);
    }

    private function google_sso($method)
    {
        $this->output->set_header('Cache-Control: no-store');
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        $config = $this->auth_config()['google'];
        $action = (string) $this->input->get('action', TRUE);
        $callback = site_url('api?resource=google_sso&action=callback');
        if (!$config['client_id'] || !$config['client_secret']) {
            return $this->auth_error('Masuk dengan Google belum tersedia. Gunakan email dan kata sandi.', 503);
        }
        if (!$this->database_ready() || !$this->db->table_exists('citizens') || !$this->db->field_exists('google_sub', 'citizens')) return $this->auth_error('Layanan Google sedang disiapkan oleh pengelola republik.', 503);
        if ($action !== 'callback') {
            $state = bin2hex(random_bytes(32));
            $this->session->set_userdata('google_oauth_state', $state);
            $this->session->set_userdata('google_oauth_started', time());
            $query = http_build_query(array('client_id' => $config['client_id'], 'redirect_uri' => $callback, 'response_type' => 'code', 'scope' => 'openid email profile', 'state' => $state, 'prompt' => 'select_account'), '', '&', PHP_QUERY_RFC3986);
            return redirect('https://accounts.google.com/o/oauth2/v2/auth?' . $query);
        }
        $state = (string) $this->input->get('state', TRUE);
        $expected = (string) $this->session->userdata('google_oauth_state');
        $started = (int) $this->session->userdata('google_oauth_started');
        $this->session->unset_userdata('google_oauth_state');
        $this->session->unset_userdata('google_oauth_started');
        if (!$expected || !$state || !hash_equals($expected, $state) || !$started || time() - $started > 600) return $this->auth_error('Sesi masuk dengan Google sudah berakhir atau tidak valid. Mulai lagi dari tombol Google.');
        if ($this->input->get('error')) return $this->auth_error('Masuk dengan Google dibatalkan. Akun Anda belum diubah.');
        $code = (string) $this->input->get('code', TRUE);
        if (!$code) return $this->auth_error('Google tidak mengembalikan kode masuk. Silakan coba lagi.');
        $tokenContext = stream_context_create(array('http' => array('method' => 'POST', 'header' => "Content-Type: application/x-www-form-urlencoded\r\nAccept: application/json\r\n", 'content' => http_build_query(array('code' => $code, 'client_id' => $config['client_id'], 'client_secret' => $config['client_secret'], 'redirect_uri' => $callback, 'grant_type' => 'authorization_code')), 'timeout' => 12, 'ignore_errors' => TRUE)));
        $tokenResponse = @file_get_contents('https://oauth2.googleapis.com/token', FALSE, $tokenContext);
        $token = is_string($tokenResponse) ? json_decode($tokenResponse, TRUE) : NULL;
        if (!is_array($token) || empty($token['access_token']) || !is_string($token['access_token']) || preg_match('/[\r\n]/', $token['access_token'])) return $this->auth_error('Google belum menerima proses masuk. Silakan coba lagi nanti.', 401);
        $userContext = stream_context_create(array('http' => array('method' => 'GET', 'header' => 'Authorization: Bearer ' . $token['access_token'] . "\r\nAccept: application/json\r\n", 'timeout' => 12, 'ignore_errors' => TRUE)));
        $userResponse = @file_get_contents('https://openidconnect.googleapis.com/v1/userinfo', FALSE, $userContext);
        $profile = is_string($userResponse) ? json_decode($userResponse, TRUE) : NULL;
        $this->load->helper('citizen_identity');
        if (!citizen_google_profile_valid($profile)) return $this->auth_error('Akun Google tidak memberikan identitas dan email terverifikasi.', 401);
        if (!$this->database_ready() || !$this->db->table_exists('citizens')) return $this->database_error();
        $email = strtolower($profile['email']);
        $citizen = $this->semesta->find_citizen_by_google_sub($profile['sub']);
        if (!$citizen) {
            $existing = $this->semesta->find_citizen_by_email($email);
            if ($existing) {
                $sameSession = (int) $this->session->userdata('citizen_id') === (int) $existing['id'];
                if (!empty($existing['google_sub']) || $existing['account_type'] === 'admin' || (!$sameSession && !citizen_google_can_link_email($profile))) return $this->auth_error('Email ini sudah memiliki akun. Masuk dengan kata sandi terlebih dahulu, lalu hubungkan Google dari profil.', 409);
                if (empty($existing['is_active'])) return $this->auth_error('Akun warga ini sedang dinonaktifkan. Hubungi admin.', 403);
                if (!$this->semesta->update_citizen($existing['id'], array('google_sub' => $profile['sub']))) return $this->database_error();
                $citizen = $existing;
            }
        }
        if ($citizen) {
            if (empty($citizen['is_active'])) return $this->auth_error('Akun warga ini sedang dinonaktifkan. Hubungi admin.', 403);
            // A Google subject survives an email change. Never transfer the new
            // address's verification claim onto the account's old saved email.
            $sameEmail = strcasecmp((string) $citizen['email'], $email) === 0;
            $verification = $sameEmail ? 1 : 0;
            if ((int) $citizen['email_verified'] !== $verification) {
                $changes = array('email_verified' => $verification);
                if ($sameEmail) $changes += array('verification_token_hash' => NULL, 'verification_expires_at' => NULL);
                if (!$this->semesta->update_citizen($citizen['id'], $changes)) return $this->database_error();
            }
        } else {
            $base = strtolower(substr(strstr($email, '@', TRUE), 0, 22));
            $base = trim(preg_replace('/[^a-z0-9_.-]/', '-', $base), '._-');
            if (strlen($base) < 3) $base = 'warga';
            $username = $base;
            while ($this->semesta->find_citizen_by_username($username)) $username = substr($base, 0, 22) . '-' . strtolower(bin2hex(random_bytes(3)));
            $display = trim(strip_tags(isset($profile['name']) ? $profile['name'] : $username));
            $id = $this->semesta->create_citizen(array('google_sub' => $profile['sub'], 'account_type' => 'citizen', 'username' => $username, 'email' => $email, 'display_name' => mb_substr($display ?: $username, 0, 40), 'password_hash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT), 'email_verified' => 1, 'verification_token_hash' => NULL, 'verification_expires_at' => NULL, 'avatar' => 'warga', 'house' => 'rumah-kayu'));
            if (!$id) return $this->database_error();
            $citizen = $this->semesta->find_citizen_by_email($email);
        }
        if (!$citizen) return $this->database_error();
        $this->session->sess_regenerate(TRUE);
        $this->session->set_userdata('citizen_id', (int) $citizen['id']);
        return redirect(base_url('?signed_in=google'));
    }

    private function verify_email($method)
    {
        $this->output->set_header('Cache-Control: no-store')->set_header('Referrer-Policy: no-referrer')->set_content_type('text/html', 'utf-8');
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->database_ready() || !$this->db->table_exists('citizens')) return $this->database_error();
        $token = (string) $this->input->get('token', TRUE);
        $citizen = preg_match('/^[a-f0-9]{64}$/', $token) ? $this->semesta->find_citizen_by_verification_hash(hash('sha256', $token)) : NULL;
        if (!$citizen) {
            $this->output->set_status_header(400);
            return $this->load->view('email_verification', array(
                'title' => 'Tautan verifikasi tidak berlaku',
                'message' => 'Tautan ini mungkin sudah pernah digunakan atau masa berlakunya habis.',
                'next_step' => 'Kembali ke permainan, masuk dengan username, lalu minta tautan verifikasi baru.',
                'back_url' => base_url(),
                'success' => FALSE,
            ));
        }
        if (!$this->semesta->update_citizen($citizen['id'], array('email_verified' => 1, 'verification_token_hash' => NULL, 'verification_expires_at' => NULL))) return $this->database_error();
        return redirect(base_url('?email_verified=1'));
    }

    private function ideas($method)
    {
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->require_admin()) return;
        if (!$this->database_ready()) return $this->database_error();
        return $this->output->set_output(json_encode($this->semesta->get_ideas(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function save_idea($idea)
    {
        if (!$this->require_admin()) return;
        if (strlen($this->input->raw_input_stream) > 1600) return $this->output->set_status_header(413)->set_output('{"error":"Ukuran ide terlalu besar."}');
        if (!$this->database_ready()) return $this->database_error();

        $name = trim(strip_tags(isset($idea['name']) ? $idea['name'] : ''));
        $comment = trim(strip_tags(isset($idea['comment']) ? $idea['comment'] : ''));
        $platform = trim(strip_tags(isset($idea['platform']) ? $idea['platform'] : ''));
        $status = isset($idea['status']) ? $idea['status'] : 'baru';
        $allowed = array('baru', 'dipilih', 'dipakai', 'disimpan');
        if (strlen($comment) < 3 || strlen($comment) > 500 || strlen($name) > 50 || strlen($platform) > 24 || !in_array($status, $allowed, TRUE)) {
            return $this->output->set_status_header(422)->set_output('{"error":"Nama, platform, komentar, atau status belum valid."}');
        }

        $ok = $this->semesta->save_idea(array('id' => isset($idea['id']) ? $idea['id'] : '', 'name' => $name, 'comment' => $comment, 'platform' => $platform, 'status' => $status));
        if (!$ok) return $this->database_error();
        return $this->output->set_output('{"ok":true,"ideas":' . json_encode($this->semesta->get_ideas(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '}');
    }

    private function save_case($case)
    {
        if (!$this->require_admin()) return;
        if (!$this->database_ready()) return $this->database_error();
        if (!is_array($case) || empty($case['title']) || empty($case['clues']) || !is_array($case['clues'])) {
            return $this->output->set_status_header(422)->set_output('{"error":"Data kasus belum lengkap."}');
        }
        if (strlen($this->input->raw_input_stream) > 20000) return $this->output->set_status_header(413)->set_output('{"error":"Ukuran kasus terlalu besar."}');
        if (!$this->semesta->save_case($case)) return $this->database_error();
        return $this->output->set_output('{"ok":true,"message":"Kasus tersimpan di database lokal."}');
    }

    private function require_admin()
    {
        if (!$this->session->userdata('semesta_admin')) {
            $this->output->set_status_header(401)->set_output('{"error":"Masuk ke panel admin terlebih dahulu."}');
            return FALSE;
        }
        return TRUE;
    }

    private function database_ready()
    {
        return isset($this->db) && $this->db->conn_id !== FALSE;
    }

    private function database_error()
    {
        return $this->output->set_status_header(503)->set_output('{"error":"Database lokal belum siap. Jalankan tools/setup_database.php."}');
    }
}
