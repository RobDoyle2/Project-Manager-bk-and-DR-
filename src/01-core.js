/* =====================================================================
   Programme Manager — core: constants, dates, data model,
   validation, central progress engine, persistence
   ===================================================================== */
const SCHEMA_VERSION = 1;
const APP_ID = 'backup-dr-project';
const APP_VERSION = '1.4.3';
const LS_KEY = 'backupdr.project.v1';
const LS_BACKUPS = 'backupdr.backups.v1';
const LS_UI = 'backupdr.ui.v1';
const PREFIX = { objective: 'OBJ', task: 'TSK', subtask: 'SUB', risk: 'RSK', dependency: 'DEP', milestone: 'MS' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map(m => m.slice(0, 3));
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const LEAF_STATUSES = ['not-started', 'in-progress', 'at-risk', 'on-hold', 'completed'];
const FLAG_STATUSES = ['at-risk', 'on-hold'];
const STATUS_LABEL = {
  'not-started': 'Not started', 'in-progress': 'In progress', 'completed': 'Completed',
  'at-risk': 'At risk', 'blocked': 'Blocked', 'delayed': 'Delayed', 'on-hold': 'On hold'
};
const STATUS_ORDER = ['not-started', 'in-progress', 'completed', 'at-risk', 'blocked', 'delayed', 'on-hold'];
const RISK_STATUS = ['open', 'mitigating', 'accepted', 'closed'];
const MS_STATUS = ['planned', 'at-risk', 'achieved'];
const DEP_TYPES = { task: 'Task dependency', objective: 'Objective dependency', asset: 'Asset dependency', recovery: 'Recovery dependency' };
const DEP_STATUS = ['open', 'at-risk', 'satisfied'];
const IMPACT = ['Very low', 'Low', 'Medium', 'High', 'Very high'];
const LIKELIHOOD = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
const DAY = 86400000;

/* Objective colour identity: one strong colour per objective, one lighter shade for ALL its tasks/subtasks. */
const PALETTE = [
  { n: 'Emerald Green', c: '#006B5B', l: '#C0DDD6' }, { n: 'Royal Blue', c: '#315DA8', l: '#C6D3E9' },
  { n: 'Deep Purple', c: '#65449A', l: '#D3C7E5' }, { n: 'Burnt Orange', c: '#C45B32', l: '#EED0C1' },
  { n: 'Teal', c: '#147E91', l: '#C0DDE1' }, { n: 'Ochre Gold', c: '#A17A20', l: '#E8DDBB' },
  { n: 'Slate Blue', c: '#526B82', l: '#C9D4DC' }, { n: 'Berry', c: '#963E60', l: '#E6C6D2' },
  // extension for programmes with more than eight objectives
  { n: 'Forest Olive', c: '#5A7D2A', l: '#D6E2BE' }, { n: 'Plum', c: '#8B2F86', l: '#E6C9E4' },
  { n: 'Coffee Brown', c: '#7A5230', l: '#E2D3C5' }, { n: 'Crimson', c: '#B1333F', l: '#F0CDD1' },
  { n: 'Sage Green', c: '#5F8A63', l: '#D1E1D3' }, { n: 'Charcoal', c: '#4B5563', l: '#D1D5DB' }
];
const SYS_COL = { n: 'Unassigned', c: '#64748B', l: '#E2E8F0' };
function hexHSL(h) {
  const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hue = 0;
  if (d) hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (hue * 60 + 360) % 360, l, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0 };
}
function similarCol(a, b) {
  const x = hexHSL(a.c), y = hexHSL(b.c);
  const dh = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h));
  return dh < 26 && Math.abs(x.l - y.l) < 0.18 && x.s > 0.15 && y.s > 0.15;
}
const validCI = v => Number.isInteger(v) && v >= 0;
/* ---- links attached to objectives / tasks / subtasks: [{name, url}] ---- */
const BAD_SCHEME = /^\s*(javascript|data|vbscript):/i;
function normLink(url) {
  url = String(url || '').trim();
  if (!url || BAD_SCHEME.test(url)) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('\\\\') && !url.startsWith('/') && /^[^\s]+\.[^\s]+$/.test(url)) return 'https://' + url;   // www.example.com -> https://...
  return url;
}
const linkHref = u => /^(https?:|mailto:|ftp:|file:)/i.test(u) ? u : null;
function linkLabel(l) {
  if (l.name && l.name.trim()) return l.name.trim();
  try { return new URL(l.url).hostname || l.url; } catch (e) { return l.url; }
}
function objCol(o) { return (!o || o.system) ? SYS_COL : PALETTE[(validCI(o.colorIndex) ? o.colorIndex : 0) % PALETTE.length]; }
/* Give every objective that has no colour the next unused palette slot (avoiding a look-alike of its neighbour).
   Existing assignments are never changed, so deleting or reordering objectives cannot recolour the rest. */
