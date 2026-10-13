import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSourceQuality, readSourceQuality, validateSourceQuality } from './source-quality.js';
import { scanPacks } from '../core/scan.js';
import { buildPanoramaModel, renderPanorama } from './generate.js';

function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'avc-origin-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'packs','skill','demo'),{recursive:true});mkdirSync(join(root,'runtime'));
  writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'demo',version:'1.0.0',presets:[]}));
  writeFileSync(join(root,'packs','skill','demo','SKILL.md'),'# Demo');
  const meta={type:'skill',name:'demo',version:'1.0.0',rubric:['quality'],description:'演示技能',origin:{url:'https://github.com/demo/tool',revision:'abc123',repository:'demo/tool',npm:'demo-tool'}};
  writeFileSync(join(root,'packs','skill','demo','meta.json'),JSON.stringify(meta));
  return {root,meta};
}

test('release snapshot pins external URL, revision, version and public evidence',async t=>{
  const {root,meta}=fixture(t);
  const request=async url=>{
    if(url.includes('security-advisories'))return new Response('missing',{status:404});
    if(url.includes('api.github.com/repos/demo/tool'))return new Response(JSON.stringify({full_name:'demo/tool',private:false,html_url:'https://github.com/demo/tool',stargazers_count:35,pushed_at:'2026-10-01T00:00:00Z'}));
    if(url.includes('api.scorecard.dev'))return new Response(JSON.stringify({score:8.1}));
    if(url.includes('api.npmjs.org/downloads'))return new Response(JSON.stringify({package:'demo-tool',downloads:1200}));
    if(url.includes('registry.npmjs.org'))return new Response(JSON.stringify({name:'demo-tool',version:'2.0.0'}));
    return new Response('missing',{status:404});
  };
  const snapshot=await buildSourceQuality(root,{request,deep:true});
  assert.equal(snapshot.entries['pack:skill/demo@1.0.0'].evidence.find(e=>e.kind==='scorecard').value,8.1);
  assert.equal(snapshot.entries['pack:skill/demo@1.0.0'].evidence.find(e=>e.kind==='stars').value,35);
  assert.equal(snapshot.entries['pack:skill/demo@1.0.0'].evidence.find(e=>e.kind==='npmWeeklyDownloads').value,1200);
  assert.equal(validateSourceQuality(root).valid,true);
  const pub=renderPanorama(buildPanoramaModel(root,{view:'public'}));
  const local=renderPanorama(buildPanoramaModel(root,{view:'local',externalRoots:[],configured:[]}));
  for(const html of [pub,local]){assert.ok(html.includes('第三方来源地址'));assert.ok(html.includes('https://github.com/demo/tool'));assert.ok(html.includes('8.1 / 10'));assert.ok(html.includes('GitHub stars：35'));assert.ok(html.includes('npm 近一周下载：1200'));assert.ok(html.includes('查看网络指标参考阶梯'));}
  meta.origin.revision='different';writeFileSync(join(root,'packs','skill','demo','meta.json'),JSON.stringify(meta));
  assert.equal(validateSourceQuality(root).valid,false);
  assert.deepEqual(readSourceQuality(root,scanPacks(root).packs,'1.0.0'),{});
});

test('default release collection uses fast raw metrics without deep security queries',async t=>{
  const {root}=fixture(t), requested=[];
  const request=async url=>{
    requested.push(url);
    if(url.includes('api.github.com/repos/demo/tool'))return new Response(JSON.stringify({full_name:'demo/tool',private:false,html_url:'https://github.com/demo/tool',stargazers_count:12}));
    if(url.includes('api.npmjs.org/downloads'))return new Response(JSON.stringify({package:'demo-tool',downloads:75}));
    if(url.includes('registry.npmjs.org'))return new Response(JSON.stringify({name:'demo-tool',version:'1.0.0'}));
    return new Response('',{status:404});
  };
  const snapshot=await buildSourceQuality(root,{request,dryRun:true});
  assert.deepEqual(snapshot.entries['pack:skill/demo@1.0.0'].evidence.filter(e=>['stars','npmWeeklyDownloads'].includes(e.kind)).map(e=>e.value),[12,75]);
  assert.ok(!requested.some(url=>url.includes('scorecard')||url.includes('security-advisories')));
});
