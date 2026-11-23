<?php
// Offline controller contracts; SMTP is unavailable and no provider request is made.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH', __DIR__); define('FCPATH', dirname(__DIR__) . '/');
class CI_Controller { public $session, $db, $semesta, $output, $load, $input, $config; }
require FCPATH . 'application/controllers/Api.php';
require FCPATH . 'application/helpers/avatar_v15_helper.php';
class AuthOutput { public $status=200,$body=''; function set_header($s){return $this;} function set_content_type(...$args){return $this;} function set_status_header($s){$this->status=$s;return $this;} function set_output($s){$this->body=$s;return $this;} }
class AuthSession { public $values=array(),$regenerated=FALSE; function userdata($k){return $this->values[$k]??NULL;} function set_userdata($k,$v){$this->values[$k]=$v;} function unset_userdata($k){unset($this->values[$k]);} function sess_regenerate($v){$this->regenerated=TRUE;} }
class AuthDb { public $conn_id=TRUE,$active=1; function table_exists($n){return TRUE;} function select($v){return $this;} function where($k,$v){return $this;} function get($n){return $this;} function row_array(){return array('is_active'=>$this->active);} function count_all_results($t){return 1;} function field_exists($f,$t){return TRUE;} }
class AuthRepo {
    public $row=NULL,$required='0';
    function find_citizen_by_username($u){return $this->row && $this->row['username']===$u?$this->row:NULL;}
    function find_citizen_by_email($e){return $this->row && $this->row['email']===$e?$this->row:NULL;}
    function find_citizen_by_verification_hash($h){return $this->row && ($this->row['verification_token_hash']??NULL)===$h && strtotime($this->row['verification_expires_at'])>time()?$this->row:NULL;}
    function create_citizen($r){$this->row=$r+array('id'=>9,'is_active'=>1);return 9;}
    function get_citizen_profile($id){$r=$this->row;unset($r['password_hash']);return $r;}
    function update_citizen($id,$r){$this->row=array_replace($this->row,$r);return TRUE;}
    function get_app_setting($k,$d){return $this->required;}
}
class AuthLoad { public $view=NULL; function helper($n){} function view($name,$data){$this->view=$data;return $data;} }
class AuthInput { public $query=array(); function get($k,...$args){return $this->query[$k]??NULL;} }
class AuthConfig { function load(...$args){} function item(...$args){return '';} }
function check_auth($ok,$message){if(!$ok)throw new RuntimeException($message);}
function api_fixture(){
    $a=(new ReflectionClass('Api'))->newInstanceWithoutConstructor();$a->output=new AuthOutput();$a->session=new AuthSession();$a->db=new AuthDb();$a->semesta=new AuthRepo();$a->load=new AuthLoad();$a->config=new AuthConfig();$a->input=new AuthInput();return $a;
}
function action($a,$payload){$a->output=new AuthOutput();$fn=new ReflectionMethod('Api','citizen_action');$fn->setAccessible(TRUE);$fn->invoke($a,$payload);return $a->output;}
foreach(array('SEMESTA_SMTP_HOST','SEMESTA_SMTP_USER','SEMESTA_SMTP_PASSWORD','SEMESTA_MAIL_FROM','SEMESTA_ADMIN_USERNAME','SEMESTA_ADMIN_PASSWORD_HASH') as $key)putenv($key.'=');
putenv('SEMESTA_AUTH_CONFIG_FILE='.__DIR__.'/nonexistent-auth-fixture.php');
$preset=json_decode(file_get_contents(FCPATH.'game-src/avatar-v15-presets.json'),TRUE)[0]['config'];
$registration=array('action'=>'register','username'=>'fixture','email'=>'fixture@example.invalid','password'=>'fixture-password-123','displayName'=>'Fixture Warga','gender'=>'laki-laki','occupation'=>'petani','avatar'=>'petani','house'=>'rumah-kayu','avatarConfig'=>$preset);
$a=api_fixture();check_auth(action($a,$registration)->status===201,'Valid registration failed');
check_auth($a->semesta->row['email_verified']===0,'Gate-disabled registration falsely verified email');
check_auth($a->session->regenerated && $a->session->userdata('citizen_id')===9,'Registration did not rotate and establish session');
check_auth(action($a,array('action'=>'login','username'=>'fixture@example.invalid','password'=>'fixture-password-123'))->status===200,'Email login should work with gate off');
$a->semesta->required='1';check_auth(action($a,array('action'=>'login','username'=>'fixture','password'=>'fixture-password-123'))->status===403,'Unverified login bypassed required verification');
$a->semesta->required='0';check_auth(action($a,array('action'=>'login','username'=>'fixture','password'=>'incorrect-password'))->status===401,'Wrong password accepted');
check_auth(action($a,$registration)->status===409,'Duplicate registration accepted');
foreach(array('gender','occupation','avatarConfig') as $field){$bad=$registration;unset($bad[$field]);$b=api_fixture();check_auth(action($b,$bad)->status===422 && !$b->semesta->row,'Missing onboarding field was stored: '.$field);}
$b=api_fixture();$b->semesta->required='1';check_auth(action($b,$registration)->status===503 && !$b->semesta->row,'SMTP-unavailable registration created trapped account');
$a->semesta->row['verification_token_hash']='oldhash';$a->semesta->row['verification_expires_at']='2027-01-01 00:00:00';
check_auth(action($a,array('action'=>'resend','email'=>'fixture@example.invalid'))->status===503,'Unconfigured SMTP should be reported');
check_auth($a->semesta->row['verification_token_hash']==='oldhash','Failed resend invalidated old token');
check_auth(action($a,array('action'=>'resend','email'=>'fixture@example.invalid'))->status===429,'Resend cooldown missing');
$bad=$registration;$bad['email']=array('bad');check_auth(action(api_fixture(),$bad)->status===422,'Malformed payload should be rejected');
$a->session->set_userdata('citizen_id',9);$a->db->active=0;check_auth(action($a,array('action'=>'update_avatar','avatarConfig'=>$preset))->status===403,'Inactive citizen changed avatar');
function base_url($p=''){return 'http://localhost/project/'.$p;}
function site_url($p=''){return base_url($p);}
function redirect($url){$GLOBALS['fixture_redirect']=$url;return $url;}
function invoke_auth($a,$method){$a->output=new AuthOutput();$fn=new ReflectionMethod('Api',$method);$fn->setAccessible(TRUE);$fn->invoke($a,'GET');}
putenv('SEMESTA_GOOGLE_CLIENT_ID=fixture-client');putenv('SEMESTA_GOOGLE_CLIENT_SECRET=fixture-secret');
$g=api_fixture();invoke_auth($g,'google_sso');
parse_str(parse_url($GLOBALS['fixture_redirect'],PHP_URL_QUERY),$query);
check_auth($query['state']===$g->session->userdata('google_oauth_state') && strlen($query['state'])===64,'OAuth state missing');
check_auth($query['redirect_uri']==='http://localhost/project/api?resource=google_sso&action=callback','OAuth redirect differs from callback endpoint');
$g->input->query=array('action'=>'callback','state'=>'invalid');invoke_auth($g,'google_sso');
check_auth($g->output->status===400 && !$g->session->userdata('google_oauth_state'),'OAuth mismatch was not rejected and consumed');
foreach(array('expired','cancelled') as $case){
    $g=api_fixture();$g->session->set_userdata('google_oauth_state','fixture-state');$g->session->set_userdata('google_oauth_started',time()-($case==='expired'?601:0));
    $g->input->query=array('action'=>'callback','state'=>'fixture-state','error'=>'access_denied');invoke_auth($g,'google_sso');
    check_auth($g->output->status===400 && !$g->session->userdata('google_oauth_state'),'Expired/cancelled OAuth should fail before network');
}
$v=api_fixture();$v->semesta->row=$a->semesta->row;$token=str_repeat('a',64);$v->input->query=array('token'=>$token);
$v->semesta->row['verification_token_hash']=hash('sha256',$token);$v->semesta->row['verification_expires_at']=date('Y-m-d H:i:s',time()+3600);
invoke_auth($v,'verify_email');check_auth($v->semesta->row['email_verified']===1 && $v->semesta->row['verification_token_hash']===NULL,'Email token was not verified and consumed');
invoke_auth($v,'verify_email');check_auth($v->output->status===400,'Email token replay succeeded');
echo "PASS offline auth: registration, email login, password rejection, verification gate, required profile, duplicate identity, unavailable mail, resend cooldown, malformed input, inactive account.\n";
echo "PASS offline OAuth: random state, matching callback URI, state mismatch/expiry/cancellation; email verification consumes token and rejects replay. No provider requests.\n";
