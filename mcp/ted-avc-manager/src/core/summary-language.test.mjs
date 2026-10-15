import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,realpathSync,symlinkSync,readdirSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {maintainBilingualSummaries as maintain,prepareBilingualSummary as prepare,submitBilingualSummary as submit,readBilingualSummary as read,detectSummaryLanguage as detect,SUMMARY_LIMITS} from './summary-language.js';
const sha=x=>createHash('sha256').update(x).digest('hex'),size=x=>Buffer.byteLength(JSON.stringify(x));
const zh='检查来源和摘要证据，保留原文和限制，不得自动启用候选资料。';
const en='Check source and summary evidence, preserve the original text and limits, and do not activate candidates.';
function fixture(t,count=1){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'avc-bilingual-unit-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'runtime'));const assets=[];
 for(let i=0;i<count;i++){
  const name='item'+String(i).padStart(3,'0'),dir=join(root,'packs/skill',name),entry=join(dir,'SKILL.md'),body='# '+name+'\n\nSource instructions are not a translated description.\n';mkdirSync(dir,{recursive:true});writeFileSync(entry,body);
  writeFileSync(join(dir,'meta.json'),JSON.stringify({name,type:'skill',version:'1.0.0',status:'candidate',description:zh}));
  assets.push({id:'general:skill:'+name,source:'general',entry,entrySha256:sha(body),description:zh,version:'1.0.0'});
 }
 const f={root,assets,options:{stateRoot:root,catalogRoot:root}};
 f.inventory=()=>writeFileSync(join(root,'runtime/asset-inventory.json'),JSON.stringify({schema:'avc.asset-inventory.v1',assets}));f.inventory();
 f.call=(input={})=>maintain(root,input,f.options);f.queue=()=>f.call({repair:true});
 f.prepare=id=>prepare(root,{requestId:id},f.options);
 f.submit=(p,summaries)=>submit(root,{requestId:p.requestId,sourceSha256:p.sourceSha256,descriptionSha256:p.descriptionSha256,policyVersion:p.policyVersion,summaries},f.options);
 return f;
}
function queued(f){const m=f.queue();assert.equal(m.items[0].status,'pending');return f.prepare(m.items[0].requestId);}

test('read-only inspection writes nothing; repair queues, submit completes and reads consume real bilingual fields',t=>{
 const f=fixture(t),before=readFileSync(join(f.root,'runtime/asset-inventory.json'));
 const inspected=f.call();assert.equal(inspected.readOnly,true);assert.equal(inspected.items[0].pairComplete,false);assert.equal(existsSync(join(f.root,'runtime/summary-language')),false);
 const p=queued(f);assert.equal(p.originalDescription,zh);assert.equal(p.sourceStatus,'candidate');assert.equal(p.limits.sourceScope,'declared-description-only');assert.deepEqual(p.missingLanguages,['en']);
 const result=f.submit(p,{en});assert.equal(result.status,'pair-complete');assert.equal(result.semanticReview,'model-declared-unverified');assert.equal(result.activation,'unchanged');
 const consumed=f.call();assert.equal(consumed.items[0].status,'reused');assert.deepEqual(consumed.items[0].summaries,{'zh-CN':zh,en});assert.equal(consumed.budget.outputBytes,size(consumed));
 assert.equal(read(f.root,f.assets[0],f.options).pairComplete,true);assert.deepEqual(readFileSync(join(f.root,'runtime/asset-inventory.json')),before);
 assert.equal(f.submit(p,{en}).status,'pair-complete');assert.equal(f.queue().appliedCount,0);
});

test('source edits and metadata-only versions invalidate old requests and cached pairs',t=>{
 const f=fixture(t),p=queued(f);f.submit(p,{en});
 const metaFile=join(f.root,'packs/skill/item000/meta.json'),meta=JSON.parse(readFileSync(metaFile));meta.version='2.0.0';writeFileSync(metaFile,JSON.stringify(meta));
 assert.equal(f.submit(p,{en}).status,'conflict');assert.equal(read(f.root,f.assets[0],f.options),null);
 f.assets[0].version='2.0.0';f.inventory();assert.equal(f.submit(p,{en}).reason,'request-source-conflict');
 const updated=queued(f);assert.notEqual(updated.requestId,p.requestId);
 writeFileSync(f.assets[0].entry,'# changed source');assert.equal(f.submit(updated,{en}).status,'conflict');
});