function assignColours(d = data) {
  const real = d.objectives.filter(o => !o.system);
  const used = new Set(real.filter(o => validCI(o.colorIndex)).map(o => o.colorIndex));
  let prev = null;
  real.forEach(o => {
    if (!validCI(o.colorIndex)) {
      const cand = [];
      for (let i = 0; cand.length < PALETTE.length; i++) if (!used.has(i)) cand.push(i);
      const pick = cand.find(i => !prev || !similarCol(PALETTE[i % PALETTE.length], prev));
      o.colorIndex = pick !== undefined ? pick : cand[0];
      used.add(o.colorIndex);
    }
    prev = PALETTE[o.colorIndex % PALETTE.length];
  });
}

/* ---------- date helpers (ISO strings only; no local-time parsing) ---------- */
const pad2 = n => String(n).padStart(2, '0');
function parseISO(s) {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, mo, d, t };
}
function dayNum(s) { const p = parseISO(s); return p ? Math.round(p.t / DAY) : null; }
function isoFromDayNum(n) { const dt = new Date(n * DAY); return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`; }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtDate(s) { const p = parseISO(s); return p ? `${p.d} ${MON[p.mo - 1]} ${p.y}` : '—'; }
function fmtShort(s) { const p = parseISO(s); return p ? `${p.d} ${MON[p.mo - 1]}` : '—'; }
function rangeText(a, b) {
  const p = parseISO(a), q = parseISO(b);
  if (!p || !q) return '—';
  return p.y === q.y ? `${fmtShort(a)} – ${fmtShort(b)} ${q.y}` : `${fmtDate(a)} – ${fmtDate(b)}`;
}
function fmtStamp(date) { return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`; }
function fmtDateTime(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (isNaN(d)) return 'never';
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* ---------- misc helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp01 = v => { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
function pct(p) { if (p >= 100) return 100; let r = Math.round(p); if (r >= 100) r = 99; if (p > 0 && r === 0) r = 1; return r; }
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* ---------- data model ---------- */
function blankProject() {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    app: APP_ID,
    project: { id: 'PRJ-001', name: '', description: '', manager: '', startDate: '2026-10-01', endDate: '2027-06-30' },
    counters: { objective: 0, task: 0, subtask: 0, risk: 0, dependency: 0, milestone: 0 },
    objectives: [], risks: [], dependencies: [], milestones: [],
    meta: { createdAt: now, modifiedAt: now, lastExportedAt: null }
  };
}
let data = blankProject();
let D = null;     // derived values (progress, status, totals) — recalculated from `data` on every change
let IDX = null;   // id lookup indexes
const SYS_ID = 'OBJ-000';   // hidden bucket for tasks that are not linked to an objective yet
const realObjs = () => data.objectives.filter(o => !o.system);
function ensureUnassigned() {
  let o = data.objectives.find(x => x.system);
  if (!o) {
    o = { id: SYS_ID, system: true, name: 'Unassigned tasks', description: 'Tasks not yet linked to an objective', owner: '', priority: 'Medium', startDate: data.project.startDate, endDate: data.project.endDate, forecastStart: '', forecastEnd: '', status: 'auto', progress: 0, blocked: false, blocker: '', notes: [], tasks: [] };
    data.objectives.unshift(o);
  }
  return o;
}

function allIds(d = data) {
  const s = new Set();
  d.objectives.forEach(o => { s.add(o.id); o.tasks.forEach(t => { s.add(t.id); t.subtasks.forEach(x => s.add(x.id)); }); });
  d.risks.forEach(x => s.add(x.id)); d.dependencies.forEach(x => s.add(x.id)); d.milestones.forEach(x => s.add(x.id));
  return s;
}
function nextId(kind) {
  const used = allIds();
  let n = data.counters[kind] || 0, id;
  do { n++; id = `${PREFIX[kind]}-${String(n).padStart(3, '0')}`; } while (used.has(id));
  data.counters[kind] = n;
  return id;
}

/* Keep stored status/progress fields internally consistent. */
function syncLeaf(x) {
  x.progress = Math.round(clamp01(x.progress));
  if (x.status === 'completed') x.progress = 100;
  if (x.progress >= 100) { x.progress = 100; x.status = 'completed'; }
  else if (x.status === 'completed' || x.status === 'auto' || !LEAF_STATUSES.includes(x.status)) x.status = x.progress > 0 ? 'in-progress' : 'not-started';
  else if (x.status === 'not-started' && x.progress > 0) x.status = 'in-progress';
}
function syncStored(d = data) {
  assignColours(d);
  d.objectives.forEach(o => {
    o.tasks.forEach(t => {
      t.subtasks.forEach(syncLeaf);
      if (t.subtasks.length) { if (!FLAG_STATUSES.includes(t.status)) t.status = 'auto'; }
      else syncLeaf(t);
    });
    if (!FLAG_STATUSES.includes(o.status)) o.status = 'auto';
  });
}

/* =====================================================================
   Validation / normalisation of imported JSON
   ===================================================================== */
function parseProject(raw) {
  const errors = [], warnings = [];
  const E = m => errors.push(m), W = m => warnings.push(m);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { E('The file does not contain a JSON object.'); return { errors, warnings }; }
  if (typeof raw.schemaVersion !== 'number' || !isFinite(raw.schemaVersion)) E('Missing or invalid "schemaVersion" (expected a number).');
  else if (raw.schemaVersion > SCHEMA_VERSION) E(`The file uses schema version ${raw.schemaVersion}, which is newer than this application supports (${SCHEMA_VERSION}). Please use a newer version of the application.`);
  else if (raw.schemaVersion < 1) E('Invalid "schemaVersion" (must be 1 or greater).');
  if (raw.app && raw.app !== APP_ID) W(`The file's "app" value is "${raw.app}" (expected "${APP_ID}").`);
  if (!raw.project || typeof raw.project !== 'object' || Array.isArray(raw.project)) E('Missing "project" object.');
  if (!Array.isArray(raw.objectives)) E('"objectives" must be an array.');
  ['risks', 'dependencies', 'milestones'].forEach(k => { if (raw[k] !== undefined && !Array.isArray(raw[k])) E(`"${k}" must be an array.`); });
  if (errors.length) return { errors, warnings };

  const out = blankProject();
  const str = (v, def = '') => typeof v === 'string' ? v : (v == null ? def : String(v));
  const chkDate = (v, label, required) => {
    if (v == null || v === '') { if (required) E(`${label}: a date is required.`); return ''; }
    if (!parseISO(v)) { E(`${label}: "${v}" is not a valid ISO date (YYYY-MM-DD).`); return ''; }
    return v;
  };
  const chkRange = (s, e, label) => { if (s && e && dayNum(e) < dayNum(s)) E(`${label}: end date ${e} is before start date ${s}.`); };
  const chkEnum = (v, list, def, label) => { if (list.includes(v)) return v; if (v != null && v !== '') W(`${label}: unknown value "${v}", using "${def}".`); return def; };
  const chkProg = (v, label) => {
    if (v == null || v === '') return 0;
    const n = Number(v);
    if (!isFinite(n)) { W(`${label}: invalid progress "${v}", set to 0.`); return 0; }
    if (n < 0 || n > 100) W(`${label}: progress ${n} is outside 0–100 and was clamped.`);
    return clamp01(n);
  };
  const linksOf = (v, label) => {
    if (v == null) return [];
    if (!Array.isArray(v)) { W(`${label}: "links" should be an array, ignored.`); return []; }
    const out = [];
    v.forEach(l => {
      if (!l || typeof l !== 'object' || typeof l.url !== 'string' || !l.url.trim()) { W(`${label}: a link without a web address was skipped.`); return; }
      const url = normLink(l.url);
      if (!url) { W(`${label}: a link with a disallowed address type was skipped.`); return; }
      out.push({ name: typeof l.name === 'string' ? l.name.trim() : '', url });
    });
    return out;
  };
  const notesOf = (v, label) => {
    if (v == null) return [];
    if (typeof v === 'string') return v.trim() ? [{ date: '', text: v }] : [];
    if (!Array.isArray(v)) { W(`${label}: "notes" should be an array, ignored.`); return []; }
    return v.filter(n => n && typeof n.text === 'string' && n.text.trim()).map(n => ({ date: parseISO(n.date) ? n.date : '', text: n.text }));
  };

  // Pass 1: collect explicit IDs and detect duplicates
  const seen = new Set();
  const regId = (id, label) => {
    if (typeof id !== 'string' || !id.trim()) return false;
    if (seen.has(id.trim())) E(`Duplicate ID "${id}" (${label}).`);
    seen.add(id.trim());
    return true;
  };
  (raw.objectives || []).forEach((o, i) => {
    if (!o || typeof o !== 'object') return;
    regId(o.id, `objective #${i + 1}`);
    (Array.isArray(o.tasks) ? o.tasks : []).forEach((t, j) => {
      if (!t || typeof t !== 'object') return;
      regId(t.id, `task #${j + 1} of objective #${i + 1}`);
      (Array.isArray(t.subtasks) ? t.subtasks : []).forEach((s, k) => { if (s && typeof s === 'object') regId(s.id, `subtask #${k + 1}`); });
    });
  });
  ['risks', 'dependencies', 'milestones'].forEach(k => (raw[k] || []).forEach((x, i) => { if (x && typeof x === 'object') regId(x.id, `${k} #${i + 1}`); }));
  const genCounters = {};
  const gen = kind => {
    let n = genCounters[kind] || 0, id;
    do { n++; id = `${PREFIX[kind]}-${String(n).padStart(3, '0')}`; } while (seen.has(id));
    genCounters[kind] = n; seen.add(id);
    W(`A record had no ID; "${id}" was generated.`);
    return id;
  };
  const idOf = (v, kind) => (typeof v === 'string' && v.trim()) ? v.trim() : gen(kind);

  // project
  const p = raw.project;
  out.project = {
    id: str(p.id, 'PRJ-001') || 'PRJ-001',
    name: str(p.name, '').trim(),
    description: str(p.description), manager: str(p.manager),
    startDate: chkDate(p.startDate || '2026-10-01', 'Project start date', true),
    endDate: chkDate(p.endDate || '2027-06-30', 'Project end date', true)
  };
  chkRange(out.project.startDate, out.project.endDate, 'Project');

  const common = (s, label, hasKids) => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) { E(`${label}: must be an object.`); return null; }
    const name = str(s.name).trim();
    if (!name) E(`${label}: name is required.`);
    const startDate = chkDate(s.startDate, `${label} start date`, true);
    const endDate = chkDate(s.endDate, `${label} end date`, true);
    chkRange(startDate, endDate, label);
    const forecastStart = chkDate(s.forecastStart, `${label} forecast start`, false);
    const forecastEnd = chkDate(s.forecastEnd, `${label} forecast end`, false);
    chkRange(forecastStart || startDate, forecastEnd || endDate, `${label} forecast`);
    let status = s.status, blocked = s.blocked === true;
    if (status === 'blocked') { blocked = true; status = null; }
    if (status === 'delayed') status = null;
    let progress = chkProg(s.progress, label);
    if (hasKids) status = FLAG_STATUSES.includes(status) ? status : 'auto';
    else {
      if (status != null && status !== '' && status !== 'auto' && !LEAF_STATUSES.includes(status)) W(`${label}: unknown status "${status}", derived from progress.`);
      if (status === 'completed' && progress < 100) { W(`${label}: status "completed" but progress ${progress}%; progress set to 100.`); }
      status = LEAF_STATUSES.includes(status) ? status : (progress > 0 ? 'in-progress' : 'not-started');
    }
    return {
      name, description: str(s.description), owner: str(s.owner),
      priority: chkEnum(s.priority, PRIORITIES, 'Medium', `${label} priority`),
      startDate, endDate, forecastStart, forecastEnd, status, progress, blocked, blocker: blocked ? str(s.blocker) : str(s.blocker),
      notes: notesOf(s.notes, label),
      links: linksOf(s.links, label)
    };
  };

  raw.objectives.forEach((o, i) => {
    const lab = `Objective #${i + 1}${o && o.name ? ` "${o.name}"` : ''}`;
    if (o && Array.isArray(o.tasks) === false && o.tasks !== undefined) E(`${lab}: "tasks" must be an array.`);
    const base = common(o, lab, true);
    if (!base) return;
    const obj = { id: idOf(o.id, 'objective'), ...(o.system === true ? { system: true } : (validCI(o.colorIndex) ? { colorIndex: o.colorIndex } : {})), ...base, tasks: [] };
    (Array.isArray(o.tasks) ? o.tasks : []).forEach((t, j) => {
      const tl = `${lab} › Task #${j + 1}${t && t.name ? ` "${t.name}"` : ''}`;
      if (t && t.subtasks !== undefined && !Array.isArray(t.subtasks)) E(`${tl}: "subtasks" must be an array.`);
      const hasSubs = !!(t && Array.isArray(t.subtasks) && t.subtasks.length);
      const tb = common(t, tl, hasSubs);
      if (!tb) return;
      const task = { id: idOf(t.id, 'task'), ...tb, subtasks: [] };
      (hasSubs ? t.subtasks : []).forEach((s, k) => {
        const sl = `${tl} › Subtask #${k + 1}${s && s.name ? ` "${s.name}"` : ''}`;
        const sb = common(s, sl, false);
        if (!sb) return;
        task.subtasks.push({ id: idOf(s.id, 'subtask'), ...sb });
      });
      obj.tasks.push(task);
    });
    out.objectives.push(obj);
  });

  // reference lookup for the relational records
  const kindOf = new Map();
  out.objectives.forEach(o => { kindOf.set(o.id, 'objective'); o.tasks.forEach(t => { kindOf.set(t.id, 'task'); t.subtasks.forEach(s => kindOf.set(s.id, 'subtask')); }); });

  (raw.risks || []).forEach((r, i) => {
    const lab = `Risk #${i + 1}`;
    if (!r || typeof r !== 'object') { E(`${lab}: must be an object.`); return; }
    const description = str(r.description).trim();
    if (!description) E(`${lab}: description is required.`);
    const num = (v, l) => { const n = Math.round(Number(v)); if (!isFinite(n) || n < 1 || n > 5) { W(`${lab}: ${l} should be 1–5, using 3.`); return 3; } return n; };
    let rel = str(r.relatedId);
    if (rel && !kindOf.has(rel)) { W(`${lab}: related item "${rel}" not found; link removed.`); rel = ''; }
    out.risks.push({
      id: idOf(r.id, 'risk'), description, impact: num(r.impact, 'impact'), likelihood: num(r.likelihood, 'likelihood'),
      owner: str(r.owner), mitigation: str(r.mitigation), status: chkEnum(r.status, RISK_STATUS, 'open', `${lab} status`), relatedId: rel
    });
  });
  (raw.milestones || []).forEach((m, i) => {
    const lab = `Milestone #${i + 1}`;
    if (!m || typeof m !== 'object') { E(`${lab}: must be an object.`); return; }
    const name = str(m.name).trim();
    if (!name) E(`${lab}: name is required.`);
    const date = chkDate(m.date, `${lab} date`, true);
    let ob = str(m.objectiveId);
    if (ob && kindOf.get(ob) !== 'objective') { W(`${lab}: objective "${ob}" not found; link removed.`); ob = ''; }
    out.milestones.push({ id: idOf(m.id, 'milestone'), name, description: str(m.description), date, objectiveId: ob, status: chkEnum(m.status, MS_STATUS, 'planned', `${lab} status`) });
  });
  (raw.dependencies || []).forEach((d, i) => {
    const lab = `Dependency #${i + 1}`;
    if (!d || typeof d !== 'object') { E(`${lab}: must be an object.`); return; }
    const type = chkEnum(d.type, Object.keys(DEP_TYPES), 'task', `${lab} type`);
    if (!kindOf.has(d.fromId)) { W(`${lab}: dependent item "${d.fromId}" not found; dependency skipped.`); return; }
    const dep = { id: idOf(d.id, 'dependency'), type, fromId: d.fromId, toId: '', assetName: '', note: str(d.note), status: chkEnum(d.status, DEP_STATUS, 'open', `${lab} status`) };
    if (type === 'task' || type === 'objective') {
      const k = kindOf.get(d.toId);
      if (!k || (type === 'objective' ? k !== 'objective' : k === 'objective')) { W(`${lab}: target "${d.toId}" not found or wrong kind; dependency skipped.`); return; }
      if (d.toId === d.fromId) { W(`${lab}: an item cannot depend on itself; skipped.`); return; }
      dep.toId = d.toId;
    } else {
      dep.assetName = str(d.assetName).trim();
      if (!dep.assetName) { W(`${lab}: asset / recovery name is missing; dependency skipped.`); return; }
    }
    out.dependencies.push(dep);
  });

  // meta + counters
  const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  out.meta = { createdAt: str(meta.createdAt) || out.meta.createdAt, modifiedAt: str(meta.modifiedAt) || out.meta.modifiedAt, lastExportedAt: meta.lastExportedAt || null };
  Object.keys(PREFIX).forEach(k => {
    let max = Number(raw.counters && raw.counters[k]) || 0;
    allIds(out).forEach(id => { const m = new RegExp('^' + PREFIX[k] + '-(\\d+)$').exec(id); if (m) max = Math.max(max, +m[1]); });
    out.counters[k] = max;
  });
  syncStored(out);
  return { errors, warnings, data: out };
}

