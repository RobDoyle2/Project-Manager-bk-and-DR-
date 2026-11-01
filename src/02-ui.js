/* =====================================================================
   UI infrastructure: icons, small components, modals, toasts, tooltips
   ===================================================================== */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.8"/><rect x="14" y="3" width="7" height="5" rx="1.8"/><rect x="14" y="12" width="7" height="9" rx="1.8"/><rect x="3" y="16" width="7" height="5" rx="1.8"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  tasks: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.5 1.5L7.5 4.5M3.5 12l1.5 1.5 2.5-3M3.5 18l1.5 1.5 2.5-3"/>',
  roadmap: '<path d="M4 6h7M8 12h12M6 18h9"/><circle cx="4" cy="6" r="0.5"/>',
  risk: '<path d="M12 3.5l10 17.5H2z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  diamond: '<path d="M12 2.5l9 9.5-9 9.5L3 12z"/>',
  report: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7M8 21v-7h8v7"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M20 5v5h-5M4 19v-5h5"/><path d="M5.5 9A7 7 0 0 1 19 10M18.5 15A7 7 0 0 1 5 14"/>'
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const pill = (st, label) => `<span class="pill st-${st}"><i></i>${esc(label || STATUS_LABEL[st] || st)}</span>`;
const prioChip = p => `<span class="prio prio-${esc(String(p).toLowerCase())}">${esc(p)}</span>`;
const idChip = id => `<span class="idchip">${esc(id)}</span>`;
const AV_COLORS = ['#5b5bd6', '#0ea5a4', '#e5484d', '#f59e0b', '#8b5cf6', '#2563eb', '#db2777', '#16a34a'];
function avatar(name, withName = true) {
  if (!name || !name.trim()) return '<span class="muted small">Unassigned</span>';
  const parts = name.trim().split(/\s+/);
  const ini = ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="avatar-wrap"><span class="avatar" style="background:${AV_COLORS[h % AV_COLORS.length]}">${esc(ini)}</span>${withName ? `<span class="av-name">${esc(name)}</span>` : ''}</span>`;
}
const pbar = (p, st) => `<div class="pbar st-${st}" role="progressbar" aria-valuenow="${pct(p)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct(p)}%"></i></div>`;
function forecastText(it) {
  if (!it.forecastStart && !it.forecastEnd) return '';
  const fs = it.forecastStart || it.startDate, fe = it.forecastEnd || it.endDate;
  const slip = dayNum(fe) - dayNum(it.endDate);
  const tag = slip > 0 ? `<span class="slip bad">+${slip}d</span>` : slip < 0 ? `<span class="slip good">${slip}d</span>` : '';
  return `<span class="fc">Forecast ${esc(rangeText(fs, fe))} ${tag}</span>`;
}
function emptyState(title, text, btnHtml = '') {
  return `<div class="empty"><div class="empty-ic">${icon('target', 30)}</div><h3>${esc(title)}</h3><p>${text}</p>${btnHtml}</div>`;
}

/* ---------- toasts ---------- */
function toast(msg, type = 'ok', ms = 3200) {
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms);
}

/* ---------- modal + confirm (native <dialog>) ---------- */
function closeModal() { const d = $('#modal'); if (d.open) d.close(); d.innerHTML = ''; }
function openModal({ title, html, saveLabel = 'Save', onSave, wide = false, hideSave = false, danger = false, cancelLabel = 'Cancel', onOpen }) {
  const dlg = $('#modal');
  dlg.innerHTML = `<form class="modal-card ${wide ? 'wide' : ''}" novalidate>
    <header><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-modal-close aria-label="Close">${icon('x')}</button></header>
    <div class="modal-body">${html}</div>
    <div class="form-error modal-err" id="formError" role="alert" hidden></div>
    <footer><button type="button" class="btn ghost" data-modal-close>${esc(cancelLabel)}</button>${hideSave ? '' : `<button type="button" data-modal-save class="btn ${danger ? 'danger' : 'primary'}">${esc(saveLabel)}</button>`}</footer></form>`;
  const form = $('form', dlg);
  // Saving is driven by button clicks / Enter, NOT by native form submission (which is blocked when the
  // page runs inside a sandboxed viewer without "allow-forms").
  const doSave = () => {
    if (!onSave) { closeModal(); return; }
    const r = onSave(form);
    $$('.invalid', form).forEach(x => x.classList.remove('invalid'));
    if (r && r.error) {
      const fe = $('#formError', dlg); fe.textContent = r.error; fe.hidden = false;
      const bad = r.field && form.elements[r.field];
      if (bad) { bad.classList.add('invalid'); bad.scrollIntoView({ block: 'center' }); try { bad.focus(); } catch (e) { /* ignore */ } }
      return;
    }
    closeModal();
  };
  form.addEventListener('submit', e => { e.preventDefault(); doSave(); });
  form.addEventListener('click', e => { if (e.target.closest('[data-modal-save]')) { e.preventDefault(); doSave(); } });
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'file' && e.target.type !== 'checkbox' && !e.isComposing) { e.preventDefault(); doSave(); } });
  if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
  // when the start date changes, the end date follows it unless the user already moved it later
  const sd = form.elements.startDate, ed = form.elements.endDate;
  if (sd && ed && sd.type === 'date') {
    let prev = sd.value;
    sd.addEventListener('change', () => { if (!ed.value || ed.value === prev || (sd.value && dayNum(ed.value) < dayNum(sd.value))) ed.value = sd.value; prev = sd.value; });
  }
  if (onOpen) onOpen(form);
  const first = $('input:not([type=hidden]):not([disabled]),select,textarea', form);
  if (first && !('ontouchstart' in window)) first.focus();
  return form;
}
function confirmDialog({ title = 'Are you sure?', message = '', html = '', okLabel = 'Confirm', danger = false }) {
  return new Promise(res => {
    const d = $('#confirm');
    d.innerHTML = `<div class="modal-card small"><header><h3>${esc(title)}</h3></header>
      <div class="modal-body"><p class="confirm-msg">${message}</p>${html}</div>
      <footer><button type="button" data-confirm="cancel" value="cancel" class="btn ghost">Cancel</button><button type="button" data-confirm="ok" value="ok" class="btn ${danger ? 'danger' : 'primary'}" autofocus>${esc(okLabel)}</button></footer></div>`;
    d.returnValue = '';
    d.addEventListener('close', () => res(d.returnValue === 'ok'), { once: true });
    d.showModal();
  });
}
function infoDialog({ title, html }) {
  return new Promise(res => {
    const d = $('#confirm');
    d.innerHTML = `<div class="modal-card"><header><h3>${esc(title)}</h3></header><div class="modal-body">${html}</div><footer><button type="button" data-confirm="ok" value="ok" class="btn primary" autofocus>OK</button></footer></div>`;
    d.addEventListener('close', () => res(), { once: true });
    d.showModal();
  });
}

/* ---------- tooltip ---------- */
function initTooltip() {
  const tip = $('#tip');
  const place = e => {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 16;
    if (x + w > window.innerWidth - 8) x = Math.max(8, e.clientX - w - 14);
    if (y + h > window.innerHeight - 8) y = Math.max(8, e.clientY - h - 14);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false; place(e);
  });
  document.addEventListener('mousemove', e => { if (!tip.hidden) place(e); });
  document.addEventListener('mouseleave', () => { tip.hidden = true; });
  document.addEventListener('scroll', () => { tip.hidden = true; }, true);
}

/* ---------- form helpers ---------- */
const fld = (label, inner, cls = '', hint = '') => `<label class="fld ${cls}"><span class="fl">${label}</span>${inner}${hint ? `<small class="hint">${hint}</small>` : ''}</label>`;
const inp = (name, val = '', attrs = '') => `<input name="${name}" value="${esc(val)}" ${attrs}>`;
const dateInp = (name, val = '', attrs = '') => `<input type="date" name="${name}" value="${esc(val)}" ${attrs}>`;
const txt = (name, val = '', rows = 3, attrs = '') => `<textarea name="${name}" rows="${rows}" ${attrs}>${esc(val)}</textarea>`;
const sel = (name, opts, val, attrs = '') => `<select name="${name}" ${attrs}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
const ownerList = () => {
  const s = new Set();
  data.objectives.forEach(o => { if (o.owner) s.add(o.owner); o.tasks.forEach(t => { if (t.owner) s.add(t.owner); t.subtasks.forEach(x => { if (x.owner) s.add(x.owner); }); }); });
  data.risks.forEach(r => { if (r.owner) s.add(r.owner); });
  if (data.project.manager) s.add(data.project.manager);
  return Array.from(s).sort((a, b) => a.localeCompare(b));
};
const ownerDatalist = () => `<datalist id="owners">${ownerList().map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
function notesBlock(notes) {
  const hist = (notes || []).slice().reverse().map(n => `<li><span class="nd">${n.date ? esc(fmtDate(n.date)) : 'Note'}</span>${esc(n.text)}</li>`).join('');
  return `<div class="fld full"><span class="fl">Notes &amp; updates</span>
    ${hist ? `<ul class="notes">${hist}</ul>` : ''}
    <textarea name="newNote" rows="2" placeholder="Add a note or progress update (dated automatically)…"></textarea></div>`;
}
function pushNote(item, text) { text = (text || '').trim(); if (text) { item.notes = item.notes || []; item.notes.push({ date: todayISO(), text }); } }
const val = (form, name) => { const el = form.elements[name]; return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
function dateWarning(start, end, pStart, pEnd, what) {
  if (!start || !end || !pStart || !pEnd) return '';
  if (dayNum(start) < dayNum(pStart) || dayNum(end) > dayNum(pEnd)) return `Note: dates fall outside the ${what}'s dates (${rangeText(pStart, pEnd)}).`;
  return '';
}

