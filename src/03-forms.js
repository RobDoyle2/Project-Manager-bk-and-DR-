/* =====================================================================
   Forms (modals): objective, task / subtask, risk, dependency, milestone,
   blocker, plus confirm-and-delete flows
   ===================================================================== */
function dateErr(s, e, fs, fe) {
  if (!parseISO(s) || !parseISO(e)) return 'A valid start date and end date are required.';
  if (dayNum(e) < dayNum(s)) return 'The end date cannot be before the start date.';
  if ((fs && !parseISO(fs)) || (fe && !parseISO(fe))) return 'Forecast dates must be valid dates.';
  if (dayNum(fe || e) < dayNum(fs || s)) return 'The forecast end cannot be before the forecast start.';
  return '';
}
function forecastFields(v) {
  return `<details class="full fc-details" ${v.forecastStart || v.forecastEnd ? 'open' : ''}><summary>Revised forecast dates <small class="hint inline">(optional — the baseline dates above never change automatically)</small></summary>
    <div class="fgrid">${fld('Forecast start', dateInp('forecastStart', v.forecastStart))}${fld('Forecast end', dateInp('forecastEnd', v.forecastEnd))}</div></details>`;
}
function blockerFields(v) {
  return `<div class="fld full blockbox"><label class="chk"><input type="checkbox" name="blocked" ${v.blocked ? 'checked' : ''}> <b>Blocked</b> — work cannot proceed</label>
    ${txt('blocker', v.blocker, 2, 'placeholder="What is blocking this? Who needs to act?"')}</div>`;
}

/* ---------------- Objective ---------------- */
function objectiveModal(id) {
  const o = id ? IDX.objective.get(id).item : null;
  const v = o || { name: '', description: '', owner: '', priority: 'Medium', startDate: todayISO(), endDate: todayISO(), forecastStart: '', forecastEnd: '', status: 'auto', blocked: false, blocker: '', notes: [] };
  const info = o ? D.obj.get(o.id) : null;
  const html = `<div class="fgrid">
    ${o ? `<div class="full calc-box">${idChip(o.id)} ${pill(info.status)} <span class="muted">Progress is calculated automatically from tasks:</span> <b>${pct(info.progress)}%</b> (${info.taskDone}/${info.taskCount} tasks complete)</div>` : ''}
    ${fld('Objective name *', inp('name', v.name, 'required maxlength="160" placeholder="e.g. Modernise backup platform"'), 'full')}
    ${fld('Description', txt('description', v.description, 3), 'full')}
    ${fld('Owner', inp('owner', v.owner, 'list="owners" placeholder="Name"') + ownerDatalist())}
    ${fld('Priority', sel('priority', PRIORITIES, v.priority))}
    ${fld('Start date *', dateInp('startDate', v.startDate, 'required'))}
    ${fld('Target completion *', dateInp('endDate', v.endDate, 'required'))}
    ${forecastFields(v)}
    ${fld('Status override', sel('status', [['auto', 'Automatic (calculated from tasks)'], ['at-risk', 'Flag as At risk'], ['on-hold', 'Put On hold']], v.status), 'full', 'Normally leave on Automatic. Blocked, delayed and completed are always derived.')}
    ${blockerFields(v)}
    ${depEditorHtml(o ? o.id : '')}
    ${linksEditorHtml(v.links)}
    ${notesBlock(v.notes)}
  </div>`;
  openModal({
    title: o ? `Edit objective · ${o.id}` : 'New objective', html, wide: true, saveLabel: o ? 'Save changes' : 'Create objective',
    onSave: f => {
      const name = val(f, 'name');
      if (!name) return { error: 'Please enter an objective name.', field: 'name' };
      const de = dateErr(val(f, 'startDate'), val(f, 'endDate'), val(f, 'forecastStart'), val(f, 'forecastEnd'));
      if (de) return { error: de, field: 'startDate' };
      const deps = collectDeps(f); if (deps.error) return { error: deps.error };
      const lks = collectLinks(f); if (lks.error) return { error: lks.error };
      const rec = o || { id: nextId('objective'), tasks: [], notes: [] };
      Object.assign(rec, { links: lks.list, name, description: val(f, 'description'), owner: val(f, 'owner'), priority: val(f, 'priority'), startDate: val(f, 'startDate'), endDate: val(f, 'endDate'), forecastStart: val(f, 'forecastStart'), forecastEnd: val(f, 'forecastEnd'), status: val(f, 'status'), blocked: val(f, 'blocked'), blocker: val(f, 'blocker') });
      pushNote(rec, val(f, 'newNote'));
      if (!o) data.objectives.push(rec);
      applyDeps(rec.id, deps.list);
      afterChange(); toast(o ? 'Objective updated' : 'Objective created');
    }
  });
}
async function deleteObjectiveFlow(id) {
  const r = IDX.objective.get(id); if (!r) return;
  const o = r.item, nT = o.tasks.length, nS = o.tasks.reduce((a, t) => a + t.subtasks.length, 0);
  const ok = await confirmDialog({
    title: 'Delete objective?', danger: true, okLabel: 'Delete objective',
    message: `This permanently deletes <b>${esc(o.name)}</b>${nT ? ` together with its <b>${nT}</b> task${nT === 1 ? '' : 's'}${nS ? ` and <b>${nS}</b> subtask${nS === 1 ? '' : 's'}` : ''}` : ''}, and removes any dependencies that reference them. This cannot be undone (export or back up first if unsure).`
  });
  if (!ok) return;
  deleteObjective(id); afterChange(); toast('Objective deleted');
}

