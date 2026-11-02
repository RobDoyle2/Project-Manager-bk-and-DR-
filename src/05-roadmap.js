/* =====================================================================
   Roadmap — generated directly from `data` + derived values on every
   render. There is no separate roadmap dataset.
   ===================================================================== */
function roadmapRange() {
  let s = dayNum(data.project.startDate), e = dayNum(data.project.endDate), extended = false;
  if (s === null || e === null || e < s) { s = dayNum('2026-10-01'); e = dayNum('2027-06-30'); }
  const eat = (a, b) => {
    const x = dayNum(a), y = dayNum(b || a);
    if (x !== null && x < s) { s = x; extended = true; }
    if (y !== null && y > e) { e = y; extended = true; }
  };
  data.objectives.forEach(o => {
    if (!o.system) { eat(o.startDate, o.endDate); eat(o.forecastStart || o.startDate, o.forecastEnd || o.endDate); }
    o.tasks.forEach(t => {
      eat(t.startDate, t.endDate); eat(t.forecastStart || t.startDate, t.forecastEnd || t.endDate);
      t.subtasks.forEach(x => { eat(x.startDate, x.endDate); eat(x.forecastStart || x.startDate, x.forecastEnd || x.endDate); });
    });
  });
  data.milestones.forEach(m => eat(m.date));
  const sd = new Date(s * DAY), ed = new Date(e * DAY);
  let y = sd.getUTCFullYear(), m = sd.getUTCMonth();
  const ey = ed.getUTCFullYear(), em = ed.getUTCMonth(), months = [];
  while ((y < ey || (y === ey && m <= em)) && months.length < 72) {
    const st = Date.UTC(y, m, 1) / DAY, nx = Date.UTC(y, m + 1, 1) / DAY;
    months.push({ y, mo: m + 1, start: st, days: nx - st });
    m++; if (m > 11) { m = 0; y++; }
  }
  const last = months[months.length - 1];
  const start = months[0].start, end = last.start + last.days - 1;
  return { start, end, total: end - start + 1, months, extended };
}
function mkPos(R) {
  return (a, b) => {
    const x = dayNum(a), y = dayNum(b);
    return { l: (x - R.start) / R.total * 100, w: Math.max((y - x + 1) / R.total * 100, 0.45) };
  };
}
function ganttHead(R, labelInner) {
  return `<div class="g-head"><div class="g-lab g-lab-head">${labelInner}</div><div class="g-months">${R.months.map(m => `<div class="g-month" style="flex:${m.days} 1 0"><b>${MONTHS[m.mo - 1]}</b><small>${m.y}</small></div>`).join('')}</div></div>`;
}
function ganttGrid(R) {
  const T = D.T;
  const today = (T >= R.start && T <= R.end) ? `<div class="g-today" style="left:${((T - R.start + 0.5) / R.total * 100).toFixed(3)}%"><span>Today</span></div>` : '';
  // Christmas break: 24 Dec – 2 Jan inclusive, every year the timeline covers
  const sy = new Date(R.start * DAY).getUTCFullYear(), ey = new Date(R.end * DAY).getUTCFullYear();
  let xmas = '';
  for (let y = sy - 1; y <= ey; y++) {
    const a = dayNum(`${y}-12-24`), b = dayNum(`${y + 1}-01-02`);
    const s = Math.max(a, R.start), e = Math.min(b, R.end);
    if (s > e) continue;
    xmas += `<div class="g-xmas" style="left:${((s - R.start) / R.total * 100).toFixed(3)}%;width:${((e - s + 1) / R.total * 100).toFixed(3)}%" data-xmas="${y}-12-24..${y + 1}-01-02"><span>Christmas break</span></div>`;
  }
  return `<div class="g-grid">${xmas}${R.months.map(m => `<div class="g-gl" style="flex:${m.days} 1 0"></div>`).join('')}<div class="g-today-wrap">${today}</div></div>`;
}
function itemTip(it, info, extra = '') {
  const lines = [`${it.name}  (${it.id})`];
  if (it.owner) lines.push('Owner: ' + it.owner);
  lines.push(`Baseline: ${rangeText(it.startDate, it.endDate)}`);
  if (it.forecastStart || it.forecastEnd) lines.push(`Forecast: ${rangeText(it.forecastStart || it.startDate, it.forecastEnd || it.endDate)}`);
  lines.push(`Progress: ${pct(info.progress)}%   Status: ${STATUS_LABEL[info.status]}`);
  if (info.ownBlocked && it.blocker) lines.push('Blocker: ' + it.blocker);
  const deps = D.depsFrom.get(it.id) || [];
  if (deps.length) lines.push('Depends on: ' + deps.map(depTargetName).join('; '));
  if (extra) lines.push(extra);
  return lines.join('\n');
}
function barHtml(o) {
  // o: {pos, progress, cls, tip, id, chip, top, h, label, note, oc:{kind:'o'|'t', c, l}}
  const narrow = o.pos.w < 6.5, oc = o.oc;
  const style = `left:${o.pos.l.toFixed(3)}%;width:${o.pos.w.toFixed(3)}%;${o.top != null ? `top:${o.top}px;` : ''}${o.h ? `height:${o.h}px;` : ''}${oc ? `--oc:${oc.c};--ol:${oc.l};` : ''}`;
  const inner = oc
    ? `<span class="bar-in"><i class="strip" style="width:${pct(o.progress)}%"></i></span><span class="bar-txt"><b>${o.chip}</b>${narrow ? '' : ` <span class="bn">${esc(o.label || '')}</span>`}</span>`
    : `<span class="bar-in"><i class="fill" style="width:${pct(o.progress)}%"></i></span><span class="chip-p">${o.chip}</span>`;
  let h = `<div class="bar ${o.cls}${narrow ? ' narrow' : ''}${oc ? ' oc oc-' + oc.kind : ''}" style="${style}" data-tip="${esc(o.tip)}" data-action="open-item" data-id="${esc(o.id)}" role="button" tabindex="0" aria-label="${esc(o.label || '')}">${inner}</div>`;
  if (o.note) {
    const end = o.pos.l + o.pos.w, left = end < 62;
    const t = o.top != null ? o.top : 8;
    h += `<span class="bar-note ${narrow && left ? 'nn' : ''}" style="top:${t + 2}px;${left ? `left:${end.toFixed(3)}%` : `right:${(100 - o.pos.l).toFixed(3)}%`}" data-tip="${esc(o.note)}">⛔ ${esc(o.note.length > 46 ? o.note.slice(0, 45) + '…' : o.note)}</span>`;
  }
  return h;
}
function fbarHtml(it, P, top, h) {
  if (!ui.rmForecast || (!it.forecastStart && !it.forecastEnd)) return '';
  const p = P(it.forecastStart || it.startDate, it.forecastEnd || it.endDate);
  const slip = dayNum(it.forecastEnd || it.endDate) - dayNum(it.endDate);
  return `<div class="fbar ${slip > 0 ? 'late' : ''}" style="left:${p.l.toFixed(3)}%;width:${p.w.toFixed(3)}%;top:${top}px;height:${h}px" data-tip="${esc('Revised forecast: ' + rangeText(it.forecastStart || it.startDate, it.forecastEnd || it.endDate) + (slip ? `\n${slip > 0 ? 'Slips' : 'Ahead by'} ${Math.abs(slip)} day${Math.abs(slip) === 1 ? '' : 's'} vs baseline` : ''))}"></div>`;
}
const MS_GLYPH = { planned: '', 'at-risk': '!', achieved: '✓', missed: '✕' };
function milestoneMarkers(R, P, opts) {
  const list = data.milestones.slice().sort((a, b) => dayNum(a.date) - dayNum(b.date));
  const levelEnd = [];
  const trackPx = opts.compact ? 640 : 900;
  let maxLevel = 0;
  const pts = list.map(m => {
    const l = (dayNum(m.date) - R.start + 0.5) / R.total * 100;
    const nm = m.name.length > 26 ? m.name.slice(0, 25) + '…' : m.name;
    const wPct = (nm.length * 6.4 + 26) / trackPx * 100;
    const left = l > 82 ? l - wPct + 1.2 : l - 0.8;
    let lv = 0; while (levelEnd[lv] !== undefined && levelEnd[lv] > left - 0.4) lv++;
    levelEnd[lv] = left + wPct; maxLevel = Math.max(maxLevel, lv);
    return { m, l, nm, lv, right: l > 82 };
  });
  const html = pts.map(p => {
    const e = msEffective(p.m);
    return `<div class="ms-pt ms-${e}" style="left:${p.l.toFixed(3)}%;--mc:${msColour(p.m)}" data-tip="${esc(`${p.m.name}\n${fmtDate(p.m.date)} · ${MS_LABEL[e]}${p.m.objectiveId ? '\nObjective: ' + nameOf(p.m.objectiveId) : ''}${p.m.description ? '\n' + p.m.description : ''}`)}" data-action="ms-edit" data-id="${esc(p.m.id)}" role="button" tabindex="0">
      <span class="dia" data-g="${MS_GLYPH[e]}"></span><span class="ms-lab ${p.right ? 'r' : ''}" style="top:${22 + p.lv * 15}px">${esc(p.nm)}</span></div>`;
  }).join('');
  return { html, height: 28 + (maxLevel + 1) * 15 + 6, count: list.length };
}
function rmWrap(R, headLabel, bodyHtml, cls, labelW) {
  return `<div class="gantt ${cls}" style="--labelw:${labelW}px"><div class="gantt-scroll"><div class="gantt-inner">${ganttHead(R, headLabel)}<div class="g-body">${ganttGrid(R)}${bodyHtml}</div></div></div></div>`;
}

