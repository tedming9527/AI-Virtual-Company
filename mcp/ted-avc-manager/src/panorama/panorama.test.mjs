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
