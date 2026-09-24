import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const input=process.argv[2]; if(!input){console.error("usage: node scripts/validate-radar.mjs <collection.json>");process.exit(2)}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const data=JSON.parse(fs.readFileSync(path.resolve(input),"utf8"));
const registry=JSON.parse(fs.readFileSync(path.join(root,"source-registry.json"),"utf8"));
const errors=[];
const files=["README.md","source-registry.json","schema.json","collection-template.json","scripts/validate-radar.mjs","tests/validate-radar.test.mjs"];
const manifest=files.map(f=>`${crypto.createHash("sha256").update(fs.readFileSync(path.join(root,f))).digest("hex")}  ${f}\n`).join("");
export const snapshot=`sha256:${crypto.createHash("sha256").update(manifest).digest("hex")}`;
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const date=v=>{if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split("-").map(Number),x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d};
const https=v=>{try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port}catch{return false}};
const github=v=>{try{const u=new URL(v);const m=u.pathname.match(/^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);if(u.protocol!=="https:"||u.hostname!=="github.com"||u.search||u.hash||u.username||u.password||u.port||!m||m[2].endsWith(".git"))return null;const loc=`${m[1]}/${m[2]}`;return v===`https://github.com/${loc}`?loc:null}catch{return null}};
const npm=v=>{try{const u=new URL(v);if(u.protocol!=="https:"||u.hostname!=="www.npmjs.com"||u.search||u.hash||u.username||u.password||u.port)return null;const m=u.pathname.match(/^\/package\/(?:@([a-z0-9][a-z0-9._~-]*)\/)?([a-z0-9][a-z0-9._~-]*)$/);if(!m)return null;const loc=m[1]?`@${m[1]}/${m[2]}`:m[2];return v===`https://www.npmjs.com/package/${loc}`?loc:null}catch{return null}};
const exactApi=(v,loc)=>v===`https://api.github.com/repos/${loc}`;
const req=(cond,msg)=>{if(!cond)errors.push(msg)};
const exactKeys=(o,keys,label)=>req(o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),`${label} has missing or unknown fields`);
const isoUtc=v=>{if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v))return false;const d=new Date(v);if(Number.isNaN(d.getTime()))return false;const normalized=v.includes(".")?v.replace(/\.(\d{1,3})Z$/,(_,x)=>`.${x.padEnd(3,"0")}Z`):v.replace(/Z$/,".000Z");return d.toISOString()===normalized};

exactKeys(data,["run","tools"],"collection");
exactKeys(data.run,["id","collected_at","scope","source_registry_version","decision_policy","discovery","audits"],"run");
exactKeys(data.run?.discovery,["ledger_ref","expansion_terms","funnel","coverage"],"run.discovery");
exactKeys(data.run?.audits,["discovery","publish_gate"],"run.audits");
exactKeys(data.run?.audits?.discovery,["status","ref","reviewer","snapshot_sha256"],"run.audits.discovery");
exactKeys(data.run?.audits?.publish_gate,["status","ref","reviewer","snapshot_sha256"],"run.audits.publish_gate");

req(data.run?.source_registry_version==="5.0","run must use registry v5.0");
req(data.run?.decision_policy===registry.decision_policy,"decision policy mismatch");
req(date(data.run?.collected_at)&&data.run.collected_at<=today,"invalid/future collection date");
req(registry.sources.length>=10&&registry.sources.length<=20,"registry must contain 10-20 sources");
req(new Set(registry.sources.map(s=>s.family)).size>=registry.minimum_source_families,"registry lacks source-family diversity");
const sourceIds=new Set(registry.sources.map(s=>s.id));
const entityTypes=new Set(registry.entity_types); const roles=new Set(registry.source_roles);

