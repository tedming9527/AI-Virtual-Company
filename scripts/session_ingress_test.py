"""Run the installed scripts and MCP across upgrades, not configuration-only probes."""
import json, os, subprocess, unittest, io, tarfile, shutil
from pathlib import Path
import client_environment_test as harness
from client_environment_test import NODE
from client_environment import read, save, OWNER

class SessionIngressTest(unittest.TestCase):
 setUp = harness.ClientTest.setUp
 run_rebuild = harness.ClientTest.run_rebuild
 def hook(self, payload, kind='native'):
  r=subprocess.run(['/bin/sh',str(self.home/'ted-avc-manager-hook.sh'),kind],input=json.dumps(payload),text=True,capture_output=True,timeout=9)
  self.assertEqual(r.returncode,0,r.stderr)
  return json.loads(r.stdout)
 def turn(self, session, turn):
  return next(read(p) for p in (self.home/OWNER/'state/runtime/mediation/turns').glob('*.json') if read(p)['sessionId']==session and read(p)['turnId']==turn)
 def rpc(self,name,args):
  messages=[{'jsonrpc':'2.0','id':1,'method':'initialize'}, {'jsonrpc':'2.0','method':'notifications/initialized'}, {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':name,'arguments':args}}]
  r=subprocess.run([str(self.home/OWNER/'bin/ted-avc-manager'),'server'],input='\n'.join(map(json.dumps,messages))+'\n',text=True,capture_output=True,timeout=10)
  self.assertEqual(r.returncode,0,r.stderr)
  response=next(json.loads(s) for s in r.stdout.splitlines() if json.loads(s).get('id')==2)
  self.assertNotIn('error',response)
  return json.loads(response['result']['content'][0]['text'])
 def test_no_project_two_projects_missing_directory_and_real_task_closeout(self):
  self.run_rebuild()
  payload={'session_id':'multi','turn_id':'t','hook_event_name':'UserPromptSubmit'}
  self.assertIn('Native binding',self.hook(payload)['hookSpecificOutput']['additionalContext'])
  work=[]
  for name in ['frontend','backend']:
   directory=self.base/name;directory.mkdir();(directory/'.git').mkdir();work.append(directory)
   self.hook({**payload,'hook_event_name':'PreToolUse','cwd':str(directory),'tool_name':'Bash','tool_use_id':name})
  self.hook({**payload,'hook_event_name':'PreToolUse','cwd':str(self.base/'deleted'),'tool_name':'Bash','tool_use_id':'missing'})
  t=self.turn('multi','t');key={'sessionId':'multi','turnId':'t','receipt':t['receipt']}
  task=self.rpc('task_begin',{**key,'role':'ai-engineer','goal':'cross-project evidence','allowedTools':['Bash','mcp__ted_avc_manager__task_closeout'],'maxToolCalls':3})
  self.assertEqual(task['sessionId'],'multi')
  outputs=[]
  for directory in work:
   f=directory/'result.md';f.write_text('real output');outputs.append({'path':str(f)})
  closed=self.rpc('task_closeout',{**key,'artifacts':outputs})
  self.assertEqual(closed['status'],'closed');self.assertEqual(set(closed['projects']),set(map(str,work)))
  self.assertEqual(len(closed['artifacts']),2)
 def test_raw_events_survive_attribution_failure_and_missing_deployment(self):
  self.run_rebuild()
  catalog=self.personal/'preset/avc-client-baseline'
  (catalog/'packs/role/ai-engineer/meta.json').write_text('{broken')
  p={'session_id':'degraded','turn_id':'t','hook_event_name':'PreToolUse','tool_name':'Bash','tool_use_id':'a','tool_input':{'secret':'do-not-persist'}}
  self.assertIn('systemMessage',self.hook(p))
  events=self.home/OWNER/'state/runtime/mediation/events'
  self.assertTrue(list(events.glob('*.json')))
  self.assertNotIn('do-not-persist',''.join(f.read_text() for f in events.glob('*.json')))
  (self.home/OWNER/'deployment.json').unlink()
  self.assertIn('systemMessage',self.hook({**p,'tool_use_id':'b'}))
  self.assertGreaterEqual(len(list(events.glob('*.json'))),2)
 def test_actual_upgrade_then_cached_hook_resume_and_stale_mcp_diagnostics(self):
  before=self.run_rebuild()
  p={'session_id':'old-session','turn_id':'old-turn','hook_event_name':'UserPromptSubmit','cwd':str(self.base)}
  self.hook(p)
  env={**os.environ,**read(self.home/OWNER/'deployment.json')['environment']}
  # Keep an actual old stdio server alive while replacing the installed package.
  proc=subprocess.Popen([str(NODE),str(self.home/OWNER/'package/src/cli.js'),'server'],cwd=self.root,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  self.addCleanup(lambda: proc.kill() if proc.poll() is None else None)
  proc.stdin.write(json.dumps({'jsonrpc':'2.0','id':1,'method':'initialize'})+'\n');proc.stdin.flush()
  self.assertEqual(json.loads(proc.stdout.readline())['id'],1)
  for file in [self.root/'bootstrap.json',self.root/'mcp/ted-avc-manager/package.json']:
   d=read(file);d['version']='2.0.0';save(file,d)
  # Central-only updates must leave the old installed collector working.
  self.assertIn('hookSpecificOutput',self.hook({**p,'turn_id':'before-upgrade'}))
  after=self.run_rebuild();self.assertNotEqual(before['generation'],after['generation'])
  proc.stdin.write(json.dumps({'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'check_update','arguments':{}}})+'\n');proc.stdin.flush()
  response=json.loads(proc.stdout.readline());self.assertNotIn('error',response)
  self.assertIn('重载',response['result']['content'][0]['text'])
  proc.stdin.close();proc.wait(timeout=10);proc.stdout.close();proc.stderr.close()
  # A cached legacy hook command uses the stable shim and new unified ingress.
  resume={**p,'hook_event_name':'SessionStart','source':'resume','turn_id':'new-turn'}
  self.assertIn('Native binding',self.hook(resume,'footer')['hookSpecificOutput']['additionalContext'])
  first=self.turn('old-session','new-turn')['receipt']
  pre={**resume,'hook_event_name':'PreToolUse','tool_name':'Bash','tool_use_id':'after-upgrade'}
  self.hook(pre,'execution');self.assertEqual(self.turn('old-session','new-turn')['receipt'],first)
  self.assertEqual(read(self.home/OWNER/'manifest.json')['version'],'2.0.0')
 def released_upgrade(self, release):
  # Use real release bytes, rather than relabeling the new implementation.
  archive=subprocess.check_output(['git','archive','v'+release,'bootstrap.json','mcp/ted-avc-manager','packs','rules'],cwd=harness.REPO)
  for name in ['mcp/ted-avc-manager','packs','rules']:
   shutil.rmtree(self.root/name)
  with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
   for member in bundle.getmembers():
    target=self.root/member.name
    self.assertTrue(target.resolve().is_relative_to(self.root))
    if member.isdir():target.mkdir(parents=True,exist_ok=True)
    elif member.isfile():
     target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(bundle.extractfile(member).read())
    else:self.fail('Release archive contains unsupported entry')
  self.run_rebuild();self.assertEqual(read(self.home/OWNER/'package/package.json')['version'],release)
  prompt={'session_id':'legacy-thread','turn_id':'legacy-turn','hook_event_name':'UserPromptSubmit','cwd':str(self.root)}
  context=self.hook(prompt,'footer')['hookSpecificOutput']['additionalContext']
  self.assertIn('Hook 回执',context)
  old_footer=next(line.split(': ',1)[1] for line in context.splitlines() if ': 以上内容由 ' in line)
  for name in ['mcp/ted-avc-manager','packs','rules']:
   shutil.rmtree(self.root/name);shutil.copytree(harness.REPO/name,self.root/name)
  shutil.copy2(harness.REPO/'bootstrap.json',self.root/'bootstrap.json')
  self.run_rebuild()
  self.assertEqual(read(self.home/OWNER/'package/package.json')['version'],read(harness.REPO/'bootstrap.json')['version'])
  # The old command path survives; a real-shaped first tool event provides current
  # attachment/context even if this old thread never sends another user prompt.
  result=self.hook({**prompt,'hook_event_name':'PreToolUse','tool_name':'Bash','tool_use_id':'first-after-upgrade'},'execution')
  self.assertIn('Native binding',result['hookSpecificOutput']['additionalContext'])
  self.assertEqual(self.turn('legacy-thread','legacy-turn')['sessionId'],'legacy-thread')
  # The old in-flight turn retains its actual issuing version for attribution;
  # its independent native task attachment uses the new installed collector.
  self.assertEqual(self.hook({**prompt,'hook_event_name':'Stop','last_assistant_message':old_footer}),{})
  status=self.rpc('client_status',{})
  self.assertEqual(status['footerStatus'],'verified');self.assertEqual(status['taskContracts'],0)
 def test_released_150_upgrades_and_inflight_session_resumes(self):
  self.released_upgrade('1.5.0')
 def test_released_151_upgrades_and_inflight_session_resumes(self):
  self.released_upgrade('1.5.1')

 def test_central_checkout_moved_and_user_storage_offline_do_not_remove_capture(self):
  self.run_rebuild();self.root.rename(self.base/'moved-source')
  p={'session_id':'moved','turn_id':'t','hook_event_name':'UserPromptSubmit','cwd':str(self.root)}
  value=self.hook(p);self.assertIn('Native binding',value['hookSpecificOutput']['additionalContext'])
  # Installed-catalog MCP remains usable even though the source checkout vanished.
  self.assertTrue(self.rpc('list_packs',{})['packs'])
  self.personal.rename(self.base/'offline-user-data')
  self.assertIn('systemMessage',self.hook({**p,'turn_id':'offline'}))
  self.assertTrue(list((self.home/OWNER/'state/runtime/mediation/events').glob('*.json')))

 def test_cached_legacy_aliases_share_one_handler_under_real_concurrency(self):
  self.run_rebuild();p={'session_id':'parallel-legacy','turn_id':'t','hook_event_name':'UserPromptSubmit'};self.hook(p)
  t=self.turn(p['session_id'],'t');key={'sessionId':p['session_id'],'turnId':'t','receipt':t['receipt']}
  self.rpc('task_begin',{**key,'role':'test-expert','goal':'concurrent alias capture','allowedTools':['Bash'],'maxToolCalls':10})
  for n in range(4):
   event={**p,'hook_event_name':'PreToolUse','tool_name':'Bash','tool_use_id':str(n),'tool_input':{'command':'read-only'}}
   children=[subprocess.Popen(['/bin/sh',str(self.home/'ted-avc-manager-hook.sh'),kind],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) for kind in ['footer','execution','native']]
   for child in children:child.stdin.write(json.dumps(event));child.stdin.close()
   for child in children:
    result=json.loads(child.stdout.read());error=child.stderr.read();child.wait(timeout=10);child.stdout.close();child.stderr.close()
    self.assertEqual(child.returncode,0,error);self.assertNotIn('systemMessage',result,result)
  tasks=list((self.home/OWNER/'state/runtime/execution/tasks').glob('*.json'));self.assertEqual(len(read(tasks[0])['calls']),4)

if __name__=='__main__':unittest.main()
