import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAssetObservations} from './asset-metrics.js';
test('counts only matching current content, deduplicates deliveries and keeps adoption unknown',()=>{
 const a={id:'a',source:'general',name:'guide',type:'skill',version:'1.0.0',bundleSha256:'new',executionBundleSha256:'execution-new',entrySha256:'entry',dir:'/bundle',entry:'/bundle/SKILL.md',files:[{relativePath:'SKILL.md',sha256:'entry'}]};
 const event=(kind,sha256='entry')=>({kind,source:'general',name:'guide',type:'skill',sessionId:'s',turnId:'t',relativePath:'SKILL.md',sha256,at:'2026-10-01T00:00:00Z'});
 const task={sessionId:'s',turnId:'t',assets:[{source:'general',name:'guide',type:'skill',version:'1.0.0',bundleSha256:'execution-new',entry:'SKILL.md',loadedAt:'2026-10-01T00:00:00Z'},{source:'general',name:'guide',type:'skill',version:'1.0.0',bundleSha256:'old',entry:'SKILL.md',loadedAt:'2026-10-12T00:00:00Z'}]};
 const [m]=summarizeAssetObservations([a],[event('read-attempted'),event('read-completed'),event('read-completed'),event('manager-delivered'),event('read-completed','old')],[task],Date.parse('2026-10-15T00:00:00Z'));
 assert.equal(m.delivered,1);assert.equal(m.readCompleted,1);assert.equal(m.adopted,null);assert.equal(m.daysSinceObserved,14);assert.equal(m.recent30,2);
 const [empty]=summarizeAssetObservations([a],[],[],Date.now());assert.equal(empty.lastObserved,null);assert.equal(empty.adopted,null);
});
test('knowledge entry does not inherit loads of sibling files or bundles',()=>{
 const a={id:'detail',source:'general',name:'detail',type:'knowledge',version:'2026-10-01',bundleSha256:'new',dir:'/bundle',entry:'/bundle/detail.md',load:{type:'role',name:'owner',entry:'detail.md'}};
 const item={source:'general',name:'owner',type:'role',version:'1.0.0',bundleSha256:'new',loadedAt:'2026-10-01T00:00:00Z'};
 const [m]=summarizeAssetObservations([a],[],[{sessionId:'s',turnId:'t',assets:[{...item,entry:'PROFILE.md'},{...item,entry:'detail.md'}]}],Date.parse('2026-10-15T00:00:00Z'));
 assert.equal(m.delivered,1);
});
test('historical rollups stay separate from retained observations and reject another digest',()=>{
 const a={id:'a',source:'general',name:'guide',type:'skill',version:'1.0.0',bundleSha256:'current',entry:'/bundle/SKILL.md',dir:'/bundle'};
 const record=digest=>({asset:{source:'general',type:'skill',id:'guide',version:'1.0.0',bundleSha256:digest},delivered:8,readCompleted:3,adopted:2,sampleSize:1});
 const [m]=summarizeAssetObservations([a],[null],[],Date.now(),[{from:'2026-09-01',through:'2026-09-08',assets:{a:record('current'),b:record('stale')}}]);
 assert.equal(m.delivered,0);assert.equal(m.history.length,1);assert.equal(m.history[0].delivered,8);assert.equal(m.history[0].adopted,2);assert.equal(m.adopted,null);
});
