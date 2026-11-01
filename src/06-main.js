/* =====================================================================
   Application shell: navigation, render loop, actions, import / export, init
   ===================================================================== */
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', fn: () => viewDashboard() },
  { id: 'objectives', label: 'Objectives', icon: 'target', fn: () => viewObjectives() },
  { id: 'tasks', label: 'Tasks & Subtasks', icon: 'tasks', fn: () => viewTasks() },
  { id: 'roadmap', label: 'Roadmap', icon: 'roadmap', fn: () => viewRoadmap() },
  { id: 'risks', label: 'Risks & Blockers', icon: 'risk', fn: () => viewRisks() },
  { id: 'dependencies', label: 'Dependencies', icon: 'link', fn: () => viewDependencies() },
  { id: 'milestones', label: 'Milestones', icon: 'diamond', fn: () => viewMilestones() },
  { id: 'reports', label: 'Reports & Data Management', icon: 'report', fn: () => viewReports() }
];

function renderNav() {
  const unexp = !data.meta.lastExportedAt || data.meta.modifiedAt > data.meta.lastExportedAt;
  const hasContent = countsOf(data).tasks || data.objectives.length || data.risks.length || data.milestones.length;
  $('#nav').innerHTML = NAV.map(n => {
    const badge = n.id === 'risks' && D.blockedItems.length ? `<span class="nav-badge red" data-tip="${D.blockedItems.length} blocked item(s)">${D.blockedItems.length}</span>` : '';
    return `<a href="#${n.id}" class="${ui.view === n.id ? 'active' : ''}" data-nav="${n.id}" ${ui.view === n.id ? 'aria-current="page"' : ''}>${icon(n.icon, 19)}<span>${n.label}</span>${badge}</a>`;
  }).join('');
  $('#sideFoot').innerHTML = hasContent && unexp
    ? `<button class="export-nudge" data-action="export-json">${icon('download', 15)}<span>Unexported changes<br><small>Export JSON to keep a safe copy</small></span></button>`
    : `<div class="side-ok">${icon('check', 14)} <span>${data.meta.lastExportedAt ? 'Exported ' + esc(fmtDateTime(data.meta.lastExportedAt)) : 'Nothing to export yet'}</span></div>`;
  $('#pageTitle').textContent = (NAV.find(n => n.id === ui.view) || NAV[0]).label;
}
function updateSaveChip() {
  const el = $('#saveChip'); if (!el) return;
  const s = ui.saveState;
  el.className = 'save-chip ' + s;
  el.innerHTML = s === 'pending' ? `${icon('refresh', 14)} Saving…`
    : s === 'saved' ? `${icon('check', 14)} Autosaved ${ui.lastSaved ? fmtStamp(ui.lastSaved) : ''}`
    : s === 'error' ? `${icon('risk', 14)} Autosave unavailable — export JSON` : `${icon('save', 14)} Ready`;
  el.title = s === 'error' ? 'Browser storage is unavailable or full. Use Export JSON to keep your data.' : 'Changes are saved automatically in this browser. Export JSON for a portable copy.';
}
function render() {
  D = derive();
  const ae = document.activeElement, keep = ae && ae.id && $('#view').contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
  renderNav();
  const nav = NAV.find(n => n.id === ui.view) || NAV[0];
  $('#view').innerHTML = nav.fn();
  if (keep) { const n = document.getElementById(keep.id); if (n) { n.focus(); try { n.setSelectionRange(keep.s, keep.e); } catch (e) { /* not a text input */ } } }
  updateSaveChip();
}
function afterChange() {
  data.meta.modifiedAt = new Date().toISOString();
  syncStored(); render(); scheduleSave();
}
function go(view) {
  // In-app routing: never rely on the browser navigating (links to "#x" break in some embedded viewers).
  if (!NAV.some(n => n.id === view)) view = 'dashboard';
  ui.view = view;
  try { if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view); } catch (e) { /* embedded viewer: ignore */ }
  render(); window.scrollTo(0, 0);
}
function saveUiPrefs() { try { localStorage.setItem(LS_UI, JSON.stringify({ rmMode: ui.rmMode, rmColor: ui.rmColor, rmMilestones: ui.rmMilestones, rmForecast: ui.rmForecast })); } catch (e) { /* ignore */ } }

