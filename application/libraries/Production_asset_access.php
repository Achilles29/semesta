<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/** Decide which static production assets need the existing admin session.
 * Shared world geometry, models and map illustrations remain public.
 */
class Production_asset_access
{
    private $root;
    private $public_files = array();
    private $built_files = array();

    public function __construct($params = array())
    {
        $this->root = rtrim(str_replace('\\', '/', realpath(isset($params['root']) ? $params['root'] : FCPATH)), '/') . '/';
        $manifest_path = $this->root . 'assets/game/.vite/manifest.json';
        $manifest = is_file($manifest_path) ? json_decode(file_get_contents($manifest_path), TRUE) : NULL;
        // A legacy combined entry contains episodes. Never expose it as a public bundle.
        if (!is_array($manifest) || !isset($manifest['game-src/main.js'], $manifest['game-src/admin-main.js'])) return;
        $public_keys = $this->reachable($manifest, 'game-src/main.js');
        $admin_keys = $this->reachable($manifest, 'game-src/admin-main.js');
        foreach ($public_keys as $key) {
            if (preg_match('~(?:^|/)game-src/(?:production-|admin-)~', $key)) return;
        }
        $this->public_files = $this->manifest_files($manifest, $public_keys);
        $this->built_files = $this->manifest_files($manifest, array_unique(array_merge($public_keys, $admin_keys)));
    }

    public static function guarded($path)
    {
        return (bool) preg_match('~^(?:assets/game/(?:assets/|\.vite/)|(?:public|assets/game)/audio/produksi/|game-src/(?:production-|admin-)|docs/(?:record|script)/)~i', $path);
    }

    private function reachable($manifest, $entry)
    {
        $seen = array(); $pending = array($entry);
        while ($pending) {
            $key = array_pop($pending);
            if (isset($seen[$key]) || !isset($manifest[$key])) continue;
            $seen[$key] = TRUE;
            foreach (array('imports', 'dynamicImports') as $kind) {
                foreach (isset($manifest[$key][$kind]) ? $manifest[$key][$kind] : array() as $child) $pending[] = $child;
            }
        }
        return array_keys($seen);
    }

    private function manifest_files($manifest, $keys)
    {
        $files = array();
        foreach ($keys as $key) {
            $entry = $manifest[$key];
            foreach (array_merge(isset($entry['file']) ? array($entry['file']) : array(), isset($entry['css']) ? $entry['css'] : array(), isset($entry['assets']) ? $entry['assets'] : array()) as $file) {
                $files['assets/game/' . $file] = TRUE;
            }
        }
        return $files;
    }

    public function resolve($path, $admin)
    {
        // Reject encoded separators, dot segments and Windows aliases even for an admin.
        if (!is_string($path) || $path === '' || preg_match('~[\\\\%\x00-\x1f:]|(?:^|/)(?:\.|\.\.)(?:/|$)|(?:^|/)[^/]*[. ](?:/|$)~', $path) || strpos($path, '//') !== FALSE || !self::guarded($path)) return array('status' => 404);
        $public = strpos($path, 'assets/game/assets/') === 0 && isset($this->public_files[$path]);
        if (!$public && $admin !== TRUE) return array('status' => 403);
        // Unknown/stale hashed bundles are never an alternate route into an old episode.
        if (strpos($path, 'assets/game/assets/') === 0 && !isset($this->built_files[$path])) return array('status' => 404);
        $file = realpath($this->root . $path);
        if (!$file || !is_file($file) || strncmp(str_replace('\\', '/', $file), $this->root, strlen($this->root)) !== 0) return array('status' => 404);
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $types = array('js'=>'text/javascript; charset=utf-8', 'css'=>'text/css; charset=utf-8', 'json'=>'application/json; charset=utf-8', 'wav'=>'audio/wav', 'mp3'=>'audio/mpeg', 'aac'=>'audio/aac', 'mp4'=>'video/mp4', 'png'=>'image/png', 'jpg'=>'image/jpeg', 'jpeg'=>'image/jpeg', 'webp'=>'image/webp', 'svg'=>'image/svg+xml', 'md'=>'text/plain; charset=utf-8', 'txt'=>'text/plain; charset=utf-8');
        if (!isset($types[$extension])) return array('status' => 404);
        return array('status' => 200, 'file' => $file, 'private' => !$public, 'mime' => $types[$extension], 'size' => filesize($file));
    }

    public static function byte_range($header, $size)
    {
        if (!$header) return array('status'=>200, 'start'=>0, 'end'=>$size - 1, 'length'=>$size);
        if (!preg_match('/^bytes=(\d*)-(\d*)$/', $header, $parts) || ($parts[1] === '' && $parts[2] === '') || $size < 1) return array('status'=>416);
        $start = $parts[1] === '' ? max(0, $size - (int) $parts[2]) : (int) $parts[1];
        $end = $parts[1] === '' || $parts[2] === '' ? $size - 1 : min($size - 1, (int) $parts[2]);
        if ($start >= $size || $end < $start) return array('status'=>416);
        return array('status'=>206, 'start'=>$start, 'end'=>$end, 'length'=>$end - $start + 1);
    }
}
