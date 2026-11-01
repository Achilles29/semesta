<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Semesta_model extends CI_Model
{
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
