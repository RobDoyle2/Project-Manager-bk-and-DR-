/* =====================================================================
   Add several tasks at once: pasted list (one per line) and/or CSV file
   ===================================================================== */
function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const first = text.split(/\r?\n/).find(l => l.trim()) || '';
  const count = ch => (first.match(new RegExp('\\' + ch, 'g')) || []).length;
  const delim = count(';') > count(',') && count(';') > count('\t') ? ';' : (count('\t') > count(',') ? '\t' : ',');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
function looseDate(s) {
  s = (s || '').trim();
  if (parseISO(s)) return s;
  const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);   // day/month/year (Irish / UK style)
  if (m) { const iso = `${m[3]}-${pad2(+m[2])}-${pad2(+m[1])}`; if (parseISO(iso)) return iso; }
  return '';
}
function findObjective(txt) {
  txt = (txt || '').trim().toLowerCase(); if (!txt) return null;
  return realObjs().find(o => o.id.toLowerCase() === txt || o.name.trim().toLowerCase() === txt) || null;
}
/* CSV rows -> [{name, owner, start, end, priority, objective, level}] ; header row is optional */
function csvToTaskRows(rows) {
  if (!rows.length) return { items: [], header: false };
  const norm = s => s.trim().toLowerCase().replace(/[^a-z]/g, '');
  const h = rows[0].map(norm);
  const idx = names => h.findIndex(x => names.includes(x));
  const nameCol = idx(['task', 'name', 'taskname', 'title', 'tasks']);
  const header = nameCol >= 0;
  const col = header ? { name: nameCol, owner: idx(['owner', 'assignee', 'assignedto']), start: idx(['start', 'startdate']), end: idx(['end', 'enddate', 'due', 'duedate', 'targetdate']), prio: idx(['priority']), obj: idx(['objective']) } : { name: 0, owner: -1, start: -1, end: -1, prio: -1, obj: -1 };
  const get = (r, c) => c >= 0 && r[c] !== undefined ? r[c].trim() : '';
  const items = rows.slice(header ? 1 : 0).map(r => ({ name: get(r, col.name), owner: get(r, col.owner), start: looseDate(get(r, col.start)), end: looseDate(get(r, col.end)), priority: PRIORITIES.find(p => p.toLowerCase() === get(r, col.prio).toLowerCase()) || '', objective: get(r, col.obj), level: 0 })).filter(x => x.name);
  return { items, header, extra: header && (col.owner >= 0 || col.start >= 0 || col.end >= 0 || col.prio >= 0 || col.obj >= 0) };
}
/* pasted text -> rows. Indented / "-" lines become subtasks of the line above. */
function textToTaskRows(text) {
  const out = [];
  String(text).split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    const sub = /^(\s{2,}|\t|[-•*–]\s+)/.test(line) && out.some(x => x.level === 0);
    let name = line.replace(/^(\s+|[-•*–]\s+)+/, '').split('\t')[0].replace(/^"|"$/g, '').trim();
    if (name) out.push({ name, owner: '', start: '', end: '', priority: '', objective: '', level: sub ? 1 : 0 });
  });
  return out;
}
const CSV_TEMPLATE = 'Task,Owner,Start,End,Priority,Objective\r\nExample task - replace me,Jane Doe,2026-11-02,2026-11-30,High,\r\nAnother task (only the Task column is required),,,,,\r\n';

