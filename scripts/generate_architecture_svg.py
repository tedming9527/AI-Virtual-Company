#!/usr/bin/env python3
"""Generate the single current architecture diagram from the repository catalog."""
from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/assets/architecture.svg"
VERSION = json.loads((ROOT / "bootstrap.json").read_text())["version"]
TYPES = ("skill", "knowledge", "framework", "role")
COUNTS = {
    kind: sum((name / "meta.json").is_file()
              for name in (ROOT / "packs" / kind).iterdir() if name.is_dir())
    for kind in TYPES
}
W, H = 1280, 1280
FONT = "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif"
parts = []

def add(value):
    parts.append(value)

def rect(x, y, w, h, fill, stroke, radius=14, width=1.6):
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>')

def label(x, y, value, size=13, color="#334155", weight=400, anchor=None):
    extra = f' text-anchor="{anchor}"' if anchor else ""
    add(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" '
        f'fill="{color}" font-family="{FONT}"{extra}>{escape(value)}</text>')

def card(x, y, w, h, title, lines, fill, stroke, title_color="#0f172a",
         title_size=16, body_size=13, step=26):
    rect(x, y, w, h, fill, stroke)
    label(x + 18, y + 31, title, title_size, title_color, 700)
    for index, line in enumerate(lines):
        label(x + 18, y + 61 + index * step, line, body_size)

def arrow(x1, y1, x2, y2, color="#64748b", width=2):
    add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
        f'stroke="{color}" stroke-width="{width}" marker-end="url(#arrow)"/>')

add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="title desc">')
add('<title id="title">AI-Virtual-Company 现行架构：责任、目录契约与资产升级</title>')
add('<desc id="desc">展示系统代码、大模型和人工的责任边界；中央、个人与运行时目录契约；资产发现、统计、提炼、复核、发布及本地公开视图隔离。</desc>')
add('<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L8 4 L0 8 Z" fill="#64748b"/></marker></defs>')
add(f'<rect width="{W}" height="{H}" fill="#f8fafc"/>')
label(40, 45, "AI-Virtual-Company · 现行架构", 28, "#0f172a", 800)
label(40, 72, f"中央目录 v{VERSION}  |  一张图看清责任、目录与升级  |  实线表示流程关系，不代表每步都已自动化", 14, "#475569")

label(40, 111, "谁负责什么", 19, "#0f172a", 700)
card(40, 128, 390, 206, "系统代码 · 可重复的确定性动作", [
    "扫描目录并校验 meta、入口、版本和摘要",
    "绑定任务，观察宿主可见的 Pre/Post 事件",
    "按窗口去重统计；证据不足显示“未评分”",
    "生成本地/公开全景图并隔离私有字段",
    "不推断满意度，也不自动批准发布",
], "#e0f2fe", "#0284c7", "#075985")
card(445, 128, 390, 206, "大模型 · 需要语义判断的工作", [
    "按需读取资料，检索同课题及必要来源",
    "比较新旧知识、冲突、反例和适用边界",
    "合并提炼经验，提出候选和未覆盖清单",
    "建议升级、降级或审计；结论留待复核",
    "模型是否实际参与，以运行产物为证",
], "#f5f3ff", "#7c3aed", "#6d28d9")
card(850, 128, 390, 206, "用户与人工复核 · 决策和信任门", [
    "确定课题、授权范围与长期保存选择",
    "审查来源、脱敏、覆盖映射和候选差异",
    "批准个人资料清理及通用包 PR",
    "人审合并 master；CI 通过后发布",
    "岗位标签不等于具名员工实际参与",
], "#fff7ed", "#ea580c", "#9a3412")