/* =====================================================================
   CENTRAL PROGRESS ENGINE
   Everything the UI shows (progress, status, dashboard counts, roadmap)
   is derived here from `data`. Nothing derived is edited by hand.
   Rules: subtask = manual; task = manual (no subtasks) or mean of its
   subtasks; objective = mean of its top-level tasks; programme = mean of
   objectives (subtasks are never counted separately => no double counting).
   ===================================================================== */
function statusOf(o) {
  // o: {done, ownBlocked, childBlocked, overdue, flagRisk, childRisk, flagHold, progress, flagProg, childStarted}
  if (o.done) return 'completed';
  if (o.ownBlocked || o.childBlocked) return 'blocked';
  if (o.flagHold) return 'on-hold';
  if (o.overdue) return 'delayed';
  if (o.flagRisk || o.childRisk) return 'at-risk';
  if (o.progress > 0 || o.flagProg || o.childStarted) return 'in-progress';
  return 'not-started';
}
function derive() {
  const today = todayISO(), T = dayNum(today);
  const d = { today, T, obj: new Map(), task: new Map(), sub: new Map(), node: new Map(), depsFrom: new Map(), depsTo: new Map(), cycle: new Set(), conflicts: new Set(), blockedItems: [], overdueItems: [], totals: null };
  const idx = { objective: new Map(), task: new Map(), sub: new Map() };
  const endOf = it => dayNum(it.forecastEnd || it.endDate);
  const isLate = (it, done) => { const e = endOf(it); return !done && e !== null && e < T; };
  const base = (it, kind) => ({ id: it.id, kind, item: it });

  data.objectives.forEach(o => {
    idx.objective.set(o.id, { item: o });
    const tInfos = [];
    o.tasks.forEach(t => {
      idx.task.set(t.id, { item: t, obj: o });
      const sInfos = [];
      t.subtasks.forEach(s => {
        idx.sub.set(s.id, { item: s, task: t, obj: o });
        const p = clamp01(s.progress), done = p >= 100;
        const ownBlocked = !done && s.blocked === true;
        const overdue = isLate(s, done);
        const info = {
          ...base(s, 'sub'), leaf: true, progress: done ? 100 : p, done, overdue, ownBlocked,
          started: !done && (p > 0 || s.status === 'in-progress')
        };
        info.status = statusOf({ done, ownBlocked, overdue, flagRisk: s.status === 'at-risk', flagHold: s.status === 'on-hold', progress: p, flagProg: s.status === 'in-progress' });
        info.blocked = info.status === 'blocked';
        d.sub.set(s.id, info); d.node.set(s.id, info); sInfos.push(info);
        if (ownBlocked) d.blockedItems.push({ id: s.id, kind: 'sub', name: s.name, blocker: s.blocker, owner: s.owner, parent: t.name, objective: o.name });
        if (overdue) d.overdueItems.push(info);
      });
      const leaf = sInfos.length === 0;
      let p = leaf ? clamp01(t.progress) : avg(sInfos.map(x => x.progress));
      const done = leaf ? p >= 100 : sInfos.every(x => x.done);
      if (done) p = 100;
      const ownBlocked = !done && t.blocked === true;
      const overdue = isLate(t, done);
      const info = {
        ...base(t, 'task'), leaf, progress: p, done, overdue, ownBlocked, subCount: sInfos.length, subDone: sInfos.filter(x => x.done).length,
        started: !done && (p > 0 || t.status === 'in-progress' || sInfos.some(x => x.started || x.done))
      };
      info.status = statusOf({
        done, ownBlocked, childBlocked: sInfos.some(x => x.blocked), overdue, flagRisk: t.status === 'at-risk',
        childRisk: sInfos.some(x => x.status === 'at-risk' || x.status === 'delayed'), flagHold: t.status === 'on-hold',
        progress: p, flagProg: t.status === 'in-progress', childStarted: info.started
      });
      info.blocked = info.status === 'blocked';
      d.task.set(t.id, info); d.node.set(t.id, info); tInfos.push(info);
      if (ownBlocked) d.blockedItems.push({ id: t.id, kind: 'task', name: t.name, blocker: t.blocker, owner: t.owner, parent: o.name, objective: o.name });
      if (overdue) d.overdueItems.push(info);
    });
    const p = avg(tInfos.map(x => x.progress));
    const done = tInfos.length > 0 && tInfos.every(x => x.done);
    const ownBlocked = !done && o.blocked === true;
    const overdue = isLate(o, done);
    const info = {
      ...base(o, 'obj'), progress: done ? 100 : p, done, overdue, ownBlocked,
      taskCount: tInfos.length, taskDone: tInfos.filter(x => x.done).length, taskBlocked: tInfos.filter(x => x.blocked).length,
      subCount: tInfos.reduce((a, x) => a + x.subCount, 0), started: !done && (p > 0 || tInfos.some(x => x.started))
    };
    info.status = statusOf({
      done, ownBlocked, childBlocked: tInfos.some(x => x.blocked), overdue, flagRisk: o.status === 'at-risk',
      childRisk: tInfos.some(x => x.status === 'at-risk' || x.status === 'delayed'), flagHold: o.status === 'on-hold',
      progress: info.progress, childStarted: info.started
    });
    info.blocked = info.status === 'blocked';
    d.obj.set(o.id, info); d.node.set(o.id, info);
    if (ownBlocked) d.blockedItems.push({ id: o.id, kind: 'obj', name: o.name, blocker: o.blocker, owner: o.owner, parent: '', objective: o.name });
  });

  // dependencies
  data.dependencies.forEach(x => {
    if (!d.depsFrom.has(x.fromId)) d.depsFrom.set(x.fromId, []);
    d.depsFrom.get(x.fromId).push(x);
    if (x.toId) { if (!d.depsTo.has(x.toId)) d.depsTo.set(x.toId, []); d.depsTo.get(x.toId).push(x); }
  });
  // scheduling conflicts: dependent starts before the thing it depends on has finished
  data.dependencies.forEach(x => {
    if (!x.toId || x.status === 'satisfied') return;
    const a = d.node.get(x.fromId), b = d.node.get(x.toId);
    if (!a || !b || b.done) return;
    const s = dayNum(a.item.forecastStart || a.item.startDate), e = endOf(b.item);
    if (s !== null && e !== null && s <= e) d.conflicts.add(x.id);
  });
  // circular dependencies
  const state = new Map();
  const visit = (id, path) => {
    state.set(id, 1); path.push(id);
    for (const x of (d.depsFrom.get(id) || [])) {
      if (!x.toId) continue;
      if (state.get(x.toId) === 1) { path.slice(path.indexOf(x.toId)).forEach(i => d.cycle.add(i)); }
      else if (!state.has(x.toId)) visit(x.toId, path);
    }
    path.pop(); state.set(id, 2);
  };
  Array.from(d.node.keys()).forEach(id => { if (!state.has(id)) visit(id, []); });

  // totals
  const tasks = Array.from(d.task.values()), objs = Array.from(d.obj.values()).filter(x => !x.item.system);
  const byObj = {};
  STATUS_ORDER.forEach(k => byObj[k] = 0);
  objs.forEach(x => byObj[x.status]++);
  d.totals = {
    objectives: objs.length, tasks: tasks.length, subtasks: d.sub.size,
    tasksDone: tasks.filter(x => x.done).length, tasksStarted: tasks.filter(x => x.started).length,
    tasksBlocked: tasks.filter(x => x.blocked).length, tasksOverdue: tasks.filter(x => x.overdue).length,
    tasksNotStarted: tasks.filter(x => !x.done && !x.started).length,
    byObjStatus: byObj, overall: avg(objs.map(x => x.progress))
  };
  d.idx = idx;
  IDX = idx;
  return d;
}
const nodeInfo = id => D.node.get(id);
function nameOf(id) {
  if (!id) return '';
  const n = D && D.node.get(id);
  return n ? n.item.name : id;
}
function objColById(id) {
  if (!id || !IDX) return null;
  if (IDX.objective.has(id)) return objCol(IDX.objective.get(id).item);
  if (IDX.task.has(id)) return objCol(IDX.task.get(id).obj);
  if (IDX.sub.has(id)) return objCol(IDX.sub.get(id).obj);
  return null;
}
function msColour(m) { const c = m.objectiveId && objColById(m.objectiveId); return c ? c.c : '#374151'; }
function kindLabel(id) {
  const n = D && D.node.get(id);
  return n ? ({ obj: 'Objective', task: 'Task', sub: 'Subtask' })[n.kind] : '';
}