/* ---------------- import / export / reset ---------------- */
function readFileText(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error || new Error('Could not read the file.')); r.readAsText(file); });
}
function problemList(items, cls) { return `<ul class="issues ${cls}">${items.slice(0, 25).map(x => `<li>${esc(x)}</li>`).join('')}${items.length > 25 ? `<li>…and ${items.length - 25} more</li>` : ''}</ul>`; }
async function handleImportFile(file) {
  let text;
  try { text = await readFileText(file); } catch (e) { toast('Could not read that file.', 'error'); return; }
  return handleImportText(text, file.name);
}
async function handleImportText(text, fileName) {
  const file = { name: fileName };
  let raw;
  try { raw = JSON.parse(text.replace(/^﻿/, '')); }
  catch (e) { await infoDialog({ title: 'Import failed', html: `<p><b>${esc(file.name)}</b> is not valid JSON.</p>${problemList([String(e.message)], 'err')}<p class="muted">Your current project data has not been changed.</p>` }); return; }
  const r = parseProject(raw);
  if (r.errors.length) {
    await infoDialog({ title: 'Import failed — file did not pass validation', html: `<p><b>${esc(file.name)}</b> has ${r.errors.length} problem${r.errors.length === 1 ? '' : 's'}:</p>${problemList(r.errors, 'err')}${r.warnings.length ? `<p>Also:</p>${problemList(r.warnings, 'warn')}` : ''}<p class="muted">Your current project data has not been changed.</p>` });
    return;
  }
  const cur = countsOf(data), inc = countsOf(r.data);
  const fmt = c => `${c.objectives} objectives, ${c.tasks} tasks, ${c.subtasks} subtasks, ${c.milestones} milestones, ${c.risks} risks`;
  const ok = await confirmDialog({
    title: 'Replace current project data?', danger: true, okLabel: 'Replace with imported data',
    message: `Importing <b>${esc(file.name)}</b> will <b>replace</b> everything currently in the application.`,
    html: `<div class="cmp"><div><small>Current</small><b>${esc(data.project.name)}</b><span>${fmt(cur)}</span></div><div class="cmp-arrow">→</div><div><small>Imported</small><b>${esc(r.data.project.name)}</b><span>${fmt(inc)}</span></div></div>
      ${r.warnings.length ? `<p>The file was accepted with ${r.warnings.length} note${r.warnings.length === 1 ? '' : 's'}:</p>${problemList(r.warnings, 'warn')}` : ''}
      <p class="muted small">A backup of your current data is saved in this browser first (Reports &amp; Data Management → Browser backups).</p>`
  });
  if (!ok) { toast('Import cancelled — nothing was changed.', 'warn'); return; }
  snapshot(`Before import of ${file.name}`);
  data = r.data; ui.collapsed.clear(); ui.objOpen.clear();
  ui.taskFilter = { q: '', obj: 'all', status: 'all', owner: 'all', blockedOnly: false, hideDone: false }; ui.objFilter = { q: '', status: 'all' }; ui.rmObj = 'all';
  syncStored(); D = derive(); saveLocal(); go('dashboard'); render();
  toast(`Imported ${inc.objectives} objectives and ${inc.tasks} tasks.`);
}
async function resetProject() {
  const ok = await confirmDialog({ title: 'Reset project?', danger: true, okLabel: 'Delete everything and start blank', message: 'This removes <b>all</b> objectives, tasks, subtasks, risks, dependencies and milestones from the application. A backup is saved in this browser first, but you should export a JSON copy if you may need this data again.' });
  if (!ok) return;
  snapshot('Before reset'); data = blankProject(); ui.collapsed.clear(); ui.objOpen.clear(); afterChange(); toast('Project reset to a blank state.');
}
async function restoreBackup(i) {
  const b = readBackups()[i]; if (!b) return;
  let r; try { r = parseProject(JSON.parse(b.json)); } catch (e) { r = { errors: ['Backup is unreadable.'] }; }
  if (r.errors.length) { toast('That backup could not be read.', 'error'); return; }
  const ok = await confirmDialog({ title: 'Restore this backup?', danger: true, okLabel: 'Restore backup', message: `Replace the current project data with the backup from <b>${esc(fmtDateTime(b.at))}</b> (${esc(b.reason)})? The current data is backed up first.` });
  if (!ok) return;
  snapshot('Before restore'); data = r.data; ui.collapsed.clear(); afterChange(); toast('Backup restored.');
}

