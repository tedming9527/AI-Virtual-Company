// Read only host counters for an explicitly linked native task. Never copy chat
// messages, infer a tariff, or call a shared observation an exclusive trial cost.
import {existsSync,lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const FIELDS=['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const unknown=reason=>({schema:'avc.host-usage-window.v1',status:'unknown',reason,attributedTokens:null,actualMoney:null});
const reasonOf=error=>error.code?'Usage evidence unavailable: '+error.code:error instanceof SyntaxError?'Malformed usage metadata':error.message;
function safe(base,file){
 base=resolve(base);file=resolve(file);
 if(file!==base&&!file.startsWith(base+sep))throw Error('Usage source escaped client');
 let cursor=base;
 if(lstatSync(cursor).isSymbolicLink())throw Error('Usage source symlink');
 for(const part of relative(base,file).split(sep).filter(Boolean)){cursor=join(cursor,part);if(lstatSync(cursor).isSymbolicLink())throw Error('Usage source symlink');}
 return file;
}
function counters(value){
 if(!value||typeof value!=='object')throw Error('Host counters missing');
 const result={};
 for(const key of FIELDS){
  const n=value[key];
  if(n===undefined&&!['input_tokens','output_tokens','total_tokens'].includes(key)){result[key]=null;continue;}
  if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid host counter');result[key]=n;
 }
 if(result.total_tokens!==result.input_tokens+result.output_tokens || result.cached_input_tokens>result.input_tokens || result.cache_write_input_tokens>result.input_tokens || result.reasoning_output_tokens>result.output_tokens)throw Error('Inconsistent host counters');
 return result;
}
function delta(current,previous){
 const result={};
 for(const key of FIELDS){
  result[key]=current[key]===null||previous[key]===null?null:current[key]-previous[key];
  if(result[key]!==null&&result[key]<0)throw Error('Host counter reset or regression');
 }
 return counters(Object.fromEntries(Object.entries(result).filter(([,v])=>v!==null)));
}
function rollout(home,id){
 const found=[];let visited=0;
 const walk=(directory,depth)=>{
  if(!existsSync(directory))return;safe(home,directory);
  for(const entry of readdirSync(directory,{withFileTypes:true})){
   if(++visited>20000)throw Error('Usage inventory exceeds bounded scan');
   const file=join(directory,entry.name);
   if(entry.isSymbolicLink()){
    if(entry.name.endsWith(id+'.jsonl'))throw Error('Usage source symlink');
    continue;
   }
   if(entry.isDirectory()&&depth<3)walk(file,depth+1);
   else if(entry.isFile()&&entry.name.endsWith(id+'.jsonl'))found.push(safe(home,file));
  }
 };
 walk(join(home,'sessions'),0);walk(join(home,'archived_sessions'),0);
 if(found.length!==1)throw Error(found.length?'Ambiguous native usage source':'Native usage source unavailable');
 const stat=lstatSync(found[0]);if(stat.size>32*1024*1024)throw Error('Usage source exceeds bounded read');
 return found[0];
}
export function collectUsageWindow({home=process.env.CODEX_HOME||join(homedir(),'.codex'),sessionId,turnIds,start,end}){
 try{
  if(!UUID.test(sessionId)||!Array.isArray(turnIds)||!turnIds.length||turnIds.some(id=>!UUID.test(id)))throw Error('Explicit native usage binding required');
  const from=Date.parse(start),to=Date.parse(end);if(!Number.isFinite(from)||!Number.isFinite(to)||from>to)throw Error('Invalid usage window');
  const file=rollout(home,sessionId),lines=readFileSync(file,'utf8').split('\n');
  let session,turn,model,previous,lastTime=-Infinity;const samples=[];
  for(let line=0;line<lines.length;line++){
   const raw=lines[line];
   if(!/"(?:session_meta|turn_context|token_count)"/.test(raw))continue;
   let row;try{row=JSON.parse(raw);}catch{if(line===lines.length-1)continue;throw Error('Malformed native usage record');}
   const p=row.payload||{};
   if(row.type==='session_meta'){if(session&&session!==p.id)throw Error('Native usage session changed');session=p.id;continue;}
   if(row.type==='turn_context'){turn=p.turn_id;model=typeof p.model==='string'?p.model.slice(0,200):null;continue;}
   if(row.type!=='event_msg'||p.type!=='token_count'||!p.info)continue;
   const at=Date.parse(row.timestamp);if(!Number.isFinite(at)||at<lastTime)throw Error('Native usage timestamp regression');lastTime=at;
   const total=counters(p.info.total_token_usage),same=previous&&FIELDS.every(k=>total[k]===previous[k]);
   const selected=turnIds.includes(turn)&&at>=from&&at<=to;
   let usage;
   try{
    usage=same?null:previous?delta(total,previous):counters(p.info.last_token_usage);
    if(usage&&FIELDS.some(k=>usage[k]!==null&&total[k]!==null&&usage[k]>total[k]))throw Error('Last usage exceeds host cumulative counter');
   }catch(error){if(selected)throw error;}
   previous=total;
   if(selected&&usage){
    const record={line:line+1,at:row.timestamp,turnId:turn,reportedModel:model,counters:usage};
    samples.push({...record,sha256:hash(record)});
   }
  }
  if(session!==sessionId)throw Error('Native usage session identity mismatch');
  if(!samples.length)return unknown('No host token events in the explicitly linked trial window');
  const totals={};for(const key of FIELDS){totals[key]=samples.some(s=>s.counters[key]===null)?null:samples.reduce((sum,s)=>sum+s.counters[key],0);if(totals[key]!==null&&!Number.isSafeInteger(totals[key]))throw Error('Usage total exceeds safe integer');}
  const receipt=s=>({line:s.line,at:s.at,sha256:s.sha256});
  return {schema:'avc.host-usage-window.v1',status:'observed',source:'codex-native-token-count',scope:'response-events-in-linked-trial-window',coverage:'recorded-events-only; boundary requests and other work may overlap',sessionId,turnIds,start,end,totals,
   eventCount:samples.length,reportedModels:[...new Set(samples.map(s=>s.reportedModel))],sourceReceipts:{first:receipt(samples[0]),last:receipt(samples.at(-1)),sha256:hash(samples)},
   attributedTokens:null,actualMoney:null,
   limits:'Host-reported counters; may include shared work and requests crossing trial boundaries. Cached input is part of input; reasoning is part of output. Not exclusive candidate cost, marginal overhead or an invoice.'};
 }catch(error){return unknown(reasonOf(error));}
}
export function collectTrialUsage(root,trial){
 try{
  const home=process.env.CODEX_HOME||join(homedir(),'.codex');
  let state=root;
  const deployment=join(home,'ted-avc-manager/deployment.json');
  if(existsSync(deployment)){
   safe(home,deployment);const config=JSON.parse(readFileSync(deployment));
   const project=config.projects?.find(p=>resolve(p.root)===resolve(root));
   if(project){state=project.stateRoot||root;if(project.stateRoot)safe(home,state);}
  }
  const bindings=[];
  for(const directory of [join(state,'runtime/execution/tasks'),join(state,'workspace/history/tasks')]){
   if(!existsSync(directory))continue;
   const names=readdirSync(directory);if(names.length>2000)throw Error('Native task usage inventory exceeds bounds');
   for(const name of names.filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){
    const file=safe(state,join(directory,name));if(lstatSync(file).size>2*1024*1024)throw Error('Native task exceeds usage bound');
    const task=JSON.parse(readFileSync(file));
    if(task.schema!=='avc.execution-task.v1'||name!==task.taskId+'.json'||(task.contract?.candidateTaskKey||task.taskId)!==trial.taskKey)continue;
    const sessionId=task.agentId||task.sessionId;
    if(UUID.test(sessionId)&&UUID.test(task.turnId)&&!bindings.some(b=>b.sessionId===sessionId&&b.turnId===task.turnId))bindings.push({sessionId,turnId:task.turnId});
   }
  }
  if(!bindings.length)return unknown('No native task contract explicitly links this candidate taskKey');
  if(new Set(bindings.map(b=>b.sessionId)).size!==1)return unknown('Multiple native sessions linked; combined attribution requires explicit review');
  return collectUsageWindow({home,sessionId:bindings[0].sessionId,turnIds:bindings.map(b=>b.turnId),start:trial.startedAt,end:trial.completedAt});
 }catch(error){return unknown(reasonOf(error));}
}
