import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {contextStatus,CONTEXT_LIMITS} from './context-budget.js';
function fixture(t){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'avc-native-context-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const state=join(root,'state');mkdirSync(state);const dir=join(root,'packs/role/ai-engineer');mkdirSync(dir,{recursive:true});
 const version=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url))).version;
 writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'test',version}));
 writeFileSync(join(dir,'meta.json'),JSON.stringify({name:'ai-engineer',type:'role',version:'1.0.0',nameZh:'示例',professionZh:'AI工程师',displayName:'示例·AI工程师'}));writeFileSync(join(dir,'PROFILE.md'),'# 示例\n');
 const file=join(root,'deployment.json');writeFileSync(file,JSON.stringify({organization:'Test',scope:'client',protocolVersion:1,environment:{AVC_GENERATION:'generation-test'},projects:[{root,stateRoot:state,roles:['ai-engineer'],execution:{enabled:true,mode:'monitor',maxToolCalls:20,bootstrapTools:['mcp__ted_avc_manager__task_begin']}}]}));
 const invoke=(input,entry='native-hook.js')=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../'+entry,import.meta.url)),'--deployment',file],{input:JSON.stringify(input),encoding:'utf8',env:{...process.env,AVC_PROJECT_ROOT:'',AVC_CATALOG_ROOT:'',AVC_DEPLOYMENT_FILE:'',AVC_GENERATION:''}});
  assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);assert.equal(value.decision,undefined);assert.equal(value.hookSpecificOutput?.permissionDecision,undefined);assert.ok(Buffer.byteLength(JSON.stringify(value))<=CONTEXT_LIMITS.hookBytes);return value;
 };
 return {root,state,file,invoke,input:{cwd:root,session_id:'same-session',turn_id:'same-turn',agent_id:'child-a',tool_name:'Bash',hook_event_name:'PreToolUse',tool_input:{cmd:'true'}}};
}
test('real Hook entries deliver child binding once across starts, different calls and legacy aliases, with exact whole-body accounting',t=>{
 const f=fixture(t),outputs=[];
 outputs.push(f.invoke({...f.input,hook_event_name:'SubagentStart',source:'spawn'}));
 for(let i=0;i<6;i++)outputs.push(f.invoke({...f.input,tool_use_id:'call-'+i},i%2?'codex-hook.js':'execution-hook.js'));
 outputs.push(f.invoke({...f.input,hook_event_name:'SubagentStart',source:'resume'}));
 assert.equal(outputs.filter(o=>o.hookSpecificOutput?.additionalContext?.includes('Native binding')).length,1);
 const usage=contextStatus(f.state,{sessionId:'same-session',turnId:'same-turn',agentId:'child-a'});
 assert.equal(usage.turnBytes,outputs.filter(o=>o.hookSpecificOutput?.additionalContext).reduce((n,o)=>n+Buffer.byteLength(JSON.stringify(o)),0));
 const other=f.invoke({...f.input,agent_id:'child-b',tool_use_id:'other'});assert.match(other.hookSpecificOutput.additionalContext,/Native binding/);
 assert.ok(contextStatus(f.state,{sessionId:'same-session',turnId:'same-turn'}).turnBytes>usage.turnBytes);
 assert.equal(f.invoke({...f.input,agent_id:'child-b',tool_use_id:'other'})._tedCollection.contextReturned,false);
 const resumed=f.invoke({...f.input,hook_event_name:'SubagentStart',source:'compact',context_epoch:'explicit-epoch-2'});assert.match(resumed.hookSpecificOutput.additionalContext,/Native binding/);
 const compact=f.invoke({...f.input,hook_event_name:'SessionStart',source:'compact'});assert.match(compact.hookSpecificOutput.additionalContext,/Native binding/);
 assert.equal(f.invoke({...f.input,hook_event_name:'SessionStart',source:'compact',sequence:2}).hookSpecificOutput?.additionalContext,undefined);
});
test('failed accounting leaves raw capture and permits an authorized business effect without fabricated context delivery',t=>{
 const f=fixture(t);f.invoke({...f.input,tool_use_id:'initial'});
 const dir=join(f.state,'runtime/context'),file=readdirSync(dir).find(n=>n.endsWith('.json'));writeFileSync(join(dir,file),'{broken');
 const failed=f.invoke({...f.input,tool_use_id:'following'});assert.ok(failed.systemMessage);assert.equal(failed.hookSpecificOutput?.additionalContext,undefined);assert.equal(failed._tedCollection.captured,true);
 writeFileSync(join(f.root,'business-effect'),'completed');assert.equal(readFileSync(join(f.root,'business-effect'),'utf8'),'completed');
});
