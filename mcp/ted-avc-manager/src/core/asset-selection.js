import {existsSync,lstatSync,readFileSync} from 'node:fs';
import {join,relative,sep,resolve} from 'node:path';
import {stateRootFor} from './client-state.js';
import {bilingualSearchProjection} from './summary-language.js';
import {searchAssets} from './asset-search.js';
// Exposure and delivery never become evidence of adoption or quality.
function demand(root,assets,options){
 try{
  const state=resolve(options.stateRoot||stateRootFor(root)),file=join(state,'runtime/asset-events.jsonl');
  let path=state;for(const part of relative(state,file).split(sep)){path=join(path,part);if(existsSync(path)&&lstatSync(path).isSymbolicLink())throw Error('Unsafe demand source');}
  if(!existsSync(file))return {values:{},status:'empty'};
  if(lstatSync(file).size>4194304)return {values:{},status:'read-budget-exhausted'};
  const known=new Map(assets.map(a=>[a.id,a])),seen=new Set(),values={};
  for(const line of readFileSync(file,'utf8').split('\n'))if(line){
   const e=JSON.parse(line),a=known.get(e.assetId);
   if(!a||e.kind!=='model-reported'||e.sha256!==a.sha256||!e.logicalTaskId||!Number.isFinite(Date.parse(e.at)))continue;
   const key=JSON.stringify([e.logicalTaskId,e.assetId,e.sha256]);if(seen.has(key))continue;seen.add(key);
   if(!values[a.id]||e.at>values[a.id].at)values[a.id]={at:e.at,strength:0.25,evidence:'declared-adoption; not verified application'};
  }
  return {values,status:'bounded-declarations-only'};
 }catch{return {values:{},status:'unavailable'};}
}
export function selectAssets(root,assets,query,options={}){
 const bilingual=bilingualSearchProjection(root,assets,options),recent=demand(root,assets,options);
 return {assets:searchAssets(bilingual.assets,query,{demand:recent.values,now:options.now}),coverage:{bilingual:bilingual.coverage,recency:recent.status},demand:recent.values};
}