/* ---------------- actions ---------------- */
const ACTIONS = {
  goto: ds => go(ds.view),
  'obj-new': () => objectiveModal(),
  'obj-edit': ds => objectiveModal(ds.id),
  'obj-del': ds => deleteObjectiveFlow(ds.id),
  'obj-toggle': ds => { ui.objOpen.has(ds.id) ? ui.objOpen.delete(ds.id) : ui.objOpen.add(ds.id); render(); },
  'task-new': ds => {
    let pid;
    if (ds.obj === 'unassigned') pid = '';
    else if (ds.obj) pid = ds.obj;
    else if (ui.view === 'tasks' && ui.taskFilter.obj !== 'all') pid = ui.taskFilter.obj === SYS_ID ? '' : ui.taskFilter.obj;
    workItemModal('task', null, pid === undefined ? {} : { parentId: pid });
  },
  'tasks-bulk': ds => {
    let pid;
    if (ds.obj === 'unassigned') pid = '';
    else if (ds.obj) pid = ds.obj;
    else if (ui.view === 'tasks' && ui.taskFilter.obj !== 'all') pid = ui.taskFilter.obj === SYS_ID ? '' : ui.taskFilter.obj;
    bulkTasksModal(pid === undefined ? {} : { parentId: pid });
  },
  'save-settings': (ds, el) => SUBMITS['save-settings'](el.closest('form')),
  'download-csv-template': () => download('Backup-DR-Tasks-template.csv', CSV_TEMPLATE, 'text/csv'),
  'task-edit': ds => workItemModal('task', ds.id),
  'task-del': ds => deleteTaskFlow(ds.id),
  'sub-new': ds => workItemModal('sub', null, { parentId: ds.task }),
  'sub-edit': ds => workItemModal('sub', ds.id),
  'sub-del': ds => deleteSubFlow(ds.id),
  'open-item': ds => openItem(ds.id),
  toggle: ds => { ui.collapsed.has(ds.id) ? ui.collapsed.delete(ds.id) : ui.collapsed.add(ds.id); render(); },
  'rm-toggle': ds => { ui.collapsed.has(ds.id) ? ui.collapsed.delete(ds.id) : ui.collapsed.add(ds.id); render(); },
  'rm-expand': () => { ui.collapsed.clear(); render(); },
  'rm-collapse': () => { data.objectives.forEach(o => ui.collapsed.add(o.id)); render(); },
  'rm-mode': ds => { ui.rmMode = ds.mode; saveUiPrefs(); render(); },
  'risk-new': () => riskModal(), 'risk-edit': ds => riskModal(ds.id), 'risk-del': ds => deleteRiskFlow(ds.id),
  'blocker-flag': () => blockerModal(), 'blocker-resolve': ds => resolveBlocker(ds.id),
  'dep-new': () => { if (!D.totals.tasks && !D.totals.objectives) { toast('Create an objective or task first.', 'warn'); return; } depModal(); },
  'dep-edit': ds => depModal(ds.id), 'dep-del': ds => deleteDepFlow(ds.id),
  'ms-new': () => milestoneModal(), 'ms-edit': ds => milestoneModal(ds.id), 'ms-del': ds => deleteMilestoneFlow(ds.id),
  tab: ds => { ui[ds.group] = ds.tab; render(); },
  'set-prog': (ds, el) => {
    const f = el.closest('form'), pr = f && f.elements.progress; if (!pr) return;
    pr.value = ds.v; pr.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'dep-row-add': (ds, el) => {
    const ed = el.closest('[data-depeditor]'); const list = $('.dep-list', ed);
    list.insertAdjacentHTML('beforeend', depRowHtml({ type: 'task' }, ed.dataset.self));
  },
  'dep-row-del': (ds, el) => { const r = el.closest('.dep-row'); if (r) r.remove(); },
  'export-json': () => { exportJSON(); toast('Project exported as JSON.'); render(); },
  'download-backup': ds => { const b = readBackups()[+ds.i]; if (b) download(stampName('Backup-DR-Data-backup', 'json'), JSON.stringify(JSON.parse(b.json), null, 2)); },
  'import-json': () => { const fi = $('#fileInput'); fi.value = ''; fi.click(); },
  'save-now': () => { const a = saveLocal(), b = snapshot('Manual save'); toast(a ? (b ? 'Saved and backed up in this browser.' : 'Saved (backup could not be stored).') : 'Browser storage unavailable — please use Export JSON.', a ? 'ok' : 'error'); render(); },
  'show-json': () => {
    computedFields();
    const json = JSON.stringify(data, null, 2);
    openModal({ title: 'Project JSON', wide: true, hideSave: true, cancelLabel: 'Close',
      html: `<p class="muted small">Use this when downloads are blocked (for example in an embedded viewer): copy the text, then paste it into a text file saved as <b>.json</b>, or into “Paste JSON…” on another copy of the app.</p>
        <textarea id="jsonOut" class="json-box" readonly rows="14">${esc(json)}</textarea>
        <div class="btn-row mt">${btn('Copy to clipboard', 'copy-json', '', 'primary')}<span class="muted small">${json.length.toLocaleString()} characters</span></div>` });
    setTimeout(() => { const t = $('#jsonOut'); if (t) t.select(); }, 50);
  },
  'copy-json': () => {
    const t = $('#jsonOut'); if (!t) return; t.select();
    const done = () => toast('JSON copied to the clipboard.');
    const fallback = () => { try { document.execCommand('copy') ? done() : toast('Press Ctrl+C to copy the selected text.', 'warn'); } catch (e) { toast('Press Ctrl+C to copy the selected text.', 'warn'); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, fallback); else fallback();
  },
  'paste-json': () => {
    openModal({ title: 'Paste JSON to import', wide: true, saveLabel: 'Check & import',
      html: `<p class="muted small">Paste the full text of a project JSON file here. It is validated first, and you will be asked to confirm before your current data is replaced.</p>
        <textarea name="jsonIn" class="json-box" rows="14" placeholder='{ "schemaVersion": 1, ... }'></textarea>`,
      onSave: f => {
        const text = f.elements.jsonIn.value.trim();
        if (!text) return { error: 'Paste the JSON text first.', field: 'jsonIn' };
        setTimeout(() => handleImportText(text, 'pasted JSON'), 0);
      } });
  },
  'restore-backup': ds => restoreBackup(+ds.i),
  'delete-backup': ds => { const l = readBackups(); l.splice(+ds.i, 1); try { localStorage.setItem(LS_BACKUPS, JSON.stringify(l)); } catch (e) { /* ignore */ } render(); },
  'reset-project': () => resetProject(),
  'download-template': () => { download('Backup-DR-Data_blank.json', JSON.stringify(blankProject(), null, 2)); },
  'print-roadmap': ds => doPrint('roadmap', ds.mode || ui.rmMode),
  'print-report': () => doPrint('report'),
  'download-report': () => { downloadReport(); toast('Status report downloaded.'); },
  'nav-toggle': () => { $('#sidebar').classList.toggle('open'); $('#scrim').classList.toggle('on'); }
};
const SUBMITS = {
  'save-settings': f => {
    const name = f.elements.pname.value.trim(), s = f.elements.pstart.value, e = f.elements.pend.value, err = $('#settingsErr');
    const bad = !name ? 'Project name is required.' : (!parseISO(s) || !parseISO(e)) ? 'Enter valid timeline start and end dates.' : dayNum(e) < dayNum(s) ? 'Timeline end must be after the start.' : '';
    if (bad) { err.textContent = bad; err.hidden = false; return; }
    Object.assign(data.project, { name, description: f.elements.pdesc.value.trim(), manager: f.elements.pmanager.value.trim(), startDate: s, endDate: e });
    afterChange(); toast('Project settings saved.');
  }
};
document.addEventListener('click', e => {
  const navA = e.target.closest('#nav a[data-nav]');
  if (navA) { e.preventDefault(); $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on'); go(navA.dataset.nav); return; }
  const el = e.target.closest('[data-action]');
  if (!el) {
    if (e.target.id === 'scrim') ACTIONS['nav-toggle']();
    return;
  }
  const fn = ACTIONS[el.dataset.action];
  if (fn) { e.preventDefault(); try { fn(el.dataset, el, e); } catch (err) { console.error(err); toast('Something went wrong: ' + (err && err.message ? err.message : err), 'error', 8000); } }
  if (el.dataset.nav !== undefined || el.closest('#sidebar')) { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on'); }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.bar[data-action],.ms-pt[data-action]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-submit]');
  if (f) { e.preventDefault(); SUBMITS[f.dataset.submit](f); }
});
function setFilter(el) {
  const path = el.dataset.f.split('.');
  const v = el.type === 'checkbox' ? el.checked : el.value;
  if (path.length === 1) ui[path[0]] = v; else ui[path[0]][path[1]] = v;
  if (['rmMode', 'rmColor', 'rmMilestones', 'rmForecast'].includes(path[0])) saveUiPrefs();
  render();
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset && el.dataset.f && el.type === 'search') setFilter(el);
  else if (el.matches && el.matches('[data-progress]')) { const t = el.parentElement.querySelector('.ptxt'); if (t) t.textContent = el.value + '%'; }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset && el.dataset.f && el.type !== 'search') setFilter(el);
  else if (el.matches && el.matches('[data-progress]')) {
    const n = D.node.get(el.dataset.id);
    if (n) { setLeafProgress(n.item, el.value); afterChange(); }
  } else if (el.id === 'fileInput' && el.files && el.files[0]) handleImportFile(el.files[0]);
});
window.addEventListener('hashchange', () => {
  const v = location.hash.slice(1);
  if (NAV.some(n => n.id === v) && v !== ui.view) { ui.view = v; render(); window.scrollTo(0, 0); }
});
window.addEventListener('pagehide', () => { if (saveTimer) saveLocal(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) saveLocal(); });
// allow dropping a JSON file anywhere on the window
window.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) { e.preventDefault(); handleImportFile(e.dataTransfer.files[0]); } });

