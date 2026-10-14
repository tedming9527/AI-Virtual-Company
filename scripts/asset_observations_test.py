import unittest
from asset_observations import reconcile_observations
class ObservationTest(unittest.TestCase):
 def test_confirmed_retirement_clears_all_observation_shapes(self):
  old={'a':{},'b':{}};new={'b':{}}
  v={'schema':'avc.observations.v1','events':[{'assetKey':'a','signal':'delivered'},{'assetKey':'b','signal':'read'},{'assetKey':'unknown','signal':'read'}],'rollups':{'a':{},'b':{}},'suggestions':[{'assetKey':'a'},{'assetKey':'b'}]}
  result,receipt=reconcile_observations(v,old,new)
  self.assertEqual(receipt['retiredAssetKeys'],['a']);self.assertNotIn('a',result['rollups']);self.assertEqual(len(result['events']),2);self.assertEqual(result['suggestions'],[{'assetKey':'b'}])
 def test_move_or_live_migration_does_not_retire(self):
  v={'schema':'avc.observations.v1','events':[{'assetKey':'same'}],'rollups':{},'suggestions':[]}
  result,receipt=reconcile_observations(v,{'same':{}},{'same':{'path':'moved'}})
  self.assertFalse(receipt['retiredAssetKeys']);self.assertEqual(len(result['events']),1)
  _,receipt=reconcile_observations(v,{'same':{}},{},['same']);self.assertFalse(receipt['retiredAssetKeys'])
 def test_retirement_prunes_owned_recovery_copy_not_user_material(self):
  import tempfile,json
  from pathlib import Path
  from client_environment import save,digest
  from asset_observations import plan_archive_retirements
  with tempfile.TemporaryDirectory() as temp:
   p=Path(temp).resolve();batch=p/'staging/client-recovery/old';f=batch/'files/history/asset-events.jsonl'
   asset={'source':'general','type':'skill','id':'gone','version':'1.0.0','bundleSha256':'a'*64};key='general:skill/gone@1.0.0#'+'a'*64
   data=(json.dumps({**asset,'name':'gone','kind':'manager-delivered'})+'\n').encode();f.parent.mkdir(parents=True);f.write_bytes(data)
   save(batch/'recovery.json',{'schema':'avc.client-recovery.v1','files':{'history/asset-events.jsonl':{'sha256':digest(data),'kind':'audit'}}})
   edits=plan_archive_retirements(p,{key:asset},{})
   self.assertEqual(len(edits),2);self.assertEqual(next(e['data'] for e in edits if e['relative'].endswith('jsonl')),b'');self.assertEqual(f.read_bytes(),data)
if __name__=='__main__':unittest.main()
