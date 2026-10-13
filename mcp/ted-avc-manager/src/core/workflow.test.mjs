import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createWorkflow,validateWorkflow,workflowStatus,runWorkflow,cancelWorkflow,workflowTemplates} from './workflow.js';
function fixture(t) {
 fs.mkdirSync('runtime/cache',{recursive:true}); const root=fs.mkdtempSync(path.resolve('runtime/cache/workflow-')); t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const [type,name] of [['role','ai-engineer'],['skill','build'],['skill','verify']]){
  const dir=path.join(root,'packs',type,name);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify({type,name,version:'1.0.0'}));fs.writeFileSync(path.join(dir,type==='role'?'PROFILE.md':'SKILL.md'),'# '+name);
 }
 return root;
}
const use=name=>({id:'general:skill:'+name,usage:'support',purpose:'用于本节点核对'});
const node=(id,dependsOn=[],code=`require('fs').writeFileSync('${id}.txt','actual output')`)=>({id,title:id,role:'ai-engineer',assets:[use('verify')],dependsOn,maxAttempts:1,executor:{kind:'command',command:process.execPath,args:['-e',code],cwd:'.',timeoutMs:5000},outputs:[id+'.txt'],acceptance:'命令成功退出且产物存在'});
const spec=nodes=>({schema:'avc.workflow.v1',id:'test-flow',title:'测试流程',goal:'验证真实节点执行',owner:'ai-engineer',assets:[use('build')],maxParallel:2,maxAttemptsTotal:12,nodes});
test('strict DAG contract rejects cycles, unknown fields, unsupported executors, paths and insufficient budgets',()=>{
 for(const mutate of [s=>s.unknown=true,s=>s.nodes[0].dependsOn=['missing'],s=>s.nodes[0].dependsOn=['first'],s=>s.nodes[0].executor.kind='pretend-model',s=>s.nodes[0].outputs=['../escape'],s=>s.assets.push(use('build')),s=>s.maxAttemptsTotal=0,s=>s.nodes[0].executor.allowedTools=['*']]){
  const s=spec([node('first')]);mutate(s);assert.throws(()=>validateWorkflow(s));
 }
 const s=spec([node('a',['b']),node('b',['a'])]);assert.throws(()=>validateWorkflow(s),/cycle/);
});
test('single node combines task and node assets; pinning, explicit run consent and repeat run prevent replay',async t=>{
 const root=fixture(t),s=spec([node('first')]);const created=createWorkflow(root,s);assert.equal(created.nodes.first.status,'ready');assert.equal(created.assets.length,3);
 assert.equal(createWorkflow(root,s).specSha256,created.specSha256);assert.throws(()=>createWorkflow(root,{...s,goal:'expand'}),/immutable/);
 await assert.rejects(runWorkflow(root,s.id),/authorization/);assert.ok(!fs.existsSync(path.join(root,'first.txt')));
 const done=await runWorkflow(root,s.id,{authorized:true});assert.equal(done.status,'succeeded');assert.equal(done.nodes.first.attempts[0].exitCode,0);assert.equal(done.nodes.first.attempts[0].outputs[0].sha256.length,64);
 assert.match(done.nodes.first.attempts[0].contextDelivery,/reference-only/);
 assert.equal((await runWorkflow(root,s.id,{authorized:true})).attemptsUsed,1);
});
test('parallel independent nodes actually overlap and dependent node waits for both real outputs',async t=>{
 const root=fixture(t),a=node('a'),b=node('b'),c=node('c',['a','b']);
 for(const [n,other] of [[a,'b'],[b,'a']])n.executor.args=['-e',`const fs=require('fs');fs.writeFileSync('${n.id}.started','yes');const timer=setInterval(()=>{if(fs.existsSync('${other}.started')){clearInterval(timer);fs.writeFileSync('${n.id}.txt','parallel done')}},10)`];
 c.executor.args=['-e',"const fs=require('fs');if(!fs.existsSync('a.txt')||!fs.existsSync('b.txt'))process.exit(2);fs.writeFileSync('c.txt','joined')"];
 createWorkflow(root,spec([a,b,c]));const done=await runWorkflow(root,'test-flow',{authorized:true});assert.equal(done.status,'succeeded');assert.equal(done.attemptsUsed,3);
});
test('bounded retry keeps attempts; exhausted failure selects failure branch and skips success branch',async t=>{
 const root=fixture(t),first=node('first',[],"const fs=require('fs');fs.appendFileSync('tries','x');process.exit(7)");first.maxAttempts=2;
 const failure=node('failure',['first']),success=node('success',['first']);failure.when={node:'first',status:'failed'};success.when={node:'first',status:'succeeded'};
 createWorkflow(root,spec([first,failure,success]));const done=await runWorkflow(root,'test-flow',{authorized:true});assert.equal(done.status,'completed_with_failures');assert.equal(done.nodes.first.attempts.length,2);assert.equal(fs.readFileSync(path.join(root,'tries'),'utf8'),'xx');assert.equal(done.nodes.failure.status,'succeeded');assert.equal(done.nodes.success.status,'skipped');assert.ok(!fs.existsSync(path.join(root,'success.txt')));
});
test('ordinary dependency blocks after failure; exit zero without output does not pass acceptance',async t=>{
 const root=fixture(t);createWorkflow(root,spec([node('first',[],'process.exit(0)'),node('next',['first'])]));
 const s=await runWorkflow(root,'test-flow',{authorized:true});assert.equal(s.nodes.first.status,'failed');assert.equal(s.nodes.next.status,'blocked');assert.ok(!fs.existsSync(path.join(root,'next.txt')));
});
test('asset drift and symlinks prevent handler side effects',async t=>{
 const root=fixture(t);createWorkflow(root,spec([node('first')]));fs.appendFileSync(path.join(root,'packs/skill/build/SKILL.md'),'changed');
 assert.equal((await runWorkflow(root,'test-flow',{authorized:true})).nodes.first.status,'blocked');assert.ok(!fs.existsSync(path.join(root,'first.txt')));
 const file=path.join(root,'runtime/workflows/test-flow/state.json'),protectedFile=path.join(root,'protected');fs.writeFileSync(protectedFile,'safe');fs.rmSync(file);fs.symlinkSync(protectedFile,file);assert.throws(()=>workflowStatus(root,'test-flow'),/symlink/);assert.equal(fs.readFileSync(protectedFile,'utf8'),'safe');
});
test('cancellation waits for actual process stop and prevents dependent side effects',async t=>{
 const root=fixture(t),n=node('first',[],"require('fs').writeFileSync('started','yes');setTimeout(()=>require('fs').writeFileSync('first.txt','late'),10000)");n.executor.timeoutMs=20000;
 createWorkflow(root,spec([n,node('next',['first'])]));const running=runWorkflow(root,'test-flow',{authorized:true});
 const deadline=Date.now()+5000;while(!fs.existsSync(path.join(root,'started'))&&Date.now()<deadline)await new Promise(r=>setTimeout(r,20));assert.ok(fs.existsSync(path.join(root,'started')));
 assert.equal(cancelWorkflow(root,'test-flow').status,'cancelling');const done=await running;assert.equal(done.status,'cancelled');assert.equal(done.nodes.first.status,'cancelled');assert.ok(!fs.existsSync(path.join(root,'next.txt')));assert.ok(!fs.existsSync(path.join(root,'first.txt')));
});
test('node timeout records real terminal failure and does not start dependents',async t=>{
 const root=fixture(t),n=node('first',[],'setTimeout(()=>{},10000)');n.executor.timeoutMs=120;
 createWorkflow(root,spec([n,node('next',['first'])]));const done=await runWorkflow(root,'test-flow',{authorized:true});assert.equal(done.nodes.first.status,'timed_out');assert.equal(done.nodes.next.status,'blocked');
});
test('native nodes never become executed through the command runner',async t=>{
 const root=fixture(t),n=node('native');n.executor={kind:'native',allowedTools:['functions.exec'],maxToolCalls:3};createWorkflow(root,spec([n]));
 const s=await runWorkflow(root,'test-flow',{authorized:true});assert.equal(s.status,'ready');assert.equal(s.nodes.native.attempts.length,0);
});
test('published workflow templates are valid and every assigned asset exists',()=>{
 const root=path.resolve('.');for(const template of workflowTemplates(root)){
  validateWorkflow(template);for(const n of template.nodes)for(const a of [...template.assets,...n.assets]){const [,type,name]=a.id.split(':');assert.ok(fs.existsSync(path.join(root,'packs',type,name,'meta.json')));}
 }
});

