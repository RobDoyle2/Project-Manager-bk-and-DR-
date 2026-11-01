const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/out/Backup-DR-Project.html');await p.waitForSelector('#view .page-head');
// source app with data -> show JSON
await p.setInputFiles('#fileInput','/tmp/rich.json');await p.waitForSelector('#confirm[open]');await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(250);
await p.evaluate(()=>{location.hash='#reports'});await p.waitForTimeout(150);
await p.click('[data-action=show-json]');const txt=await p.inputValue('#jsonOut');
console.log('shown JSON valid & has objectives:',JSON.parse(txt).objectives.length);
await p.click('#modal [data-modal-close] >> nth=1');
// fresh browser: paste import
const c2=await b.newContext();const q=await c2.newPage();q.on('pageerror',e=>errs.push(e.message));
await q.goto('file:///home/claude/out/Backup-DR-Project.html');await q.waitForSelector('#view .page-head');
await q.evaluate(()=>{location.hash='#reports'});await q.waitForTimeout(150);
await q.click('[data-action=paste-json]');await q.click('#modal [data-modal-save]');console.log('empty paste error:',await q.innerText('#formError'));
await q.fill('#modal [name=jsonIn]','{ broken');await q.click('#modal [data-modal-save]');await q.waitForSelector('#confirm[open]');console.log('bad paste ->',(await q.innerText('#confirm')).replace(/\s+/g,' ').slice(0,60));await q.click('#confirm [data-confirm=ok]');
await q.click('[data-action=paste-json]');await q.fill('#modal [name=jsonIn]',txt);await q.click('#modal [data-modal-save]');await q.waitForSelector('#confirm[open]');await q.click('#confirm [data-confirm=ok]');await q.waitForTimeout(300);
const d=await q.evaluate(()=>{const x=window.BackupDR.getData();return[x.objectives.length,window.BackupDR.getDerived().totals.tasks]});
console.log('after paste import [objectives,tasks]:',d,'errors',errs);
await b.close();})();
