<?php
/**
 * api.php
 * REST API endpoints for the Deadline Tracker.
 *
 * Routes:
 *   GET    /api/assignments          - List all assignments
 *   GET    /api/assignments/summary  - Get summary stats
 *   GET    /api/assignments/{id}     - Get one assignment
 *   POST   /api/assignments          - Create assignment
 *   PATCH  /api/assignments/{id}     - Update assignment
 *   DELETE /api/assignments/{id}     - Delete assignment
 */

require __DIR__ . '/db.php';

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove /api prefix and split path into segments
$path     = preg_replace('#^/api#', '', $path);
$segments = array_values(array_filter(explode('/', $path)));

// Connect to database
$db = getDB();

// ─── Route: /api/assignments ─────────────────────────────────────────────────
if (count($segments) === 0 || $segments[0] === 'assignments') {
    $id = isset($segments[1]) ? (int)$segments[1] : null;

    // Special route: /api/assignments/summary
    if ($segments[1] ?? '' === 'summary') {
        $rows = $db->query('SELECT * FROM assignments')->fetchAll();
        $now  = time();

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

    // GET /api/assignments
    if ($method === 'GET' && $id === null) {
        $rows = $db->query(
            'SELECT * FROM assignments ORDER BY due_date ASC'
        )->fetchAll();
        echo json_encode(array_values($rows));
        exit;
    }

    // GET /api/assignments/{id}
    if ($method === 'GET' && $id) {
        $stmt = $db->prepare('SELECT * FROM assignments WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
        echo json_encode($row);
        exit;
    }

    // POST /api/assignments
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);

        $title    = trim($body['title']    ?? '');
        $course   = trim($body['course']   ?? '');
        $due_date = trim($body['due_date'] ?? '');
        $priority = $body['priority']      ?? 'medium';
        $description = $body['description'] ?? null;

        if (!$title || !$course || !$due_date) {
            http_response_code(400);
            echo json_encode(['error' => 'title, course, and due_date are required']);
            exit;
        }

        $validPriorities = ['low', 'medium', 'high'];
        if (!in_array($priority, $validPriorities)) {
            http_response_code(400);
            echo json_encode(['error' => 'priority must be low, medium, or high']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO assignments (title, course, description, due_date, priority, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$title, $course, $description, $due_date, $priority]);
        $newId = $db->lastInsertId();

        $new = $db->prepare('SELECT * FROM assignments WHERE id = ?');
        $new->execute([$newId]);

        http_response_code(201);
        echo json_encode($new->fetch());
        exit;
    }

    // PATCH /api/assignments/{id}
    if ($method === 'PATCH' && $id) {
        $body = json_decode(file_get_contents('php://input'), true);

        // Build the SET clause dynamically from provided fields
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
        $stmt = $db->prepare('UPDATE assignments SET ' . implode(', ', $set) . ' WHERE id = ?');
        $stmt->execute($values);

        $updated = $db->prepare('SELECT * FROM assignments WHERE id = ?');
        $updated->execute([$id]);
        $row = $updated->fetch();

        if (!$row) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
        echo json_encode($row);
        exit;
    }

    // DELETE /api/assignments/{id}
    if ($method === 'DELETE' && $id) {
        $stmt = $db->prepare('DELETE FROM assignments WHERE id = ?');
        $stmt->execute([$id]);
        http_response_code(204);
        exit;
    }
}

// Fallback: 404
http_response_code(404);
echo json_encode(['error' => 'Not found']);
