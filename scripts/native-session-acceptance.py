#!/usr/bin/env python3
"""Opt-in native Codex experiments. Never writes trust/auth/config to the real client.
Run explicitly with --use-existing-login. Raw model records remain local in a private
non-synchronized test directory; the printed summary contains no credential values.
"""
import argparse, json, os, pathlib, queue, shutil, subprocess, sys, tempfile, threading, time, tomllib

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from client_environment import rebuild, OWNER

ISOLATED_TASK_RULES='仅由当前主代理执行；禁止启动子代理、委派、发送跨会话消息或创建额外任务。只使用当前任务实际需要的工具；如需登记任务，精确声明工具白名单并关闭本回合契约。'

def tool_failed(item):
 result=item.get('result') or {}
 structured=result.get('structured_content') or {}
 return bool(item.get('error') or item.get('status')!='completed' or result.get('isError') or structured.get('isError'))

def expected_tool_failure(item,missing_deployment=None):
 if missing_deployment is None or missing_deployment.exists():return False
 if item.get('type')!='mcp_tool_call' or item.get('server')!='ted-avc-manager' or item.get('tool') not in ['task_begin','task_closeout']:return False
 message=(item.get('error') or {}).get('message','')
 return "ENOENT: no such file or directory, open '"+str(missing_deployment)+"'" in message

def task_audit(directory):
 tasks=[]
 for path in sorted(directory.glob('*.json')):
  task=json.loads(path.read_text());calls=list(task.get('calls',{}).values())
  tasks.append({'taskId':task['taskId'],'sessionId':task.get('sessionId'),'status':task.get('status'),
   'violations':len(task.get('violations',[])),'unknownCalls':sum(c.get('status')=='unknown' for c in calls),
   'pendingCalls':sum(c.get('status')=='reserved' for c in calls),'tools':[c.get('tool','') for c in calls]})
 return tasks

def integrity_checks(cases,tasks):
 return {
  'allNativeCasesCompleted':bool(cases) and all(c.get('exitCode')==0 and not c.get('timedOut') and c.get('turnCompleted') for c in cases),
  'noUnexpectedNativeToolErrors':all(not c.get('errors') and not any((t.get('failed') or t.get('status')!='completed') and not t.get('expectedFailure') for t in c.get('toolCalls',[])) for c in cases),
  'allIsolatedTasksClosed':all(t.get('status')=='closed' for t in tasks),
  'noTaskViolations':all(t.get('violations')==0 for t in tasks),
  'noUnknownOrPendingCalls':all(t.get('unknownCalls')==0 and t.get('pendingCalls')==0 for t in tasks),
  'noDelegation':not any(t.get('type')=='collab_tool_call' for c in cases for t in c.get('toolCalls',[])) and not any('spawn_agent' in tool or 'send_message' in tool for t in tasks for tool in t.get('tools',[])),
 }