label(40, 374, "目录契约：文件身份由位置与元数据共同确定", 19, "#0f172a", 700)
card(40, 393, 390, 310, "中央仓库 · 通用事实源", [
    "packs/<type>/<name>/：四类包自动发现",
    "每包 meta.json + SKILL/PROFILE 等入口",
    f"当前 {sum(COUNTS.values())} 包：skill {COUNTS['skill']} / knowledge {COUNTS['knowledge']}",
    f"framework {COUNTS['framework']} / role {COUNTS['role']}",
    "bootstrap.json 与 presets/ 定义有序下发",
    "rules/ 定跨包规则；模板由 templates/ 承载",
    "mcp/ 引擎；docs/、scripts/ 实现与说明",
    "panorama/ 容纳公开视图；PR 经人审发布",
], "#dbeafe", "#2563eb", "#1d4ed8", body_size=12.5, step=29)
card(445, 393, 390, 310, "个人目录 · 私有课题与候选", [
    "projects/<slug>/topics/<topic-id>/ 是主入口",
    "topic.json 关联会话和课题生命周期",
    "课题内按 memory / meetings / deliverables",
    "及 experience 等用途组织；长期资料可同步",
    "custom/ 自有资产；外部先入 staging/",
    "未提炼经验继续保留，复核后才处理",
    "archive/ 历史；discard/ 受清理门禁约束",
    "个人正文、路径和使用记录不进入 Git",
], "#dcfce7", "#16a34a", "#15803d", body_size=12.5, step=29)
card(850, 393, 390, 310, "运行态 · 同步元数据与本机缓存分离", [
    "仓库 runtime/：应只留轻量元数据与视图",
    "原始事件先汇总核验；30 天是最早可删",
    "活动任务与未完成回执不得直接清理",
    "大缓存、临时副本、node_modules 不进 iCloud",
    "正式长期源码与锁文件留在课题或项目",
    "联网 MCP 只按需做只读连接探测",
    "宿主沙箱、工具审批继续生效",
    "本机 Hook 不等于完整模型监督",
], "#ffedd5", "#ea580c", "#c2410c", body_size=12.5, step=29)

label(40, 748, "升级流程：从证据到建议，再由人决定", 19, "#0f172a", 700)
stages = [
    ("① 来源发现 · 系统", ["通用包 / custom / 经验", "外部资产先入 staging/", "记录身份、版本、摘要"]),
    ("② 使用证据 · 系统", ["加载、采用、结果、反馈", "分开计数；按窗口去重", "样本不足＝未评分"]),
    ("③ 知识提炼 · 模型", ["比较旧资料与新来源", "合并、补全、列未覆盖项", "无模型回执则保持待处理"]),
    ("④ 候选复核 · 人工", ["个人：本地演化与复核", "通用：冻结内容并脱敏", "旧分数不沿用新摘要"]),
    ("⑤ 发布门禁 · 人工/CI", ["通用 PR → 人审合并", "master → CI → tag/Release → Pages", "个人资料不自动上传"]),
    ("⑥ 再观察 · 系统/模型", ["新版本重新积累证据", "建议升级 / 降级 / 审计", "不自动改资产或删原文"]),
]
for i, (title, lines) in enumerate(stages):
    x = 40 + i * 202
    card(x, 768, 190, 178, title, lines, "#ffffff", "#a78bfa", "#5b21b6",
         title_size=15, body_size=11.5, step=29)
    if i < len(stages) - 1:
        arrow(x + 190, 858, x + 201, 858, "#7c3aed", 2)
label(40, 973, "周度 prepare/complete 与统计已实现；自动子代理完成、满意度归因、外部来源结论和真人复核均须分别取证。", 13, "#6d28d9", 600)

label(40, 1022, "同一展示逻辑，两种数据范围", 19, "#0f172a", 700)
card(40, 1040, 580, 112, "本地全景图 · runtime/panorama/", [
    "通用资产 + 私有课题索引 + 自定义资产 + 本机证据",
    "候选与已发布分开；配置不等于连接，探测按需触发",
], "#e0f2fe", "#0284c7", "#075985", title_size=15, body_size=12.5, step=25)
card(660, 1040, 580, 112, "公开全景图 · panorama/ → Pages", [
    "只读已发布 tag 与公开候选 PR 固定提交元数据",
    "不读取个人正文、路径、连接状态或私有评分",
], "#dbeafe", "#2563eb", "#1d4ed8", title_size=15, body_size=12.5, step=25)
label(40, 1193, "证据边界：发现 ≠ 加载 ≠ 实际采用 ≠ 业务验收；Hook 回执、模型建议、用户批准与发布版本分别记录。", 13, "#475569")
add("</svg>")
OUT.write_text("\n".join(parts) + "\n", encoding="utf-8")
print("written:", OUT)
