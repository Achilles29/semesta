<?php
// Pure fixtures: no database, mail, OAuth requests, or live accounts are touched.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH', __DIR__);
define('FCPATH', dirname(__DIR__) . '/');
require FCPATH . 'application/helpers/citizen_identity_helper.php';
require_once FCPATH . 'application/helpers/avatar_v15_helper.php';
function expect($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$presets = json_decode(file_get_contents(FCPATH . 'game-src/avatar-v15-presets.json'), TRUE);
$row = array('id'=>27,'display_name'=>'Warga <uji>','email'=>'citizen@example.test','email_verified'=>0,'occupation'=>'guru','gender'=>'perempuan','avatar_config'=>json_encode($presets[0]['config']),'created_at'=>'2026-11-23 12:00:00','religion'=>'private','birth_date'=>'1980-01-01','domicile_city'=>'private','password_hash'=>'never-public');
$card = citizen_identity_card($row, 'Guru');
expect($card['number'] === 'RW-00000027', 'Card must derive from the persistent account');
expect(array_keys($card) === array('number','displayName','occupation','joinedAt','verification','avatarConfig'), 'Only game identity fields may enter the card');
expect($card['verification'] === 'unverified', 'An open email gate must not claim verification');
$row['email_verified'] = 1;
expect(citizen_identity_card($row)['verification'] === 'email-verified', 'Verified email status missing');
$row['email']='admin@local.invalid';
expect(citizen_identity_card($row)['verification'] === 'unverified', 'Internal placeholder email is not verified email');
expect(citizen_profile_complete($row), 'Complete citizen is marked incomplete');
$row['avatar_config']=NULL;
expect(!citizen_profile_complete($row), 'Google first login must require avatar completion');
$row['avatar_config']='{"model":"v15","profileId":"invented","appearance":{}}';
expect(!citizen_profile_complete($row), 'Invalid avatar JSON must require profile completion');
$profile = array('sub'=>'google-sub-123','email'=>'warga@gmail.com','email_verified'=>TRUE);
expect(citizen_google_profile_valid($profile) && citizen_google_can_link_email($profile), 'Verified Gmail should be linkable');
$profile['email']='warga@third-party.test';
expect(citizen_google_profile_valid($profile) && !citizen_google_can_link_email($profile), 'Third-party Google email requires existing-account challenge');
$profile['hd']='workspace.test';
expect(citizen_google_can_link_email($profile), 'Verified Workspace should be linkable');
unset($profile['sub']);
expect(!citizen_google_profile_valid($profile), 'Google stable subject is required');
echo "PASS identity projection, stable card, privacy, truthful verification, profile completion, Google subject and email-link policy.\n";
