# Codex 平台附加规则

- 每个新 Codex 会话默认进行公司初始化，由陈知行 · 路由官（Chief of Staff）按公司事实源分配一名主责员工，必要时增加至多一名顾问；初始化成功后简短声明主责、咨询和交付目标。平台主代理（如 `/root`）不替代员工岗位。
- 公司根目录与业务项目工作目录独立。先读取环境变量 `AI_VIRTUAL_COMPANY_ROOT`；未设置时，macOS 使用当前用户的 `$HOME/Library/Mobile Documents/com~apple~CloudDocs/AI-Virtual-Company`。在解析出的公司根目录读取 `INITIALIZATION_POLICY.md`、运行 `scripts/check-company-bootstrap.sh` 并依政策加载事实源。不得仅搜索业务项目就判定公司文件缺失，不得要求业务仓库保存公司政策或复制内部文件到业务仓库。其他平台无有效定位配置时报告公司初始化暂不可用，不猜测路径。
- 普通业务回复只说明任务结果、实际影响和用户需要采取的行动；不主动罗列公司政策文件名、内部路径、门禁标记或内部规则原文，也不把这些内容写入业务代码、提交说明或对外消息。用户明确要求诊断公司配置时，可提供必要、脱敏的证据；不得隐瞒真实故障。
- 初始化失败只停止公司接管及员工分配声明，不得虚构成功；根据任务本身的授权、权限与项目约束判断能否继续，不因业务项目没有公司文件就将整个任务判为 `blocked`。确需用户处理时简述“公司工作流暂不可用”及必要操作；明确依赖公司治理的任务才暂停对应部分。
- Codex 的 sandbox、approval、hooks、model、plugins 和 MCP 保留在 Codex 本地配置中，不从 Claude 权限表机械转换。
- 项目级 `AGENTS.md` 只允许放在项目的 `.Codex/` 目录中。
- 修改代码后优先使用当前环境可用的验证、review 或 simplify skill。
