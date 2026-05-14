// ── FILE UPLOAD ───────────────────────────────────────────────────────────────
document.getElementById('csvFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const label = file.name.length > 30 ? file.name.slice(0, 28) + '…' : file.name;
  document.getElementById('fileName').textContent = label;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: res => {
      allData = res.data.filter(r => r['Actual Complete Date'] && r['Task Owner']);
      populateFilters();
      applyFilters();
    }
  });
});

// ── POPULATE ALL FILTERS ──────────────────────────────────────────────────────
function populateFilters() {
  // Years
  const years = [...new Set(
    allData.map(r => parseDate(r['Actual Complete Date'])?.getFullYear()).filter(Boolean)
  )].sort((a, b) => b - a);

  const yf = document.getElementById('yearFilter');
  yf.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  const cur = new Date().getFullYear();
  if (years.includes(cur)) yf.value = cur;

  populateMonths();
  populateTeamFilter();
}

function populateTeamFilter() {
  const tf  = document.getElementById('teamFilter');
  const cur = tf.value;
  tf.innerHTML = '<option value="All">All Teams</option>'
    + Object.keys(appConfig.teams).map(t => `<option value="${t}">${t}</option>`).join('');
  if (cur) tf.value = cur;
}

// ── MONTHS ────────────────────────────────────────────────────────────────────
function populateMonths() {
  const yr = document.getElementById('yearFilter').value;

  availableMonths = [...new Set(
    allData
      .filter(r => {
        const d = parseDate(r['Actual Complete Date']);
        return d && (!yr || d.getFullYear().toString() === yr);
      })
      .map(r => parseDate(r['Actual Complete Date'])
        .toLocaleString('default', { month: 'long', year: 'numeric' }))
  )].sort((a, b) => new Date(a) - new Date(b));

  // Default → latest month
  selectedMonths = new Set([availableMonths[availableMonths.length - 1]]);
  renderMonthList();
  updateMonthLabel();
  populateDays();
}

function renderMonthList() {
  const list = document.getElementById('monthCheckList');
  list.innerHTML = availableMonths.map(m => `
    <label class="month-check-item">
      <input type="checkbox" ${selectedMonths.has(m) ? 'checked' : ''}
        onchange="toggleMonth('${m}')" style="accent-color:var(--accent);cursor:pointer">
      ${m}
    </label>`).join('');
}

function toggleMonth(m) {
  selectedMonths.has(m) ? selectedMonths.delete(m) : selectedMonths.add(m);
  updateMonthLabel();
  populateDays();
  applyFilters();
}

function selectAllMonths() {
  selectedMonths = new Set(availableMonths);
  renderMonthList();
  updateMonthLabel();
  populateDays();
  applyFilters();
}

function clearMonths() {
  selectedMonths.clear();
  renderMonthList();
  updateMonthLabel();
  populateDays();
  applyFilters();
}

function updateMonthLabel() {
  const lbl = document.getElementById('monthBtnLabel');
  if (!selectedMonths.size)                          lbl.textContent = 'None';
  else if (selectedMonths.size === availableMonths.length) lbl.textContent = 'All Months';
  else if (selectedMonths.size === 1)                lbl.textContent = [...selectedMonths][0];
  else                                               lbl.textContent = `${selectedMonths.size} months`;
}

function toggleMonthDD() {
  document.getElementById('monthDropdown').classList.toggle('open');
}

// Close month dropdown when clicking outside
document.addEventListener('click', e => {
  const wrap = document.getElementById('monthFilterWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('monthDropdown').classList.remove('open');
  }
});

// ── DAYS ──────────────────────────────────────────────────────────────────────
function populateDays() {
  const yr = document.getElementById('yearFilter').value;

  const days = [...new Set(
    allData
      .filter(r => {
        const d = parseDate(r['Actual Complete Date']);
        if (!d) return false;
        const ml = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        return (!yr || d.getFullYear().toString() === yr)
            && (selectedMonths.size === 0 || selectedMonths.has(ml));
      })
      .map(r => parseDate(r['Actual Complete Date']).getDate().toString().padStart(2, '0'))
  )].sort();

  const df = document.getElementById('dayFilter');
  df.innerHTML = '<option value="All">All Days</option>'
    + days.map(d => `<option value="${d}">${d}</option>`).join('');
}

// ── TOGGLE DAILY LIMIT ────────────────────────────────────────────────────────
function applyDailyLimitVisibility() {
  showLimit = appConfig.showDailyLimit ?? true;
  document.querySelectorAll('.per-day-section, .daily-limit-label')
    .forEach(s => s.style.display = showLimit ? '' : 'none');
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.getElementById('yearFilter').addEventListener('change', () => { populateMonths(); applyFilters(); });
document.getElementById('dayFilter').addEventListener('change', applyFilters);
document.getElementById('teamFilter').addEventListener('change', applyFilters);
document.getElementById('searchInput').addEventListener('input', applyFilters);

// ── APPLY FILTERS ─────────────────────────────────────────────────────────────
function applyFilters() {
  const yr     = document.getElementById('yearFilter').value;
  const dy     = document.getElementById('dayFilter').value;
  const team   = document.getElementById('teamFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase().trim();

  filteredData = allData.filter(r => {
    const d = parseDate(r['Actual Complete Date']);
    if (!d) return false;

    const ml    = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const owner = cleanName(r['Task Owner']);

    if (yr && d.getFullYear().toString() !== yr) return false;
    if (selectedMonths.size > 0 && !selectedMonths.has(ml)) return false;
    if (dy !== 'All' && d.getDate().toString().padStart(2, '0') !== dy) return false;
    if (team !== 'All' && !(appConfig.teams[team]?.members || []).includes(owner)) return false;
    if (search) {
      const pon = (r['Service Delivery Order - Customer PON'] || '').toLowerCase();
      if (!owner.toLowerCase().includes(search) && !pon.includes(search)) return false;
    }
    return true;
  });

  renderSidebar();
  if (selectedOwner) renderDetail(selectedOwner);
  else renderOverview();
}