/* ---------- mutation helpers ---------- */
function removeWorkItems(ids) {
  const set = new Set(ids);
  data.dependencies = data.dependencies.filter(x => !set.has(x.fromId) && !set.has(x.toId));
  data.risks.forEach(r => { if (set.has(r.relatedId)) r.relatedId = ''; });
  data.milestones.forEach(m => { if (set.has(m.objectiveId)) m.objectiveId = ''; });
}
function deleteObjective(id) {
  const o = IDX.objective.get(id).item, ids = [o.id];
  o.tasks.forEach(t => { ids.push(t.id); t.subtasks.forEach(s => ids.push(s.id)); });
  data.objectives = data.objectives.filter(x => x.id !== id);
  removeWorkItems(ids);
}
function deleteTask(id) {
  const r = IDX.task.get(id), ids = [id];
  r.item.subtasks.forEach(s => ids.push(s.id));
  r.obj.tasks = r.obj.tasks.filter(x => x.id !== id);
  removeWorkItems(ids);
}
function deleteSub(id) {
  const r = IDX.sub.get(id);
  r.task.subtasks = r.task.subtasks.filter(x => x.id !== id);
  removeWorkItems([id]);
}
function setLeafProgress(item, v) {
  item.progress = Math.round(clamp01(v));
  if (item.progress >= 100) item.status = 'completed';
  else if (item.status === 'completed') item.status = item.progress > 0 ? 'in-progress' : 'not-started';
  else if (item.progress > 0 && item.status === 'not-started') item.status = 'in-progress';
}