/* ---------- dependency editor (embedded in objective / task / subtask forms) ---------- */
function itemOptions(excludeId, kinds) {
  const out = [];
  if (kinds.includes('objective')) realObjs().forEach(o => out.push([o.id, `${o.id} · ${o.name}`, 'Objectives']));
  if (kinds.includes('task')) data.objectives.forEach(o => o.tasks.forEach(t => {
    out.push([t.id, `${t.id} · ${t.name}`, `Tasks — ${o.name}`]);
    t.subtasks.forEach(s => out.push([s.id, `${s.id} · ${s.name}`, `Subtasks — ${t.name}`]));
  }));
  return out.filter(x => x[0] !== excludeId);
}
function groupedSelect(name, opts, val, placeholder) {
  const groups = [];
  opts.forEach(o => { let g = groups.find(x => x.l === o[2]); if (!g) { g = { l: o[2], items: [] }; groups.push(g); } g.items.push(o); });
  return `<select name="${name}"><option value="">${esc(placeholder)}</option>${groups.map(g => `<optgroup label="${esc(g.l)}">${g.items.map(o => `<option value="${esc(o[0])}" ${o[0] === val ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
function depTargetControl(type, d, selfId) {
  if (type === 'task') return groupedSelect('dTo', itemOptions(selfId, ['task']), d.toId, 'Select task / subtask…');
  if (type === 'objective') return groupedSelect('dTo', itemOptions(selfId, ['objective']), d.toId, 'Select objective…');
  const ph = type === 'recovery' ? 'e.g. Tier-1 DR site ready' : 'e.g. Backup storage array';
  return `<input name="dTo" list="assets" value="${esc(d.assetName || '')}" placeholder="${ph}">`;
}
const assetDatalist = () => {
  const s = new Set(); data.dependencies.forEach(x => { if (x.assetName) s.add(x.assetName); });
  return `<datalist id="assets">${Array.from(s).sort().map(a => `<option value="${esc(a)}">`).join('')}</datalist>`;
};
function depRowHtml(d, selfId) {
  return `<div class="dep-row" data-dep-id="${esc(d.id || '')}">
    ${sel('dType', Object.entries(DEP_TYPES), d.type || 'task')}
    <span class="dep-target">${depTargetControl(d.type || 'task', d, selfId)}</span>
    ${sel('dStatus', DEP_STATUS.map(s => [s, cap(s)]), d.status || 'open')}
    <input name="dNote" value="${esc(d.note || '')}" placeholder="Note (optional)">
    <button type="button" class="icon-btn danger" data-action="dep-row-del" aria-label="Remove dependency">${icon('trash', 16)}</button></div>`;
}
function depEditorHtml(fromId) {
  const rows = fromId ? data.dependencies.filter(x => x.fromId === fromId) : [];
  return `<div class="fld full" data-depeditor data-self="${esc(fromId || '')}"><span class="fl">Dependencies <small class="hint inline">(what this item depends on — tasks, objectives, assets or recovery capabilities)</small></span>
    <div class="dep-list">${rows.map(r => depRowHtml(r, fromId)).join('')}</div>
    <button type="button" class="btn small ghost" data-action="dep-row-add">${icon('plus', 14)} Add dependency</button>${assetDatalist()}</div>`;
}
function collectDeps(form) {
  const out = [];
  let err = '';
  $$('.dep-row', form).forEach(r => {
    const type = $('[name=dType]', r).value, to = $('[name=dTo]', r).value.trim();
    if (!to) { err = 'Each dependency needs a target — choose one or remove the empty row.'; return; }
    const d = { id: r.dataset.depId || '', type, toId: '', assetName: '', note: $('[name=dNote]', r).value.trim(), status: $('[name=dStatus]', r).value };
    if (type === 'task' || type === 'objective') d.toId = to; else d.assetName = to;
    out.push(d);
  });
  return { list: out, error: err };
}
function applyDeps(fromId, list) {
  const keep = data.dependencies.filter(x => x.fromId !== fromId);
  const old = new Map(data.dependencies.filter(x => x.fromId === fromId).map(x => [x.id, x]));
  const mine = list.map(d => ({ id: d.id && old.has(d.id) ? d.id : nextId('dependency'), type: d.type, fromId, toId: d.toId, assetName: d.assetName, note: d.note, status: d.status }));
  data.dependencies = keep.concat(mine);
}

/* ---------- generic delegated handlers for modal inner widgets ---------- */
document.addEventListener('click', e => {
  const c = e.target.closest('[data-confirm]');
  if (c) { const d = $('#confirm'); d.returnValue = c.dataset.confirm; d.close(c.dataset.confirm); }
});
let downOnBackdrop = false;
document.addEventListener('mousedown', e => { downOnBackdrop = e.target === $('#modal'); });
document.addEventListener('click', e => {
  const t = e.target.closest('[data-modal-close]');
  if (t) { e.preventDefault(); closeModal(); return; }
  // close only on a genuine click on the backdrop (not a drag that started inside the form)
  if (e.target === $('#modal') && downOnBackdrop) closeModal();
});
document.addEventListener('change', e => {
  const sel = e.target;
  if (sel.name === 'dType') {
    const row = sel.closest('.dep-row') || sel.closest('form'), editor = sel.closest('[data-depeditor]');
    $('.dep-target', row).innerHTML = depTargetControl(sel.value, {}, editor ? editor.dataset.self : (row.dataset.self || ''));
  }
});
