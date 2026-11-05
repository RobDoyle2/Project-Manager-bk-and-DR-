const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8765', '--directory', '/home/claude/out'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  // Mock only the OS pickers: they hand back REAL (origin-private) file handles so reading / writing / IndexedDB storage are genuine.
  await p.addInitScript(() => {
    window.__pick = { next: null, calls: [] };
    const root = () => navigator.storage.getDirectory();
    window.showSaveFilePicker = async o => { window.__pick.calls.push(['save', o && o.suggestedName]); const n = window.__pick.next; window.__pick.next = null; if (n && n.err) throw Object.assign(new Error(n.err), { name: n.err }); const d = await root(); return d.getFileHandle((n && n.name) || 'my-plan.json', { create: true }); };
    window.showOpenFilePicker = async o => { window.__pick.calls.push(['open']); const n = window.__pick.next; window.__pick.next = null; if (n && n.err) throw Object.assign(new Error(n.err), { name: n.err }); const d = await root(); return [await d.getFileHandle(n.name)]; };
    window.__put = async (name, text) => { const d = await root(); const h = await d.getFileHandle(name, { create: true }); const w = await h.createWritable(); await w.write(text); await w.close(); };
    window.__read = async name => { const d = await root(); const h = await d.getFileHandle(name); return (await h.getFile()).text(); };
  });
  await p.goto('http://localhost:8765/Backup-DR-Project.html'); await p.waitForSelector('#view .page-head');
  const chip = async () => ({ t: (await p.innerText('#saveChip')).trim(), c: await p.getAttribute('#saveChip', 'class') });
  const imp = async path => { await p.setInputFiles('#fileInput', path); await p.waitForSelector('#confirm[open]'); await p.click('#confirm [data-confirm=ok]'); await p.waitForTimeout(300); };
  await imp('/tmp/rich2.json');
  let c = await chip(); ok(/Autosaved|Ready/.test(c.t) && !/file-/.test(c.c), 'before choosing a file the chip is the normal autosave chip: ' + c.t);
  ok((await p.evaluate(() => document.querySelector('#saveChip').tagName)) === 'BUTTON', 'chip is a real button');

  // ---- upload arrow gives the Browse / Save-as dialog ----
  await p.click('#saveChip'); await p.waitForSelector('#modal[open] .fl-opts');
  ok(await p.$('#modal [data-action=file-browse]') !== null && await p.$('#modal [data-action=file-new]') !== null && await p.$('#modal [data-action=file-classic]') !== null, 'unlinked chip opens dialog: browse / save-as-new / import once');
  // ---- choose name + location for a NEW file ----
  await p.click('#modal [data-action=file-new]'); await p.waitForTimeout(500);
  const calls = await p.evaluate(() => window.__pick.calls);
  ok(calls[0] && calls[0][0] === 'save' && /\.json$/.test(calls[0][1]), 'save picker opened with a suggested .json name: ' + JSON.stringify(calls));
  c = await chip(); ok(/my-plan\.json/.test(c.t) && /file-ok/.test(c.c) && /saved/.test(c.t), 'chip now shows the chosen file, saved: ' + c.t);
  let txt = await p.evaluate(() => window.__read('my-plan.json')); let j = JSON.parse(txt);
  ok(j.objectives && j.objectives.length >= 4 && j.schemaVersion === 1, 'new file written with the full project (' + j.objectives.length + ' objectives)');

  // ---- make a change -> chip asks to update; pressing it updates the file ----
  await p.click('[data-action=goto][data-view=objectives], #nav a[data-nav=objectives]'); await p.waitForTimeout(150);
  await p.click('[data-action=obj-new] >> nth=0'); await p.waitForSelector('#modal[open] [name=name]');
  await p.fill('#modal [name=name]', 'Filelink test objective'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(300);
  c = await chip(); ok(/file-dirty/.test(c.c) && /Update my-plan\.json/.test(c.t), 'after a change the chip says "Update my-plan.json": ' + c.t);
  txt = await p.evaluate(() => window.__read('my-plan.json')); ok(!/Filelink test objective/.test(txt), 'file is NOT changed until the button is pressed');
  await p.click('#saveChip'); await p.waitForTimeout(500);
  txt = await p.evaluate(() => window.__read('my-plan.json')); ok(/Filelink test objective/.test(txt), 'pressing the chip writes the change into the chosen file');
  c = await chip(); ok(/file-ok/.test(c.c), 'chip returns to saved state: ' + c.t);
  ok((await p.innerText('#toasts')).includes('Saved to my-plan.json'), 'toast confirms the save');

  // ---- Export JSON: browse for the folder + name ----
  await p.evaluate(() => { window.__pick.calls.length = 0; window.__pick.next = { name: 'export-copy.json' }; });
  const dlSeen = p.waitForEvent('download', { timeout: 1500 }).then(() => true, () => false);
  await p.click('.topbar [data-action=export-json]'); await p.waitForTimeout(600);
  const ec = await p.evaluate(() => window.__pick.calls);
  ok(ec.length === 1 && ec[0][0] === 'save' && /^Backup-Disaster-Recovery-Programme_\d{4}.*\.json$/.test(ec[0][1]), 'Export JSON opens the save-as picker with a suggested name: ' + JSON.stringify(ec));
  const ex = await p.evaluate(() => window.__read('export-copy.json')); ok(/Filelink test objective/.test(ex) && JSON.parse(ex).schemaVersion === 1, 'export written to the file you chose');
  ok(!(await dlSeen), 'no automatic download to the Downloads folder');
  c = await chip(); ok(/my-plan\.json/.test(c.t), 'exporting a copy does not change the linked file: ' + c.t);
  await p.evaluate(() => { window.__pick.next = { err: 'AbortError' }; });
  const dl0 = p.waitForEvent('download', { timeout: 1000 }).then(() => true, () => false);
  await p.click('.topbar [data-action=export-json]'); ok(!(await dl0), 'cancelling the export picker does nothing');
  await p.evaluate(() => { window.__pick.next = { err: 'SecurityError' }; });
  const dl1 = p.waitForEvent('download', { timeout: 3000 }).then(() => true, () => false);
  await p.click('.topbar [data-action=export-json]'); ok(await dl1, 'export falls back to a normal download if the picker is blocked');

  // ---- remembered after reload ----
  // (headless Chromium crashes when it reads a sandbox-filesystem handle back out of IndexedDB, so the stored record is a stand-in
  //  object here; real picker handles are storable per the File System Access spec.)
  await p.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('backupdr.files', 1); r.onupgradeneeded = () => r.result.createObjectStore('handles'); r.onsuccess = () => { const tx = r.result.transaction('handles', 'readwrite'); tx.objectStore('handles').put({ handle: { name: 'remembered.json', kind: 'file' }, savedAt: new Date(Date.now() - 86400000).toISOString() }, 'linked'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }; }));
  await p.reload(); await p.waitForSelector('#saveChip'); await p.waitForTimeout(500);
  c = await chip(); ok(/remembered\.json/.test(c.t), 'a remembered link is picked up again after reloading the page: ' + c.t);
  ok(/file-dirty/.test(c.c) || /file-ok/.test(c.c), 'chip reflects whether the remembered file is up to date');
  await p.click('#saveChip'); await p.waitForTimeout(400);
  ok(/Could not write|can.t be found/.test(await p.innerText('body')), 'a broken remembered link gives a clear message instead of failing silently');
  await p.evaluate(() => { const c = document.querySelector('#confirm'); if (c && c.open) document.querySelector('#confirm [data-confirm=cancel]').click(); });
  await p.waitForTimeout(300);

  // ---- browse for an EXISTING file ----
  await p.evaluate(async () => window.__put('other.json', JSON.stringify({ schemaVersion: 1, project: { name: 'Other plan' }, objectives: [{ id: 'OBJ-001', name: 'Only objective', startDate: '2026-10-01', endDate: '2026-11-01', progress: 0 }], tasks: [], subtasks: [], risks: [], dependencies: [], milestones: [], counters: {} })));
  await p.evaluate(() => { window.__pick.next = { name: 'other.json' }; });
  await p.click('.topbar [data-action=import-json]');
  await p.waitForSelector('#confirm[open]'); ok(/other\.json/.test(await p.innerText('#confirm')), 'browsing an existing file asks to confirm the replace');
  await p.click('#confirm [data-confirm=ok]'); await p.waitForTimeout(600);
  c = await chip(); ok(/other\.json/.test(c.t) && /file-ok/.test(c.c), 'now linked to the browsed file: ' + c.t);
  ok((await p.evaluate(() => window.BackupDR.getData().project.name)) === 'Other plan', 'data loaded from the browsed file');
  await p.click('#nav a[data-nav=objectives]'); await p.click('[data-action=obj-new] >> nth=0'); await p.waitForSelector('#modal[open] [name=name]');
  await p.fill('#modal [name=name]', 'Added to other'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(300); await p.click('#saveChip'); await p.waitForTimeout(500);
  ok(/Added to other/.test(await p.evaluate(() => window.__read('other.json'))), 'chip updates the browsed file');
  ok(!/Added to other/.test(await p.evaluate(() => window.__read('my-plan.json'))), 'the previously linked file is left alone');

  // ---- cancelling ----
  await p.evaluate(() => { window.__pick.next = { err: 'AbortError' }; });
  await p.click('.topbar [data-action=import-json]'); await p.waitForTimeout(300);
  c = await chip(); ok(/other\.json/.test(c.t) && (await p.$('#confirm[open]')) === null, 'closing the picker changes nothing');
  await p.evaluate(async () => { window.__pick.next = { name: 'my-plan.json' }; });
  await p.click('.topbar [data-action=import-json]'); await p.waitForSelector('#confirm[open]'); await p.click('#confirm [data-confirm=cancel]'); await p.waitForTimeout(300);
  c = await chip(); ok(/other\.json/.test(c.t), 'declining the replace keeps the old link: ' + c.t);
  // invalid file
  await p.evaluate(async () => { await window.__put('bad.json', 'not json'); window.__pick.next = { name: 'bad.json' }; });
  await p.click('.topbar [data-action=import-json]'); await p.waitForSelector('#confirm[open]');
  ok(/not valid JSON/.test(await p.innerText('#confirm')), 'an invalid file is rejected'); await p.click('#confirm [data-confirm=ok]').catch(() => {}); await p.waitForTimeout(200);
  c = await chip(); ok(/other\.json/.test(c.t), 'invalid file does not change the link');

  // ---- sandbox / blocked picker falls back to the normal chooser ----
  await p.evaluate(() => { window.__pick.next = { err: 'SecurityError' }; });
  const fc = p.waitForEvent('filechooser', { timeout: 3000 }).then(() => true, () => false);
  await p.click('.topbar [data-action=import-json]'); ok(await fc, 'picker blocked (SecurityError) -> falls back to the normal file chooser');

  // ---- stop linking ----
  await p.click('#nav a[data-nav=reports]'); await p.click('[data-action=file-dialog]'); await p.waitForSelector('#modal .fl-cur'); await p.click('#modal [data-action=file-unlink]'); await p.waitForTimeout(300);
  c = await chip(); ok(!/file-/.test(c.c) && !/other\.json/.test(c.t), 'Stop linking returns the chip to normal: ' + c.t);
  await p.reload(); await p.waitForSelector('#saveChip'); await p.waitForTimeout(400); c = await chip(); ok(!/\.json/.test(c.t), 'unlink survives reload');
  ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs));
  await ctx.close();

  // ---- browsers without the API: behaves exactly as before ----
  const ctx2 = await b.newContext({ acceptDownloads: true }); const q = await ctx2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
  await q.addInitScript(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
  await q.goto('http://localhost:8765/Backup-DR-Project.html'); await q.waitForSelector('#saveChip');
  const fc2 = q.waitForEvent('filechooser', { timeout: 3000 }).then(() => true, () => false);
  await q.click('.topbar [data-action=import-json]'); ok(await fc2, 'no File System API: upload arrow opens the normal file chooser straight away');
  const dl = q.waitForEvent('download', { timeout: 3000 }).then(() => true, () => false);
  await q.click('#saveChip'); ok(await dl, 'no File System API: chip downloads the JSON instead');
  ok(e2.length === 0, 'no JS errors (fallback) ' + JSON.stringify(e2));
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
