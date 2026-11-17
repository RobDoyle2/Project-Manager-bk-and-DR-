const { chromium } = require('playwright'); const { spawn } = require('child_process');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8770', '--directory', '/home/claude/out'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__calls = []; window.__next = null;
    const root = () => navigator.storage.getDirectory();
    window.showSaveFilePicker = async () => { window.__calls.push('save'); return (await root()).getFileHandle('proj-a.json', { create: true }); };
    window.showOpenFilePicker = async () => { window.__calls.push('open'); const n = window.__next; window.__next = null; if (n === 'abort') throw Object.assign(new Error('x'), { name: 'AbortError' }); return [await (await root()).getFileHandle(n || 'proj-b.json')]; };
    window.__put = async (name, text) => { const h = await (await root()).getFileHandle(name, { create: true }); const w = await h.createWritable(); await w.write(text); await w.close(); };
    window.__read = async name => (await (await (await root()).getFileHandle(name)).getFile()).text();
    window.__rm = async name => (await root()).removeEntry(name);
  });
  await p.goto('http://localhost:8770/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
  const calls = () => p.evaluate(() => window.__calls.slice()); const reset = () => p.evaluate(() => { window.__calls.length = 0; });
  const backups = () => p.evaluate(() => JSON.parse(localStorage.getItem('backupdr.backups.v1') || '[]').length);
  const chip = async () => (await p.getAttribute('#saveChip', 'class'));
  const rich = require('fs').readFileSync('/tmp/rich2.json', 'utf8');

  // ---- empty project: nothing to lose -> no confirmation, no backup ----
  await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForTimeout(700);
  ok(await p.$('#confirm[open]') === null, 'importing into a completely empty project loads straight away (no "replace?" box)');
  ok((await p.evaluate(() => window.BackupDR.getData().objectives.length)) >= 4, 'file was loaded');
  ok((await backups()) === 0, 'no pointless backup of an empty project');
  // ---- but a project with real data still asks ----
  await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForSelector('#confirm[open]', { timeout: 2000 }).catch(() => {});
  ok(await p.$('#confirm[open]') !== null, 'with real data the "Replace current project data?" confirmation is still shown'); await p.click('#confirm [data-confirm=cancel]'); await p.waitForTimeout(200);
  // a project that only has a name typed is not "empty"
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForSelector('#brandName');
  await p.click('.brand [data-action=brand-edit]'); await p.fill('#modal [name=pname]', 'Just a name'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(300);
  await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForSelector('#confirm[open]', { timeout: 2000 }).catch(() => {});
  ok(await p.$('#confirm[open]') !== null, 'a project with only a programme name still asks before being replaced'); await p.click('#confirm [data-confirm=ok]'); await p.waitForTimeout(400);

  // ---- link a file (save as new) ----
  await p.click('#saveChip'); await p.click('#modal [data-action=file-new]'); await p.waitForTimeout(500);
  ok(/file-ok/.test(await chip()), 'linked to proj-a.json and up to date'); await reset();
  // clean + linked: no warning
  await p.evaluate(() => { window.__next = 'abort'; }); await p.click('.topbar [data-action=import-json]'); await p.waitForTimeout(300);
  ok(await p.$('#modal[open]') === null && (await calls()).join() === 'open', 'file up to date -> Import JSON goes straight to the file browser, no warning');
  // ---- make an unsaved change ----
  const addObj = async name => { await p.click('#nav a[data-nav=objectives]'); await p.click('[data-action=obj-new] >> nth=0'); await p.waitForSelector('#modal[open] [name=name]'); await p.fill('#modal [name=name]', name); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(300); };
  await addObj('Unsaved objective 1'); ok(/file-dirty/.test(await chip()), 'edit marks the linked file as needing an update'); await reset();
  await p.click('.topbar [data-action=import-json]'); await p.waitForSelector('#modal[open] [data-action=unsaved-save]');
  const txt = await p.innerText('#modal'); ok(/Unsaved changes/.test(txt) && /proj-a\.json/.test(txt), 'warning names the file: ' + txt.replace(/\s+/g, ' ').slice(0, 90));
  ok(await p.$('#modal [data-action=unsaved-save]') !== null && await p.$('#modal [data-action=unsaved-anyway]') !== null && await p.$('#modal [data-modal-close]') !== null, 'three choices: save first / import anyway / cancel');
  ok((await calls()).length === 0, 'file browser is NOT opened while the warning is showing');
  // cancel
  await p.click('#modal [data-modal-close] >> nth=-1'); await p.waitForTimeout(300);
  ok((await calls()).length === 0 && /file-dirty/.test(await chip()), 'Cancel: nothing happens, change still unsaved');
  ok(!/Unsaved objective 1/.test(await p.evaluate(() => window.__read('proj-a.json'))), 'Cancel: file untouched');
  // import anyway
  await p.evaluate(() => { window.__next = 'abort'; }); await p.click('.topbar [data-action=import-json]'); await p.waitForSelector('#modal [data-action=unsaved-anyway]'); await p.click('#modal [data-action=unsaved-anyway]'); await p.waitForTimeout(400);
  ok((await calls()).join() === 'open', 'Import anyway: opens the file browser without saving');
  ok(!/Unsaved objective 1/.test(await p.evaluate(() => window.__read('proj-a.json'))) && /file-dirty/.test(await chip()), 'Import anyway: file not written');
  // save first
  await reset(); await p.evaluate(() => { window.__next = 'abort'; });
  await p.click('.topbar [data-action=import-json]'); await p.waitForSelector('#modal [data-action=unsaved-save]'); await p.click('#modal [data-action=unsaved-save]'); await p.waitForTimeout(700);
  ok(/Unsaved objective 1/.test(await p.evaluate(() => window.__read('proj-a.json'))), 'Save first: the change is written into the linked file');
  ok((await calls()).join() === 'open', 'Save first: THEN the file browser opens'); ok(/file-ok/.test(await chip()), 'chip shows saved');
  // other routes that replace the project are guarded too
  await addObj('Unsaved objective 2'); await reset();
  await p.click('#nav a[data-nav=reports]'); await p.click('[data-action=paste-json]'); await p.waitForSelector('#modal [data-action=unsaved-save]', { timeout: 2000 }).catch(() => {});
  ok(await p.$('#modal [data-action=unsaved-save]') !== null && await p.$('#modal textarea') === null, 'Paste JSON is guarded as well'); await p.click('#modal [data-modal-close] >> nth=-1'); await p.waitForTimeout(200);
  await p.click('[data-action=file-dialog]'); await p.click('#modal [data-action=file-classic]'); await p.waitForSelector('#modal [data-action=unsaved-save]', { timeout: 2000 }).catch(() => {});
  ok(await p.$('#modal [data-action=unsaved-save]') !== null, '"Import once" and "Browse" from the Project file dialog are guarded as well'); await p.click('#modal [data-modal-close] >> nth=-1'); await p.waitForTimeout(200);
  // failed save must not continue into the import
  await p.evaluate(() => { FileSystemFileHandle.prototype.createWritable = async () => { throw Object.assign(new Error('disk full'), { name: 'QuotaExceededError' }); }; }); await reset();
  await p.click('.topbar [data-action=import-json]'); await p.waitForSelector('#modal [data-action=unsaved-save]'); await p.click('#modal [data-action=unsaved-save]'); await p.waitForTimeout(700);
  ok(/Could not write/.test(await p.innerText('#toasts')), 'the write error is reported to the user');
  ok((await calls()).length === 0, 'if "Save first" fails (write error) the import does not carry on');
  ok(await p.evaluate(() => window.BackupDR.getData().objectives.some(o => o.name === 'Unsaved objective 2')), 'your unsaved work is still in the app');
  ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs));
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
