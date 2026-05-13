# SDAPP Task Tracker

A simple client-side dashboard for tracking completed SDAPP tasks from Quickbase CSV exports.

## How to use

1. Export CSV from Quickbase report `TSDCompleteTasks`
2. Open the app → click **Upload CSV**
3. Filter by Year, Month, Team
4. Click a person from the sidebar to see their details

## Project Structure

```
sdapptrack/
├── index.html
├── config.json       # Teams, members, daily limits
├── css/style.css
└── js/
    ├── config.js     # State, helpers, config loader
    ├── filters.js    # Filter logic
    ├── sidebar.js    # Sidebar + overview
    ├── detail.js     # Detail view + charts
    └── settings.js   # Settings modal + GitHub API
```

## Configuration

Teams, members, and daily limits are managed via the **⚙ Settings** panel in the app.
Changes are saved directly to `config.json` in this repo via GitHub API.

Each admin needs a GitHub Personal Access Token with `repo` scope:
> GitHub → Settings → Developer Settings → Personal Access Tokens → New token (classic) → scope: `repo`

Enter the token in ⚙ Settings → Save locally. Only needed when making changes.

## Adding a new admin

1. Add them as a Collaborator in repo Settings → Collaborators
2. They create their own token (see above) and enter it in the app

## CSV columns expected

`Task Owner`, `Actual Complete Date`, `Task Type`, `Service Delivery Order - Customer PON`,
`Escalated Task?`, `Service Delivery Order - Escalated Order?`, `Task Escalation Time`,
`Task Assignment Date`, `Ready Date`, `Service Delivery Order - Market`,
`Service Delivery Order - Order Template Type`

## Stack

Plain HTML / CSS / JS — no build tools required.
[PapaParse](https://www.papaparse.com/) for CSV parsing, [Chart.js](https://www.chartjs.org/) for charts.