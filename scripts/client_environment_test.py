import json, os, shutil, subprocess, tempfile, unittest
from pathlib import Path
from client_environment import rebuild, recover, inventory, read, save, OWNER, locked
from asset_lifecycle import import_user, promote_user, propose_central
REPO=Path(__file__).resolve().parents[1]
NODE=Path(shutil.which('node')).resolve()
class ClientTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.base=Path(self.temp.name).resolve()
  self.root=self.base/'repo';self.home=self.base/'codex';self.personal=self.base/'personal/projects/demo';self.personal.mkdir(parents=True);self.home.mkdir()
  for name in ['mcp/ted-avc-manager','packs','rules']:
   shutil.copytree(REPO/name,self.root/name)
  shutil.copy2(REPO/'bootstrap.json',self.root/'bootstrap.json')
  (self.home/'config.toml').write_text('model="unchanged"\n[mcp_servers.other]\ncommand="other"\n[mcp_servers."ted-avc-manager"]\ncommand="old"\n[mcp_servers."ted-avc-manager".tools.stale]\napproval_mode="prompt"\n')
  save(self.home/'hooks.json',{'hooks':{'PreToolUse':[{'hooks':[{'type':'command','command':'other-hook'}]}]}})
  (self.home/'AGENTS.md').write_text('User instructions must survive.\n')
  (self.personal/'custom').mkdir();(self.personal/'custom/keep.txt').write_text('user unique')
 def run_rebuild(self,**kw):return rebuild(self.root,self.home,self.personal,NODE,user_home=self.base/'user',**kw)
 def test_three_upgrades_replace_deleted_files_and_repeat(self):
  src=self.root/'packs/skill/ted-avc-manager';(src/'obsolete.md').write_text('central A')
  self.run_rebuild();first=inventory(self.personal/'custom')
  (self.home/OWNER/'package/obsolete-code.js').write_text('unique local draft')
  (src/'obsolete.md').unlink();(src/'new.md').write_text('central B')
  for file in [self.root/'bootstrap.json',self.root/'mcp/ted-avc-manager/package.json']:
   data=read(file);data['version']='2.0.0';save(file,data)
  result=self.run_rebuild();self.assertEqual(result['version'],'2.0.0');self.assertFalse((self.home/'skills/ted-avc-manager/obsolete.md').exists())
  self.assertFalse((self.personal/'preset/avc-client-baseline/packs/skill/ted-avc-manager/obsolete.md').exists())
  self.assertFalse((self.home/OWNER/'package/obsolete-code.js').exists());self.assertGreater(result['restoredUnpromoted'],0)
  self.assertTrue((self.home/OWNER/'state/workspace/recovered/environment/package/obsolete-code.js').exists())
  (src/'new.md').unlink()
  for file in [self.root/'bootstrap.json',self.root/'mcp/ted-avc-manager/package.json']:
   data=read(file);data['version']='3.0.0';save(file,data)
  self.assertEqual(self.run_rebuild()['version'],'3.0.0');self.run_rebuild()
  self.assertFalse((self.home/'skills/ted-avc-manager/new.md').exists());self.assertEqual(inventory(self.personal/'custom'),first)
  self.assertIn('User instructions', (self.home/'AGENTS.md').read_text());self.assertNotIn('stale',(self.home/'config.toml').read_text())
  hooks=read(self.home/'hooks.json')['hooks'];self.assertEqual(len(hooks['PreToolUse']),3)
  self.assertFalse((self.home/'.ted-avc-manager-transaction').exists())
 def test_user_import_modify_reset_and_explicit_promotion(self):
  self.run_rebuild();src=self.personal/'custom/skills/demo';src.mkdir(parents=True)
  save(src/'meta.json',{'type':'skill','name':'demo','version':'1.0.0'});(src/'SKILL.md').write_text('user source')
  before=inventory(src);entry=import_user(self.home,self.personal,src)
  (self.home/'skills'/entry['target']/'SKILL.md').write_text('client improvement')
  self.run_rebuild();self.assertEqual(inventory(src),before);self.assertFalse((self.home/'skills'/entry['target']).exists())
  index=read(self.home/OWNER/'state/workspace/index.json');rel='recovered/imports/ted-avc-user-demo/SKILL.md'
  self.assertEqual(index['files'][rel]['ownership'],'client');self.assertEqual(index['files'][rel]['status'],'unpromoted')
  with self.assertRaises(ValueError):promote_user(self.home,self.personal,rel,'idea',None)
  tr=promote_user(self.home,self.personal,rel,'idea','explicit-test-authorization')
  self.assertEqual(tr['to']['domain'],'user');proposal=propose_central(self.personal,'user:material:idea','explicit-review')
  self.assertEqual(proposal['status'],'pending-review');self.assertEqual(proposal['ownership'],'user')
  self.run_rebuild();self.assertNotIn(rel,read(self.home/OWNER/'state/workspace/index.json')['files']);self.assertTrue(Path(tr['to']['path']).exists())
 def test_interrupted_switch_recovery_and_lock(self):
  self.run_rebuild();before=inventory(self.home/OWNER/'package');config=(self.home/'config.toml').read_bytes()
  with self.assertRaises(RuntimeError):self.run_rebuild(fail_at='switched')
  self.assertTrue((self.home/'.ted-avc-manager-transaction/journal.json').exists())
  recover(self.home,user_home=self.base/'user');self.assertEqual(before,inventory(self.home/OWNER/'package'));self.assertEqual(config,(self.home/'config.toml').read_bytes())
  with locked(self.home):
   with self.assertRaises(FileExistsError):self.run_rebuild()
 def test_crash_reclaims_only_dead_locks_and_preserves_concurrent_config(self):
  self.run_rebuild()
  with self.assertRaises(RuntimeError):self.run_rebuild(fail_at='switched')
  for lock in [self.home/'.ted-avc-manager-rebuild.lock',self.personal/'experience/.avc/asset-lifecycle.lock']:
   lock.mkdir();save(lock/'owner.json',{'pid':999999999})
  original=(self.home/'config.toml').read_bytes();(self.home/'config.toml').write_bytes(original+b'\n# concurrent user change\n')
  with self.assertRaises(ValueError):recover(self.home,user_home=self.base/'user')
  self.assertIn('concurrent user change',(self.home/'config.toml').read_text())
  (self.home/'config.toml').write_bytes(original);recover(self.home,user_home=self.base/'user')
 def test_preservation_failure_never_clears_client(self):
  self.run_rebuild();before=inventory(self.home/OWNER)
  with self.assertRaises(RuntimeError):self.run_rebuild(fail_at='preserved')
  self.assertEqual(before,inventory(self.home/OWNER));recover(self.home,user_home=self.base/'user')
 def test_symlink_unknown_owner_and_live_task(self):
  (self.home/'skills').mkdir();(self.home/'skills/ted-avc-manager').symlink_to(self.personal/'custom')
  with self.assertRaises(ValueError):self.run_rebuild()
  (self.home/'skills/ted-avc-manager').unlink();self.run_rebuild()
  save(self.home/OWNER/'state/runtime/execution/tasks/active.json',{'status':'active'})
  with self.assertRaises(ValueError):self.run_rebuild()
 def test_directory_reverse_promotion_is_hash_bound(self):
  from asset_lifecycle import scan_client
  self.run_rebuild();src=self.home/OWNER/'state/workspace/draft-skill';src.mkdir()
  save(src/'meta.json',{'type':'skill','name':'draft-skill','version':'1.0.0'});(src/'SKILL.md').write_text('candidate')
  scan_client(self.home);(src/'SKILL.md').write_text('changed')
  with self.assertRaises(ValueError):promote_user(self.home,self.personal,'draft-skill','draft-skill','test')
  scan_client(self.home);receipt=promote_user(self.home,self.personal,'draft-skill','draft-skill','test')
  self.assertEqual(receipt['to']['assetId'],'user:skill:draft-skill');self.assertEqual(inventory(src),inventory(Path(receipt['to']['path'])))
  self.run_rebuild();self.assertFalse((self.home/OWNER/'state/workspace/draft-skill').exists())
 def test_live_binding_uses_client_state_and_downstream_catalog(self):
  self.run_rebuild();shim=self.home/'ted-avc-manager-hook.sh'
  payload={'cwd':str(self.root),'session_id':'scope-test','turn_id':'turn','hook_event_name':'UserPromptSubmit'}
  r=subprocess.run(['/bin/sh',str(shim),'footer'],input=json.dumps(payload),text=True,capture_output=True,timeout=9)
  value=json.loads(r.stdout);self.assertIn('hookSpecificOutput',value)
  self.assertTrue(list((self.home/OWNER/'state/runtime/hooks/sessions').glob('*.json')))
  self.assertFalse((self.root/'runtime/hooks').exists())
  launcher=self.home/OWNER/'bin/ted-avc-manager'
  request='\n'.join(json.dumps(x) for x in [{'jsonrpc':'2.0','id':1,'method':'initialize','params':{}},{'jsonrpc':'2.0','id':2,'method':'tools/list'},{'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'list_packs','arguments':{}}}])+'\n'
  server=subprocess.run([str(launcher),'server'],input=request,text=True,capture_output=True,timeout=10,env={**os.environ,'HOME':str(self.base)})
  self.assertEqual(server.returncode,0,server.stderr);responses={x['id']:x for x in map(json.loads,server.stdout.splitlines()) if 'id' in x}
  self.assertIn('tools',responses[2]['result']);self.assertNotIn('error',responses[3])
 def test_hooks_missing_config_timeout_and_deny_are_warning_only(self):
  self.run_rebuild();shim=self.home/'ted-avc-manager-hook.sh'
  payload={'cwd':str(self.root),'session_id':'diagnostic','turn_id':'turn','hook_event_name':'PreToolUse','tool_name':'exec','tool_use_id':'tool'}
  def invoke():
   r=subprocess.run(['/bin/sh',str(shim),'execution'],input=json.dumps(payload),text=True,capture_output=True,timeout=9)
   self.assertEqual(r.returncode,0);v=json.loads(r.stdout);self.assertIn('systemMessage',v);self.assertEqual(v['hookSpecificOutput'],{'hookEventName':'PreToolUse','additionalContext':v['systemMessage']})
   self.assertIn('⚠️ Ted 采集失败',r.stderr);self.assertIn('当前任务照常推进',r.stderr);self.assertIn('修复',r.stderr)
   self.assertIn(v['systemMessage'],r.stderr);self.assertNotIn('decision',v);self.assertNotIn('continue',v)
  (self.home/OWNER/'deployment.json').unlink();invoke()
  self.run_rebuild();entry=self.home/OWNER/'package/src/native-hook.js';entry.write_text('console.log(JSON.stringify({hookSpecificOutput:{permissionDecision:"deny"}}))');invoke()
  entry.write_text('console.log(JSON.stringify({hookSpecificOutput:{permissionDecision:"allow"}}))');invoke()
  entry.write_text('setTimeout(()=>{},20000)');invoke()
  (self.home/OWNER/'package').rename(self.home/OWNER/'missing-package');invoke()
 def test_native_warning_all_events_and_shell_never_propagates_blocking_exit(self):
  self.run_rebuild();shim=self.home/'ted-avc-manager-hook.sh'
  (self.home/OWNER/'deployment.json').unlink()
  for event,kind in [('SessionStart','footer'),('UserPromptSubmit','footer'),('UserPromptSubmit','execution'),('Stop','footer'),('PreToolUse','execution'),('PostToolUse','execution')]:
   with self.subTest(event=event,kind=kind):
    r=subprocess.run(['/bin/sh',str(shim),kind],input=json.dumps({'hook_event_name':event}),capture_output=True,text=True,timeout=9)
    self.assertEqual(r.returncode,0);self.assertIn('当前任务照常推进',r.stderr)
    v=json.loads(r.stdout);self.assertIn('systemMessage',v);self.assertNotIn('decision',v);self.assertNotIn('continue',v)
    if event in ['PreToolUse','PostToolUse']:self.assertEqual(v['hookSpecificOutput']['additionalContext'],v['systemMessage'])
    else:self.assertNotIn('hookSpecificOutput',v)
    status=subprocess.run(['/bin/sh',str(shim),kind,'status'],input=json.dumps({'hook_event_name':event}),capture_output=True,text=True,timeout=9)
    self.assertEqual(status.returncode,1);self.assertIn('当前任务照常推进',status.stderr);self.assertEqual(status.stdout,'')
  runner=self.home/'ted-avc-manager-hook.cjs'
  for code in [2,3,127]:
   runner.write_text(f'process.exit({code})')
   r=subprocess.run(['/bin/sh',str(shim),'execution'],capture_output=True,text=True,timeout=9)
   self.assertEqual(r.returncode,0);self.assertIn('当前任务照常推进',json.loads(r.stdout)['systemMessage'])
  runner.unlink()
  r=subprocess.run(['/bin/sh',str(shim),'execution'],capture_output=True,text=True,timeout=9)
  self.assertEqual(r.returncode,0);self.assertIn('当前任务照常推进',json.loads(r.stdout)['systemMessage'])
 def test_warning_detail_storage_failure_does_not_hide_warning_or_block(self):
  self.run_rebuild();shim=self.home/'ted-avc-manager-hook.sh'
  payload={'cwd':str(self.root),'session_id':'warning-session','turn_id':'warning-turn','hook_event_name':'PreToolUse','tool_name':'Bash','tool_use_id':'probe'}
  (self.home/OWNER/'deployment.json').unlink()
  def call():return subprocess.run(['/bin/sh',str(shim),'execution'],input=json.dumps(payload),capture_output=True,text=True,timeout=9)
  first=call();self.assertEqual(first.returncode,0)
  directory=self.home/OWNER/'state/runtime/hooks/warnings';files=list(directory.glob('*.json'));self.assertEqual(len(files),1)
  detail=read(files[0]);self.assertEqual(detail['status'],'unverified');self.assertTrue(detail['taskContinues']);self.assertEqual(detail['sessionId'],'warning-session')
  self.assertEqual(detail['message'],json.loads(first.stdout)['systemMessage'])
  shutil.rmtree(directory);directory.write_text('unwritable diagnostic sink')
  failed=call();self.assertEqual(failed.returncode,0);self.assertIn('当前任务照常推进',json.loads(failed.stdout)['systemMessage'])
  self.assertEqual(directory.read_text(),'unwritable diagnostic sink')


 def test_paired_native_status_and_detail_do_not_run_collection_twice(self):
  self.run_rebuild();shim=self.home/'ted-avc-manager-hook.sh'
  counter=self.base/'calls';entry=self.home/OWNER/'package/src/native-hook.js'
  entry.write_text('import fs from "node:fs";fs.appendFileSync('+json.dumps(str(counter))+',"call\\n");console.log(JSON.stringify({systemMessage:"锁冲突：Task locked by another operation；当前任务照常推进"}));')
  payload=json.dumps({'session_id':'pair','turn_id':'t','hook_event_name':'PreToolUse','tool_use_id':'unique'})
  status=subprocess.Popen(['/bin/sh',str(shim),'execution','status'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  status.stdin.write(payload);status.stdin.close();status.stdin=None
  detail=subprocess.run(['/bin/sh',str(shim),'execution'],input=payload,text=True,capture_output=True,timeout=9)
  out,err=status.communicate(timeout=9)
  self.assertEqual(status.returncode,1);self.assertEqual(detail.returncode,0)
  self.assertIn('Task locked',json.loads(detail.stdout)['systemMessage']);self.assertIn('Task locked',err)
  self.assertEqual(counter.read_text(),'call\n');self.assertEqual(out,'')
  # A normal result does not leave a stale failure for a different tool invocation.
  entry.write_text('console.log("{}")')
  payload=payload.replace('unique','next')
  subprocess.run(['/bin/sh',str(shim),'execution'],input=payload,text=True,capture_output=True,timeout=9,check=True)
  ok=subprocess.run(['/bin/sh',str(shim),'execution','status'],input=payload,text=True,capture_output=True,timeout=9)
  self.assertEqual(ok.returncode,0);self.assertEqual(ok.stdout,'')
 def test_status_missing_or_stale_outcome_is_unverified_not_success(self):
  self.run_rebuild();shim=self.home/'ted-avc-manager-hook.sh'
  payload=json.dumps({'session_id':'pair','turn_id':'t','hook_event_name':'PostToolUse','tool_use_id':'never-collected'})
  r=subprocess.run(['/bin/sh',str(shim),'execution','status'],input=payload,capture_output=True,text=True,timeout=9)
  self.assertEqual(r.returncode,1);self.assertIn('当前任务照常推进',r.stderr);self.assertEqual(r.stdout,'')
 def test_status_shell_crash_cannot_become_blocking_exit(self):
  self.run_rebuild();shim=self.home/'ted-avc-manager-hook.sh';runner=self.home/'ted-avc-manager-hook.cjs'
  for code in [2,3,127]:
   runner.write_text(f'process.exit({code})')
   r=subprocess.run(['/bin/sh',str(shim),'execution','status'],capture_output=True,text=True,timeout=9)
   self.assertEqual(r.returncode,1)

class ReverseReleaseTest(unittest.TestCase):
 setUp=ClientTest.setUp
 run_rebuild=ClientTest.run_rebuild
 def test_reverse_promotion_needs_matching_committed_release(self):
  from asset_lifecycle import register_central_release
  self.run_rebuild();f=self.home/OWNER/'state/workspace/recovered/draft.md';f.parent.mkdir(parents=True,exist_ok=True);f.write_text('original idea')
  from client_environment import digest
  idx=read(self.home/OWNER/'state/workspace/index.json');idx['files']['recovered/draft.md']={'sha256':digest(f.read_bytes()),'origin':'client-created','ownership':'client','status':'unpromoted'};save(self.home/OWNER/'state/workspace/index.json',idx)
  promote_user(self.home,self.personal,'recovered/draft.md','release-idea','test-authorized')
  proposal=propose_central(self.personal,'user:material:release-idea','test-review')
  central=self.base/'central';pack=central/'packs/knowledge/release-idea';pack.mkdir(parents=True)
  shutil.copy2(f,pack/'draft.md');save(pack/'meta.json',{'type':'knowledge','name':'release-idea','version':'1.0.0'})
  def git(*args):subprocess.run(['git','-C',str(central),*args],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  git('init');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-m','fixture');git('tag','v1.0.0')
  with self.assertRaises(ValueError):register_central_release(self.personal,Path(proposal['path']),central,'../bad','v1.0.0','review-fixture')
  receipt=register_central_release(self.personal,Path(proposal['path']),central,'packs/knowledge/release-idea','v1.0.0','review-fixture')
  self.assertEqual(receipt['to']['assetId'],'central:knowledge:release-idea');self.assertEqual(receipt['status'],'committed')

if __name__=='__main__':unittest.main()
