# 维护者来源与本次复用决定

核对日期：2026-10-13。以下是方法参考，不是已安装证明；复制实现前另核固定提交与许可证。

| 来源 | 用途与决定 |
|---|---|
| https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md | 参考任务触发的能力发现与查询方法；不自动执行 npx 下载或安装。索引中的社区技能仍独立审查。 |
| https://agentskills.io/specification | 采用目录、name/description、按需资料结构；公司 meta.json 保留生命周期与双语发现元数据。 |
| https://github.com/openai/skills | 优先发现官方技能，安装与使用状态分开核验。 |
| https://docs.langchain.com/oss/javascript/langgraph/overview | 可用于有状态代理图；本项目已有原生回执与本地进程监督，本版复用已有运行时并补连接层，不增加第二套代理运行时。 |
| https://docs.temporal.io/evaluate/features | 参考持久流程、重试和取消边界；当前没有跨服务执行要求，本版不引入分布式部署。 |
| https://stately.ai/docs/invoke | 参考状态与执行生命周期对应关系；采用本项目已有状态存储，不在本版引入新的状态机依赖。 |

本次新增代码为项目原创，未复制上述框架实现。未来任务必须按实际目标重新判断复用适配性，不能把本次不引入依赖当成永远自建的理由。
