# 本地组装与候选升级

1. 使用公司配置解析 personal 目录，在 custom/packs/skill/<id>/ 保存原创包。包含 SKILL.md、meta.json 和完成任务所必需的引用或脚本；技术 ID 使用小写字母数字与连字符。
2. 原创内容声明来源为 original；参考外部文档用 reference；复制或改编内容用 adapted。保留固定 revision、URL、许可证和为何采用。许可证不明确时不能把复制内容制作成可分发候选。
3. 运行必要的行为验证。`register_skill` 登记完整包摘要；`validate_local_skill({assetId})` 校验元数据、入口及完整包，保存结构验证 ID。它不执行包里的任意脚本，不能代替行为验收。
4. 调用 `propose_asset({name, type:'skill', assetId, validationId, sources, purpose})` 创建独立候选快照。sources 每项包含 kind、license、note；外部来源另含 url、revision。保留行为测试命令与产物供人工复核，不把自报结果称为独立验证。
5. `list_skill_candidates` 核对当前源包、登记和候选快照。文件或引用变化后旧验证无效，重新登记并验证才能提出新快照；旧候选保留历史。拒绝候选不修改本地技能。
6. 候选保持 pending-review、installation:none、publication:none。进入中央库继续沿用 PR、审查、版本发布流程，不能把本机登记或待审候选称为全局可用。

候选导出拒绝符号链接、越界、明显私人路径、凭据配置和非文本内容；这是基础检查，人工复核仍须检查授权、许可证和敏感信息。现有旧登记未包含完整包哈希时，显示 local-changed，复核后重新登记，不自动信任。
