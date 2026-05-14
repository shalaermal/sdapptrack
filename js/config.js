// ── GITHUB CONFIG ─────────────────────────────────────────────────────────────
const GH_OWNER = 'shalaermal';
const GH_REPO  = 'sdapptrack';
const GH_FILE  = 'config.json';

// ── DEFAULT CONFIG ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  teams: {
    "FTTT": {
      limit: 7,
      slaDays: 4,
      members: ["Fitim Ahmeti","Shpend Ajeti","Festim Asllani","Tim Corey",
                "Vlora Ibrahimi","Vanja Petrushevski","Edi Sermaxhaj","Ermal Shala"]
    },
    "Data": {
      limit: 10,
      slaDays: 4,
      members: ["Berat Gubavci","Besar Ahmeti","Fitore Behrami","Arlinda Neziri",
                "Jetart Aliu","Melos Doberdoli","Genc Ajeti","Lendrit Islami",
                "Furkan Mani","Petar Siljanoski","Maksim Babovikj"]
    },
    "CDE": {
      limit: 12,
      slaDays: 4,
      members: ["Burim Shala","Rina Ademi","Zaim Shaqiri","Vllaznim Shaljani",
                "Adelina Neziri","Jon Barnett","Fatlum Rashiti","Arianit Plakaj","Agnesa Haxholli"]
    }
  }
};

// ── TASK GROUPS ───────────────────────────────────────────────────────────────
const TASK_GROUPS = {
  "NOC":        ["NOC FTTT", "NOC_FTTT"],
  "FTTT_UP":    ["FTTT_UP"],
  "Disconnect": ["DISCFTTT", "DNOC FTTT", "DNOC_PROV"],
  "TESTFTTT":   ["TESTFTTT"],
  "SIS":        ["Build SIS Record", "Build Ocular IP & SIS Record"]
};

// ── STATE ─────────────────────────────────────────────────────────────────────
let appConfig   = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let configSha   = null;
let allData     = [];
let filteredData = [];
let selectedOwner = null;
let charts      = {};
let selectedMonths = new Set();
let availableMonths = [];
let showLimit   = true;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function cleanName(n) {
  return (n || 'Unassigned').replace(/<.*?>/g, '').trim();
}

function getTeam(name) {
  for (const [team, info] of Object.entries(appConfig.teams)) {
    if (info.members.includes(name)) return team;
  }
  return 'Other';
}

function getLimit(name) {
  const team = getTeam(name);
  return appConfig.teams[team]?.limit ?? 7;
}

function getSlaDays(name) {
  const team = getTeam(name);
  return appConfig.teams[team]?.slaDays ?? 4;
}

function getTaskGroup(tp) {
  tp = (tp || '').trim();
  for (const [grp, types] of Object.entries(TASK_GROUPS)) {
    if (types.includes(tp)) return grp;
  }
  return tp || 'Other';
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s.trim().replace(/-/g, '/'));
  return isNaN(d) ? null : d;
}

function isEscalated(t) {
  return (t['Escalated Task?'] || '').toLowerCase() === 'yes'
      || (t['Service Delivery Order - Escalated Order?'] || '').toLowerCase() === 'yes';
}

function slaStatus(t) {
  const assign   = parseDate(t['Task Assignment Date']);
  const complete = parseDate(t['Actual Complete Date']);
  if (!assign || !complete) return 'unknown';

  const slaDays = getSlaDays(cleanName(t['Task Owner']));
  const deadline = new Date(assign.getTime() + slaDays * 864e5);
  return complete <= deadline ? 'ok' : 'late';
}

/**
 * Avg tasks/day = total tasks ÷ number of unique days with activity
 */
function calcAvgPerDay(tasks) {
  const uniqueDays = new Set(
    tasks.map(t => {
      const d = parseDate(t['Actual Complete Date']);
      return d ? d.toISOString().split('T')[0] : null;
    }).filter(Boolean)
  );
  if (!uniqueDays.size) return 'N/A';
  return (tasks.length / uniqueDays.size).toFixed(1);
}

// ── CONFIG LOADER ─────────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );
    if (res.ok) {
      const data = await res.json();
      configSha = data.sha;
      appConfig = JSON.parse(atob(data.content.replace(/\n/g, '')));
    }
  } catch (e) {
    console.warn('Config load failed, using defaults:', e);
  }
}

async function init() {
  // Restore saved token
  const saved = localStorage.getItem('gh_token');
  if (saved) document.getElementById('githubToken').value = saved;

  await loadConfig();
  populateTeamFilter();
}
