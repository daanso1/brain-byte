const API_BASE = '/api';

const Auth = {
  getToken() { return localStorage.getItem('bb_token'); },
  getUser() {
    const raw = localStorage.getItem('bb_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('bb_token', token);
    localStorage.setItem('bb_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_user');
  },
  isLoggedIn() { return !!this.getToken(); },
};

async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  let data = null;
  try { data = await res.json(); } catch (_) { /* no body */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// Escapes text before it is placed into innerHTML. Anything a user can type
// (their name, their email) must go through this so it can never run as code.
function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNav(activePage = '') {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const user = Auth.getUser();
  const homeHref = user ? 'dashboard.html' : 'index.html';

  const links = [
    ['home', homeHref, 'Home'],
    ['courses.html', 'courses.html', 'Courses'],
    ['dashboard.html', 'dashboard.html', 'Dashboard'],
    ['leaderboard.html', 'leaderboard.html', 'Leaderboard'],
  ];
  if (user && user.role === 'admin') {
    links.push(['admin.html', 'admin.html', 'Admin']);
  }

  const linksHtml = links.map(([key, href, label]) =>
    `<a href="${href}" class="sidebar-link ${activePage === key ? 'active' : ''}">${label}</a>`
  ).join('');

  const firstName = user ? escapeHtml(String(user.name || '').split(' ')[0]) : '';

  const bottomHtml = user
    ? `<div class="sidebar-user">
         <span class="nav-points">${firstName}</span>
         <button class="btn btn-secondary" id="logout-btn" style="width:100%;">Log out</button>
       </div>`
    : `<div class="sidebar-user">
         <a href="login.html" class="btn btn-secondary" style="width:100%;">Log in</a>
         <a href="register.html" class="btn btn-primary" style="width:100%;">Sign up</a>
       </div>`;

  nav.innerHTML = `
    <div class="sidebar-top">
      <a href="${homeHref}" class="brand">
        <img src="assets/logo.jpg" alt="Brain Byte logo">
      </a>
    </div>
    <div class="sidebar-links">${linksHtml}</div>
    <div class="sidebar-bottom">${bottomHtml}</div>
  `;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clearSession();
      window.location.href = 'index.html';
    });
  }
}

function requireLogin(skipVerifiedCheck = false) {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  const user = Auth.getUser();
  if (!skipVerifiedCheck && user && user.email_verified === 0) {
    window.location.href = 'verify.html';
    return false;
  }
  return true;
}

function byteMeterHtml(filled, total, variant = '') {
  const bits = 8;
  const ratio = total > 0 ? filled / total : 0;
  const filledBits = Math.round(ratio * bits);
  let html = `<span class="byte-meter ${variant}">`;
  for (let i = 0; i < bits; i++) {
    html += `<span class="bit ${i < filledBits ? 'filled' : ''}"></span>`;
  }
  html += `</span>`;
  return html;
}

// Styled pop-up dialogs that replace the browser's plain alert() / confirm().
function showModal({ title = '', message, confirmText = 'OK', cancelText = null, onConfirm = null }) {
  const existing = document.getElementById('bb-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'bb-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box card">
      ${title ? `<h3 style="margin-bottom:10px;">${escapeHtml(title)}</h3>` : ''}
      <p style="margin-bottom:20px;">${escapeHtml(message)}</p>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        ${cancelText ? `<button class="btn btn-secondary" id="bb-modal-cancel">${escapeHtml(cancelText)}</button>` : ''}
        <button class="btn btn-primary" id="bb-modal-confirm">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('bb-modal-confirm').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  const cancelBtn = document.getElementById('bb-modal-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => overlay.remove());
  }
}

function showAlert(message, title = '') {
  showModal({ title, message, confirmText: 'OK' });
}

function showConfirm(message, onConfirm, title = '') {
  showModal({ title, message, confirmText: 'Confirm', cancelText: 'Cancel', onConfirm });
}