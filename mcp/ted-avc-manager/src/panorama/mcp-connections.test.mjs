import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuredRemoteMcps, remoteMcpOverview, checkRemoteMcp, updateRemoteMcpQuality } from './mcp-connections.js';

const configured = [
  { name:'Remote', enabled:true, auth_status:'unknown', transport:{ type:'streamable_http', url:'https://mcp.example.test/api?secret=hidden' } },
  { name:'Local', enabled:true, transport:{ type:'stdio', command:'node' } },
  { name:'Loopback', enabled:true, transport:{ type:'streamable_http', url:'http://127.0.0.1:3333/mcp' } },
];
function fixture(t) { const root=mkdtempSync(join(tmpdir(),'avc-mcp-panorama-'));mkdirSync(join(root,'runtime','cache'),{recursive:true});t.after(()=>rmSync(root,{recursive:true,force:true}));return root; }

test('remote inventory distinguishes configured transport from connection and hides URL details',t=>{
  const root=fixture(t), result=remoteMcpOverview(root,{configured});
  assert.equal(result.entries.length,1);
  assert.equal(result.entries[0].origin,'https://mcp.example.test');
  assert.equal(result.entries[0].connection.status,'not-checked');
  assert.ok(!JSON.stringify(result).includes('secret=hidden'));
  assert.equal(configuredRemoteMcps(root,{configured}).entries.length,1);
});

test('explicit probe records protocol response separately from auth and HTTP-only responses',async t=>{
  const root=fixture(t);
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  const connected=await checkRemoteMcp(root,'Remote',{configured,request:async()=>json({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-06-18'}})});
  assert.equal(connected.status,'handshake-response');
  assert.equal(await checkRemoteMcp(root,'Remote',{configured,request:async()=>new Response('hello')} ).then(x=>x.status),'http-response');
  assert.equal(await checkRemoteMcp(root,'Remote',{configured,request:async()=>new Response('',{status:401})}).then(x=>x.status),'auth-required');
  assert.equal(remoteMcpOverview(root,{configured}).entries[0].connection.status,'auth-required');
  assert.ok(!readFileSync(join(root,'runtime/cache/mcp-connections.json'),'utf8').includes('secret=hidden'));
});

test('quality lookup records only verified public metadata and never invents unavailable signals',async t=>{
  const root=fixture(t), request=async url=>{
    if(url.includes('api.github.com/repos/demo/tool/security-advisories'))return new Response('not available',{status:404});
    if(url.includes('api.github.com/repos/demo/tool'))return new Response(JSON.stringify({full_name:'demo/tool',private:false,html_url:'https://github.com/demo/tool',stargazers_count:42,pushed_at:'2026-10-01T00:00:00Z'}));
    if(url.includes('api.scorecard.dev'))return new Response(JSON.stringify({score:7.5}));
    return new Response('missing',{status:404});
  };
  const result=await updateRemoteMcpQuality(root,'Remote','demo/tool',null,{configured,request,deep:true});
  assert.equal(result.scorecard,7.5);
  assert.equal(result.stars,42);
  assert.equal(result.advisories,undefined);
  assert.equal(remoteMcpOverview(root,{configured}).entries[0].quality.repository,'https://github.com/demo/tool');
});
