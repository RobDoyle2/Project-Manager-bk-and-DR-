const { chromium, devices } = require('playwright'); const { spawn } = require('child_process');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8769', '--directory', '/home/claude/out'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__opts = []; window.__rejectStartIn = false;
    const wrap = (n) => async o => { window.__opts.push([n, o && o.startIn]); if (window.__rejectStartIn && o && o.startIn) throw new TypeError('bad startIn'); const d = await navigator.storage.getDirectory(); if (n === 'open') return [await d.getFileHandle('in.json')]; return d.getFileHandle('out.json', { create: true }); };
    window.showOpenFilePicker = wrap('open'); window.showSaveFilePicker = wrap('save');
    window.__put = async (name, text) => { const d = await navigator.storage.getDirectory(); const h = await d.getFileHandle(name, { create: true }); const w = await h.createWritable(); await w.write(text); await w.close(); };
    window.__read = async name => { const d = await navigator.storage.getDirectory(); return (await (await d.getFileHandle(name)).getFile()).text(); };
  });
  await p.goto('http://localhost:8769/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
  const brand = async () => ({ t: (await p.innerText('#brandName')).trim(), ph: await p.$eval('#brandName', e => e.classList.contains('ph')), sub: (await p.innerText('.brand small')).trim(), title: await p.title() });
  let r = await brand();
  ok(r.t === 'Programme name' && r.ph, 'blank project: shows the "Programme name" placeholder'); ok(r.sub === 'Programme', 'subtitle is the fixed word "Programme"');
  ok(!/Backup|DR\b/.test(await p.innerText('.sidebar, #sidebar')), 'no Backup / DR wording left in the sidebar'); ok(r.title === 'Programme Manager', 'page title is generic: ' + r.title);
  ok(await p.evaluate(() => window.BackupDR.getData().project.name) === '', 'blank project has no name stored in the data');
  ok(await p.$('.brand [data-action=brand-edit]') !== null, 'pencil beside the name');
  // edit
  await p.click('.brand [data-action=brand-edit]'); await p.waitForSelector('#modal[open] [name=pname]');
  await p.fill('#modal [name=pname]', 'Acme Cloud Migration'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(300);
  r = await brand(); ok(r.t === 'Acme Cloud Migration' && !r.ph, 'edited name shows top left: ' + r.t); ok(/Acme Cloud Migration/.test(r.title), 'page title follows the name');
  ok(await p.evaluate(() => window.BackupDR.getData().project.name) === 'Acme Cloud Migration', 'name is stored in the project data (JSON)');
  ok(/Acme Cloud Migration/.test(await p.innerText('#view')), 'dashboard heading uses the name');
  await p.reload(); await p.waitForSelector('#brandName'); r = await brand(); ok(r.t === 'Acme Cloud Migration', 'name survives a reload (autosave)');
  // empty again
  await p.click('.brand [data-action=brand-edit]'); await p.waitForSelector('#modal [name=pname]'); await p.fill('#modal [name=pname]', '  '); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(200);
  r = await brand(); ok(r.ph && r.t === 'Programme name', 'clearing the name returns to the placeholder');
  await p.click('.brand [data-action=brand-edit]'); await p.fill('#modal [name=pname]', 'Acme Cloud Migration'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(200);

  // linked file gets the new name when the chip is pressed
  await p.click('#saveChip'); await p.click('#modal [data-action=file-new]'); await p.waitForTimeout(500);
  let o = await p.evaluate(() => window.__opts); ok(o.some(x => x[0] === 'save' && x[1] === 'downloads'), 'Save-as picker is asked to start in Downloads: ' + JSON.stringify(o));
  ok(JSON.parse(await p.evaluate(() => window.__read('out.json'))).project.name === 'Acme Cloud Migration', 'file contains the programme name');
  await p.click('.brand [data-action=brand-edit]'); await p.fill('#modal [name=pname]', 'Acme Phase 2'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(300);
  ok(/file-dirty/.test(await p.getAttribute('#saveChip', 'class')), 'renaming marks the linked file as needing an update');
  await p.click('#saveChip'); await p.waitForTimeout(500);
  ok(JSON.parse(await p.evaluate(() => window.__read('out.json'))).project.name === 'Acme Phase 2', 'pressing the chip writes the new name into the JSON file');

  // Import JSON = direct browse, starting in Downloads
  await p.evaluate(async () => { window.__opts.length = 0; await window.__put('in.json', JSON.stringify({ schemaVersion: 1, project: { name: 'Imported Programme' }, objectives: [], tasks: [], subtasks: [], risks: [], dependencies: [], milestones: [], counters: {} })); });
  await p.click('.topbar [data-action=import-json]'); await p.waitForSelector('#confirm[open]');
  ok(await p.$('#modal[open]') === null, 'Import JSON goes straight to the file browser (no extra dialog)');
  o = await p.evaluate(() => window.__opts); ok(o.length === 1 && o[0][0] === 'open' && o[0][1] === 'downloads', 'open picker starts in Downloads: ' + JSON.stringify(o));
  ok(/Imported Programme/.test(await p.innerText('#confirm')), 'confirm dialog names the imported programme');
  await p.click('#confirm [data-confirm=ok]'); await p.waitForTimeout(400); r = await brand(); ok(r.t === 'Imported Programme', 'top-left name comes from the imported JSON: ' + r.t);
  // older browsers that reject startIn
  await p.evaluate(() => { window.__rejectStartIn = true; window.__opts.length = 0; });
  await p.click('.topbar [data-action=export-json]'); await p.waitForTimeout(500); o = await p.evaluate(() => window.__opts);
  ok(o.length === 2 && o[0][1] === 'downloads' && o[1][1] === undefined, 'if the browser rejects the Downloads hint the picker is retried without it');
  ok((await p.innerText('#toasts')).includes('Exported to'), 'export still completes');
  ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs));
  await ctx.close();
  // no File System API: file names use the programme name, not "Backup-DR"
  const c2 = await b.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } }); const q = await c2.newPage();
  await q.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });
  await q.goto('http://localhost:8769/Backup-DR-Project.html'); await q.waitForSelector('#brandName');
  let dl = q.waitForEvent('download'); await q.click('.topbar [data-action=export-json]'); let d = await dl; ok(/^Project_\d{4}-\d{2}-\d{2}_\d{4}\.json$/.test(d.suggestedFilename()), 'unnamed programme -> file name Project_<date>: ' + d.suggestedFilename());
  await q.click('.brand [data-action=brand-edit]'); await q.fill('#modal [name=pname]', 'Café / Rollout: 2027!'); await q.click('#modal [data-modal-save]'); await q.waitForTimeout(200);
  dl = q.waitForEvent('download'); await q.click('.topbar [data-action=export-json]'); d = await dl; ok(/^Cafe-Rollout-2027_/.test(d.suggestedFilename()), 'file name derived safely from the programme name: ' + d.suggestedFilename());
  await q.setViewportSize({ width: 390, height: 800 }); await q.click('.hamb'); await q.fill('#modal [name=pname]', 'x').catch(() => {});
  await q.keyboard.press('Escape'); await q.click('.brand [data-action=brand-edit]').catch(() => {}); await q.waitForTimeout(100);
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
