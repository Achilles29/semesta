<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/** Same catalog as the browser; never persist unsupported parts or model IDs. */
function validate_avatar_v15($config)
{
    static $catalog = NULL;
    if ($catalog === NULL) $catalog = json_decode(file_get_contents(FCPATH . 'game-src/avatar-v15-catalog.json'), TRUE);
    if (!is_array($config) || ($config['model'] ?? '') !== 'v15') return FALSE;
    if (!isset($config['profileId']) || !in_array($config['profileId'], array_column($catalog['profiles'], 'id'), TRUE)) return FALSE;
    if (!isset($config['appearance']) || !is_array($config['appearance'])) return FALSE;
    $appearance = array();
    foreach ($catalog['fields'] as $key => $field) $appearance[$key] = $field['default'];
    foreach ($config['appearance'] as $key => $value) {
        if (!isset($catalog['fields'][$key]) || !is_string($value) || !array_key_exists($value, $catalog['fields'][$key]['options'])) return FALSE;
        $appearance[$key] = $value;
    }
    $clean = array('model' => 'v15', 'profileId' => $config['profileId'], 'appearance' => $appearance);
    if (isset($config['presetId'])) {
        if (!is_string($config['presetId']) || !preg_match('/^[a-zA-Z0-9_-]{1,80}$/D', $config['presetId'])) return FALSE;
        $clean['presetId'] = $config['presetId'];
    }
    return $clean;
}
