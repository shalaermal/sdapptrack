// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  const grouped = {};
  filteredData.forEach(r => {
    const n = cleanName(r['Task Owner']);
    if (!grouped[n]) grouped[n] = [];
    grouped[n].push(r);
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  document.getElementById('ownerCount').textContent = sorted.length;

  const list = document.getElementById('personList');

  if (!sorted.length) {
    list.innerHTML = '<div class="no-data-msg">No data matching filters</div>';
    return;
  }

  list.innerHTML = sorted.map(([name, tasks]) => {
    const avgPerDay = calcAvgPerDay(tasks);
    const team      = getTeam(name);

    return `
      <div class="person-card ${selectedOwner === name ? 'active' : ''}"
           onclick="selectOwner('${name.replace(/'/g, "\\'")}')">
        <div>
          <div class="person-name">${name}</div>
          <div class="person-meta">${team} · Avg ${avgPerDay}/day</div>
        </div>
        <div class="person-badge">${tasks.length}</div>
      </div>`;
  }).join('')
  + `<div class="sidebar-total">
       <span>Total</span>
       <span style="color:var(--accent)">${filteredData.length}</span>
     </div>`;
}

function selectOwner(name) {
  selectedOwner = name;
  renderSidebar();
  renderDetail(name);
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function renderOverview() {
  destroyCharts();
  const content = document.getElementById('contentArea');

  if (!filteredData.length) {
    content.innerHTML = `
      <div class="empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>Upload a CSV to begin</span>
      </div>`;
    return;
  }

  // Build grouped map
  const grouped = {};
  filteredData.forEach(r => {
    const n = cleanName(r['Task Owner']);
    if (!grouped[n]) grouped[n] = [];
    grouped[n].push(r);
  });

  const totalEsc = filteredData.filter(isEscalated).length;
  const slaOk    = filteredData.filter(t => slaStatus(t) === 'ok').length;
  const slaPct   = Math.round(slaOk / filteredData.length * 100);

  const teamCards = Object.entries(appConfig.teams).map(([team, info]) => {
    const teamTasks = filteredData.filter(r => info.members.includes(cleanName(r['Task Owner'])));
    if (!teamTasks.length) return '';

    const memberRows = info.members
      .filter(m => grouped[m])
      .map(m => {
        const cnt = (grouped[m] || []).length;
        const esc = (grouped[m] || []).filter(isEscalated).length;
        return `
          <div class="team-member-row">
            <span>${m}</span>
            <span style="font-family:var(--mono);color:var(--accent)">
              ${cnt}${esc > 0 ? `<span style="color:var(--text3);font-size:10px"> · ${esc}e</span>` : ''}
            </span>
          </div>`;
      }).join('');

    return `
      <div class="team-card">
        <div class="team-card-title">
          ${team}
          <span style="color:var(--text3);font-weight:400">(${teamTasks.length})${showLimit ? ` · lim ${info.limit}` : ''}</span>
        </div>
        ${memberRows}
      </div>`;
  }).join('');

  content.innerHTML = `
    <div class="section-title">Overview</div>
    <div class="summary-grid">
      <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-val blue">${filteredData.length}</div></div>
      <div class="stat-card"><div class="stat-label">People</div><div class="stat-val">${Object.keys(grouped).length}</div></div>
      <div class="stat-card"><div class="stat-label">Escalated</div><div class="stat-val ${totalEsc > 0 ? 'warn' : ''}">${totalEsc}</div></div>
      <div class="stat-card"><div class="stat-label">SLA On-Time</div><div class="stat-val ${slaPct >= 70 ? 'green' : 'red'}">${slaPct}%</div></div>
    </div>

    <div class="section-title">By Team</div>
    <div class="overview-team-grid">${teamCards}</div>

    <div class="section-title" style="color:var(--text3)">
      Select a person from the sidebar for details
    </div>`;
}
