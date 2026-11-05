BACKUP & DR PROGRAMME MANAGER  -  v1.2.0
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

PROGRAMME NAME (top left)
  - The name at the top left comes from the project JSON file ("project.name"). It is not tied to Backup & DR, so the
    app can run any programme or project. A new, empty file shows "Programme name"; click the pencil to type it.
  - It is stored with your data. Press the status button (or Export JSON) to write it into your file. The word
    "Programme" under the name is part of the interface, not the file. Timeline dates etc. are under Reports & Data
    Management > Project settings.
  - Exported file names are built from the programme name (e.g. Acme-Phase-2_2026-11-05_1055.json); an unnamed
    programme uses "Project".

SAVING TO A FILE YOU CHOOSE (Chrome / Edge / Opera on a computer)
  - "Import JSON" (the upload arrow) opens the file browser straight away, starting in your Downloads folder, and keeps the
    file you pick linked so the status button can update it. (Where the browser allows choosing a start folder; on
    Android / iPhone / Firefox / Safari the system's own file chooser appears and its start folder cannot be set by the page.)
  - To create a new file, or to see the link: click the status button before a file is linked (or use Reports & Data
    Management > "Save to a file..."). The dialog offers:
      * Browse for an existing file...  - pick a project .json; after you confirm, it replaces the current data and stays linked.
      * Save as a new file...           - choose the folder AND the file name; the project is written there and stays linked.
      * Import once, without linking    - the normal file chooser.
  - The status button beside it then shows the file name. When it says "Update <file>" there are changes not yet
    in the file; click it and the file is updated in place. (The browser may ask permission to edit the file
    the first time after you reopen the app.)
  - "Export JSON" (top bar, sidebar reminder, Reports page) also opens the save-as dialog, so you browse for the folder and
    type the file name instead of the file landing in Downloads. This saves a copy; it does not change the linked file.
  - Reports & Data Management has a matching "Save to a file..." / "Linked file..." button, with "Stop linking".
  - Firefox, Safari, phones and embedded viewers cannot do this; there the upload arrow is the normal import and
    the status button and Export JSON download the file to your Downloads folder.

NAVIGATION
  Dashboard | Objectives | Tasks & Subtasks | Roadmap | Risks & Blockers | Dependencies | Milestones |
  Reports & Data Management

READ-ONLY VIEW IS THE DEFAULT
  Clicking the name of an objective, task or subtask (in lists, objective cards, the roadmap bars) opens a read-only
  page with all its details and clickable links - nothing can be changed by accident. Use the pencil icon, or the
  "Edit" button on the view page, to change something. The book icon beside the pencil also opens the view.

LINKS
  Every objective, task and subtask has a "Links" area in its edit form: click "Add link", then enter a friendly name
  (e.g. "Design document") and the link, side by side. The name shows as a clickable chip on the objective card and
  the task row (opens in a new tab). Web addresses (https://, or just www.example.com), email links and file / folder
  paths are accepted. File-share paths such as \\server\share\file cannot be opened by a web page, so they show as a
  chip that copies the path when clicked. javascript: and similar links are always refused, also on import.
  Links are stored in the JSON as "links": [{"name": "...", "url": "..."}].

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

OBJECTIVE COLOURS  (roadmap and throughout the app)
  Each objective has one strong colour; ALL its tasks and subtasks use one lighter shade of it. The first eight are
  fixed: 01 Emerald #006B5B/#C0DDD6, 02 Royal Blue #315DA8/#C6D3E9, 03 Deep Purple #65449A/#D3C7E5,
  04 Burnt Orange #C45B32/#EED0C1, 05 Teal #147E91/#C0DDE1, 06 Ochre Gold #A17A20/#E8DDBB,
  07 Slate Blue #526B82/#C9D4DC, 08 Berry #963E60/#E6C6D2. Objectives 9-14 use an extended palette (Forest Olive, Plum,
  Coffee Brown, Crimson, Sage Green, Charcoal); after 14 the palette repeats.
  - A new objective takes the next unused colour (avoiding a look-alike of the objective above it).
  - Deleting or reordering objectives never recolours the others. The choice is stored in the JSON ("colorIndex").
    Older files without it are assigned automatically in order, then kept.
  - Tasks moved to another objective take that objective's colour automatically.
  - Shown in: roadmap bars and labels (white bold text on objective labels, charcoal on task/subtask bars), milestone
    diamonds, objective cards, task-list group headers and row markers, dashboard progress list, reports.
  - Status is never colour only: status labels, a red outline plus a stop sign for blocked, a dashed outline for overdue,
    and a tick / ! / cross inside milestone diamonds. Progress shows as a % and a thin bar along the bottom of each bar.
  - Prefer the old status colours (grey/blue/green/amber/red)? Roadmap toolbar -> "Colour by status".

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
