import json, tempfile, subprocess, unittest
from pathlib import Path
from client_environment import save, digest, inventory
from asset_lifecycle import fingerprint, propose_central, register_central_artifact_release, ledger_file

class CompositeReleaseTest(unittest.TestCase):
 def setUp(self):
  temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);self.base=Path(temp.name).resolve()
  self.personal=self.base/'personal/projects/demo';self.source=self.personal/'custom/materials/composite'
  self.source.mkdir(parents=True)
  (self.source/'role.md').write_text('professional package')
  (self.source/'workflow.json').write_text('{"steps":["build","review"]}')
  files=inventory(self.source);revision=fingerprint(files)
  save(ledger_file(self.personal),{'schema':'avc.asset-lifecycle.v1','assets':{'user:material:composite':{'ownership':'user','status':'active','revision':revision,'files':files,'path':str(self.source)}},'transitions':[]})
  self.proposal=Path(propose_central(self.personal,'user:material:composite','authorized-candidate')['path'])
  self.central=self.base/'central';self.central.mkdir()
  self.targets={'role.md':'packs/role/example/PROFILE.md','workflow.json':'presets/example/workflow.json'}
  for source,target in self.targets.items():
   f=self.central/target;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes((self.source/source).read_bytes())
  self.git('init');self.git('add','.');self.git('-c','user.name=Test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-m','approved-fixture');self.git('tag','v1.0.0')
 def git(self,*args):subprocess.run(['git','-C',str(self.central),*args],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 def release(self,targets=None):return register_central_artifact_release(self.personal,self.proposal,self.central,self.targets if targets is None else targets,'v1.0.0','review-ref','composite')
 def test_composite_requires_full_mapping_and_preserves_source(self):
  with self.assertRaisesRegex(ValueError,'full source'):self.release({'role.md':self.targets['role.md']})
  with self.assertRaisesRegex(ValueError,'target'):self.release({'role.md':'../secret','workflow.json':self.targets['workflow.json']})
  receipt=self.release();self.assertEqual(receipt['to']['targets'],self.targets);self.assertTrue(receipt['sourcePreserved'])
  self.assertEqual(json.loads((self.proposal/'proposal.json').read_text())['status'],'released')
  self.assertTrue((self.source/'role.md').exists())
 def test_release_cannot_substitute_different_content_or_unregistered_source(self):
  wrong={'role.md':self.targets['workflow.json'],'workflow.json':self.targets['role.md']}
  with self.assertRaisesRegex(ValueError,'differs'):self.release(wrong)
  (self.source/'role.md').write_text('source changed since review')
  with self.assertRaisesRegex(ValueError,'revision changed'):self.release()
