<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Admin extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->library('session');
        $this->config->load('admin_credentials', TRUE);
    }

    public function index()
    {
        $remote = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
        if (!in_array($remote, array('127.0.0.1', '::1'), TRUE)) {
            show_error('Panel admin hanya tersedia dari komputer lokal.', 403);
            return;
        }

        if ($this->input->method(TRUE) === 'POST') {
            $username = (string) $this->input->post('username', TRUE);
            $password = (string) $this->input->post('password', FALSE);
            $expected_user = $this->config->item('username', 'admin_credentials');
            $password_hash = $this->config->item('password_hash', 'admin_credentials');

            if ($username === $expected_user && password_verify($password, $password_hash)) {
                $this->session->sess_regenerate(TRUE);
                $this->session->set_userdata('semesta_admin', TRUE);
                redirect('admin');
                return;
            }

            $this->load->view('admin_login', array('error' => 'Nama pengguna atau kata sandi belum cocok.'));
            return;
        }

        if (!$this->session->userdata('semesta_admin')) {
            $this->load->view('admin_login');
            return;
        }

        $this->load->view('admin');
    }

    public function logout()
    {
        $remote = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
        if (!in_array($remote, array('127.0.0.1', '::1'), TRUE)) {
            show_error('Panel admin hanya tersedia dari komputer lokal.', 403);
            return;
        }

        $this->session->unset_userdata('semesta_admin');
        $this->session->sess_regenerate(TRUE);
        redirect('admin');
    }
}