test('unknown language and legacy records remain pending or diagnostic without relabeling or overwriting',t=>{
 const f=fixture(t),metaFile=join(f.root,'packs/skill/item000/meta.json'),meta=JSON.parse(readFileSync(metaFile));meta.description='Docker 123';writeFileSync(metaFile,JSON.stringify(meta));f.assets[0].description=meta.description;delete f.assets[0].version;f.inventory();
 const p=queued(f);assert.equal(detect(meta.description),'unknown');assert.deepEqual(p.missingLanguages,['zh-CN','en']);
 assert.equal(f.submit(p,{en:'中文不是英文，不能仅靠标签伪造翻译。'}).status,'diagnostic');
 const one=f.submit(p,{'zh-CN':zh});assert.equal(one.status,'pending');assert.deepEqual(one.missingLanguages,['en']);assert.equal(f.submit(p,{en}).status,'pair-complete');
 const path=join(f.root,'runtime/summary-language/derived',p.requestId+'.en.json');writeFileSync(path,JSON.stringify({language:'en',summary:en}));
 assert.equal(f.queue().items[0].reason,'invalid-derived-summary');assert.equal(JSON.parse(readFileSync(path)).summary,en);assert.equal(read(f.root,f.assets[0],f.options),null);
});

test('serialized per-language limits prevent independent submissions from exceeding the pair budget',t=>{
 const f=fixture(t),p=queued(f),escaped='The source must preserve evidence and limits. '+'"'.repeat(220);
 assert.ok(Buffer.byteLength(escaped)<SUMMARY_LIMITS.fieldBytes);assert.ok(size(escaped)>SUMMARY_LIMITS.fieldBytes);
 assert.equal(f.submit(p,{en:escaped}).reason,'language-or-field-budget-unverified');
 assert.ok(size({'zh-CN':zh,en})<=SUMMARY_LIMITS.pairBytes);assert.equal(f.submit(p,{en}).pairComplete,true);
 assert.equal(f.submit(p,{'zh-CN':'不得覆盖已经保存的中文来源描述。'}).status,'conflict');
});

test('stable source-bound cursors respect complete response and cumulative budgets without creating cursor files',t=>{
 const f=fixture(t,7);let cursor,total=0,seen=[];
 for(let i=0;i<10;i++){
  const page=f.call({cursor,maxItems:2,maxOutputBytes:4096,maxTotalOutputBytes:16384});assert.ok(size(page)<=4096);assert.equal(page.budget.outputBytes,size(page));
  total+=size(page);assert.equal(page.budget.totalOutputBytes,total);seen.push(...page.items.map(x=>x.assetId));cursor=page.nextCursor;if(!cursor)break;
 }
 assert.deepEqual(seen,f.assets.map(x=>x.id));assert.equal(existsSync(join(f.root,'runtime/summary-language')),false);
 const first=f.call({maxItems:1});f.assets.reverse();f.inventory();assert.equal(f.call({cursor:first.nextCursor}).reason,'inventory-changed-restart-scan');
});

test('oversize item, unmanaged item, and per-item write conflict do not stop later items',t=>{
 const f=fixture(t,3);writeFileSync(f.assets[0].entry,'x'.repeat(SUMMARY_LIMITS.sourceBytes+1));f.assets[1].source='personal';f.inventory();
 const page=f.queue();assert.equal(page.items[0].reason,'item-too-large');assert.equal(page.items[1].status,'diagnostic');assert.equal(page.items[2].status,'pending');assert.equal(page.taskContinues,true);
 const f2=fixture(t,2),pending=f2.call().items[0],requestDir=join(f2.root,'runtime/summary-language/requests');mkdirSync(requestDir,{recursive:true});writeFileSync(join(requestDir,pending.requestId+'.json'),'{}');
 const conflict=f2.queue();assert.equal(conflict.items[0].status,'conflict');assert.equal(conflict.items[1].status,'pending');
});

