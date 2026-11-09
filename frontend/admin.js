renderNav('admin.html');

let currentUserId = null;

if (requireLogin()) {
  const user = Auth.getUser();
  currentUserId = user ? user.id : null;
  loadAdminData();
}

async function loadAdminData() {
  try {
    const stats = await apiRequest('/admin/stats', { auth: true });
    document.getElementById('stats-row').innerHTML = `
      <div class="card"><div class="stat-label">Total Users</div><div class="stat-value mono">${stats.totalUsers}</div></div>
      <div class="card"><div class="stat-label">Lessons Completed</div><div class="stat-value mono">${stats.totalCompletions}</div></div>
      <div class="card"><div class="stat-label">Total Courses</div><div class="stat-value mono">${stats.totalCourses}</div></div>
    `;

    const users = await apiRequest('/admin/users', { auth: true });
    renderUsersTable(users);
  } catch (err) {
    document.getElementById('admin-container').innerHTML = `
      <p class="form-error" style="display:block;">${err.message === 'Admin access required.' ? "You don't have access to this page." : err.message}</p>
    `;
  }
}

function renderUsersTable(users) {
  const container = document.getElementById('users-table');
  if (users.length === 0) {
    container.innerHTML = `<p class="muted">No users yet.</p>`;
    return;
  }

  container.innerHTML = users.map(u => `
    <div class="flex-between" style="padding:12px 0; border-bottom:1px solid var(--border-subtle); flex-wrap:wrap; gap:10px;">
      <div>
        <div style="font-weight:600;">${u.name} ${u.role === 'admin' ? '<span class="course-tag">admin</span>' : ''}</div>
        <div class="muted" style="font-size:13px;">${u.email} · ${u.points} pts · Level ${u.level}</div>
      </div>
      <div style="display:flex; gap:8px;">
        ${u.id === currentUserId ? '' : `
          <button class="btn btn-secondary" style="padding:6px 12px; font-size:13px;" onclick="toggleRole(${u.id}, '${u.role === 'admin' ? 'user' : 'admin'}')">
            ${u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
          </button>
          <button class="btn btn-secondary" style="padding:6px 12px; font-size:13px; color:var(--coral); border-color:var(--coral);" onclick="deleteUser(${u.id})">Delete</button>
        `}
      </div>
    </div>
  `).join('');
}

async function toggleRole(userId, newRole) {
  try {
    await apiRequest(`/admin/users/${userId}/role`, { method: 'PATCH', auth: true, body: { role: newRole } });
    loadAdminData();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteUser(userId) {
  if (!confirm('Delete this user permanently?')) return;
  try {
    await apiRequest(`/admin/users/${userId}`, { method: 'DELETE', auth: true });
    loadAdminData();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}