<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Citizen_proposal_error extends RuntimeException {
    public $status;
    public function __construct($message,$status=422){parent::__construct($message);$this->status=$status;}
}
class Citizen_proposal_model extends CI_Model {
    private function query($sql,$args=array()) { $q=$this->db->query($sql,$args);if(!$q)throw new RuntimeException('Proposal query failed');return $q; }
    public function run($id,$payload=NULL) {
        $debug=$this->db->db_debug;$this->db->db_debug=FALSE;
        try {
            if(!$this->db->trans_begin())throw new RuntimeException('Transaction unavailable');
            $citizen=$this->query('SELECT id,is_active,display_name,gender,occupation,avatar_config FROM citizens WHERE id=? FOR UPDATE',array($id))->row_array();
            if(!$citizen || !(int)$citizen['is_active'])throw new Citizen_proposal_error('Akun warga tidak aktif.',403);
            require_once APPPATH.'helpers/citizen_identity_helper.php';
            if(!citizen_profile_complete($citizen))throw new Citizen_proposal_error('Lengkapi profil sebelum mengirim usulan.',403);
            $replayed=FALSE;
            if($payload!==NULL){
                foreach(array_keys($payload) as $key)if(!in_array($key,array('resource','csrfToken','requestId','category','title','location','reason'),TRUE))throw new Citizen_proposal_error('Kolom usulan tidak dikenal.');
                $values=array();
                foreach(array('requestId'=>64,'category'=>24,'title'=>70,'location'=>70,'reason'=>220) as $field=>$limit){
                    $v=$payload[$field]??NULL;if(!is_string($v)||strlen(trim($v))<3||strlen($v)>$limit||strip_tags($v)!==$v)throw new Citizen_proposal_error('Isi fasilitas, lokasi, dan alasan dengan lengkap.');$values[$field]=trim($v);
                }
                if(!preg_match('/^[a-zA-Z0-9_-]{16,64}$/D',$values['requestId'])||!in_array($values['category'],array('pendidikan','kesehatan','ekonomi','infrastruktur','lingkungan','lainnya'),TRUE))throw new Citizen_proposal_error('Kategori atau ID permintaan tidak valid.');
                $hash=hash('sha256',json_encode($values));
                $prior=$this->query('SELECT payload_hash FROM citizen_proposals WHERE citizen_id=? AND request_id=?',array($id,$values['requestId']))->row_array();
                if($prior){if(!hash_equals($prior['payload_hash'],$hash))throw new Citizen_proposal_error('ID permintaan telah dipakai untuk usulan berbeda.',409);$replayed=TRUE;}
                else{
                    $count=$this->query('SELECT COUNT(*) AS n FROM citizen_proposals WHERE citizen_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR)',array($id))->row_array();
                    if((int)$count['n']>=3)throw new Citizen_proposal_error('Maksimal tiga usulan dalam 24 jam. Pantau dahulu usulanmu.',429);
                    $publicId='game-'.bin2hex(random_bytes(16));
                    $comment='['.$values['category'].'] '.$values['title'].' | Lokasi: '.$values['location'].' | '.$values['reason'];
                    $this->query("INSERT INTO citizen_ideas (public_id,name,comment,platform,status,created_at,updated_at) VALUES (?,?,?,'Game','baru',UTC_TIMESTAMP(),UTC_TIMESTAMP())",array($publicId,mb_substr($citizen['display_name'],0,50),$comment));
                    $this->query('INSERT INTO citizen_proposals (citizen_id,request_id,idea_public_id,payload_hash,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP())',array($id,$values['requestId'],$publicId,$hash));
                }
            }
            $rows=$this->query('SELECT i.public_id AS id,i.comment,i.status,p.created_at AS createdAt FROM citizen_proposals p JOIN citizen_ideas i ON i.public_id=p.idea_public_id WHERE p.citizen_id=? ORDER BY p.created_at DESC LIMIT 20',array($id))->result_array();
            if(!$this->db->trans_status()||!$this->db->trans_commit())throw new RuntimeException('Commit failed');
            return array('ok'=>TRUE,'replayed'=>$replayed,'proposals'=>$rows);
        }catch(Throwable $e){$this->db->trans_rollback();throw $e;}finally{$this->db->db_debug=$debug;}
    }
}