/* ---------------- Management view: objectives + milestones only ---------------- */
function mgmtRoadmapHtml(opts = {}) {
  const R = roadmapRange(), P = mkPos(R), compact = !!opts.compact;
  const rowH = compact ? 46 : 86, labelW = compact ? 200 : 330;
  let body = '';
  if (ui.rmMilestones && data.milestones.length) {
    const ms = milestoneMarkers(R, P, opts);
    body += `<div class="g-row g-ms-row" style="height:${ms.height}px"><div class="g-lab m-lab"><div class="ml-name"><span class="ms-ico">${icon('diamond', 14)}</span><b>Milestones</b></div>${compact ? '' : `<div class="ml-sub">${ms.count} delivery milestone${ms.count === 1 ? '' : 's'}</div>`}</div><div class="g-track">${ms.html}</div></div>`;
  }
  if (!realObjs().length) body += `<div class="g-empty">No objectives yet — add one in <b>Objectives</b> and it will appear here automatically.</div>`;
  realObjs().forEach(o => {
    const i = D.obj.get(o.id), pos = P(o.startDate, o.endDate);
    const linked = ui.rmMilestones ? data.milestones.filter(m => m.objectiveId === o.id).map(m => {
      const e = msEffective(m), l = (dayNum(m.date) - R.start + 0.5) / R.total * 100;
      return `<div class="ms-pt small ms-${e}" style="left:${l.toFixed(3)}%;top:${compact ? 1 : 3}px;--mc:${msColour(m)}" data-tip="${esc(m.name + '\n' + fmtDate(m.date) + ' · ' + MS_LABEL[e])}" data-action="ms-edit" data-id="${esc(m.id)}"><span class="dia"></span></div>`;
    }).join('') : '';
    const barTop = compact ? 10 : 16, barH = compact ? 24 : 30;
    const col = objCol(o), byObj = ui.rmMgmtColor !== 'status';
    body += `<div class="g-row" style="height:${rowH}px"><div class="g-lab m-lab"${byObj ? ` style="box-shadow:inset 6px 0 0 ${col.c}"` : ''}>
        <div class="ml-name"><b class="rm-name" role="button" tabindex="0" data-action="open-item" data-id="${esc(o.id)}" title="${esc(o.name)} — click to open (read only)">${esc(o.name)}</b></div>
        ${compact ? '' : `<div class="ml-sub">${avatar(o.owner)}<span class="ml-dates">${icon('clock', 13)} ${esc(rangeText(o.startDate, o.endDate))}</span></div>`}
        <div class="ml-pill">${pill(i.status)}${compact ? '' : `<span class="ml-pct">${pct(i.progress)}%</span>`}</div></div>
      <div class="g-track">${barHtml({ pos, progress: i.progress, cls: `st-${i.status} ${i.blocked ? 'is-blocked' : ''}${i.overdue ? ' is-late' : ''}`, oc: byObj ? { kind: 'o', c: col.c, l: col.l } : null, tip: itemTip(o, i, `${i.taskDone}/${i.taskCount} tasks complete`), id: o.id, chip: `${i.blocked ? '⛔ ' : ''}${pct(i.progress)}%`, top: barTop, h: barH, label: o.name })}
        ${compact ? '' : fbarHtml(o, P, barTop + barH + 6, 8)}${linked}</div></div>`;
  });
  const note = R.extended ? `<p class="rm-note">The timeline was widened automatically because some items fall outside the project timeline (${esc(rangeText(data.project.startDate, data.project.endDate))}).</p>` : '';
  return rmWrap(R, 'Objective', body, 'gantt-mgmt' + (compact ? ' compact' : ''), labelW) + (opts.print ? '' : note);
}

