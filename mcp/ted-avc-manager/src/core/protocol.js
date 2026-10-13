// protocol.js —— 命令协议：github:// URI 解析 + 意图映射（FR-3：确定性代码，不靠模型猜）

const URI_RE = /(?:github:\/\/|github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:@([A-Za-z0-9_.\-]+))?/;

export function parseGithubUri(text) {
  const m = URI_RE.exec(String(text));
  if (!m) return null;
  const owner = m[1];
  const repo = m[2];
  const ref = m[3] || null;
  return { owner, repo, ref, uri: `github://${owner}/${repo}${ref ? `@${ref}` : ''}` };
}

export function mapIntent(text) {
  const t = String(text);
  if (/生成全景图|全景图/.test(t)) return 'panorama';
  if (/体检|doctor/i.test(t)) return 'doctor';
  if (/配置|config/i.test(t)) return 'config';
  if (/导入|import[- ]?scan/i.test(t)) return 'import-scan';
  if (/绑定|bind/i.test(t)) return 'bind';
  if (/同步|回传/.test(t)) return 'sync';
  // 检查须在升级前：「检查更新」= check（dry-run），仅「升级/更新」才是 upgrade（docs/03 动作词表）
  if (/检查|check/i.test(t)) return 'check';
  if (/升级|更新|upgrade/i.test(t)) return 'upgrade';
  if (/初始化|安装|init|mcp/i.test(t)) return 'init';
  return null;
}

export function parseCommand(input) {
  const uri = parseGithubUri(input);
  const intent = mapIntent(input);
  if (!uri) throw new Error(`未识别到 github:// 地址: "${input}"`);
  if (!intent) throw new Error(`未识别到动作词（支持：初始化/安装、升级、检查、同步、生成全景图、体检/doctor、配置/config、导入/import-scan、绑定/bind）: "${input}"`);
  return { uri, intent };
}