/* ---------------- Task / Subtask ---------------- */
function workItemModal(kind, id, ctx = {}) {
  const isTask = kind === 'task';
  const rec = id ? (isTask ? IDX.task.get(id) : IDX.sub.get(id)) : null;
  const item = rec ? rec.item : null;
  let parentId;
  if (rec) parentId = isTask ? (rec.obj.system ? '' : rec.obj.id) : rec.task.id;
  else if (isTask) parentId = ctx.parentId !== undefined ? ctx.parentId : (realObjs().length === 1 ? realObjs()[0].id : '');
  else parentId = ctx.parentId || '';
  if (!isTask && !parentId) { toast('Create a task first.', 'warn'); return; }
  const parent = isTask ? (parentId ? IDX.objective.get(parentId).item : { startDate: data.project.startDate, endDate: data.project.endDate, owner: '', priority: 'Medium' }) : IDX.task.get(parentId).item;
  const hasSubs = isTask && item && item.subtasks.length > 0;
  const v = item || { name: '', description: '', owner: parent.owner || '', priority: parent.priority || 'Medium', startDate: todayISO(), endDate: todayISO(), forecastStart: '', forecastEnd: '', status: 'not-started', progress: 0, blocked: false, blocker: '', notes: [] };
  const info = item ? D.node.get(item.id) : null;
  let parentSel;
  if (isTask) parentSel = sel('parent', [['', '— No objective yet (unassigned) —']].concat(realObjs().map(o => [o.id, `${o.id} · ${o.name}`])), parentId);
  else parentSel = `<select name="parent">${data.objectives.filter(o => o.tasks.length).map(o => `<optgroup label="${esc(o.name)}">${o.tasks.map(t => `<option value="${esc(t.id)}" ${t.id === parentId ? 'selected' : ''}>${esc(t.id + ' · ' + t.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const statusOpts = hasSubs
    ? [['auto', 'Automatic (from subtasks)'], ['at-risk', 'Flag as At risk'], ['on-hold', 'Put On hold']]
    : LEAF_STATUSES.map(s => [s, STATUS_LABEL[s]]);
  const stVal = hasSubs ? (FLAG_STATUSES.includes(v.status) ? v.status : 'auto') : v.status;
  const progressBlock = hasSubs
    ? `<div class="fld"><span class="fl">Progress</span><div class="auto-prog">${pbar(info.progress, info.status)}<b>${pct(info.progress)}%</b><small class="hint">Automatic — average of ${info.subCount} subtask${info.subCount === 1 ? '' : 's'}</small></div></div>`
    : `<div class="fld"><span class="fl">Progress (%)</span><div class="prog-ed"><input type="number" name="progress" min="0" max="100" step="1" value="${v.progress}">
        <span class="quick">${[0, 25, 50, 75, 100].map(n => `<button type="button" class="chip-btn" data-action="set-prog" data-v="${n}">${n}%</button>`).join('')}</span></div></div>`;
  const html = `<div class="fgrid">
    ${item ? `<div class="full calc-box">${idChip(item.id)} ${pill(info.status)} <b>${pct(info.progress)}%</b> <span class="muted">${isTask ? 'Part of ' + esc(rec.obj.name) : 'Subtask of ' + esc(rec.task.name)}</span></div>` : ''}
    ${fld(isTask ? 'Objective' : 'Parent task *', parentSel, 'full', isTask ? 'Optional — you can leave a task unassigned and link it to an objective later.' : '')}
    ${fld(`${isTask ? 'Task' : 'Subtask'} name *`, inp('name', v.name, 'required maxlength="160"'), 'full')}
    ${fld('Description', txt('description', v.description, 2), 'full')}
    ${fld('Owner', inp('owner', v.owner, 'list="owners" placeholder="Name"') + ownerDatalist())}
    ${fld('Priority', sel('priority', PRIORITIES, v.priority))}
    ${fld('Start date *', dateInp('startDate', v.startDate, 'required'))}
    ${fld('End date *', dateInp('endDate', v.endDate, 'required'))}
    ${forecastFields(v)}
    ${fld('Status', sel('status', statusOpts, stVal))}
    ${progressBlock}
    ${blockerFields(v)}
    ${depEditorHtml(item ? item.id : '')}
    ${isTask ? fld('Quick-add subtasks', txt('quickSubs', '', 3, 'placeholder="One subtask per line…"'), 'full', 'Each line becomes a subtask with this task\'s owner and dates. Tasks with subtasks calculate progress automatically.') : ''}
    ${linksEditorHtml(v.links)}
    ${notesBlock(v.notes)}
    <div class="full warn-note" id="dateWarn" hidden></div>
  </div>`;
  openModal({
    title: item ? `Edit ${isTask ? 'task' : 'subtask'} · ${item.id}` : `New ${isTask ? 'task' : 'subtask'}`, html, wide: true, saveLabel: item ? 'Save changes' : `Create ${isTask ? 'task' : 'subtask'}`,
    onOpen: f => {
      const checkWarn = () => {
        const pid = f.elements.parent.value; if (!pid) { const el0 = $('#dateWarn', f); el0.hidden = true; return; }
        const par = isTask ? IDX.objective.get(pid) : IDX.task.get(pid);
        const w = par ? dateWarning(val(f, 'startDate'), val(f, 'endDate'), par.item.startDate, par.item.endDate, isTask ? 'objective' : 'parent task') : '';
        const el = $('#dateWarn', f); el.textContent = w; el.hidden = !w;
      };
      f.addEventListener('input', e => { if (['startDate', 'endDate', 'parent'].includes(e.target.name)) checkWarn(); });
      // keep status and progress consistent while editing
      const st = f.elements.status, pr = f.elements.progress;
      if (pr && st) {
        st.addEventListener('change', () => { if (st.value === 'completed') pr.value = 100; else if (Number(pr.value) >= 100) pr.value = 90; });
        pr.addEventListener('input', () => { const n = Number(pr.value); if (n >= 100) st.value = 'completed'; else if (st.value === 'completed') st.value = n > 0 ? 'in-progress' : 'not-started'; else if (n > 0 && st.value === 'not-started') st.value = 'in-progress'; });
      }
      checkWarn();
    },
    onSave: f => {
      const name = val(f, 'name');
      if (!name) return { error: `Please enter a ${isTask ? 'task' : 'subtask'} name.`, field: 'name' };
      const de = dateErr(val(f, 'startDate'), val(f, 'endDate'), val(f, 'forecastStart'), val(f, 'forecastEnd'));
      if (de) return { error: de, field: 'startDate' };
      const newParent = val(f, 'parent'); if (!isTask && !newParent) return { error: 'Please choose a parent task.', field: 'parent' };
      const deps = collectDeps(f); if (deps.error) return { error: deps.error };
      const lks = collectLinks(f); if (lks.error) return { error: lks.error };
      const quick = isTask ? val(f, 'quickSubs').split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];
      const rec2 = item || (isTask ? { id: nextId('task'), subtasks: [], notes: [] } : { id: nextId('subtask'), notes: [] });
      const common = { links: lks.list, name, description: val(f, 'description'), owner: val(f, 'owner'), priority: val(f, 'priority'), startDate: val(f, 'startDate'), endDate: val(f, 'endDate'), forecastStart: val(f, 'forecastStart'), forecastEnd: val(f, 'forecastEnd'), blocked: val(f, 'blocked'), blocker: val(f, 'blocker') };
      Object.assign(rec2, common);
      const willHaveSubs = isTask && (rec2.subtasks.length + quick.length) > 0;
      const stSel = val(f, 'status');
      if (willHaveSubs) { rec2.status = FLAG_STATUSES.includes(stSel) ? stSel : 'auto'; }
      else {
        rec2.status = stSel === 'auto' ? 'not-started' : stSel;
        const pv = f.elements.progress ? Number(f.elements.progress.value) : rec2.progress;
        rec2.progress = isFinite(pv) ? Math.max(0, Math.min(100, Math.round(pv))) : 0;
        if (rec2.status === 'completed') rec2.progress = 100;
      }
      pushNote(rec2, val(f, 'newNote'));
      // attach to (possibly new) parent
      if (isTask) {
        const target = newParent ? IDX.objective.get(newParent).item : ensureUnassigned();
        if (item && rec.obj.id !== target.id) { rec.obj.tasks = rec.obj.tasks.filter(x => x.id !== item.id); }
        if (!item || rec.obj.id !== target.id) target.tasks.push(rec2);
        quick.forEach(line => target.tasks.find(t => t.id === rec2.id).subtasks.push({
          id: nextId('subtask'), name: line, description: '', owner: rec2.owner, priority: rec2.priority, startDate: rec2.startDate, endDate: rec2.endDate,
          forecastStart: '', forecastEnd: '', status: 'not-started', progress: 0, blocked: false, blocker: '', notes: []
        }));
      } else {
        const target = IDX.task.get(newParent).item;
        if (item && rec.task.id !== newParent) { rec.task.subtasks = rec.task.subtasks.filter(x => x.id !== item.id); }
        if (!item || rec.task.id !== newParent) target.subtasks.push(rec2);
      }
      applyDeps(rec2.id, deps.list);
      afterChange(); toast(item ? 'Changes saved' : `${isTask ? 'Task' : 'Subtask'} created`);
      if (isTask && quick.length) ui.collapsed.delete(rec2.id);
    }
  });
}
async function deleteTaskFlow(id) {
  const r = IDX.task.get(id); if (!r) return;
  const n = r.item.subtasks.length;
  const ok = await confirmDialog({ title: 'Delete task?', danger: true, okLabel: 'Delete task', message: `Delete <b>${esc(r.item.name)}</b>${n ? ` and its <b>${n}</b> subtask${n === 1 ? '' : 's'}` : ''}? Related dependencies will be removed. This cannot be undone.` });
  if (!ok) return;
  deleteTask(id); afterChange(); toast('Task deleted');
}
async function deleteSubFlow(id) {
  const r = IDX.sub.get(id); if (!r) return;
  const ok = await confirmDialog({ title: 'Delete subtask?', danger: true, okLabel: 'Delete subtask', message: `Delete subtask <b>${esc(r.item.name)}</b>? The progress of <b>${esc(r.task.name)}</b> will be recalculated.` });
  if (!ok) return;
  deleteSub(id); afterChange(); toast('Subtask deleted');
}
function openItem(id) {
  const n = D.node.get(id); if (!n) return;
  if (n.kind === 'obj') objectiveModal(id); else if (n.kind === 'task') workItemModal('task', id); else workItemModal('sub', id);
}

/* ---------------- Blocker flag ---------------- */
function blockerModal() {
  const opts = [];
  data.objectives.forEach(o => o.tasks.forEach(t => {
    if (!D.node.get(t.id).done) opts.push([t.id, `${t.id} · ${t.name}`, `Tasks — ${o.name}`]);
    t.subtasks.forEach(s => { if (!D.node.get(s.id).done) opts.push([s.id, `${s.id} · ${s.name}`, `Subtasks — ${t.name}`]); });
  }));
  if (!opts.length) { toast('There are no open tasks to flag.', 'warn'); return; }
  openModal({
    title: 'Flag a blocker', saveLabel: 'Flag as blocked',
    html: `<div class="fgrid">${fld('Task or subtask *', groupedSelect('target', opts, '', 'Select…'), 'full')}${fld('What is blocking it? *', txt('blocker', '', 3, 'placeholder="Describe the blocker and who needs to act"'), 'full')}</div>`,
    onSave: f => {
      const id = val(f, 'target'), text = val(f, 'blocker');
      if (!id) return { error: 'Choose the blocked task or subtask.' };
      if (!text) return { error: 'Please describe the blocker.' };
      const it = D.node.get(id).item; it.blocked = true; it.blocker = text;
      afterChange(); toast('Blocker recorded', 'warn');
    }
  });
}
function resolveBlocker(id) {
  const n = D.node.get(id); if (!n) return;
  n.item.blocked = false; pushNote(n.item, 'Blocker resolved: ' + (n.item.blocker || '(no description)'));
  n.item.blocker = '';
  afterChange(); toast('Blocker resolved');
}

/* ---------------- Risk ---------------- */
const riskScore = r => r.impact * r.likelihood;
const riskBand = s => s >= 15 ? 'critical' : s >= 10 ? 'high' : s >= 5 ? 'medium' : 'low';
function relatedOptions() {
  const out = [];
  realObjs().forEach(o => { out.push([o.id, `${o.id} · ${o.name}`, 'Objectives']); });
  data.objectives.forEach(o => o.tasks.forEach(t => { out.push([t.id, `${t.id} · ${t.name}`, `Tasks — ${o.name}`]); }));
  data.objectives.forEach(o => o.tasks.forEach(t => t.subtasks.forEach(s => out.push([s.id, `${s.id} · ${s.name}`, `Subtasks — ${t.name}`]))));
  return out;
}
function riskModal(id) {
  const r = id ? data.risks.find(x => x.id === id) : null;
  const v = r || { description: '', impact: 3, likelihood: 3, owner: '', mitigation: '', status: 'open', relatedId: '' };
  const html = `<div class="fgrid">
    ${fld('Risk description *', txt('description', v.description, 3, 'required'), 'full')}
    ${fld('Impact', sel('impact', IMPACT.map((l, i) => [i + 1, `${i + 1} · ${l}`]), v.impact))}
    ${fld('Likelihood', sel('likelihood', LIKELIHOOD.map((l, i) => [i + 1, `${i + 1} · ${l}`]), v.likelihood))}
    <div class="full calc-box" id="riskCalc"></div>
    ${fld('Risk owner', inp('owner', v.owner, 'list="owners"') + ownerDatalist())}
    ${fld('Status', sel('status', RISK_STATUS.map(s => [s, cap(s)]), v.status))}
    ${fld('Mitigation', txt('mitigation', v.mitigation, 3), 'full')}
    ${fld('Related objective / task', groupedSelect('relatedId', relatedOptions(), v.relatedId, '— None / programme-wide —'), 'full')}
  </div>`;
  openModal({
    title: r ? `Edit risk · ${r.id}` : 'New risk', html, wide: true, saveLabel: r ? 'Save changes' : 'Add risk',
    onOpen: f => {
      const upd = () => { const s = f.elements.impact.value * f.elements.likelihood.value; $('#riskCalc', f).innerHTML = `Rating: <b>${s}</b> ${`<span class="band band-${riskBand(s)}">${cap(riskBand(s))}</span>`} <span class="muted">(impact × likelihood)</span>`; };
      f.addEventListener('change', upd); upd();
    },
    onSave: f => {
      const description = val(f, 'description');
      if (!description) return { error: 'Please describe the risk.' };
      const rec = r || { id: nextId('risk') };
      Object.assign(rec, { description, impact: +val(f, 'impact'), likelihood: +val(f, 'likelihood'), owner: val(f, 'owner'), mitigation: val(f, 'mitigation'), status: val(f, 'status'), relatedId: val(f, 'relatedId') });
      if (!r) data.risks.push(rec);
      afterChange(); toast(r ? 'Risk updated' : 'Risk added');
    }
  });
}
async function deleteRiskFlow(id) {
  const ok = await confirmDialog({ title: 'Delete risk?', danger: true, okLabel: 'Delete risk', message: `Delete risk <b>${esc(id)}</b>? This cannot be undone.` });
  if (!ok) return;
  data.risks = data.risks.filter(x => x.id !== id); afterChange(); toast('Risk deleted');
}

/* ---------------- Dependency (register) ---------------- */
function depModal(id) {
  const d = id ? data.dependencies.find(x => x.id === id) : null;
  const v = d || { type: 'task', fromId: '', toId: '', assetName: '', note: '', status: 'open' };
  const html = `<div class="fgrid" data-self="">
    ${fld('This item… (dependent) *', groupedSelect('fromId', itemOptions('', ['objective', 'task']), v.fromId, 'Select objective / task / subtask…'), 'full')}
    ${fld('…depends on (type)', sel('dType', Object.entries(DEP_TYPES), v.type))}
    ${fld('Status', sel('dStatus', DEP_STATUS.map(s => [s, cap(s)]), v.status))}
    <label class="fld full"><span class="fl">Depends on *</span><span class="dep-target">${depTargetControl(v.type, v, v.fromId)}</span></label>
    ${fld('Note', txt('dNote', v.note, 2), 'full')}
    ${assetDatalist()}
  </div>`;
  openModal({
    title: d ? `Edit dependency · ${d.id}` : 'New dependency', html, saveLabel: d ? 'Save changes' : 'Add dependency',
    onSave: f => {
      const fromId = val(f, 'fromId'), type = val(f, 'dType'), to = val(f, 'dTo');
      if (!fromId) return { error: 'Choose the dependent objective, task or subtask.' };
      if (!to) return { error: 'Choose or enter what it depends on.' };
      if (to === fromId) return { error: 'An item cannot depend on itself.' };
      const rec = d || { id: nextId('dependency') };
      Object.assign(rec, { type, fromId, toId: (type === 'task' || type === 'objective') ? to : '', assetName: (type === 'task' || type === 'objective') ? '' : to, note: val(f, 'dNote'), status: val(f, 'dStatus') });
      if (!d) data.dependencies.push(rec);
      afterChange(); toast(d ? 'Dependency updated' : 'Dependency added');
    }
  });
}
async function deleteDepFlow(id) {
  const ok = await confirmDialog({ title: 'Delete dependency?', danger: true, okLabel: 'Delete', message: `Delete dependency <b>${esc(id)}</b>?` });
  if (!ok) return;
  data.dependencies = data.dependencies.filter(x => x.id !== id); afterChange(); toast('Dependency deleted');
}

/* ---------------- Milestone ---------------- */
function milestoneModal(id) {
  const m = id ? data.milestones.find(x => x.id === id) : null;
  const v = m || { name: '', description: '', date: '', objectiveId: '', status: 'planned' };
  const html = `<div class="fgrid">
    ${fld('Milestone name *', inp('name', v.name, 'required maxlength="120"'), 'full')}
    ${fld('Description', txt('description', v.description, 2), 'full')}
    ${fld('Target date *', dateInp('date', v.date, 'required'))}
    ${fld('Status', sel('status', MS_STATUS.map(s => [s, cap(s)]), v.status))}
    ${fld('Related objective', sel('objectiveId', [['', '— Programme-level —']].concat(realObjs().map(o => [o.id, `${o.id} · ${o.name}`])), v.objectiveId), 'full')}
  </div>`;
  openModal({
    title: m ? `Edit milestone · ${m.id}` : 'New milestone', html, saveLabel: m ? 'Save changes' : 'Add milestone',
    onSave: f => {
      const name = val(f, 'name'); if (!name) return { error: 'Please enter a milestone name.' };
      if (!parseISO(val(f, 'date'))) return { error: 'Please choose a valid target date.' };
      const rec = m || { id: nextId('milestone') };
      Object.assign(rec, { name, description: val(f, 'description'), date: val(f, 'date'), objectiveId: val(f, 'objectiveId'), status: val(f, 'status') });
      if (!m) data.milestones.push(rec);
      afterChange(); toast(m ? 'Milestone updated' : 'Milestone added');
    }
  });
}
async function deleteMilestoneFlow(id) {
  const m = data.milestones.find(x => x.id === id);
  const ok = await confirmDialog({ title: 'Delete milestone?', danger: true, okLabel: 'Delete', message: `Delete milestone <b>${esc(m ? m.name : id)}</b>?` });
  if (!ok) return;
  data.milestones = data.milestones.filter(x => x.id !== id); afterChange(); toast('Milestone deleted');
}
function msEffective(m) {
  if (m.status === 'achieved') return 'achieved';
  const late = dayNum(m.date) < D.T;
  if (late) return 'missed';
  return m.status;
}
const MS_LABEL = { planned: 'Planned', 'at-risk': 'At risk', achieved: 'Achieved', missed: 'Overdue' };
const MS_STATUS_CLASS = { planned: 'in-progress', 'at-risk': 'at-risk', achieved: 'completed', missed: 'blocked' };
