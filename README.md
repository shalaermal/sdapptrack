# SDAPP Task Tracker

A client-side dashboard for tracking completed SDAPP tasks using CSV or Google Sheets data.

The app helps teams review task completion, filter results by date and team, and view individual task owner performance through charts and detailed summaries.

---

## Overview

SDAPP Task Tracker is built as a lightweight frontend-only application using plain HTML, CSS, and JavaScript.

It supports:

- CSV upload from Quickbase exports
- Google Sheets data loading
- Filtering by year, month, day, team, and task owner
- Team-based sidebar overview
- Individual task owner detail view
- Charts and performance summaries
- Configurable teams, members, SLA days, and daily limits

---

## Tech Stack

- HTML
- CSS
- JavaScript
- PapaParse
- Chart.js

---

## Project Structure

```text
sdapptrack/
├── index.html
├── config.json
├── css/
│   └── style.css
└── js/
    ├── config.js
    ├── filters.js
    ├── sidebar.js
    ├── detail.js
    └── settings.js
```

---

## How to Use

1. Open the app in your browser.
2. Load task data from Google Sheets or upload a CSV file.
3. Use the filters to select year, month, day, team, or task owner.
4. Click a person from the sidebar to view their task details.
5. Review charts, completed tasks, escalations, SLA information, and daily limits.

---

## CSV Data

The app is designed to work with Quickbase CSV exports.

Expected columns include:

```text
Task Owner
Actual Complete Date
Task Type
Service Delivery Order - Customer PON
Escalated Task?
Service Delivery Order - Escalated Order?
Task Escalation Time
Task Assignment Date
Ready Date
Service Delivery Order - Market
Service Delivery Order - Order Template Type
```

---

## Configuration

Team settings are stored in:

```text
config.json
```

The configuration includes:

- Teams
- Team members
- Daily task limits
- SLA days
- Daily limit visibility

Admins can update this configuration through the app settings panel.

---

## Admin Settings

The settings panel allows admins to:

- Add or remove teams
- Rename teams
- Add or remove team members
- Update daily limits
- Update SLA days
- Show or hide daily limit sections
- Save configuration changes back to GitHub

To save changes to GitHub, each admin needs their own GitHub Personal Access Token.

The token is stored only in the browser using `localStorage` and is required only when saving configuration changes.

---

## Security Note

Do not commit GitHub tokens or sensitive credentials into the repository.

Each admin should use their own token and keep it private.

For better security, use the minimum required GitHub token permissions needed to update `config.json`.

---

## Local Usage

Because this is a frontend-only project, no build step is required.

You can run it locally by opening:

```text
index.html
```

in your browser.

For a better local development experience, you can use a simple local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## Notes

This project is intended as an internal productivity dashboard for tracking SDAPP task completion and team performance.

It is not a backend application and does not require a database or server-side runtime.
