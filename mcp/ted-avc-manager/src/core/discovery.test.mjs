import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverCapabilities,githubSearch} from './discovery.js';
const input={zhQuery:'技能发现',enQuery:'skill discovery'};
const item={identity:'openai/skills',url:'https://github.com/openai/skills',source:'github-repository'};
test('both language searches execute and duplicate candidates keep both provenance paths',async()=>{
  const calls=[];const result=await discoverCapabilities(input,{search:async req=>{calls.push(req);return {items:[item]};}});
  assert.deepEqual(calls.map(c=>c.language),['zh','en']);assert.equal(result.coverage,'both-languages');assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].matchedQueries.length,2);assert.equal(result.installation,'none');
});
test('Chinese zero results still executes English and reports exact coverage',async()=>{
  const result=await discoverCapabilities(input,{search:async req=>({items:req.language==='zh'?[]:[item]})});
  assert.equal(result.attempts[0].resultCount,0);assert.equal(result.candidates.length,1);assert.equal(result.coverage,'both-languages');
});
test('partial failure, incomplete response and offline are not successful full discovery',async()=>{
  const partial=await discoverCapabilities(input,{search:async req=>{if(req.language==='zh')throw new Error('offline');return {items:[item]};}});
  assert.equal(partial.coverage,'partial');assert.equal(partial.candidates.length,1);assert.equal(partial.attempts[0].error,'offline');
  const failed=await discoverCapabilities(input,{search:async()=>{throw new Error('offline')}});assert.equal(failed.coverage,'unavailable');
  const incomplete=await discoverCapabilities(input,{search:async()=>({items:[],incomplete:true})});assert.equal(incomplete.coverage,'partial');
  await assert.rejects(discoverCapabilities({zhQuery:'English',enQuery:'skills'}),/Chinese/);
});
test('GitHub adapter uses only explicit queries, limits owners, rejects errors and carries no credentials',async()=>{
  const request={query:'skills',owners:['openai']};
  const response=await githubSearch(request,{fetchImpl:async(url,opts)=>{
    assert.equal(url.origin,'https://api.github.com');assert.equal(url.searchParams.get('q'),'skills user:openai');assert.equal(opts.headers.Authorization,undefined);assert.equal(opts.redirect,'error');
    return {ok:true,json:async()=>({items:[{full_name:'openai/skills',html_url:item.url,owner:{login:'openai'}},{full_name:'other/skills',owner:{login:'other'}}]})};
  }});assert.equal(response.items.length,1);
  await assert.rejects(githubSearch(request,{fetchImpl:async()=>({ok:false,status:403})}),/403/);
});
