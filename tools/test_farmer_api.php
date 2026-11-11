<?php
// Offline controller tests: fake session/repository, no real DB, no HTTP auth changes.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH', __DIR__);
define('APPPATH', dirname(__DIR__) . '/application/');
class CI_Controller { public $session, $db, $semesta, $output, $load, $input; }
require APPPATH . 'controllers/Api.php';
require APPPATH . 'helpers/farmer_avatar_helper.php';
class AvatarTestOutput {
    public $status = 200, $body = '';
    function set_status_header($status) { $this->status=$status; return $this; }
    function set_output($body) { $this->body=$body; return $this; }
}
class AvatarTestSession {
    public $id=7, $admin=TRUE;
    function userdata($key) { return $key==='citizen_id' ? $this->id : ($key==='semesta_admin' ? $this->admin : NULL); }
}
class AvatarTestDatabase {
    public $conn_id=TRUE, $active=1;
    function table_exists($name) { return TRUE; }
    function select($value) { return $this; }
    function where($key,$value) { return $this; }
    function get($table) { return $this; }
    function row_array() { return array('is_active'=>$this->active); }
}
class AvatarTestRepository {
    public $profile=array(), $settings=array();
    function update_citizen($id,$fields) { $this->profile=$fields; return TRUE; }
    function get_citizen_profile($id) { return $this->profile; }
    function set_app_setting($key,$value) { $this->settings[$key]=$value; return TRUE; }
}
class AvatarTestLoader { function helper($name) {} }
function check($ok,$message) { if (!$ok) throw new RuntimeException($message); }
function call_avatar($method,$payload,$mode='normal') {
    $api=(new ReflectionClass('Api'))->newInstanceWithoutConstructor();
    $api->session=new AvatarTestSession(); $api->db=new AvatarTestDatabase();
    $api->semesta=new AvatarTestRepository(); $api->output=new AvatarTestOutput();
    $api->load=new AvatarTestLoader(); $api->input=(object)array('raw_input_stream'=>json_encode($payload));
    if ($mode==='guest') { $api->session->id=0; $api->session->admin=FALSE; }
    if ($mode==='inactive') $api->db->active=0;
    $fn=new ReflectionMethod('Api',$method); $fn->setAccessible(TRUE); $fn->invoke($api,$payload);
    return $api;
}
$legacy=array('skin'=>'sawo','hair'=>'pendek','hairColor'=>'coklat','top'=>'petani','bottom'=>'jeans','headwear'=>'topi','accessory'=>'tas-anyaman','facialHair'=>'tanpa','special'=>'farmer-ps2');
$v11=$legacy; $v11['farmer']=validate_farmer_appearance(array('bodyFrame'=>'female','bodyType'=>'plus','outfit'=>'kebaya','bottomStyle'=>'skirt','colors'=>array('skin'=>'#804422')));
$payload=array('action'=>'update_avatar','avatarConfig'=>$v11);
$valid=call_avatar('citizen_action',$payload);
check($valid->output->status===200,'Citizen save failed');
check(json_decode($valid->semesta->profile['avatar_config'],TRUE)===$v11,'Citizen config lost V11 fields');
check(call_avatar('citizen_action',$payload,'guest')->output->status===401,'Guest must be rejected');
check(call_avatar('citizen_action',$payload,'inactive')->output->status===403,'Inactive account must be rejected');
foreach (array('bodyType'=>'invalid','outfit'=>array(),'colors'=>array('skin'=>'red')) as $key=>$value) {
    $invalid=$payload; $invalid['avatarConfig']['farmer'][$key]=$value;
    $result=call_avatar('citizen_action',$invalid);
    check($result->output->status===422 && !$result->semesta->profile,'Invalid citizen config was saved');
}
$old=call_avatar('citizen_action',array('action'=>'update_avatar','avatarConfig'=>$legacy));
check(json_decode($old->semesta->profile['avatar_config'],TRUE)===$legacy,'Old farmer configuration changed');
unset($legacy['special']);
check(call_avatar('citizen_action',array('action'=>'update_avatar','avatarConfig'=>$legacy))->output->status===200,'Legacy modular avatar broken');
$catalog=array('presets'=>array(array('id'=>'v11-test','name'=>'Tes V11','config'=>$v11)));
$result=call_avatar('save_avatar_library',$catalog);
check($result->output->status===200,'Studio save failed');
check(json_decode($result->semesta->settings['avatar_library'],TRUE)[0]['config']===$v11,'Studio config lost V11 fields');
check(call_avatar('save_avatar_library',$catalog,'guest')->output->status===401,'Guest studio save must fail');
$catalog['presets'][0]['config']['farmer']['headwear']='invalid';
check(call_avatar('save_avatar_library',$catalog)->output->status===422,'Invalid studio config must fail');
echo "PASS: citizen and studio controllers preserve V11; legacy accepted; unauthorized/inactive/invalid requests rejected. Offline fixture only; real login/DB persistence not tested.\n";
