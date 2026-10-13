import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {buildPanoramaModel,renderPanorama,generatePanorama} from './generate.js';import {collectCandidates} from './candidates.js';
function fixture(t){fs.mkdirSync('runtime/cache',{recursive:true});const root=fs.mkdtempSync(path.resolve('runtime/cache/panorama-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'runtime'));fs.mkdirSync(path.join(root,'packs/skill/example'),{recursive:true});fs.writeFileSync(path.join(root,'bootstrap.json'),JSON.stringify({name:'demo',version:'1.0.0',presets:[]}));fs.writeFileSync(path.join(root,'packs/skill/example/meta.json'),JSON.stringify({type:'skill',name:'example',version:'1.0.0',rubric:['quality']}));fs.writeFileSync(path.join(root,'packs/skill/example/SKILL.md'),'# Example');return root;}
test('public collector never parses private storage/config/scores; local data stays outside public output',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'runtime/storage.json'),'INVALID_PRIVATE_CONFIG');fs.writeFileSync(path.join(root,'runtime/scores.json'),'PRIVATE_SECRET');fs.writeFileSync(path.join(root,'runtime/lockfile.json'),JSON.stringify({current:'9.9.9'}));
 const pub=buildPanoramaModel(root,{view:'public'});assert.equal(pub.version,'1.0.0');assert.ok(!JSON.stringify(pub).includes('PRIVATE'));assert.equal(pub.personal,undefined);generatePanorama(root,{view:'public'});
 const personal=path.join(root,'private/projects/demo');fs.mkdirSync(path.join(personal,'experience'),{recursive:true});fs.writeFileSync(path.join(personal,'experience/private-note.md'),'secret-body');fs.writeFileSync(path.join(root,'runtime/storage.json'),JSON.stringify({personal}));fs.writeFileSync(path.join(root,'runtime/scores.json'),'{}');
 const local=buildPanoramaModel(root,{view:'local',externalRoots:[]});assert.ok(local.personal.areas.some(a=>a.name==='experience'&&a.files[0].pathLabel.includes('private-note')));assert.equal(local.version,'9.9.9');
 assert.throws(()=>generatePanorama(root,{view:'local',outDir:path.join(root,'panorama')}),/公开/);const out=generatePanorama(root,{view:'local',externalRoots:[]});assert.ok(out.includes('/runtime/panorama/'));assert.ok(!fs.readFileSync(path.join(root,'panorama/index.html'),'utf8').includes('private-note'));
});
test('public release identity requires clean tag-matching catalog; preview cannot claim a released tag',t=>{
 const root=fixture(t),git=(...args)=>execFileSync('git',['-C',root,...args],{stdio:'ignore'});git('init');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('add','bootstrap.json','packs');git('commit','-m','fixture');git('tag','v1.0.0');assert.equal(buildPanoramaModel(root,{view:'public',catalogRef:'v1.0.0'}).catalog.source,'verified-release');
 fs.appendFileSync(path.join(root,'packs/skill/example/SKILL.md'),'changed');assert.throws(()=>buildPanoramaModel(root,{view:'public',catalogRef:'v1.0.0'}),/快照/);assert.equal(buildPanoramaModel(root,{view:'public'}).catalog.source,'working-copy');
});
test('candidate API collection pins base/head metadata, excludes unrelated PR and refreshes close',async()=>{
 let opened=true;const enc=version=>({content:Buffer.from(JSON.stringify({name:'example',version})).toString('base64')});const request=async route=>{if(route==='')return {private:false};if(route.startsWith('pulls?'))return opened?[{number:7,title:'<script>candidate</script>',base:{sha:'a'.repeat(40)},head:{sha:'b'.repeat(40)},updated_at:'2026-10-13T00:00:00Z'}]:[];if(route.includes('/files?'))return [{filename:'packs/skill/example/meta.json'}];return enc(route.includes('a'.repeat(40))?'1.0.0':'1.0.1')};
 const c=await collectCandidates('example/repo',{request});assert.equal(c.entries[0].changes[0].baseVersion,'1.0.0');assert.equal(c.entries[0].changes[0].proposedVersion,'1.0.1');const html=renderPanorama({view:'public',version:'1.0.0',engineVersion:'1.2.0',catalog:{source:'working-copy'},generatedAt:'now',general:[],errors:[],candidates:c});assert.ok(!html.includes('<script>candidate</script>'));assert.ok(html.includes('&lt;script&gt;candidate'));
 opened=false;assert.equal((await collectCandidates('example/repo',{request})).entries.length,0);await assert.rejects(collectCandidates('example/repo',{request:async()=>({private:true})}),/公开/);
});

test('public input refuses linked package metadata and knowledge catalogs before reading',t=>{
 const root=fixture(t), secret=path.join(root,'private-sentinel.json');fs.writeFileSync(secret,'PRIVATE_SENTINEL');
 const meta=path.join(root,'packs/skill/example/meta.json');fs.rmSync(meta);fs.symlinkSync(secret,meta);
 assert.throws(()=>buildPanoramaModel(root,{view:'public'}),/symlink/);
 fs.rmSync(meta);fs.writeFileSync(meta,JSON.stringify({name:'example',type:'skill',version:'1.0.0',rubric:['quality']}));
 fs.mkdirSync(path.join(root,'packs/knowledge'));fs.symlinkSync(secret,path.join(root,'packs/knowledge/catalog.json'));
 assert.throws(()=>buildPanoramaModel(root,{view:'public'}),/symlink/);
 assert.ok(!fs.existsSync(path.join(root,'panorama/index.html')));
});

