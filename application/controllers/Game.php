<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Game extends CI_Controller
{
    public function index()
    {
        $this->output->set_header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        $this->output->set_header('Pragma: no-cache');
        $this->output->set_header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
        $this->load->view('game');
    }
}
