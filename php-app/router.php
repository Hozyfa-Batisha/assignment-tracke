<?php
/**
 * router.php
 * PHP built-in server router script.
 * Handles session start and routes all requests.
 */

// Start session for every request
session_start();

$uri  = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// ── Route /api/auth/* to auth.php ─────────────────────────────────────────────
if (strpos($path, '/api/auth') === 0) {
    require __DIR__ . '/auth.php';
    return true;
}

// ── Route /api/* to api.php ───────────────────────────────────────────────────
if (strpos($path, '/api') === 0) {
    require __DIR__ . '/api.php';
    return true;
}

// ── Serve static files (CSS, JS, images, etc.) ───────────────────────────────
$filePath = __DIR__ . $path;
if ($path !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    return false; // Let PHP's built-in server serve the file directly
}

// ── HTML page routing ─────────────────────────────────────────────────────────
$pageMap = [
    '/'           => '/index.html',
    '/add'        => '/add.html',
    '/add.html'   => '/add.html',
    '/login'      => '/login.html',
    '/login.html' => '/login.html',
    '/register'      => '/register.html',
    '/register.html' => '/register.html',
    '/profile'       => '/profile.html',
    '/profile.html'  => '/profile.html',
];

$page = $pageMap[$path] ?? '/index.html';
readfile(__DIR__ . $page);
return true;
