const { chromium, devices } = require('playwright');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { ...devices['Pixel 7'] }]]) {
    console.log('--', name);
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let popup = null; ctx.on('page', pg => { popup = pg; });
    await p.goto('file:///home/claude/out/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(400); }
    const r = await p.evaluate(() => { const items = [...document.querySelectorAll('#nav > a')]; const i = items.findIndex(a => a.dataset.nav === 'reports'); const ab = items[i + 1]; return { idx: i, aboutIsNext: !!ab && ab.dataset.action === 'about', label: ab && ab.textContent.trim(), hasIcon: !!ab && !!ab.querySelector('svg'), last: items[items.length - 1] === ab, oldBtn: !!document.querySelector('.info-btn') }; });
    ok(r.aboutIsNext && r.label === 'About and help' && r.hasIcon, 'menu entry "About and help" (with icon) sits under Reports & Data Management (below the divider): ' + JSON.stringify(r));
    ok(!r.oldBtn, 'the old round button at the bottom of the sidebar is gone');
    await p.click('#nav [data-action=about]'); await p.waitForSelector('#modal[open] .about');
    const t = await p.innerText('#modal'); const norm = t.replace(/\s+/g, ' ');
    ok(/About Programme Manager/.test(await p.innerText('#modal header')), 'title: About Programme Manager');
    // ---- collapsed: essentials only ----
    for (const h of ['Getting started', 'Saving your work']) ok(new RegExp(h, 'i').test(norm), 'essential section visible: ' + h);
    ok(/To start a fresh project, choose New project in the left-hand menu, below the dividing line under Reports and Data Management\. On a phone, tap the menu button at the top left first\. It clears the app to a blank project, keeps a backup in your browser, and never changes your saved JSON file\./.test(norm), 'Getting started: New project line (where to find it, what it does)');
    const firstLi = await p.innerText('#modal .about section:first-of-type li:first-child'); ok(/^To start a fresh project/.test(firstLi.trim()), 'New project line is the FIRST line of Getting started');
    ok(/Save regularly to back up your data/.test(norm), 'says: save regularly to back up your data');
    ok(/lost if you clear your browser data/.test(norm) && /saved JSON file is the reliable backup/i.test(norm), 'says browser backups are lost if data is cleared; JSON is the reliable backup');
    ok(/Your data never leaves your browser or the JSON file you select\. Nothing is sent to a server, unless you choose to share the file yourself\./.test(norm), 'privacy line visible');
    for (const h of ['Opening a project', 'one browser tab', 'high-level picture', 'the detailed one', 'saved as a PDF', 'status button', 'plain-text file']) ok(!new RegExp(h, 'i').test(norm), 'hidden until Show more: ' + h);
    ok(await p.isVisible('#aboutToggle') && /Show more/.test(await p.innerText('#aboutToggle')) && await p.getAttribute('#aboutToggle', 'aria-expanded') === 'false', 'a "Show more" button is shown');
    { const o = await p.evaluate(() => { const t = document.querySelector('#aboutToggle').getBoundingClientRect(), by = document.querySelector('.about-by').getBoundingClientRect(); return t.bottom <= by.top; }); ok(o, 'Show more sits above the credit line'); }
    let bodyC = (await p.innerText('#modal .modal-body')).trim(); ok(/Created by Robert Doyle from nuloha\.com$/.test(bodyC), 'collapsed: credit line is the last line');
    // ---- expand ----
    await p.click('#aboutToggle'); await p.waitForTimeout(150);
    const nx = (await p.innerText('#modal')).replace(/\s+/g, ' ');
    for (const h of ['Opening a project', 'The status button and your file', 'Roadmap and reports', 'About the JSON file']) ok(new RegExp(h, 'i').test(nx), 'after Show more: ' + h);
    ok(/Import JSON replaces everything currently loaded/.test(nx), 'Opening a project text present');
    ok(/status button at the top shows when your linked file is up to date, and when it needs updating/.test(nx), 'status button note');
    ok(/Work in one browser tab at a time\. If you have the app open in two tabs, the last one to save overwrites the other\./.test(nx), 'one-tab warning');
    ok(/Management is the high-level picture, and Technical is the detailed one/.test(nx), 'roadmap views line');
    ok(/reports can be printed or saved as a PDF from Reports and Data Management/i.test(nx), 'printing / PDF line');
    ok(/one plain-text file holding everything/.test(nx), 'JSON file details');
    ok(/Show less/.test(await p.innerText('#aboutToggle')) && await p.getAttribute('#aboutToggle', 'aria-expanded') === 'true', 'button now reads "Show less"');
    { const o = await p.evaluate(() => { const t = document.querySelector('#aboutToggle').getBoundingClientRect(), by = document.querySelector('.about-by').getBoundingClientRect(), x = document.querySelector('#aboutMore').getBoundingClientRect(); return x.bottom <= t.top + 1 && t.bottom <= by.top; }); ok(o, 'expanded: Show less sits after the extra text, credit still below'); }
    ok(/Created by Robert Doyle from nuloha\.com$/.test((await p.innerText('#modal .modal-body')).trim()), 'expanded: credit line still the last line');
    if (name === 'desktop') await p.screenshot({ path: '/tmp/about-expanded.png' });
    await p.click('#aboutToggle'); await p.waitForTimeout(150);
    ok(!/Opening a project/.test(await p.innerText('#modal')) && /Show more/.test(await p.innerText('#aboutToggle')), 'Show less folds it back up');
    await p.click('#aboutToggle'); await p.click('#aboutToggle'); await p.waitForTimeout(100); ok(!(await p.isVisible('#aboutMore')), 'toggle works repeatedly');
    ok(await p.isVisible('#modal[open]'), 'window stays open while toggling');
    await p.click('#modal header [data-modal-close]'); await p.waitForTimeout(150); if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); } await p.click('#nav [data-action=about]'); await p.waitForSelector('#modal[open] .about');
    ok(!(await p.isVisible('#aboutMore')) && /Show more/.test(await p.innerText('#aboutToggle')), 'reopening starts collapsed again');
    const bodyT = (await p.innerText('#modal .modal-body')).trim(); ok(/Created by Robert Doyle from nuloha\.com$/.test(bodyT), 'last line of the window: Created by Robert Doyle from nuloha.com');
    const a = await p.$('#modal .about-by a'); ok((await a.getAttribute('href')) === 'https://nuloha.com' && (await a.getAttribute('target')) === '_blank' && /noopener/.test(await a.getAttribute('rel')), 'nuloha.com is a link opening in a new tab');
    ok(await p.$('#modal [data-modal-save]') === null && await p.$('#modal header [data-modal-close]') !== null, 'has an X to close it and nothing to "save"');
    if (name === 'desktop') await p.screenshot({ path: '/tmp/about-desk.png' });
    await p.click('#modal header [data-modal-close]'); await p.waitForTimeout(200); ok(await p.$('#modal[open]') === null, 'X closes it');
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); }
    if (name === 'mobile') { /* drawer closed by the entry */ }
    await p.click('#nav [data-action=about]'); await p.waitForSelector('#modal[open] .about'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.$('#modal[open]') === null, 'Esc closes it');
    await p.evaluate(() => window.BackupDR.getData()); const before = await p.evaluate(() => JSON.stringify(window.BackupDR.getData()));
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); }
    if (name === 'mobile') { /* drawer closed by the entry */ }
    await p.click('#nav [data-action=about]'); await p.waitForSelector('#modal[open] .about'); await p.keyboard.press('Escape'); ok(before === await p.evaluate(() => JSON.stringify(window.BackupDR.getData())), 'opening/closing changes no data');
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); if (name === 'mobile') { /* drawer closed by the entry */ }
    await p.click('#nav [data-action=about]'); await p.waitForSelector('#modal .about'); await p.screenshot({ path: '/tmp/about-mob.png' }); const sc = await p.evaluate(() => { const m = document.querySelector('#modal .modal-body'); return m.scrollHeight > m.clientHeight; }); ok(true, 'mobile: scrollable body = ' + sc); }
    ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs)); await ctx.close();
  }
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
