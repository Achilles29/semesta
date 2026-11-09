<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Semesta_model extends CI_Model
{
    public function get_world_scene($region)
    {
        $row = $this->db->select('scene_json')->where('region', $region)->get('world_scenes')->row_array();
        if (!$row) return array();
        $objects = json_decode($row['scene_json'], TRUE);
        return is_array($objects) ? $objects : array();
    }

    public function has_world_scene($region)
    {
        return $this->db->where('region', $region)->count_all_results('world_scenes') > 0;
    }

    public function save_world_scene($region, array $objects)
    {
        $json = json_encode($objects, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === FALSE) return FALSE;
        $updated_at = date('Y-m-d H:i:s');
        // A single upsert avoids the SELECT-then-INSERT race when two editor
        // tabs save the same region at nearly the same time.
        $saved = $this->db->query(
            'INSERT INTO world_scenes (region, scene_json, updated_at) VALUES (?, ?, ?) '
            . 'ON DUPLICATE KEY UPDATE scene_json = VALUES(scene_json), updated_at = VALUES(updated_at)',
            array($region, $json, $updated_at)
        );
        if (!$saved) return FALSE;

        // Confirm the value that a fresh page load will read. A successful
        // query call alone is not enough to tell the editor that it persisted.
        $row = $this->db->select('scene_json')->where('region', $region)->get('world_scenes')->row_array();
        return $row && $row['scene_json'] === $json;
    }

    public function get_case($slug = 'kasus-01')
    {
        $row = $this->db->select('payload')->where('slug', $slug)->get('episodes')->row_array();
        return $row ? $row['payload'] : NULL;
    }

    public function save_case(array $case, $slug = 'kasus-01')
    {
        $payload = json_encode($case, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === FALSE) return FALSE;
        $existing = $this->db->select('id')->where('slug', $slug)->get('episodes')->row_array();
        $record = array('title' => substr($case['title'], 0, 160), 'payload' => $payload, 'updated_at' => date('Y-m-d H:i:s'));
        if ($existing) return $this->db->where('id', $existing['id'])->update('episodes', $record);
        $record['slug'] = $slug;
        return $this->db->insert('episodes', $record);
    }

    public function find_citizen_by_email($email)
    {
        return $this->db->where('email', $email)->get('citizens')->row_array();
    }

    public function find_citizen_by_username($username)
    {
        return $this->db->where('username', $username)->get('citizens')->row_array();
    }

    public function find_citizen_by_verification_hash($token_hash)
    {
        return $this->db->where('verification_token_hash', $token_hash)
            ->where('verification_expires_at >', date('Y-m-d H:i:s'))
            ->get('citizens')->row_array();
    }

    public function create_citizen(array $citizen)
    {
        $citizen['created_at'] = date('Y-m-d H:i:s');
        $citizen['updated_at'] = $citizen['created_at'];
        return $this->db->insert('citizens', $citizen) ? $this->db->insert_id() : FALSE;
    }

    public function get_citizen($id)
    {
        $row = $this->db->select('id, username, email, display_name, email_verified, avatar, house, created_at')->where('id', (int) $id)->get('citizens')->row_array();
        return $row ?: NULL;
    }

    public function get_citizen_profile($id)
    {
        $row = $this->db->select('id, account_type, username, email, display_name, email_verified, avatar, avatar_config, house, gender, religion, birth_province, birth_city, birth_date, occupation, education_level, domicile_province, domicile_city, created_at')->where('id', (int) $id)->get('citizens')->row_array();
        return $row ?: NULL;
    }

    public function update_citizen($id, array $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->db->where('id', (int) $id)->update('citizens', $data);
    }

    public function get_app_setting($key, $default = NULL)
    {
        $row = $this->db->select('setting_value')->where('setting_key', $key)->get('app_settings')->row_array();
        return $row ? $row['setting_value'] : $default;
    }

    public function set_app_setting($key, $value)
    {
        $existing = $this->db->select('setting_key')->where('setting_key', $key)->get('app_settings')->row_array();
        $record = array('setting_value' => (string) $value, 'updated_at' => date('Y-m-d H:i:s'));
        if ($existing) return $this->db->where('setting_key', $key)->update('app_settings', $record);
        $record['setting_key'] = $key;
        return $this->db->insert('app_settings', $record);
    }

    public function get_ideas()
    {
        $rows = $this->db->order_by('id', 'DESC')->get('citizen_ideas')->result_array();
        return array_map(function ($row) {
            return array(
                'id' => $row['public_id'], 'name' => $row['name'], 'comment' => $row['comment'],
                'platform' => $row['platform'], 'status' => $row['status'],
                'createdAt' => $row['created_at'], 'updatedAt' => $row['updated_at'],
            );
        }, $rows);
    }

    public function save_idea(array $idea)
    {
        $record = array(
            'name' => $idea['name'], 'comment' => $idea['comment'],
            'platform' => $idea['platform'], 'status' => $idea['status'],
            'updated_at' => date('Y-m-d H:i:s'),
        );
        if (!empty($idea['id'])) {
            $exists = $this->db->select('id')->where('public_id', $idea['id'])->get('citizen_ideas')->row_array();
            if ($exists) return $this->db->where('id', $exists['id'])->update('citizen_ideas', $record);
        }
        $record['public_id'] = uniqid('ide-', TRUE);
        $record['created_at'] = date('Y-m-d H:i:s');
        return $this->db->insert('citizen_ideas', $record);
    }
}