const ledgerRef=data.run?.discovery?.ledger_ref;
let ledger=null;
if((data.tools??[]).length){
  req(typeof ledgerRef==="string"&&/^discoveries\/[a-z0-9-]+\.json$/.test(ledgerRef),"non-empty run requires a discovery ledger");
  if(typeof ledgerRef==="string"){
    const lp=path.resolve(root,ledgerRef); req(lp.startsWith(path.join(root,"discoveries")+path.sep)&&fs.existsSync(lp),"discovery ledger missing");
    if(fs.existsSync(lp)) ledger=JSON.parse(fs.readFileSync(lp,"utf8"));
  }
}
if(ledger){
  const attempts=ledger.attempts??[]; const attempted=attempts.filter(a=>["succeeded","unavailable","failed"].includes(a.status)); const succeeded=attempts.filter(a=>a.status==="succeeded"); const uniqueAttemptIds=new Set(attempted.map(a=>a.source_id)); const attemptedFamilies=new Set([...uniqueAttemptIds].map(id=>registry.sources.find(s=>s.id===id)?.family).filter(Boolean));
  req(uniqueAttemptIds.size===attempted.length,"duplicate source attempts are not allowed");
  req(uniqueAttemptIds.size>=registry.minimum_attempted_sources,"fewer than 10 unique sources attempted");
  req(attemptedFamilies.size>=registry.minimum_source_families,"attempted sources lack family diversity");
  for(const [i,a] of attempts.entries()){exactKeys(a,["source_id","attempted_at","status","query","raw_hit_count"],`ledger attempt ${i}`);req(["succeeded","unavailable","failed"].includes(a.status),`ledger attempt ${i} has invalid status`);req(sourceIds.has(a.source_id),`ledger attempt ${i} unknown source`);req(date(a.attempted_at)&&a.attempted_at<=data.run.collected_at&&a.attempted_at<=today,`ledger attempt ${i} bad/future date`);req(typeof a.query==="string"&&a.query.trim(),`ledger attempt ${i} lacks query`);req(Number.isInteger(a.raw_hit_count)&&a.raw_hit_count>=0,`ledger attempt ${i} bad hit count`);if(a.source_id==="x-public-signals")req(["unavailable","failed"].includes(a.status),"unconnected X must be unavailable or failed")}
  req(Array.isArray(data.run.discovery.expansion_terms)&&data.run.discovery.expansion_terms.length>0&&data.run.discovery.expansion_terms.every(x=>typeof x==="string"&&x.trim()),"non-empty run requires expansion terms");
  const leads=ledger.leads??[]; const unique=new Set(leads.map(l=>l.entity_key));
  req(unique.size===leads.length,"lead entity_key values must be unique");
  const eligible=leads.filter(l=>l.decision==="eligible"); const omitted=leads.filter(l=>l.decision==="omitted");
  for(const l of leads){const allowed=l.decision==="eligible"?["entity_key","priority","decision"]:["entity_key","priority","decision","omission_reason"];exactKeys(l,allowed,`lead ${l.entity_key??"unknown"}`);req(typeof l.entity_key==="string"&&/^[a-z0-9][a-z0-9-]+$/.test(l.entity_key),"lead has invalid entity_key");req(["user_nominated","expanded","routine"].includes(l.priority),`lead ${l.entity_key} has invalid priority`);req(["eligible","omitted"].includes(l.decision),`lead ${l.entity_key} has unknown decision`);if(l.decision!=="eligible")req(typeof l.omission_reason==="string"&&l.omission_reason.trim(),`omitted lead ${l.entity_key} lacks reason`)}
  const nominated=leads.filter(l=>l.priority==="user_nominated"); req(nominated.length>0,"no user-nominated lead");
  for(const l of nominated)req(l.decision==="eligible"||Boolean(l.omission_reason),`user nomination ${l.entity_key} silently dropped`);
  const f=data.run.discovery.funnel??{}; const raw=succeeded.reduce((n,a)=>n+a.raw_hit_count,0);
  req(f.raw_hits===raw&&f.deduped===unique.size&&f.eligible===eligible.length&&f.candidates===data.tools.length&&f.published===data.tools.length,"funnel is not recomputable");
  req(f.raw_hits>=f.deduped&&f.deduped>=f.eligible&&f.eligible>=f.candidates&&f.candidates>=f.published,"funnel stages must be monotonic");
  const c=data.run.discovery.coverage??{}; req(c.planned===registry.sources.length&&c.attempted===uniqueAttemptIds.size&&c.succeeded===new Set(succeeded.map(a=>a.source_id)).size&&c.families===attemptedFamilies.size,"coverage does not match ledger");
}

