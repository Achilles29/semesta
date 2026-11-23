<?php
// Isolated real-MySQL + HTTP controller fixture. No live accounts/world writes.
if (!in_array(PHP_SAPI,array('cli','cli-server'),TRUE)) { http_response_code(404); exit; }
require __DIR__.'/test_republic_world_support.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$fixturePath=getenv('REPUBLIC_WORLD_TEST_CONFIG');
if (PHP_SAPI==='cli-server' || (($argv[1]??'')==='--worker')) {
    if (!$fixturePath || !is_file($fixturePath)) { http_response_code(404); exit; }
    $fixture=json_decode(file_get_contents($fixturePath),TRUE);
    if (!preg_match('/^republic_world_test_[a-f0-9]{12}$/D',$fixture['database'])) exit(2);
    $GLOBALS['worldTestDb']=new WorldTestDb($fixture);
    if (PHP_SAPI==='cli-server') {
        if (($_SERVER['REMOTE_ADDR']??'')!=='127.0.0.1' || !hash_equals($fixture['nonce'],$_SERVER['HTTP_X_FIXTURE_NONCE']??'')) { http_response_code(404); exit; }
        session_start(); header('Content-Type: application/json');
        if (isset($_GET['fixture_login'])) {
            $_SESSION=array(); $who=$_GET['fixture_login'];
            if ($who==='admin') $_SESSION['semesta_admin']=TRUE;
            elseif(in_array($who,array('1','2','3','4'),TRUE)) $_SESSION['citizen_id']=(int)$who;
            echo '{"ok":true}'; exit;
        }
        $api=(new ReflectionClass('Api'))->newInstanceWithoutConstructor();
        $api->db=$GLOBALS['worldTestDb']; $api->session=new WorldTestSession(); $api->output=new WorldTestOutput(); $api->input=new WorldTestInput(); $api->load=new WorldTestLoad($api);
        $api->index(); http_response_code($api->output->status); echo $api->output->body; exit;
    }
    while(microtime(TRUE)<(float)$argv[4]) usleep(1000);
    try { $result=(new Republic_world_model())->act((int)$argv[2],array('action'=>$argv[5]??'install','projectId'=>'jakartawa-home-01','requestId'=>$argv[3])); echo json_encode(array('status'=>200,'result'=>$result)); }
    catch(Republic_world_error $error) { echo json_encode(array('status'=>$error->status,'code'=>$error->error_code)); }
    exit;
}

