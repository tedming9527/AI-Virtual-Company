# Codex 原生署名 Hook

`pack-manager install-codex-hooks <deployment.json> <codex-home>` 安装 SessionStart、UserPromptSubmit 与 Stop 命令 Hook。显式安装，不随 `init` 自动改客户端账号配置。不依赖项目首次使用技能。保留其他 Hook，不自动写入信任授权。

部署 JSON 保存在本机 `runtime/`，不提交组织名和本机路径；专业包中文显示身份保留在中央 meta.json：

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

Stop 验证本回合的真实最后回复、版本、岗位与回执，缺失或错误则请求一次补正；再次失败明确停止并报告未通过，避免无限续跑。必需的 memory citation XML 可跟在可见署名后。Hook 不直接修改已经渲染的消息，使用平台支持的补正续跑协议。

回执保存在目标项目 `runtime/hooks/events.jsonl`，关联 sessionId/turnId/版本/岗位/随机回执/输出 SHA-256，仅存最小元数据，不存原始用户提示和完整聊天。`context_injected` 只表示命令成功返回注入上下文；`footer_verified` 表示原生 Stop 输入的末尾已匹配。单独调用脚本是单元测试，只有客户端实际生命周期触发、输出匹配和缺失署名的补正回归同时通过，才算该平台适配通过。

署名与回执证明本机适配路径参与输出检查。它们不证明全部工具受中介层管控、管理员不可关闭、真实人员身份、统一配额账本或持续监督。中介层候选框架的其他能力仍按 docs/09 单独验收。

协议依据：[官方 OpenAI Hooks 文档](https://learn.chatgpt.com/docs/hooks)。
