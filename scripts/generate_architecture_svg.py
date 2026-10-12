#!/usr/bin/env python3
# 生成架构全景图 v3（docs/assets/architecture-v3.svg）
# 用法：python3 scripts/generate_architecture_svg.py
import os, html, json

W, H = 1280, 1060
ROOT = os.path.join(os.path.dirname(__file__), '..')
COUNTS = {t: sum(os.path.isfile(os.path.join(ROOT,'packs',t,n,'meta.json')) for n in os.listdir(os.path.join(ROOT,'packs',t))) for t in ['skill','knowledge','framework','role']}
OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "assets", "architecture-v3.svg")

with open(os.path.join(os.path.dirname(__file__), '..', 'bootstrap.json')) as f:
    VERSION = json.load(f)['version']

parts = []
def add(s): parts.append(s)

FONT = "font-family='-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif'"

def box(x, y, w, h, title, items, fill, stroke, tcolor="#0f172a", title_size=15,
        item_size=12, title_fill=None):
    tf = title_fill or fill
    add(f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='10' fill='{fill}' stroke='{stroke}' stroke-width='1.5'/>")
    add(f"<rect x='{x}' y='{y}' width='{w}' height='30' rx='10' fill='{tf}'/>")
    add(f"<rect x='{x}' y='{y+15}' width='{w}' height='15' fill='{tf}'/>")
    add(f"<text x='{x+12}' y='{y+20}' font-size='{title_size}' font-weight='700' fill='{tcolor}' {FONT}>{html.escape(title)}</text>")
    yy = y + 50
    for it in items:
        if it.startswith("##"):
            add(f"<text x='{x+12}' y='{yy}' font-size='{item_size}' font-weight='700' fill='{stroke}' {FONT}>{html.escape(it[2:].strip())}</text>")
        else:
            add(f"<text x='{x+12}' y='{yy}' font-size='{item_size}' fill='#334155' {FONT}>{html.escape(it)}</text>")
        yy += 19

def arrow(x1, y1, x2, y2, color="#64748b", w=2, dash=None, label=None):
    d = f" stroke-dasharray='{dash}'" if dash else ""
    add(f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='{color}' stroke-width='{w}'{d} marker-end='url(#arr)'/>")
    if label:
        add(f"<text x='{(x1+x2)/2+6}' y='{(y1+y2)/2-4}' font-size='11' fill='{color}' {FONT}>{html.escape(label)}</text>")

# ---------- 画布 ----------
add(f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' width='{W}' height='{H}'>")
add("<defs><marker id='arr' markerWidth='9' markerHeight='9' refX='7' refY='3' orient='auto' markerUnits='strokeWidth'><path d='M0,0 L7,3 L0,6 z' fill='#64748b'/></marker></defs>")
add(f"<rect width='{W}' height='{H}' fill='#f8fafc'/>")
add(f"<text x='30' y='38' font-size='24' font-weight='800' fill='#0f172a' {FONT}>AI-Virtual-Company · 架构与执行边界 v4</text>")
add(f"<text x='30' y='60' font-size='13' fill='#64748b' {FONT}>多类型 AI 技能包生命周期平台 · 中央仓库 v{VERSION} · 蓝=中央通用 / 绿=部署个人存储 / 橙=本地运行时 / 紫=统一通用化升级路线</text>")

# ---------- Row1 用户入口 ----------
box(320, 78, 640, 64, "L0 用户入口",
    ["自然语言 / URI 动作词：初始化 · 检查 · 升级 · 同步 · 体检 · 导入 · 全景图"],
    "#e2e8f0", "#475569", title_size=14)

# ---------- Row2 命令协议 + 大模型 ----------
box(60, 170, 560, 92, "L1 命令协议层（确定性代码，不靠模型猜）",
    ["① URI 正则解析（owner/repo/ref） → ② 意图映射（动作词→流程ID）",
     "→ ③ 预定义流程执行；失败保留证据，不以索引存在宣称安装成功"],
    "#ede9fe", "#7c3aed", title_size=13)
box(660, 170, 560, 92, "L2 大模型执行端",
    ["模型发现桥接 Skill 与 MCP 元数据；所需技能/知识按需读全文",
     "Codex 已提供原生执行适配；其他平台须独立接入与验收"],
    "#fef3c7", "#d97706", title_size=13)
arrow(560, 216, 660, 216, color="#94a3b8")
arrow(640, 142, 340, 170, color="#94a3b8")
arrow(640, 142, 940, 170, color="#94a3b8")

# ---------- Row3 本地运行时引擎 ----------
box(120, 290, 1040, 96, "L3 本地运行时 · ted-avc-manager 中介层",
    ["资产：四类包 + native / 插件缓存发现 → 元数据索引 → 绑定 load_asset 全文",
     "执行：task_begin → PreToolUse（白名单 / 必需入口 / 预算 / 漂移）→ PostToolUse → closeout",
     "monitor / enforce；原生回合 nonce + 产物 SHA；隐藏加载、token / cost 仍 unknown"],
    "#ffedd5", "#ea580c", title_size=14)
arrow(340, 262, 400, 290, color="#94a3b8")
arrow(940, 262, 880, 290, color="#94a3b8")

# ---------- Row4 三个存储 ----------
cy = 418
# 中央仓库
box(40, cy, 390, 330, "L4 中央仓库 · GitHub（通用，唯一事实源）",
    ["##根级入口",
     f"bootstrap.json v{VERSION} · README · CHANGELOG · AGENTS.md",
     f"##packs/ 四类包（{sum(COUNTS.values())}）",
     f"skill ×{COUNTS['skill']} · knowledge ×{COUNTS['knowledge']} · framework ×{COUNTS['framework']} · role ×{COUNTS['role']}",
     "入口：SKILL.md / PROFILE.md + meta.json（契约）",
     "##presets/ 统一下发预设",
     "mcp/（ted-avc-manager 引擎） · rules/base.md",
     "docs/01-12 · scripts/ · platforms/ · templates/",
     "##版本与发布",
     "semver tag · 人审发布=最终信任锚",
     "Pages：已发布 tag + 公开 PR 元数据；个人数据隔离"],
    "#dbeafe", "#2563eb", title_size=14)
# 个人目录
box(445, cy, 390, 330, "个人目录 · 部署配置（跨设备另验，不入 git）",
    ["##<personal-root>/",
     ".personal-manifest.json · README · memory/（全局）",
     "##projects/<slug>/（slug=仓库名）",
     ".project-state.json（repo/remote/版本/同步时间）",
     "##业务目录",
     "memory · learning · inbox · meetings",
     "deliverables · output · research · schedule",
     "plugins · infrastructure",
     "##治理目录",
     "experience（非通用经验） · staging（导入暂存）",
     "archive（只读归档） · preset/custom（配置分层）",
     "工具白名单：.agents/ · .codex/"],
    "#dcfce7", "#16a34a", title_size=14)
# 运行时
box(850, cy, 390, 330, "运行时 · runtime/（本地临时，可清理）",
    ["##内容",
     "asset-inventory.json / asset-events.jsonl",
     "execution/tasks/ + events.jsonl（任务与原生观察）",
     "hooks/sessions/（回合回执） · lockfile.json",
     "runtime/panorama/（本地视图，含个人元数据）",
     "##规则",
     "不再写入系统 tmp（FR-7）",
     "清理模块可执行；定时调度须另验",
     "##doctor 校验",
     "缺失/多余/命名违规/哈希不符 → 告警",
     "init 幂等：缺目录补建，不删用户文件"],
    "#ffedd5", "#ea580c", title_size=14)
arrow(300, 386, 235, cy, color="#ea580c", label="按授权读取/写入")
arrow(980, 386, 1045, cy, color="#ea580c", label="按授权读取/写入")
arrow(640, 386, 640, cy, color="#ea580c", label="按授权读取/写入")

# ---------- Row5 统一通用化升级路线 ----------
py = 780
add(f"<rect x='40' y='{py}' width='1200' height='120' rx='12' fill='#f5f3ff' stroke='#7c3aed' stroke-width='1.8'/>")
add(f"<text x='58' y='{py+28}' font-size='15' font-weight='800' fill='#6d28d9' {FONT}>统一通用化升级路线（所有通用型候选数据同走此通道）</text>")
stages = [
    ("候选源", "ai-config 内容拆解\n本地自定义资产\n外部导入与本地演化"),
    ("① 规则初筛", "通用候选 / 个人特有\n待人工确认\n（LLM 初筛须另验）"),
    ("② 台账", "imports-registry\n来源/标签/状态/版本\n文件哈希，可追溯"),
    ("③ 人工复核", "核对来源与真实证据\n+ 人工确认\n（标签不是发布许可）"),
    ("④ 转正", "入 packs/ · 人审\n打新 tag · 全景图更新\n非通用→experience"),
]
sx, sw, gap = 60, 210, 26
for i, (t, body) in enumerate(stages):
    x = sx + i * (sw + gap)
    add(f"<rect x='{x}' y='{py+42}' width='{sw}' height='66' rx='8' fill='#ffffff' stroke='#a78bfa'/>")
    add(f"<text x='{x+10}' y='{py+62}' font-size='13' font-weight='700' fill='#5b21b6' {FONT}>{html.escape(t)}</text>")
    for j, line in enumerate(body.split("\n")):
        add(f"<text x='{x+10}' y='{py+80+j*15}' font-size='11' fill='#475569' {FONT}>{html.escape(line)}</text>")
    if i < len(stages) - 1:
        arrow(x + sw, py + 75, x + sw + gap - 4, py + 75, color="#7c3aed", w=2)

# ---------- 底部：配置分层 + 反馈通道 ----------
qy = 924
box(40, qy, 590, 112, "配置分层（preset / custom）",
    ["中央 presets/ 声明（有序，后者覆盖前者，类似 eslint extends）",
     "→ 个人 preset/：只读 + manifest（来源/版本/sha256）",
     "→ 个人 custom/：用户后加，升级永不覆盖",
     "config 合并：preset 打底 → custom 同名覆盖；冲突保留 .local 并提示"],
    "#e0f2fe", "#0284c7", title_size=13)
box(650, qy, 590, 112, "反馈契约（部分实现待验）",
    ["日志 schema 已实现；自动合并与消费调度待验",
     "候选 PR 经复核；tag + CI + Pages 已接通",
     "评分与异常模块可用；真实回传闭环待验",
     "隐藏加载、模型 token / cost 与完整监督为 unknown"],
    "#f1f5f9", "#475569", title_size=13)

add("</svg>")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(parts))
print("written:", OUT)
