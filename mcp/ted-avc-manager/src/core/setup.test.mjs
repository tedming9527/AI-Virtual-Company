import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const entry=resolve(dirname(fileURLToPath(import.meta.url)),'../setup.js');
test('unsupported adapters refuse before writes, init directs to the deterministic installer', t => {
  const temp=realpathSync(mkdtempSync(join(tmpdir(),'avc-setup-refusal-')));t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const home=join(temp,'client');
  const result=spawnSync(process.execPath,[entry,'install','--client','claude','--codex-home',home,'--yes'],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.equal(existsSync(home),false);assert.match(result.stderr,/尚无已验证适配器/);
  const init=spawnSync(process.execPath,[resolve(entry,'../cli.js'),'init'],{cwd:temp,encoding:'utf8',env:{...process.env,AVC_PROJECT_ROOT:''}});
  assert.equal(init.status,0);assert.match(init.stdout,/yarn setup/);assert.equal(existsSync(join(temp,'runtime')),false);
});
test('npm and yarn use one installation entry and native capture is validated after installation', t => {
  const temp=realpathSync(mkdtempSync(join(tmpdir(),'avc-setup-install-')));t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const home=join(temp,'client'), personal=join(temp,'personal/projects/demo');mkdirSync(personal,{recursive:true});
  const env={...process.env,AVC_PROJECT_ROOT:'',npm_config_cache:join(temp,'npm-cache'),YARN_CACHE_FOLDER:join(temp,'yarn-cache')};
  for(const [bin,args] of [['npm',['run','setup','--','--help']],['yarn',['setup','--help']]]) {
    const result=spawnSync(bin,args,{cwd:source,env,encoding:'utf8',timeout:15000});
    assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/配置写入、宿主加载、会话介入分别验收/);
  }
  const result=spawnSync('npm',['run','setup','--','install','--client','codex','--codex-home',home,'--personal-project',personal,'--source',source,'--yes','--json'],{cwd:source,env,encoding:'utf8',timeout:20000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/pending-host-reload-and-event/);
  const status=()=>JSON.parse(spawnSync(process.execPath,[entry,'status','--codex-home',home],{env,encoding:'utf8'}).stdout);
  assert.equal(status().eventsCaptured,0);assert.equal(status().nativeActivation,'pending-host-reload-and-event');
  const native=spawnSync('/bin/sh',[join(home,'ted-avc-manager-hook.sh'),'native'],{input:JSON.stringify({session_id:'terminal-installed',turn_id:'t',hook_event_name:'UserPromptSubmit'}),encoding:'utf8'});
  assert.equal(native.status,0);assert.match(native.stdout,/Native binding/);
  assert.equal(status().eventsCaptured,1);assert.equal(status().turnsAttached,1);assert.equal(status().taskContracts,0);
  assert.equal(status().contextReturned,true);
  assert.equal(JSON.parse(readFileSync(join(home,'ted-avc-manager/deployment.json'),'utf8')).scope,'client');
});
