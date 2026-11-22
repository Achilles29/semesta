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

    /** Apache rewrites preserve asset URLs, so relative ESM imports keep working. */
    public function production_asset()
    {
        $this->load->library('production_asset_access');
        // CI retains %20 in REQUEST_URI; decode once, then reject traversal/aliases.
        $path = rawurldecode(implode('/', array_slice($this->uri->rsegment_array(), 2)));
        $asset = $this->production_asset_access->resolve($path, $this->session->userdata('semesta_admin') === TRUE);
        $method = $this->input->method(TRUE);
        if ($method !== 'GET' && $method !== 'HEAD') {
            $this->output->set_header('Allow: GET, HEAD');
            $asset = array('status'=>405);
        }
        if ($asset['status'] !== 200) {
            $this->output->set_status_header($asset['status'])->set_header('Cache-Control: private, no-store')->set_header('X-Content-Type-Options: nosniff')->set_content_type('text/plain')->set_output($asset['status'] === 403 ? 'Aset episode hanya tersedia untuk admin.' : 'Aset tidak tersedia.');
            return;
        }

        $range = Production_asset_access::byte_range($this->input->server('HTTP_RANGE'), $asset['size']);
        // Release the PHP session lock before concurrent modules/audio are streamed.
        if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
        http_response_code($range['status']);
        header('Content-Type: ' . $asset['mime']);
        header('X-Content-Type-Options: nosniff');
        header('Vary: Cookie');
        header('Accept-Ranges: bytes');
        header('Cache-Control: ' . ($asset['private'] ? 'private, no-store, max-age=0' : 'public, max-age=31536000, immutable'));
        if ($range['status'] === 416) {
            header('Content-Range: bytes */' . $asset['size']);
            header('Content-Length: 0');
            exit;
        }
        if ($range['status'] === 206) header('Content-Range: bytes ' . $range['start'] . '-' . $range['end'] . '/' . $asset['size']);
        header('Content-Length: ' . $range['length']);
        if ($method === 'HEAD') exit;
        $stream = fopen($asset['file'], 'rb');
        fseek($stream, $range['start']);
        $remaining = $range['length'];
        while ($remaining > 0 && !feof($stream) && !connection_aborted()) {
            $bytes = fread($stream, min(65536, $remaining));
            if ($bytes === FALSE || $bytes === '') break;
            echo $bytes;
            $remaining -= strlen($bytes);
        }
        fclose($stream);
        exit;
    }

    public function legacy_login()
    {
        redirect('admin/', 'location', 301);
    }
}
