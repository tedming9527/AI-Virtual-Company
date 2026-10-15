import {request} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stateRootFor} from '../core/client-state.js';
import {instance} from './common.js';
export function control(current,operation){return new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port:current.port,path:'/internal/'+operation,method:'POST',headers:{'X-Ted-Control':current.secret}},res=>{let text='';res.on('data',part=>{text+=part;if(text.length>8192)req.destroy();});res.on('end',()=>{try{const result=JSON.parse(text);if(res.statusCode!==200||result.instanceId!==current.id)throw Error('monitor-instance-unverified');resolve(result);}catch(e){reject(e);}});});req.setTimeout(1000,()=>req.destroy(Error('monitor-unreachable')));req.on('error',reject);req.end();});}
export function openBrowser(url){const executable=process.platform==='darwin'?'open':process.platform==='win32'?'rundll32':'xdg-open';const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];return new Promise(resolve=>{const child=spawn(executable,args,{stdio:'ignore'});const timer=setTimeout(()=>{child.unref();resolve(false);},3000);child.once('error',()=>{clearTimeout(timer);resolve(false);});child.once('exit',code=>{clearTimeout(timer);resolve(code===0);});});}
export async function runMonitor(root,input={}){
 const operation=input.operation||'open';if(!['open','status','stop'].includes(operation))throw Error('monitor-operation-invalid');
 const state=stateRootFor(root);let current,live;
 try{current=instance(state);live=await control(current,'status');}catch{}
 if(operation!=='open'){if(!live)return {action:'monitor',operation,status:'not-running',taskContinues:true};return {action:'monitor',operation,...await control(current,operation)};}
 if(!live){
  const child=spawn(process.execPath,[fileURLToPath(new URL('../cli.js',import.meta.url)),'monitor','serve'],{cwd:root,env:{...process.env,AVC_PROJECT_ROOT:root},stdio:'ignore',detached:true});child.on('error',()=>{});child.unref();
  for(let n=0;n<40;n++){await new Promise(r=>setTimeout(r,100));try{current=instance(state);live=await control(current,'status');break;}catch{}}
  if(!live)return {action:'monitor',operation,error:'monitor-start-unverified; run monitor serve for diagnostics',taskContinues:true};
 }
 const opened=await control(current,'open'),url=new URL(opened.url);if(input.sessionId)url.searchParams.set('session',String(input.sessionId).slice(0,200));
 const browserOpened=input.openBrowser===false?false:await openBrowser(url.href);
 return {action:'monitor',operation,status:'ready',instanceId:live.instanceId,address:url.origin+'/',browserOpened,...(input.openBrowser===false?{accessUrl:url.href}:{}),recovery:'Run monitor open locally to issue a new one-use browser link; no access capability returned to model',ttlHours:24,taskContinues:true};
}
