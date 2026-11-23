<?php
// Controller-level fixture; no live credentials, mutations or account data.
define('BASEPATH',__DIR__); define('APPPATH',dirname(__DIR__).'/application/');
class CI_Controller {}
class OpsOutput { public $status=200,$body='',$headers=array(); function set_header($v){$this->headers[]=$v;return $this;} function set_status_header($v){$this->status=$v;return $this;} function set_output($v){$this->body=$v;return $this;} }
class OpsSession { public $admin=FALSE; function userdata($key){return $key==='semesta_admin'?$this->admin:NULL;} }
class OpsDb { public $conn_id=TRUE,$missing=NULL; function table_exists($table){return $table!==$this->missing;} }
require APPPATH.'controllers/Api.php';
$api=(new ReflectionClass('Api'))->newInstanceWithoutConstructor();$api->output=new OpsOutput();$api->session=new OpsSession();$api->db=new OpsDb();
$method=new ReflectionMethod('Api','admin_operations');$method->setAccessible(TRUE);
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$method->invoke($api,'GET');check($api->output->status===401,'Anonymous status is private');
$api->session->admin=TRUE;$api->output=new OpsOutput();$method->invoke($api,'POST');check($api->output->status===405,'Read only');
$api->output=new OpsOutput();$method->invoke($api,'GET');$result=json_decode($api->output->body,TRUE);check($result['database']===TRUE&&count($result['modules'])===4,'Complete status');check(count($result)===2,'No credentials/account data');check(strpos($api->output->headers[0],'no-store')!==FALSE,'No cache');
$api->db->missing='citizen_home_requests';$api->output=new OpsOutput();$method->invoke($api,'GET');check(json_decode($api->output->body,TRUE)['modules']['homes']===FALSE,'Partial schema not ready');
$api->db->conn_id=FALSE;$api->output=new OpsOutput();$method->invoke($api,'GET');check($api->output->status===503,'Database failure not shown active');
echo "PASS admin status: authentication, read-only, private response, complete schemas, missing table, unavailable database.\n";
