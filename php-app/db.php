<?php
/**
 * db.php
 * Database connection and setup using SQLite via PDO.
 * Creates all tables and seeds a demo user on first run.
 */

function getDB(): PDO {
    $dbPath = __DIR__ . '/data/deadlines.db';

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA foreign_keys=ON');

    // ── Users table ──────────────────────────────────────────────
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL,
            email         TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    ");

    // ── Assignments table ────────────────────────────────────────
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS assignments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL DEFAULT 1,
            title       TEXT    NOT NULL,
            course      TEXT    NOT NULL,
            description TEXT,
            due_date    TEXT    NOT NULL,
            status      TEXT    NOT NULL DEFAULT 'pending',
            priority    TEXT    NOT NULL DEFAULT 'medium',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ");

    // ── Seed demo user + sample assignments (only if DB is empty) ─
    $userCount = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($userCount == 0) {
        // Create a demo user (password: demo123)
        $hash = password_hash('demo123', PASSWORD_DEFAULT);
        $pdo->prepare("
            INSERT INTO users (username, email, password_hash)
            VALUES ('Demo Student', 'demo@example.com', ?)
        ")->execute([$hash]);

        $userId = $pdo->lastInsertId();

        $seeds = [
            [$userId, 'Final Project Report',   'Web Programming',   'Submit the complete project report with documentation', date('Y-m-d H:i:s', strtotime('+7 days')),  'pending', 'high'],
            [$userId, 'Database Schema Design',  'Database Systems',  null,                                                    date('Y-m-d H:i:s', strtotime('+1 days')),  'pending', 'high'],
            [$userId, 'Lab Exercise 3',          'Algorithms',        'Complete sorting algorithm exercises',                  date('Y-m-d H:i:s', strtotime('+3 days')),  'pending', 'medium'],
            [$userId, 'Quiz 2 Prep',             'Operating Systems', null,                                                    date('Y-m-d H:i:s', strtotime('-2 days')),  'pending', 'medium'],
            [$userId, 'Homework 5',              'Calculus',          'Practice integration problems',                         date('Y-m-d H:i:s', strtotime('+14 days')), 'done',    'low'],
        ];

        $stmt = $pdo->prepare("
            INSERT INTO assignments (user_id, title, course, description, due_date, status, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($seeds as $seed) {
            $stmt->execute($seed);
        }
    }

    return $pdo;
}
