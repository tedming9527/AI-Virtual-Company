// No background reader, catalog scan or model call. Missing/offline monitor is a no-op.
import {request} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {stateRootFor,catalogRootFor} from '../core/client-state.js';
import {instance,normalize,hash,read,safe} from './common.js';
export function monitorActive(root){try{return instance(stateRootFor(root)).captureUntil>Date.now();}catch{return false;}}
const releaseCache=new Map();
// Source checkout status alone is not publication. Cache only release digests, never document bodies.
function published(root,rel,digest){try{
 const catalog=catalogRootFor(root),manifestFile=join(catalog,'.distribution.json');
 if(existsSync(manifestFile)){const manifest=read(manifestFile,8388608);return manifest.schema==='avc.distribution.v1'&&manifest.owner==='central'&&manifest.files?.[rel]===digest;}
 const version=read(join(catalog,'bootstrap.json')).version;if(!/^\d+\.\d+\.\d+$/.test(version))return false;
 const key=catalog+':'+version+':'+rel;let entry=releaseCache.get(key);
 if(!entry||entry.until<Date.now()){const bytes=execFileSync('git',['-C',catalog,'show','v'+version+':'+rel],{timeout:500,maxBuffer:2097152,stdio:['ignore','pipe','ignore']});entry={sha256:hash(bytes),until:Date.now()+5000};if(releaseCache.size>256)releaseCache.clear();releaseCache.set(key,entry);}
 return entry.sha256===digest;
 }catch{return false;}}
function centralIdentity(root,file,digest){try{
 const catalog=catalogRootFor(root),rel=relative(catalog,safe(file));if(!/^packs\/(skill|knowledge|framework|role)\/[a-z0-9-]+\//.test(rel)||rel.split('/').includes('..'))return null;
 const metaRel=rel.split('/').slice(0,3).join('/')+'/meta.json',metaFile=safe(join(catalog,metaRel)),meta=read(metaFile,32768);
 if(!published(root,rel,digest)||!published(root,metaRel,hash(readFileSync(metaFile))))return null;
 const catalogFile=safe(join(catalog,'packs/knowledge/catalog.json'));let matches=[];
 if(existsSync(catalogFile)){const data=read(catalogFile,2097152);if(!published(root,'packs/knowledge/catalog.json',hash(readFileSync(catalogFile))))return null;matches=(data.entries||[]).filter(e=>e.detail===rel&&e.sha256===digest);}
 // Several catalog entries can reference one physical document. Record its delivery once, not once per entry.
 if(matches.length&&matches.every(e=>['candidate','stale','superseded'].includes(e.status)))return {id:hash('general:'+rel),name:meta.displayName||meta.name,type:'knowledge',version:meta.version,sha256:digest,stage:'candidate',status:matches.every(e=>e.status==='candidate')?'candidate':'catalog-history'};
 if(!['stable','active'].includes(meta.status))return null;
 return {id:hash('general:'+rel),name:meta.displayName||meta.name,type:meta.type,version:meta.version,sha256:digest,stage:'formal',status:meta.status};
 }catch{return null;}}
export function inventoryIdentity(root,asset){
 if(!monitorActive(root)||asset.error||asset.metadataValid===false||asset.bundleIntegrity==='unverified')return null;
 if(asset.source==='general'&&asset.management==='central-managed')return centralIdentity(root,asset.entry,asset.entrySha256);
 if(asset.management!=='local-managed'||!asset.version||!asset.entrySha256)return null;
 return {id:hash(asset.id),name:asset.displayName||asset.name,type:asset.type,version:asset.version,sha256:asset.entrySha256,stage:'formal',status:asset.status};
}
export function candidateIdentity(record){const c=record.candidate;return {id:'candidate:'+c.id,name:c.title,type:c.type,version:c.version,sha256:record.sha256,stage:'candidate',status:c.status};}
export function loaderIdentity(root,asset,meta,registered=false){
 if(!monitorActive(root))return null;
 if(asset.source==='general')return centralIdentity(root,join(catalogRootFor(root),'packs',asset.type,asset.name,asset.entry),asset.sha256);
 if(!registered)return null;
 return {id:hash([asset.source,asset.type,asset.name,asset.entry].join(':')),name:meta.displayName||asset.name,type:asset.type,version:asset.version,sha256:asset.sha256,stage:'formal',status:meta.status};
}
export function emitMonitor(root,input,value,options={}){
 try{
  if(!value.asset)return {status:'excluded'};
  const state=options.stateRoot||stateRootFor(root),current=instance(state);
  if(!current.captureUntil||current.captureUntil<Date.now())return {status:'inactive'};
  const event=normalize({...input,...value});delete event.schema;delete event.id;delete event.recordedAt;delete event.observedAt;
  const body=JSON.stringify(event);if(Buffer.byteLength(body)>4096)return {status:'excluded'};
  const req=request({host:'127.0.0.1',port:current.port,path:'/internal/event',method:'POST',headers:{'X-Ted-Control':current.secret,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>res.resume());
  const timer=setTimeout(()=>req.destroy(),100);timer.unref();req.on('error',()=>{});req.on('close',()=>clearTimeout(timer));req.end(body);
  return {status:'queued',evidence:'best effort; not receipt'};
 }catch{return {status:'unavailable',taskContinues:true};}
}