$checks=0;
function check_world($condition,$message) { global $checks; if(!$condition)throw new RuntimeException($message); $checks++; }
function http_world($resource,$cookie,$payload=NULL) {
    global $base,$fixture;
    $handle=curl_init($base.'?'.$resource);
    curl_setopt_array($handle,array(CURLOPT_RETURNTRANSFER=>TRUE,CURLOPT_COOKIEFILE=>$cookie,CURLOPT_COOKIEJAR=>$cookie,CURLOPT_HTTPHEADER=>array('Content-Type: application/json','X-Fixture-Nonce: '.$fixture['nonce']),CURLOPT_TIMEOUT=>10));
    if($payload!==NULL)curl_setopt_array($handle,array(CURLOPT_POST=>TRUE,CURLOPT_POSTFIELDS=>json_encode($payload)));
    $body=curl_exec($handle);$status=curl_getinfo($handle,CURLINFO_HTTP_CODE);curl_close($handle);
    $json=json_decode($body,TRUE); if(!is_array($json))throw new RuntimeException('Invalid fixture HTTP response, status '.$status);
    return array($status,$json);
}
function action_world($resource,$cookie,$csrf,$action,$extra=array()) {
    return http_world('resource='.$resource,$cookie,array_merge(array('resource'=>$resource,'action'=>$action,'csrfToken'=>$csrf,'projectId'=>'jakartawa-home-01','requestId'=>'test_'.bin2hex(random_bytes(12))),$extra));
}
function presence_world($id,$site=FALSE,$stale=FALSE) {
    global $testDb;
    $testDb->query('INSERT INTO citizen_presence (citizen_id,destination,region,x,z,updated_at) VALUES (?,\'republic\',\'world\',?,?,DATE_SUB(NOW(),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE destination=VALUES(destination),region=VALUES(region),x=VALUES(x),z=VALUES(z),updated_at=VALUES(updated_at)',array($id,$site?29:22,$site?-21.5:-10,$stale?30:0));
}
function mature_world($id) { global $testDb; $testDb->query('UPDATE citizen_work_state SET picked_up_at=UTC_TIMESTAMP(6)-INTERVAL 3 SECOND,install_ready_at=IF(install_ready_at IS NULL,NULL,UTC_TIMESTAMP(6)-INTERVAL 1 SECOND) WHERE citizen_id=?',array($id)); }
$tempFiles=array();$server=NULL;$connection=NULL;$scratch=NULL;$workerProcesses=array();
try {
    require APPPATH.'config/database.php'; $fixture=$db['default'];
    $connection=new mysqli($fixture['hostname'],$fixture['username'],$fixture['password'],'',$fixture['port']??3306);
    $scratch='republic_world_test_'.bin2hex(random_bytes(6));
    $connection->query('CREATE DATABASE `'.$scratch.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');$connection->select_db($scratch);
    $connection->query('CREATE TABLE citizens (id BIGINT UNSIGNED PRIMARY KEY,is_active TINYINT NOT NULL,account_type VARCHAR(20),gender VARCHAR(32),occupation VARCHAR(48),avatar_config LONGTEXT) ENGINE=InnoDB');
    $connection->query("INSERT INTO citizens(id,is_active,account_type,gender,occupation) VALUES(1,1,'citizen','male','buruh'),(2,1,'admin','female','buruh'),(3,0,'citizen',NULL,NULL),(4,1,'citizen',NULL,NULL)");
    $avatar=json_encode(json_decode(file_get_contents(FCPATH.'game-src/avatar-v15-presets.json'),TRUE)[0]['config']);
    $statement=$connection->prepare('UPDATE citizens SET avatar_config=? WHERE id IN (1,2)');$statement->bind_param('s',$avatar);$statement->execute();$statement->close();
    $connection->query('CREATE TABLE citizen_presence (citizen_id BIGINT UNSIGNED PRIMARY KEY,destination VARCHAR(24),region VARCHAR(24),x DOUBLE,z DOUBLE,updated_at DATETIME) ENGINE=InnoDB');
    world_test_schema($connection); world_test_schema($connection);
    $fixture['database']=$scratch;$fixture['nonce']=bin2hex(random_bytes(24));
    $fixturePath=tempnam(sys_get_temp_dir(),'world-config-');$tempFiles[]=$fixturePath;file_put_contents($fixturePath,json_encode($fixture));
    $testDb=new WorldTestDb($fixture);$GLOBALS['worldTestDb']=$testDb;$model=new Republic_world_model();
    $initial=$model->state();check_world($initial['world']['phase']==='after-day2' && $initial['world']['version']===1 && $initial['projects'][0]['status']==='draft','Migration canon/draft/idempotence mismatch');
    $portSocket=stream_socket_server('tcp://127.0.0.1:0',$errno,$error);$port=(int)substr(strrchr(stream_socket_get_name($portSocket,FALSE),':'),1);fclose($portSocket);
    $base='http://127.0.0.1:'.$port.'/';$log=tempnam(sys_get_temp_dir(),'world-http-');$tempFiles[]=$log;
    $env=getenv();$env['REPUBLIC_WORLD_TEST_CONFIG']=$fixturePath;
    $server=proc_open(array(PHP_BINARY,'-S','127.0.0.1:'.$port,__FILE__),array(0=>array('pipe','r'),1=>array('file',$log,'a'),2=>array('file',$log,'a')),$pipes,dirname(__DIR__),$env,array('bypass_shell'=>TRUE,'create_no_window'=>TRUE));
    if(!is_resource($server))throw new RuntimeException('Fixture HTTP server could not start.');
    for($i=0;$i<40;$i++){ $socket=@fsockopen('127.0.0.1',$port,$errno,$error,.1);if($socket){fclose($socket);break;}usleep(50000); }
    $cookies=array();foreach(array('guest','admin','1','2','3','4') as $who){$cookies[$who]=tempnam(sys_get_temp_dir(),'world-cookie-');$tempFiles[]=$cookies[$who];if($who!=='guest')http_world('fixture_login='.$who,$cookies[$who]);}
    list($status,$public)=http_world('resource=world_state',$cookies['guest']);check_world($status===200 && !isset($public['player'],$public['csrfToken'],$public['history']),'Public snapshot leaked private data');
    check_world(http_world('resource=world_admin',$cookies['guest'])[0]===401,'Guest reached admin');
    check_world(http_world('resource=world_admin',$cookies['2'])[0]===401,'Citizen admin label granted real admin permission');
    check_world(http_world('resource=world_work',$cookies['guest'])[0]===401,'Guest reached work');
    check_world(http_world('resource=world_work',$cookies['3'])[0]===403,'Inactive citizen reached work');
    list($status,$admin)=http_world('resource=world_admin',$cookies['admin']);$adminCsrf=$admin['csrfToken'];check_world($status===200 && $admin['history'][0]['worldVersion']===1,'Admin history/version missing');
    $csrf=array();foreach(array('1','2') as $who){list($status,$state)=http_world('resource=world_work',$cookies[$who]);$csrf[$who]=$state['csrfToken'];check_world($status===200 && $state['player']['constructionXp']===0 && strtotime($state['serverTime'])!==FALSE,'New player state/time wrong');}
    $incomplete=http_world('resource=world_work',$cookies['4'])[1];check_world(action_world('world_work',$cookies['4'],$incomplete['csrfToken'],'pickup')[1]['code']==='profile_incomplete','Incomplete profile was allowed to work');
    check_world(action_world('world_admin',$cookies['admin'],$adminCsrf,'publish',array('phase'=>'after-day2','expectedVersion'=>1,'reason'=>'Duplicate phase fixture'))[1]['code']==='no_change','Unchanged phase created publication');
    check_world(action_world('world_admin',$cookies['admin'],'wrong','activate_project',array('expectedVersion'=>1,'reason'=>'Begin fixture project'))[0]===403,'Missing CSRF accepted');
    $activateId='test_activate_project_0001';
    list($status,$active)=action_world('world_admin',$cookies['admin'],$adminCsrf,'activate_project',array('expectedVersion'=>1,'reason'=>'Begin fixture project','requestId'=>$activateId));
    check_world($status===200 && $active['world']['version']===2 && $active['projects'][0]['status']==='active','Activation failed');
    list($status,$replay)=action_world('world_admin',$cookies['admin'],$adminCsrf,'activate_project',array('expectedVersion'=>1,'reason'=>'Begin fixture project','requestId'=>$activateId));check_world($status===200 && $replay['replayed'] && count($replay['history'])===2,'Admin retry duplicated publication');
    list($status,$conflict)=action_world('world_admin',$cookies['admin'],$adminCsrf,'set_project_status',array('status'=>'paused','expectedVersion'=>1,'reason'=>'Stale admin version'));check_world($status===409 && $conflict['code']==='version_conflict' && $conflict['worldVersion']===2,'Stale admin version accepted');
    check_world(action_world('world_work',$cookies['1'],$csrf['1'],'pickup',array('quantity'=>999))[0]===422,'Client quantity trusted');
    presence_world(1,FALSE,TRUE);check_world(action_world('world_work',$cookies['1'],$csrf['1'],'pickup')[1]['code']==='presence_expired','Expired presence accepted');
    presence_world(1,TRUE);check_world(action_world('world_work',$cookies['1'],$csrf['1'],'pickup')[1]['code']==='too_far','Wrong station accepted');
    foreach(array(1,2) as $id){presence_world($id);check_world(action_world('world_work',$cookies[(string)$id],$csrf[(string)$id],'pickup',array('requestId'=>'initial_pickup_player_'.$id.'_0001'))[0]===200,'Pickup failed');}
    $deliverId='test_delivery_player1_0001';presence_world(1,TRUE);
    check_world(action_world('world_work',$cookies['1'],$csrf['1'],'deliver',array('requestId'=>$deliverId))[1]['code']==='travel_too_fast','Minimum travel time ignored');
    mature_world(1);list($status,$delivered)=action_world('world_work',$cookies['1'],$csrf['1'],'deliver',array('requestId'=>$deliverId));check_world($status===200 && $delivered['projects'][0]['delivered']===1 && $delivered['player']['constructionXp']===2 && $delivered['world']['version']===2,'Delivery reward/progress/version wrong');
    list($status,$replay)=action_world('world_work',$cookies['1'],$csrf['1'],'deliver',array('requestId'=>$deliverId));check_world($status===200 && $replay['replayed'] && $model->work(1)['player']['constructionXp']===2,'Delivery replay duplicated reward');
    list($status,$oldPickup)=action_world('world_work',$cookies['1'],$csrf['1'],'pickup',array('requestId'=>'initial_pickup_player_1_0001'));check_world($status===200 && $oldPickup['replayed'] && $oldPickup['player']['inventory']['constructionKit']===0 && $oldPickup['player']['constructionXp']===2,'Old pickup replay regressed current inventory/XP');
    check_world(action_world('world_work',$cookies['1'],$csrf['1'],'pickup',array('requestId'=>$deliverId))[1]['code']==='request_conflict','Request ID rebound to new action');
    presence_world(2,TRUE);mature_world(2);check_world(action_world('world_work',$cookies['2'],$csrf['2'],'deliver')[0]===200,'Second account delivery failed');
    check_world(http_world('resource=world_work',$cookies['1'])[1]['projects'][0]['delivered']===2,'Shared progress not visible across sessions');
    presence_world(1,TRUE);list($status,$started)=action_world('world_work',$cookies['1'],$csrf['1'],'start_install');check_world($status===200 && $started['player']['installation'],'Install did not start');
    check_world(action_world('world_work',$cookies['1'],$csrf['1'],'install')[1]['code']==='installation_pending','Early installation accepted');
    mature_world(1);list($status,$installed)=action_world('world_work',$cookies['1'],$csrf['1'],'install');check_world($status===200 && $installed['projects'][0]['installed']===1 && $installed['player']['constructionXp']===7,'Installation reward wrong');
    // Force a write failure after inventory/progress updates, before the ledger.
    presence_world(1);$model->act(1,array('action'=>'pickup','projectId'=>'jakartawa-home-01','requestId'=>'rollback_pickup_0000001'));mature_world(1);presence_world(1,TRUE);
    $before=$model->work(1);$testDb->failNeedle='INSERT INTO citizen_work_ledger';
    try{$model->act(1,array('action'=>'deliver','projectId'=>'jakartawa-home-01','requestId'=>'rollback_delivery_00001'));throw new RuntimeException('Injected failure was ignored');}catch(RuntimeException $error){check_world($error->getMessage()==='World database operation failed.','Unexpected rollback failure');}
    $after=$model->work(1);check_world($after['player']===$before['player'] && $after['projects']===$before['projects'],'Rollback left inventory/XP/progress changed');
    check_world(!$testDb->query('SELECT request_id FROM world_action_requests WHERE request_id=?',array('rollback_delivery_00001'))->row_array(),'Failed transaction retained idempotency record');
    // Pause returns a held kit safely without progress or reward.
    list($status,$paused)=action_world('world_admin',$cookies['admin'],$adminCsrf,'set_project_status',array('status'=>'paused','expectedVersion'=>2,'reason'=>'Pause fixture material work'));check_world($status===200,'Pause failed');
    list($status,$returned)=action_world('world_work',$cookies['1'],$csrf['1'],'deliver');check_world($status===200 && $returned['player']['inventory']['constructionKit']===0 && $returned['player']['constructionXp']===7 && $returned['projects'][0]['delivered']===2,'Paused kit return changed reward/stock');
    check_world(action_world('world_work',$cookies['2'],$csrf['2'],'start_install')[1]['code']==='project_inactive','Paused installation allowed');
    check_world(action_world('world_admin',$cookies['admin'],$adminCsrf,'set_project_status',array('status'=>'active','expectedVersion'=>3,'reason'=>'Resume fixture material work'))[0]===200,'Resume failed');
    list($status,$oldAdmin)=action_world('world_admin',$cookies['admin'],$adminCsrf,'activate_project',array('expectedVersion'=>1,'reason'=>'Begin fixture project','requestId'=>$activateId));check_world($status===200 && $oldAdmin['replayed'] && $oldAdmin['world']['version']===4,'Old admin retry regressed publication view');
    // Concurrent final delivery/installation use separate PHP processes/connections.
    // This fixture adjustment is only in the randomly named scratch database.
    $testDb->query("UPDATE world_projects SET delivered_units=11,installed_units=11 WHERE id='jakartawa-home-01'");
    foreach(array(1,2) as $id){presence_world($id,TRUE);$testDb->query("UPDATE citizen_work_state SET construction_kit=1,carrying_project_id='jakartawa-home-01',picked_up_at=UTC_TIMESTAMP(6)-INTERVAL 3 SECOND WHERE citizen_id=?",array($id));}
    $raceStart=microtime(TRUE)+.3;
    foreach(array(1,2) as $id){$out=tempnam(sys_get_temp_dir(),'world-race-');$tempFiles[]=$out;$process=proc_open(array(PHP_BINARY,__FILE__,'--worker',(string)$id,'race_deliver_player_'.$id.'_0001',(string)$raceStart,'deliver'),array(0=>array('pipe','r'),1=>array('file',$out,'w'),2=>array('file',$log,'a')),$workerPipes,dirname(__DIR__),$env,array('bypass_shell'=>TRUE,'create_no_window'=>TRUE));$workerProcesses[]=array($process,$out);}
    foreach($workerProcesses as $worker){check_world(proc_close($worker[0])===0,'Delivery race worker failed');$result=json_decode(file_get_contents($worker[1]),TRUE);check_world($result['status']===200 && $result['result']['player']['inventory']['constructionKit']===0,'Final delivery failed to return excess kit');}$workerProcesses=array();
    $deliveryRewards=$testDb->query("SELECT COUNT(*) AS count,SUM(xp_delta) AS xp FROM citizen_work_ledger WHERE request_id LIKE 'race_deliver_player_%'")->row_array();check_world($model->state()['projects'][0]['delivered']===12 && (int)$deliveryRewards['count']===2 && (int)$deliveryRewards['xp']===2,'Concurrent final delivery exceeded stock or duplicated XP');
    foreach(array(1,2) as $id){presence_world($id,TRUE);$testDb->query("UPDATE citizen_work_state SET install_project_id='jakartawa-home-01',install_ready_at=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE citizen_id=?",array($id));}
    $raceStart=microtime(TRUE)+.3;
    foreach(array(1,2) as $id){$out=tempnam(sys_get_temp_dir(),'world-race-');$tempFiles[]=$out;$process=proc_open(array(PHP_BINARY,__FILE__,'--worker',(string)$id,'race_install_player_'.$id.'_0001',(string)$raceStart),array(0=>array('pipe','r'),1=>array('file',$out,'w'),2=>array('file',$log,'a')),$workerPipes,dirname(__DIR__),$env,array('bypass_shell'=>TRUE,'create_no_window'=>TRUE));$workerProcesses[]=array($process,$out);}
    $race=array();foreach($workerProcesses as $worker){check_world(proc_close($worker[0])===0,'Race worker failed');$race[]=json_decode(file_get_contents($worker[1]),TRUE);}$workerProcesses=array();
    $statuses=array_column($race,'status');sort($statuses);check_world($statuses===array(200,409),'Concurrent final unit was not exclusive');
    $finished=$model->state();check_world($finished['projects'][0]['installed']===12 && $finished['projects'][0]['status']==='completed' && $finished['world']['version']===4,'Completion exceeded target or changed admin version');
    $rewards=$testDb->query("SELECT COUNT(*) AS count,SUM(xp_delta) AS xp FROM citizen_work_ledger WHERE request_id LIKE 'race_install_player_%'")->row_array();check_world((int)$rewards['count']===1 && (int)$rewards['xp']===5,'Last unit rewarded more than once');
    $winner=$race[0]['status']===200?1:2;$winnerReplay=$model->act($winner,array('action'=>'install','projectId'=>'jakartawa-home-01','requestId'=>'race_install_player_'.$winner.'_0001'));check_world($winnerReplay['replayed'] && $winnerReplay['projects'][0]['installed']===12,'Completion retry failed');
    // A surplus kit does not reserve material or trap its holder after completion.
    $testDb->query("UPDATE citizen_work_state SET construction_kit=1,carrying_project_id='jakartawa-home-01',picked_up_at=UTC_TIMESTAMP(6)-INTERVAL 3 SECOND WHERE citizen_id=2");presence_world(2,TRUE);$xpBefore=$model->work(2)['player']['constructionXp'];
    list($status,$surplus)=action_world('world_work',$cookies['2'],$csrf['2'],'deliver');check_world($status===200 && $surplus['player']['inventory']['constructionKit']===0 && $surplus['player']['constructionXp']===$xpBefore && $surplus['projects'][0]['installed']===12,'Completed surplus cleanup changed reward/progress');
    world_test_schema($connection);check_world($model->state()===$finished,'Repeat migration reset live-like progress');
    check_world(action_world('world_admin',$cookies['admin'],$adminCsrf,'activate_project',array('expectedVersion'=>4,'reason'=>'Cannot restart finished work'))[1]['code']==='project_completed','Completed project reopened');
    list($status,$beforePhase)=action_world('world_admin',$cookies['admin'],$adminCsrf,'publish',array('phase'=>'before-day2','expectedVersion'=>4,'reason'=>'Explicit phase fixture publication'));
    check_world($status===200 && $beforePhase['world']['phase']==='before-day2' && $beforePhase['world']['version']===5 && $beforePhase['history'][0]['reason']==='Explicit phase fixture publication','Phase publication/audit failed');
    list($status,$afterPhase)=action_world('world_admin',$cookies['admin'],$adminCsrf,'publish',array('phase'=>'after-day2','expectedVersion'=>5,'reason'=>'Restore canonical fixture phase'));
    check_world($status===200 && $afterPhase['world']['phase']==='after-day2' && $afterPhase['world']['version']===6 && $afterPhase['projects']==$finished['projects'],'Phase publication altered construction progress');
    echo 'PASS '.$checks." isolated world checks: HTTP sessions, authority/CSRF, migration repeatability, shared progress, replay/conflict, presence/distance/timers, rollback, pause/return, concurrent final unit, exactly-once XP.\n";
    echo "Tests use real MySQL and actual API/model methods with a test-only HTTP/session adapter; they do not claim production login, browser, device, or network anti-cheat validation.\n";
} catch(Throwable $error) { fwrite(STDERR,'FAIL world fixture: '.$error->getMessage()."\n");$failed=TRUE; }
finally {
    foreach($workerProcesses as $worker)if(is_resource($worker[0])){proc_terminate($worker[0]);proc_close($worker[0]);}
    if(is_resource($server)){proc_terminate($server);proc_close($server);}
    if($connection && $scratch && preg_match('/^republic_world_test_[a-f0-9]{12}$/D',$scratch))$connection->query('DROP DATABASE `'.$scratch.'`');
    foreach($tempFiles as $path)if(is_file($path))unlink($path);
}
exit(!empty($failed)?1:0);