/* ---------------- Technical view: objectives › tasks › subtasks ---------------- */
function techRoadmapHtml(opts = {}) {
  const R = roadmapRange(), P = mkPos(R), labelW = 470;
  const byStatus = ui.rmColor === 'status';
  let body = '';
  if (!data.objectives.some(o => o.tasks.length || !o.system)) body += `<div class="g-empty">No objectives or tasks yet — add some and they will appear here automatically.</div>`;
  let curObj = null;
  const row = (it, lvl, kind, hasKids) => {
    const col = objCol(curObj), i = D.node.get(it.id), pos = P(it.startDate, it.endDate), collapsed = ui.collapsed.has(it.id);
    const deps = D.depsFrom.get(it.id) || [];
    const chips = [];
    if (i.ownBlocked) chips.push(`<span class="chip red" data-tip="${esc(it.blocker || 'Blocked')}">${icon('ban', 11)} Blocked</span>`);
    else if (i.blocked) chips.push(`<span class="chip red">${icon('ban', 11)} Blocked below</span>`);
    if (i.overdue) chips.push('<span class="chip amber">Overdue</span>');
    if (deps.length) chips.push(`<span class="chip" data-tip="${esc(deps.map(d => '• ' + depTargetName(d)).join('\n'))}">${icon('link', 11)} ${deps.length}</span>`);
    const owner = it.owner ? esc(it.owner) : '<span class="muted">—</span>';
    const barTop = lvl === 0 ? 9 : 11, barH = lvl === 0 ? 24 : 20;
    const cls = `st-${i.status}${i.ownBlocked ? ' is-blocked' : ''}${i.overdue ? ' is-late' : ''}`;
    const oc = byStatus ? null : { kind: lvl === 0 ? 'o' : 't', c: col.c, l: col.l };
    const labAttr = byStatus ? '' : ` style="box-shadow:inset ${lvl === 0 ? 6 : 5}px 0 0 ${col.c}"`;
    return `<div class="g-row t-r lvl-${lvl}" style="height:48px"><div class="g-lab tl"${labAttr}>
        <div class="tl-name" style="padding-left:${6 + lvl * 20}px">${hasKids ? `<button class="chev ${collapsed ? '' : 'open'}" data-action="rm-toggle" data-id="${esc(it.id)}" aria-label="${collapsed ? 'Expand' : 'Collapse'}">${icon('chevron', 14)}</button>` : '<span class="chev-sp"></span>'}
          <div class="tl-txt"><b class="rm-name" role="button" tabindex="0" data-action="open-item" data-id="${esc(it.id)}" title="${esc(it.name)} — click to open (read only)">${esc(it.name)}</b><small>${esc(rangeText(it.startDate, it.endDate))}${chips.join('')}</small></div></div>
        <div class="tl-owner" title="${esc(it.owner || '')}">${owner}</div><div class="tl-pct">${pct(i.progress)}%</div><div class="tl-stat">${pill(i.status)}</div></div>
      <div class="g-track">${barHtml({ pos, progress: i.progress, cls, oc, tip: itemTip(it, i), id: it.id, chip: `${i.ownBlocked ? '⛔ ' : ''}${pct(i.progress)}%`, top: barTop, h: barH, label: it.name, note: i.ownBlocked ? (it.blocker || 'Blocked') : '' })}${fbarHtml(it, P, barTop + barH + 3, 5)}</div></div>`;
  };
  data.objectives.forEach(o => {
    if (ui.rmObj !== 'all' && ui.rmObj !== o.id) return;
    if (o.system) {
      if (!o.tasks.length) return;
      const col = ui.collapsed.has(o.id);
      body += `<div class="g-row t-r lvl-0" style="height:40px"><div class="g-lab tl"><div class="tl-name" style="padding-left:6px"><button class="chev ${col ? '' : 'open'}" data-action="rm-toggle" data-id="${esc(o.id)}" aria-label="Toggle">${icon('chevron', 14)}</button><div class="tl-txt"><b>Unassigned tasks</b><small>Not linked to an objective yet</small></div></div></div><div class="g-track"></div></div>`;
      if (col) return;
    } else { curObj = o; body += row(o, 0, 'obj', o.tasks.length > 0); }
    if (ui.collapsed.has(o.id)) return;
    o.tasks.forEach(t => {
      body += row(t, 1, 'task', t.subtasks.length > 0);
      if (ui.collapsed.has(t.id)) return;
      t.subtasks.forEach(s => { body += row(s, 2, 'sub', false); });
    });
  });
  const head = `<div class="tl tl-h"><div>Work item</div><div class="tl-owner">Owner</div><div class="tl-pct">%</div><div class="tl-stat">Status</div></div>`;
  let msOverlay = '';
  if (ui.rmMilestones && data.milestones.length) {
    msOverlay = `<div class="g-ms-line">${data.milestones.map(m => { const e = msEffective(m), l = (dayNum(m.date) - R.start + 0.5) / R.total * 100; return `<i class="ms-vline ms-${e}" style="left:${l.toFixed(3)}%;--mc:${msColour(m)}" data-tip="${esc('◆ ' + m.name + '\n' + fmtDate(m.date))}"></i>`; }).join('')}</div>`;
  }
  const note = R.extended ? `<p class="rm-note">The timeline was widened automatically because some items fall outside the project timeline.</p>` : '';
  const html = `<div class="gantt gantt-tech" style="--labelw:${labelW}px"><div class="gantt-scroll"><div class="gantt-inner">${ganttHead(R, head)}<div class="g-body">${ganttGrid(R)}${msOverlay}${body}</div></div></div></div>`;
  return html + (opts.print ? '' : note);
}

