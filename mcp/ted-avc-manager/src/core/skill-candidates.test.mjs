import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {registerLocalSkill,findSkills} from './local-assets.js';
import {validateLocalSkill,listSkillCandidates} from './skill-candidates.js';
import {proposeAsset} from './awareness.js';
function fixture(t) {
  fs.mkdirSync('runtime/cache',{recursive:true});const root=fs.mkdtempSync(path.resolve('runtime/cache/skill-candidate-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'bootstrap.json'),JSON.stringify({name:'demo',version:'1.0.0'}));
  const personal=path.join(root,'private/projects/demo'),dir=path.join(personal,'custom/packs/skill/example');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(root,'runtime'));
  fs.writeFileSync(path.join(root,'runtime/storage.json'),JSON.stringify({personal}));
  fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify({type:'skill',name:'example',version:'1.0.0',rubric:['quality'],description:'Verify examples'}));
  fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: example\ndescription: Verify examples when requested\n---\n# Example\n');
  registerLocalSkill(root,dir);return {root,dir,personal};
}
const sources=[{kind:'original',license:'MIT',note:'Original isolated test fixture'}];
test('registered skill creates independent, hash-bound review candidate without installing or publishing',t=>{
  const {root,dir,personal}=fixture(t),validation=validateLocalSkill(root,{assetId:'local-custom:skill:example'});
  const p=proposeAsset(root,{name:'example',assetId:'example',validationId:validation.id,sources});
  assert.equal(p.status,'pending-review');assert.equal(p.publication,'none');assert.equal(p.installation,'none');assert.match(p.validation.scope,/structural-only/);
  const copy=path.join(personal,'staging/proposals',p.snapshot.path,'SKILL.md');assert.equal(fs.readFileSync(copy,'utf8'),fs.readFileSync(path.join(dir,'SKILL.md'),'utf8'));
  assert.equal(listSkillCandidates(root)[0].validationState,'current');
  fs.appendFileSync(path.join(dir,'SKILL.md'),'changed');assert.equal(listSkillCandidates(root)[0].validationState,'invalidated');assert.ok(!fs.readFileSync(copy,'utf8').endsWith('changed'));
  assert.throws(()=>proposeAsset(root,{name:'example',assetId:'example',validationId:validation.id,sources}),/unchanged/);
  registerLocalSkill(root,dir);assert.throws(()=>proposeAsset(root,{name:'example',assetId:'example',validationId:validation.id,sources}),/revalidate/);
});
test('supporting file drift invalidates registration and validation',t=>{
  const {root,dir}=fixture(t);validateLocalSkill(root,{assetId:'example'});fs.writeFileSync(path.join(dir,'method.md'),'new dependency');
  assert.equal(findSkills(root,'example',{externalRoots:[]}).skills[0].management,'local-changed');assert.throws(()=>validateLocalSkill(root,{assetId:'example'}),/unchanged/);
});
test('candidate rejects unresolved licenses, private exports and symlinks',t=>{
  const {root,dir}=fixture(t);let v=validateLocalSkill(root,{assetId:'example'});
  assert.throws(()=>proposeAsset(root,{name:'example',assetId:'example',validationId:v.id,sources:[{kind:'adapted',license:'unknown',note:'unknown'}]}),/license/);
  fs.writeFileSync(path.join(dir,'private.md'),'Local path /Users/example/private');registerLocalSkill(root,dir);v=validateLocalSkill(root,{assetId:'example'});
  assert.throws(()=>proposeAsset(root,{name:'example',assetId:'example',validationId:v.id,sources}),/private/);
  fs.symlinkSync(path.join(root,'bootstrap.json'),path.join(dir,'link'));assert.throws(()=>registerLocalSkill(root,dir),/links/);
});
test('legacy text proposal remains compatible and does not change the source skill',t=>{
  const {root,dir}=fixture(t),before=fs.readFileSync(path.join(dir,'SKILL.md'),'utf8');const p=proposeAsset(root,{name:'suggestion',purpose:'Consider an alternative'});
  assert.equal(p.status,'pending-review');assert.equal(p.snapshot,undefined);assert.equal(fs.readFileSync(path.join(dir,'SKILL.md'),'utf8'),before);
});

test('malformed or non-string frontmatter cannot produce structural validation evidence',t=>{
 const {root,dir}=fixture(t);
 for(const description of ['[not a string','false','"unterminated','unquoted: mapping']) {
  fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: example\ndescription: '+description+'\n---\nBody');registerLocalSkill(root,dir);
  assert.throws(()=>validateLocalSkill(root,{assetId:'example'}));
 }
});

test('external skill candidate carries a pinned public source URL into its metadata',t=>{
 const {root,dir}=fixture(t), external=[{kind:'adapted',license:'MIT',note:'Reviewed upstream',url:'https://github.com/demo/tool',revision:'abc123'}];
 let validation=validateLocalSkill(root,{assetId:'example'});
 assert.throws(()=>proposeAsset(root,{name:'example',assetId:'example',validationId:validation.id,sources:external}),/meta.origin/);
 const metaFile=path.join(dir,'meta.json'),meta=JSON.parse(fs.readFileSync(metaFile));
 meta.origin={url:external[0].url,revision:external[0].revision,repository:'demo/tool'};
 fs.writeFileSync(metaFile,JSON.stringify(meta));registerLocalSkill(root,dir);validation=validateLocalSkill(root,{assetId:'example'});
 const candidate=proposeAsset(root,{name:'example',assetId:'example',validationId:validation.id,sources:external});
 assert.equal(candidate.status,'pending-review');
 assert.equal(listSkillCandidates(root)[0].sources[0].url,external[0].url);
});
