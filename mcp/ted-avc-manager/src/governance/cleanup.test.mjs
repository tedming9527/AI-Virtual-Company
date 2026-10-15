import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { cleanupRuntime } from './cleanup.js';

const sha = content => createHash('sha256').update(content).digest('hex');
test('old consumed log is protected until verified rollup and closed-task receipt exist', t => {
  const rt = fs.mkdtempSync(path.join(os.tmpdir(), 'avc-cleanup-'));
  t.after(() => fs.rmSync(rt, { recursive: true, force: true }));
  const logs = path.join(rt, 'logs'), governance = path.join(rt, 'governance'), rollups = path.join(governance, 'rollups');
  fs.mkdirSync(logs); fs.mkdirSync(rollups, { recursive: true });
  const name = 'task.consumed.jsonl', content = 'event\n', file = path.join(logs, name);
  fs.writeFileSync(file, content);
  const old = new Date(Date.now() - 31 * 86400000);
  fs.utimesSync(file, old, old);
  assert.equal(cleanupRuntime(rt, { dryRun: false }).removed.logs, 0);
  const rollupFile = 'window.json', rollup = '{}';
  fs.writeFileSync(path.join(rollups, rollupFile), rollup);
  const receipt = { schema: 'avc.consumed-logs.v1', entries: [{ name, sha256: sha(content), rollupFile, rollupSha256: sha(rollup), status: 'verified', taskClosed: true, investigationHold: false }] };
  fs.writeFileSync(path.join(governance, 'consumed-log-receipts.json'), JSON.stringify(receipt));
  assert.equal(cleanupRuntime(rt).removed.logs, 1);
  assert.equal(fs.existsSync(file), true);
  assert.equal(cleanupRuntime(rt, { dryRun: false }).removed.logs, 1);
  assert.equal(fs.existsSync(file), false);
});
test('cleanup refuses symlinked roots and entries while independent ordinary cache files remain reclaimable',t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'avc-cleanup-links-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const rt=path.join(base,'runtime'),outside=path.join(base,'protected');fs.mkdirSync(rt);fs.mkdirSync(outside);
 const victim=path.join(outside,'source.txt');fs.writeFileSync(victim,'unique');const old=new Date(Date.now()-10*86400000);fs.utimesSync(victim,old,old);
 const cache=path.join(rt,'cache');fs.symlinkSync(outside,cache);
 assert.equal(cleanupRuntime(rt,{dryRun:false}).removed.cache,0);assert.equal(fs.readFileSync(victim,'utf8'),'unique');fs.unlinkSync(cache);fs.mkdirSync(cache);
 fs.symlinkSync(victim,path.join(cache,'linked'));fs.writeFileSync(path.join(cache,'old'),'rebuildable');fs.utimesSync(path.join(cache,'old'),old,old);fs.writeFileSync(path.join(cache,'fresh'),'fresh');
 assert.equal(cleanupRuntime(rt,{dryRun:false}).removed.cache,1);assert.equal(fs.readFileSync(victim,'utf8'),'unique');assert.equal(fs.existsSync(path.join(cache,'fresh')),true);
});
test('unfinished task flag cannot keep an expired verified raw log forever; retain an unknown-outcome expiry receipt',t=>{
 const rt=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'avc-cleanup-expiry-')));t.after(()=>fs.rmSync(rt,{recursive:true,force:true}));
 const file=path.join(rt,'logs','old.jsonl'),rollup=path.join(rt,'governance/rollups/window.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.mkdirSync(path.dirname(rollup),{recursive:true});
 fs.writeFileSync(file,'observed\n');fs.writeFileSync(rollup,'{"delivered":1,"outcome":"unknown"}');const old=new Date(Date.now()-31*86400000);fs.utimesSync(file,old,old);
 fs.writeFileSync(path.join(rt,'governance/consumed-log-receipts.json'),JSON.stringify({schema:'avc.consumed-logs.v1',entries:[{name:'old.jsonl',sha256:sha('observed\n'),rollupFile:'window.json',rollupSha256:sha(fs.readFileSync(rollup)),status:'verified',taskClosed:false}]}));
 assert.equal(cleanupRuntime(rt,{dryRun:false}).removed.logs,1);assert.equal(fs.existsSync(file),false);assert.ok(fs.existsSync(rollup));
 const proof=JSON.parse(fs.readFileSync(path.join(rt,'governance/expired-log-receipts',sha('observed\n')+'.json')));assert.equal(proof.outcome,'unknown');assert.equal(proof.taskClosed,false);
});
