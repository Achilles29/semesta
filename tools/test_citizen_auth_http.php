<?php
// Explicit local fixture: refuses remote hosts and any email-required environment.
// Creates one .invalid test account and deletes that exact account in finally.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$base = rtrim($argv[1] ?? 'http://localhost/project', '/') . '/api';
if (!in_array(parse_url($base, PHP_URL_HOST), array('localhost','127.0.0.1'), TRUE)) throw new RuntimeException('Local endpoint required.');
define('BASEPATH', __DIR__); define('APPPATH', dirname(__DIR__) . '/application/'); define('ENVIRONMENT', 'testing');
require APPPATH . 'config/database.php';
$cfg=$db['default'];mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$connection=new mysqli($cfg['hostname'],$cfg['username'],$cfg['password'],$cfg['database'],$cfg['port']??3306);
$cookie=tempnam(sys_get_temp_dir(),'semesta-auth-fixture-');
function request_fixture($resource, $payload=NULL) {
    global $base,$cookie;
    $curl=curl_init($base.($payload===NULL?'?resource='.rawurlencode($resource):''));
    curl_setopt_array($curl,array(CURLOPT_RETURNTRANSFER=>TRUE,CURLOPT_COOKIEFILE=>$cookie,CURLOPT_COOKIEJAR=>$cookie,CURLOPT_TIMEOUT=>20,CURLOPT_HTTPHEADER=>array('Accept: application/json','Content-Type: application/json')));
    if($payload!==NULL){curl_setopt($curl,CURLOPT_POST,TRUE);curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode(array('resource'=>$resource)+$payload));}
    $raw=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_RESPONSE_CODE);curl_close($curl);
    $data=json_decode($raw,TRUE);if(!is_array($data))throw new RuntimeException('Non-JSON local API response (HTTP '.$status.').');
    return array($status,$data);
}
function require_fixture($condition,$message){if(!$condition)throw new RuntimeException($message);}
$username='authfixture_'.bin2hex(random_bytes(5));$email=$username.'@example.invalid';$id=0;
try {
    list($status,$options)=request_fixture('auth_options');
    require_fixture($status===200 && !$options['emailVerificationRequired'],'Fixture requires a local open email gate; never sends mail.');
    $presets=json_decode(file_get_contents(dirname(__DIR__).'/game-src/avatar-v15-presets.json'),TRUE);
    $config=$presets[1]['config'];
    $registration=array('action'=>'register','username'=>$username,'email'=>$email,'password'=>'fixture-password-123','displayName'=>'Warga Fixture','gender'=>'perempuan','occupation'=>'guru','avatar'=>'guru','house'=>'rumah-bata','avatarConfig'=>$config);
    list($status,$result)=request_fixture('citizen',$registration);
    require_fixture($status===201,'Registration failed (HTTP '.$status.').');$id=(int)$result['citizen']['id'];
    $number=$result['citizen']['identity_card']['number'];
    require_fixture($result['citizen']['profile_complete'] && $result['citizen']['identity_card']['verification']==='unverified','Registration completeness/verification wrong.');
    list($status,$result)=request_fixture('citizen');require_fixture($result['citizen']['id']==$id,'Session profile missing.');
    $update=$registration;$update['action']='update';$update['displayName']='Nama Baru Fixture';unset($update['avatarConfig']);
    list($status,$result)=request_fixture('citizen',$update);require_fixture($status===200 && $result['citizen']['identity_card']['number']===$number,'Card ID changed on profile edit.');
    require_fixture(json_decode($result['citizen']['avatar_config'],TRUE)===$config,'Profile edit replaced chosen avatar.');
    $newConfig=$config;$newConfig['appearance']['hairColor']='silver';$update['avatarConfig']=$newConfig;
    list($status,$result)=request_fixture('citizen',$update);
    require_fixture($status===200 && json_decode($result['citizen']['avatar_config'],TRUE)===$newConfig,'Explicit avatar draft did not persist on profile save.');
    request_fixture('citizen',array('action'=>'logout'));list($status,$result)=request_fixture('citizen');require_fixture($result['citizen']===NULL,'Logout left session active.');
    list($status,$result)=request_fixture('citizen',array('action'=>'login','username'=>$email,'password'=>'fixture-password-123'));
    require_fixture($status===200 && $result['citizen']['identity_card']['number']===$number && $result['citizen']['display_name']==='Nama Baru Fixture','Email login did not restore saved card/profile.');
    require_fixture(json_decode($result['citizen']['avatar_config'],TRUE)===$newConfig,'A fresh session did not restore the newly saved avatar.');
    // Exercise the installed CodeIgniter routing/loader/session, in addition to
    // the isolated concurrency suite. Only this exact temporary account changes.
    list($status,$home)=request_fixture('citizen_home');require_fixture($status===200 && $home['playerId']===$id && $home['mission']['status']==='not_started','Own room reservation missing.');
    $homeAction=function($action,$extra=array())use(&$home){
        list($status,$result)=request_fixture('citizen_home',array_merge(array('action'=>$action,'requestId'=>'localhome_'.bin2hex(random_bytes(12)),'csrfToken'=>$home['csrfToken']),$extra));
        require_fixture($status===200,'Home action '.$action.' failed (HTTP '.$status.').');$home=$result;return $result;
    };
    request_fixture('citizen_chat',array('action'=>'sync','destination'=>'republic','region'=>'world','x'=>9,'z'=>6));$homeAction('accept_delivery');
    usleep(2100000);
    request_fixture('citizen_chat',array('action'=>'sync','destination'=>'republic','region'=>'world','x'=>38,'z'=>3));$homeAction('deliver');
    require_fixture($home['inventory']['welcomePlant']===1 && $home['home']['unlocked'],'Delivery reward missing.');$homeAction('enter_home');
    list($status,$presence)=request_fixture('citizen_chat',array('action'=>'sync','destination'=>'republic','region'=>'world','x'=>38,'z'=>3));require_fixture($status===200 && $presence['privateMode'] && !$presence['canChat'],'Private room still publishes public presence.');
    $homeAction('place_decoration',array('slotId'=>'welcome-shelf'));list($status,$home)=request_fixture('citizen_home');
    require_fixture($home['home']['inside'] && $home['home']['decorationPlaced'] && $home['inventory']['welcomePlant']===0,'Reload did not restore room and shelf.');
    $homeAction('leave_home');request_fixture('citizen',array('action'=>'logout'));
    list($status,$result)=request_fixture('citizen',array('action'=>'login','username'=>$username,'password'=>'fixture-password-123'));require_fixture($status===200,'Second login failed.');
    list($status,$home)=request_fixture('citizen_home');require_fixture($status===200 && $home['mission']['status']==='completed' && $home['home']['decorationPlaced'] && !$home['home']['inside'],'Fresh login lost persistent progress or reused old interior mode.');
    request_fixture('citizen',array('action'=>'logout'));
    echo "PASS localhost HTTP/DB: registration, reload, profile/avatar/card, logout/login, room reservation, NPC delivery, reward, private presence, shelf, fresh-session persistence. No email or OAuth request sent.\n";
} finally {
    // Exact fixture key guards cleanup even if registration failed before ID was returned.
    $lookup=$connection->prepare("SELECT id FROM citizens WHERE username=? AND email=? AND account_type='citizen'");$lookup->bind_param('ss',$username,$email);$lookup->execute();
    $fixtureRow=$lookup->get_result()->fetch_assoc();
    if($fixtureRow){$fixtureId=(int)$fixtureRow['id'];foreach(array('citizen_home_requests','citizen_home_ledger','citizen_homes','citizen_presence') as $table){$cleanup=$connection->prepare('DELETE FROM '.$table.' WHERE citizen_id=?');$cleanup->bind_param('i',$fixtureId);$cleanup->execute();}}
    $statement=$connection->prepare("DELETE FROM citizens WHERE username=? AND email=? AND account_type='citizen'");
    $statement->bind_param('ss',$username,$email);$statement->execute();
    if(is_file($cookie))unlink($cookie);
    $connection->close();
}
