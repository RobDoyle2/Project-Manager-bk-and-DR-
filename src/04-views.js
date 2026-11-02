/* =====================================================================
   Views: dashboard, objectives, tasks, risks, dependencies, milestones,
   reports & data
   ===================================================================== */
const pageHead = (title, sub, actions = '') => `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="head-actions">${actions}</div></div>`;
const btn = (label, action, extra = '', cls = '', ic = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${ic ? icon(ic, 16) : ''}${label}</button>`;

/* ---------------- Dashboard ---------------- */
function ringSvg(p) {
  const r = 54, c = 2 * Math.PI * r, off = c * (1 - pct(p) / 100);
  return `<svg viewBox="0 0 140 140" class="ring" role="img" aria-label="Overall progress ${pct(p)} percent"><circle cx="70" cy="70" r="${r}" class="ring-bg"/><circle cx="70" cy="70" r="${r}" class="ring-fg" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 70 70)"/><text x="70" y="75" text-anchor="middle" class="ring-t">${pct(p)}%</text><text x="70" y="96" text-anchor="middle" class="ring-s">overall</text></svg>`;
}
function relDays(iso) {
  const n = dayNum(iso) - D.T;
  if (n === 0) return 'today';
  return n > 0 ? `in ${n} day${n === 1 ? '' : 's'}` : `${-n} day${n === -1 ? '' : 's'} overdue`;
}
function viewDashboard() {
  const t = D.totals, p = data.project, empty = !realObjs().length && !t.tasks;
  const kpi = (n, label, sub, cls, go = 'tasks') => `<button class="kpi ${cls}" data-action="goto" data-view="${go}"><span class="kpi-n">${n}</span><span class="kpi-l">${label}</span><span class="kpi-s">${sub}</span></button>`;
  const upcoming = data.milestones.filter(m => m.status !== 'achieved').sort((a, b) => dayNum(a.date) - dayNum(b.date)).slice(0, 5);
  const topRisks = data.risks.filter(r => r.status !== 'closed').sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 4);
  const blocked = D.blockedItems.slice(0, 5);
  const overdue = D.overdueItems.filter(x => x.kind !== 'obj').slice(0, 4);
  const stTotal = t.objectives || 1;
  const segs = STATUS_ORDER.filter(k => t.byObjStatus[k] > 0).map(k => `<i class="sg st-${k}" style="flex:${t.byObjStatus[k]}" data-tip="${STATUS_LABEL[k]}: ${t.byObjStatus[k]}"></i>`).join('');
  let h = pageHead('Dashboard', `${esc(p.name)} · ${esc(rangeText(p.startDate, p.endDate))}${p.manager ? ' · Programme manager: ' + esc(p.manager) : ''}`,
    btn('New objective', 'obj-new', '', 'primary', 'plus') + btn('New task', 'task-new', '', '', 'plus') + btn('Add several tasks', 'tasks-bulk', '', '', 'plus'));
  if (empty) {
    h += `<div class="card onboard"><div class="onb-ic">${icon('shield', 34)}</div><div><h2>Welcome — your programme is empty</h2>
      <p>Start by defining what the programme must achieve. Everything else — progress, status, dashboard and roadmap — is calculated from your objectives and tasks.</p>
      <ol class="onb-steps"><li><b>Add an objective</b> with an owner and start / target dates.</li><li><b>Break it into tasks</b> and subtasks; update their % complete as work progresses.</li><li><b>Open the Roadmap</b> — it builds itself from your data (Management and Technical views).</li></ol>
      <div class="onb-actions">${btn('Create first objective', 'obj-new', '', 'primary', 'plus')}${btn('Add tasks without an objective', 'tasks-bulk', '', '', 'plus')}${btn('Import a JSON file', 'import-json', '', '', 'upload')}</div></div></div>`;
  }
  h += `<div class="dash-top"><div class="card overall"><h3>Overall progress</h3>${ringSvg(t.overall)}<p class="muted small center">Average of ${t.objectives} objective${t.objectives === 1 ? '' : 's'}, each the average of its tasks</p></div>
    <div class="kpis">
      ${kpi(t.objectives, 'Objectives', 'in programme', 'k-brand', 'objectives')}
      ${kpi(t.tasks, 'Tasks', `${t.subtasks} subtask${t.subtasks === 1 ? '' : 's'}`, 'k-brand')}
      ${kpi(t.tasksDone, 'Completed', 'tasks', 'k-done')}
      ${kpi(t.tasksStarted, 'In progress', 'tasks started', 'k-prog')}
      ${kpi(t.tasksBlocked, 'Blocked', 'tasks', 'k-block', 'risks')}
      ${kpi(t.tasksOverdue, 'Overdue', 'tasks past end date', 'k-late')}
    </div></div>`;
  h += `<div class="grid-2">
    <div class="card"><div class="card-h"><h3>Objectives by status</h3></div>
      ${t.objectives ? `<div class="stack">${segs}</div>` : '<p class="muted">No objectives yet.</p>'}
      <div class="legend">${STATUS_ORDER.map(k => `<span class="lg ${t.byObjStatus[k] ? '' : 'dim'}"><i class="dot st-${k}"></i>${STATUS_LABEL[k]} <b>${t.byObjStatus[k]}</b></span>`).join('')}</div>
      ${realObjs().length ? `<div class="obj-mini">${realObjs().slice(0, 6).map(o => { const i = D.obj.get(o.id), c = objCol(o); return `<div class="om"><span class="om-n" title="${esc(o.name)} — ${esc(STATUS_LABEL[i.status])}"><i class="sw" style="background:${c.c}"></i> ${esc(o.name)}</span>${pbarC(i.progress, c.c)}<b>${pct(i.progress)}%</b></div>`; }).join('')}${realObjs().length > 6 ? `<p class="muted small">+ ${realObjs().length - 6} more</p>` : ''}</div>` : ''}
    </div>
    <div class="card"><div class="card-h"><h3>Upcoming milestones</h3>${btn('All', 'goto', 'data-view="milestones"', 'small ghost')}</div>
      ${upcoming.length ? `<ul class="list">${upcoming.map(m => { const e = msEffective(m); return `<li><span class="ms-dot ms-${e}" style="--mc:${msColour(m)}"></span><div class="li-main"><b>${esc(m.name)}</b><small>${esc(fmtDate(m.date))}${m.objectiveId ? ' · ' + esc(nameOf(m.objectiveId)) : ''}</small></div><span class="rel ${e === 'missed' ? 'bad' : ''}">${relDays(m.date)}</span></li>`; }).join('')}</ul>` : '<p class="muted">No upcoming milestones. Add delivery milestones to show them on the roadmap.</p>'}
    </div>
    <div class="card span2"><div class="card-h"><h3>Key risks &amp; blockers</h3>${btn('Open', 'goto', 'data-view="risks"', 'small ghost')}</div>
      <div class="cols-3">
        <div><h4 class="sec-t t-red">${icon('ban', 15)} Blocked (${D.blockedItems.length})</h4>${blocked.length ? `<ul class="list">${blocked.map(b => `<li><div class="li-main"><b>${esc(b.name)}</b><small>${esc(b.blocker || 'No description')} ${b.owner ? '· ' + esc(b.owner) : ''}</small></div></li>`).join('')}</ul>` : '<p class="muted small">Nothing is blocked.</p>'}</div>
        <div><h4 class="sec-t t-amber">${icon('clock', 15)} Overdue (${D.overdueItems.length})</h4>${overdue.length ? `<ul class="list">${overdue.map(b => `<li><div class="li-main"><b>${esc(b.item.name)}</b><small>Due ${esc(fmtDate(b.item.forecastEnd || b.item.endDate))}${b.item.owner ? ' · ' + esc(b.item.owner) : ''}</small></div></li>`).join('')}</ul>` : '<p class="muted small">Nothing is overdue.</p>'}</div>
        <div><h4 class="sec-t t-brand">${icon('risk', 15)} Top open risks</h4>${topRisks.length ? `<ul class="list">${topRisks.map(r => `<li><span class="band band-${riskBand(riskScore(r))}">${riskScore(r)}</span><div class="li-main"><b>${esc(r.description.length > 80 ? r.description.slice(0, 78) + '…' : r.description)}</b><small>${esc(r.owner || 'No owner')}</small></div></li>`).join('')}</ul>` : '<p class="muted small">No open risks recorded.</p>'}</div>
      </div></div>
    <div class="card span2"><div class="card-h"><h3>Roadmap preview</h3>${btn('Open roadmap', 'goto', 'data-view="roadmap"', 'small', 'roadmap')}</div>${mgmtRoadmapHtml({ compact: true })}</div>
  </div>`;
  return h;
}

