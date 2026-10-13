// schema.js —— 使用日志 schema 校验门（FR-8：免审自动合并的唯一前提）

// 允许字段白名单（只上报聚合指标，拒绝原文/敏感内容/注入）
const ALLOWED = new Set(['schema', 'skill', 'type', 'version', 'ts', 'outcome', 'duration', 'attribution', 'meta']);
const OUTCOMES = new Set(['success', 'fail']);
const MAX_STR = 200;
const MAX_ATTR = 20;

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function validSemver(v) {
  return typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v);
}

function validTs(v) {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

export function validateLog(entry) {
  const errors = [];
  if (!isPlainObject(entry)) return { valid: false, errors: ['日志必须是对象'] };
  if (entry.schema !== 'usage-log/v1') errors.push('schema 必须为 usage-log/v1');

  for (const key of Object.keys(entry)) {
    if (!ALLOWED.has(key)) errors.push(`字段不在白名单内: ${key}（只上报聚合指标）`);
  }

  if (typeof entry.skill !== 'string' || !entry.skill) errors.push('skill 必填（字符串）');
  if (entry.type && entry.type !== 'usage') errors.push('type 必须为 usage');
  if (!validSemver(entry.version)) errors.push('version 必须为 x.y.z');
  if (!validTs(entry.ts)) errors.push('ts 必须为可解析时间');
  if (!OUTCOMES.has(entry.outcome)) errors.push('outcome 必须为 success|fail');

  if (typeof entry.duration !== 'undefined') {
    if (typeof entry.duration !== 'number' || entry.duration < 0 || entry.duration > 86400) {
      errors.push('duration 必须为 0~86400 的数字（秒）');
    }
  }

  if (typeof entry.attribution !== 'undefined') {
    if (!Array.isArray(entry.attribution) || entry.attribution.length > MAX_ATTR) {
      errors.push(`attribution 必须为数组且 ≤${MAX_ATTR} 条`);
    } else {
      for (const a of entry.attribution) {
        if (typeof a !== 'string' || a.length > MAX_STR || /[\x00-\x1f<>]/.test(a)) {
          errors.push('attribution 条目必须为普通短文本（无控制符/尖括号，防注入）');
        }
      }
    }
  }

  if (typeof entry.meta !== 'undefined' && !isPlainObject(entry.meta)) errors.push('meta 必须为对象');

  return { valid: errors.length === 0, errors };
}

// 批量校验（CI 校验门入口：任一非法即整体拒绝）
export function validateLogs(list) {
  if (!Array.isArray(list)) return { valid: false, errors: ['日志集合必须是数组'] };
  const allErrors = [];
  let validCount = 0;
  list.forEach((e, i) => {
    const r = validateLog(e);
    if (r.valid) validCount += 1;
    else allErrors.push(`[${i}] ${r.errors.join('; ')}`);
  });
  return { valid: allErrors.length === 0, validCount, total: list.length, errors: allErrors };
}
