# Workspace

## Overview

Student Deadline Tracker — a web app built with PHP + HTML/CSS/JS + SQLite (SQL).
Classic web stack, great for a CS course project.

## Stack

- **Frontend**: HTML, CSS (plain), JavaScript (vanilla, no frameworks)
- **Backend**: PHP 8.2 (built-in development server)
- **Database**: SQLite via PHP PDO (stored in `php-app/data/deadlines.db`)
- **Monorepo tool**: pnpm workspaces (for supporting infrastructure)

## Project Structure

```
php-app/
├── router.php       # PHP built-in server router — routes /api/* to api.php
├── db.php           # SQLite database connection + schema setup + seeding
├── api.php          # REST API endpoints (GET/POST/PATCH/DELETE /api/assignments)
├── index.html       # Dashboard page
├── add.html         # Add Assignment form page
├── css/
│   └── style.css    # All styles (colorful, student-friendly theme)
├── js/
│   └── app.js       # All frontend JavaScript (fetch API, countdown timers)
└── data/
    └── deadlines.db # SQLite database file (auto-created)
```

## How It Works

1. PHP built-in server starts on port 3000 (`php -S 0.0.0.0:3000 -t php-app router.php`)
2. `router.php` routes all `/api/*` requests to `api.php`, serves static files otherwise
3. `api.php` handles CRUD operations on the `assignments` table in SQLite
4. `db.php` creates the table if it doesn't exist and seeds sample data on first run
5. Frontend JS uses `fetch()` to call the PHP API and render the UI dynamically

## API Endpoints

- `GET    /api/assignments`         — list all assignments
- `GET    /api/assignments/summary` — get summary stats
- `GET    /api/assignments/{id}`    — get one assignment
- `POST   /api/assignments`         — create a new assignment
- `PATCH  /api/assignments/{id}`    — update an assignment (title, status, etc.)
- `DELETE /api/assignments/{id}`    — delete an assignment

## Database Schema (SQLite)

```sql
CREATE TABLE assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    course      TEXT    NOT NULL,
    description TEXT,
    due_date    TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    priority    TEXT    NOT NULL DEFAULT 'medium',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
)
```

## Features

- Add assignments with title, course, description, due date, priority
- Live countdown timers (updates every second)
- Mark assignments as done/pending
- Delete assignments
- Summary stats bar (total, pending, due soon, overdue, done)
- Filter tabs (All / Pending / Done / Overdue)
- Browser notifications + in-page banner for assignments due within 24h
- Color-coded priority badges (low=green, medium=orange, high=red)
