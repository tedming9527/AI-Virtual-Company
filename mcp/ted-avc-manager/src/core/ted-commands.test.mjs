import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseTedCommand,runTedCommand} from './ted-commands.js';
test('ted routes exact commands and refuses ambiguous or shell-bearing payloads',()=>{
 for(const prefix of ['/ted','$ted','ted'])assert.equal(parseTedCommand(prefix+' doctor'),'doctor');
 assert.equal(parseTedCommand('/ted 检查更新'),'update');assert.equal(parseTedCommand('/ted'),'help');
 for(const value of ['/ted doctor; touch other','/ted doctor\nrm -rf x','/ted ${secret}','/other doctor','please /ted repair'])assert.throws(()=>parseTedCommand(value));
});
test('repair and status work without a task or source checkout and never silently install',async t=>{
 const home=mkdtempSync(join(tmpdir(),'avc-ted-command-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
 const base=join(home,'ted-avc-manager');mkdirSync(base);writeFileSync(join(base,'manifest.json'),JSON.stringify({version:'1.6.1',generation:'test'}));writeFileSync(join(base,'deployment.json'),JSON.stringify({scope:'client'}));
 const before=JSON.stringify(await runTedCommand('/missing-source',{action:'status'},{codexHome:home}));
 const result=await runTedCommand('/missing-source',{action:'repair'},{codexHome:home});
 assert.equal(result.applied,false);assert.equal(result.taskContinues,true);assert.equal(result.readOnly,true);
 assert.equal(JSON.stringify(await runTedCommand('/missing-source',{action:'status'},{codexHome:home})),before);
 assert.ok(result.plan.every(p=>p.step!=='disable-sandbox'));
});
