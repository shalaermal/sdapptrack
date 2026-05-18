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

  // Check if a specific team is selected
  const selectedTeam = document.getElementById('teamFilter').value;
  const showTeamBtn  = selectedTeam !== 'All';

  const teamCards = Object.entries(appConfig.teams).map(([team, info]) => {
    const teamTasks = filteredData.filter(r => info.members.includes(cleanName(r['Task Owner'])));
    if (!teamTasks.length) return '';

    const memberRows = info.members
      .filter(m => grouped[m])
      .sort((a, b) => (grouped[b] || []).length - (grouped[a] || []).length)
      .map(m => {
        const cnt = (grouped[m] || []).length;
        const esc = (grouped[m] || []).filter(isEscalated).length;
        return `
          <div class="team-member-row">
            <span>${m}</span>
            <span style="font-family:var(--mono);color:var(--accent)">
              ${cnt}<span style="color:var(--text3);font-size:10px"> · ${esc}e</span>
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

    ${showTeamBtn ? `
    <div style="display:flex;justify-content:flex-end;margin-top:4px;margin-bottom:20px">
      <button onclick="openTeamDetails('${selectedTeam}')"
        style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--accent);color:var(--accent);padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-family:var(--mono);font-weight:600;transition:all .15s;"
        onmouseover="this.style.background='var(--accent)';this.style.color='#fff'"
        onmouseout="this.style.background='var(--surface)';this.style.color='var(--accent)'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
        </svg>
        More details for ${selectedTeam}
      </button>
    </div>` : ''}

    <div class="section-title" style="color:var(--text3)">
      Select a person from the sidebar for details
    </div>`;
}

// ── TEAM DETAILS MODAL ────────────────────────────────────────────────────────
function openTeamDetails(team) {
  const info = appConfig.teams[team];
  if (!info) return;

  // Get all tasks for this team in filtered data
  const teamTasks = filteredData.filter(r =>
    info.members.includes(cleanName(r['Task Owner']))
  );

  // Build per-member breakdown using TASK_GROUPS (grouped columns)
  const memberData = info.members
    .filter(m => filteredData.some(r => cleanName(r['Task Owner']) === m))
    .map(m => {
      const mTasks = filteredData.filter(r => cleanName(r['Task Owner']) === m);
      // Count per group using getTaskGroup()
      const grpCounts = {};
      mTasks.forEach(r => {
        const grp = getTaskGroup((r['Task Type'] || '').trim());
        grpCounts[grp] = (grpCounts[grp] || 0) + 1;
      });
      const esc = mTasks.filter(isEscalated).length;
      return { name: m, total: mTasks.length, grpCounts, esc };
    })
    .sort((a, b) => b.total - a.total);

  // Collect all groups that appear, sorted by total count desc (left = most)
  const grpTotals = {};
  memberData.forEach(m => {
    Object.entries(m.grpCounts).forEach(([g, v]) => {
      grpTotals[g] = (grpTotals[g] || 0) + v;
    });
  });
  const allGroups = Object.entries(grpTotals)
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  const grandTotal = memberData.reduce((s, m) => s + m.total, 0);
  const totalEsc   = memberData.reduce((s, m) => s + m.esc, 0);

  // Build table header
  const thCols = allGroups.map(g =>
    `<th style="text-align:center">${g}</th>`
  ).join('');

  // Build table rows
  const rows = memberData.map(m => {
    const grpCols = allGroups.map(g => {
      const v = m.grpCounts[g] || 0;
      return `<td style="text-align:center;color:${v > 0 ? 'var(--accent)' : 'var(--text3)'};font-family:var(--mono)">${v > 0 ? v : '—'}</td>`;
    }).join('');
    return `
      <tr>
        <td style="font-weight:500;white-space:nowrap">${m.name}</td>
        ${grpCols}
        <td style="text-align:center;font-weight:600;color:var(--accent);font-family:var(--mono)">${m.total}</td>
        <td style="text-align:center;font-family:var(--mono);color:${m.esc > 0 ? 'var(--warn)' : 'var(--text3)'}">${m.esc > 0 ? m.esc : '—'}</td>
      </tr>`;
  }).join('');

  // Totals row
  const totalCols = allGroups.map(g =>
    `<td style="text-align:center;font-weight:600;font-family:var(--mono);color:var(--text2)">${grpTotals[g] || '—'}</td>`
  ).join('');

  const modalHtml = `
    <div class="modal-overlay open" id="teamDetailModal" onclick="if(event.target===this)closeTeamDetails()">
      <div class="modal" style="width:900px;max-width:96vw">
        <div class="modal-header">
          <span class="modal-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="margin-right:6px;vertical-align:middle">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            Team Details — ${team}
            <span style="color:var(--text3);font-weight:400;font-size:11px;margin-left:8px">${grandTotal} tasks · ${memberData.length} members</span>
          </span>
          <button class="modal-close" onclick="closeTeamDetails()">×</button>
        </div>
        <div class="modal-body" style="padding:16px 20px;overflow-x:auto">
          <div class="table-card" style="overflow-x:auto">
            <table style="min-width:600px">
              <thead>
                <tr>
                  <th>Member</th>
                  ${thCols}
                  <th style="text-align:center">Total</th>
                  <th style="text-align:center">Escalated</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
              <tfoot>
                <tr style="background:var(--surface2);border-top:1px solid var(--border)">
                  <td style="font-weight:600;font-family:var(--mono);color:var(--text2)">Total</td>
                  ${totalCols}
                  <td style="text-align:center;font-weight:700;color:var(--accent);font-family:var(--mono)">${grandTotal}</td>
                  <td style="text-align:center;font-family:var(--mono);color:${totalEsc > 0 ? 'var(--warn)' : 'var(--text3)'}">${totalEsc > 0 ? totalEsc : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="modal-footer" style="justify-content:flex-end">
          <button class="btn btn-secondary" onclick="closeTeamDetails()">Close</button>
        </div>
      </div>
    </div>`;

  // Inject modal into body
  const existing = document.getElementById('teamDetailModal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeTeamDetails() {
  const m = document.getElementById('teamDetailModal');
  if (m) m.remove();
}