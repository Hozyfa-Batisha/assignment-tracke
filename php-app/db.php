<?php
/**
 * db.php
 * Database connection and setup using SQLite via PDO.
 * SQLite stores everything in a single file — no server needed.
 */

function getDB(): PDO {
    $dbPath = __DIR__ . '/data/deadlines.db';

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Enable WAL mode for better concurrency
    $pdo->exec('PRAGMA journal_mode=WAL');

    // Create tables if they don't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS assignments (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            title     TEXT    NOT NULL,
            course    TEXT    NOT NULL,
            description TEXT,
            due_date  TEXT    NOT NULL,
            status    TEXT    NOT NULL DEFAULT 'pending',
            priority  TEXT    NOT NULL DEFAULT 'medium',
            created_at TEXT   NOT NULL DEFAULT (datetime('now'))
        )
    ");

    // Seed sample data if the table is empty
    $count = $pdo->query('SELECT COUNT(*) FROM assignments')->fetchColumn();
    if ($count == 0) {
        $seeds = [
            ['Final Project Report',    'Web Programming',   'Submit the complete project report with documentation', date('Y-m-d H:i:s', strtotime('+7 days')),  'pending', 'high'],
            ['Database Schema Design',  'Database Systems',  null,                                                    date('Y-m-d H:i:s', strtotime('+1 days')),  'pending', 'high'],
            ['Lab Exercise 3',          'Algorithms',        'Complete sorting algorithm exercises',                  date('Y-m-d H:i:s', strtotime('+3 days')),  'pending', 'medium'],
            ['Quiz 2 Prep',             'Operating Systems', null,                                                    date('Y-m-d H:i:s', strtotime('-2 days')),  'pending', 'medium'],
            ['Homework 5',              'Calculus',          'Practice integration problems',                         date('Y-m-d H:i:s', strtotime('+14 days')), 'done',    'low'],
        ];
        $stmt = $pdo->prepare("
            INSERT INTO assignments (title, course, description, due_date, status, priority)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        foreach ($seeds as $seed) {
            $stmt->execute($seed);
        }
    }

    return $pdo;
}
