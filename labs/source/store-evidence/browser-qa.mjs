// Local acceptance helper. Pass a playwright-core module URL as the first argument.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium} = await import(process.argv[2]);
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const checks=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8314/');
 await page.locator('.metric').first().waitFor();
 const comparisons=await page.evaluate(async()=>{
   const catalog=await(await fetch('queries.json')).json();
   const seed=await(await fetch('seed.sql')).text();
   const output=[];
   for(const q of catalog){
     const browser=await new Promise((resolve,reject)=>{
       const w=new Worker('sql-worker.js');
       const timer=setTimeout(()=>{w.terminate();reject(Error('worker timeout'));},6000);
       w.onmessage=e=>{clearTimeout(timer);w.terminate();e.data.ok?resolve(e.data.result):reject(Error(e.data.error));};
       w.postMessage({seed,sql:q.sql});
     });
     const server=await(await fetch('/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:q.sql})})).json();
     output.push({id:q.id,equal:JSON.stringify(browser.rows)===JSON.stringify(server.rows)});
   }
   return output;
 });
 assert.ok(comparisons.every(x=>x.equal));checks.push({browser_python_parity:comparisons});
 await page.locator('#model-question').fill('只返回所有有效订单扣除退款后的净额，单位元，一列。');
 await page.locator('#model-run').click();
 await page.waitForFunction(()=>document.querySelector('#result-title').textContent==='模型 SQL 与计算结果',{},{timeout:55000});
 assert.match(await page.locator('#result').innerText(),/340/);
 assert.equal(await page.locator('#error').innerText(),'');checks.push('real model UI → SQL → SQLite result 340 CNY');
 await page.screenshot({path:'reports/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'reports/mobile.png',fullPage:true});checks.push('390px mobile no horizontal overflow');
 // An API failure must remove the preceding successful result.
 await page.route('**/api/model',r=>r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'synthetic provider outage'})}));
 await page.locator('#model-run').click();
 await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('synthetic provider outage'));
 assert.ok(!(await page.locator('#result').innerText()).includes('340'));checks.push('mock outage clears stale result');
 assert.deepEqual(errors,[]);
 await fs.writeFile('reports/browser-qa.json',JSON.stringify({passed:true,checks,limitations:['One real model UI question; failure branch uses mocked HTTP 502.']},null,2));
 console.log(JSON.stringify({passed:true,checks}));
}finally{await browser.close();}
