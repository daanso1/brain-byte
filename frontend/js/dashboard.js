renderNav('dashboard.html');
if (requireLogin()) {
  loadDashboard();
  loadRecommendations();
  setupDeleteAccount();
}

async function loadDashboard() {
  try {
    const data = await apiRequest('/dashboard', { auth: true });

    document.getElementById('greeting').innerHTML = `
      <p class="eyebrow">Your progress</p>
      <h2 style="font-size:28px;">Welcome back, ${data.user.name.split(' ')[0]}</h2>
    `;

    document.getElementById('stat-points').textContent = data.user.points;
    document.getElementById('stat-level').textContent = data.user.level;
    document.getElementById('stat-streak').textContent = `${data.user.streak_days} 🔥`;
    document.getElementById('stat-lessons').textContent = `${data.completed_lessons}/${data.total_lessons}`;

    const courseList = document.getElementById('course-progress-list');
    if (data.course_progress.length === 0) {
      courseList.innerHTML = `<p class="muted">No courses yet — head to <a href="courses.html">Courses</a> to get started.</p>`;
    } else {
      courseList.innerHTML = data.course_progress.map(c => `
        <div style="margin-bottom:16px;">
          <div class="flex-between" style="margin-bottom:6px;">
            <span style="font-weight:500;">${c.icon} ${c.title}</span>
            <span class="mono muted" style="font-size:13px;">${c.completed_lessons}/${c.total_lessons}</span>
          </div>
          ${byteMeterHtml(c.completed_lessons, c.total_lessons, 'teal')}
        </div>
      `).join('');
    }

    const badgesList = document.getElementById('badges-list');
    if (data.badges.length === 0) {
      badgesList.innerHTML = `<p class="muted">Complete your first lesson to earn a badge.</p>`;
    } else {
      badgesList.innerHTML = data.badges.map(b => `
        <div class="badge-pill">
          <span class="icon">${b.icon}</span>
          <div>
            <div class="name">${b.name}</div>
            <div class="desc">${b.description}</div>
          </div>
        </div>
      `).join('');
    }

    const leaderboard = document.getElementById('leaderboard-list');
    leaderboard.innerHTML = data.leaderboard.map((u, i) => `
      <div class="flex-between" style="padding:8px 0; ${i < data.leaderboard.length - 1 ? 'border-bottom:1px solid var(--border-subtle);' : ''}">
        <span>${i + 1}. ${u.name}</span>
        <span class="mono" style="color:var(--gold);">${u.points} pts</span>
      </div>
    `).join('');

  } catch (err) {
    document.getElementById('greeting').innerHTML = `<p class="form-error" style="display:block;">${err.message}</p>`;
  }
}

async function loadRecommendations() {
  const container = document.getElementById('recommendations-list');
  const sourceLabel = document.getElementById('rec-source');
  try {
    const data = await apiRequest('/recommendations', { auth: true });
    sourceLabel.textContent = data.source === 'model' ? 'AI model' : (data.source === 'fallback' ? 'fallback' : '');

    if (!data.recommendations || data.recommendations.length === 0) {
      container.innerHTML = `<p class="muted">${data.note || 'No recommendations available right now.'}</p>`;
      return;
    }

    container.innerHTML = data.recommendations.map(r => `
      <a href="course.html?id=${r.id}" class="course-card" style="margin-bottom:12px; display:flex; flex-direction:row; align-items:center; gap:14px; text-decoration:none;">
        <span class="course-icon">${r.icon}</span>
        <div style="flex:1;">
          <div style="font-weight:600; color:var(--text);">${r.title}</div>
          <div class="muted" style="font-size:13px;">${r.reason}</div>
        </div>
        ${r.score !== null ? `<span class="mono" style="font-size:12px; color:var(--teal);">${Math.round(r.score * 100)}% match</span>` : ''}
      </a>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="muted">Couldn't load recommendations: ${err.message}</p>`;
  }
}

function setupDeleteAccount() {
  const btn = document.getElementById('delete-account-btn');
  btn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to permanently delete your account? This cannot be undone.');
    if (!confirmed) return;

    btn.disabled = true;
    btn.textContent = 'Deleting...';
    try {
      await apiRequest('/auth/account', { method: 'DELETE', auth: true });
      Auth.clearSession();
      alert('Your account has been deleted.');
      window.location.href = 'index.html';
    } catch (err) {
      alert('Something went wrong: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Delete My Account';
    }
  });
}