import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
test('stdio handshake serves management tools and malformed resource URI does not terminate connection',async t=>{
 mkdirSync('runtime/cache',{recursive:true});const root=mkdtempSync(resolve('runtime/cache/server-'));mkdirSync(join(root,'runtime'));mkdirSync(join(root,'packs'));writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'probe',version:'1.2.0'}));
 const p=spawn(process.execPath,[new URL('../cli.js',import.meta.url).pathname,'server'],{cwd:root,stdio:['pipe','pipe','pipe']});t.after(()=>{p.kill();rmSync(root,{recursive:true,force:true});});
 let seq=0;const pending=new Map();createInterface({input:p.stdout}).on('line',line=>{const msg=JSON.parse(line);pending.get(msg.id)?.(msg);});
 const rpc=(method,params={})=>new Promise((res,rej)=>{const id=++seq,timer=setTimeout(()=>rej(new Error('MCP response timeout')),5000);pending.set(id,msg=>{clearTimeout(timer);pending.delete(id);res(msg);});p.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 const hello=await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'probe',version:'1'}});assert.equal(hello.result.serverInfo.name,'ted-avc-manager');
 p.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const tools=(await rpc('tools/list')).result.tools;assert.ok(tools.some(t=>t.name==='task_begin'));assert.ok(tools.some(t=>t.name==='find_skill'));
 assert.equal((await rpc('resources/read',{uri:'tedavc://asset/%INVALID'})).error.code,-32602);
 assert.ok((await rpc('resources/list')).result.resources);
});
