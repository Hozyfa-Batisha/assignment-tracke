# Student Deadline Tracker

A web application that helps students manage academic assignments and stay on top of deadlines. Built with PHP and SQLite — no external database or framework required.

## Features

- **Dashboard** — see all your assignments at a glance with colour-coded priority levels (low, medium, high)
- **Live countdowns** — each assignment shows a real-time ticker for time remaining
- **Statistics bar** — quick summary of total, pending, due soon, overdue, and completed tasks
- **Assignment management** — add, edit, mark as done/pending, and delete assignments
- **Filtering** — switch between All, Pending, Done, and Overdue views
- **Due-soon alerts** — an in-app notification banner appears for assignments due within 24 hours
- **User accounts** — register and log in; each user sees only their own assignments

## Running Locally

**Requirements:** PHP 8.0+ (with the `pdo_sqlite` extension enabled)

```bash
# Clone the repo
git clone <repo-url>
cd <repo-folder>

# Start the PHP built-in server
php -S 0.0.0.0:3000 -t php-app php-app/router.php
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

The SQLite database file (`php-app/data/deadlines.db`) is created automatically on the first request. No migrations or setup steps are needed.

## Demo Credentials

A demo account with sample assignments is seeded on first run:

| Field    | Value               |
|----------|---------------------|
| Email    | demo@example.com    |
| Password | demo123             |

You can also register a new account from the login page.

## Project Structure

```
php-app/
  router.php      # Entry point for the built-in server; routes requests
  db.php          # SQLite setup, table creation, and demo data seeding
  api.php         # REST endpoints for assignment CRUD
  auth.php        # Login, register, logout, and session check endpoints
  index.html      # Dashboard page
  add.html        # Add / edit assignment page
  login.html      # Login page
  register.html   # Registration page
  profile.html    # User profile page
  js/
    app.js        # Dashboard logic, countdown tickers, assignment interactions
    auth.js       # Session checks and auth form handling
  css/
    style.css     # Application styles
  data/           # SQLite database stored here (auto-created)
```
