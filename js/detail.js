// ── DETAIL VIEW ───────────────────────────────────────────────────────────────
function renderDetail(name) {
  destroyCharts();

  const tasks = filteredData.filter(r => cleanName(r['Task Owner']) === name);
  const limit = getLimit(name);
  const content = document.getElementById('contentArea');

  // ── Stats ──────────────────────────────────────────────────────────────────
  const esc    = tasks.filter(isEscalated);
  const picked = esc.filter(t => {
    const et = parseDate(t['Task Escalation Time']);
    const at = parseDate(t['Task Assignment Date']);
    return et && at && at > et;
  });

  const slaOk  = tasks.filter(t => slaStatus(t) === 'ok').length;
  const slaPct = Math.round(slaOk / tasks.length * 100);

  // Avg tasks per day = total ÷ unique active days
  const avgPerDay = calcAvgPerDay(tasks);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const typeCounts     = {};
  const templateCounts = {};
  const carrierCounts  = {};
  const perDay         = {};

  tasks.forEach(t => {
    // Task type
    const tp = t['Task Type'] || '';
    typeCounts[tp] = (typeCounts[tp] || 0) + 1;

    // Template
    const tpl = (t['Service Delivery Order - Order Template Type'] || '').trim();
    if (tpl) templateCounts[tpl] = (templateCounts[tpl] || 0) + 1;

    // Carrier
    const m = (t['Service Delivery Order - Market'] || '').trim();
    if (m) {
      let car = m.split(':')[0].trim();
      if (car === 'T-MOBILE-HEARTLAND') car = 'TMOBILE';
      carrierCounts[car] = (carrierCounts[car] || 0) + 1;
    }

    // Per day
    const d = parseDate(t['Actual Complete Date']);
    if (d) {
      const k = d.toISOString().split('T')[0];
      perDay[k] = (perDay[k] || 0) + 1;
    }
  });

  const hasCarrier  = Object.keys(carrierCounts).length > 0;
  const hasTemplate = Object.keys(templateCounts).length > 0;

  // ── Task Type table rows ───────────────────────────────────────────────────
  const typeRows = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tp, cnt]) => `
      <tr>
        <td>${tp || '—'}</td>
        <td>${cnt}</td>
        <td>
          <div class="sla-bar-wrap">
            <span style="min-width:32px">${Math.round(cnt / tasks.length * 100)}%</span>
            <div class="sla-bar">
              <div class="sla-bar-fill" style="width:${Math.round(cnt / tasks.length * 100)}%;background:var(--accent)"></div>
            </div>
          </div>
        </td>
      </tr>`).join('');

  // ── Template table ─────────────────────────────────────────────────────────
  const templateRows = Object.entries(templateCounts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([tp, cnt]) => `
      <tr>
        <td>${tp}</td><td>${cnt}</td>
        <td>
          <div class="sla-bar-wrap">
            <span style="min-width:32px">${Math.round(cnt / tasks.length * 100)}%</span>
            <div class="sla-bar">
              <div class="sla-bar-fill" style="width:${Math.round(cnt / tasks.length * 100)}%;background:var(--accent)"></div>
            </div>
          </div>
        </td>
      </tr>`).join('');

  // ── Carrier table ──────────────────────────────────────────────────────────
  const carrierTotal = Object.values(carrierCounts).reduce((a, b) => a + b, 0);
  const carrierRows  = Object.entries(carrierCounts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([car, cnt]) => `
      <tr>
        <td style="font-weight:500">${car}</td><td>${cnt}</td>
        <td>
          <div class="sla-bar-wrap">
            <span style="min-width:32px">${Math.round(cnt / carrierTotal * 100)}%</span>
            <div class="sla-bar">
              <div class="sla-bar-fill" style="width:${Math.round(cnt / carrierTotal * 100)}%;background:var(--accent2)"></div>
            </div>
          </div>
        </td>
      </tr>`).join('');

  // ── Per-day table rows ─────────────────────────────────────────────────────
  const dayRows = Object.entries(perDay).sort().map(([date, cnt]) => `
    <tr>
      <td>${date}</td>
      <td>${cnt}</td>
      <td style="color:${cnt >= limit ? 'var(--green)' : 'var(--red)'}">${cnt >= limit ? '✓ Good' : '✗ Low'}</td>
      <td>
        <div class="sla-bar">
          <div class="sla-bar-fill" style="width:${Math.min(100, Math.round(cnt / (limit * 1.5) * 100))}%;background:${cnt >= limit ? 'var(--green)' : 'var(--red)'}"></div>
        </div>
      </td>
    </tr>`).join('');

  // ── All tasks table rows ───────────────────────────────────────────────────
  const allTaskRows = tasks
    .sort((a, b) => (parseDate(b['Actual Complete Date']) || 0) - (parseDate(a['Actual Complete Date']) || 0))
    .map(t => {
      const assignDate   = parseDate(t['Task Assignment Date']);
      const completeDate = parseDate(t['Actual Complete Date']);
      const days = (assignDate && completeDate && completeDate >= assignDate)
        ? Math.ceil((completeDate - assignDate) / 864e5) : '—';

      const sla   = slaStatus(t);
      const escT  = isEscalated(t);
      const lateEsc = escT && (() => {
        const et = parseDate(t['Task Escalation Time']);
        const at = parseDate(t['Task Assignment Date']);
        return et && at && at > et;
      })();

      return `
        <tr class="${lateEsc ? 'escalated' : ''}">
          <td style="font-weight:500">${t['Service Delivery Order - Customer PON'] || '—'}</td>
          <td>${t['Task Type'] || '—'}</td>
          <td>${t['Actual Complete Date'] || '—'}</td>
          <td>${days}</td>
          <td><span class="badge ${sla === 'ok' ? 'badge-green' : sla === 'late' ? 'badge-red' : 'badge-gray'}">${sla === 'ok' ? 'On time' : sla === 'late' ? 'Late' : '—'}</span></td>
          <td>${escT ? `<span class="badge badge-red">Yes${lateEsc ? ' ★' : ''}</span>` : '<span class="badge badge-gray">No</span>'}</td>
          <td style="color:var(--text2);font-size:10px">${t['Service Delivery Order - Market'] || '—'}</td>
        </tr>`;
    }).join('');

  // ── Render HTML ────────────────────────────────────────────────────────────
  const limitHeader = showLimit
    ? ` · Daily limit: <strong class="daily-limit-label" style="color:var(--accent)">${limit}</strong>`
    : '';

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:18px;font-weight:600">${name}</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--mono);margin-top:2px">
          ${getTeam(name)} Team${limitHeader}
        </div>
      </div>
      <button onclick="selectedOwner=null;renderOverview();renderSidebar()"
        style="background:var(--surface);border:1px solid var(--border);color:var(--text2);padding:6px 12px;border-radius:5px;cursor:pointer;font-size:11px;font-family:var(--mono)">
        ← Back
      </button>
    </div>

    <div class="summary-grid">
      <div class="stat-card"><div class="stat-label">Total Completed</div><div class="stat-val blue">${tasks.length}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Tasks / Day</div><div class="stat-val">${avgPerDay}</div></div>
      <div class="stat-card"><div class="stat-label">SLA On-Time</div><div class="stat-val ${slaPct >= 70 ? 'green' : 'red'}">${slaPct}%</div></div>
      <div class="stat-card"><div class="stat-label">Escalated</div><div class="stat-val ${esc.length > 0 ? 'warn' : ''}">${esc.length}</div></div>
      <div class="stat-card"><div class="stat-label">Picked Unassigned Escalated</div><div class="stat-val">${picked.length}</div></div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <h4>Task Type Breakdown</h4>
        <div class="chart-wrap"><canvas id="chartType"></canvas></div>
      </div>
      <div class="chart-card">
        <h4>Daily Completions${showLimit ? ` (limit: ${limit})` : ''}</h4>
        <div class="chart-wrap"><canvas id="chartDay"></canvas></div>
      </div>
    </div>

    <div class="section-title">Task Type Summary</div>
    <div class="table-card">
      <table>
        <thead><tr><th>Task Type</th><th>Count</th><th>% of Total</th></tr></thead>
        <tbody>
          ${typeRows}
          <tr style="background:var(--surface2)">
            <td style="font-weight:600">Total</td>
            <td style="font-weight:600;color:var(--accent)">${tasks.length}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    ${hasTemplate ? `
    <div class="section-title">Order Template Type${hasCarrier ? ' & Carrier' : ''}</div>
    <div style="display:grid;grid-template-columns:${hasCarrier ? '1fr 1fr' : '1fr'};gap:12px;margin-bottom:12px">
      <div class="table-card">
        <table>
          <thead><tr><th>Template</th><th>Count</th><th>%</th></tr></thead>
          <tbody>${templateRows}</tbody>
        </table>
      </div>
      ${hasCarrier ? `
      <div class="table-card">
        <table>
          <thead><tr><th>Carrier</th><th>Count</th><th>%</th></tr></thead>
          <tbody>${carrierRows}</tbody>
        </table>
      </div>` : ''}
    </div>` : ''}

    <div class="per-day-section" style="display:${showLimit ? '' : 'none'}">
      <div class="section-title">Per Day (limit: ${limit})</div>
      <div class="table-card">
        <table>
          <thead><tr><th>Date</th><th>Completed</th><th>Status</th><th>Bar</th></tr></thead>
          <tbody>${dayRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section-title">Monthly Trend by Task Group</div>
    <div class="chart-card" style="margin-bottom:12px">
      <h4>Completed tasks per month — full history, grouped by type</h4>
      <div id="chartTrendLegend" class="chart-legend"></div>
      <div class="chart-wrap" style="height:240px"><canvas id="chartTrend"></canvas></div>
    </div>

    <div class="section-title">All Tasks</div>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Order (PON)</th><th>Task Type</th><th>Complete Date</th>
            <th>Days</th><th>SLA</th><th>Escalated</th><th>Market</th>
          </tr>
        </thead>
        <tbody>${allTaskRows}</tbody>
      </table>
    </div>`;

  // ── Build Charts ───────────────────────────────────────────────────────────
  buildCharts(tasks, typeCounts, perDay, limit, name);
}

// ── CHARTS ────────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#4f8ef7','#38d9a9','#f59e0b','#f87171','#a78bfa','#fb923c','#34d399','#60a5fa'];

function buildCharts(tasks, typeCounts, perDay, limit, name) {
  // Doughnut — task type
  charts.type = new Chart(document.getElementById('chartType'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{ data: Object.values(typeCounts), backgroundColor: CHART_COLORS, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: '60%'
    }
  });

  // Bar — daily completions
  const dayLabels = Object.keys(perDay).sort();
  const dayVals   = dayLabels.map(d => perDay[d]);
  charts.day = new Chart(document.getElementById('chartDay'), {
    type: 'bar',
    data: {
      labels: dayLabels.map(d => d.slice(5)),
      datasets: [{
        data: dayVals,
        backgroundColor: dayVals.map(v => v >= limit ? 'rgba(52,211,153,.7)' : 'rgba(248,113,113,.7)'),
        borderRadius: 3,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#4a5568', font: { size: 9 }, maxRotation: 45 }, grid: { color: '#1e2433' } },
        y: { ticks: { color: '#4a5568', font: { size: 9 } }, grid: { color: '#1e2433' }, beginAtZero: true }
      }
    }
  });

  // Line — monthly trend (full history, grouped)
  const personAll = allData.filter(r => cleanName(r['Task Owner']) === name);

  const moSet = new Set();
  personAll.forEach(t => {
    const d = parseDate(t['Actual Complete Date']);
    if (d) moSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });
  const allMo = [...moSet].sort();

  const grpVol = {};
  personAll.forEach(t => {
    const g = getTaskGroup(t['Task Type']);
    grpVol[g] = (grpVol[g] || 0) + 1;
  });
  const topGrps = Object.entries(grpVol).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);

  const trendLabels = allMo.map(mo => {
    const [yr, mn] = mo.split('-');
    return new Date(+yr, +mn - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  });

  const datasets = topGrps.map((g, i) => ({
    label: g,
    data: allMo.map(mo =>
      personAll.filter(t => {
        const d = parseDate(t['Actual Complete Date']);
        if (!d) return false;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mo
            && getTaskGroup(t['Task Type']) === g;
      }).length
    ),
    borderColor: CHART_COLORS[i],
    backgroundColor: CHART_COLORS[i] + '22',
    tension: 0.35,
    pointRadius: 4,
    borderWidth: 2,
    fill: false
  }));

  charts.trend = new Chart(document.getElementById('chartTrend'), {
    type: 'line',
    data: { labels: trendLabels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#4a5568', font: { size: 9 }, maxRotation: 45, autoSkip: false }, grid: { color: '#1e2433' } },
        y: { ticks: { color: '#4a5568', font: { size: 9 } }, grid: { color: '#1e2433' }, beginAtZero: true }
      }
    }
  });

  const legendEl = document.getElementById('chartTrendLegend');
  if (legendEl) {
    legendEl.innerHTML = datasets.map((ds, i) => `
      <div class="chart-legend-item${ds.hidden ? ' disabled' : ''}" data-idx="${i}">
        <span class="chart-legend-swatch" style="background:${CHART_COLORS[i]}"></span>
        ${ds.label}
      </div>
    `).join('');

    legendEl.querySelectorAll('.chart-legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = Number(item.dataset.idx);
        const meta = charts.trend.getDatasetMeta(index);
        meta.hidden = meta.hidden === null ? !charts.trend.data.datasets[index].hidden : !meta.hidden;
        charts.trend.toggleDataVisibility(index);
        item.classList.toggle('disabled', meta.hidden);
        charts.trend.update();
      });
    });
  }
}

function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}
