"""Acceptance must reject a successful parent hiding failed tools or child tasks."""
import importlib.util, json, pathlib, tempfile, unittest

spec=importlib.util.spec_from_file_location('native_acceptance',pathlib.Path(__file__).with_name('native-session-acceptance.py'))
acceptance=importlib.util.module_from_spec(spec);spec.loader.exec_module(acceptance)

def completed_case(**changes):
 return {'exitCode':0,'timedOut':False,'turnCompleted':True,'errors':[],'toolCalls':[],**changes}

def closed_task(**changes):
 return {'status':'closed','violations':0,'pendingCalls':0,'unknownCalls':0,'tools':[],**changes}

class NativeAcceptanceTest(unittest.TestCase):
 def test_closed_parent_does_not_hide_active_child_or_allowlist_violation(self):
  with tempfile.TemporaryDirectory() as directory:
   root=pathlib.Path(directory)
   for name,value in [('parent',{'status':'closed','calls':{},'violations':[]}),('child',{'status':'active','calls':{'spawn':{'tool':'collaborationspawn_agent','status':'observed'}},'violations':[{'reason':'Tool outside exact task allowlist'}]})]:
    (root/(name+'.json')).write_text(json.dumps({'taskId':name,'sessionId':name,**value}))
   checks=acceptance.integrity_checks([completed_case()],acceptance.task_audit(root))
   self.assertFalse(checks['allIsolatedTasksClosed']);self.assertFalse(checks['noTaskViolations']);self.assertFalse(checks['noDelegation'])
 def test_completed_transport_does_not_hide_tool_error(self):
  for result in [{'isError':True},{'structured_content':{'isError':True}}]:
   with self.subTest(result=result):
    failed=acceptance.tool_failed({'status':'completed','result':result})
    checks=acceptance.integrity_checks([completed_case(toolCalls=[{'status':'completed','failed':failed}])],[])
    self.assertFalse(checks['noUnexpectedNativeToolErrors'])
 def test_files_and_closed_tasks_do_not_override_timeout_or_unknown_calls(self):
  checks=acceptance.integrity_checks([completed_case(exitCode=0,timedOut=True)],[closed_task(unknownCalls=1,pendingCalls=1)])
  self.assertFalse(checks['allNativeCasesCompleted']);self.assertFalse(checks['noUnknownOrPendingCalls'])
 def test_clean_business_and_taskless_diagnostic_are_accepted(self):
  self.assertTrue(all(acceptance.integrity_checks([completed_case()],[closed_task()]).values()))
  self.assertTrue(all(acceptance.integrity_checks([completed_case()],[]).values()))
  self.assertFalse(acceptance.tool_failed({'status':'completed','result':{'content':[]}}))
 def test_native_collaboration_event_is_not_silently_discarded(self):
  checks=acceptance.integrity_checks([completed_case(toolCalls=[{'type':'collab_tool_call','status':'completed'}])],[])
  self.assertFalse(checks['noDelegation'])
 def test_only_exact_injected_missing_deployment_errors_are_expected(self):
  with tempfile.TemporaryDirectory() as directory:
   missing=pathlib.Path(directory)/'deployment.json'
   item={'type':'mcp_tool_call','server':'ted-avc-manager','tool':'task_begin','status':'failed','error':{'message':"ENOENT: no such file or directory, open '"+str(missing)+"'"}}
   self.assertTrue(acceptance.expected_tool_failure(item,missing))
   self.assertFalse(acceptance.expected_tool_failure(item))
   self.assertFalse(acceptance.expected_tool_failure({**item,'tool':'ted_doctor'},missing))
   self.assertFalse(acceptance.expected_tool_failure({**item,'error':{'message':'permission denied'}},missing))
   self.assertFalse(acceptance.expected_tool_failure({**item,'error':{'message':"ENOENT: no such file or directory, open '/other/file'"}},missing))
   missing.write_text('{}');self.assertFalse(acceptance.expected_tool_failure(item,missing))
 def test_expected_injected_error_is_recorded_without_masking_other_errors(self):
  expected={'status':'failed','failed':True,'expectedFailure':True}
  self.assertTrue(acceptance.integrity_checks([completed_case(toolCalls=[expected])],[])['noUnexpectedNativeToolErrors'])
  self.assertFalse(acceptance.integrity_checks([completed_case(toolCalls=[expected,{'status':'failed','failed':True}])],[])['noUnexpectedNativeToolErrors'])

if __name__=='__main__':unittest.main()
