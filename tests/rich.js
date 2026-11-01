// Realistic sample dataset used only for visual QA (not shipped)
const mk = (id, name, owner, s, e, extra = {}) => ({ id, name, description: '', owner, priority: 'Medium', startDate: s, endDate: e, forecastStart: '', forecastEnd: '', status: 'not-started', progress: 0, blocked: false, blocker: '', notes: [], ...extra });
const T = (id, name, owner, s, e, subs = [], extra = {}) => ({ ...mk(id, name, owner, s, e, extra), subtasks: subs });
const O = (id, name, owner, s, e, tasks, extra = {}) => ({ ...mk(id, name, owner, s, e, { status: 'auto', ...extra }), tasks });
let n = 0; const S = (name, owner, s, e, progress, extra = {}) => mk('SUB-' + String(++n).padStart(3, '0'), name, owner, s, e, { progress, ...extra });
const data = {
  schemaVersion: 1, app: 'backup-dr-project',
  project: { id: 'PRJ-001', name: 'Backup & Disaster Recovery Programme', description: 'Modernise backup, build a DR site and prove recovery.', manager: 'Dana Whelan', startDate: '2026-10-01', endDate: '2027-06-30' },
  counters: { objective: 5, task: 12, subtask: 30, risk: 4, dependency: 5, milestone: 5 },
  objectives: [
    O('OBJ-001', 'Assess current backup estate', 'Alice Murphy', '2026-10-01', '2026-11-20', [
      T('TSK-001', 'Inventory servers and applications', 'Alice Murphy', '2026-10-01', '2026-10-30', [S('Export CMDB', 'Alice Murphy', '2026-10-01', '2026-10-09', 100), S('Interview app owners', 'Ian Foley', '2026-10-05', '2026-10-28', 100)]),
      T('TSK-002', 'Classify recovery tiers (RTO/RPO)', 'Bob Keane', '2026-10-19', '2026-11-20', [S('Draft tier model', 'Bob Keane', '2026-10-19', '2026-11-02', 100), S('Business sign-off', 'Dana Whelan', '2026-11-02', '2026-11-20', 60)], { forecastStart: '', forecastEnd: '2026-12-04' })
    ], { priority: 'High' }),
    O('OBJ-002', 'Modernise backup platform', 'Bob Keane', '2026-11-02', '2027-02-26', [
      T('TSK-003', 'Procure backup appliances', 'Carol Byrne', '2026-11-02', '2026-12-18', [], { progress: 70, status: 'in-progress', blocked: true, blocker: 'PO approval waiting on finance sign-off' }),
      T('TSK-004', 'Install and configure appliances', 'Bob Keane', '2027-01-04', '2027-02-05', [S('Rack and cable', 'Evan Doyle', '2027-01-04', '2027-01-15', 0), S('Configure policies', 'Bob Keane', '2027-01-18', '2027-02-05', 0)]),
      T('TSK-005', 'Migrate workloads to new platform', 'Evan Doyle', '2027-02-01', '2027-02-26', [])
    ], { priority: 'Critical' }),
    O('OBJ-003', 'Build DR site', 'Carol Byrne', '2026-12-01', '2027-04-16', [
      T('TSK-006', 'Select colocation provider', 'Carol Byrne', '2026-12-01', '2027-01-15', [S('RFP issued', 'Carol Byrne', '2026-12-01', '2026-12-15', 100), S('Vendor scoring', 'Carol Byrne', '2026-12-15', '2027-01-15', 30)]),
      T('TSK-007', 'Replication network', 'Frank Lowe', '2027-01-18', '2027-03-12', [], { progress: 0 }),
      T('TSK-008', 'Stand up recovery infrastructure', 'Frank Lowe', '2027-03-01', '2027-04-16', [])
    ], { forecastEnd: '2027-05-07' }),
    O('OBJ-004', 'Prove recovery with testing', 'Dana Whelan', '2027-03-01', '2027-06-04', [
      T('TSK-009', 'Tabletop exercise', 'Dana Whelan', '2027-03-01', '2027-03-26', []),
      T('TSK-010', 'Technical failover test (Tier 1)', 'Ian Foley', '2027-04-19', '2027-05-14', []),
      T('TSK-011', 'Full DR invocation test', 'Dana Whelan', '2027-05-17', '2027-06-04', [])
    ]),
    O('OBJ-005', 'Operational handover & runbooks', 'Ian Foley', '2027-05-03', '2027-06-30', [
      T('TSK-012', 'Write runbooks', 'Ian Foley', '2027-05-03', '2027-06-11', [])
    ], { status: 'on-hold' })
  ],
  risks: [
    { id: 'RSK-001', description: 'Colocation provider cannot meet delivery date for DR racks', impact: 4, likelihood: 3, owner: 'Carol Byrne', mitigation: 'Pre-book capacity; identify secondary provider', status: 'mitigating', relatedId: 'OBJ-003' },
    { id: 'RSK-002', description: 'Business owners do not agree recovery tiers in time', impact: 3, likelihood: 4, owner: 'Dana Whelan', mitigation: 'Escalate via steering group', status: 'open', relatedId: 'TSK-002' },
    { id: 'RSK-003', description: 'Replication bandwidth insufficient for nightly change rate', impact: 5, likelihood: 3, owner: 'Frank Lowe', mitigation: 'Dedupe and WAN optimisation proof of concept', status: 'open', relatedId: '' },
    { id: 'RSK-004', description: 'Key engineer leaves during migration', impact: 2, likelihood: 2, owner: 'Bob Keane', mitigation: 'Document and cross-train', status: 'accepted', relatedId: '' }
  ],
  dependencies: [
    { id: 'DEP-001', type: 'task', fromId: 'TSK-004', toId: 'TSK-003', assetName: '', note: 'Appliances must be delivered before installation', status: 'open' },
    { id: 'DEP-002', type: 'task', fromId: 'TSK-005', toId: 'TSK-004', assetName: '', note: '', status: 'open' },
    { id: 'DEP-003', type: 'objective', fromId: 'OBJ-004', toId: 'OBJ-003', assetName: '', note: 'Cannot test without DR site', status: 'open' },
    { id: 'DEP-004', type: 'asset', fromId: 'TSK-007', toId: '', assetName: 'WAN circuit (1 Gbps)', note: 'Telco lead time 10 weeks', status: 'at-risk' },
    { id: 'DEP-005', type: 'recovery', fromId: 'TSK-010', toId: '', assetName: 'Tier-1 DR site ready', note: '', status: 'open' },
    { id: 'DEP-006', type: 'task', fromId: 'TSK-008', toId: 'TSK-007', assetName: '', note: '', status: 'open' }
  ],
  milestones: [
    { id: 'MS-001', name: 'Recovery tiers approved', description: 'Steering group sign-off', date: '2026-11-20', objectiveId: 'OBJ-001', status: 'at-risk' },
    { id: 'MS-002', name: 'Backup platform live', description: '', date: '2027-02-26', objectiveId: 'OBJ-002', status: 'planned' },
    { id: 'MS-003', name: 'DR site ready', description: '', date: '2027-04-16', objectiveId: 'OBJ-003', status: 'planned' },
    { id: 'MS-004', name: 'Tier-1 failover passed', description: '', date: '2027-05-14', objectiveId: 'OBJ-004', status: 'planned' },
    { id: 'MS-005', name: 'Programme close', description: '', date: '2027-06-30', objectiveId: '', status: 'planned' },
    { id: 'MS-006', name: 'Kick-off', description: '', date: '2026-10-05', objectiveId: '', status: 'achieved' }
  ],
  meta: { createdAt: '2026-10-01T09:00:00.000Z', modifiedAt: '2026-10-29T09:00:00.000Z', lastExportedAt: null }
};
module.exports = data;
