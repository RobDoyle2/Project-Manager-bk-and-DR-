const { chromium } = require('playwright');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/out/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
  await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForSelector('#confirm[open]', { timeout: 1500 }).then(() => p.click('#confirm [data-confirm=ok]'), () => {}); await p.waitForTimeout(400);
  const d = await p.evaluate(() => window.BackupDR.getData()); const obj = d.objectives.find(o => !o.system && o.tasks.some(t => t.subtasks.length)); const task = obj.tasks.find(t => t.subtasks.length); const sub = task.subtasks[0];
  const title = async () => (await p.innerText('#modal .vw-title')).trim(); const modalTitle = async () => (await p.innerText('#modal header, #modal .modal-h, #modal h3').catch(() => '')).trim();
  // ---- Objectives page: open the objective (book icon / title) ----
  await p.click('#nav a[data-nav=objectives]'); await p.waitForTimeout(200);
  await p.click(`[data-action=obj-view][data-id="${obj.id}"]`); await p.waitForSelector('#modal[open] .vw-title');
  ok(await title() === obj.name, 'objective read-only view opened: ' + obj.name);
  const links = await p.$$('#modal .vw-task .vw-open'); ok(links.length === obj.tasks.length && obj.tasks.length > 0, 'every task name in the objective view is a clickable link (' + links.length + '/' + obj.tasks.length + ')');
  // click a task name -> that task's read-only view
  await p.click(`#modal .vw-open[data-id="${task.id}"]`); await p.waitForTimeout(250);
  ok(await title() === task.name && await p.$('#modal[open] [data-action=item-view-edit]') !== null, 'clicking a task name opens that task\'s read-only view');
  ok(await p.$('#modal form[data-modal-form], #modal [name=name]') === null, 'it is read-only (no edit form)');
  // task view: subtasks clickable
  const sl = await p.$$('#modal .vw-task .vw-open'); ok(sl.length === task.subtasks.length, 'subtask names in the task view are clickable (' + sl.length + '/' + task.subtasks.length + ')');
  await p.click(`#modal .vw-open[data-id="${sub.id}"]`); await p.waitForTimeout(250);
  ok(await title() === sub.name, 'clicking a subtask name opens the subtask read-only view');
  // subtask view -> parent task link -> back up the chain
  await p.click(`#modal .vw-v .vw-open[data-id="${task.id}"]`); await p.waitForTimeout(250); ok(await title() === task.name, 'subtask view: parent task name opens the task');
  await p.click(`#modal .vw-v .vw-open[data-id="${obj.id}"]`); await p.waitForTimeout(250); ok(await title() === obj.name, 'task view: objective name opens the objective (a way back)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // ---- from the roadmap: click objective name, then a task inside ----
  for (const view of ['roadmap-mgmt', 'roadmap-tech', 'roadmap']) { const l = await p.$(`#nav a[data-nav=${view}]`); if (l) { await l.click(); await p.waitForTimeout(300); break; } }
  const rn = await p.$(`.rm-name[data-id="${obj.id}"]`); ok(rn !== null, 'roadmap shows the objective name link');
  if (rn) { await rn.click(); await p.waitForSelector('#modal[open] .vw-title'); ok(await title() === obj.name, 'roadmap: objective opens read-only');
    await p.click(`#modal .vw-open[data-id="${task.id}"]`); await p.waitForTimeout(250); ok(await title() === task.name, 'roadmap: task inside the objective view opens read-only'); await p.keyboard.press('Escape'); }
  // keyboard: Enter on the link
  await p.click('#nav a[data-nav=objectives]'); await p.click(`[data-action=obj-view][data-id="${obj.id}"]`); await p.waitForSelector('#modal .vw-open');
  await p.focus(`#modal .vw-open[data-id="${task.id}"]`); await p.keyboard.press('Enter'); await p.waitForTimeout(250); ok(await title() === task.name, 'keyboard: Enter on a task name opens it');
  // links that were clickable before still are
  await p.keyboard.press('Escape'); await p.click('#nav a[data-nav=dashboard]'); await p.waitForTimeout(200);
  ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs));
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
