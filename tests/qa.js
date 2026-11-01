const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'file:///home/claude/out/Backup-DR-Project.html';
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; console.log('  PASS', m); } else { fails++; console.log('  FAIL', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const D = () => page.evaluate(() => { const d = window.BackupDR.getDerived(); return { totals: d.totals, node: Object.fromEntries([...d.node].map(([k, v]) => [k, { p: v.progress, s: v.status }])) }; });
  const data = () => page.evaluate(() => JSON.parse(JSON.stringify(window.BackupDR.getData())));
  const go = async v => { await page.evaluate(v => { location.hash = '#' + v; }, v); await page.waitForTimeout(120); };
  const submit = async () => { await page.click('#modal [data-modal-save]'); await page.waitForTimeout(150); };
  const setProg = async (id, v) => { await page.$eval(`[data-progress][data-id="${id}"]`, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v); await page.waitForTimeout(120); };

  await page.goto(URL);
  await page.waitForSelector('#view .page-head');
  console.log('\n== Initial state: no pre-populated data');
  let d0 = await data();
  eq([d0.objectives.length, d0.risks.length, d0.milestones.length, d0.dependencies.length], [0, 0, 0, 0], 'blank project has no objectives/risks/milestones/dependencies');
  await go('roadmap');
  eq(await page.$$eval('.g-month', e => e.map(x => x.innerText.replace(/\s+/g, ' '))), ['October 2026','November 2026','December 2026','January 2027','February 2027','March 2027','April 2027','May 2027','June 2027'], 'roadmap shows nine monthly columns Oct 2026 – Jun 2027');

  console.log('\n== QA 1: create objective with dates in October 2026');
  await go('objectives');
  await page.click('[data-action=obj-new]');
  await page.fill('#modal [name=name]', 'Modernise backup platform');
  await page.fill('#modal [name=owner]', 'Alice Murphy');
  await page.selectOption('#modal [name=priority]', 'High');
  await page.fill('#modal [name=startDate]', '2026-10-05');
  await page.fill('#modal [name=endDate]', '2026-11-27');
  await submit();
  let d1 = await data();
  eq([d1.objectives.length, d1.objectives[0].id, d1.objectives[0].startDate, d1.objectives[0].endDate], [1, 'OBJ-001', '2026-10-05', '2026-11-27'], 'objective stored with ISO dates and unique ID');

  console.log('\n== QA 2: objective appears in October 2026, not January 2027');
  await go('roadmap');
  const geo = await page.evaluate(() => {
    const bar = document.querySelector('.bar[data-id="OBJ-001"]').getBoundingClientRect();
    const months = [...document.querySelectorAll('.g-month')].map(m => { const r = m.getBoundingClientRect(); return { t: m.innerText.replace(/\s+/g, ' '), l: r.left, r: r.right }; });
    return { bar: { l: bar.left, r: bar.right }, months };
  });
  const oct = geo.months[0], nov = geo.months[1], jan = geo.months[3];
  ok(geo.bar.l >= oct.l - 1 && geo.bar.l < oct.r, `bar starts inside the October 2026 column (bar.left=${geo.bar.l.toFixed(1)}, Oct ${oct.l.toFixed(1)}–${oct.r.toFixed(1)})`);
  ok(geo.bar.r > nov.l && geo.bar.r <= nov.r + 1, 'bar ends inside the November 2026 column');
  ok(geo.bar.r < jan.l, 'bar does not reach January 2027');
  const leftPct = await page.$eval('.bar[data-id="OBJ-001"]', e => parseFloat(e.style.left));
  ok(Math.abs(leftPct - (4 / 273 * 100)) < 0.01, `bar left% = ${leftPct.toFixed(3)} matches 4/273 days`);

  console.log('\n== QA 3/4: tasks and subtasks');
  await go('tasks');
  await page.click('[data-action=task-new] >> nth=0');
  await page.fill('#modal [name=name]', 'Deploy backup appliances');
  await page.fill('#modal [name=owner]', 'Bob Keane');
  await page.fill('#modal [name=quickSubs]', 'Rack hardware\nConfigure network');
  await submit();
  await page.click('[data-action=task-new] >> nth=0');
  await page.fill('#modal [name=name]', 'Define retention policy');
  await page.fill('#modal [name=owner]', 'Carol Byrne');
  await submit();
  const d2 = await data();
  const o = d2.objectives[0];
  eq([o.tasks.length, o.tasks[0].subtasks.length, o.tasks[1].subtasks.length], [2, 2, 0], 'objective has 2 tasks; task 1 has 2 subtasks');
  eq(o.tasks.map(t => t.id).concat(o.tasks[0].subtasks.map(s => s.id)), ['TSK-001', 'TSK-002', 'SUB-001', 'SUB-002'], 'unique IDs');
  // add a subtask through the full subtask dialog too
  await page.click('[data-action=sub-new][data-task="TSK-001"]');
  await page.fill('#modal [name=name]', 'Validate first backup');
  await submit();
  eq((await data()).objectives[0].tasks[0].subtasks.length, 3, 'subtask added via dialog (3 subtasks)');

  console.log('\n== QA 5: complete one subtask -> task progress changes');
  let dv = await D();
  eq(dv.node['TSK-001'].p, 0, 'task starts at 0%');
  await setProg('SUB-001', 100);
  dv = await D();
  ok(Math.abs(dv.node['TSK-001'].p - 100 / 3) < 0.01, `task progress = mean of 3 subtasks (${dv.node['TSK-001'].p.toFixed(2)}%)`);
  ok(dv.node['TSK-001'].s === 'in-progress', 'task status became In progress automatically');
  ok(dv.node['OBJ-001'].p > 0 && dv.node['OBJ-001'].s === 'in-progress', 'objective progress/status updated automatically');
  const rowTxt = await page.$eval('.t-row:has([data-id="TSK-001"]) .prog-auto', e => e.innerText);
  ok(/33%/.test(rowTxt), `task row shows 33% in the UI (${rowTxt.replace(/\s+/g,' ')})`);

  console.log('\n== QA 6: complete all subtasks -> task 100%');
  await setProg('SUB-002', 100); await setProg('SUB-003', 100);
  dv = await D();
  eq([dv.node['TSK-001'].p, dv.node['TSK-001'].s], [100, 'completed'], 'task is 100% and Completed');
  ok(dv.node['OBJ-001'].p === 50, 'objective = 50% (1 of 2 equal-weight tasks complete)');

  console.log('\n== QA 7: complete all tasks -> objective 100%');
  await setProg('TSK-002', 100);
  dv = await D();
  eq([dv.node['OBJ-001'].p, dv.node['OBJ-001'].s], [100, 'completed'], 'objective is 100% and Completed');
  eq(dv.totals.overall, 100, 'programme progress = 100%');
  // restore to partial for later checks
  await setProg('SUB-003', 40); await setProg('TSK-002', 60);
  dv = await D();
  ok(Math.abs(dv.node['TSK-001'].p - (100 + 100 + 40) / 3) < 0.01, 'reopening a subtask lowers parent progress again (80%)');
  ok(dv.node['OBJ-001'].p < 100 && dv.node['OBJ-001'].s === 'in-progress', 'objective no longer completed');

  console.log('\n== QA 8/9/10: roadmap views and dynamic updates');
  await go('roadmap');
  const mg = await page.evaluate(() => ({ bars: document.querySelectorAll('.gantt-mgmt .bar').length, text: document.querySelector('.gantt-mgmt').innerText }));
  eq(mg.bars, 1, 'management view: exactly 1 bar (objective only)');
  ok(!/Deploy backup|Rack hardware|Define retention/.test(mg.text), 'management view shows no task or subtask names');
  const chip1 = await page.$eval('.gantt-mgmt .bar[data-id="OBJ-001"] .chip-p', e => e.innerText);
  await page.click('[data-action=rm-mode][data-mode=technical]');
  await page.waitForSelector('.gantt-tech');
  const tech = await page.evaluate(() => ({ rows: document.querySelectorAll('.gantt-tech .t-r').length, lv: [0,1,2].map(l => document.querySelectorAll(`.gantt-tech .t-r.lvl-${l}`).length), text: document.querySelector('.gantt-tech').innerText }));
  eq(tech.lv, [1, 2, 3], 'technical view: 1 objective, 2 tasks, 3 subtasks (indented levels)');
  ok(/Deploy backup appliances/.test(tech.text) && /Rack hardware/.test(tech.text) && /Alice Murphy|Bob Keane/.test(tech.text), 'technical view shows names and owners');
  // dynamic: change progress in Tasks view, then look at both roadmap views without any manual refresh
  await go('tasks'); await setProg('TSK-002', 100); await go('roadmap');
  const chipTech = await page.$eval('.gantt-tech .bar[data-id="TSK-002"] .chip-p', e => e.innerText);
  eq(chipTech, '100%', 'technical roadmap bar for TSK-002 updated to 100% automatically');
  await page.click('[data-action=rm-mode][data-mode=management]');
  const chip2 = await page.$eval('.gantt-mgmt .bar[data-id="OBJ-001"] .chip-p', e => e.innerText);
  ok(chip2 !== chip1, `management objective bar updated automatically (${chip1} -> ${chip2})`);
  await page.screenshot({ path: 'shots/qa-roadmap-mgmt.png' });

  console.log('\n== Persistence: browser autosave survives reload');
  await page.waitForTimeout(600);
  await page.reload(); await page.waitForSelector('#view .page-head');
  eq((await data()).objectives[0].tasks.length, 2, 'data restored from browser autosave after reload');

  console.log('\n== QA 11: export JSON');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.topbar [data-action=export-json]')]);
  const exp = '/tmp/export.json'; await dl.saveAs(exp);
  const ej = JSON.parse(fs.readFileSync(exp, 'utf8'));
  ok(/^Backup-DR-Data_\d{4}-\d{2}-\d{2}_\d{4}\.json$/.test(dl.suggestedFilename()), `download filename ${dl.suggestedFilename()}`);
  eq([ej.schemaVersion, ej.objectives.length, ej.objectives[0].tasks.length, ej.objectives[0].tasks[0].subtasks.length], [1, 1, 2, 3], 'export has schemaVersion and Project>Objectives>Tasks>Subtasks hierarchy');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(ej.objectives[0].startDate) && ej.objectives[0].startDate === '2026-10-05', 'dates exported as ISO YYYY-MM-DD');
  const before = await D();

  console.log('\n== QA 12/13: fresh browser -> import -> everything retained');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p2 = await ctx2.newPage();
  const errs2 = []; p2.on('pageerror', e => errs2.push(e.message));
  await p2.goto(URL); await p2.waitForSelector('#view .page-head');
  eq((await p2.evaluate(() => window.BackupDR.getData().objectives.length)), 0, 'fresh browser starts empty');
  await p2.evaluate(() => { location.hash = '#reports'; });
  await p2.setInputFiles('#fileInput', exp);
  await p2.waitForSelector('#confirm[open]');
  ok(/Replace current project data/.test(await p2.innerText('#confirm')), 'confirmation shown before replacing data');
  await p2.screenshot({ path: 'shots/qa-import-confirm.png' });
  await p2.click('#confirm button[value=ok]');
  await p2.waitForTimeout(300);
  const after = await p2.evaluate(() => { const d = window.BackupDR.getDerived(); return { totals: d.totals, node: Object.fromEntries([...d.node].map(([k, v]) => [k, { p: v.progress, s: v.status }])), data: window.BackupDR.getData() }; });
  eq(after.node, before.node, 'all progress and statuses identical after import');
  eq(after.totals.tasks, before.totals.tasks, 'task count retained');
  const a = after.data.objectives[0];
  eq([a.startDate, a.endDate, a.tasks[0].startDate, a.tasks[0].subtasks[2].progress], ['2026-10-05', '2026-11-27', await page.evaluate(() => window.BackupDR.today()), 40], 'dates and subtask progress retained');
  await p2.evaluate(() => { location.hash = '#roadmap'; }); await p2.waitForTimeout(150);
  ok(await p2.$('.bar[data-id="OBJ-001"]') !== null, 'roadmap regenerated from imported JSON');
  eq(errs2, [], 'no JS errors during import');

  console.log('\n== Import validation');
  const bad = async (name, content) => {
    fs.writeFileSync('/tmp/' + name, content);
    const cur = await p2.evaluate(() => window.BackupDR.getData().objectives.length);
    await p2.setInputFiles('#fileInput', '/tmp/' + name);
    await p2.waitForSelector('#confirm[open]');
    const t = await p2.innerText('#confirm');
    await p2.click('#confirm button[value=ok]'); await p2.waitForTimeout(100);
    const now = await p2.evaluate(() => window.BackupDR.getData().objectives.length);
    return { t, unchanged: cur === now };
  };
  let r = await bad('bad1.json', '{ not json');
  ok(/not valid JSON/.test(r.t) && r.unchanged, 'malformed JSON rejected, data unchanged');
  const mod = f => { const j = JSON.parse(fs.readFileSync(exp, 'utf8')); f(j); return JSON.stringify(j); };
  r = await bad('bad2.json', mod(j => { j.objectives[0].endDate = '2026-09-01'; }));
  ok(/before start date/.test(r.t) && r.unchanged, 'end-before-start rejected');
  r = await bad('bad3.json', mod(j => { j.objectives[0].startDate = '05/10/2026'; }));
  ok(/not a valid ISO date/.test(r.t) && r.unchanged, 'non-ISO date rejected');
  r = await bad('bad4.json', mod(j => { j.objectives[0].tasks[1].id = 'TSK-001'; }));
  ok(/Duplicate ID/.test(r.t) && r.unchanged, 'duplicate IDs rejected');
  r = await bad('bad5.json', mod(j => { j.schemaVersion = 99; }));
  ok(/newer than this application/.test(r.t) && r.unchanged, 'newer schema version rejected');
  r = await bad('bad6.json', mod(j => { delete j.objectives; }));
  ok(/"objectives" must be an array/.test(r.t) && r.unchanged, 'missing objectives array rejected');
  r = await bad('bad7.json', '[1,2,3]');
  ok(/JSON object/.test(r.t) && r.unchanged, 'JSON array rejected');
  // cancelled replace leaves data alone
  fs.copyFileSync('/home/claude/out/Backup-DR-Data.json', '/tmp/empty.json');
  await p2.setInputFiles('#fileInput', '/tmp/empty.json');
  await p2.waitForSelector('#confirm[open]');
  await p2.click('#confirm button[value=cancel]'); await p2.waitForTimeout(150);
  eq(await p2.evaluate(() => window.BackupDR.getData().objectives.length), 1, 'cancelling the replace confirmation keeps existing data');
  await ctx2.close();

  console.log('\n== JS errors');
  eq(errs, [], 'no console / page errors in main session');
  console.log(`\nRESULT: ${passes} passed, ${fails} failed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