const ids=new Set();
for(const [i,t] of (data.tools??[]).entries()){
  const at=`tools[${i}]`; req(!ids.has(t.id),`${at} duplicate id`);ids.add(t.id);
  exactKeys(t,["id","entity_key","name","entity_type","aliases","capability_hypothesis","primary_url","sources","status","visibility","recommendation","user_decision","volatility","checked_at","next_review_at","discovered_via","raw_signals","notices"],at);
  req(typeof t.entity_key==="string"&&/^[a-z0-9][a-z0-9-]+$/.test(t.entity_key),`${at} has invalid entity_key`);
  req(entityTypes.has(t.entity_type),`${at} bad entity type`); req(t.status==="candidate"&&t.visibility==="candidate"&&t.recommendation==="hold"&&t.user_decision?.status==="pending"&&t.user_decision?.decided_at===null&&t.user_decision?.note==="review_source_before_use"&&Object.keys(t.user_decision??{}).length===3,`${at} must remain candidate/hold/pending`);
  req(https(t.primary_url),`${at} bad primary_url`); req(Array.isArray(t.sources)&&t.sources.length>0,`${at} needs sources`);
  const urls=new Set(); for(const s of (t.sources??[])){exactKeys(s,s.locator===undefined?["role","url"]:["role","url","locator"],`${at} source`);req(roles.has(s.role),`${at} bad source role`);req(https(s.url),`${at} bad source URL`);req(!urls.has(s.url),`${at} duplicate source URL`);urls.add(s.url);if(s.role==="official_repo"){const loc=github(s.url);req(Boolean(loc),`${at} noncanonical GitHub URL`);req(!s.locator||s.locator===loc,`${at} GitHub locator mismatch`)}if(s.role==="package"){const loc=npm(s.url);req(Boolean(loc),`${at} noncanonical npm URL`);req(!s.locator||s.locator===loc,`${at} npm locator mismatch`)}}
  if(t.entity_type==="hosted_model_api"){req((t.sources??[]).some(s=>s.role==="official_release"),`${at} hosted API needs official release`);req((t.sources??[]).some(s=>s.role==="official_docs"),`${at} hosted API needs official docs`);req((t.sources??[]).some(s=>s.role==="official_sdk"),`${at} hosted API needs official SDK`);req((t.sources??[]).some(s=>s.role==="official_skill"),`${at} hosted API needs official skill`)}
  req(Array.isArray(t.discovered_via)&&t.discovered_via.length>0,`${at} needs at least one discovery source`);
  for(const d of (t.discovered_via??[])){exactKeys(d,["source_id","url","discovered_at","priority"],`${at} discovery`);req(["user_nominated","expanded","routine"].includes(d.priority),`${at} discovery has invalid priority`);req(sourceIds.has(d.source_id),`${at} unknown discovery source`);req(https(d.url),`${at} discovery URL must be HTTPS`);req(date(d.discovered_at)&&d.discovered_at<=data.run.collected_at,`${at} bad discovery date`);if(ledger)req((ledger.attempts??[]).some(a=>a.source_id===d.source_id&&a.status==="succeeded"&&a.raw_hit_count>0),`${at} discovery source did not succeed with hits`)}
  const notices=registry.fixed_notices; req(t.notices?.length===notices.length&&notices.every(n=>t.notices.includes(n))&&new Set(t.notices).size===notices.length,`${at} notices mismatch`);
  const max={high:7,medium:30,low:90}[t.volatility]; const span=(Date.parse(`${t.next_review_at}T00:00:00Z`)-Date.parse(`${t.checked_at}T00:00:00Z`))/86400000;req(date(t.checked_at)&&t.checked_at<=data.run.collected_at&&t.checked_at<=today&&date(t.next_review_at)&&span>=0&&span<=max&&t.next_review_at>=today,`${at} stale or invalid review window`);
  for(const s of (t.raw_signals??[])){exactKeys(s,["definition_id","value","observed_at","evidence_url","source_url"],`${at} raw signal`);const def=registry.raw_signal_definitions[s.definition_id];req(Boolean(def),`${at} unknown raw signal definition`);if(def?.value_type==="integer")req(Number.isInteger(s.value)&&s.value>=0,`${at} raw signal must be non-negative integer`);if(def?.value_type==="boolean")req(typeof s.value==="boolean",`${at} raw signal must be boolean`);if(def?.value_type==="iso_datetime"){req(isoUtc(s.value),`${at} raw signal must be canonical UTC ISO time`);req(typeof s.value==="string"&&s.value.slice(0,10)<=s.observed_at,`${at} last-push cannot be after observation date`)}const repo=(t.sources??[]).find(x=>x.role==="official_repo"&&x.url===s.source_url);const loc=repo&&github(repo.url);req(Boolean(loc)&&exactApi(s.evidence_url,loc),`${at} GitHub signal not bound to same repo`);req(s.observed_at===t.checked_at,`${at} signal date mismatch`)}
}

