<?php
// Test-only adapters. Never exposed by Apache or enabled in the application.
if (!in_array(PHP_SAPI,array('cli','cli-server'),TRUE)) { http_response_code(404); exit; }
defined('BASEPATH') OR define('BASEPATH',__DIR__);
defined('APPPATH') OR define('APPPATH',dirname(__DIR__).'/application/');
defined('FCPATH') OR define('FCPATH',dirname(__DIR__).'/');
defined('ENVIRONMENT') OR define('ENVIRONMENT','production');
require_once APPPATH.'helpers/republic_world_helper.php';
class WorldTestResult {
    private $rows;
    function __construct($rows) { $this->rows=$rows; }
    function row_array() { return $this->rows[0] ?? NULL; }
    function result_array() { return $this->rows; }
}
class WorldTestDb {
    public $conn_id,$db_debug=FALSE,$failNeedle=NULL; private $ok=TRUE,$name;
    function __construct($config) {
        $this->name=$config['database'];
        $this->conn_id=new mysqli($config['hostname'],$config['username'],$config['password'],$config['database'],$config['port']??3306);
        $this->conn_id->set_charset('utf8mb4');
    }
    function query($sql,$params=array()) {
        if ($this->failNeedle && strpos($sql,$this->failNeedle)!==FALSE) { $this->failNeedle=NULL; $this->ok=FALSE; return FALSE; }
        try {
            $statement=$this->conn_id->prepare($sql);
            if ($params) { $types=''; foreach($params as $value) $types.=is_int($value)?'i':(is_float($value)?'d':'s'); $statement->bind_param($types,...$params); }
            $statement->execute(); $result=$statement->get_result(); $rows=$result?$result->fetch_all(MYSQLI_ASSOC):array(); $statement->close();
            return new WorldTestResult($rows);
        } catch(Throwable $error) { $this->ok=FALSE; throw $error; }
    }
    function table_exists($name) { return !!$this->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',array($this->name,$name))->row_array(); }
    function trans_begin() { $this->ok=TRUE; return $this->conn_id->begin_transaction(); }
    function trans_commit() { return $this->conn_id->commit(); }
    function trans_rollback() { return $this->conn_id->rollback(); }
    function trans_status() { return $this->ok; }
}
class CI_Model { public $db; function __construct() { $this->db=$GLOBALS['worldTestDb']; } }
class CI_Controller { public $session,$db,$semesta,$output,$load,$input,$republic; }
class WorldTestOutput {
    public $status=200,$body='';
    function set_header($header){header($header);return $this;}
    function set_content_type(...$args){return $this;}
    function set_status_header($status){$this->status=$status;return $this;}
    function set_output($body){$this->body=$body;return $this;}
}
class WorldTestSession {
    function userdata($key){return $_SESSION[$key]??NULL;}
    function set_userdata($key,$value){$_SESSION[$key]=$value;}
}
class WorldTestLoad {
    private $controller;
    function __construct($controller){$this->controller=$controller;}
    function helper($name){}
    function model($name,$alias){$this->controller->$alias=new $name();}
}
class WorldTestInput {
    public $raw_input_stream;
    function __construct(){ $this->raw_input_stream=file_get_contents('php://input'); }
    function method($upper=FALSE){return $_SERVER['REQUEST_METHOD'];}
    function get($key,...$args){return $_GET[$key]??NULL;}
}
function log_message(...$args){}
require_once APPPATH.'models/Republic_world_model.php';
require_once APPPATH.'controllers/Api.php';
function world_test_schema($connection) {
    $connection->multi_query(file_get_contents(dirname(__DIR__).'/database/migrations/20261123_republic_world.sql'));
    do { if($result=$connection->store_result())$result->free(); } while($connection->more_results() && $connection->next_result());
}
