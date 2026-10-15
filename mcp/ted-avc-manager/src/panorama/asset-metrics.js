// Retained observations only. No inference of adoption from a read or task success.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, lstatSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stateRootFor} from '../core/client-state.js';
import {listAssets} from '../core/awareness.js';
import {personalProject} from '../core/local-assets.js';
import {assertNoLinks} from '../core/scan.js';

export function summarizeAssetObservations(assets, events, tasks, now=Date.now(), windows=[]) {
  const day=86400000;
  return assets.map(a=>{
    const loads=new Map(),reads=new Map(),reports=new Map();
    const add=(map,key,at)=>{const time=Date.parse(at);if(Number.isFinite(time)&&time<=now)map.set(key,Math.max(map.get(key)||0,time));};
    for(const t of tasks) for(const item of Array.isArray(t?.assets)?t.assets:[]) {
      if (!item || !item.bundleSha256) continue;
      if (item.file && !(a.load ? item.file===a.entry : item.file.startsWith(a.dir+sep))) continue;
      // A knowledge detail must match its own entry; bundle membership alone is insufficient.
      if(item.source!==a.source || item.type!==(a.load?.type||a.type) || item.name!==(a.load?.name||a.name) || (item.version!==a.version && !a.load) || ![a.bundleSha256,a.executionBundleSha256].includes(item.bundleSha256))continue;
      if(a.load && item.entry!==a.load.entry)continue;
      add(loads,`${t.sessionId}:${t.turnId}:${item.entry}`,item.loadedAt);
    }
    for(const e of events) {
      if(!e || !e.sha256 || (e.assetId && e.assetId!==a.id))continue;
      if(e.source!==a.source || e.type!==a.type || e.name!==a.name)continue;
      const entry=relative(a.dir,a.entry), file=a.files?.find(f=>f.relativePath===e.relativePath);
      const matched=e.kind==='model-reported'?e.sha256===a.sha256:e.sha256===(file?.sha256||a.entrySha256) && (!a.load || !e.relativePath || e.relativePath===entry);
      if(!matched)continue;
      const key=`${e.sessionId}:${e.turnId}:${e.relativePath||e.entry||entry}`;
      if(e.kind==='manager-delivered')add(loads,key,e.at);
      if(e.kind==='read-completed')add(reads,key,e.at);
      if(e.kind==='model-reported')add(reports,key,e.at);
    }
    const times=[...loads.values(),...reads.values()];
    const last=times.length?Math.max(...times):null;
    const history=windows.flatMap(w=>Object.values(w.assets||{}).filter(r=>r.asset?.source===a.source && r.asset?.type===a.type && r.asset?.id===a.name && r.asset?.version===a.version && [a.bundleSha256,a.executionBundleSha256].includes(r.asset?.bundleSha256)).map(r=>({from:w.from,through:w.through,delivered:r.delivered,readCompleted:r.readCompleted,adopted:r.adopted,sampleSize:r.sampleSize})));
    return {history,id:a.id,name:a.name,title:a.displayName,type:a.type,source:a.source,version:a.version,
      bundleSha256:a.bundleSha256,contentDigest:a.entrySha256 || a.sha256,href:pathToFileURL(a.entry).href,description:a.description,
      delivered:loads.size,readCompleted:reads.size,modelReported:reports.size,adopted:null,
      lastObserved:last===null?null:new Date(last).toISOString(),
      daysSinceObserved:last===null?null:Math.floor((now-last)/day),
      recent30:[...loads.values(),...reads.values()].filter(t=>t>=now-30*day).length,
      evidence:'retained-observations; counts deduplicated per turn and entry; not lifetime usage or semantic adoption'};
  });
}
export function readAssetMetrics(root,opts={}) {
  const warnings=[],state=stateRootFor(root),events=[],tasks=[];
  let assets=[];
  try {const found=listAssets(root,{},opts);assets=found.assets.map(a=>({...a,executionBundleSha256:a.files?createHash('sha256').update(JSON.stringify(a.files.map(f=>({path:f.relativePath,bytes:f.bytes,sha256:f.sha256})))).digest('hex'):null}));warnings.push(...found.warnings);}catch(e){warnings.push(`资料目录：${e.message}`);}
  const eventsFile=join(state,'runtime/asset-events.jsonl');
  try {assertNoLinks(state,eventsFile);if(existsSync(eventsFile))for(const line of readFileSync(eventsFile,'utf8').split('\n').filter(Boolean)){try{events.push(JSON.parse(line));}catch{warnings.push('忽略一条损坏的资产事件，统计覆盖不完整');}}}catch(e){warnings.push(`资产事件：${e.message}`);}
  const dir=join(state,'runtime/execution/tasks');
  try {assertNoLinks(state,dir);if(existsSync(dir))for(const name of readdirSync(dir).filter(n=>n.endsWith('.json'))){try{const file=assertNoLinks(state,join(dir,name));if(lstatSync(file).isFile())tasks.push(JSON.parse(readFileSync(file,'utf8')));}catch{warnings.push(`任务记录无法读取：${name}`);}}}catch(e){warnings.push(`任务记录：${e.message}`);}
  const windows=[],seen=new Set();
  try {
    const personal=personalProject(root).directory,dir=join(personal,'experience/.avc');
    assertNoLinks(personal,dir);
    if(existsSync(dir))for(const name of readdirSync(dir).filter(n=>/^preparation-[0-9a-f-]+\.json$/.test(n))) {
      try {
        const file=assertNoLinks(personal,join(dir,name)),p=JSON.parse(readFileSync(file,'utf8'));
        if(p.schema!=='avc.weekly-preparation.v1')continue;
        for(const w of p.windows||[]) {
          const key=w.from+':'+w.through;
          if(w.schema!=='avc.asset-usage-rollup.v1'||seen.has(key))continue;
          seen.add(key);windows.push(w);
        }
      }catch(e){warnings.push(`历史统计：${name} 无法读取`);}
    }
  }catch(e){warnings.push(`历史统计：${e.message}`);}
  return {rows:summarizeAssetObservations(assets,events,tasks,opts.now,windows),warnings,
    coverage:'本机保留的事件、任务与历史周度窗口；历史窗口单列，避免与原始记录重复累加。不含未采集或没有汇总的已清理记录。无记录不能证明从未使用。',
    generatedAt:new Date(opts.now||Date.now()).toISOString()};
}
