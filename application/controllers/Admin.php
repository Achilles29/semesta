<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Admin extends CI_Controller
{
    private $credentials_ready = FALSE;

    public function __construct()
    {
        parent::__construct();
        $this->load->library('session');
    }

    public function index()
    {
        $this->output->set_header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
        $this->output->set_header('Pragma: no-cache');
        // Admin credentials are intentionally deployment-specific and ignored by Git.
        $this->credentials_ready = $this->config->load('admin_credentials', TRUE, TRUE);
        $expected_user = $this->credentials_ready ? $this->config->item('username', 'admin_credentials') : NULL;
        $password_hash = $this->credentials_ready ? $this->config->item('password_hash', 'admin_credentials') : NULL;
        if (!$expected_user) $expected_user = getenv('SEMESTA_ADMIN_USERNAME') ?: NULL;
        if (!$password_hash) $password_hash = getenv('SEMESTA_ADMIN_PASSWORD_HASH') ?: NULL;
        $this->credentials_ready = !empty($expected_user) && !empty($password_hash);

        if ($this->input->method(TRUE) === 'POST') {
            if (!$this->credentials_ready) {
                $this->load->view('admin_login', array('error' => 'Kredensial admin belum disiapkan di server.'));
                return;
            }
            $username = (string) $this->input->post('username', TRUE);
            $password = (string) $this->input->post('password', FALSE);

            if ($username === $expected_user && password_verify($password, $password_hash)) {
                $this->session->sess_regenerate(TRUE);
                $this->session->set_userdata('semesta_admin', TRUE);
                redirect('admin/');
                return;
            }

            $this->load->view('admin_login', array('error' => 'Nama pengguna atau kata sandi belum cocok.'));
            return;
        }

        if (!$this->session->userdata('semesta_admin')) {
            $this->load->view('admin_login', $this->credentials_ready ? array() : array('error' => 'Kredensial admin belum disiapkan di server.'));
            return;
        }

        $this->load->view('admin');
    }

    public function logout()
    {
        $this->session->unset_userdata('semesta_admin');
        $this->session->sess_regenerate(TRUE);
        redirect('admin/');
    }

    public function legacy_login()
    {
        redirect('admin/', 'location', 301);
    }
}
