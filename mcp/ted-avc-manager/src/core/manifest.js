// manifest.js —— bootstrap / pack meta 读取与校验（FR-1/FR-10：校验门真实生效）

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`JSON 解析失败: ${file} —— ${err.message}`);
  }
}

const REQUIRED_BOOTSTRAP = ['name', 'version'];

export function validateBootstrap(json) {
  const errors = [];
  if (!json) return { valid: false, errors: ['bootstrap.json 缺失'] };
  for (const k of REQUIRED_BOOTSTRAP) {
    if (typeof json[k] !== 'string' || !json[k]) errors.push(`bootstrap 缺少必填字段: ${k}`);
  }
  if (json.update && typeof json.update !== 'object') errors.push('bootstrap.update 必须是对象');
  return { valid: errors.length === 0, errors };
}

export function validatePackMeta(meta, typeDir, { requireDescription = false } = {}) {
  const errors = [];
  if (!meta) return { valid: false, errors: [`${typeDir} 缺少 meta.json`] };
  if (typeof meta.type !== 'string') errors.push('meta.type 必填');
  if (typeof meta.name !== 'string' || !meta.name) errors.push('meta.name 必填');
  if (typeof meta.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(meta.version)) {
    errors.push(`meta.version 必须为 x.y.z: ${meta.version}`);
  }
  if (!Array.isArray(meta.rubric) || meta.rubric.length === 0) {
    errors.push('meta.rubric 必须为非空数组（评分维度）');
  }
  for (const key of ['aliases', 'keywords']) {
    if (meta[key] !== undefined && (!Array.isArray(meta[key]) || meta[key].length > 32 || meta[key].some(v => typeof v !== 'string' || !v.trim() || v.length > 100 || /[\r\n]/.test(v)))) errors.push(`meta.${key} 必须为最多 32 个单行短语`);
  }
  if (requireDescription) {
    if (typeof meta.description !== 'string' || !meta.description.trim() || meta.description.length > 160 || /[\r\n]/.test(meta.description)) {
      errors.push('meta.description 必须为 1–160 字的单行用途说明');
    }
  }
  if (meta.type === 'role') {
    for (const field of ['nameZh', 'professionZh']) {
      if (typeof meta[field] !== 'string' || !/[\u4e00-\u9fff]/.test(meta[field])) errors.push(`role.meta.${field} 必须包含中文`);
    }
    if (meta.displayName !== `${meta.nameZh}·${meta.professionZh}`) errors.push('role.meta.displayName 必须为中文名字·职业');
  }
  return { valid: errors.length === 0, errors };
}
