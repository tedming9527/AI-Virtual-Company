// semver.js —— 语义化版本解析/比较/递增（FR-4）

export function parse(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(v).trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] || null };
}

export function format(v) {
  return `${v.major}.${v.minor}.${v.patch}${v.pre ? `-${v.pre}` : ''}`;
}

export function compare(a, b) {
  const A = parse(a);
  const B = parse(b);
  if (!A || !B) throw new Error(`invalid semver: ${a} vs ${b}`);
  if (A.major !== B.major) return A.major - B.major;
  if (A.minor !== B.minor) return A.minor - B.minor;
  if (A.patch !== B.patch) return A.patch - B.patch;
  if (A.pre === null && B.pre === null) return 0;
  if (A.pre !== null && B.pre !== null) return A.pre.localeCompare(B.pre);
  return A.pre === null ? 1 : -1; // 无 pre 大于有 pre
}

// 判断 a 相对 b 的升级类别：'none' | 'patch' | 'minor' | 'major'
export function diffKind(a, b) {
  const A = parse(a);
  const B = parse(b);
  if (!A || !B) throw new Error(`invalid semver: ${a} vs ${b}`);
  if (A.major !== B.major) return 'major';
  if (A.minor !== B.minor) return 'minor';
  if (A.patch !== B.patch) return 'patch';
  return 'none';
}

export function bump(v, kind) {
  const p = parse(v);
  if (!p) throw new Error(`invalid semver: ${v}`);
  if (kind === 'patch') p.patch += 1;
  else if (kind === 'minor') { p.minor += 1; p.patch = 0; }
  else if (kind === 'major') { p.major += 1; p.minor = 0; p.patch = 0; }
  else throw new Error(`unknown bump kind: ${kind}`);
  p.pre = null;
  return format(p);
}
