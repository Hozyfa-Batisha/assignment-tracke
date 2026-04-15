<?php
/**
 * api.php
 * REST API endpoints for the Deadline Tracker.
 * Requires an active session (user must be logged in).
 *
 * Routes:
 *   GET    /api/assignments          - List current user's assignments
 *   GET    /api/assignments/summary  - Summary stats for current user
 *   GET    /api/assignments/{id}     - Get one assignment
 *   POST   /api/assignments          - Create assignment
 *   PATCH  /api/assignments/{id}     - Update assignment
 *   DELETE /api/assignments/{id}     - Delete assignment
 */

require __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Auth check ────────────────────────────────────────────────────────────────
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated. Please log in.']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove /api prefix
$path     = preg_replace('#^/api#', '', $path);
$segments = array_values(array_filter(explode('/', $path)));

$db = getDB();

// ─── Route: /api/assignments ──────────────────────────────────────────────────
if (empty($segments) || $segments[0] === 'assignments') {
    $id = isset($segments[1]) ? (int)$segments[1] : null;

    // ── GET /api/assignments/summary ─────────────────────────────────────────
    if (isset($segments[1]) && $segments[1] === 'summary') {
        $rows = $db->prepare('SELECT * FROM assignments WHERE user_id = ?');
        $rows->execute([$userId]);
        $rows = $rows->fetchAll();

        $now     = time();
        $total   = count($rows);
        $pending = 0;
        $done    = 0;
        $overdue = 0;
        $dueSoon = 0;

        foreach ($rows as $row) {
            $due = strtotime($row['due_date']);
            if ($row['status'] === 'done') {
                $done++;
            } else {
                $pending++;
                if ($due < $now) {
                    $overdue++;
                } elseif ($due - $now <= 3 * 86400) {
                    $dueSoon++;
                }
            }
        }

        echo json_encode(compact('total', 'pending', 'done', 'overdue', 'dueSoon'));
        exit;
    }

    // ── GET /api/assignments ──────────────────────────────────────────────────
    if ($method === 'GET' && $id === null) {
        $stmt = $db->prepare(
            'SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC'
        );
        $stmt->execute([$userId]);
        echo json_encode(array_values($stmt->fetchAll()));
        exit;
    }

    // ── GET /api/assignments/{id} ─────────────────────────────────────────────
    if ($method === 'GET' && $id) {
        $stmt = $db->prepare('SELECT * FROM assignments WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
        echo json_encode($row);
        exit;
    }

    // ── POST /api/assignments ─────────────────────────────────────────────────
    if ($method === 'POST') {
        $body        = json_decode(file_get_contents('php://input'), true) ?? [];
        $title       = trim($body['title']       ?? '');
        $course      = trim($body['course']      ?? '');
        $due_date    = trim($body['due_date']    ?? '');
        $priority    = $body['priority']         ?? 'medium';
        $description = $body['description']      ?? null;

        if (!$title || !$course || !$due_date) {
            http_response_code(400);
            echo json_encode(['error' => 'title, course, and due_date are required']);
            exit;
        }

        if (!in_array($priority, ['low', 'medium', 'high'])) {
            http_response_code(400);
            echo json_encode(['error' => 'priority must be low, medium, or high']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO assignments (user_id, title, course, description, due_date, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$userId, $title, $course, $description ?: null, $due_date, $priority]);
        $newId = $db->lastInsertId();

        $row = $db->prepare('SELECT * FROM assignments WHERE id = ?');
        $row->execute([$newId]);

        http_response_code(201);
        echo json_encode($row->fetch());
        exit;
    }

    // ── PATCH /api/assignments/{id} ───────────────────────────────────────────
    if ($method === 'PATCH' && $id) {
        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $allowed = ['title', 'course', 'description', 'due_date', 'status', 'priority'];
        $set     = [];
        $values  = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $set[]    = "$field = ?";
                $values[] = $body[$field];
            }
        }

        if (empty($set)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }

        $values[] = $id;
        $values[] = $userId;
        $stmt = $db->prepare(
            'UPDATE assignments SET ' . implode(', ', $set) . ' WHERE id = ? AND user_id = ?'
        );
        $stmt->execute($values);

        $row = $db->prepare('SELECT * FROM assignments WHERE id = ? AND user_id = ?');
        $row->execute([$id, $userId]);
        $updated = $row->fetch();

        if (!$updated) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
        echo json_encode($updated);
        exit;
    }

    // ── DELETE /api/assignments/{id} ──────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $stmt = $db->prepare('DELETE FROM assignments WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        http_response_code(204);
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
