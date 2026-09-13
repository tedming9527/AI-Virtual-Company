import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.dirname(new URL(import.meta.url).pathname);
const neg=fs.mkdtempSync('/tmp/ted-negative-');
for(const dir of ['employees','knowledge'])fs.cpSync(path.join(root,dir),path.join(neg,dir),{recursive:true});
// Synthetic corruption generated for a negative test, never edits canonical knowledge.
const target=path.join(neg,'employees/backend-expert/KNOWLEDGE.md');
fs.appendFileSync(target,'\n<!-- synthetic stale-source mutation -->\n');
const run=(args,env={})=>{const r=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,...env}});return {exit:r.status,stdout:r.stdout,stderr:r.stderr}};
const stale=run([path.join(root,'scripts/check-knowledge.mjs'),neg]);
const escape=run([path.join(root,'scripts/read-knowledge.mjs'),root,'escape-test','../ted-optimize-20260911.patch']);
const normal=run([path.join(root,'scripts/check-knowledge.mjs'),root]);
const manifest={};
function walk(p){for(const e of fs.readdirSync(path.join(root,p),{withFileTypes:true})){const r=path.join(p,e.name);if(e.isDirectory())walk(r);else {const b=fs.readFileSync(path.join(root,r));manifest[r]={sha256:crypto.createHash('sha256').update(b).digest('hex'),chars:[...b.toString('utf8')].length,bytes:b.length}}}}
for(const p of ['employees','knowledge','scripts','templates'])walk(p);
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.md'))){const b=fs.readFileSync(path.join(root,name));manifest[name]={sha256:crypto.createHash('sha256').update(b).digest('hex'),chars:[...b.toString('utf8')].length,bytes:b.length}}
const result={time:new Date().toISOString(),tests:[{name:'valid_catalog',pass:normal.exit===0,...normal},{name:'stale_source_rejected',pass:stale.exit===1&&stale.stdout.includes('STALE'),...stale},{name:'outside_reader_root_rejected',pass:escape.exit!==0&&escape.stderr.includes('outside fixture root denied'),...escape}],negativeFixture:neg,limits:'Generated corruption tests; reader path guard is not an OS sandbox.'};
fs.writeFileSync(path.join(root,'results/local-checks.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(root,'results/snapshot-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(result.tests.map(x=>({name:x.name,pass:x.pass})),null,2));
process.exitCode=result.tests.every(x=>x.pass)?0:1;
