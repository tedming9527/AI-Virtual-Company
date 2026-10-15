import {emitMonitor,inventoryIdentity,candidateIdentity} from '../monitor/emit.js';
import {existsSync,lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {listAssets} from './awareness.js';
import {selectAssets} from './asset-selection.js';
import {catalogRootFor,stateRootFor} from './client-state.js';
import {bytePrefix,deliverResponse} from './context-budget.js';
import {listTrialCandidates} from '../governance/candidate-trials.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const size=value=>Buffer.byteLength(JSON.stringify(value));
function documents(root,known){
 const assets=[],coverage={scope:'inventory entry bodies and configured central packs/docs/rules and root entries',indexed:0,unsupported:0,failed:0,deferred:0,readBytes:0},entries=new Map(),scanned=new Set();let visited=0;
 for(const asset of known){const group=entries.get(asset.entry)||[];group.push(asset);entries.set(asset.entry,group);}
 const walk=(file,depth=0)=>{
  if(++visited>4096||depth>12){coverage.deferred++;return;}
  try{
   const stat=lstatSync(file);if(stat.isSymbolicLink()){coverage.unsupported++;return;}
   if(stat.isDirectory()){for(const name of readdirSync(file).sort())if(!['.git','node_modules','runtime'].includes(name))walk(join(file,name),depth+1);return;}
   if(!stat.isFile()||!file.endsWith('.md'))return;
   if(scanned.has(file))return;scanned.add(file);
   if(stat.size>262144||coverage.readBytes+stat.size>8388608){coverage.deferred++;return;}
   const body=readFileSync(file,'utf8'),rel=relative(root,file);coverage.readBytes+=Buffer.byteLength(body);coverage.indexed++;
   const heading=(body.match(/^#{1,6}\s+(.+)$/m)?.[1]||rel),description=body.split('\n').find(s=>s.trim()&&!/^#|^---|^[\w-]+:/.test(s))||heading;
   if(entries.has(file)){
    const digest=hash(body);
    for(const asset of entries.get(file)){
     if(asset.entrySha256!==digest){coverage.failed++;continue;}
     // Query-only projection: preserve asset identity and do not persist or deliver the body.
     asset.searchText=body;asset.heading=heading;
    }
    return;
   }
   assets.push({id:'general:document:'+rel,source:'general',type:'knowledge',name:rel,displayName:heading,description:bytePrefix(description,512),heading,searchText:body,entry:file,entrySha256:hash(body),sha256:hash(body),status:'unknown',management:'central-repository',load:{documentId:'general:document:'+rel,sourceSha256:hash(body)},previewOnly:true});
  }catch{coverage.failed++;}
 };
 for(const dir of ['packs','docs','rules'])if(existsSync(join(root,dir)))walk(join(root,dir));
 for(const name of ['AGENTS.md','README.md'])if(existsSync(join(root,name)))walk(join(root,name));
 // Local/custom/native entries have the same discovery contract as central entries.
 for(const entry of entries.keys())if(!scanned.has(entry))walk(entry);
 return {assets,coverage};
}
function card(a){
 const value={id:a.id,name:bytePrefix(String(a.name??a.id),160),type:a.type,source:a.source,version:a.version??null,description:bytePrefix(String(a.description||''),320),sourceSha256:a.entrySha256||a.sha256,
  eligibility:{status:a.status||'unknown',management:a.management,activation:'not-granted-by-search'},
  load:a.load||{source:a.source,type:a.type,name:a.name,entry:a.type==='role'?'PROFILE.md':'SKILL.md'},
  ...(a.selection?{selection:{...a.selection,relevance:Math.round(a.selection.relevance*100)/100},matches:a.matches?.slice(0,4)}:{})};
 if(a.bilingualSummary)value.bilingualSummary={summaries:a.bilingualSummary.summaries,pairComplete:a.bilingualSummary.pairComplete,semanticReview:a.bilingualSummary.semanticReview,previewOnly:true};
 return value;
}
export function discoverAssets(root,input={},options={}){
 try{
  const query=input.query??'';if(typeof query!=='string'||Buffer.byteLength(query)>2048)throw Error('query must be at most 2048 UTF-8 bytes');
  const maxBytes=input.maxBytes??4096,maxItems=input.maxItems??8;
  if(!Number.isInteger(maxBytes)||maxBytes<1024||maxBytes>8192||!Number.isInteger(maxItems)||maxItems<1||maxItems>32)throw Error('Invalid discovery page limits');
  const inventory=listAssets(root,{},options),extra=documents(catalogRootFor(root),inventory.assets);
  const monitorCandidates=new Map();let trials=[];let candidateCoverage='not-selected';
  if(!input.kind&&!input.type)try{
   const found=listTrialCandidates(root);candidateCoverage=found.warnings.length?'partial':'indexed';
   trials=found.candidates.map(record=>{const c=record.candidate;monitorCandidates.set('candidate:'+c.id,candidateIdentity(record));return {id:'candidate:'+c.id,name:c.title,type:c.type,source:'local-candidate',version:c.version,description:c.hypothesis,keywords:c.triggers,status:c.status,management:'pending-review',sha256:record.sha256,load:{tool:'candidate_trial_status',candidateId:c.id},previewOnly:true};});
  }catch{candidateCoverage='unavailable';}
  const candidates=[...inventory.assets,...extra.assets,...trials].filter(a=>(!input.assetId||a.id===input.assetId)&&(!input.lookupId||hash(a.id)===input.lookupId)&&(!input.type||a.type===input.type)&&(!input.source||a.source===input.source)&&(input.kind!=='skills'||a.type==='skill')&&(input.kind!=='packs'||!a.id.startsWith('general:knowledge-entry:')&&!a.id.startsWith('general:document:')));
  const selected=selectAssets(root,candidates,query,options),generation=hash(JSON.stringify(selected.assets.map(a=>[a.id,a.sha256,a.version,a.summaryZh,a.summaryEn,selected.demand[a.id]?.at]))),queryDigest=hash(JSON.stringify([query,input.type,input.source,input.kind,input.assetId,input.lookupId]));
  let start=0;
  if(input.cursor){
   if(typeof input.cursor!=='string'||input.cursor.length>1024)throw Error('Invalid discovery cursor');
   const cursor=JSON.parse(Buffer.from(input.cursor,'base64url').toString());
   if(cursor.generation!==generation||cursor.queryDigest!==queryDigest)throw Error('Discovery sources changed; restart query');
   start=selected.assets.findIndex(a=>hash(a.id)===cursor.after)+1;if(!start)throw Error('Invalid discovery position');
  }
  const result={schema:'avc.discovery-page.v1',status:'complete',taskContinues:true,assets:[],coverage:{...extra.coverage,candidates:candidateCoverage,knownAssets:candidates.length,matched:selected.assets.length,...selected.coverage,warnings:inventory.warnings.length},nextCursor:null,evidence:'local lexical relevance and source-bound previews; not applicability, adoption or authorization'};
  let index=start;
  for(;index<selected.assets.length&&result.assets.length<maxItems;index++){
   const next=card(selected.assets[index]);
   const cursor=Buffer.from(JSON.stringify({generation,queryDigest,after:hash(selected.assets[index].id)})).toString('base64url');
   const projected={...result,assets:[...result.assets,next],nextCursor:index+1<selected.assets.length?cursor:null};
   if(size(projected)+256>maxBytes){if(!result.assets.length){
    next.bilingualSummary=undefined;next.matches=undefined;next.description=bytePrefix(next.description,120);
    if(size({...projected,assets:[next]})+256<=maxBytes){result.assets.push(next);index++;}
    else{
     const marker={lookupId:hash(selected.assets[index].id),name:bytePrefix(next.name,80),source:next.source,type:next.type,status:'deferred',reason:'item-exceeds-page-budget',retryMaxBytes:8192};
     if(size({...projected,assets:[marker]})+256<=maxBytes){result.assets.push(marker);index++;}
    }
   }break;}
   result.assets.push(next);
  }
  if(index<selected.assets.length){result.status='partial';result.nextCursor=Buffer.from(JSON.stringify({generation,queryDigest,after:index>start?hash(selected.assets[index-1].id):null})).toString('base64url');if(index===start){result.status='page-too-small';result.nextCursor=null;result.nextStep='Increase maxBytes or narrow the query';}}
  if(options.collection&&options.collection!=='assets'){result[options.collection]=result.assets;delete result.assets;}
  const response=deliverResponse(options.stateRoot||stateRootFor(root),input,result,{maxBytes});
  for(const item of response.assets||response.skills||response.packs||[]){const origin=selected.assets.find(a=>a.id===item.id);if(!origin)continue;emitMonitor(root,input,{kind:query?'recommended':'discovered',asset:monitorCandidates.get(item.id)||inventoryIdentity(root,origin)},{stateRoot:options.stateRoot||stateRootFor(root)});}
  return response;
 }catch(error){return {status:'unavailable',reason:bytePrefix(error.message,160),taskContinues:true,contextDelivery:{status:'unverified',accounted:false,controlOnly:true}};}
}
