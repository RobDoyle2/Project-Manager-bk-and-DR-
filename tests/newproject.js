const { chromium } = require('playwright'); const { spawn } = require('child_process');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8771', '--directory', '/home/claude/out'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__calls = []; window.__saveName = 'proj-a.json';
    const root = () => navigator.storage.getDirectory();
    window.showSaveFilePicker = async () => { window.__calls.push('save'); return (await root()).getFileHandle(window.__saveName, { create: true }); };
    window.showOpenFilePicker = async () => { window.__calls.push('open'); return [await (await root()).getFileHandle('proj-a.json')]; };
    window.__read = async name => (await (await (await root()).getFileHandle(name)).getFile()).text();
    window.__has = async name => { try { await (await root()).getFileHandle(name); return true; } catch (e) { return false; } };
  });
  await p.goto('http://localhost:8771/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
  const calls = () => p.evaluate(() => window.__calls.slice()); const reset = () => p.evaluate(() => { window.__calls.length = 0; });
  const backups = () => p.evaluate(() => JSON.parse(localStorage.getItem('backupdr.backups.v1') || '[]'));
  const chip = () => p.getAttribute('#saveChip', 'class');
  const D = () => p.evaluate(() => window.BackupDR.getData());
  const menu = async () => {};

  // ---- placement: below a thin line under Reports & Data Management; no dots menu ----
  const r = await p.evaluate(() => { const k = [...document.querySelectorAll('#nav > *')]; const i = k.findIndex(a => a.dataset && a.dataset.nav === 'reports'); const sep = k[i + 1], ab = k[i + 2], np = k[i + 3]; const bd = sep && sep.getBoundingClientRect();
    return { sep: !!sep && sep.classList.contains('nav-sep') && bd.height <= 2, about: !!ab && ab.dataset.action === 'about' && ab.textContent.trim() === 'About and help' && !!ab.querySelector('svg'), np: !!np && np.dataset.action === 'new-project' && np.textContent.trim() === 'New project' && !!np.querySelector('svg'), last: k[k.length - 1] === np, noDots: !document.querySelector('.brand-more, #brandMenu') }; });
  ok(r.sep && r.about && r.np && r.last, 'divider, then About and help (i icon), then New project (plus icon), last in the list: ' + JSON.stringify(r));
  ok(r.noDots, 'three-dots button and dropdown are gone');

  // ---- empty project: no confirmation ----
  await p.click('#nav [data-action=new-project]'); await p.waitForTimeout(400);
  ok(await p.$('#confirm[open]') !== null && /Create a file/i.test(await p.innerText('#confirm')) && !/Start a new project/.test(await p.innerText('#confirm')), 'empty project: skips the "start new project?" confirmation and goes straight to the create-file offer');
  ok((await backups()).length === 0, 'empty project: no pointless backup');
  ok((await calls()).length === 0, 'no file picker opened until the offer is accepted');
  await p.click('#confirm [data-confirm=cancel]'); await p.waitForTimeout(300);

  // ---- build a real linked project ----
  await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForTimeout(700);
  await p.click('#saveChip'); await p.click('#modal [data-action=file-new]'); await p.waitForTimeout(500);
  ok(/file-ok/.test(await chip()), 'linked to proj-a.json'); const before = await p.evaluate(() => window.__read('proj-a.json')); const nm = (await D()).project.name; ok(!!nm, 'programme has a name: ' + nm);
  const objsBefore = (await D()).objectives.length;

  // ---- clean + linked: confirmation only, wording explains file is unchanged; Cancel does nothing ----
  await reset(); await menu(); await p.click('#nav [data-action=new-project]'); await p.waitForSelector('#confirm[open]');
  const t = await p.innerText('#confirm'); ok(/proj-a\.json/.test(t) && /not changed or deleted/.test(t) && /no programme name/.test(t), 'confirmation names the file and says it is not changed: ' + t.replace(/\s+/g, ' ').slice(0, 140));
  await p.click('#confirm [data-confirm=cancel]'); await p.waitForTimeout(300);
  ok((await D()).objectives.length === objsBefore && (await D()).project.name === nm && /file-ok/.test(await chip()), 'Cancel: project and link untouched');

  // ---- dirty: unsaved-changes warning comes first ----
  await p.evaluate(() => { document.querySelector('#nav a[data-nav=objectives]').click(); });
  await p.click('[data-action=obj-new] >> nth=0'); await p.waitForSelector('#modal[open] [name=name]'); await p.fill('#modal [name=name]', 'Unsaved one'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(400);
  ok(/file-dirty/.test(await chip()), 'edit leaves the file needing an update');
  await menu(); await p.click('#nav [data-action=new-project]'); await p.waitForSelector('#modal[open] [data-action=unsaved-anyway]');
  const wt = await p.innerText('#modal'); ok(/Unsaved changes/.test(wt) && /new project/i.test(wt) && /proj-a\.json/.test(wt), 'unsaved-changes warning appears first, worded for a new project');
  ok(await p.$('#confirm[open]') === null, 'confirmation not shown until the warning is answered');
  await p.click('#modal [data-modal-close] >> nth=-1'); await p.waitForTimeout(300);
  ok((await D()).objectives.length > objsBefore && /file-dirty/.test(await chip()), 'Cancel on warning: nothing changes');
  // save first -> then confirm
  await menu(); await p.click('#nav [data-action=new-project]'); await p.waitForSelector('#modal [data-action=unsaved-save]'); await p.click('#modal [data-action=unsaved-save]');
  await p.waitForSelector('#confirm[open]', { timeout: 3000 });
  ok(/Unsaved one/.test(await p.evaluate(() => window.__read('proj-a.json'))), 'Save first: pending edit written to the old file (deliberate, before leaving it)');
  const savedOld = await p.evaluate(() => window.__read('proj-a.json'));

  // ---- confirm: backup, unlink, blank, offer new file ----
  const nb = (await backups()).length; await reset();
  await p.click('#confirm [data-confirm=ok]'); await p.waitForSelector('#confirm[open]', { timeout: 3000 });
  const d = await D();
  ok(!d.project.name && !d.objectives.filter(o => !o.system).length && !d.risks.length && !d.milestones.length, 'app cleared to a blank project with no programme name');
  ok(/Programme name|Name your/i.test(await p.innerText('#brandName')) || !(d.project.name), 'sidebar shows the placeholder name');
  const bk = await backups(); ok(bk.length === nb + 1 && bk[0].reason === 'Before new project' && JSON.parse(bk[0].json).objectives.length > 1, 'browser backup taken first, containing the old project');
  ok(!/file-ok|file-dirty/.test(await chip()) && !/proj-a/.test(await p.innerText('#saveChip')), 'old file unlinked (status chip no longer mentions it): ' + (await p.innerText('#saveChip')).replace(/\s+/g, ' '));
  const t2 = await p.innerText('#confirm'); ok(/Create a file/i.test(t2), 'then offers to create a new file straight away');
  ok((await calls()).length === 0, 'no picker opened yet (waits for the answer)');
  // decline
  await p.click('#confirm [data-confirm=cancel]'); await p.waitForTimeout(300);
  ok((await calls()).length === 0 && !/proj-a/.test(await p.innerText('#saveChip')), '"Not now": no file created, still unlinked');
  // an edit now must not touch the old file
  await p.click('.brand [data-action=brand-edit]'); await p.fill('#modal [name=pname]', 'Second programme'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(900);
  ok((await p.evaluate(() => window.__read('proj-a.json'))) === savedOld, 'old JSON file byte-for-byte unchanged after new project + edits');

  // ---- unlinked but with data: confirmation (generic wording), then create-file path ----
  await reset(); await menu(); await p.click('#nav [data-action=new-project]'); await p.waitForSelector('#confirm[open]');
  ok(/earlier is not changed or deleted/.test(await p.innerText('#confirm')), 'unlinked project: generic "earlier file not changed" wording');
  await p.evaluate(() => { window.__saveName = 'proj-b.json'; });
  await p.click('#confirm [data-confirm=ok]'); await p.waitForSelector('#confirm[open]'); await p.click('#confirm [data-confirm=ok]'); await p.waitForTimeout(800);
  ok((await calls()).join() === 'save', 'accepting the offer opens the save-as picker');
  ok(/proj-b/.test(await p.innerText('#saveChip')) && /file-ok/.test(await chip()), 'new file linked: ' + (await p.innerText('#saveChip')).replace(/\s+/g, ' '));
  ok((await p.evaluate(() => window.__read('proj-a.json'))) === savedOld, 'proj-a.json still unchanged');
  ok(JSON.parse(await p.evaluate(() => window.__read('proj-b.json'))).objectives !== undefined, 'proj-b.json holds the blank new project');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));

  // ---- footer wording ----
  const foot = async pg => (await pg.innerText('#sideFoot')).replace(/\s+/g, ' ').trim();
  ok(/Data last exported: |Data not exported yet|Unexported changes/.test(await foot(p)), 'footer uses the new wording: ' + await foot(p));
  const f1 = await p.evaluate(() => { const D = window.BackupDR.getData(); return !!D.meta.lastExportedAt; });
  // ---- mobile: both entries reachable in the drawer ----
  const m = await b.newContext({ viewport: { width: 390, height: 720 } }); const mp = await m.newPage(); await mp.goto('http://localhost:8771/Backup-DR-Project.html'); await mp.waitForSelector('#brandName');
  ok(/Data not exported yet/.test(await foot(mp)), 'blank project footer reads "Data not exported yet": ' + await foot(mp));
  await mp.click('[data-action=nav-toggle] >> nth=0'); await mp.waitForTimeout(300);
  const vis = await mp.evaluate(() => { const g = s => { const r = document.querySelector(s).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }; return { about: g('#nav [data-action=about]'), np: g('#nav [data-action=new-project]') }; });
  ok(vis.about && vis.np, 'mobile: About and help and New project are both visible in the drawer ' + JSON.stringify(vis));
  await mp.screenshot({ path: '/tmp/np-mobile-menu.png' });
  await mp.click('#nav [data-action=new-project]'); await mp.waitForTimeout(400);
  ok(!/Start a new project/.test(await mp.evaluate(() => document.querySelector('#confirm').innerText)), 'mobile, empty project: no "start new project?" confirmation');
  ok(!(await mp.evaluate(() => document.querySelector('#sidebar').classList.contains('open'))), 'mobile: drawer closes after tapping New project');
  // exported date wording
  await mp.evaluate(() => document.querySelector('#confirm [data-confirm=cancel]') && document.querySelector('#confirm [data-confirm=cancel]').click());
  await mp.setInputFiles('#fileInput', '/tmp/rich2.json'); await mp.waitForTimeout(600);
  const dl = mp.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await mp.evaluate(() => { delete window.showSaveFilePicker; }); await mp.click('.topbar [data-action=export-json]'); await dl; await mp.waitForTimeout(600);
  ok(/Data last exported: .*\d/.test(await foot(mp)), 'after export the footer reads "Data last exported: <date time>": ' + await foot(mp));

  await p.screenshot({ path: '/tmp/np-desktop.png' });
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); srv.kill();
})().catch(e => { console.log('CRASH', e.message); process.exit(1) });
