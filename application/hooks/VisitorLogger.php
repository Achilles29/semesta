<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/** First-party HTML visit logging. JSON polling and static files are excluded. */
class VisitorLogger
{
    public function log_document_view()
    {
        $method = strtoupper(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET');
        $accept = strtolower(isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '');
        if ($method !== 'GET' || strpos($accept, 'text/html') === FALSE) return;

        $path = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
        $path = '/' . ltrim(is_string($path) ? $path : '/', '/');
        if (preg_match('#^/(api|assets|public|game-src|system|application|docs|database|tools)(/|$)#i', $path)) return;

        $remote = isset($_SERVER['REMOTE_ADDR']) ? trim($_SERVER['REMOTE_ADDR']) : '';
        $ip = $remote;
        try {
            $CI =& get_instance();
            if ($CI) {
                $CI->config->load('cloudflare_trusted', TRUE, TRUE);
                $trustedRanges = $CI->config->item('trusted_proxy_cidrs', 'cloudflare_trusted');
                $trustedEdge = is_array($trustedRanges) && $this->ip_in_cidrs($remote, $trustedRanges);
                // This host's Nginx access log confirms PHP is reached through
                // a loopback reverse proxy. Trust the Cloudflare header at that
                // boundary as well as when PHP sees Cloudflare's edge directly.
                $trustedLocalProxy = $this->ip_in_cidrs($remote, array('127.0.0.0/8', '::1/128'));
                if ($trustedEdge || $trustedLocalProxy) {
                    // Never accept a forwarded address from an arbitrary public peer.
                    $candidate = isset($_SERVER['HTTP_CF_CONNECTING_IPV6']) ? trim($_SERVER['HTTP_CF_CONNECTING_IPV6']) : '';
                    if ($candidate === '') $candidate = isset($_SERVER['HTTP_CF_CONNECTING_IP']) ? trim($_SERVER['HTTP_CF_CONNECTING_IP']) : '';
                    if ($candidate !== FALSE && @inet_pton($candidate) !== FALSE) $ip = $candidate;
                }
            }
        } catch (Throwable $error) {
            // Fall back to the socket peer if trusted-proxy configuration fails.
        }
        $packedIp = $ip !== '' ? @inet_pton($ip) : FALSE;
        if ($packedIp === FALSE) return;
        $ip = inet_ntop($packedIp);
        $ua = substr(isset($_SERVER['HTTP_USER_AGENT']) ? trim($_SERVER['HTTP_USER_AGENT']) : '', 0, 512);
        $referrer = $this->safe_referrer(isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
        $device = $this->device_type($ua);
        $browser = $this->browser($ua);
        $bot = preg_match('/bot|crawler|spider|slurp|headless|preview|facebookexternalhit|whatsapp/i', $ua) ? 1 : 0;
        $language = substr(isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) ? trim($_SERVER['HTTP_ACCEPT_LANGUAGE']) : '', 0, 64);

        try {
            $CI =& get_instance();
            if (!$CI) return;
            $CI->config->load('visitor_private', TRUE, TRUE);
            $key = (string) ($CI->config->item('hmac_key', 'visitor_private') ?: getenv('SEMESTA_VISITOR_HMAC_KEY'));
            if (strlen($key) < 32) return;
            $CI->load->database();

            $sessionId = '';
            if (isset($CI->session)) $sessionId = (string) $CI->session->userdata('session_id');
            $CI->db->insert('visitor_logs', array(
                'visited_at' => date('Y-m-d H:i:s'),
                'ip_address' => $ip,
                'ip_hash' => hash_hmac('sha256', $ip, $key),
                'visitor_hash' => hash_hmac('sha256', $ip . '|' . $ua, $key),
                'session_hash' => $sessionId !== '' ? hash_hmac('sha256', $sessionId, $key) : NULL,
                'request_path' => substr($path, 0, 255),
                'referrer_host' => $referrer['host'],
                'referrer_path' => $referrer['path'],
                'user_agent' => $ua !== '' ? $ua : NULL,
                'browser' => $browser,
                'device_type' => $device,
                'is_bot' => $bot,
                'language' => $language !== '' ? $language : NULL,
            ));

            // Keep visitor analytics for 90 days. Cleanup is sampled to avoid a
            // full-table delete on every page view.
            if (random_int(1, 300) === 1) $CI->db->query('DELETE FROM visitor_logs WHERE visited_at < DATE_SUB(NOW(), INTERVAL 90 DAY)');
        } catch (Throwable $error) {
            // Analytics must never interrupt a public or admin page request.
            log_message('error', 'Visitor logging skipped: ' . $error->getMessage());
        }
    }

    private function safe_referrer($value)
    {
        $parts = parse_url((string) $value);
        if (!is_array($parts) || empty($parts['host'])) return array('host' => NULL, 'path' => NULL);
        return array(
            'host' => substr(strtolower($parts['host']), 0, 190),
            'path' => substr(isset($parts['path']) ? $parts['path'] : '/', 0, 255),
        );
    }

    private function ip_in_cidrs($ip, array $cidrs)
    {
        $address = @inet_pton((string) $ip);
        if ($address === FALSE) return FALSE;
        foreach ($cidrs as $cidr) {
            $parts = explode('/', (string) $cidr, 2);
            $network = @inet_pton($parts[0]);
            if ($network === FALSE || strlen($network) !== strlen($address)) continue;
            $bits = isset($parts[1]) ? (int) $parts[1] : strlen($network) * 8;
            if ($bits < 0 || $bits > strlen($network) * 8) continue;
            $wholeBytes = intdiv($bits, 8); $remainingBits = $bits % 8;
            if ($wholeBytes > 0 && substr($address, 0, $wholeBytes) !== substr($network, 0, $wholeBytes)) continue;
            if ($remainingBits > 0) {
                $mask = (0xff << (8 - $remainingBits)) & 0xff;
                if ((ord($address[$wholeBytes]) & $mask) !== (ord($network[$wholeBytes]) & $mask)) continue;
            }
            return TRUE;
        }
        return FALSE;
    }

    private function device_type($ua)
    {
        if (preg_match('/ipad|tablet|kindle|silk/i', $ua)) return 'tablet';
        if (preg_match('/mobi|iphone|ipod|android/i', $ua)) return 'mobile';
        return 'desktop';
    }

    private function browser($ua)
    {
        if (preg_match('/edg\//i', $ua)) return 'Edge';
        if (preg_match('/opr\//i', $ua)) return 'Opera';
        if (preg_match('/firefox\//i', $ua)) return 'Firefox';
        if (preg_match('/chrome\//i', $ua)) return 'Chrome';
        if (preg_match('/safari\//i', $ua)) return 'Safari';
        if (preg_match('/curl|wget/i', $ua)) return 'Bot/CLI';
        return 'Lainnya';
    }
}
