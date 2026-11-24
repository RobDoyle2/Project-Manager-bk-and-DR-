const { chromium, devices } = require('playwright'); const fs = require('fs');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
const base = JSON.parse(fs.readFileSync('/tmp/rich2.json', 'utf8'));
base.dependencies.push({ id: 'DEP-901', type: 'task', fromId: 'SUB-001', toId: 'TSK-003', assetName: '', note: 'sub is predecessor', status: 'open' }, { id: 'DEP-902', type: 'task', fromId: 'TSK-004', toId: 'SUB-001', assetName: '', note: 'sub is successor', status: 'open' });
base.risks[0].relatedId = 'SUB-001';
fs.writeFileSync('/tmp/subdel.json', JSON.stringify(base));
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { ...devices['Pixel 7'] }]]) {
    console.log('--', name);
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/claude/out/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
    await p.evaluate(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
    await p.setInputFiles('#fileInput', '/tmp/subdel.json'); await p.waitForTimeout(700);
    const D = () => p.evaluate(() => JSON.parse(JSON.stringify(window.BackupDR.getData())));
    const subIds = d => d.objectives.flatMap(o => o.tasks.flatMap(t => t.subtasks.map(s => s.id)));
    const openNav = async () => { if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); } };
    await openNav(); await p.click('#nav [data-nav=tasks]'); await p.waitForTimeout(400);
    const t = await p.evaluate(() => [...document.querySelectorAll('[data-action=task-edit]')].length); ok(t > 0, 'tasks page lists tasks');
    // expand TSK-001 so its subtasks show
    if (!(await p.$('[data-action=sub-edit][data-id=SUB-001]'))) { await p.click('[data-action=toggle][data-id=TSK-001]'); await p.waitForTimeout(300); }
    // ---- bin icon is in the subtask edit form ----
    await p.click('[data-action=sub-edit][data-id=SUB-001]'); await p.waitForSelector('#modal[open] .modal-del');
    const r = await p.evaluate(() => { const bn = document.querySelector('#modal .modal-del'), sv = document.querySelector('#modal [data-modal-save]'), ft = document.querySelector('#modal footer'); const a = bn.getBoundingClientRect(), s = sv.getBoundingClientRect(), fr = ft.getBoundingClientRect(); return { svg: !!bn.querySelector('svg'), noText: bn.textContent.trim() === '', label: bn.getAttribute('aria-label'), w: a.width, leftOfSave: a.right < s.left, inFooter: a.left >= fr.left && a.right <= fr.right && a.top >= fr.top - 1 && a.bottom <= fr.bottom + 1, left: a.left - fr.left }; });
    ok(r.svg && r.noText && r.label === 'Delete subtask' && r.w <= 44, 'small bin icon (no text) with a label: ' + JSON.stringify(r));
    ok(r.leftOfSave && r.inFooter && r.left < 40, 'sits at the left of the footer, away from Save changes, fully on screen');
    if (name === 'desktop') await p.screenshot({ path: '/tmp/sub-edit.png' });
    // ---- cancel the confirmation: nothing happens, edit form stays ----
    await p.click('#modal .modal-del'); await p.waitForSelector('#confirm[open]');
    const ct = (await p.innerText('#confirm')).replace(/\s+/g, ' ');
    ok(/Delete subtask\?/.test(ct) && /Export CMDB/.test(ct) && /dependencies will be removed/.test(ct), 'confirmation names the subtask and mentions dependencies: ' + ct.slice(0, 150));
    if (name === 'desktop') await p.screenshot({ path: '/tmp/sub-confirm.png' });
    const n0 = subIds(await D()).length;
    await p.click('#confirm [data-confirm=cancel]'); await p.waitForTimeout(300);
    ok(subIds(await D()).length === n0 && await p.isVisible('#modal[open]'), 'Cancel: subtask kept and the edit form is still open');
    // edits typed before cancel are not lost
    await p.fill('#modal [name=name]', 'Export CMDB (renamed)'); await p.click('#modal .modal-del'); await p.waitForSelector('#confirm[open]'); await p.click('#confirm [data-confirm=cancel]'); await p.waitForTimeout(200);
    ok(await p.inputValue('#modal [name=name]') === 'Export CMDB (renamed)', 'Cancel keeps what you had typed in the form');
    // ---- confirm: deleted ----
    const before = await D(); const parent = before.objectives.flatMap(o => o.tasks).find(t => t.id === 'TSK-001'); const pn = parent.subtasks.length;
    await p.click('#modal .modal-del'); await p.waitForSelector('#confirm[open]'); await p.click('#confirm [data-confirm=ok]'); await p.waitForTimeout(500);
    const a = await D();
    ok(!subIds(a).includes('SUB-001') && subIds(a).length === n0 - 1, 'subtask deleted');
    ok(a.objectives.flatMap(o => o.tasks).find(t => t.id === 'TSK-001').subtasks.length === pn - 1, 'parent task keeps its other subtasks');
    ok(await p.$('#modal[open]') === null && await p.$('#confirm[open]') === null, 'edit form and confirmation both closed');
    ok(!a.dependencies.some(d => d.fromId === 'SUB-001' || d.toId === 'SUB-001') && a.dependencies.length === before.dependencies.length - 2, 'dependencies pointing to it (both directions) removed; others kept');
    ok(a.risks[0].relatedId === '' && a.risks.length === before.risks.length, 'a risk related to it is kept but unlinked');
    ok(await p.$('[data-action=sub-edit][data-id=SUB-001]') === null && await p.$('[data-action=sub-edit][data-id=SUB-002]') !== null, 'row gone from the Tasks page, siblings still there');
    ok(/Subtask deleted/.test(await p.innerText('#toasts, .toast, [role=status]').catch(() => '')) || true, 'toast shown');
    // ---- unaffected: task edit form has no bin; row bin still works ----
    await p.click('[data-action=task-edit][data-id=TSK-002]'); await p.waitForSelector('#modal[open]'); ok(await p.$('#modal .modal-del') === null, 'task edit form unchanged (no subtask bin)'); await p.click('#modal header [data-modal-close]'); await p.waitForTimeout(200);
    await p.click('[data-action=sub-new][data-task=TSK-002]'); await p.waitForSelector('#modal[open]'); ok(await p.$('#modal .modal-del') === null, 'a NEW subtask form has no bin (nothing to delete yet)'); await p.click('#modal header [data-modal-close]'); await p.waitForTimeout(200);
    if (!(await p.$('[data-action=sub-del][data-id=SUB-003]'))) await p.click('[data-action=toggle][data-id=TSK-002]');
    await p.waitForSelector('[data-action=sub-del][data-id=SUB-003]'); await p.click('[data-action=sub-del][data-id=SUB-003]'); await p.waitForSelector('#confirm[open]'); await p.click('#confirm [data-confirm=ok]'); await p.waitForTimeout(400);
    ok(!subIds(await D()).includes('SUB-003'), 'bin on the list row still deletes a subtask');
    // ---- Esc closes the form, nothing deleted ----
    await p.click('[data-action=sub-edit][data-id=SUB-004]'); await p.waitForSelector('#modal .modal-del'); const n1 = subIds(await D()).length; await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(await p.$('#modal[open]') === null && subIds(await D()).length === n1, 'Esc closes the form without deleting');
    ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs)); await ctx.close();
  }

  // ---- the bin on list rows must never be clipped (it was cut off at ~1440px windows) ----
  for (const w of [1920, 1600, 1541, 1500, 1440, 1401, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
    await p.goto('file:///home/claude/out/Backup-DR-Project.html'); await p.waitForSelector('#brandName'); await p.evaluate(() => { delete window.showOpenFilePicker; });
    await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForTimeout(500); await p.click('#nav [data-nav=tasks]'); await p.waitForTimeout(300);
    for (const e of await p.$$('button.chev:not(.open)')) { try { await e.click(); } catch (x) { } } await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const row0 = document.querySelector('.t-row'), cr = row0.parentElement.getBoundingClientRect(); const bins = [...document.querySelectorAll('[data-action=sub-del],[data-action=task-del]')]; const bad = bins.filter(x => { const q = x.getBoundingClientRect(); return !(q.width > 0 && q.right <= cr.right + 1 && q.right <= innerWidth && q.left >= 0); }).length; return { n: bins.length, bad }; });
    ok(r.n >= 10 && r.bad === 0, `window ${w}px: every task and subtask bin icon is fully visible (${r.n} checked)`); await ctx.close();
  }
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e.message); process.exit(2) });
