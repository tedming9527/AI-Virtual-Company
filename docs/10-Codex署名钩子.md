# Codex 原生署名 Hook

`ted-avc-manager install-codex-hooks <deployment.json> <codex-home>` 安装 SessionStart、UserPromptSubmit 与 Stop 命令 Hook。显式安装，不随 `init` 自动改客户端账号配置。不依赖项目首次使用技能。保留其他 Hook，不自动写入信任授权。

当前部署 JSON 位于安装时指定的路径，不提交组织名和本机路径；专业包中文显示身份保留在中央 meta.json：

```json
{
  "organization": "Example organization",
  "projects": [{
    "root": "/absolute/path/to/configured/project",
    "roles": ["ai-engineer", "test-expert"]
  }]
}
```

roles 是允许的逻辑岗位。显示名从各专业包 meta.json 的 nameZh/professionZh/displayName 读取，必须为“中文名字·职业”，不能退化成技术 ID。每回合先路由，再选择匹配署名。显示名称不证明员工本人参与。实际执行者如实标注 platform agent。未配置项目不注入、不验署名；不得全局冒称接管。

客户端使用安装时的 Node 绝对路径与安装包入口。项目 bootstrap 版本必须与实际 Hook 包版本相同，否则报错、不签成功回执。安装后通过 Codex `/hooks` 审阅并信任精确定义；当前客户端未加载新配置时，新会话与已有会话分别验收，不能由新进程推断现有桌面会话已更新。

开始/每回合注入候选末尾文本：

> 以上内容由 Example organization 提供；发布版本：vX.Y.Z；任务主责：中文名字·职业；实际执行者：platform agent；Hook 回执：随机回合标识

Stop 验证本回合的真实最后回复、版本、岗位与回执。缺失或错误产生明确风险提示并要求修复，不返回 block、continue:false，也不强制补正或续跑。必需的 memory citation XML 可跟在可见署名后。配置缺失、解析或存储失败同样降级告警；内部采集 CLI 返回合法 JSON，但不伪造验证成功。

受管客户端外层适配器把采集异常转换成退出码 0 的结构化 `systemMessage` 警告，Pre/Post 事件同时用 `additionalContext` 交付相同诊断，不返回流程控制字段。此处 0 只表示诊断交付完成，不表示采集成功。异常记录必须显式标记 `unverified`、具体原因、任务继续和修复事项，并尽力保存到客户端 `state/runtime/hooks/warnings/<hash>.json`；诊断保存失败仍输出警告，不阻断任务。外层也将启动异常转换为合法 JSON 警告，绝不透传退出码 2。

本机实测退出码 1 显示橙色，但桌面详情仅保留 `hook exited with code 1`；退出码 0 的结构化警告保留正文但列表为灰色。兼容实现使用同一次采集的两条原生记录：原有采集 Hook 退出 0 交付具体错误；只读状态 Hook 读取按事件输入、采集种类和工具调用标识计算摘要的交付结果，失败/未验证时退出 1 提供橙色状态。状态 Hook 不重复执行采集，不发出任何流程控制字段，启动失败也最多退出 1。成功时两者均退出 0。

状态 Hook 最多等待 6.5 秒；丢失、过期或不可读结果按未验证告警，不伪造采集成功。两个处理器可能并行或以不同顺序显示，应在同事件的采集记录中查看正文。正文包含关联摘要；状态回执保存同一摘要。新增状态 Hook 必须经用户原生信任/启用，不写入或伪造信任哈希。状态颜色与正文在两条记录中同时呈现，不宣称宿主已支持单条彩色详情。原生显示仍须实际界面确认，脚本测试和模型声明不能代替视觉证据。

受管部署回执保存在 `$CODEX_HOME/ted-avc-manager/state/runtime/hooks/events.jsonl`（仅显式旧部署兼容项目 `runtime/hooks/events.jsonl`），审计关联 sessionId/turnId/版本/岗位/随机回执/输出 SHA-256，仅存最小元数据，不存原始用户提示和完整聊天。`context_injected` 只表示命令成功返回注入上下文；`footer_verified` 表示原生 Stop 输入的末尾已匹配。单独调用脚本是单元测试，只有客户端实际生命周期触发、输出匹配和缺失署名时正常结束的非阻断回归同时通过，才算该平台适配通过。

署名与回执证明本机适配路径参与输出检查。它们不证明全部工具受中介层管控、管理员不可关闭、真实人员身份、统一配额账本或持续监督。中介层候选框架的其他能力仍按 docs/09 单独验收。

协议依据：[官方 OpenAI Hooks 文档](https://learn.chatgpt.com/docs/hooks)。

客户端目录迁移、全量重建及清理前资产保全按 [14 · 客户端初始化重建设计](14-客户端初始化重建设计.md) 另行实施；本次非阻断修复不执行客户端重置。


2026-10-14 更新：客户端部署配置、采集状态与独立未升级工作区现由 `scripts/client_environment.py` 管理在 CODEX_HOME；旧 runtime 路径仅兼容显式旧部署。发行更新入口已改为调用同一重建事务，不再顺带用户 init、合并复制桥接技能或保留旧版转发器。下发/保全/反向升级规则及宿主验收边界以 [客户端初始化重建设计](14-客户端初始化重建设计.md) 为准。
