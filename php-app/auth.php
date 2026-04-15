<?php
/**
 * auth.php
 * Authentication API endpoints.
 *
 * Routes:
 *   POST /api/auth/register  — create account
 *   POST /api/auth/login     — log in
 *   POST /api/auth/logout    — log out
 *   GET  /api/auth/me        — get current user info
 */

require __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method   = $_SERVER['REQUEST_METHOD'];
$uri      = $_SERVER['REQUEST_URI'];
$path     = parse_url($uri, PHP_URL_PATH);
// Remove /api/auth prefix
$path     = preg_replace('#^/api/auth#', '', $path);
$path     = rtrim($path, '/') ?: '/';

$db = getDB();

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
if ($method === 'GET' && $path === '/me') {
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }

    $stmt = $db->prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    // Count assignments
    $total   = $db->prepare('SELECT COUNT(*) FROM assignments WHERE user_id = ?');
    $total->execute([$_SESSION['user_id']]);
    $pending = $db->prepare("SELECT COUNT(*) FROM assignments WHERE user_id = ? AND status = 'pending'");
    $pending->execute([$_SESSION['user_id']]);
    $done    = $db->prepare("SELECT COUNT(*) FROM assignments WHERE user_id = ? AND status = 'done'");
    $done->execute([$_SESSION['user_id']]);

    $user['stats'] = [
        'total'   => (int)$total->fetchColumn(),
        'pending' => (int)$pending->fetchColumn(),
        'done'    => (int)$done->fetchColumn(),
    ];

    echo json_encode($user);
    exit;
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
if ($method === 'POST' && $path === '/register') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $username = trim($body['username'] ?? '');
    $email    = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    if (!$username || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'username, email, and password are required']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email address']);
        exit;
    }

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters']);
        exit;
    }

    // Check if email already taken
    $check = $db->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already registered']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute([$username, $email, $hash]);
    $newId = $db->lastInsertId();

    // Start session
    $_SESSION['user_id']  = (int)$newId;
    $_SESSION['username'] = $username;
    $_SESSION['email']    = $email;

    http_response_code(201);
    echo json_encode([
        'id'         => (int)$newId,
        'username'   => $username,
        'email'      => $email,
        'created_at' => date('Y-m-d H:i:s'),
    ]);
    exit;
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
if ($method === 'POST' && $path === '/login') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $email    = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'email and password are required']);
        exit;
    }

    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        exit;
    }

    // Start session
    $_SESSION['user_id']  = (int)$user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email']    = $user['email'];

    echo json_encode([
        'id'         => (int)$user['id'],
        'username'   => $user['username'],
        'email'      => $user['email'],
        'created_at' => $user['created_at'],
    ]);
    exit;
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
if ($method === 'POST' && $path === '/logout') {
    $_SESSION = [];
    session_destroy();
    echo json_encode(['message' => 'Logged out']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
