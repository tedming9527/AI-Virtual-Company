// generate.js —— 全景图生成器（FR-9）：扫描目录规约 → 聚合 meta.json+评分台账 → 渲染 HTML

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanPacks, readBootstrap } from '../core/scan.js';
import { readLock } from '../core/lockfile.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generatePanorama(root, opts = {}) {
  const { packs, errors } = scanPacks(root);
  const bootstrap = readBootstrap(root);
  const lock = readLock(opts.runtimeDir || join(root, 'runtime'));
  const version = opts.version || lock.current || bootstrap.version;

  // 评分台账（存在才渲染，聚合指标）
  let scores = {};
  const scoresFile = opts.scoresFile || join(root, 'runtime', 'scores.json');
  if (existsSync(scoresFile)) {
    try { scores = JSON.parse(readFileSync(scoresFile, 'utf8')); } catch { scores = {}; }
  }

  const byType = { skill: [], knowledge: [], framework: [], role: [] };
  for (const p of packs) byType[p.type].push(p);

  const typeLabel = { skill: '可执行技能（tool）', knowledge: '专业知识（resource）', framework: '框架 / 规则', role: '专业角色包（employee）' };

  const table = (type) => {
    const rows = byType[type].map((p) => {
      const s = scores[p.name] || {};
      const score = typeof s.quality === 'number' ? `${s.quality}${s.provisional ? '（临时）' : ''}` : '—';
      return `<tr><td>${esc(p.displayName || p.name)}${p.type === 'role' ? `<br><small>${esc(p.name)}</small>` : ''}</td><td>v${esc(p.version)}</td><td>${esc(p.status)}</td><td>${esc(p.rubric.join(' / '))}</td><td>${esc(score)}</td></tr>`;
    }).join('');
    return rows || `<tr><td colspan="5" style="color:#6b7280">（无）</td></tr>`;
  };

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI-Virtual-Company · 项目全景图</title>
<style>
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;margin:0;background:#f7f8fa;color:#1f2937;}
.wrap{max-width:960px;margin:0 auto;padding:24px;}
h1{font-size:24px;} .ver{display:inline-block;background:#1d4ed8;color:#fff;border-radius:6px;padding:2px 10px;font-size:14px;}
h2{font-size:18px;margin-top:28px;border-left:4px solid #3b82f6;padding-left:10px;}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;}
th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left;font-size:14px;}
th{background:#eff6ff;}
.note{color:#6b7280;font-size:13px;margin-top:8px;}
.sec{background:#fff;border-radius:8px;padding:14px 16px;margin-top:12px;}
</style>
</head>
<body>
<div class="wrap">
<h1>AI-Virtual-Company · 项目全景图 <span class="ver">当前版本 v${esc(version)}</span></h1>
<p class="note">由 pack-manager 自动生成（扫描目录规约 + 聚合 meta.json 与评分台账）。生成器与 tag 版本绑定。</p>

<h2>可执行技能（skill）</h2>
<table><tr><th>名称</th><th>版本</th><th>状态</th><th>评分维度</th><th>质量分</th></tr>${table('skill')}</table>

<h2>专业知识（knowledge）</h2>
<table><tr><th>名称</th><th>版本</th><th>状态</th><th>评分维度</th><th>质量分</th></tr>${table('knowledge')}</table>

<h2>框架 / 规则（framework）</h2>
<table><tr><th>名称</th><th>版本</th><th>状态</th><th>评分维度</th><th>质量分</th></tr>${table('framework')}</table>

<h2>专业角色包（role）</h2>
<table><tr><th>名称</th><th>版本</th><th>状态</th><th>评分维度</th><th>质量分</th></tr>${table('role')}</table>

<div class="sec"><strong>使用指南：</strong>包入口位于 <code>packs/&lt;类型&gt;/&lt;名称&gt;/SKILL.md</code>（role 也可使用 PROFILE.md）；全局规则见 <code>rules/base.md</code>；初始化入口见 <code>bootstrap.json</code>（约定大于配置，新增包即建目录自动被发现）。</div>
</div>
</body>
</html>
`;

  const outDir = opts.outDir || join(root, 'panorama');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'index.html');
  writeFileSync(outFile, html, 'utf8');
  return outFile;
}