test('external cached skill discovery is separate from native client listed and enabled states',t=>{
 const root=fixture(t), external=path.join(root,'cache/skills'),dir=path.join(external,'external-demo');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),'# External demo');
 fs.writeFileSync(path.join(root,'runtime/native-skill-index.json'),JSON.stringify({fetchedAt:'2026-10-13T00:00:00Z',entries:[{path:path.join(dir,'SKILL.md'),enabled:false}]}));
 const model=buildPanoramaModel(root,{view:'local',externalRoots:[external]}),skill=model.skills.find(s=>s.name==='external-demo');
 assert.equal(skill.management,'discovered-unregistered');assert.equal(skill.nativeClientListed,true);assert.equal(skill.nativeEnabled,false);
 const html=renderPanorama(model);assert.ok(html.includes('已列出 · 已禁用'));assert.ok(html.includes('本机外部 · 文件发现'));assert.ok(!html.includes('本机已安装'));
 fs.writeFileSync(path.join(root,'runtime/native-skill-index.json'),'INVALID_PRIVATE_NATIVE_STATE');assert.equal(buildPanoramaModel(root,{view:'public'}).skills,undefined);
});

test('purpose metadata and knowledge context reach public rendering as escaped searchable text',t=>{
 const root=fixture(t),metaFile=path.join(root,'packs/skill/example/meta.json');
 fs.writeFileSync(metaFile,JSON.stringify({...JSON.parse(fs.readFileSync(metaFile)),description:'验收时 <script>核对</script> 证据'}));
 fs.mkdirSync(path.join(root,'packs/knowledge'));
 fs.writeFileSync(path.join(root,'packs/knowledge/catalog.json'),JSON.stringify({entries:[{id:'demo',summary:'定位 <问题>',trigger:'接入 & 调试',detail:'packs/knowledge/demo.md',owner:'example',status:'active'}]}));
 const model=buildPanoramaModel(root,{view:'public'}),html=renderPanorama(model);
 assert.equal(model.general[0].descriptionSource,'meta');assert.equal(model.knowledgeEntries[0].trigger,'接入 & 调试');
 assert.ok(html.includes('验收时 &lt;script&gt;核对&lt;/script&gt; 证据'));assert.ok(!html.includes('<script>核对'));
 assert.ok(html.includes('定位 &lt;问题&gt;'));assert.ok(html.includes('适用：接入 &amp; 调试'));
});

test('legacy external skills expose declared purpose or missing marker, never body text in either view',t=>{
 const root=fixture(t),external=path.join(root,'cache/skills');
 for(const [name,body] of [['declared','---\ndescription: 接入时核对端口\n---\nPRIVATE_SENTINEL'],['missing','# Missing description\nPRIVATE_SENTINEL']]){
  const dir=path.join(external,name);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),body);
 }
 const model=buildPanoramaModel(root,{view:'local',externalRoots:[external]}),html=renderPanorama(model);
 assert.equal(model.skills.find(s=>s.name==='declared').description,'接入时核对端口');assert.equal(model.skills.find(s=>s.name==='missing').description,null);
 assert.ok(html.includes('用途待补充'));assert.ok(!html.includes('PRIVATE_SENTINEL'));
 const pub=renderPanorama(buildPanoramaModel(root,{view:'public'}));assert.ok(!pub.includes('接入时核对端口'));assert.ok(!pub.includes('PRIVATE_SENTINEL'));
});

test('candidate descriptions follow proposed head; deleted packs use base and missing head purpose stays missing',async()=>{
 const base='a'.repeat(40),head='b'.repeat(40);
 for(const [headMeta,expected] of [[{version:'1.0.1',description:'新用途'},'新用途'],[{version:'1.0.1'},null],[null,'旧用途']]){
  const request=async route=>{
   if(route==='')return {private:false};if(route.startsWith('pulls?'))return [{number:7,title:'candidate',base:{sha:base},head:{sha:head}}];
   if(route.includes('/files?'))return [{filename:'packs/skill/example/meta.json'}];
   const meta=route.includes(base)?{version:'1.0.0',description:'旧用途'}:headMeta;
   if(!meta){const error=new Error('missing');error.status=404;throw error;}
   return {content:Buffer.from(JSON.stringify(meta)).toString('base64')};
  };
  const result=await collectCandidates('example/repo',{request});assert.equal(result.entries[0].changes[0].description,expected);
 }
});

test('public templates and shared abilities render without reading private workflow state',t=>{
 const root=fixture(t);fs.mkdirSync(path.join(root,'runtime/workflows/private-run'),{recursive:true});fs.writeFileSync(path.join(root,'runtime/workflows/private-run/state.json'),'PRIVATE_INVALID');
 const publicModel=buildPanoramaModel(root,{view:'public'});assert.ok(publicModel.sharedCapabilities.length);assert.equal(publicModel.workflows,undefined);assert.equal(publicModel.skillCandidates,undefined);
 const html=renderPanorama(publicModel);assert.ok(html.includes('跨包公共能力'));assert.ok(!html.includes('PRIVATE_INVALID'));
});
