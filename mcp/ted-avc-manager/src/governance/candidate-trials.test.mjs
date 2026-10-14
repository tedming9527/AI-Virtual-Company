import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {registerCandidate, listTrialCandidates, matchCandidates, recordTrial, trialStatus, taskTrialContext, candidateTrialSummary, CANDIDATE_TYPES} from './candidate-trials.js';
import {prepareWeekly} from './weekly.js';
const sha = value => createHash('sha256').update(value).digest('hex');
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'avc-trial-')));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  const personal = path.join(root,'private/projects/demo');
  fs.mkdirSync(path.join(root,'runtime'),{recursive:true});
  fs.mkdirSync(path.join(personal,'experience'),{recursive:true});
  fs.writeFileSync(path.join(root,'bootstrap.json'),JSON.stringify({name:'demo',version:'1.0.0'}));
  fs.writeFileSync(path.join(root,'runtime/storage.json'),JSON.stringify({personal}));
  fs.writeFileSync(path.join(personal,'experience/source.md'),'research with limits');
  const candidate = {id:'subject-led-design',type:'knowledge',version:'1.0.0',title:'Subject-led design',hypothesis:'May improve visual identity',triggers:['portfolio','作品集'],exclude:['dashboard','后台'],scope:'One reversible hero section',validation:'Compare clear content and distinctive design against a baseline',expectedCost:'Budget 20 minutes; tokens unknown',
    sources:[{path:'experience/source.md',sha256:sha('research with limits'),kind:'research'}],components:[],target:{kind:'pack',paths:['packs/knowledge/subject-led-design']},eligibility:'reversible',status:'candidate'};
  const register = extra => registerCandidate(root,{candidate:{...candidate,...extra}});
  const r=register();
  const key={taskKey:'logical-task-a',candidateId:candidate.id,sha256:r.sha256};
  const record = extra => recordTrial(root,{...key,...extra});
  const offer = () => record({action:'offer',query:'Build a portfolio homepage',prompt:'Try this unverified hero direction?',reason:'The subject-specific direction matches a portfolio'});
  const accept = () => {offer();record({action:'decide',choice:'accepted',userResponse:'Yes, this hero only',responseSource:'user'});record({action:'start'});};
  const artifact=path.join(root,'baseline.txt');fs.writeFileSync(artifact,'actual output');
  const result={action:'result',effect:'improved',summary:'User preferred this hero; no causal claim',comparison:'baseline',artifacts:[{path:artifact}],costs:{timeMinutes:{value:12,basis:'observed'},tokens:{value:null,basis:'unknown'}},feedback:{choice:'keep',userResponse:'Keep this hero'}};
  return {root,personal,candidate,register,r,key,record,offer,accept,result};
}
test('all existing pack types and repository artifacts are source-bound candidates, never installed/published',t=>{
  const f=fixture(t);
  for(const type of CANDIDATE_TYPES){const r=f.register({id:'candidate-'+type,type,components:type==='role'?[{id:'knowledge:base',version:'1.0.0',sha256:'a'.repeat(64)}]:[],target:{kind:'repository',paths:['presets/base','mcp/example','rules/example.md']}});assert.equal(r.publication,'none');assert.equal(r.installation,'none');assert.equal(r.review,'pending');}
  assert.equal(listTrialCandidates(f.root).candidates.length,CANDIDATE_TYPES.length+1);
  assert.equal(f.register().unchanged,true);
  assert.throws(()=>f.register({hypothesis:'Changed without version'}),/never overwrite/);
  assert.throws(()=>f.register({id:'escape',target:{kind:'repository',paths:['../secret']}}),/escapes/);
});
test('matching is contextual, capped at one, and only actual prompting starts deduplication',t=>{
  const f=fixture(t), q={taskKey:f.key.taskKey,query:'Make a portfolio'};
  assert.equal(matchCandidates(f.root,q).recommendations[0].quality,'unscored');
  assert.equal(matchCandidates(f.root,q).recommendations.length,1);
  assert.equal(matchCandidates(f.root,{...q,query:'portfolio dashboard'}).recommendations.length,0);
  assert.equal(trialStatus(f.root).trials.length,0);
  f.offer();assert.throws(()=>f.offer(),/already offered/);
  f.record({action:'decide',choice:'declined',userResponse:'Skip it for this task',responseSource:'user'});
  assert.equal(matchCandidates(f.root,q).recommendations.length,0);
  assert.equal(matchCandidates(f.root,{...q,taskKey:'logical-task-b'}).recommendations.length,1);
  assert.throws(()=>f.record({action:'start'}),/explicit acceptance/);
});
test('trial requires a reported explicit user choice; effects need artifacts and costs retain unknowns',t=>{
  const f=fixture(t);f.offer();
  assert.throws(()=>f.record({action:'start'}),/explicit acceptance/);
  assert.throws(()=>f.record({action:'decide',choice:'accepted',userResponse:'model thinks yes',responseSource:'model'}),/inferred/);
  f.record({action:'decide',choice:'accepted',userResponse:'Try it',responseSource:'user'});f.record({action:'start'});
  assert.throws(()=>f.record({...f.result,artifacts:[]}),/real artifacts/);
  assert.throws(()=>f.record({...f.result,costs:{tokens:{value:12,basis:'unknown'}}}),/unknown is null/);
  assert.throws(()=>f.record({...f.result,feedback:{choice:'keep',userResponse:null}}),/feedback/);
  assert.throws(()=>f.record({...f.result,artifacts:[{path:f.result.artifacts[0].path,sha256:'b'.repeat(64)}]}),/drift/);
  const completed=f.record({...f.result,feedback:undefined});
  assert.equal(completed.result.feedback.choice,'unknown');assert.equal(completed.result.costs.tokens.value,null);assert.equal(completed.result.costs.money.value,null);
  assert.equal(completed.result.artifacts[0].sha256,sha('actual output'));
  assert.equal(listTrialCandidates(f.root).candidates[0].candidate.status,'candidate');
  assert.throws(()=>f.record(f.result),/running trial/);
});
test('poor outcomes need a changed-condition explanation and are not confused with insufficient evidence',t=>{
  const f=fixture(t);f.accept();f.record({...f.result,effect:'worse',summary:'Cost doubled and readability fell',feedback:{choice:'discard',userResponse:'Discard this version'}});
  const input={taskKey:'logical-task-b',query:'portfolio'};
  assert.equal(matchCandidates(f.root,input).recommendations.length,0);
  const retry=matchCandidates(f.root,{...input,retryReason:'This project has real images; previous one had none'}).recommendations[0];
  assert.equal(retry.priorFailures[0],'Cost doubled and readability fell');assert.ok(retry.retryReason);
});
test('source/content drift and symlinks suppress recommendations; failed collection does not block work',t=>{
  const f=fixture(t);f.register({version:'1.1.0'});
  const file=path.join(f.personal,'staging/trial-candidates/subject-led-design-1.1.0.json');
  fs.writeFileSync(file,'broken');
  assert.equal(matchCandidates(f.root,{taskKey:'other',query:'portfolio'}).recommendations.length,0);
  assert.ok(listTrialCandidates(f.root).warnings.length);
  fs.writeFileSync(path.join(f.personal,'experience/source.md'),'changed');
  assert.equal(listTrialCandidates(f.root).candidates.length,0);
  const ledgerDir=path.join(f.personal,'experience/.avc');fs.mkdirSync(ledgerDir,{recursive:true});fs.writeFileSync(path.join(ledgerDir,'candidate-trials.json'),'corrupt');
  assert.equal(taskTrialContext(f.root,'other','portfolio').taskContinues,true);
  fs.rmSync(path.join(f.personal,'staging/trial-candidates'),{recursive:true});fs.symlinkSync(f.root,path.join(f.personal,'staging/trial-candidates'));
  assert.equal(taskTrialContext(f.root,'other','portfolio').status,'unavailable');
});
test('a corrupt older revision does not hide a valid newer candidate, while a corrupt newest revision still blocks fallback',t=>{
  const f=fixture(t);f.register({version:'1.10.0'});
  const directory=path.join(f.personal,'staging/trial-candidates');
  fs.writeFileSync(path.join(directory,'subject-led-design-1.0.0.json'),'broken old revision');
  const listed=listTrialCandidates(f.root);assert.equal(listed.warnings.length,1);assert.equal(listed.candidates[0].candidate.version,'1.10.0');
  assert.equal(matchCandidates(f.root,{taskKey:'newer',query:'portfolio'}).recommendations.length,1);
  fs.writeFileSync(path.join(directory,'subject-led-design-1.11.0.json'),'broken newest revision');
  assert.equal(listTrialCandidates(f.root).candidates.length,0);
});
test('tools requiring installation need a separate authorization; composite validation is recorded independently',t=>{
  const f=fixture(t);const r=f.register({id:'tool-checker',type:'skill',eligibility:'requires-authorization',target:{kind:'repository',paths:['mcp/checker']}});
  const key={taskKey:'tool-task',candidateId:'tool-checker',sha256:r.sha256};
  // Two candidates match. A distinct trigger avoids irrelevant top-one selection.
  const tool=f.register({id:'tool-only',type:'skill',triggers:['browser checker'],eligibility:'requires-authorization'});
  const k={taskKey:'tool-task',candidateId:'tool-only',sha256:tool.sha256};
  recordTrial(f.root,{...k,action:'offer',query:'browser checker',prompt:'Try checker?',reason:'Browser measurement needed'});
  recordTrial(f.root,{...k,action:'decide',choice:'accepted',userResponse:'Try its report',responseSource:'user'});
  assert.throws(()=>recordTrial(f.root,{...k,action:'start'}),/authorization/);
  const started=recordTrial(f.root,{...k,action:'start',authorizationRef:'Explicitly authorized isolated install, recorded elsewhere'});
  assert.equal(started.status,'running');assert.equal(fs.existsSync(path.join(f.root,'installed-tool')),false);
  assert.ok(key);
});
test('weekly governance carries source-bound trial results without changing quality or publishing candidates',t=>{
  const f=fixture(t);f.accept();f.record(f.result);
  const summary=candidateTrialSummary(f.root);assert.equal(summary.counts.completed,1);
  const prepared=prepareWeekly(f.root,{writerId:'writer_one'});
  const manifest=JSON.parse(fs.readFileSync(path.join(f.personal,prepared.file),'utf8'));
  assert.equal(manifest.candidateTrials.results[0].result.effect,'improved');
  assert.equal(manifest.candidateTrials.candidates[0].sha256,f.r.sha256);
  assert.equal(manifest.experience.length,1);assert.equal(listTrialCandidates(f.root).candidates[0].publication,'none');
});