/* ---------------- Objectives ---------------- */
function objCard(o) {
  const i = D.obj.get(o.id), open = ui.objOpen.has(o.id);
  const tasks = o.tasks.map(t => { const ti = D.task.get(t.id); return `<button class="mini-task" data-action="task-edit" data-id="${esc(t.id)}"><span class="mt-n">${esc(t.name)}</span>${pill(ti.status)}<span class="mt-p">${pct(ti.progress)}%</span></button>`; }).join('');
  const oc = objCol(o);
  return `<article class="obj-card st-${i.status}" style="border-top-color:${oc.c}">
    <div class="obj-top"><div class="obj-ids">${idChip(o.id)}${prioChip(o.priority)}</div>${pill(i.status)}</div>
    <h3 class="obj-title">${esc(o.name)}</h3>
    ${o.description ? `<p class="obj-desc">${esc(o.description)}</p>` : ''}
    <div class="obj-meta">${avatar(o.owner)}<span class="dates">${icon('clock', 14)} ${esc(rangeText(o.startDate, o.endDate))}</span></div>
    ${forecastText(o) ? `<div class="obj-meta">${forecastText(o)}</div>` : ''}
    <div class="obj-prog">${pbarC(i.progress, oc.c)}<b>${pct(i.progress)}%</b></div>
    <div class="obj-stats"><span>${i.taskDone}/${i.taskCount} tasks complete</span>${i.subCount ? `<span>${i.subCount} subtasks</span>` : ''}${i.taskBlocked ? `<span class="t-red">${i.taskBlocked} blocked</span>` : ''}${!i.taskCount ? '<span class="muted">No tasks yet — progress 0%</span>' : ''}</div>
    ${(o.links || []).length ? `<div class="obj-links">${linkChips(o)}</div>` : ''}
    ${o.blocked ? `<div class="callout red">${icon('ban', 15)} ${esc(o.blocker || 'Blocked')}</div>` : ''}
    <div class="obj-actions">
      ${btn(open ? 'Hide tasks' : `View tasks (${o.tasks.length})`, 'obj-toggle', `data-id="${esc(o.id)}"`, 'small ghost')}
      ${btn('Task', 'task-new', `data-obj="${esc(o.id)}"`, 'small ghost', 'plus')}
      <span class="sp"></span>
      <button class="icon-btn" data-action="obj-edit" data-id="${esc(o.id)}" aria-label="Edit objective" data-tip="Edit">${icon('edit', 17)}</button>
      <button class="icon-btn danger" data-action="obj-del" data-id="${esc(o.id)}" aria-label="Delete objective" data-tip="Delete">${icon('trash', 17)}</button>
    </div>
    ${open ? `<div class="obj-tasks">${tasks || '<p class="muted small">No tasks yet.</p>'}</div>` : ''}
  </article>`;
}
function viewObjectives() {
  const f = ui.objFilter, q = f.q.toLowerCase();
  const list = realObjs().filter(o => {
    const i = D.obj.get(o.id);
    if (f.status !== 'all' && i.status !== f.status) return false;
    return !q || (o.name + ' ' + o.description + ' ' + o.owner + ' ' + o.id).toLowerCase().includes(q);
  });
  let h = pageHead('Objectives', 'What the programme must achieve. Progress and status are calculated automatically from the tasks beneath each objective.', btn('New objective', 'obj-new', '', 'primary', 'plus'));
  if (!realObjs().length) return h + emptyState('No objectives yet', 'Create your first objective, then break it down into tasks and subtasks.', btn('Create objective', 'obj-new', '', 'primary', 'plus'));
  h += `<div class="toolbar"><input type="search" id="objQ" class="search" placeholder="Search objectives…" value="${esc(f.q)}" data-f="objFilter.q" aria-label="Search objectives">
    <select data-f="objFilter.status" aria-label="Filter by status"><option value="all">All statuses</option>${STATUS_ORDER.map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
    <span class="muted small">${list.length} of ${realObjs().length}</span></div>`;
  h += list.length ? `<div class="obj-grid">${list.map(objCard).join('')}</div>` : '<p class="muted">No objectives match the filters.</p>';
  return h;
}

