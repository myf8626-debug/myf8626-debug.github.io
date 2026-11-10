// Uses the bundled SQLite WASM; no npm install or model call required.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const init = require('./web/vendor/sql-wasm.js');
const seed = fs.readFileSync(path.join(__dirname,'web/seed.sql'),'utf8');
const cases = [
 ['baseline',''],
 ['amount', 'UPDATE orders SET amount=40 WHERE row_id=13;'],
 ['status', "UPDATE orders SET status='refunded' WHERE row_id=13;"],
 ['null', 'UPDATE orders SET amount=NULL WHERE row_id=13;'],
 ['refund', "INSERT INTO orders SELECT 21,order_id,store_id,product_id,order_date,quantity,amount,'paid' FROM orders WHERE row_id=5;"],
 ['date', "UPDATE orders SET order_date='2026-02-30' WHERE row_id=1;"],
 ['negative-offset', "INSERT INTO refunds VALUES ('R5','O005',40),('R6','O005',-50);"],
];
const queries = [
 'SELECT row_id,order_id,amount_cents FROM clean_orders ORDER BY row_id',
 'SELECT row_id,issue FROM order_issues ORDER BY row_id,issue',
 'SELECT refund_id,refund_cents FROM clean_refunds ORDER BY refund_id',
];
const python = `import json,sqlite3,sys
p=json.load(sys.stdin)
results=[]
for name,mutation in p['cases']:
 c=sqlite3.connect(':memory:');c.executescript(p['seed']+mutation)
 results.append([c.execute(q).fetchall() for q in p['queries']]);c.close()
json.dump(results,sys.stdout,ensure_ascii=True)`;
(async()=>{
 const processResult=spawnSync(process.env.PYTHON || 'python',['-B','-c',python],{
  input:JSON.stringify({seed,cases,queries}),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},timeout:15000
 });
 if(processResult.error) throw processResult.error;
 assert.equal(processResult.status,0,processResult.stderr);
 const expected=JSON.parse(processResult.stdout), SQL=await init();
 const checks=[];
 for(let i=0;i<cases.length;i++){
  const db=new SQL.Database();
  try{
   db.run(seed+cases[i][1]);
   const actual=queries.map(q=>db.exec(q)[0]?.values || []);
   assert.deepEqual(actual,expected[i],cases[i][0]);checks.push({case:cases[i][0],passed:true});
  }finally{db.close();}
 }
 fs.mkdirSync(path.join(__dirname,'reports'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'reports/sql-parity.json'),JSON.stringify({
  generated_at:new Date().toISOString(),passed:true,checks,
  seed_sha256:createHash('sha256').update(seed).digest('hex'),
  limitations:['Seven synthetic mutations; engine consistency is not business truth or real-model quality.']
 },null,2)+'\n');
 console.log(`${checks.length} Python / SQLite WASM parity cases passed`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
