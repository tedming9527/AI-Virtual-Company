import {createServer} from 'node:http';
import {readFileSync,writeFileSync,existsSync,unlinkSync,openSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,randomUUID,timingSafeEqual,createHmac} from 'node:crypto';
import {MonitorStore} from './store.js';
import {atomic,read,safe,normalize,TTL,KINDS,hash} from './common.js';
const VERSION=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url))).version;
const secret=()=>randomBytes(32).toString('hex');
const equal=(a,b)=>typeof a==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const assets=new Map([['/',['index.html','text/html; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']],['/style.css',['style.css','text/css; charset=utf-8']]]);
export async function startMonitorServer(state,{port=0,clock=Date.now,leaseMs=30000,tickMs=1000}={}){
 const store=new MonitorStore(state,{clock});await store.restore();
 const id=randomUUID(),token=secret(),file=safe(join(store.dir,'instance.json')),lock=safe(join(store.dir,'service.lock'));
 if(existsSync(lock)){const prior=read(lock);if(prior.schema!=='avc.monitor-lock.v1'||!Number.isInteger(prior.pid))throw Error('monitor-unknown-lock');let alive=true;try{process.kill(prior.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}if(alive)throw Error('monitor-already-starting');unlinkSync(lock);}
 const fd=openSync(lock,'wx',0o600);writeFileSync(fd,JSON.stringify({schema:'avc.monitor-lock.v1',id,pid:process.pid}));closeSync(fd);
 const pages=new Map(),sessions=new Map(),bootstraps=new Map();let closing=false,stopped=false,base='',lastWrite=0,idleDeadline=clock()+30000;
 const cookieName='tedmon_'+id.slice(0,8);const status=()=>({schema:'avc.monitor-status.v1',instanceId:id,version:VERSION,source:'running source package; not installation/release verification',mode:stopped?'cleanup-only':pages.size?'recording':'idle',activePages:pages.size,retained:store.query({limit:1}).total,ttlHours:24,health:store.health,coverage:'future instrumented asset events only; no backfill, hidden reasoning or token accounting'});
 const capture=()=>!closing&&!stopped&&pages.size>0;
 const writeInstance=()=>{atomic(file,{schema:'avc.monitor-instance.v1',id,pid:process.pid,port:server.address().port,secret:token,captureUntil:capture()?clock()+leaseMs:0});lastWrite=clock();};
 const notify=()=>{for(const page of pages.values()){if(!page.res.write('event: change\ndata: {}\n\n'))page.res.destroy();}};
 function finishPage(key){pages.delete(key);if(!closing)try{writeInstance();}catch{store.health.writeFailures++;}idleDeadline=clock()+30000;}
 const server=createServer(async(req,res)=>{
  const reply=(code,data,headers={})=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
  try{
   if(req.headers.host!==base.slice(7)||req.headers.origin&&req.headers.origin!==base)return reply(403,{error:'origin-rejected'});
   const url=new URL(req.url,base);if(req.url.length>4096)return reply(400,{error:'request-too-large'});
   const body=async()=>{let data='';for await(const part of req){data+=part;if(Buffer.byteLength(data)>8192){req.destroy();throw Error('request-too-large');}}return JSON.parse(data||'{}');};
   if(url.pathname.startsWith('/internal/')){
    if(req.headers.origin||!equal(req.headers['x-ted-control'],token))return reply(403,{error:'control-rejected'});
    if(req.method!=='POST')return reply(405,{error:'method'});
    if(url.pathname==='/internal/status')return reply(200,status());
    if(url.pathname==='/internal/open'){
     stopped=false;idleDeadline=clock()+30000;const code=secret();bootstraps.set(code,clock()+60000);while(bootstraps.size>32)bootstraps.delete(bootstraps.keys().next().value);return reply(200,{url:base+'/#bootstrap='+code,...status()});
    }
    if(url.pathname==='/internal/stop'){stopped=true;for(const page of pages.values())page.res.end();pages.clear();sessions.clear();bootstraps.clear();writeInstance();idleDeadline=clock();return reply(200,{...status(),taskContinues:true});}
    if(url.pathname==='/internal/event'){
     if(!capture())return reply(202,{status:'not-recording'});
     const data=await body();if(!capture())return reply(202,{status:'not-recording'});
     normalize(data,clock());const event=store.append(data);if(event)notify();return reply(event?202:503,{status:event?'recorded':'unavailable',taskContinues:true});
    }
    return reply(404,{error:'not-found'});
   }
   if(req.method==='GET'&&assets.has(url.pathname)){
    const [name,type]=assets.get(url.pathname);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});return res.end(readFileSync(new URL('./web/'+name,import.meta.url)));
   }
   if(stopped)return reply(503,{error:'monitor-stopped'});
   if(req.method==='POST'&&url.pathname==='/api/auth'){
    if(req.headers.origin!==base)return reply(403,{error:'origin-required'});const data=await body(),expires=bootstraps.get(data.bootstrap);bootstraps.delete(data.bootstrap);if(!expires||expires<=clock())return reply(401,{error:'bootstrap-expired'});
    const cookie=secret();sessions.set(cookie,clock()+1800000);while(sessions.size>32)sessions.delete(sessions.keys().next().value);return reply(200,{status:'authenticated'},{'Set-Cookie':`${cookieName}=${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`});
   }
   const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
   if(!cookie||!sessions.has(cookie)||sessions.get(cookie)<=clock())return reply(401,{error:'access-expired; reopen using ted monitor'});
   if(req.method==='POST'&&['/api/heartbeat','/api/leave'].includes(url.pathname)){
    if(req.headers.origin!==base)return reply(403,{error:'origin-required'});const data=await body(),page=pages.get(data.pageId);if(page&&page.cookie===cookie){if(url.pathname.endsWith('leave')){page.res.end();finishPage(data.pageId);}else page.until=clock()+leaseMs;}return reply(200,{status:'ok'});
   }
   if(req.method!=='GET')return reply(405,{error:'method'});
   if(url.pathname==='/api/status')return reply(200,status());
   if(url.pathname==='/api/stream'){
    const key=url.searchParams.get('pageId');if(!/^[\w-]{10,80}$/.test(key||'')||pages.size>=32&&!pages.has(key))return reply(400,{error:'invalid-page'});
    if(pages.has(key)&&pages.get(key).cookie!==cookie)return reply(403,{error:'page-owner'});
    if(pages.has(key))pages.get(key).res.end();
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write('event: ready\ndata: {}\n\n');const page={res,cookie,until:clock()+leaseMs};pages.set(key,page);writeInstance();req.on('close',()=>{if(pages.get(key)===page)finishPage(key);});return;
   }
   if(['/api/events','/api/assets','/api/sessions'].includes(url.pathname)){
    const number=(key,fallback,max)=>{if(!url.searchParams.has(key))return fallback;const n=Number(url.searchParams.get(key));if(!Number.isSafeInteger(n)||n<0||n>max)throw Error('invalid-filter');return n;};
    const type=url.searchParams.get('type')||'';if(type&&!['skill','knowledge','framework','role','material'].includes(type))throw Error('invalid-filter');const session=url.searchParams.get('session')||'',kind=url.searchParams.get('kind')||'';if(session.length>200||kind&&!KINDS.includes(kind))throw Error('invalid-filter');
    const from=number('from',0,Number.MAX_SAFE_INTEGER),to=number('to',Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);if(to<from)throw Error('invalid-filter');
    const filterHash=hash(JSON.stringify([session,kind,type,from,to]));let watermark=store.counter,before=null;
    const sign=text=>createHmac('sha256',token).update(text).digest('hex');
    const cursor=url.searchParams.get('cursor');
    if(cursor){if(cursor.length>1024)throw Error('invalid-cursor');const [text,signature]=cursor.split('.');if(!signature||!equal(signature,sign(text)))return reply(409,{error:'cursor-reset-required'});const value=JSON.parse(Buffer.from(text,'base64url').toString());if(value.instance!==id||value.filter!==filterHash||value.before.at+TTL<=clock())return reply(409,{error:'cursor-expired; refresh'});watermark=value.watermark;before=value.before;}
    const result=store.query({session,kind,type,from,to,watermark,before,limit:number('limit',100,200)||1});
    if(url.pathname==='/api/sessions')return reply(200,{sessions:result.sessions.slice(0,200),more:result.sessions.length>200});
    if(url.pathname==='/api/assets'){const unique=new Map(result.events.map(e=>[e.asset.id+':'+e.asset.sha256,e.asset]));return reply(200,{assets:[...unique.values()],scope:'current bounded event page; no full inventory'});}
    // Cursor pins the fact watermark and exact filters; newly arriving events do not shift later pages.
    delete result.sessions;delete result.nextOffset;
    let truncated=false;
    while(Buffer.byteLength(JSON.stringify(result))>62000&&result.events.length>1){result.events.pop();truncated=true;}
    const last=result.events.at(-1);result.nextCursor=last&&(result.hasMore||truncated)?(()=>{const text=Buffer.from(JSON.stringify({instance:id,filter:filterHash,watermark,before:{at:last.recordedAt,id:last.id}})).toString('base64url');return text+'.'+sign(text);})():null;
    delete result.hasMore;delete result.watermark;
    return reply(200,{...result,window:'watermark-bound; expired records excluded; refresh on reset'});
   }
   reply(404,{error:'not-found'});
  }catch{if(!res.headersSent)reply(400,{error:'monitor-request-failed',taskContinues:true});else res.end();}
 });
 server.requestTimeout=5000;server.headersTimeout=5000;server.maxConnections=64;
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});base='http://127.0.0.1:'+server.address().port;writeInstance();}catch(e){unlinkSync(lock);throw e;}
 const tick=setInterval(()=>{try{
  for(const [key,page]of pages)if(page.until<=clock()||!sessions.has(page.cookie)||sessions.get(page.cookie)<=clock()){page.res.end();finishPage(key);}else page.res.write(': heartbeat\n\n');
  for(const [key,expiry]of bootstraps)if(expiry<=clock())bootstraps.delete(key);
  for(const [key,expiry]of sessions)if(expiry<=clock())sessions.delete(key);
  const before=store.items.size;store.prune();if(before!==store.items.size)notify();
  if(capture()&&clock()-lastWrite>5000)writeInstance();
  if(!pages.size&&!store.items.size&&clock()>idleDeadline)void close();
 }catch{store.health.cleanupFailures++;}},tickMs);
 async function close(){if(closing)return;closing=true;clearInterval(tick);for(const page of pages.values())page.res.end();pages.clear();try{if(read(file).id===id)unlinkSync(safe(file));if(read(lock).id===id)unlinkSync(safe(lock));}catch{}await new Promise(r=>{server.close(r);server.closeIdleConnections();});}
 return {server,store,base,id,token,status,close};
}