if(ledger){const eligibleKeys=new Set((ledger.leads??[]).filter(l=>l.decision==="eligible").map(l=>l.entity_key));const candidateKeys=new Set((data.tools??[]).map(t=>t.entity_key));for(const k of eligibleKeys)req(candidateKeys.has(k),`eligible lead ${k} is missing from candidates`);for(const k of candidateKeys)req(eligibleKeys.has(k),`candidate ${k} lacks eligible lead`)}

const reviewerValid=v=>typeof v==="string"&&v===v.trim()&&/[\p{L}\p{N}]/u.test(v)&&!/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(v);
const parseHeader=c=>{const m=c.match(/^---\n([\s\S]*?)\n---\n/);if(!m||c.slice(m[0].length).includes("audit_verdict:"))return null;const lines=m[1].split("\n"),pairs=lines.map(l=>l.match(/^([a-z0-9_]+):\s*(\S(?:.*\S)?)$/));if(lines.length!==5||pairs.some(x=>!x))return null;const o={};for(const x of pairs){if(Object.hasOwn(o,x[1]))return null;o[x[1]]=x[2]}return o};
if((data.tools??[]).length){
  for(const scope of ["discovery","publish_gate"]){const a=data.run?.audits?.[scope];req(a?.status==="passed"&&a.ref&&reviewerValid(a?.reviewer)&&a.snapshot_sha256,`${scope} audit must pass`);if(a?.ref){const ap=path.resolve(root,a.ref);req(ap.startsWith(path.join(root,"audits")+path.sep)&&fs.existsSync(ap),`${scope} audit missing`);if(fs.existsSync(ap)){const h=parseHeader(fs.readFileSync(ap,"utf8"));req(h&&Object.keys(h).length===5&&h.audit_verdict==="PASS"&&h.audit_scope===scope,`${scope} audit verdict/scope invalid`);req(h?.snapshot_sha256===snapshot&&a.snapshot_sha256===snapshot,`${scope} audit snapshot mismatch`);req(reviewerValid(h?.reviewer)&&h.reviewer===a.reviewer,`${scope} audit reviewer mismatch`);req(date(h?.audited_at)&&h.audited_at<=data.run.collected_at&&h.audited_at<=today,`${scope} audit date invalid`)}}}
}
if(errors.length){console.error(`FAIL (${errors.length})`);for(const e of errors)console.error(`- ${e}`);process.exit(1)}
console.log(`PASS: ${(data.tools??[]).length} candidate(s); ${ledger?ledger.attempts.length:0} source attempt(s); snapshot ${snapshot}`);
