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
        if ($method === 'POST' && is_array($payload) && isset($payload['resource']) && $payload['resource'] === 'ideas') {
            return $this->save_idea($payload);
        }
        if ($resource === 'ideas') return $this->ideas($method);
        if ($method === 'POST') return $this->save_case($payload);
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');

        if (!$this->database_ready()) return $this->database_error();
        $case = $this->semesta->get_case();
        if ($case === NULL) return $this->output->set_status_header(404)->set_output('{"error":"Episode belum tersedia di database."}');
        return $this->output->set_output($case);
    }

    private function ideas($method)
    {
        if ($method !== 'GET') return $this->output->set_status_header(405)->set_output('{"error":"Metode tidak didukung."}');
        if (!$this->require_local_editor()) return;
        if (!$this->database_ready()) return $this->database_error();
        return $this->output->set_output(json_encode($this->semesta->get_ideas(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function save_idea($idea)
    {
        if (!$this->require_local_editor()) return;
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
        if (!$this->require_local_editor()) return;
        if (!$this->database_ready()) return $this->database_error();
        if (!is_array($case) || empty($case['title']) || empty($case['clues']) || !is_array($case['clues'])) {
            return $this->output->set_status_header(422)->set_output('{"error":"Data kasus belum lengkap."}');
        }
        if (strlen($this->input->raw_input_stream) > 20000) return $this->output->set_status_header(413)->set_output('{"error":"Ukuran kasus terlalu besar."}');
        if (!$this->semesta->save_case($case)) return $this->database_error();
        return $this->output->set_output('{"ok":true,"message":"Kasus tersimpan di database lokal."}');
    }

    private function require_local_editor()
    {
        $remote = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
        if (!in_array($remote, array('127.0.0.1', '::1'), TRUE)) {
            $this->output->set_status_header(403)->set_output('{"error":"Panel admin hanya tersedia dari komputer lokal."}');
            return FALSE;
        }
        if (!$this->session->userdata('semesta_admin')) {
            $this->output->set_status_header(401)->set_output('{"error":"Masuk ke ruang editor terlebih dahulu."}');
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
