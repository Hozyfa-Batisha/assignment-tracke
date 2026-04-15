<?php
/**
 * router.php
 * PHP built-in server router script.
 * Routes /api/* requests to api.php and serves static files for everything else.
 */

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Route API requests to api.php
if (strpos($path, '/api') === 0) {
    require __DIR__ . '/api.php';
    return true;
}

// Serve static files if they exist
$filePath = __DIR__ . $path;
if ($path !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    return false; // Let PHP's built-in server handle the static file
}

// Default: serve index.html
require __DIR__ . '/index.html';
return true;
