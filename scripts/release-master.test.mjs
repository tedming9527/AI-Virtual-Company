import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { compareVersions, readRelease, publishRelease } from './release-master.mjs';

const env = sha => ({ GITHUB_REF:'refs/heads/master', GITHUB_SHA:sha, GITHUB_REPOSITORY:'owner/repo' });
function fixture(t) {
  const base=mkdtempSync(join(tmpdir(),'avc-release-'));t.after(()=>rmSync(base,{recursive:true,force:true}));
  const root=join(base,'repo'), remote=join(base,'origin.git');mkdirSync(root);
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  mkdirSync(join(root,'mcp/ted-avc-manager'),{recursive:true});
  writeFileSync(join(root,'bootstrap.json'),JSON.stringify({version:'1.4.3'}));
  writeFileSync(join(root,'mcp/ted-avc-manager/package.json'),JSON.stringify({version:'1.4.3'}));
  writeFileSync(join(root,'CHANGELOG.md'),'# Changes\n\n## [Unreleased]\n\n## [1.4.3] - 2026-10-13\n\n- Master release flow.\n');
  git('add','.');git('commit','-qm','fixture');const sha=git('rev-parse','HEAD');
  execFileSync('git',['init','--bare','-q',remote]);git('remote','add','origin',remote);
  const calls=[];let released=false;
  const run=(tool,args,cwd)=>{
    if(tool==='git')return execFileSync(tool,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    calls.push(args);
    if(args[0]==='api'&&args[1].endsWith('/pulls'))return JSON.stringify([{merged_at:'2026-10-13',base:{ref:'master'},merge_commit_sha:sha}]);
    if(args[0]==='api'){
      if(!released){const e=new Error('missing');e.stderr=Buffer.from('Not Found (HTTP 404)');throw e;}
      return JSON.stringify({tag_name:'v1.4.3',draft:false,prerelease:false});
    }
    released=true;return 'https://github.com/owner/repo/releases/tag/v1.4.3';
  };
  return {root,remote,git,sha,run,calls};
}

test('release creates an annotated remote tag for the approved commit and reruns do not recreate it',t=>{
  const f=fixture(t);const first=publishRelease(f.root,env(f.sha),f.run);assert.equal(first.reusedTag,false);
  assert.equal(f.git('ls-remote','--tags','origin','refs/tags/v1.4.3^{}').split(/\s+/)[0],f.sha);
  assert.equal(publishRelease(f.root,env(f.sha),f.run).reusedRelease,true);
  assert.equal(f.calls.filter(a=>a[0]==='release'&&a[1]==='create').length,1);
});
test('a conflicting remote tag is preserved and no Release is created',t=>{
  const f=fixture(t);f.git('tag','v1.4.3');f.git('push','-q','origin','v1.4.3');
  writeFileSync(join(f.root,'next'),'next');f.git('add','next');f.git('commit','-qm','next');const next=f.git('rev-parse','HEAD');
  const run=(tool,args,cwd)=>tool==='gh'&&args[1].endsWith('/pulls')?JSON.stringify([{merged_at:'now',base:{ref:'master'},merge_commit_sha:next}]):f.run(tool,args,cwd);
  assert.throws(()=>publishRelease(f.root,env(next),run),/different commit/);
  assert.equal(f.git('ls-remote','--tags','origin','refs/tags/v1.4.3').split(/\s+/)[0],f.sha);
  assert.equal(f.calls.length,0);
});
test('direct master pushes and non-master runs cannot create tags',t=>{
  const f=fixture(t);assert.throws(()=>publishRelease(f.root,{...env(f.sha),GITHUB_REF:'refs/heads/feature'},f.run),/exact master/);
  const run=(tool,args,cwd)=>tool==='gh'?JSON.stringify([]):f.run(tool,args,cwd);
  assert.throws(()=>publishRelease(f.root,env(f.sha),run),/Merged PR/);
  assert.equal(f.git('ls-remote','--tags','origin'),'');
});
test('PR preflight rejects equal versions, malformed bases and package mismatch',t=>{
  const f=fixture(t);assert.throws(()=>readRelease(f.root,{baseSha:f.sha}),/increase/);
  assert.throws(()=>readRelease(f.root,{baseSha:'master; anything'}),/Invalid base/);
  writeFileSync(join(f.root,'mcp/ted-avc-manager/package.json'),'{}');assert.throws(()=>readRelease(f.root),/share a stable version/);
  assert.equal(compareVersions('1.10.0','1.9.9'),1);
});
test('authentication errors are not treated as missing releases',t=>{
  const f=fixture(t);
  const run=(tool,args,cwd)=>{
    if(tool==='gh'&&args[0]==='api'&&!args[1].endsWith('/pulls')){const e=new Error('auth');e.stderr=Buffer.from('HTTP 403: denied');throw e;}
    return f.run(tool,args,cwd);
  };
  assert.throws(()=>publishRelease(f.root,env(f.sha),run),/auth/);
  assert.equal(f.calls.filter(a=>a[0]==='release').length,0);
});

test('version-bound merge-only policy permits equal-base merge but creates neither tags nor Releases',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.github'));writeFileSync(join(f.root,'.github/release-policy.json'),JSON.stringify({schema:'avc.release-policy.v1',holdVersion:'1.4.3',reason:'User requested merge without publication'}));
 assert.equal(readRelease(f.root,{baseSha:f.sha}).publish,false);
 const result=publishRelease(f.root,env(f.sha),f.run);assert.equal(result.skipped,true);assert.equal(result.publish,false);assert.equal(f.git('ls-remote','--tags','origin'),'');assert.equal(f.calls.filter(a=>a[0]==='release').length,0);
 assert.equal(f.calls.length,1); // Existing merged-PR verification only.
});
test('old hold does not suppress a later version; malformed policy and downgrades fail closed',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.github'));const file=join(f.root,'.github/release-policy.json');
 writeFileSync(file,JSON.stringify({schema:'avc.release-policy.v1',holdVersion:'1.4.2',reason:'Earlier hold'}));assert.equal(readRelease(f.root).publish,undefined);assert.throws(()=>readRelease(f.root,{baseSha:f.sha}),/increase/);
 writeFileSync(file,JSON.stringify({schema:'avc.release-policy.v1',holdVersion:'1.4.4',reason:'Future hold'}));const run=()=>JSON.stringify({version:'1.4.4'});assert.throws(()=>readRelease(f.root,{baseSha:f.sha,run}),/increase/);
 writeFileSync(file,'{"schema":"unknown","holdVersion":"1.4.3","reason":"bad"}');assert.throws(()=>readRelease(f.root),/Invalid release policy/);
});
