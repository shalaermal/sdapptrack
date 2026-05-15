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

let selectedYears = new Set();
let availableYears = [];

// ── POPULATE ALL FILTERS ──────────────────────────────────────────────────────
function populateFilters() {
  // Years
  const years = [...new Set(
    allData.map(r => parseDate(r['Actual Complete Date'])?.getFullYear()).filter(Boolean)
  )].sort((a, b) => b - a);

  availableYears = years.map(String);
  const cur = new Date().getFullYear().toString();
  const defaultYear = availableYears.includes(cur) ? cur : availableYears[0];
  selectedYears = defaultYear ? new Set([defaultYear]) : new Set();

  renderYearList();
  updateYearLabel();
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
  availableMonths = [...new Set(
    allData
      .filter(r => {
        const d = parseDate(r['Actual Complete Date']);
        return d && (!selectedYears.size || selectedYears.has(d.getFullYear().toString()));
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

function renderYearList() {
  const list = document.getElementById('yearCheckList');
  list.innerHTML = availableYears.map(y => `
    <label class="month-check-item">
      <input type="checkbox" ${selectedYears.has(y) ? 'checked' : ''}
        onchange="toggleYear('${y}')" style="accent-color:var(--accent);cursor:pointer">
      ${y}
    </label>`).join('');
}

function toggleYear(y) {
  selectedYears.has(y) ? selectedYears.delete(y) : selectedYears.add(y);
  updateYearLabel();
  populateMonths();
  applyFilters();
}

function selectAllYears() {
  selectedYears = new Set(availableYears);
  renderYearList();
  updateYearLabel();
  populateMonths();
  applyFilters();
}

function clearYears() {
  selectedYears.clear();
  renderYearList();
  updateYearLabel();
  populateMonths();
  applyFilters();
}

function updateYearLabel() {
  const lbl = document.getElementById('yearBtnLabel');
  if (!selectedYears.size)                          lbl.textContent = 'None';
  else if (selectedYears.size === availableYears.length) lbl.textContent = 'All Years';
  else if (selectedYears.size === 1)                lbl.textContent = [...selectedYears][0];
  else                                               lbl.textContent = `${selectedYears.size} years`;
}

function toggleYearDD() {
  document.getElementById('yearDropdown').classList.toggle('open');
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

// Close year/month dropdowns when clicking outside
document.addEventListener('click', e => {
  const monthWrap = document.getElementById('monthFilterWrap');
  if (monthWrap && !monthWrap.contains(e.target)) {
    document.getElementById('monthDropdown').classList.remove('open');
  }
  const yearWrap = document.getElementById('yearFilterWrap');
  if (yearWrap && !yearWrap.contains(e.target)) {
    document.getElementById('yearDropdown').classList.remove('open');
  }
});

// ── DAYS ──────────────────────────────────────────────────────────────────────
function populateDays() {
  const days = [...new Set(
    allData
      .filter(r => {
        const d = parseDate(r['Actual Complete Date']);
        if (!d) return false;
        const ml = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        return (!selectedYears.size || selectedYears.has(d.getFullYear().toString()))
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
document.getElementById('dayFilter').addEventListener('change', applyFilters);
document.getElementById('teamFilter').addEventListener('change', applyFilters);
document.getElementById('searchInput').addEventListener('input', applyFilters);

// ── APPLY FILTERS ─────────────────────────────────────────────────────────────
function applyFilters() {
  const dy     = document.getElementById('dayFilter').value;
  const team   = document.getElementById('teamFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase().trim();

  filteredData = allData.filter(r => {
    const d = parseDate(r['Actual Complete Date']);
    if (!d) return false;

    const ml    = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const owner = cleanName(r['Task Owner']);

    if (selectedYears.size > 0 && !selectedYears.has(d.getFullYear().toString())) return false;
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
