BACKUP & DR PROGRAMME MANAGER  -  v1.1.0
=========================================

FILES
  Backup-DR-Project.html   The complete application (one standalone file, no internet needed).
  Backup-DR-Data.json      A blank project data file (schema version 1) - also your import/export format.
  README.txt               This file.

NO INSTALLATION REQUIRED
  1. Copy the files to the office computer (USB stick, email, network share).
  2. Double-click Backup-DR-Project.html. It opens in Microsoft Edge or Chrome.
  3. Works fully offline. No server, database, framework or admin rights needed.
  Also works on phone/tablet browsers for prototype testing (open the file or host it on any web share).

FIRST USE
  - The application starts EMPTY by design (no sample objectives, tasks or activities).
  - Dashboard > "Create first objective", then add tasks and subtasks.
  - Roadmap (default timeline Oct 2026 - Jun 2027, nine monthly columns) builds itself from your data.

MOVING DATA BETWEEN COMPUTERS  (important)
  The browser auto-saves to its own storage, but that storage belongs to ONE browser on ONE computer
  and can be cleared by the user, IT policy or "clear browsing data". The JSON file is your master copy.
  - Export:  "Export JSON" (top right, or Reports & Data Management). Saves Backup-DR-Data_<date>_<time>.json.
  - Import:  Reports & Data Management > "Import JSON...", or drag a .json file onto the window.
             The file is validated first; you must confirm before existing data is replaced.
             A browser backup of the current data is taken automatically before any import/reset/restore.
  - The left sidebar shows an amber "Unexported changes" reminder until you export.
  - Blank template: Reports & Data Management > "Download blank template".

NAVIGATION
  Dashboard | Objectives | Tasks & Subtasks | Roadmap | Risks & Blockers | Dependencies | Milestones |
  Reports & Data Management

TASKS WITHOUT AN OBJECTIVE / ADDING MANY TASKS  (added in v1.1)
  - Tasks do not need an objective. Choose "No objective yet (unassigned)" in the task form; they appear in an
    "Unassigned tasks" group on the Tasks page and in the Technical roadmap. Open a task later and pick an
    objective to link it. Unassigned tasks count in task totals but not in objective progress or the
    management roadmap. (In the JSON they live in a hidden objective with "system": true and id OBJ-000.)
  - "Add several tasks" (Tasks page, or Dashboard): type or paste names one per line (indent a line, or start it
    with "- ", to make it a subtask of the line above), and/or import a CSV file.
  - CSV: a plain list of names in the first column is enough. Optional header row with any of:
    Task, Owner, Start, End (YYYY-MM-DD or DD/MM/YYYY), Priority, Objective (name or ID).
    Comma, semicolon and tab separators are detected. "Download CSV template" gives an example.

HOW PROGRESS WORKS  (all automatic - never edit a roadmap by hand)
  Subtask   : you set 0-100%.
  Task      : no subtasks -> you set 0-100%.   With subtasks -> average of its subtasks (all done = 100%).
  Objective : equal-weight average of its top-level tasks (no tasks = 0% / Not started; all done = 100%).
  Programme : equal-weight average of the objectives (subtasks are never counted twice).
  Changing anything instantly recalculates parent task, objective, dashboard, roadmap and reports.

STATUS RULES (derived, in priority order)
  Completed (100%) > Blocked (item flagged blocked, or anything beneath it is blocked) > On hold (manual) >
  Delayed (end date, or forecast end, has passed and not complete) > At risk (manual flag, or a child is
  at risk / delayed) > In progress (any progress) > Not started.
  Colours: grey = not started, blue = in progress, green = completed, amber = at risk, red = blocked/delayed,
  lavender = on hold.

ROADMAP
  Management view : objectives and milestones only, status-coloured bars with % complete inside.
  Technical view  : objectives > tasks > subtasks, indented; owners, %, status, dependency counts, blockers.
                    Collapse/expand rows; colour by work level or by status.
  Baseline vs forecast : dates you enter are the BASELINE and never move automatically. Enter optional
                    "Revised forecast" dates on any item to show a dashed forecast bar and the slip in days.
  If items fall outside the project timeline the roadmap widens automatically (and tells you).
  Change the timeline in Reports & Data Management > Project settings.
  Click any bar or milestone to edit it.

PRINTING / PDF
  Roadmap > Print / PDF, or Reports & Data Management. Prints A4 landscape with colours.
  To create a PDF choose "Save as PDF" as the printer in the print dialog (Edge/Chrome).
  Status report: download as a self-contained HTML file, or print / save as PDF.

DEPENDENCIES
  Add them from the Dependencies page, or inside any objective/task/subtask form. Types: task, objective,
  asset, recovery. The matrix shows who depends on what. The register warns about schedule conflicts
  (a dependent item starting before what it relies on finishes) and circular chains.

DATA FORMAT  (schemaVersion 1)
  project > objectives[] > tasks[] > subtasks[]   plus risks[], dependencies[], milestones[], counters, meta.
  Dates are ISO text "YYYY-MM-DD" (no time zones involved). IDs: OBJ-001, TSK-001, SUB-001, RSK-, DEP-, MS-.
  Fields prefixed "computed" are written for readability and are recalculated on load.
  Imports are rejected (nothing changed) if: not valid JSON, schemaVersion missing or newer than the app,
  invalid/non-ISO dates, end before start, duplicate IDs, missing names, wrong structure.

BROWSER NOTES
  - Use a current Edge or Chrome. Private/InPrivate windows do not keep autosave - export instead.
  - Opening from a network share or email attachment may show a security prompt; save the file locally first.

DEVELOPMENT (optional - not needed to use the app)
  src/        Source: shell.html, style.css, report.css and numbered JS modules.
  build.py    python3 build.py  ->  regenerates Backup-DR-Project.html from src/.
  tests/      Playwright QA scripts (node qa.js, qa2.js, qa3.js ...) used to verify the app.
