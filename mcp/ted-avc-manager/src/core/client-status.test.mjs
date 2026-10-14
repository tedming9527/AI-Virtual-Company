import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { clientStatus } from './client-status.js';

function fixture(t) {
  const home=mkdtempSync(join(tmpdir(),'avc-status-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
  const base=join(home,'ted-avc-manager');mkdirSync(base);
  const put=(name,data)=>{const file=join(base,name);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,JSON.stringify(data));};
  put('manifest.json',{version:'1.6.0',generation:'current'});
  put('deployment.json',{scope:'client'});
  return {home,base,put};
}
test('status separates preserved capture, failed attribution and missing task contract with corrupt configuration', t=>{
  const {home,base,put}=fixture(t),key='a'.repeat(64);
  put(`state/runtime/mediation/events/${key}.json`,{captureId:key,generation:'current',sessionId:'chain',turnId:'turn'});
  put(`state/runtime/hooks/outcomes/${key}.json`,{at:100,status:'unverified',collection:{captureId:key,captured:true,contextReturned:false,footerStatus:'unverified'}});
  writeFileSync(join(base,'deployment.json'),'{broken');
  const status=clientStatus({codexHome:home});
  assert.equal(status.eventsCaptured,1);assert.equal(status.nativeActivation,'native-events-observed');
  assert.equal(status.contextReturned,false);assert.equal(status.taskContracts,0);assert.equal(status.footerStatus,'unverified');
  assert.equal(status.problems[0].file,'deployment.json');
  writeFileSync(join(base,'manifest.json'),'null');
  const unknown=clientStatus({codexHome:home});
  assert.equal(unknown.nativeActivation,'unverified');assert.equal(unknown.eventsCaptured,0);assert.equal(unknown.observedEvents,1);
});
test('status refuses redirected state and identifies missing records without reading external events', t=>{
  const {home,base}=fixture(t);
  const external=join(home,'external');mkdirSync(external);writeFileSync(join(external,'a'.repeat(64)+'.json'),JSON.stringify({generation:'current',sessionId:'external'}));
  mkdirSync(join(base,'state/runtime/mediation'),{recursive:true});
  symlinkSync(external,join(base,'state/runtime/mediation/events'));
  const status=clientStatus({codexHome:home});
  assert.equal(status.nativeActivation,'unverified');assert.equal(status.observedEvents,0);
  assert.match(status.problems[0].reason,/symlink/);
});
test('legacy installations are diagnosed as needing ingress upgrade rather than host reload', t=>{
  const {home,put}=fixture(t);put('deployment.json',{projects:[{root:'/legacy'}]});
  const status=clientStatus({codexHome:home});
  assert.equal(status.scope,'legacy-project');assert.equal(status.nativeActivation,'upgrade-required-for-client-ingress');
});