class NativeRPC:
 def __init__(self,env):
  self.process=subprocess.Popen(['codex','app-server','--stdio'],env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
  self.rows=queue.Queue();self.seq=0
  def reader():
   for line in self.process.stdout:
    try:self.rows.put(json.loads(line))
    except ValueError:pass
  threading.Thread(target=reader,daemon=True).start()
  self.call('initialize',{'clientInfo':{'name':'ted_native_acceptance','version':'1'},'capabilities':{'experimentalApi':True}})
  self.process.stdin.write(json.dumps({'method':'initialized','params':{}})+'\n');self.process.stdin.flush()
 def call(self,method,params):
  self.seq+=1;identifier=self.seq
  self.process.stdin.write(json.dumps({'id':identifier,'method':method,'params':params})+'\n');self.process.stdin.flush()
  deadline=time.monotonic()+25
  while time.monotonic()<deadline:
   value=self.rows.get(timeout=max(0.1,deadline-time.monotonic()))
   if value.get('id')==identifier:
    if 'error' in value:raise RuntimeError(str(value['error']))
    return value['result']
  raise RuntimeError('Native RPC timeout')
 def close(self):
  self.process.terminate()
  try:self.process.wait(timeout=5)
  except subprocess.TimeoutExpired:self.process.kill();self.process.wait()

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--use-existing-login',action='store_true');parser.add_argument('--native-default',action='store_true',help='Use the native CLI default after recording a configured-model incompatibility');parser.add_argument('--timeout',type=int,default=180);parser.add_argument('--case',choices=['all','doctor'],default='all',help='Run the full session matrix or a fresh native Ted skill/tool check');args=parser.parse_args()
 if not args.use_existing_login:parser.error('Explicit --use-existing-login required for native model experiments')
 real_home=pathlib.Path(os.environ.get('CODEX_HOME',str(pathlib.Path.home()/'.codex')))
 auth=real_home/'auth.json'
 if not auth.is_file() or auth.is_symlink():raise SystemExit('Native client file login unavailable; no API key is requested or created')
 base=pathlib.Path(tempfile.mkdtemp(prefix='ted-native-acceptance-',dir='/private/tmp')).resolve();base.chmod(0o700)
 home=base/'client';home.mkdir(mode=0o700);work=base/'work';work.mkdir();personal=base/'personal/projects/lab';personal.mkdir(parents=True)
 config=tomllib.loads((real_home/'config.toml').read_text())
 (home/'config.toml').write_text(('' if args.native_default else 'model = '+json.dumps(config.get('model','gpt-6.1-sol'))+'\n')+'model_reasoning_effort = '+json.dumps(config.get('model_reasoning_effort','high'))+'\n[features]\nhooks = true\nmulti_agent = false\n')
 shutil.copyfile(auth,home/'auth.json');(home/'auth.json').chmod(0o600)
 env={k:v for k,v in os.environ.items() if not k.startswith('AVC_')};env['CODEX_HOME']=str(home)
 report={'schema':'avc.native-acceptance.v1','startedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'cli':subprocess.check_output(['codex','--version'],text=True).strip(),'configuredModel':config.get('model'),'modelMode':'native-default' if args.native_default else 'configured','source':'working-copy-candidate; not a published client acceptance','workspace':str(base),'cases':[],'trust':'Only reviewed test-fixture hooks; no hook-trust bypass flag; real client trust unchanged'}
 def records(folder):
  if not folder.exists():return []
  return [json.loads(p.read_text()) for p in folder.glob('*.json')]
 def snapshot(thread):
  state=home/OWNER/'state/runtime';events=[e for e in records(state/'mediation/events') if e.get('sessionId')==thread]
  tasks=[t for t in records(state/'execution/tasks') if t.get('sessionId')==thread]
  return {'events':len(events),'eventTypes':sorted({e.get('event') for e in events}),'tasks':[{'taskId':t['taskId'],'status':t['status'],'assets':len(t.get('assets',[])),'observed':sum(c.get('status')=='observed' for c in t.get('calls',{}).values())} for t in tasks]}
 def model_case(name,prompt,resume=None,missing_deployment=None):
  print(json.dumps({'phase':'running','case':name}),flush=True)
  cmd=['codex','exec','--json','-C',str(work),'--sandbox','workspace-write','--skip-git-repo-check','-o',str(base/(name+'.answer.txt'))]
  if resume:cmd+=['resume',resume]
  cmd.append(prompt+'\n'+ISOLATED_TASK_RULES)
  started=time.monotonic();timed_out=False
  with open(base/(name+'.jsonl'),'w') as output,open(base/(name+'.stderr'),'w') as errors:
   p=subprocess.Popen(cmd,env=env,stdin=subprocess.DEVNULL,stdout=output,stderr=errors,start_new_session=True)
   try:code=p.wait(timeout=args.timeout)
   except (subprocess.TimeoutExpired,KeyboardInterrupt) as failure:
    import signal
    os.killpg(p.pid,signal.SIGTERM)
    try:p.wait(timeout=5)
    except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
    code=p.returncode;timed_out=True
    if isinstance(failure,KeyboardInterrupt):raise
  rows=[]
  for line in (base/(name+'.jsonl')).read_text().splitlines():
   try:rows.append(json.loads(line))
   except ValueError:pass
  thread=next((r.get('thread_id') for r in rows if r.get('type')=='thread.started'),resume)
  native_models=set()
  for rollout in (home/'sessions').rglob('*'+str(thread)+'*.jsonl'):
   for line in rollout.read_text().splitlines():
    try:
     r=json.loads(line)
     if r.get('type')=='turn_context' and r.get('payload',{}).get('model'):native_models.add(r['payload']['model'])
    except ValueError:pass
  answer=(base/(name+'.answer.txt')).read_text() if (base/(name+'.answer.txt')).exists() else ''
  tools=[r.get('item',{}) for r in rows if r.get('type')=='item.completed' and r.get('item',{}).get('type') in ['mcp_tool_call','command_execution','collab_tool_call']]
  case={'name':name,'threadId':thread,'exitCode':code,'timedOut':timed_out,'durationSeconds':round(time.monotonic()-started,2),'turnCompleted':any(r.get('type')=='turn.completed' for r in rows),'toolCalls':[{'type':t.get('type'),'tool':t.get('tool'),'server':t.get('server'),'status':t.get('status'),'failed':tool_failed(t) if t.get('type')=='mcp_tool_call' else t.get('status')!='completed' or t.get('exit_code',0)!=0,'expectedFailure':expected_tool_failure(t,missing_deployment)} for t in tools],'faultInjection':'missing-deployment' if missing_deployment else None,'answerBytes':len(answer.encode()),'native':snapshot(thread) if thread else {},'errors':[r.get('message') or r.get('item',{}).get('message') for r in rows if r.get('type')=='error' or r.get('item',{}).get('type')=='error']}
  case['nativeModels']=sorted(native_models);report['cases'].append(case);(base/'summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'phase':'completed','case':case},ensure_ascii=False),flush=True)
  return thread
 try:
  escaped=model_case('escaped-before-install','这是隔离测试，只在当前目录创建 escaped-before.txt，内容为 BEFORE。不要触碰其他目录，不要安装、发布或请求新密钥。') if args.case=='all' else None
  print(json.dumps({'phase':'installing-isolated-client'}),flush=True)
  rebuild(ROOT,home,personal,pathlib.Path(shutil.which('node')).resolve(),user_home=base/'user')
  host=NativeRPC(env)
  try:
   listed=host.call('hooks/list',{'cwds':[str(work)]})
   hooks=[h for entry in listed['data'] for h in entry['hooks'] if pathlib.Path(h['sourcePath'])==home/'hooks.json']
   report['beforeReview']={h['key']:h['trustStatus'] for h in hooks}
   # Review only exact generated definitions in this isolated installation.
   if len(hooks)!=18 or any(h.get('handlerType')!='command' or str(home/'ted-avc-manager-hook.sh') not in h.get('command','') for h in hooks):raise RuntimeError('Unexpected test hook definitions; trust not granted')
   host.call('config/value/write',{'keyPath':'hooks.state','mergeStrategy':'replace','value':{h['key']:{'enabled':True,'trusted_hash':h['currentHash']} for h in hooks}})
  finally:host.close()
  host=NativeRPC(env)
  try:
   report['afterReview']={h['key']:h['trustStatus'] for e in host.call('hooks/list',{'cwds':[str(work)]})['data'] for h in e['hooks'] if pathlib.Path(h['sourcePath'])==home/'hooks.json'}
   listed=host.call('skills/list',{'cwds':[str(work)],'forceReload':True})
   report['nativeTedSkills']=[skill for entry in listed['data'] for skill in entry['skills'] if skill.get('name')=='ted']
   if not report['nativeTedSkills'] or not all(skill.get('enabled') for skill in report['nativeTedSkills']):raise RuntimeError('Native host did not list an enabled Ted skill')
  finally:host.close()
  if args.case=='all':
   model_case('escaped-resumed','继续隔离测试，仅在当前目录创建 escaped-after.txt，内容为 AFTER；按当前可用的系统流程完成这个文件任务。不要修改安装环境，不要补造历史回执。',escaped)
   model_case('fresh-business','隔离验收：在当前目录创建 fresh-result.txt，内容为 FRESH；按当前可用系统流程完成，不访问其他项目，不安装或发布。')
  model_case('fresh-ted-doctor','$ted doctor')
  if args.case=='all':
   deployment=home/OWNER/'deployment.json';saved=deployment.read_bytes();deployment.unlink()
   try:model_case('degraded-business','隔离故障验收：仅在当前目录创建 degraded-result.txt，内容为 CONTINUED。辅助采集故障时继续这个已授权文件任务，不修复环境，不伪造成功证据。',missing_deployment=deployment)
   finally:deployment.write_bytes(saved)
  report['artifacts']={name:(work/name).is_file() and (work/name).read_text().strip()==content for name,content in {'escaped-before.txt':'BEFORE','escaped-after.txt':'AFTER','fresh-result.txt':'FRESH','degraded-result.txt':'CONTINUED'}.items()} if args.case=='all' else {}
  doctor=next(c for c in report['cases'] if c['name']=='fresh-ted-doctor')
  report['checks']={'nativeTedSkillListed':bool(report['nativeTedSkills']),'doctorNativeToolCompleted':any(t['tool']=='ted_doctor' and t['status']=='completed' for t in doctor['toolCalls']),'doctorTurnCompleted':doctor['turnCompleted'],'readOnlyDoctorDoesNotOpenTask':not doctor['native'].get('tasks'),'reviewedHooksTrusted':all(v=='trusted' for v in report['afterReview'].values())}
  if args.case=='all':
   before,resumed,fresh,_,degraded=report['cases']
   report['checks'].update({'sameEscapedThreadResumed':before['threadId']==resumed['threadId'],'noBaselineEventsFabricated':before['native'].get('events')==0,'resumedTaskClosed':any(t['status']=='closed' for t in resumed['native']['tasks']),'freshTaskClosed':any(t['status']=='closed' for t in fresh['native']['tasks']),'degradedTaskContinued':degraded['turnCompleted'] and bool(degraded['native'].get('events')) and not degraded['native'].get('tasks'),'artifactContentsMatch':all(report['artifacts'].values())})
  report['taskAudit']=task_audit(home/OWNER/'state/runtime/execution/tasks')
  report['checks'].update(integrity_checks(report['cases'],report['taskAudit']))
  report['passed']=all(report['checks'].values())
  report['endedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());(base/'summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'phase':'final','report':str(base/'summary.json'),'artifacts':report['artifacts'],'checks':report['checks'],'passed':report['passed']},ensure_ascii=False),flush=True)
  if not report['passed']:raise RuntimeError('Native acceptance checks failed; inspect the local summary')
 finally:
  # Do not retain a copied login credential among test evidence.
  (home/'auth.json').unlink(missing_ok=True)

if __name__=='__main__':main()