test('path escapes and symlinks cannot read or write outside the managed roots',t=>{
 const f=fixture(t,2),outside=join(f.root,'outside');mkdirSync(outside);const outsideFile=join(outside,'SKILL.md');writeFileSync(outsideFile,'secret');
 f.assets[0].entry=outsideFile;f.assets[0].entrySha256=sha('secret');f.inventory();assert.equal(f.queue().items[0].reason,'outside-registered-central-packs');
 rmSync(join(f.root,'runtime/summary-language'),{recursive:true,force:true});symlinkSync(outside,join(f.root,'runtime/summary-language'),'dir');
 const result=f.queue();assert.equal(result.items[1].reason,'unsafe-managed-path');assert.deepEqual(readdirSync(outside),['SKILL.md']);
});

test('one KiB total responses, cumulative exhaustion, and read budgets remain bounded and nonblocking',t=>{
 const f=fixture(t,10);const tiny=f.call({repair:true,maxItems:100,maxOutputBytes:1024});assert.ok(size(tiny)<=1024);assert.equal(tiny.taskContinues,true);
 assert.equal(existsSync(join(f.root,'runtime/summary-language')),false);
 let page=f.call({maxItems:1,maxTotalOutputBytes:3000}),total=size(page),runs=1;
 while(page.nextCursor&&runs<10){page=f.call({maxItems:1,maxTotalOutputBytes:3000,cursor:page.nextCursor});total+=size(page);runs++;}
 assert.ok(total<=3000);assert.ok(runs<10);
 const limited=f.call({maxReadBytes:10});assert.equal(limited.reason,'page-read-budget');assert.equal(limited.taskContinues,true);
});

test('verified legacy descriptions longer than output fields can be shortened and translated without overwriting metadata',t=>{
 const f=fixture(t),path=join(f.root,'packs/skill/item000/meta.json'),meta=JSON.parse(readFileSync(path)),long='保留原文和所有限制条件，不得自动启用未经审核候选资料。'.repeat(8);
 assert.ok(Buffer.byteLength(long)>SUMMARY_LIMITS.fieldBytes);assert.ok(Buffer.byteLength(long)<=1024);
 meta.description=long;writeFileSync(path,JSON.stringify(meta));f.assets[0].description=long;f.inventory();
 const p=queued(f);assert.equal(p.originalDescription,long);assert.deepEqual(p.missingLanguages,['zh-CN','en']);
 assert.equal(f.submit(p,{'zh-CN':zh,en}).status,'pair-complete');assert.equal(JSON.parse(readFileSync(path)).description,long);
});

test('prepare and submit honor their own response limits before accepting generated fields',t=>{
 const f=fixture(t),metaPath=join(f.root,'packs/skill/item000/meta.json'),meta=JSON.parse(readFileSync(metaPath));meta.description='Docker 123';writeFileSync(metaPath,JSON.stringify(meta));f.assets[0].description=meta.description;f.inventory();
 const p=queued(f),longZh='保留来源证据，不得自动升级候选资料。'.repeat(7),longEn='Preserve the source and all limits before using the candidate. '.repeat(7);
 assert.ok(size(longZh)<=480);assert.ok(size(longEn)<=480);
 const result=submit(f.root,{...p,summaries:{'zh-CN':longZh,en:longEn},maxOutputBytes:1024},f.options);
 assert.equal(result.reason,'response-budget-exceeded');assert.ok(size(result)<=1024);assert.equal(read(f.root,f.assets[0],f.options),null);
 assert.ok(size(prepare(f.root,{requestId:p.requestId,maxOutputBytes:1024},f.options))<=1024);
});


