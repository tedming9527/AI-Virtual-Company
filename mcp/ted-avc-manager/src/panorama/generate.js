// Shared renderer with explicit public/local collectors and output boundaries.
import { writeFileSync, mkdirSync, existsSync, readFileSync, lstatSync, readdirSync } from 'node:fs';
import { join, resolve, sep, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { scanPacks, readBootstrap, assertNoLinks } from '../core/scan.js';
import { readLock } from '../core/lockfile.js';
import { inventoryPersonal, discoverSkills } from '../core/local-assets.js';
import { mergeConfig } from '../core/personal.js';
import { readCandidates, repositoryOf } from './candidates.js';
const engineVersion = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))).version;
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const sourceNames = { general: '通用 · 中央源', 'local-custom': '本地个人 · 自定义', 'external-installed': '本机已安装 · 外部发现', 'central-distribution': '通用 · 中央下发', 'personal-record': '本地个人 · 资料', 'pending-review': '本地个人 · 待复核', historical: '本地个人 · 历史归档' };
const areaNames = { memory: '记忆与项目背景', learning: '学习与评测', inbox: '输入与待办', meetings: '会议与决策', deliverables: '交付物', output: '工作输出', research: '研究', schedule: '日程', plugins: '个人插件', infrastructure: '环境资料', experience: '个人经验', staging: '导入候选', archive: '只读归档', preset: '中央预设副本', custom: '个人自定义', '.agents': 'Agent 数据', '.codex': 'Codex 数据' };
function git(root, args) { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
function catalog(root, ref, version) {
  let commit = null, verified = false;
  try {
    commit = git(root, ['rev-parse', 'HEAD']);
    if (ref) {
      if (ref !== `v${version}` || !/^v\d+\.\d+\.\d+$/.test(ref)) throw new Error('catalog-ref 必须匹配 bootstrap 版本 tag');
      const tagged = git(root, ['rev-parse', `${ref}^{commit}`]);
      const dirty = git(root, ['status', '--porcelain', '--', 'packs', 'bootstrap.json']);
      if (tagged !== commit || dirty) throw new Error('发布目录必须来自该 tag 的干净 packs/bootstrap 快照');
      verified = true;
    }
  } catch (error) { if (ref) throw error; }
  return { commit, ref: ref || null, source: verified ? 'verified-release' : 'working-copy' };
}
export function buildPanoramaModel(root, opts = {}) {
  const view = opts.view || 'local';
  if (!['local', 'public'].includes(view)) throw new Error('view 必须为 local 或 public');
  const bootstrap = readBootstrap(root), scanned = scanPacks(root), repo = repositoryOf(root);
  const snapshot = catalog(root, opts.catalogRef, bootstrap.version);
  const model = { view, engineVersion, version: bootstrap.version, catalog: snapshot, repository: repo, generatedAt: new Date().toISOString(),
    general: scanned.packs.map(p => ({ type: p.type, name: p.name, displayName: p.displayName, version: p.version, status: p.status, rubric: p.rubric, source: 'general', pathLabel: `packs/${p.type}/${p.name}/${p.entry}`, href: repo ? `https://github.com/${repo}/blob/${opts.catalogRef || snapshot.commit || 'master'}/packs/${p.type}/${p.name}/${p.entry}` : null })),
    errors: scanned.errors, candidates: readCandidates(root, opts.candidatesFile) };
  const knowledge=assertNoLinks(root,join(root,'packs/knowledge/catalog.json'));
  model.knowledgeEntries=existsSync(knowledge)?JSON.parse(readFileSync(knowledge,'utf8')).entries.map(e=>({id:e.id,owner:e.owner,detail:e.detail,status:e.status,updated:e.updated,sha256:e.sha256})):[];
  // Public exits before any storage, personal, custom or score collection.
  if (view === 'public') return model;
  model.version = readLock(opts.runtimeDir || join(root, 'runtime')).current || bootstrap.version;
  const inventory = inventoryPersonal(root), discovery = discoverSkills(root, opts);
  model.personal = { configured: !inventory.personal.fallback, exists: existsSync(inventory.personal.directory),
    areas: inventory.areas.map(area => ({ name: area.name, state: area.state, exists: area.exists, files: area.files.map(f => ({ pathLabel: `${area.name}/${f.relativePath}`, displayName: f.relativePath, bytes: f.bytes, source: area.state, href: pathToFileURL(f.path).href })) })),
    warnings: [...inventory.warnings, ...inventory.localPacks.errors], localPacks: inventory.localPacks.packs.map(p => ({ type: p.type, name: p.name, displayName: p.displayName, version: p.version, source: 'local-custom', pathLabel: relative(inventory.personal.directory, join(p.dir, p.entry)) })) };
  model.skills = discovery.skills.map(({ name, displayName, source, version, management, pathLabel, entry }) => ({ name, displayName, source, version, management, pathLabel, href: pathToFileURL(entry).href }));
  const config = mergeConfig(inventory.personal.root, inventory.personal.slug, bootstrap.presets || []);
  model.config = Object.entries(config.merged).map(([key, item]) => ({ key, source: item.source, value: /^(update\.(channel|check)|runtime\.(cacheTtlDays|logRetentionDays)|panorama\.localView)$/.test(key) ? JSON.stringify(item.value) : '仅展示来源；值保留在配置文件' }));
  const scoresFile = opts.scoresFile || join(root, 'runtime', 'scores.json');
  model.scores = existsSync(scoresFile) ? JSON.parse(readFileSync(scoresFile, 'utf8')) : {};
  const events=join(root,'runtime/asset-events.jsonl');
  model.assetEvents=existsSync(events)?readFileSync(events,'utf8').trim().split('\n').filter(Boolean).slice(-100).flatMap(line=>{try{const e=JSON.parse(line);return [{kind:e.kind,name:e.name,type:e.type,source:e.source,at:e.at,evidence:e.evidence}]}catch{return []}}):[];
  const tasks=join(root,'runtime/execution/tasks');
  model.tasks=existsSync(tasks)?readdirSync(tasks).filter(f=>f.endsWith('.json')&&!lstatSync(join(tasks,f)).isSymbolicLink()).flatMap(file=>{
    try{const t=JSON.parse(readFileSync(join(tasks,file),'utf8'));return [{taskId:t.taskId,status:t.status,role:t.role?.displayName,engineVersion:t.engineVersion,catalogVersion:t.catalogVersion,mode:t.mode,calls:Object.keys(t.calls||{}).length,observed:Object.values(t.calls||{}).filter(c=>c.status==='observed').length,unknown:Object.values(t.calls||{}).filter(c=>c.status==='unknown').length,violations:t.violations?.length||0,integrity:t.integrity?.status||'pending',modelTokens:t.observation?.modelTokens||'unknown'}]}catch{return []}
  }):[];
  return model;
}
function badge(source) { return `<span class="badge ${source === 'general' || source === 'central-distribution' ? 'general' : 'personal'}">${esc(sourceNames[source] || source)}</span>`; }
function link(label, href) { return href && /^(https:\/\/github\.com\/|file:\/\/)/.test(href) ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label); }
function table(headers, rows) { return `<div class="table-scroll"><table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${headers.length}" class="empty">暂无条目</td></tr>`}</tbody></table></div>`; }
function tr(source, cells) { return `<tr data-origin="${source === 'general' || source === 'central-distribution' ? 'general' : 'personal'}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`; }
export function renderPanorama(model) {
  const local = model.view === 'local', typeNames = { skill: '技能', knowledge: '知识', framework: '框架与规则', role: '专业岗位' };
  const packSections = Object.entries(typeNames).map(([type, title]) => `<section id="${type}"><h2>${title} <small>通用资产</small></h2>${table(['资产', '来源', '版本', '目录状态', '本地质量分'], model.general.filter(p => p.type === type).map(p => {
    const score = local ? model.scores?.[p.name] : null;
    return tr(p.source, [`${link(p.displayName, p.href)}<div class="path">${esc(p.pathLabel)}</div>`, badge(p.source), `v${esc(p.version)}`, esc(p.status), typeof score?.quality === 'number' ? esc(score.quality) + (score.provisional ? '（临时）' : '') : '无已验证评分']);
  }))}</section>`).join('');
  const candidates = model.candidates, age = Date.now() - Date.parse(candidates.fetchedAt || '');
  const candidateRows = (candidates.entries || []).flatMap(pr => pr.changes.map(change => tr('general', [link(`#${pr.number} ${pr.title}`, pr.url), `${esc(typeNames[change.type])} / ${esc(change.displayName)}`, `${esc(change.baseVersion || '新增')} → ${esc(change.proposedVersion || '移除')}`, pr.draft ? 'Draft · 待审候选' : 'Open · 待审候选', `<code>${esc(pr.headSha.slice(0, 12))}</code>`])));
  const candidateSection = `<section id="candidates"><h2>通用升级候选 PR <small>未计入已发布包</small></h2><p class="note">同步状态：${esc(candidates.status)} · ${esc(candidates.fetchedAt || '尚未同步')}${age > 24 * 3600000 ? ' · 快照已超过 24 小时，请重新同步' : ''}。关闭或合并后，下一次同步会移出候选列表。</p>${candidates.status === 'available' ? table(['PR', '资产', '版本提案', '状态', '固定提交'], candidateRows) : '<p class="empty">候选数据尚未取得，不能据此认定没有候选 PR。</p>'}</section>`;
  const knowledgeSection=`<section><h2>通用知识正文索引 <small>${(model.knowledgeEntries || []).length} 条记录，区别于知识包数量</small></h2>${table(['知识 ID','正文位置','所属岗位','状态 / 更新时间'],(model.knowledgeEntries || []).map(e=>tr('general',[esc(e.id),link(e.detail,model.repository?`https://github.com/${model.repository}/blob/${model.catalog.ref||model.catalog.commit||'master'}/${e.detail}`:null),esc(model.general.find(p=>p.type==='role'&&p.name===e.owner)?.displayName||e.owner),`${esc(e.status)} · ${esc(e.updated)}`])))}</section>`;
  let personalSections = '';
  if (local) {
    const personal = model.personal;
    const skillRows = model.skills.map(s => tr(s.source, [`${link(s.displayName, s.href)}<div class="path">${esc(s.pathLabel)}</div>`, badge(s.source), esc(s.management), esc(s.version || '未声明')]));
    const areas = personal.areas.map(area => `<details class="area"><summary>${esc(areaNames[area.name])} <code>${esc(area.name)}/</code> ${badge(area.state)} <strong>${area.files.length} 个文件</strong></summary><p class="note">${area.state === 'pending-review' ? '暂存候选，需复核；未自动激活或发布。' : area.state === 'historical' ? '只读历史，不计作当前生效资产。' : area.name === 'experience' ? '个人经验资料，目录存在不表示已加载为执行模块。' : '只读索引；不修改原文件。'}</p>${table(['条目', '来源', '大小'], area.files.map(f => tr(f.source, [link(f.displayName, f.href), badge(f.source), `${Math.ceil(f.bytes / 1024)} KB`])))}</details>`).join('');
    personalSections = `<section id="local-skills"><h2>技能发现与管理 <small>本地</small></h2><p class="note">central-managed = 中央包；local-managed = 本机已登记并校验摘要；discovered-unregistered = 仅发现；local-changed = 登记后内容或元数据变更。登记不等于客户端安装、激活或允许执行。</p>${table(['技能', '来源', '管理状态', '版本'], skillRows)}</section><section id="local-packs"><h2>个人自定义包</h2>${table(['资产', '类型', '版本', '来源'], personal.localPacks.map(p => tr(p.source, [esc(p.displayName), esc(typeNames[p.type]), esc(p.version), badge(p.source)])))}</section><section id="config"><h2>生效配置来源</h2>${table(['配置项', '当前值', '来源'], model.config.map(c => tr(c.source.startsWith('preset/') ? 'central-distribution' : 'local-custom', [esc(c.key), esc(c.value), esc(c.source)])))}</section><section id="personal"><h2>个人与自定义资产目录</h2><p class="note">${personal.configured ? '使用已配置个人目录' : '个人存储未配置，当前为 runtime 回退'} · ${personal.exists ? '目录存在' : '目录尚不存在'}。preset 是通用预设的本地副本；custom、经验、记录、候选和归档按来源分别显示。</p>${areas}${personal.warnings.length ? `<p class="warning">${personal.warnings.map(esc).join('<br>')}</p>` : ''}</section>`;
  }
  if(local)personalSections+=`<section id="execution"><h2>执行介入与资产观察 <small>本地回执</small></h2><p class="note">正文交付、原生读取、模型自报和实际工具完成分别统计；未暴露的自动加载、模型 token 与费用保持 unknown。</p>${table(['任务','专业主责','模式/状态','引擎/资产版本','调用/观察/未知','违规/完整性'],model.tasks.map(t=>tr('personal-record',[esc(t.taskId.slice(0,12)),esc(t.role),`${esc(t.mode)} / ${esc(t.status)}`,`${esc(t.engineVersion)} / ${esc(t.catalogVersion)}`,`${t.calls} / ${t.observed} / ${t.unknown}`,`${t.violations} / ${esc(t.integrity)}`])))}<details><summary>近期资产发现与加载事件（最多 100 条）</summary>${table(['事件','资产','来源','时间'],model.assetEvents.map(e=>tr(e.source||'personal-record',[esc(e.kind),esc(e.name||'—'),esc(e.source||'本地'),esc(e.at)])))}</details></section>`;
  const totalPersonal = local ? model.personal.areas.reduce((n, area) => n + area.files.length, 0) : null;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ted-avc-manager · ${local ? '本地' : '通用'}全景图</title><style>*{box-sizing:border-box}body{font:15px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;margin:0;background:#f3f5f8;color:#1c2b3d}header{background:#13283e;color:white;padding:30px max(24px,calc((100% - 1200px)/2))}h1{font-size:27px;margin:0}header p{color:#bfd0e0;margin:8px 0}.wrap{max-width:1200px;padding:24px;margin:auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.card{background:white;border-radius:12px;padding:18px;border:1px solid #dce3eb}.card strong{display:block;font-size:28px}nav{display:flex;flex-wrap:wrap;gap:14px;margin:20px 0}a{color:#1463a0;text-decoration:none}a:hover{text-decoration:underline}section{background:white;border:1px solid #dce3eb;border-radius:12px;padding:22px;margin:20px 0}h2{font-size:21px;margin:0 0 16px}small,.note,.path{font-size:12px;color:#62778c}.path{overflow-wrap:anywhere}h2 small{margin-left:10px}.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th{text-align:left;background:#f2f6fa;color:#50667c}td,th{padding:12px;border-bottom:1px solid #e5eaf0;vertical-align:top}.badge{display:inline-block;border-radius:20px;font-size:11px;padding:3px 9px;white-space:nowrap}.general{background:#e9f1ff;color:#254c87}.personal{background:#f0eafa;color:#62418d}.empty{color:#718296;padding:16px}.area{margin:14px 0;border-top:1px solid #e5eaf0;padding-top:12px}.area summary{cursor:pointer;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.area strong{margin-left:auto}.filter{display:flex;gap:12px;margin:20px 0}input,select{padding:10px;border:1px solid #ccd6e0;border-radius:8px}input{flex:1}.warning{color:#9a4d10}.hidden{display:none}code{font-size:12px}footer{color:#64778c;font-size:12px;padding:20px 0}</style></head><body><header><h1>ted-avc-manager · ${local ? '本地资产全景图' : '通用资产全景图'}</h1><p>${local ? '通用包、个人资料、自定义技能与生效配置' : '通用目录与公开升级候选'} · 资产版本 v${esc(model.version)} · 引擎 v${esc(model.engineVersion)}</p><p>目录来源：${model.catalog.source === 'verified-release' ? '已核验发布快照 ' + esc(model.catalog.ref) : '工作副本（未核验为发布快照）'} · 生成于 ${esc(model.generatedAt)}</p></header><main class="wrap"><div class="cards"><div class="card"><strong>${model.general.length}</strong>通用包</div>${local ? `<div class="card"><strong>${totalPersonal}</strong>个人目录文件</div><div class="card"><strong>${model.skills.filter(s => s.management === 'local-managed').length}</strong>已登记本地技能</div>` : ''}<div class="card"><strong>${candidates.status === 'available' ? candidates.entries.length : '未知'}</strong>通用升级候选 PR</div></div><nav><a href="#skill">技能</a><a href="#knowledge">知识</a><a href="#role">中文专业岗位</a><a href="#framework">框架</a><a href="#candidates">候选 PR</a>${local ? '<a href="#local-skills">本地技能管理</a><a href="#config">配置来源</a><a href="#personal">个人资产</a>' : ''}</nav><div class="filter"><input id="search" type="search" placeholder="搜索资产、职业、目录、PR"><select id="origin"><option value="all">全部来源</option><option value="general">通用资产</option>${local ? '<option value="personal">本地个人资产</option>' : ''}</select></div>${model.errors.length ? `<p class="warning">${model.errors.map(esc).join('<br>')}</p>` : ''}${packSections}${knowledgeSection}${candidateSection}${personalSections}<footer>通用包、自定义包、个人文件和 PR 使用不同计数口径。历史与暂存不自动激活，公开候选不计入发布版本。Hook 与台账的运行事实另行验收。</footer></main><script>const search=document.getElementById('search'),origin=document.getElementById('origin');function filter(){const term=search.value.toLowerCase();document.querySelectorAll('tbody tr[data-origin]').forEach(row=>row.classList.toggle('hidden',!row.textContent.toLowerCase().includes(term)||(origin.value!=='all'&&row.dataset.origin!==origin.value)));if(term)document.querySelectorAll('.area').forEach(area=>{area.open=Array.from(area.querySelectorAll('tr[data-origin]')).some(row=>!row.classList.contains('hidden'))})}search.addEventListener('input',filter);origin.addEventListener('change',filter);</script></body></html>`;
}
export function generatePanorama(root, opts = {}) {
  const model = buildPanoramaModel(root, opts);
  const outDir = resolve(opts.outDir || join(root, model.view === 'local' ? 'runtime/panorama' : 'panorama'));
  if (model.view === 'local' && !outDir.startsWith(resolve(root, 'runtime') + sep)) throw new Error('本地视图只写 runtime/，不得写入公开 panorama/');
  let cursor = resolve(root);
  for (const part of relative(root, outDir).split(sep)) {
    if (part === '..') throw new Error('全景图输出不得越出执行根');
    cursor = join(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error('拒绝全景图输出符号链接');
  }
  mkdirSync(outDir, { recursive: true });
  for (const name of ['index.html', 'data.json']) if (existsSync(join(outDir, name)) && lstatSync(join(outDir, name)).isSymbolicLink()) throw new Error('拒绝全景图文件符号链接');
  writeFileSync(join(outDir, 'index.html'), renderPanorama(model));
  writeFileSync(join(outDir, 'data.json'), JSON.stringify(model, null, 2) + '\n');
  return join(outDir, 'index.html');
}