function bulkTasksModal(ctx = {}) {
  let csvItems = [], csvInfo = '';
  const startObj = ctx.parentId !== undefined ? ctx.parentId : '';
  const objOpts = [['', '— No objective yet (unassigned) —']].concat(realObjs().map(o => [o.id, `${o.id} · ${o.name}`]));
  const base = startObj ? IDX.objective.get(startObj).item : data.project;
  const html = `<div class="fgrid">
    <p class="full muted small">Create many tasks in one go. Type or paste names below (one per line), import a CSV file, or both. Only the name is required — everything else uses the defaults you set here and can be edited later.</p>
    ${fld('Add to objective', sel('parent', objOpts, startObj), 'full')}
    ${fld('Default owner', inp('owner', '', 'list="owners" placeholder="Optional"') + ownerDatalist())}
    ${fld('Default priority', sel('priority', PRIORITIES, 'Medium'))}
    ${fld('Default start date *', dateInp('startDate', todayISO()))}
    ${fld('Default end date *', dateInp('endDate', todayISO()))}
    ${fld('Task names — one per line', txt('names', '', 8, 'placeholder="Inventory servers\nClassify recovery tiers\n   Draft tier model      (indent = subtask of the task above)\n   Business sign-off"'), 'full', 'Tip: indent a line (spaces, Tab or “- ”) to make it a <b>subtask</b> of the task above. You can paste a column straight from Excel.')}
    <div class="fld full csv-box"><span class="fl">Or import a CSV file</span>
      <div class="csv-row"><input type="file" name="csvFile" accept=".csv,.txt,text/csv"><button type="button" class="btn small ghost" data-action="download-csv-template">${icon('download', 14)} Download CSV template</button></div>
      <small class="hint">Just a list of names works. With a header row you may also include Owner, Start, End (YYYY-MM-DD or DD/MM/YYYY), Priority and Objective (name or ID) columns.</small>
      <div id="csvInfo" class="csv-info" hidden></div></div>
    <div class="full calc-box" id="bulkPreview"></div>
  </div>`;
  openModal({
    title: 'Add several tasks', html, wide: true, saveLabel: 'Create tasks',
    onOpen: f => {
      const rowsNow = () => textToTaskRows(f.elements.names.value).concat(csvItems);
      const preview = () => {
        const r = rowsNow(), t = r.filter(x => x.level === 0).length, s = r.length - t;
        $('#bulkPreview', f).innerHTML = r.length ? `Ready to create <b>${t}</b> task${t === 1 ? '' : 's'}${s ? ` and <b>${s}</b> subtask${s === 1 ? '' : 's'}` : ''}.` : '<span class="muted">Nothing to create yet.</span>';
      };
      f.addEventListener('input', e => { if (e.target.name === 'names') preview(); });
      f.elements.csvFile.addEventListener('change', () => {
        const file = f.elements.csvFile.files[0]; const info = $('#csvInfo', f);
        csvItems = []; info.hidden = true; if (!file) { preview(); return; }
        readFileText(file).then(txt => {
          const res = csvToTaskRows(parseCSV(txt));
          csvItems = res.items;
          info.hidden = false;
          info.textContent = res.items.length ? `${file.name}: ${res.items.length} row${res.items.length === 1 ? '' : 's'} found${res.header ? ' (header row detected' + (res.extra ? ', extra columns will be used' : '') + ')' : ' (no header — first column used as the task name)'}.` : `${file.name}: no task names found.`;
          preview();
        }).catch(() => { info.hidden = false; info.textContent = 'Could not read that file.'; });
      });
      preview();
    },
    onSave: f => {
      const rows = textToTaskRows(f.elements.names.value).concat(csvItems);
      if (!rows.length) return { error: 'Enter at least one task name or choose a CSV file.', field: 'names' };
      if (rows.length > 1000) return { error: 'That is a lot — please import at most 1,000 rows at a time.' };
      const dS = val(f, 'startDate'), dE = val(f, 'endDate');
      if (!parseISO(dS) || !parseISO(dE) || dayNum(dE) < dayNum(dS)) return { error: 'Please set a valid default start and end date (end on or after start).', field: 'startDate' };
      const dOwner = val(f, 'owner'), dPrio = val(f, 'priority'), pid = val(f, 'parent');
      const defObj = pid ? IDX.objective.get(pid).item : null;
      let nT = 0, nS = 0, nUn = 0, lastTask = null, missingObj = 0;
      rows.forEach(r => {
        if (r.level === 1 && lastTask) {
          lastTask.subtasks.push({ id: nextId('subtask'), name: r.name, description: '', owner: r.owner || lastTask.owner, priority: r.priority || lastTask.priority, startDate: lastTask.startDate, endDate: lastTask.endDate, forecastStart: '', forecastEnd: '', status: 'not-started', progress: 0, blocked: false, blocker: '', notes: [] });
          nS++; return;
        }
        let target = defObj;
        if (r.objective) { const m = findObjective(r.objective); if (m) target = m; else missingObj++; }
        const tgt = target || ensureUnassigned();
        let s = r.start || dS, e = r.end || dE;
        if (dayNum(e) < dayNum(s)) { s = dS; e = dE; }
        const t = { id: nextId('task'), name: r.name, description: '', owner: r.owner || dOwner, priority: r.priority || dPrio, startDate: s, endDate: e, forecastStart: '', forecastEnd: '', status: 'not-started', progress: 0, blocked: false, blocker: '', notes: [], subtasks: [] };
        tgt.tasks.push(t); lastTask = t; nT++; if (tgt.system) nUn++;
      });
      afterChange();
      toast(`Created ${nT} task${nT === 1 ? '' : 's'}${nS ? ` and ${nS} subtask${nS === 1 ? '' : 's'}` : ''}${nUn ? ` (${nUn} unassigned)` : ''}.${missingObj ? ` ${missingObj} row(s) named an objective that wasn't found.` : ''}`, missingObj ? 'warn' : 'ok', missingObj ? 6000 : 3500);
    }
  });
}