/* ---------------- Roadmap page ---------------- */
function roadmapLegend(mode) {
  const byObj = mode === 'management' ? ui.rmMgmtColor !== 'status' : ui.rmColor !== 'status';
  const items = byObj
    ? realObjs().map(o => { const c = objCol(o); return `<span class="lg" data-tip="${esc(o.name)} — strong = objective${mode === 'technical' ? ', lighter = all its tasks and subtasks' : ''}"><i class="sw" style="background:${c.c}"></i>${mode === 'technical' ? `<i class="sw" style="background:${c.l};margin-left:-5px"></i>` : ''}${esc(o.name.length > 30 ? o.name.slice(0, 29) + '…' : o.name)}</span>`; }).join('')
    : ['not-started', 'in-progress', 'completed', 'at-risk', 'blocked', 'on-hold'].map(k => `<span class="lg"><i class="dot st-${k}"></i>${k === 'blocked' ? 'Blocked / Delayed' : STATUS_LABEL[k]}</span>`).join('');
  const status = '<span class="lg" data-tip="Status is always shown as text (In progress, At risk, Blocked …) in the label column; blocked items also have a red outline and ⛔, overdue items a dashed outline.">Status: text labels, ⛔ blocked, dashed = overdue</span>';
  return `<div class="legend rm-legend">${items}<span class="lg"><i class="dia-lg"></i>Milestone in objective colour (✓ achieved, ! at risk, ✕ overdue)</span><span class="lg"><i class="xm-lg"></i>Christmas break (24 Dec – 2 Jan)</span><span class="lg"><i class="fb-lg"></i>Revised forecast</span><span class="lg"><i class="td-lg"></i>Today</span>${byObj ? status : ''}</div>`;
}
function viewRoadmap() {
  const mode = ui.rmMode;
  let h = pageHead('Roadmap', 'Generated live from your objectives, tasks and subtasks — it updates whenever anything changes.',
    btn('Print / PDF', 'print-roadmap', `data-mode="${mode}"`, '', 'print'));
  h += `<div class="toolbar wrap"><div class="seg" role="tablist"><button class="${mode === 'management' ? 'on' : ''}" data-action="rm-mode" data-mode="management" role="tab">Management view</button><button class="${mode === 'technical' ? 'on' : ''}" data-action="rm-mode" data-mode="technical" role="tab">Technical view</button></div>
    ${mode === 'management' ? `<select data-f="rmMgmtColor" aria-label="Colour bars by"><option value="objective" ${ui.rmMgmtColor !== 'status' ? 'selected' : ''}>Colour by objective</option><option value="status" ${ui.rmMgmtColor === 'status' ? 'selected' : ''}>Colour by status</option></select>` : ''}
    <label class="chk"><input type="checkbox" data-f="rmMilestones" ${ui.rmMilestones ? 'checked' : ''}> Milestones</label>
    <label class="chk"><input type="checkbox" data-f="rmForecast" ${ui.rmForecast ? 'checked' : ''}> Revised forecast</label>
    ${mode === 'technical' ? `<select data-f="rmObj" aria-label="Objective filter"><option value="all">All objectives</option>${data.objectives.map(o => `<option value="${esc(o.id)}" ${ui.rmObj === o.id ? 'selected' : ''}>${o.system ? 'Unassigned tasks' : esc(o.name)}</option>`).join('')}</select>
    <select data-f="rmColor" aria-label="Colour bars by"><option value="level" ${ui.rmColor === 'level' ? 'selected' : ''}>Colour by objective</option><option value="status" ${ui.rmColor === 'status' ? 'selected' : ''}>Colour by status</option></select>
    ${btn('Expand all', 'rm-expand', '', 'small ghost')}${btn('Collapse all', 'rm-collapse', '', 'small ghost')}` : ''}</div>`;
  h += `<div class="card rm-card">${mode === 'management' ? mgmtRoadmapHtml() : techRoadmapHtml()}${roadmapLegend(mode)}</div>`;
  if (mode === 'management') h += `<p class="muted small">Management view shows objectives and milestones only. Switch to the Technical view for tasks, subtasks, owners, dependencies and blockers.</p>`;
  return h;
}

