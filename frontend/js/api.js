// Small fetch wrapper shared by every page. Keeps auth token handling
// and error formatting in one place instead of repeating it everywhere.

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
  });

  let data = null;
  try { data = await res.json(); } catch (_) { /* no body */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// Renders the shared nav based on login state. Every page includes a
// <nav id="site-nav"></nav> placeholder and calls this on load.
function renderNav(activePage = '') {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const user = Auth.getUser();
  const links = [
    ['courses.html', 'Courses'],
    ['dashboard.html', 'Dashboard'],
  ];

  const linksHtml = links.map(([href, label]) =>
    `<a href="${href}" ${activePage === href ? 'style="color:var(--text)"' : ''}>${label}</a>`
  ).join('');

  const rightHtml = user
    ? `<div class="nav-user">
         <span class="nav-points">${user.name.split(' ')[0]}</span>
         <button class="btn btn-secondary" id="logout-btn" style="padding:8px 14px;font-size:13px;">Log out</button>
       </div>`
    : `<div class="nav-user">
         <a href="login.html" class="btn btn-secondary" style="padding:8px 16px;font-size:14px;">Log in</a>
         <a href="register.html" class="btn btn-primary" style="padding:8px 16px;font-size:14px;">Sign up</a>
       </div>`;

  nav.innerHTML = `
    <div class="container">
      <a href="index.html" class="brand">
        <span class="brand-mark"><span></span><span></span><span></span><span></span></span>
        Brain Byte
      </a>
      <div class="nav-links">${linksHtml}</div>
      ${rightHtml}
    </div>
  `;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clearSession();
      window.location.href = 'index.html';
    });
  }
}

// Redirects to login if not authenticated. Call at the top of protected pages.
function requireLogin() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Builds the byte-meter HTML (signature component): `filled` out of `total` (capped at 8 bits).
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
