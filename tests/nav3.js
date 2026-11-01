const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
 const html=fs.readFileSync('/home/claude/out/Backup-DR-Project.html','utf8');
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:860}});
 await p.goto('about:blank');
 await p.evaluate(h=>{const f=document.createElement('iframe');f.id='f';f.setAttribute('sandbox','allow-scripts allow-same-origin');f.style.cssText='width:420px;height:850px;border:0';f.srcdoc=h;document.body.appendChild(f)},html);
 await p.waitForTimeout(1200); const L=p.frameLocator('#f');
 const st=async t=>console.log(t,'| title:',await L.locator('#pageTitle').innerText({timeout:3000}).catch(e=>'ERR'),'| open:',await L.locator('#sidebar').evaluate(e=>e.classList.contains('open')).catch(()=>'ERR'));
 await st('start'); await L.locator('.hamb').click(); await p.waitForTimeout(300); await st('after burger');
 await L.locator('#nav a[data-nav=objectives]').click(); await p.waitForTimeout(500); await st('after click Objectives');
 await b.close();
})();
