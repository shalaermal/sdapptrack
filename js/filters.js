// ── GOOGLE SHEETS CONFIG ──────────────────────────────────────────────────────
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRG5c_D2ADzlyUVHXn6HbdNIpcNymgKphVlgbn7C7IW5NFzaKd2ymhMwgC3yaNJhQHwgbqGnfoBF-Js/pub?gid=1735611477&single=true&output=csv';

// ── LOAD FROM GOOGLE SHEETS ───────────────────────────────────────────────────
async function loadFromSheets() {
  const btn      = document.getElementById('sheetsBtn');
  const fileName = document.getElementById('fileName');

  btn.textContent = '⟳ Loading…';
  btn.disabled    = true;

  if (!allData.length) {
    fileName.textContent = 'Loading from Google Sheets…';
  }

  try {
    const res = await fetch(SHEETS_CSV_URL);
    if (!res.ok) throw new Error('Failed to fetch');
    const text = await res.text();

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        allData = result.data.filter(r => r['Actual Complete Date'] && r['Task Owner']);

        // Save to localStorage for instant F5 reload
        try {
          localStorage.setItem('sdapp_data', JSON.stringify(allData));
          localStorage.setItem('sdapp_data_time', new Date().toISOString());
        } catch(e) { /* storage full, ignore */ }

        normalizeData();
        populateFilters();
        applyFilters();

        fileName.textContent = '✓ Google Sheets — ' + new Date().toLocaleTimeString();
        btn.textContent = '⟳ Refresh';
        btn.disabled    = false;
      }
    });
  } catch (e) {
    fileName.textContent = allData.length
      ? '⚠ Refresh failed — showing cached data'
      : '✗ Failed to load from Sheets';
    btn.textContent = '⟳ Refresh';
    btn.disabled    = false;
  }
}

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
      normalizeData();
      populateFilters();
      applyFilters();
    }
  });
});

function normalizeData() {
  allData.forEach(r => {
    const owner   = cleanName(r['Task Owner']);
    r._owner      = owner;
    r._ownerLower = owner.toLowerCase();
    r._date       = parseDate(r['Actual Complete Date']);
    r._ponLower   = (r['Service Delivery Order - Customer PON'] || '').toLowerCase();

    if (r._date) {
      r._year       = String(r._date.getFullYear());
      r._monthLabel = r._date.toLocaleString('default', { month: 'long', year: 'numeric' });
      r._day        = String(r._date.getDate()).padStart(2, '0');
    } else {
      r._year = ''; r._monthLabel = ''; r._day = '';
    }
  });
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

let selectedYears  = new Set();
let availableYears = [];

// ── POPULATE ALL FILTERS ──────────────────────────────────────────────────────
function populateFilters() {
  const years = [...new Set(
    allData
      .filter(r => r._date && isRegisteredOwner(r._owner))
      .map(r => r._year)
      .filter(Boolean)
  )].sort((a, b) => b - a);

  availableYears    = years.map(String);
  const cur         = new Date().getFullYear().toString();
  const defaultYear = availableYears.includes(cur) ? cur : availableYears[0];
  selectedYears     = defaultYear ? new Set([defaultYear]) : new Set();

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
      .filter(r => r._date && isRegisteredOwner(r._owner)
        && (!selectedYears.size || selectedYears.has(r._year)))
      .map(r => r._monthLabel)
  )].sort((a, b) => new Date(a) - new Date(b));

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
  if (!selectedYears.size)                               lbl.textContent = 'None';
  else if (selectedYears.size === availableYears.length) lbl.textContent = 'All Years';
  else if (selectedYears.size === 1)                     lbl.textContent = [...selectedYears][0];
  else                                                   lbl.textContent = `${selectedYears.size} years`;
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
  if (!selectedMonths.size)                                lbl.textContent = 'None';
  else if (selectedMonths.size === availableMonths.length) lbl.textContent = 'All Months';
  else if (selectedMonths.size === 1)                      lbl.textContent = [...selectedMonths][0];
  else                                                     lbl.textContent = `${selectedMonths.size} months`;
}

function toggleMonthDD() {
  document.getElementById('monthDropdown').classList.toggle('open');
}

document.addEventListener('click', e => {
  const monthWrap = document.getElementById('monthFilterWrap');
  if (monthWrap && !monthWrap.contains(e.target))
    document.getElementById('monthDropdown').classList.remove('open');
  const yearWrap = document.getElementById('yearFilterWrap');
  if (yearWrap && !yearWrap.contains(e.target))
    document.getElementById('yearDropdown').classList.remove('open');
});

// ── DAYS ──────────────────────────────────────────────────────────────────────
function populateDays() {
  const days = [...new Set(
    allData
      .filter(r => r._date && isRegisteredOwner(r._owner)
        && (!selectedYears.size || selectedYears.has(r._year))
        && (selectedMonths.size === 0 || selectedMonths.has(r._monthLabel)))
      .map(r => r._day)
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
const debouncedApplyFilters = debounce(applyFilters, 180);
document.getElementById('searchInput').addEventListener('input', debouncedApplyFilters);

// ── APPLY FILTERS ─────────────────────────────────────────────────────────────
function applyFilters() {
  const dy     = document.getElementById('dayFilter').value;
  const team   = document.getElementById('teamFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase().trim();

  filteredData = allData.filter(r => {
    if (!r._date) return false;
    const owner = r._owner;
    if (!isRegisteredOwner(owner)) return false;
    if (selectedYears.size > 0 && !selectedYears.has(r._year)) return false;
    if (selectedMonths.size > 0 && !selectedMonths.has(r._monthLabel)) return false;
    if (dy !== 'All' && r._day !== dy) return false;
    if (team !== 'All' && !(appConfig.teams[team]?.members || []).includes(owner)) return false;
    if (search) {
      if (!r._ownerLower.includes(search) && !r._ponLower.includes(search)) return false;
    }
    return true;
  });

  renderSidebar();
  if (selectedOwner) renderDetail(selectedOwner);
  else renderOverview();
}

// ── AUTO-LOAD: cache first (instant), then refresh from Sheets ────────────────
window.addEventListener('load', () => {
  const fileName = document.getElementById('fileName');

  // Step 1: Load cache instantly so F5 shows data immediately
  try {
    const cached     = localStorage.getItem('sdapp_data');
    const cachedTime = localStorage.getItem('sdapp_data_time');
    if (cached) {
      allData = JSON.parse(cached);
      normalizeData();
      populateFilters();
      applyFilters();
      const t = cachedTime ? new Date(cachedTime).toLocaleTimeString() : '—';
      fileName.textContent = '⟳ Refreshing… (cached: ' + t + ')';
    }
  } catch(e) { /* ignore */ }

  // Step 2: Refresh from Sheets in background
  loadFromSheets();
});