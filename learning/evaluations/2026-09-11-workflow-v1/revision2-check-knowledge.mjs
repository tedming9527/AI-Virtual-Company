import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=fs.realpathSync(process.argv[2]||process.env.AI_VIRTUAL_COMPANY_ROOT||process.cwd());
const catalog=JSON.parse(fs.readFileSync(path.join(root,'knowledge/catalog.json'),'utf8'));
let errors=[],warnings=[],ids=new Set();
function resolve(p){if(path.isAbsolute(p))throw Error('absolute path');const f=fs.realpathSync(path.join(root,p));if(!f.startsWith(root+path.sep))throw Error('outside root');return f}
for(const e of catalog.entries){
 try{
  for(const k of ['id','owner','index','detail','sha256','status','updated','trigger','summary','limit'])if(!e[k])throw Error('missing '+k);
  if(ids.has(e.id))throw Error('duplicate id'); ids.add(e.id);
  if(!['candidate','reviewed_case','verified_context','stale','superseded'].includes(e.status))throw Error('invalid status');
  const body=fs.readFileSync(resolve(e.detail));
  const digest=crypto.createHash('sha256').update(body).digest('hex');
  if(digest!==e.sha256)throw Error('STALE summary/source hash mismatch');
  const idx=fs.readFileSync(resolve(e.index),'utf8');
  for(const x of [e.id,e.trigger,e.summary,e.limit,e.sha256,e.status])if(!idx.includes(x))throw Error('index/catalog mismatch');
  if([...e.summary+e.limit].length>220)warnings.push(e.id+': long summary, do not truncate limits');
 }catch(err){errors.push(e.id+': '+err.message)}
}
for(const d of fs.readdirSync(path.join(root,'employees'),{withFileTypes:true}).filter(d=>d.isDirectory())){
 if(!catalog.entries.some(e=>e.owner===d.name))errors.push('missing employee '+d.name);
}
console.log(JSON.stringify({entries:catalog.entries.length,errors,warnings,scope:'structure and drift only; not semantic certification'},null,2));
process.exitCode=errors.length?1:0;
