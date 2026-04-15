/**
 * auth.js
 * Handles authentication on all pages:
 *  - Protected pages: check session, redirect to /login.html if unauthenticated
 *  - login.html: login form submission
 *  - register.html: registration form submission
 *  - profile.html: load and render user profile
 *  - Logout button on all protected pages
 */

// ─── Utilities ──────────────────────────────────────────────────────────────
const API = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = res.headers.get('content-type')?.includes('application/json')
      ? await res.json()
      : {};
    return { ok: res.ok, status: res.status, data };
  },
  get(url)            { return this.request(url); },
  post(url, body)     { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
};

function showEl(id)  { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function hideEl(id)  { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ─── Detect current page ─────────────────────────────────────────────────────
const page = (() => {
  const p = window.location.pathname;
  if (p.includes('login'))    return 'login';
  if (p.includes('register')) return 'register';
  if (p.includes('profile'))  return 'profile';
  return 'main'; // dashboard or add
})();

// ─── Auth check for protected pages ─────────────────────────────────────────
async function requireAuth() {
  const { ok, data } = await API.get('/api/auth/me');
  if (!ok) {
    window.location.href = '/login.html';
    return null;
  }
  return data;
}

// ─── Logout button (all protected pages) ────────────────────────────────────
function attachLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await API.post('/api/auth/logout', {});
    window.location.href = '/login.html';
  });
}

// ─── Update nav username ─────────────────────────────────────────────────────
function setNavUsername(user) {
  const el = document.getElementById('nav-username');
  if (el && user) el.textContent = user.username || 'Profile';
}

// ─── Login page ──────────────────────────────────────────────────────────────
async function initLogin() {
  // If already logged in, skip to dashboard
  const { ok } = await API.get('/api/auth/me');
  if (ok) { window.location.href = '/'; return; }

  const form = document.getElementById('login-form');
  const btn  = document.getElementById('login-btn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError('login-error');

    const email    = form.email.value.trim();
    const password = form.password.value;

    let valid = true;
    if (!email) { showEl('email-error'); valid = false; }
    else         hideEl('email-error');
    if (!password) { showEl('password-error'); valid = false; }
    else            hideEl('password-error');
    if (!valid) return;

    btn.disabled   = true;
    btn.textContent = 'Logging in...';

    const { ok, data } = await API.post('/api/auth/login', { email, password });
    if (ok) {
      window.location.href = '/';
    } else {
      showError('login-error', data.error || 'Login failed. Please try again.');
      btn.disabled   = false;
      btn.textContent = 'Log In';
    }
  });
}

// ─── Register page ───────────────────────────────────────────────────────────
async function initRegister() {
  const { ok } = await API.get('/api/auth/me');
  if (ok) { window.location.href = '/'; return; }

  const form = document.getElementById('register-form');
  const btn  = document.getElementById('register-btn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError('register-error');

    const username = form.username.value.trim();
    const email    = form.email.value.trim();
    const password = form.password.value;

    let valid = true;
    if (!username)             { showEl('username-error'); valid = false; }
    else                        hideEl('username-error');
    if (!email || !email.includes('@')) { showEl('email-error'); valid = false; }
    else                        hideEl('email-error');
    if (!password || password.length < 6) { showEl('password-error'); valid = false; }
    else                        hideEl('password-error');
    if (!valid) return;

    btn.disabled   = true;
    btn.textContent = 'Creating account...';

    const { ok, data } = await API.post('/api/auth/register', { username, email, password });
    if (ok) {
      window.location.href = '/';
    } else {
      showError('register-error', data.error || 'Registration failed. Please try again.');
      btn.disabled   = false;
      btn.textContent = 'Create Account';
    }
  });
}

// ─── Profile page ────────────────────────────────────────────────────────────
async function initProfile() {
  const user = await requireAuth();
  if (!user) return;

  attachLogout();
  setNavUsername(user);

  hideEl('loading-overlay');
  showEl('profile-content');

  // Avatar initials
  const avatar = document.getElementById('profile-avatar');
  if (avatar) {
    const initials = user.username
      ? user.username.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      : '?';
    avatar.textContent = initials;
  }

  setText('profile-name', user.username);
  setText('profile-email', user.email);
  setText('profile-joined', 'Member since ' + formatDate(user.created_at));
  setText('info-name',   user.username);
  setText('info-email',  user.email);
  setText('info-since',  formatDate(user.created_at));

  const stats = user.stats || {};
  setText('profile-stat-total',   stats.total   ?? 0);
  setText('profile-stat-pending', stats.pending ?? 0);
  setText('profile-stat-done',    stats.done    ?? 0);

  const total = stats.total || 0;
  const done  = stats.done  || 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';
  setText('progress-text', `${done} of ${total} assignments completed (${pct}%)`);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Protected pages (dashboard / add) ──────────────────────────────────────
async function initProtected() {
  const user = await requireAuth();
  if (!user) return;
  attachLogout();
  setNavUsername(user);
}

// ─── Entry point ─────────────────────────────────────────────────────────────
(async () => {
  if (page === 'login')    initLogin();
  else if (page === 'register') initRegister();
  else if (page === 'profile')  initProfile();
  else                          initProtected();
})();
