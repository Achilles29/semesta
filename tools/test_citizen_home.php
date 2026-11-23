<?php
// Real MySQL + actual controller/model through a test-only HTTP/session adapter.
// All writes use a randomly named scratch database, never the configured world.
if (!in_array(PHP_SAPI,array('cli','cli-server'),TRUE)) { http_response_code(404); exit; }
require __DIR__.'/test_republic_world_support.php';
require APPPATH.'helpers/citizen_home_helper.php';
require APPPATH.'models/Citizen_home_model.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

class HomeTestDb extends WorldTestDb {
    private $fields='*',$conditions=array(),$params=array();
    function select($fields){$this->fields=$fields;return $this;}
    function where($key,$value){$this->conditions[]=$key.'=?';$this->params[]=$value;return $this;}
    function get($table){$sql='SELECT '.$this->fields.' FROM '.$table.($this->conditions?' WHERE '.implode(' AND ',$this->conditions):'');$params=$this->params;$this->fields='*';$this->conditions=$this->params=array();return $this->query($sql,$params);}
    function delete($table,$where){$parts=array();$params=array();foreach($where as $key=>$value){$parts[]=$key.'=?';$params[]=$value;}return $this->query('DELETE FROM '.$table.' WHERE '.implode(' AND ',$parts),$params);}
}
class HomeTestSession extends WorldTestSession { function unset_userdata($key){unset($_SESSION[$key]);} }
function home_schema($connection){$connection->multi_query(file_get_contents(dirname(__DIR__).'/database/migrations/20261123_citizen_home.sql'));do{if($result=$connection->store_result())$result->free();}while($connection->more_results()&&$connection->next_result());}

$fixturePath=getenv('CITIZEN_HOME_TEST_CONFIG');
if(PHP_SAPI==='cli-server' || (($argv[1]??'')==='--worker')) {
    if(!$fixturePath || !is_file($fixturePath)){http_response_code(404);exit;}
    $fixture=json_decode(file_get_contents($fixturePath),TRUE);
    if(!preg_match('/^citizen_home_test_[a-f0-9]{12}$/D',$fixture['database']))exit(2);
    $GLOBALS['worldTestDb']=new HomeTestDb($fixture);
    if(PHP_SAPI==='cli-server'){
        if(($_SERVER['REMOTE_ADDR']??'')!=='127.0.0.1' || !hash_equals($fixture['nonce'],$_SERVER['HTTP_X_FIXTURE_NONCE']??'')){http_response_code(404);exit;}
        session_save_path($fixture['sessionDir']);session_start();header('Content-Type: application/json');
        if(isset($_GET['fixture_login'])){$_SESSION=array();$who=$_GET['fixture_login'];if(in_array($who,array('1','2','3','4'),TRUE))$_SESSION['citizen_id']=(int)$who;echo '{"ok":true}';exit;}
        $api=(new ReflectionClass('Api'))->newInstanceWithoutConstructor();$api->db=$GLOBALS['worldTestDb'];$api->session=new HomeTestSession();$api->output=new WorldTestOutput();$api->input=new WorldTestInput();$api->load=new WorldTestLoad($api);
        $api->index();http_response_code($api->output->status);echo $api->output->body;exit;
    }
    $model=new Citizen_home_model();$id=(int)$argv[2];$action=$argv[3];$sessionHash=$argv[4];$requestId=$argv[5];
    while(microtime(TRUE)<(float)$argv[6])usleep(1000);
    try{
        if($action==='presence')$result=array('allowed'=>$model->sync_public_presence($id,$sessionHash,'republic','world',38,3));
        else{$payload=array('action'=>$action,'requestId'=>$requestId);if(in_array($action,array('place_decoration','remove_decoration'),TRUE))$payload['slotId']='welcome-shelf';$result=$model->act($id,$sessionHash,$payload);}
        echo json_encode(array('status'=>200,'result'=>$result));
    }catch(Citizen_home_error $error){echo json_encode(array('status'=>$error->status,'code'=>$error->error_code));}
    exit;
}

