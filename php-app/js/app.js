/**
 * app.js
 * Dashboard + Add Assignment logic.
 * Requires auth.js to be loaded first (handles auth check + logout).
 */

// ─── API wrapper ─────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function getAssignments()       { return apiFetch('/api/assignments'); }
async function getSummary()           { return apiFetch('/api/assignments/summary'); }
async function createAssignment(body) {
  return apiFetch('/api/assignments', { method: 'POST', body: JSON.stringify(body) });
}
async function updateAssignment(id, body) {
  return apiFetch(`/api/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
async function deleteAssignment(id) {
  return apiFetch(`/api/assignments/${id}`, { method: 'DELETE' });
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatDueDate(dateStr) {
  const d = new Date(dateStr);
  return 'Due: ' + d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function getCountdown(dateStr, status) {
  if (status === 'done') return { label: 'Completed', cls: 'done', icon: '' };

  const now  = Date.now();
  const due  = new Date(dateStr).getTime();
  const diff = due - now;

  if (diff < 0) {
    const ageH = Math.floor(-diff / 3600000);
    const ageD = Math.floor(ageH / 24);
    return {
      label: ageD > 0 ? `${ageD}d overdue` : `${ageH}h overdue`,
      cls: 'overdue',
      icon: '!',
    };
  }

  const totalMins = Math.floor(diff / 60000);
  const mins  = totalMins % 60;
  const hours = Math.floor(totalMins / 60) % 24;
  const days  = Math.floor(totalMins / 1440);

  let label, cls, icon;
  if (days === 0) {
    label = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
    cls   = 'urgent';
    icon  = '!';
  } else if (days < 3) {
    label = `${days}d ${hours}h left`;
    cls   = 'normal';
    icon  = '&#9200;';
  } else {
    label = `${days}d ${hours}h left`;
    cls   = 'safe';
    icon  = '&#9200;';
  }
  return { label, cls, icon };
}

// ─── Build assignment card HTML ───────────────────────────────────────────────
function buildCard(assignment) {
  const { id, title, course, description, due_date, status } = assignment;

  // Safe fallback: prevents "can't access property toUpperCase, priority is undefined"
  const priority = assignment.priority || 'medium';

  const countdown = getCountdown(due_date, status);
  const dueLine   = formatDueDate(due_date);
  const descHTML  = description
    ? `<p class="card-description">${escapeHTML(description)}</p>`
    : '';
  const toggleLabel = status === 'done' ? 'Mark as Pending' : 'Mark as Done';

  return `
    <div class="card priority-${priority} status-${status}" data-id="${id}" id="card-${id}">
      <div class="card-top">
        <div class="card-badges">
          <span class="badge badge-course">${escapeHTML(course)}</span>
          <span class="badge badge-${priority}">${priority.toUpperCase()}</span>
          ${status === 'done' ? `<span class="badge badge-done">DONE</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon btn-delete"
            onclick="handleDelete(${id})"
            title="Delete assignment">&#128465;</button>
        </div>
      </div>

      <h3 class="card-title">${escapeHTML(title)}</h3>
      ${descHTML}

      <div class="card-countdown ${countdown.cls}">
        <span>${countdown.icon}</span>
        <span>${countdown.label}</span>
      </div>
      <p class="card-due-date">${dueLine}</p>

      <button class="card-toggle-btn"
        onclick="handleToggle(${id})"
        data-testid="button-toggle-${id}">
        ${toggleLabel}
      </button>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── State ────────────────────────────────────────────────────────────────────
let allAssignments = [];
let activeFilter   = 'all';

// ─── Render cards ─────────────────────────────────────────────────────────────
function renderCards(assignments) {
  const grid       = document.getElementById('cards-grid');
  const emptyState = document.getElementById('empty-state');
  if (!grid) return;

  const now = Date.now();
  let filtered;

  if (activeFilter === 'all') {
    filtered = assignments;
  } else if (activeFilter === 'pending') {
    filtered = assignments.filter(a => a.status === 'pending');
  } else if (activeFilter === 'done') {
    filtered = assignments.filter(a => a.status === 'done');
  } else if (activeFilter === 'overdue') {
    filtered = assignments.filter(a =>
      a.status === 'pending' && new Date(a.due_date).getTime() < now
    );
  } else {
    filtered = assignments;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState && emptyState.classList.remove('hidden');
    return;
  }
  emptyState && emptyState.classList.add('hidden');
  grid.innerHTML = filtered.map(buildCard).join('');
}

// ─── Update summary stats bar ─────────────────────────────────────────────────
async function refreshSummary() {
  try {
    const s = await getSummary();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-total',    s.total);
    set('stat-pending',  s.pending);
    set('stat-due-soon', s.dueSoon);
    set('stat-overdue',  s.overdue);
    set('stat-done',     s.done);
  } catch (_) {}
}

// ─── Live countdown ticker ────────────────────────────────────────────────────
function startTicker() {
  setInterval(() => {
    allAssignments.forEach(a => {
      const card = document.getElementById(`card-${a.id}`);
      if (!card) return;
      const cd = card.querySelector('.card-countdown');
      if (!cd) return;
      const c = getCountdown(a.due_date, a.status);
      cd.className = `card-countdown ${c.cls}`;
      cd.innerHTML = `<span>${c.icon}</span><span>${c.label}</span>`;
    });
  }, 1000);
}

// ─── Filter buttons ───────────────────────────────────────────────────────────
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderCards(allAssignments);
    });
  });
}

// ─── Notification banner ──────────────────────────────────────────────────────
function checkNotifications(assignments) {
  const now    = Date.now();
  const urgent = assignments.filter(a =>
    a.status === 'pending' &&
    new Date(a.due_date).getTime() > now &&
    new Date(a.due_date).getTime() - now <= 86_400_000
  );

  if (urgent.length > 0) {
    const banner = document.getElementById('notif-banner');
    const text   = document.getElementById('notif-text');
    if (!banner || !text) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    text.textContent = urgent.length === 1
      ? 'Heads up! 1 assignment is due within 24 hours.'
      : `Heads up! ${urgent.length} assignments are due within 24 hours.`;
    banner.classList.remove('hidden');
  }
}

// ─── Toggle done / pending ────────────────────────────────────────────────────
async function handleToggle(id) {
  const existing = allAssignments.find(a => a.id === id);
  if (!existing) return;

  const newStatus = existing.status === 'done' ? 'pending' : 'done';

  try {
    const updated = await updateAssignment(id, { status: newStatus });

    // Merge to preserve any fields that the API might not return
    const index = allAssignments.findIndex(a => a.id === id);
    if (index !== -1) {
      allAssignments[index] = { ...existing, ...updated };
    }

    renderCards(allAssignments);
    refreshSummary();
  } catch (err) {
    console.error('Error updating assignment:', err.message);
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function handleDelete(id) {
  if (!confirm('Delete this assignment? This cannot be undone.')) return;
  try {
    await deleteAssignment(id);
    allAssignments = allAssignments.filter(a => a.id !== id);
    renderCards(allAssignments);
    refreshSummary();
  } catch (err) {
    console.error('Error deleting assignment:', err.message);
  }
}

// ─── Add Assignment form ───────────────────────────────────────────────────────
function initAddForm() {
  const form = document.getElementById('add-form');
  if (!form) return;

  // Set min date to right now and default to tomorrow at noon
  const dueDateInput = document.getElementById('due_date');
  if (dueDateInput) {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    dueDateInput.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDateInput.value = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T12:00`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorBox = document.getElementById('form-error');
    if (errorBox) errorBox.classList.add('hidden');

    const title       = form.title.value.trim();
    const course      = form.course.value.trim();
    const description = form.description ? form.description.value.trim() : '';
    const due_date    = form.due_date.value;
    const priority    = form.priority.value;

    // Validate required fields
    let valid = true;
    if (!title)    { markInvalid('title',    'title-error');    valid = false; }
    else            markValid('title',    'title-error');
    if (!course)   { markInvalid('course',   'course-error');   valid = false; }
    else            markValid('course',   'course-error');
    if (!due_date) { markInvalid('due_date', 'due-date-error'); valid = false; }
    else            markValid('due_date', 'due-date-error');

    if (!valid) return;

    // Validate date is in the future
    if (new Date(due_date).getTime() <= Date.now()) {
      if (errorBox) {
        errorBox.textContent = 'Please select a due date and time in the future.';
        errorBox.classList.remove('hidden');
      }
      markInvalid('due_date', 'due-date-error');
      return;
    }

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Adding...'; }

    try {
      // Format: "YYYY-MM-DD HH:MM:00" (what PHP/SQLite expects)
      const formatted = due_date.replace('T', ' ') + ':00';
      await createAssignment({
        title,
        course,
        description: description || null,
        due_date: formatted,
        priority,
      });
      window.location.href = '/';
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message || 'Failed to add assignment. Please try again.';
        errorBox.classList.remove('hidden');
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Add Assignment'; }
    }
  });
}

function markInvalid(fieldId, errorId) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(errorId);
  if (input) input.classList.add('invalid');
  if (err)   err.classList.remove('hidden');
}
function markValid(fieldId, errorId) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(errorId);
  if (input) input.classList.remove('invalid');
  if (err)   err.classList.add('hidden');
}

// ─── Dashboard init ───────────────────────────────────────────────────────────
async function initDashboard() {
  const grid = document.getElementById('cards-grid');

  try {
    const [assignments] = await Promise.all([
      getAssignments(),
      refreshSummary(),
    ]);

    allAssignments = assignments || [];
    initFilters();
    renderCards(allAssignments);
    checkNotifications(allAssignments);
    startTicker();
  } catch (err) {
    if (grid) {
      grid.innerHTML = `<div class="loading-card" style="color:var(--red-500);">
        Error: ${err.message}
      </div>`;
    }
  }
}

// ─── Auto-detect page and init ────────────────────────────────────────────────
(function () {
  const path = window.location.pathname;
  if (path.includes('add')) {
    initAddForm();
  } else if (
    !path.includes('login') &&
    !path.includes('register') &&
    !path.includes('profile')
  ) {
    initDashboard();
  }
})();
