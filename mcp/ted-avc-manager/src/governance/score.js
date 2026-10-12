// score.js —— 评分融合（FR-8：LLM 静态分 + 用户实证分，分开存、挂版本）

// quality = wL * llm + wE * empirical(样本校正)
// 样本量 < minSample 时实证分权重衰减（防小样本噪声）
const W_LLM = 0.4;
const W_EMP = 0.6;
const MIN_SAMPLE = 20;

export function mergeScore({ llm, empirical }) {
  if (typeof llm !== 'number' || llm < 0 || llm > 5) throw new Error('llm 分必须为 0~5 数字');
  const sample = Math.max(0, empirical.sampleSize || 0);
  const successRate = Math.min(1, Math.max(0, empirical.successRate || 0));
  const avgScore = Math.min(5, Math.max(0, empirical.avgScore || 0));
  const emp = 0.6 * (successRate * 5) + 0.4 * avgScore;

  let wE = W_EMP;
  let provisional = sample < MIN_SAMPLE;
  if (provisional) wE = W_EMP * (sample / MIN_SAMPLE);

  const quality = Math.round(((W_LLM * llm + wE * emp) / (W_LLM + wE)) * 100) / 100;
  return { quality, provisional, sampleSize: sample, note: provisional ? '样本量不足，为临时分' : null };
}

// 异常触发：成功率骤降超过阈值（相对上一周期）
export function detectAnomaly(prev, curr) {
  const prevRate = prev && prev.successRate ? prev.successRate : null;
  const currRate = curr && curr.successRate ? curr.successRate : 0;
  if (prevRate === null) return { triggered: false };
  const drop = prevRate - currRate;
  if (drop >= 0.2) {
    return { triggered: true, drop: Math.round(drop * 100) / 100, message: `成功率骤降 ${Math.round(drop * 100)}% ，立即触发治理分析` };
  }
  return { triggered: false };
}