/* =====================================================================
   Persistence: autosave, backups, export / import
   ===================================================================== */
const ui = {
  view: 'dashboard', rmMode: 'management', rmColor: 'level', rmMgmtColor: 'objective', rmObj: 'all', rmMilestones: true, rmForecast: true,
  collapsed: new Set(), objOpen: new Set(),
  objFilter: { q: '', status: 'all' },
  taskFilter: { q: '', obj: 'all', status: 'all', owner: 'all', blockedOnly: false, hideDone: false },
  riskTab: 'risks', depTab: 'register', saveState: 'idle', lastSaved: null, storageOk: true
};
let saveTimer = null;

function computedFields() {
  D = derive();
  data.objectives.forEach(o => {
    const oi = D.obj.get(o.id); o.computedProgress = Math.round(oi.progress * 10) / 10; o.computedStatus = oi.status;
    o.tasks.forEach(t => {
      const ti = D.task.get(t.id); t.computedProgress = Math.round(ti.progress * 10) / 10; t.computedStatus = ti.status;
      if (t.subtasks.length) t.progress = Math.round(ti.progress);
      t.subtasks.forEach(s => { const si = D.sub.get(s.id); s.computedProgress = si.progress; s.computedStatus = si.status; });
    });
  });
}
function saveLocal() {
  clearTimeout(saveTimer); saveTimer = null;
  try {
    computedFields();
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    ui.saveState = 'saved'; ui.lastSaved = new Date(); ui.storageOk = true;
  } catch (e) { ui.saveState = 'error'; ui.storageOk = false; }
  updateSaveChip();
  return ui.saveState === 'saved';
}
function scheduleSave() {
  ui.saveState = 'pending'; updateSaveChip();
  clearTimeout(saveTimer); saveTimer = setTimeout(saveLocal, 350);
}
function countsOf(d) {
  let t = 0, s = 0;
  d.objectives.forEach(o => { t += o.tasks.length; o.tasks.forEach(x => s += x.subtasks.length); });
  return { objectives: d.objectives.filter(o => !o.system).length, tasks: t, subtasks: s, risks: d.risks.length, milestones: d.milestones.length, dependencies: d.dependencies.length };
}
function readBackups() { try { return JSON.parse(localStorage.getItem(LS_BACKUPS) || '[]'); } catch (e) { return []; } }
function snapshot(reason) {
  try {
    computedFields();
    let list = readBackups();
    const c = countsOf(data);
    list.unshift({ at: new Date().toISOString(), reason, name: data.project.name, counts: c, json: JSON.stringify(data) });
    list = list.slice(0, 8);
    for (;;) {
      try { localStorage.setItem(LS_BACKUPS, JSON.stringify(list)); break; }
      catch (e) { if (list.length <= 1) throw e; list.pop(); }
    }
    return true;
  } catch (e) { return false; }
}
function loadLocal() {
  let raw = null;
  try { raw = localStorage.getItem(LS_KEY); } catch (e) { ui.storageOk = false; return { status: 'unavailable' }; }
  if (!raw) return { status: 'empty' };
  try {
    const r = parseProject(JSON.parse(raw));
    if (r.errors.length) return { status: 'corrupt', errors: r.errors };
    data = r.data; return { status: 'ok' };
  } catch (e) { return { status: 'corrupt', errors: [String(e.message || e)] }; }
}
function download(name, text, mime) {
  const blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 800);
}
/* programme name as shown in the interface (falls back to a prompt when the file has no name yet) and as a safe file-name stem */
const progName = () => (data.project.name || '').trim() || 'Programme name';
function fileBase() { const s = (data.project.name || '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40); return s || 'Project'; }
function stampName(prefix, ext) { const t = todayISO(); const n = new Date(); return `${prefix}_${t}_${pad2(n.getHours())}${pad2(n.getMinutes())}.${ext}`; }
function exportText() { computedFields(); data.meta.lastExportedAt = new Date().toISOString(); saveLocal(); return JSON.stringify(data, null, 2); }
function exportJSON(kind) {
  const text = exportText();
  download(stampName(kind === 'backup' ? fileBase() + '-backup' : fileBase(), 'json'), text);
  return text;
}
const canShareFiles = () => { try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] })); } catch (e) { return false; } };
/* Mobile-friendly export: opens the phone's share sheet so the file can be saved to Files / Drive / Downloads / email. */
async function shareJSON() {
  const text = exportText();
  const file = new File([text], stampName(fileBase(), 'json'), { type: 'application/json' });
  try { await navigator.share({ files: [file], title: progName() + ' data' }); return 'shared'; }
  catch (e) { return e && e.name === 'AbortError' ? 'cancelled' : 'failed'; }
}
