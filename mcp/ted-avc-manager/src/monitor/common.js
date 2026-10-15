import {existsSync,lstatSync,readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,parse,relative,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const TTL=86400000,MAX_RECORDS=10000,MAX_BYTES=16*1024*1024;
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function safe(file){let cursor=parse(resolve(file)).root;for(const part of relative(cursor,resolve(file)).split('/').filter(Boolean)){cursor=join(cursor,part);try{if(lstatSync(cursor).isSymbolicLink())throw Error('monitor-unsafe-path');}catch(e){if(e.code!=='ENOENT')throw e;}}return file;}
export function read(file,max=8192){safe(file);const stat=lstatSync(file);if(!stat.isFile()||stat.size>max)throw Error('monitor-invalid-file');return JSON.parse(readFileSync(file,'utf8'));}
export function atomic(file,value){safe(file);const temp=file+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(value),{flag:'wx',mode:0o600});renameSync(temp,file);}
export function directory(state,create=false){const dir=safe(join(state,'runtime','monitor'));const owner=join(dir,'owner.json');if(create){mkdirSync(dir,{recursive:true,mode:0o700});if(!existsSync(owner)){// Never adopt pre-existing unknown contents.
 if((entries(dir)).length)throw Error('monitor-directory-unowned');atomic(owner,{schema:'avc.monitor-owner.v1',state:hash(resolve(state))});}}
 const marker=read(owner);if(marker.schema!=='avc.monitor-owner.v1'||marker.state!==hash(resolve(state)))throw Error('monitor-directory-owner-mismatch');return dir;}
import {readdirSync} from 'node:fs';
const entries=dir=>readdirSync(dir);
export function instance(state){const dir=directory(state),value=read(join(dir,'instance.json'));if(value.schema!=='avc.monitor-instance.v1'||!Number.isInteger(value.port)||value.port<1||value.port>65535||!/^[a-f0-9]{64}$/.test(value.secret||'')||!/^\w[\w-]{10,80}$/.test(value.id||''))throw Error('monitor-invalid-instance');return {...value,dir};}
export const clean=(value,max=160)=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,'').slice(0,max):'';
export const KINDS=['discovered','recommended','summary','chunk','deduplicated','budget-blocked','read-attempted','read-completed','model-reported','candidate-registered','trial-offer','trial-decide','trial-start','trial-result','trial-cancel'];
// Whitelist only. No body, query, tool input, absolute path, user response or raw result.
export function normalize(value,now=Date.now()){
 if(!value||!['skill','knowledge','framework','role','material'].includes(value.asset?.type)||!KINDS.includes(value.kind)||!['candidate','formal'].includes(value.asset?.stage)||!value.asset.id||!value.asset.version||!/^[a-f0-9]{64}$/.test(value.asset.sha256||''))throw Error('monitor-invalid-event');
 const asset={id:clean(value.asset.id),name:clean(value.asset.name),type:clean(value.asset.type,40),version:clean(value.asset.version,64),sha256:value.asset.sha256,stage:value.asset.stage,status:clean(value.asset.status,40)};
 if(!asset.id||!asset.name||!asset.type)throw Error('monitor-invalid-asset');
 return {schema:'avc.monitor-record.v1',id:randomUUID(),recordedAt:now,observedAt:new Date(now).toISOString(),kind:value.kind,asset,sessionId:clean(value.sessionId,200),turnId:clean(value.turnId,200),agentId:clean(value.agentId,200),bytes:Number.isSafeInteger(value.bytes)&&value.bytes>=0?Math.min(value.bytes,1048576):null,evidence:'adapter-observed; not semantic adoption'};
}
