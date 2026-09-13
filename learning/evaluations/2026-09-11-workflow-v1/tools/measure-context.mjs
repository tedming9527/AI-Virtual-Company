import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
const chars=f=>[...fs.readFileSync(path.join(root,f),'utf8')].length;
const catalog=JSON.parse(fs.readFileSync(path.join(root,'knowledge/catalog.json'),'utf8'));
const allDetails=[...new Set(catalog.entries.map(e=>e.detail))];
const allChars=allDetails.reduce((s,p)=>s+chars(p),0);
const out={unit:'Unicode code points; not model tokens',baseline_definition:'Same actual governance/code/provenance reads, replace knowledge discovery+detail reads with one read of all 11 canonical detail documents. This is a hypothetical full-library baseline, not an observed old-model run.',all_detail_chars:allChars,all_detail_paths:allDetails,sessions:[]};
for(const [session,role] of [['frontend','frontend-expert'],['backend','backend-expert'],['cold','backend-expert']]){
 const log=path.join(root,'eval-logs',session+'.jsonl');if(!fs.existsSync(log))continue;
 const rows=fs.readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 const kb=r=>/^employees\/[^/]+\/(MEMORY|KNOWLEDGE)\.md$/.test(r.path)||r.path.startsWith('knowledge/');
 const selected=rows.filter(kb).reduce((s,r)=>s+r.chars,0),total=rows.reduce((s,r)=>s+r.chars,0);
 const employee=rows.filter(r=>r.path===`employees/${role}/MEMORY.md`||r.path===`employees/${role}/KNOWLEDGE.md`).reduce((s,r)=>s+r.chars,0);
 const oldRole=chars(`employees/${role}/KNOWLEDGE.md`);
 const metadata=rows.filter(r=>r.path.startsWith('eval-logs/')).reduce((s,r)=>s+r.chars,0);
 const taskTotal=total-metadata,baseline=taskTotal-selected+allChars;
 out.sessions.push({session,reads:rows.length,actual_read_chars:total,audit_metadata_chars:metadata,task_document_chars:taskTotal,knowledge_chars:selected,governance_code_provenance_other_chars:taskTotal-selected,hypothetical_full_library_total_chars:baseline,full_library_difference_percent:Number((100*(baseline-taskTotal)/baseline).toFixed(2)),role_only_old_detail_chars:oldRole,role_only_new_index_plus_detail_chars:employee,role_only_difference_chars:oldRole-employee,read_paths:rows.map(r=>({path:r.path,chars:r.chars,sha256:r.sha256}))});
}
out.limits=['Not API input/token/cost data; excludes initial reader inspection and tool/system/history overhead','Audit all-document reads excluded','Frontend uses initial index; backend spans source fix; cold session targets latest fixed snapshot','Role-only comparison excludes shared index and is reported to avoid presenting full-library baseline as universal savings','No repeated randomized runs or production efficacy evidence'];
fs.writeFileSync(path.join(root,'results/context-measurement.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.sessions.map(({read_paths,...x})=>x),null,2));
