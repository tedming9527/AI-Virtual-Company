import test from 'node:test';
import assert from 'node:assert/strict';
import { searchAssets } from './asset-search.js';
import { findSkills } from './local-assets.js';
import { listAssets, recommendAssets } from './awareness.js';
test('Chinese, English, mixed queries and declared aliases preserve match evidence and ranking', () => {
  const assets = [
    {id:'a',name:'docker-lan-access',displayName:'Docker LAN',description:'部署到局域网',keywords:['局域网访问','LAN'],aliases:['内网服务']},
    {id:'b',name:'background',description:'docker-lan-access is a related capability'},
  ];
  for (const q of ['局域网','LAN','ＤＯＣＫＥＲ＿ＬＡＮ－ＡＣＣＥＳＳ','docker 局域网','  Docker   LAN  ']) assert.equal(searchAssets(assets,q)[0].id,'a');
  assert.equal(searchAssets(assets,'内网服务')[0].matches[0].kind,'declared-alias');
  assert.equal(searchAssets(assets,'docker-lan-access')[0].id,'a');
  assert.equal(searchAssets(assets,'Docker unrelated')[0].id,'a');
  assert.ok(searchAssets(assets,'Docker unrelated')[0].matches.every(m=>m.term!=='unrelated'));
  assert.equal(searchAssets(assets,'').length,2);
  assert.equal(searchAssets([{name:'legacy'}],'LEGACY').length,1);
});
test('central bilingual acceptance examples reach find, list and recommend consistently', () => {
  const root=process.cwd(), options={externalRoots:[]};
  for(const [name,queries] of [['docker-lan-access',['局域网','LAN']],['test-quality-gate',['测试验收','quality gate']],['figma-reader',['设计稿','Figma']]]) {
    for(const query of queries) {
      assert.equal(findSkills(root,query,options).skills[0].name,name);
      assert.equal(listAssets(root,{query,type:'skill'},options).assets[0].name,name);
      assert.equal(recommendAssets(root,query,options).recommendations[0].name,name);
    }
  }
});