/* ---------------- Print ---------------- */
function preparePrint(kind, mode) {
  const area = $('#printArea');
  let html, orient = 'landscape';
  if (kind === 'roadmap') {
    const p = data.project;
    html = `<div class="print-sheet"><div class="ps-head"><div><h1>${esc(p.name)}</h1><p>${mode === 'management' ? 'Programme roadmap — management view' : 'Programme roadmap — technical view'} · ${esc(rangeText(p.startDate, p.endDate))}</p></div>
      <div class="ps-meta"><b>${pct(D.totals.overall)}%</b> overall<br><small>As at ${esc(fmtDate(D.today))}</small></div></div>
      ${mode === 'management' ? mgmtRoadmapHtml({ print: true }) : techRoadmapHtml({ print: true })}${roadmapLegend(mode)}</div>`;
  } else { html = `<div class="print-sheet report-sheet">${reportBodyHtml()}</div>`; orient = 'portrait'; }
  area.innerHTML = html;
  let st = $('#pageStyle'); if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
  st.textContent = `@page{size:A4 ${orient};margin:9mm}`;
  document.body.classList.add('printing');
}
function endPrint() { document.body.classList.remove('printing'); $('#printArea').innerHTML = ''; }
function doPrint(kind, mode) {
  preparePrint(kind, mode);
  window.addEventListener('afterprint', endPrint, { once: true });
  setTimeout(() => { try { window.print(); } catch (e) { endPrint(); } }, 80);
}
function downloadReport() {
  const css = $('#reportCss').textContent;
  const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.project.name)} — Status report ${esc(todayISO())}</title><style>${css}</style></head><body class="report-page">${reportBodyHtml()}</body></html>`;
  download(stampName('Backup-DR-Status-Report', 'html'), doc, 'text/html');
}
