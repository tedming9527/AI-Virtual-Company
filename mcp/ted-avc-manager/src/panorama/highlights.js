import { execFileSync } from 'node:child_process';
import { verifiedRating, releasedIdentity } from './ratings.js';
import { compare, parse } from '../core/semver.js';
const run=(root,args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000,maxBuffer:2*1024*1024}).trim();
const meta=(root,ref,path)=>{try{return JSON.parse(run(root,['show',`${ref}:${path}/meta.json`]));}catch{return null;}};
const dated=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const newer=(before,after)=>parse(before)&&parse(after)?compare(after,before)>0:dated(before)&&dated(after)&&after>before;
// Only immutable tags in this checkout's ancestry are sources of published changes.
export function releaseHighlights(root,{limit=5}={}) {
  try {
    const tags=run(root,['tag','--merged','HEAD','--sort=-version:refname']).split('\n').filter(t=>/^v\d+\.\d+\.\d+$/.test(t)).slice(0,limit+1);
    const changes=[],seen=new Set();
    for(let i=0;i<tags.length-1;i++) {
      const tag=tags[i],base=tags[i+1],commit=run(root,['rev-parse',`${tag}^{commit}`]);
      const paths=new Set(run(root,['diff','--name-only',base,tag,'--','packs']).split('\n').flatMap(path=>{const m=/^(packs\/(?:skill|knowledge|framework|role)\/[a-z0-9][a-z0-9-]*)\//.exec(path);return m?[m[1]]:[];}));
      for(const path of paths) {
        if(seen.has(path))continue;seen.add(path);
        const before=meta(root,base,path),after=meta(root,tag,path),pack=after||before;if(!pack)continue;
        changes.push({type:pack.type,name:pack.name,displayName:pack.displayName||pack.name,description:pack.description||null,
          previousVersion:before?.version??null,version:after?.version??null,releaseTag:tag,commit,
          kind:!before?'added':!after?'removed':before.version===after.version?'content-updated':newer(before.version,after.version)?'upgraded':'version-changed',
          evidence:'tracked package diff between release tags; not an installation or semantic-quality receipt'});
      }
    }
    return {status:tags.length>1?'available':'insufficient-history',releases:tags.slice(0,limit),changes};
  } catch {return {status:'unavailable',releases:[],changes:[]};}
}
export function qualitySummary(assets,scores={}) {
  const rows=assets.flatMap(asset=>{
    const identity=releasedIdentity(asset),record=scores[identity],score=verifiedRating(record,identity,asset.bundleSha256);
    if(!score)return [];
    const grade=record.evidenceType==='static'?'静态评估':score.provisional?'临时评估':score.quality>=4.5?'优秀':score.quality>=4?'良好':score.quality>=3?'合格':'待优化';
    const previous=verifiedRating(record.previous,identity,asset.bundleSha256);
    const trend=previous&&!previous.provisional&&Date.parse(previous.assessedAt)<Date.parse(score.assessedAt)?Math.round((score.quality-previous.quality)*100)/100:null;
    return [{...score,grade,trend,identity,type:asset.type,name:asset.name,displayName:asset.displayName||asset.name,href:asset.href}];
  }).sort((a,b)=>b.quality-a.quality||b.sampleSize-a.sampleSize||a.identity.localeCompare(b.identity));
  return {total:assets.length,rated:rows.length,unrated:assets.length-rows.length,excellent:rows.filter(r=>r.grade==='优秀').length,rows,
    rule:'优秀：≥4.5/5，至少20个可归因样本，版本与内容摘要匹配，且非临时评估；分数不等于已升级。'};
}