test('parallel output conflicts are rejected while sequential ownership is explicit',()=>{
 const a=node('a'),b=node('b');b.outputs=a.outputs;assert.throws(()=>validateWorkflow(spec([a,b])),/ownership/);
 b.dependsOn=['a'];assert.doesNotThrow(()=>validateWorkflow(spec([a,b])));
});
test('unchanged output from before the attempt cannot satisfy node completion',async t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'first.txt'),'old');createWorkflow(root,spec([node('first',[],'process.exit(0)')]));
 const run=await runWorkflow(root,'test-flow',{authorized:true});assert.equal(run.nodes.first.status,'failed');assert.match(run.nodes.first.attempts[0].reason,/unchanged/);
});
test('supporting reference and owner profile drift block before executing commands',async t=>{
 for(const target of ['packs/skill/build/reference.md','packs/role/ai-engineer/PROFILE.md']) {
  const root=fixture(t);createWorkflow(root,spec([node('first')]));fs.appendFileSync(path.join(root,target),'changed');
  const run=await runWorkflow(root,'test-flow',{authorized:true});assert.equal(run.nodes.first.status,'blocked');assert.ok(!fs.existsSync(path.join(root,'first.txt')));
 }
});
test('registered local skill participates in a pinned workflow; any reference drift blocks it',async t=>{
 const {registerLocalSkill}=await import('./local-assets.js');const root=fixture(t);
 fs.writeFileSync(path.join(root,'bootstrap.json'),JSON.stringify({name:'example',version:'1.0.0'}));
 const personal=path.join(root,'private/projects/example'),dir=path.join(personal,'custom/packs/skill/local-example');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(root,'runtime'),{recursive:true});fs.writeFileSync(path.join(root,'runtime/storage.json'),JSON.stringify({personal}));
 fs.writeFileSync(path.join(dir,'SKILL.md'),'# Local');fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify({type:'skill',name:'local-example',version:'1.0.0',rubric:['quality']}));
 const s=spec([node('first')]);s.assets.push({id:'local-custom:skill:local-example',usage:'support',purpose:'Local method'});
 assert.throws(()=>createWorkflow(root,s),/registered/);registerLocalSkill(root,dir);createWorkflow(root,s);
 fs.writeFileSync(path.join(dir,'reference.md'),'changed');assert.equal((await runWorkflow(root,s.id,{authorized:true})).nodes.first.status,'blocked');
});
test('dead command owner is uncertain and never automatically replayed',async t=>{
 const root=fixture(t),s=spec([node('first')]);createWorkflow(root,s);
 const file=path.join(root,'runtime/workflows/test-flow/state.json'),state=JSON.parse(fs.readFileSync(file));
 state.nodes.first={status:'running',attempts:[{adapter:'command',ownerPid:2147483647,status:'running'}]};fs.writeFileSync(file,JSON.stringify(state));
 const recovered=await runWorkflow(root,s.id,{authorized:true});assert.equal(recovered.status,'needs_attention');assert.ok(!fs.existsSync(path.join(root,'first.txt')));
});
