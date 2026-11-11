<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/** Shared schema with the browser; reject unsupported choices, never save raw input. */
function validate_farmer_appearance($input)
{
    if (!is_array($input)) return FALSE;
    $schema = json_decode(file_get_contents(dirname(APPPATH) . '/game-src/avatar-farmer-schema.json'), TRUE);
    if (!is_array($schema)) return FALSE;
    $clean = array();
    foreach ($schema['fields'] as $key => $field) {
        $value = array_key_exists($key, $input) ? $input[$key] : $field['default'];
        if (!is_string($value) || !array_key_exists($value, $field['options'])) return FALSE;
        $clean[$key] = $value;
    }
    if (array_key_exists('colors', $input) && !is_array($input['colors'])) return FALSE;
    $colors = $input['colors'] ?? array();
    $clean['colors'] = array();
    foreach ($schema['colors'] as $key => $field) {
        $value = array_key_exists($key, $colors) ? $colors[$key] : $field['default'];
        if (!is_string($value) || !preg_match('/^#[0-9a-f]{6}$/iD', $value)) return FALSE;
        $clean['colors'][$key] = strtolower($value);
    }
    return $clean;
}
