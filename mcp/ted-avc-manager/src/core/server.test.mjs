import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
test('stdio handshake serves management tools and malformed resource URI does not terminate connection',async t=>{
 mkdirSync('runtime/cache',{recursive:true});const root=mkdtempSync(resolve('runtime/cache/server-'));mkdirSync(join(root,'runtime'));mkdirSync(join(root,'packs'));writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'probe',version:'1.2.0'}));
 const home=join(root,'client');mkdirSync(join(home,'ted-avc-manager/package'),{recursive:true});writeFileSync(join(home,'ted-avc-manager/manifest.json'),JSON.stringify({schema:'avc.client-installation.v1',owner:'ted-avc-manager',version:'1.0.0',generation:'test',downstream:{central:root}}));writeFileSync(join(home,'ted-avc-manager/package/package.json'),JSON.stringify({version:'1.0.0'}));
 const p=spawn(process.execPath,[fileURLToPath(new URL('../cli.js',import.meta.url)),'server'],{cwd:root,env:{...process.env,CODEX_HOME:home,AVC_GENERATION:''},stdio:['pipe','pipe','pipe']});t.after(()=>{p.kill();rmSync(root,{recursive:true,force:true});});
 let seq=0;const pending=new Map();createInterface({input:p.stdout}).on('line',line=>{const msg=JSON.parse(line);pending.get(msg.id)?.(msg);});
 const rpc=(method,params={})=>new Promise((res,rej)=>{const id=++seq,timer=setTimeout(()=>rej(new Error('MCP response timeout')),5000);pending.set(id,msg=>{clearTimeout(timer);pending.delete(id);res(msg);});p.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 const hello=await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'probe',version:'1'}});assert.equal(hello.result.serverInfo.name,'ted-avc-manager');
 p.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const tools=(await rpc('tools/list')).result.tools;assert.ok(tools.some(t=>t.name==='task_begin'));assert.ok(tools.some(t=>t.name==='find_skill'));
 for (const name of ['workflow_create','workflow_status','workflow_cancel','workflow_templates','discover_capabilities','validate_local_skill','list_skill_candidates']) assert.ok(tools.some(t=>t.name===name));
 assert.ok(tools.find(t=>t.name==='task_begin').inputSchema.properties.workflowId);
 for (const name of ['task_begin','load_asset','task_closeout']) {
  assert.deepEqual(tools.find(t=>t.name===name).annotations,{readOnlyHint:false,destructiveHint:false,openWorldHint:false});
 }
 assert.equal(tools.find(t=>t.name==='upgrade').annotations,undefined);
 for(const name of ['ted_help','ted_update','ted_scores','ted_doctor','ted_repair','ted_status'])assert.equal(tools.find(t=>t.name===name).annotations.readOnlyHint,true);
 assert.equal(tools.find(t=>t.name==='ted_panorama').annotations.readOnlyHint,false);
 assert.deepEqual((await rpc('prompts/list')).result.prompts.map(p=>p.name),['ted']);
 const prompt=await rpc('prompts/get',{name:'ted',arguments:{action:'doctor'}});assert.match(prompt.result.messages[0].content.text,/ted_doctor/);
 assert.equal((await rpc('prompts/get',{name:'ted',arguments:{action:'doctor;install'}})).error.code,-32602);
 // A stale engine must still serve read-only diagnosis; fixed doctor cannot be
 // redirected to panorama by an extra action argument in a raw protocol call.
 const doctor=await rpc('tools/call',{name:'ted_doctor',arguments:{action:'panorama'}});assert.equal(JSON.parse(doctor.result.content[0].text).action,'doctor');
 const repair=await rpc('tools/call',{name:'ted_repair',arguments:{}});assert.equal(JSON.parse(repair.result.content[0].text).applied,false);
 const update=await rpc('tools/call',{name:'check_update',arguments:{}});assert.match(update.result.content[0].text,/已安装客户端 v1.0.0/);assert.match(update.result.content[0].text,/中央仓库声明 v1.2.0/);assert.match(update.result.content[0].text,/可升级/);assert.match(update.result.content[0].text,/当前 MCP 进程/);
 const templates=await rpc('tools/call',{name:'workflow_templates',arguments:{}});assert.deepEqual(JSON.parse(templates.result.content[0].text),[]);
 const invalid=await rpc('tools/call',{name:'discover_capabilities',arguments:{zhQuery:'only English',enQuery:'skills'}});assert.match(invalid.error.message,/Chinese/);
 assert.equal((await rpc('resources/read',{uri:'tedavc://asset/%INVALID'})).error.code,-32602);
 assert.ok((await rpc('resources/list')).result.resources);
});