/* ---------------- init ---------------- */
function init() {
  initTooltip();
  try { const u = JSON.parse(localStorage.getItem(LS_UI) || '{}'); ['rmMode', 'rmColor'].forEach(k => { if (typeof u[k] === 'string') ui[k] = u[k]; }); ['rmMilestones', 'rmForecast'].forEach(k => { if (typeof u[k] === 'boolean') ui[k] = u[k]; }); } catch (e) { /* ignore */ }
  const res = loadLocal();
  syncStored(); D = derive();
  const h = location.hash.slice(1); if (NAV.some(n => n.id === h)) ui.view = h;
  render();
  if (res.status === 'unavailable') { ui.saveState = 'error'; updateSaveChip(); toast('Browser storage is unavailable — export JSON regularly to keep your work.', 'warn', 6000); }
  if (res.status === 'corrupt') {
    try { localStorage.setItem('backupdr.corrupt.' + Date.now(), localStorage.getItem(LS_KEY)); } catch (e) { /* ignore */ }
    infoDialog({ title: 'Saved data could not be loaded', html: `<p>The data stored in this browser failed validation, so the application started with a blank project. The unreadable copy was kept aside.</p>${problemList(res.errors || [], 'err')}<p>You can import a JSON export or restore a browser backup from <b>Reports &amp; Data Management</b>.</p>` });
  }
  // automatic daily safety snapshot (only when there is something worth keeping)
  if (res.status === 'ok' && (data.objectives.length || data.risks.length)) {
    const last = readBackups()[0];
    if (!last || Date.now() - new Date(last.at).getTime() > 20 * 3600 * 1000) snapshot('Automatic daily backup');
  }
}
window.addEventListener('error', ev => { try { toast('Unexpected error: ' + ev.message, 'error', 8000); } catch (e) { /* ignore */ } });
window.BackupDR = { version: APP_VERSION, schema: SCHEMA_VERSION, getData: () => data, getDerived: () => D, parseProject, preparePrint, endPrint, roadmapRange, today: () => D.today };
document.addEventListener('DOMContentLoaded', init);
