<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/** A game membership card, deliberately independent of legal identity data. */
function citizen_identity_card(array $citizen, $occupationLabel = '')
{
    $email = (string) ($citizen['email'] ?? '');
    $verified = (int) ($citizen['email_verified'] ?? 0) === 1 && !preg_match('/@(local|legacy)\.invalid$/i', $email);
    return array(
        'number' => 'RW-' . str_pad((string) $citizen['id'], 8, '0', STR_PAD_LEFT),
        'displayName' => (string) $citizen['display_name'],
        'occupation' => $occupationLabel ?: 'Belum memilih profesi',
        'joinedAt' => substr((string) $citizen['created_at'], 0, 10),
        'verification' => $verified ? 'email-verified' : 'unverified',
        'avatarConfig' => isset($citizen['avatar_config']) ? json_decode($citizen['avatar_config'], TRUE) : NULL,
    );
}

function citizen_profile_complete(array $citizen)
{
    if (!is_string($citizen['gender'] ?? NULL) || !preg_match('/^[a-z0-9_-]{1,32}$/D', $citizen['gender'])
        || !is_string($citizen['occupation'] ?? NULL) || !preg_match('/^[a-z0-9_-]{1,48}$/D', $citizen['occupation'])
        || !is_string($citizen['avatar_config'] ?? NULL)) return FALSE;
    if (!function_exists('validate_avatar_v15')) require_once __DIR__ . '/avatar_v15_helper.php';
    return validate_avatar_v15(json_decode($citizen['avatar_config'], TRUE)) !== FALSE;
}

function citizen_google_profile_valid($profile)
{
    return is_array($profile) && isset($profile['sub'], $profile['email'], $profile['email_verified'])
        && is_string($profile['sub']) && preg_match('/^[A-Za-z0-9_-]{1,255}$/D', $profile['sub'])
        && is_string($profile['email']) && strlen($profile['email']) <= 190 && filter_var($profile['email'], FILTER_VALIDATE_EMAIL)
        && in_array($profile['email_verified'], array(TRUE, 'true', 1, '1'), TRUE);
}

/** Google is authoritative for Gmail and verified Workspace email, not every third-party address. */
function citizen_google_can_link_email(array $profile)
{
    return citizen_google_profile_valid($profile) && (preg_match('/@gmail\.com$/i', $profile['email']) || !empty($profile['hd']));
}