$checks=0;$files=array();$workers=array();$server=NULL;$connection=NULL;$scratch=NULL;$sessionDir=NULL;
function check_home($condition,$message){global $checks;if(!$condition)throw new RuntimeException($message);$checks++;}
function home_http($cookie,$payload=NULL,$query='resource=citizen_home'){
    global $base,$fixture;
    $curl=curl_init($base.'?'.$query);
    curl_setopt_array($curl,array(CURLOPT_RETURNTRANSFER=>TRUE,CURLOPT_HEADER=>TRUE,CURLOPT_COOKIEFILE=>$cookie,CURLOPT_COOKIEJAR=>$cookie,CURLOPT_HTTPHEADER=>array('Content-Type: application/json','X-Fixture-Nonce: '.$fixture['nonce']),CURLOPT_TIMEOUT=>10));
    if($payload!==NULL)curl_setopt_array($curl,array(CURLOPT_POST=>TRUE,CURLOPT_POSTFIELDS=>json_encode($payload)));
    $raw=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_HTTP_CODE);$size=curl_getinfo($curl,CURLINFO_HEADER_SIZE);curl_close($curl);
    $json=json_decode(substr($raw,$size),TRUE);if(!is_array($json))throw new RuntimeException('Invalid home fixture response, HTTP '.$status);
    return array($status,$json,substr($raw,0,$size));
}
function home_action($cookie,$csrf,$action,$extra=array()) {return home_http($cookie,array_merge(array('resource'=>'citizen_home','action'=>$action,'requestId'=>'home_'.bin2hex(random_bytes(12)),'csrfToken'=>$csrf),$extra));}
function home_presence($id,$point='clerk',$stale=FALSE,$scope='republic'){
    global $testDb;$x=$point==='clerk'?9:38;$z=$point==='clerk'?6:3;
    $testDb->query("INSERT INTO citizen_presence (citizen_id,destination,region,x,z,updated_at) VALUES (?,?,'world',?,?,DATE_SUB(NOW(),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE destination=VALUES(destination),region=VALUES(region),x=VALUES(x),z=VALUES(z),updated_at=VALUES(updated_at)",array($id,$scope,$x,$z,$stale?30:0));
}
function home_race($id,$sessionHash,array $actions){
    global $files,$workers,$env,$log;
    $start=microtime(TRUE)+.3;$workers=array();
    foreach($actions as $index=>$action){$out=tempnam(sys_get_temp_dir(),'home-race-');$files[]=$out;$requestId='race_'.$action.'_'.$index.'_'.bin2hex(random_bytes(6));$process=proc_open(array(PHP_BINARY,__FILE__,'--worker',(string)$id,$action,$sessionHash,$requestId,(string)$start),array(0=>array('pipe','r'),1=>array('file',$out,'w'),2=>array('file',$log,'a')),$pipes,dirname(__DIR__),$env,array('bypass_shell'=>TRUE,'create_no_window'=>TRUE));$workers[]=array($process,$out);}
    $results=array();foreach($workers as $worker){check_home(proc_close($worker[0])===0,'Home race worker failed');$result=json_decode(file_get_contents($worker[1]),TRUE);check_home(is_array($result),'Home race returned invalid result');$results[]=$result;}$workers=array();return $results;
}

