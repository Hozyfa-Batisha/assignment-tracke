/**
 * app.js — DeadlineZone Frontend Logic
 * Plain JavaScript (no frameworks) for the Student Deadline Tracker.
 */

/* ============================================================
   API HELPERS
   All API calls go through these functions.
   The backend is PHP at /api/assignments
   ============================================================ */

const API_BASE = '/api/assignments';

/**
 * Generic fetch wrapper that returns JSON or throws an error.
 */
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (response.status === 204) return null; // No content (DELETE success)

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

/** GET /api/assignments — fetch all assignments */
async function fetchAssignments() {
  return apiFetch(API_BASE);
}

/** GET /api/assignments/summary — fetch summary stats */
async function fetchSummary() {
  return apiFetch(API_BASE + '/summary');
}

/** POST /api/assignments — create a new assignment */
async function createAssignment(data) {
  return apiFetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** PATCH /api/assignments/{id} — update an assignment */
async function updateAssignment(id, data) {
  return apiFetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** DELETE /api/assignments/{id} — delete an assignment */
async function deleteAssignment(id) {
  return apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

/* ============================================================
   COUNTDOWN HELPER
   Calculates and formats the time remaining until a due date.
   ============================================================ */

/**
 * Returns an object with { text, cssClass } for the countdown display.
 * cssClass is one of: overdue, urgent, normal, safe, done
 */
function getCountdown(dueDateStr, status) {
  if (status === 'done') {
    return { text: 'Completed', cssClass: 'done' };
  }

  const now    = new Date();
  const due    = new Date(dueDateStr);
  const diffMs = due - now;

  if (diffMs < 0) {
    return { text: 'OVERDUE', cssClass: 'overdue' };
  }

  const diffSec  = Math.floor(diffMs / 1000);
  const days     = Math.floor(diffSec / 86400);
  const hours    = Math.floor((diffSec % 86400) / 3600);
  const minutes  = Math.floor((diffSec % 3600) / 60);

  let text;
  if (days > 0) {
    text = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m left`;
  } else {
    text = `${minutes}m left`;
  }

  let cssClass;
  if (diffMs < 86400000)      cssClass = 'urgent'; // < 1 day
  else if (diffMs < 259200000) cssClass = 'normal'; // < 3 days
  else                         cssClass = 'safe';

  return { text, cssClass };
}

/**
 * Formats a date string into a human-readable local date/time.
 * e.g. "Apr 18, 11:59 PM"
 */
function formatDueDate(dueDateStr) {
  const d = new Date(dueDateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */

// Current filter state
let currentFilter  = 'all';
let allAssignments = [];
let countdownTimer = null;

/**
 * Builds and injects a single assignment card into the DOM.
 */
function buildCard(assignment) {
  const { id, title, course, description, due_date, status, priority } = assignment;
  const countdown = getCountdown(due_date, status);

  const card = document.createElement('div');
  card.className = `card priority-${priority} status-${status}`;
  card.dataset.id = id;

  // Countdown icon
  const icons = { overdue: '!', urgent: '!', normal: '⏰', safe: '⏰', done: '✓' };

  card.innerHTML = `
    <div class="card-top">
      <div class="card-badges">
        <span class="badge badge-course">${escHtml(course)}</span>
        <span class="badge badge-${priority}">${priority.toUpperCase()}</span>
        ${status === 'done' ? '<span class="badge badge-done">DONE</span>' : ''}
      </div>
      <div class="card-actions">
        <button class="btn-icon btn-delete" data-id="${id}" title="Delete assignment">&#128465;</button>
      </div>
    </div>

    <div class="card-title">${escHtml(title)}</div>

    ${description ? `<div class="card-description">${escHtml(description)}</div>` : ''}

    <div class="card-countdown ${countdown.cssClass}">
      <span>${icons[countdown.cssClass] || '⏰'}</span>
      <span class="countdown-text">${countdown.text}</span>
    </div>
    <div class="card-due-date">Due: ${formatDueDate(due_date)}</div>

    <button class="card-toggle-btn" data-id="${id}" data-status="${status}">
      ${status === 'pending' ? '&#10003; Mark as Done' : '↩ Mark as Pending'}
    </button>
  `;

  return card;
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Returns true if the assignment matches the current filter */
function matchesFilter(assignment) {
  const now = new Date();
  switch (currentFilter) {
    case 'pending': return assignment.status === 'pending';
    case 'done':    return assignment.status === 'done';
    case 'overdue': return assignment.status === 'pending' && new Date(assignment.due_date) < now;
    default:        return true;
  }
}

/** Renders the assignment cards grid */
function renderCards(assignments) {
  const grid       = document.getElementById('cards-grid');
  const emptyState = document.getElementById('empty-state');
  if (!grid) return;

  const filtered = assignments.filter(matchesFilter);

  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(assignment => {
    grid.appendChild(buildCard(assignment));
  });

  // Attach event listeners
  grid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });

  grid.querySelectorAll('.card-toggle-btn').forEach(btn => {
    btn.addEventListener('click', handleToggle);
  });
}

/** Updates countdown text in all visible cards (runs every second) */
function tickCountdowns() {
  document.querySelectorAll('.card').forEach(card => {
    const id = parseInt(card.dataset.id);
    const assignment = allAssignments.find(a => a.id === id);
    if (!assignment) return;

    const countdown = getCountdown(assignment.due_date, assignment.status);
    const textEl    = card.querySelector('.countdown-text');
    const wrapEl    = card.querySelector('.card-countdown');

    if (textEl)  textEl.textContent = countdown.text;
    if (wrapEl) {
      wrapEl.className = `card-countdown ${countdown.cssClass}`;
    }
  });
}

/** Loads summary stats from the API and updates the stat cards */
async function loadSummary() {
  try {
    const summary = await fetchSummary();
    document.getElementById('stat-total').textContent    = summary.total;
    document.getElementById('stat-pending').textContent  = summary.pending;
    document.getElementById('stat-due-soon').textContent = summary.dueSoon;
    document.getElementById('stat-overdue').textContent  = summary.overdue;
    document.getElementById('stat-done').textContent     = summary.done;
  } catch (err) {
    console.error('Failed to load summary:', err);
  }
}

/** Loads assignments and renders the page */
async function loadDashboard() {
  try {
    allAssignments = await fetchAssignments();
    renderCards(allAssignments);
    await loadSummary();
    checkNotifications(allAssignments);
  } catch (err) {
    const grid = document.getElementById('cards-grid');
    if (grid) grid.innerHTML = `<div class="loading" style="color:var(--clr-red)">Error: ${err.message}</div>`;
  }
}

/** Handles deleting an assignment */
async function handleDelete(event) {
  const id = parseInt(event.currentTarget.dataset.id);
  if (!confirm('Delete this assignment?')) return;

  try {
    await deleteAssignment(id);
    allAssignments = allAssignments.filter(a => a.id !== id);
    renderCards(allAssignments);
    await loadSummary();
  } catch (err) {
    alert('Error deleting assignment: ' + err.message);
  }
}

/** Handles toggling done/pending status */
async function handleToggle(event) {
  const id        = parseInt(event.currentTarget.dataset.id);
  const curStatus = event.currentTarget.dataset.status;
  const newStatus = curStatus === 'pending' ? 'done' : 'pending';

  try {
    const updated = await updateAssignment(id, { status: newStatus });
    const index   = allAssignments.findIndex(a => a.id === id);
    if (index !== -1) allAssignments[index] = updated;
    renderCards(allAssignments);
    await loadSummary();
  } catch (err) {
    alert('Error updating assignment: ' + err.message);
  }
}

/* ============================================================
   BROWSER NOTIFICATIONS
   Asks for permission and alerts the user if any assignment
   is due within the next 24 hours.
   ============================================================ */

function checkNotifications(assignments) {
  const now    = new Date();
  const in24h  = new Date(now.getTime() + 86400000);

  const dueSoon = assignments.filter(a =>
    a.status === 'pending' &&
    new Date(a.due_date) > now &&
    new Date(a.due_date) <= in24h
  );

  if (dueSoon.length === 0) return;

  // Show in-page banner
  const banner = document.getElementById('notif-banner');
  const text   = document.getElementById('notif-text');
  if (banner && text) {
    text.textContent = `Heads up! ${dueSoon.length} assignment${dueSoon.length > 1 ? 's are' : ' is'} due within 24 hours.`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 8000);
  }

  // Try browser notification
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        dueSoon.forEach(a => {
          new Notification('DeadlineZone - Due Soon!', {
            body: `"${a.title}" (${a.course}) is due soon.`,
            icon: '/favicon.ico',
          });
        });
      }
    });
  }
}

/* ============================================================
   ADD ASSIGNMENT FORM
   ============================================================ */

function initAddForm() {
  const form = document.getElementById('add-form');
  if (!form) return;

  // Set minimum date to now
  const dueDateInput = document.getElementById('due_date');
  if (dueDateInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dueDateInput.min = now.toISOString().slice(0, 16);
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    // Clear previous errors
    clearFormErrors();

    const title       = document.getElementById('title').value.trim();
    const course      = document.getElementById('course').value.trim();
    const description = document.getElementById('description').value.trim();
    const due_date    = document.getElementById('due_date').value;
    const priority    = document.getElementById('priority').value;

    // Validate
    let hasError = false;

    if (!title) {
      showFieldError('title', 'title-error');
      hasError = true;
    }
    if (!course) {
      showFieldError('course', 'course-error');
      hasError = true;
    }
    if (!due_date) {
      showFieldError('due_date', 'due-date-error');
      hasError = true;
    }

    if (hasError) return;

    // Disable submit button while saving
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      await createAssignment({
        title,
        course,
        description: description || null,
        due_date: new Date(due_date).toISOString().replace('T', ' ').slice(0, 19),
        priority,
      });

      // Redirect back to dashboard on success
      window.location.href = '/';
    } catch (err) {
      const errorDiv = document.getElementById('form-error');
      if (errorDiv) {
        errorDiv.textContent = 'Error: ' + err.message;
        errorDiv.classList.remove('hidden');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Assignment';
    }
  });
}

function showFieldError(inputId, errorId) {
  document.getElementById(inputId)?.classList.add('invalid');
  document.getElementById(errorId)?.classList.remove('hidden');
}

function clearFormErrors() {
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.field-error').forEach(el => el.classList.add('hidden'));
  const errorDiv = document.getElementById('form-error');
  if (errorDiv) errorDiv.classList.add('hidden');
}

/* ============================================================
   FILTER BUTTONS
   ============================================================ */

function initFilters() {
  const filterContainer = document.getElementById('filters');
  if (!filterContainer) return;

  filterContainer.addEventListener('click', function (event) {
    const btn = event.target.closest('.filter-btn');
    if (!btn) return;

    filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderCards(allAssignments);
  });
}

/* ============================================================
   PAGE INIT
   Run the right code based on the current page.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const isDashboard = !!document.getElementById('cards-grid');
  const isAddForm   = !!document.getElementById('add-form');

  if (isDashboard) {
    initFilters();
    loadDashboard();

    // Update countdowns every second
    countdownTimer = setInterval(tickCountdowns, 1000);
  }

  if (isAddForm) {
    initAddForm();
  }
});
