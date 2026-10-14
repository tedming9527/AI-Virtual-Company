// Privacy-limited, asset-version-bound observations. No prompts, paths or free text.
const TYPES = new Set(['skill', 'knowledge', 'framework', 'role']);
const SOURCES = new Set(['general', 'local-custom']);
const SIGNALS = new Set(['delivered', 'read-completed', 'model-reported', 'adopted', 'outcome', 'feedback']);
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/;
const WINDOW = 7 * 86400000;
const versioned = value => typeof value === 'string' && (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value);

export function validateUsageEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('事件必须是对象');
  const allowed = new Set(['schema', 'eventId', 'asset', 'taskId', 'answerSha256', 'signal', 'value', 'observedAt', 'attribution', 'evidenceId']);
  if (Object.keys(event).some(key => !allowed.has(key))) throw new Error('事件包含不允许字段');
  if (event.schema !== 'avc.asset-usage.v2' || !ID.test(event.eventId || '') || !ID.test(event.taskId || '')) throw new Error('事件身份无效');
  const a = event.asset;
  if (!a || typeof a !== 'object' || Array.isArray(a) || Object.keys(a).some(key => !['source', 'type', 'id', 'version', 'bundleSha256'].includes(key)) ||
    !SOURCES.has(a.source) || !TYPES.has(a.type) || !ID.test(a.id || '') || !versioned(a.version) || !HASH.test(a.bundleSha256 || '')) throw new Error('资产身份或摘要无效');
  if (!SIGNALS.has(event.signal) || !Number.isFinite(Date.parse(event.observedAt || ''))) throw new Error('信号或时间无效');
  if (event.answerSha256 !== undefined && !HASH.test(event.answerSha256)) throw new Error('答案摘要无效');
  if (event.signal === 'outcome' && !['success', 'fail'].includes(event.value)) throw new Error('结果必须可核验');
  if (event.signal === 'feedback' && (!Number.isInteger(event.value) || event.value < 0 || event.value > 5 || !event.answerSha256)) throw new Error('反馈须为绑定答案的 0~5 分');
  if (['outcome', 'feedback'].includes(event.signal) && (event.attribution !== 'verified' || !ID.test(event.evidenceId || ''))) throw new Error('结果与反馈须有独立归因证据');
  if (!['outcome', 'feedback'].includes(event.signal) && (event.attribution !== undefined || event.evidenceId !== undefined)) throw new Error('此信号不接受归因声明');
  if (!['outcome', 'feedback'].includes(event.signal) && event.value !== undefined) throw new Error('此信号不接受分值');
  return event;
}

export function assetKey(asset) { return `${asset.source}:${asset.type}/${asset.id}@${asset.version}#${asset.bundleSha256}`; }

export function summarizeUsage(events, { from, through }) {
  const start = Date.parse(from), end = Date.parse(through);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > WINDOW) throw new Error('窗口必须为不超过七天的半开区间');
  const groups = new Map(), seen = new Set();
  for (const raw of events) {
    const e = validateUsageEvent(raw), time = Date.parse(e.observedAt);
    if (time < start || time >= end) continue;
    if (seen.has(e.eventId)) continue;
    seen.add(e.eventId);
    const key = assetKey(e.asset);
    if (!groups.has(key)) groups.set(key, { asset: e.asset, delivered: new Set(), readCompleted: new Set(), modelReported: new Set(), adopted: new Set(), outcomes: new Map(), feedback: new Map() });
    const g = groups.get(key);
    if (e.signal === 'delivered') g.delivered.add(e.taskId);
    if (e.signal === 'read-completed') g.readCompleted.add(e.taskId);
    if (e.signal === 'model-reported') g.modelReported.add(e.taskId);
    if (e.signal === 'adopted') g.adopted.add(e.taskId);
    // Outcome and feedback are admitted only when the upstream recorder has
    // verified contribution. Unattributed task outcomes stay task-level.
    if (e.signal === 'outcome') g.outcomes.set(e.taskId, e.value);
    if (e.signal === 'feedback') g.feedback.set(`${e.taskId}:${e.answerSha256}`, e.value);
  }
  const assets = {};
  for (const [key, g] of groups) {
    const results = [...g.outcomes.values()], ratings = [...g.feedback.values()];
    const sampleSize = results.length, feedbackCount = ratings.length;
    assets[key] = { asset: g.asset, delivered: g.delivered.size, readCompleted: g.readCompleted.size,
      modelReported: g.modelReported.size, adopted: g.adopted.size, sampleSize,
      successRate: sampleSize ? results.filter(v => v === 'success').length / sampleSize : null,
      feedbackCount, avgFeedback: feedbackCount ? ratings.reduce((a, b) => a + b, 0) / feedbackCount : null };
  }
  return { schema: 'avc.asset-usage-rollup.v1', from, through, eventCount: seen.size, assets };
}

export function proposeGovernance(rollup, previous = {}) {
  const suggestions = [];
  for (const [key, current] of Object.entries(rollup.assets)) {
    if (current.sampleSize < 20) {
      suggestions.push({ assetKey: key, action: 'audit', reason: '实证样本不足，需继续观察', status: 'review-only' });
      continue;
    }
    const prior = previous[key];
    if (prior?.successRate !== null && prior?.successRate !== undefined && prior.sampleSize >= 20 && prior.successRate - current.successRate >= 0.2)
      suggestions.push({ assetKey: key, action: 'audit', reason: '成功率较上一窗口下降至少 20 个百分点', status: 'review-only' });
    else if (current.successRate < 0.5) suggestions.push({ assetKey: key, action: 'optimize', reason: '可归因结果成功率偏低', status: 'review-only' });
    else if (current.successRate >= 0.85 && current.adopted >= 3) suggestions.push({ assetKey: key, action: 'consider-upgrade', reason: '多任务采用且可归因结果稳定', status: 'review-only' });
  }
  return suggestions;
}
