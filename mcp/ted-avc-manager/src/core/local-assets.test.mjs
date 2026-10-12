import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { discoverSkills, findSkills, registerLocalSkill, inventoryPersonal } from './local-assets.js';
function fixture(t) {
  fs.mkdirSync('runtime/cache', {recursive:true});
  const root=fs.mkdtempSync(path.resolve('runtime/cache/assets-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const personal=path.join(root,'private/projects/demo');fs.mkdirSync(path.join(personal,'custom'),{recursive:true});
  fs.mkdirSync(path.join(root,'runtime'));fs.writeFileSync(path.join(root,'bootstrap.json'),JSON.stringify({name:'demo',version:'1.0.0'}));
  fs.writeFileSync(path.join(root,'runtime/storage.json'),JSON.stringify({personal}));
  return {root,personal};
}
function skill(dir,name='origin-check') {
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: '+name+'\ndescription: Inspect scoped asset provenance\n---\n# 来源核验技能\n');
  fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify({type:'skill',name,version:'1.0.0',rubric:['traceability']}));
}
test('skill discovery does not imply registration; registration tracks body and metadata changes',t=>{
 const {root,personal}=fixture(t),dir=path.join(personal,'custom/packs/skill/origin-check');skill(dir);
 assert.equal(findSkills(root,'origin-check',{externalRoots:[]}).skills[0].management,'discovered-unregistered');
 registerLocalSkill(root,dir);assert.equal(findSkills(root,'来源',{externalRoots:[]}).skills[0].management,'local-managed');
 const meta=path.join(dir,'meta.json');fs.writeFileSync(meta,fs.readFileSync(meta,'utf8').replace('1.0.0','1.0.1'));
 assert.equal(findSkills(root,'origin-check',{externalRoots:[]}).skills[0].management,'local-changed');
 registerLocalSkill(root,dir);fs.appendFileSync(path.join(dir,'SKILL.md'),'New instructions');
 assert.equal(findSkills(root,'origin-check',{externalRoots:[]}).skills[0].management,'local-changed');
});
test('external discovery is unmanaged and registration never imports it directly',t=>{
 const {root}=fixture(t),external=path.join(root,'external');skill(path.join(external,'origin-check'));
 const result=discoverSkills(root,{externalRoots:[external]});assert.equal(result.skills[0].management,'discovered-unregistered');
 assert.throws(()=>registerLocalSkill(root,path.join(external,'origin-check')),/staging/);
});
test('personal area provenance preserves staging/archive and does not follow symlinks',t=>{
 const {root,personal}=fixture(t);fs.mkdirSync(path.join(personal,'staging'));fs.mkdirSync(path.join(personal,'archive'));
 fs.writeFileSync(path.join(personal,'staging/candidate.md'),'private candidate');fs.writeFileSync(path.join(personal,'archive/history.md'),'old');
 fs.symlinkSync(path.join(personal,'archive'),path.join(personal,'custom/loop'));
 const inv=inventoryPersonal(root);assert.equal(inv.areas.find(a=>a.name==='staging').state,'pending-review');assert.equal(inv.areas.find(a=>a.name==='archive').state,'historical');assert.equal(inv.areas.find(a=>a.name==='custom').files.length,0);assert.ok(inv.warnings.length);
});
test('symlinked skill metadata, system entries and runtime registry cannot escape',t=>{
 const {root,personal}=fixture(t),dir=path.join(personal,'custom/packs/skill/origin-check');skill(dir);
 fs.rmSync(path.join(dir,'meta.json'));const elsewhere=path.join(root,'outside');skill(elsewhere);fs.symlinkSync(path.join(elsewhere,'meta.json'),path.join(dir,'meta.json'));
 assert.equal(findSkills(root,'origin-check',{externalRoots:[]}).skills.length,0);
 fs.rmSync(path.join(dir,'meta.json'));fs.copyFileSync(path.join(elsewhere,'meta.json'),path.join(dir,'meta.json'));
 fs.rmSync(path.join(root,'runtime'),{recursive:true});fs.symlinkSync(elsewhere,path.join(root,'runtime'));
 assert.throws(()=>registerLocalSkill(root,dir),/runtime/);
});
