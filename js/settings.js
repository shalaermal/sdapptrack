// ── SETTINGS MODAL ────────────────────────────────────────────────────────────
function openSettings() {
  renderTeamsEditor();
  document.getElementById('settingsModal').classList.add('open');
  document.getElementById('saveStatus').textContent = '';
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

// Close when clicking backdrop
document.getElementById('settingsModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeSettings();
});

// ── TOKEN ─────────────────────────────────────────────────────────────────────
function saveTokenLocally() {
  const t = document.getElementById('githubToken').value.trim();
  if (!t) return;
  localStorage.setItem('gh_token', t);
  const s = document.getElementById('tokenStatus');
  s.textContent = '✓ Saved';
  s.style.color = 'var(--green)';
  setTimeout(() => { s.textContent = ''; }, 2500);
}

// ── TEAMS EDITOR ──────────────────────────────────────────────────────────────
function renderTeamsEditor() {
  document.getElementById('teamsEditor').innerHTML = Object.entries(appConfig.teams)
    .map(([team, info]) => `
      <div class="team-settings-card" id="tcard-${team}">
        <div class="team-settings-header">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <input class="team-name-input" value="${team}"
              onchange="renameTeam('${team}', this.value)"
              title="Team name (editable)">
            <div class="limit-row">
              Daily limit:
              <input type="number" class="limit-input" value="${info.limit}" min="1" max="99"
                onchange="appConfig.teams['${team}'].limit = parseInt(this.value) || 1"
                title="Min tasks per day to count as a good day">
            </div>
            <div class="limit-row">
              SLA days:
              <input type="number" class="limit-input" value="${info.slaDays ?? 4}" min="1" max="30"
                onchange="appConfig.teams['${team}'].slaDays = parseInt(this.value) || 4"
                title="Number of days allowed before SLA is late">
            </div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="removeTeam('${team}')">Remove Team</button>
        </div>

        <div class="member-list" id="mlist-${team}">
          ${info.members.map(m => `
            <div class="member-tag">
              <span>${m}</span>
              <button class="member-remove"
                onclick="removeMember('${team}', '${m.replace(/'/g, "\\'")}')"
                title="Remove ${m}">×</button>
            </div>`).join('')}
        </div>

        <div class="add-row">
          <input type="text" class="add-input" id="newM-${team}"
            placeholder="Add member name…"
            onkeydown="if(event.key==='Enter') addMember('${team}')">
          <button class="btn btn-secondary btn-sm" onclick="addMember('${team}')">+ Add</button>
        </div>
      </div>`).join('');
}

function renameTeam(oldName, newName) {
  newName = newName.trim();
  if (!newName || newName === oldName || appConfig.teams[newName]) return;

  // Preserve order
  const rebuilt = {};
  for (const [k, v] of Object.entries(appConfig.teams)) {
    rebuilt[k === oldName ? newName : k] = v;
  }
  appConfig.teams = rebuilt;
  renderTeamsEditor();
}

function addMember(team) {
  const inp  = document.getElementById(`newM-${team}`);
  const name = inp.value.trim();
  if (!name || appConfig.teams[team].members.includes(name)) return;
  appConfig.teams[team].members.push(name);
  inp.value = '';
  renderTeamsEditor();
}

function removeMember(team, name) {
  appConfig.teams[team].members = appConfig.teams[team].members.filter(m => m !== name);
  renderTeamsEditor();
}

function addTeam() {
  const name = prompt('New team name:');
  if (!name || appConfig.teams[name]) return;
  appConfig.teams[name] = { limit: 7, slaDays: 4, members: [] };
  renderTeamsEditor();
}

function removeTeam(team) {
  if (!confirm(`Remove team "${team}"? This cannot be undone.`)) return;
  delete appConfig.teams[team];
  renderTeamsEditor();
}

// ── SAVE TO GITHUB ────────────────────────────────────────────────────────────
async function saveToGitHub() {
  const token = document.getElementById('githubToken').value.trim()
              || localStorage.getItem('gh_token');

  if (!token) {
    setStatus('error', '⚠ Enter your GitHub token above first');
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.textContent = 'Saving…';
  btn.disabled    = true;
  setStatus('saving', 'Saving to GitHub…');

  try {
    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    // Fetch current SHA if we don't have it yet
    if (!configSha) {
      const chk = await fetch(
        `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`,
        { headers }
      );
      if (chk.ok) {
        const d = await chk.json();
        configSha = d.sha;
      }
    }

    // Encode content to base64 (UTF-8 safe)
    const json    = JSON.stringify(appConfig, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(json)));

    const body = {
      message: 'Update config.json via SDAPP Tracker',
      content: encoded
    };
    if (configSha) body.sha = configSha;

    const res = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`,
      { method: 'PUT', headers, body: JSON.stringify(body) }
    );

    if (res.ok) {
      const d  = await res.json();
      configSha = d.content.sha;
      setStatus('saved', '✓ Saved! All users will see the changes on their next refresh.');

      // Refresh team filter + re-apply filters in the main app
      populateTeamFilter();
      if (allData.length) applyFilters();
    } else {
      const err = await res.json();
      setStatus('error', `✗ GitHub error: ${err.message}`);
    }
  } catch (e) {
    setStatus('error', `✗ ${e.message}`);
  }

  btn.textContent = 'Save to GitHub';
  btn.disabled    = false;
}

function setStatus(type, msg) {
  const el = document.getElementById('saveStatus');
  el.className  = `save-status ${type}`;
  el.textContent = msg;
}