try{
    require APPPATH.'config/database.php';$fixture=$db['default'];$connection=new mysqli($fixture['hostname'],$fixture['username'],$fixture['password'],'',$fixture['port']??3306);
    $scratch='citizen_home_test_'.bin2hex(random_bytes(6));$connection->query('CREATE DATABASE `'.$scratch.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');$connection->select_db($scratch);
    $connection->query('CREATE TABLE citizens (id BIGINT UNSIGNED PRIMARY KEY,is_active TINYINT NOT NULL,account_type VARCHAR(20),gender VARCHAR(32),occupation VARCHAR(48),avatar_config LONGTEXT,display_name VARCHAR(50),avatar VARCHAR(40),house VARCHAR(40)) ENGINE=InnoDB');
    $connection->query("INSERT INTO citizens(id,is_active,gender,occupation,display_name,avatar,house) VALUES(1,1,'male','buruh','First citizen','citizen','basic'),(2,1,'female','buruh','Second citizen','citizen','basic'),(3,0,NULL,NULL,'Inactive','citizen','basic'),(4,1,NULL,NULL,'Incomplete','citizen','basic')");
    $avatar=json_encode(json_decode(file_get_contents(FCPATH.'game-src/avatar-v15-presets.json'),TRUE)[0]['config']);$statement=$connection->prepare('UPDATE citizens SET avatar_config=? WHERE id IN (1,2)');$statement->bind_param('s',$avatar);$statement->execute();$statement->close();
    $connection->query('CREATE TABLE citizen_presence (citizen_id BIGINT UNSIGNED PRIMARY KEY,destination VARCHAR(24),region VARCHAR(24),x DOUBLE,z DOUBLE,updated_at DATETIME) ENGINE=InnoDB');
    $connection->query('CREATE TABLE citizen_messages (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,sender_id BIGINT UNSIGNED,recipient_id BIGINT UNSIGNED,destination VARCHAR(24),region VARCHAR(24),message TEXT,created_at DATETIME) ENGINE=InnoDB');
    home_schema($connection);home_schema($connection);
    $fixture['database']=$scratch;$fixture['nonce']=bin2hex(random_bytes(24));$sessionDir=sys_get_temp_dir().'/citizen-home-sessions-'.bin2hex(random_bytes(8));mkdir($sessionDir,0700);$fixture['sessionDir']=$sessionDir;
    $fixturePath=tempnam(sys_get_temp_dir(),'home-config-');$files[]=$fixturePath;file_put_contents($fixturePath,json_encode($fixture));$env=getenv();$env['CITIZEN_HOME_TEST_CONFIG']=$fixturePath;
    $testDb=new HomeTestDb($fixture);$GLOBALS['worldTestDb']=$testDb;$model=new Citizen_home_model();
    check_home((int)$testDb->query('SELECT COUNT(*) AS count FROM citizen_homes')->row_array()['count']===0,'Migration allocated rooms without owner request');
    $socket=stream_socket_server('tcp://127.0.0.1:0',$errno,$error);$port=(int)substr(strrchr(stream_socket_get_name($socket,FALSE),':'),1);fclose($socket);$base='http://127.0.0.1:'.$port.'/';$log=tempnam(sys_get_temp_dir(),'home-http-');$files[]=$log;
    $server=proc_open(array(PHP_BINARY,'-S','127.0.0.1:'.$port,__FILE__),array(0=>array('pipe','r'),1=>array('file',$log,'a'),2=>array('file',$log,'a')),$pipes,dirname(__DIR__),$env,array('bypass_shell'=>TRUE,'create_no_window'=>TRUE));if(!is_resource($server))throw new RuntimeException('Home fixture server failed to start');
    for($i=0;$i<40;$i++){$socket=@fsockopen('127.0.0.1',$port,$errno,$error,.1);if($socket){fclose($socket);break;}usleep(50000);}
    $cookies=array();foreach(array('guest','1','2','3','4','other-device') as $who){$cookies[$who]=tempnam(sys_get_temp_dir(),'home-cookie-');$files[]=$cookies[$who];if($who!=='guest')home_http($cookies[$who],NULL,'fixture_login='.($who==='other-device'?'1':$who));}
    check_home(home_http($cookies['guest'])[0]===401,'Guest read private room');
    check_home(home_http($cookies['3'])[1]['code']==='citizen_inactive','Inactive account received room');
    check_home(home_http($cookies['4'])[1]['code']==='profile_required','Incomplete account received room');
    check_home((int)$testDb->query('SELECT COUNT(*) AS count FROM citizen_homes')->row_array()['count']===0,'Rejected account allocated room');
    $states=array();$csrf=array();foreach(array('1','2','other-device') as $who){list($status,$state,$headers)=home_http($cookies[$who]);$states[$who]=$state;$csrf[$who]=$state['csrfToken'];check_home($status===200 && strpos($headers,'no-store')!==FALSE && strtotime($state['serverTime'])!==FALSE,'Private GET/cache/server time invalid');}
    check_home($states['1']['home']['id']!==$states['2']['home']['id'] && $states['1']['home']['id']===$states['other-device']['home']['id'],'Room ownership/allocation unstable');
    check_home($states['1']['version']===1 && $states['1']['mission']['status']==='not_started' && !$states['1']['home']['unlocked'] && !$states['1']['home']['inside'] && $states['1']['inventory']['welcomePlant']===0,'First room not correctly reserved');
    check_home((int)$testDb->query('SELECT COUNT(*) AS count FROM citizen_homes')->row_array()['count']===2,'Reload/other device allocated duplicate room');
    check_home(strpos(json_encode($states['1']),'interior_session_hash')===FALSE && strpos(json_encode($states['1']),'"nonce"')===FALSE,'Private session secret exposed');
    check_home(home_http($cookies['2'],NULL,'resource=citizen_home&citizenId=1')[1]['playerId']===2,'GET identifier accessed another room');
    check_home(home_action($cookies['1'],'bad','accept_delivery')[1]['code']==='csrf_invalid','Missing CSRF accepted');
    foreach(array('citizenId'=>2,'homeId'=>$states['2']['home']['id'],'quantity'=>100,'itemId'=>'unearned') as $key=>$value)check_home(home_action($cookies['1'],$csrf['1'],'accept_delivery',array($key=>$value))[0]===422,'Unexpected authority field accepted: '.$key);
    check_home(home_action($cookies['1'],$csrf['1'],'enter_home')[1]['code']==='home_locked','Locked room entered');
    check_home(home_action($cookies['1'],$csrf['1'],'place_decoration',array('slotId'=>'welcome-shelf'))[1]['code']==='home_session_required','Unearned plant placed');
    home_presence(1,'clerk',TRUE);check_home(home_action($cookies['1'],$csrf['1'],'accept_delivery')[1]['code']==='presence_expired','Stale location accepted');
    home_presence(1,'clerk',FALSE,'jakarta');check_home(home_action($cookies['1'],$csrf['1'],'accept_delivery')[1]['code']==='presence_expired','Wrong scope accepted');
    home_presence(1,'entrance');check_home(home_action($cookies['1'],$csrf['1'],'accept_delivery')[1]['code']==='too_far','Wrong pickup point accepted');
    home_presence(1);$acceptId='accept_home_delivery_0001';list($status,$accepted)=home_action($cookies['1'],$csrf['1'],'accept_delivery',array('requestId'=>$acceptId));check_home($status===200 && $accepted['version']===2 && $accepted['mission']['status']==='carrying','Accept delivery failed');
    check_home(home_http($cookies['other-device'])[1]['mission']['status']==='carrying','Mission did not persist across device/reload');
    home_presence(1,'entrance');check_home(home_action($cookies['1'],$csrf['1'],'deliver')[1]['code']==='travel_too_fast','Travel timer bypassed');
    $testDb->query('UPDATE citizen_homes SET mission_accepted_at=UTC_TIMESTAMP(6)-INTERVAL 3 SECOND WHERE citizen_id=1');
    $deliverId='deliver_home_reward_00001';list($status,$delivered)=home_action($cookies['1'],$csrf['1'],'deliver',array('requestId'=>$deliverId));check_home($status===200 && $delivered['version']===3 && $delivered['mission']['status']==='completed' && $delivered['inventory']['welcomePlant']===1 && $delivered['home']['unlocked'],'Delivery did not reward/unlock');
    check_home(home_action($cookies['1'],$csrf['1'],'deliver',array('requestId'=>$deliverId))[1]['replayed'],'Delivery replay failed');
    check_home(home_action($cookies['1'],$csrf['1'],'deliver')[1]['code']==='mission_completed','Second request duplicated reward');
    check_home(home_action($cookies['1'],$csrf['1'],'enter_home',array('requestId'=>$deliverId))[1]['code']==='request_conflict','Idempotency key changed meaning');
    $oldAccept=home_action($cookies['1'],$csrf['1'],'accept_delivery',array('requestId'=>$acceptId))[1];check_home($oldAccept['replayed'] && $oldAccept['mission']['status']==='completed' && $oldAccept['version']===3,'Replay returned obsolete mission');
    check_home(home_http($cookies['2'])[1]['mission']['status']==='not_started' && home_http($cookies['2'])[1]['inventory']['welcomePlant']===0,'Mission reward leaked to second account');
    $enterId='enter_private_room_000001';list($status,$entered)=home_action($cookies['1'],$csrf['1'],'enter_home',array('requestId'=>$enterId));check_home($status===200 && $entered['home']['inside'],'Home entry failed');
    check_home(!$testDb->query('SELECT citizen_id FROM citizen_presence WHERE citizen_id=1')->row_array(),'Home entry left public presence');
    check_home(home_http($cookies['1'])[1]['home']['inside'] && !home_http($cookies['other-device'])[1]['home']['inside'],'Interior session binding/reload failed');
    $syncPayload=array('resource'=>'citizen_chat','action'=>'sync','destination'=>'republic','region'=>'world','x'=>38,'z'=>3);
    foreach(array(1,2) as $retry){list($status,$suppressed)=home_http($cookies['1'],$syncPayload,'');check_home($status===200 && $suppressed['players']===array() && !$suppressed['canChat'] && $suppressed['privateMode'],'Delayed/repeated public sync was not suppressed');}
    check_home(!$testDb->query('SELECT citizen_id FROM citizen_presence WHERE citizen_id=1')->row_array(),'Delayed sync recreated public presence');
    check_home(home_http($cookies['1'],array_merge($syncPayload,array('action'=>'send','targetId'=>2,'message'=>'fixture')),'')[1]['code']==='private_mode','Private room sent public chat');
    check_home(home_action($cookies['other-device'],$csrf['other-device'],'place_decoration',array('slotId'=>'welcome-shelf'))[1]['code']==='home_session_required','Other device placed without entry');
    check_home(home_action($cookies['1'],$csrf['1'],'place_decoration',array('slotId'=>'other-room'))[1]['code']==='slot_invalid','Invalid slot accepted');
    $placeId='place_earned_plant_000001';list($status,$placed)=home_action($cookies['1'],$csrf['1'],'place_decoration',array('slotId'=>'welcome-shelf','requestId'=>$placeId));check_home($status===200 && $placed['home']['decorationPlaced'] && $placed['inventory']['welcomePlant']===0,'Plant placement failed');
    check_home(home_action($cookies['1'],$csrf['1'],'place_decoration',array('slotId'=>'welcome-shelf','requestId'=>$placeId))[1]['replayed'],'Placement retry failed');
    check_home(home_http($cookies['1'])[1]['home']['decorationPlaced'] && home_http($cookies['other-device'])[1]['home']['decorationPlaced'],'Placement did not persist');
    list($status,$removed)=home_action($cookies['1'],$csrf['1'],'remove_decoration',array('slotId'=>'welcome-shelf'));check_home($status===200 && !$removed['home']['decorationPlaced'] && $removed['inventory']['welcomePlant']===1,'Removing decoration lost/duplicated plant');
    $oldPlace=home_action($cookies['1'],$csrf['1'],'place_decoration',array('slotId'=>'welcome-shelf','requestId'=>$placeId))[1];check_home($oldPlace['replayed'] && !$oldPlace['home']['decorationPlaced'] && $oldPlace['inventory']['welcomePlant']===1,'Old placement replay regressed inventory');
    home_action($cookies['other-device'],$csrf['other-device'],'leave_home');check_home(home_http($cookies['1'])[1]['home']['inside'],'Other device evicted room session');
    list($status,$left)=home_action($cookies['1'],$csrf['1'],'leave_home');check_home($status===200 && !$left['home']['inside'],'Leave required outdoor presence or failed');
    $oldEnter=home_action($cookies['1'],$csrf['1'],'enter_home',array('requestId'=>$enterId))[1];check_home($oldEnter['replayed'] && !$oldEnter['home']['inside'],'Old enter replay restored private mode');
    list($status,$outsideSync)=home_http($cookies['1'],$syncPayload,'');check_home($status===200 && empty($outsideSync['privateMode']) && $testDb->query('SELECT citizen_id FROM citizen_presence WHERE citizen_id=1')->row_array(),'Public presence did not resume after leave');
    // Same-owner entry and a delayed heartbeat race on the owner row.
    $sessionHash=hash('sha256','fixture-race-session');$race=home_race(1,$sessionHash,array('enter_home','presence'));check_home($model->state(1,$sessionHash)['home']['inside'] && !$testDb->query('SELECT citizen_id FROM citizen_presence WHERE citizen_id=1')->row_array(),'Entry/presence race leaked outdoor position');
    $before=$model->state(1,$sessionHash);$testDb->failNeedle='INSERT INTO citizen_home_ledger';
    try{$model->act(1,$sessionHash,array('action'=>'place_decoration','slotId'=>'welcome-shelf','requestId'=>'rollback_place_plant_0001'));throw new RuntimeException('Injected home write failure was ignored');}catch(RuntimeException $error){check_home($error->getMessage()==='Home database operation failed.','Unexpected rollback error');}
    $after=$model->state(1,$sessionHash);unset($before['serverTime'],$after['serverTime']);check_home($before===$after,'Rollback altered version/inventory/placement');
    check_home(!$testDb->query('SELECT request_id FROM citizen_home_requests WHERE request_id=?',array('rollback_place_plant_0001'))->row_array(),'Rollback retained replay record');
    $race=home_race(1,$sessionHash,array('place_decoration','place_decoration'));$statuses=array_column($race,'status');sort($statuses);check_home($statuses===array(200,409),'Concurrent placement duplicated owned item');
    $final=$model->state(1,$sessionHash);check_home($final['home']['decorationPlaced'] && $final['inventory']['welcomePlant']===0,'Concurrent placement inventory invariant failed');
    // Second citizen earns their own reward; simultaneous deliveries award once.
    home_presence(2);home_action($cookies['2'],$csrf['2'],'accept_delivery');home_presence(2,'entrance');$testDb->query('UPDATE citizen_homes SET mission_accepted_at=UTC_TIMESTAMP(6)-INTERVAL 3 SECOND WHERE citizen_id=2');
    $race=home_race(2,hash('sha256','second-session'),array('deliver','deliver'));$statuses=array_column($race,'status');sort($statuses);check_home($statuses===array(200,409),'Concurrent delivery awarded twice');
    $reward=$testDb->query("SELECT COUNT(*) AS count,SUM(plant_delta) AS plants FROM citizen_home_ledger WHERE citizen_id=2 AND action='deliver'")->row_array();check_home((int)$reward['count']===1 && (int)$reward['plants']===1,'Delivery ledger duplicated reward');
    $snapshot=$model->state(1,$sessionHash);home_schema($connection);$repeat=$model->state(1,$sessionHash);unset($snapshot['serverTime'],$repeat['serverTime']);check_home($snapshot===$repeat,'Repeat migration reset owned room');
    check_home((int)$testDb->query('SELECT COUNT(*) AS count FROM citizen_homes')->row_array()['count']===2,'Unrequested/incomplete rooms allocated');
    echo 'PASS '.$checks." private home checks: isolated HTTP/MySQL, ownership/session binding, profile/CSRF, mission timer/reward, persistence, strict slots, fresh replay, private presence gate/race, placement/reward races, rollback, repeat migration.\n";
    echo "Actual controller/model with fixture session adapter; no live account/world changes or external provider calls. Browser and production-login acceptance remain separate.\n";
}catch(Throwable $error){fwrite(STDERR,'FAIL home fixture: '.$error->getMessage()."\n");$failed=TRUE;}
finally{
    foreach($workers as $worker)if(is_resource($worker[0])){proc_terminate($worker[0]);proc_close($worker[0]);}
    if(is_resource($server)){proc_terminate($server);proc_close($server);}
    if($connection && $scratch && preg_match('/^citizen_home_test_[a-f0-9]{12}$/D',$scratch))$connection->query('DROP DATABASE `'.$scratch.'`');
    foreach($files as $file)if(is_file($file))unlink($file);
    if($sessionDir && preg_match('/^citizen-home-sessions-[a-f0-9]{16}$/D',basename($sessionDir)) && is_dir($sessionDir)){
        foreach(glob($sessionDir.'/sess_*') as $file)if(is_file($file) && realpath(dirname($file))===realpath($sessionDir))unlink($file);
        rmdir($sessionDir);
    }
}
exit(!empty($failed)?1:0);
