<?php
if(PHP_SAPI!=='cli')exit;
require __DIR__.'/test_republic_world_support.php';
require APPPATH.'models/Citizen_proposal_model.php';
mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
$checks=0;$connection=NULL;$scratch=NULL;
function ensure_proposal($ok,$label){global $checks;if(!$ok)throw new RuntimeException($label);$checks++;}
function rejects_proposal($fn,$status){try{$fn();throw new RuntimeException('Expected rejection');}catch(Citizen_proposal_error $e){ensure_proposal($e->status===$status,'Wrong rejection');}}
try{
 require APPPATH.'config/database.php';$cfg=$db['default'];$connection=new mysqli($cfg['hostname'],$cfg['username'],$cfg['password'],'',$cfg['port']??3306);
 $scratch='proposal_test_'.bin2hex(random_bytes(6));$connection->query('CREATE DATABASE `'.$scratch.'` CHARACTER SET utf8mb4');$connection->select_db($scratch);
 $connection->query('CREATE TABLE citizens(id BIGINT PRIMARY KEY,is_active TINYINT,display_name VARCHAR(50),gender VARCHAR(32),occupation VARCHAR(48),avatar_config LONGTEXT) ENGINE=InnoDB');
 $connection->query("INSERT INTO citizens VALUES(1,1,'Same name','male','buruh',NULL),(2,1,'Same name','female','buruh',NULL),(3,0,'Inactive',NULL,NULL,NULL),(4,1,'Incomplete',NULL,NULL,NULL)");
 $avatar=json_encode(json_decode(file_get_contents(FCPATH.'game-src/avatar-v15-presets.json'),TRUE)[0]['config']);$st=$connection->prepare('UPDATE citizens SET avatar_config=? WHERE id IN (1,2)');$st->bind_param('s',$avatar);$st->execute();$st->close();
 $connection->query('CREATE TABLE citizen_ideas(id BIGINT AUTO_INCREMENT PRIMARY KEY,public_id VARCHAR(64) UNIQUE,name VARCHAR(50),comment TEXT,platform VARCHAR(24),status VARCHAR(24),created_at DATETIME,updated_at DATETIME) ENGINE=InnoDB');
 for($i=0;$i<2;$i++)$connection->query(file_get_contents(FCPATH.'database/migrations/20261124_citizen_proposals.sql'));
 $cfg['database']=$scratch;$GLOBALS['worldTestDb']=$testDb=new WorldTestDb($cfg);$model=new Citizen_proposal_model();
 $payload=array('requestId'=>'proposal_test_0001','category'=>'lingkungan','title'=>'Taman bermain','location'=>'Kampung Perintis','reason'=>'Tempat bermain anak bersama.');
 ensure_proposal(count($model->run(1)['proposals'])===0,'Initial state');rejects_proposal(fn()=>$model->run(3),403);rejects_proposal(fn()=>$model->run(4),403);
 $first=$model->run(1,$payload);ensure_proposal(count($first['proposals'])===1&&!$first['replayed'],'Create');ensure_proposal($model->run(1,$payload)['replayed'],'Retry');
 ensure_proposal(count($model->run(2)['proposals'])===0,'Same name is not same owner');
 rejects_proposal(fn()=>$model->run(1,array_merge($payload,array('reason'=>'Different reason'))),409);
 foreach(array('citizenId'=>2,'status'=>'dipakai','name'=>'President','value'=>999) as $k=>$v)rejects_proposal(fn()=>$model->run(1,array_merge($payload,array($k=>$v))),422);
 rejects_proposal(fn()=>$model->run(1,array_merge($payload,array('title'=>'<script>bad</script>'))),422);
 $testDb->failNeedle='INSERT INTO citizen_proposals';try{$model->run(2,$payload);throw new RuntimeException('Expected rollback');}catch(RuntimeException $e){ensure_proposal(strpos($e->getMessage(),'Expected')===FALSE,'Rollback error');}
 ensure_proposal((int)$testDb->query('SELECT COUNT(*) n FROM citizen_ideas')->row_array()['n']===1,'No orphan inbox row after rollback');
 $model->run(2,$payload);ensure_proposal(count($model->run(2)['proposals'])===1,'Independent owner can use same request ID');
 foreach(array('2','3') as $n)$model->run(1,array_merge($payload,array('requestId'=>'proposal_test_000'.$n)));
 rejects_proposal(fn()=>$model->run(1,array_merge($payload,array('requestId'=>'proposal_test_0004'))),429);ensure_proposal($model->run(1,$payload)['replayed'],'Retry still allowed at limit');
 $id=$first['proposals'][0]['id'];$testDb->query("UPDATE citizen_ideas SET status='dipilih' WHERE public_id=?",array($id));ensure_proposal(count(array_filter($model->run(1,$payload)['proposals'],fn($p)=>$p['id']===$id&&$p['status']==='dipilih'))===1,'Review persists');
 // Actual endpoint session/CSRF gate, independent of browser providers.
 $api=(new ReflectionClass('Api'))->newInstanceWithoutConstructor();$api->db=$testDb;$api->session=new WorldTestSession();$api->load=new WorldTestLoad($api);$api->input=new class{public $raw_input_stream='{}';};
 $method=new ReflectionMethod('Api','citizen_proposal');$method->setAccessible(TRUE);
 $_SESSION=array();$api->output=new WorldTestOutput();$method->invoke($api,'GET',NULL);ensure_proposal($api->output->status===401,'Guest endpoint');
 $_SESSION=array('citizen_id'=>2);$api->output=new WorldTestOutput();$method->invoke($api,'GET',NULL);$state=json_decode($api->output->body,TRUE);ensure_proposal(strlen($state['csrfToken'])===64,'Bound CSRF');
 $api->output=new WorldTestOutput();$method->invoke($api,'POST',array_merge($payload,array('csrfToken'=>'wrong')));ensure_proposal($api->output->status===403,'Bad CSRF');
 $_SESSION['citizen_id']=1;$api->output=new WorldTestOutput();$method->invoke($api,'POST',array_merge($payload,array('csrfToken'=>$state['csrfToken'])));ensure_proposal($api->output->status===403,'Account switch invalidates token');
 echo "PASS $checks proposal checks: isolated MySQL/controller, identity, CSRF, replay, conflict, limits, rollback, inbox and migration repeat.\n";
}catch(Throwable $e){fwrite(STDERR,'FAIL '.$e->getMessage()."\n");$failed=TRUE;}
finally{if($connection&&$scratch&&preg_match('/^proposal_test_[a-f0-9]{12}$/D',$scratch))$connection->query('DROP DATABASE `'.$scratch.'`');}
exit(!empty($failed)?1:0);
