import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { captureNative, sessionWorkspaces, readNativeTurn } from './session-ingress.js';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(),'avc-ingress-')));
  t.after(() => rmSync(root, { recursive:true, force:true }));
  const state = join(root,'state'); mkdirSync(state);
  const config = join(root,'deployment.json');
  writeFileSync(config, JSON.stringify({ scope:'client', projects:[{ root:join(root,'missing-company'), stateRoot:state }] }));
  return { root,state,config,input:{hook_event_name:'PreToolUse',session_id:'native-session',turn_id:'native-turn',tool_use_id:'native-call',tool_name:'Bash'} };
}
test('session attachment survives no project, missing cwd and multiple project associations', t => {
  const f=fixture(t), a=captureNative(f.input,f.config);
  assert.equal(a.attached,true);assert.equal(a.turn.workspace.status,'none');
  for (const name of ['frontend','backend']) {
    const dir=join(f.root,name);mkdirSync(dir);mkdirSync(join(dir,'.git'));
    assert.equal(captureNative({...f.input,cwd:dir},f.config).turn.receipt,a.turn.receipt);
  }
  assert.equal(captureNative({...f.input,cwd:join(f.root,'gone')},f.config).attached,true);
  assert.equal(sessionWorkspaces(f.state,f.input.session_id).length,2);
  assert.throws(()=>readNativeTurn(f.state,{sessionId:f.input.session_id,turnId:f.input.turn_id,receipt:'forged'}),/mismatch/);
});
test('native collection is idempotent and retains hashes instead of prompt/response contents', t => {
  const f=fixture(t), input={...f.input,prompt:'private prompt',tool_input:{token:'private credential'},tool_response:{output:'private result'}};
  const first=captureNative(input,f.config), second=captureNative(input,f.config);
  assert.equal(first.captureId,second.captureId);assert.equal(first.turn.receipt,second.turn.receipt);
  const files=readdirSync(join(f.state,'runtime/mediation/events'));assert.equal(files.length,1);
  const text=readFileSync(join(f.state,'runtime/mediation/events',files[0]),'utf8');
  assert.ok(!text.includes('private'));assert.ok(JSON.parse(text).responseSha256);
  const stop=captureNative({...f.input,session_id:'previously-unseen',hook_event_name:'Stop'},f.config);
  assert.equal(stop.attached,true);assert.equal(stop.turn,undefined);
});
test('child IDs isolate turns and symbolically redirected state never receives a receipt', t => {
  const f=fixture(t), a=captureNative(f.input,f.config), child=captureNative({...f.input,agent_id:'child'},f.config);
  assert.notEqual(a.turn.receipt,child.turn.receipt);
  rmSync(join(f.state,'runtime/mediation/events'),{recursive:true});
  const protectedDir=join(f.root,'protected');mkdirSync(protectedDir);
  symlinkSync(protectedDir,join(f.state,'runtime/mediation/events'));
  assert.throws(()=>captureNative(f.input,f.config),/symlink/);
  assert.deepEqual(readdirSync(protectedDir),[]);
});
