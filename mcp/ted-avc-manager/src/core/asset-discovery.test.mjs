import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {refreshInventory,listAssets,recommendAssets,recordAssetUse,noteDeliveredAsset} from './awareness.js';
import {findSkills} from './local-assets.js';
import {discoverAssets} from './asset-discovery.js';
import {maintainBilingualSummaries,prepareBilingualSummary,submitBilingualSummary} from './summary-language.js';
import {searchAssets} from './asset-search.js';
import {contextStatus,deliverContext,CONTEXT_LIMITS} from './context-budget.js';
function fixture(t,count=1){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'avc-discovery-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'runtime'));writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'fixture',version:'1.0.0'}));
 for(let i=0;i<count;i++){
  const name='sample'+String(i).padStart(3,'0'),dir=join(root,'packs/skill',name);mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,'meta.json'),JSON.stringify({name,type:'skill',version:'1.0.0',status:'active',description:'Inspect satellite telemetry and preserve the source before maintenance.',rubric:['source']}));
  writeFileSync(join(dir,'SKILL.md'),'# Satellite telemetry\n\nKeep the source intact.\n');
 }
 return {root,options:{externalRoots:[],stateRoot:root,catalogRoot:root}};
}
test('actual find/list/recommend and paged discovery consume bilingual cache and invalidate metadata-only revisions',t=>{
 const f=fixture(t);refreshInventory(f.root,f.options);
 assert.equal(findSkills(f.root,'卫星遥测',f.options).skills.length,0);
 const pending=maintainBilingualSummaries(f.root,{repair:true},f.options),requestId=pending.items[0].requestId;
 const p=prepareBilingualSummary(f.root,{requestId},f.options);
 assert.equal(submitBilingualSummary(f.root,{...p,summaries:{'zh-CN':'检查卫星遥测数据，维护前保留来源并核对证据。'}},f.options).status,'pair-complete');
 const original=JSON.parse(readFileSync(join(f.root,'packs/skill/sample000/meta.json'))).description;
 for(const result of [findSkills(f.root,'帮我检查卫星遥测数据',f.options).skills,listAssets(f.root,{query:'卫星遥测'},f.options).assets,recommendAssets(f.root,'卫星遥测',f.options).recommendations]){
  assert.equal(result[0].name,'sample000');assert.equal(result[0].description,original);assert.ok(result[0].matches.some(m=>m.kind==='source-bound-bilingual'));
 }
 const key={sessionId:'s',turnId:'t'},page=discoverAssets(f.root,{query:'卫星遥测',...key},f.options);
 assert.equal(page.assets[0].bilingualSummary.pairComplete,true);assert.equal(page.contextDelivery.accounted,true);
 assert.equal(contextStatus(f.root,key).turnBytes,Buffer.byteLength(JSON.stringify(page)));
 const meta=join(f.root,'packs/skill/sample000/meta.json'),value=JSON.parse(readFileSync(meta));value.version='2.0.0';writeFileSync(meta,JSON.stringify(value));
 assert.equal(findSkills(f.root,'卫星遥测',f.options).skills.length,0);
 assert.equal(findSkills(f.root,'satellite',f.options).skills[0].name,'sample000');
});
test('logical-task demand is weak, source-bound, decayed and never increased by discovery or delivery',t=>{
 const f=fixture(t,2),assets=listAssets(f.root,{},f.options).assets,hot=assets.find(a=>a.name==='sample001');
 const first=recordAssetUse(f.root,{assetId:hot.id,logicalTaskId:'logical-one',sessionId:'s',turnId:'a'},f.options);
 recordAssetUse(f.root,{assetId:hot.id,logicalTaskId:'logical-one',sessionId:'s',turnId:'b'},f.options);
 const eventFile=join(f.root,'runtime/asset-events.jsonl'),events=readFileSync(eventFile,'utf8').trim().split('\n').map(JSON.parse),adoptions=events.filter(e=>e.kind==='model-reported');
 adoptions[0].at='2026-10-10T00:00:00.000Z';adoptions[1].at='2026-10-15T00:00:00.000Z';writeFileSync(eventFile,events.map(JSON.stringify).join('\n')+'\n');
 const selected=findSkills(f.root,'satellite',{...f.options,now:Date.parse('2026-10-15T00:00:00Z')});
 assert.equal(selected.skills[0].id,hot.id);assert.ok(selected.skills[0].selection.recencyBoost>0&&selected.skills[0].selection.recencyBoost<0.02);
 assert.equal(findSkills(f.root,'unrelated-zebra',f.options).skills.length,0);
 const before=readFileSync(eventFile,'utf8');findSkills(f.root,'satellite',f.options);assert.equal(readFileSync(eventFile,'utf8'),before);
 const body=readFileSync(hot.entry,'utf8');noteDeliveredAsset(f.root,{...hot,content:body,sha256:hot.entrySha256},{sessionId:'s',turnId:'c'});
 assert.equal(findSkills(f.root,'satellite',{...f.options,now:Date.parse('2026-10-15T00:00:00Z')}).skills[0].selection.recencyBoost,selected.skills[0].selection.recencyBoost);
 writeFileSync(hot.entry,body+'\nChanged revision');assert.equal(findSkills(f.root,'satellite',f.options).skills.find(a=>a.id===hot.id).selection.recencyBoost,0);
 assert.equal(first.evidence,'declaration-only; not observed read or semantic execution');
});
test('natural-language union retrieval preserves exact identifiers and explicit positive intent',()=>{
 const assets=[{id:'mail',name:'mail',description:'发邮件 send email'},{id:'java',name:'java',description:'解释Java里的分层 architecture'},{id:'improve',name:'improve',description:'improve design'}];
 assert.equal(searchAssets(assets,'不是要发邮件，只想解释Java里的分层')[0].id,'java');
 assert.equal(searchAssets(assets,'不是要发邮件，只想解释Java里的分层').some(a=>a.id==='mail'),false);
 assert.equal(searchAssets(assets,'PR').some(a=>a.id==='improve'),false);
 assert.equal(searchAssets(assets,'请解释 architecture 这个问题')[0].id,'java');
});
test('bounded pages cover untagged referenced rules, reject stale cursors and share parent/child quota',t=>{
 const f=fixture(t,15);mkdirSync(join(f.root,'rules'));writeFileSync(join(f.root,'rules/account.md'),'# 账号选择\n\n创建 PR 前必须核对已授权账号。');
 mkdirSync(join(f.root,'packs/skill/sample000/references'));writeFileSync(join(f.root,'packs/skill/sample000/references/nested.md'),'# 冷门规则\n\n必须先保留原始资料。');
 const rule=discoverAssets(f.root,{query:'创建PR核对账号'},f.options);assert.ok(rule.assets.some(a=>a.id==='general:document:rules/account.md'));assert.equal(rule.assets.find(a=>a.id==='general:document:rules/account.md').eligibility.activation,'not-granted-by-search');
 const ids=[],key={sessionId:'shared',turnId:'turn'};let cursor;
 do{const page=discoverAssets(f.root,{...key,cursor,maxItems:2,maxBytes:4096},f.options);assert.ok(Buffer.byteLength(JSON.stringify(page))<=4096);assert.equal(page.contextDelivery.status,'delivered');ids.push(...page.assets.map(a=>a.id));cursor=page.nextCursor;}while(cursor);
 assert.equal(new Set(ids).size,ids.length);assert.ok(ids.includes('general:document:packs/skill/sample000/references/nested.md'));
 let remaining=CONTEXT_LIMITS.turnBytes-contextStatus(f.root,key).turnBytes,i=0;
 while(remaining){const bytes=Math.min(8192,remaining);deliverContext(f.root,{...key,agentId:'filler'},'fill'+i++,'x'.repeat(bytes));remaining-=bytes;}
 const blocked=discoverAssets(f.root,{...key,agentId:'new-child',query:'satellite'},f.options);assert.equal(blocked.contextDelivery.status,'budget-exhausted');assert.equal(blocked.assets,undefined);assert.equal(blocked.taskContinues,true);
 const p=discoverAssets(f.root,{maxItems:1},f.options);assert.ok(p.nextCursor);writeFileSync(join(f.root,'packs/skill/sample000/SKILL.md'),'# Changed');
 assert.match(discoverAssets(f.root,{cursor:p.nextCursor},f.options).reason,/changed/);
});
test('corrupt summary and demand metadata degrade independently while base discovery and authorized work continue',t=>{
 const f=fixture(t);refreshInventory(f.root,f.options);writeFileSync(join(f.root,'runtime/asset-events.jsonl'),'{broken');
 mkdirSync(join(f.root,'packs/knowledge'));writeFileSync(join(f.root,'packs/knowledge/catalog.json'),'{broken');
 const page=discoverAssets(f.root,{query:'satellite'},f.options);assert.equal(page.assets[0].name,'sample000');assert.equal(page.coverage.recency,'unavailable');
 assert.ok(page.coverage.warnings>0);
 mkdirSync(join(f.root,'runtime/context'));writeFileSync(join(f.root,'runtime/context','placeholder'),'unused');
 const key={sessionId:'broken',turnId:'t'};deliverContext(f.root,key,'first','one');
 const file=join(f.root,'runtime/context',createHash('sha256').update(JSON.stringify([key.sessionId,''])).digest('hex')+'.json');writeFileSync(file,'{broken');
 const failed=discoverAssets(f.root,{...key,query:'satellite'},f.options);assert.equal(failed.contextDelivery.status,'unverified');assert.equal(failed.assets,undefined);assert.equal(failed.taskContinues,true);
 writeFileSync(join(f.root,'authorized-business-result'),'completed');assert.equal(readFileSync(join(f.root,'authorized-business-result'),'utf8'),'completed');
});
test('an oversized metadata card is deferred with a lookup reference and cannot strand all later rules',t=>{
 const f=fixture(t,3),file=join(f.root,'packs/skill/sample000/meta.json'),meta=JSON.parse(readFileSync(file));meta.name='x'.repeat(10000);writeFileSync(file,JSON.stringify(meta));
 const first=discoverAssets(f.root,{maxItems:1},f.options);assert.equal(first.assets[0].status,'deferred');assert.match(first.assets[0].lookupId,/^[a-f0-9]{64}$/);assert.ok(first.nextCursor);
 const later=discoverAssets(f.root,{cursor:first.nextCursor},f.options);assert.ok(later.assets.some(a=>a.name==='sample001'));assert.ok(Buffer.byteLength(JSON.stringify(first))<=4096);
});
test('bilingual matching does not permanently privilege the first 256 assets of a larger inventory',t=>{
 const f=fixture(t,260),file=join(f.root,'packs/skill/sample259/meta.json'),meta=JSON.parse(readFileSync(file));meta.description='Inspect reversed magnetic field calibration and preserve the source before maintenance.';writeFileSync(file,JSON.stringify(meta));
 const asset=listAssets(f.root,{},f.options).assets.find(a=>a.name==='sample259');
 writeFileSync(join(f.root,'runtime/asset-inventory.json'),JSON.stringify({schema:'avc.asset-inventory.v1',assets:[asset]}));
 const queued=maintainBilingualSummaries(f.root,{repair:true},f.options),p=prepareBilingualSummary(f.root,{requestId:queued.items[0].requestId},f.options);
 assert.equal(submitBilingualSummary(f.root,{...p,summaries:{'zh-CN':'检查反向磁场校准数据，维护前保留来源和证据。'}},f.options).status,'pair-complete');
 const result=findSkills(f.root,'反向磁场校准',f.options);assert.equal(result.skills[0].name,'sample259');assert.equal(result.coverage.bilingual.checked,260);assert.ok(result.coverage.bilingual.readBytes<65536);
});
test('entry-body-only rules are discoverable under their original identities without returning or persisting the body',t=>{
 const f=fixture(t),file=join(f.root,'packs/skill/sample000/SKILL.md');
 writeFileSync(file,'# Satellite telemetry\n\nBefore hazelnutprotocol, verify the authorized account.\n');
 const inventory=refreshInventory(f.root,f.options),id=inventory.assets.find(a=>a.name==='sample000').id;
 for(const filter of [{},{type:'skill'},{kind:'skills'},{kind:'packs'}]){
  const page=discoverAssets(f.root,{query:'hazelnutprotocol',...filter},f.options);
  assert.equal(page.assets.length,1);assert.equal(page.assets[0].id,id);
  assert.equal(page.assets[0].load.name,'sample000');assert.equal(page.assets[0].searchText,undefined);
  assert.ok(page.assets[0].matches.some(m=>m.field==='searchText'));
 }
 assert.equal(listAssets(f.root,{},f.options).assets[0].searchText,undefined);
 assert.equal(JSON.parse(readFileSync(join(f.root,'runtime/asset-inventory.json'))).assets[0].searchText,undefined);
 const nativeRoot=join(f.root,'native-skills'),nativeDir=join(nativeRoot,'local-guard');mkdirSync(nativeDir,{recursive:true});
 writeFileSync(join(nativeDir,'SKILL.md'),'---\nname: local-guard\ndescription: Local maintenance guidance.\n---\n\nBefore pecanprotocol verify the authorized account.');
 const native=discoverAssets(f.root,{query:'pecanprotocol',kind:'skills'},{...f.options,externalRoots:[nativeRoot]});
 assert.equal(native.assets.length,1);assert.equal(native.assets[0].source,'external-installed');assert.equal(native.assets[0].searchText,undefined);
 mkdirSync(join(f.root,'rules'));writeFileSync(join(f.root,'rules/guard.md'),'# Guard\n\nBefore cedarprotocol, verify the authorized account.');
 assert.equal(discoverAssets(f.root,{query:'cedarprotocol',kind:'packs'},f.options).assets.length,0);
 assert.equal(discoverAssets(f.root,{query:'cedarprotocol'},f.options).assets[0].id,'general:document:rules/guard.md');
});
test('damaged auxiliary native indexes do not hide independent rules or claim native installation',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'rules'));writeFileSync(join(f.root,'rules/guard.md'),'# Guard\n\nBefore cedarprotocol, verify the authorized account.');
 for(const bad of ['{broken',JSON.stringify({entries:{path:'bad'}}),JSON.stringify({entries:[{path:123},null]})]){
  writeFileSync(join(f.root,'runtime/native-skill-index.json'),bad);
  const page=discoverAssets(f.root,{query:'cedarprotocol'},f.options);
  assert.equal(page.status,'complete');assert.equal(page.taskContinues,true);
  assert.equal(page.assets[0].id,'general:document:rules/guard.md');assert.ok(page.coverage.warnings>0);
  assert.equal(listAssets(f.root,{},f.options).assets[0].nativeInstalled,'unverified');
 }
});