/* ---------------- Tasks & subtasks ---------------- */
function ownerCell(n) { return avatar(n); }
function taskRowHtml(kind, item, parentLabel) {
  const info = D.node.get(item.id), isSub = kind === 'sub';
  const hasSubs = !isSub && item.subtasks.length > 0, collapsed = ui.collapsed.has(item.id);
  const deps = D.depsFrom.get(item.id) || [];
  const chips = [];
  if (info.blocked || info.ownBlocked) chips.push(`<span class="chip red" data-tip="${esc(item.blocker || 'Blocked')}">${icon('ban', 12)} Blocked</span>`);
  if (info.overdue) chips.push('<span class="chip amber">Overdue</span>');
  if (deps.length) chips.push(`<span class="chip" data-tip="${esc(deps.map(d => '• ' + depTargetName(d)).join('\n'))}">${icon('link', 12)} ${deps.length}</span>`);
  if (info.ownBlocked && item.blocker) chips.push(`<span class="blocker-txt">${esc(item.blocker)}</span>`);
  const prog = info.leaf
    ? `<div class="prog-ctl"><input type="range" min="0" max="100" step="5" value="${pct(info.progress)}" data-progress data-id="${esc(item.id)}" aria-label="Progress for ${esc(item.name)}" class="st-${info.status}"><span class="ptxt">${pct(info.progress)}%</span></div>`
    : `<div class="prog-auto">${pbar(info.progress, info.status)}<span class="ptxt">${pct(info.progress)}%</span><small class="auto">auto</small></div>`;
  const tc = objCol((isSub ? IDX.sub : IDX.task).get(item.id).obj);
  return `<div class="t-row ${isSub ? 'lvl-2' : 'lvl-1'} ${info.blocked ? 'is-blocked' : ''}" style="--ol:${tc.l}">
    <div class="t-name" data-label="">${hasSubs ? `<button class="chev ${collapsed ? '' : 'open'}" data-action="toggle" data-id="${esc(item.id)}" aria-label="${collapsed ? 'Expand' : 'Collapse'} subtasks">${icon('chevron', 15)}</button>` : '<span class="chev-sp"></span>'}
      <div class="t-name-txt"><button class="link-btn" data-action="${isSub ? 'sub-edit' : 'task-edit'}" data-id="${esc(item.id)}">${esc(item.name)}</button>
      <div class="sub">${idChip(item.id)}${hasSubs ? `<span class="muted small">${info.subDone}/${info.subCount} subtasks</span>` : ''}${chips.join('')}${linkChips(item)}</div></div></div>
    <div class="t-owner" data-label="Owner">${ownerCell(item.owner)}</div>
    <div class="t-dates" data-label="Dates"><span>${esc(rangeText(item.startDate, item.endDate))}</span>${forecastText(item) ? `<br>${forecastText(item)}` : ''}</div>
    <div class="t-prio" data-label="Priority">${prioChip(item.priority)}</div>
    <div class="t-stat" data-label="Status">${pill(info.status)}</div>
    <div class="t-prog" data-label="Progress">${prog}</div>
    <div class="t-act">${isSub ? '' : `<button class="icon-btn" data-action="sub-new" data-task="${esc(item.id)}" data-tip="Add subtask" aria-label="Add subtask">${icon('plus', 16)}</button>`}
      <button class="icon-btn" data-action="${isSub ? 'sub-edit' : 'task-edit'}" data-id="${esc(item.id)}" data-tip="Edit" aria-label="Edit">${icon('edit', 16)}</button>
      <button class="icon-btn danger" data-action="${isSub ? 'sub-del' : 'task-del'}" data-id="${esc(item.id)}" data-tip="Delete" aria-label="Delete">${icon('trash', 16)}</button></div>
  </div>`;
}
function depTargetName(d) {
  if (d.toId) return `${d.type === 'objective' ? 'Objective' : 'Task'}: ${nameOf(d.toId)}`;
  return `${d.type === 'recovery' ? 'Recovery' : 'Asset'}: ${d.assetName}`;
}
function viewTasks() {
  let h = pageHead('Tasks & Subtasks', 'Every task belongs to an objective. Tasks with subtasks calculate their progress automatically; others are updated by hand.', btn('New task', 'task-new', '', 'primary', 'plus') + btn('Add several / import CSV', 'tasks-bulk', '', '', 'plus'));
  if (!D.totals.tasks) return h + emptyState('No tasks yet', 'Add tasks one at a time, or paste a list of names / import a CSV to create many at once. Tasks do not need an objective — link them to one later.', btn('Add several tasks', 'tasks-bulk', '', 'primary', 'plus') + ' ' + btn('New task', 'task-new', '', '', 'plus') + ' ' + btn('Create objective', 'obj-new', '', '', 'plus'));
  const f = ui.taskFilter, q = f.q.toLowerCase();
  const owners = ownerList();
  h += `<div class="toolbar wrap"><input type="search" id="taskQ" class="search" placeholder="Search tasks, owners, IDs…" value="${esc(f.q)}" data-f="taskFilter.q" aria-label="Search tasks">
    <select data-f="taskFilter.obj" aria-label="Objective"><option value="all">All objectives</option>${data.objectives.map(o => `<option value="${esc(o.id)}" ${f.obj === o.id ? 'selected' : ''}>${o.system ? 'Unassigned tasks' : esc(o.name)}</option>`).join('')}</select>
    <select data-f="taskFilter.status" aria-label="Status"><option value="all">All statuses</option>${STATUS_ORDER.map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
    <select data-f="taskFilter.owner" aria-label="Owner"><option value="all">All owners</option>${owners.map(o => `<option ${f.owner === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
    <label class="chk"><input type="checkbox" data-f="taskFilter.blockedOnly" ${f.blockedOnly ? 'checked' : ''}> Blocked only</label>
    <label class="chk"><input type="checkbox" data-f="taskFilter.hideDone" ${f.hideDone ? 'checked' : ''}> Hide completed</label></div>`;
  const text = x => (x.name + ' ' + x.owner + ' ' + x.id + ' ' + x.description).toLowerCase();
  const passes = (item) => {
    const i = D.node.get(item.id);
    if (f.status !== 'all' && i.status !== f.status) return false;
    if (f.owner !== 'all' && item.owner !== f.owner) return false;
    if (f.blockedOnly && !i.blocked) return false;
    if (f.hideDone && i.done) return false;
    return !q || text(item).includes(q);
  };
  let rows = '', shownT = 0, shownS = 0;
  const filtering = q || f.status !== 'all' || f.owner !== 'all' || f.blockedOnly || f.hideDone;
  data.objectives.forEach(o => {
    if (f.obj !== 'all' && f.obj !== o.id) return;
    const oi = D.obj.get(o.id);
    let body = '';
    o.tasks.forEach(t => {
      const subsPass = t.subtasks.filter(passes);
      const tPass = passes(t);
      if (filtering && !tPass && !subsPass.length) return;
      shownT++;
      body += taskRowHtml('task', t);
      const showSubs = filtering ? (tPass ? t.subtasks.filter(s => !(f.hideDone && D.node.get(s.id).done)) : subsPass) : t.subtasks;
      if (!ui.collapsed.has(t.id) || filtering) showSubs.forEach(s => { shownS++; body += taskRowHtml('sub', s); });
    });
    if (filtering && !body) return;
    const hdr = o.system
      ? `<div class="t-group-h st-not-started"><div class="tg-l"><span class="tg-bar"></span><div><h3>Unassigned tasks</h3><small><span class="muted">Not linked to an objective yet — open a task and choose an objective when you are ready.</span></small></div></div><div class="tg-r">${btn('Task', 'task-new', 'data-obj="unassigned"', 'small', 'plus')}</div></div>`
      : `<div class="t-group-h st-${oi.status}" style="--c:${objCol(o).c};--cs:${objCol(o).l}"><div class="tg-l"><span class="tg-bar"></span><div><h3>${esc(o.name)}</h3><small>${idChip(o.id)} ${pill(oi.status)} <span class="muted">${esc(rangeText(o.startDate, o.endDate))}${o.owner ? ' · ' + esc(o.owner) : ''}</span></small></div></div>
      <div class="tg-r"><div class="tg-prog">${pbarC(oi.progress, objCol(o).c)}<b>${pct(oi.progress)}%</b></div>${btn('Task', 'task-new', `data-obj="${esc(o.id)}"`, 'small', 'plus')}</div></div>`;
    rows += `<section class="t-group">${hdr}
      <div class="t-head"><div>Task / subtask</div><div>Owner</div><div>Dates</div><div>Priority</div><div>Status</div><div>Progress</div><div></div></div>
      ${body || '<p class="muted pad">No tasks yet. Use “Task” to add one.</p>'}</section>`;
  });
  h += rows || '<p class="muted">No tasks match the filters.</p>';
  h += `<p class="muted small foot">Showing ${shownT} task${shownT === 1 ? '' : 's'} and ${shownS} subtask${shownS === 1 ? '' : 's'}. Drag a slider to update progress — parent task and objective progress, status, dashboard and roadmap update instantly.</p>`;
  return h;
}

/* ---------------- Risks & blockers ---------------- */
function heatmapHtml() {
  const open = data.risks.filter(r => r.status !== 'closed');
  let rows = '';
  for (let l = 5; l >= 1; l--) {
    rows += `<tr><th>${l}</th>${[1, 2, 3, 4, 5].map(i => { const n = open.filter(r => r.impact === i && r.likelihood === l).length; return `<td class="hm band-${riskBand(i * l)}">${n || ''}</td>`; }).join('')}</tr>`;
  }
  return `<table class="heat"><caption>Likelihood ↑ / Impact →</caption><tbody>${rows}<tr><th></th>${[1, 2, 3, 4, 5].map(i => `<th>${i}</th>`).join('')}</tr></tbody></table>`;
}
function viewRisks() {
  const tab = ui.riskTab;
  let h = pageHead('Risks & Blockers', 'Record risks with mitigation, and track blocked work that needs unblocking.',
    tab === 'risks' ? btn('New risk', 'risk-new', '', 'primary', 'plus') : btn('Flag blocker', 'blocker-flag', '', 'primary', 'ban'));
  h += `<div class="tabs"><button class="${tab === 'risks' ? 'on' : ''}" data-action="tab" data-group="riskTab" data-tab="risks">Risk register <span class="count">${data.risks.length}</span></button>
    <button class="${tab === 'blockers' ? 'on' : ''}" data-action="tab" data-group="riskTab" data-tab="blockers">Blockers <span class="count ${D.blockedItems.length ? 'red' : ''}">${D.blockedItems.length}</span></button></div>`;
  if (tab === 'risks') {
    if (!data.risks.length) return h + emptyState('No risks recorded', 'Capture programme risks with impact, likelihood, owner and mitigation.', btn('Add first risk', 'risk-new', '', 'primary', 'plus'));
    const sorted = data.risks.slice().sort((a, b) => (a.status === 'closed') - (b.status === 'closed') || riskScore(b) - riskScore(a));
    h += `<div class="risk-layout"><div class="card heat-card"><h4>Heat map <small class="muted">(open risks)</small></h4>${heatmapHtml()}</div><div class="r-table">
      <div class="r-head"><div>Risk</div><div>Impact</div><div>Likelihood</div><div>Rating</div><div>Owner</div><div>Status</div><div></div></div>
      ${sorted.map(r => { const s = riskScore(r); return `<div class="r-row ${r.status === 'closed' ? 'closed' : ''}">
        <div class="r-main"><div>${idChip(r.id)} ${r.relatedId ? `<span class="chip">${icon('link', 12)} ${esc(nameOf(r.relatedId))}</span>` : ''}</div><b>${esc(r.description)}</b>${r.mitigation ? `<small><i>Mitigation:</i> ${esc(r.mitigation)}</small>` : ''}</div>
        <div data-label="Impact">${r.impact} · ${IMPACT[r.impact - 1]}</div><div data-label="Likelihood">${r.likelihood} · ${LIKELIHOOD[r.likelihood - 1]}</div>
        <div data-label="Rating"><span class="band band-${riskBand(s)}">${s} · ${cap(riskBand(s))}</span></div>
        <div data-label="Owner">${avatar(r.owner)}</div><div data-label="Status"><span class="rs rs-${r.status}">${cap(r.status)}</span></div>
        <div class="t-act"><button class="icon-btn" data-action="risk-edit" data-id="${esc(r.id)}" aria-label="Edit risk">${icon('edit', 16)}</button><button class="icon-btn danger" data-action="risk-del" data-id="${esc(r.id)}" aria-label="Delete risk">${icon('trash', 16)}</button></div></div>`; }).join('')}
    </div></div>`;
  } else {
    if (!D.blockedItems.length) return h + emptyState('Nothing is blocked', 'Blocked tasks appear here and are highlighted on the dashboard and technical roadmap. Flag one from a task, or use “Flag blocker”.', btn('Flag a blocker', 'blocker-flag', '', 'primary', 'ban'));
    h += `<div class="r-table b-table"><div class="r-head"><div>Blocked item</div><div>Blocker</div><div>Owner</div><div>Parent / objective</div><div></div></div>
      ${D.blockedItems.map(b => `<div class="r-row blocked"><div class="r-main"><div>${idChip(b.id)} <span class="chip">${({ obj: 'Objective', task: 'Task', sub: 'Subtask' })[b.kind]}</span></div><b>${esc(b.name)}</b></div>
        <div data-label="Blocker">${esc(b.blocker || '—')}</div><div data-label="Owner">${avatar(b.owner)}</div><div data-label="Parent">${esc(b.parent || b.objective)}</div>
        <div class="t-act">${btn('Resolve', 'blocker-resolve', `data-id="${esc(b.id)}"`, 'small', 'check')}<button class="icon-btn" data-action="open-item" data-id="${esc(b.id)}" aria-label="Edit">${icon('edit', 16)}</button></div></div>`).join('')}</div>`;
  }
  return h;
}

/* ---------------- Dependencies ---------------- */
function depRegisterRow(d) {
  const flags = [];
  if (D.conflicts.has(d.id)) flags.push('<span class="chip amber" data-tip="The dependent item is scheduled to start before the item it depends on finishes.">⚠ Schedule conflict</span>');
  if (D.cycle.has(d.fromId)) flags.push('<span class="chip red" data-tip="This item is part of a circular dependency chain.">⟲ Circular</span>');
  const fromKind = kindLabel(d.fromId);
  return `<div class="d-row"><div class="d-main">${idChip(d.id)}<span class="chip">${DEP_TYPES[d.type]}</span> ${flags.join('')}</div>
    <div data-label="Dependent item"><small class="muted">${fromKind}</small><br><b>${esc(nameOf(d.fromId))}</b></div>
    <div class="arrow">→</div>
    <div data-label="Depends on"><small class="muted">${d.toId ? kindLabel(d.toId) : (d.type === 'recovery' ? 'Recovery' : 'Asset')}</small><br><b>${esc(d.toId ? nameOf(d.toId) : d.assetName)}</b></div>
    <div data-label="Status"><span class="ds ds-${d.status}">${cap(d.status)}</span></div>
    <div data-label="Note" class="muted">${esc(d.note || '')}</div>
    <div class="t-act"><button class="icon-btn" data-action="dep-edit" data-id="${esc(d.id)}" aria-label="Edit">${icon('edit', 16)}</button><button class="icon-btn danger" data-action="dep-del" data-id="${esc(d.id)}" aria-label="Delete">${icon('trash', 16)}</button></div></div>`;
}
function depMatrixHtml() {
  const deps = data.dependencies;
  const rows = Array.from(new Set(deps.map(d => d.fromId)));
  const colMap = new Map();
  deps.forEach(d => { const key = d.toId || `${d.type}:${d.assetName}`; if (!colMap.has(key)) colMap.set(key, { key, label: d.toId ? nameOf(d.toId) : d.assetName, kind: d.toId ? kindLabel(d.toId) : (d.type === 'recovery' ? 'Recovery' : 'Asset') }); });
  const cols = Array.from(colMap.values()).sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
  const cell = (r, c) => {
    const m = deps.filter(d => d.fromId === r && (d.toId || `${d.type}:${d.assetName}`) === c.key);
    if (!m.length) return '<td></td>';
    const d = m[0];
    return `<td class="mx-on"><button class="mx-dot ds-${d.status} ${D.conflicts.has(d.id) ? 'conf' : ''}" data-action="dep-edit" data-id="${esc(d.id)}" data-tip="${esc(`${nameOf(r)} → ${c.label}\n${DEP_TYPES[d.type]} · ${cap(d.status)}${d.note ? '\n' + d.note : ''}`)}" aria-label="Dependency ${esc(d.id)}"></button></td>`;
  };
  return `<div class="matrix-wrap"><table class="matrix"><thead><tr><th class="corner">Depends on →<br><small>Dependent ↓</small></th>${cols.map(c => `<th class="col"><span><small>${c.kind}</small> ${esc(c.label)}</span></th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr><th class="row"><small>${kindLabel(r)}</small> ${esc(nameOf(r))}</th>${cols.map(c => cell(r, c)).join('')}</tr>`).join('')}</tbody></table>
    <div class="legend mt"><span class="lg"><i class="dot ds-open"></i>Open</span><span class="lg"><i class="dot ds-at-risk"></i>At risk</span><span class="lg"><i class="dot ds-satisfied"></i>Satisfied</span><span class="lg"><i class="dot conf-d"></i>Schedule conflict (ring)</span></div></div>`;
}
function viewDependencies() {
  const tab = ui.depTab, deps = data.dependencies;
  let h = pageHead('Dependencies', 'Link tasks and objectives to the tasks, objectives, assets and recovery capabilities they depend on.', btn('New dependency', 'dep-new', '', 'primary', 'plus'));
  h += `<div class="tabs"><button class="${tab === 'register' ? 'on' : ''}" data-action="tab" data-group="depTab" data-tab="register">Register <span class="count">${deps.length}</span></button>
    <button class="${tab === 'matrix' ? 'on' : ''}" data-action="tab" data-group="depTab" data-tab="matrix">Dependency matrix</button></div>`;
  if (!deps.length) return h + emptyState('No dependencies recorded', 'Dependencies can also be added while editing any objective, task or subtask.', btn('Add dependency', 'dep-new', '', 'primary', 'plus'));
  if (D.cycle.size) h += `<div class="callout red">${icon('risk', 16)} Circular dependency detected involving: ${Array.from(D.cycle).map(id => esc(nameOf(id))).join(', ')}.</div>`;
  if (D.conflicts.size) h += `<div class="callout amber">${icon('risk', 16)} ${D.conflicts.size} dependency schedule conflict${D.conflicts.size === 1 ? '' : 's'}: a dependent item starts before the item it relies on finishes.</div>`;
  h += tab === 'register'
    ? `<div class="d-table"><div class="d-head"><div>Type</div><div>Dependent item</div><div></div><div>Depends on</div><div>Status</div><div>Note</div><div></div></div>${deps.map(depRegisterRow).join('')}</div>`
    : depMatrixHtml();
  return h;
}

/* ---------------- Milestones ---------------- */
function viewMilestones() {
  let h = pageHead('Milestones', 'Key delivery points. Milestones appear as diamonds on the roadmap.', btn('New milestone', 'ms-new', '', 'primary', 'plus'));
  if (!data.milestones.length) return h + emptyState('No milestones yet', 'Add delivery milestones such as “DR site ready” or “First successful failover test”.', btn('Add milestone', 'ms-new', '', 'primary', 'plus'));
  const list = data.milestones.slice().sort((a, b) => dayNum(a.date) - dayNum(b.date));
  h += `<div class="ms-list">${list.map(m => {
    const e = msEffective(m);
    return `<div class="card ms-card"><div class="ms-diamond ms-${e}" style="--mc:${msColour(m)};background:${(m.objectiveId && objColById(m.objectiveId)) ? objColById(m.objectiveId).l : '#E5E7EB'}">${icon('diamond', 22)}</div><div class="ms-body"><div class="ms-top">${idChip(m.id)}${pill(MS_STATUS_CLASS[e], MS_LABEL[e])}</div><h3>${esc(m.name)}</h3>
      ${m.description ? `<p class="muted">${esc(m.description)}</p>` : ''}<div class="ms-meta"><span>${icon('clock', 14)} ${esc(fmtDate(m.date))} <small class="muted">(${relDays(m.date)})</small></span>${m.objectiveId ? `<span>${icon('target', 14)} ${esc(nameOf(m.objectiveId))}</span>` : '<span class="muted">Programme-level</span>'}</div></div>
      <div class="t-act"><button class="icon-btn" data-action="ms-edit" data-id="${esc(m.id)}" aria-label="Edit milestone">${icon('edit', 17)}</button><button class="icon-btn danger" data-action="ms-del" data-id="${esc(m.id)}" aria-label="Delete milestone">${icon('trash', 17)}</button></div></div>`;
  }).join('')}</div>`;
  return h;
}

/* ---------------- Reports & data management ---------------- */
function viewReports() {
  const c = countsOf(data), p = data.project, backups = readBackups();
  const unexported = !data.meta.lastExportedAt || (data.meta.modifiedAt > data.meta.lastExportedAt);
  let h = pageHead('Reports & Data Management', 'Print the roadmap, produce a status report, and move your project data between computers as JSON.');
  h += `<div class="grid-2 rep-grid">
    <div class="card"><h3>${icon('print', 18)} Print &amp; PDF</h3>
      <p class="muted">Prints in landscape with colours preserved. To make a PDF, choose <b>Save as PDF</b> as the destination in the print dialog.</p>
      <div class="btn-col">${btn('Print management roadmap', 'print-roadmap', 'data-mode="management"', 'primary', 'print')}${btn('Print technical roadmap', 'print-roadmap', 'data-mode="technical"', '', 'print')}</div></div>
    <div class="card"><h3>${icon('report', 18)} Project status report</h3>
      <p class="muted">A one-document summary: progress, objectives, blockers, overdue work, milestones, risks and dependencies.</p>
      <div class="btn-col">${btn('Download status report (HTML)', 'download-report', '', 'primary', 'download')}${btn('Print / save report as PDF', 'print-report', '', '', 'print')}</div></div>
    <div class="card span2"><h3>${icon('save', 18)} Project data (JSON)</h3>
      <div class="data-stat"><span><b>${c.objectives}</b> objectives</span><span><b>${c.tasks}</b> tasks</span><span><b>${c.subtasks}</b> subtasks</span><span><b>${c.milestones}</b> milestones</span><span><b>${c.risks}</b> risks</span><span><b>${c.dependencies}</b> dependencies</span><span>Schema v${SCHEMA_VERSION}</span></div>
      <p class="${unexported && (c.objectives || c.risks || c.milestones) ? 'callout amber' : 'muted'}">${unexported && (c.objectives || c.risks || c.milestones) ? icon('risk', 15) : ''}<span>${unexported && (c.objectives || c.risks || c.milestones) ? 'You have changes that have not been exported. ' : ''}Last JSON export: <b>${esc(fmtDateTime(data.meta.lastExportedAt))}</b>. Browser autosave is a convenience — <b>export regularly</b> and keep the JSON file safe; it is your master copy.</span></p>
      <div class="btn-row">${btn('Export JSON', 'export-json', '', 'primary', 'download')}${canShareFiles() ? btn('Share / save to…', 'share-json', '', '', 'upload') : ''}${btn('Import JSON…', 'import-json', '', '', 'upload')}${btn('Paste JSON…', 'paste-json', '', 'ghost', 'upload')}${btn('Show / copy JSON', 'show-json', '', 'ghost', 'report')}${btn('Save &amp; back up now', 'save-now', '', '', 'save')}${btn('Download blank template', 'download-template', '', 'ghost', 'download')}${btn('Reset project…', 'reset-project', '', 'ghost danger-t', 'trash')}</div>
      <h4 class="sec-t mt">Browser backups <small class="muted">(stored in this browser only — last ${8})</small></h4>
      ${backups.length ? `<div class="bk-list">${backups.map((b, i) => `<div class="bk"><div><b>${esc(fmtDateTime(b.at))}</b><small>${esc(b.reason)} · ${b.counts.objectives} obj, ${b.counts.tasks} tasks, ${b.counts.subtasks} subtasks</small></div><div class="btn-row">${btn('Restore', 'restore-backup', `data-i="${i}"`, 'small')}${btn('Download', 'download-backup', `data-i="${i}"`, 'small ghost')}<button class="icon-btn danger" data-action="delete-backup" data-i="${i}" aria-label="Delete backup">${icon('trash', 15)}</button></div></div>`).join('')}</div>` : '<p class="muted small">No backups yet. One is created automatically before any import, reset or restore, and when you press “Save &amp; back up now”.</p>'}
    </div>
    <div class="card span2"><h3>Project settings</h3>
      <form id="settingsForm" data-submit="save-settings" class="fgrid" novalidate>
        ${fld('Project name', inp('pname', p.name, 'required maxlength="120"'), 'full')}
        ${fld('Description', txt('pdesc', p.description, 2), 'full')}
        ${fld('Programme manager', inp('pmanager', p.manager, 'list="owners"') + ownerDatalist())}
        <span></span>
        ${fld('Timeline start', dateInp('pstart', p.startDate), '', 'First month shown on the roadmap')}
        ${fld('Timeline end', dateInp('pend', p.endDate), '', 'Last month shown. The roadmap widens automatically if items fall outside.')}
        <div class="full"><button class="btn primary" type="button" data-action="save-settings">Save settings</button> <span id="settingsErr" class="form-error inline" hidden></span></div>
      </form></div>
  </div>`;
  return h;
}
function reportBodyHtml() {
  const t = D.totals, p = data.project;
  const upcoming = data.milestones.slice().sort((a, b) => dayNum(a.date) - dayNum(b.date));
  const risks = data.risks.filter(r => r.status !== 'closed').sort((a, b) => riskScore(b) - riskScore(a));
  const atRisk = Array.from(D.task.values()).filter(x => x.status === 'at-risk' || x.status === 'delayed');
  return `<div class="rep">
    <div class="rep-head"><div><h1>${esc(p.name)}</h1><p>Project status report · ${esc(fmtDate(D.today))}${p.manager ? ' · Programme manager: ' + esc(p.manager) : ''}</p><p class="rep-sub">Timeline: ${esc(rangeText(p.startDate, p.endDate))}</p></div><div class="rep-ring">${ringSvg(t.overall)}</div></div>
    <div class="rep-kpis"><div><b>${t.objectives}</b><span>Objectives</span></div><div><b>${t.tasks}</b><span>Tasks</span></div><div><b>${t.tasksDone}</b><span>Completed</span></div><div><b>${t.tasksStarted}</b><span>In progress</span></div><div class="r"><b>${t.tasksBlocked}</b><span>Blocked</span></div><div class="a"><b>${t.tasksOverdue}</b><span>Overdue</span></div></div>
    <h2>Objectives</h2>
    ${realObjs().length ? `<table><thead><tr><th>ID</th><th>Objective</th><th>Owner</th><th>Baseline</th><th>Forecast</th><th>Tasks</th><th>Progress</th><th>Status</th></tr></thead><tbody>
    ${realObjs().map(o => { const i = D.obj.get(o.id); return `<tr><td>${esc(o.id)}</td><td><i class="rdot" style="background:${objCol(o).c}"></i><b>${esc(o.name)}</b></td><td>${esc(o.owner || '—')}</td><td>${esc(rangeText(o.startDate, o.endDate))}</td><td>${o.forecastStart || o.forecastEnd ? esc(rangeText(o.forecastStart || o.startDate, o.forecastEnd || o.endDate)) : '—'}</td><td>${i.taskDone}/${i.taskCount}</td><td><span class="rbar"><i style="width:${pct(i.progress)}%;background:${objCol(o).c}"></i></span> ${pct(i.progress)}%</td><td>${pill(i.status)}</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">No objectives defined.</p>'}
    <h2>Blocked work (${D.blockedItems.length})</h2>
    ${D.blockedItems.length ? `<table><thead><tr><th>Item</th><th>Blocker</th><th>Owner</th><th>Objective</th></tr></thead><tbody>${D.blockedItems.map(b => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.blocker || '—')}</td><td>${esc(b.owner || '—')}</td><td>${esc(b.objective)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nothing is currently blocked.</p>'}
    <h2>Overdue &amp; at-risk tasks (${D.overdueItems.length + atRisk.filter(x => !x.overdue).length})</h2>
    ${(D.overdueItems.length || atRisk.length) ? `<table><thead><tr><th>Task</th><th>Owner</th><th>End date</th><th>Progress</th><th>Status</th></tr></thead><tbody>${Array.from(new Set(D.overdueItems.concat(atRisk))).filter(x => x.kind !== 'obj').map(x => `<tr><td><b>${esc(x.item.name)}</b></td><td>${esc(x.item.owner || '—')}</td><td>${esc(fmtDate(x.item.forecastEnd || x.item.endDate))}</td><td>${pct(x.progress)}%</td><td>${pill(x.status)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No overdue or at-risk tasks.</p>'}
    <h2>Milestones</h2>
    ${upcoming.length ? `<table><thead><tr><th>Milestone</th><th>Date</th><th>Objective</th><th>Status</th></tr></thead><tbody>${upcoming.map(m => { const e = msEffective(m); return `<tr><td><b>${esc(m.name)}</b></td><td>${esc(fmtDate(m.date))}</td><td>${esc(m.objectiveId ? nameOf(m.objectiveId) : 'Programme')}</td><td>${pill(MS_STATUS_CLASS[e], MS_LABEL[e])}</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">No milestones defined.</p>'}
    <h2>Open risks (${risks.length})</h2>
    ${risks.length ? `<table><thead><tr><th>Risk</th><th>Rating</th><th>Owner</th><th>Mitigation</th><th>Status</th></tr></thead><tbody>${risks.map(r => `<tr><td>${esc(r.description)}</td><td><span class="band band-${riskBand(riskScore(r))}">${riskScore(r)} · ${cap(riskBand(riskScore(r)))}</span></td><td>${esc(r.owner || '—')}</td><td>${esc(r.mitigation || '—')}</td><td>${cap(r.status)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No open risks recorded.</p>'}
    <h2>Open dependencies (${data.dependencies.filter(d => d.status !== 'satisfied').length})</h2>
    ${data.dependencies.filter(d => d.status !== 'satisfied').length ? `<table><thead><tr><th>Dependent item</th><th>Depends on</th><th>Type</th><th>Status</th></tr></thead><tbody>${data.dependencies.filter(d => d.status !== 'satisfied').map(d => `<tr><td>${esc(nameOf(d.fromId))}</td><td>${esc(d.toId ? nameOf(d.toId) : d.assetName)}${D.conflicts.has(d.id) ? ' ⚠' : ''}</td><td>${DEP_TYPES[d.type]}</td><td>${cap(d.status)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No open dependencies.</p>'}
    <p class="rep-foot">Generated by Backup &amp; DR Programme Manager v${APP_VERSION} · schema v${SCHEMA_VERSION}</p></div>`;
}
