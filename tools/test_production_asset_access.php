<?php
// CLI-only authorization/path/manifest graph tests, no credentials or real session.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BASEPATH', dirname(__DIR__) . '/system/');
require dirname(__DIR__) . '/application/libraries/Production_asset_access.php';
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$root = sys_get_temp_dir() . '/production-access-' . bin2hex(random_bytes(8));
$files = array(); $directories = array();
function put_fixture($relative, $value) {
    global $root, $files, $directories;
    $path = $root . '/' . $relative;
    $dir = dirname($path);
    $missing = array();
    while (!is_dir($dir)) { $missing[] = $dir; $dir = dirname($dir); }
    foreach (array_reverse($missing) as $dir) { mkdir($dir); $directories[] = $dir; }
    file_put_contents($path, $value); $files[] = $path;
}
try {
    $manifest = array(
        'game-src/main.js'=>array('file'=>'assets/public-123.js', 'imports'=>array('_shared.js'), 'dynamicImports'=>array('game-src/republic-openworld.js'), 'css'=>array('assets/shared-123.css')),
        'game-src/admin-main.js'=>array('file'=>'assets/admin-123.js', 'imports'=>array('_shared.js'), 'dynamicImports'=>array('game-src/production-studio.js')),
        '_shared.js'=>array('file'=>'assets/shared-123.js'),
        'game-src/republic-openworld.js'=>array('file'=>'assets/world-123.js', 'imports'=>array('_shared.js')),
        'game-src/production-studio.js'=>array('file'=>'assets/studio-123.js', 'imports'=>array('_shared.js'), 'dynamicImports'=>array('_encoder.js')),
        '_encoder.js'=>array('file'=>'assets/encoder-123.js', 'imports'=>array('game-src/production-studio.js')),
    );
    put_fixture('assets/game/.vite/manifest.json', json_encode($manifest));
    foreach (array('public-123.js','admin-123.js','shared-123.js','world-123.js','studio-123.js','encoder-123.js','shared-123.css','old-studio.js') as $name) put_fixture('assets/game/assets/'.$name, 'fixture');
    foreach (array('game-src/production-day2.js','game-src/admin-main.js','game-src/republic-world-layout.js','public/audio/produksi/day-2/clip.wav','assets/game/audio/produksi/day-2/clip.wav','docs/record/source.mp4','docs/script/002-day-2-concept.md') as $path) put_fixture($path, 'fixture');
    $access = new Production_asset_access(array('root'=>$root));
    foreach (array('public-123.js','shared-123.js','world-123.js','shared-123.css') as $name) {
        $result=$access->resolve('assets/game/assets/'.$name, FALSE);
        check($result['status']===200 && !$result['private'], 'Public/shared graph denied: '.$name);
    }
    foreach (array('assets/game/assets/admin-123.js','assets/game/assets/studio-123.js','assets/game/assets/encoder-123.js','assets/game/.vite/manifest.json','game-src/production-day2.js','game-src/admin-main.js','public/audio/produksi/day-2/clip.wav','assets/game/audio/produksi/day-2/clip.wav','docs/record/source.mp4','docs/script/002-day-2-concept.md') as $path) {
        check($access->resolve($path,FALSE)['status']===403, 'Guest accessed '.$path);
        check($access->resolve($path,'admin')['status']===403, 'Truthy non-admin accessed '.$path);
        $result=$access->resolve($path,TRUE);
        check($result['status']===200 && $result['private'], 'Admin denied '.$path);
    }
    foreach (array('../.user.ini','game-src/../.user.ini','game-src/production-../../.user.ini','game-src/production-day2.js.','game-src/production-day2.js ','game-src/production-day2.js:secret','game-src/production-%2e%2e.js','game-src/production-foo\\..\\main.js','/game-src/production-day2.js','game-src//production-day2.js','application/config/admin_credentials.php','assets/game/assets/old-studio.js','game-src/republic-world-layout.js') as $path) check($access->resolve($path,TRUE)['status']===404, 'Invalid or unmanaged path accepted: '.$path);
    check(!Production_asset_access::guarded('public/models/characters/v15/female-balanced.glb'), 'Shared avatar is gated');
    check(!Production_asset_access::guarded('assets/game/map-assets/kawasan-warga.webp'), 'Public map asset is gated');
    foreach (array('game-src/republic-world-layout.js','game-src/republic-capital-scene.js','game-src/republic-openworld.js') as $path) check(!Production_asset_access::guarded($path), 'Shared world source is gated');
    check(Production_asset_access::byte_range(NULL,10)===array('status'=>200,'start'=>0,'end'=>9,'length'=>10),'Full range');
    check(Production_asset_access::byte_range('bytes=2-4',10)===array('status'=>206,'start'=>2,'end'=>4,'length'=>3),'Selected range');
    check(Production_asset_access::byte_range('bytes=-4',10)===array('status'=>206,'start'=>6,'end'=>9,'length'=>4),'Suffix range');
    check(Production_asset_access::byte_range('bytes=8-',10)===array('status'=>206,'start'=>8,'end'=>9,'length'=>2),'Open range');
    foreach (array('bytes=12-','bytes=4-2','bytes=-0','bytes=0-1,4-5','bad') as $header) check(Production_asset_access::byte_range($header,10)['status']===416,'Invalid range accepted');
    $manifest['game-src/main.js']['dynamicImports'][]='game-src/production-studio.js';
    file_put_contents($root.'/assets/game/.vite/manifest.json',json_encode($manifest));
    check((new Production_asset_access(array('root'=>$root)))->resolve('assets/game/assets/public-123.js',FALSE)['status']===403,'Mixed public/production graph leaked');
    unset($manifest['game-src/admin-main.js']);
    file_put_contents($root.'/assets/game/.vite/manifest.json',json_encode($manifest));
    check((new Production_asset_access(array('root'=>$root)))->resolve('assets/game/assets/public-123.js',FALSE)['status']===403,'Legacy mixed build leaked');
    echo "PASS production access: public/shared graph, private transitive imports, admin-only audio/source, strict session flag, path validation, stale bundles, fail-closed legacy graph, byte ranges.\n";
} finally {
    foreach (array_unique($files) as $file) if (is_file($file)) unlink($file);
    foreach (array_reverse($directories) as $directory) if (is_dir($directory)) rmdir($directory);
}
