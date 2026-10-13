// Shared renderer with explicit public/local collectors and output boundaries.
import { writeFileSync, mkdirSync, existsSync, readFileSync, lstatSync, readdirSync } from 'node:fs';
import { join, resolve, sep, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { workflowTemplates, listWorkflows } from '../core/workflow.js';
import { listSkillCandidates } from '../core/skill-candidates.js';
import { normalizeQuery } from '../core/asset-search.js';
import { scanPacks, readBootstrap, assertNoLinks } from '../core/scan.js';
import { readLock } from '../core/lockfile.js';
import { inventoryPersonal, discoverSkills } from '../core/local-assets.js';
import { mergeConfig } from '../core/personal.js';
import { readCandidates, repositoryOf } from './candidates.js';
import { remoteMcpOverview } from './mcp-connections.js';
import { verifiedRating, releasedIdentity, prIdentity, skillCandidateIdentity } from './ratings.js';
import { readSourceQuality } from './source-quality.js';
import { readPanoramaTopics } from './topics.js';
import { skillBundle } from '../core/local-assets.js';
import { weeklyStatus } from '../governance/weekly.js';
const engineVersion = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))).version;
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const sourceNames = { general: '通用 · 中央源', 'local-custom': '本地个人 · 自定义', 'external-installed': '本机外部 · 文件发现', 'central-distribution': '通用 · 中央下发', 'personal-record': '本地个人 · 资料', 'pending-review': '本地个人 · 待复核', historical: '本地个人 · 历史归档' };
const areaNames = { topics: '用户课题', memory: '记忆与项目背景', learning: '学习与评测', inbox: '输入与待办', meetings: '会议与决策', deliverables: '交付物', output: '工作输出', research: '研究', schedule: '日程', plugins: '个人插件', infrastructure: '环境资料', experience: '个人经验', staging: '导入候选', archive: '只读归档', preset: '中央预设副本', custom: '个人自定义', '.agents': 'Agent 数据', '.codex': 'Codex 数据' };
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
  const model = { view, engineVersion, catalogVersion: bootstrap.version, version: bootstrap.version, catalog: snapshot, repository: repo, generatedAt: new Date().toISOString(),
    general: scanned.packs.map(p => ({ type: p.type, name: p.name, displayName: p.displayName, description: p.description, descriptionSource: p.descriptionSource, aliases:p.aliases, keywords:p.keywords, version: p.version, status: p.status, rubric: p.rubric, origin:p.origin, bundleSha256:skillBundle(p.dir).bundleSha256, source: 'general', pathLabel: `packs/${p.type}/${p.name}/${p.entry}`, href: repo ? `https://github.com/${repo}/blob/${opts.catalogRef || snapshot.commit || 'master'}/packs/${p.type}/${p.name}/${p.entry}` : null })),
    errors: scanned.errors, candidates: readCandidates(root, opts.candidatesFile) };
  const knowledge=assertNoLinks(root,join(root,'packs/knowledge/catalog.json'));
  model.knowledgeEntries=existsSync(knowledge)?JSON.parse(readFileSync(knowledge,'utf8')).entries.map(e=>({id:e.id,owner:e.owner,detail:e.detail,status:e.status,updated:e.updated,sha256:e.sha256,summary:e.summary,trigger:e.trigger})):[];
  model.sharedCapabilities = [
    {name:'能力发现与组装',description:'先查本地，再执行中英文网络查询，审查来源并组装本地技能。'},
    {name:'任务多技能组合',description:'一个任务组合多个专业包，按节点用途加载并冻结版本与完整摘要。'},
    {name:'流程节点执行',description:'依赖、并行、条件、重试、取消与产物证据连接实际执行器。'},
    {name:'原生执行约束',description:'绑定真实回合、限定工具与预算，记录已观察和未知调用。'},
    {name:'本地候选升级',description:'登记、验证、候选快照与正式发布分开，内容变化使旧验证失效。'},
  ];
  model.workflowTemplates = workflowTemplates(root).map(spec => ({id:spec.id,title:spec.title,goal:spec.goal,assets:spec.assets,nodes:spec.nodes.map(({id,title,role,assets,dependsOn,executor})=>({id,title,role,assets,dependsOn,executor:executor.kind}))}));
  const sharedScoresFile = assertNoLinks(root, join(root, 'panorama', 'scores.json'));
  model.scores = existsSync(sharedScoresFile) ? JSON.parse(readFileSync(sharedScoresFile, 'utf8')) : {};
  model.sourceQuality = readSourceQuality(root, scanned.packs, bootstrap.version);
  // Public exits before any private storage, personal, custom or runtime-score collection.
  if (view === 'public') return model;
  model.workflows = listWorkflows(root).map(run => ({id:run.spec.id,title:run.spec.title,status:run.status,actualExecutor:run.actualExecutor,assets:run.spec.assets,nodes:run.spec.nodes.map(node=>({id:node.id,title:node.title,role:node.role,dependsOn:node.dependsOn,assets:node.assets,status:run.nodes[node.id].status,attempts:run.nodes[node.id].attempts.map(a=>({id:a.id,status:a.status,adapter:a.adapter,bindingId:a.bindingId||null,contextDelivery:a.contextDelivery,exitCode:a.exitCode,outputs:a.outputs||[],reason:a.reason}))}))}));
  model.skillCandidates = listSkillCandidates(root);
  model.version = readLock(opts.runtimeDir || join(root, 'runtime')).current || bootstrap.version;
  const inventory = inventoryPersonal(root), discovery = discoverSkills(root, opts);
  model.personal = { configured: !inventory.personal.fallback, exists: existsSync(inventory.personal.directory),
    areas: inventory.areas.map(area => ({ name: area.name, state: area.state, exists: area.exists, files: area.files.map(f => ({ pathLabel: `${area.name}/${f.relativePath}`, displayName: f.relativePath, bytes: f.bytes, source: area.state, href: pathToFileURL(f.path).href })) })),
    warnings: [...inventory.warnings, ...inventory.localPacks.errors], localPacks: inventory.localPacks.packs.map(p => ({ type: p.type, name: p.name, displayName: p.displayName, description: p.description, descriptionSource: p.descriptionSource, aliases:p.aliases, keywords:p.keywords, version: p.version, source: 'local-custom', pathLabel: relative(inventory.personal.directory, join(p.dir, p.entry)) })) };
  try {
    const status = weeklyStatus(root), dir = join(inventory.personal.directory, 'experience', '.avc');
    const proposals = existsSync(dir) ? readdirSync(dir).filter(name => /^proposals-[0-9a-f-]{36}\.json$/.test(name)) : [];
    const latest = proposals.map(name => join(dir, name)).filter(file => !lstatSync(file).isSymbolicLink() && lstatSync(file).isFile())
      .map(file => JSON.parse(readFileSync(file, 'utf8'))).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;
    const prepared = status.pending ? join(inventory.personal.directory, status.pending.file) : latest?.runId ? join(dir, `preparation-${latest.runId}.json`) : null;
    const capacity = prepared && existsSync(prepared) && !lstatSync(prepared).isSymbolicLink() ? JSON.parse(readFileSync(prepared, 'utf8')).capacity : null;
    model.weeklyGovernance = { ...status, capacity, proposals: latest?.proposals || [], proposalCount: latest?.proposals?.length ?? 0, review: latest?.review || null };
  } catch (error) { model.weeklyGovernance = { error: error.message }; }
  model.topics = readPanoramaTopics(root);
  const nativeFile=assertNoLinks(root,join(root,'runtime/native-skill-index.json'));
  const nativeIndex=existsSync(nativeFile)?JSON.parse(readFileSync(nativeFile,'utf8')):{entries:[]};
  const nativeEntries=new Map((nativeIndex.entries||[]).map(e=>[resolve(e.path),e]));
  model.skills = discovery.skills.map(({ name, displayName, description, descriptionSource, source, version, origin, management, pathLabel, entry }) => ({ name, displayName, description, descriptionSource, source, version, origin, management, pathLabel, href: pathToFileURL(entry).href, nativeClientListed:nativeEntries.has(resolve(entry)), nativeEnabled:nativeEntries.get(resolve(entry))?.enabled ?? null, nativeListedAt:nativeIndex.fetchedAt || null }));
  const config = mergeConfig(inventory.personal.root, inventory.personal.slug, bootstrap.presets || []);
  model.config = Object.entries(config.merged).map(([key, item]) => ({ key, source: item.source, value: /^(update\.(channel|check)|runtime\.(cacheTtlDays|logRetentionDays)|panorama\.localView)$/.test(key) ? JSON.stringify(item.value) : '仅展示来源；值保留在配置文件' }));
  const scoresFile = opts.scoresFile || join(root, 'runtime', 'scores.json');
  model.localScores = existsSync(scoresFile) ? JSON.parse(readFileSync(scoresFile, 'utf8')) : {};
  model.remoteMcps = remoteMcpOverview(root, opts);
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
function sourceIcon(url, label = '第三方来源地址') {
  try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return ''; }
  catch { return ''; }
  return ` <a class="source-link" href="${esc(url)}" title="${esc(url)}" aria-label="${esc(label)}" target="_blank" rel="noopener noreferrer">🔗 ${esc(label)}</a>`;
}
function table(headers, rows) { return `<div class="table-scroll"><table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${headers.length}" class="empty">暂无条目</td></tr>`}</tbody></table></div>`; }
function tr(source, cells, keywords = []) { return `<tr data-search="${esc(keywords.join(' '))}" data-origin="${source === 'general' || source === 'central-distribution' ? 'general' : 'personal'}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`; }
function purpose(asset) { return `<div>${esc(asset.description || '简介待补')}</div>`; }
const stateNames = { 'central-managed':'中央管理', 'local-managed':'本机已登记', 'discovered-unregistered':'仅发现文件', 'local-changed':'登记后已变更', available:'可用', 'not-synced':'尚未同步', unavailable:'不可用', 'repository-mismatch':'仓库不匹配', open:'待审', draft:'草稿', current:'验证有效', invalidated:'验证失效', unknown:'未知', stable:'稳定', active:'进行中', closed:'已关闭', monitor:'观察', matched:'已匹配', succeeded:'成功', failed:'失败', pending:'待处理', 'local-only':'仅本机' };
const state = value => esc(stateNames[value] || value || '未知');
function rating(record, identity, bundleSha256) {
  const value = verifiedRating(record, identity, bundleSha256);
  return value ? `${esc(value.quality.toFixed(2))} / 5${value.provisional ? '（临时）' : ''}<div class="note">${esc(value.source)} · ${esc(value.assessedAt)}${value.sampleSize === null ? '' : ` · 样本 ${value.sampleSize}`}</div>` : '未评分／证据不足';
}
function sourceEvidence(origin, record) {
  if (!origin) return '无第三方来源';
  const parts = (record?.evidence || []).map(e => {
    const label = { repository:'项目', stars:'GitHub stars', maintainedAt:'最近维护', scorecard:'OpenSSF', advisories:'公开安全公告', npm:'npm 发布包', npmWeeklyDownloads:'npm 近一周下载' }[e.kind];
    return label ? `${esc(label)}：${esc(e.value)}${e.kind==='scorecard'?' / 10':''}${sourceIcon(e.source, '证据地址')}` : null;
  }).filter(Boolean);
  return `${sourceIcon(origin.url)}<div class="note">固定来源版本：${esc(origin.revision || '未声明')} · ${esc(record?.checkedAt || '尚未采集')}</div>${parts.length ? parts.join('<br>') + '<div class="note">原项目公开信号，不等同本包质量评分。</div>' : '<div class="note">网络质量未核验</div>'}`;
}
export function renderPanorama(model) {
  const local = model.view === 'local', typeNames = { skill: '技能', knowledge: '知识', framework: '框架与规则', role: '专业岗位' };
  const metricHelp = `<details class="metric-help"><summary aria-label="查看网络指标参考阶梯">?</summary><p>参考阶梯仅表示同类项目的关注或使用规模，不是官方质量评级，也不参与内部质量分：GitHub stars 少于 50 为小规模、50–499 为已有关注、500–4,999 为较多关注、5,000 及以上为广泛关注；npm 近一周下载少于 100 为小规模、100–999 为已有使用、1,000–99,999 为较多使用、100,000 及以上为广泛使用。不同生态和项目年龄不可直接比较；安全与适用性需另查证据。</p></details>`;
  const packSections = Object.entries(typeNames).map(([type, title]) => `<section id="${type}"><h2>${title} <small>通用资产</small></h2>${metricHelp}${table(['资产', '来源', '版本', '目录状态', '质量评分', '第三方来源与网络证据'], model.general.filter(p => p.type === type).map(p => {
    const score = model.scores?.[releasedIdentity(p)];
    return tr(p.source, [`${link(p.displayName, p.href)}${purpose(p)}<div class="path">${esc(p.pathLabel)}</div>`, badge(p.source), `v${esc(p.version)}`, state(p.status), rating(score, releasedIdentity(p), p.bundleSha256), sourceEvidence(p.origin, model.sourceQuality?.[releasedIdentity(p)])], [...(p.aliases||[]),...(p.keywords||[])]);
  }))}</section>`).join('');
  const sharedSection = `<section id="shared"><h2>跨包公共能力</h2>${table(['能力','功能作用'],(model.sharedCapabilities||[]).map(c=>tr('general',[esc(c.name),esc(c.description)])))}</section>`;
  const templatesSection = `<section id="workflows"><h2>流程模板 <small>组合方法，不代表已执行</small></h2>${(model.workflowTemplates||[]).map(w=>`<details><summary>${esc(w.title)}</summary><p>${esc(w.goal)}</p><p class="note">任务技能：${w.assets.map(a=>esc(a.id+' · '+a.purpose)).join('；')}</p>${table(['节点 / 依赖','专业岗位 / 执行器','节点技能'],w.nodes.map(n=>tr('general',[`${esc(n.title)}<br>${esc(n.dependsOn.join(' + ')||'起点')} → ${esc(n.id)}`,`${esc(n.role)} / ${esc(n.executor)}`,n.assets.map(a=>esc(a.id+' · '+a.purpose)).join('<br>')||'继承任务组合'])))}</details>`).join('')}</section>`;
  const candidates = model.candidates, age = Date.now() - Date.parse(candidates.fetchedAt || '');
  const candidateRows = (candidates.entries || []).flatMap(pr => pr.changes.map(change => tr('general', [link(`#${pr.number} ${pr.title}`, pr.url), `${esc(typeNames[change.type])} / ${esc(change.displayName)}${purpose(change)}`, `${esc(change.baseVersion || '新增')} → ${esc(change.proposedVersion || '移除')}`, pr.draft ? '草稿 · 待审候选' : '待审候选', rating(model.scores?.[prIdentity(pr, change)], prIdentity(pr, change), pr.headSha), sourceEvidence(change.origin, null), `<code>${esc(pr.headSha.slice(0, 12))}</code>`])));
  const candidateSection = `<section id="candidates"><h2>通用升级候选 PR <small>未计入已发布包</small></h2>${metricHelp}<p class="note">同步状态：${state(candidates.status)} · ${esc(candidates.fetchedAt || '尚未同步')}${age > 24 * 3600000 ? ' · 快照已超过 24 小时，请重新同步' : ''}${candidates.locallyMerged?.length ? ` · 当前工作副本已核对合并记录并移出 ${candidates.locallyMerged.length} 项旧候选（远端状态仍以同步为准）` : ''}。关闭或合并后，下一次同步会移出候选列表。</p>${candidates.status === 'available' ? table(['PR', '资产', '版本提案', '状态', '质量评分', '第三方来源与网络证据', '固定提交'], candidateRows) : '<p class="empty">候选数据尚未取得，不能据此认定没有候选 PR。</p>'}</section>`;
  const knowledgeSection=`<section><h2>通用知识正文索引 <small>${(model.knowledgeEntries || []).length} 条记录，区别于知识包数量</small></h2>${table(['知识 ID','用途 / 适用场景','正文位置','所属岗位','状态 / 更新时间'],(model.knowledgeEntries || []).map(e=>tr('general',[esc(e.id),`${esc(e.summary || '用途待补充')}<div class="note">适用：${esc(e.trigger || '请查看原文')}</div>`,link(e.detail,model.repository?`https://github.com/${model.repository}/blob/${model.catalog.ref||model.catalog.commit||'master'}/${e.detail}`:null),esc(model.general.find(p=>p.type==='role'&&p.name===e.owner)?.displayName||e.owner),`${esc(e.status)} · ${esc(e.updated)}`])))}</section>`;
  let personalSections = '';
  if (local) {
    const personal = model.personal;
    const topicRows = (model.topics?.topics || []).map(topic => `<details class="area"><summary>${esc(topic.title)} <code>${esc(topic.id)}</code> ${topic.status === 'archived' ? '已归档' : '进行中'} <strong>${topic.links.length} 项关联</strong></summary><p class="note">${esc(topic.description || '课题简介待补')} · 关联会话：${topic.sessions.length ? topic.sessions.map(session => `${esc(session.id)}（${session.status === 'archived' ? '已归档' : '进行中'}）`).join('、') : '尚未登记'}</p>${table(['相关文件','关联依据','会话','证据状态'],topic.links.map(item => tr('personal-record',[link(item.path,item.href),esc(item.reason),esc(item.sessionId || '未指定'),item.status === 'verified' ? `已核对 SHA-256 <code>${esc(item.sha256.slice(0,12))}</code>` : item.status === 'changed' ? '文件已变更，原关联待复核' : '文件已移除，关联待复核'])))}${topic.links.length ? '' : '<p class="note">尚无已登记文件。讨论过课题不代表已有交付文件。</p>'}</details>`).join('');
    const topicsSection = `<section id="topics"><h2>用户课题与会话关联 <small>仅本机</small></h2><p class="note">新资料先放入 topics/&lt;课题&gt;/ 下的记忆、会议、交付等分类目录；同一课题可以有多个会话。旧目录和仓库文件通过显式索引关联，摘要变化后提示复核。未登记 ${model.topics?.unlinkedCount ?? 0} 个文件，不能凭名称或日期自动归入课题。</p>${topicRows || '<p class="empty">尚未登记用户课题；现有目录文件没有可核验的课题关联。</p>'}</section>`;
    const skillRows = model.skills.map(s => tr(s.source, [`${link(s.displayName, s.href)}${purpose(s)}<div class="path">${esc(s.pathLabel)}</div>${s.origin ? sourceIcon(s.origin.url) : s.source==='external-installed' ? '<div class="note">第三方来源地址待登记</div>' : ''}`, badge(s.source), state(s.management), esc(s.version || '未声明'),s.nativeClientListed?(s.nativeEnabled===true?'已列出 · 已启用':s.nativeEnabled===false?'已列出 · 已禁用':'已列出 · 启用状态未知'):'未核验']));
    const areas = personal.areas.map(area => `<details class="area"><summary>${esc(areaNames[area.name])} <code>${esc(area.name)}/</code> ${badge(area.state)} <strong>${area.files.length} 个文件</strong></summary><p class="note">${area.state === 'pending-review' ? '暂存候选，需复核；未自动激活或发布。' : area.state === 'historical' ? '只读历史，不计作当前生效资产。' : area.name === 'experience' ? '个人经验资料，目录存在不表示已加载为执行模块。' : '只读索引；不修改原文件。'}</p>${table(['条目', '来源', '大小'], area.files.map(f => tr(f.source, [link(f.displayName, f.href), badge(f.source), `${Math.ceil(f.bytes / 1024)} KB`])))}</details>`).join('');
    const groups = [
      ['当前工作与交付', '以课题为主线的输入、会议、日程与交付', ['topics','inbox','meetings','schedule','deliverables','output']],
      ['知识与经验', '项目背景、学习、研究和个人经验', ['memory','learning','research','experience']],
      ['自定义与环境', '个人技能、插件、预设和环境资料；仅文件存在不代表生效', ['custom','plugins','preset','infrastructure','.agents','.codex']],
      ['待复核与归档', '外部导入候选及只读历史', ['staging','archive']],
    ];
    const overview = `<section id="personal-overview"><h2>个人资产概览</h2><p class="note">按用途和生命周期汇总；下方可展开目录明细。已登记技能 ${model.skills.filter(s=>s.management==='local-managed').length} 项，登记后变更 ${model.skills.filter(s=>s.management==='local-changed').length} 项。</p>${table(['资产组','用途','文件数','状态'],groups.map(([title,description,names])=>tr('personal-record',[esc(title),esc(description),String(personal.areas.filter(a=>names.includes(a.name)).reduce((n,a)=>n+a.files.length,0)),names.includes('staging')?'含待复核与归档':'只读索引'])))}<p class="note">目录版本 v${esc(model.catalogVersion)}；本机登记版本 v${esc(model.version)}${model.catalogVersion===model.version?'（一致）':'（不同，请运行升级检查确认）'}。通用候选最近同步：${esc(candidates.fetchedAt || '尚未同步')}。</p></section>`;
    const remote = model.remoteMcps || { status:'unavailable', entries:[] };
    const connectionNames = { 'not-checked':'未探测', 'handshake-response':'收到 MCP 握手响应（未代表客户端已连接）', 'http-response':'服务有响应（协议未验证）', 'auth-required':'需要授权', unreachable:'无法访问', 'server-error':'服务端返回错误' };
    const authNames = { unknown:'未知', unsupported:'客户端不提供', 'oauth':'OAuth', authenticated:'已认证', unauthenticated:'未认证' };
    const qualityText = q => q ? `关联项目（手动指定）：${esc(q.repository || '项目来源未核验')}${q.package ? `<div>发布包：${esc(q.package)}</div>` : ''}${q.stars !== undefined ? `<div>GitHub stars：${esc(q.stars)}</div>` : ''}${q.maintainedAt ? `<div>最近维护：${esc(q.maintainedAt)}</div>` : ''}${q.weeklyDownloads !== undefined ? `<div>npm 近一周下载：${esc(q.weeklyDownloads)}</div>` : ''}${q.advisories !== undefined ? `<div>安全公告：${esc(q.advisories)}</div>` : ''}${q.scorecard !== undefined ? `<div>OpenSSF：${esc(q.scorecard)} / 10</div>` : ''}<div class="note">${sourceIcon(q.source, '证据地址')} · 核对：${esc(q.checkedAt)}</div>` : '互联网质量未核验';
    const remoteRows = remote.entries.map(m => tr('personal-record',[esc(m.name),`${esc(m.purpose)}<div class="note">${sourceIcon(m.origin)} ${esc(m.origin)}</div>`,m.enabled?'已启用配置':'已禁用配置',esc(authNames[m.authStatus]||m.authStatus),`${esc(connectionNames[m.connection.status]||m.connection.status)}<div class="note">${esc(m.connection.checkedAt||'尚未探测')}</div>`,qualityText(m.quality)]));
    const remoteSection = `<section id="remote-mcps"><h2>网上 MCP <small>本地配置与按需探测</small></h2>${metricHelp}<p class="note">配置状态不等于连接成功。只读探测需显式运行 panorama-mcp-check &lt;名称&gt;；生成页面不联网探测。互联网质量证据与内部资产评分分开展示。</p>${remote.status==='available'?(remoteRows.length?table(['MCP','用途 / 来源','配置','授权','最近探测','互联网质量证据'],remoteRows):'<p class="empty">当前 Codex 客户端没有配置网上 MCP。</p>'):'<p class="empty">客户端 MCP 清单不可用，连接状态未知。</p>'}</section>`;
    personalSections = `${topicsSection}${overview}${remoteSection}<section id="local-skills"><h2>技能发现与管理 <small>本地</small></h2><p class="note">中央管理＝中央包；本机已登记＝已校验摘要；仅发现文件＝未登记；登记后已变更＝内容或元数据有变更。登记不等于客户端安装、激活或允许执行。外部目录包含插件缓存，缓存存在只证明文件发现；原生列表为快照，未核验不表示未安装。</p>${table(['技能', '来源', '管理状态', '版本', '客户端列表快照'], skillRows)}</section><section id="local-packs"><h2>个人自定义包</h2>${table(['资产', '类型', '版本', '来源'], personal.localPacks.map(p => tr(p.source, [`${esc(p.displayName)}${purpose(p)}`, esc(typeNames[p.type]), esc(p.version), badge(p.source)])))}</section><section id="config"><h2>生效配置来源</h2>${table(['配置项', '当前值', '来源'], model.config.map(c => tr(c.source.startsWith('preset/') ? 'central-distribution' : 'local-custom', [esc(c.key), esc(c.value), esc(c.source)])))}</section><section id="personal"><h2>个人与自定义资产目录</h2><p class="note">${personal.configured ? '使用已配置个人目录' : '个人存储未配置，当前为 runtime 回退'} · ${personal.exists ? '目录存在' : '目录尚不存在'}。preset 是通用预设的本地副本；custom、经验、记录、候选和归档按来源分别显示。</p>${areas}${personal.warnings.length ? `<p class="warning">${personal.warnings.map(esc).join('<br>')}</p>` : ''}</section>`;
  }
  if(local)personalSections+=`<section id="execution"><h2>执行介入与资产观察 <small>本地回执</small></h2><p class="note">正文交付、原生读取、模型自报和实际工具完成分别统计；未暴露的自动加载、模型 token 与费用保持 unknown。</p>${table(['任务','专业主责','模式/状态','引擎/资产版本','调用/观察/未知','违规/完整性'],model.tasks.map(t=>tr('personal-record',[esc(t.taskId.slice(0,12)),esc(t.role),`${state(t.mode)} / ${state(t.status)}`,`${esc(t.engineVersion)} / ${esc(t.catalogVersion)}`,`${t.calls} / ${t.observed} / ${t.unknown}`,`${t.violations} / ${state(t.integrity)}`])))}<details><summary>近期资产发现与加载事件（最多 100 条）</summary>${table(['事件','资产','来源','时间'],model.assetEvents.map(e=>tr(e.source||'personal-record',[esc(e.kind),esc(e.name||'—'),esc(e.source||'本地'),esc(e.at)])))}</details></section>`;
  if(local) personalSections += `<section id="workflow-runs"><h2>任务组合与节点执行 <small>仅本机</small></h2>${(model.workflows||[]).map(w=>`<details><summary>${esc(w.title)} · ${state(w.status)}</summary><p>实际执行者：${esc(w.actualExecutor)}；任务技能：${w.assets.map(a=>esc(a.id)).join('、')}</p>${table(['节点 / 依赖','技能组合','状态 / 绑定','尝试与证据'],w.nodes.map(n=>tr('personal-record',[`${esc(n.title)}<br>${esc(n.dependsOn.join(' + ')||'起点')}`,n.assets.map(a=>esc(a.id)).join('<br>')||'继承任务组合',`${state(n.status)} / ${esc(n.attempts.at(-1)?.bindingId?'已有原生绑定':n.attempts.at(-1)?.adapter==='command'?'本地命令监督':'未绑定')}`,n.attempts.map(a=>`${esc(a.adapter)} · ${state(a.status)} · exit ${esc(a.exitCode??'未知')}<br>${esc(a.contextDelivery)}<br>${a.outputs.map(o=>esc(o.path+' · '+o.sha256.slice(0,12))).join('<br>')}${a.reason?'<br>'+esc(a.reason):''}`).join('<hr>')||'等待执行'])))}</details>`).join('')||'<p class="empty">暂无本地流程</p>'}</section><section id="skill-candidates"><h2>本地技能升级候选</h2>${table(['技能','版本','复核状态','验证时效','发布 / 安装','质量评分','第三方来源'],(model.skillCandidates||[]).map(c=>tr('pending-review',[`${esc(c.name)}${purpose(c)}`,esc(c.version),state(c.status),state(c.validationState),`${state(c.publication)} / ${state(c.installation)}`,rating(model.localScores?.[skillCandidateIdentity(c)],skillCandidateIdentity(c),c.bundleSha256),c.sources?.length?c.sources.map(source=>sourceEvidence(source,null)).join('<br>'):'原创／来源待核对'])))}</section>`;
  if (local) {
    const weekly = model.weeklyGovernance || {};
    const capacity = weekly.capacity;
    const weeklyText = weekly.error ? `周度状态读取失败：${esc(weekly.error)}` : weekly.pending ?
      `本周资料已冻结，等待 AI 提炼建议；准备窗口截止 ${esc(weekly.pending.through)}。` : weekly.due ?
      '本周尚未完成分析，下一次会话可触发后台提炼。' :
      `本周分析已完成，覆盖至 ${esc(weekly.coveredThrough || '未知')}；候选建议 ${esc(weekly.proposalCount ?? 0)} 条，待人工复核。`;
    const actionNames = { extract: '提炼新候选', merge: '合并进现有知识', observe: '继续观察', audit: '审计优化' };
    const proposalRows = (weekly.proposals || []).map(p => tr('personal-record', [esc(p.title), esc(actionNames[p.action] || p.action), esc(p.reason), esc((p.sources || []).map(s => s.path).join('、'))]));
    personalSections += `<section id="weekly-governance"><h2>每周资料与资产治理 <small>仅本机</small></h2><p>${weeklyText}</p><p class="note">单设备负责汇总；建议不自动发布、激活或删除。原始事件满 30 天仍需核验汇总及任务状态，提炼后原文须进入至少 90 天可恢复期。</p>${capacity ? `<p>个人目录容量：${(capacity.bytes / 1024 ** 2).toFixed(1)} MiB / 1024 MiB 软阈值 · ${capacity.overLimit ? '超出软阈值，建议复核瘦身' : '未超出软阈值'}</p>` : '<p class="note">容量将在本周准备阶段统计。</p>'}${proposalRows.length ? table(['建议', '动作', '依据与限制', '来源文件'], proposalRows) : '<p class="empty">尚无待复核建议。</p>'}</section>`;
  }
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ted-avc-manager · ${local ? '本地' : '通用'}全景图</title><style>*{box-sizing:border-box}body{font:15px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;margin:0;background:#f3f5f8;color:#1c2b3d}header{background:#13283e;color:white;padding:30px max(24px,calc((100% - 1200px)/2))}h1{font-size:27px;margin:0}header p{color:#bfd0e0;margin:8px 0}.wrap{max-width:1200px;padding:24px;margin:auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.card{background:white;border-radius:12px;padding:18px;border:1px solid #dce3eb}.card strong{display:block;font-size:28px}nav{display:flex;flex-wrap:wrap;gap:14px;margin:20px 0}a{color:#1463a0;text-decoration:none}a:hover{text-decoration:underline}section{background:white;border:1px solid #dce3eb;border-radius:12px;padding:22px;margin:20px 0}h2{font-size:21px;margin:0 0 16px}small,.note,.path{font-size:12px;color:#62778c}.path{overflow-wrap:anywhere}h2 small{margin-left:10px}.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th{text-align:left;background:#f2f6fa;color:#50667c}td,th{padding:12px;border-bottom:1px solid #e5eaf0;vertical-align:top}.badge{display:inline-block;border-radius:20px;font-size:11px;padding:3px 9px;white-space:nowrap}.general{background:#e9f1ff;color:#254c87}.personal{background:#f0eafa;color:#62418d}.empty{color:#718296;padding:16px}.metric-help{margin:-8px 0 12px}.metric-help summary{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid #8aa2b8;border-radius:50%;color:#25547a;cursor:pointer;list-style:none;font-weight:bold}.metric-help p{max-width:760px;font-size:12px;color:#50667c}.source-link{white-space:nowrap}.area{margin:14px 0;border-top:1px solid #e5eaf0;padding-top:12px}.area summary{cursor:pointer;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.area strong{margin-left:auto}.filter{display:flex;gap:12px;margin:20px 0}input,select{padding:10px;border:1px solid #ccd6e0;border-radius:8px}input{flex:1}.warning{color:#9a4d10}.hidden{display:none}code{font-size:12px}footer{color:#64778c;font-size:12px;padding:20px 0}</style></head><body><header><h1>ted-avc-manager · ${local ? '本地资产全景图' : '通用资产全景图'}</h1><p>${local ? '通用包、个人资料、自定义技能与生效配置' : '通用目录与公开升级候选'} · 目录资产版本 v${esc(model.catalogVersion || model.version)} · 引擎 v${esc(model.engineVersion)}${local ? ' · 本机登记版本 v'+esc(model.version) : ''}</p><p>目录来源：${model.catalog.source === 'verified-release' ? '已核验发布快照 ' + esc(model.catalog.ref) : '工作副本（未核验为发布快照）'} · 生成于 ${esc(model.generatedAt)}</p></header><main class="wrap"><div class="cards"><div class="card"><strong>${model.general.length}</strong>通用包</div>${local ? `<div class="card"><strong>${model.topics?.topics.length || 0}</strong>用户课题</div><div class="card"><strong>${model.topics?.unlinkedCount ?? 0}</strong>旧资料待关联</div><div class="card"><strong>${model.skills.filter(s => s.management === 'local-managed').length}</strong>已登记本地技能</div>` : ''}<div class="card"><strong>${candidates.status === 'available' ? candidates.entries.length : '未知'}</strong>通用升级候选 PR</div></div><nav><a href="#shared">公共能力</a><a href="#workflows">流程模板</a><a href="#skill">技能</a><a href="#knowledge">知识</a><a href="#role">中文专业岗位</a><a href="#framework">框架</a><a href="#candidates">候选 PR</a>${local ? '<a href="#local-skills">本地技能管理</a><a href="#remote-mcps">网上 MCP</a><a href="#config">配置来源</a><a href="#topics">用户课题</a><a href="#personal-overview">个人资产概览</a><a href="#weekly-governance">每周治理</a><a href="#personal">个人资产明细</a>' : ''}</nav><div class="filter"><input id="search" type="search" placeholder="搜索资产、用途、适用场景、职业、PR"><select id="origin"><option value="all">全部来源</option><option value="general">通用资产</option>${local ? '<option value="personal">本地个人资产</option>' : ''}</select></div>${model.errors.length ? `<p class="warning">${model.errors.map(esc).join('<br>')}</p>` : ''}${sharedSection}${templatesSection}${packSections}${knowledgeSection}${candidateSection}${personalSections}<footer>通用包、自定义包、个人文件和 PR 使用不同计数口径。课题内的旧资料副本保留原路径，目录文件数包含副本。历史与暂存不自动激活，公开候选不计入发布版本。Hook 与台账的运行事实另行验收。</footer></main><script>const normalizeQuery=${normalizeQuery.toString()};const search=document.getElementById('search'),origin=document.getElementById('origin');function filter(){const term=normalizeQuery(search.value);document.querySelectorAll('tbody tr[data-origin]').forEach(row=>row.classList.toggle('hidden',!term.split(' ').every(t=>normalizeQuery(row.textContent+' '+row.dataset.search).includes(t))||(origin.value!=='all'&&row.dataset.origin!==origin.value)));if(term)document.querySelectorAll('.area').forEach(area=>{area.open=Array.from(area.querySelectorAll('tr[data-origin]')).some(row=>!row.classList.contains('hidden'))})}search.addEventListener('input',filter);origin.addEventListener('change',filter);</script></body></html>`;
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