test('a request persisted before a derived-field write failure reports partial mutation truthfully',t=>{
 if(process.getuid?.()===0){t.skip('Requires ordinary-user filesystem permissions');return;}
 const f=fixture(t),derived=join(f.root,'runtime/summary-language/derived');mkdirSync(derived,{recursive:true});chmodSync(derived,0o500);
 try{
  const result=f.queue(),item=result.items[0];assert.equal(item.status,'deferred');assert.equal(item.partialWrite,true);assert.equal(item.writesApplied,1);assert.equal(result.appliedCount,1);assert.equal(result.taskContinues,true);
  assert.equal(existsSync(join(f.root,'runtime/summary-language/requests',item.requestId+'.json')),true);assert.equal(existsSync(join(derived,item.requestId+'.zh-CN.json')),false);
 }finally{chmodSync(derived,0o700);}
 const recovered=f.queue();assert.equal(recovered.items[0].status,'pending');assert.equal(recovered.items[0].writesApplied,1);
});

test('two-language submit reports the first persisted language when the second write fails and resumes idempotently',async t=>{
 const f=fixture(t),metaPath=join(f.root,'packs/skill/item000/meta.json'),meta=JSON.parse(readFileSync(metaPath));meta.description='Docker 123';writeFileSync(metaPath,JSON.stringify(meta));f.assets[0].description=meta.description;f.inventory();const p=queued(f);
 const fs=(await import('node:fs')).default,{syncBuiltinESMExports}=await import('node:module'),original=fs.linkSync;
 const mock=t.mock.method(fs,'linkSync',(source,target)=>{if(target.endsWith('.en.json'))throw Object.assign(new Error('injected second language failure'),{code:'EACCES'});return original(source,target);});syncBuiltinESMExports();
 try{
  const result=f.submit(p,{'zh-CN':zh,en});assert.equal(result.status,'deferred');assert.equal(result.partialWrite,true);assert.equal(result.writesApplied,1);assert.deepEqual(result.writtenLanguages,['zh-CN']);assert.equal(result.taskContinues,true);
  const cached=read(f.root,f.assets[0],f.options);assert.deepEqual(cached.summaries,{'zh-CN':zh});assert.equal(cached.pairComplete,false);
 }finally{mock.mock.restore();syncBuiltinESMExports();}
 const recovered=f.submit(p,{'zh-CN':zh,en});assert.equal(recovered.status,'pair-complete');assert.equal(recovered.writesApplied,1);assert.deepEqual(recovered.writtenLanguages,['en']);
});

test('post-commit temporary cleanup failures preserve committed counts and report a bounded warning',async t=>{
 const f=fixture(t),fs=(await import('node:fs')).default,{syncBuiltinESMExports}=await import('node:module'),original=fs.rmSync;
 const mock=t.mock.method(fs,'rmSync',(path,options)=>{if(String(path).endsWith('.tmp'))throw Object.assign(new Error('injected cleanup failure'),{code:'EACCES'});return original(path,options);});syncBuiltinESMExports();
 try{
  const maintained=f.queue(),item=maintained.items[0];assert.equal(maintained.appliedCount,1);assert.equal(item.writesApplied,2);assert.equal(item.status,'pending');assert.equal(maintained.cleanupWarning,'temporary-record-cleanup-failed');assert.equal(maintained.budget.outputBytes,size(maintained));assert.ok(size(maintained)<=4096);
  const prepared=f.prepare(item.requestId);assert.deepEqual(prepared.summaries,{'zh-CN':zh});
  const completed=f.submit(prepared,{en});assert.equal(completed.status,'pair-complete');assert.equal(completed.writesApplied,1);assert.deepEqual(completed.writtenLanguages,['en']);assert.equal(completed.cleanupWarning,'temporary-record-cleanup-failed');assert.ok(size(completed)<=4096);
  assert.equal(read(f.root,f.assets[0],f.options).pairComplete,true);assert.equal(f.submit(prepared,{en}).writesApplied,0);
 }finally{mock.mock.restore();syncBuiltinESMExports();}
});
