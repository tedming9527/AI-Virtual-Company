import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readLocalCandidates} from './local-candidates.js';
import {registerCandidate} from '../governance/candidate-trials.js';
test('knowledge proposals and latest trial versions retain separate lifecycle states; bad files warn without hiding valid rows',t=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'panorama-candidates-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const personal=path.join(root,'private/projects/demo'),dir=path.join(personal,'staging/proposals');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(root,'runtime'));
 fs.writeFileSync(path.join(root,'bootstrap.json'),JSON.stringify({name:'demo',version:'1.0.0'}));fs.writeFileSync(path.join(root,'runtime/storage.json'),JSON.stringify({personal}));
 fs.writeFileSync(path.join(dir,'rule.json'),JSON.stringify({schema:'avc.asset-proposal.v1',id:'rule',type:'knowledge',name:'directory-first',purpose:'rule',status:'pending-review',publication:'none',installation:'none'}));
 fs.writeFileSync(path.join(dir,'bad.json'),'{');
 const candidate={id:'design',type:'knowledge',version:'1.0.0',title:'Design',hypothesis:'May improve design',triggers:['design'],exclude:[],scope:'one view',validation:'compare before after',expectedCost:'unknown',sources:[{url:'https://example.com/source',revision:'v1',kind:'research'}],components:[],target:{kind:'pack',paths:['packs/knowledge/design']},eligibility:'reversible',status:'candidate'};
 registerCandidate(root,{candidate});registerCandidate(root,{candidate:{...candidate,version:'1.1.0'}});
 const result=readLocalCandidates(root);assert.deepEqual(result.counts,{total:2,proposals:1,trials:1});assert.equal(result.rows[0].status,'pending-review');assert.equal(result.rows[1].version,'1.1.0');assert.deepEqual(result.rows[1].trials,[]);assert.equal(result.warnings.length,1);
 fs.symlinkSync(path.join(dir,'rule.json'),path.join(dir,'linked.json'));assert.ok(readLocalCandidates(root).warnings.some(w=>w.includes('linked.json')));
});
