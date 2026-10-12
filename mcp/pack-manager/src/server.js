// server.js —— 对外薄 MCP 适配器（FR-9/FR-3）：把 pack-manager 能力暴露为标准 MCP 工具
// 内部核心链路仍为直连（无协议层）；本层仅服务「对接新模式 / 第三方 MCP 客户端」。

import { createInterface } from 'node:readline';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanPacks } from './core/scan.js';
import { flowCheck, flowUpgrade, flowPanorama, flowSync } from './core/flows.js';
import { validateLog } from './governance/schema.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const TOOLS = [
  { name: 'list_packs', description: '列出全部技能包（目录规约扫描，约定大于配置）', inputSchema: { type: 'object', properties: {} } },
  { name: 'check_update', description: '检查当前版本与中央最新版本差异', inputSchema: { type: 'object', properties: {} } },
  { name: 'upgrade', description: '升级到中央最新版本（major 需 force 人审）', inputSchema: { type: 'object', properties: { force: { type: 'boolean' } } } },
  { name: 'generate_panorama', description: '生成全景图 HTML（panorama/）', inputSchema: { type: 'object', properties: {} } },
  { name: 'submit_log', description: '校验并暂存使用日志（免审合并前提：过 schema 校验门）', inputSchema: { type: 'object', properties: { log: { type: 'object' } } } },
];

export function start() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

  rl.on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.method === 'initialize') {
      respond(msg.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'pack-manager', version: VERSION } });
      return;
    }
    if (msg.method === 'notifications/initialized' || msg.method === 'notifications/cancelled') return;
    if (msg.method === 'tools/list') { respond(msg.id, { tools: TOOLS }); return; }
    if (msg.method === 'tools/call') { handleCall(msg.id, msg.params || {}); return; }
    if (msg.method) respondError(msg.id, -32601, `unknown method: ${msg.method}`);
  });

  function respond(id, result) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
  }
  function respondError(id, code, message) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
  }

  function handleCall(id, params) {
    const ROOT = process.cwd();
    const name = params.name;
    const args = (params.arguments) || {};
    try {
      let text;
      if (name === 'list_packs') {
        const { packs, errors } = scanPacks(ROOT);
        text = JSON.stringify({ packs: packs.map((p) => ({ type: p.type, name: p.name, displayName: p.displayName,
          ...(p.type === 'role' ? { nameZh: p.nameZh, professionZh: p.professionZh } : {}), version: p.version, status: p.status })), errors });
      } else if (name === 'check_update') {
        text = flowCheck(ROOT).summary;
      } else if (name === 'upgrade') {
        text = flowUpgrade(ROOT, { force: !!args.force }).summary;
      } else if (name === 'generate_panorama') {
        text = flowPanorama(ROOT, {}).summary;
      } else if (name === 'submit_log') {
        const r = validateLog(args.log);
        if (!r.valid) throw new Error(`日志校验未通过: ${r.errors.join('; ')}`);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const dir = join(ROOT, 'runtime', 'logs');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `usage-${ts}.json`), JSON.stringify(args.log, null, 2) + '\n', 'utf8');
        text = `日志已校验通过并暂存。${flowSync(ROOT).summary}`;
      } else {
        throw new Error(`unknown tool: ${name}`);
      }
      respond(id, { content: [{ type: 'text', text }] });
    } catch (e) {
      respondError(id, -32603, e.message);
    }
  }
}
